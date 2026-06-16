---
title: Single Sign-On (SSO) - Minepanel
description: Configure OpenID Connect single sign-on for Minepanel with Authentik, Authelia, Keycloak, Google or any standard OIDC provider, and optionally disable password login.
---

# Single Sign-On (SSO)

Minepanel can delegate authentication to any standard **OpenID Connect (OIDC)** provider:
Authentik, Authelia, Keycloak, Zitadel, Google, and others. This centralizes access for a
homelab and lets you optionally **disable username/password login** so only SSO is allowed.

## How it works

Minepanel acts as a confidential OIDC client (BFF pattern):

1. The user clicks **Sign in with {provider}** on the login screen.
2. The backend redirects to your provider with PKCE + state + nonce.
3. After authenticating, the provider redirects back to the backend callback.
4. The backend validates the `id_token` and issues its **own** Minepanel session
   (the same `httpOnly` cookies used by password login).

The identity provider only authenticates; **roles and permissions are still managed inside
Minepanel**.

## Provisioning

- On the first SSO login a Minepanel user is created, matched by `sub` and then by email.
- If there are **no users yet**, the first person to sign in via SSO becomes the **admin**
  with full access (bootstrap).
- Every subsequent SSO user is created as a regular `USER` with **no permissions** until an
  admin grants access under **Settings → Access**.

## Configuration

SSO is configured with environment variables. It is enabled only when `OIDC_ISSUER`,
`OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` and `OIDC_REDIRECT_URI` are all set.

| Variable | Required | Description |
| --- | --- | --- |
| `OIDC_ISSUER` | yes | Issuer URL (the backend auto-discovers endpoints from it) |
| `OIDC_CLIENT_ID` | yes | Client ID from your provider |
| `OIDC_CLIENT_SECRET` | yes | Client secret (kept server-side only) |
| `OIDC_REDIRECT_URI` | yes | Backend callback, e.g. `https://api.example.com/auth/oidc/callback` |
| `OIDC_SCOPES` | no | Defaults to `openid email profile` |
| `OIDC_PROVIDER_NAME` | no | Label shown on the login button (default `SSO`) |
| `OIDC_DISABLE_PASSWORD_LOGIN` | no | `true` hides and blocks password login (SSO only) |

> The redirect URI points to the **backend**, not the frontend.

## Example: Authentik

1. In Authentik create an **OAuth2/OpenID Provider**:
   - Redirect URI: `https://api.example.com/auth/oidc/callback`
   - Signing key: default; scopes: `openid`, `email`, `profile`.
2. Create an **Application** bound to that provider and assign the users/groups that may
   access Minepanel (Authentik enforces who can reach the app).
3. Copy the **Client ID** and **Client Secret** and set:

```bash
OIDC_ISSUER=https://auth.example.com/application/o/minepanel/
OIDC_CLIENT_ID=...
OIDC_CLIENT_SECRET=...
OIDC_REDIRECT_URI=https://api.example.com/auth/oidc/callback
OIDC_PROVIDER_NAME=Authentik
```

## Example: Google

```bash
OIDC_ISSUER=https://accounts.google.com
OIDC_CLIENT_ID=...
OIDC_CLIENT_SECRET=...
OIDC_REDIRECT_URI=https://api.example.com/auth/oidc/callback
OIDC_PROVIDER_NAME=Google
```

## SSO-only mode

Set `OIDC_DISABLE_PASSWORD_LOGIN=true` to hide the username/password form and the
password-reset flow. The backend also rejects `POST /auth/login` and `POST /auth/setup-admin`
so the restriction cannot be bypassed from the API. The first admin is still bootstrapped
through the first SSO login.

This flag is ignored unless SSO is fully configured, so a misconfiguration cannot lock you
out of the panel.

## Troubleshooting

- **Button not shown**: confirm all four required `OIDC_*` variables are set and restart the
  backend. Check `GET /auth/setup-status` returns `sso.enabled: true`.
- **Redirected back with `?ssoError=1`**: the callback failed (state/nonce mismatch, expired
  transaction, clock skew, or wrong redirect URI). Verify `OIDC_REDIRECT_URI` matches the
  provider exactly and that backend and provider clocks are in sync.
- **`disabled` account**: the matched Minepanel user is inactive; re-enable it under
  **Settings → Access**.
