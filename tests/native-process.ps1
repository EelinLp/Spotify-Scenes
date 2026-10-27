$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '../installer/NativeProcess.ps1')
$testDir=Join-Path $env:TEMP ('Scenes-Native-Test-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $testDir | Out-Null
$exe=Join-Path $testDir 'native-stub.exe'
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if(!(Test-Path $compiler)){$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'}
& $compiler /nologo /target:exe ("/out:"+$exe) (Join-Path $PSScriptRoot 'NativeStub.cs')
if($LASTEXITCODE -ne 0){throw 'Stub compilation failed.'}
$log=Join-Path $testDir 'native.log'
# Construct Unicode text without depending on the caller's script code page.
$unicode='C:\Users\'+(-join ([char[]](0x410,0x434,0x43c,0x438,0x43d,0x438,0x441,0x442,0x440,0x430,0x442,0x43e,0x440)))+'\AppData\Folder with spaces\'
function Test-ScenesAdministratorToken { return $false }
$result=Invoke-ScenesNative -Executable $exe -Arguments @('-q','reject-admin',$unicode) -LogPath $log
if($result.Output.Trim() -cne $unicode){throw 'Unicode/trailing-backslash round-trip failed.'}
function Test-ScenesAdministratorToken { return $true }
$result=Invoke-ScenesNative -Executable $exe -Arguments @('--quiet','require-admin',$unicode) -LogPath $log
if($result.Output.Trim() -cne $unicode){throw 'Administrator argument round-trip failed.'}
$failed=$false
try{Invoke-ScenesNative -Executable $exe -Arguments @('silent-failure') -LogPath $log | Out-Null}
catch{ $failed=$true;foreach($text in @('silent-failure','code 1','no output',$exe,$log)){if(!$_.Exception.Message.Contains($text)){throw ('Missing error detail: '+$text)}} }
if(!$failed){throw 'A failed process was treated as success.'}
if(![IO.File]::ReadAllText($log).Contains('Exit code: 1')){throw 'Exit code missing from log.'}
Write-Host 'PASS: Unicode paths, argument quoting, quiet-mode removal, normal/admin routing, stderr capture and silent-failure diagnostics.'
