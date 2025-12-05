# Transferring Daily Meal Logs Between Devices

You now have the ability to export and import your daily meal logs as JSON files, making it easy to move your data between different hosts/devices.

## Overview

- **Recipes & Ingredients**: Auto-synced to GitHub (shared across all devices)
- **Daily Meal Logs**: Need to be manually transferred using JSON export/import
- **Weight & Exercise**: Stay local to each device (optional to transfer)

## How to Transfer Meals Between Devices

### Step 1: Export Meals from Current Device

1. Open the Food Diary app on the device with your meal logs
2. Click the **"💾 Export JSON"** button (next to Export to Excel)
3. Choose your export range:
   - **All meal logs** - Everything
   - **Current month only** - Just this month
   - **Custom date range** - Select specific dates
4. Click **"Export JSON"**
5. A `.json` file downloads automatically (e.g., `food-diary-2025-12-05.json`)

### Step 2: Import Meals on New Device

1. Open the Food Diary app on the new device (different host)
2. Click the **"📥 Import JSON"** button
3. Select your downloaded JSON file
4. Choose a merge strategy:
   - **Merge** (Recommended) - Keep existing meals, add imported ones
   - **Merge & Replace** - Update meals if they already exist
   - **Replace All** - Use only imported data, delete everything else
5. Click **"Import JSON"**
6. Your meals are now on the new device!

## Use Cases

### Switching from MacBook to Windows Laptop

1. On MacBook: Click "Export JSON", download the file
2. Transfer the file to your Windows laptop (via email, cloud drive, USB, etc.)
3. On Windows: Click "Import JSON", select the file
4. All meals are now on Windows ✅

### Backup Your Meal History

1. Regularly click "Export JSON" with "All meal logs"
2. Save the files somewhere safe (Google Drive, Dropbox, etc.)
3. If you lose data, you can restore from backup anytime

### Consolidating Multiple Devices

1. Export from Device A: `meals-device-a.json`
2. Export from Device B: `meals-device-b.json`
3. Import `meals-device-a.json` on Device C with "Merge"
4. Import `meals-device-b.json` on Device C with "Merge"
5. Device C now has all meals from both!

## Merge Strategies Explained

### Merge (Default)
```
Current device: Breakfast (ID: 1), Lunch (ID: 2)
Importing: Breakfast (ID: 1), Dinner (ID: 3)

Result: Breakfast (ID: 1), Lunch (ID: 2), Dinner (ID: 3)
         (Skips duplicate Breakfast)
```

### Merge & Replace
```
Current device: Breakfast (ID: 1, 200cal), Lunch (ID: 2)
Importing: Breakfast (ID: 1, 250cal), Dinner (ID: 3)

Result: Breakfast (ID: 1, 250cal), Lunch (ID: 2), Dinner (ID: 3)
         (Updates Breakfast with new data)
```

### Replace All
```
Current device: Breakfast, Lunch, Dinner, Snack
Importing: Breakfast, Breakfast

Result: Breakfast, Breakfast (only imported data)
         (All existing meals deleted!)
```

⚠️ **Use Replace All carefully** - It will delete all current meals!

## File Format

The exported JSON file contains:

```json
{
  "metadata": {
    "exportedAt": "2025-12-05T10:30:00.000Z",
    "version": "1.0",
    "appName": "Food Diary",
    "format": "json",
    "totalDays": 15,
    "totalMeals": 45,
    "dateRange": {
      "from": "2025-11-20",
      "to": "2025-12-05"
    }
  },
  "meals": {
    "2025-12-05": [
      {
        "id": 1,
        "description": "Sambar",
        "calories": 250,
        "protein": 10,
        "mealType": "lunch",
        ...more fields...
      }
    ],
    "2025-12-04": [...],
    ...more dates...
  }
}
```

This format is portable - you can share it, backup it, or open it in any text editor.

## Important Notes

### What Syncs Automatically
✅ Recipes (via git)
✅ Ingredients (via git)
✅ Custom meal definitions (via git)

### What You Need to Manually Transfer
📋 Daily meal logs (use JSON export/import)
⚖️ Weight entries (optional - personal data)
🏃 Exercise logs (optional - personal data)

### Why Not Automatic?
- Daily logs are personal/private
- Different users might have different devices
- No authentication system yet
- Prevents data conflicts between users

### Size Limits
- Maximum 50MB per export/import
- Large histories (1+ year) might take 30-60 seconds
- Email services might block large files - use cloud storage if needed

## Workflow Example

```
Day 1 (MacBook):
  1. Add meals for Dec 1-5
  2. Click "Export JSON" → saves file

Day 2 (Switch to Windows):
  1. Set up app on Windows
  2. Click "Import JSON" → select file
  3. All Dec 1-5 meals now on Windows ✅

Day 3 (Back to MacBook):
  1. Add new meals for Dec 6-10
  2. "Export JSON" again → new file
  3. On Windows: "Import JSON" → select new file
  4. Windows now has Dec 1-10 ✅
```

## Troubleshooting

### "Invalid JSON file"
- Make sure you downloaded from **Export JSON**, not Excel
- Don't edit the file in text editor
- Try re-exporting from source device

### "Import failed" error
- Check internet connection
- Verify file isn't corrupted
- Try a smaller date range first
- Check browser console for error details

### Meals not appearing after import
- Refresh the page
- Check you selected "Merge" strategy (not Replace)
- Verify the meal dates are the same format (YYYY-MM-DD)

### File download won't start
- Check browser download settings
- Try a different browser
- Clear browser cache
- Check if popup blocker is interfering

## Tips & Tricks

1. **Regular Backups**: Export JSON monthly to a cloud drive
2. **Share with Family**: Export and share with family members
3. **Data Transfer**: Use USB drive for offline transfer between devices
4. **Archiving**: Keep yearly exports as archive
5. **Combine Data**: Import from multiple sources to consolidate meals

---

**Status**: JSON export/import is synced to all devices via git ✅
