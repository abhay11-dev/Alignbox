# Quick Deployment Guide 🚀

Get Alignbox up and running in minutes!

## 🐳 Docker Deployment (Recommended)

### 1. Prerequisites
- Docker installed ([Download](https://docs.docker.com/get-docker/))
- Docker Compose installed ([Download](https://docs.docker.com/compose/install/))

### 2. Clone Repository
```bash
git clone https://github.com/yourusername/alignbox.git
cd alignbox
```

### 3. Configure Environment
```bash
# Copy example environment file
cp env.example .env

# Edit with your settings
nano .env
```

**Key environment variables to update:**
```env
DB_PASSWORD=YourSecurePassword123!
JWT_SECRET=YourSecretKeyMinimum32CharactersLong
CORS_ORIGIN=https://yourdomain.com
```

### 4. Build & Deploy
```bash
# Using the deployment script
chmod +x deploy.sh
./deploy.sh prod

# OR using Docker Compose directly
docker-compose -f docker-compose.prod.yml up -d
```

### 5. Access Application
- **Frontend**: http://localhost
- **API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health

### 6. View Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 🖥️ Local Development

### 1. Install Dependencies
```bash
# Backend
npm install

# Frontend
cd client
npm install
cd ..
```

### 2. Setup Database
```bash
# Create local MySQL database
mysql -u root -p -e "CREATE DATABASE alignbox_db;"

# Run setup script
npm run db:setup
npm run db:seed
```

### 3. Configure .env
```bash
# Create .env file
cat > .env << EOF
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=alignbox_db
JWT_SECRET=dev_secret_key_for_development_only
CORS_ORIGIN=http://localhost:5173
EOF

# Create frontend .env
echo "VITE_API_BASE=http://localhost:3000" > client/.env.local
```

### 4. Start Development Servers
```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

- Backend: http://localhost:3000
- Frontend: http://localhost:5173

---

## ☁️ Cloud Deployment

### AWS EC2

```bash
# 1. Launch Ubuntu 22.04 LTS instance
# 2. SSH into instance
ssh -i your-key.pem ubuntu@your-ip

# 3. Install dependencies
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# 4. Clone and deploy
git clone https://github.com/yourusername/alignbox.git
cd alignbox
./deploy.sh prod
```

### Heroku

```bash
# 1. Install Heroku CLI
npm install -g heroku

# 2. Login and create app
heroku login
heroku create your-app-name

# 3. Set environment variables
heroku config:set JWT_SECRET=$(openssl rand -base64 32)
heroku config:set DB_HOST=your-rds-endpoint

# 4. Deploy
git push heroku main
```

### DigitalOcean

```bash
# Create Droplet: Ubuntu 22.04 LTS
# Follow AWS EC2 steps above (DigitalOcean uses same Ubuntu base)
```

---

## 🔐 SSL/HTTPS Setup

### Using Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Update Nginx configuration
sudo nano /etc/nginx/sites-available/alignbox
```

Update configuration:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

Restart Nginx:
```bash
sudo systemctl restart nginx
```

---

## 🆘 Troubleshooting

### Check Service Status
```bash
# View all containers
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs app
docker-compose -f docker-compose.prod.yml logs mysql
docker-compose -f docker-compose.prod.yml logs redis
```

### Database Connection Issues
```bash
# Test MySQL connection
docker-compose -f docker-compose.prod.yml exec -T mysql \
  mysql -u chat_user -p -h mysql -e "SELECT 1"

# Verify credentials in .env
grep DB_ .env
```

### Port Already in Use
```bash
# Find and kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Or use different port in .env
```

### Clear Data & Restart
```bash
# Stop and remove all containers
docker-compose -f docker-compose.prod.yml down

# Remove volumes (WARNING: Deletes data)
docker-compose -f docker-compose.prod.yml down -v

# Restart fresh
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📊 Monitoring

### View Real-time Logs
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Monitor Resource Usage
```bash
docker stats
```

### Database Backup
```bash
# Backup
docker-compose -f docker-compose.prod.yml exec -T mysql \
  mysqldump -u chat_user -p alignbox_db > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20240101.sql | docker-compose -f docker-compose.prod.yml exec -T mysql \
  mysql -u chat_user -p alignbox_db
```

---

## 🚀 Performance Tips

1. **Enable Caching**
   - Redis is configured in production
   - Cache frequently accessed data

2. **Database Optimization**
   - Ensure indexes are created
   - Monitor slow queries

3. **Frontend Optimization**
   - Built with Vite for fast bundling
   - Static assets served by Nginx

4. **Enable Gzip Compression**
   - Configured in Nginx
   - Reduces bandwidth usage

---

## 📚 Additional Resources

- Full Deployment Guide: See `DEPLOYMENT_GUIDE.md`
- API Documentation: See `docs/API.md`
- Architecture: See `docs/ARCHITECTURE.md`
- Project Overview: See `PROJECT_SUMMARY.md`

---

## ✅ Verification Checklist

- [ ] Docker and Docker Compose installed
- [ ] .env file configured with secure values
- [ ] Database initialized with `npm run db:setup`
- [ ] Application running: `docker-compose ps`
- [ ] Health check passing: `curl http://localhost:3000/health`
- [ ] Can access frontend
- [ ] Can register and login
- [ ] Can create groups and send messages
- [ ] Real-time updates working (Socket.IO)
- [ ] File uploads working

---

## 🎯 Next Steps

1. **Test thoroughly** with multiple users
2. **Setup monitoring** for production
3. **Configure backups** for database
4. **Setup SSL/HTTPS** for security
5. **Monitor logs** regularly
6. **Keep dependencies updated**

---

**Questions? Check the full DEPLOYMENT_GUIDE.md for more details!**

Happy deploying! 🎉
