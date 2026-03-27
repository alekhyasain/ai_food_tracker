-- Food Tracker Database Schema

-- Categories table for ingredient categorization
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(category_id, key)
);

-- Ingredient measurements table
CREATE TABLE IF NOT EXISTS ingredient_measurements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER NOT NULL,
    measurement_key TEXT NOT NULL,
    calories REAL DEFAULT 0,
    protein REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    fiber REAL DEFAULT 0,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    UNIQUE(ingredient_id, measurement_key)
);

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    servings INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Recipe nutrition table (total per serving)
CREATE TABLE IF NOT EXISTS recipe_nutrition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL UNIQUE,
    calories REAL DEFAULT 0,
    protein REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    fiber REAL DEFAULT 0,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Recipe ingredients table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    ingredient_key TEXT NOT NULL,
    ingredient_name TEXT NOT NULL,
    amount TEXT NOT NULL,
    calories REAL DEFAULT 0,
    protein REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    fiber REAL DEFAULT 0,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Meals table (food diary entries)
CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY,
    description TEXT NOT NULL,
    meal_type TEXT NOT NULL,
    date TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    source TEXT,
    calories REAL DEFAULT 0,
    protein REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    fiber REAL DEFAULT 0,
    ingredient_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily summary table for quick analytics
CREATE TABLE IF NOT EXISTS daily_summary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    total_calories REAL DEFAULT 0,
    total_protein REAL DEFAULT 0,
    total_carbs REAL DEFAULT 0,
    total_fat REAL DEFAULT 0,
    total_fiber REAL DEFAULT 0,
    meal_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Custom habit definitions
CREATE TABLE IF NOT EXISTS habit_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '✅',
    type TEXT NOT NULL DEFAULT 'toggle',  -- 'toggle' or 'counter'
    built_in INTEGER NOT NULL DEFAULT 0,  -- 1 = system habit, can't delete
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily habit entries (one row per habit per date)
CREATE TABLE IF NOT EXISTS habit_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    value INTEGER NOT NULL DEFAULT 0,  -- toggle: 0/1, counter: count
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (habit_id) REFERENCES habit_definitions(id) ON DELETE CASCADE,
    UNIQUE(habit_id, date)
);

-- Daily mood diary (one per date)
CREATE TABLE IF NOT EXISTS mood_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    mood INTEGER NOT NULL DEFAULT 3,     -- 1-5 scale
    diary TEXT DEFAULT '',               -- free-text journal
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Expenditure category definitions (like habit_definitions)
CREATE TABLE IF NOT EXISTS expenditure_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '💰',
    built_in INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily expenditure entries per category (like habit_entries)
CREATE TABLE IF NOT EXISTS expenditure_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES expenditure_categories(id) ON DELETE CASCADE,
    UNIQUE(category_id, date)
);

-- Bills & Groceries line items
CREATE TABLE IF NOT EXISTS bill_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'bills',
    description TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Exercises table
CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    duration REAL DEFAULT 0,
    calories REAL DEFAULT 0,
    notes TEXT DEFAULT '',
    timestamp TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_exercises_date ON exercises(date);

-- Weight entries table
CREATE TABLE IF NOT EXISTS weight_entries (
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
);
CREATE INDEX IF NOT EXISTS idx_weight_entries_date ON weight_entries(date);

-- User settings table (for scalar values)
CREATE TABLE IF NOT EXISTS user_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category_id);
CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
CREATE INDEX IF NOT EXISTS idx_meals_meal_type ON meals(meal_type);
CREATE INDEX IF NOT EXISTS idx_daily_summary_date ON daily_summary(date);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_habit_entries_date ON habit_entries(date);
CREATE INDEX IF NOT EXISTS idx_mood_entries_date ON mood_entries(date);
CREATE INDEX IF NOT EXISTS idx_expenditure_entries_date ON expenditure_entries(date);
CREATE INDEX IF NOT EXISTS idx_bill_items_date_cat ON bill_items(date, category);

-- Triggers to update daily summary
CREATE TRIGGER IF NOT EXISTS update_daily_summary_on_insert
AFTER INSERT ON meals
BEGIN
    INSERT INTO daily_summary (date, total_calories, total_protein, total_carbs, total_fat, total_fiber, meal_count)
    VALUES (NEW.date, NEW.calories, NEW.protein, NEW.carbs, NEW.fat, NEW.fiber, 1)
    ON CONFLICT(date) DO UPDATE SET
        total_calories = total_calories + NEW.calories,
        total_protein = total_protein + NEW.protein,
        total_carbs = total_carbs + NEW.carbs,
        total_fat = total_fat + NEW.fat,
        total_fiber = total_fiber + NEW.fiber,
        meal_count = meal_count + 1,
        updated_at = CURRENT_TIMESTAMP;
END;

CREATE TRIGGER IF NOT EXISTS update_daily_summary_on_delete
AFTER DELETE ON meals
BEGIN
    UPDATE daily_summary 
    SET total_calories = total_calories - OLD.calories,
        total_protein = total_protein - OLD.protein,
        total_carbs = total_carbs - OLD.carbs,
        total_fat = total_fat - OLD.fat,
        total_fiber = total_fiber - OLD.fiber,
        meal_count = meal_count - 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE date = OLD.date;
    
    DELETE FROM daily_summary WHERE date = OLD.date AND meal_count = 0;
END;

CREATE TRIGGER IF NOT EXISTS update_daily_summary_on_update
AFTER UPDATE ON meals
BEGIN
    UPDATE daily_summary 
    SET total_calories = total_calories - OLD.calories + NEW.calories,
        total_protein = total_protein - OLD.protein + NEW.protein,
        total_carbs = total_carbs - OLD.carbs + NEW.carbs,
        total_fat = total_fat - OLD.fat + NEW.fat,
        total_fiber = total_fiber - OLD.fiber + NEW.fiber,
        updated_at = CURRENT_TIMESTAMP
    WHERE date = OLD.date;
END;
