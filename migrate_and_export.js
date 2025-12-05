#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');

/**
 * Food Diary Data Migration and Export Script
 * 
 * This script:
 * 1. Simulates reading localStorage data from the food tracker app
 * 2. Migrates entries from 2024-12-04 to 2025-12-03
 * 3. Creates the 'trackers' folder if it doesn't exist
 * 4. Exports the December 3rd, 2025 data to Excel
 */

class FoodDiaryMigrator {
    constructor() {
        this.sourceDate = '2024-12-04';
        this.targetDate = '2025-12-03';
        this.trackersFolder = './trackers';
        this.exportFilename = 'food_log_dec_2025.xlsx';
    }

    /**
     * Simulate reading localStorage data
     * In a real browser environment, this would be:
     * JSON.parse(localStorage.getItem('indianFoodMealsByDate') || '{}')
     */
    async simulateLocalStorageRead() {
        console.log('📖 Reading localStorage data...');
        
        // Check if there's existing meal data in the server's meals.json
        try {
            const mealsData = await fs.readFile('meals.json', 'utf8');
            const serverMeals = JSON.parse(mealsData);
            
            if (serverMeals[this.sourceDate] && serverMeals[this.sourceDate].length > 0) {
                console.log(`✅ Found ${serverMeals[this.sourceDate].length} meals for ${this.sourceDate} in server data`);
                return { [this.sourceDate]: serverMeals[this.sourceDate] };
            }
        } catch (error) {
            console.log('ℹ️ No existing server meals.json found, creating sample data...');
        }

        // Create sample data for demonstration
        const sampleMeals = [
            {
                id: Date.now(),
                timestamp: `${this.sourceDate}T08:30:00.000Z`,
                description: "Breakfast: Oatmeal with berries and nuts",
                nutrition: {
                    calories: 350,
                    protein: 12,
                    carbs: 45,
                    fat: 8,
                    fiber: 6
                },
                source: "ingredients",
                ingredients: [
                    { name: "Rolled Oats", quantity: 0.5, measurement: "cup" },
                    { name: "Mixed Berries", quantity: 0.25, measurement: "cup" },
                    { name: "Almonds", quantity: 10, measurement: "pieces" }
                ]
            },
            {
                id: Date.now() + 1,
                timestamp: `${this.sourceDate}T12:45:00.000Z`,
                description: "Lunch: Quinoa salad with vegetables",
                nutrition: {
                    calories: 420,
                    protein: 15,
                    carbs: 52,
                    fat: 12,
                    fiber: 8
                },
                source: "database",
                ingredients: [
                    { name: "Quinoa", quantity: 0.75, measurement: "cup" },
                    { name: "Mixed Vegetables", quantity: 1, measurement: "cup" },
                    { name: "Olive Oil", quantity: 1, measurement: "tbsp" }
                ]
            },
            {
                id: Date.now() + 2,
                timestamp: `${this.sourceDate}T19:15:00.000Z`,
                description: "Dinner: Grilled chicken with sweet potato",
                nutrition: {
                    calories: 485,
                    protein: 35,
                    carbs: 28,
                    fat: 18,
                    fiber: 4
                },
                source: "manual",
                ingredients: [
                    { name: "Chicken Breast", quantity: 150, measurement: "g" },
                    { name: "Sweet Potato", quantity: 1, measurement: "medium" },
                    { name: "Broccoli", quantity: 1, measurement: "cup" }
                ]
            }
        ];

        console.log(`📝 Created ${sampleMeals.length} sample meals for ${this.sourceDate}`);
        return { [this.sourceDate]: sampleMeals };
    }

