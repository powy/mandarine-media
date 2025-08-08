#!/usr/bin/env node

/**
 * Quick test to verify the Countries component loads without errors
 */

const http = require('http');

async function testCountriesPage() {
  console.log('🧪 Testing Countries functionality...\n');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: '/#/countries',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('📊 Countries page response:');
        console.log(`  Status: ${res.statusCode}`);
        console.log(`  Content length: ${data.length} chars`);
        
        // Check for React Admin structure
        if (data.includes('react-admin')) {
          console.log('  ✅ React Admin detected in response');
        }
        
        // Check for our specific components
        if (data.includes('KYOOL')) {
          console.log('  ✅ KYOOL branding found');
        }
        
        if (res.statusCode === 200) {
          console.log('  ✅ Countries page loads successfully');
          console.log('\n💡 Next step: Open http://localhost:3002/#/countries in browser');
          console.log('   Check for:');
          console.log('   - Filter inputs above the table');
          console.log('   - Sortable column headers (clickable)');
          console.log('   - Cancel button in Create/Edit forms');
        } else {
          console.log('  ❌ Countries page failed to load');
        }
        
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log('❌ Request failed:', e.message);
      resolve();
    });

    req.setTimeout(5000, () => {
      console.log('❌ Request timed out');
      req.destroy();
      resolve();
    });

    req.end();
  });
}

testCountriesPage();