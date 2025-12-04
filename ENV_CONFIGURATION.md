# Environment Configuration Reference

Complete guide for configuring environment variables for different deployment scenarios.

## 📝 Quick Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| NODE_ENV | Execution environment | development, production |
| PORT | Server port | 3000 |
| JWT_SECRET | JWT signing secret | 32+ char random string |
| DB_* | Database credentials | MySQL connection details |
| CORS_ORIGIN | Allowed origins | https://domain.com |
| MAX_FILE_SIZE | Max upload size | 52428800 (50MB) |

---

## 🛠️ Development Configuration

**.env** (Local Development)
```env
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=alignbox_db

# Authentication
JWT_SECRET=dev_secret_key_only_for_development_do_not_use_in_production
JWT_EXPIRY=24h

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# File Upload
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,txt

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Logging
LOG_LEVEL=debug
LOG_FILE=logs/app.log
```

**client/.env.local** (Frontend Development)
```env
VITE_API_BASE=http://localhost:3000
```

---

## 🐳 Docker Development Configuration

**.env** (Docker Compose Dev)
```env
NODE_ENV=development
PORT=3000

# MySQL
DB_HOST=mysql
DB_PORT=3306
DB_USER=chat_user
DB_PASSWORD=dev_password_123
DB_NAME=alignbox_dev

# JWT
JWT_SECRET=dev_secret_key_for_docker_dev_environment_only_12345
JWT_EXPIRY=24h

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# Logging
LOG_LEVEL=debug
```

---

## 🌍 Staging Configuration

**.env** (Staging Server)
```env
# Application
NODE_ENV=production
PORT=3000
APP_URL=https://staging.alignbox.example.com

# Database
DB_HOST=staging-mysql.internal
DB_PORT=3306
DB_USER=staging_user
DB_PASSWORD=StagingPassword123!SafePassword
DB_NAME=alignbox_staging

# Authentication
JWT_SECRET=StagingJWTSecretMinimum32CharactersLongForSecurityReasons
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# CORS
CORS_ORIGIN=https://staging.alignbox.example.com,https://staging-app.alignbox.example.com

# File Upload
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,txt

# Redis
REDIS_HOST=staging-redis.internal
REDIS_PORT=6379
REDIS_PASSWORD=StagingRedisPassword123!

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/alignbox/app.log
```

---

## 🚀 Production Configuration

**.env** (Production - Docker Compose)
```env
# Application
NODE_ENV=production
PORT=3000
APP_URL=https://alignbox.example.com

# Database
DB_HOST=mysql
DB_PORT=3306
DB_USER=prod_user
DB_PASSWORD=ProductionPassword123!VerySecureReallyLong
DB_NAME=alignbox_prod

# Authentication (IMPORTANT: Generate secure random strings)
JWT_SECRET=ProductionJWTSecretMinimum32CharactersLongForMaximumSecurity!@#$
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# CORS
CORS_ORIGIN=https://alignbox.example.com,https://www.alignbox.example.com

# File Upload
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,xlsx,pptx

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=ProductionRedisPassword123!VerySecure

# Logging
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log

# Security
SECURE_HEADERS=true
HELMET_ENABLED=true
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**.env** (Production - AWS RDS)
```env
# Application
NODE_ENV=production
PORT=3000
APP_URL=https://alignbox.example.com

# Database (AWS RDS)
DB_HOST=alignbox-prod.c3qpkx2z1234.us-east-1.rds.amazonaws.com
DB_PORT=3306
DB_USER=admin
DB_PASSWORD=AwsRdsPassword123!VerySecurePassword
DB_NAME=alignbox_prod

# Authentication
JWT_SECRET=AwsProductionJWTSecretMinimum32CharactersLongForMaximumSecurity!
JWT_EXPIRY=24h

# CORS
CORS_ORIGIN=https://alignbox.example.com,https://www.alignbox.example.com

# File Upload (S3)
AWS_S3_BUCKET=alignbox-uploads-prod
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Redis (ElastiCache)
REDIS_HOST=alignbox-redis.abc123.ng.0001.use1.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=ElastiCachePassword123!

# Logging
LOG_LEVEL=warn
LOG_FILE=/var/log/alignbox/app.log

# CloudWatch
CLOUDWATCH_ENABLED=true
CLOUDWATCH_LOG_GROUP=/aws/alignbox/production
```

---

## ☁️ Heroku Configuration

**Set via Heroku CLI:**
```bash
# Login to Heroku
heroku login

# Create app
heroku create alignbox-prod

