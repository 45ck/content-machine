# Scripts

These scripts are for **defensive research and demonstration** using the included synthetic data.

## Run

```bash
cd 19_SYNTHETIC_NETWORK_DEMO/scripts
python run_demo.py
```

## What it does

- Reads `../data/synthetic_posts.csv`
- Builds repeated co-action edges
- Calculates graph metrics
- Runs a simple timestamp-shuffle null model
- Writes results to `../outputs/`

## Required columns

- `account_id`
- `content_id`
- `timestamp`

## Warning

This code is not a fraud detector. It creates evidence that must be interpreted with source context, disclosure context, and false-positive guardrails.
