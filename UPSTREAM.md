# 上游来源

| 项 | 值 |
|---|---|
| 仓库 | https://github.com/deepseek-ai/chat-demo |
| 版本 | v0.1.4（2026-11-24 发布） |
| 许可证 | MIT |
| 引入方式 | 按 v0.1.4 的文件清单从 jsDelivr 逐文件取回，落在 `app/` |

`app/` 目录保持与上游 v0.1.4 一致，除下列内容外未做改动：

- 移除了 `app/.github/`（上游自己的 Pages 工作流，对本仓库无意义）

## 后续改动约定

需要修改客户端行为时（例如 M2 的同步模块），改动直接落在 `app/src/`，并在本文件记录：

| 日期 | 文件 | 改动 |
|---|---|---|
| 2026-11-27 | `services/settings.ts`、`services/api/types.ts`、`services/chat/types.ts`、`services/chat/store.ts`、`components/settings/SettingsDialog.tsx`、`i18n/{zh,en}.ts` | 新增模型选择（`deepseek-flash` / `deepseek-v4-pro`）与思考强度（`low`/`high`/`max`，通过 Anthropic 格式的 `output_config.effort` 传入）；选择 v4-pro 时不声明任何服务端工具 |
| 2026-11-27 | `main.tsx`、`components/files/PreviewOverlay.tsx`、`PreviewOverlay.module.css` | 接管 `target=_blank`：图片走应用内预览（返回键可关），外链交给 `@capacitor/browser`。修复上游用新窗口打开图片时 WebView 停在空白页、无法退出的问题 |

## 升级上游

上游发新版时，按同样方式取回新 tag 的文件覆盖 `app/`，然后用 `git diff` 复核本地改动是否还在。因为 `app/` 是完整副本而不是 submodule，升级是一次覆盖操作，本地改动要单独保留。
