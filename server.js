const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const ExcelJS = require('exceljs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'food_tracker.html'));
});

// API Routes for ingredient management
app.get('/api/ingredients', async (req, res) => {
    try {
        const data = await fs.readFile('rawingredients.json', 'utf8');
        const ingredients = JSON.parse(data);
        res.json(ingredients);
    } catch (error) {
        console.error('Error reading ingredients:', error);
        res.status(500).json({ error: 'Failed to read ingredients' });
    }
});

app.post('/api/ingredients', async (req, res) => {
    try {
        const { category, ingredientKey, ingredientData } = req.body;
        
        // Validation
        if (!category || !ingredientKey || !ingredientData) {
            return res.status(400).json({ error: 'Missing required fields: category, ingredientKey, ingredientData' });
        }
        
        if (!ingredientData.name || !ingredientData.measurements) {
            return res.status(400).json({ error: 'Ingredient data must include name and measurements' });
        }
        
        // Read current ingredients
        const data = await fs.readFile('rawingredients.json', 'utf8');
        const ingredients = JSON.parse(data);
        
        // Ensure category exists
        if (!ingredients.basic_ingredients[category]) {
            ingredients.basic_ingredients[category] = {};
        }
        
        // Add new ingredient
        ingredients.basic_ingredients[category][ingredientKey] = ingredientData;
        
        // Write back to file
        await fs.writeFile('rawingredients.json', JSON.stringify(ingredients, null, 2));
        
        res.json({ 
            success: true, 
            message: `Ingredient "${ingredientData.name}" added successfully to ${category}`,
            ingredient: ingredientData
        });
        
    } catch (error) {
        console.error('Error adding ingredient:', error);
        res.status(500).json({ error: 'Failed to add ingredient' });
    }
});

app.put('/api/ingredients/:category/:ingredientKey', async (req, res) => {
    try {
        const { category, ingredientKey } = req.params;
        const { ingredientData } = req.body;
        
        // Validation
        if (!ingredientData || !ingredientData.name || !ingredientData.measurements) {
            return res.status(400).json({ error: 'Invalid ingredient data' });
        }
        
        // Read current ingredients
        const data = await fs.readFile('rawingredients.json', 'utf8');
        const ingredients = JSON.parse(data);
        
        // Check if ingredient exists
        if (!ingredients.basic_ingredients[category] || !ingredients.basic_ingredients[category][ingredientKey]) {
            return res.status(404).json({ error: 'Ingredient not found' });
        }
        
        // Update ingredient
        ingredients.basic_ingredients[category][ingredientKey] = ingredientData;
        
        // Write back to file
        await fs.writeFile('rawingredients.json', JSON.stringify(ingredients, null, 2));
        
        res.json({ 
            success: true, 
            message: `Ingredient "${ingredientData.name}" updated successfully`,
            ingredient: ingredientData
        });
        
    } catch (error) {
        console.error('Error updating ingredient:', error);
        res.status(500).json({ error: 'Failed to update ingredient' });
    }
});

app.delete('/api/ingredients/:category/:ingredientKey', async (req, res) => {
    try {
        const { category, ingredientKey } = req.params;
        
        // Read current ingredients
        const data = await fs.readFile('rawingredients.json', 'utf8');
        const ingredients = JSON.parse(data);
        
        // Check if ingredient exists
        if (!ingredients.basic_ingredients[category] || !ingredients.basic_ingredients[category][ingredientKey]) {
            return res.status(404).json({ error: 'Ingredient not found' });
        }
        
        const ingredientName = ingredients.basic_ingredients[category][ingredientKey].name;
        
        // Delete ingredient
        delete ingredients.basic_ingredients[category][ingredientKey];
        
        // Write back to file
        await fs.writeFile('rawingredients.json', JSON.stringify(ingredients, null, 2));
        
        res.json({ 
            success: true, 
            message: `Ingredient "${ingredientName}" deleted successfully`
        });
        
    } catch (error) {
        console.error('Error deleting ingredient:', error);
        res.status(500).json({ error: 'Failed to delete ingredient' });
    }
});

