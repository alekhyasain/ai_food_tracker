// Test script to verify export functionality
console.log('🧪 TESTING: Starting export function tests...');

// Test 1: Check if functions exist
console.log('📋 TESTING: Checking function availability...');
const functionsToTest = [
    'startExport',
    'startDirectExport', 
    'testExportButton',
    'testExportFlow',
    'reloadIngredientsInModal'
];

functionsToTest.forEach(funcName => {
    if (typeof window[funcName] === 'function') {
        console.log(`✅ TESTING: ${funcName}() function is available`);
    } else {
        console.log(`❌ TESTING: ${funcName}() function is NOT available`);
    }
});

// Test 2: Test export button functionality
console.log('🔘 TESTING: Testing export button functionality...');
try {
    if (typeof testExportButton === 'function') {
        testExportButton();
        console.log('✅ TESTING: testExportButton() executed successfully');
    }
} catch (error) {
    console.error('❌ TESTING: testExportButton() failed:', error);
}

// Test 3: Test export flow
console.log('🔄 TESTING: Testing export flow...');
try {
    if (typeof testExportFlow === 'function') {
        testExportFlow();
        console.log('✅ TESTING: testExportFlow() executed successfully');
    }
} catch (error) {
    console.error('❌ TESTING: testExportFlow() failed:', error);
}

// Test 4: Test ingredient reload function
console.log('🔄 TESTING: Testing ingredient reload function...');
try {
    if (typeof reloadIngredientsInModal === 'function') {
        reloadIngredientsInModal();
        console.log('✅ TESTING: reloadIngredientsInModal() executed successfully');
    }
} catch (error) {
    console.error('❌ TESTING: reloadIngredientsInModal() failed:', error);
}

console.log('🏁 TESTING: Export function tests completed!');