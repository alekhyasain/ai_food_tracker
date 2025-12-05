# Indian Food Diary - Comprehensive Food & Nutrition Tracker

A full-featured food tracking application for monitoring daily nutrition intake with comprehensive recipe management, meal logging, and weight tracking for Indian cuisine.

## Features

### Meal Tracking
- **Meal Type Classification**: Track meals as Breakfast, Lunch, Dinner, or Snacks
- **Quick Add Dishes**: Instantly add pre-made Indian dishes with accurate nutritional data
- **Custom Entries**: Add custom meals with manual calorie and macro tracking
- **Inline Meal Logging**: Add meals directly from the daily view
- **Volume-Based Measurements**: Track food using cups, tablespoons, grams, and other measurements
- **Daily Summary**: View aggregated calories, protein, carbs, fat, and fiber for each day

### Recipe Management
- **Custom Recipe Builder**: Create and save custom recipes with precise ingredient measurements
- **Recipe Search**: Search recipes by name
- **Ingredient Management**: Add/remove ingredients from recipes with flexible quantity inputs
- **Automatic Nutrition Calculation**: Recipes auto-calculate based on ingredient portions

### Data Export & Analysis
- **Excel Export**: Export all meal data to Excel with meal type, date, and nutritional information
- **Multi-Sheet Export**: Organized export with detailed meal breakdowns and daily summaries
- **Formatted Output**: Professional Excel formatting with color-coded sections

### Weight & Exercise Tracking
- **Daily Weight Logging**: Record weight in lbs or kg (user preference)
- **Unit Conversion**: Automatic conversion between metric and imperial units
- **Exercise Tracking**: Log exercises with duration and calorie burn estimation
- **Progress Analytics**: View trends over time with visual feedback

### User Preferences
- **Unit System Selection**: Choose between lbs/oz or kg measurements
- **BMR Calculator**: Calculate Basal Metabolic Rate for personalized nutrition insights
- **Persistent Data**: All data stored locally in browser (localStorage)

## Installation & Setup

### Prerequisites
- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```
   This installs Express, ExcelJS for Excel export, and CORS support.

2. **Start the Server**
   ```bash
   npm start
   ```
   The server will start on `http://localhost:3000`

3. **Access the Application**
   - Open your browser and navigate to: `http://localhost:3000`
   - The app will load with today's date by default

## Usage Guide

### Food Tracking

#### Quick Add Dishes
1. Navigate to the **"Add Quick Dish"** section
2. Select a **Meal Type** (Breakfast, Lunch, Dinner, Snack)
3. Choose a pre-made dish from the dropdown
4. Select your portion size
5. Click **"Add to Today's Meals"** to log it

#### Custom Meal Entry
1. Go to the **"Add Custom Entry"** tab
2. Select **Meal Type**
3. Enter a description (e.g., "Homemade biryani")
4. Enter estimated calories
5. (Optional) Add ingredients for detailed tracking
6. Click **"Add to Today's Meals"**

#### Inline Meal Logging
1. Scroll to the meal section for your chosen meal type
2. Click the **"+ Add meal"** button
3. Fill in meal details or select from recipes
4. Confirm to add to your meal log

### Recipe Management

#### Creating a Custom Recipe
1. In the **"Add Recipe"** section, enter a recipe name
2. **Add Ingredients**: 
   - Search for ingredients by name
   - Select from the list of available ingredients
   - Specify the quantity and measurement
   - Click **"Add Ingredient"** to include it
3. Review the automatic nutrition calculation
4. Click **"Save Recipe"** to store it

#### Using Recipes
- In any meal entry form, select your custom recipe from the dropdown
- Choose your portion size
- The nutritional data will auto-populate

### Weight & Exercise Tracking

#### Log Weight
1. Select your preferred unit system (lbs or kg) in settings
2. In the weight section, enter today's weight
3. View weight trends and changes over time

#### Log Exercise
1. Go to the **"Exercise"** section
2. Enter exercise name and duration
3. The app estimates calorie burn based on duration
4. View your daily exercise summary

### Data Export

#### Export to Excel
1. Click the **"📊 Export to Excel"** button
2. The app generates a formatted Excel file with:
   - Daily meal breakdowns with meal types
   - Nutritional summaries per day
   - Weekly aggregates
   - Professional formatting
3. The file downloads automatically

### Unit System & Preferences

#### Change Units
1. Use the unit selector to switch between lbs/oz and kg/g
2. All weights automatically convert between systems
3. Preferences are saved in browser storage

#### BMR Calculator
1. Click the **"ℹ️"** icon next to the BMR display
2. View your calculated Basal Metabolic Rate
3. Use this for personalized nutrition planning

## API Endpoints

