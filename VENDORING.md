# Vendoring Policy

Content Machine vendors external repositories for stability and offline development.

## Vendored Repositories

| Repo                 | Purpose                             | Branch | Notes                       |
| -------------------- | ----------------------------------- | ------ | --------------------------- |
| `remotion`           | Video composition framework         | main   | Core dependency             |
| `short-video-maker`  | Reference patterns (Pexels, Kokoro) | main   | Patterns only, not imported |
| `open-deep-research` | Deep research agent patterns        | main   | Reference for weekly job    |

## Adding a Vendor

```bash
# Add as submodule
git submodule add https://github.com/owner/repo.git vendor/repo-name

# Update .gitmodules if needed
git config -f .gitmodules submodule.vendor/repo-name.shallow true

# Commit
git add .gitmodules vendor/repo-name
git commit -m "vendor: add repo-name"
```

## Updating Vendors

```bash
# Update all
git submodule update --remote --merge

# Update specific
cd vendor/repo-name
git fetch origin main
git checkout origin/main
cd ../..
git add vendor/repo-name
git commit -m "vendor: update repo-name"
```

## Policy

1. **Read the README first** - Always check vendor's docs before using
2. **Prefer upstream PRs** - Don't fork and edit; contribute back
3. **Document deviations** - If you must patch, document in this file
4. **Pin versions** - Use specific commits, not floating branches

## Current Patches

None yet.
