# 安装与开发

## 安装

1. 优先从 [v2.4.3 Release](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/releases/tag/v2.4.3) 下载运行包，也可从本仓库源码运行下方构建命令生成 `dsh-industrial-acid-skin-2.4.3.tgz`。历史公开版本见 [Releases](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/releases)。
2. 在 Harness 的“插件 → 添加插件”中选择运行包并启用。
3. 在侧栏底部的调色盘或“设置 → 通用设置 → 皮肤外观”调整颜色和动效。

运行包内置字体、SVG 和编译后的客户端，皮肤资源可离线加载。插件包名保留 `dsh-industrial-acid-skin`，便于现有安装升级并保留外观偏好。

核心皮肤使用 `ctx.theme.overrideTokens` 和原生扩展槽。2.4.3 延续 DSH `>=0.2.0-rc.2 <0.2.2-0`，包含 0.2.1 的 RC 与正式版；本次实际桌面验证版本为 0.2.1-rc.2。更高版本需要重新核对接口。更新插件无需修改应用 archive。

Windows 运行窗口图标沿用 2.4.1 的可撤销实现，停用插件时恢复原图标。下述标题栏适配器支持已核对哈希的原始 0.2.0-rc.2 与 0.2.1-rc.2；它是运行包之外的可选桌面适配步骤。

## 构建与测试

需要 Node.js 22 或更新版本及 npm。构建与测试使用 Node.js 内置模块，不需要安装 Harness 的私有 SDK；实际运行由 Harness 提供 React 和宿主服务。

```sh
git clone https://github.com/yasneg616/marathon-like-deepseek-harness-skin.git
cd marathon-like-deepseek-harness-skin
npm run build
npm run check
npm test
npm pack
```

`npm pack` 生成可导入的 `.tgz` 运行包。仓库提交了 `lib/client.js`，可以检查构建前后的差异。

40 项自动测试覆盖插件撤销、配色与对比度、工作区编号及选择、原生桥接权限、模型与推理等级、随机 Max 轮次、连续位置提交、遮罩方向与色块，以及侧栏和分栏边界。新增检查包括 token 界限、等号边界、北京时间与闰年、缓存输入、分叉继承排除、跨工作区和子代理合计、失败提示、查询释放与轮询撤销。新增折叠状态测试覆盖偏好保存、重新挂载、多窗口同步及存储不可用时的降级。自动测试使用宿主模拟环境，不能替代真实 Electron 窗口的兼容性验证。

2.4.0 另在真实本机 Host 的 Edge 页面检查了活动图、界限保存、四色联动、断线恢复、收起侧栏、390–1586 像素窗口、原生指令菜单以及插件停用和重新启用；独立解析本机历史日志，对最近 18 周逐日核对一致。验证未发送会话消息，未单独捕获 Electron 原生窗口。示例 GIF 使用独立展示计数。

2.4.3 补齐原生用户消息气泡的背景和高亮 Token，新增皮肤明暗与宿主明暗交叉测试，并将用户气泡加入自定义色板对比度测试。自动测试不等同于实际用户会话截图；下面列出的桌面实测属于 2.4.2。

2.4.2 在真实 Windows / DSH 0.2.1-rc.2 窗口通过 15 项检查：鼠标与键盘折叠、设置入口、侧栏切换保留状态、刷新恢复、明暗配色和 800×600 视口；页面运行错误为零。验证未发送会话消息。

## 每日 token 活动

活动图使用最近 18 周的日期，按 `Asia/Shanghai` 划分每日边界。默认界限为 `1000000`、`10000000`、`50000000`，可在活动图齿轮、调色盘或通用设置中修改。三个数值必须是递增的正整数；等于界限仍属于前一档。保存后立即重算颜色，设置在本地保留。

点击 TOKEN 活动标题可折叠日历，保留今日总量和齿轮设置；再次点击可展开。Enter / 空格同样可操作，隐藏的网格不参与键盘焦点顺序。折叠状态使用独立的本地偏好保存，侧栏切换、页面刷新和重启后恢复，并同步到其他窗口。

范围是整个应用所有工作区、会话与子代理的已记录提供方用量。Harness 的普通输入、缓存读取和缓存写入三个字段合并为输入；推理 token 已包含在输出中，不重复叠加。分叉继承事件排除。仅统计已报告用量，不估算缺失记录；查询失败、连接中断或未报告用量有提示。可见页面每 15 秒刷新，恢复可见或重连后立即更新。界面接口只返回逐日汇总，不返回聊天内容或本机路径。