# Set config variables
heroku config:set --app alignbox-prod \
  NODE_ENV=production \
  JWT_SECRET=$(openssl rand -base64 32) \
  DB_HOST=your-heroku-postgres-host \
  DB_USER=heroku_user \
  DB_PASSWORD=$(openssl rand -base64 16) \
  CORS_ORIGIN=https://alignbox-prod.herokuapp.com \
  REDIS_URL=redis://your-redis-host:6379

# Verify config
heroku config --app alignbox-prod

# View logs
heroku logs --app alignbox-prod --tail
```

**Procfile** (for Heroku):
```
web: node server.js
```

---

## 🔐 Generating Secure Secrets

### Generate JWT_SECRET
```bash
# Linux/Mac
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes((1..32 | ForEach-Object { [char](Get-Random -Min 33 -Max 127) } | Join-String)))

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Generate Database Password
```bash
# Create strong password
openssl rand -base64 16
# Example output: X8kZ9mP2Q5wL7bN4jH6r

# Or use online generator
# https://www.random.org/passwords/
```

### Generate API Keys
```bash
# Generate 64-character hex string
openssl rand -hex 32

# Or base64
openssl rand -base64 32
```

---

## 🔄 Environment Variable Checklist

### Required Variables
- [ ] NODE_ENV (development, production, test)
- [ ] PORT (server port)
- [ ] JWT_SECRET (32+ characters)
- [ ] DB_HOST
- [ ] DB_USER
- [ ] DB_PASSWORD
- [ ] DB_NAME
- [ ] CORS_ORIGIN

### Optional but Recommended
- [ ] REDIS_HOST
- [ ] REDIS_PASSWORD
- [ ] MAX_FILE_SIZE
- [ ] LOG_LEVEL
- [ ] APP_URL

### Cloud-Specific
- [ ] AWS_S3_BUCKET (if using S3)
- [ ] AWS_ACCESS_KEY_ID (if using AWS)
- [ ] CLOUDWATCH_ENABLED (if using CloudWatch)

---

## ❌ Common Mistakes

### ❌ DON'T:
```env
# ❌ No hardcoded secrets in .env or code
JWT_SECRET=secret123

# ❌ Don't commit .env to git
git add .env  # WRONG!

# ❌ Don't use localhost in production
CORS_ORIGIN=http://localhost:3000

# ❌ Don't use default passwords
DB_PASSWORD=password

# ❌ Don't expose sensitive data in logs
LOG_LEVEL=debug (in production)
```

### ✅ DO:
```env
# ✅ Use strong, random secrets
JWT_SECRET=X8kZ9mP2Q5wL7bN4jH6rT1uV3wX5yZ7aB9cD2eF4gH6jK8lM0nP2qR4sT6u

# ✅ Add .env to .gitignore
echo ".env" >> .gitignore

# ✅ Use actual domain in production
CORS_ORIGIN=https://yourdomain.com

# ✅ Use strong passwords
DB_PASSWORD=$(openssl rand -base64 16)

# ✅ Use appropriate log levels
LOG_LEVEL=info  # production
LOG_LEVEL=debug # development
```

---

## 📋 .env Template for Copy-Paste

```env
# ========================================
# ALIGNBOX ENVIRONMENT CONFIGURATION
# ========================================

# Application Settings
NODE_ENV=production
PORT=3000
APP_URL=https://yourdomain.com

# Database Configuration
DB_HOST=your-db-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-secure-password
DB_NAME=alignbox_db

# Authentication
JWT_SECRET=generate-with-openssl-rand-base64-32
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# File Upload Settings
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx

# Redis Configuration
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Optional: Security Headers
SECURE_HEADERS=true
HELMET_ENABLED=true

# Optional: Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Optional: Email (if needed)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@yourdomain.com
```

---

## 🧪 Validating Configuration

### Check if all required variables are set:
```bash
# Create validation script (check-env.js)
const required = [
  'NODE_ENV', 'PORT', 'JWT_SECRET', 
  'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
  'CORS_ORIGIN'
];

required.forEach(key => {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
});

console.log('✓ All required environment variables are set');
```

### Run validation:
```bash
node check-env.js
```

---

## 🔄 Switching Environments

### Switch from Development to Production:
```bash
# Backup current .env
cp .env .env.development

# Load production .env
cp .env.production .env

# Restart application
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📚 Additional Resources

- [12 Factor App](https://12factor.net/config) - Configuration best practices
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Version**: 1.0  
**Last Updated**: December 2024  

**🔒 Remember: Never commit .env to version control!**
