# Fun Friday Chat API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "username",
      "message": "Username must be between 3 and 50 characters"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Access token required",
  "code": "NO_TOKEN"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied: Not a member of this group",
  "code": "NOT_MEMBER"
}
```

### 404 Not Found
```json
{
  "error": "User not found",
  "code": "USER_NOT_FOUND"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "displayName": "John Doe"
}
```

**Validation Rules:**
- `username`: 3-50 characters, alphanumeric and underscores only
- `email`: Valid email format
- `password`: Min 8 characters, must contain uppercase, lowercase, number, and special character
- `displayName`: Optional, 1-100 characters

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "displayName": "John Doe"
  }
}
```

### Login User
**POST** `/auth/login`

Authenticate user and return JWT token.

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "displayName": "John Doe",
    "avatarUrl": null
  }
}
```

### Get Current User
**GET** `/auth/me`

Get current user profile information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "displayName": "John Doe",
    "avatarUrl": null,
    "isOnline": true,
    "lastSeen": "2024-01-01T12:00:00.000Z",
    "createdAt": "2024-01-01T10:00:00.000Z"
  }
}
```

## Group Endpoints

### Get User Groups
**GET** `/groups`

Get all groups the current user is a member of.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Fun Friday Group",
    "description": "Weekly fun activities and events",
    "avatarUrl": null,
    "isPrivate": false,
    "maxMembers": 50,
    "createdBy": 1,
    "role": "admin",
    "joinedAt": "2024-01-01T10:00:00.000Z",
    "memberCount": 5,
    "createdByName": "John Doe",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
]
```

### Create Group
**POST** `/groups`

Create a new group.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "My New Group",
  "description": "Description of the group",
  "isPrivate": false,
  "maxMembers": 50
}
```

**Response:**
```json
{
  "id": 2,
  "name": "My New Group",
  "description": "Description of the group",
  "avatarUrl": null,
  "isPrivate": false,
  "maxMembers": 50,
  "createdBy": 1,
  "createdByName": "John Doe",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

### Get Group Details
**GET** `/groups/:groupId`

Get detailed information about a specific group including members.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "name": "Fun Friday Group",
  "description": "Weekly fun activities and events",
  "avatarUrl": null,
  "isPrivate": false,
  "maxMembers": 50,
  "createdBy": 1,
  "createdByName": "John Doe",
  "memberCount": 5,
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z",
  "members": [
    {
      "id": 1,
      "username": "johndoe",
      "displayName": "John Doe",
      "avatarUrl": null,
      "isOnline": true,
      "role": "admin",
      "joinedAt": "2024-01-01T10:00:00.000Z",
      "canSendMessages": true
    }
  ]
}
```

### Update Group
**PUT** `/groups/:groupId`

Update group information (admin only).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Group Name",
  "description": "Updated description",
  "isPrivate": true,
  "maxMembers": 100
}
```

**Response:**
```json
{
  "message": "Group updated successfully"
}
```

### Delete Group
**DELETE** `/groups/:groupId`

Delete a group (admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Group deleted successfully"
}
```

### Add Member to Group
**POST** `/groups/:groupId/members`

Add a user to the group (admin only).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "userId": 2,
  "role": "member"
}
```

**Response:**
```json
{
  "message": "Member added successfully"
}
```

### Remove Member from Group
**DELETE** `/groups/:groupId/members/:userId`

Remove a user from the group (admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Member removed successfully"
}
```

### Leave Group
**POST** `/groups/:groupId/leave`

Leave a group (cannot be group creator).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Left group successfully"
}
```

## Message Endpoints

### Send Message
**POST** `/messages/:groupId`

Send a message to a group.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Hello everyone!",
  "isAnonymous": false,
  "replyTo": null,
  "messageType": "text"
}
```

**Response:**
```json
{
  "id": 1,
  "groupId": 1,
  "userId": 1,
  "content": "Hello everyone!",
  "messageType": "text",
  "fileUrl": null,
  "fileName": null,
  "fileSize": null,
  "isAnonymous": false,
  "replyTo": null,
  "isEdited": false,
  "isDeleted": false,
  "username": "johndoe",
  "displayName": "John Doe",
  "avatarUrl": null,
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

### Get Group Messages
**GET** `/messages/:groupId`

Get messages from a group with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Number of messages to return (default: 50)
- `offset` (optional): Number of messages to skip (default: 0)
- `before` (optional): Get messages before this timestamp

**Response:**
```json
[
  {
    "id": 1,
    "groupId": 1,
    "userId": 1,
    "content": "Hello everyone!",
    "messageType": "text",
    "fileUrl": null,
    "fileName": null,
    "fileSize": null,
    "isAnonymous": false,
    "replyTo": null,
    "isEdited": false,
    "isDeleted": false,
    "username": "johndoe",
    "displayName": "John Doe",
    "avatarUrl": null,
    "replyContent": null,
    "replyToName": null,
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z",
    "statuses": [
      {
        "userId": 1,
        "status": "read",
        "timestamp": "2024-01-01T12:01:00.000Z"
      }
    ]
  }
]
```

### Edit Message
**PUT** `/messages/:groupId/:messageId`

Edit a message (owner or admin only).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "content": "Updated message content"
}
```

**Response:**
```json
{
  "id": 1,
  "groupId": 1,
  "userId": 1,
  "content": "Updated message content",
  "messageType": "text",
  "fileUrl": null,
  "fileName": null,
  "fileSize": null,
  "isAnonymous": false,
  "replyTo": null,
  "isEdited": true,
  "isDeleted": false,
  "username": "johndoe",
  "displayName": "John Doe",
  "avatarUrl": null,
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:05:00.000Z"
}
```

