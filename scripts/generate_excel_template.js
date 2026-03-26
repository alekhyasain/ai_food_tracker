#!/usr/bin/env node
/**
 * generate_excel_template.js
 *
 * Reads recipes and ingredients from the SQLite DB, then creates an Excel
 * (.xlsx) file with:
 *   - Daily Log  — main entry sheet with Meal Type + Food Item dropdowns
 *   - Recipes    — reference sheet listing all recipes
 *   - Ingredients — reference sheet listing all ingredients by category
 *   - FoodList   — hidden sheet powering the Food Item dropdown
 *
 * Upload to Google Drive → auto-converts to Google Sheets (dropdowns preserved).
 *
 * Usage:
 *   node scripts/generate_excel_template.js [output.xlsx]
 *
 * Default output: daily_log_template.xlsx (in project root)
 */

const path = require('path');
const ExcelJS = require('exceljs');
const DatabaseService = require('../database/db-service');

const MEAL_TYPES = [
  'Breakfast',
  'Morning Snack',
  'Lunch',
  'Afternoon Snack',
  'Dinner',
  'Evening Snack',
];

function humanize(key) {
  return key.replace(/_/g, ' ');
}

async function main() {
  const outputPath = path.resolve(
    process.argv[2] || path.join(__dirname, '..', 'daily_log_template.xlsx')
  );

  const db = new DatabaseService(
    path.join(__dirname, '..', 'database', 'food_tracker.db')
  );
  await db.connect();

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const recipeRows = await db.all(`
    SELECT r.key, r.name, r.category, r.servings,
           rn.calories, rn.protein, rn.carbs, rn.fat, rn.fiber
    FROM recipes r
    LEFT JOIN recipe_nutrition rn ON r.id = rn.recipe_id
    ORDER BY r.name
  `);

  const ingredientRows = await db.all(`
    SELECT c.name AS category, i.key AS ikey, i.name AS iname,
           im.measurement_key, im.calories, im.protein, im.carbs, im.fat, im.fiber
    FROM ingredients i
    JOIN categories c ON i.category_id = c.id
    JOIN ingredient_measurements im ON i.id = im.ingredient_id
    ORDER BY c.name, i.name, im.measurement_key
  `);

  // Fetch tracker data before closing DB
  const habitDefs = await db.all(`SELECT * FROM habit_definitions ORDER BY sort_order, id`);
  const habitEntries = await db.all(`
    SELECT he.date, hd.name, hd.emoji, hd.type, he.value
    FROM habit_entries he
    JOIN habit_definitions hd ON he.habit_id = hd.id
    ORDER BY he.date DESC, hd.sort_order, hd.id
  `);
  const moodEntries = await db.all(`SELECT * FROM mood_entries ORDER BY date DESC`);

  db.db.close();

  // ── Build combined food dropdown list ───────────────────────────────────────
  // Recipes first, then ingredients
  const foodList = [
    ...recipeRows.map(r => `${r.name} (recipe)`),
    ...ingredientRows.map(i => `${i.iname} - ${humanize(i.measurement_key)}`),
  ];

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Food Tracker';
  workbook.created = new Date();

  // ── Sheet: FoodList (hidden, powers Food Item dropdown) ─────────────────────
  const foodListSheet = workbook.addWorksheet('FoodList', { state: 'veryHidden' });
  foodListSheet.getColumn(1).width = 60;
  foodList.forEach((item, i) => {
    foodListSheet.getCell(`A${i + 1}`).value = item;
  });

  // ── Sheet: MealTypes (hidden, powers Meal Type dropdown) ─────────────────────
  const mtSheet = workbook.addWorksheet('MealTypes', { state: 'veryHidden' });
  MEAL_TYPES.forEach((mt, i) => {
    mtSheet.getCell(`A${i + 1}`).value = mt;
  });

  // ── Sheet: Daily Log ─────────────────────────────────────────────────────────
  const logSheet = workbook.addWorksheet('Daily Log');

  logSheet.getColumn(1).width = 14;   // Date
  logSheet.getColumn(2).width = 18;   // Meal Type
  logSheet.getColumn(3).width = 48;   // Food Item
  logSheet.getColumn(4).width = 11;   // Servings
  logSheet.getColumn(5).width = 28;   // Notes

  // Header
  const headerRow = logSheet.getRow(1);
  headerRow.values = ['Date', 'Meal Type', 'Food Item', 'Servings', 'Notes'];
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCC5500' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 22;
  logSheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Pre-fill rows with today's date and default servings
  const today = new Date().toISOString().split('T')[0];
  for (let r = 2; r <= 52; r++) {
    const row = logSheet.getRow(r);
    row.getCell(1).value = today;
    row.getCell(1).numFmt = 'yyyy-mm-dd';
    row.getCell(4).value = 1;
    row.commit();
  }

  // Data validation: Meal Type (col B)
  logSheet.dataValidations.add('B2:B200', {
    type: 'list',
    allowBlank: true,
    showDropDown: false,
    formulae: [`MealTypes!$A$1:$A$${MEAL_TYPES.length}`],
    error: 'Choose a Meal Type from the list.',
    errorTitle: 'Invalid Meal Type',
    showErrorMessage: true,
  });

  // Data validation: Food Item (col C)
  logSheet.dataValidations.add('C2:C200', {
    type: 'list',
    allowBlank: true,
    showDropDown: false,
    formulae: [`FoodList!$A$1:$A$${foodList.length}`],
    error: 'Choose a Food Item from the list.',
    errorTitle: 'Invalid Food Item',
    showErrorMessage: true,
  });

  // Data validation: Servings > 0 (col D)
  logSheet.dataValidations.add('D2:D200', {
    type: 'decimal',
    operator: 'greaterThan',
    allowBlank: true,
    formulae: [0],
    error: 'Servings must be a positive number.',
    errorTitle: 'Invalid Servings',
    showErrorMessage: true,
  });

  // ── Sheet: Recipes ───────────────────────────────────────────────────────────
  const recipesSheet = workbook.addWorksheet('Recipes');

  recipesSheet.getColumn(1).width = 35;   // Name
  recipesSheet.getColumn(2).width = 12;   // Category
  recipesSheet.getColumn(3).width = 10;   // Servings
  recipesSheet.getColumn(4).width = 10;   // Cal/serving
  recipesSheet.getColumn(5).width = 10;   // Protein
  recipesSheet.getColumn(6).width = 10;   // Carbs
  recipesSheet.getColumn(7).width = 9;    // Fat
  recipesSheet.getColumn(8).width = 9;    // Fiber

  const rHeader = recipesSheet.getRow(1);
  rHeader.values = ['Recipe Name', 'Category', 'Servings', 'Cal/serving', 'Protein g', 'Carbs g', 'Fat g', 'Fiber g'];
  rHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  rHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A6B3C' } };
  rHeader.alignment = { horizontal: 'center' };

  recipeRows.forEach((r, i) => {
    const row = recipesSheet.getRow(i + 2);
    row.values = [
      r.name,
      r.category || '',
      r.servings || 1,
      Math.round((r.calories || 0) * 10) / 10,
      Math.round((r.protein || 0) * 10) / 10,
      Math.round((r.carbs || 0) * 10) / 10,
      Math.round((r.fat || 0) * 10) / 10,
      Math.round((r.fiber || 0) * 10) / 10,
    ];
    if (i % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
    }
    row.commit();
  });

  // Auto-filter
  recipesSheet.autoFilter = { from: 'A1', to: 'H1' };

  // ── Sheet: Ingredients ──────────────────────────────────────────────────────
  const ingrSheet = workbook.addWorksheet('Ingredients');

  ingrSheet.getColumn(1).width = 20;   // Category
  ingrSheet.getColumn(2).width = 30;   // Ingredient
  ingrSheet.getColumn(3).width = 22;   // Measurement
  ingrSheet.getColumn(4).width = 8;    // Dropdown label
  ingrSheet.getColumn(5).width = 10;   // Cal
  ingrSheet.getColumn(6).width = 10;   // Protein
  ingrSheet.getColumn(7).width = 10;   // Carbs
  ingrSheet.getColumn(8).width = 9;    // Fat
  ingrSheet.getColumn(9).width = 9;    // Fiber

  const iHeader = ingrSheet.getRow(1);
  iHeader.values = ['Category', 'Ingredient', 'Measurement Key', 'Dropdown Label', 'Cal', 'Protein g', 'Carbs g', 'Fat g', 'Fiber g'];
  iHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  iHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D47A1' } };
  iHeader.alignment = { horizontal: 'center' };

  ingredientRows.forEach((i, idx) => {
    const row = ingrSheet.getRow(idx + 2);
    row.values = [
      i.category,
      i.iname,
      i.measurement_key,
      `${i.iname} - ${humanize(i.measurement_key)}`,
      Math.round((i.calories || 0) * 10) / 10,
      Math.round((i.protein || 0) * 10) / 10,
      Math.round((i.carbs || 0) * 10) / 10,
      Math.round((i.fat || 0) * 10) / 10,
      Math.round((i.fiber || 0) * 10) / 10,
    ];
    if (idx % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
    }
    row.commit();
  });

  ingrSheet.autoFilter = { from: 'A1', to: 'I1' };

  // ── Sheet: Trackers (Habits + Mood) ─────────────────────────────────────────
  const trackSheet = workbook.addWorksheet('Trackers');

  // Build columns: Date, then one col per habit, then Mood, Diary
  const trackHeaders = ['Date', ...habitDefs.map(h => `${h.emoji} ${h.name}`), 'Mood', 'Diary'];
  const trackColWidths = [14, ...habitDefs.map(() => 14), 8, 40];
  trackColWidths.forEach((w, i) => { trackSheet.getColumn(i + 1).width = w; });

  const tHeader = trackSheet.getRow(1);
  tHeader.values = trackHeaders;
  tHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  tHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6A1B9A' } };
  tHeader.alignment = { horizontal: 'center' };

  // Group data by date
  const dateData = {};
  habitEntries.forEach(e => {
    if (!dateData[e.date]) dateData[e.date] = { habits: {}, mood: 3, diary: '' };
    dateData[e.date].habits[e.name] = { value: e.value, type: e.type };
  });
  moodEntries.forEach(e => {
    if (!dateData[e.date]) dateData[e.date] = { habits: {}, mood: 3, diary: '' };
    dateData[e.date].mood = e.mood;
    dateData[e.date].diary = e.diary || '';
  });

  const moodEmojis = { 1: '😢', 2: '😕', 3: '😐', 4: '🙂', 5: '😄' };
  const sortedDates = Object.keys(dateData).sort().reverse();
  sortedDates.forEach((date, idx) => {
    const row = trackSheet.getRow(idx + 2);
    const d = dateData[date];
    const values = [date];
    habitDefs.forEach(h => {
      const entry = d.habits[h.name];
      if (!entry || entry.value === 0) {
        values.push(h.type === 'toggle' ? '' : 0);
      } else {
        values.push(h.type === 'toggle' ? 'YES' : entry.value);
      }
    });
    values.push(moodEmojis[d.mood] || '😐');
    values.push(d.diary);
    row.values = values;
    if (idx % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E5F5' } };
    }
    row.commit();
  });

  trackSheet.autoFilter = { from: 'A1', to: `${String.fromCharCode(65 + trackHeaders.length - 1)}1` };

  // ── Sheet: Instructions ──────────────────────────────────────────────────────
  const instrSheet = workbook.addWorksheet('Instructions');
  instrSheet.getColumn(1).width = 85;

  const lines = [
    ['How to use this Food Log'],
    [''],
    ['DAILY WORKFLOW'],
    ['1. Open "Daily Log" sheet'],
    ['2. Change the Date if needed (format: YYYY-MM-DD, e.g. 2026-03-05)'],
    ['3. Pick a Meal Type from the dropdown (B column)'],
    ['4. Pick a Food Item from the dropdown (C column):'],
    ['   • Items ending with "(recipe)" = a full recipe — 1 serving = recipe serving'],
    ['   • Items like "Egg - 1 medium" = a single ingredient + measurement'],
    ['5. Enter Servings (e.g. 1, 1.5, 2)'],
    ['6. Notes column is optional'],
    [''],
    ['END OF DAY SYNC'],
    ['a. In Google Sheets: File → Download → Comma Separated Values (.csv)'],
    ['b. Copy the CSV to your laptop git repo folder'],
    ['c. Run one of these commands:'],
    ['   node scripts/import_from_csv.js ~/Downloads/Daily\\ Log.csv'],
    ['   node scripts/import_from_csv.js file.csv --dry-run   (preview only)'],
    ['   node scripts/import_from_csv.js file.csv --replace   (overwrite today)'],
    [''],
    ['REFERENCE SHEETS'],
    ['• "Recipes" tab     — all recipes with nutrition per serving'],
    ['• "Ingredients" tab — all ingredients with every measurement option'],
    ['• "Trackers" tab    — daily habits, mood & diary entries'],
    [''],
    [
      `Template generated: ${new Date().toLocaleDateString()}  |  ` +
      `${recipeRows.length} recipes  |  ${ingredientRows.length} ingredient measurements`,
    ],
  ];

  lines.forEach((line, i) => {
    const cell = instrSheet.getRow(i + 1).getCell(1);
    cell.value = line[0];
  });
  instrSheet.getRow(1).font = { bold: true, size: 14 };
  instrSheet.getRow(3).font = { bold: true };
  instrSheet.getRow(13).font = { bold: true };
  instrSheet.getRow(21).font = { bold: true };

  // ── Write file ───────────────────────────────────────────────────────────────
  await workbook.xlsx.writeFile(outputPath);

  console.log(`\nTemplate created: ${outputPath}`);
  console.log(`  ${recipeRows.length} recipes`);
  console.log(`  ${ingredientRows.length} ingredient measurements`);
  console.log(`  ${foodList.length} total food dropdown options`);
  console.log('\nNext steps:');
  console.log('  1. Upload to Google Drive (auto-converts to Google Sheets)');
  console.log('  2. Fill in "Daily Log" each day');
  console.log('  3. Download as CSV and run:');
  console.log('     node scripts/import_from_csv.js ~/Downloads/Daily\\ Log.csv\n');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
