# Minepanel

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Made with NestJS](https://img.shields.io/badge/Backend-NestJS-red)
![Made with Next.js](https://img.shields.io/badge/Frontend-Next.js-black)
![PM2](https://img.shields.io/badge/Process_Manager-PM2-2B037A)

A web-based tool for managing multiple Minecraft servers using Docker. Because managing servers from the terminal can be a real headache.

This project is built on top of the amazing work by [itzg](https://github.com/itzg):

- `docker-minecraft-server` – The most popular Minecraft server container
- `docker-mc-backup` – Automated backup system

![Dashboard View](./assets/Animation.gif)

## Why another server manager?

After trying several solutions, I wanted something that was:

- Easy to set up and use
- Modern (no 2000s-era interfaces)
- Flexible for handling multiple servers
- That wouldn't give me headaches

## What you can do

- **Intuitive web panel** - Built with Next.js, no ugly interfaces
- **Robust API** - NestJS backend that handles everything
- **Multiple servers** - Manage as many as your server can handle
- **Real-time logs** - See what's happening without SSH
- **File management** - Edit configurations from your browser
- **Automatic backups** - Because nobody wants to lose their world

## Project structure

```
minecraft-server-manager/
├── frontend/         # The pretty face (Next.js) - Runs with PM2
├── backend/          # The brain (NestJS) - Runs with PM2
├── servers/          # Where your Minecraft servers live (each with docker-compose)
└── filebrowser/      # For manual file handling (Docker)
```

## Architecture

This project uses a hybrid architecture:

- **Backend**: Runs **WITHOUT Docker** using PM2 or Node.js directly
- **Frontend**: Can run with **Docker** or **PM2** (your choice)
- **Minecraft Servers**: Each server **DOES use Docker** (itzg/minecraft-server)

### Why the backend doesn't use Docker?

The backend needs to create and manage Docker containers for each Minecraft server (using `docker compose up`, reading logs, etc.). Running these operations from inside a Docker container would require Docker-in-Docker (DinD), which:

- Is significantly more complex to set up
- Has security implications
- Requires privileged mode
- Makes the project harder to maintain

For simplicity and reliability, the backend runs directly on the host machine using PM2.

### Frontend options

You have **two options** for running the frontend:

1. **With Docker** (recommended for quick setup) - Just run `docker compose up`
2. **With PM2** (more traditional) - Better for development or custom setups

## Important: Configure your environment variables first

Before running the project, you **must create your `.env` files** for both the backend and frontend:

- Copy `.env.example` to `.env` in the `backend` folder:
  ```bash
  cp backend/.env.example backend/.env
  ```
- Copy `.env.example` to `.env` in the `frontend` folder:
  ```bash
  cp frontend/.env.example frontend/.env
  ```

Then edit the values according to your environment. **It is not necessary to enter the `CF_API_KEY`.** (You can leave it blank or add a comment.).

> ⚠️ **Security warning:**
>
> The default admin password hash is:
>
> `$2a$12$/ImficEXuymsxlZap5.92euInslhhQB4Yg/gZS5zusrQ0aanIU2sO`
>
> This is for the user `admin`. **You should change this to your own password hash!**
>
> - Never use the default hash in production.
> - To generate a new hash, use a tool like [bcrypt-generator.com](https://bcrypt-generator.com/) or the `bcrypt` library in Node.js.
> - Example Node.js command:
>
>   ```js
>   require("bcrypt").hashSync("your-new-password", 12);
>   ```
>
> Paste your new hash in the `.env` file.

You need to have installed:

- **Docker and Docker Compose** (for Minecraft servers)
- **Node.js** (version 18 or higher - for frontend & backend)
- **PM2** (recommended for process management)
- Git (obviously)
- The desire to manage servers like a pro

Install PM2 globally:

```bash
npm install -g pm2
```

## Installation

You have two options for running the frontend: Docker or PM2. Choose the one that suits you best.

### Option 1: Using Docker (Recommended - Easier Setup)

#### Step 1: Download the project

```bash
git clone https://github.com/Ketbome/minepanel.git
cd minecraft-docker-manager
```

#### Step 2: Configure environment variables

**For Docker Compose:**

```bash
cp docker.env.example .env
# Edit the .env file with your preferred settings (ports, UIDs, etc.)
```

**For Backend:**

```bash
cp backend/.env.example backend/.env
# Edit backend/.env - IMPORTANT: Change the CLIENT_PASSWORD hash!
```

#### Step 3: Set up the backend (runs with PM2)

```bash
cd backend
npm install
npm run build
pm2 start npm --name "minecraft-backend" -- run start:prod
cd ..
```

#### Step 4: Start frontend and filebrowser with Docker

```bash
docker compose up -d
```

#### Step 5: Save PM2 configuration

```bash
pm2 save
pm2 startup  # Follow the instructions that appear
```

That's it! Access the panel at `http://localhost:3000`

---

### Option 2: Using PM2 (Traditional Setup)

#### Step 1: Download the project

```bash
git clone https://github.com/Ketbome/minepanel.git
cd minecraft-docker-manager
```

#### Step 2: Configure environment variables

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env - IMPORTANT: Change the CLIENT_PASSWORD hash!

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your configuration
```

#### Step 3: Set up the backend

```bash
cd backend
npm install
npm run build
pm2 start npm --name "minecraft-backend" -- run start:prod
cd ..
```

#### Step 4: Set up the frontend

```bash
cd frontend
npm install
npm run build
pm2 start npm --name "minecraft-frontend" -- run start
cd ..
```

#### Step 5: Save PM2 configuration

```bash
pm2 save
pm2 startup  # Follow the instructions that appear
```

Access the panel at `http://localhost:3000`

## File browser

Includes Filebrowser for when you need to edit files manually (which always happens).

### If you installed with Docker (Option 1):

Filebrowser is **already running**! It starts automatically with `docker compose up`.

Access it at: `http://localhost:8080` (or the port you configured in `.env`)

### If you installed with PM2 (Option 2):

You need to start Filebrowser separately:

```bash
cd filebrowser
docker-compose up -d
```

Then go to: `http://localhost:8080`

### Default credentials

- Username: `admin`
- Password: `admin`

> ⚠️ **Important**: Change these credentials immediately after first login

### What you can do with Filebrowser

- Browse through your server files
- Edit `server.properties`, `ops.json`, etc.
- Upload mods, plugins, or worlds
- Make quick changes without complications

> **Note**: Filebrowser runs in Docker without issues because it only needs to read/write files, not manage other Docker containers.

## Environment variables

### For Docker installation (Option 1)

You need **two** `.env` files:

**1. Root `.env` file** (for docker-compose):

```env
# Port Configuration
FRONTEND_PORT=3000
FILEBROWSER_PORT=8080

# User/Group IDs (run: id -u and id -g to get yours)
UID=1000
GID=1000

# Frontend URLs
NEXT_PUBLIC_FILEBROWSER_URL=http://localhost:8080
NEXT_PUBLIC_BACKEND_URL=http://localhost:8091
```

**2. Backend `.env` file** (in `backend/` folder):

```env
# URL of the frontend application
FRONTEND_URL=localhost:3000

# CurseForge API key (optional - leave empty if not using)
CF_API_KEY=

# Admin credentials
CLIENT_USERNAME=admin
CLIENT_PASSWORD=$2a$12$/ImficEXuymsxlZap5.92euInslhhQB4Yg/gZS5zusrQ0aanIU2sO

# Default language: 'en' or 'es'
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
```

> ⚠️ **Security**: The default `CLIENT_PASSWORD` hash is for the password "admin". **Change it in production!**
> Generate a new hash at [bcrypt-generator.com](https://bcrypt-generator.com/) or use Node.js:
> ```js
> require('bcrypt').hashSync('your-password', 12)
> ```

### For PM2 installation (Option 2)

**Backend `.env` file** (in `backend/` folder):

```env
# URL of the frontend application
FRONTEND_URL=localhost:3000

# CurseForge API key (optional)
CF_API_KEY=

# Admin credentials
CLIENT_USERNAME=admin
CLIENT_PASSWORD=$2a$12$/ImficEXuymsxlZap5.92euInslhhQB4Yg/gZS5zusrQ0aanIU2sO

# Default language: 'en' or 'es'
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
```

**Frontend `.env` file** (in `frontend/` folder):

```env
# URL of the backend API
NEXT_PUBLIC_API_URL=http://localhost:8091
```

## What's still missing

- [x] Translate everything to English (Done thanks to [ang3lo-azevedo](https://github.com/ang3lo-azevedo))
- [ ] Support for more modpack platforms
- [x] Backup system (already done!)
- [ ] User roles and permissions
- [ ] API documentation
- [ ] More detailed deployment guides
- [ ] Improved responsive design

## Roadmap (what's coming)

**Already working:**

- ✅ Basic support for multiple servers
- ✅ Real-time logs
- ✅ User authentication
- ✅ Resource usage dashboard
- ✅ Dynamic server addition/removal
- ✅ Multi-language interface

**In the oven:**

- 🔄 Mobile design improvements

## Advanced: Using with Nginx Proxy (Optional)

If you want to use this project with a reverse proxy like [nginx-proxy](https://github.com/nginx-proxy/nginx-proxy) for SSL/HTTPS and custom domains, you can modify the `docker-compose.yml`:

```yaml
services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    expose:
      - 3000
    environment:
      - VIRTUAL_HOST=your-domain.com
      - VIRTUAL_PORT=3000
      - LETSENCRYPT_HOST=your-domain.com
      - LETSENCRYPT_EMAIL=your-email@example.com
      - NEXT_PUBLIC_FILEBROWSER_URL=https://files.your-domain.com
      - NEXT_PUBLIC_BACKEND_URL=https://api.your-domain.com
    networks:
      - nginx-proxy
    restart: always

  filebrowser:
    image: hurlenko/filebrowser
    user: "${UID:-1000}:${GID:-1000}"
    expose:
      - 8080
    volumes:
      - ./servers:/data
      - ./filebrowser/config:/config
    environment:
      - FB_BASEURL=/
      - VIRTUAL_HOST=files.your-domain.com
      - VIRTUAL_PORT=8080
      - LETSENCRYPT_HOST=files.your-domain.com
      - LETSENCRYPT_EMAIL=your-email@example.com
    networks:
      - nginx-proxy
    restart: always

networks:
  nginx-proxy:
    external: true
```

Replace `your-domain.com` and `your-email@example.com` with your actual values.

## Contributing

Found a bug? Have a great idea? Pull requests are welcome!

You can also:

- Report issues in Issues
- Give a star if you like the project
- Share it with other server administrators

## License

MIT License - basically you can do whatever you want with the code.

## Contact

Created by [@Ketbome](https://github.com/Ketbome)

Questions? Suggestions? Just want to chat about Minecraft? Open an issue or send a message.

---

_This project was born out of the frustration of managing Minecraft servers for friends and the community. If it helps you, I'm glad!_
