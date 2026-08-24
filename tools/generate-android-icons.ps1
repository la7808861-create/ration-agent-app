Add-Type -AssemblyName System.Drawing

$root = Resolve-Path "$PSScriptRoot\..\android\app\src\main\res"
$sizes = @{
  "mipmap-mdpi" = 48
  "mipmap-hdpi" = 72
  "mipmap-xhdpi" = 96
  "mipmap-xxhdpi" = 144
  "mipmap-xxxhdpi" = 192
}

function New-Icon($path, $size, $round) {
  $bitmap = New-Object System.Drawing.Bitmap $size, $size
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::Transparent)

  $green = [System.Drawing.Color]::FromArgb(34, 97, 91)
  $cream = [System.Drawing.Color]::FromArgb(246, 243, 236)
  $gold = [System.Drawing.Color]::FromArgb(216, 155, 66)

  $bgBrush = New-Object System.Drawing.SolidBrush $green
  if ($round) {
    $graphics.FillEllipse($bgBrush, 0, 0, $size, $size)
  } else {
    $radius = [int]($size * 0.18)
    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $pathObj = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $radius * 2
    $pathObj.AddArc($rect.X, $rect.Y, $diameter, $diameter, 180, 90)
    $pathObj.AddArc($rect.Right - $diameter, $rect.Y, $diameter, $diameter, 270, 90)
    $pathObj.AddArc($rect.Right - $diameter, $rect.Bottom - $diameter, $diameter, $diameter, 0, 90)
    $pathObj.AddArc($rect.X, $rect.Bottom - $diameter, $diameter, $diameter, 90, 90)
    $pathObj.CloseFigure()
    $graphics.FillPath($bgBrush, $pathObj)
  }

  $paperBrush = New-Object System.Drawing.SolidBrush $cream
  $paper = New-Object System.Drawing.RectangleF ($size * 0.24), ($size * 0.22), ($size * 0.50), ($size * 0.56)
  $graphics.FillRectangle($paperBrush, $paper)

  $pen = New-Object System.Drawing.Pen $green, ([Math]::Max(3, $size * 0.055))
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  foreach ($y in @(0.34, 0.46, 0.58)) {
    $graphics.DrawLine($pen, ($size * 0.32), ($size * $y), ($size * 0.66), ($size * $y))
  }

  $goldBrush = New-Object System.Drawing.SolidBrush $gold
  $graphics.FillEllipse($goldBrush, ($size * 0.60), ($size * 0.62), ($size * 0.20), ($size * 0.20))

  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}

foreach ($entry in $sizes.GetEnumerator()) {
  $dir = Join-Path $root $entry.Key
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  New-Icon (Join-Path $dir "ic_launcher.png") $entry.Value $false
  New-Icon (Join-Path $dir "ic_launcher_round.png") $entry.Value $true
  New-Icon (Join-Path $dir "ic_launcher_foreground.png") ([int]($entry.Value * 2.25)) $false
}
