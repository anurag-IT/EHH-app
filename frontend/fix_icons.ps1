
Add-Type -AssemblyName System.Drawing
$imgPath = 'e:\EHH\App\smart-social-image-tracking-system\frontend\public\logo.png'
$outPath = 'e:\EHH\App\smart-social-image-tracking-system\frontend\public\pwa-512x512.png'
$outPath192 = 'e:\EHH\App\smart-social-image-tracking-system\frontend\public\pwa-192x192.png'

$img = [System.Drawing.Image]::FromFile($imgPath)

# Determine the non-white boundaries (simplified: just crop the center)
# Actually, let's just scale the logo to fit the width and center vertically in a square
$targetSize = 512
$newImg = New-Object System.Drawing.Bitmap($targetSize, $targetSize)
$g = [System.Drawing.Graphics]::FromImage($newImg)
$g.Clear([System.Drawing.Color]::White)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Scale to fit width
$ratio = $targetSize / $img.Width
$newHeight = $img.Height * $ratio
$y = ($targetSize - $newHeight) / 2

$g.DrawImage($img, 0, $y, $targetSize, $newHeight)

$newImg.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$newImg.Save('e:\EHH\App\smart-social-image-tracking-system\frontend\public\icons\icon-512x512.png', [System.Drawing.Imaging.ImageFormat]::Png)

# 192 version
$newImg192 = New-Object System.Drawing.Bitmap(192, 192)
$g192 = [System.Drawing.Graphics]::FromImage($newImg192)
$g192.Clear([System.Drawing.Color]::White)
$g192.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g192.DrawImage($newImg, 0, 0, 192, 192)
$newImg192.Save($outPath192, [System.Drawing.Imaging.ImageFormat]::Png)
$newImg192.Save('e:\EHH\App\smart-social-image-tracking-system\frontend\public\icons\icon-192x192.png', [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$g192.Dispose()
$newImg.Dispose()
$newImg192.Dispose()
$img.Dispose()
