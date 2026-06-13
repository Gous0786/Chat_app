# Chat App - Deployment Guide

This document provides step-by-step instructions for deploying the Chat Application (Backend + Frontend).

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Database Setup](#database-setup)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Java 17** or higher - [Download](https://www.oracle.com/java/technologies/downloads/)
- **Node.js 16+** and npm - [Download](https://nodejs.org/)
- **MySQL 8.0+** - [Download](https://dev.mysql.com/downloads/mysql/)
- **Maven 3.8+** (for Backend) - [Download](https://maven.apache.org/download.cgi)
- **Git** - [Download](https://git-scm.com/)

### Verify Installation
```bash
# Check Java version
java -version

# Check Node and npm
node --version
npm --version

# Check Maven
mvn --version

# Check MySQL
mysql --version
```

---

## Environment Setup

### 1. Backend Environment Configuration

Create a `.env` file in the `Backend/` directory:

```bash
cd Backend
cp .env.example .env
```

Edit `Backend/.env` with your actual values:

```env
# Server Configuration
SPRING_APPLICATION_NAME=Web
SERVER_PORT=5454

# Database Configuration (IMPORTANT: Change these for production)
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/whatsapp
SPRING_DATASOURCE_USERNAME=your_db_username
SPRING_DATASOURCE_PASSWORD=your_secure_db_password

# JWT Secret Key (IMPORTANT: Generate a strong secure key)
JWT_SECRET_KEY=generate_a_strong_random_key_at_least_32_characters_long

# Hibernate Configuration
SPRING_JPA_HIBERNATE_DDL_AUTO=update  # Use 'validate' in production
SPRING_JPA_SHOW_SQL=false

# Environment
SPRING_PROFILES_ACTIVE=prod
```

### 2. Frontend Environment Configuration

Create a `.env` file in the `FrontEnd/client/` directory:

```bash
cd FrontEnd/client
cp .env.example .env.local
```

Edit `FrontEnd/client/.env.local` with your backend URL:

```env
REACT_APP_API_BASE_URL=http://your_backend_url:5454
REACT_APP_ENV=production
```

### 3. Update Backend Configuration File

The backend also uses `src/main/resources/application.properties`. You can either:

**Option A**: Keep using environment variables (recommended for Docker/Cloud deployments)

**Option B**: Update `application.properties` directly:
```properties
spring.application.name=Web
server.port=5454
spring.datasource.url=jdbc:mysql://your_db_host:3306/whatsapp
spring.datasource.username=your_username
spring.datasource.password=your_password
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
```

---

## Database Setup

### 1. Create MySQL Database

```bash
# Connect to MySQL
mysql -u root -p

# Create database and user
CREATE DATABASE whatsapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'chat_user'@'localhost' IDENTIFIED BY 'strong_password_123';
GRANT ALL PRIVILEGES ON whatsapp.* TO 'chat_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 2. Verify Database Connection

```bash
mysql -u chat_user -p whatsapp
SHOW TABLES;
```

The tables will be created automatically when you first run the application (due to `spring.jpa.hibernate.ddl-auto=update`).

---

## Backend Deployment

### 1. Build the Backend

```bash
cd Backend

# Clean previous builds
mvn clean

# Build the project
mvn package -DskipTests

# Output: target/Web-0.0.1-SNAPSHOT.jar
```

### 2. Run the Backend (Development)

```bash
cd Backend

# Option 1: Using Maven
mvn spring-boot:run

# Option 2: Using Java directly
java -jar target/Web-0.0.1-SNAPSHOT.jar
```

The application will start on `http://localhost:5454`

### 3. Verify Backend is Running

```bash
# Check if port 5454 is listening
curl http://localhost:5454/

# Or test an API endpoint
curl http://localhost:5454/api/home/
```

---

## Frontend Deployment

### 1. Install Dependencies

```bash
cd FrontEnd/client

# Install npm packages
npm install
```

### 2. Build the Frontend (Production)

```bash
npm run build

# Output: build/ directory
```

### 3. Run Frontend (Development)

```bash
npm start

# Application will open at http://localhost:3000
```

### 4. Verify Frontend is Working

- Navigate to `http://localhost:3000` in your browser
- The app should load and connect to the backend API

---

## Production Deployment

### Option 1: Manual Server Deployment (Ubuntu/Linux)

#### Backend Setup

```bash
# 1. SSH into your server
ssh user@your_server_ip

# 2. Install Java and MySQL
sudo apt update
sudo apt install openjdk-17-jdk mysql-server

# 3. Clone repository
git clone https://github.com/yourusername/Chat_app.git
cd Chat_app/Backend

# 4. Create production .env
nano .env
# Add your production configuration

# 5. Build
mvn clean package -DskipTests

# 6. Create systemd service file (optional)
sudo nano /etc/systemd/system/chat-backend.service
```

Add this content:
```ini
[Unit]
Description=Chat App Backend
After=network.target

[Service]
Type=simple
User=chatapp
WorkingDirectory=/home/chatapp/Chat_app/Backend
ExecStart=/usr/bin/java -jar target/Web-0.0.1-SNAPSHOT.jar
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then run:
```bash
sudo systemctl daemon-reload
sudo systemctl start chat-backend
sudo systemctl enable chat-backend
sudo systemctl status chat-backend
```

#### Frontend Setup (Nginx)

```bash
# 1. Install Nginx
sudo apt install nginx

# 2. Build frontend
cd /home/chatapp/Chat_app/FrontEnd/client
npm install
npm run build

# 3. Configure Nginx
sudo nano /etc/nginx/sites-available/chat-app
```

Add this content:
```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        root /home/chatapp/Chat_app/FrontEnd/client/build;
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:5454;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/chat-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### Option 2: Docker Deployment (Recommended)

Create `Backend/Dockerfile`:
```dockerfile
FROM openjdk:17-jdk-slim

WORKDIR /app

COPY target/Web-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 5454

CMD ["java", "-jar", "app.jar"]
```

Create `FrontEnd/client/Dockerfile`:
```dockerfile
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `docker-compose.yml` in root:
```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: whatsapp
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  backend:
    build:
      context: ./Backend
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/whatsapp
      SPRING_DATASOURCE_USERNAME: root
      SPRING_DATASOURCE_PASSWORD: root
      JWT_SECRET_KEY: your_secure_key_here
    ports:
      - "5454:5454"
    depends_on:
      - mysql

  frontend:
    build:
      context: ./FrontEnd/client
    environment:
      REACT_APP_API_BASE_URL: http://localhost:5454
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mysql_data:
```

Deploy with Docker:
```bash
docker-compose up -d
```

---

### Option 3: Cloud Deployment (AWS/GCP/Azure)

#### AWS Elastic Beanstalk

1. **Backend Setup**:
```bash
cd Backend
eb init -p java-17 chat-backend
eb create chat-backend-env
eb deploy
```

2. **Configure Environment Variables**:
```bash
eb setenv SPRING_DATASOURCE_URL=your_rds_url
eb setenv JWT_SECRET_KEY=your_secure_key
```

3. **Frontend Setup**:
```bash
cd FrontEnd/client
npm run build
aws s3 sync build/ s3://your-bucket-name/
```

---

## Environment Variables Configuration

### Critical Security Notes

⚠️ **NEVER commit `.env` files with actual credentials to Git!**

- `JWT_SECRET_KEY`: Generate a strong random string. Example:
  ```bash
  openssl rand -base64 32
  ```

- `SPRING_DATASOURCE_PASSWORD`: Use a strong password:
  ```bash
  openssl rand -base64 16
  ```

- For production, use your platform's secret management:
  - AWS Secrets Manager
  - GCP Secret Manager
  - Azure Key Vault
  - HashiCorp Vault

---

## Production Checklist

- [ ] Change all default passwords
- [ ] Generate strong JWT secret key
- [ ] Set `spring.jpa.hibernate.ddl-auto=validate`
- [ ] Disable `spring.jpa.show-sql`
- [ ] Use HTTPS/SSL certificates (Let's Encrypt)
- [ ] Set up database backups
- [ ] Configure monitoring and logging
- [ ] Set up CI/CD pipeline
- [ ] Update CORS configuration for production domain
- [ ] Implement rate limiting
- [ ] Set up firewall rules
- [ ] Enable database connection pooling

---

## Troubleshooting

### Backend Issues

**Port already in use**:
```bash
# Find process using port 5454
lsof -i :5454
# Kill the process
kill -9 <PID>
```

**Database connection error**:
```bash
# Check MySQL is running
mysql -u root -p -e "SELECT 1;"

# Verify credentials in .env
cat Backend/.env
```

**JWT secret key too short**:
- Generate a new one: `openssl rand -base64 32`
- Update in `.env`

### Frontend Issues

**CORS error**:
- Update backend CORS configuration
- Ensure `REACT_APP_API_BASE_URL` matches backend URL

**Blank page or 404**:
- Check frontend build completed: `ls FrontEnd/client/build/`
- Verify API endpoint in browser console
- Check Nginx configuration

**WebSocket connection fails**:
- Ensure WebSocket upgrade is allowed in proxy
- Check firewall rules

---

## Monitoring & Logs

### View Backend Logs

```bash
# If using systemd
sudo journalctl -u chat-backend -f

# If running directly
tail -f logs/application.log
```

### View Frontend Logs

```bash
# Browser console (press F12)
# Check Network tab for API calls
```

### Database Logs

```bash
# MySQL slow query log
tail -f /var/log/mysql/slow.log
```

---

## Backup & Recovery

### Database Backup

```bash
# Backup
mysqldump -u root -p whatsapp > backup.sql

# Restore
mysql -u root -p whatsapp < backup.sql
```

### Application Backup

```bash
# Backup JAR and configs
tar -czf backup_$(date +%Y%m%d).tar.gz Backend/target/ FrontEnd/client/build/
```

---

## Additional Resources

- Spring Boot Documentation: https://spring.io/projects/spring-boot
- React Documentation: https://react.dev
- MySQL Documentation: https://dev.mysql.com/doc/
- JWT Documentation: https://jwt.io/
- Docker Documentation: https://docs.docker.com/

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review application logs
3. Verify environment configuration
4. Check GitHub issues: [your-repo-url]/issues
