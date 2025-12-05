# Food Tracker Updates & Features

## Overview
The food tracker has evolved into a comprehensive Indian Food Diary application with volume-based tracking, weight management, and advanced nutritional analysis capabilities.

## Major Features & Updates

### 🍽️ Core Food Tracking
- **Volume-Based Measurements**: Track food using cups, tablespoons, and other common measurements instead of weighing
- **Indian Food Database**: Extensive database of Indian dishes with accurate nutritional data
- **Custom Recipe Builder**: Create and save custom recipes with ingredient-level nutrition calculations and enhanced editing capabilities
- **Meal Type Classification**: Organize meals by Breakfast, Morning Snack, Lunch, Evening Snack, and Dinner
- **Date-Based Navigation**: Navigate between different dates to view historical food logs

### 📊 Nutritional Analysis
- **Real-Time Calculations**: Automatic calculation of calories, protein, carbs, fat, and fiber
- **Daily Summary Dashboard**: Visual cards showing total calories, meal count, protein, and fiber
- **Ingredient-Level Tracking**: Detailed breakdown of individual ingredients in meals
- **Serving Size Flexibility**: Support for fractional servings (0.5, 1.5, etc.)

### ⚖️ Weight & Health Tracking
- **BMI Calculations**: Automatic BMI calculation with category classification (Underweight, Normal, Overweight, Obese)
- **BMR Calculations**: Support for both Mifflin-St Jeor and Harris-Benedict equations
- **Nursing Mother Support**: Special BMR adjustments (+400 calories) for breastfeeding mothers
- **Unit System Support**: Both metric (kg, cm) and imperial (lbs, ft/in) measurements
- **Weight History**: Track weight changes over time with date-based storage

### 🏃‍♂️ Exercise Integration
- **Exercise Logging**: Track various exercise types with duration and calories burned
- **Pre-defined Activities**: Walking, jogging, running, cycling, swimming, yoga, weightlifting, dancing, hiking
- **Custom Exercise Support**: Add custom exercises with manual calorie input
- **Exercise History**: View and edit past exercise entries
- **Calorie Burn Integration**: Exercise calories are factored into daily deficit calculations

### 🎯 Goal Setting & Progress Tracking
- **Weight Loss Goals**: Set weekly weight loss targets (0.5-2 lbs per week)
- **Daily Calorie Targets**: Automatic calculation based on BMR, activity level, and weight loss goals
- **Weekly Deficit Tracking**: 7-day progress visualization with daily breakdown
- **Safety Validations**: Minimum calorie requirements (1,200 general, 1,800 for nursing mothers)
- **Progress Visualization**: Progress bars and color-coded daily tracking

### 📱 User Interface Enhancements
- **Unified Modal System**: Streamlined "Add Meal or Ingredient" and "Log Today's Meals" modals
- **Tab-Based Navigation**: Organized interface with Quick Dishes, Add Ingredient, Custom Entry, Recipe Builder, etc.
- **Time-Based Meal Selection**: Auto-select meal type based on current time
- **Enhanced Search**: Real-time ingredient and recipe search with dropdown suggestions
- **Responsive Design**: Mobile-friendly interface with Tailwind CSS
- **New "Manage Recipes" Main Button**: Third main action button with chef emoji (👨‍🍳) for centralized recipe organization

### 📤 Data Export & Management
- **Excel Export**: Export food diary data to Excel with monthly sheets and detailed breakdowns
- **Date Range Selection**: Export all data, current month, or custom date ranges
- **Automatic File Management**: Smart file naming and organization in trackers folder
- **Data Persistence**: LocalStorage-based data storage with migration support

### 🔧 Technical Improvements
- **Database Loading**: Robust API-first loading with file fallbacks
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Data Validation**: Input validation and safety checks throughout the application
- **Performance Optimization**: Efficient data structures and rendering
- **Debugging Tools**: Built-in diagnostic functions for troubleshooting

## Data Structure

### Meals Storage
```javascript
mealsByDate = {
  "2025-12-05": [
    {
      id: timestamp,
      description: "Meal description",
      timestamp: "ISO date string",
      nutrition: { calories, protein, carbs, fat, fiber },
      source: "database|ingredients|custom",
      mealType: "Breakfast|Lunch|Dinner|etc"
    }
  ]
}
```

### Weight Tracking
```javascript
weightByDate = {
  "2025-12-05": {
    weight: 170, // always stored in lbs
    height: 62, // always stored in inches
    bmi: 31.1,
    bmiCategory: "Obese",
    age: 30,
    gender: "female",
    bmrMifflin: 1650,
    bmrHarris: 1680,
    calorieGoal: 1800,
    isNursing: true,
    timestamp: "ISO date string"
  }
}
```

### Exercise Tracking
```javascript
exerciseByDate = {
  "2025-12-05": [
    {
      id: timestamp,
      type: "walking",
      name: "Walking",
      duration: 30,
      calories: 120,
      notes: "Morning walk",
      timestamp: "ISO date string"
    }
  ]
}
```

## Key Functions

### Core Functionality
- `addMealToDate(meal)` - Add meal to specific date
- `getCurrentDateMeals()` - Get meals for selected date
- `updateDailySummary()` - Update nutrition summary cards
- `displayMeals()` - Render meal list with grouping by meal type