// Get available categories
app.get('/api/categories', async (req, res) => {
    try {
        const data = await fs.readFile('rawingredients.json', 'utf8');
        const ingredients = JSON.parse(data);
        const categories = Object.keys(ingredients.basic_ingredients);
        res.json({ categories });
    } catch (error) {
        console.error('Error reading categories:', error);
        res.status(500).json({ error: 'Failed to read categories' });
    }
});

// Recipe Management API Routes
app.get('/api/recipes', async (req, res) => {
    try {
        const data = await fs.readFile('recipes.json', 'utf8');
        const recipes = JSON.parse(data);
        res.json(recipes);
    } catch (error) {
        console.error('Error reading recipes:', error);
        res.status(500).json({ error: 'Failed to read recipes' });
    }
});

app.post('/api/recipes', async (req, res) => {
    try {
        const { recipeKey, recipeData } = req.body;
        
        // Validation
        if (!recipeKey || !recipeData) {
            return res.status(400).json({ error: 'Missing required fields: recipeKey, recipeData' });
        }
        
        if (!recipeData.name || !recipeData.total_per_serving) {
            return res.status(400).json({ error: 'Recipe data must include name and total_per_serving' });
        }
        
        // Read current recipes
        const data = await fs.readFile('recipes.json', 'utf8');
        const recipes = JSON.parse(data);
        
        // Ensure dishes section exists
        if (!recipes.dishes) {
            recipes.dishes = {};
        }
        
        // Add new recipe
        recipes.dishes[recipeKey] = recipeData;
        
        // Write back to file
        await fs.writeFile('recipes.json', JSON.stringify(recipes, null, 2));
        
        res.json({
            success: true,
            message: `Recipe "${recipeData.name}" added successfully`,
            recipe: recipeData
        });
        
    } catch (error) {
        console.error('Error adding recipe:', error);
        res.status(500).json({ error: 'Failed to add recipe' });
    }
});

app.put('/api/recipes/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const { recipeData } = req.body;
        
        // Validation
        if (!recipeData || !recipeData.name || !recipeData.total_per_serving) {
            return res.status(400).json({ error: 'Invalid recipe data' });
        }
        
        // Read current recipes
        const data = await fs.readFile('recipes.json', 'utf8');
        const recipes = JSON.parse(data);
        
        // Check if recipe exists
        if (!recipes.dishes || !recipes.dishes[key]) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        
        // Update recipe
        recipes.dishes[key] = recipeData;
        
        // Write back to file
        await fs.writeFile('recipes.json', JSON.stringify(recipes, null, 2));
        
        res.json({
            success: true,
            message: `Recipe "${recipeData.name}" updated successfully`,
            recipe: recipeData
        });
        
    } catch (error) {
        console.error('Error updating recipe:', error);
        res.status(500).json({ error: 'Failed to update recipe' });
    }
});

app.delete('/api/recipes/:key', async (req, res) => {
    try {
        const { key } = req.params;
        
        // Read current recipes
        const data = await fs.readFile('recipes.json', 'utf8');
        const recipes = JSON.parse(data);
        
        // Check if recipe exists
        if (!recipes.dishes || !recipes.dishes[key]) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        
        const recipeName = recipes.dishes[key].name;
        
        // Delete recipe
        delete recipes.dishes[key];
        
        // Write back to file
        await fs.writeFile('recipes.json', JSON.stringify(recipes, null, 2));
        
        res.json({
            success: true,
            message: `Recipe "${recipeName}" deleted successfully`
        });
        
    } catch (error) {
        console.error('Error deleting recipe:', error);
        res.status(500).json({ error: 'Failed to delete recipe' });
    }
});

