# Environment Configuration Guide

This guide explains all environment variables used in the Chat Application and how to configure them.

## Quick Start

### 1. Backend Setup

```bash
cd Backend
cp .env.example .env
```

Edit `.env` with your values:
```env
SPRING_APPLICATION_NAME=Web
SERVER_PORT=5454
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/whatsapp
SPRING_DATASOURCE_DRIVER_CLASS_NAME=com.mysql.cj.jdbc.Driver
SPRING_DATASOURCE_USERNAME=your_username
SPRING_DATASOURCE_PASSWORD=your_password
JWT_SECRET_KEY=your_secure_key_min_32_chars
JWT_EXPIRATION_TIME=85400000
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SPRING_JPA_SHOW_SQL=false
SPRING_PROFILES_ACTIVE=dev
```

### 2. Frontend Setup

```bash
cd FrontEnd/client
cp .env.example .env.local
```

Edit `.env.local`:
```env
REACT_APP_API_BASE_URL=http://localhost:5454
```

---

## Backend Environment Variables

### Server Configuration

| Variable | Default | Purpose | Example |
|----------|---------|---------|---------|
| `SPRING_APPLICATION_NAME` | `Web` | Application name | `Web` |
| `SERVER_PORT` | `5454` | Server port | `5454` |
| `SPRING_PROFILES_ACTIVE` | `dev` | Active profile (dev/prod) | `prod` |

### Database Configuration

| Variable | Default | Purpose | Example |
|----------|---------|---------|---------|
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://localhost:3306/whatsapp` | Database URL | `jdbc:mysql://db.example.com:3306/whatsapp` |
| `SPRING_DATASOURCE_DRIVER_CLASS_NAME` | `com.mysql.cj.jdbc.Driver` | JDBC Driver | `com.mysql.cj.jdbc.Driver` |
| `SPRING_DATASOURCE_USERNAME` | `root` | Database username | `chat_user` |
| `SPRING_DATASOURCE_PASSWORD` | `root` | Database password | `secure_password_123` |

**Security Warning**: Never use default credentials in production!

### Hibernate Configuration

| Variable | Default | Purpose | Values |
|----------|---------|---------|--------|
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | `update` | Schema auto-generation | `create`, `create-drop`, `update`, `validate` |
| `SPRING_JPA_SHOW_SQL` | `true` | Log SQL queries | `true`, `false` |

**Schema Auto-generation Guide**:
- **Development**: `update` (auto-creates/updates tables)
- **Production**: `validate` (validates schema only, no changes)
- **Testing**: `create-drop` (creates and drops schema on startup/shutdown)

### JWT Configuration

| Variable | Default | Purpose | Notes |
|----------|---------|---------|-------|
| `JWT_SECRET_KEY` | `qegfghsdfgrtsubyjtynrbevthgvgsrthv` | Secret key for signing tokens | **Must be at least 32 characters!** |
| `JWT_EXPIRATION_TIME` | `85400000` | Token expiration in milliseconds | Default = ~24 hours |

**Generate Secure JWT Secret**:
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}))
```

### Logging Configuration

| Variable | Default | Purpose | Values |
|----------|---------|---------|--------|
| `LOGGING_LEVEL_ROOT` | `INFO` | Root logging level | `DEBUG`, `INFO`, `WARN`, `ERROR` |
| `LOGGING_LEVEL_COM_WHATSAPP` | `DEBUG` | App logging level | `DEBUG`, `INFO`, `WARN`, `ERROR` |

---

## Frontend Environment Variables

### API Configuration

| Variable | Default | Purpose | Example |
|----------|---------|---------|---------|
| `REACT_APP_API_BASE_URL` | `http://localhost:5454` | Backend API URL | `http://api.example.com` |
| `REACT_APP_ENV` | `development` | Environment type | `development`, `production` |
| `REACT_APP_SOCKET_URL` | `http://localhost:5454` | WebSocket URL | `ws://api.example.com` |

**Important**: 
- Frontend env variables must be prefixed with `REACT_APP_`
- Changes require rebuilding the app
- `.env.local` is not committed to git

---

## Database Configuration Examples

### Local Development
```env
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/whatsapp
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=root
```

### Remote MySQL Server
```env
SPRING_DATASOURCE_URL=jdbc:mysql://db.example.com:3306/whatsapp
SPRING_DATASOURCE_USERNAME=chat_user
SPRING_DATASOURCE_PASSWORD=SecurePassword123!
```

