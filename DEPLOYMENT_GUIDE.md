# Alignbox - Deployment Guide 🚀

Complete guide for deploying the Alignbox chat application to production.

## Table of Contents
1. [Local Development Setup](#local-development-setup)
2. [Docker Deployment](#docker-deployment)
3. [Production Deployment](#production-deployment)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [SSL/HTTPS Setup](#ssltls-setup)
7. [Monitoring & Logs](#monitoring--logs)
8. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites
- Node.js 16+ ([Download](https://nodejs.org/))
- MySQL 8.0+ ([Download](https://dev.mysql.com/downloads/mysql/))
- npm or yarn

### Step 1: Install Backend Dependencies
```bash
cd /path/to/Alignbox
npm install
```

### Step 2: Install Frontend Dependencies
```bash
cd client
npm install
cd ..
```

### Step 3: Set Up Environment Variables

Create `.env` file in the root directory:
```bash
cp env.example .env
```

Edit `.env` with your configuration:
```env
# Node Environment
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_USER=chat_user
DB_PASSWORD=your_secure_password
DB_NAME=alignbox_db
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here_min_32_chars
JWT_EXPIRY=24h

# CORS Configuration
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# File Upload
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,txt

# Logging
LOG_LEVEL=debug
```

Create `.env.local` in `client/` directory:
```bash
echo "VITE_API_BASE=http://localhost:3000" > client/.env.local
```

### Step 4: Set Up Database

```bash
# Create database and tables
npm run db:setup

# Run migrations (if any)
npm run db:migrate

# Seed demo data
npm run db:seed
```

### Step 5: Start Development Servers

**Terminal 1 - Backend:**
```bash
npm run dev
# Server runs at http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
# Frontend runs at http://localhost:5173
```

---

## Docker Deployment

### Prerequisites
- Docker ([Install Docker](https://docs.docker.com/get-docker/))
- Docker Compose ([Install Docker Compose](https://docs.docker.com/compose/install/))

### Quick Start with Docker Compose

1. **Create `.env` file:**
```bash
cat > .env << EOF
NODE_ENV=production
PORT=3000
DB_HOST=mysql
DB_USER=chat_user
DB_PASSWORD=SecurePassword123!
DB_NAME=alignbox_db
JWT_SECRET=your_super_secure_jwt_secret_key_here_min_32_chars
CORS_ORIGIN=http://localhost:3000,http://yourapp.com
EOF
```

2. **Build and start containers:**
```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

3. **Access the application:**
- Backend: `http://localhost:3000`
- Frontend: Access through the backend

4. **Verify services are running:**
```bash
docker-compose ps

# Check service health
docker-compose exec mysql mysqladmin ping -h localhost
docker-compose exec redis redis-cli ping
docker-compose exec app curl http://localhost:3000/health
```

### Useful Docker Compose Commands

```bash
# View logs for a specific service
docker-compose logs -f app

# Execute command in a container
docker-compose exec app npm run db:seed

# Rebuild specific service
docker-compose build app

# Remove all volumes (WARNING: Deletes data)
docker-compose down -v
```

---

## Production Deployment

### Option 1: Deploy to AWS EC2

#### Prerequisites
- AWS account with EC2 access
- SSH key pair
- Security group configured for ports 80, 443, 3000

#### Steps

1. **Launch EC2 Instance:**
   - AMI: Ubuntu 22.04 LTS
   - Instance type: t3.medium (or larger)
   - Security Groups: Allow SSH (22), HTTP (80), HTTPS (443), Custom TCP (3000)

2. **SSH into instance:**
```bash
ssh -i your-key.pem ubuntu@your-instance-public-ip
```

3. **Install dependencies:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu
newgrp docker
```

4. **Clone and deploy application:**
```bash
# Clone repository
git clone https://github.com/yourusername/alignbox.git
cd alignbox

# Create production .env
cat > .env << EOF
NODE_ENV=production
PORT=3000
DB_HOST=mysql
DB_USER=chat_user
DB_PASSWORD=$(openssl rand -base64 32)
DB_NAME=alignbox_db
JWT_SECRET=$(openssl rand -base64 32)
CORS_ORIGIN=https://yourdomain.com
EOF

# Start with Docker Compose
docker-compose up -d
```

5. **Set up Nginx reverse proxy:**
```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/alignbox > /dev/null << EOF
upstream backend {
    server localhost:3000;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /socket.io {
        proxy_pass http://backend/socket.io;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/alignbox /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Test and start Nginx
sudo nginx -t
sudo systemctl restart nginx
```

### Option 2: Deploy to Heroku

1. **Install Heroku CLI:**
```bash
npm install -g heroku
heroku login
```

2. **Create Heroku app:**
```bash
heroku create your-app-name
```

3. **Set environment variables:**
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set DB_HOST=your-mysql-host
heroku config:set DB_USER=your-db-user
heroku config:set DB_PASSWORD=your-db-password
heroku config:set DB_NAME=your-db-name
```

4. **Deploy:**
```bash
git push heroku main
```

### Option 3: Deploy to DigitalOcean

1. **Create Droplet:**
   - OS: Ubuntu 22.04 LTS
   - Size: $6-12/month (minimum)

2. **Follow AWS EC2 setup steps above** (DigitalOcean droplets are Ubuntu-based)

---

## Environment Variables

### Backend Environment Variables

```env
# Application
NODE_ENV=production          # development|production|test
PORT=3000                    # Server port
APP_URL=https://yourdomain.com

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=chat_user
DB_PASSWORD=secure_password
DB_NAME=alignbox_db

# Authentication
JWT_SECRET=min_32_character_string_required_for_security
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# CORS
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# File Uploads
MAX_FILE_SIZE=52428800      # 50MB in bytes
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Logging
LOG_LEVEL=info              # debug|info|warn|error
LOG_FILE=logs/app.log

# Email (optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
FROM_EMAIL=noreply@alignbox.com
```

### Frontend Environment Variables

**`.env` or `.env.local` in `client/` directory:**
```env
VITE_API_BASE=https://api.yourdomain.com
VITE_SOCKET_URL=https://yourdomain.com
```

---

## Database Setup

### Create Database

```bash
# Using MySQL CLI
mysql -u root -p

# Inside MySQL shell
CREATE DATABASE alignbox_db;
CREATE USER 'chat_user'@'%' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON alignbox_db.* TO 'chat_user'@'%';
FLUSH PRIVILEGES;
EXIT;
```

### Run Database Setup Script

```bash
npm run db:setup
npm run db:seed
```

### Backup Database

```bash
# Backup
mysqldump -u chat_user -p alignbox_db > backup_$(date +%Y%m%d).sql

# Restore
mysql -u chat_user -p alignbox_db < backup_20240101.sql
```

---

## SSL/TLS Setup

### Using Let's Encrypt with Certbot (Recommended)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com

# Update Nginx configuration
sudo nano /etc/nginx/sites-available/alignbox
```

Update Nginx config to use SSL:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Rest of configuration...
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

```bash
# Restart Nginx
sudo systemctl restart nginx

# Auto-renew certificates
sudo certbot renew --dry-run
```

---

## Monitoring & Logs

### View Logs

```bash
# Docker Compose logs
docker-compose logs -f app

# Application logs
tail -f logs/app.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Monitor Application Health

```bash
# Check health endpoint
curl http://localhost:3000/health

# Monitor Docker containers
docker stats

# Monitor system resources
top
htop
```

### Set Up Log Rotation

```bash
# Create logrotate configuration
sudo tee /etc/logrotate.d/alignbox > /dev/null << EOF
/app/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 nodejs nodejs
    sharedscripts
}
EOF
```

---

## Troubleshooting

### Issue: Database Connection Error

**Solution:**
```bash
# Check MySQL is running
docker-compose ps mysql

# Verify credentials in .env
# Restart MySQL service
docker-compose restart mysql

# Check connection
docker-compose exec mysql mysql -u chat_user -p alignbox_db -e "SELECT 1"
```

### Issue: Socket.IO Connection Failed

**Solution:**
```bash
# Check CORS settings in .env
# Verify Socket.IO port is open
sudo ufw allow 3000

# Check Nginx configuration for WebSocket support
# Ensure these headers are present:
# - Upgrade
# - Connection
```

### Issue: High Memory Usage

**Solution:**
```bash
# Check container memory limits
docker-compose config | grep -A 5 "mem_limit"

# Add memory limits to docker-compose.yml:
# services:
#   app:
#     deploy:
#       resources:
#         limits:
#           memory: 512M
```

### Issue: Port Already in Use

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port in .env
PORT=3001
```

### Issue: Database Locks

**Solution:**
```bash
# Check for locked tables
docker-compose exec mysql mysql -u chat_user -p alignbox_db -e "SHOW OPEN TABLES WHERE In_use > 0;"

# Kill long-running queries
docker-compose exec mysql mysql -u chat_user -p alignbox_db -e "SHOW PROCESSLIST;"
docker-compose exec mysql mysql -u chat_user -p alignbox_db -e "KILL <QUERY_ID>;"
```

---

## Performance Optimization

### Enable Redis Caching
```env
REDIS_HOST=redis
REDIS_PORT=6379
```

### Optimize Database
```bash
# Add indexes for frequently queried columns
docker-compose exec mysql mysql -u chat_user -p alignbox_db << EOF
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_group_created ON groups(created_at);
CREATE INDEX idx_message_group ON messages(group_id);
CREATE INDEX idx_member_status ON group_members(is_active);
EOF
```

### Enable Compression
Update Nginx configuration:
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;
```

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Set strong JWT_SECRET (minimum 32 characters)
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up rate limiting
- [ ] Enable CORS properly (don't use *)
- [ ] Set secure headers in Nginx
- [ ] Regular database backups
- [ ] Monitor application logs
- [ ] Keep dependencies updated
- [ ] Use environment variables for secrets
- [ ] Implement database encryption

---

## Next Steps

1. **Test the deployment:**
   - Register a new user
   - Create a group
   - Send messages
   - Verify real-time updates
   - Test file uploads

2. **Monitor performance:**
   - Watch CPU and memory usage
   - Monitor database queries
   - Check response times
   - Monitor WebSocket connections

3. **Set up backups:**
   - Automated database backups
   - File backup for uploads
   - Configuration backup

4. **Update dependencies:**
   ```bash
   npm outdated
   npm update
   npm audit fix
   ```

---

## Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review error messages carefully
- Consult troubleshooting section above
- Check GitHub issues

---

**Happy Deploying! 🚀**
