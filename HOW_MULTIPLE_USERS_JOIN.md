# How Multiple People Join & Chat in the Same Group

## Architecture Overview

The Alignbox chat app uses a **database-driven group system** with **WebSocket real-time messaging**. Here's how it works:

---

## 1. **Database Structure** (Backend)

### Groups Table
```
groups
├── id (primary key)
├── name (group name)
├── description
├── created_by (user_id of creator)
├── max_members (capacity limit)
├── created_at
└── updated_at
```

### Group Members Table (Junction Table)
```
group_members
├── id
├── group_id (FK → groups.id)
├── user_id (FK → users.id)
├── role ('admin', 'moderator', 'member')
├── can_send_messages (boolean)
└── joined_at
```

### Messages Table
```
messages
├── id
├── group_id (FK → groups.id)
├── user_id (FK → users.id, can be NULL for anonymous)
├── content
├── is_anonymous
├── created_at
└── (other fields: is_edited, is_deleted, etc.)
```

---

## 2. **How People Join a Group**

### **Method 1: Create a New Group**
When you create a group on the Dashboard:
1. A new row is inserted into `groups` table
2. You are **automatically added as `admin`** to `group_members`

**API:** `POST /api/groups`
```json
{
  "name": "Fun Friday",
  "description": "Weekly team hangout",
  "isPrivate": false,
  "maxMembers": 50
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Fun Friday",
  "created_by": 123,
  "members": [
    { "id": 123, "username": "john_doe", "role": "admin" }
  ]
}
```

### **Method 2: Admin Invites Users**
The **group admin** can invite existing users:

**UI Flow:**
1. Go to Chat → click **👥** (Members button)
2. Click **+ Invite Members**
3. Search for users by name
4. Select multiple users → Click "Add Members"

**API:** `POST /api/groups/:groupId/members`
```json
{
  "userId": 456
}
```

**Backend Logic:**
- Checks if user is group admin
- Checks if user isn't already a member
- Checks if group capacity allows new member
- Inserts new row into `group_members` with role='member'

---

## 3. **Real-Time Messaging with Socket.IO**

Once multiple users are in the same group, they can chat in real-time:

### **Connection Flow**

1. **User joins group chat page:**
   ```javascript
   // Front-end (Chat.jsx)
   const socket = ioClient('http://localhost:3000', {
     auth: { token: `Bearer ${token}` }
   })
   
   socket.on('connect', () => {
     socket.emit('join_group', { groupId: 1 })
   })
   ```

2. **Backend listens for join:**
   ```javascript
   // Back-end (socket/handlers.js)
   socket.on('join_group', (data) => {
     socket.join(`group_${data.groupId}`)
     // Broadcast: "User X joined the group"
   })
   ```

3. **Socket.IO Rooms:**
   - Each group has a **Socket.IO room** named `group_{groupId}`
   - All connected users in that group are subscribed to the room
   - When one user sends a message, it's **broadcast to all users in the room**

### **Message Flow**

1. **User A types and sends a message:**
   ```javascript
   await api.sendMessage(token, groupId, { content: "Hello!", isAnonymous: false })
   ```

2. **Backend processes:**
   - Validates user is group member
   - Inserts message into `messages` table
   - Emits `new_message` event to all users in `group_{groupId}` room
   ```javascript
   io.to(`group_${groupId}`).emit('new_message', {
     id: 42,
     group_id: 1,
     user_id: 123,
     content: "Hello!",
     username: "john_doe",
     created_at: "2025-12-03T10:00:00Z"
   })
   ```

3. **User B (and all others in the group) receive message instantly:**
   ```javascript
   socket.on('new_message', (msg) => {
     setMessages(prev => [...prev, msg])
     // Message appears on screen immediately
   })
   ```

---

## 4. **Member Management** (NEW!)

### **View Members**
Click the **👥** button in the Chat sidebar to go to `/group/:groupId/members`

