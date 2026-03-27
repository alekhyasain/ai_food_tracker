const express = require('express');
const path = require('path');
const cors = require('cors');
const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const DatabaseService = require('./database/db-service');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database service
const db = new DatabaseService();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.'));

// Initialize database connection
let dbConnected = false;

async function initializeDatabase() {
    try {
        await db.connect();
        dbConnected = true;
        console.log('✅ Database service initialized');
    } catch (error) {
        console.error('❌ Failed to initialize database:', error);
        process.exit(1);
    }
}

// Middleware to check database connection
function requireDB(req, res, next) {
    if (!dbConnected) {
        return res.status(503).json({ error: 'Database not available' });
    }
    next();
}

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'food_tracker.html'));
});

// ============= INGREDIENTS API =============

app.get('/api/ingredients', requireDB, async (req, res) => {
    try {
        const ingredients = await db.getAllIngredients();
        res.json(ingredients);
    } catch (error) {
        console.error('Error reading ingredients:', error);
        res.status(500).json({ error: 'Failed to read ingredients' });
    }
});

app.post('/api/ingredients', requireDB, async (req, res) => {
    try {
        const { category, ingredientKey, ingredientData } = req.body;
        
        if (!category || !ingredientKey || !ingredientData) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (!ingredientData.name || !ingredientData.measurements) {
            return res.status(400).json({ error: 'Invalid ingredient data' });
        }
        
        await db.addIngredient(category, ingredientKey, ingredientData);
        
        res.json({ 
            success: true, 
            message: `Ingredient "${ingredientData.name}" added successfully`
        });
    } catch (error) {
        console.error('Error adding ingredient:', error);
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('ingredient already exists')) {
            // Upsert: merge measurements into existing ingredient
            try {
                const { category, ingredientKey, ingredientData } = req.body;
                const existing = await db.getIngredient(category, ingredientKey);
                if (!existing) {
                    return res.status(500).json({ error: 'Ingredient exists but could not be retrieved' });
                }
                const merged = { ...existing.measurements, ...(ingredientData.measurements || {}) };
                await db.updateIngredient(category, ingredientKey, {
                    name: ingredientData.name || existing.name,
                    measurements: merged
                });
                return res.json({ success: true, message: 'Ingredient updated with new measurements (merged)' });
            } catch (mergeErr) {
                console.error('Error merging measurements on duplicate add:', mergeErr);
                return res.status(500).json({ error: mergeErr.message || 'Failed to merge measurements' });
            }
        }
        res.status(500).json({ error: error.message || 'Failed to add ingredient' });
    }
});

app.put('/api/ingredients/:category/:ingredientKey', requireDB, async (req, res) => {
    try {
        const { category, ingredientKey } = req.params;
        const { ingredientData } = req.body;
        
        if (!ingredientData || !ingredientData.name || !ingredientData.measurements) {
            return res.status(400).json({ error: 'Invalid ingredient data' });
        }
        
        await db.updateIngredient(category, ingredientKey, ingredientData);
        
        res.json({ 
            success: true, 
            message: `Ingredient "${ingredientData.name}" updated successfully`
        });
    } catch (error) {
        console.error('Error updating ingredient:', error);
        res.status(500).json({ error: error.message || 'Failed to update ingredient' });
    }
});

