# Security Policy

## Reporting a Vulnerability

Please **do not** open a public issue for security vulnerabilities.

Report privately through one of these channels:

1. **GitHub Private Vulnerability Reporting** (preferred) — open the
   [Security Advisories](https://github.com/Ketbome/minepanel/security/advisories/new)
   page of this repo and submit a report. This keeps the details private until a fix is released.
2. **Email** — `<your-security-contact-email>`.

Please include:

- A description of the issue and its impact.
- Steps to reproduce (a proof of concept helps a lot).
- Affected version/commit and configuration if relevant.

## What to Expect

- Acknowledgement of your report as soon as possible.
- An assessment and, when confirmed, a fix on a private branch before public disclosure.
- Credit in the release notes / advisory if you'd like (let us know your preferred name or handle, or if you prefer to stay anonymous).

## Scope

Minepanel runs Docker commands and, in typical deployments, mounts the Docker socket into the
backend container. Because of that, **any authenticated command/argument injection is treated as
high or critical severity**, since it can lead to code execution on the host.

Areas of particular interest:

- Command/argument injection in server lifecycle, logs, commands, or file operations.
- Authentication/authorization bypasses (the API is private-by-default behind a global JWT guard).
- Path traversal in the files/world modules.
- Privilege escalation between users or between a container and the host.

## Supported Versions

Security fixes are applied to the latest released version on the `main` branch.
