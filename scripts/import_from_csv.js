#!/usr/bin/env node
/**
 * import_from_csv.js
 *
 * Reads a CSV file exported from the Google Sheets "Daily Log" template and
 * imports each row into the SQLite food tracker database.
 *
 * Usage:
 *   node scripts/import_from_csv.js path/to/Daily\ Log.csv [--dry-run] [--date YYYY-MM-DD]
 *
 * Options:
 *   --dry-run       Print what would be imported without writing to DB
 *   --date DATE     Override the date for all rows (useful if sheet date is wrong)
 *   --replace       Delete existing meals for the same date(s) before importing
 *
 * Expected CSV columns (from the template):
 *   Date, Meal Type, Food Item, Servings, Notes
 *
 * Food Item formats:
 *   "Spinach Sambar (recipe)"   → recipe lookup by name
 *   "Egg - 1 medium"            → ingredient lookup: name + measurement
 */

const fs = require('fs');
const path = require('path');
const DatabaseService = require('../database/db-service');

// ── Argument parsing ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help') {
  console.log(
    'Usage: node scripts/import_from_csv.js <file.csv> [--dry-run] [--date YYYY-MM-DD] [--replace]'
  );
  process.exit(args[0] === '--help' ? 0 : 1);
}

const csvPath = path.resolve(args[0]);
const isDryRun = args.includes('--dry-run');
const doReplace = args.includes('--replace');
const dateOverrideIdx = args.indexOf('--date');
const dateOverride =
  dateOverrideIdx !== -1 ? args[dateOverrideIdx + 1] : null;

