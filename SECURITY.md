# Security Policy

## Supported Versions

Only the **latest release** of SuperJS receives security fixes. We do not backport security patches to older versions.

| Version      | Supported |
|--------------|-----------|
| Latest       | Yes       |
| Older        | No        |

---

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

Please report security issues by emailing **security@superjs.dev** with a clear description of the vulnerability, steps to reproduce it, and any relevant version information.

We will respond to all reports, even if we determine the issue is out of scope.

---

## Response SLA

| Milestone                       | Target     |
|---------------------------------|------------|
| Triage acknowledgement          | 7 days     |
| Patch for critical issues       | 30 days    |
| Full public disclosure          | 90 days    |

These are targets, not guarantees. Complex issues may require more time. We will communicate with the reporter throughout the process.

---

## Coordinated Disclosure

SuperJS follows responsible disclosure principles. We ask that reporters:

1. Give us the time defined in the SLA above before publishing details publicly.
2. Avoid accessing, modifying, or deleting user data during research.
3. Make a good-faith effort to avoid impacting other users.

In return, we will:

- Acknowledge your report promptly.
- Keep you informed of our progress.
- Credit you in the security advisory (CVE or GitHub advisory) unless you prefer to remain anonymous.

---

## Crash-Log Redaction Policy

Crash logs produced by `superjs build` are intentionally sanitized to protect user source code privacy:

- **What is included:** file basenames and symbol basenames only (e.g., `index.sjs`, `myFunction`).
- **What is excluded:** full file paths, source content, local directory structure.

Full paths and symbols are only included in crash output when the `--crash-full` flag is explicitly passed by the user. This design is intentional and is **not** a security vulnerability.

If you believe the redaction policy has a bypass or a gap that exposes user source code without the `--crash-full` flag, please report it via the process above.

---

## GPG Key

GPG key for security@ will be published on keys.openpgp.org once the project reaches v1.0.

---

## Out of Scope

The following are **not** considered security vulnerabilities and should be reported as regular bugs via [GitHub Issues](https://github.com/hbarve1/super-js/issues) instead:

- **Denial of service via malformed `.sjs` source files.** Compilers are expected to handle arbitrary input; a crash or hang caused by a crafted source file is a bug, not a security vulnerability. We still want to fix these, but they do not receive the security disclosure process.
