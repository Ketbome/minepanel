# API Reference

Complete API documentation for Minepanel backend.

## Base URL

```
http://localhost:8091
```

In production, replace with your backend URL.

## Authentication

All API endpoints require authentication using JWT tokens.

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

The token should be included in subsequent requests using the `Authorization` header:

```http
Authorization: Bearer <access_token>
```

---

## Servers

### Get All Servers

Returns a simplified list of all servers with essential information only.

```http
GET /servers
```

**Response:**

```json
[
  {
    "id": "my-server",
    "serverName": "My Awesome Server",
    "motd": "Welcome to my server!",
    "port": "25565",
    "serverType": "PAPER",
    "active": true
  },
  {
    "id": "survival-server",
    "serverName": "Survival World",
    "motd": "Pure survival experience",
    "port": "25566",
    "serverType": "VANILLA",
    "active": false
  }
]
```

**Fields:**

| Field      | Type    | Description                           |
| ---------- | ------- | ------------------------------------- |
| id         | string  | Unique server identifier              |
| serverName | string  | Display name of the server            |
| motd       | string  | Message of the Day                    |
| port       | string  | Server port                           |
| serverType | string  | Type of server (PAPER, VANILLA, etc.) |
| active     | boolean | Whether the server is active          |

### Get All Servers Status

Get the current status of all servers.

```http
GET /servers/all-status
```

**Response:**

```json
{
  "my-server": "running",
  "survival-server": "stopped",
  "modded-server": "starting"
}
```

**Status values:**

- `running` - Server is running
- `stopped` - Server is stopped
- `starting` - Server is starting up
- `not_found` - Server not found

### Get Server Details

Get complete configuration of a specific server.

```http
GET /servers/:id
```

**Parameters:**

| Parameter | Type   | Description              |
| --------- | ------ | ------------------------ |
| id        | string | Server unique identifier |

**Response:**

Returns the complete server configuration object including:

- General settings (name, motd, difficulty, etc.)
- Resource settings (memory, CPU)
- Network settings (ports, RCON)
- Backup configuration
- JVM options
- And more...

**Example:**

```http
GET /servers/my-server
```

### Create Server

Create a new Minecraft server.

```http
POST /servers
Content-Type: application/json
```

**Body:**

```json
{
  "id": "new-server",
  "serverName": "My New Server",
  "serverType": "PAPER",
  "minecraftVersion": "1.20.1",
  "motd": "A new Minecraft server",
  "port": "25565",
  "maxPlayers": "20",
  "difficulty": "normal",
  "gameMode": "survival",
  "maxMemory": "4G",
  "initMemory": "2G"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Server \"new-server\" created successfully",
  "server": {
    /* server config */
  }
}
```

**Server Types:**

- `VANILLA` - Official Minecraft server
- `PAPER` - High-performance Spigot fork
- `SPIGOT` - Bukkit-based server
- `PURPUR` - Paper fork with more features
- `FABRIC` - Lightweight modding platform
- `FORGE` - Popular modding platform
- `AUTO_CURSEFORGE` - CurseForge modpack

### Update Server

Update server configuration.

```http
PUT /servers/:id
Content-Type: application/json
```

**Body:**

```json
{
  "serverName": "Updated Server Name",
  "motd": "New MOTD",
  "maxPlayers": "30",
  "difficulty": "hard"
}
```

**Response:**

Returns the updated server configuration.

### Delete Server

Delete a server and its data.

```http
DELETE /servers/:id
```

**Response:**

```json
{
  "success": true,
  "message": "Server \"my-server\" deleted successfully"
}
```

---

## Server Control

### Start Server

Start a stopped server.

```http
POST /servers/:id/start
```

**Response:**

```json
{
  "success": true,
  "message": "Server started successfully"
}
```

### Stop Server

Stop a running server.

```http
POST /servers/:id/stop
```

**Response:**

```json
{
  "success": true,
  "message": "Server stopped successfully"
}
```

### Restart Server

Restart a server.

```http
POST /servers/:id/restart
```

