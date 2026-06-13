# 🚀 Railway Deployment - Step by Step

This is a quick, step-by-step guide to deploy your Chat App to Railway **in about 10 minutes**.

## Why Railway?
- ✅ Easiest setup (just connect GitHub)
- ✅ Free tier (backend + frontend + database)
- ✅ Automatic deploys on git push
- ✅ No credit card needed initially
- ✅ Perfect for hobby/learning projects

---

## Prerequisites

- GitHub account (free at github.com)
- Your Chat App code
- 10 minutes of time

---

## Step 1: Prepare Your Code (2 minutes)

### 1.1 Create Procfile for Backend

Create file: `Backend/Procfile` with this content:

```
web: java -Dserver.port=$PORT -jar target/Web-0.0.1-SNAPSHOT.jar
```

### 1.2 Update application.properties

Your `Backend/src/main/resources/application.properties` already uses environment variables, which is perfect! ✅

### 1.3 Update Frontend Config

Make sure `FrontEnd/client/src/config/api.js` uses environment variable:

```javascript
export const BASE_API_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5454"
```

---

## Step 2: Push Code to GitHub (3 minutes)

### 2.1 Create Repository on GitHub

1. Go to github.com and log in
2. Click "+" menu → "New repository"
3. Name: `Chat_app`
4. Description: "WhatsApp Web Clone"
5. Choose Public or Private
6. Click "Create repository"

### 2.2 Push Your Code

In your terminal:

```bash
cd c:\projects\Chat_app

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Chat App"

# Add remote
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/Chat_app.git

# Push to GitHub
git push -u origin main
```

✅ Your code is now on GitHub!

---

## Step 3: Create Railway Account (2 minutes)

1. Go to [railway.app](https://railway.app)
2. Click "Start Project"
3. Choose "Deploy from GitHub repo"
4. Click "Configure GitHub App"
5. Install Railway app in your GitHub account
6. Select your `Chat_app` repository
7. Railway should detect your project

---

## Step 4: Deploy Backend (3 minutes)

### 4.1 Configure Backend Service

In Railway dashboard:

1. Click "New Service"
2. Choose "GitHub Repo"
3. Select `Chat_app` repo
4. Select `Backend` as root directory
5. Click "Deploy"

### 4.2 Set Environment Variables

In Railway → Backend service → "Variables":

```
SPRING_DATASOURCE_URL=jdbc:mysql://{{MYSQL_HOST}}:3306/whatsapp
SPRING_DATASOURCE_DRIVER_CLASS_NAME=com.mysql.cj.jdbc.Driver
SPRING_DATASOURCE_USERNAME={{MYSQL_USER}}
SPRING_DATASOURCE_PASSWORD={{MYSQL_PASSWORD}}
JWT_SECRET_KEY=your_strong_secret_key_at_least_32_chars
SPRING_JPA_HIBERNATE_DDL_AUTO=update
SPRING_JPA_SHOW_SQL=false
SPRING_PROFILES_ACTIVE=prod
```

⚠️ **Replace `your_strong_secret_key...` with a random 32+ character string**

Generate one:
```bash
# In PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}))
```

---

## Step 5: Add MySQL Database (1 minute)

In Railway dashboard:

1. Click "New Service"
2. Choose "MySQL"
3. Railway creates a MySQL instance automatically
4. Copy the connection details provided

**Update Backend Variables with MySQL details:**

Railway should auto-populate with:
- `MYSQL_HOST`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_PORT`

These variables are automatically available in your environment!

---

## Step 6: Deploy Frontend (2 minutes)

### 6.1 Create Frontend Procfile

Create file: `FrontEnd/client/Procfile` with:

```
web: npm run build && npm install -g serve && serve -s build -l $PORT
```

### 6.2 Add Frontend Service in Railway

1. Click "New Service" in Railway
2. Choose "GitHub Repo"
3. Select `Chat_app`
4. Select `FrontEnd/client` as root directory
5. Set environment variable:
   ```
   REACT_APP_API_BASE_URL=https://your-backend-railway-url
   ```

⚠️ Get your backend URL from Railway dashboard → Backend service → Copy deployment URL

---

## Step 7: Connect Everything (1 minute)

### 7.1 Add Variables

1. In Railway, click on Frontend service
2. Click "Variables"
3. Add:
   ```
   REACT_APP_API_BASE_URL=https://your-backend-url.railway.app
   ```

### 7.2 Verify Deployments

In Railway dashboard, you should see:
- ✅ Backend service (running, green)
- ✅ MySQL service (running, green)
- ✅ Frontend service (running, green)

---

## Step 8: Test Your App (1 minute)

1. Go to your Frontend Railway URL
2. Create an account
3. Sign in
4. Create another account in incognito tab
5. Send messages between accounts
6. Verify real-time messaging works

---

## 🎉 You're Done!

Your Chat App is now live on Railway!

**Your URLs:**
- Frontend: `https://your-project-frontend.railway.app`
- Backend: `https://your-project-backend.railway.app`

---

## Next: Add Custom Domain (Optional)

To add your own domain:

1. In Railway → Frontend service → "Settings"
2. Click "Generate Domain" or "Add Custom Domain"
3. Add your domain (requires DNS setup)

---

## Troubleshooting

### Backend service not running
```
Check:
1. Logs in Railway dashboard
2. Environment variables are set
3. MySQL service is running
4. Procfile is correct
5. mvn clean package successful locally
```

### Frontend can't connect to backend
```
Check:
1. REACT_APP_API_BASE_URL is correct
2. Backend service is running
3. Check browser Network tab (F12)
4. Check browser Console for errors
```

### Database connection error
```
Check:
1. MySQL service is running in Railway
2. Connection variables are correct
3. Database `whatsapp` exists (Hibernate should create it)
```

### Can't create account
```
Check:
1. Backend logs for errors
2. Database is accessible
3. All services are running (green in Railway)
```

---

## Cost on Railway

- **Free tier**: Usually $0-5/month
- Includes:
  - Up to 500MB RAM
  - Compute time
  - Database storage (5GB)
  - Bandwidth

If you exceed free tier, upgrade to paid or optimize app.

---

## How to Push Updates

After making changes:

```bash
cd c:\projects\Chat_app

# Make your changes
# ...

# Commit and push
git add .
git commit -m "Your changes"
git push origin main
```

Railway automatically redeploys! 🚀

---

## Tips

- 💡 Keep local `.env` files, don't commit them
- 💡 Test locally before pushing to Railway
- 💡 Use `SPRING_PROFILES_ACTIVE=prod` for production
- 💡 Monitor logs in Railway dashboard
- 💡 Set up alerts for errors

---

## Advanced: Database Backups

Railway provides MySQL backups automatically. To export your database:

```bash
# Connect to Railway MySQL
mysql -h your-railway-host -u your-user -p your-password whatsapp > backup.sql

# Or use Railway's backup feature in dashboard
```

---

## Need Help?

- Railway Docs: [docs.railway.app](https://docs.railway.app)
- Chat App Docs: See [FREE_DEPLOYMENT_GUIDE.md](FREE_DEPLOYMENT_GUIDE.md) for more options
- GitHub Issues: Create an issue in your repo

---

## Time Summary

| Step | Time |
|------|------|
| Prepare code | 2 min |
| Push to GitHub | 3 min |
| Create Railway account | 2 min |
| Deploy backend | 3 min |
| Add MySQL | 1 min |
| Deploy frontend | 2 min |
| Connect everything | 1 min |
| Test | 1 min |
| **TOTAL** | **~15 min** ✅ |

---

**Congratulations! Your Chat App is live! 🎉**

Last Updated: 2024-06-13
