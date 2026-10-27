# Run native tools without converting informational stderr into PowerShell errors.
# ProcessStartInfo passes Unicode paths directly through CreateProcessW.
function Test-ScenesAdministratorToken {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    try {
        $principal = New-Object Security.Principal.WindowsPrincipal($identity)
        return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    } finally { $identity.Dispose() }
}
function Invoke-ScenesNative {
    param([string]$Executable, [string[]]$Arguments, [string]$LogPath)
    # Never hide the explanation for a failed command with Spicetify's quiet mode.
    $Arguments = @($Arguments | Where-Object { $_ -ne '-q' -and $_ -ne '--quiet' })
    # The installer only targets Spotify in the current user's AppData. In an
    # already elevated session (including built-in Administrator), use the CLI's
    # supported switch. This does not elevate the process or change any ACLs.
    if ((Test-ScenesAdministratorToken) -and $Arguments -notcontains '--bypass-admin') {
        $Arguments = @('--bypass-admin') + $Arguments
    }
    $command = 'spicetify ' + ($Arguments -join ' ')
    Write-Host ('Running: ' + $command)
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
    $info.RedirectStandardInput = $true
    $info.StandardOutputEncoding = New-Object System.Text.UTF8Encoding($false)
    $info.StandardErrorEncoding = New-Object System.Text.UTF8Encoding($false)
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $info
    try {
        [void]$process.Start()
        $process.StandardInput.Close()
        $stdout = $process.StandardOutput.ReadToEndAsync()
        $stderr = $process.StandardError.ReadToEndAsync()
        $process.WaitForExit()
        $result = [pscustomobject]@{ ExitCode=$process.ExitCode; Output=$stdout.Result; ErrorOutput=$stderr.Result }
        if ($LogPath) {
            [IO.File]::AppendAllText($LogPath, ('> ' + $command + [Environment]::NewLine + 'Executable: ' + $Executable + [Environment]::NewLine + 'Exit code: ' + $result.ExitCode + [Environment]::NewLine + $result.Output + $result.ErrorOutput), [Text.Encoding]::UTF8)
        }
        if ($result.ExitCode -ne 0) {
            $details = ($result.Output + $result.ErrorOutput).Trim()
            if (!$details) { $details = 'The process returned no output.' }
            throw ($command + ' exited with code ' + $result.ExitCode + [Environment]::NewLine + $details + [Environment]::NewLine + 'Executable: ' + $Executable + [Environment]::NewLine + 'Log: ' + $LogPath)
        }
        return $result
    } finally { $process.Dispose() }
}