The server provides the following REST API endpoints:

### Meal Management
- `POST /api/meals` - Add a new meal
- `DELETE /api/meals/:id` - Delete a meal

### Export
- `POST /api/export-excel` - Generate and download Excel file with meal data

### Data Structure
The app uses the following localStorage keys:
- `indianFoodMealsByDate`: Daily meal logs organized by date
- `customRecipes`: User-created recipes
- `weightByDate`: Daily weight entries
- `exerciseByDate`: Daily exercise logs
- `userHeight`: Stored user height for BMR calculations
- `userUnitSystem`: User's preferred unit system (lbs or kg)

## File Structure

```
food_diary/
├── server.js                 # Express.js server with API endpoints
├── food_tracker.html         # Main application (single-page HTML with inline JS/CSS)
├── package.json              # Node.js dependencies
├── package-lock.json         # Locked dependency versions
├── rawingredients.json       # Master ingredient database with nutritional data
├── recipes.json              # Pre-made Indian dish recipes
├── trackers/                 # Directory for storing exported data
└── README.md                 # This file
```

## Technical Stack

- **Backend**: Node.js with Express.js
- **Frontend**: Vanilla JavaScript with Tailwind CSS
- **Data Storage**: LocalStorage (browser) + JSON files (server)
- **Export**: ExcelJS library for Excel generation
- **Dependencies**: 
  - express (web server)
  - cors (cross-origin requests)
  - exceljs (Excel file generation)

## Data Storage Architecture

### LocalStorage (Browser)
- `mealsByDate`: Object with date keys storing array of meals
- `customRecipes`: User-created recipes with ingredients
- `weightByDate`: Daily weight tracking
- `exerciseByDate`: Daily exercise logs

### Server Files
- `rawingredients.json`: Complete ingredient database with measurements and nutrition
- `recipes.json`: Pre-made recipes for quick add functionality

### Meal Data Structure
```javascript
{
  id: "unique-id",
  description: "Meal name",
  calories: 250,
  protein: 10,
  carbs: 30,
  fat: 8,
  fiber: 5,
  mealType: "breakfast", // breakfast, lunch, dinner, snack
  ingredients: [
    { name: "ingredient", quantity: 1, measurement: "cup" }
  ]
}
```

## Error Handling

The application includes comprehensive error handling:
- **Server Connectivity**: Gracefully handles server unavailability
- **Data Validation**: Validates all meal entries and recipe data
- **User Feedback**: Clear success/error messages for all operations
- **LocalStorage Fallback**: Works offline with data persistence
- **Large Exports**: Supports up to 50MB JSON payloads for Excel exports

## Troubleshooting

### Common Issues

1. **"Can't connect to server"**
   - Ensure the server is running: `npm start`
   - Verify server is on port 3000: `http://localhost:3000`
   - Check for port conflicts

2. **Date keeps resetting to yesterday**
   - This has been fixed - app now defaults to current date
   - Clear browser cache if issue persists

3. **Meal type not showing in Excel export**
   - Ensure you're selecting a meal type when logging meals
   - Re-export to see updated data

4. **Weight not converting properly**
   - Check your selected unit system in preferences
   - Try clearing browser storage: `localStorage.clear()`

5. **Server won't start**
   - Verify Node.js: `node --version`
   - Install dependencies: `npm install`
   - Try a different port if 3000 is occupied

### Browser Compatibility
- Modern browsers with ES6+ support (Chrome, Firefox, Safari, Edge)
- JavaScript must be enabled
- LocalStorage must be available (not in private/incognito mode)
- Minimum 2GB RAM recommended for large datasets

## Performance Tips

- **Large Export Files**: May take 30-60 seconds for year of data
- **Ingredient Search**: Use filters to narrow down options
- **Multiple Meals**: Batch add meals in quick add section for efficiency
- **Data Cleanup**: Regularly review and delete old entries to keep app responsive

## Contributing

When contributing:
1. Maintain the existing code structure
2. Use consistent naming conventions
3. Test in multiple browsers
4. Update README with new features
5. Ensure nutritional data is accurate

## Known Limitations

- Maximum of ~50MB data export (large meal histories)
- LocalStorage limited to ~10MB per domain
- Offline functionality available but no sync when reconnected
- No user accounts or cloud sync (local storage only)

## Future Enhancements

Potential features for future versions:
- Cloud backup and sync
- Multi-user support with accounts
- Barcode scanning for quick food logging
- Integration with fitness trackers
- Meal planning and grocery lists
- Nutritionist reporting features
- Mobile app version

## License

MIT License - Feel free to use and modify as needed.

## Support

For issues or feature requests, check the troubleshooting section above or review the code comments in `food_tracker.html` and `server.js` for detailed implementation notes.