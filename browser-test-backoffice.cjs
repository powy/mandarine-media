#!/usr/bin/env node

const puppeteer = require('puppeteer');

/**
 * Comprehensive Browser Testing for KYOOL Media Backoffice
 * 
 * This script opens the backoffice in a real browser and tests:
 * 1. JavaScript execution without errors
 * 2. All pages load correctly
 * 3. Components render properly
 * 4. No import errors or runtime failures
 */

const BACKOFFICE_URL = 'http://localhost:3002';
const LOGIN_CREDENTIALS = {
  username: 'admin@kyool.com',
  password: 'admin123'
};

class BackofficeTestSuite {
  constructor() {
    this.browser = null;
    this.page = null;
    this.errors = [];
    this.warnings = [];
    this.testResults = [];
  }

  async init() {
    console.log('🚀 Starting browser-based testing...\n');
    
    this.browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Capture console logs and errors
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      
      if (type === 'error') {
        this.errors.push(`Console Error: ${text}`);
        console.log(`❌ Console Error: ${text}`);
      } else if (type === 'warning') {
        this.warnings.push(`Console Warning: ${text}`);
        console.log(`⚠️  Console Warning: ${text}`);
      }
    });
    
    // Capture JavaScript errors
    this.page.on('pageerror', error => {
      this.errors.push(`JavaScript Error: ${error.message}`);
      console.log(`❌ JavaScript Error: ${error.message}`);
    });
    
    // Capture failed requests
    this.page.on('requestfailed', request => {
      this.errors.push(`Request Failed: ${request.url()} - ${request.failure().errorText}`);
      console.log(`❌ Request Failed: ${request.url()}`);
    });
  }

  async testPageLoad(pageName, url, expectedElements = []) {
    console.log(`🔍 Testing ${pageName}...`);
    
    try {
      const response = await this.page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 10000 
      });
      
      if (!response.ok()) {
        throw new Error(`HTTP ${response.status()}`);
      }
      
      // Wait for React to render
      await this.page.waitForTimeout(2000);
      
      // Check for expected elements
      const elementChecks = [];
      for (const selector of expectedElements) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          elementChecks.push(`✅ Found ${selector}`);
        } catch (error) {
          elementChecks.push(`❌ Missing ${selector}`);
          this.errors.push(`Missing element: ${selector} on ${pageName}`);
        }
      }
      
      this.testResults.push({
        page: pageName,
        url: url,
        status: 'success',
        elements: elementChecks
      });
      
      console.log(`  ✅ ${pageName} loaded successfully`);
      if (elementChecks.length > 0) {
        elementChecks.forEach(check => console.log(`    ${check}`));
      }
      
      return true;
    } catch (error) {
      this.errors.push(`Page load failed for ${pageName}: ${error.message}`);
      console.log(`  ❌ ${pageName} failed: ${error.message}`);
      
      this.testResults.push({
        page: pageName,
        url: url,
        status: 'failed',
        error: error.message
      });
      
      return false;
    }
  }

  async testLogin() {
    console.log('🔑 Testing authentication...');
    
    try {
      await this.page.goto(BACKOFFICE_URL);
      
      // Check if we're redirected to login
      await this.page.waitForSelector('input[name="username"], input[type="email"]', { timeout: 5000 });
      
      // Fill login form
      const usernameField = await this.page.$('input[name="username"]') || await this.page.$('input[type="email"]');
      const passwordField = await this.page.$('input[name="password"], input[type="password"]');
      
      if (!usernameField || !passwordField) {
        throw new Error('Login form fields not found');
      }
      
      await usernameField.type(LOGIN_CREDENTIALS.username);
      await passwordField.type(LOGIN_CREDENTIALS.password);
      
      // Submit form
      await this.page.click('button[type="submit"]');
      
      // Wait for redirect to dashboard
      await this.page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
      
      // Check if we're logged in (look for logout button or user menu)
      const isLoggedIn = await this.page.$('.MuiAppBar-root, [role="banner"], .ra-user-menu') !== null;
      
      if (isLoggedIn) {
        console.log('  ✅ Login successful');
        return true;
      } else {
        throw new Error('Login appears to have failed');
      }
      
    } catch (error) {
      console.log(`  ❌ Login failed: ${error.message}`);
      this.errors.push(`Login failed: ${error.message}`);
      return false;
    }
  }

  async testAllPages() {
    console.log('\n📋 Testing all backoffice pages...\n');
    
    const pages = [
      {
        name: 'Dashboard',
        path: '/',
        elements: ['h1', '.ra-title', 'main']
      },
      {
        name: 'Countries List',
        path: '/countries',
        elements: ['.MuiTable-root', '.ra-datagrid', '.ra-list']
      },
      {
        name: 'Countries Create',
        path: '/countries/create',
        elements: ['form', 'input[name="name"]', '.ra-form']
      },
      {
        name: 'Languages List',
        path: '/languages',
        elements: ['.MuiTable-root', '.ra-datagrid', '.ra-list']
      },
      {
        name: 'Languages Create',
        path: '/languages/create',
        elements: ['form', 'input[name="name"]', 'input[name="sigle"]']
      },
      {
        name: 'Media Descriptions List',
        path: '/media-descriptions',
        elements: ['.MuiTable-root', '.ra-datagrid', '.ra-list']
      },
      {
        name: 'Media Descriptions Create',
        path: '/media-descriptions/create',
        elements: ['form', 'input[name="episode_title"]', '.ra-form']
      }
    ];
    
    const results = [];
    for (const pageInfo of pages) {
      const url = `${BACKOFFICE_URL}#${pageInfo.path}`;
      const result = await this.testPageLoad(pageInfo.name, url, pageInfo.elements);
      results.push({ ...pageInfo, success: result });
      
      // Small delay between tests
      await this.page.waitForTimeout(1000);
    }
    
    return results;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  printSummary() {
    console.log('\n📊 TEST SUMMARY');
    console.log('===============\n');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'success').length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Errors: ${this.errors.length}`);
    console.log(`Warnings: ${this.warnings.length}\n`);
    
    if (this.errors.length > 0) {
      console.log('❌ ERRORS FOUND:');
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      console.log('');
    }
    
    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS:');
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
      console.log('');
    }
    
    if (failedTests === 0 && this.errors.length === 0) {
      console.log('🎉 ALL TESTS PASSED! The backoffice is working correctly.');
      return 0;
    } else {
      console.log('❌ TESTS FAILED! Please fix the issues above.');
      return 1;
    }
  }
}

async function main() {
  const tester = new BackofficeTestSuite();
  
  try {
    await tester.init();
    
    // Test login first
    const loginSuccess = await tester.testLogin();
    
    if (loginSuccess) {
      // Test all pages
      await tester.testAllPages();
    }
    
    const exitCode = tester.printSummary();
    await tester.cleanup();
    
    process.exit(exitCode);
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    await tester.cleanup();
    process.exit(1);
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  main();
}