# 构建 dsh-chat 的 debug APK。用法：在仓库根目录执行 .\scripts\build-local.ps1
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$root = Split-Path -Parent $PSScriptRoot
$tool = Join-Path $env:LOCALAPPDATA 'dsh-chat\toolchain'
$node = Join-Path $tool 'node'
$jdk = Join-Path $tool 'jdk'
$sdk = Join-Path $tool 'android-sdk'

foreach ($p in @((Join-Path $node 'node.exe'), (Join-Path $jdk 'bin\java.exe'), (Join-Path $sdk 'cmdline-tools\latest\bin\sdkmanager.bat'))) {
  if (-not (Test-Path $p)) { throw "缺少工具链组件：$p（见 scripts/BUILD-LOCAL.md）" }
}

$env:JAVA_HOME = $jdk
$env:ANDROID_HOME = $sdk
$env:ANDROID_SDK_ROOT = $sdk
$env:PATH = "$node;$jdk\bin;$sdk\platform-tools;$sdk\cmdline-tools\latest\bin;$env:PATH"
$pnpm = Join-Path $node 'pnpm.cmd'
$npm = Join-Path $node 'npm.cmd'
$npx = Join-Path $node 'npx.cmd'

Write-Host '==> 构建前端资源' -ForegroundColor Cyan
Push-Location (Join-Path $root 'app')
try {
  if (-not (Test-Path 'node_modules')) { & $pnpm install --frozen-lockfile }
  # 上游的 build 脚本用了 rm -rf，Windows 下跑不了，这里直接调用 rspack
  if (Test-Path 'dist') { Remove-Item -Recurse -Force 'dist' }
  $env:NODE_ENV = 'production'
  & $pnpm exec rspack build -c rspack.config.ts
  if ($LASTEXITCODE -ne 0) { throw "rspack 构建失败：$LASTEXITCODE" }
} finally { Pop-Location }

Write-Host '==> 复制到 www/' -ForegroundColor Cyan
$www = Join-Path $root 'www'
if (Test-Path $www) { Remove-Item -Recurse -Force $www }
New-Item -ItemType Directory -Path $www | Out-Null
Copy-Item (Join-Path $root 'app\dist\*') $www -Recurse -Force

Write-Host '==> 准备 Capacitor' -ForegroundColor Cyan
Push-Location $root
try {
  if (-not (Test-Path 'node_modules')) { & $npm install --no-audit --no-fund }

  $manifest = Join-Path $root 'android\app\src\main\AndroidManifest.xml'
  if (-not (Test-Path $manifest)) {
    & $npx cap add android
    if ($LASTEXITCODE -ne 0) { throw "cap add android 失败：$LASTEXITCODE" }
  }

  # 语音输入需要录音权限；明文流量留给局域网同步用
  $xml = Get-Content $manifest -Raw
  $changed = $false
  if ($xml -notmatch 'RECORD_AUDIO') {
    $xml = $xml -replace '(?s)(\s*<uses-permission android:name="android.permission.INTERNET" />)',
      "`$1`r`n    <uses-permission android:name=`"android.permission.RECORD_AUDIO`" />`r`n    <uses-permission android:name=`"android.permission.MODIFY_AUDIO_SETTINGS`" />"
    $changed = $true
  }
  if ($xml -notmatch 'usesCleartextTraffic') {
    $xml = $xml -replace '<application\s*\r?\n(\s*)android:allowBackup="true"',
      "<application`r`n`$1android:allowBackup=`"true`"`r`n`$1android:usesCleartextTraffic=`"true`""
    $changed = $true
  }
  if ($changed) { Set-Content -Path $manifest -Value $xml -NoNewline -Encoding UTF8 }

  & $npx cap sync android
  if ($LASTEXITCODE -ne 0) { throw "cap sync 失败：$LASTEXITCODE" }
} finally { Pop-Location }

Write-Host '==> Gradle 打包' -ForegroundColor Cyan
Push-Location (Join-Path $root 'android')
try {
  & .\gradlew.bat assembleDebug --no-daemon --console=plain
  if ($LASTEXITCODE -ne 0) { throw "Gradle 构建失败：$LASTEXITCODE" }
} finally { Pop-Location }

$apk = Join-Path $root 'android\app\build\outputs\apk\debug\app-debug.apk'
$out = Join-Path $root 'out'
New-Item -ItemType Directory -Force -Path $out | Out-Null
$name = 'dsh-chat-1.2-debug.apk'
Copy-Item $apk (Join-Path $out $name) -Force
Write-Host ("==> 完成：out\$name  ({0:N1} MB)" -f ((Get-Item $apk).Length / 1MB)) -ForegroundColor Green
