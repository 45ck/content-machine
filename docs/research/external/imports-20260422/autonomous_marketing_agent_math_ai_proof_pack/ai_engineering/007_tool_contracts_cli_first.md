# Tool Contracts CLI First

## Goal

Let Claude Code, Codex, or another CLI agent operate this repo.

## Tool classes

```text
read_file
write_file
search_files
run_local_script
create_campaign_folder
summarize_results
validate_markdown
prepare_platform_packet
```

## CLI stance

The marketing agent should produce Markdown artifacts first. Platform API execution can come later.

## Dry-run first

Every tool that might spend money or publish externally needs a dry-run mode.

This is not committee overhead. It is how the harness prevents accidental waste.
