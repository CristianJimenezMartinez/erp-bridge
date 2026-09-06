Add-Type -AssemblyName System.Drawing

$iconDir = "g:\Otros ordenadores\Mi PC\Bentian\erp-bridge\apps\dashboard\src-tauri\icons"
if (!(Test-Path $iconDir)) {
    New-Item -ItemType Directory -Path $iconDir -Force | Out-Null
}

# Crear imagen base 256x256
$bmp = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

# Fondo morado indigo elegante (#4f46e5)
$brushBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(79, 70, 229))
$g.FillRectangle($brushBg, 0, 0, 256, 256)

# Texto "EB" en blanco centrado
$brushText = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$font = New-Object System.Drawing.Font("Arial", 96, [System.Drawing.FontStyle]::Bold)
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$rect = New-Object System.Drawing.RectangleF 0, 0, 256, 256
$g.DrawString("EB", $font, $brushText, $rect, $sf)

# Guardar icon.png y diferentes resoluciones
$bmp.Save("$iconDir\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp128 = New-Object System.Drawing.Bitmap($bmp, 128, 128)
$bmp128.Save("$iconDir\128x128.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmp32 = New-Object System.Drawing.Bitmap($bmp, 32, 32)
$bmp32.Save("$iconDir\32x32.png", [System.Drawing.Imaging.ImageFormat]::Png)

$bmpSquare = New-Object System.Drawing.Bitmap($bmp, 128, 128)
$bmpSquare.Save("$iconDir\Square150x150Logo.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Guardar archivo .ico
$hIcon = $bmp.GetHicon()
$ico = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream("$iconDir\icon.ico", [System.IO.FileMode]::Create)
$ico.Save($fs)
$fs.Close()

Write-Host "Iconos de Tauri generados con exito en $iconDir"