### Delete Message
**DELETE** `/messages/:groupId/:messageId`

Delete a message (owner or admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Message deleted successfully"
}
```

### Mark Message as Read
**POST** `/messages/:groupId/:messageId/read`

Mark a message as read.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Message marked as read"
}
```

### Get Message Status
**GET** `/messages/:groupId/:messageId/status`

Get read status for a message.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "messageId": 1,
    "userId": 1,
    "status": "read",
    "timestamp": "2024-01-01T12:01:00.000Z",
    "username": "johndoe",
    "displayName": "John Doe"
  }
]
```

## User Endpoints

### Get User Profile
**GET** `/users/profile`

Get current user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "displayName": "John Doe",
    "avatarUrl": null,
    "isOnline": true,
    "lastSeen": "2024-01-01T12:00:00.000Z",
    "createdAt": "2024-01-01T10:00:00.000Z"
  }
}
```

### Update User Profile
**PUT** `/users/profile`

Update current user's profile.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "displayName": "John Updated",
  "email": "john.updated@example.com"
}
```

**Response:**
```json
{
  "message": "Profile updated successfully"
}
```

### Change Password
**PUT** `/users/password`

Change user's password.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Response:**
```json
{
  "message": "Password changed successfully"
}
```

### Search Users
**GET** `/users/search`

Search for users by username or display name.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `q`: Search query (minimum 2 characters)
- `limit` (optional): Maximum results (default: 20)

**Response:**
```json
[
  {
    "id": 2,
    "username": "janesmith",
    "displayName": "Jane Smith",
    "avatarUrl": null,
    "isOnline": true
  }
]
```

## File Upload Endpoints

### Upload File
**POST** `/upload`

Upload a file.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:**
```
file: <file>
```

**Response:**
```json
{
  "message": "File uploaded successfully",
  "file": {
    "id": 1,
    "originalName": "document.pdf",
    "filename": "file-1234567890.pdf",
    "mimetype": "application/pdf",
    "size": 1024000,
    "url": "/uploads/file-1234567890.pdf",
    "uploadedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### Get User Files
**GET** `/upload`

Get current user's uploaded files.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` (optional): Maximum results (default: 20)
- `offset` (optional): Number of files to skip (default: 0)

**Response:**
```json
[
  {
    "id": 1,
    "originalName": "document.pdf",
    "filename": "file-1234567890.pdf",
    "mimetype": "application/pdf",
    "size": 1024000,
    "path": "/app/uploads/file-1234567890.pdf",
    "url": "/uploads/file-1234567890.pdf",
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
]
```

### Delete File
**DELETE** `/upload/:fileId`

Delete an uploaded file.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "File deleted successfully"
}
```

## WebSocket Events

### Client to Server Events

#### Join Group
```javascript
socket.emit('join_group', { groupId: 1 });
```

#### Leave Group
```javascript
socket.emit('leave_group', { groupId: 1 });
```

#### Start Typing
```javascript
socket.emit('typing_start', { groupId: 1 });
```

#### Stop Typing
```javascript
socket.emit('typing_stop', { groupId: 1 });
```

#### Mark Message as Read
```javascript
socket.emit('message_read', { messageId: 1, groupId: 1 });
```

#### Mark Message as Delivered
```javascript
socket.emit('message_delivered', { messageId: 1, groupId: 1 });
```

#### Ping
```javascript
socket.emit('ping');
```

### Server to Client Events

#### New Message
```javascript
socket.on('new_message', (message) => {
  console.log('New message:', message);
});
```

#### Message Updated
```javascript
socket.on('message_updated', (message) => {
  console.log('Message updated:', message);
});
```

#### Message Deleted
```javascript
socket.on('message_deleted', (data) => {
  console.log('Message deleted:', data);
});
```

#### User Typing
```javascript
socket.on('user_typing', (data) => {
  console.log('User typing:', data);
});
```

#### User Stop Typing
```javascript
socket.on('user_stop_typing', (data) => {
  console.log('User stopped typing:', data);
});
```

#### Message Status Update
```javascript
socket.on('message_status_update', (data) => {
  console.log('Message status update:', data);
});
```

#### User Joined Group
```javascript
socket.on('user_joined_group', (data) => {
  console.log('User joined group:', data);
});
```

#### User Left Group
```javascript
socket.on('user_left_group', (data) => {
  console.log('User left group:', data);
});
```

#### User Disconnected
```javascript
socket.on('user_disconnected', (data) => {
  console.log('User disconnected:', data);
});
```

#### Pong
```javascript
socket.on('pong', () => {
  console.log('Pong received');
});
```

#### Error
```javascript
socket.on('error', (error) => {
  console.error('Socket error:', error);
});
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: 5 requests per 15 minutes per IP
- **File Upload**: 10 requests per minute per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Pagination

Many endpoints support pagination using `limit` and `offset` parameters:

- `limit`: Maximum number of items to return
- `offset`: Number of items to skip

Example:
```
GET /api/messages/1?limit=20&offset=40
```

## File Upload Limits

- **Maximum file size**: 10MB
- **Allowed file types**: 
  - Images: JPEG, PNG, GIF, WebP
  - Documents: PDF, DOC, DOCX
  - Text: TXT
- **Maximum files per request**: 1 (single upload), 5 (multiple upload)

## WebSocket Connection

Connect to WebSocket with authentication:
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

## Health Check

**GET** `/health`

Check application health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```
