# Trace Logging

## Purpose

Make agent decisions inspectable and reusable.

## Trace fields

```text
timestamp
input_context
chosen_skill
model_used
files_read
files_written
decision
reason_summary
uncertainty
next_action
```

## Markdown trace

```text
runs/YYYY-MM-DD/run_slug.md
```

## Rule

If a decision changed campaign direction, record why.
