# Deployment Guide

This guide covers various deployment options for the Fun Friday Chat application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Docker Deployment](#docker-deployment)
- [Manual Deployment](#manual-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Production Configuration](#production-configuration)
- [Monitoring & Logging](#monitoring--logging)
- [Backup Strategy](#backup-strategy)
- [Security Checklist](#security-checklist)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB+ recommended
- **Storage**: 20GB+ available space
- **OS**: Linux (Ubuntu 20.04+), macOS, or Windows

### Software Requirements

- **Node.js**: 16.0.0 or higher
- **MySQL**: 8.0 or higher
- **Redis**: 6.0 or higher (optional but recommended)
- **Docker**: 20.10+ (for containerized deployment)
- **Docker Compose**: 2.0+ (for multi-container deployment)

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/fun-friday-chat.git
cd fun-friday-chat
```

### 2. Environment Variables

Copy the example environment file and configure it:

```bash
cp env.example .env
```

Edit `.env` with your production values:

```env
# Database Configuration
DB_HOST=your-mysql-host
DB_USER=your-mysql-user
DB_PASSWORD=your-secure-password
DB_NAME=chat_app_prod

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=production

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Redis Configuration
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=uploads

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=logs/app.log
```

### 3. Database Setup

#### MySQL Setup

1. **Install MySQL 8.0+**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install mysql-server-8.0
   
   # CentOS/RHEL
   sudo yum install mysql-server
   ```

2. **Secure MySQL Installation**
   ```bash
   sudo mysql_secure_installation
   ```

3. **Create Database and User**
   ```sql
   CREATE DATABASE chat_app_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'chat_user'@'%' IDENTIFIED BY 'your-secure-password';
   GRANT ALL PRIVILEGES ON chat_app_prod.* TO 'chat_user'@'%';
   FLUSH PRIVILEGES;
   ```

4. **Run Database Setup**
   ```bash
   npm run db:setup
   ```

#### Redis Setup (Optional)

1. **Install Redis**
   ```bash
   # Ubuntu/Debian
   sudo apt install redis-server
   
   # CentOS/RHEL
   sudo yum install redis
   ```

2. **Configure Redis**
   ```bash
   sudo systemctl enable redis
   sudo systemctl start redis
   ```

## Docker Deployment

### Option 1: Docker Compose (Recommended)

1. **Prepare Environment**
   ```bash
   cp env.example .env
   # Edit .env with your production values
   ```

2. **Start Services**
   ```bash
   docker-compose up -d
   ```

3. **Check Status**
   ```bash
   docker-compose ps
   docker-compose logs -f app
   ```

4. **Access Application**
   - HTTP: `http://your-server-ip`
   - HTTPS: `https://your-domain.com` (after SSL setup)

### Option 2: Individual Containers

1. **Build Application Image**
   ```bash
   docker build -t fun-friday-chat:latest .
   ```

2. **Run MySQL Container**
   ```bash
   docker run -d \
     --name mysql \
     -e MYSQL_ROOT_PASSWORD=your-password \
     -e MYSQL_DATABASE=chat_app \
     -e MYSQL_USER=chat_user \
     -e MYSQL_PASSWORD=your-password \
     -p 3306:3306 \
     mysql:8.0
   ```

3. **Run Redis Container**
   ```bash
   docker run -d \
     --name redis \
     -p 6379:6379 \
     redis:7-alpine
   ```

4. **Run Application Container**
   ```bash
   docker run -d \
     --name fun-friday-chat \
     --link mysql:mysql \
     --link redis:redis \
     -e DB_HOST=mysql \
     -e REDIS_HOST=redis \
     -e JWT_SECRET=your-jwt-secret \
     -p 3000:3000 \
     fun-friday-chat:latest
   ```

## Manual Deployment

### 1. Install Dependencies

```bash
npm ci --production
```

### 2. Build Application (if needed)

```bash
npm run build
```

### 3. Set Up Process Manager

#### Using PM2 (Recommended)

1. **Install PM2**
   ```bash
   npm install -g pm2
   ```

2. **Create PM2 Configuration**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'fun-friday-chat',
       script: 'server.js',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       },
       error_file: './logs/err.log',
       out_file: './logs/out.log',
       log_file: './logs/combined.log',
       time: true
     }]
   };
   ```

3. **Start Application**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

#### Using systemd

1. **Create Service File**
   ```bash
   sudo nano /etc/systemd/system/fun-friday-chat.service
   ```

2. **Service Configuration**
   ```ini
   [Unit]
   Description=Fun Friday Chat Application
   After=network.target mysql.service

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/path/to/fun-friday-chat
   ExecStart=/usr/bin/node server.js
   Restart=always
   RestartSec=10
   Environment=NODE_ENV=production
   Environment=PORT=3000

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable and Start Service**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable fun-friday-chat
   sudo systemctl start fun-friday-chat
   ```

### 4. Set Up Reverse Proxy

#### Nginx Configuration

1. **Install Nginx**
   ```bash
   sudo apt install nginx
   ```

2. **Create Site Configuration**
   ```bash
   sudo nano /etc/nginx/sites-available/fun-friday-chat
   ```

3. **Nginx Configuration**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       # Security headers
       add_header X-Frame-Options "SAMEORIGIN" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;

       # Rate limiting
       limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }

       location /uploads/ {
           alias /path/to/fun-friday-chat/uploads/;
           expires 1y;
           add_header Cache-Control "public, immutable";
       }
   }
   ```

4. **Enable Site**
   ```bash
   sudo ln -s /etc/nginx/sites-available/fun-friday-chat /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### 5. SSL Certificate (Let's Encrypt)

1. **Install Certbot**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Obtain Certificate**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Auto-renewal**
   ```bash
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet
   ```

## Cloud Deployment

### AWS Deployment

#### Using EC2

1. **Launch EC2 Instance**
   - AMI: Ubuntu 20.04 LTS
   - Instance Type: t3.medium or larger
   - Security Groups: Allow HTTP (80), HTTPS (443), SSH (22)

2. **Install Dependencies**
   ```bash
   sudo apt update
   sudo apt install nodejs npm mysql-server nginx
   ```

3. **Deploy Application**
   ```bash
   git clone https://github.com/yourusername/fun-friday-chat.git
   cd fun-friday-chat
   npm ci --production
   ```

4. **Set Up RDS MySQL**
   - Create RDS MySQL instance
   - Configure security groups
   - Update environment variables

#### Using ECS

1. **Create ECS Cluster**
2. **Build and Push Docker Image**
   ```bash
   aws ecr create-repository --repository-name fun-friday-chat
   docker build -t fun-friday-chat .
   docker tag fun-friday-chat:latest your-account.dkr.ecr.region.amazonaws.com/fun-friday-chat:latest
   docker push your-account.dkr.ecr.region.amazonaws.com/fun-friday-chat:latest
   ```

3. **Create Task Definition**
4. **Create Service**

### Google Cloud Platform

#### Using Compute Engine

1. **Create VM Instance**
2. **Install Dependencies**
3. **Deploy Application**

#### Using Cloud Run

1. **Build and Push Container**
   ```bash
   gcloud builds submit --tag gcr.io/your-project/fun-friday-chat
   ```

2. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy fun-friday-chat \
     --image gcr.io/your-project/fun-friday-chat \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```

### DigitalOcean

#### Using Droplets

1. **Create Droplet**
   - Image: Ubuntu 20.04
   - Size: 2GB RAM minimum
   - Add SSH key

2. **Deploy Application**
   ```bash
   # Follow manual deployment steps
   ```

#### Using App Platform

1. **Connect GitHub Repository**
2. **Configure Build Settings**
3. **Set Environment Variables**
4. **Deploy**

## Production Configuration

### 1. Security Hardening

#### Database Security
```sql
-- Remove test databases
DROP DATABASE IF EXISTS test;

-- Create application-specific user with limited privileges
CREATE USER 'chat_app'@'localhost' IDENTIFIED BY 'strong-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_app.* TO 'chat_app'@'localhost';
FLUSH PRIVILEGES;
```

#### Application Security
```bash
# Set proper file permissions
chmod 600 .env
chmod 755 uploads/
chown -R www-data:www-data uploads/ logs/
```

#### Firewall Configuration
```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Performance Optimization

#### Node.js Optimization
```bash
# Increase file descriptor limit
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf
```

#### MySQL Optimization
```ini
# /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
max_connections = 200
query_cache_size = 64M
```

#### Nginx Optimization
```nginx
# /etc/nginx/nginx.conf
worker_processes auto;
worker_connections 1024;

gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript;
```

### 3. Monitoring Setup

#### Application Monitoring
```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-server-monit
```

#### System Monitoring
```bash
# Install htop, iotop
sudo apt install htop iotop

# Set up log rotation
sudo nano /etc/logrotate.d/fun-friday-chat
```

## Monitoring & Logging

### 1. Application Logs

#### Winston Logging
- **Location**: `logs/combined.log`, `logs/error.log`
- **Levels**: error, warn, info, debug
- **Rotation**: Daily rotation, 30-day retention

#### PM2 Logs
```bash
pm2 logs fun-friday-chat
pm2 monit
```

### 2. System Monitoring

#### Health Checks
```bash
# Application health
curl http://localhost:3000/health

# Database health
mysqladmin ping -h localhost -u chat_app -p

# Redis health
redis-cli ping
```

#### Monitoring Tools
- **Prometheus + Grafana**: Metrics and dashboards
- **ELK Stack**: Log aggregation and analysis
- **Uptime Robot**: External monitoring

### 3. Alerting

#### Set Up Alerts
```bash
# CPU usage alert
if [ $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1) -gt 80 ]; then
  echo "High CPU usage detected" | mail -s "Alert" admin@yourdomain.com
