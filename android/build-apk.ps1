$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$sdkRoot = Join-Path $env:LOCALAPPDATA 'Android/Sdk'
$javaBin = 'C:/Program Files/Android/Android Studio/jbr/bin'
$buildTools = Join-Path $sdkRoot 'build-tools/36.0.0'
$androidJar = Join-Path $sdkRoot 'platforms/android-36.1/android.jar'
$buildDir = Join-Path $PSScriptRoot 'build'
$privateDir = Join-Path $PSScriptRoot 'private'
$outputDir = Join-Path $projectRoot 'downloads'
$assetPackage = Join-Path $buildDir ('package-' + [Guid]::NewGuid().ToString('N'))
$assetDir = Join-Path $assetPackage 'assets'
foreach ($dir in @($buildDir, "$buildDir/assets", "$buildDir/classes", "$buildDir/dex", $privateDir, $outputDir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
function Run-Tool($tool, $toolArgs) { & $tool @toolArgs; if ($LASTEXITCODE -ne 0) { throw "Build failed: $tool" } }
New-Item -ItemType Directory -Force -Path "$assetDir/assets" | Out-Null
Get-ChildItem -LiteralPath $projectRoot -File | Where-Object { $_.Extension -in @('.html','.css','.js','.png','.jpg','.webmanifest') } | Copy-Item -Destination $assetDir
Get-ChildItem -LiteralPath "$projectRoot/assets" | Copy-Item -Destination "$assetDir/assets" -Recurse -Force
Run-Tool "$buildTools/aapt2.exe" @('compile','--dir',"$PSScriptRoot/res",'-o',"$buildDir/resources.zip")
Run-Tool "$buildTools/aapt2.exe" @('link','-o',"$buildDir/unsigned.apk",'--manifest',"$PSScriptRoot/AndroidManifest.xml",'-I',$androidJar,"$buildDir/resources.zip")
Run-Tool "$javaBin/jar.exe" @('uf',"$buildDir/unsigned.apk",'-C',$assetPackage,'assets')
Run-Tool "$javaBin/javac.exe" @('-encoding','UTF-8','-source','8','-target','8','-classpath',$androidJar,'-d',"$buildDir/classes","$PSScriptRoot/src/tw/ecogame/mario/MainActivity.java")
$classFiles = @(Get-ChildItem "$buildDir/classes" -Filter '*.class' -Recurse | ForEach-Object { $_.FullName })
Run-Tool "$javaBin/java.exe" (@('-cp',"$buildTools/lib/d8.jar",'com.android.tools.r8.D8','--lib',$androidJar,'--min-api','26','--output',"$buildDir/dex") + $classFiles)
Push-Location "$buildDir/dex"
try { Run-Tool "$javaBin/jar.exe" @('uf',"$buildDir/unsigned.apk",'classes.dex') } finally { Pop-Location }
Run-Tool "$buildTools/zipalign.exe" @('-f','-p','4',"$buildDir/unsigned.apk","$buildDir/aligned.apk")
$passwordFile = Join-Path $privateDir 'signing-password.txt'
$keyFile = Join-Path $privateDir 'eco-mario-release.p12'
if (!(Test-Path $keyFile)) {
  if (!(Test-Path $passwordFile)) { [IO.File]::WriteAllText($passwordFile, [Guid]::NewGuid().ToString('N')) }
  Run-Tool "$javaBin/keytool.exe" @('-genkeypair','-keystore',$keyFile,'-storetype','PKCS12','-storepass:file',$passwordFile,'-keypass:file',$passwordFile,'-alias','eco-mario','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=Eco-Mario, O=Eco Game, C=TW')
}
$apk = Join-Path $outputDir 'Eco-Mario-1.0.2.apk'
Run-Tool "$javaBin/java.exe" @('-jar',"$buildTools/lib/apksigner.jar",'sign','--ks',$keyFile,'--ks-key-alias','eco-mario','--ks-pass',"file:$passwordFile",'--out',$apk,"$buildDir/aligned.apk")
Run-Tool "$javaBin/java.exe" @('-jar',"$buildTools/lib/apksigner.jar",'verify',$apk)
Write-Host "APK ready: $apk"
