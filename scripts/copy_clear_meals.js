const path = require('path');
const DatabaseService = require('../database/db-service');

async function copyMeals(db, sourceDate, targetDate) {
  const meals = await db.getMealsByDate(sourceDate);
  const row = await db.get('SELECT MAX(id) AS max_id FROM meals');
  let nextId = (row && row.max_id) ? row.max_id + 1 : Date.now();
  let count = 0;
  for (let i = 0; i < meals.length; i++) {
    const m = meals[i];
    const newMeal = {
      id: nextId++,
      description: m.description,
      mealType: m.mealType,
      date: targetDate,
      timestamp: new Date().toISOString(),
      source: m.source || 'copy',
      nutrition: m.nutrition || {},
      ingredient_data: m.ingredient_data || null,
    };
    await db.addMeal(newMeal);
    count++;
  }
  return count;
}

async function clearMealsByDate(db, date) {
  const meals = await db.getMealsByDate(date);
  let count = 0;
  for (const m of meals) {
    await db.deleteMeal(m.id);
    count++;
  }
  return count;
}

(async () => {
  const db = new DatabaseService(path.join(__dirname, '..', 'database', 'food_tracker.db'));
  try {
    await db.connect();
    const results = {};

    // Operations per user request
    results.copy_2025_12_30_to_2025_12_29 = await copyMeals(db, '2025-12-30', '2025-12-29');
    results.copy_2025_12_31_to_2025_12_30 = await copyMeals(db, '2025-12-31', '2025-12-30');
    results.clear_2025_12_31 = await clearMealsByDate(db, '2025-12-31');

    // Fetch final counts per date for quick verification
    const dates = ['2025-12-29', '2025-12-30', '2025-12-31'];
    results.final = {};
    for (const d of dates) {
      const meals = await db.getMealsByDate(d);
      results.final[d] = { meal_count: meals.length };
    }

    console.log(JSON.stringify({ ok: true, results }, null, 2));
  } catch (err) {
    console.error(JSON.stringify({ ok: false, error: String(err && err.message ? err.message : err) }));
    process.exit(1);
  } finally {
    await db.close();
  }
})();
