# Chat App - WhatsApp Web Clone

A real-time chat application built with React and Spring Boot, featuring WebSocket support for instant messaging.

## Features

✨ **Real-Time Messaging** - Instant message delivery using WebSocket (Socket.IO)
👥 **User Accounts** - Secure authentication with JWT tokens
🔐 **Secure** - Password encryption and token-based authentication
💬 **Direct Chat** - One-on-one conversations
👫 **Group Chat** - Create and manage group conversations
📱 **Responsive UI** - Mobile-friendly interface with Material-UI
🔄 **Live Updates** - Real-time status updates and message notifications

## Tech Stack

### Frontend
- **React 18** - UI library
- **Redux** - State management
- **Material-UI (MUI)** - Component library
- **Tailwind CSS** - Styling
- **Socket.IO** - WebSocket communication
- **React Router** - Navigation

### Backend
- **Spring Boot 3.0.5** - Java framework
- **Spring Security** - Authentication & Authorization
- **JWT (JSON Web Tokens)** - Token-based authentication
- **Spring Data JPA** - ORM framework
- **MySQL** - Database
- **WebSocket** - Real-time communication

## Getting Started

### Quick Start (5 minutes)
Follow the [QUICK_START.md](QUICK_START.md) guide to get the app running locally in minutes.

### Prerequisites
- Java 17+
- Node.js 16+
- MySQL 8.0+
- Maven 3.8+

## Setup Instructions

### 1. Database Setup
```bash
mysql -u root -p
CREATE DATABASE whatsapp;
CREATE USER 'chat_user'@'localhost' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON whatsapp.* TO 'chat_user'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Backend Setup
```bash
cd Backend
cp .env.example .env
# Edit .env with your database credentials
mvn clean package -DskipTests
mvn spring-boot:run
```
Backend runs on: `http://localhost:5454`

### 3. Frontend Setup
```bash
cd FrontEnd/client
npm install
cp .env.example .env.local
npm start
```
Frontend opens at: `http://localhost:3000`

## Documentation

- **[QUICK_START.md](QUICK_START.md)** - Get running in 5 minutes
- **[ENV_CONFIGURATION.md](ENV_CONFIGURATION.md)** - All environment variables explained
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide (Docker, AWS, etc.)
- **[.gitignore files](.gitignore)** - Files that should NOT be committed

## Project Structure

```
Chat_app/
├── Backend/                    # Spring Boot API
│   ├── src/main/java/         # Java source code
│   ├── src/main/resources/    # Configuration files
│   │   ├── application.properties      # Dev config
│   │   └── application-prod.properties # Prod config
│   ├── .env.example           # Environment variables template
│   ├── pom.xml               # Maven dependencies
│   └── mvnw                  # Maven wrapper
├── FrontEnd/
│   └── client/               # React application
│       ├── src/              # React components
│       ├── public/           # Static files
│       ├── .env.example      # Environment variables template
│       ├── package.json      # Node dependencies
│       └── tailwind.config.js # Tailwind CSS config
├── README.md                 # This file
├── QUICK_START.md           # Quick start guide
├── ENV_CONFIGURATION.md     # Environment configuration guide
└── DEPLOYMENT.md            # Deployment instructions
```

## Environment Configuration

### Backend Environment Variables (.env)
```env
SPRING_APPLICATION_NAME=Web
SERVER_PORT=5454
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/whatsapp
SPRING_DATASOURCE_USERNAME=chat_user
SPRING_DATASOURCE_PASSWORD=your_password
JWT_SECRET_KEY=generate_a_strong_32_char_key
SPRING_PROFILES_ACTIVE=dev
```

### Frontend Environment Variables (.env.local)
```env
REACT_APP_API_BASE_URL=http://localhost:5454
REACT_APP_ENV=development
```

For detailed configuration options, see [ENV_CONFIGURATION.md](ENV_CONFIGURATION.md).

## Common Commands

### Backend
```bash
mvn clean package         # Build backend
mvn spring-boot:run      # Run backend
mvn test                 # Run tests
```

### Frontend
```bash
npm install              # Install dependencies
npm start               # Development server
npm build               # Production build
npm test                # Run tests
```

## Authentication

The app uses **JWT (JSON Web Tokens)** for authentication:

