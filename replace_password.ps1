$utf8NoBom = New-Object System.Text.UTF8Encoding $false

$files = Get-ChildItem "tests/e2e/steps/4_experiment_admin/*.ts"
foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
    $newContent = $content -replace 'admin123', 'expAdmin123'
    [System.IO.File]::WriteAllText($f.FullName, $newContent, $utf8NoBom)
    Write-Output ("Updated: " + $f.Name)
}

Write-Output "All done"
