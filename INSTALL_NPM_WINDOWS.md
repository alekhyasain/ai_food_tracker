# How to Install npm on Windows

npm comes bundled with Node.js, so you just need to install Node.js.

## Step 1: Download Node.js

1. Go to **https://nodejs.org/**
2. You'll see two options:
   - **LTS** (Recommended) - Stable, long-term support
   - **Current** - Latest features but less stable

3. Click the **LTS** button to download
4. The download will automatically detect Windows and give you the `.msi` installer

## Step 2: Run the Installer

1. Find the downloaded file (usually in Downloads folder)
2. Double-click the installer file
3. A window will open asking to install Node.js

## Step 3: Installation Wizard

Follow these steps:

1. **Welcome Screen**
   - Click "Next"

2. **License Agreement**
   - Read if you want, then click "I Accept the terms in the License Agreement"
   - Click "Next"

3. **Installation Folder**
   - Keep default: `C:\Program Files\nodejs`
   - Click "Next"

4. **Custom Setup** (IMPORTANT!)
   - Make sure these are checked ✅:
     - npm package manager
     - Add to PATH ⭐ (Very important!)
   - Click "Next"

5. **Tools for Native Modules** (IMPORTANT!)
   - Check: ✅ "Automatically install necessary tools..."
   - This helps install dependencies
   - Click "Next"

6. **Ready to Install**
   - Click "Install"
   - It may ask for Administrator permission - click "Yes"
   - Wait for installation to complete (2-3 minutes)

7. **Finish**
   - Click "Finish"

## Step 4: Restart Your Computer ⭐

This is **very important** on Windows! Close everything and restart.

## Step 5: Verify Installation

1. Open **Command Prompt** or **PowerShell**
   - Press `Windows key + R`
   - Type `cmd` or `powershell`
   - Press Enter

2. Type these commands:
   ```cmd
   node --version
   npm --version
   ```

3. You should see version numbers like:
   ```
   v18.17.0
   9.6.7
   ```

   ✅ If you see version numbers → Installation successful!
   ❌ If you see "command not found" → Try restarting your computer again

## Step 6: Install the Food Diary App

Now you can use npm:

```cmd
cd Desktop
git clone https://github.com/alekhyasain/ai_food_tracker.git
cd ai_food_tracker
npm install
npm start
```

Then open `http://localhost:3000` in your browser.

## Troubleshooting

### "npm: command not found"

**Solution 1: Restart your computer**
- Windows needs to update the PATH variable
- Close everything and restart

**Solution 2: Use PowerShell instead**
- Press `Windows key` and search "PowerShell"
- Open Windows PowerShell
- Try `npm --version` again

**Solution 3: Manually add to PATH**
- Right-click "This PC" on Desktop
- Select "Properties"
- Click "Advanced system settings" 
- Click "Environment Variables"
- Under "User variables", click "New"
- Variable name: `Path`
- Variable value: `C:\Program Files\nodejs`
- Click OK, OK, OK
- Restart Command Prompt

### Download is slow

- The installer is about 100-200 MB
- If download is stuck, try:
  - Pause and resume
  - Use a different browser
  - Try mobile hotspot if WiFi is slow

### Installation fails

**If you get an error:**
1. Uninstall Node.js:
   - Control Panel → Programs → Uninstall a program
   - Find "Node.js" and uninstall it

2. Restart your computer

3. Download fresh installer from nodejs.org

4. Run installer again, make sure to check:
   - ✅ npm package manager
   - ✅ Add to PATH

## Using npm

Once installed, you can use npm anywhere:

```cmd
# Install packages
npm install package-name

# Start a project
npm start

# List installed packages
npm list

# Update npm itself
npm install -g npm@latest
```

## What's npm?

- **npm** = Node Package Manager
- It lets you install code libraries and packages
- Comes automatically with Node.js
- Used in command line/terminal

## Video Tutorial (if you prefer)

Search YouTube for "Install Node.js on Windows" and follow along with a video tutorial.

## Still Need Help?

1. Make sure you have **Administrator** access on your computer
2. Try restarting your computer after install
3. Use PowerShell if Command Prompt doesn't work
4. Check that you see version numbers when you type `node --version`

---

**Next Steps**: Once npm is installed, follow QUICKSTART.md to run the Food Diary app!