fi
```

## Backup Strategy

### 1. Database Backup

#### Automated MySQL Backup
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u chat_app -p chat_app > /backups/chat_app_$DATE.sql
find /backups -name "chat_app_*.sql" -mtime +7 -delete
```

#### Schedule Backup
```bash
# Add to crontab
0 2 * * * /path/to/backup.sh
```

### 2. File Backup

#### Backup Uploads
```bash
#!/bin/bash
# file_backup.sh
rsync -av /path/to/fun-friday-chat/uploads/ /backups/uploads/
```

### 3. Configuration Backup

#### Backup Configuration Files
```bash
tar -czf config_backup_$(date +%Y%m%d).tar.gz .env nginx/ ecosystem.config.js
```

## Security Checklist

### Pre-deployment
- [ ] Strong passwords for all services
- [ ] JWT secret key generated securely
- [ ] Database user with minimal privileges
- [ ] Firewall configured
- [ ] SSL certificate installed
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented

### Post-deployment
- [ ] Regular security updates
- [ ] Monitor failed login attempts
- [ ] Review access logs
- [ ] Test backup restoration
- [ ] Verify SSL configuration
- [ ] Check for vulnerabilities

## Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
pm2 logs fun-friday-chat
tail -f logs/error.log

# Check port availability
netstat -tulpn | grep :3000
```

#### Database Connection Issues
```bash
# Test database connection
mysql -h localhost -u chat_app -p chat_app

