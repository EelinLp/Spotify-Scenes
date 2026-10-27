using System;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows.Forms;
using Microsoft.Win32;

static class Program {
 public const string Version="0.1.3";
 public static readonly string Root=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"SpotifyScenes");
 public static readonly string Target=Path.Combine(Root,"Mod");
 public static readonly string Spotify=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),"Spotify","Spotify.exe");
 public const string RegistryPath=@"Software\Microsoft\Windows\CurrentVersion\Uninstall\SpotifyScenes";
 [STAThread] static int Main(string[] args){
  try {
   // Validation/extraction modes never install, launch Spotify, or write registry entries.
   if(args.Length>0&&args[0]=="--verify-package"){ValidatePayload(null);return 0;}
   if(args.Length==2&&args[0]=="--extract-only"){ValidatePayload(Path.GetFullPath(args[1]));return 0;}
   Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);
#if UNINSTALLER
   Application.Run(new SetupWindow(true));
#else
   Application.Run(new SetupWindow(false));
#endif
   return 0;
  }catch(Exception e){if(args.Length>0)return 1;MessageBox.Show(e.Message,"Spotify Scenes",MessageBoxButtons.OK,MessageBoxIcon.Error);return 1;}
 }
 public static void ValidatePayload(string destination){
  using(var stream=Assembly.GetExecutingAssembly().GetManifestResourceStream("SpotifyScenes.Payload")){
   if(stream==null)throw new InvalidOperationException("Installation payload is missing.");
   using(var zip=new ZipArchive(stream,ZipArchiveMode.Read)){
    bool install=false,extension=false,runtime=false;
    foreach(var entry in zip.Entries){
     string name=entry.FullName.Replace('\\','/');install|=name=="Install.ps1";extension|=name=="spotify-scenes.js";runtime|=name=="runtime/spicetify.exe";
     if(destination!=null){string root=Path.GetFullPath(destination).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar;string target=Path.GetFullPath(Path.Combine(root,entry.FullName.Replace('/',Path.DirectorySeparatorChar)));
      if(!target.StartsWith(root,StringComparison.OrdinalIgnoreCase))throw new InvalidDataException("Unsafe archive path.");
      if(entry.Name.Length==0){Directory.CreateDirectory(target);continue;}
      Directory.CreateDirectory(Path.GetDirectoryName(target));
      using(var input=entry.Open())using(var output=new FileStream(target,FileMode.Create,FileAccess.Write,FileShare.None))input.CopyTo(output);
     }else{using(var input=entry.Open()){var buffer=new byte[65536];while(input.Read(buffer,0,buffer.Length)>0){}}}
    }
    if(!install||!extension||!runtime)throw new InvalidDataException("The installation package is incomplete.");
   }
  }
 }
 public static void Register(){
  string uninstall=Path.Combine(Root,"Uninstall.exe");File.Copy(Path.Combine(Target,"Uninstall.exe"),uninstall,true);
  using(var key=Registry.CurrentUser.CreateSubKey(RegistryPath)){
   key.SetValue("DisplayName","Spotify Scenes");key.SetValue("DisplayVersion",Version);key.SetValue("Publisher","Spotify Scenes contributors");key.SetValue("InstallLocation",Target);
   key.SetValue("UninstallString","\""+uninstall+"\"");key.SetValue("DisplayIcon",uninstall);key.SetValue("NoModify",1,RegistryValueKind.DWord);key.SetValue("NoRepair",1,RegistryValueKind.DWord);
  }
 }
 public static void Unregister(){Registry.CurrentUser.DeleteSubKeyTree(RegistryPath,false);}
}
sealed class SetupWindow:Form {
 readonly bool uninstall;readonly Button action=new Button(),close=new Button();readonly Label heading=new Label(),description=new Label(),status=new Label();readonly ProgressBar progress=new ProgressBar();readonly TextBox output=new TextBox();readonly BackgroundWorker worker=new BackgroundWorker();bool busy,complete;readonly string log;
 public SetupWindow(bool removing){
  uninstall=removing;log=Path.Combine(Program.Root,removing?"uninstall-setup.log":"install-setup.log");
  Text=removing?"Удаление Spotify Scenes":"Установка Spotify Scenes";ClientSize=new Size(700,470);FormBorderStyle=FormBorderStyle.FixedDialog;MaximizeBox=false;StartPosition=FormStartPosition.CenterScreen;BackColor=Color.FromArgb(20,25,22);ForeColor=Color.White;Font=new Font("Segoe UI",10);AutoScaleMode=AutoScaleMode.Dpi;
  try{using(var stream=Assembly.GetExecutingAssembly().GetManifestResourceStream("SpotifyScenes.Icon")){if(stream!=null)Icon=new Icon(stream);}}catch{}
  var brand=new Label{Text="Spotify Scenes",Font=new Font("Segoe UI",24,FontStyle.Bold),ForeColor=Color.FromArgb(255,223,54),Location=new Point(30,24),Size=new Size(620,48)};Controls.Add(brand);
  heading.Text=removing?"Вернуть обычный Spotify":"Твой Spotify, в твоём стиле";heading.Font=new Font("Segoe UI",15,FontStyle.Bold);heading.SetBounds(32,83,630,35);Controls.Add(heading);
  description.Text=removing?"Будут восстановлены файлы Spotify до установки мода.\r\nСохранённые настройки оформления останутся для следующей установки.":"8 фонов • эффекты • шрифты • Верити 3D • 16 танцев\r\nСтандартный набор уже настроен: нефритовый фон, Jura и Верити 3D.";description.ForeColor=Color.FromArgb(205,215,207);description.SetBounds(32,126,632,62);Controls.Add(description);
  status.Text=removing?"Spotify будет закрыт на время удаления оформления.":"Spicetify включён в установщик и устанавливается автоматически.\r\nSpotify будет закрыт на время установки. Права администратора не нужны.";status.ForeColor=Color.FromArgb(192,204,195);status.SetBounds(32,200,632,53);Controls.Add(status);
  output.ReadOnly=true;output.Multiline=true;output.ScrollBars=ScrollBars.Vertical;output.BackColor=Color.FromArgb(28,35,30);output.ForeColor=Color.FromArgb(200,211,203);output.BorderStyle=BorderStyle.None;output.Font=new Font("Consolas",9);output.SetBounds(32,260,632,115);output.Text=removing?"Удаление через резервную копию Spotify Scenes.":"Папка мода:\r\n"+Program.Target+"\r\nВерсия: "+Program.Version;Controls.Add(output);
  progress.SetBounds(32,392,632,5);progress.Style=ProgressBarStyle.Continuous;Controls.Add(progress);
  close.Text="Закрыть";close.SetBounds(430,414,105,34);StyleButton(close,false);close.Click+=delegate{Close();};Controls.Add(close);
  action.Text=removing?"Удалить":"Установить";action.SetBounds(546,414,118,34);StyleButton(action,true);action.Click+=Start;Controls.Add(action);AcceptButton=action;CancelButton=close;
  FormClosing+=delegate(object sender,FormClosingEventArgs e){if(busy)e.Cancel=true;};
  worker.DoWork+=Install;worker.RunWorkerCompleted+=Finished;
  if(!removing&&!File.Exists(Program.Spotify)){status.Text="Spotify Desktop не найден. Сначала установи его с официального сайта.\r\nВерсия из Microsoft Store не поддерживается этим установщиком.";action.Text="Spotify.com";action.Click-=Start;action.Click+=delegate{Process.Start(new ProcessStartInfo("https://www.spotify.com/download/windows/"){UseShellExecute=true});};}
 }
 static void StyleButton(Button b,bool primary){b.FlatStyle=FlatStyle.Flat;b.FlatAppearance.BorderSize=0;b.BackColor=primary?Color.FromArgb(255,223,54):Color.FromArgb(49,59,52);b.ForeColor=primary?Color.FromArgb(20,25,22):Color.White;b.Font=new Font("Segoe UI",10,FontStyle.Bold);b.Cursor=Cursors.Hand;}
 void Start(object sender,EventArgs e){
  if(complete){if(File.Exists(Program.Spotify))Process.Start(Program.Spotify);Close();return;}
  busy=true;action.Enabled=false;close.Enabled=false;progress.Style=ProgressBarStyle.Marquee;status.Text=uninstall?"Восстанавливаю Spotify…":"Устанавливаю оформление…";output.Clear();worker.RunWorkerAsync();
 }
 void Append(string text){if(string.IsNullOrEmpty(text))return;text=Regex.Replace(text,@"\x1B\[[0-?]*[ -/]*[@-~]","");if(!IsDisposed)BeginInvoke((Action)delegate{output.AppendText(text+Environment.NewLine);});lock(worker){File.AppendAllText(log,text+Environment.NewLine,Encoding.UTF8);}}
 void Install(object sender,DoWorkEventArgs e){
  Directory.CreateDirectory(Program.Root);File.WriteAllText(log,"Spotify Scenes "+Program.Version+Environment.NewLine,Encoding.UTF8);
  string script;
  if(uninstall){script=Path.Combine(Program.Target,"Uninstall.ps1");if(!File.Exists(script))script=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"Uninstall.ps1");if(!File.Exists(script))throw new FileNotFoundException("Скрипт удаления не найден. Открой Uninstall.cmd из архива мода.");}
  else{Append("Распаковка файлов…");Program.ValidatePayload(Program.Target);script=Path.Combine(Program.Target,"Install.ps1");}
  string powershell=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System),@"WindowsPowerShell\v1.0\powershell.exe");
  var info=new ProcessStartInfo(powershell,"-NoProfile -ExecutionPolicy Bypass -File \""+script+"\" -NoLaunch"){UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden,RedirectStandardOutput=true,RedirectStandardError=true,StandardOutputEncoding=Encoding.UTF8,StandardErrorEncoding=Encoding.UTF8,WorkingDirectory=Path.GetDirectoryName(script)};
  using(var process=new Process()){process.StartInfo=info;process.OutputDataReceived+=delegate(object s,DataReceivedEventArgs a){Append(a.Data);};process.ErrorDataReceived+=delegate(object s,DataReceivedEventArgs a){Append(a.Data);};process.Start();process.BeginOutputReadLine();process.BeginErrorReadLine();process.WaitForExit();if(process.ExitCode!=0)throw new InvalidOperationException("Операция не завершена. Подробности:\r\n"+log);}
  if(uninstall){Program.Unregister();}else Program.Register();
 }
 void Finished(object sender,RunWorkerCompletedEventArgs e){busy=false;close.Enabled=true;progress.Style=ProgressBarStyle.Continuous;
  if(e.Error!=null){status.Text=e.Error.Message;action.Enabled=true;action.Text="Повторить";progress.Value=0;return;}
  complete=true;progress.Value=100;heading.Text=uninstall?"Оформление удалено":"Готово — можно слушать";status.Text=uninstall?"Spotify восстановлен. Настройки оформления сохранены.":"Оформление установлено. Настройки — шестерёнка слева в Spotify.";description.Text=uninstall?"Резервные копии сохранены в папке Spotify Scenes.":"По умолчанию включены нефритовый фон, Jura и Верити 3D.\r\nДля видеоряда: настройки → «Видеоряд и Верити».";action.Enabled=true;action.Text="Spotify";
 }
}