// Meal Management API Routes
app.get('/api/meals', async (req, res) => {
    try {
        const { date, startDate, endDate } = req.query;
        
        // Read meals from file
        let meals = {};
        try {
            const data = await fs.readFile('meals.json', 'utf8');
            meals = JSON.parse(data);
        } catch (error) {
            // If file doesn't exist, return empty meals object
            if (error.code === 'ENOENT') {
                meals = {};
            } else {
                throw error;
            }
        }
        
        // Filter meals based on query parameters
        if (date) {
            // Return meals for specific date
            const dateMeals = meals[date] || [];
            res.json({ [date]: dateMeals });
        } else if (startDate && endDate) {
            // Return meals for date range
            const filteredMeals = {};
            Object.keys(meals).forEach(dateKey => {
                if (dateKey >= startDate && dateKey <= endDate) {
                    filteredMeals[dateKey] = meals[dateKey];
                }
            });
            res.json(filteredMeals);
        } else {
            // Return all meals
            res.json(meals);
        }
        
    } catch (error) {
        console.error('Error reading meals:', error);
        res.status(500).json({ error: 'Failed to read meals' });
    }
});

app.post('/api/meals', async (req, res) => {
    try {
        const { date, meal } = req.body;
        
        // Validation
        if (!date || !meal) {
            return res.status(400).json({ error: 'Missing required fields: date, meal' });
        }
        
        if (!meal.id || !meal.description || !meal.nutrition) {
            return res.status(400).json({ error: 'Meal must include id, description, and nutrition data' });
        }
        
        // Read current meals
        let meals = {};
        try {
            const data = await fs.readFile('meals.json', 'utf8');
            meals = JSON.parse(data);
        } catch (error) {
            // If file doesn't exist, start with empty object
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        
        // Ensure date array exists
        if (!meals[date]) {
            meals[date] = [];
        }
        
        // Add timestamp if not present
        if (!meal.timestamp) {
            meal.timestamp = new Date().toISOString();
        }
        
        // Add meal to date
        meals[date].push(meal);
        
        // Write back to file
        await fs.writeFile('meals.json', JSON.stringify(meals, null, 2));
        
        res.json({
            success: true,
            message: `Meal "${meal.description}" added successfully to ${date}`,
            meal: meal,
            date: date
        });
        
    } catch (error) {
        console.error('Error adding meal:', error);
        res.status(500).json({ error: 'Failed to add meal' });
    }
});

app.put('/api/meals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { date, meal } = req.body;
        
        // Validation
        if (!date || !meal) {
            return res.status(400).json({ error: 'Missing required fields: date, meal' });
        }
        
        if (!meal.description || !meal.nutrition) {
            return res.status(400).json({ error: 'Meal must include description and nutrition data' });
        }
        
        // Read current meals
        const data = await fs.readFile('meals.json', 'utf8');
        const meals = JSON.parse(data);
        
        // Find and update the meal
        let mealFound = false;
        let oldDate = null;
        
        // Search through all dates to find the meal
        Object.keys(meals).forEach(dateKey => {
            const mealIndex = meals[dateKey].findIndex(m => m.id == id);
            if (mealIndex !== -1) {
                oldDate = dateKey;
                
                // If date changed, move meal to new date
                if (dateKey !== date) {
                    // Remove from old date
                    meals[dateKey].splice(mealIndex, 1);
                    
                    // Add to new date
                    if (!meals[date]) {
                        meals[date] = [];
                    }
                    meal.id = parseInt(id);
                    meals[date].push(meal);
                } else {
                    // Update in same date
                    meal.id = parseInt(id);
                    meals[dateKey][mealIndex] = meal;
                }
                
                mealFound = true;
            }
        });
        
        if (!mealFound) {
            return res.status(404).json({ error: 'Meal not found' });
        }
        
        // Clean up empty date arrays
        if (oldDate && oldDate !== date && meals[oldDate] && meals[oldDate].length === 0) {
            delete meals[oldDate];
        }
        
        // Write back to file
        await fs.writeFile('meals.json', JSON.stringify(meals, null, 2));
        
        res.json({
            success: true,
            message: `Meal "${meal.description}" updated successfully`,
            meal: meal,
            date: date,
            oldDate: oldDate
        });
        
    } catch (error) {
        console.error('Error updating meal:', error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'No meals file found' });
        } else {
            res.status(500).json({ error: 'Failed to update meal' });
        }
    }
});

