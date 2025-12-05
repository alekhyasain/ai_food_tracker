const http = require('http');

function makeRequest(data) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/export-excel',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(responseData);
                    resolve(parsedData);
                } catch (error) {
                    reject(new Error('Failed to parse response: ' + responseData));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

async function testNewExportStructure() {
    console.log('🧪 Testing new export structure with per-date sheets and YYYY-MM filename...');
    
    // Test data with multiple dates in December 2025
    const testMealData = {
        '2025-12-03': [
            {
                id: 1,
                description: 'Breakfast - Oatmeal with berries',
                timestamp: '2025-12-03T08:00:00.000Z',
                nutrition: { calories: 350, protein: 12, carbs: 65, fat: 8, fiber: 10 },
                source: 'ingredients',
                ingredients: [
                    { name: 'Oats', quantity: 1, measurement: 'cup' },
                    { name: 'Blueberries', quantity: 0.5, measurement: 'cup' }
                ]
            },
            {
                id: 2,
                description: 'Lunch - Grilled chicken salad',
                timestamp: '2025-12-03T12:30:00.000Z',
                nutrition: { calories: 420, protein: 35, carbs: 15, fat: 22, fiber: 8 },
                source: 'database',
                ingredients: []
            }
        ],
        '2025-12-04': [
            {
                id: 3,
                description: 'Breakfast - Greek yogurt with granola',
                timestamp: '2025-12-04T07:45:00.000Z',
                nutrition: { calories: 280, protein: 18, carbs: 35, fat: 9, fiber: 5 },
                source: 'manual',
                ingredients: []
            }
        ],
        '2025-12-05': [
            {
                id: 4,
                description: 'Morning snack - Apple with peanut butter',
                timestamp: '2025-12-05T10:15:00.000Z',
                nutrition: { calories: 190, protein: 8, carbs: 25, fat: 8, fiber: 4 },
                source: 'ingredients',
                ingredients: [
                    { name: 'Apple', quantity: 1, measurement: 'medium' },
                    { name: 'Peanut butter', quantity: 2, measurement: 'tbsp' }
                ]
            }
        ]
    };

    try {
        console.log('📤 Sending export request...');
        const response = await makeRequest({
            mealsByDate: testMealData,
            startDate: '2025-12-03',
            endDate: '2025-12-05'
        });

        console.log('✅ Export successful!');
        console.log('📊 Response details:', {
            success: response.success,
            message: response.message,
            filename: response.filename,
            filePath: response.filePath,
            totalSheets: response.totalSheets,
            totalMeals: response.totalMeals,
            duplicateDatesSkipped: response.duplicateDatesSkipped,
            skippedDates: response.skippedDates
        });

        // Verify filename format
        const expectedFilename = '2025-12.xlsx';
        if (response.filename === expectedFilename) {
            console.log('✅ Filename format correct:', response.filename);
        } else {
            console.log('❌ Filename format incorrect. Expected:', expectedFilename, 'Got:', response.filename);
        }

        // Verify sheet count (should be 3 sheets for 3 dates)
        if (response.totalSheets === 3) {
            console.log('✅ Sheet count correct: 3 sheets for 3 dates');
        } else {
            console.log('❌ Sheet count incorrect. Expected: 3, Got:', response.totalSheets);
        }

        // Test append functionality by running the same export again
        console.log('\n🔄 Testing append functionality (duplicate prevention)...');
        const appendResponse = await makeRequest({
            mealsByDate: testMealData,
            startDate: '2025-12-03',
            endDate: '2025-12-05'
        });

        console.log('📊 Append test results:', {
            success: appendResponse.success,
            message: appendResponse.message,
            duplicateDatesSkipped: appendResponse.duplicateDatesSkipped,
            skippedDates: appendResponse.skippedDates
        });

        if (appendResponse.duplicateDatesSkipped === 3) {
            console.log('✅ Duplicate prevention working correctly - all 3 dates skipped');
        } else {
            console.log('❌ Duplicate prevention issue. Expected 3 skipped dates, got:', appendResponse.duplicateDatesSkipped);
        }

        console.log('\n🎉 All tests completed!');

    } catch (error) {
        console.error('❌ Export test failed:', error.message);
    }
}

// Run the test
testNewExportStructure();