**Response:**

```json
{
  "success": true,
  "message": "Server restarted successfully"
}
```

---

## Server Status & Monitoring

### Get Server Status

Get the current status of a specific server.

```http
GET /servers/:id/status
```

**Response:**

```json
{
  "status": "running"
}
```

### Get Server Info

Get detailed information about a server.

```http
GET /servers/:id/info
```

**Response:**

```json
{
  "exists": true,
  "status": "running",
  "dockerComposeExists": true,
  "mcDataExists": true,
  "worldSize": 104857600,
  "worldSizeFormatted": "100 MB",
  "lastUpdated": "2024-10-25T10:30:00.000Z",
  "config": {
    /* server config */
  }
}
```

### Get Server Resources

Get CPU and memory usage of a running server.

```http
GET /servers/:id/resources
```

**Response:**

```json
{
  "cpuUsage": "45.2%",
  "memoryUsage": "2.5GB",
  "memoryLimit": "4GB",
  "status": "running"
}
```

::: tip Real-time Updates
Poll this endpoint every 5-10 seconds to get real-time resource monitoring.
:::

---

## Server Logs

### Get Server Logs

Get recent logs from a server.

```http
GET /servers/:id/logs?lines=100
```

**Query Parameters:**

| Parameter | Type   | Default | Description                      |
| --------- | ------ | ------- | -------------------------------- |
| lines     | number | 100     | Number of log lines (max 10000)  |
| since     | string | -       | Timestamp to get logs since      |
| stream    | string | -       | Set to "true" for streaming mode |

**Response:**

```json
{
  "logs": "2024-10-25T10:30:00Z [Server thread/INFO]: Starting Minecraft server...\n2024-10-25T10:30:01Z [Server thread/INFO]: Done!",
  "hasErrors": false,
  "lastUpdate": "2024-10-25T10:35:00.000Z",
  "status": "running",
  "metadata": {
    "totalLines": 100,
    "errorCount": 0,
    "warningCount": 2
  }
}
```

### Stream Server Logs

Get logs with streaming support.

```http
GET /servers/:id/logs/stream?lines=500&since=2024-10-25T10:30:00Z
```

**Response:**

Same format as regular logs but optimized for streaming.

### Get Logs Since Timestamp

Get only new logs since a specific timestamp.

```http
GET /servers/:id/logs/since/:timestamp?lines=1000
```

**Response:**

```json
{
  "logs": "...",
  "hasErrors": false,
  "lastUpdate": "2024-10-25T10:35:00.000Z",
  "status": "running",
  "hasNewContent": true
}
```

---

## Server Commands

### Execute Command

Execute a Minecraft command via RCON.

```http
POST /servers/:id/command
Content-Type: application/json
```

**Body:**

```json
{
  "command": "say Hello players!",
  "rconPort": "25575",
  "rconPassword": "your-rcon-password"
}
```

**Response:**

```json
{
  "success": true,
  "output": "Command executed successfully"
}
```

**Common Commands:**

```bash
# Player management
/whitelist add Steve
/whitelist remove Alex
/op PlayerName
/deop PlayerName
/kick PlayerName Reason
/ban PlayerName Reason

# Server management
/save-all
/stop
/say Message to all players
/title @a title {\"text\":\"Welcome!\"}

# World management
/time set day
/weather clear
/gamerule doDaylightCycle false
/tp PlayerName x y z
```

---

## Server Data Management

### Clear Server Data

Delete all server data (world, configs, etc.) and reset to fresh state.

```http
POST /servers/:id/clear-data
```

::: warning Destructive Action
This will delete all world data, player data, and configurations. This action cannot be undone!
:::

**Response:**

