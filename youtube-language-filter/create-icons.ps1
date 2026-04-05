Add-Type -AssemblyName System.Drawing

$dir = Join-Path $PSScriptRoot "icons"
New-Item -ItemType Directory -Force -Path $dir | Out-Null

function New-Icon([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g   = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode   = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Dark blue background
    $bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 20, 52, 100))
    $g.FillRectangle($bg, 0, 0, $size, $size)

    # White pen — thickness scales with icon size
    $penWidth = [float][Math]::Max(1.0, [float]$size / 20.0)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $penWidth)

    $pad = [int]([float]$size * 0.12)
    $d   = $size - 2 * $pad          # globe diameter

    # Outer circle
    $g.DrawEllipse($pen, $pad, $pad, $d, $d)

    # Equator (horizontal centre line)
    $cy = [int]($size / 2.0)
    $g.DrawLine($pen, $pad, $cy, $pad + $d, $cy)

    # Meridian (vertical ellipse, ~45 % of globe width)
    $mw = [int]([float]$d * 0.45)
    $mx = $pad + [int](([float]$d - $mw) / 2.0)
    $g.DrawEllipse($pen, $mx, $pad, $mw, $d)

    $out = Join-Path $dir "icon${size}.png"
    $bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $bg.Dispose(); $pen.Dispose()
    Write-Host "created $out"
}

New-Icon 16
New-Icon 48
New-Icon 128
