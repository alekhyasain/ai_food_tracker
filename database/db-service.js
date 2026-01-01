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
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error connecting to database:', err);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    resolve();
                }
            });
        });
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