```json
{
  "success": true,
  "message": "Server data cleared successfully"
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

### 400 Bad Request

```json
{
  "statusCode": 400,
  "message": "Server ID can only contain letters, numbers, hyphens, and underscores",
  "error": "Bad Request"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "message": "Server with ID \"my-server\" not found",
  "error": "Not Found"
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

---

## Rate Limiting

Currently, there are no rate limits, but it's recommended to:

- Poll status endpoints no more than once per second
- Poll resource endpoints every 5-10 seconds
- Poll logs every 2-5 seconds

---

## Examples

### JavaScript/TypeScript (Axios)

```typescript
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8091",
  headers: {
    "Content-Type": "application/json",
  },
});

// Login
const login = async () => {
  const { data } = await api.post("/auth/login", {
    username: "admin",
    password: "admin",
  });

  // Store token
  api.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;
  return data.access_token;
};

// Get all servers
const getServers = async () => {
  const { data } = await api.get("/servers");
  return data;
};

// Start server
const startServer = async (serverId: string) => {
  const { data } = await api.post(`/servers/${serverId}/start`);
  return data;
};

// Get server logs
const getLogs = async (serverId: string, lines = 100) => {
  const { data } = await api.get(`/servers/${serverId}/logs`, {
    params: { lines },
  });
  return data;
};

// Execute command
const executeCommand = async (serverId: string, command: string) => {
  const { data } = await api.post(`/servers/${serverId}/command`, {
    command,
    rconPort: "25575",
    rconPassword: "minecraft",
  });
  return data;
};

// Usage
(async () => {
  await login();
  const servers = await getServers();
  console.log("Servers:", servers);

  if (servers.length > 0) {
    const serverId = servers[0].id;
    await startServer(serverId);
    const logs = await getLogs(serverId, 50);
    console.log("Logs:", logs);
  }
})();
```

### Python (requests)

```python
import requests

BASE_URL = 'http://localhost:8091'

# Login
def login(username, password):
    response = requests.post(f'{BASE_URL}/auth/login', json={
        'username': username,
        'password': password
    })
    return response.json()['access_token']

# Get headers with token
def get_headers(token):
    return {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

# Get all servers
def get_servers(token):
    headers = get_headers(token)
    response = requests.get(f'{BASE_URL}/servers', headers=headers)
    return response.json()

# Start server
def start_server(token, server_id):
    headers = get_headers(token)
    response = requests.post(
        f'{BASE_URL}/servers/{server_id}/start',
        headers=headers
    )
    return response.json()

# Get server logs
def get_logs(token, server_id, lines=100):
    headers = get_headers(token)
    response = requests.get(
        f'{BASE_URL}/servers/{server_id}/logs',
        headers=headers,
        params={'lines': lines}
    )
    return response.json()

# Usage
if __name__ == '__main__':
    token = login('admin', 'admin')
    servers = get_servers(token)
    print('Servers:', servers)

    if servers:
        server_id = servers[0]['id']
        result = start_server(token, server_id)
        print('Start result:', result)

        logs = get_logs(token, server_id, 50)
        print('Logs:', logs['logs'])
```

### cURL

```bash
# Login
TOKEN=$(curl -X POST http://localhost:8091/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  | jq -r '.access_token')

# Get all servers
curl -X GET http://localhost:8091/servers \
  -H "Authorization: Bearer $TOKEN"

# Start server
curl -X POST http://localhost:8091/servers/my-server/start \
  -H "Authorization: Bearer $TOKEN"

# Get server status
curl -X GET http://localhost:8091/servers/my-server/status \
  -H "Authorization: Bearer $TOKEN"

# Get server logs
curl -X GET "http://localhost:8091/servers/my-server/logs?lines=50" \
  -H "Authorization: Bearer $TOKEN"

# Execute command
curl -X POST http://localhost:8091/servers/my-server/command \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"command":"say Hello!","rconPort":"25575"}'
```

---

## WebSocket Support

Currently, WebSocket support is not implemented, but it's planned for future releases for real-time log streaming and server status updates.

---

## Swagger/OpenAPI Documentation

When running the backend in development mode, you can access the interactive Swagger documentation at:

```
http://localhost:8091/api
```

This provides an interactive interface to test all API endpoints.

---

## Next Steps

- 🏗️ [Understand Architecture](/architecture)
- 🛠️ [Development Guide](/development)
- 📖 [Features](/features)