app.delete('/api/meals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { date } = req.query;
        
        // Read current meals
        const data = await fs.readFile('meals.json', 'utf8');
        const meals = JSON.parse(data);
        
        let mealFound = false;
        let deletedMeal = null;
        let mealDate = null;
        
        if (date) {
            // Delete from specific date
            if (meals[date]) {
                const mealIndex = meals[date].findIndex(m => m.id == id);
                if (mealIndex !== -1) {
                    deletedMeal = meals[date][mealIndex];
                    meals[date].splice(mealIndex, 1);
                    mealDate = date;
                    mealFound = true;
                    
                    // Clean up empty date array
                    if (meals[date].length === 0) {
                        delete meals[date];
                    }
                }
            }
        } else {
            // Search through all dates
            Object.keys(meals).forEach(dateKey => {
                const mealIndex = meals[dateKey].findIndex(m => m.id == id);
                if (mealIndex !== -1) {
                    deletedMeal = meals[dateKey][mealIndex];
                    meals[dateKey].splice(mealIndex, 1);
                    mealDate = dateKey;
                    mealFound = true;
                    
                    // Clean up empty date array
                    if (meals[dateKey].length === 0) {
                        delete meals[dateKey];
                    }
                }
            });
        }
        
        if (!mealFound) {
            return res.status(404).json({ error: 'Meal not found' });
        }
        
        // Write back to file
        await fs.writeFile('meals.json', JSON.stringify(meals, null, 2));
        
        res.json({
            success: true,
            message: `Meal "${deletedMeal.description}" deleted successfully`,
            deletedMeal: deletedMeal,
            date: mealDate
        });
        
    } catch (error) {
        console.error('Error deleting meal:', error);
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'No meals file found' });
        } else {
            res.status(500).json({ error: 'Failed to delete meal' });
        }
    }
});

