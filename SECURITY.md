# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.x     | :white_check_mark: |

## Reporting a Vulnerability

**Do not report security vulnerabilities through public GitHub issues.**

Instead, please email security concerns to the project maintainers.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You will receive a response within 48 hours. If the issue is confirmed, we will:
1. Work on a fix privately
2. Release a patch
3. Credit you in the release notes (unless you prefer anonymity)

## Security Best Practices for Contributors

- Never commit API keys or secrets
- Use `.env` files (listed in `.gitignore`)
- Validate all external inputs with Zod schemas
- Review dependencies for known vulnerabilities
