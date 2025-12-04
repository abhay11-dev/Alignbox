# Production Deployment Checklist ✅

Complete checklist before deploying Alignbox to production.

## Pre-Deployment

### Infrastructure
- [ ] Server/Cloud instance provisioned (EC2, Droplet, etc.)
- [ ] Domain name configured and pointing to server
- [ ] DNS records verified (A, AAAA records)
- [ ] Static IP address assigned
- [ ] Firewall configured (ports 80, 443 open)
- [ ] Security groups/rules setup correctly
- [ ] SSH access verified
- [ ] Backup plan in place

### Dependencies
- [ ] Docker installed and running
- [ ] Docker Compose installed and functional
- [ ] Docker images built successfully
- [ ] All dependencies resolved (no missing packages)
- [ ] Node.js version compatible with codebase
- [ ] MySQL 8.0+ available
- [ ] Redis available (if using caching)

### Configuration
- [ ] `.env` file created with production values
- [ ] All required environment variables set
- [ ] Sensitive data not committed to git
- [ ] Database credentials secure
- [ ] JWT_SECRET is 32+ characters
- [ ] CORS_ORIGIN points to domain
- [ ] Log level set appropriately (info/warn)
- [ ] Database backups scheduled
- [ ] Uploads directory has sufficient space

## Database Setup

- [ ] MySQL database created
- [ ] Database user created with limited privileges
- [ ] Initial schema loaded
- [ ] Indexes created for performance
- [ ] Backup script tested
- [ ] Database encryption enabled
- [ ] Connection pooling configured
- [ ] Query logging enabled for debugging

## Application Verification

### Backend
- [ ] All dependencies installed
- [ ] No hardcoded credentials in code
- [ ] Environment variables read correctly
- [ ] Database connection successful
- [ ] Redis connection successful
- [ ] Health check endpoint responding
- [ ] Error handling comprehensive
- [ ] Request validation in place
- [ ] Rate limiting configured
- [ ] CORS properly configured

### Frontend
- [ ] Built successfully with Vite
- [ ] All dependencies resolved
- [ ] API endpoints correctly pointing to backend
- [ ] Socket.IO URL configured correctly
- [ ] No console errors in build
- [ ] Static assets optimized
- [ ] Service worker (if applicable) configured
- [ ] Analytics tracking configured

### Security
- [ ] All dependencies have no critical vulnerabilities
  ```bash
  npm audit
  ```
- [ ] HTTPS/SSL certificate valid
- [ ] Security headers set (CORS, CSP, etc.)
- [ ] Input validation on all endpoints
- [ ] SQL injection protection enabled
- [ ] XSS protection enabled
- [ ] CSRF protection configured
- [ ] Rate limiting active
- [ ] API authentication required
- [ ] File upload restrictions in place
- [ ] Database encryption enabled
- [ ] Password hashing strong (bcrypt)
- [ ] JWT tokens secure

## Deployment

### Before Going Live
- [ ] Full system test on staging environment
- [ ] Load testing performed
- [ ] Failover plan documented
- [ ] Rollback plan prepared
- [ ] Maintenance window scheduled
- [ ] Team notified of deployment time
- [ ] Database backup created
- [ ] Code backup/tag created in git

### Deployment Process
- [ ] Stop running containers: `docker-compose down`
- [ ] Pull latest code: `git pull`
- [ ] Build new images: `docker-compose build`
- [ ] Start services: `docker-compose up -d`
- [ ] Wait for health checks to pass
- [ ] Verify database migrations completed
- [ ] Check application logs for errors
- [ ] Monitor resource usage

### Post-Deployment
- [ ] Access application from browser
- [ ] Test user registration flow
- [ ] Test login functionality
- [ ] Test group creation
- [ ] Test message sending
- [ ] Test file uploads
- [ ] Test Socket.IO real-time updates
- [ ] Verify no console errors
- [ ] Check response times are acceptable
- [ ] Monitor error logs
- [ ] Test on multiple devices/browsers
- [ ] Verify SSL/HTTPS working
- [ ] Test on mobile devices

## Monitoring & Maintenance

### Continuous Monitoring
- [ ] Error tracking setup (Sentry, etc.)
- [ ] Performance monitoring active
- [ ] Uptime monitoring configured
- [ ] Log aggregation setup (ELK, etc.)
- [ ] Database monitoring enabled
- [ ] Memory/CPU alerts configured
- [ ] Disk space alerts configured
- [ ] Email notifications for critical alerts

### Regular Maintenance
- [ ] Database backups daily
- [ ] Upload files backed up
- [ ] Log rotation configured
- [ ] Old logs cleaned up
- [ ] Database maintenance (VACUUM, ANALYZE)
- [ ] Security updates applied monthly
- [ ] Dependency updates reviewed
- [ ] Performance metrics reviewed

## Operational Procedures

### Daily Tasks
- [ ] Monitor application logs
- [ ] Check error rate and response times
- [ ] Verify database is responding
- [ ] Check disk space usage
- [ ] Review security alerts

### Weekly Tasks
- [ ] Review performance metrics
- [ ] Check security patches availability
- [ ] Test backup/restore procedure
- [ ] Review user growth and usage patterns

### Monthly Tasks
- [ ] Review and apply security updates
- [ ] Update dependencies carefully
- [ ] Review and optimize slow queries
- [ ] Analyze application performance
- [ ] Review infrastructure costs
- [ ] Test disaster recovery plan

## Rollback Procedures

- [ ] Git commit hash of previous stable version recorded
- [ ] Database backup from before deployment available
- [ ] Rollback command documented:
  ```bash
  git checkout <previous-commit>
  docker-compose down
  docker-compose build
  docker-compose up -d
  ```
- [ ] Communication plan for rollback situation
- [ ] Timeline to detect issues established (typically <5 minutes)

## Incident Response Plan

### High CPU Usage
1. Check which service is consuming CPU
2. Review logs for errors
3. Restart service if necessary
4. Contact backend team if persists

### Database Connection Errors
1. Verify MySQL is running
2. Check database credentials
3. Verify network connectivity
4. Check database load

### Out of Memory
1. Check container memory limits
2. Monitor memory usage
3. Restart container if needed
4. Increase allocated memory if necessary

### Disk Space Full
1. Check which directory is full
2. Archive/delete old logs
3. Clean temporary files
4. Extend disk space if needed

## Rollback Checklist
- [ ] Previous version database backup available
- [ ] Previous version Docker images available
- [ ] Rollback command tested in staging
- [ ] Communication sent to stakeholders
- [ ] Rollback executed
- [ ] Systems verified working
- [ ] Post-mortem analysis scheduled

## Sign-Off

- **Deployed By**: _______________
- **Deployment Date**: _______________
- **Deployment Time**: _______________
- **Environment**: [ ] Staging [ ] Production
- **Approved By**: _______________
- **Notes**: _______________

---

## Performance Baseline (For Comparison)

After deployment, document baseline metrics:

### API Response Times
- GET /health: ___ ms
- POST /api/auth/login: ___ ms
- POST /api/groups: ___ ms
- GET /api/groups: ___ ms

### System Resources
- Average CPU Usage: ___%
- Average Memory Usage: ___%
- Database Query Time: ___ ms

### User Metrics
- Total Users: ___
- Active Sessions: ___
- Messages Per Day: ___

---

**Last Updated**: [Date]
**Version**: 1.0
