# dsh-chat

把 [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo) 包成一个独立的 Android App，用你自己的 DeepSeek API Key 在手机上全量使用——不受网页端的产品限额约束。

> 当前阶段：**M1，纯单机**。数据只存在手机本地，没有任何自建后端，唯一的网络请求直连 `api.deepseek.com`。

## 装到手机

1. 取 `out/dsh-chat-0.1.0-debug.apk`（或自己构建，见下），传到手机安装（需要允许"安装未知来源应用"）。
2. 首次打开 → 设置 → 填入 DeepSeek API Key（[在这里申请](https://platform.deepseek.com/api_keys)）。

> 目前是 debug 签名，用来验证形态。等进入日常使用前会换成固定 keystore，否则覆盖安装会被系统拒绝、只能卸载重装（那样会清掉本地聊天记录）。

## 能做什么

功能和 DeepSeek 网页端对齐，因为这些能力由服务端提供：联网搜索、深度思考搜索、阅读链接与引用、PDF/Office/图片上传解析、语音输入、朗读回答、会话标题、编辑/重生成/消息分支、导入网页端导出的历史对话。

上限按 API 走：上下文 1M、单轮输出 384K，没有按天/按条的消息数限制。

## 构建

两条路，目前走的是第一条：

**本地（当前可用）** —— 便携工具链放在 `%LOCALAPPDATA%\dsh-chat\toolchain`，不污染系统 PATH：

```powershell
.\scripts\build-local.ps1
```

细节和两个 Windows 特有的绕路（`rm -rf`、国内镜像）见 [scripts/BUILD-LOCAL.md](scripts/BUILD-LOCAL.md)。

**GitHub Actions（已就绪，待启用）** —— `.github/workflows/android.yml` 会在 push 到 `main` 时构建
并上传 APK。这个文件目前推不上去：GitHub 要求 token 带 `workflow` 权限才能写
`.github/workflows/`，当前 `gh` 登录的 token 没有。补一条命令即可启用：

```bash
gh auth refresh -h github.com -s workflow
```

之后把该文件提交上去，Actions 就会接管构建，本机只需要 `git push`。

结构上：`app/` 是上游 chat-demo 源码，`pnpm build` 产出静态站点；静态站点复制到 `www/`，
由 Capacitor 打进 APK；`android/` 由 `npx cap add android` 生成，不进版本库。

## 相对上游的改动

- **模型选择**：`deepseek-flash` / `deepseek-v4-pro`。选 v4-pro 时不声明任何服务端工具（该模型不支持搜索、文件与图片解析）。
- **思考强度**：低 / 高 / 最高，走 Anthropic 格式的 `output_config.effort`，仅在开启深度思考时发送。
- **图片预览**：上游用 `target=_blank` 打开图片，在 Android WebView 里会停在空白页且退不出来。改成应用内覆盖层，返回键可关；外链交给 `@capacitor/browser`。
- **大 PDF 自动分页**：超过 4 MB 的 PDF 在上传前用 pdf-lib 按页拆成多份（每份约 12 页），绕开服务端「单条消息里的文档 32K token」的限制。移动端手动切 PDF 不现实，所以放在应用里做。

## 路线图

- **M1**（当前）：Capacitor 壳 + APK，纯单机
- **M2**：局域网按需同步——PC 上跑一个可开关的本地服务，文本经它中转合并，手机扫码配对
- **M3**：附件走同一条局域网通道，沉淀到 PC

## 许可证

MIT。上游 chat-demo 的版权归 DeepSeek 所有，见 [LICENSE](LICENSE) 与 [NOTICE](NOTICE)。本仓库只做包装与后续改动。
