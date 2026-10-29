# PR #4 integration: macOS compatibility candidate

This branch integrates [Siyuan-Zhao770707's PR #4](https://github.com/yasneg616/marathon-like-deepseek-harness-skin/pull/4), preserving the contributor's six original commits as the second parent of a merge commit.

## Chosen implementation

- Use PR #4's CSS Module hash resolver, host stylesheet scanning and host-verification tools as the main implementation.
- Use PR #4's right-side caption controls on macOS. Minimize and fullscreen use a narrowly scoped macOS accessibility/AppleScript host interface. The existing desktop bridge is preferred for closing when available.
- Retain the existing macOS, Windows and Ubuntu GitHub Actions build/test matrix.
- Keep the already published **v2.4.10-rc.1** release and its release notes unchanged. Its *native traffic-light clearance* approach is historical and **not** the design in this integration candidate.
- Bump source package version to **v2.4.10-rc.2** for the next candidate; this document does **not** indicate that a new downloadable Release has been published.

## Conflict resolution

The contributor's implementation takes precedence in conflicting runtime files (client, shell, CSS, resolver, build and test code). The published rc.1 metadata and macOS CI configuration remain. The generated `lib/client.js` is updated alongside source.

Two reliability fixes were added during the merge:

1. A matched module with the *same* hash as the authored prefix counts as resolved, so first paint is not held back.
2. A scheduled retry after 4.1 seconds makes the four-second bounded fallback effective even if no further host stylesheet nodes appear. The observer also reacts to stylesheet text changes/removals while excluding this skin's own CSS updates.

## Verification and known limits

The GitHub Actions matrix verifies reproducible build, checks, unit tests and package shape across Windows, macOS and Ubuntu. These are not equivalent to macOS UI/permission testing.

A real macOS tester must verify first launch, skin activation, sidebar/workspace/composer styling, toggle/mode controls, minimize, fullscreen/restore, close, relaunch and the required Accessibility permission prompt/denial. Window controls must not silently fail or change unrelated windows.

If permission is denied, minimize/zoom are expected to remain unavailable in this PR approach; users should understand the limitation. The previous public rc.1 remains the rollback path until the new candidate is released.

Credit: [Siyuan-Zhao770707](https://github.com/Siyuan-Zhao770707) for the investigation and implementation.
