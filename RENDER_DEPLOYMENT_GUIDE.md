# Render Deployment Troubleshooting Guide

## ✅ **Fixes Applied:**

### **1. Port Binding Issue Fixed**
The main issue was with the server's `listen()` method. Changed from:
```javascript
// ❌ WRONG - This was causing the port binding error
server.listen({
  port,
  host: "0.0.0.0", 
  reusePort: true,
})

// ✅ CORRECT - Fixed version
server.listen(port, "0.0.0.0", () => {
  log(`🚀 Server running on port ${port}`);
});
```

### **2. Environment Variable Configuration**
- **Removed hardcoded PORT=5000** from render.yaml
- **Let Render set PORT automatically** (usually 10000)
- **Updated Dockerfile** to use dynamic PORT

## 🚀 **Deployment Steps:**

### **Step 1: Prepare Your Repository**
```bash
# Commit the fixes
git add .
git commit -m "Fix port binding for Render deployment"
git push origin main
```

### **Step 2: Deploy Backend First**
1. **Create Web Service** in Render Dashboard
2. **Connect GitHub Repository**
3. **Set Configuration:**
   ```
   Environment: Node
   Build Command: npm ci && npm run build
   Start Command: npm start
   ```

### **Step 3: Set Environment Variables**
In Render Dashboard, add these environment variables:
```bash
NODE_ENV=production
DATABASE_URL=file:./data/database.db
JWT_SECRET=your-super-secret-jwt-key-here
SESSION_SECRET=your-session-secret-here
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
TRUST_PROXY=true
```

### **Step 4: Add Persistent Disk (Optional)**
- **Disk Name:** `sqlite-data`
- **Mount Path:** `/opt/render/project/src/data`
- **Size:** 1GB (free tier)

### **Step 5: Deploy Frontend**
1. **Create Static Site** in Render Dashboard
2. **Set Configuration:**
   ```
   Build Command: npm ci && npm run build
   Publish Directory: ./dist/public
   ```
3. **Add Environment Variables:**
   ```
   VITE_API_URL=https://your-backend-url.onrender.com
   VITE_WS_URL=wss://your-backend-url.onrender.com
   ```

## 🔍 **Debugging Commands:**

### **Check if Port is Binding:**
Add this to server startup:
```javascript
server.on('listening', () => {
  const addr = server.address();
  console.log(`✅ Server listening on ${addr.address}:${addr.port}`);
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});
```

### **Health Check Verification:**
```bash
# Test locally first
curl http://localhost:5000/api/health

# Test on Render
curl https://your-app.onrender.com/api/health
```

## 🎯 **Common Issues & Solutions:**

### **Issue 1: "No open ports detected"**
- **Cause:** Server not binding to correct port
- **Solution:** Use `server.listen(port, "0.0.0.0")` format ✅

### **Issue 2: Build fails**
- **Cause:** Missing dependencies or build script issues
- **Solution:** 
  ```bash
  npm ci --production=false
  npm run build
  ```

### **Issue 3: WebSocket connection fails**
- **Cause:** Wrong WebSocket URL
- **Solution:** Use `wss://` protocol for HTTPS sites

### **Issue 4: Database connection issues**
- **Cause:** SQLite file permissions or path issues
- **Solution:** Check persistent disk mount path

## 📦 **Alternative Deployment (Manual)**

If Blueprint deployment fails, deploy manually:

### **Backend Manual Deploy:**
```bash
# Create new Web Service
# Repository: your-github-repo
# Branch: main
# Root Directory: (leave empty)
# Environment: Node
# Build Command: npm ci && npm run build  
# Start Command: npm start
```

### **Frontend Manual Deploy:**
```bash
# Create new Static Site
# Repository: your-github-repo
# Branch: main
# Root Directory: (leave empty)
# Build Command: npm ci && npm run build
# Publish Directory: ./dist/public
```

## 🔄 **Testing Checklist:**

- [ ] Server starts without errors
- [ ] Health check endpoint responds (200 OK)
- [ ] Database initializes correctly
- [ ] WebSocket connections work
- [ ] Frontend loads and connects to backend
- [ ] API endpoints return expected responses

## 📞 **Getting Help:**

If deployment still fails:
1. **Check Render logs** for specific error messages
2. **Test locally** with `npm run build && npm start`
3. **Verify environment variables** are set correctly
4. **Check Render status page** for service issues

## 🎉 **Expected Results:**

After successful deployment:
- **Backend URL:** `https://localpick-api.onrender.com`
- **Frontend URL:** `https://localpick-frontend.onrender.com`
- **Health Check:** `https://localpick-api.onrender.com/api/health`
- **WebSocket:** `wss://localpick-api.onrender.com/ws`

Your app should now be live and accessible worldwide! 🌍