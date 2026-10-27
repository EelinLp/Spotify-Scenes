param([switch]$NoLaunch)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
. (Join-Path $PSScriptRoot 'NativeProcess.ps1')
$package = $PSScriptRoot
$runtime = Join-Path $env:LOCALAPPDATA 'spicetify'
$spice = Join-Path $runtime 'spicetify.exe'
$spotify = Join-Path $env:APPDATA 'Spotify'
$config = Join-Path $env:APPDATA 'spicetify\config-xpui.ini'
$backup = Join-Path $env:LOCALAPPDATA 'SpotifyScenes\BeforeInstall'
$apps = Join-Path $spotify 'Apps'
function Spice([string[]]$Arguments) {
    $result = Invoke-ScenesNative -Executable $spice -Arguments $Arguments -LogPath (Join-Path $checkpoint 'install.log')
    if ($result.Output) { Write-Host $result.Output.TrimEnd() }
}
if (!(Test-Path (Join-Path $spotify 'Spotify.exe'))) { throw 'Install the desktop version of Spotify from spotify.com and sign in first.' }
if (!(Test-Path (Join-Path $package 'runtime\spicetify.exe'))) { throw 'Extract the entire ZIP before starting Install.cmd.' }
New-Item -ItemType Directory -Force $runtime | Out-Null
if (!(Test-Path (Join-Path $backup 'ready.json'))) {
    New-Item -ItemType Directory -Force $backup | Out-Null
    if (Test-Path $config) { Copy-Item -LiteralPath $config -Destination (Join-Path $backup 'config-xpui.ini') -Force }
    Copy-Item -LiteralPath $apps -Destination (Join-Path $backup 'Apps') -Recurse -Force
    @{spotify=$spotify;version=(Get-Item (Join-Path $spotify 'Spotify.exe')).VersionInfo.ProductVersion;hadConfig=(Test-Path $config)} | ConvertTo-Json | Set-Content (Join-Path $backup 'ready.json') -Encoding UTF8
}
$checkpoint = Join-Path $env:LOCALAPPDATA ('SpotifyScenes\Checkpoints\' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force $checkpoint | Out-Null
Copy-Item -LiteralPath $apps -Destination (Join-Path $checkpoint 'Apps') -Recurse
if (Test-Path $config) { Copy-Item -LiteralPath $config -Destination (Join-Path $checkpoint 'config-xpui.ini') }
try {
    $useBundled = !(Test-Path $spice)
    if (!$useBundled) { $useBundled = ([version](Invoke-ScenesNative -Executable $spice -Arguments @('-v')).Output.Trim() -le [version]'2.46.4') }
    if ($useBundled) { Copy-Item (Join-Path $package 'runtime\*') $runtime -Recurse -Force }
    Spice -Arguments @('-q','config','spotify_path',$spotify)
    $data = (Invoke-ScenesNative -Executable $spice -Arguments @('path','userdata') -LogPath (Join-Path $checkpoint 'install.log')).Output.Trim()
    if (!(Test-Path -LiteralPath $data)) { throw 'Spicetify config directory was not found.' }
    $theme = Join-Path $data 'Themes\SpotifyScenes'
    $extensions = Join-Path $data 'Extensions'
    New-Item -ItemType Directory -Force $theme,$extensions | Out-Null
    Copy-Item (Join-Path $package 'theme\*') $theme -Force
    Copy-Item (Join-Path $package 'spotify-scenes.js') $extensions -Force
    Spice -Arguments @('-q','config','current_theme','SpotifyScenes','color_scheme','Scenes','inject_css','1','replace_colors','1','inject_theme_js','0','extensions','spotify-scenes.js')
    Get-Process Spotify -ErrorAction SilentlyContinue | Stop-Process
    if (Test-Path (Join-Path $apps 'xpui')) { Spice -Arguments @('apply') }
    else { Spice -Arguments @('backup','apply') }
    if (!$NoLaunch) { Start-Process (Join-Path $spotify 'Spotify.exe') -WindowStyle Normal }
    Write-Host 'Installed. Open Spotify. Appearance settings: gear button on the left.'
} catch {
    Get-Process Spotify -ErrorAction SilentlyContinue | Stop-Process
    # Keep the failed app tree for inspection and restore the exact saved tree.
    if (([IO.Path]::GetFullPath($apps)) -ne (Join-Path ([IO.Path]::GetFullPath($env:APPDATA)) 'Spotify\Apps')) { throw 'Unexpected Spotify path. Automatic rollback stopped.' }
    Move-Item -LiteralPath $apps -Destination (Join-Path $checkpoint 'FailedApps')
    Copy-Item -LiteralPath (Join-Path $checkpoint 'Apps') -Destination $apps -Recurse
    if (Test-Path (Join-Path $checkpoint 'config-xpui.ini')) { Copy-Item (Join-Path $checkpoint 'config-xpui.ini') $config -Force }
    elseif (Test-Path -LiteralPath $config) { Remove-Item -LiteralPath $config }
    throw
}

