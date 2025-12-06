const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const ExcelJS = require('exceljs');
const { execSync } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Git helper function to commit changes
async function commitChanges(files, message) {
    try {
        const cwd = __dirname;
        for (const file of files) {
            execSync(`git add "${file}"`, { cwd });
        }
        execSync(`git commit -m "${message}"`, { cwd });
        execSync(`git push`, { cwd });
        console.log(`✅ Git commit: ${message}`);
        return true;
    } catch (error) {
        console.error('⚠️ Git commit failed:', error.message);
        // Don't throw - app should continue working even if git fails
        return false;
    }
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
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
        await commitChanges(['rawingredients.json'], `✏️ Add ingredient: ${ingredientData.name}`);
        
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
        await commitChanges(['rawingredients.json'], `📝 Update ingredient: ${ingredientData.name}`);
        
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
        await commitChanges(['rawingredients.json'], `🗑️ Delete ingredient: ${ingredientName}`);
        
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
        await commitChanges(['recipes.json'], `🍳 Add recipe: ${recipeData.name}`);
        
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
        await commitChanges(['recipes.json'], `🔄 Update recipe: ${recipeData.name}`);
        
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
        await commitChanges(['recipes.json'], `🗑️ Delete recipe: ${key}`);
        
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

// JSON Export for Daily Logs (Download as JSON file)
app.post('/api/export-json', async (req, res) => {
    try {
        const { mealsByDate, startDate, endDate, filename } = req.body;
        
        if (!mealsByDate || typeof mealsByDate !== 'object') {
            return res.status(400).json({ error: 'Invalid meals data' });
        }
        
        // Filter by date range if provided
        let filteredMeals = mealsByDate;
        if (startDate && endDate) {
            filteredMeals = {};
            Object.keys(mealsByDate).forEach(dateKey => {
                if (dateKey >= startDate && dateKey <= endDate) {
                    filteredMeals[dateKey] = mealsByDate[dateKey];
                }
            });
        }
        
        // Create export object with metadata
        const exportData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                version: '1.0',
                appName: 'Food Diary',
                format: 'json',
                totalDays: Object.keys(filteredMeals).length,
                totalMeals: Object.values(filteredMeals).reduce((sum, meals) => sum + (Array.isArray(meals) ? meals.length : 0), 0),
                dateRange: {
                    from: startDate || Object.keys(filteredMeals).sort()[0] || null,
                    to: endDate || Object.keys(filteredMeals).sort().pop() || null
                }
            },
            meals: filteredMeals
        };
        
        // Set headers for file download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename || 'food-diary-export.json'}"`);
        
        res.json(exportData);
        
        console.log(`✅ JSON export: ${Object.keys(filteredMeals).length} days exported`);
        
    } catch (error) {
        console.error('Error exporting JSON:', error);
        res.status(500).json({ error: 'Failed to export JSON' });
    }
});

// Auto-save JSON export to tracker_json folder
app.post('/api/auto-export-json', async (req, res) => {
    try {
        const { mealsByDate, startDate, endDate } = req.body;
        
        if (!mealsByDate || typeof mealsByDate !== 'object') {
            return res.status(400).json({ error: 'Invalid meals data' });
        }
        
        // Ensure tracker_json folder exists
        const trackerJsonDir = path.join(__dirname, 'tracker_json');
        try {
            await fs.mkdir(trackerJsonDir, { recursive: true });
        } catch (err) {
            console.error('Error creating tracker_json directory:', err);
        }
        
        // Filter by date range if provided
        let filteredMeals = mealsByDate;
        if (startDate && endDate) {
            filteredMeals = {};
            Object.keys(mealsByDate).forEach(dateKey => {
                if (dateKey >= startDate && dateKey <= endDate) {
                    filteredMeals[dateKey] = mealsByDate[dateKey];
                }
            });
        }
        
        // Create export object with metadata
        const exportData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                version: '1.0',
                appName: 'Food Diary',
                format: 'json',
                totalDays: Object.keys(filteredMeals).length,
                totalMeals: Object.values(filteredMeals).reduce((sum, meals) => sum + (Array.isArray(meals) ? meals.length : 0), 0),
                dateRange: {
                    from: startDate || Object.keys(filteredMeals).sort()[0] || null,
                    to: endDate || Object.keys(filteredMeals).sort().pop() || null
                }
            },
            meals: filteredMeals
        };
        
        // Generate filename with YYYY-MM format (monthly grouping)
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
        const filename = `food-diary-${yearMonth}.json`;
        const filepath = path.join(trackerJsonDir, filename);
        
        // Write to file
        await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));
        
        console.log(`✅ Auto-export JSON saved to tracker_json/${filename}`);
        
        res.json({ 
            success: true, 
            filename: filename,
            path: filepath,
            message: `Export saved to tracker_json/${filename}`,
            totalMeals: exportData.metadata.totalMeals
        });
        
    } catch (error) {
        console.error('Error auto-exporting JSON:', error);
        res.status(500).json({ error: 'Failed to auto-export JSON: ' + error.message });
    }
});