### Recipe Management
- `addRecipeIngredient()` - Add ingredient to recipe with enhanced data storage (measurementKey, quantity, key)
- `updateRecipePreview()` - Update recipe preview with Edit buttons and safe array operations
- `editRecipeIngredientLine(index)` - Edit specific recipe ingredient by array index
- `removeRecipeIngredientLine(index)` - Remove specific recipe ingredient by array index
- `openManageRecipesModal()` - Opens main recipe management interface with centralized recipe organization
- `loadRecipeList()` - Populates recipe list with formatted data showing calories, servings, and ingredient count
- `openRecipeEditModal(recipeName)` - Opens dedicated editing popup with pre-loaded recipe data
- `updateEditNutrition()` - Real-time nutrition calculation during recipe editing
- `deleteRecipeConfirm(recipeName)` - Safe recipe deletion with confirmation dialog

### Weight & Health
- `calculateBMI(weight, height, unitSystem)` - BMI calculation
- `calculateBMRMifflinStJeor()` - BMR using Mifflin-St Jeor equation
- `saveWeightEntry()` - Save weight data with validations
- `updateWeightDisplay()` - Update weight tracking UI

### Goal Management
- `openGoalSettingModal()` - Open goal setting interface
- `saveWeightLossGoals()` - Save weight loss targets with safety checks
- `updateWeeklyDeficitDisplay()` - Update weekly progress tracking

### Data Management
- `loadDatabases()` - Load ingredients and recipes from API/files
- `startDirectExport()` - Export data to Excel
- `saveMealsToStorage()` - Persist data to localStorage

## Safety Features

### Nursing Mother Support
- Automatic +400 calorie BMR adjustment
- Minimum 1,800 calorie daily requirement
- Special warnings and guidance
- Healthcare provider consultation reminders

### General Safety
- Minimum 1,200 calorie daily requirement for non-nursing users
- Maximum 2 lbs/week weight loss recommendations
- Input validation and error handling
- Data backup and recovery mechanisms

## Recent Enhancements

### Comprehensive Recipe Management System
- **New "Manage Recipes" Main Button**: Third main action button with chef emoji (👨‍🍳) provides centralized access to recipe organization
- **Dedicated Recipe Management Modal**: Complete interface for viewing, editing, and organizing all custom recipes
- **Recipe List Display**: Shows all recipes with key information including name, calories per serving, total servings, and ingredient count
- **Enhanced Recipe Editing**: Dedicated popup for editing recipes with pre-loaded data and real-time nutrition calculation
- **Streamlined Edit Button Behavior**: Direct popup opening eliminates complex navigation for a more intuitive workflow
- **Safe Recipe Deletion**: Confirmation dialogs prevent accidental recipe loss
- **Empty State Handling**: Graceful display when no recipes exist with clear call-to-action

### Enhanced Recipe Ingredient Editing
- **Edit Buttons**: Recipe ingredients now display Edit (✏️) buttons for individual ingredient modification
- **Enhanced Data Storage**: Recipe ingredients now preserve `measurementKey`, `quantity`, and `key` data for proper editing
- **Safe Array Operations**: Uses array indices for safer ingredient removal and editing operations
- **Individual Ingredient Management**: New functions `editRecipeIngredientLine(index)` and `removeRecipeIngredientLine(index)` for precise ingredient control
- **Preserved Form Data**: When editing ingredients, all original form data is restored for seamless modification
- **Real-time Preview Updates**: Recipe preview updates immediately when ingredients are edited or removed

### Enhanced Ingredient Addition
- Real-time ingredient search with nutrition data
- Measurement selection with accurate portions
- Nutrition preview before adding
- Database-backed ingredient information

### Improved Export System
- Direct export without modal for quick access
- Status indicators during export process
- Automatic file organization
- Error recovery and retry mechanisms

### Enhanced Custom Recipe Builder
- **Centralized Recipe Management**: New main button provides direct access to all recipe management functions
- **Visual Recipe Organization**: Recipe cards display essential information at a glance (calories, servings, ingredients)
- **Direct Edit Access**: Edit buttons now open dedicated popup for immediate recipe modification
- **Real-time Nutrition Updates**: Live calculation of nutrition values during recipe editing
- **Improved Workflow**: Streamlined process from recipe creation to management and editing
- **Enhanced Data Persistence**: Better storage and retrieval of recipe data with comprehensive ingredient information

### Better User Experience
- Time-based meal type suggestions
- Consolidated modal interfaces
- Improved error messages
- Loading indicators and progress feedback
- Streamlined recipe management workflow with direct edit access
- Intuitive recipe organization with visual recipe cards
- Enhanced recipe editing experience with dedicated popup interface

## Configuration

### Default Settings
- Selected date: Yesterday (for easier logging)
- Default meal type: Auto-selected based on time
- Unit system: Imperial (can be changed to metric)
- Weekly weight loss goal: 1 lb/week
- Daily calorie deficit: 500 calories

### Customizable Options
- Unit system (metric/imperial)
- Daily calorie goals
- Weekly weight loss targets
- Exercise calorie adjustments
- Meal type preferences

## Browser Compatibility
- Modern browsers with ES6+ support
- LocalStorage for data persistence
- Fetch API for server communication
- Responsive design for mobile devices

## Server Integration
- Node.js backend for ingredient/recipe management
- Excel export functionality
- API endpoints for data management
- File-based fallbacks for offline use