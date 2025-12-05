const axios = require('axios');

// Test data with December 3rd meals
const testMealsByDate = {
    '2025-12-03': [
        {
            id: 'test-meal-1',
            description: 'Test Breakfast',
            time: '08:00',
            calories: 300,
            protein: 15,
            carbs: 40,
            fat: 10,
            fiber: 5,
            source: 'Test',
            ingredients: 'Test ingredients'
        },
        {
            id: 'test-meal-2',
            description: 'Test Lunch',
            time: '12:30',
            calories: 450,
            protein: 25,
            carbs: 50,
            fat: 15,
            fiber: 8,
            source: 'Test',
            ingredients: 'Test ingredients'
        }
    ]
};

async function testDecember3rdExport() {
    console.log('🧪 TEST: Starting December 3rd export test...');
    console.log('📊 TEST: Test data:', {
        dates: Object.keys(testMealsByDate),
        totalMeals: Object.values(testMealsByDate).reduce((sum, meals) => sum + meals.length, 0)
    });

    try {
        const response = await axios.post('http://localhost:3000/api/export-excel', {
            mealsByDate: testMealsByDate,
            filename: 'Test_December_3rd_Export.xlsx'
        });

        console.log('✅ TEST: Export successful!');
        console.log('📄 TEST: Response:', response.data);
    } catch (error) {
        console.error('❌ TEST: Export failed!');
        console.error('🔍 TEST: Error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
    }
}

// Run the test
testDecember3rdExport();