// ── Simple CSV parser (handles quoted fields with commas/newlines) ─────────────
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field.trim());
      field = '';
    } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
      if (ch === '\r') i++;
      row.push(field.trim());
      if (row.some(c => c !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  // last field/row
  if (field || row.length > 0) {
    row.push(field.trim());
    if (row.some(c => c !== '')) rows.push(row);
  }

  return rows;
}

// ── Food item parsing ─────────────────────────────────────────────────────────
function parseFoodItem(rawFood) {
  if (!rawFood) return null;

  // Recipe: ends with " (recipe)" case-insensitive
  const recipeMatch = rawFood.match(/^(.+?)\s*\(recipe\)\s*$/i);
  if (recipeMatch) {
    return { type: 'recipe', name: recipeMatch[1].trim() };
  }

  // Ingredient: "Name - measurement key"  e.g. "Egg - 1 medium"
  const dashIdx = rawFood.lastIndexOf(' - ');
  if (dashIdx !== -1) {
    const name = rawFood.slice(0, dashIdx).trim();
    const measureDisplay = rawFood.slice(dashIdx + 3).trim();
    // Convert display back to measurement key (spaces → underscores)
    const measureKey = measureDisplay.replace(/ /g, '_');
    return { type: 'ingredient', name, measureDisplay, measureKey };
  }

  // Fallback: treat whole string as a recipe name
  return { type: 'recipe', name: rawFood.trim() };
}

// ── DB lookups ────────────────────────────────────────────────────────────────
async function lookupRecipe(db, name) {
  const recipe = await db.get(
    `SELECT r.key, r.name, r.servings,
            rn.calories, rn.protein, rn.carbs, rn.fat, rn.fiber
     FROM recipes r
     LEFT JOIN recipe_nutrition rn ON r.id = rn.recipe_id
     WHERE LOWER(r.name) = LOWER(?)`,
    [name]
  );
  return recipe || null;
}

async function lookupIngredient(db, name, measureKey) {
  // Try exact measurement key first
  let row = await db.get(
    `SELECT i.key AS ikey, i.name AS iname, c.name AS category,
            im.measurement_key, im.calories, im.protein, im.carbs, im.fat, im.fiber
     FROM ingredients i
     JOIN categories c ON i.category_id = c.id
     JOIN ingredient_measurements im ON i.id = im.ingredient_id
     WHERE LOWER(i.name) = LOWER(?) AND LOWER(im.measurement_key) = LOWER(?)`,
    [name, measureKey]
  );

  if (!row && measureKey) {
    // Try with spaces replaced by underscores (already done) vs underscores removed
    const altKey = measureKey.replace(/_/g, '');
    row = await db.get(
      `SELECT i.key AS ikey, i.name AS iname, c.name AS category,
              im.measurement_key, im.calories, im.protein, im.carbs, im.fat, im.fiber
       FROM ingredients i
       JOIN categories c ON i.category_id = c.id
       JOIN ingredient_measurements im ON i.id = im.ingredient_id
       WHERE LOWER(i.name) = LOWER(?) AND REPLACE(LOWER(im.measurement_key),'_','') = LOWER(?)`,
      [name, altKey]
    );
  }

  if (!row) {
    // Fall back: pick first measurement for this ingredient
    row = await db.get(
      `SELECT i.key AS ikey, i.name AS iname, c.name AS category,
              im.measurement_key, im.calories, im.protein, im.carbs, im.fat, im.fiber
       FROM ingredients i
       JOIN categories c ON i.category_id = c.id
       JOIN ingredient_measurements im ON i.id = im.ingredient_id
       WHERE LOWER(i.name) = LOWER(?)
       LIMIT 1`,
      [name]
    );
  }

  return row || null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, 'utf8');
  const allRows = parseCsv(raw);

  if (allRows.length < 2) {
    console.error('CSV has no data rows (needs at least a header + 1 data row).');
    process.exit(1);
  }

  // Identify header row (find row that contains "Date" and "Meal Type")
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, allRows.length); i++) {
    const joined = allRows[i].join('|').toLowerCase();
    if (joined.includes('date') && joined.includes('meal')) {
      headerIdx = i;
      break;
    }
  }

  const headers = allRows[headerIdx].map(h => h.toLowerCase().trim());
  const colDate = headers.findIndex(h => h.includes('date'));
  const colMeal = headers.findIndex(h => h.includes('meal'));
  const colFood = headers.findIndex(h => h.includes('food'));
  const colServings = headers.findIndex(h => h.includes('serving'));
  const colNotes = headers.findIndex(
    h => h.includes('note') || h.includes('comment')
  );

  if (colDate === -1 || colMeal === -1 || colFood === -1) {
    console.error(
      'Could not find required columns: Date, Meal Type, Food Item\n' +
        'Headers found: ' + allRows[headerIdx].join(', ')
    );
    process.exit(1);
  }

  const dataRows = allRows.slice(headerIdx + 1);

  const db = new DatabaseService(
    path.join(__dirname, '..', 'database', 'food_tracker.db')
  );
  await db.connect();

  try {
    const meals = [];
    const warnings = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rawDate = (row[colDate] || '').trim();
      const rawMeal = (row[colMeal] || '').trim();
      const rawFood = (row[colFood] || '').trim();
      const rawServings = (row[colServings] || '1').trim();
      const rawNotes = colNotes !== -1 ? (row[colNotes] || '').trim() : '';

      // Skip empty rows
      if (!rawFood || !rawMeal) continue;

      const date = dateOverride || rawDate || new Date().toISOString().split('T')[0];
      const servings = parseFloat(rawServings) || 1;

      const parsed = parseFoodItem(rawFood);
      if (!parsed) {
        warnings.push(`Row ${i + headerIdx + 2}: Could not parse food "${rawFood}" — skipped`);
        continue;
      }

      let nutrition = null;
      let description = '';
      let source = 'csv_import';
      let ingredient_data = null;

      if (parsed.type === 'recipe') {
        const recipe = await lookupRecipe(db, parsed.name);
        if (!recipe) {
          warnings.push(`Row ${i + headerIdx + 2}: Recipe not found: "${parsed.name}" — skipped`);
          continue;
        }
        nutrition = {
          calories: Math.round((recipe.calories || 0) * servings * 10) / 10,
          protein: Math.round((recipe.protein || 0) * servings * 10) / 10,
          carbs: Math.round((recipe.carbs || 0) * servings * 10) / 10,
          fat: Math.round((recipe.fat || 0) * servings * 10) / 10,
          fiber: Math.round((recipe.fiber || 0) * servings * 10) / 10,
        };
        description =
          servings === 1
            ? `${recipe.name} (1 serving)`
            : `${recipe.name} (${servings} servings)`;
        source = 'database';
      } else {
        const ingr = await lookupIngredient(db, parsed.name, parsed.measureKey);
        if (!ingr) {
          warnings.push(
            `Row ${i + headerIdx + 2}: Ingredient not found: "${parsed.name}" — skipped`
          );
          continue;
        }
        const mDisplay = ingr.measurement_key.replace(/_/g, ' ');
        nutrition = {
          calories: Math.round((ingr.calories || 0) * servings * 10) / 10,
          protein: Math.round((ingr.protein || 0) * servings * 10) / 10,
          carbs: Math.round((ingr.carbs || 0) * servings * 10) / 10,
          fat: Math.round((ingr.fat || 0) * servings * 10) / 10,
          fiber: Math.round((ingr.fiber || 0) * servings * 10) / 10,
        };
        description =
          servings === 1
            ? `${ingr.iname} (1x ${mDisplay})`
            : `${ingr.iname} (${servings}x ${mDisplay})`;
        source = 'enhanced_ingredient';
        ingredient_data = {
          category: ingr.category,
          key: ingr.ikey,
          measurement: ingr.measurement_key,
          quantity: servings,
        };
      }

      meals.push({
        id: Date.now() + i,
        description: rawNotes ? `${description} — ${rawNotes}` : description,
        mealType: rawMeal,
        date,
        timestamp: new Date(`${date}T12:00:00.000Z`).toISOString(),
        source,
        nutrition,
        ingredient_data,
      });
    }

    // Print warnings
    if (warnings.length) {
      console.warn('\nWarnings:');
      warnings.forEach(w => console.warn(' ⚠', w));
    }

    if (meals.length === 0) {
      console.log('\nNo meals found to import.');
      return;
    }

    // Summary before writing
    const byDate = {};
    meals.forEach(m => {
      byDate[m.date] = byDate[m.date] || [];
      byDate[m.date].push(m);
    });

    console.log(`\nFound ${meals.length} meal entries across ${Object.keys(byDate).length} date(s):`);
    for (const [date, dayMeals] of Object.entries(byDate).sort()) {
      const totalCal = dayMeals.reduce((s, m) => s + (m.nutrition?.calories || 0), 0);
      console.log(`  ${date}: ${dayMeals.length} meals, ~${Math.round(totalCal)} kcal`);
      dayMeals.forEach(m => {
        console.log(
          `    • [${m.mealType}] ${m.description} — ${Math.round(m.nutrition?.calories || 0)} kcal`
        );
      });
    }

    if (isDryRun) {
      console.log('\n[dry-run] Nothing written to database.');
      return;
    }

    // Optional: replace existing meals for affected dates
    if (doReplace) {
      for (const date of Object.keys(byDate)) {
        const existing = await db.getMealsByDate(date);
        for (const m of existing) {
          await db.deleteMeal(m.id);
        }
        if (existing.length) {
          console.log(`  Removed ${existing.length} existing meal(s) for ${date}`);
        }
      }
    }

    // Insert meals
    let inserted = 0;
    for (const meal of meals) {
      await db.addMeal(meal);
      inserted++;
    }

    console.log(`\nImported ${inserted} meal(s) successfully.`);
  } finally {
    db.db.close();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