// Bulk operations for meals
app.post('/api/meals/bulk', async (req, res) => {
    try {
        const { operation, meals: mealsData } = req.body;
        
        if (!operation || !mealsData) {
            return res.status(400).json({ error: 'Missing required fields: operation, meals' });
        }
        
        // Read current meals
        let meals = {};
        try {
            const data = await fs.readFile('meals.json', 'utf8');
            meals = JSON.parse(data);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        
        let processedCount = 0;
        
        switch (operation) {
            case 'import':
                // Import meals from frontend localStorage format
                Object.entries(mealsData).forEach(([date, dateMeals]) => {
                    if (!meals[date]) {
                        meals[date] = [];
                    }
                    
                    dateMeals.forEach(meal => {
                        // Check if meal already exists (by id)
                        const existingIndex = meals[date].findIndex(m => m.id === meal.id);
                        if (existingIndex === -1) {
                            meals[date].push(meal);
                            processedCount++;
                        }
                    });
                });
                break;
                
            case 'sync':
                // Sync with frontend data (replace server data)
                meals = { ...mealsData };
                processedCount = Object.values(mealsData).reduce((total, dateMeals) => total + dateMeals.length, 0);
                break;
                
            default:
                return res.status(400).json({ error: 'Invalid operation. Use "import" or "sync"' });
        }
        
        // Write back to file
        await fs.writeFile('meals.json', JSON.stringify(meals, null, 2));
        
        res.json({
            success: true,
            message: `Bulk ${operation} completed successfully`,
            processedCount: processedCount,
            operation: operation
        });
        
    } catch (error) {
        console.error('Error in bulk meal operation:', error);
        res.status(500).json({ error: 'Failed to perform bulk meal operation' });
    }
});

// Get meal statistics
app.get('/api/meals/stats', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Read meals from file
        let meals = {};
        try {
            const data = await fs.readFile('meals.json', 'utf8');
            meals = JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                meals = {};
            } else {
                throw error;
            }
        }
        
        // Filter by date range if provided
        let filteredMeals = meals;
        if (startDate && endDate) {
            filteredMeals = {};
            Object.keys(meals).forEach(dateKey => {
                if (dateKey >= startDate && dateKey <= endDate) {
                    filteredMeals[dateKey] = meals[dateKey];
                }
            });
        }
        
        // Calculate statistics
        let totalMeals = 0;
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;
        let totalFiber = 0;
        let daysWithData = 0;
        
        const sourceCounts = {};
        const dailyStats = {};
        
        Object.entries(filteredMeals).forEach(([date, dateMeals]) => {
            if (dateMeals.length > 0) {
                daysWithData++;
                
                let dayCalories = 0;
                let dayProtein = 0;
                let dayCarbs = 0;
                let dayFat = 0;
                let dayFiber = 0;
                
                dateMeals.forEach(meal => {
                    totalMeals++;
                    totalCalories += meal.nutrition.calories || 0;
                    totalProtein += meal.nutrition.protein || 0;
                    totalCarbs += meal.nutrition.carbs || 0;
                    totalFat += meal.nutrition.fat || 0;
                    totalFiber += meal.nutrition.fiber || 0;
                    
                    dayCalories += meal.nutrition.calories || 0;
                    dayProtein += meal.nutrition.protein || 0;
                    dayCarbs += meal.nutrition.carbs || 0;
                    dayFat += meal.nutrition.fat || 0;
                    dayFiber += meal.nutrition.fiber || 0;
                    
                    // Count sources
                    const source = meal.source || 'unknown';
                    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
                });
                
                dailyStats[date] = {
                    meals: dateMeals.length,
                    calories: Math.round(dayCalories),
                    protein: Math.round(dayProtein * 10) / 10,
                    carbs: Math.round(dayCarbs * 10) / 10,
                    fat: Math.round(dayFat * 10) / 10,
                    fiber: Math.round(dayFiber * 10) / 10
                };
            }
        });
        
        // Calculate averages
        const avgCaloriesPerDay = daysWithData > 0 ? Math.round(totalCalories / daysWithData) : 0;
        const avgMealsPerDay = daysWithData > 0 ? Math.round((totalMeals / daysWithData) * 10) / 10 : 0;
        const avgProteinPerDay = daysWithData > 0 ? Math.round((totalProtein / daysWithData) * 10) / 10 : 0;
        
        res.json({
            summary: {
                totalMeals,
                totalCalories: Math.round(totalCalories),
                totalProtein: Math.round(totalProtein * 10) / 10,
                totalCarbs: Math.round(totalCarbs * 10) / 10,
                totalFat: Math.round(totalFat * 10) / 10,
                totalFiber: Math.round(totalFiber * 10) / 10,
                daysWithData,
                avgCaloriesPerDay,
                avgMealsPerDay,
                avgProteinPerDay
            },
            sourceCounts,
            dailyStats,
            dateRange: {
                startDate: startDate || Object.keys(filteredMeals).sort()[0] || null,
                endDate: endDate || Object.keys(filteredMeals).sort().pop() || null
            }
        });
        
    } catch (error) {
        console.error('Error calculating meal statistics:', error);
        res.status(500).json({ error: 'Failed to calculate meal statistics' });
    }
});

