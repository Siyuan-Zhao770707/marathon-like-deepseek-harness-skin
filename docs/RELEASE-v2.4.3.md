# v2.4.3 | User bubble readability hotfix

修复皮肤「白天」模式下，Harness 原生主题仍为深色时，用户消息气泡可能保留深色背景，而文字变为深色导致难以阅读的问题。

- 为用户消息气泡补齐 `--dsw-specific-bubble` 和 `--dsw-specific-bubble-highlight` 主题 Token，使背景、高亮与正文共同跟随皮肤 Day / Night / Follow app 模式。
- 保留 Harness 原生主题设置，不强制修改宿主 Dark/Light 状态。
- 新增皮肤与宿主 6 种模式组合的回归测试，并将气泡背景与高亮纳入自定义调色盘对比度测试（目标不低于 WCAG AA 4.5:1）。
- 更新预编译客户端 `lib/client.js`，用户可以直接安装本页的 `dsh-industrial-acid-skin-2.4.3.tgz`，无需自行构建。

兼容声明保持为 DSH `>=0.2.0-rc.2 <0.2.2-0`；未对新版宿主运行效果作额外保证。

验证：发布工作流执行构建、语法检查、自动测试，并核对生成客户端与仓库版本一致。尚未在反馈用户的实际客户端中复现或进行 Electron 窗口实测。

安装：在 Harness 的「插件 → 添加插件」导入 `.tgz` 运行包并启用。原有皮肤偏好无需清空。可选的 Windows 标题栏适配器未修改，历史安装包仍在 v2.4.2 Release。