### AWS RDS
```env
SPRING_DATASOURCE_URL=jdbc:mysql://whatsapp-db.xxxxx.us-east-1.rds.amazonaws.com:3306/whatsapp
SPRING_DATASOURCE_USERNAME=admin
SPRING_DATASOURCE_PASSWORD=YourRDSPassword123!
```

### Docker MySQL
```env
SPRING_DATASOURCE_URL=jdbc:mysql://mysql-container:3306/whatsapp
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=root_password
```

---

## Profile-Specific Configuration

### Development Profile (`dev`)

Set `SPRING_PROFILES_ACTIVE=dev` and create `application-dev.properties`:
```properties
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
logging.level.root=DEBUG
logging.level.com.whatsapp=DEBUG
```

### Production Profile (`prod`)

Set `SPRING_PROFILES_ACTIVE=prod` (uses `application-prod.properties`):
```properties
spring.jpa.hibernate.ddl-auto=validate
spring.jpa.show-sql=false
logging.level.root=INFO
logging.level.com.whatsapp=INFO
```

---

## How to Run with Different Configurations

### Development

```bash
# Using Maven
mvn spring-boot:run

# Using JAR with dev profile
java -Dspring.profiles.active=dev -jar Web-0.0.1-SNAPSHOT.jar
```

### Production

```bash
# Using environment variables
export SPRING_DATASOURCE_USERNAME=prod_user
export SPRING_DATASOURCE_PASSWORD=prod_password
export JWT_SECRET_KEY=your_production_secret_key

java -Dspring.profiles.active=prod -jar Web-0.0.1-SNAPSHOT.jar
```

### Docker

```bash
docker run -e SPRING_DATASOURCE_URL="jdbc:mysql://mysql:3306/whatsapp" \
           -e SPRING_DATASOURCE_USERNAME="root" \
           -e SPRING_DATASOURCE_PASSWORD="root" \
           -e JWT_SECRET_KEY="your_secret_key" \
           -e SPRING_PROFILES_ACTIVE=prod \
           -p 5454:5454 \
           chat-app:latest
```

---

## Security Best Practices

### ✅ DO:
- Generate strong JWT secret keys (use `openssl rand -base64 32`)
- Use strong database passwords
- Use environment variables for sensitive data
- Never commit `.env` files to Git
- Use HTTPS in production
- Rotate JWT secrets periodically
- Use database connection pooling

### ❌ DON'T:
- Use default passwords (root/root)
- Commit secrets to version control
- Use weak JWT secrets
- Expose database credentials in logs
- Use `create` or `update` in production Hibernate settings
- Enable SQL logging in production
- Trust client-side environment variables

---

## Common Issues

### JWT Secret Key Too Short
**Error**: `java.lang.IllegalArgumentException: Key size must be at least...`

**Fix**: Generate a proper 32+ character key
```bash
openssl rand -base64 32
```

### Database Connection Refused
**Error**: `Connection refused` or `Cannot get a connection`

**Check**:
1. MySQL is running
2. Correct host/port in `SPRING_DATASOURCE_URL`
3. Username/password are correct
4. Database exists

```bash
mysql -h your_host -u your_user -p
```

### CORS Errors in Frontend
**Error**: `No 'Access-Control-Allow-Origin'`

**Fix**: Ensure `REACT_APP_API_BASE_URL` matches your backend URL and CORS is enabled.

### Environment Variables Not Loaded
**Fix**: 
1. Ensure `.env` file is in the correct directory
2. Restart the application
3. Use `System.getenv()` to verify in code

---

## Verification Checklist

After setting up environment variables:

- [ ] Backend starts without errors
- [ ] Database connection successful
- [ ] JWT tokens are generated correctly
- [ ] Frontend loads API URL correctly
- [ ] Authentication works (signup/login)
- [ ] Chat functionality works
- [ ] No sensitive data in logs

---

## Additional Resources

- [Spring Boot Properties](https://docs.spring.io/spring-boot/docs/current/reference/html/application-properties.html)
- [JWT.io](https://jwt.io/)
- [Create React App Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [MySQL Connection String](https://dev.mysql.com/doc/connector-j/en/connector-j-reference-jdbc-url-format.html)
