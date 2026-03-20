// Test script to verify paipan_result.js
// Input: 2000-1-1 12:00:00

// Mock browser environment
if (typeof window === 'undefined') {
    global.window = {};
}

// Load the paipan_result.js
require('./paipan_result.js');

const testDate = new Date(2000, 0, 1, 12, 0, 0);
console.log('Input Date:', testDate.toISOString());
console.log('Gender: Male (1)');

// Call calculateBazi function
const result = calculateBazi(testDate, '1', null, false);

console.log('\n=== Result ===');
console.log('Solar Date String:', result.solarDateStr);
console.log('Lunar Date String:', result.lunarStr);

// Display the pillars
console.log('\n=== Eight Characters (BaZi) ===');
if (result.pillars && result.pillars.length >= 4) {
    const names = ['Year', 'Month', 'Day', 'Hour'];
    result.pillars.forEach((p, i) => {
        console.log(`${names[i]} Pillar: ${p.gan}${p.zhi} (${p.nayin || p.naYin || ''})`);
    });
} else {
    // Try the object format
    console.log('Year:', result.yearPillar);
    console.log('Month:', result.monthPillar);
    console.log('Day:', result.dayPillar);
    console.log('Hour:', result.hourPillar);
}

console.log('\n=== Full Result Object Keys ===');
console.log(Object.keys(result));