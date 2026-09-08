Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
$notifyIcon.Text = "Bentian ERP Bridge"
$notifyIcon.Visible = $true

$contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

$itemHeader = $contextMenu.Items.Add("Bentian ERP Bridge v0.1.0")
$itemHeader.Enabled = $false

$itemStatus = $contextMenu.Items.Add("Estado: Sincronizacion Activa")
$itemStatus.Enabled = $false

$contextMenu.Items.Add("-") | Out-Null

$itemOpen = $contextMenu.Items.Add("Abrir Panel de Control")

$contextMenu.Items.Add("-") | Out-Null

$itemExit = $contextMenu.Items.Add("Salir")

function Open-BentianWindow {
    $edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    $chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
    $dashboardUrl = "https://bridge.cristianjm.com/dashboard"
    if (Test-Path $edgePath) {
        Start-Process $edgePath -ArgumentList "--app=$dashboardUrl", "--window-size=1280,840"
    } elseif (Test-Path $chromePath) {
        Start-Process $chromePath -ArgumentList "--app=$dashboardUrl", "--window-size=1280,840"
    } else {
        Start-Process $dashboardUrl
    }
}

$itemOpen.add_Click({
    Open-BentianWindow
})

$notifyIcon.add_DoubleClick({
    Open-BentianWindow
})

$itemExit.add_Click({
    $notifyIcon.Visible = $false
    [System.Windows.Forms.Application]::Exit()
})

$notifyIcon.BalloonTipTitle = "Bentian ERP Bridge"
$notifyIcon.BalloonTipText = "Sincronizacion activa en segundo plano. Doble clic para abrir panel."
$notifyIcon.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
$notifyIcon.ContextMenuStrip = $contextMenu
$notifyIcon.ShowBalloonTip(4000)

[System.Windows.Forms.Application]::Run()