app.delete('/api/ingredients/:category/:ingredientKey', requireDB, async (req, res) => {
    try {
        const { category, ingredientKey } = req.params;
        
        const result = await db.deleteIngredient(category, ingredientKey);
        
        res.json({ 
            success: true, 
            message: `Ingredient "${result.name}" deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting ingredient:', error);
        res.status(500).json({ error: error.message || 'Failed to delete ingredient' });
    }
});

app.get('/api/categories', requireDB, async (req, res) => {
    try {
        const categories = await db.getCategories();
        res.json({ categories });
    } catch (error) {
        console.error('Error reading categories:', error);
        res.status(500).json({ error: 'Failed to read categories' });
    }
});

// ============= RECIPES API =============

app.get('/api/recipes', requireDB, async (req, res) => {
    try {
        const recipes = await db.getAllRecipes();
        res.json(recipes);
    } catch (error) {
        console.error('Error reading recipes:', error);
        res.status(500).json({ error: 'Failed to read recipes' });
    }
});

app.post('/api/recipes', requireDB, async (req, res) => {
    try {
        const { recipeKey, recipeData } = req.body;
        
        if (!recipeKey || !recipeData) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (!recipeData.name || !recipeData.total_per_serving) {
            return res.status(400).json({ error: 'Invalid recipe data' });
        }
        
        await db.addRecipe(recipeKey, recipeData);
        
        res.json({
            success: true,
            message: `Recipe "${recipeData.name}" added successfully`
        });
    } catch (error) {
        console.error('Error adding recipe:', error);
        res.status(500).json({ error: 'Failed to add recipe' });
    }
});

app.put('/api/recipes/:key', requireDB, async (req, res) => {
    try {
        const { key } = req.params;
        const { recipeData } = req.body;
        
        if (!recipeData || !recipeData.name || !recipeData.total_per_serving) {
            return res.status(400).json({ error: 'Invalid recipe data' });
        }
        
        await db.updateRecipe(key, recipeData);
        
        res.json({
            success: true,
            message: `Recipe "${recipeData.name}" updated successfully`
        });
    } catch (error) {
        console.error('Error updating recipe:', error);
        res.status(500).json({ error: error.message || 'Failed to update recipe' });
    }
});

app.delete('/api/recipes/:key', requireDB, async (req, res) => {
    try {
        const { key } = req.params;
        
        const result = await db.deleteRecipe(key);
        
        res.json({
            success: true,
            message: `Recipe "${result.name}" deleted successfully`
        });
    } catch (error) {
        console.error('Error deleting recipe:', error);
        res.status(500).json({ error: error.message || 'Failed to delete recipe' });
    }
});

// ============= MEALS API =============

app.get('/api/meals', requireDB, async (req, res) => {
    try {
        const { date, startDate, endDate } = req.query;
        
        if (date) {
            const meals = await db.getMealsByDate(date);
            res.json(meals); // Return flat array for single date
        } else if (startDate && endDate) {
            const meals = await db.getMealsByDateRange(startDate, endDate);
            res.json(meals);
        } else {
            // Return recent meals (last 30 days)
            const endDate = new Date().toISOString().split('T')[0];
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);
            const meals = await db.getMealsByDateRange(startDate.toISOString().split('T')[0], endDate);
            res.json(meals);
        }
    } catch (error) {
        console.error('Error reading meals:', error);
        res.status(500).json({ error: 'Failed to read meals' });
    }
});

app.post('/api/meals', requireDB, async (req, res) => {
    try {
        const { date, meal } = req.body;
        
        if (!date || !meal) {
            return res.status(400).json({ error: 'Missing required fields: date, meal' });
        }
        
        if (!meal.id || !meal.description || !meal.nutrition) {
            return res.status(400).json({ error: 'Invalid meal data' });
        }
        
        meal.date = date;
        if (!meal.timestamp) {
            meal.timestamp = new Date().toISOString();
        }
        
        // Try to add meal, but if it already exists (duplicate ID), skip it silently
        try {
            await db.addMeal(meal);
            res.json({
                success: true,
                message: `Meal "${meal.description}" added successfully`,
                meal,
                date
            });
        } catch (dbError) {
            // If it's a UNIQUE constraint error, the meal already exists - return success
            if (dbError.code === 'SQLITE_CONSTRAINT' && dbError.message.includes('UNIQUE')) {
                res.json({
                    success: true,
                    message: `Meal "${meal.description}" already exists`,
                    meal,
                    date,
                    alreadyExists: true
                });
            } else {
                throw dbError;
            }
        }
    } catch (error) {
        console.error('Error adding meal:', error);
        res.status(500).json({ error: 'Failed to add meal' });
    }
});

app.put('/api/meals/:id', requireDB, async (req, res) => {
    try {
        const { id } = req.params;
        const { date, meal } = req.body;
        
        if (!date || !meal) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        if (!meal.description || !meal.nutrition) {
            return res.status(400).json({ error: 'Invalid meal data' });
        }
        
        meal.date = date;
        meal.id = parseInt(id);
        
        await db.updateMeal(id, meal);
        
        res.json({
            success: true,
            message: `Meal "${meal.description}" updated successfully`,
            meal,
            date
        });
    } catch (error) {
        console.error('Error updating meal:', error);
        res.status(500).json({ error: 'Failed to update meal' });
    }
});

app.delete('/api/meals/:id', requireDB, async (req, res) => {
    try {
        const { id } = req.params;
        
        await db.deleteMeal(id);
        
        res.json({
            success: true,
            message: 'Meal deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting meal:', error);
        res.status(500).json({ error: 'Failed to delete meal' });
    }
});

app.post('/api/meals/bulk', requireDB, async (req, res) => {
    try {
        const { operation, meals: mealsData } = req.body;
        
        if (!operation || !mealsData) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        let processedCount = 0;
        
        if (operation === 'import' || operation === 'sync') {
            for (const [date, dateMeals] of Object.entries(mealsData)) {
                for (const meal of dateMeals) {
                    meal.date = date;
                    try {
                        await db.addMeal(meal);
                        processedCount++;
                    } catch (error) {
                        console.error(`Error importing meal ${meal.id}:`, error);
                    }
                }
            }
            
            res.json({
                success: true,
                message: `${operation} completed`,
                processedCount
            });
        } else {
            res.status(400).json({ error: 'Invalid operation' });
        }
    } catch (error) {
        console.error('Error in bulk operation:', error);
        res.status(500).json({ error: 'Bulk operation failed' });
    }
});

// Copy all meals from one date to another (creates new IDs)
app.post('/api/meals/copy', requireDB, async (req, res) => {
    try {
        const { sourceDate, targetDate } = req.body;
        if (!sourceDate || !targetDate) {
            return res.status(400).json({ error: 'Missing required fields: sourceDate, targetDate' });
        }
        if (sourceDate === targetDate) {
            return res.status(400).json({ error: 'sourceDate and targetDate must differ' });
        }

        const sourceMeals = await db.getMealsByDate(sourceDate);
        let copied = 0;
        for (const meal of sourceMeals) {
            const { description, mealType, source, nutrition, ingredient_data } = meal;
            const newMeal = {
                description,
                mealType,
                date: targetDate,
                timestamp: new Date().toISOString(),
                source: source || '',
                nutrition,
                ingredient_data
            };
            try {
                await db.addMeal(newMeal);
                copied++;
            } catch (err) {
                console.error(`Error copying meal id=${meal.id} to ${targetDate}:`, err);
            }
        }
        res.json({ success: true, sourceDate, targetDate, copied, total: sourceMeals.length });
    } catch (error) {
        console.error('Error copying meals:', error);
        res.status(500).json({ error: 'Failed to copy meals' });
    }
});

// Delete all meals for a given date
app.delete('/api/meals/by-date/:date', requireDB, async (req, res) => {
    try {
        const { date } = req.params;
        if (!date) {
            return res.status(400).json({ error: 'Missing required field: date' });
        }
        const meals = await db.getMealsByDate(date);
        let deleted = 0;
        for (const meal of meals) {
            try {
                await db.deleteMeal(meal.id);
                deleted++;
            } catch (err) {
                console.error(`Error deleting meal id=${meal.id} for ${date}:`, err);
            }
        }
        res.json({ success: true, date, deleted });
    } catch (error) {
        console.error('Error deleting meals by date:', error);
        res.status(500).json({ error: 'Failed to delete meals by date' });
    }
});

// ============= ANALYTICS API =============

// ============= EXERCISES API =============

app.get('/api/exercises/:date', requireDB, async (req, res) => {
    try {
        const exercises = await db.getExercisesByDate(req.params.date);
        res.json(exercises);
    } catch (error) {
        console.error('Error reading exercises:', error);
        res.status(500).json({ error: 'Failed to read exercises' });
    }
});

app.post('/api/exercises', requireDB, async (req, res) => {
    try {
        const { date, type, name, duration, calories, notes, timestamp } = req.body;
        if (!date || !type || !name) return res.status(400).json({ error: 'date, type, and name are required' });
        const result = await db.addExercise({ date, type, name, duration, calories, notes, timestamp });
        res.json(result);
    } catch (error) {
        console.error('Error adding exercise:', error);
        res.status(500).json({ error: 'Failed to add exercise' });
    }
});

app.put('/api/exercises/:id', requireDB, async (req, res) => {
    try {
        const { type, name, duration, calories, notes, timestamp } = req.body;
        if (!type || !name) return res.status(400).json({ error: 'type and name are required' });
        const result = await db.updateExercise(parseInt(req.params.id), { type, name, duration, calories, notes, timestamp });
        res.json(result);
    } catch (error) {
        console.error('Error updating exercise:', error);
        res.status(500).json({ error: 'Failed to update exercise' });
    }
});

app.delete('/api/exercises/by-date/:date', requireDB, async (req, res) => {
    try {
        const result = await db.deleteExercisesByDate(req.params.date);
        res.json(result);
    } catch (error) {
        console.error('Error deleting exercises by date:', error);
        res.status(500).json({ error: 'Failed to delete exercises' });
    }
});

app.delete('/api/exercises/:id', requireDB, async (req, res) => {
    try {
        const result = await db.deleteExercise(parseInt(req.params.id));
        res.json(result);
    } catch (error) {
        console.error('Error deleting exercise:', error);
        res.status(500).json({ error: 'Failed to delete exercise' });
    }
});

// ============= WEIGHT API =============

app.get('/api/weight/:date', requireDB, async (req, res) => {
    try {
        const entry = await db.getWeightEntry(req.params.date);
        res.json(entry || null);
    } catch (error) {
        console.error('Error reading weight entry:', error);
        res.status(500).json({ error: 'Failed to read weight entry' });
    }
});

app.get('/api/weight', requireDB, async (req, res) => {
    try {
        const { latest, startDate, endDate } = req.query;
        if (latest === 'true') {
            const entry = await db.getLatestWeightEntry();
            res.json(entry || null);
        } else if (startDate && endDate) {
            const entries = await db.getWeightEntries(startDate, endDate);
            res.json(entries);
        } else {
            const entry = await db.getLatestWeightEntry();
            res.json(entry || null);
        }
    } catch (error) {
        console.error('Error reading weight entries:', error);
        res.status(500).json({ error: 'Failed to read weight entries' });
    }
});

app.put('/api/weight/:date', requireDB, async (req, res) => {
    try {
        const data = { ...req.body, date: req.params.date };
        if (!data.weight) return res.status(400).json({ error: 'weight is required' });
        const result = await db.upsertWeightEntry(data);
        res.json(result);
    } catch (error) {
        console.error('Error saving weight entry:', error);
        res.status(500).json({ error: 'Failed to save weight entry' });
    }
});

// ============= SETTINGS API =============

app.get('/api/settings', requireDB, async (req, res) => {
    try {
        const settings = await db.getAllSettings();
        res.json(settings);
    } catch (error) {
        console.error('Error reading settings:', error);
        res.status(500).json({ error: 'Failed to read settings' });
    }
});

app.get('/api/settings/:key', requireDB, async (req, res) => {
    try {
        const value = await db.getSetting(req.params.key);
        res.json({ key: req.params.key, value });
    } catch (error) {
        console.error('Error reading setting:', error);
        res.status(500).json({ error: 'Failed to read setting' });
    }
});

app.put('/api/settings/:key', requireDB, async (req, res) => {
    try {
        const { value } = req.body;
        if (value === undefined) return res.status(400).json({ error: 'value is required' });
        const result = await db.setSetting(req.params.key, value);
        res.json(result);
    } catch (error) {
        console.error('Error saving setting:', error);
        res.status(500).json({ error: 'Failed to save setting' });
    }
});

// ============= HABITS API =============

app.get('/api/habits', requireDB, async (req, res) => {
    try {
        const habits = await db.getHabitDefinitions();
        res.json(habits);
    } catch (error) {
        console.error('Error reading habits:', error);
        res.status(500).json({ error: 'Failed to read habits' });
    }
});

app.post('/api/habits', requireDB, async (req, res) => {
    try {
        const { name, emoji, type } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        const habit = await db.addHabitDefinition(name, emoji, type);
        res.json(habit);
    } catch (error) {
        console.error('Error adding habit:', error);
        res.status(500).json({ error: 'Failed to add habit' });
    }
});

app.delete('/api/habits/:id', requireDB, async (req, res) => {
    try {
        const result = await db.deleteHabitDefinition(parseInt(req.params.id));
        res.json(result);
    } catch (error) {
        console.error('Error deleting habit:', error);
        const status = error.message.includes('not found') ? 404 : error.message.includes('built-in') ? 400 : 500;
        res.status(status).json({ error: error.message });
    }
});

app.get('/api/habits/entries/:date', requireDB, async (req, res) => {
    try {
        const entries = await db.getHabitEntriesByDate(req.params.date);
        res.json(entries);
    } catch (error) {
        console.error('Error reading habit entries:', error);
        res.status(500).json({ error: 'Failed to read habit entries' });
    }
});

app.put('/api/habits/entries/:habitId', requireDB, async (req, res) => {
    try {
        const { date, value, textValue } = req.body;
        if (!date || value === undefined) return res.status(400).json({ error: 'date and value required' });
        const result = await db.upsertHabitEntry(parseInt(req.params.habitId), date, value, textValue);
        res.json(result);
    } catch (error) {
        console.error('Error upserting habit entry:', error);
        res.status(500).json({ error: 'Failed to save habit entry' });
    }
});

// ============= MOOD API =============

app.get('/api/mood/:date', requireDB, async (req, res) => {
    try {
        const entry = await db.getMoodEntry(req.params.date);
        res.json(entry);
    } catch (error) {
        console.error('Error reading mood entry:', error);
        res.status(500).json({ error: 'Failed to read mood entry' });
    }
});

app.put('/api/mood/:date', requireDB, async (req, res) => {
    try {
        const { mood, diary } = req.body;
        if (mood === undefined) return res.status(400).json({ error: 'mood is required' });
        const result = await db.upsertMoodEntry(req.params.date, mood, diary || '');
        res.json(result);
    } catch (error) {
        console.error('Error saving mood entry:', error);
        res.status(500).json({ error: 'Failed to save mood entry' });
    }
});

// ============= EXPENDITURE API =============

app.get('/api/expenditures', requireDB, async (req, res) => {
    try {
        const categories = await db.getExpenditureCategories();
        res.json(categories);
    } catch (error) {
        console.error('Error reading expenditure categories:', error);
        res.status(500).json({ error: 'Failed to read expenditure categories' });
    }
});

app.post('/api/expenditures', requireDB, async (req, res) => {
    try {
        const { name, emoji } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        const category = await db.addExpenditureCategory(name, emoji);
        res.json(category);
    } catch (error) {
        console.error('Error adding expenditure category:', error);
        res.status(500).json({ error: 'Failed to add expenditure category' });
    }
});

app.delete('/api/expenditures/:id', requireDB, async (req, res) => {
    try {
        const result = await db.deleteExpenditureCategory(parseInt(req.params.id));
        res.json(result);
    } catch (error) {
        console.error('Error deleting expenditure category:', error);
        const status = error.message.includes('not found') ? 404 : error.message.includes('built-in') ? 400 : 500;
        res.status(status).json({ error: error.message });
    }
});

app.get('/api/expenditures/entries/:date', requireDB, async (req, res) => {
    try {
        const entries = await db.getExpenditureEntriesByDate(req.params.date);
        res.json(entries);
    } catch (error) {
        console.error('Error reading expenditure entries:', error);
        res.status(500).json({ error: 'Failed to read expenditure entries' });
    }
});

app.put('/api/expenditures/entries/:categoryId', requireDB, async (req, res) => {
    try {
        const { date, amount } = req.body;
        if (!date || amount === undefined) return res.status(400).json({ error: 'date and amount required' });
        const result = await db.upsertExpenditureEntry(parseInt(req.params.categoryId), date, amount);
        res.json(result);
    } catch (error) {
        console.error('Error upserting expenditure entry:', error);
        res.status(500).json({ error: 'Failed to save expenditure entry' });
    }
});

// ============= BILLS & GROCERIES API =============

app.get('/api/bills/:date', requireDB, async (req, res) => {
    try {
        const items = await db.getBillItemsByDate(req.params.date, 'bills');
        res.json(items);
    } catch (error) {
        console.error('Error reading bills:', error);
        res.status(500).json({ error: 'Failed to read bills' });
    }
});

app.post('/api/bills', requireDB, async (req, res) => {
    try {
        const { date, description, amount } = req.body;
        if (!description) return res.status(400).json({ error: 'Description is required' });
        const item = await db.addBillItem(date, 'bills', description, amount || 0);
        res.json(item);
    } catch (error) {
        console.error('Error adding bill:', error);
        res.status(500).json({ error: 'Failed to add bill' });
    }
});

app.put('/api/bills/:id', requireDB, async (req, res) => {
    try {
        const { description, amount } = req.body;
        await db.updateBillItem(parseInt(req.params.id), description, amount);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating bill:', error);
        res.status(500).json({ error: 'Failed to update bill' });
    }
});

app.delete('/api/bills/:id', requireDB, async (req, res) => {
    try {
        await db.deleteBillItem(parseInt(req.params.id));
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting bill:', error);
        res.status(500).json({ error: 'Failed to delete bill' });
    }
});

app.get('/api/groceries/:date', requireDB, async (req, res) => {
    try {
        const items = await db.getBillItemsByDate(req.params.date, 'groceries');
        res.json(items);
    } catch (error) {
        console.error('Error reading groceries:', error);
        res.status(500).json({ error: 'Failed to read groceries' });
    }
});

app.post('/api/groceries', requireDB, async (req, res) => {
    try {
        const { date, description, amount } = req.body;
        if (!description) return res.status(400).json({ error: 'Description is required' });
        const item = await db.addBillItem(date, 'groceries', description, amount || 0);
        res.json(item);
    } catch (error) {
        console.error('Error adding grocery:', error);
        res.status(500).json({ error: 'Failed to add grocery' });
    }
});

app.put('/api/groceries/:id', requireDB, async (req, res) => {
    try {
        const { description, amount } = req.body;
        await db.updateBillItem(parseInt(req.params.id), description, amount);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating grocery:', error);
        res.status(500).json({ error: 'Failed to update grocery' });
    }
});

app.delete('/api/groceries/:id', requireDB, async (req, res) => {
    try {
        await db.deleteBillItem(parseInt(req.params.id));
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting grocery:', error);
        res.status(500).json({ error: 'Failed to delete grocery' });
    }
});

// ============= ANALYTICS API (continued) =============

app.get('/api/analytics/daily/:date', requireDB, async (req, res) => {
    try {
        const { date } = req.params;
        const summary = await db.getDailySummary(date);
        res.json(summary);
    } catch (error) {
        console.error('Error getting daily summary:', error);
        res.status(500).json({ error: 'Failed to get daily summary' });
    }
});

app.get('/api/analytics/weekly', requireDB, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Missing startDate or endDate' });
        }
        
        const summaries = await db.getWeeklySummary(startDate, endDate);
        res.json(summaries);
    } catch (error) {
        console.error('Error getting weekly summary:', error);
        res.status(500).json({ error: 'Failed to get weekly summary' });
    }
});

// ============= EXCEL EXPORT API =============

app.post('/api/export-excel', requireDB, async (req, res) => {
    try {
        const { mealsByDate, startDate, endDate, filename } = req.body;

        if (!mealsByDate || typeof mealsByDate !== 'object') {
            return res.status(400).json({ error: 'Invalid meal data provided' });
        }

        const dates = Object.keys(mealsByDate).sort();
        if (dates.length === 0) {
            return res.status(400).json({ error: 'No meal data found for export' });
        }

        // Generate filename
        let exportFilename = filename;
        if (!exportFilename) {
            const firstDate = dates[0];
            const date = new Date(firstDate + 'T00:00:00');
            const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            exportFilename = `${yearMonth}.xlsx`;
        }

        const trackersDir = path.join(__dirname, 'trackers');
        try { await fs.mkdir(trackersDir, { recursive: true }); } catch (e) { /* exists */ }
        const filePath = path.join(trackersDir, exportFilename);

        // Check if file already exists
        let workbook;
        let fileExistedAtStart = false;
        let isNewFileCreation = false;

        try {
            await fs.access(filePath);
            fileExistedAtStart = true;
            workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
        } catch (error) {
            fileExistedAtStart = false;
            isNewFileCreation = true;
            workbook = new ExcelJS.Workbook();
            workbook.creator = 'Food Diary App';
            workbook.lastModifiedBy = 'Food Diary App';
            workbook.created = new Date();
            workbook.modified = new Date();
        }

        // Generate list of ALL dates including missing ones
        const sortedDates = dates.sort();
        let allDatesToProcess = [];

        if (sortedDates.length > 0) {
            const firstDate = new Date(sortedDates[0] + 'T00:00:00');
            const lastDate = new Date(sortedDates[sortedDates.length - 1] + 'T00:00:00');
            const currentDate = new Date(firstDate);
            while (currentDate <= lastDate) {
                allDatesToProcess.push(currentDate.toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        // Fetch habit definitions and mood emoji map for tracker sections
        const habitDefs = await db.getHabitDefinitions();
        const moodEmojis = { 1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };

        let totalMealsProcessed = 0;
        let mealsAppended = 0;
        let newSheetsCreated = 0;
        let missingSheetsAdded = 0;

        // Collect tracker data for summary sheet
        const trackerSummaryData = {};

        for (const dateKey of allDatesToProcess) {
            try {
                const meals = mealsByDate[dateKey] || [];
                const hasMeals = meals.length > 0;
                const date = new Date(dateKey + 'T00:00:00');
                const sheetName = dateKey;

                // Remove existing sheet if appending
                let worksheet = fileExistedAtStart ? workbook.getWorksheet(sheetName) : null;
                if (worksheet) {
                    workbook.removeWorksheet(worksheet.id);
                }

                worksheet = workbook.addWorksheet(sheetName);
                newSheetsCreated++;
                if (!hasMeals) missingSheetsAdded++;

                // Set up columns
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

                // Style header row
                const headerRow = worksheet.getRow(1);
                headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
                headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
                headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
                headerRow.height = 25;

                // Date header row
                const dateHeaderRow = worksheet.addRow({
                    time: '', mealType: '',
                    description: `📅 ${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
                    calories: '', protein: '', carbs: '', fat: '', fiber: '', source: '', ingredients: ''
                });
                dateHeaderRow.font = { bold: true, size: 14 };
                dateHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } };

                worksheet.addRow({});

                // Day totals
                let dayTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

                if (hasMeals) {
                    meals.forEach(meal => {
                        const mealTime = new Date(meal.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit', minute: '2-digit', hour12: false
                        });

                        let ingredientsList = '';
                        if (meal.ingredients) {
                            if (Array.isArray(meal.ingredients) && meal.ingredients.length > 0) {
                                ingredientsList = meal.ingredients.map(ing =>
                                    `${ing.name} (${ing.quantity}x ${ing.measurement})`
                                ).join('; ');
                            } else if (typeof meal.ingredients === 'string' && meal.ingredients.trim()) {
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
                        row.alignment = { vertical: 'top', wrapText: true };
                        row.height = Math.max(20, Math.ceil(ingredientsList.length / 50) * 15);

                        dayTotals.calories += meal.nutrition.calories;
                        dayTotals.protein += meal.nutrition.protein;
                        dayTotals.carbs += meal.nutrition.carbs;
                        dayTotals.fat += meal.nutrition.fat;
                        dayTotals.fiber += meal.nutrition.fiber;
                    });
                    mealsAppended += meals.length;
                }

                // Summary row
                worksheet.addRow({});
                const summaryRow = worksheet.addRow({
                    time: '', mealType: '',
                    description: `📊 Daily Total (${meals.length} meals)`,
                    calories: Math.round(dayTotals.calories),
                    protein: Math.round(dayTotals.protein * 10) / 10,
                    carbs: Math.round(dayTotals.carbs * 10) / 10,
                    fat: Math.round(dayTotals.fat * 10) / 10,
                    fiber: Math.round(dayTotals.fiber * 10) / 10,
                    source: 'SUMMARY', ingredients: ''
                });
                summaryRow.font = { bold: true, color: { argb: 'FFFFFF' } };
                summaryRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };

                // ── Tracker section per date sheet ──
                const habitEntries = await db.getHabitEntriesByDate(dateKey);
                const moodEntry = await db.getMoodEntry(dateKey);

                // Store for summary sheet
                trackerSummaryData[dateKey] = { habits: habitEntries, mood: moodEntry };

                // Blank row separator
                worksheet.addRow({});
                worksheet.addRow({});

                // Tracker header
                const trackerHeaderRow = worksheet.addRow({
                    time: '📋 Daily Trackers', mealType: '', description: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', source: '', ingredients: ''
                });
                trackerHeaderRow.font = { bold: true, size: 12 };
                trackerHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '6A1B9A' } };
                trackerHeaderRow.font = { bold: true, size: 12, color: { argb: 'FFFFFF' } };

                // Habit sub-header
                const habitSubHeader = worksheet.addRow({
                    time: 'Habit', mealType: 'Value', description: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', source: '', ingredients: ''
                });
                habitSubHeader.font = { bold: true };
                habitSubHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E1BEE7' } };

                // Habit entries
                habitEntries.forEach(h => {
                    let displayValue;
                    if (h.type === 'text') {
                        displayValue = h.text_value || '';
                    } else if (h.type === 'toggle') {
                        displayValue = h.value ? 'YES' : '';
                    } else {
                        displayValue = h.value || 0;
                    }
                    const habitRow = worksheet.addRow({
                        time: `${h.emoji} ${h.name}`, mealType: displayValue,
                        description: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', source: '', ingredients: ''
                    });
                    habitRow.getCell(1).alignment = { horizontal: 'left' };
                });

                // Mood + diary
                worksheet.addRow({});
                const moodRow = worksheet.addRow({
                    time: `😊 Mood: ${moodEmojis[moodEntry.mood] || '😐'}`, mealType: '',
                    description: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', source: '', ingredients: ''
                });
                moodRow.font = { bold: true };

                if (moodEntry.diary) {
                    const diaryRow = worksheet.addRow({
                        time: `📝 Diary:`, mealType: moodEntry.diary,
                        description: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', source: '', ingredients: ''
                    });
                    diaryRow.getCell(2).alignment = { wrapText: true };
                }

                // Borders
                worksheet.eachRow((row) => {
                    row.eachCell((cell) => {
                        cell.border = {
                            top: { style: 'thin' }, left: { style: 'thin' },
                            bottom: { style: 'thin' }, right: { style: 'thin' }
                        };
                    });
                });

                worksheet.views = [{ state: 'frozen', ySplit: 1 }];
                totalMealsProcessed += meals.length;
            } catch (dateError) {
                console.error('Error processing date sheet:', dateKey, dateError.message);
            }
        }

        // ── Summary Trackers sheet ──
        // Remove existing Trackers sheet if present
        const existingTrackSheet = workbook.getWorksheet('Trackers');
        if (existingTrackSheet) {
            workbook.removeWorksheet(existingTrackSheet.id);
        }

        const trackSheet = workbook.addWorksheet('Trackers');
        const trackHeaders = ['Date', ...habitDefs.map(h => `${h.emoji} ${h.name}`), 'Mood', 'Diary'];
        const trackColWidths = [14, ...habitDefs.map(() => 14), 8, 40];
        trackColWidths.forEach((w, i) => { trackSheet.getColumn(i + 1).width = w; });

        const tHeader = trackSheet.getRow(1);
        tHeader.values = trackHeaders;
        tHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        tHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6A1B9A' } };
        tHeader.alignment = { horizontal: 'center' };

        const trackerDates = Object.keys(trackerSummaryData).sort();
        trackerDates.forEach((dateKey, idx) => {
            const data = trackerSummaryData[dateKey];
            const row = trackSheet.getRow(idx + 2);
            const values = [dateKey];
            habitDefs.forEach(h => {
                const entry = data.habits.find(e => e.habit_id === h.id);
                if (!entry || entry.value === 0) {
                    values.push(h.type === 'toggle' ? '' : (h.type === 'text' ? '' : 0));
                } else if (h.type === 'text') {
                    values.push(entry.text_value || '');
                } else {
                    values.push(h.type === 'toggle' ? 'YES' : entry.value);
                }
            });
            values.push(moodEmojis[data.mood.mood] || '😐');
            values.push(data.mood.diary || '');
            row.values = values;
            if (idx % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E5F5' } };
            }
            row.commit();
        });

        trackSheet.autoFilter = {
            from: 'A1',
            to: `${String.fromCharCode(65 + trackHeaders.length - 1)}1`
        };

        // Save workbook
        await workbook.xlsx.writeFile(filePath);

        res.json({
            success: true,
            message: fileExistedAtStart ?
                `Data updated in existing file: ${exportFilename} (${totalMealsProcessed} meals across ${allDatesToProcess.length} dates)` :
                `New file created: ${exportFilename} (${totalMealsProcessed} meals across ${allDatesToProcess.length} dates)`,
            filename: exportFilename,
            filePath: `trackers/${exportFilename}`,
            fileExists: fileExistedAtStart,
            isNewFileCreation: isNewFileCreation,
            totalSheets: allDatesToProcess.length,
            totalMeals: totalMealsProcessed,
            datesWithMeals: sortedDates.length,
            datesWithoutMeals: missingSheetsAdded
        });

    } catch (error) {
        console.error('Excel export error:', error.message);
        res.status(500).json({
            error: 'Failed to generate Excel export',
            details: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        database: dbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Food Tracker Server running on http://localhost:${PORT}`);
        console.log(`📊 Database: ${dbConnected ? 'Connected' : 'Disconnected'}`);
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await db.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await db.close();
    process.exit(0);
});
