# Security Policy

The typeshift team takes security vulnerabilities seriously. We appreciate your efforts to responsibly disclose any findings.

---

## Supported Versions

Only the latest minor version receives security updates.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1.0 | :x:                |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities via public GitHub issues.**

If you discover a vulnerability or potential security risk in typeshift, please report it privately:

1. **GitHub Private Vulnerability Advisory**: Submit a private vulnerability report via [GitHub Security Advisories](https://github.com/mohsami632-dotcom/typeshift/security/advisories/new) under the repository's **Security** tab.
2. **Maintainer Contact**: If GitHub Private Vulnerability Reporting is unavailable, contact the repository maintainer on GitHub ([@mohsami632-dotcom](https://github.com/mohsami632-dotcom)) or at: `[INSERT MAINTAINER SECURITY EMAIL]`.

### What to Include in Your Report:

- A description of the vulnerability and its potential impact.
- Clear reproduction steps or a minimal proof of concept (PoC).
- Any proposed remediation or patches, if available.
- Information regarding whether this vulnerability has been disclosed elsewhere.

### Our Response Timeline:

- **Initial Acknowledgment**: Within 48 hours of receipt.
- **Triage and Assessment**: Within 5 business days.
- **Remediation & Patch**: Once validated, patches will be published promptly in a new patch release.

---

## Security Model & Design Principles

- **No Dynamic Code Evaluation**: typeshift parses TypeScript and Zod schemas using static AST analysis via the official TypeScript Compiler API. It **never** executes (`eval`, `Function`, or dynamic `require`) untrusted input code during parsing.
- **Deterministic Output**: Schema generators emit sanitized, deterministic code with standard escaping to avoid injection issues when emitting code files.
- **Zero Heavy Runtime Dependencies**: Minimal dependency footprint reduces supply-chain attack surface.