## 源码安装与回退

也可以退出 Harness 后，从源码目录执行：

```sh
node tools/install.cjs
```

默认读取当前用户的 `.dsh/profiles/desktop`。使用自定义数据目录时，先设置 `DSH_HOME`。安装脚本备份 profile 清单，只添加本插件的依赖和 bundle 关联；安装记录保存在本机 `validation/` 下。

解除本插件的 profile 关联：

```sh
node tools/uninstall.cjs
```

日常使用也可在 Harness 插件页停用。解除关联保留其他配置、聊天、工作区、插件缓存与本机颜色偏好。

## 可选：Windows 桌面标题栏适配器

适配器将原生窗口操作接入皮肤的竖排按钮，并保留原生应用/编辑菜单、窗口拖动及关闭确认。它会修改本机 `resources/app.asar` 中的两个桌面入口，因此请先完全退出 Harness。

在 PowerShell 中指定实际安装目录：

```powershell
$env:DSH_DESKTOP_DIR = Join-Path $env:LOCALAPPDATA 'Programs\DeepSeek Harness'
node tools/desktop-bridge.cjs install
```

可先运行 `node tools/desktop-bridge.cjs check` 做只读校验；已安装时会核对当前文件和原始备份。适配器只接受以下两个已验证版本的原始 archive：

```text
0.2.0-rc.2  983ca71114e6dfd353fc79af5a1f9481a250ee64c2a3c757673029b811b23bc2
0.2.1-rc.2  47874618bf5b3011fcaac10cd4c85f69da333e70d4f99b921207c78d0999512a
```

写入前自动备份到安装目录的 `_backups/`，校验未改动文件并记录本机恢复路径。版本或哈希不匹配时拒绝写入。停用皮肤后提供横向窗口按钮回退；安装到其他机器时，需要在那里重新生成备份。

0.2.1-rc.2 已实测竖排位置、最小化、最大化与还原、关闭到后台后重新显示，以及停用标记下的备用按钮、800×600 视口；页面运行错误为零。关闭按钮调用 DSH 原来的窗口关闭逻辑，不改变后台运行策略。DSH 更新可能覆盖此适配，需重新校验后安装。

退出 Harness 后，在同一源码目录、相同 `DSH_DESKTOP_DIR` 下恢复：

```powershell
node tools/desktop-bridge.cjs restore
```

恢复同样校验当前 archive；应用已更新时会拒绝覆盖。保留本机 `validation/desktop-bridge.json` 和备份目录，直到完成恢复。

## 目录

| 路径 | 用途 |
| --- | --- |
| `src/shell.js`、`src/workspaces.js` | 标题栏、原生操作、工作区编号与窄栏选择 |
| `src/accepted-motion.js`、`src/accepted-motion.css` | 往返遮罩、反馈、校准和动画清理 |
| `src/max-berserk.js` | 三种随机 Max 渲染与轮次策略 |
| `src/model-controls.js`、`src/model-controls.css` | 原生模型选择和推理滑块 |
| `src/token-activity-core.js`、`src/token-activity-host.js` | 日期、分档与原生会话日志汇总 |
| `src/token-activity.js`、`src/token-activity.css` | 活动方块、每日用量与界限设置 |
| `src/palette.js`、`src/skin.css`、`src/planar.css` | 配色、对比度与布局 |
| `src/motion.js` | 原生菜单可用空间修正 |
| `assets/`、`locale/` | 本地字体、SVG 和语言资源 |
| `lib/` | 编译后的离线客户端与 Host 用量模块 |
| `tools/`、`tests/` | 构建、安装、回退和自动测试 |

`diagnostics` 默认关闭。开发时临时启用会生成含本机认证 URL 的 `.validation/connection.json`，使用后应关闭诊断；此目录已排除出 Git 和运行包。

## 许可与资源

代码采用 [MIT License](../LICENSE)。GRID / SIGNAL 为此项目使用的原创字体派生版本，详见 [字体来源](../assets/fonts/SOURCE.md)。Marathon 官网仅作为视觉与动效方向参考；项目不包含其网页代码、字体或游戏素材。DeepSeek、Harness、Marathon 及相关名称的权利属于各自所有者。
