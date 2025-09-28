# Fun Friday Chat App 🎉

A modern, real-time chat application with anonymous messaging capabilities, built with Node.js, Express, Socket.IO, and MySQL. Perfect for team communication, fun activities, and anonymous discussions.

## ✨ Features

### Core Features
- **Real-time Messaging**: Instant message delivery using Socket.IO
- **Anonymous Messaging**: Toggle anonymous mode for private discussions
- **Group Management**: Create, join, and manage multiple chat groups
- **User Authentication**: Secure JWT-based authentication system
- **File Uploads**: Share images, documents, and other files
- **Message Status**: Read receipts and delivery confirmations
- **Typing Indicators**: See when someone is typing
- **Online Status**: Track who's currently online

### Advanced Features
- **Role-based Access**: Admin, moderator, and member roles
- **Message Editing**: Edit messages within 24 hours
- **Message Deletion**: Soft delete with admin override
- **Rate Limiting**: Prevent spam and abuse
- **Input Validation**: Comprehensive data validation
- **Security Headers**: Protection against common attacks
- **Logging**: Detailed application logging
- **Health Checks**: Monitor application status

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- MySQL 8.0+
- Redis (optional, for caching)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/fun-friday-chat.git
   cd fun-friday-chat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Set up the database**
   ```bash
   npm run db:setup
   ```

5. **Start the application**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

### Demo Credentials
- **Username**: `john_doe` | **Password**: `password123`
- **Username**: `abhay_shukla` | **Password**: `password123`
- **Username**: `anonymous1` | **Password**: `password123`

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

1. **Clone and navigate to the project**
   ```bash
   git clone https://github.com/yourusername/fun-friday-chat.git
   cd fun-friday-chat
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your production configuration
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   Open your browser and navigate to `http://localhost`

### Using Docker

1. **Build the image**
   ```bash
   docker build -t fun-friday-chat .
   ```

2. **Run the container**
   ```bash
   docker run -p 3000:3000 \
     -e DB_HOST=your-mysql-host \
     -e DB_USER=your-username \
     -e DB_PASSWORD=your-password \
     -e JWT_SECRET=your-jwt-secret \
     fun-friday-chat
   ```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "displayName": "John Doe"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "johndoe",
  "password": "SecurePassword123!"
}
```

### Group Endpoints

#### Get User Groups
```http
GET /api/groups
Authorization: Bearer <token>
```

#### Create Group
```http
POST /api/groups
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Group",
  "description": "Group description",
  "isPrivate": false,
  "maxMembers": 50
}
```

#### Get Group Details
```http
GET /api/groups/:groupId
Authorization: Bearer <token>
```

### Message Endpoints

#### Send Message
```http
POST /api/messages/:groupId
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Hello everyone!",
  "isAnonymous": false
}
```

#### Get Group Messages
```http
GET /api/messages/:groupId?limit=50&offset=0
Authorization: Bearer <token>
```

#### Edit Message
```http
PUT /api/messages/:groupId/:messageId
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Updated message content"
}
```

### File Upload

#### Upload File
```http
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `DB_HOST` | MySQL host | `localhost` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | - |
| `DB_NAME` | Database name | `chat_app` |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRES_IN` | JWT expiration | `24h` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `MAX_FILE_SIZE` | Max upload size | `10485760` (10MB) |
| `RATE_LIMIT_MAX_REQUESTS` | Rate limit | `100` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15min) |

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Coverage
The project maintains high test coverage with:
- Unit tests for all API endpoints
- Integration tests for database operations
- Socket.IO event testing
- Authentication flow testing

## 🚀 Deployment

### Production Checklist

- [ ] Set strong JWT secret
- [ ] Configure secure database credentials
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline
- [ ] Configure rate limiting
- [ ] Set up health checks

### Environment-Specific Configurations

#### Development
```bash
NODE_ENV=development
LOG_LEVEL=debug
```

#### Production
```bash
NODE_ENV=production
LOG_LEVEL=info
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with configurable rounds
- **Input Validation**: Comprehensive validation using express-validator
- **Rate Limiting**: Prevent abuse and spam
- **Security Headers**: Helmet.js for security headers
- **CORS Configuration**: Controlled cross-origin requests
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization and output encoding

## 📊 Monitoring

### Health Check
```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

### Logging
- Application logs: `logs/combined.log`
- Error logs: `logs/error.log`
- HTTP request logs via Morgan

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow ESLint configuration
- Write tests for new features
- Update documentation
- Follow conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/) - Web framework
- [Socket.IO](https://socket.io/) - Real-time communication
- [MySQL](https://www.mysql.com/) - Database
- [JWT](https://jwt.io/) - Authentication
- [Winston](https://github.com/winstonjs/winston) - Logging

## 📞 Support

For support, email support@funfridaychat.com or join our Discord server.

## 🔄 Changelog

### v1.0.0
- Initial release
- Real-time messaging
- Anonymous messaging
- Group management
- File uploads
- User authentication
- Message editing/deletion
- Comprehensive testing
- Docker support
- CI/CD pipeline

---

Made with ❤️ by the Fun Friday Team
