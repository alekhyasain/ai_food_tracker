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
