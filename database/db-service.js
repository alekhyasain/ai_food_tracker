const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseService {
    constructor(dbPath = './database/food_tracker.db') {
        this.dbPath = dbPath;
        this.db = null;
    }

    // Initialize database connection
    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, async (err) => {
                if (err) {
                    console.error('Error connecting to database:', err);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    try {
                        await this._initHabitTables();
                        await this._initExpenditureTables();
                        await this._initExerciseWeightTables();
                        await this._initBillsTables();
                        resolve();
                    } catch (initErr) {
                        console.error('Error initializing habit tables:', initErr);
                        reject(initErr);
                    }
                }
            });
        });
    }

    // Create habit/mood tables and seed built-in habits
    async _initHabitTables() {
        await this.run(`CREATE TABLE IF NOT EXISTS habit_definitions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            emoji TEXT NOT NULL DEFAULT '✅',
            type TEXT NOT NULL DEFAULT 'toggle',
            built_in INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        await this.run(`CREATE TABLE IF NOT EXISTS habit_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            habit_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            value INTEGER NOT NULL DEFAULT 0,
            text_value TEXT DEFAULT '',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (habit_id) REFERENCES habit_definitions(id) ON DELETE CASCADE,
            UNIQUE(habit_id, date)
        )`);

        // Add text_value column if missing (migration for existing databases)
        try {
            await this.run(`ALTER TABLE habit_entries ADD COLUMN text_value TEXT DEFAULT ''`);
        } catch (e) {
            // Column already exists — ignore
        }

        await this.run(`CREATE TABLE IF NOT EXISTS mood_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL UNIQUE,
            mood INTEGER NOT NULL DEFAULT 3,
            diary TEXT DEFAULT '',
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        await this.run(`CREATE INDEX IF NOT EXISTS idx_habit_entries_date ON habit_entries(date)`);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_mood_entries_date ON mood_entries(date)`);

        // Migration: remove "Daily Cooking" and rename "Learnt Something Good" → "Study Something"
        // Run BEFORE seeding so the seed loop doesn't create duplicates
        await this.run(`DELETE FROM habit_entries WHERE habit_id IN (SELECT id FROM habit_definitions WHERE name = 'Daily Cooking' AND built_in = 1)`);
        await this.run(`DELETE FROM habit_definitions WHERE name = 'Daily Cooking' AND built_in = 1`);
        const learntHabit = await this.get(`SELECT id FROM habit_definitions WHERE name = 'Learnt Something Good' AND built_in = 1`);
        if (learntHabit) {
            await this.run(`UPDATE habit_definitions SET name = 'Study Something', type = 'text' WHERE id = ?`, [learntHabit.id]);
        }

        // Seed built-in habits (insert any missing ones)
        const builtIns = [
            ['Water', '🥛', 'counter', 1, 1],
            ['Nail Biting', '💅', 'counter', 1, 2],
            ['Crappy Food', '🍔', 'toggle', 1, 3],
            ['Study Something', '📚', 'text', 1, 4],
            ['Taught Son Something', '👨‍👦', 'toggle', 1, 5],
            ['Cooking Plan', '🍳', 'text', 1, 7],
            ['Multivitamins', '💊', 'toggle', 1, 8],
            ['Iron Tablet', '💊', 'toggle', 1, 9],
            ['Thyroid Medicine', '💊', 'toggle', 1, 10],
            ['Night Brushing/Flossing/Mouthwash', '🪥', 'toggle', 1, 11],
            ['Bad Expenditure', '💸', 'toggle', 1, 12],
            ['Doom Scrolled', '📱', 'toggle', 1, 13],
            ['Distracted in Meeting', '🔇', 'toggle', 1, 14],
            ['Read a Book', '📖', 'toggle', 1, 15],
            ['Deep Work Block', '🎯', 'toggle', 1, 16],
        ];
        for (const [name, emoji, type, builtIn, sortOrder] of builtIns) {
            const existing = await this.get(`SELECT id FROM habit_definitions WHERE name = ? AND built_in = 1`, [name]);
            if (!existing) {
                await this.run(
                    `INSERT INTO habit_definitions (name, emoji, type, built_in, sort_order) VALUES (?, ?, ?, ?, ?)`,
                    [name, emoji, type, builtIn, sortOrder]
                );
            }
        }

        // Remove Period habit if it was previously seeded
        await this.run(`DELETE FROM habit_definitions WHERE name = 'Period' AND built_in = 1`);
        // Remove Dopamine Check habit if it was previously seeded
        await this.run(`DELETE FROM habit_definitions WHERE name = 'Dopamine Check' AND built_in = 1`);
        // Remove Sleep On Time / Woke Up On Time — redundant with Sleep Tracker
        await this.run(`DELETE FROM habit_definitions WHERE name = 'Sleep On Time' AND built_in = 1`);
        await this.run(`DELETE FROM habit_definitions WHERE name = 'Woke Up On Time' AND built_in = 1`);
    }

    // Create expenditure tables and seed built-in categories
    async _initExpenditureTables() {
        await this.run(`CREATE TABLE IF NOT EXISTS expenditure_categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            emoji TEXT NOT NULL DEFAULT '💰',
            built_in INTEGER DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        await this.run(`CREATE TABLE IF NOT EXISTS expenditure_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            amount REAL NOT NULL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES expenditure_categories(id) ON DELETE CASCADE,
            UNIQUE(category_id, date)
        )`);

        await this.run(`CREATE INDEX IF NOT EXISTS idx_expenditure_entries_date ON expenditure_entries(date)`);

        // Seed built-in expenditure categories
        const builtIns = [
            ['Food', '🍕', 1, 1],
            ['Entertainment', '🎬', 1, 2],
            ['Shopping', '🛍️', 1, 3],
        ];
        for (const [name, emoji, builtIn, sortOrder] of builtIns) {
            const existing = await this.get(`SELECT id FROM expenditure_categories WHERE name = ? AND built_in = 1`, [name]);
            if (!existing) {
                await this.run(
                    `INSERT INTO expenditure_categories (name, emoji, built_in, sort_order) VALUES (?, ?, ?, ?)`,
                    [name, emoji, builtIn, sortOrder]
                );
            }
        }
        // Remove Transport if it was previously seeded
        await this.run(`DELETE FROM expenditure_categories WHERE name = 'Transport' AND built_in = 1`);
    }

    // Helper methods for database operations
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // ============= INGREDIENTS METHODS =============
    
    async getAllIngredients() {
        const query = `
            SELECT 
                c.name as category_name,
                i.key as ingredient_key,
                i.name as ingredient_name,
                i.id as ingredient_id
            FROM ingredients i
            JOIN categories c ON i.category_id = c.id
            ORDER BY c.name, i.name
        `;
        
        const rows = await this.all(query);
        
        // Transform to match original JSON structure
        const result = { basic_ingredients: {} };
        
        for (const row of rows) {
            if (!result.basic_ingredients[row.category_name]) {
                result.basic_ingredients[row.category_name] = {};
            }
            
            // Get measurements for this ingredient
            const measurements = await this.all(
                `SELECT measurement_key, calories, protein, carbs, fat, fiber 
                 FROM ingredient_measurements 
                 WHERE ingredient_id = ?`,
                [row.ingredient_id]
            );
            
            const measurementsObj = {};
            measurements.forEach(m => {
                measurementsObj[m.measurement_key] = {
                    calories: m.calories,
                    protein: m.protein,
                    carbs: m.carbs,
                    fat: m.fat,
                    fiber: m.fiber
                };
            });
            
            result.basic_ingredients[row.category_name][row.ingredient_key] = {
                name: row.ingredient_name,
                measurements: measurementsObj
            };
        }
        
        return result;
    }

    async addIngredient(category, ingredientKey, ingredientData) {
        // Get or create category
        let categoryRow = await this.get('SELECT id FROM categories WHERE name = ?', [category]);
        
        if (!categoryRow) {
            const result = await this.run('INSERT INTO categories (name) VALUES (?)', [category]);
            categoryRow = { id: result.lastID };
        }
        
        // Insert ingredient (handle duplicates gracefully)
        let ingredientResult;
        try {
            ingredientResult = await this.run(
                'INSERT INTO ingredients (category_id, key, name) VALUES (?, ?, ?)',
                [categoryRow.id, ingredientKey, ingredientData.name]
            );
        } catch (err) {
            if (String(err.message || '').includes('UNIQUE') && String(err.message || '').includes('ingredients.category_id, ingredients.key')) {
                throw new Error('Ingredient already exists in this category');
            }
            throw err;
        }
        
        const ingredientId = ingredientResult.lastID;
        
        // Insert measurements
        if (ingredientData.measurements) {
            for (const [measureKey, nutrition] of Object.entries(ingredientData.measurements)) {
                try {
                    await this.run(
                        `INSERT INTO ingredient_measurements 
                        (ingredient_id, measurement_key, calories, protein, carbs, fat, fiber) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [
                            ingredientId,
                            measureKey,
                            nutrition.calories || 0,
                            nutrition.protein || 0,
                            nutrition.carbs || 0,
                            nutrition.fat || 0,
                            nutrition.fiber || 0
                        ]
                    );
                } catch (err) {
                    if (String(err.message || '').includes('UNIQUE') && String(err.message || '').includes('ingredient_measurements')) {
                        throw new Error('Measurement key already exists for this ingredient');
                    }
                    throw err;
                }
            }
        }
        
        return { success: true, ingredientId };
    }

    async updateIngredient(category, ingredientKey, ingredientData) {
        // Get category ID
        const categoryRow = await this.get('SELECT id FROM categories WHERE name = ?', [category]);
        if (!categoryRow) {
            throw new Error('Category not found');
        }
        
        // Get ingredient
        const ingredient = await this.get(
            'SELECT id FROM ingredients WHERE category_id = ? AND key = ?',
            [categoryRow.id, ingredientKey]
        );
        
        if (!ingredient) {
            throw new Error('Ingredient not found');
        }
        
        // Update ingredient name
        await this.run(
            'UPDATE ingredients SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [ingredientData.name, ingredient.id]
        );
        
        // Delete old measurements
        await this.run('DELETE FROM ingredient_measurements WHERE ingredient_id = ?', [ingredient.id]);
        
        // Insert new measurements
        if (ingredientData.measurements) {
            for (const [measureKey, nutrition] of Object.entries(ingredientData.measurements)) {
                await this.run(
                    `INSERT INTO ingredient_measurements 
                    (ingredient_id, measurement_key, calories, protein, carbs, fat, fiber) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        ingredient.id,
                        measureKey,
                        nutrition.calories || 0,
                        nutrition.protein || 0,
                        nutrition.carbs || 0,
                        nutrition.fat || 0,
                        nutrition.fiber || 0
                    ]
                );
            }
        }
        
        return { success: true };
    }

    async deleteIngredient(category, ingredientKey) {
        const categoryRow = await this.get('SELECT id FROM categories WHERE name = ?', [category]);
        if (!categoryRow) {
            throw new Error('Category not found');
        }
        
        const ingredient = await this.get(
            'SELECT id, name FROM ingredients WHERE category_id = ? AND key = ?',
            [categoryRow.id, ingredientKey]
        );
        
        if (!ingredient) {
            throw new Error('Ingredient not found');
        }
        
        await this.run('DELETE FROM ingredients WHERE id = ?', [ingredient.id]);
        
        return { success: true, name: ingredient.name };
    }

    async getCategories() {
        const rows = await this.all('SELECT name FROM categories ORDER BY name');
        return rows.map(r => r.name);
    }

    // Get a single ingredient with its measurements
    async getIngredient(category, ingredientKey) {
        const categoryRow = await this.get('SELECT id FROM categories WHERE name = ?', [category]);
        if (!categoryRow) {
            return null;
        }

        const ingredient = await this.get(
            'SELECT id, name FROM ingredients WHERE category_id = ? AND key = ?',
            [categoryRow.id, ingredientKey]
        );

        if (!ingredient) {
            return null;
        }

        const measurements = await this.all(
            `SELECT measurement_key, calories, protein, carbs, fat, fiber 
             FROM ingredient_measurements WHERE ingredient_id = ?`,
            [ingredient.id]
        );

        const measurementsObj = {};
        measurements.forEach(m => {
            measurementsObj[m.measurement_key] = {
                calories: m.calories,
                protein: m.protein,
                carbs: m.carbs,
                fat: m.fat,
                fiber: m.fiber
            };
        });

        return { id: ingredient.id, name: ingredient.name, key: ingredientKey, measurements: measurementsObj };
    }

    // ============= RECIPES METHODS =============
    
    async getAllRecipes() {
        const recipes = await this.all(`
            SELECT r.*, 
                   rn.calories, rn.protein, rn.carbs, rn.fat, rn.fiber
            FROM recipes r
            LEFT JOIN recipe_nutrition rn ON r.id = rn.recipe_id
            ORDER BY r.name
        `);
        
        const result = { dishes: {} };
        
        for (const recipe of recipes) {
            // Get recipe ingredients
            const ingredients = await this.all(
                `SELECT ingredient_key, ingredient_name, amount, 
                        calories, protein, carbs, fat, fiber
                 FROM recipe_ingredients 
                 WHERE recipe_id = ?`,
                [recipe.id]
            );
            
            result.dishes[recipe.key] = {
                name: recipe.name,
                category: recipe.category,
                servings: recipe.servings,
                total_per_serving: {
                    calories: recipe.calories || 0,
                    protein: recipe.protein || 0,
                    carbs: recipe.carbs || 0,
                    fat: recipe.fat || 0,
                    fiber: recipe.fiber || 0
                },
                ingredients: ingredients.map(ing => ({
                    key: ing.ingredient_key,
                    name: ing.ingredient_name,
                    amount: ing.amount,
                    nutrition: {
                        calories: ing.calories,
                        protein: ing.protein,
                        carbs: ing.carbs,
                        fat: ing.fat,
                        fiber: ing.fiber
                    }
                }))
            };
        }
        
        return result;
    }

    async addRecipe(recipeKey, recipeData) {
        const result = await this.run(
            'INSERT INTO recipes (key, name, category, servings) VALUES (?, ?, ?, ?)',
            [recipeKey, recipeData.name, recipeData.category || null, recipeData.servings || 1]
        );
        
        const recipeId = result.lastID;
        
        // Add nutrition
        if (recipeData.total_per_serving) {
            await this.run(
                `INSERT INTO recipe_nutrition 
                (recipe_id, calories, protein, carbs, fat, fiber) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    recipeId,
                    recipeData.total_per_serving.calories || 0,
                    recipeData.total_per_serving.protein || 0,
                    recipeData.total_per_serving.carbs || 0,
                    recipeData.total_per_serving.fat || 0,
                    recipeData.total_per_serving.fiber || 0
                ]
            );
        }
        
        // Add ingredients
        if (recipeData.ingredients && Array.isArray(recipeData.ingredients)) {
            for (const ingredient of recipeData.ingredients) {
                await this.run(
                    `INSERT INTO recipe_ingredients 
                    (recipe_id, ingredient_key, ingredient_name, amount, calories, protein, carbs, fat, fiber) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        recipeId,
                        ingredient.key || '',
                        ingredient.name || '',
                        ingredient.amount || '',
                        ingredient.nutrition?.calories || 0,
                        ingredient.nutrition?.protein || 0,
                        ingredient.nutrition?.carbs || 0,
                        ingredient.nutrition?.fat || 0,
                        ingredient.nutrition?.fiber || 0
                    ]
                );
            }
        }
        
        return { success: true, recipeId };
    }

    async updateRecipe(recipeKey, recipeData) {
        const recipe = await this.get('SELECT id FROM recipes WHERE key = ?', [recipeKey]);
        
        if (!recipe) {
            throw new Error('Recipe not found');
        }
        
        // Update recipe
        await this.run(
            'UPDATE recipes SET name = ?, category = ?, servings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [recipeData.name, recipeData.category || null, recipeData.servings || 1, recipe.id]
        );
        
        // Update nutrition
        await this.run('DELETE FROM recipe_nutrition WHERE recipe_id = ?', [recipe.id]);
        if (recipeData.total_per_serving) {
            await this.run(
                `INSERT INTO recipe_nutrition 
                (recipe_id, calories, protein, carbs, fat, fiber) 
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    recipe.id,
                    recipeData.total_per_serving.calories || 0,
                    recipeData.total_per_serving.protein || 0,
                    recipeData.total_per_serving.carbs || 0,
                    recipeData.total_per_serving.fat || 0,
                    recipeData.total_per_serving.fiber || 0
                ]
            );
        }
        
        // Update ingredients
        await this.run('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [recipe.id]);
        if (recipeData.ingredients && Array.isArray(recipeData.ingredients)) {
            for (const ingredient of recipeData.ingredients) {
                await this.run(
                    `INSERT INTO recipe_ingredients 
                    (recipe_id, ingredient_key, ingredient_name, amount, calories, protein, carbs, fat, fiber) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        recipe.id,
                        ingredient.key || '',
                        ingredient.name || '',
                        ingredient.amount || '',
                        ingredient.nutrition?.calories || 0,
                        ingredient.nutrition?.protein || 0,
                        ingredient.nutrition?.carbs || 0,
                        ingredient.nutrition?.fat || 0,
                        ingredient.nutrition?.fiber || 0
                    ]
                );
            }
        }
        
        return { success: true };
    }

    async deleteRecipe(recipeKey) {
        const recipe = await this.get('SELECT id, name FROM recipes WHERE key = ?', [recipeKey]);
        
        if (!recipe) {
            throw new Error('Recipe not found');
        }
        
        await this.run('DELETE FROM recipes WHERE id = ?', [recipe.id]);
        
        return { success: true, name: recipe.name };
    }

    // ============= MEALS METHODS =============
    
    async getMealsByDate(date) {
        const meals = await this.all(
            `SELECT id, description, meal_type, date, timestamp, source,
                    calories, protein, carbs, fat, fiber, ingredient_data
             FROM meals 
             WHERE date = ? 
             ORDER BY timestamp`,
            [date]
        );
        
        return meals.map(meal => ({
            id: meal.id,
            description: meal.description,
            mealType: meal.meal_type,
            date: meal.date,
            timestamp: meal.timestamp,
            source: meal.source,
            nutrition: {
                calories: meal.calories,
                protein: meal.protein,
                carbs: meal.carbs,
                fat: meal.fat,
                fiber: meal.fiber
            },
            ingredient_data: meal.ingredient_data ? JSON.parse(meal.ingredient_data) : null
        }));
    }

    async getMealsByDateRange(startDate, endDate) {
        const query = `
            SELECT date, 
                   json_group_array(
                       json_object(
                           'id', id,
                           'description', description,
                           'mealType', meal_type,
                           'date', date,
                           'timestamp', timestamp,
                           'source', source,
                           'nutrition', json_object(
                               'calories', calories,
                               'protein', protein,
                               'carbs', carbs,
                               'fat', fat,
                               'fiber', fiber
                           ),
                           'ingredient_data', ingredient_data
                       )
                   ) as meals
            FROM meals
            WHERE date >= ? AND date <= ?
            GROUP BY date
            ORDER BY date
        `;
        
        const rows = await this.all(query, [startDate, endDate]);
        const result = {};
        
        rows.forEach(row => {
            result[row.date] = JSON.parse(row.meals).map(meal => ({
                ...meal,
                ingredient_data: meal.ingredient_data ? JSON.parse(meal.ingredient_data) : null
            }));
        });
        
        return result;
    }

    async addMeal(mealData) {
        const ingredientData = mealData.ingredient_data ? JSON.stringify(mealData.ingredient_data) : null;
        
        const result = await this.run(
            `INSERT INTO meals 
            (id, description, meal_type, date, timestamp, source, 
             calories, protein, carbs, fat, fiber, ingredient_data) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                mealData.id || Date.now(),
                mealData.description || '',
                mealData.mealType || '',
                mealData.date || '',
                mealData.timestamp || new Date().toISOString(),
                mealData.source || '',
                mealData.nutrition?.calories || 0,
                mealData.nutrition?.protein || 0,
                mealData.nutrition?.carbs || 0,
                mealData.nutrition?.fat || 0,
                mealData.nutrition?.fiber || 0,
                ingredientData
            ]
        );
        
        return { success: true, mealId: result.lastID };
    }

    async updateMeal(mealId, mealData) {
        const ingredientData = mealData.ingredient_data ? JSON.stringify(mealData.ingredient_data) : null;
        
        await this.run(
            `UPDATE meals 
            SET description = ?, meal_type = ?, date = ?, timestamp = ?, source = ?,
                calories = ?, protein = ?, carbs = ?, fat = ?, fiber = ?, ingredient_data = ?
            WHERE id = ?`,
            [
                mealData.description || '',
                mealData.mealType || '',
                mealData.date || '',
                mealData.timestamp || new Date().toISOString(),
                mealData.source || '',
                mealData.nutrition?.calories || 0,
                mealData.nutrition?.protein || 0,
                mealData.nutrition?.carbs || 0,
                mealData.nutrition?.fat || 0,
                mealData.nutrition?.fiber || 0,
                ingredientData,
                mealId
            ]
        );
        
        return { success: true };
    }

    async deleteMeal(mealId) {
        await this.run('DELETE FROM meals WHERE id = ?', [mealId]);
        return { success: true };
    }

    async getDailySummary(date) {
        const summary = await this.get(
            `SELECT * FROM daily_summary WHERE date = ?`,
            [date]
        );
        
        if (!summary) {
            return {
                date,
                total_calories: 0,
                total_protein: 0,
                total_carbs: 0,
                total_fat: 0,
                total_fiber: 0,
                meal_count: 0
            };
        }
        
        return summary;
    }

    async getWeeklySummary(startDate, endDate) {
        const summaries = await this.all(
            `SELECT * FROM daily_summary 
             WHERE date >= ? AND date <= ? 
             ORDER BY date`,
            [startDate, endDate]
        );
        
        return summaries;
    }

    // ============= HABIT DEFINITIONS METHODS =============

    async getHabitDefinitions() {
        return this.all(`SELECT * FROM habit_definitions ORDER BY sort_order, id`);
    }

    async addHabitDefinition(name, emoji, type) {
        const maxOrder = await this.get(`SELECT MAX(sort_order) as max_order FROM habit_definitions`);
        const sortOrder = (maxOrder?.max_order || 0) + 1;
        const result = await this.run(
            `INSERT INTO habit_definitions (name, emoji, type, built_in, sort_order) VALUES (?, ?, ?, 0, ?)`,
            [name, emoji || '✅', type || 'toggle', sortOrder]
        );
        return { id: result.lastID, name, emoji: emoji || '✅', type: type || 'toggle', built_in: 0, sort_order: sortOrder };
    }

    async deleteHabitDefinition(id) {
        const habit = await this.get(`SELECT * FROM habit_definitions WHERE id = ?`, [id]);
        if (!habit) throw new Error('Habit not found');
        if (habit.built_in === 1) throw new Error('Cannot delete built-in habit');
        await this.run(`DELETE FROM habit_definitions WHERE id = ?`, [id]);
        return { success: true, name: habit.name };
    }

    // ============= HABIT ENTRIES METHODS =============

    async getHabitEntriesByDate(date) {
        return this.all(`
            SELECT hd.id as habit_id, hd.name, hd.emoji, hd.type, hd.built_in, hd.sort_order,
                   COALESCE(he.value, 0) as value, COALESCE(he.text_value, '') as text_value, he.id as entry_id
            FROM habit_definitions hd
            LEFT JOIN habit_entries he ON hd.id = he.habit_id AND he.date = ?
            ORDER BY hd.sort_order, hd.id
        `, [date]);
    }

    async upsertHabitEntry(habitId, date, value, textValue) {
        const tv = textValue || '';
        await this.run(
            `INSERT INTO habit_entries (habit_id, date, value, text_value, updated_at)
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(habit_id, date) DO UPDATE SET value = ?, text_value = ?, updated_at = CURRENT_TIMESTAMP`,
            [habitId, date, value, tv, value, tv]
        );
        return { success: true };
    }

    // ============= MEDICATION STATS METHODS =============

    async getMedicationStats(habitName) {
        // Get habit ID by name
        const habit = await this.get(
            `SELECT id FROM habit_definitions WHERE name = ?`,
            [habitName]
        );
        
        if (!habit) {
            return { error: 'Habit not found', habitName };
        }

        // Get all entries for this habit (ordered by date)
        const entries = await this.all(
            `SELECT date, value FROM habit_entries WHERE habit_id = ? ORDER BY date ASC`,
            [habit.id]
        );

        // Start date: March 21, 2026 (when you started tracking)
        const startDate = new Date(2026, 2, 21); // March 21, 2026
        const today = new Date();
        const todayKey = this._formatDateKey(today);

        // Calculate year start (January 1 of current year or start date, whichever is later)
        const yearStart = startDate;

        // Build a map of dates with values
        const dateMap = {};
        entries.forEach(e => {
            dateMap[e.date] = e.value;
        });

        // Calculate current streak (consecutive days taken from today backwards)
        let currentStreak = 0;
        let checkDate = new Date(today);
        while (checkDate >= startDate) {
            const dateKey = this._formatDateKey(checkDate);
            if (dateMap[dateKey] && dateMap[dateKey] > 0) {
                currentStreak++;
            } else {
                break;
            }
            checkDate.setDate(checkDate.getDate() - 1);
        }

        // Calculate longest streak ever
        let longestStreak = 0;
        let tempStreak = 0;
        let tempStreakStart = null;
        let longestStreakStart = null;

        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
            const dateKey = this._formatDateKey(d);
            if (dateMap[dateKey] && dateMap[dateKey] > 0) {
                if (tempStreak === 0) {
                    tempStreakStart = new Date(d);
                }
                tempStreak++;
                if (tempStreak > longestStreak) {
                    longestStreak = tempStreak;
                    longestStreakStart = tempStreakStart;
                }
            } else {
                tempStreak = 0;
                tempStreakStart = null;
            }
        }

        // Count total days taken and days skipped in the year
        let daysTaken = 0;
        let daysSkipped = 0;
        
        for (let d = new Date(yearStart); d <= today; d.setDate(d.getDate() + 1)) {
            const dateKey = this._formatDateKey(d);
            if (dateMap[dateKey] && dateMap[dateKey] > 0) {
                daysTaken++;
            } else {
                daysSkipped++;
            }
        }

        // Get first date taken
        let firstDateTaken = null;
        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
            const dateKey = this._formatDateKey(d);
            if (dateMap[dateKey] && dateMap[dateKey] > 0) {
                firstDateTaken = dateKey;
                break;
            }
        }

        return {
            habitName,
            habitId: habit.id,
            startDate: this._formatDateKey(startDate),
            firstDateTaken,
            currentStreak,
            longestStreak,
            longestStreakStart: longestStreakStart ? this._formatDateKey(longestStreakStart) : null,
            daysTaken,
            daysSkipped,
            totalDaysTracked: daysTaken + daysSkipped,
            adherencePercentage: ((daysTaken / (daysTaken + daysSkipped)) * 100).toFixed(1)
        };
    }

    _formatDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // ============= MOOD ENTRIES METHODS =============

    async getMoodEntry(date) {
        const entry = await this.get(`SELECT * FROM mood_entries WHERE date = ?`, [date]);
        return entry || { date, mood: 3, diary: '' };
    }

    async upsertMoodEntry(date, mood, diary) {
        await this.run(
            `INSERT INTO mood_entries (date, mood, diary, updated_at)
             VALUES (?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(date) DO UPDATE SET mood = ?, diary = ?, updated_at = CURRENT_TIMESTAMP`,
            [date, mood, diary, mood, diary]
        );
        return { success: true };
    }

    // ============= EXPENDITURE CATEGORIES METHODS =============

    async getExpenditureCategories() {
        return this.all(`SELECT * FROM expenditure_categories ORDER BY sort_order, id`);
    }

    async addExpenditureCategory(name, emoji) {
        const maxOrder = await this.get(`SELECT MAX(sort_order) as max_order FROM expenditure_categories`);
        const sortOrder = (maxOrder?.max_order || 0) + 1;
        const result = await this.run(
            `INSERT INTO expenditure_categories (name, emoji, built_in, sort_order) VALUES (?, ?, 0, ?)`,
            [name, emoji || '💰', sortOrder]
        );
        return { id: result.lastID, name, emoji: emoji || '💰', built_in: 0, sort_order: sortOrder };
    }

    async deleteExpenditureCategory(id) {
        const cat = await this.get(`SELECT * FROM expenditure_categories WHERE id = ?`, [id]);
        if (!cat) throw new Error('Category not found');
        if (cat.built_in === 1) throw new Error('Cannot delete built-in category');
        await this.run(`DELETE FROM expenditure_categories WHERE id = ?`, [id]);
        return { success: true, name: cat.name };
    }

    // ============= EXPENDITURE ENTRIES METHODS =============

    async getExpenditureEntriesByDate(date) {
        return this.all(`
            SELECT ec.id as category_id, ec.name, ec.emoji, ec.built_in, ec.sort_order,
                   COALESCE(ee.amount, 0) as amount, ee.id as entry_id
            FROM expenditure_categories ec
            LEFT JOIN expenditure_entries ee ON ec.id = ee.category_id AND ee.date = ?
            ORDER BY ec.sort_order, ec.id
        `, [date]);
    }

    async upsertExpenditureEntry(categoryId, date, amount) {
        await this.run(
            `INSERT INTO expenditure_entries (category_id, date, amount, updated_at)
             VALUES (?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(category_id, date) DO UPDATE SET amount = ?, updated_at = CURRENT_TIMESTAMP`,
            [categoryId, date, amount, amount]
        );
        return { success: true };
    }

    // ============= EXERCISE/WEIGHT/SETTINGS TABLES INIT =============

    async _initExerciseWeightTables() {
        await this.run(`CREATE TABLE IF NOT EXISTS exercises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            duration REAL DEFAULT 0,
            calories REAL DEFAULT 0,
            notes TEXT DEFAULT '',
            timestamp TEXT DEFAULT (datetime('now'))
        )`);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_exercises_date ON exercises(date)`);

        await this.run(`CREATE TABLE IF NOT EXISTS weight_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL UNIQUE,
            weight REAL NOT NULL,
            height REAL DEFAULT 0,
            bmi REAL DEFAULT 0,
            bmi_category TEXT DEFAULT '',
            age INTEGER,
            gender TEXT,
            bmr_mifflin REAL DEFAULT 0,
            bmr_harris REAL DEFAULT 0,
            calorie_goal REAL DEFAULT 0,
            notes TEXT DEFAULT '',
            is_nursing INTEGER DEFAULT 0,
            unit_system TEXT DEFAULT 'imperial',
            original_weight REAL DEFAULT 0,
            original_height REAL DEFAULT 0,
            timestamp TEXT DEFAULT (datetime('now'))
        )`);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_weight_entries_date ON weight_entries(date)`);

        await this.run(`CREATE TABLE IF NOT EXISTS user_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )`);
    }

    // ============= EXERCISE METHODS =============

    async getExercisesByDate(date) {
        return this.all(`SELECT * FROM exercises WHERE date = ? ORDER BY timestamp`, [date]);
    }

    async addExercise(data) {
        const result = await this.run(
            `INSERT INTO exercises (date, type, name, duration, calories, notes, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [data.date, data.type, data.name, data.duration || 0, data.calories || 0, data.notes || '', data.timestamp || new Date().toISOString()]
        );
        return { success: true, id: result.lastID };
    }

    async updateExercise(id, data) {
        await this.run(
            `UPDATE exercises SET type = ?, name = ?, duration = ?, calories = ?, notes = ?, timestamp = ? WHERE id = ?`,
            [data.type, data.name, data.duration || 0, data.calories || 0, data.notes || '', data.timestamp || new Date().toISOString(), id]
        );
        return { success: true };
    }

    async deleteExercise(id) {
        await this.run(`DELETE FROM exercises WHERE id = ?`, [id]);
        return { success: true };
    }

    async deleteExercisesByDate(date) {
        const result = await this.run(`DELETE FROM exercises WHERE date = ?`, [date]);
        return { success: true, deleted: result.changes };
    }

    // ============= WEIGHT METHODS =============

    async getWeightEntry(date) {
        return this.get(`SELECT * FROM weight_entries WHERE date = ?`, [date]);
    }

    async getWeightEntries(startDate, endDate) {
        return this.all(`SELECT * FROM weight_entries WHERE date >= ? AND date <= ? ORDER BY date`, [startDate, endDate]);
    }

    async upsertWeightEntry(data) {
        await this.run(
            `INSERT INTO weight_entries (date, weight, height, bmi, bmi_category, age, gender, bmr_mifflin, bmr_harris, calorie_goal, notes, is_nursing, unit_system, original_weight, original_height, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(date) DO UPDATE SET
                weight = ?, height = ?, bmi = ?, bmi_category = ?, age = ?, gender = ?,
                bmr_mifflin = ?, bmr_harris = ?, calorie_goal = ?, notes = ?,
                is_nursing = ?, unit_system = ?, original_weight = ?, original_height = ?,
                timestamp = ?`,
            [
                data.date, data.weight, data.height || 0, data.bmi || 0, data.bmiCategory || '',
                data.age || null, data.gender || null, data.bmrMifflin || 0, data.bmrHarris || 0,
                data.calorieGoal || 0, data.notes || '', data.isNursing ? 1 : 0,
                data.unitSystem || 'imperial', data.originalWeight || 0, data.originalHeight || 0,
                data.timestamp || new Date().toISOString(),
                // ON CONFLICT values:
                data.weight, data.height || 0, data.bmi || 0, data.bmiCategory || '',
                data.age || null, data.gender || null, data.bmrMifflin || 0, data.bmrHarris || 0,
                data.calorieGoal || 0, data.notes || '', data.isNursing ? 1 : 0,
                data.unitSystem || 'imperial', data.originalWeight || 0, data.originalHeight || 0,
                data.timestamp || new Date().toISOString()
            ]
        );
        return { success: true };
    }

    async getLatestWeightEntry() {
        return this.get(`SELECT * FROM weight_entries ORDER BY date DESC LIMIT 1`);
    }

    // ============= USER SETTINGS METHODS =============

    async getSetting(key) {
        const row = await this.get(`SELECT value FROM user_settings WHERE key = ?`, [key]);
        return row ? row.value : null;
    }

    async setSetting(key, value) {
        await this.run(
            `INSERT INTO user_settings (key, value) VALUES (?, ?)
             ON CONFLICT(key) DO UPDATE SET value = ?`,
            [key, typeof value === 'string' ? value : JSON.stringify(value), typeof value === 'string' ? value : JSON.stringify(value)]
        );
        return { success: true };
    }

    async getAllSettings() {
        const rows = await this.all(`SELECT key, value FROM user_settings`);
        const settings = {};
        rows.forEach(row => { settings[row.key] = row.value; });
        return settings;
    }

    // ============= BILLS & GROCERIES TABLES INIT =============

    async _initBillsTables() {
        await this.run(`CREATE TABLE IF NOT EXISTS bill_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'bills',
            description TEXT NOT NULL,
            amount REAL NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        await this.run(`CREATE INDEX IF NOT EXISTS idx_bill_items_date_cat ON bill_items(date, category)`);
    }

    // ============= BILLS & GROCERIES METHODS =============

    async getBillItemsByDate(date, category) {
        return this.all(
            `SELECT * FROM bill_items WHERE date = ? AND category = ? ORDER BY id`,
            [date, category]
        );
    }

    async addBillItem(date, category, description, amount) {
        const result = await this.run(
            `INSERT INTO bill_items (date, category, description, amount) VALUES (?, ?, ?, ?)`,
            [date, category, description, amount]
        );
        return { id: result.lastID, date, category, description, amount };
    }

    async updateBillItem(id, description, amount) {
        await this.run(
            `UPDATE bill_items SET description = ?, amount = ? WHERE id = ?`,
            [description, amount, id]
        );
        return { success: true };
    }

    async deleteBillItem(id) {
        await this.run(`DELETE FROM bill_items WHERE id = ?`, [id]);
        return { success: true };
    }

    // Close database connection
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = DatabaseService;