    /**
     * Migrate meals from source date to target date
     */
    migrateMeals(mealsByDate) {
        console.log(`🔄 Migrating meals from ${this.sourceDate} to ${this.targetDate}...`);
        
        const migratedData = { ...mealsByDate };
        
        if (migratedData[this.sourceDate]) {
            const mealsToMigrate = migratedData[this.sourceDate];
            
            // Update timestamps to target date while preserving time
            const migratedMeals = mealsToMigrate.map(meal => ({
                ...meal,
                timestamp: meal.timestamp.replace(this.sourceDate, this.targetDate),
                id: Date.now() + Math.random() // Generate new ID to avoid conflicts
            }));
            
            // Move meals to target date
            migratedData[this.targetDate] = migratedMeals;
            
            // Remove from source date
            delete migratedData[this.sourceDate];
            
            console.log(`✅ Successfully migrated ${migratedMeals.length} meals to ${this.targetDate}`);
            console.log(`📊 Migration summary:`);
            migratedMeals.forEach((meal, index) => {
                const time = new Date(meal.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                console.log(`   ${index + 1}. ${time} - ${meal.description} (${meal.nutrition.calories} cal)`);
            });
        } else {
            console.log(`⚠️ No meals found for ${this.sourceDate} to migrate`);
        }
        
        return migratedData;
    }

    /**
     * Create trackers folder if it doesn't exist
     */
    async createTrackersFolder() {
        console.log(`📁 Creating '${this.trackersFolder}' folder...`);
        
        try {
            await fs.access(this.trackersFolder);
            console.log(`✅ Folder '${this.trackersFolder}' already exists`);
        } catch (error) {
            await fs.mkdir(this.trackersFolder, { recursive: true });
            console.log(`✅ Created folder '${this.trackersFolder}'`);
        }
    }

    /**
     * Export meals data to Excel using the same logic as server.js
     */
    async exportToExcel(mealsByDate) {
        console.log(`📊 Exporting data to Excel...`);
        
        // Filter to only include target date
        const targetDateMeals = {};
        if (mealsByDate[this.targetDate]) {
            targetDateMeals[this.targetDate] = mealsByDate[this.targetDate];
        }
        
        if (Object.keys(targetDateMeals).length === 0) {
            console.log(`❌ No data found for ${this.targetDate} to export`);
            return;
        }
        
        // Create workbook using the same logic as server.js
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Food Diary Migration Script';
        workbook.lastModifiedBy = 'Food Diary Migration Script';
        workbook.created = new Date();
        workbook.modified = new Date();
        
        // Create worksheet for December 2025
        const worksheet = workbook.addWorksheet('December 2025');
        
        // Set column widths (same as server.js)
        worksheet.columns = [
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Time', key: 'time', width: 10 },
            { header: 'Meal Description', key: 'description', width: 40 },
            { header: 'Calories', key: 'calories', width: 10 },
            { header: 'Protein (g)', key: 'protein', width: 12 },
            { header: 'Carbs (g)', key: 'carbs', width: 12 },
            { header: 'Fat (g)', key: 'fat', width: 10 },
            { header: 'Fiber (g)', key: 'fiber', width: 10 },
            { header: 'Source', key: 'source', width: 15 },
            { header: 'Ingredients', key: 'ingredients', width: 50 }
        ];
        
        // Style the header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '4472C4' }
        };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.height = 25;
        
        let currentRow = 2;
        let dayTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
        
        // Process meals for target date
        const meals = targetDateMeals[this.targetDate];
        const date = new Date(this.targetDate + 'T00:00:00');
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        console.log(`📝 Processing ${meals.length} meals for ${formattedDate}...`);
        
        // Add meals
        meals.forEach(meal => {
            const mealTime = new Date(meal.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            
            // Format ingredients list
            let ingredientsList = '';
            if (meal.ingredients && meal.ingredients.length > 0) {
                ingredientsList = meal.ingredients.map(ing =>
                    `${ing.name} (${ing.quantity}x ${ing.measurement})`
                ).join('; ');
            }
            
            const row = worksheet.addRow({
                date: formattedDate,
                time: mealTime,
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
            
            // Style data rows
            row.alignment = { vertical: 'top', wrapText: true };
            row.height = Math.max(20, Math.ceil(ingredientsList.length / 50) * 15);
            
            // Add to day totals
            dayTotals.calories += meal.nutrition.calories;
            dayTotals.protein += meal.nutrition.protein;
            dayTotals.carbs += meal.nutrition.carbs;
            dayTotals.fat += meal.nutrition.fat;
            dayTotals.fiber += meal.nutrition.fiber;
            
            currentRow++;
        });
        
        // Add day summary row
        worksheet.addRow({});
        const summaryRow = worksheet.addRow({
            date: '',
            time: '',
            description: `📊 Daily Total (${meals.length} meals)`,
            calories: Math.round(dayTotals.calories),
            protein: Math.round(dayTotals.protein * 10) / 10,
            carbs: Math.round(dayTotals.carbs * 10) / 10,
            fat: Math.round(dayTotals.fat * 10) / 10,
            fiber: Math.round(dayTotals.fiber * 10) / 10,
            source: 'SUMMARY',
            ingredients: ''
        });
        
        // Style summary row
        summaryRow.font = { bold: true };
        summaryRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'E7E6E6' }
        };
        
        // Add borders to all cells
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell, colNumber) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });
        
        // Freeze the header row
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];
        
        // Write to file
        const filePath = path.join(this.trackersFolder, this.exportFilename);
        await workbook.xlsx.writeFile(filePath);
        
        console.log(`✅ Excel file exported successfully: ${filePath}`);
        console.log(`📊 Export summary:`);
        console.log(`   📅 Date: ${formattedDate}`);
        console.log(`   🍽️ Total meals: ${meals.length}`);
        console.log(`   🔥 Total calories: ${Math.round(dayTotals.calories)}`);
        console.log(`   🥩 Total protein: ${Math.round(dayTotals.protein * 10) / 10}g`);
        console.log(`   🍞 Total carbs: ${Math.round(dayTotals.carbs * 10) / 10}g`);
        console.log(`   🥑 Total fat: ${Math.round(dayTotals.fat * 10) / 10}g`);
        console.log(`   🌾 Total fiber: ${Math.round(dayTotals.fiber * 10) / 10}g`);
        
        return filePath;
    }

    /**
     * Save migrated data back to localStorage format (for demonstration)
     */
    async saveMigratedData(mealsByDate) {
        console.log('💾 Saving migrated data...');
        
        const outputFile = 'migrated_meals.json';
        await fs.writeFile(outputFile, JSON.stringify(mealsByDate, null, 2));
        
        console.log(`✅ Migrated data saved to: ${outputFile}`);
        console.log('ℹ️ In a real browser environment, this would update localStorage:');
        console.log(`   localStorage.setItem('indianFoodMealsByDate', JSON.stringify(mealsByDate))`);
    }

    /**
     * Main execution function
     */
    async run() {
        try {
            console.log('🚀 Starting Food Diary Migration and Export Process...\n');
            
            // Step 1: Read localStorage data (simulated)
            const originalData = await this.simulateLocalStorageRead();
            
            // Step 2: Migrate meals from source to target date
            const migratedData = this.migrateMeals(originalData);
            
            // Step 3: Create trackers folder
            await this.createTrackersFolder();
            
            // Step 4: Export to Excel
            const exportPath = await this.exportToExcel(migratedData);
            
            // Step 5: Save migrated data (for reference)
            await this.saveMigratedData(migratedData);
            
            console.log('\n🎉 Migration and export completed successfully!');
            console.log(`📁 Files created:`);
            console.log(`   📊 Excel export: ${exportPath}`);
            console.log(`   📄 Migrated data: ./migrated_meals.json`);
            console.log(`   📁 Trackers folder: ${this.trackersFolder}`);
            
        } catch (error) {
            console.error('❌ Error during migration and export:', error);
            process.exit(1);
        }
    }
}

// Run the migration if this script is executed directly
if (require.main === module) {
    const migrator = new FoodDiaryMigrator();
    migrator.run();
}

module.exports = FoodDiaryMigrator;