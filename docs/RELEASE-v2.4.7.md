# 2.4.7 — Marathon 彩蛋与工作区状态动画

这次更新加入了围绕 **Marathon IP 诸多 memes** 的彩蛋。灵感来自视频评论区的观众 **Eidhsg**，感谢他的建议；原始评论截图已放在 README 的彩蛋介绍中。具体内容留给你自己发现。

新版工作区色条加入会话状态动画：工作中显示流动斜纹与扫描线，等待确认时显示慢闪边框，完成未读时显示亮光与勾选标记。动画跟随皮肤动效设置，选择「停止」或系统减少动态效果时保留静态标记。

## 直接安装或升级

无需构建源码，也无需为皮肤安装 Node.js。在 Harness「插件 → 添加插件」的**包名或地址**输入框粘贴完整地址，安装后启用：

```text
https://github.com/yasneg616/marathon-like-deepseek-harness-skin/releases/download/v2.4.7/dsh-industrial-acid-skin-2.4.7.tgz
```

也可先下载 `.tgz`，再输入下载文件的本机绝对路径。仅输入文件名会发起 npm 查询，请使用完整 URL 或绝对路径。已有用户继续使用相同插件包名升级，保留原有颜色与外观偏好；如 Harness 提示需要重启，再重启客户端。

## 下载文件

| 文件 | 用途 |
| --- | --- |
| `dsh-industrial-acid-skin-2.4.7.tgz` | 完整皮肤运行包，日常安装或升级使用此文件 |
| `dsh-industrial-caption-adapter-2.4.7.zip` | 可选 Windows 竖排窗口按钮适配器，已安装者无需重复安装 |
| `SHA256SUMS.txt` | 上述两个文件的 SHA256 校验值 |

可选适配器沿用 2.4.6 的代码，需要 Windows 和 Node.js 22+，只接受已核对哈希的原始 DSH 0.2.0-rc.2、0.2.1-rc.2 与 0.2.1-rc.3。使用前完全退出 Harness，写入前自动备份，支持恢复；已有适配器的用户请保留原目录与恢复记录。皮肤本身无需修改应用 archive。

## 验证与兼容

构建、语法检查、**63 项自动测试**与运行包内容检查通过；`lib/client.js` 可由源码重现。兼容声明保持为 DSH `>=0.2.0-rc.2 <0.2.2-0`。自动测试使用宿主模拟环境，不等同于所有 DSH 版本的真实桌面验证。

安装、构建与回退详见仓库的 `docs/INSTALL.md`。这是非官方皮肤，与 DeepSeek、Bungie 或 Marathon 没有隶属关系；不包含 Marathon 游戏原始素材。
