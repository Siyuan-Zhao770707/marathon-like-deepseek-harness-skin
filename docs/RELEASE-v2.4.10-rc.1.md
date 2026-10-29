# 2.4.10-rc.1 — macOS 兼容性测试版

**该版本对 Windows 用户没有功能或体验改进，Windows 用户无需升级，继续使用正式版 [v2.4.9](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/releases/tag/v2.4.9)。**

本版本是用于测试本皮肤对 **macOS 兼容性**的预发布测试版。根据 Mac 用户的反馈尝试修复，尚未完成 Mac 实机验证，不作为已验证的 macOS 正式版推荐。

## 本次测试内容

- 尝试修复同一 Harness 版本在不同平台、不同构建中 CSS module 哈希不一致，导致工作区色条、输入框装饰及相关交互失效的问题。样式和交互选择器统一在运行时解析，并补充歧义匹配与延迟样式加载检查。
- Mac 非全屏窗口顶部为系统红黄绿按钮预留 48px，并排除按钮区域的拖拽命中；全屏时收回预留区域。使用宿主原生按钮，无需新增辅助功能授权。
- 增加 macOS CI，检查跨平台构建和自动测试。CI 不包含 macOS 宿主界面及原生窗口操作。

感谢 [Siyuan-Zhao770707](https://github.com/Siyuan-Zhao770707) 的详细调查与 [PR #4](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/pull/4)，以及 [#3](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/issues/3)、[#5](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/issues/5)、[#6](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/issues/6)、[#7](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/issues/7) 中的反馈。本版参考其选择器方案；原生窗口按钮采用顶部留白方案。

## Mac 用户测试安装

在 Harness「插件 → 添加插件」的**包名或地址**输入框粘贴以下完整地址，安装后启用；如提示需要重启，再重启客户端。日常安装无需 Node.js 或源码构建。

```text
https://github.com/yasneg616/marathon-like-deepseek-harness-skin/releases/download/v2.4.10-rc.1/dsh-industrial-acid-skin-2.4.10-rc.1.tgz
```

也可先下载 `.tgz`，再输入文件的本机绝对路径。Release 同时提供 `SHA256SUMS.txt`。本版本不附带 Windows 标题栏适配器。

请重点复测：工作区色条及悬浮卡片、MORE、工作区菜单、输入框装饰、经典／新版切换、明暗模式，以及红黄绿按钮在普通窗口和全屏切换后的表现。完整说明见 [macOS 复测步骤](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/blob/main/docs/MACOS-COMPATIBILITY.md)。

如遇异常，可通过同一插件安装入口重新安装正式版 v2.4.9；外观偏好及工作区数据格式保留。

## 验证范围

本地构建、语法检查和 **75 项自动测试**通过；从 Windows DSH `0.2.1-rc.3` 安装包提取宿主样式后，皮肤依赖的 **22 组 CSS／JS 模块全部解析**，替换全部模块哈希的回归也通过。另有 **13 项浏览器模拟检查**通过，覆盖 520 / 800 / 1280 / 2000px 下的顶部布局及全屏标记切换。

这些自动测试和模拟结果不等于 Mac 实机验证；尤其是原生红黄绿按钮是否恢复可点，仍需 Mac 用户确认。正式版保持 v2.4.9。
