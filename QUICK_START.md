# Quick Start Guide

Get the Chat App running in 5 minutes!

## Prerequisites
- Java 17+
- Node.js 16+
- MySQL 8.0+
- Maven 3.8+

## Step 1: Setup Database

```bash
# Connect to MySQL
mysql -u root -p

# In MySQL prompt:
CREATE DATABASE whatsapp;
CREATE USER 'chat_user'@'localhost' IDENTIFIED BY 'chat_password_123';
GRANT ALL PRIVILEGES ON whatsapp.* TO 'chat_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Step 2: Setup Backend

```bash
cd Backend

# Create environment file
cp .env.example .env

# Edit .env with your database credentials
# Default values should work for local development

# Build the project
mvn clean package -DskipTests

# Run the backend
mvn spring-boot:run
```

Backend will be running at: **http://localhost:5454**

## Step 3: Setup Frontend

```bash
cd FrontEnd/client

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Start the development server
npm start
```

Frontend will open at: **http://localhost:3000**

## Step 4: Test the App

1. Open **http://localhost:3000** in your browser
2. Click "Sign Up" to create a new account
3. Create another account in a different browser tab/incognito
4. Start chatting between the two accounts!

## Troubleshooting

### Backend won't start
```bash
# Check if port 5454 is already in use
lsof -i :5454

# Test database connection
mysql -u chat_user -p -h localhost whatsapp
```

### Frontend won't connect to backend
- Check if backend is running: `http://localhost:5454`
- Check `REACT_APP_API_BASE_URL` in `FrontEnd/client/.env.local`
- Check browser console for errors (F12)

### Database connection error
- Verify MySQL is running
- Check credentials in `Backend/.env`
- Ensure database `whatsapp` exists

## What's Next?

- Read [ENV_CONFIGURATION.md](ENV_CONFIGURATION.md) for detailed configuration options
- Read [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment instructions
- Check [.gitignore files](.gitignore) for what's excluded from git

## Project Structure

```
Chat_app/
├── Backend/          # Spring Boot API
│   ├── src/
│   ├── pom.xml
│   └── .env.example
├── FrontEnd/client/  # React App
│   ├── src/
│   ├── package.json
│   └── .env.example
├── DEPLOYMENT.md     # Production deployment guide
└── ENV_CONFIGURATION.md  # Environment variables guide
```

## Tips

💡 **Development Tip**: Keep two terminal windows open:
- Terminal 1: `cd Backend && mvn spring-boot:run`
- Terminal 2: `cd FrontEnd/client && npm start`

🔒 **Security Note**: Never commit `.env` files with real credentials. Use `.env.example` as template.

## Common Commands

```bash
# Backend
mvn clean package          # Build backend
mvn spring-boot:run       # Run backend
mvn test                  # Run tests

# Frontend
npm install               # Install dependencies
npm start                 # Development server
npm build                 # Production build
npm test                  # Run tests
```

---

**Happy Coding!** 🚀
