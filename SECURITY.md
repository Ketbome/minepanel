# Security Policy

## Supported Versions

Security fixes are applied to the latest release on the `main` branch.

| Version        | Supported          |
| -------------- | ------------------ |
| `main` (latest)| :white_check_mark: |
| older releases | :x:                |

## Reporting a Vulnerability

Please **do not** open a public issue, PR, or discussion for security vulnerabilities.

Report privately using **GitHub Private Vulnerability Reporting**:
[open a new advisory](https://github.com/Ketbome/minepanel/security/advisories/new).
This keeps the report private until a fix is released.

Include as much as you can:

- Type of issue and its impact.
- Affected version/commit and relevant configuration.
- Step-by-step reproduction and, if possible, a proof of concept.
- Any suggested mitigation.

## What to Expect

- **Acknowledgement** within 3 business days.
- **Initial assessment** within 7 business days.
- Confirmed issues are fixed on a private branch and released before public disclosure.
  We aim to resolve high/critical issues within 30 days and will keep you updated on progress.

## Disclosure Policy

We follow **coordinated disclosure**: please give us reasonable time to release a fix
before disclosing publicly. Once a fix is out, we'll publish an advisory and, if you'd
like, credit you (tell us your preferred name/handle, or if you prefer to stay anonymous).

## Safe Harbor

We will not pursue or support legal action against researchers who, in good faith:

- Only test against their **own** instances,
- Avoid privacy violations, data destruction, and service degradation,
- Do not access or modify data that isn't theirs, and
- Report promptly and give us time to remediate before public disclosure.

## Scope

Minepanel runs Docker commands and, in typical deployments, mounts the Docker socket into the
backend container. Because of that, **any authenticated command/argument injection is treated as
high or critical severity**, since it can lead to code execution on the host.

Areas of particular interest:

- Command/argument injection in server lifecycle, logs, commands, or file operations.
- Authentication/authorization bypasses (the API is private-by-default behind a global JWT guard).
- Path traversal in the files/world modules.
- Privilege escalation between users or between a container and the host.

Generally **out of scope**: findings that require a pre-compromised host or Docker daemon,
denial of service from unrealistic resource limits, and issues in third-party dependencies
without a demonstrated impact on Minepanel (please report those upstream).