1. **Sign Up** - Create a new account with email and password
2. **Sign In** - Login with credentials to receive JWT token
3. **Token Storage** - Token is stored in browser (localStorage/Redux)
4. **API Requests** - Token is sent in `Authorization: Bearer <token>` header
5. **Token Expiration** - Tokens expire after 24 hours (configurable)

## WebSocket Communication

Real-time messaging is powered by WebSocket using Socket.IO:
- **Connection** - Established when user logs in
- **Events** - Message send/receive, typing indicators, online status
- **Rooms** - Chat rooms for group conversations
- **Fallback** - Automatic fallback to polling if WebSocket unavailable

## Security Features

🔒 **Password Encryption** - Bcrypt password hashing
🔐 **JWT Tokens** - Secure token-based authentication
🛡️ **CORS Protection** - Cross-origin request validation
✅ **Input Validation** - Request validation on backend
🚫 **XSS Protection** - React automatic escaping

## Deployment

For complete deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

### Quick Deployment Options:
1. **Manual Server** - Ubuntu/Linux with Nginx
2. **Docker** - Containerized deployment with docker-compose
3. **Cloud** - AWS Elastic Beanstalk, GCP App Engine, Azure App Service
4. **Serverless** - AWS Lambda, Google Cloud Functions (requires refactoring)

### Production Checklist:
- [ ] Change all default passwords
- [ ] Generate strong JWT secret key
- [ ] Use HTTPS/SSL certificates
- [ ] Configure proper CORS
- [ ] Set up database backups
- [ ] Enable monitoring and logging
- [ ] Configure firewall rules

## File Exclusions

Files that should **NOT** be pushed to GitHub:

### Sensitive Files
- `.env` files (commit `.env.example` instead)
- Credentials and API keys
- Database files (*.db, *.sqlite)

### Build Artifacts
- Backend: `target/`, `build/`, `.mvn/wrapper/`
- Frontend: `node_modules/`, `build/`, `.pnp`, `/coverage`

### IDE/OS Files
- `.idea/` (IntelliJ)
- `.vscode/` (VS Code)
- `.DS_Store` (macOS)
- `Thumbs.db` (Windows)

### Logs and Cache
- `*.log` files
- `.gradle/`, `.pytest_cache/`

See [.gitignore](.gitignore) files for complete list.

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/signin` - Login and get JWT token

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile

### Chats
- `POST /api/chats` - Create new chat
- `GET /api/chats` - Get all user chats
- `GET /api/chats/:id` - Get chat details
- `POST /api/chats/:id/group` - Create group chat

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/:chatId` - Get chat messages
- `DELETE /api/messages/:id` - Delete message

For complete API documentation, see the Backend code documentation.

## Troubleshooting

### Backend Issues
- **Port 5454 in use** - Kill the process: `lsof -i :5454`
- **Database connection error** - Check MySQL is running and credentials are correct
- **JWT secret too short** - Generate 32+ character secret: `openssl rand -base64 32`

### Frontend Issues
- **Cannot connect to backend** - Check `REACT_APP_API_BASE_URL` in `.env.local`
- **Blank page** - Check browser console for errors (F12)
- **CORS errors** - Backend CORS configuration might need updating

### General Issues
- **Port already in use** - Change `SERVER_PORT` in backend `.env`
- **npm install fails** - Delete `node_modules` and `package-lock.json`, retry
- **mvn build fails** - Run `mvn clean`, ensure Java 17+ is installed

## Contributing

Contributions are welcome! Feel free to:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Improvement Ideas

- [ ] End-to-end encryption
- [ ] Message reactions/emojis
- [ ] Voice and video calls
- [ ] Message search
- [ ] User blocking/muting
- [ ] Message notifications
- [ ] Dark mode
- [ ] Message timestamps and read receipts
- [ ] User profile pictures
- [ ] File/image sharing

## License

This project is open source and available under the MIT License.

## Support

If you encounter issues:
1. Check [QUICK_START.md](QUICK_START.md)
2. Review [ENV_CONFIGURATION.md](ENV_CONFIGURATION.md)
3. Read [DEPLOYMENT.md](DEPLOYMENT.md)
4. Check GitHub issues
5. Feel free to suggest improvements!

---

**Happy Coding!** 🚀

*This is a learning project - Contributions and suggestions are welcome!*
👍👍
