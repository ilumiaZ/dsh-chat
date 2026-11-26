# dsh-chat

把 [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo) 包成一个独立的 Android App，用你自己的 DeepSeek API Key 在手机上全量使用——不受网页端的产品限额约束。

> 当前阶段：**M1，纯单机**。数据只存在手机本地，没有任何自建后端，唯一的网络请求直连 `api.deepseek.com`。

## 装到手机

1. 打开本仓库的 [Actions](../../actions/workflows/android.yml) 页面，选最新一次成功的 `android-apk` 运行。
2. 拉到底部 **Artifacts**，下载 `dsh-chat-debug-apk`。
3. 解压得到 `dsh-chat-debug.apk`，传到手机安装（需要允许"安装未知来源应用"）。
4. 首次打开 → 设置 → 填入 DeepSeek API Key（[在这里申请](https://platform.deepseek.com/api_keys)）。

> 目前是 debug 签名，用来验证形态。等进入日常使用前会换成固定 keystore，否则覆盖安装会被系统拒绝、只能卸载重装（那样会清掉本地聊天记录）。

## 能做什么

功能和 DeepSeek 网页端对齐，因为这些能力由服务端提供：联网搜索、深度思考搜索、阅读链接与引用、PDF/Office/图片上传解析、语音输入、朗读回答、会话标题、编辑/重生成/消息分支、导入网页端导出的历史对话。

上限按 API 走：上下文 1M、单轮输出 384K，没有按天/按条的消息数限制。

## 构建

不在本地装任何 Node 或 Android 环境，全部在 GitHub Actions 上跑：

- `app/` 是上游 chat-demo 的源码（v0.1.4，未改动），`pnpm build` 产出静态站点
- 静态站点复制到 `www/`，由 Capacitor 打进 APK
- `android/` 由 `npx cap add android` 在 CI 里生成，不进版本库

本地要复现的话：

```bash
cd app && pnpm install --frozen-lockfile && pnpm build
cd .. && mkdir -p www && cp -R app/dist/. www/
npm install
npx cap add android && npx cap sync android
cd android && ./gradlew assembleDebug
```

## 路线图

- **M1**（当前）：Capacitor 壳 + APK，纯单机
- **M2**：局域网按需同步——PC 上跑一个可开关的本地服务，文本经它中转合并，手机扫码配对
- **M3**：附件走同一条局域网通道，沉淀到 PC

## 许可证

MIT。上游 chat-demo 的版权归 DeepSeek 所有，见 [LICENSE](LICENSE) 与 [NOTICE](NOTICE)。本仓库只做包装与后续改动。
