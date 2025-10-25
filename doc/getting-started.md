# Getting Started

Welcome to Minepanel! This guide will help you get your Minecraft server management panel up and running in just a few minutes.

![Minepanel Dashboard](/img/Animation.gif)

## Prerequisites

Before you begin, make sure you have:

- **Docker** (version 20.10 or higher)
- **Docker Compose** (v2.0 or higher)
- **2GB+ RAM** available
- **Operating System**: Linux, macOS, or Windows with WSL2

::: tip Check Docker Installation
Run `docker --version` and `docker compose version` to verify your installation.
:::

## Quick Installation

The fastest way to get started is using our pre-built Docker image:

### Step 1: Create docker-compose.yml

Create a new directory and a `docker-compose.yml` file:

```yaml
services:
  minepanel:
    image: ketbom/minepanel:latest
    ports:
      - "${BACKEND_PORT:-8091}:8091"
      - "${FRONTEND_PORT:-3000}:3000"
    environment:
      # Backend environment variables
      - SERVERS_DIR=${PWD}/servers
      - FRONTEND_URL=${FRONTEND_URL:-http://localhost:3000}
      - CLIENT_PASSWORD=${CLIENT_PASSWORD:-$$2a$$12$$kvlrbEjbVd6SsbD8JdIB.OOQWXTPL5dFgo5nDeIXgeW.BhIyy8ocu}
      - CLIENT_USERNAME=${CLIENT_USERNAME:-admin}
      - DEFAULT_LANGUAGE=${DEFAULT_LANGUAGE:-en}
      # Frontend environment variables (informative, already baked in build)
      - NEXT_PUBLIC_FILEBROWSER_URL=${NEXT_PUBLIC_FILEBROWSER_URL:-http://localhost:8080}
      - NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-http://localhost:8091}
      - NEXT_PUBLIC_DEFAULT_LANGUAGE=${NEXT_PUBLIC_DEFAULT_LANGUAGE:-en}
    volumes:
      - ${PWD}/servers:${PWD}/servers
      - /var/run/docker.sock:/var/run/docker.sock
    restart: always

  filebrowser:
    image: hurlenko/filebrowser
    ports:
      - "${FILEBROWSER_PORT:-8080}:8080"
    volumes:
      - ${PWD}/servers:/data
      - ./filebrowser-data:/config
    environment:
      - FB_BASEURL=/
    restart: always
```

### Step 2: Create Required Directories

```bash
mkdir -p servers filebrowser-data
```

### Step 3: Start the Services

```bash
docker compose up -d
```

::: info
The `-d` flag runs the containers in detached mode (in the background).
:::

### Step 4: Access the Panel

After a few seconds, you can access:

- **Minepanel Web Interface**: http://localhost:3000
- **File Browser**: http://localhost:8080

## First Login

### Minepanel Login

Default credentials:

- **Username**: `admin`
- **Password**: `admin`

::: warning Change Default Password
For security, change the default password immediately after first login! See [Configuration Guide](/configuration#change-admin-password) for instructions.
:::

### Filebrowser Login

The first time you run Filebrowser, check the logs to get the auto-generated password:

```bash
docker compose logs filebrowser
```

Look for a line like:

```
filebrowser  | 2024/10/24 12:34:56 Admin credentials: admin / <generated-password>
```

**Steps:**

1. Copy the generated password from the logs
2. Login to http://localhost:8080 with `admin` and the password
3. Change the password immediately to something secure

::: tip Lost the Password?
If you lost the logs, you can reset Filebrowser:

```bash
docker compose down
rm -rf filebrowser-data/filebrowser.db
docker compose up -d
docker compose logs filebrowser  # Check the new password
```

:::

## Creating Your First Server

Once logged into Minepanel:

1. Click **"Add Server"** or **"New Server"** button
2. Fill in the server details:
   - **Server Name**: Give it a unique name
   - **Server Type**: Choose Vanilla, Paper, Forge, etc.
   - **Minecraft Version**: Select the version you want
   - **Port**: Choose a port (default: 25565)
   - **Memory**: Allocate RAM (e.g., 2G for 2 gigabytes)
3. Click **"Create Server"**
4. Wait for the server to download and start (this may take a few minutes the first time)

::: tip
The first server creation downloads the Minecraft server files, which can take 2-5 minutes depending on your internet connection.
:::

## Next Steps

Now that you have Minepanel running:

- 📖 [Learn about all features](/features)
- ⚙️ [Configure your setup](/configuration)
- 🏗️ [Understand the architecture](/architecture)
- 🔧 [Explore advanced options](/installation#advanced-installation)

## Troubleshooting

### Can't Connect to Docker Socket

If you get permission errors on Linux:

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Log out and back in for changes to take effect
```

### Containers Keep Restarting

Check the logs to see what's wrong:

```bash
# View all logs
docker compose logs

# View specific service logs
docker compose logs minepanel
docker compose logs filebrowser
```

### Need More Help?

- 📚 Check the [FAQ](/faq)
- 🐛 [Report an issue on GitHub](https://github.com/Ketbome/minepanel/issues)
- 💬 [Join the discussion](https://github.com/Ketbome/minepanel/discussions)
