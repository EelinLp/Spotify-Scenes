using System;
using System.Linq;
class NativeStub {
 static int Main(string[] args) {
  Console.OutputEncoding = new System.Text.UTF8Encoding(false);
  if(args.Contains("silent-failure")) return 1;
  if(args.Contains("-q") || args.Contains("--quiet")) return 21;
  if(args.Contains("require-admin") && !args.Contains("--bypass-admin")) {
   Console.Error.WriteLine("Spicetify should NOT be run with administrator privileges"); return 1;
  }
  if(args.Contains("reject-admin") && args.Contains("--bypass-admin")) return 22;
  Console.Error.WriteLine("Informational stderr must not terminate PowerShell.");
  Console.WriteLine(args.Last()); return 0;
 }
}
