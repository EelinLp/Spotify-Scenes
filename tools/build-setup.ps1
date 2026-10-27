$ErrorActionPreference='Stop'
$root=Split-Path $PSScriptRoot -Parent
$version=([IO.File]::ReadAllText((Join-Path $root 'VERSION'))).Trim()
$dist=Join-Path $root 'dist'
$package=Join-Path $dist ('Spotify-Scenes-'+$version)
if(!(Test-Path (Join-Path $package 'spotify-scenes.js'))){throw 'Run node tools/build.mjs first.'}
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if(!(Test-Path $compiler)){$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'}
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.IO.Compression.FileSystem
$iconPath=Join-Path $root 'installer\app.ico'
$bitmap=[Drawing.Bitmap]::new(256,256)
$graphics=[Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode=[Drawing.Drawing2D.SmoothingMode]::AntiAlias
$brush=[Drawing.Drawing2D.LinearGradientBrush]::new([Drawing.Rectangle]::new(2,2,252,252),[Drawing.Color]::FromArgb(255,242,126),[Drawing.Color]::FromArgb(235,175,8),[single]55)
$graphics.FillEllipse($brush,3,3,250,250)
$graphics.FillEllipse([Drawing.Brushes]::Black,78,78,21,37)
$graphics.FillEllipse([Drawing.Brushes]::Black,157,78,21,37)
$pen=[Drawing.Pen]::new([Drawing.Color]::FromArgb(30,24,11),13)
$pen.StartCap=[Drawing.Drawing2D.LineCap]::Round;$pen.EndCap=[Drawing.Drawing2D.LineCap]::Round
$graphics.DrawArc($pen,60,90,136,104,20,140)
$png=[IO.MemoryStream]::new();$bitmap.Save($png,[Drawing.Imaging.ImageFormat]::Png);$bytes=$png.ToArray()
$writer=[IO.BinaryWriter]::new([IO.File]::Create($iconPath))
try{$writer.Write([uint16]0);$writer.Write([uint16]1);$writer.Write([uint16]1);$writer.Write([byte]0);$writer.Write([byte]0);$writer.Write([byte]0);$writer.Write([byte]0);$writer.Write([uint16]1);$writer.Write([uint16]32);$writer.Write([uint32]$bytes.Length);$writer.Write([uint32]22);$writer.Write($bytes)}finally{$writer.Dispose();$png.Dispose();$pen.Dispose();$brush.Dispose();$graphics.Dispose();$bitmap.Dispose()}
$source=Join-Path $root 'installer\Setup.cs'
$manifest=Join-Path $root 'installer\Setup.manifest'
$uninstall=Join-Path $package 'Uninstall.exe'
& $compiler /nologo /codepage:65001 /target:winexe /optimize+ /define:UNINSTALLER /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll ("/win32manifest:"+$manifest) ("/win32icon:"+$iconPath) ("/resource:"+$iconPath+',SpotifyScenes.Icon') ("/out:"+$uninstall) $source
if($LASTEXITCODE -ne 0){throw 'Uninstaller compilation failed.'}
$zip=Join-Path $dist ('Spotify-Scenes-'+$version+'.zip')
if(Test-Path -LiteralPath $zip){Remove-Item -LiteralPath $zip}
[IO.Compression.ZipFile]::CreateFromDirectory($package,$zip,[IO.Compression.CompressionLevel]::Optimal,$false)
$setup=Join-Path $dist ('Spotify-Scenes-Setup-'+$version+'.exe')
& $compiler /nologo /codepage:65001 /target:winexe /optimize+ /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.IO.Compression.dll /reference:System.IO.Compression.FileSystem.dll ("/win32manifest:"+$manifest) ("/win32icon:"+$iconPath) ("/resource:"+$iconPath+',SpotifyScenes.Icon') ("/resource:"+$zip+',SpotifyScenes.Payload') ("/out:"+$setup) $source
if($LASTEXITCODE -ne 0){throw 'Setup compilation failed.'}
$hashLines=@($setup,$zip) | ForEach-Object { (Get-FileHash -LiteralPath $_ -Algorithm SHA256).Hash.ToLowerInvariant()+'  '+[IO.Path]::GetFileName($_) }
[IO.File]::WriteAllLines((Join-Path $dist 'SHA256SUMS.txt'),$hashLines)
Write-Host ('Setup: '+$setup)
Write-Host ('Portable: '+$zip)
