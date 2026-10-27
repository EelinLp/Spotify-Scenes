param([switch]$NoLaunch)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
. (Join-Path $PSScriptRoot 'NativeProcess.ps1')
$backup=Join-Path $env:LOCALAPPDATA 'SpotifyScenes\BeforeInstall'
$record=Join-Path $backup 'ready.json'
if (!(Test-Path $record)) { throw 'No installation backup found.' }
$meta=Get-Content $record -Raw | ConvertFrom-Json
$spotify=Join-Path $env:APPDATA 'Spotify'
if ($meta.spotify -ne $spotify) { throw 'Spotify path has changed. Automatic rollback stopped.' }
$exe=Join-Path $spotify 'Spotify.exe'
$spice=Join-Path $env:LOCALAPPDATA 'spicetify\spicetify.exe'
Get-Process Spotify -ErrorAction SilentlyContinue | Stop-Process
$config=Join-Path $env:APPDATA 'spicetify\config-xpui.ini'
if ($meta.version -eq (Get-Item $exe).VersionInfo.ProductVersion) {
    $apps=Join-Path $spotify 'Apps'
    if (([IO.Path]::GetFullPath($apps)) -ne (Join-Path ([IO.Path]::GetFullPath($env:APPDATA)) 'Spotify\Apps')) { throw 'Unexpected Spotify path.' }
    $archive=Join-Path $env:LOCALAPPDATA ('SpotifyScenes\Removed-' + [guid]::NewGuid().ToString('N'))
    Move-Item -LiteralPath $apps -Destination $archive
    Copy-Item -LiteralPath (Join-Path $backup 'Apps') -Destination $apps -Recurse
    if ($meta.hadConfig) { Copy-Item (Join-Path $backup 'config-xpui.ini') $config -Force }
} else {
    # An old SPA snapshot must never be put into an updated Spotify client.
    $result = Invoke-ScenesNative -Executable $spice -Arguments @('-q','restore') -LogPath (Join-Path $backup 'uninstall.log')
    if ($result.Output) { Write-Host $result.Output.TrimEnd() }
    if ($meta.hadConfig) { Copy-Item (Join-Path $backup 'config-xpui.ini') $config -Force }
}
if (!$meta.hadConfig -and (Test-Path -LiteralPath $config)) {
    # Preserve any settings created after installation before restoring the absent original config.
    $savedConfig=Join-Path $backup ('config-after-install-'+[guid]::NewGuid().ToString('N')+'.ini')
    Copy-Item -LiteralPath $config -Destination $savedConfig
    Remove-Item -LiteralPath $config
}
if (!$NoLaunch) { Start-Process $exe -WindowStyle Normal }
Write-Host 'Appearance removed. Your saved appearance settings are retained.'
