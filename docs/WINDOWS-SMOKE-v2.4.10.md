# v2.4.10 Windows Desktop Smoke Test

**Candidate only. Do not link this PR build as the official release.** This package is built by GitHub Actions for Windows from the release-candidate branch. It does not modify the published v2.4.9 or v2.4.10-rc.1 Releases.

## Acquire the exact candidate

1. Open this branch's PR, open its latest green **Check skin** GitHub Actions run, and expand **Artifacts**.
2. Download `dsh-skin-2.4.10-windows-smoke` and extract the ZIP locally.
3. The extracted folder contains `dsh-industrial-acid-skin-2.4.10.tgz` and `SHA256SUMS.txt`. In PowerShell, verify the `.tgz` with `Get-FileHash -Algorithm SHA256 .\dsh-industrial-acid-skin-2.4.10.tgz` and compare the value with `SHA256SUMS.txt`.
4. In DeepSeek Harness: **Plugins → Add plugin**, paste the **absolute local path** of the `.tgz` file (not the ZIP), install and enable it. Restart Harness if prompted. No Node.js is required for this installation.

## Desktop test checklist

- [ ] Start Harness, enable/reload the skin, and verify that the new style actually applies at first paint, without a stuck blank layout or prolonged unstyled appearance.
- [ ] Verify the NEXT colour-strip workspace rail, classic sidebar, workspace selection, MORE drawer, hover cards, workspace native menus, composer decoration, and plugin/settings pages. Keep real sessions and workspaces intact; use a disposable workspace for destructive actions.
- [ ] Toggle light, dark and follow-system appearances; make sure user/assistant bubbles, input, panels and text remain readable.
- [ ] Open/close right sidebar, switch panels, resize to ~800px wide and back, collapse/expand left sidebar and verify content alignment.
- [ ] Verify the Windows title-bar layout and minimize/maximize/restore/close using the already installed optional caption adapter, if present. Do **not** modify `app.asar` just to test this candidate; the adapter remains optional.
- [ ] Navigate between sessions, use text input without sending, and verify that animations, Markdown and scroll behaviour still work.
- [ ] Disable/re-enable the plugin, restart Harness, and make sure settings persist and the native UI remains usable when disabled.
- [ ] Report Harness version, whether Windows caption adapter is installed, any console errors, and screenshots if any visible problem occurs.

## Roll back if anything breaks

In Harness's plugin management, disable/uninstall the candidate and reinstall the official v2.4.9 tarball:
https://github.com/yasneg616/marathon-like-deepseek-harness-skin/releases/download/v2.4.9/dsh-industrial-acid-skin-2.4.9.tgz

The plugin-only trial should not require editing `app.asar`, deleting profiles or changing workspace data.

## Release gate

A successful Windows CI run tests build, JavaScript checks, unit tests and packaging **but not the real Electron/Harness UI**. Only prepare the official v2.4.10 release after local Windows smoke-test results are confirmed. macOS native window controls still require macOS hardware testing and may request Accessibility permission.
