# Run native tools without converting informational stderr into PowerShell errors.
# ProcessStartInfo passes Unicode paths directly through CreateProcessW.
function Invoke-ScenesNative {
    param([string]$Executable, [string[]]$Arguments, [string]$LogPath)
    $quoted = foreach ($argument in $Arguments) {
        if ($argument.Contains('"')) { throw 'Unexpected quote in native argument.' }
        '"' + ($argument -replace '(\\+)$', '$1$1') + '"'
    }
    $info = New-Object System.Diagnostics.ProcessStartInfo
    $info.FileName = $Executable
    $info.Arguments = $quoted -join ' '
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.StandardOutputEncoding = New-Object System.Text.UTF8Encoding($false)
    $info.StandardErrorEncoding = New-Object System.Text.UTF8Encoding($false)
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $info
    try {
        [void]$process.Start()
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        $process.WaitForExit()
        $result = [pscustomobject]@{ ExitCode=$process.ExitCode; Output=$stdout.Result; ErrorOutput=$stderr.Result }
        if ($LogPath) {
            [IO.File]::AppendAllText($LogPath, ('> spicetify ' + ($Arguments -join ' ') + [Environment]::NewLine + $result.Output + $result.ErrorOutput), [Text.Encoding]::UTF8)
        }
        if ($result.ExitCode -ne 0) { throw ('Spicetify exited with code ' + $result.ExitCode + ': ' + $result.Output + $result.ErrorOutput) }
        return $result
    } finally { $process.Dispose() }
}
