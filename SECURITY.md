# Security & Secrets Policy

- Never commit real credentials or API keys. Use `.env` locally and CI/CD secrets in GitHub.
- Only variables prefixed with `VITE_` are exposed to the client. Treat them as public and rotate when leaked.
- Use `.env.example` as a template for local development.
- Rotate keys immediately if exposure is suspected and open a security advisory.

## Reporting a vulnerability
Please open a private security advisory on GitHub or contact the maintainer via email.
