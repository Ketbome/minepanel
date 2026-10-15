---
title: MCP Server for AI Agents - Minepanel
description: Connect Claude, Cursor, VS Code or any MCP client to Minepanel with a scoped API token. Agents can create servers, install mods, start them, diagnose crashes and remove client-only mods.
---

# MCP Server (AI agents)

Minepanel ships a [Model Context Protocol](https://modelcontextprotocol.io) endpoint, so an AI
agent (Claude Code, Claude Desktop, Cursor, VS Code, Codex, Windsurf, n8n…) can operate the panel:
create a server, add mods, start it, read why it crashed, remove the client-only mod that broke
it, and try again.

The agent acts with an [API token](/api#api-tokens) and can never do more than that token allows.

## Connect a client

1. In **Settings → API tokens**, create a token. Pick only the permissions and servers the agent
   needs; **Read-only** is enough for an agent that only reads logs and diagnoses.
2. Copy the token (it is shown once) and the snippet the dialog shows.

The endpoint is `POST <backend URL>/mcp` (Streamable HTTP, stateless). It is the same base URL
as the [REST API](/api#base-url), including `BASE_PATH`.

**Claude Code**

```bash
claude mcp add --transport http minepanel https://panel.example.com/api/mcp \
  --header "Authorization: Bearer mp_..."
```

**Cursor, VS Code, Windsurf and other clients with a JSON config**

```json
{
  "mcpServers": {
    "minepanel": {
      "type": "http",
      "url": "https://panel.example.com/api/mcp",
      "headers": { "Authorization": "Bearer mp_..." }
    }
  }
}
```

Clients that only speak stdio can bridge with `npx mcp-remote <url> --header "Authorization: Bearer mp_..."`.

::: warning OAuth connectors
claude.ai and ChatGPT web connectors require OAuth, which Minepanel does not implement. Use a
client that can send a header (all of the above).
:::

## What an agent can do

| Area | Tools |
| --- | --- |
| Servers | `list_servers`, `get_server`, `create_server`, `clone_server`, `update_server`, `delete_server` |
| Lifecycle | `start_server`, `stop_server`, `force_stop_server`, `restart_server`, `wait_for_server` |
| Troubleshooting | `diagnose_server`, `get_logs`, `get_resource_history` |
| Mods | `list_installed_mods`, `add_mods`, `remove_mods` |
| Console and players | `send_command`, `list_online_players`, `get_player_lists`, `list_players`, `get_player` |
| Worlds and backups | `list_worlds`, `select_world`, `list_backups` |
| Files | `list_files`, `read_file`, `write_file`, `make_directory`, `rename_file`, `delete_file` |
| Scheduled tasks | `list_tasks`, `create_task`, `update_task`, `delete_task`, `run_task` |
| Panel | `get_system_stats` |
| Everything else | `list_endpoints`, `call_endpoint` |

`list_endpoints` lists every REST route the token may call, read from the backend's own routes,
and `call_endpoint` calls one of them. That covers the rest of the panel (proxy, Bedrock addons,
modpacks, mod search, alerts, activity…) without a dedicated tool for each.

Read-only tokens only see the tools that read, and `call_endpoint` only accepts `GET` for them.

### Fixing a server that won't start

The server tells the agent this loop when it connects:

1. Make the change: `add_mods`, `update_server`, `write_file`…
2. `start_server` or `restart_server`, then `wait_for_server`. It returns `ready`, `stopped` or
   `still_starting`.
3. When it did not come up, the result includes a diagnosis (also available as `diagnose_server`, and as
   the **Diagnose** button in the Logs tab):
   recognised problems with the mods involved and a suggested fix, the recent error lines and the
   newest file in `crash-reports/`. Recognised problems:
   - **Client-only mod**: `invalid dist DEDICATED_SERVER`, `net/minecraft/client` classes
   - **Missing dependency**, **mixin failure**, **duplicate mod**
   - **Java version** mismatch, **out of memory**, **port in use**
4. Apply the fix and go back to step 2.

`list_installed_mods` reads every jar in `mods/` and reports its side (`client`, `server`, `both`,
`known-client` from itzg's list of client-only mods, or `unknown`, common for Forge/NeoForge).

`remove_mods` makes a removal stick, whatever installed the mod:

| Installed from | What it does |
| --- | --- |
| The Modrinth / CurseForge mod list | Removes the entry from the list |
| A CurseForge modpack | Adds it to **Exclude mods** (`CF_EXCLUDE_MODS`) |
| A Modrinth modpack | Adds it to `MODRINTH_EXCLUDE_FILES` in the custom environment variables (admin tokens only) |
| Any of the above, or a loose jar | Deletes the matching jar from `mods/` (needs **Manage server files**) |

## Permissions

Every tool is a call to the REST API with the agent's token, so the same checks apply as for a
person using the panel with that token. A tool the token cannot use returns the API's `403` as
a tool error.

The agent cannot create API tokens, change passwords, roles or users, or edit SMTP/OIDC/notification
credentials: those routes reject API tokens even when the token is an admin's.

## Prompt injection

Player chat, sign text and book contents end up in logs, files and console replies, which the
agent reads. A player can write text meant to steer the agent. Minepanel marks those tools as
returning untrusted text and the server tells the agent to treat it as data, but no server-side
check can stop a model from following it. Reduce the risk:

- Give agents **read-only** or server-scoped tokens unless they need more.
- Prefer a non-admin token; an admin token gives the agent admin power over the panel.
- Keep tool confirmations on in your client for destructive tools (`delete_*`, `stop_server`,
  `send_command`, `remove_mods`…).
- Revoke a token in **Settings → API tokens** the moment you no longer need it.
