# Food Tracker

## Build/Run Commands

- `npm start` / `node server-db.js` — production server (port 3000)
- `npm run dev` — dev server with nodemon (auto-reload)
- `npm run start:json` / `node server.js` — legacy JSON-file-based server
- `npm run sheet:generate` — generate Excel template
- `npm run sheet:import` — import from CSV

## Architecture

- Express backend (`server-db.js`) serving a monolithic HTML frontend (`food_tracker.html`)
- SQLite database at `database/food_tracker.db`
- `database/db-service.js` — Promise-wrapped sqlite3 operations (connect, run, get, all)
- `database/schema.sql` — tables: categories, ingredients, ingredient_measurements, recipes, recipe_nutrition, recipe_ingredients, meals, daily_summary, habit_definitions, habit_entries, mood_entries, expenditure_categories, expenditure_entries, bill_items, exercises, weight_entries, user_settings
- Triggers auto-maintain `daily_summary` on meal insert/update/delete
- Legacy JSON server (`server.js`) reads from `meals.json`, `rawingredients.json`, `recipes.json`

## API Endpoints

All under `/api/`:

- `GET/POST /ingredients`, `PUT/DELETE /ingredients/:category/:key`
- `GET /categories`
- `GET/POST /recipes`, `PUT/DELETE /recipes/:key`
- `GET/POST /meals`, `PUT/DELETE /meals/:id`, `POST /meals/bulk`, `POST /meals/copy`, `DELETE /meals/by-date/:date`
- `GET /analytics/daily/:date`, `GET /analytics/weekly`
- `GET/POST /habits`, `DELETE /habits/:id`
- `GET /habits/entries/:date`, `PUT /habits/entries/:habitId`
- `GET /mood/:date`, `PUT /mood/:date`
- `GET/POST /expenditures`, `DELETE /expenditures/:id`
- `GET /expenditures/entries/:date`, `PUT /expenditures/entries/:categoryId`
- `GET /bills/:date`, `POST /bills`, `PUT/DELETE /bills/:id`
- `GET /groceries/:date`, `POST /groceries`, `PUT/DELETE /groceries/:id`
- `GET /exercises/:date`, `POST /exercises`, `PUT/DELETE /exercises/:id`
- `GET /weight`, `POST /weight`
- `GET /health`

## Environment

- `PORT` env var (default 3000)

## Key Patterns

- No auth — local-use only
- Dual server support: `server-db.js` (SQLite, primary) and `server.js` (JSON files, legacy)
- Frontend is a single monolithic HTML file with inline JS and Tailwind CSS
- Database path: `./database/food_tracker.db`

## Section Layout (top to bottom)

1. Daily Summary — calorie/macro totals with date label
2. Daily Trackers — habits grid, exercises, expenditure (all inside one card)
3. Bills & Groceries — side-by-side cards with inline line-item add/edit
4. Weight Tracking — BMI/BMR with carry-forward from last entry
5. Weekly/Monthly Trends — toggle between 7-day (Sat-Fri) and 30-day views; charts for calories, weight, exercise, expenditure, and habit heatmap
6. Food Log — meal entries for the day
7. Mood & Diary — mood selector and diary textarea

## Habit System

- Built-in habits seeded on DB init (db-service.js `_initHabitTables`)
- Inverted habits (0 = good/green): Crappy Food, Bad Expenditure, Nail Biting, Doom Scrolled, Distracted in Meeting
- Auto-toggle habits: Crappy Food (on Dessert/Fried Food meals), Bad Expenditure (on Food/Entertainment/Shopping spend > 0)
- Removed habits are cleaned up via DELETE statements in `_initHabitTables`

## Bills & Groceries

- Shared `bill_items` table with `category` column ('bills' or 'groceries')
- Inline add row appears at top of list on "+ Add" click (no prompt dialogs)
- Each row: editable description, dollar amount, delete button

## Trends

- Weekly view: Sat-Fri week containing the selected date
- Monthly view: last 30 days ending on selected date
- Habit heatmap adapts cell size for monthly (compact) vs weekly (normal)
- All section headers update with date label on navigation
