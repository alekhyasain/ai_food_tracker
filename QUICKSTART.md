# Quick Start - Food Diary

## For Existing Users (Current Machine)

The app is already set up. Just run:
```bash
npm start
```
Then open `http://localhost:3000`

## For New Machines

### Step 1: Clone the Repository
```bash
git clone https://github.com/alekhyasain/ai_food_tracker.git
cd ai_food_tracker
```

### Step 2: Run Setup Script
```bash
./setup.sh
```

Or manually:
```bash
npm install
npm start
```

## How Recipes & Ingredients Stay Synced

1. **Add a recipe** or ingredient in the app
2. **Server automatically commits** changes to git
3. **Server automatically pushes** to GitHub
4. **Other devices pull** the latest changes

### Example Flow:
- Device A: Add "Biryani" recipe → Auto-committed to GitHub
- Device B: Pull latest → Now has "Biryani" recipe
- Device C: Start app → Gets all latest recipes

## Storage

### Synced (Shared across all devices)
- `recipes.json` - Custom recipes
- `rawingredients.json` - Ingredients

### Local (Each device keeps their own)
- Daily meal logs
- Weight entries
- Exercise logs
- Personal preferences

## GitHub Repository

- **URL**: https://github.com/alekhyasain/ai_food_tracker
- **Status**: Public
- **Auto-sync**: Enabled ✅

## Deployment Options

See `DEPLOYMENT.md` for:
- Render.com (free)
- Heroku
- DigitalOcean
- Self-hosted setup

## Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Start the server on port 3000 |
| `npm run dev` | Start with auto-reload (requires nodemon) |
| `git pull origin main` | Get latest recipes/ingredients |
| `git push origin main` | Push local changes to GitHub |
| `./setup.sh` | Complete setup on new machine |

## Troubleshooting

**Server won't start?**
- Check if port 3000 is available: `lsof -i :3000`
- Try: `npm install` then `npm start`

**Git push failing?**
- Check git credentials: `git config --list`
- Try: `git pull origin main` first

**Recipes not showing up?**
- Restart the server: Stop with Ctrl+C, then `npm start`
- Check GitHub repository for recent commits

## Support

For detailed deployment guide: See `DEPLOYMENT.md`
For complete documentation: See `README.md`
For issues: Check `README.md` troubleshooting section

---

**Repository**: https://github.com/alekhyasain/ai_food_tracker
**Status**: Ready for public hosting ✅
