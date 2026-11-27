# 本地构建 APK

不需要 Android Studio，也不需要全局安装 Node / JDK。工具链是便携版，放在
`%LOCALAPPDATA%\dsh-chat\toolchain`，包含：

| 组件 | 版本 | 来源 |
|---|---|---|
| Node | v22.23.5 | nodejs.org 便携包 |
| JDK | Zulu 21.0.8 | cdn.azul.com |
| Android cmdline-tools | 11076708 | dl.google.com |
| platforms;android-36 / build-tools;36.0.0 | — | sdkmanager |

首次准备（已经做过可跳过）：

```powershell
$tool = "$env:LOCALAPPDATA\dsh-chat\toolchain"
# 解压 node.zip / jdk.zip / cmdline-tools.zip 后：
$env:JAVA_HOME = "$tool\jdk"
& "$tool\android-sdk\cmdline-tools\latest\bin\sdkmanager.bat" --licenses
& "$tool\android-sdk\cmdline-tools\latest\bin\sdkmanager.bat" platform-tools "platforms;android-36" "build-tools;36.0.0"
```

之后每次构建：

```powershell
.\scripts\build-local.ps1
```

产物在 `out/dsh-chat-<version>-debug.apk`。

## 两个只在本地才需要的绕路

1. **`pnpm build` 在 Windows 上跑不了**——上游脚本里是 `rm -rf dist`。构建脚本直接调
   `pnpm exec rspack build -c rspack.config.ts`，等价但跨平台。
2. **Gradle 发行包和 Maven 依赖从国内镜像取**——`android/gradle/wrapper/gradle-wrapper.properties`
   指向腾讯云镜像，`android/build.gradle` 加了阿里云 Maven 镜像（官方仓库保留为回落）。
   这些文件在 `android/` 下，而 `android/` 不进版本库，所以只影响本地。

## 签名

目前用 debug keystore（`%USERPROFILE%\.android\debug.keystore`）。只要这台机器上这个文件还在，
重新构建出的 APK 签名一致，可以覆盖安装而不丢数据。**换机器或删了这个文件，就必须先导出数据再卸载重装。**
