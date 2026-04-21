# Deterministic Validators

## Purpose

Validators catch simple failures faster than another LLM.

## Validators

```text
all_files_markdown
required_headings_present
campaign_packet_complete
no_empty_sections
utm_fields_present
metrics_defined
budget_fields_present
pause_rules_present
scale_rules_present
no_unlinked_claims
no_missing_learning_memo
```

## Markdown-only check

```text
Every file path must end with .md
```

## Reason

The LLM should not waste reasoning budget checking file extensions and required headings.
