# 2.4.10-rc.1 macOS 兼容性测试版

**该版本对 Windows 用户没有功能或体验改进，Windows 用户无需升级，继续使用正式版 2.4.9。本预发布版仅用于测试本皮肤对 macOS 的兼容性。**

本次针对 [#3](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/issues/3)、[#5](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/issues/5)、[#6](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/issues/6)、[#7](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/issues/7) 的反馈修复。运行时模块识别与选择器调用点参考 Siyuan-Zhao770707 的 [PR #4](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/pull/4)，感谢他提供 macOS 调查和实现。

## 修复内容

- 从宿主 `<style>` 读取完整模块清单，以 CSS 和 JS 实际使用的类名组合识别模块，重写样式、DOM 查询和 `classList` 判断。组件尚未挂载时也能识别，宿主后续插入或更新样式时会重新解析。
- 同一哈希也计为解析成功，首屏直接绘制。含义不明的通用单名和并列候选不猜测；右侧栏签名同时要求 `panel`、`tabBody`，字号箭头同时要求 `arrow`、`stepper`、`arrows`。
- 只在宿主标记 `data-platform=darwin` 且非全屏时预留 48px 系统标题区域，并为左上角原生按钮设置 `no-drag` 区域；品牌横幅、内容区、分隔条和遮罩沿用响应式高度。全屏时收回预留区域。
- CI 矩阵增加 `macos-latest`；真实安装包验证由 `DSH_ASAR` 显式启用。没有该变量的 CI 会明确跳过两项宿主测试。

本候选包采用宿主原生红黄绿按钮；不包含 PR #4 的 AppleScript 辅助功能控制接口，也不要求新增系统授权。Windows 标题栏适配器仍按现有安装说明使用。

## 已完成的验证及边界

本地对 DSH `0.2.1-rc.3` Windows 安装包提取了 162 张宿主样式表，皮肤使用的 22 组 CSS／JS 模块全部解析。测试还把这份真实宿主的所有模块替换为另一套哈希，其中侧栏、框架、工作区行和列表使用反馈给出的 macOS 哈希，再检查所有模块和局部类名。

浏览器模拟加载实际 `lib/client.js`、真实宿主 CSS 及虚构 DOM，检查 DOM 查询、会话标题读取、输入框装饰，以及 520 / 800 / 1280 / 2000px 下 Mac 非全屏、Mac 全屏和 Windows 的顶部几何关系。另有延迟样式加载、样式文本更新、自身样式排除及停用清理测试。本地共 75 项测试通过（包含两项真实宿主检查），13 项浏览器检查通过，页面脚本错误为零；构建、语法检查、重复构建及打包内容核对通过。

上述结果不能证明 macOS 原生窗口按钮已恢复。当前没有 Mac 实机，也没有反馈者的完整 macOS `app.asar`。CI 覆盖 macOS、Windows 和 Linux 的构建及自动测试，但不包含加载 macOS 宿主或操作原生窗口按钮；本测试版仍需以下实机复测后再决定正式发布。

## Mac 复测

1. 在 Harness「插件 → 添加插件」里输入候选包 `dsh-industrial-acid-skin-2.4.10-rc.1.tgz` 的本机绝对路径，启用后重新加载。确认侧栏色条、悬浮卡片、MORE、工作区原生菜单和输入框装饰正常；切换经典／新版及白天／黑天后再检查一次。
2. 在普通窗口使用左上角红黄绿按钮最小化、全屏／退出全屏及关闭。确认顶部 48px 预留区域没有品牌按钮遮挡；窄窗口和全屏切换后横幅、输入区、左右侧栏仍对齐。
3. 如已安装 Node.js，可在源码目录运行下列只读检查。它不会启动应用或修改安装包；未解析的模块会列出并返回失败。

```sh
npm run build
DSH_ASAR="/Applications/DeepSeek Harness.app/Contents/Resources/app.asar" node tools/verify-build.cjs
DSH_ASAR="/Applications/DeepSeek Harness.app/Contents/Resources/app.asar" npm test
```

需要回退时，通过同一插件安装入口重新安装正式版 2.4.9。候选版保留现有外观偏好和工作区数据格式。
