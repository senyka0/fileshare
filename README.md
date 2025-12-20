# File Sharing Web App

A secure, production-ready file sharing web application built with Next.js 14, TypeScript, and PostgreSQL. Features include password protection, configurable expiration times, and file size limits.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Runtime**: Node.js 20
- **Containerization**: Docker & Docker Compose

## Features

- Secure file uploads with configurable size limits
- Password-protected file sharing
- Configurable expiration times (in hours)
- File type whitelist for security
- Automatic file cleanup
- Docker support for easy deployment

## Prerequisites

### For Local Development

- Node.js 20 or higher
- PostgreSQL 16 or higher
- npm or yarn

### For Docker Deployment

- Docker 20.10 or higher
- Docker Compose 2.0 or higher

## Docker Deployment (Local)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd sharefiles
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp env.example .env
```

Edit `.env` with your configuration. **IMPORTANT**: Change the default password:

```bash
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=sharefiles
POSTGRES_USER=sharefiles
POSTGRES_PASSWORD=your_secure_password_here
APP_PORT=3000
BASE_URL=http://localhost:3000
NODE_ENV=production
UPLOAD_DIR=/uploads
MAX_EXPIRATION_HOURS=168
MAX_FILE_SIZE=1073741824
```

### 3. Build and Run

```bash
docker compose up --build
```

### 4. Access the Application

Open `http://localhost:3000` in your browser.

### 5. Stop the Application

```bash
docker compose down
```

To remove volumes (including database data):

```bash
docker compose down -v
```

## VPS Deployment

### Prerequisites

- Ubuntu 20.04+ or Debian 11+ (recommended)
- Docker and Docker Compose installed
- Domain name (optional, for SSL)
- Firewall configured (UFW recommended)

### 1. Server Setup

#### Install Docker and Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

#### Configure Firewall

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### 2. Clone and Configure

```bash
# Clone repository
git clone <repository-url>
cd sharefiles

# Create .env file
cp env.example .env
nano .env
```

Update `.env` with production values:

```bash
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_DB=sharefiles
POSTGRES_USER=sharefiles
POSTGRES_PASSWORD=strong_random_password_here
APP_PORT=3000
BASE_URL=https://yourdomain.com
NODE_ENV=production
UPLOAD_DIR=/uploads
MAX_EXPIRATION_HOURS=168
MAX_FILE_SIZE=1073741824
```

**Security**: Generate a strong password:

```bash
openssl rand -base64 32
```

### 3. Update docker-compose.yml for Production

For production, you may want to add a reverse proxy. Update `docker-compose.yml`:

```yaml
services:
  # ... existing services ...

  nginx:
    image: nginx:alpine
    container_name: sharefiles-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - sharefiles-network
```

### 4. Build and Start

```bash
docker compose up -d --build
```

### 5. Set Up SSL with Let's Encrypt (Optional but Recommended)

#### Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx
```

#### Obtain SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com
```

### 6. Set Up Reverse Proxy (Nginx)

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name yourdomain.com;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

## Environment Variables

| Variable               | Required | Default                 | Description                                                  |
| ---------------------- | -------- | ----------------------- | ------------------------------------------------------------ |
| `POSTGRES_HOST`        | Yes      | -                       | PostgreSQL host (use `db` for Docker, `localhost` for local) |
| `POSTGRES_PORT`        | No       | `5432`                  | PostgreSQL port                                              |
| `POSTGRES_DB`          | Yes      | -                       | PostgreSQL database name                                     |
| `POSTGRES_USER`        | Yes      | -                       | PostgreSQL username                                          |
| `POSTGRES_PASSWORD`    | Yes      | -                       | PostgreSQL password (**change from default!**)               |
| `APP_PORT`             | No       | `3000`                  | Application port                                             |
| `BASE_URL`             | No       | `http://localhost:3000` | Base URL for download links                                  |
| `NODE_ENV`             | No       | `production`            | Node environment (`production` or `development`)             |
| `UPLOAD_DIR`           | No       | `/uploads`              | Directory for uploaded files                                 |
| `MAX_EXPIRATION_HOURS` | No       | `168`                   | Maximum file expiration in hours (168 = 7 days)              |
| `MAX_FILE_SIZE`        | No       | `1073741824`            | Maximum file size in bytes (1073741824 = 1GB)                |

## Security Features

- File size limits (configurable)
- File type whitelist
- Password-protected files
- Filename sanitization (XSS prevention)
- UUID validation
- Security headers (CSP, HSTS, X-Frame-Options)
- No default database credentials
- Docker container runs as non-root user

## File Type Whitelist

The following file types are allowed:

- Documents: `.pdf`, `.doc`, `.docx`, `.txt`, `.rtf`
- Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.webp`, `.svg`
- Archives: `.zip`, `.rar`, `.7z`, `.tar`, `.gz`
- Video: `.mp4`, `.avi`, `.mov`, `.wmv`, `.flv`
- Audio: `.mp3`, `.wav`, `.ogg`, `.flac`
- Spreadsheets: `.xls`, `.xlsx`, `.csv`
- Presentations: `.ppt`, `.pptx`
- OpenDocument: `.odt`, `.ods`, `.odp`
