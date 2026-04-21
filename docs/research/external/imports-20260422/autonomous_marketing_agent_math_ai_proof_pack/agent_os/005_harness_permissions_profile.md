# Harness Permissions Profile

This is written as a practical autonomy profile for Claude Code/Codex-style execution.

## Low-risk auto-allow

- Read Markdown files.
- Write new Markdown campaign artifacts.
- Edit Markdown memory files.
- Run local grep/find/list commands.
- Generate local markdown reports.
- Create draft platform packets that do not call live APIs.

## Ask or staged execution

- Run scripts that transform many files.
- Use browser automation against logged-in accounts.
- Export analytics data.
- Call ad platform APIs in sandbox/test accounts.
- Modify campaign status, budgets, or bid strategy.

## Deny unless intentionally configured

- Expose secrets.
- Delete campaign history.
- Publish ads without a campaign packet.
- Increase spend without a budget file.
- Generate fake reviews, fake testimonials, fake social proof, or false scarcity.

## Why this file exists

This is not committee oversight. It is a local execution envelope so the model can move fast without destroying memory, leaking data, or mutating real spend by accident.
