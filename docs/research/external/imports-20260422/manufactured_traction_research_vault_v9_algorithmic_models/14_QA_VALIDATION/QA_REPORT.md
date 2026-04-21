# QA Report — v6 Network Math Verified

Generated: 2026-04-21T01:58:36.524528+00:00

## Archive scope

This v6 vault expands the previous detailed vault with a defensive network-math verification layer.

## Counts

- Files in vault: 369
- Files in checksum manifest: 362
- Source-link inventory rows: 375
- Dynamic files intentionally excluded from checksum: `14_QA_VALIDATION/*` and `MANIFEST.md`

## New major folders

- `18_NETWORK_MATH_AND_VERIFICATION/`
- `19_SYNTHETIC_NETWORK_DEMO/`
- `20_VERIFICATION_PLAYBOOKS/`
- `21_MATH_APPENDICES/`
- `22_DATA_COLLECTION_TEMPLATES/`
- `23_SIGNAL_VERIFICATION_ATLAS/`

## Synthetic demo outputs

The demo includes synthetic data, generated metrics, and network figures.

## Integrity

Run:

```bash
python 14_QA_VALIDATION/run_local_integrity_check.py
```

Expected result:

```text
Integrity check passed
```

## Safety boundary

The vault describes verification methods, detection signals, and evidence reasoning. It does not provide an operational manipulation playbook.