# Check MySQL status
sudo systemctl status mysql
```

#### High Memory Usage
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Restart application
pm2 restart fun-friday-chat
```

#### File Upload Issues
```bash
# Check upload directory permissions
ls -la uploads/
chmod 755 uploads/
chown www-data:www-data uploads/
```

### Performance Issues

#### Slow Database Queries
```sql
-- Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 2;

-- Check slow queries
SHOW VARIABLES LIKE 'slow_query_log%';
```

#### High CPU Usage
```bash
# Monitor CPU usage
top -p $(pgrep node)

# Check for memory leaks
node --inspect server.js
```

### Log Analysis

#### Application Logs
```bash
# Search for errors
grep "ERROR" logs/error.log

# Monitor real-time logs
tail -f logs/combined.log | grep ERROR
```

#### Nginx Logs
```bash
# Check access logs
tail -f /var/log/nginx/access.log

# Analyze error logs
grep "error" /var/log/nginx/error.log
```

### Recovery Procedures

#### Database Recovery
```bash
# Restore from backup
mysql -u chat_app -p chat_app < backup_20240101_020000.sql
```

#### Application Recovery
```bash
# Rollback to previous version
git checkout previous-stable-tag
npm ci --production
pm2 restart fun-friday-chat
```

#### Complete System Recovery
1. Provision new server
2. Install dependencies
3. Restore database backup
4. Deploy application code
5. Restore file uploads
6. Update DNS records

## Support

For additional support:
- **Documentation**: [GitHub Wiki](https://github.com/yourusername/fun-friday-chat/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/fun-friday-chat/issues)
- **Discord**: [Community Server](https://discord.gg/funfridaychat)
- **Email**: support@funfridaychat.com

