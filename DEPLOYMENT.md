# Deployment Guide - Food Diary Public Hosting

This guide explains how to deploy the Food Diary app publicly and keep recipes/ingredients synced to GitHub.

## How Git Sync Works

When you add, edit, or delete recipes or ingredients in the app:
1. Changes are saved to `rawingredients.json` or `recipes.json`
2. The server automatically commits changes to git
3. Changes are automatically pushed to GitHub
4. Other devices pulling from the repo will get the latest data

## Prerequisites for Public Hosting

### GitHub Setup (One-time)
1. Ensure the repository is public: https://github.com/alekhyasain/ai_food_tracker
2. Generate a Personal Access Token (PAT) for automated pushes:
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Create a new token with `repo` scope
   - **Keep this token secure** - don't share it

### Local Machine Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/alekhyasain/ai_food_tracker.git
   cd ai_food_tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Git credentials** (for automated commits and pushes)
   ```bash
   # Option A: Use HTTPS with token
   git config --global credential.helper store
   git remote set-url origin https://your-token@github.com/alekhyasain/ai_food_tracker.git
   
   # Option B: Use SSH (Recommended)
   # Generate SSH key if you don't have one:
   ssh-keygen -t ed25519 -C "your-email@example.com"
   # Add the public key to GitHub settings
   git remote set-url origin git@github.com:alekhyasain/ai_food_tracker.git
   ```

4. **Start the server**
   ```bash
   npm start
   ```
   Server will run on `http://localhost:3000`

## Deploying to Different Services

### Option 1: Render (Free tier available)

1. **Create account** at https://render.com
2. **Connect GitHub repository**
3. **Create Web Service** with these settings:
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment: Add git credentials if needed
4. **Deploy** - Your app will be live at `https://your-app-name.onrender.com`

**Note**: Free tier sleeps after 15 min inactivity. Upgrade for continuous running.

### Option 2: Heroku

1. **Install Heroku CLI** and login
2. **Create Procfile** (already in repo)
3. **Deploy**:
   ```bash
   heroku create your-app-name
   heroku config:set GIT_SSH_KEY="your-ssh-key" (if needed)
   git push heroku main
   ```

### Option 3: DigitalOcean / AWS / Azure

- Use their App Platform or container services
- Connect to GitHub for auto-deployment
- Configure environment variables for git credentials

### Option 4: Self-hosted (VPS/Home Server)

```bash
# On your server
git clone https://github.com/alekhyasain/ai_food_tracker.git
cd ai_food_tracker
npm install
npm start &  # Run in background
```

Set up a reverse proxy (nginx/Apache) and domain name for public access.

## Hosting on Your Phone

You can access the app directly on your phone in two ways:

### Option A: Local Network (Home/Office WiFi)

**Works on:** Same WiFi network as your computer

1. **Find your computer's IP address**
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Windows
   ipconfig
   ```
   Look for something like `192.168.x.x` or `10.x.x.x`

2. **Start the server on your computer**
   ```bash
   npm start
   ```

3. **On your phone**, open browser and go to:
   ```
   http://YOUR-COMPUTER-IP:3000
   ```
   Example: `http://192.168.1.100:3000`

4. **Allow network access** (if using macOS):
   - System Preferences → Security & Privacy → Firewall Options
   - Allow Node.js through the firewall

**Pros:** Fast, no internet needed
**Cons:** Only works on same WiFi network

### Option B: Public Tunnel (Access from Anywhere)

**Works on:** Any device, any network, even over cellular data

#### Using ngrok (Easiest)

1. **Install ngrok** from https://ngrok.com
   ```bash
   # macOS
   brew install ngrok
   
   # Or download from their website
   ```

2. **Start the server**
   ```bash
   npm start
   ```

3. **In another terminal, create a tunnel**
   ```bash
   ngrok http 3000
   ```

4. **Share the public URL** with your phone
   - ngrok will show: `https://abc123def456.ngrok.io`
   - Open that URL on your phone's browser
   - Your app is now accessible from anywhere!

5. **To stop the tunnel**
   ```bash
   Ctrl+C
   ```

**Pros:** Works from anywhere, any network
**Cons:** URL changes when you restart (unless you have paid plan)

#### Using Cloudflare Tunnel (Free & Persistent)

1. **Install Cloudflare CLI**
   ```bash
   brew install cloudflare/cloudflare/cloudflared
   ```

2. **Start the server**
   ```bash
   npm start
   ```

3. **In another terminal, create tunnel**
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