// Excel Export API endpoint
app.post('/api/export-excel', async (req, res) => {
    try {
        const { mealsByDate, startDate, endDate, filename } = req.body;
        
        // Validation
        if (!mealsByDate || typeof mealsByDate !== 'object') {
            return res.status(400).json({ error: 'Invalid meal data provided' });
        }
        
        console.log('📊 Starting Excel export generation...');
        console.log('📅 Date range:', startDate, 'to', endDate);
        console.log('📋 Total dates with data:', Object.keys(mealsByDate).length);
        
        // Create workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Food Diary App';
        workbook.lastModifiedBy = 'Food Diary App';
        workbook.created = new Date();
        workbook.modified = new Date();
        
        // Group meals by month
        const mealsByMonth = {};
        Object.entries(mealsByDate).forEach(([dateKey, meals]) => {
            if (meals && meals.length > 0) {
                const date = new Date(dateKey + 'T00:00:00');
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
                
                if (!mealsByMonth[monthKey]) {
                    mealsByMonth[monthKey] = {
                        name: monthName,
                        dates: {}
                    };
                }
                mealsByMonth[monthKey].dates[dateKey] = meals;
            }
        });
        
        console.log('📊 Months to process:', Object.keys(mealsByMonth).length);
        
        // Create sheets for each month
        Object.entries(mealsByMonth).forEach(([monthKey, monthData]) => {
            const worksheet = workbook.addWorksheet(monthData.name);
            
            // Set column widths
            worksheet.columns = [
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Time', key: 'time', width: 10 },
                { header: 'Meal Description', key: 'description', width: 40 },
                { header: 'Calories', key: 'calories', width: 10 },
                { header: 'Protein (g)', key: 'protein', width: 12 },
                { header: 'Carbs (g)', key: 'carbs', width: 12 },
                { header: 'Fat (g)', key: 'fat', width: 10 },
                { header: 'Fiber (g)', key: 'fiber', width: 10 },
                { header: 'Source', key: 'source', width: 15 },
                { header: 'Ingredients', key: 'ingredients', width: 50 }
            ];
            
            // Style the header row
            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
            headerRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '4472C4' }
            };
            headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
            headerRow.height = 25;
            
            let currentRow = 2;
            let monthTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, mealCount: 0 };
            
            // Sort dates within the month
            const sortedDates = Object.keys(monthData.dates).sort();
            
            sortedDates.forEach(dateKey => {
                const meals = monthData.dates[dateKey];
                const date = new Date(dateKey + 'T00:00:00');
                const formattedDate = date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                });
                
                let dayTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
                let dayStartRow = currentRow;
                
                // Add meals for this day
                meals.forEach(meal => {
                    const mealTime = new Date(meal.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });
                    
                    // Format ingredients list
                    let ingredientsList = '';
                    if (meal.ingredients && meal.ingredients.length > 0) {
                        ingredientsList = meal.ingredients.map(ing =>
                            `${ing.name} (${ing.quantity}x ${ing.measurement})`
                        ).join('; ');
                    }
                    
                    const row = worksheet.addRow({
                        date: formattedDate,
                        time: mealTime,
                        description: meal.description,
                        calories: meal.nutrition.calories,
                        protein: meal.nutrition.protein,
                        carbs: meal.nutrition.carbs,
                        fat: meal.nutrition.fat,
                        fiber: meal.nutrition.fiber,
                        source: meal.source === 'database' ? 'Database' :
                               meal.source === 'ingredients' ? 'Custom Recipe' : 'Manual Entry',
                        ingredients: ingredientsList
                    });
                    
                    // Style data rows
                    row.alignment = { vertical: 'top', wrapText: true };
                    row.height = Math.max(20, Math.ceil(ingredientsList.length / 50) * 15);
                    
                    // Add to day totals
                    dayTotals.calories += meal.nutrition.calories;
                    dayTotals.protein += meal.nutrition.protein;
                    dayTotals.carbs += meal.nutrition.carbs;
                    dayTotals.fat += meal.nutrition.fat;
                    dayTotals.fiber += meal.nutrition.fiber;
                    
                    currentRow++;
                });
                
                // Add day summary row
                if (meals.length > 1) {
                    const summaryRow = worksheet.addRow({
                        date: '',
                        time: '',
                        description: `📊 Daily Total (${meals.length} meals)`,
                        calories: Math.round(dayTotals.calories),
                        protein: Math.round(dayTotals.protein * 10) / 10,
                        carbs: Math.round(dayTotals.carbs * 10) / 10,
                        fat: Math.round(dayTotals.fat * 10) / 10,
                        fiber: Math.round(dayTotals.fiber * 10) / 10,
                        source: 'SUMMARY',
                        ingredients: ''
                    });
                    
                    // Style summary row
                    summaryRow.font = { bold: true };
                    summaryRow.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'E7E6E6' }
                    };
                    currentRow++;
                }
                
                // Add spacing between days
                worksheet.addRow({});
                currentRow++;
                
                // Add to month totals
                monthTotals.calories += dayTotals.calories;
                monthTotals.protein += dayTotals.protein;
                monthTotals.carbs += dayTotals.carbs;
                monthTotals.fat += dayTotals.fat;
                monthTotals.fiber += dayTotals.fiber;
                monthTotals.mealCount += meals.length;
            });
            
            // Add month summary at the end
            worksheet.addRow({});
            const monthSummaryRow = worksheet.addRow({
                date: '',
                time: '',
                description: `🗓️ ${monthData.name} TOTAL (${monthTotals.mealCount} meals)`,
                calories: Math.round(monthTotals.calories),
                protein: Math.round(monthTotals.protein * 10) / 10,
                carbs: Math.round(monthTotals.carbs * 10) / 10,
                fat: Math.round(monthTotals.fat * 10) / 10,
                fiber: Math.round(monthTotals.fiber * 10) / 10,
                source: 'MONTH TOTAL',
                ingredients: ''
            });
            
            // Style month summary
            monthSummaryRow.font = { bold: true, size: 12 };
            monthSummaryRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: '4472C4' }
            };
            monthSummaryRow.font.color = { argb: 'FFFFFF' };
            
            // Add daily averages
            const daysInMonth = sortedDates.length;
            const avgRow = worksheet.addRow({
                date: '',
                time: '',
                description: `📈 Daily Average (${daysInMonth} days)`,
                calories: Math.round(monthTotals.calories / daysInMonth),
                protein: Math.round((monthTotals.protein / daysInMonth) * 10) / 10,
                carbs: Math.round((monthTotals.carbs / daysInMonth) * 10) / 10,
                fat: Math.round((monthTotals.fat / daysInMonth) * 10) / 10,
                fiber: Math.round((monthTotals.fiber / daysInMonth) * 10) / 10,
                source: 'AVERAGE',
                ingredients: ''
            });
            
            avgRow.font = { bold: true, italic: true };
            avgRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'D9E2F3' }
            };
            
            // Add borders to all cells
            worksheet.eachRow((row, rowNumber) => {
                row.eachCell((cell, colNumber) => {
                    cell.border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' }
                    };
                });
            });
            
            // Freeze the header row
            worksheet.views = [{ state: 'frozen', ySplit: 1 }];
        });
        
        // If no data found, create a summary sheet
        if (Object.keys(mealsByMonth).length === 0) {
            const worksheet = workbook.addWorksheet('No Data');
            worksheet.addRow(['No meal data found for the selected date range.']);
            worksheet.getCell('A1').font = { bold: true, size: 14 };
        }
        
        console.log('✅ Excel workbook created successfully');
        
        // Generate filename
        const exportFilename = filename || `Food_Diary_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
        
        // Set response headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${exportFilename}"`);
        
        // Write workbook to response
        await workbook.xlsx.write(res);
        res.end();
        
        console.log('📤 Excel file sent successfully:', exportFilename);
        
    } catch (error) {
        console.error('❌ Error generating Excel export:', error);
        res.status(500).json({
            error: 'Failed to generate Excel export',
            details: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Food Diary Server running on http://localhost:${PORT}`);
    console.log(`📊 API endpoints available:`);
    console.log(`   🥬 INGREDIENTS:`);
    console.log(`      GET  /api/ingredients - Get all ingredients`);
    console.log(`      POST /api/ingredients - Add new ingredient`);
    console.log(`      PUT  /api/ingredients/:category/:key - Update ingredient`);
    console.log(`      DELETE /api/ingredients/:category/:key - Delete ingredient`);
    console.log(`      GET  /api/categories - Get available categories`);
    console.log(`   🍽️ RECIPES:`);
    console.log(`      GET  /api/recipes - Get all recipes`);
    console.log(`      POST /api/recipes - Add new recipe`);
    console.log(`      PUT  /api/recipes/:key - Update recipe`);
    console.log(`      DELETE /api/recipes/:key - Delete recipe`);
    console.log(`   🍛 MEALS:`);
    console.log(`      GET  /api/meals - Get all meals (supports ?date, ?startDate&endDate)`);
    console.log(`      POST /api/meals - Add new meal`);
    console.log(`      PUT  /api/meals/:id - Update meal`);
    console.log(`      DELETE /api/meals/:id - Delete meal (supports ?date)`);
    console.log(`      POST /api/meals/bulk - Bulk import/sync meals`);
    console.log(`      GET  /api/meals/stats - Get meal statistics`);
    console.log(`   📊 EXPORT:`);
    console.log(`      POST /api/export-excel - Export meals to Excel file`);
    console.log(`\n✅ All meal persistence endpoints are now available!`);
});

module.exports = app;