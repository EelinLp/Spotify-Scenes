param([Parameter(Mandatory)][ValidateSet('Block','Unblock')][string]$Action)
$ErrorActionPreference = 'Stop'

# Windows desktop Spotify stages updates beside offline.bnk.
# See Spicetify's Windows update protection in v3.0.0-beta.14.
$spotifyCache = Join-Path $env:LOCALAPPDATA 'Spotify'
$staging = Join-Path $spotifyCache 'Update'
$state = Join-Path $env:LOCALAPPDATA 'SpotifyScenes'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
try { $sid = $identity.User } finally { $identity.Dispose() }
$targets = @(
    @{ Path = $spotifyCache; Marker = Join-Path $state 'update-parent.rule'
       Rights = 'DeleteSubdirectoriesAndFiles'; Inheritance = 'None' }
    @{ Path = $staging; Marker = Join-Path $state 'update-staging.rule'
       Rights = 'Write,Delete,DeleteSubdirectoriesAndFiles,ExecuteFile'; Inheritance = 'ContainerInherit,ObjectInherit' }
)
if ($Action -eq 'Unblock' -and !(@($targets | Where-Object { Test-Path -LiteralPath $_.Marker }).Count)) { return }

function Get-UpdateRuleState($target) {
    $item = Get-Item -LiteralPath $target.Path -Force
    if (!$item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        throw "Expected an ordinary directory: $($target.Path)"
    }
    $acl = Get-Acl -LiteralPath $target.Path
    $denies = @($acl.GetAccessRules($true, $false, [Security.Principal.SecurityIdentifier]) |
        Where-Object { $_.IdentityReference -eq $sid -and $_.AccessControlType -eq 'Deny' })
    $rights = [Security.AccessControl.FileSystemRights]$target.Rights
    $inheritance = [Security.AccessControl.InheritanceFlags]$target.Inheritance
    $match = @($denies | Where-Object {
        $_.FileSystemRights -eq $rights -and $_.InheritanceFlags -eq $inheritance -and $_.PropagationFlags -eq 'None'
    })
    [pscustomobject]@{ Acl = $acl; Denies = $denies; Match = $match; Rights = $rights; Inheritance = $inheritance }
}

function Remove-OwnedUpdateRule($target) {
    if (!(Test-Path -LiteralPath $target.Marker)) { return }
    if ([IO.File]::ReadAllText($target.Marker) -ne $sid.Value) {
        throw "Update rule belongs to another Windows user: $($target.Marker)"
    }
    if (Test-Path -LiteralPath $target.Path) {
        $entry = Get-UpdateRuleState $target
        foreach ($rule in $entry.Match) { $entry.Acl.RemoveAccessRuleSpecific($rule) }
        if ($entry.Match.Count) { Set-Acl -LiteralPath $target.Path -AclObject $entry.Acl }
    }
    Remove-Item -LiteralPath $target.Marker
}

foreach ($target in $targets) {
    if (Test-Path -LiteralPath $target.Path) { $null = Get-UpdateRuleState $target }
}
if ($Action -eq 'Unblock') {
    foreach ($target in $targets) { Remove-OwnedUpdateRule $target }
    return
}
[void][IO.Directory]::CreateDirectory($staging)
[void][IO.Directory]::CreateDirectory($state)
$added = @()
try {
    foreach ($target in $targets) {
        $entry = Get-UpdateRuleState $target
        if ($entry.Match.Count) { continue }
        if ($entry.Denies.Count) { throw "Existing deny rules on $($target.Path) require manual review." }
        $rule = [Security.AccessControl.FileSystemAccessRule]::new($sid, $entry.Rights, $entry.Inheritance,
            [Security.AccessControl.PropagationFlags]::None, [Security.AccessControl.AccessControlType]::Deny)
        [IO.File]::WriteAllText($target.Marker, $sid.Value)
        $added += $target
        $entry.Acl.AddAccessRule($rule)
        Set-Acl -LiteralPath $target.Path -AclObject $entry.Acl
        if (!(Get-UpdateRuleState $target).Match.Count) { throw "Could not protect $($target.Path)" }
    }
    Write-Host 'Spotify automatic updates are blocked.'
} catch {
    foreach ($target in $added) { Remove-OwnedUpdateRule $target }
    throw
}