// JSON Import for Daily Logs (Upload and merge)
app.post('/api/import-json', async (req, res) => {
    try {
        const { meals: importedMeals, mergeStrategy } = req.body;
        
        if (!importedMeals || typeof importedMeals !== 'object') {
            return res.status(400).json({ error: 'Invalid meals data in import file' });
        }
        
        // Read current meals
        let currentMeals = {};
        try {
            const data = await fs.readFile('meals.json', 'utf8');
            currentMeals = JSON.parse(data);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        
        let mergedMeals = currentMeals;
        let importedCount = 0;
        let skippedCount = 0;
        const strategy = mergeStrategy || 'merge'; // 'merge', 'replace', or 'merge-duplicates'
        
        switch (strategy) {
            case 'replace':
                // Replace all meals with imported data
                mergedMeals = importedMeals;
                importedCount = Object.values(importedMeals).reduce((sum, meals) => sum + (Array.isArray(meals) ? meals.length : 0), 0);
                break;
                
            case 'merge':
                // Merge without overwriting existing meals
                Object.entries(importedMeals).forEach(([date, dateMeals]) => {
                    if (!mergedMeals[date]) {
                        mergedMeals[date] = [];
                    }
                    
                    if (Array.isArray(dateMeals)) {
                        dateMeals.forEach(meal => {
                            // Check if meal already exists (by id)
                            const exists = mergedMeals[date].some(m => m.id === meal.id);
                            if (!exists) {
                                mergedMeals[date].push(meal);
                                importedCount++;
                            } else {
                                skippedCount++;
                            }
                        });
                    }
                });
                break;
                
            case 'merge-duplicates':
                // Merge and replace if meal id already exists
                Object.entries(importedMeals).forEach(([date, dateMeals]) => {
                    if (!mergedMeals[date]) {
                        mergedMeals[date] = [];
                    }
                    
                    if (Array.isArray(dateMeals)) {
                        dateMeals.forEach(meal => {
                            const existingIndex = mergedMeals[date].findIndex(m => m.id === meal.id);
                            if (existingIndex === -1) {
                                mergedMeals[date].push(meal);
                                importedCount++;
                            } else {
                                mergedMeals[date][existingIndex] = meal;
                                importedCount++;
                            }
                        });
                    }
                });
                break;
                
            default:
                return res.status(400).json({ error: 'Invalid merge strategy. Use "merge", "replace", or "merge-duplicates"' });
        }
        
        // Write back to file
        await fs.writeFile('meals.json', JSON.stringify(mergedMeals, null, 2));
        
        // Commit to git
        await commitChanges(['meals.json'], `📥 Import daily logs: ${importedCount} meals`);
        
        res.json({
            success: true,
            message: `Import completed with strategy "${strategy}"`,
            importedCount,
            skippedCount,
            strategy,
            datesAffected: Object.keys(importedMeals).length
        });
        
        console.log(`✅ JSON import: ${importedCount} meals imported, ${skippedCount} skipped`);
        
    } catch (error) {
        console.error('Error importing JSON:', error);
        res.status(500).json({ error: 'Failed to import JSON', details: error.message });
    }
});

// Excel Export API endpoint
app.post('/api/export-excel', async (req, res) => {
    try {
        console.log('📥 EXPORT_SERVER: Excel export request received:', {
            timestamp: new Date().toISOString(),
            hasBody: !!req.body,
            bodyKeys: req.body ? Object.keys(req.body) : [],
            mealsByDateKeys: req.body?.mealsByDate ? Object.keys(req.body.mealsByDate).length : 0,
            filename: req.body?.filename,
            startDate: req.body?.startDate,
            endDate: req.body?.endDate,
            requestSize: JSON.stringify(req.body || {}).length
        });
        
        const { mealsByDate, startDate, endDate, filename } = req.body;
        
        console.log('📊 EXPORT_SERVER: Validating request data...');
        // Validation
        if (!mealsByDate || typeof mealsByDate !== 'object') {
            console.error('❌ EXPORT_SERVER: Invalid meals data:', {
                mealsByDateType: typeof mealsByDate,
                mealsByDateExists: !!mealsByDate,
                requestBodyKeys: Object.keys(req.body || {})
            });
            return res.status(400).json({ error: 'Invalid meal data provided' });
        }
        
        const dates = Object.keys(mealsByDate).sort();
        console.log('📅 EXPORT_SERVER: Processing dates:', {
            totalDates: dates.length,
            dateRange: dates.length > 0 ? `${dates[0]} to ${dates[dates.length - 1]}` : 'none',
            sampleDates: dates.slice(0, 5),
            startDate: startDate,
            endDate: endDate
        });
        
        // DIAGNOSTIC LOGGING - Check for December 3rd specifically
        const dec3Data = mealsByDate['2025-12-03'];
        console.log('🔍 EXPORT_DEBUG: December 3rd data check:', {
            hasDecember3Data: !!dec3Data,
            december3MealCount: dec3Data?.length || 0,
            december3Meals: dec3Data?.map(m => ({ 
                description: m.description, 
                time: m.time,
                mealType: m.mealType,
                source: m.source
            })) || []
        });
        
        if (dates.length === 0) {
            console.error('❌ EXPORT_SERVER: No meal data found');
            return res.status(400).json({ error: 'No meal data found for export' });
        }
        
        console.log('📊 EXPORT_SERVER: Starting Excel export generation...');
        
        // Generate filename and path - use YYYY-MM format
        let exportFilename = filename;
        if (!exportFilename) {
            // Determine the month from the data being exported
            const firstDate = dates[0];
            const date = new Date(firstDate + 'T00:00:00');
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            exportFilename = `${yearMonth}.xlsx`;
        }
        const filePath = path.join(__dirname, 'trackers', exportFilename);
        
        console.log('📁 EXPORT_SERVER: File path:', filePath);
        
        // Check if file already exists
        let workbook;
        let fileExistedAtStart = false;
        let isNewFileCreation = false;
        
        try {
            await fs.access(filePath);
            fileExistedAtStart = true;
            console.log('📄 EXPORT_SERVER: Existing file found, will append data');
            
            // Load existing workbook
            workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
        } catch (error) {
            console.log('📄 EXPORT_SERVER: Creating new file');
            fileExistedAtStart = false;
            isNewFileCreation = true;
            
            // Create new workbook
            workbook = new ExcelJS.Workbook();
            workbook.creator = 'Food Diary App';
            workbook.lastModifiedBy = 'Food Diary App';
            workbook.created = new Date();
            workbook.modified = new Date();
        }
        
        console.log('📊 EXPORT_SERVER: Creating separate sheets per date...');
        
        // Create sheets for each individual date
        const sortedDates = dates.sort();
        let totalMealsProcessed = 0;
        let duplicateDatesSkipped = [];
        
        console.log('📅 EXPORT_SERVER: Processing individual dates:', {
            totalDates: sortedDates.length,
            dateRange: sortedDates.length > 0 ? `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}` : 'none',
            sampleDates: sortedDates.slice(0, 5)
        });
        
        sortedDates.forEach(dateKey => {
            const meals = mealsByDate[dateKey];
            if (!meals || meals.length === 0) return;
            
            const date = new Date(dateKey + 'T00:00:00');
            const sheetName = dateKey; // Use YYYY-MM-DD format as sheet name
            
            console.log('📄 EXPORT_SERVER: Processing date sheet:', {
                dateKey,
                sheetName,
                mealCount: meals.length,
                fileExistedAtStart
            });
            
            // Check if worksheet already exists when appending
            let worksheet = fileExistedAtStart ? workbook.getWorksheet(sheetName) : null;
            let isDuplicateDate = false;
            
            if (worksheet) {
                // Sheet already exists - this is a duplicate date
                isDuplicateDate = true;
                duplicateDatesSkipped.push(dateKey);
                console.log('⚠️ DUPLICATE_CHECK: Sheet already exists for date:', dateKey, '- skipping to prevent duplication');
                return;
            }
            
            // Create new worksheet for this date
            worksheet = workbook.addWorksheet(sheetName);
            
            // Set column widths
            worksheet.columns = [
                { header: 'Time', key: 'time', width: 10 },
                { header: 'Meal Type', key: 'mealType', width: 15 },
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
            
            // Add date header row
            const dateHeaderRow = worksheet.addRow({
                time: '',
                mealType: '',
                description: `📅 ${date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}`,
                calories: '',
                protein: '',
                carbs: '',
                fat: '',
                fiber: '',
                source: '',
                ingredients: ''
            });
            
            dateHeaderRow.font = { bold: true, size: 14 };
            dateHeaderRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'F2F2F2' }
            };
            
            // Add empty row for spacing
            worksheet.addRow({});
            
            let dayTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
            
            // Add meals for this day
            meals.forEach((meal, mealIndex) => {
                const mealTime = new Date(meal.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                });
                
                // Format ingredients list - handle both array and string formats
                let ingredientsList = '';
                if (meal.ingredients) {
                    if (Array.isArray(meal.ingredients) && meal.ingredients.length > 0) {
                        // Handle array format (expected format)
                        ingredientsList = meal.ingredients.map(ing =>
                            `${ing.name} (${ing.quantity}x ${ing.measurement})`
                        ).join('; ');
                    } else if (typeof meal.ingredients === 'string' && meal.ingredients.trim()) {
                        // Handle string format (fallback for compatibility)
                        ingredientsList = meal.ingredients.trim();
                    }
                }
                
                const row = worksheet.addRow({
                    time: mealTime,
                    mealType: meal.mealType || 'Lunch',
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
            });
            
            // Add day summary row
            worksheet.addRow({});
            const summaryRow = worksheet.addRow({
                time: '',
                mealType: '',
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
                fgColor: { argb: '4472C4' }
            };
            summaryRow.font.color = { argb: 'FFFFFF' };
            
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
            
            totalMealsProcessed += meals.length;
        });
        
        // If no data found, create a summary sheet
        if (sortedDates.length === 0) {
            const worksheet = workbook.addWorksheet('No Data');
            worksheet.addRow(['No meal data found for the selected date range.']);
            worksheet.getCell('A1').font = { bold: true, size: 14 };
        }
        
        console.log('✅ EXPORT_SERVER: Date sheets created:', {
            totalDatesProcessed: sortedDates.length,
            totalMealsProcessed,
            duplicateDatesSkipped: duplicateDatesSkipped.length,
            skippedDates: duplicateDatesSkipped
        });
        
        console.log('✅ EXPORT_SERVER: Excel workbook created successfully');
        
        console.log('💾 EXPORT_SERVER: Saving file to trackers folder:', {
            filename: exportFilename,
            filePath: filePath,
            fileExistedAtStart: fileExistedAtStart,
            totalSheets: sortedDates.length - duplicateDatesSkipped.length
        });
        
        // Save workbook to trackers folder
        await workbook.xlsx.writeFile(filePath);
        
        console.log('✅ EXPORT_SERVER: Excel file saved successfully:', filePath);
        
        // Send success response instead of file download
        res.json({
            success: true,
            message: fileExistedAtStart ?
                `Data appended to existing file: ${exportFilename}` :
                `New file created: ${exportFilename}`,
            filename: exportFilename,
            filePath: `trackers/${exportFilename}`,
            fileExists: fileExistedAtStart,
            isNewFileCreation: isNewFileCreation,
            totalSheets: sortedDates.length - duplicateDatesSkipped.length,
            totalMeals: totalMealsProcessed,
            duplicateDatesSkipped: duplicateDatesSkipped.length,
            skippedDates: duplicateDatesSkipped
        });
        
    } catch (error) {
        console.error('❌ EXPORT_SERVER: Excel export error:', {
            errorMessage: error.message,
            errorStack: error.stack,
            errorName: error.name,
            timestamp: new Date().toISOString()
        });
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