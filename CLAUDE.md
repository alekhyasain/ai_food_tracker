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
- `database/schema.sql` — tables: categories, ingredients, ingredient_measurements, recipes, recipe_nutrition, recipe_ingredients, meals, daily_summary, habit_definitions, habit_entries, mood_entries
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
- `GET /health`

## Environment

- `PORT` env var (default 3000)

## Key Patterns

- No auth — local-use only
- Dual server support: `server-db.js` (SQLite, primary) and `server.js` (JSON files, legacy)
- Frontend is a single monolithic HTML file with inline JS and Tailwind CSS
- Database path: `./database/food_tracker.db`
