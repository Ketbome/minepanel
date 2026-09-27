---
title: Upgrading to 1.13
description: What changes in Minepanel 1.13 - literal dollars in generated compose files, symlinks in mc-data, and permissions that became admin-only.
---

# Upgrading to 1.13

1.13 is a security release. Nothing is migrated and nothing is deleted, but a few
settings now behave differently. Upgrade as usual:

```bash
docker compose pull
docker compose up -d
```

## `$` in server settings is now literal

Docker Compose replaces `$VAR` and `${VAR}` in a compose file with values from the
environment it runs in, which is the panel's own (`JWT_SECRET` included). From 1.13
the panel writes every `$` from a server's settings as `$$`, Compose's literal dollar,
so the value reaches the container exactly as typed. The change applies to each server
the next time it starts, when its compose file is rebuilt from `server.json`.

Check the environment variables, volumes, labels and text fields (MOTD, server name)
of your servers for two cases:

| You had | What happens now | What to do |
| --- | --- | --- |
| `${VAR}` to read a value from the panel's environment | The server receives the text `${VAR}` | Move it into a [custom compose snippet](/administration#admin-only-container-settings) (admin only), which keeps interpolation |
| `$$` to get a literal `$` | The server receives `$$` | Replace it with a single `$` |

Custom compose snippets are not escaped, so `${VAR}` in a snippet works as before.

## Symlinks in `mc-data`

The file browser, the Players tab, the activity log, player lists and Bedrock add-on
sync no longer follow a symbolic link in `mc-data` that points outside it. Links that
stay inside `mc-data` keep working. To share a folder from elsewhere on the host, ask
an admin to add a bind mount to the server instead.

## Permissions

- JVM options, running Java directly (`execDirectly`) and extra published ports are
  admin-only. Creating a server can still publish a port straight through
  (`19132:19132/udp`, as the Geyser template does).
- **Manage global files** can only be granted by an admin, and it is required to import
  worlds into the global library. Existing grants are kept.
- Scheduled tasks of type **command** require the console permission to create, edit
  or run. Restart and announcement tasks do not.
- Changing your password signs out every other session.
- Without SMTP, only admins can change their own email; other accounts ask an admin.

See [Administration](/administration#user-access-controls) for the full list.
