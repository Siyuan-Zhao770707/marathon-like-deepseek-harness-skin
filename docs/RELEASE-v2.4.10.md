# v2.4.10 · Stable / 跨构建 CSS 适配与 macOS 窗口控制

本版基于 Siyuan-Zhao770707 的 [PR #4](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/pull/4)，修复不同 DeepSeek Harness 构建中的 CSS Module 类名前缀不一致造成的皮肤样式和交互失效问题。

## 更新内容

- CSS Module 哈希在运行时识别和替换。样式表扫描、局部类名组合匹配、DOM 选择器及 classList 判断使用当前宿主的真实类名。
- 优化首屏等待和模块延迟加载，补充同哈希匹配、超时重试以及样式表变化处理。
- macOS 使用右上角竖向窗口按钮；缺少宿主原生窗口通道时，由插件 Host 使用 AppleScript 和辅助功能接口实现最小化及全屏。**这些 macOS 操作可能需要额外的系统辅助功能授权。**
- 保留 Windows 已有的配色、工作区、新旧侧栏、动效、输入框以及可选的 Windows 标题栏适配器。

## 测试情况

**Windows：维护者已在真实 Windows DeepSeek Harness 中安装并确认 v2.4.10 候选运行正常。** Windows CI 完成 90/90 项自动测试，三平台（Windows、macOS、Ubuntu）的自动构建、语法检查和打包检查通过。

**macOS：自动化测试通过并有来自贡献者的真实 Mac 宿主分析，但新窗口控制方案尚待完整 macOS 桌面实测。** 尤其是辅助功能授权、最小化、全屏和多窗口行为，欢迎反馈。请勿将 CI 通过理解为已验证所有 Mac 原生窗口交互。

## 安装

下载本 Release 附件中的 dsh-industrial-acid-skin-2.4.10.tgz，或在 Harness → 插件 → 添加插件输入完整地址：

https://github.com/yasneg616/marathon-like-deepseek-harness-skin/releases/download/v2.4.10/dsh-industrial-acid-skin-2.4.10.tgz

也可以输入下载后的本机绝对路径。安装后启用并按提示重启，无需 Node.js。升级保留工作区和皮肤偏好，出现问题可通过重新安装 [v2.4.9 正式版](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/releases/tag/v2.4.9) 回退。

Windows 的**可选标题栏适配器**沿用既有方案；如果此前已经安装并正常工作，不需要重新安装。需要新安装的用户可在 [v2.4.9 Release](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/releases/tag/v2.4.9) 找到 dsh-industrial-caption-adapter-2.4.9.zip，并先按 [适配器说明](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/blob/main/docs/DESKTOP-ADAPTER.md) 验证原始宿主版本和哈希，切勿强行应用未知构建。

本 Release 包含 SHA256SUMS.txt 供校验。

## 致谢

特别感谢 [Siyuan-Zhao770707](https://github.com/Siyuan-Zhao770707) 的 macOS 深入调查、详尽的问题报告和完整的代码贡献：[PR #4](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/pull/4)、[#3](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/issues/3)、[#5](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/issues/5)、[#6](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/issues/6)、[#7](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/issues/7)。原始提交历史和贡献署名完整保留。
