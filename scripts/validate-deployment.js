/**
 * Quick Deployment Validation Script
 * Run with: node scripts/validate-deployment.js
 */

const https = require('https');
const http = require('http');

const SITE_URL = 'https://electkms.org';
const TRUSTEES_PAGE = `${SITE_URL}/voter/vote/trustees`;

console.log('🔍 Validating Deployment...\n');

// Test 1: Check if site is accessible
function checkSiteAccessibility() {
  return new Promise((resolve, reject) => {
    console.log('1️⃣ Checking site accessibility...');
    https.get(SITE_URL, (res) => {
      if (res.statusCode === 200) {
        console.log('   ✅ Site is accessible (Status: 200)\n');
        resolve(true);
      } else {
        console.log(`   ⚠️  Site returned status: ${res.statusCode}\n`);
        resolve(false);
      }
    }).on('error', (err) => {
      console.log(`   ❌ Error accessing site: ${err.message}\n`);
      reject(err);
    });
  });
}

// Test 2: Check if trustees page loads
function checkTrusteesPage() {
  return new Promise((resolve, reject) => {
    console.log('2️⃣ Checking trustees voting page...');
    https.get(TRUSTEES_PAGE, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        // Check for key indicators
        const hasSearchCode = data.includes('hasSearched') || data.includes('globalSearchTerm');
        const hasSearchUI = data.includes('search') || data.includes('Search');
        
        if (res.statusCode === 200) {
          console.log('   ✅ Trustees page is accessible (Status: 200)');
          if (hasSearchCode) {
            console.log('   ✅ Search functionality code detected');
          } else {
            console.log('   ⚠️  Search code not found in page source');
          }
          console.log('');
          resolve(true);
        } else {
          console.log(`   ⚠️  Page returned status: ${res.statusCode}\n`);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.log(`   ❌ Error accessing trustees page: ${err.message}\n`);
      reject(err);
    });
  });
}

// Test 3: Check response headers for cache/CDN
function checkResponseHeaders() {
  return new Promise((resolve, reject) => {
    console.log('3️⃣ Checking response headers...');
    https.get(SITE_URL, (res) => {
      const date = res.headers['date'];
      const server = res.headers['server'];
      const cache = res.headers['cache-control'] || res.headers['x-cache'];
      
      console.log(`   📅 Server Date: ${date}`);
      console.log(`   🖥️  Server: ${server || 'Not specified'}`);
      if (cache) {
        console.log(`   💾 Cache: ${cache}`);
      }
      console.log('');
      resolve(true);
    }).on('error', (err) => {
      console.log(`   ❌ Error: ${err.message}\n`);
      reject(err);
    });
  });
}

// Run all checks
async function runValidation() {
  try {
    await checkSiteAccessibility();
    await checkTrusteesPage();
    await checkResponseHeaders();
    
    console.log('✅ Basic validation complete!\n');
    console.log('📋 Next Steps:');
    console.log('   1. Visit https://electkms.org/voter/vote/trustees');
    console.log('   2. Verify NO candidates are shown initially');
    console.log('   3. Enter a search term and verify candidates appear');
    console.log('   4. Clear search and verify candidates hide again');
    console.log('   5. Check Netlify dashboard for deployment status');
    console.log('\n💡 For detailed validation, see: HOW_TO_VALIDATE_DEPLOYMENT.md');
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

runValidation();


