# Security Policy

## Supported Versions

We support the most recent minor release of `dom-xpath-toolkit`. Older versions should be upgraded immediately to receive patches.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | ✅ |

## Reporting a Vulnerability

Please report security issues privately before public disclosure:

- Open a confidential advisory: https://github.com/JayMalli/dom-xpath-toolkit/security/advisories/new
- Email: jay.malli.m@gmail.com

Include:

- Affected version(s)
- Environment details (browser, extension host, DOM implementation)
- Proof-of-concept or reproduction steps
- Suggested remediation if known

## Disclosure Timeline

1. **Acknowledgement** within 2 business days.
2. **Triage** within 5 business days to confirm impact.
3. **Fix Release** targeted within 30 days, with coordinated disclosure if needed.

Emergency fixes will be published as soon as a tested patch is ready.

## Security Resources

- Run `npm run security:test` before publishing new versions.
- Use `npm run security:report` to surface contact details and supported versions.
- See [`security-threat-model.md`](security-threat-model.md) for in-depth threat modelling and mitigation guidance.