**Shows:**
- List of all group members with avatars
- Role badges (Admin, Moderator, Member)
- Online/offline status
- "Remove" button (if you're the admin)

**API:** `GET /api/groups/:groupId` (includes `members` array)

### **Add Members**
1. Click **+ Invite Members**
2. Search for users (requires 2+ characters)
3. Select users → Click **Add**

**API:** `POST /api/groups/:groupId/members`

### **Remove Members**
Only the group admin can remove members (except themselves):

**API:** `DELETE /api/groups/:groupId/members/:userId`

---

## 5. **Data Flow Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                         │
│                                                             │
│  Dashboard.jsx        Chat.jsx      GroupMembers.jsx       │
│  ├─ List groups     ├─ Show messages  ├─ List members      │
│  ├─ Create group    ├─ Send msg (HTTP) ├─ Add members      │
│  └─ Join group      └─ Listen (WebSocket) └─ Remove members│
└─────────┬───────────────────────┬──────────────┬───────────┘
          │ HTTP (REST API)       │              │
          │ /api/*                │ WebSocket    │
          │                       │ Socket.IO    │
┌─────────▼─────────────────────▼──────────────▼───────────────┐
│                    Backend (Node.js)                         │
│                                                             │
│  routes/        socket/         config/                     │
│  ├─ groups.js   └─ handlers.js   └─ database.js            │
│  ├─ messages.js                                            │
│  ├─ users.js                                               │
│  └─ auth.js                                                │
└─────────────────────────┬──────────────────────────────────┘
                          │ SQL Queries
                          │
┌─────────────────────────▼──────────────────────────────────┐
│              MySQL Database                               │
│                                                            │
│  users ↔ group_members ← groups                           │
│   ├─ id                  ├─ group_id    ├─ id             │
│   ├─ username            ├─ user_id     ├─ name           │
│   ├─ email               ├─ role        └─ created_by     │
│   └─ is_online           └─ joined_at                     │
│                                                            │
│  messages                                                  │
│  ├─ id                                                     │
│  ├─ group_id                                              │
│  ├─ user_id                                               │
│  ├─ content                                               │
│  └─ created_at                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 6. **Example: Two Users Chat**

### **Scenario: Alice & Bob in "Fun Friday" group**

**Setup:**
- Alice creates group "Fun Friday" → becomes **admin**
- Alice invites Bob → Bob is **member**
- Both are now in `group_members` for group_id=1

**Chat Flow:**

1. **Alice opens chat** (localhost:5173/group/1)
   - Fetches messages from DB
   - Connects to Socket.IO room `group_1`

2. **Bob opens chat** (localhost:5173/group/1)
   - Fetches same messages
   - Connects to Socket.IO room `group_1`

3. **Alice types "Hi Bob!" and sends**
   - Backend inserts message into DB
   - Broadcasts `new_message` event to `group_1`
   - **Both Alice and Bob see the message instantly**

4. **Bob replies "Hi Alice!"**
   - Same process
   - **Both see the new message instantly**

5. **Alice refreshes the page**
   - Messages are fetched from DB (persisted)
   - Alice & Bob still in group, see full history

---

## 7. **Current Features vs. In Progress**

### ✅ **Already Built**
- User registration & login
- Create groups
- Send messages in real-time (Socket.IO)
- View group members
- Admin can invite users
- Admin can remove users
- Messages persist in DB
- Online status tracking

### 🚧 **Not Yet Built**
- [ ] Public/private groups
- [ ] Search messages or users within a group
- [ ] Edit/delete your own messages
- [ ] Anonymous mode toggle
- [ ] File/image uploads
- [ ] Typing indicators ("User is typing...")
- [ ] Read receipts (checkmarks)
- [ ] User profiles & avatars
- [ ] Member role changes (admin → moderator, etc.)

---

## 8. **How to Test Multiple Users Locally**

### **Option A: Two Browser Tabs**
1. Open `http://localhost:5173` in Tab 1
2. Open `http://localhost:5173` in Tab 2 (incognito/different browser is better)
3. Login with different accounts (e.g., `john_doe` in Tab 1, `abhay_shukla` in Tab 2)
4. One user creates a group, the other joins
5. Both can chat in real-time!

### **Option B: Two Machines**
1. Start backend on your machine (http://localhost:3000)
2. Start frontend on your machine (http://localhost:5173)
3. Give a friend the IP (e.g., http://YOUR_IP:5173)
4. Both login, create group, chat!

### **Option C: Docker (Production-like)**
```bash
docker-compose up -d
# Access: http://localhost (no port 3000 or 5173 exposed)
```

---

## 9. **Code Highlights**

### **Adding a Member (Frontend)**
```javascript
// GroupMembers.jsx
const addMembers = async () => {
  for (const userId of selectedUsers) {
    await api.addGroupMember(token, groupId, userId)
  }
  // Refresh members list
  const updated = await api.getGroupDetails(token, groupId)
  setMembers(updated.members || [])
}
```

### **Adding a Member (Backend)**
```javascript
// routes/groups.js
router.post('/:groupId/members', checkGroupMembership, checkGroupAdmin, asyncHandler(async (req, res) => {
  const { userId } = req.body
  
  // Check if already member
  const [existing] = await pool.execute(
    'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, userId]
  )
  if (existing.length > 0) return res.status(409).json({ error: 'Already a member' })
  
  // Add member
  await pool.execute(
    'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
    [groupId, userId, 'member']
  )
  
  res.status(201).json({ message: 'Member added successfully' })
}))
```

### **Broadcasting New Message (Socket.IO)**
```javascript
// routes/messages.js
const io = req.app.get('io')
io.to(`group_${groupId}`).emit('new_message', message)

// Frontend (Chat.jsx)
socket.on('new_message', (msg) => {
  setMessages(prev => [...prev, msg])
})
```

---

## Summary

**Multiple people chat in the same group by:**

1. **One person creates a group** → they become admin
2. **Admin invites other users** → they're added to `group_members` table
3. **All members open the same group** → they connect to the same Socket.IO room
4. **When anyone sends a message** → it's broadcast to all in the room **instantly**
5. **Messages are saved to DB** → persist even after page refresh or server restart

This is a **scalable, real-time, persistent** group chat architecture! 🚀
