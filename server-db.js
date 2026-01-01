const express = require('express');
const path = require('path');
const cors = require('cors');
const DatabaseService = require('./database/db-service');
const AIAssistantService = require('./database/ai-assistant');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE';
let genAI = null;
let geminiModel = null;

if (GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_API_KEY_HERE') {
    try {
        genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        geminiModel = genAI.getGenerativeModel({ model: 'gemini-pro' });
        console.log('✅ Gemini AI initialized');
    } catch (error) {
        console.error('❌ Failed to initialize Gemini AI:', error.message);
    }
} else {
    console.warn('⚠️  Gemini API key not set. AI chat will use fallback responses.');
    console.warn('   Set GEMINI_API_KEY environment variable to enable AI chat.');
}

// Initialize database service
const db = new DatabaseService();
const aiAssistant = new AIAssistantService(db);

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

// ============= AI ASSISTANT API =============

// AI Chat endpoint with Gemini
app.post('/api/ai/chat', async (req, res) => {
    try {
        const { message, date, nutritionData } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // If Gemini is not available, use fallback
        if (!geminiModel) {
            return res.json({
                response: "I'm currently unavailable. Please set the GEMINI_API_KEY environment variable to enable AI chat. In the meantime, use the quick action buttons above for nutrition analysis.",
                fallback: true
            });
        }

        // Build context from user's nutrition data
        let context = 'You are a helpful nutrition assistant. ';
        
        if (nutritionData && nutritionData.summary) {
            const s = nutritionData.summary;
            context += `The user has logged ${s.meal_count || 0} meals today (${date || 'today'}) with ${Math.round(s.total_calories || 0)} calories, ${Math.round(s.total_protein || 0)}g protein, ${Math.round(s.total_carbs || 0)}g carbs, ${Math.round(s.total_fat || 0)}g fat, and ${Math.round(s.total_fiber || 0)}g fiber. `;
        }
        
        context += 'Provide concise, helpful nutrition advice. Keep responses under 100 words unless detailed analysis is requested. Use a friendly, encouraging tone.';

        const prompt = `${context}\n\nUser question: ${message}\n\nResponse:`;

        const result = await geminiModel.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        res.json({
            response: text,
            fallback: false
        });
    } catch (error) {
        console.error('Error in AI chat:', error);
        
        // Friendly error response
        res.json({
            response: "I'm having trouble processing your request right now. Please try asking in a different way or use the quick action buttons above!",
            error: true,
            fallback: true
        });
    }
});

app.post('/api/ai/analyze', requireDB, async (req, res) => {
    try {
        const { date } = req.body;
        
        if (!date) {
            return res.status(400).json({ error: 'Date is required' });
        }
        
        const analysis = await aiAssistant.generateSuggestions(date);
        res.json(analysis);
    } catch (error) {
        console.error('Error generating AI analysis:', error);
        res.status(500).json({ error: 'Failed to generate analysis' });
    }
});

app.post('/api/ai/weekly-progress', requireDB, async (req, res) => {
    try {
        const progress = await aiAssistant.getWeeklyProgress();
        res.json(progress);
    } catch (error) {
        console.error('Error getting weekly progress:', error);
        res.status(500).json({ error: 'Failed to get weekly progress' });
    }
});

app.post('/api/ai/compare', requireDB, async (req, res) => {
    try {
        const { currentStartDate, currentEndDate } = req.body;
        
        if (!currentStartDate || !currentEndDate) {
            return res.status(400).json({ error: 'Date range is required' });
        }
        
        const comparison = await aiAssistant.compareWithPreviousWeek(currentStartDate, currentEndDate);
        res.json(comparison);
    } catch (error) {
        console.error('Error comparing periods:', error);
        res.status(500).json({ error: 'Failed to compare periods' });
    }
});

app.post('/api/ai/recommendations', requireDB, async (req, res) => {
    try {
        const { deficientNutrients } = req.body;
        
        if (!Array.isArray(deficientNutrients)) {
            return res.status(400).json({ error: 'deficientNutrients must be an array' });
        }
        
        const recommendations = await aiAssistant.getFoodRecommendations(deficientNutrients);
        res.json(recommendations);
    } catch (error) {
        console.error('Error getting recommendations:', error);
        res.status(500).json({ error: 'Failed to get recommendations' });
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
        console.log(`🤖 AI Assistant: Ready`);
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