4. **Share the public URL** (same every time!)
   - The URL persists so you don't need to reshare
   - Perfect for long-term access

#### Option: Use Render.com (Simplest)

1. Push code to GitHub
2. Deploy on Render.com (see above)
3. Get permanent URL: `https://your-app-name.onrender.com`
4. Access from phone anytime

### Phone Workflow

#### Using Local WiFi:
1. Open browser on phone
2. Go to `http://192.168.1.100:3000`
3. Add meal, recipe, or ingredient
4. Changes sync to GitHub automatically ✅

#### Using ngrok/Cloudflare:
1. Open browser on phone
2. Go to the public tunnel URL
3. Works anywhere with internet ✅
4. Changes sync to GitHub automatically ✅

#### Using Render.com:
1. Open browser on phone
2. Go to `https://your-app.onrender.com`
3. Works forever (on free tier) ✅
4. Changes sync to GitHub automatically ✅

### Complete Example Setup

```bash
# Terminal 1: Start the server
cd ai_food_tracker
npm start

# Terminal 2: Create public tunnel
ngrok http 3000

# Copy the URL from ngrok output
# Example: https://abc123def456.ngrok.io

# On your phone:
# 1. Open browser
# 2. Enter the URL
# 3. You're done!
```

### Mobile Browser Optimization

The app is fully responsive on mobile:
- ✅ Touch-friendly buttons and inputs
- ✅ Vertical/horizontal layout support
- ✅ Optimized for small screens
- ✅ Fast load times on cellular data

## Using the App Across Devices

### Desktop/Laptop
1. Clone the repo: `git clone <repo-url>`
2. `npm install && npm start`
3. Open `http://localhost:3000`

### Mobile Browser
- Access the publicly hosted URL
- The responsive design works on mobile browsers
- Data syncs between all devices through GitHub

### Important Notes
- **Shared Data**: All instances share the same recipes/ingredients via git
- **Local Meals**: Daily meal logs (mealsByDate) stay local in each device's localStorage
- **Conflicts**: If multiple users edit simultaneously, last-write-wins
- **No Authentication**: Currently no user accounts - all data is public

## Git Sync Features

### What Gets Synced
✅ `recipes.json` - Custom recipes
✅ `rawingredients.json` - Ingredient database  
✅ Automatic commits with descriptive messages
✅ Automatic pushes to GitHub

### What Doesn't Sync
- Daily meal logs (stored in browser localStorage)
- Weight entries (stored in browser localStorage)
- Exercise logs (stored in browser localStorage)
- Personal user preferences

## Commit Messages

Auto-generated commits follow this pattern:
- `✏️ Add ingredient: Spinach`
- `📝 Update ingredient: Rice`
- `🗑️ Delete ingredient: Bitter Gourd`
- `🍳 Add recipe: Aloo Gobi`
- `🔄 Update recipe: Sambar`
- `🗑️ Delete recipe: Dhal Curry`

## Troubleshooting

### Git Credentials Not Working
```bash
# Clear credentials
git config --global --unset credential.helper

# Test connection
git push origin main
```

### Port Already in Use
```bash
# Change port
PORT=3001 npm start

# Or find process using port 3000
lsof -i :3000
kill -9 <PID>
```

### Git Commits Failing
- Check internet connection
- Verify git credentials are configured
- Check GitHub token hasn't expired
- Review server logs for error messages

### Data Not Syncing
- Wait a few seconds for commit to complete
- Check browser console for errors
- Verify server is running
- Check GitHub repository for commits

## Security Considerations

⚠️ **Before making public:**
1. Ensure no sensitive personal data in recipes/ingredients
2. All meal data is PUBLIC if hosted online
3. Consider adding user authentication for private data
4. Regularly backup your data locally
5. Monitor git commits for unauthorized changes

## Managing Multiple Devices

### Pull Latest Changes
Before each session, pull the latest recipes/ingredients:
```bash
git pull origin main
npm start
```

### Workflow
1. Device A adds a recipe → commits to git → pushed to GitHub
2. Device B pulls from git → has the latest recipe
3. Repeat automatically

## Future Enhancements

- Add user authentication and private meals
- Implement merge conflict resolution
- Add git branch support for different meal plans
- Sync meal logs to a database (not just localStorage)
- Automatic daily backups to GitHub

## Support

For deployment issues:
- Check README.md for basic setup
- Review server.js logs for errors
- Verify git/GitHub connectivity
- Test the app locally first before deploying

---

**Last Updated**: December 5, 2025
**Repository**: https://github.com/alekhyasain/ai_food_tracker
