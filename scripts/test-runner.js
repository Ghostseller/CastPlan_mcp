#!/usr/bin/env node

/**
 * Comprehensive Test Runner Script
 * 
 * Orchestrates different types of tests with reporting and analysis
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.results = {
      unit: null,
      integration: null,
      performance: null,
      e2e: null,
      coverage: null,
      totalTime: 0
    };
    this.startTime = Date.now();
  }

  async runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      console.log(`\n🚀 Running: ${command} ${args.join(' ')}`);
      
      const process = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        ...options
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, code });
        } else {
          resolve({ success: false, code });
        }
      });

      process.on('error', (error) => {
        reject(error);
      });
    });
  }

  async runTests(testType) {
    const testCommands = {
      unit: ['npm', ['run', 'test:services']],
      tools: ['npm', ['run', 'test:tools']],
      integration: ['npm', ['run', 'test:integration']],
      performance: ['npm', ['run', 'test:performance']],
      e2e: ['npm', ['run', 'test:e2e']],
      comprehensive: ['npm', ['run', 'test:comprehensive']],
      coverage: ['npm', ['run', 'test:coverage']]
    };

    const [command, args] = testCommands[testType];
    if (!command) {
      throw new Error(`Unknown test type: ${testType}`);
    }

    const startTime = Date.now();
    const result = await this.runCommand(command, args, {
      env: {
        ...process.env,
        NODE_ENV: 'test',
        CASTPLAN_LOG_LEVEL: 'error',
        CASTPLAN_ENABLE_AI: 'false',
        CASTPLAN_DATABASE_PATH: ':memory:'
      }
    });

    const duration = Date.now() - startTime;
    
    return {
      ...result,
      duration,
      type: testType
    };
  }

  async analyzeCoverage() {
    const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
    
    if (!fs.existsSync(coveragePath)) {
      console.log('⚠️  Coverage summary not found');
      return null;
    }

    try {
      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      const total = coverage.total;
      
      return {
        lines: total.lines.pct,
        functions: total.functions.pct,
        branches: total.branches.pct,
        statements: total.statements.pct
      };
    } catch (error) {
      console.error('❌ Failed to analyze coverage:', error.message);
      return null;
    }
  }

  generateReport() {
    const totalTime = Date.now() - this.startTime;
    const totalSeconds = Math.round(totalTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n⏱️  Total Execution Time: ${minutes}m ${seconds}s`);
    
    // Test Results Summary
    console.log('\n📋 Test Results:');
    Object.entries(this.results).forEach(([type, result]) => {
      if (result && typeof result === 'object' && result.success !== undefined) {
        const status = result.success ? '✅ PASS' : '❌ FAIL';
        const duration = result.duration ? `(${Math.round(result.duration / 1000)}s)` : '';
        console.log(`   ${type.padEnd(12)}: ${status} ${duration}`);
      }
    });

    // Coverage Summary
    if (this.results.coverage) {
      console.log('\n📈 Coverage Summary:');
      console.log(`   Lines:      ${this.results.coverage.lines}%`);
      console.log(`   Functions:  ${this.results.coverage.functions}%`);
      console.log(`   Branches:   ${this.results.coverage.branches}%`);
      console.log(`   Statements: ${this.results.coverage.statements}%`);
      
      const avgCoverage = (
        this.results.coverage.lines +
        this.results.coverage.functions +
        this.results.coverage.branches +
        this.results.coverage.statements
      ) / 4;
      
      console.log(`   Average:    ${Math.round(avgCoverage)}%`);
      
      if (avgCoverage >= 95) {
        console.log('   🎯 Coverage target achieved!');
      } else {
        console.log('   ⚠️  Coverage below 95% target');
      }
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    const failures = Object.entries(this.results)
      .filter(([_, result]) => result && result.success === false);
      
    if (failures.length === 0) {
      console.log('   🎉 All tests passed! Great job!');
      console.log('   📚 Consider adding more edge case tests');
      console.log('   🔍 Review performance metrics for optimization opportunities');
    } else {
      console.log('   🔧 Fix failing tests before deployment');
      failures.forEach(([type]) => {
        console.log(`   📝 Review ${type} test failures`);
      });
    }

    console.log('\n' + '='.repeat(60));
    
    return failures.length === 0;
  }

  async runAll() {
    console.log('🧪 Starting Comprehensive Test Suite...\n');

    try {
      // Run different test categories
      const testTypes = ['unit', 'tools', 'integration', 'performance'];
      
      for (const testType of testTypes) {
        console.log(`\n📂 Running ${testType} tests...`);
        this.results[testType] = await this.runTests(testType);
      }

      // Run coverage analysis
      console.log('\n📊 Running coverage analysis...');
      this.results.coverage = await this.runTests('comprehensive');
      this.results.coverageData = await this.analyzeCoverage();

      // Run E2E tests
      console.log('\n🌐 Running E2E tests...');
      this.results.e2e = await this.runTests('e2e');

    } catch (error) {
      console.error('❌ Test runner error:', error.message);
      process.exit(1);
    }

    // Generate final report
    const allPassed = this.generateReport();
    
    // Save results for CI
    const resultsPath = path.join(process.cwd(), 'test-results', 'comprehensive-results.json');
    fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
    fs.writeFileSync(resultsPath, JSON.stringify({
      ...this.results,
      timestamp: new Date().toISOString(),
      success: allPassed,
      totalTime: Date.now() - this.startTime
    }, null, 2));

    process.exit(allPassed ? 0 : 1);
  }

  async runSingle(testType) {
    console.log(`🧪 Running ${testType} tests...\n`);

    try {
      const result = await this.runTests(testType);
      
      if (testType === 'comprehensive') {
        this.results.coverageData = await this.analyzeCoverage();
      }
      
      this.results[testType] = result;
      
      const success = result.success;
      console.log(`\n${success ? '✅' : '❌'} ${testType} tests ${success ? 'passed' : 'failed'}`);
      
      if (this.results.coverageData) {
        const avgCoverage = (
          this.results.coverageData.lines +
          this.results.coverageData.functions +
          this.results.coverageData.branches +
          this.results.coverageData.statements
        ) / 4;
        console.log(`📈 Average coverage: ${Math.round(avgCoverage)}%`);
      }

      process.exit(success ? 0 : 1);
    } catch (error) {
      console.error('❌ Test runner error:', error.message);
      process.exit(1);
    }
  }
}

// CLI Interface
const args = process.argv.slice(2);
const testRunner = new TestRunner();

if (args.length === 0) {
  testRunner.runAll();
} else {
  const testType = args[0];
  testRunner.runSingle(testType);
}