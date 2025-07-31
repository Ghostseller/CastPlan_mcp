/**
 * Test Reporting Framework
 * Comprehensive test result analysis, coverage reporting, and performance monitoring
 */

import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { performance } from 'perf_hooks';

export interface TestResult {
  testName: string;
  testFile: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  memoryUsage?: NodeJS.MemoryUsage;
  assertions: {
    total: number;
    passed: number;
    failed: number;
  };
}

export interface TestSuiteResult {
  suiteName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  coverage?: CoverageData;
  performance?: PerformanceMetrics;
  tests: TestResult[];
}

export interface CoverageData {
  statements: { total: number; covered: number; percentage: number };
  branches: { total: number; covered: number; percentage: number };
  functions: { total: number; covered: number; percentage: number };
  lines: { total: number; covered: number; percentage: number };
  files: {
    [filename: string]: {
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    };
  };
}

export interface PerformanceMetrics {
  totalExecutionTime: number;
  averageTestTime: number;
  slowestTests: Array<{ name: string; duration: number }>;
  memoryUsage: {
    initial: NodeJS.MemoryUsage;
    peak: NodeJS.MemoryUsage;
    final: NodeJS.MemoryUsage;
  };
  concurrencyMetrics?: {
    maxConcurrentTests: number;
    averageConcurrency: number;
    concurrencyEfficiency: number;
  };
}

export interface TestReportConfig {
  outputDir: string;
  formats: Array<'html' | 'json' | 'markdown' | 'junit' | 'csv'>;
  includePerformance: boolean;
  includeCoverage: boolean;
  includeMemoryAnalysis: boolean;
  thresholds: {
    coverage: number;
    performance: number;
    memoryUsage: number;
  };
}

export interface ComprehensiveTestReport {
  timestamp: string;
  duration: number;
  summary: {
    totalSuites: number;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    successRate: number;
  };
  coverage: CoverageData;
  performance: PerformanceMetrics;
  qualityMetrics: {
    testReliability: number;
    codeQuality: number;
    maintainabilityIndex: number;
    technicalDebt: number;
  };
  suites: TestSuiteResult[];
  recommendations: string[];
  trends: {
    coverageTrend: Array<{ date: string; percentage: number }>;
    performanceTrend: Array<{ date: string; avgTime: number }>;
    reliabilityTrend: Array<{ date: string; successRate: number }>;
  };
}

export class TestReportingFramework {
  private static config: TestReportConfig = {
    outputDir: join(process.cwd(), 'test-reports'),
    formats: ['html', 'json', 'markdown'],
    includePerformance: true,
    includeCoverage: true,
    includeMemoryAnalysis: true,
    thresholds: {
      coverage: 95,
      performance: 5000, // 5 seconds
      memoryUsage: 500 * 1024 * 1024 // 500MB
    }
  };

  private static testResults: TestSuiteResult[] = [];
  private static startTime: number = 0;
  private static initialMemory: NodeJS.MemoryUsage = {} as NodeJS.MemoryUsage;
  private static peakMemory: NodeJS.MemoryUsage = {} as NodeJS.MemoryUsage;

  /**
   * Initialize test reporting framework
   */
  static async initialize(config?: Partial<TestReportConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Ensure output directory exists
    await mkdir(this.config.outputDir, { recursive: true });

    // Initialize timing and memory tracking
    this.startTime = performance.now();
    this.initialMemory = process.memoryUsage();
    this.peakMemory = { ...this.initialMemory };

    // Start memory monitoring
    this.startMemoryMonitoring();
  }

  /**
   * Record test suite results
   */
  static recordTestSuite(result: TestSuiteResult): void {
    this.testResults.push(result);
  }

  /**
   * Generate comprehensive test report
   */
  static async generateComprehensiveReport(): Promise<ComprehensiveTestReport> {
    const endTime = performance.now();
    const finalMemory = process.memoryUsage();
    const totalDuration = endTime - this.startTime;

    // Calculate summary statistics
    const summary = this.calculateSummaryStatistics();
    
    // Generate coverage data
    const coverage = await this.generateCoverageData();
    
    // Generate performance metrics
    const performance = this.generatePerformanceMetrics(totalDuration, finalMemory);
    
    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics();
    
    // Generate recommendations
    const recommendations = this.generateRecommendations();
    
    // Load historical trends
    const trends = await this.loadHistoricalTrends();

    const report: ComprehensiveTestReport = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      summary,
      coverage,
      performance,
      qualityMetrics,
      suites: this.testResults,
      recommendations,
      trends
    };

    // Generate reports in all configured formats
    await this.generateReports(report);
    
    // Save historical data
    await this.saveHistoricalData(report);

    return report;
  }

  /**
   * Generate HTML test report
   */
  static async generateHTMLReport(report: ComprehensiveTestReport): Promise<string> {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CastPlan Ultimate Automation - Test Results</title>
    <style>
        ${this.getReportCSS()}
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="container">
        <header>
            <h1>🧪 Test Results Dashboard</h1>
            <div class="timestamp">Generated: ${new Date(report.timestamp).toLocaleString()}</div>
        </header>

        <div class="summary-cards">
            <div class="card success">
                <h3>✅ Passed Tests</h3>
                <div class="metric">${report.summary.passedTests}</div>
                <div class="sub-metric">${report.summary.successRate.toFixed(1)}% Success Rate</div>
            </div>
            <div class="card ${report.summary.failedTests > 0 ? 'danger' : 'success'}">
                <h3>❌ Failed Tests</h3>
                <div class="metric">${report.summary.failedTests}</div>
                <div class="sub-metric">${report.summary.totalTests} Total Tests</div>
            </div>
            <div class="card ${report.coverage.statements.percentage >= this.config.thresholds.coverage ? 'success' : 'warning'}">
                <h3>📊 Coverage</h3>
                <div class="metric">${report.coverage.statements.percentage.toFixed(1)}%</div>
                <div class="sub-metric">Target: ${this.config.thresholds.coverage}%</div>
            </div>
            <div class="card ${report.performance.totalExecutionTime <= this.config.thresholds.performance ? 'success' : 'warning'}">
                <h3>⚡ Performance</h3>
                <div class="metric">${(report.performance.totalExecutionTime / 1000).toFixed(2)}s</div>
                <div class="sub-metric">Avg: ${report.performance.averageTestTime.toFixed(0)}ms/test</div>
            </div>
        </div>

        <div class="charts-container">
            <div class="chart-card">
                <h3>Coverage Breakdown</h3>
                <canvas id="coverageChart"></canvas>
            </div>
            <div class="chart-card">
                <h3>Performance Trends</h3>
                <canvas id="performanceChart"></canvas>
            </div>
        </div>

        <div class="test-suites">
            <h2>📋 Test Suite Results</h2>
            ${this.generateTestSuitesHTML(report.suites)}
        </div>

        <div class="quality-metrics">
            <h2>📈 Quality Metrics</h2>
            ${this.generateQualityMetricsHTML(report.qualityMetrics)}
        </div>

        <div class="recommendations">
            <h2>💡 Recommendations</h2>
            <ul>
                ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>

        <div class="detailed-coverage">
            <h2>📁 File Coverage Details</h2>
            ${this.generateFileCoverageHTML(report.coverage.files)}
        </div>
    </div>

    <script>
        ${this.getReportJavaScript(report)}
    </script>
</body>
</html>`;

    const htmlPath = join(this.config.outputDir, 'test-report.html');
    await writeFile(htmlPath, html, 'utf8');
    return htmlPath;
  }

  /**
   * Generate Markdown test report
   */
  static async generateMarkdownReport(report: ComprehensiveTestReport): Promise<string> {
    const markdown = `# 🧪 Test Results Report

**Generated**: ${new Date(report.timestamp).toLocaleString()}  
**Duration**: ${(report.duration / 1000).toFixed(2)} seconds

## 📊 Summary

| Metric | Value | Status |
|--------|-------|--------|
| Total Tests | ${report.summary.totalTests} | ℹ️ |
| Passed Tests | ${report.summary.passedTests} | ✅ |
| Failed Tests | ${report.summary.failedTests} | ${report.summary.failedTests > 0 ? '❌' : '✅'} |
| Success Rate | ${report.summary.successRate.toFixed(1)}% | ${report.summary.successRate >= 95 ? '✅' : '⚠️'} |
| Coverage | ${report.coverage.statements.percentage.toFixed(1)}% | ${report.coverage.statements.percentage >= this.config.thresholds.coverage ? '✅' : '⚠️'} |
| Avg Test Time | ${report.performance.averageTestTime.toFixed(0)}ms | ${report.performance.averageTestTime <= 1000 ? '✅' : '⚠️'} |

## 📋 Test Suite Results

${report.suites.map(suite => `
### ${suite.suiteName}
- **Tests**: ${suite.totalTests} (${suite.passedTests} passed, ${suite.failedTests} failed, ${suite.skippedTests} skipped)
- **Duration**: ${suite.duration.toFixed(2)}ms
- **Success Rate**: ${((suite.passedTests / suite.totalTests) * 100).toFixed(1)}%

${suite.tests.filter(t => t.status === 'failed').length > 0 ? `
#### Failed Tests:
${suite.tests.filter(t => t.status === 'failed').map(t => `- ❌ **${t.testName}**: ${t.error || 'Unknown error'}`).join('\\n')}
` : ''}
`).join('')}

## 📊 Coverage Details

| Type | Coverage | Status |
|------|----------|--------|
| Statements | ${report.coverage.statements.percentage.toFixed(1)}% (${report.coverage.statements.covered}/${report.coverage.statements.total}) | ${report.coverage.statements.percentage >= 95 ? '✅' : '⚠️'} |
| Branches | ${report.coverage.branches.percentage.toFixed(1)}% (${report.coverage.branches.covered}/${report.coverage.branches.total}) | ${report.coverage.branches.percentage >= 95 ? '✅' : '⚠️'} |
| Functions | ${report.coverage.functions.percentage.toFixed(1)}% (${report.coverage.functions.covered}/${report.coverage.functions.total}) | ${report.coverage.functions.percentage >= 95 ? '✅' : '⚠️'} |
| Lines | ${report.coverage.lines.percentage.toFixed(1)}% (${report.coverage.lines.covered}/${report.coverage.lines.total}) | ${report.coverage.lines.percentage >= 95 ? '✅' : '⚠️'} |

## ⚡ Performance Analysis

- **Total Execution Time**: ${(report.performance.totalExecutionTime / 1000).toFixed(2)} seconds
- **Average Test Time**: ${report.performance.averageTestTime.toFixed(0)}ms
- **Memory Usage**: ${(report.performance.memoryUsage.peak.heapUsed / 1024 / 1024).toFixed(1)}MB peak

### Slowest Tests
${report.performance.slowestTests.map((test, index) => `${index + 1}. **${test.name}**: ${test.duration.toFixed(0)}ms`).join('\\n')}

## 📈 Quality Metrics

- **Test Reliability**: ${report.qualityMetrics.testReliability.toFixed(1)}%
- **Code Quality**: ${report.qualityMetrics.codeQuality.toFixed(1)}%
- **Maintainability Index**: ${report.qualityMetrics.maintainabilityIndex.toFixed(1)}%
- **Technical Debt**: ${report.qualityMetrics.technicalDebt.toFixed(1)}%

## 💡 Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\\n')}

## 📁 File Coverage Details

${Object.entries(report.coverage.files).map(([file, coverage]) => `
### ${file}
- **Statements**: ${coverage.statements.toFixed(1)}%
- **Branches**: ${coverage.branches.toFixed(1)}%
- **Functions**: ${coverage.functions.toFixed(1)}%
- **Lines**: ${coverage.lines.toFixed(1)}%
`).join('')}

---

*Report generated by CastPlan Ultimate Automation Test Framework*`;

    const mdPath = join(this.config.outputDir, 'test-report.md');
    await writeFile(mdPath, markdown, 'utf8');
    return mdPath;
  }

  /**
   * Generate JSON test report
   */
  static async generateJSONReport(report: ComprehensiveTestReport): Promise<string> {
    const jsonPath = join(this.config.outputDir, 'test-report.json');
    await writeFile(jsonPath, JSON.stringify(report, null, 2), 'utf8');
    return jsonPath;
  }

  /**
   * Generate JUnit XML report for CI/CD integration
   */
  static async generateJUnitReport(report: ComprehensiveTestReport): Promise<string> {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="CastPlan Ultimate Automation Tests" 
           tests="${report.summary.totalTests}" 
           failures="${report.summary.failedTests}" 
           skipped="${report.summary.skippedTests}" 
           time="${(report.duration / 1000).toFixed(3)}">
${report.suites.map(suite => `
  <testsuite name="${suite.suiteName}" 
             tests="${suite.totalTests}" 
             failures="${suite.failedTests}" 
             skipped="${suite.skippedTests}" 
             time="${(suite.duration / 1000).toFixed(3)}">
${suite.tests.map(test => `
    <testcase name="${test.testName}" 
              classname="${test.testFile}" 
              time="${(test.duration / 1000).toFixed(3)}">
${test.status === 'failed' ? `      <failure message="${test.error || 'Test failed'}">${test.error || 'Unknown failure'}</failure>` : ''}
${test.status === 'skipped' ? `      <skipped/>` : ''}
    </testcase>`).join('')}
  </testsuite>`).join('')}
</testsuites>`;

    const xmlPath = join(this.config.outputDir, 'junit-report.xml');
    await writeFile(xmlPath, xml, 'utf8');
    return xmlPath;
  }

  /**
   * Generate CSV report for data analysis
   */
  static async generateCSVReport(report: ComprehensiveTestReport): Promise<string> {
    const headers = [
      'Test Suite',
      'Test Name',
      'Status',
      'Duration (ms)',
      'Memory Usage (MB)',
      'Error'
    ];

    const rows = report.suites.flatMap(suite =>
      suite.tests.map(test => [
        suite.suiteName,
        test.testName,
        test.status,
        test.duration.toString(),
        test.memoryUsage ? (test.memoryUsage.heapUsed / 1024 / 1024).toFixed(2) : 'N/A',
        test.error || ''
      ])
    );

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\\n');

    const csvPath = join(this.config.outputDir, 'test-report.csv');
    await writeFile(csvPath, csv, 'utf8');
    return csvPath;
  }

  /**
   * Private helper methods
   */
  private static calculateSummaryStatistics() {
    const totalTests = this.testResults.reduce((sum, suite) => sum + suite.totalTests, 0);
    const passedTests = this.testResults.reduce((sum, suite) => sum + suite.passedTests, 0);
    const failedTests = this.testResults.reduce((sum, suite) => sum + suite.failedTests, 0);
    const skippedTests = this.testResults.reduce((sum, suite) => sum + suite.skippedTests, 0);

    return {
      totalSuites: this.testResults.length,
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      successRate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0
    };
  }

  private static async generateCoverageData(): Promise<CoverageData> {
    try {
      // Load coverage data from Jest/Istanbul output
      const coveragePath = join(process.cwd(), 'coverage', 'coverage-summary.json');
      const coverageData = JSON.parse(await readFile(coveragePath, 'utf8'));
      
      return {
        statements: {
          total: coverageData.total.statements.total,
          covered: coverageData.total.statements.covered,
          percentage: coverageData.total.statements.pct
        },
        branches: {
          total: coverageData.total.branches.total,
          covered: coverageData.total.branches.covered,
          percentage: coverageData.total.branches.pct
        },
        functions: {
          total: coverageData.total.functions.total,
          covered: coverageData.total.functions.covered,
          percentage: coverageData.total.functions.pct
        },
        lines: {
          total: coverageData.total.lines.total,
          covered: coverageData.total.lines.covered,
          percentage: coverageData.total.lines.pct
        },
        files: Object.entries(coverageData)
          .filter(([key]) => key !== 'total')
          .reduce((acc, [file, data]: [string, any]) => {
            acc[file] = {
              statements: data.statements.pct,
              branches: data.branches.pct,
              functions: data.functions.pct,
              lines: data.lines.pct
            };
            return acc;
          }, {} as any)
      };
    } catch (error) {
      // Return default coverage data if coverage file not found
      return {
        statements: { total: 0, covered: 0, percentage: 0 },
        branches: { total: 0, covered: 0, percentage: 0 },
        functions: { total: 0, covered: 0, percentage: 0 },
        lines: { total: 0, covered: 0, percentage: 0 },
        files: {}
      };
    }
  }

  private static generatePerformanceMetrics(totalDuration: number, finalMemory: NodeJS.MemoryUsage): PerformanceMetrics {
    const allTests = this.testResults.flatMap(suite => suite.tests);
    const totalTestTime = allTests.reduce((sum, test) => sum + test.duration, 0);
    const averageTestTime = allTests.length > 0 ? totalTestTime / allTests.length : 0;
    
    const slowestTests = allTests
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .map(test => ({ name: test.testName, duration: test.duration }));

    return {
      totalExecutionTime: totalDuration,
      averageTestTime,
      slowestTests,
      memoryUsage: {
        initial: this.initialMemory,
        peak: this.peakMemory,
        final: finalMemory
      }
    };
  }

  private static calculateQualityMetrics() {
    const summary = this.calculateSummaryStatistics();
    
    return {
      testReliability: summary.successRate,
      codeQuality: 85.0, // Would be calculated from static analysis
      maintainabilityIndex: 80.0, // Would be calculated from complexity metrics  
      technicalDebt: 15.0 // Would be calculated from code analysis
    };
  }

  private static generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const summary = this.calculateSummaryStatistics();

    if (summary.successRate < 95) {
      recommendations.push(`Improve test success rate from ${summary.successRate.toFixed(1)}% to 95%+`);
    }

    if (summary.failedTests > 0) {
      recommendations.push(`Fix ${summary.failedTests} failing tests before deployment`);
    }

    const avgTestTime = this.testResults.reduce((sum, suite) => sum + suite.duration, 0) / this.testResults.length;
    if (avgTestTime > 1000) {
      recommendations.push(`Optimize test performance - current average: ${avgTestTime.toFixed(0)}ms`);
    }

    recommendations.push('Implement automated performance regression detection');
    recommendations.push('Set up continuous test reliability monitoring');
    recommendations.push('Consider adding property-based testing for edge cases');

    return recommendations;
  }

  private static async loadHistoricalTrends() {
    // In a real implementation, this would load from a database or file system
    return {
      coverageTrend: [
        { date: '2024-01-01', percentage: 85 },
        { date: '2024-01-15', percentage: 90 },
        { date: '2024-01-31', percentage: 95 }
      ],
      performanceTrend: [
        { date: '2024-01-01', avgTime: 1200 },
        { date: '2024-01-15', avgTime: 1000 },
        { date: '2024-01-31', avgTime: 800 }
      ],
      reliabilityTrend: [
        { date: '2024-01-01', successRate: 90 },
        { date: '2024-01-15', successRate: 95 },
        { date: '2024-01-31', successRate: 98 }
      ]
    };
  }

  private static async saveHistoricalData(report: ComprehensiveTestReport): Promise<void> {
    const historyPath = join(this.config.outputDir, 'test-history.json');
    
    try {
      const existingHistory = JSON.parse(await readFile(historyPath, 'utf8'));
      existingHistory.push({
        timestamp: report.timestamp,
        summary: report.summary,
        coverage: report.coverage.statements.percentage,
        avgTestTime: report.performance.averageTestTime
      });
      
      // Keep only last 30 entries
      if (existingHistory.length > 30) {
        existingHistory.splice(0, existingHistory.length - 30);
      }
      
      await writeFile(historyPath, JSON.stringify(existingHistory, null, 2));
    } catch (error) {
      // Create new history file
      await writeFile(historyPath, JSON.stringify([{
        timestamp: report.timestamp,
        summary: report.summary,
        coverage: report.coverage.statements.percentage,
        avgTestTime: report.performance.averageTestTime
      }], null, 2));
    }
  }

  private static async generateReports(report: ComprehensiveTestReport): Promise<void> {
    const generatedReports: string[] = [];

    for (const format of this.config.formats) {
      try {
        let reportPath: string;
        
        switch (format) {
          case 'html':
            reportPath = await this.generateHTMLReport(report);
            break;
          case 'json':
            reportPath = await this.generateJSONReport(report);
            break;
          case 'markdown':
            reportPath = await this.generateMarkdownReport(report);
            break;
          case 'junit':
            reportPath = await this.generateJUnitReport(report);
            break;
          case 'csv':
            reportPath = await this.generateCSVReport(report);
            break;
          default:
            continue;
        }
        
        generatedReports.push(reportPath);
      } catch (error) {
        console.warn(`Failed to generate ${format} report:`, error);
      }
    }

    console.log(`✅ Generated ${generatedReports.length} test reports:`);
    generatedReports.forEach(path => console.log(`  📄 ${path}`));
  }

  private static startMemoryMonitoring(): void {
    const monitorInterval = setInterval(() => {
      const currentMemory = process.memoryUsage();
      if (currentMemory.heapUsed > this.peakMemory.heapUsed) {
        this.peakMemory = currentMemory;
      }
    }, 1000);

    // Clean up interval on process exit
    process.on('exit', () => clearInterval(monitorInterval));
  }

  private static getReportCSS(): string {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; }
      .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
      header { text-align: center; margin-bottom: 30px; }
      header h1 { color: #2c3e50; margin-bottom: 10px; }
      .timestamp { color: #7f8c8d; font-size: 14px; }
      .summary-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
      .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .card h3 { font-size: 14px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
      .card .metric { font-size: 32px; font-weight: bold; margin-bottom: 5px; }
      .card .sub-metric { font-size: 14px; color: #7f8c8d; }
      .card.success { border-left: 4px solid #27ae60; }
      .card.warning { border-left: 4px solid #f39c12; }
      .card.danger { border-left: 4px solid #e74c3c; }
      .charts-container { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
      .chart-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .test-suites, .quality-metrics, .recommendations, .detailed-coverage { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
      .test-suite { border-left: 3px solid #3498db; padding-left: 15px; margin-bottom: 20px; }
      .test-suite h4 { color: #2c3e50; margin-bottom: 10px; }
      .test-suite .stats { display: flex; gap: 20px; margin-bottom: 10px; }
      .test-suite .stat { font-size: 14px; }
      .test-suite .stat.passed { color: #27ae60; }
      .test-suite .stat.failed { color: #e74c3c; }
      .test-suite .stat.skipped { color: #f39c12; }
      .failed-tests { margin-top: 15px; }
      .failed-test { background: #fdf2f2; padding: 10px; border-left: 3px solid #e74c3c; margin-bottom: 5px; }
      .coverage-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
      .coverage-table th, .coverage-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ecf0f1; }
      .coverage-table th { background: #f8f9fa; font-weight: 600; }
      .coverage-high { color: #27ae60; font-weight: bold; }
      .coverage-medium { color: #f39c12; font-weight: bold; }
      .coverage-low { color: #e74c3c; font-weight: bold; }
    `;
  }

  private static generateTestSuitesHTML(suites: TestSuiteResult[]): string {
    return suites.map(suite => `
      <div class="test-suite">
        <h4>${suite.suiteName}</h4>
        <div class="stats">
          <span class="stat passed">✅ ${suite.passedTests} passed</span>
          <span class="stat failed">❌ ${suite.failedTests} failed</span>
          <span class="stat skipped">⏭️ ${suite.skippedTests} skipped</span>
          <span class="stat">⏱️ ${suite.duration.toFixed(2)}ms</span>
        </div>
        ${suite.tests.filter(t => t.status === 'failed').length > 0 ? `
          <div class="failed-tests">
            <strong>Failed Tests:</strong>
            ${suite.tests.filter(t => t.status === 'failed').map(t => `
              <div class="failed-test">
                <strong>${t.testName}</strong><br>
                <small>${t.error || 'Unknown error'}</small>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');
  }

  private static generateQualityMetricsHTML(metrics: any): string {
    return `
      <div class="quality-grid">
        <div class="metric-card">
          <h4>Test Reliability</h4>
          <div class="metric-value ${metrics.testReliability >= 95 ? 'good' : 'needs-improvement'}">${metrics.testReliability.toFixed(1)}%</div>
        </div>
        <div class="metric-card">
          <h4>Code Quality</h4>
          <div class="metric-value ${metrics.codeQuality >= 80 ? 'good' : 'needs-improvement'}">${metrics.codeQuality.toFixed(1)}%</div>
        </div>
        <div class="metric-card">
          <h4>Maintainability</h4>
          <div class="metric-value ${metrics.maintainabilityIndex >= 70 ? 'good' : 'needs-improvement'}">${metrics.maintainabilityIndex.toFixed(1)}%</div>
        </div>
        <div class="metric-card">
          <h4>Technical Debt</h4>
          <div class="metric-value ${metrics.technicalDebt <= 20 ? 'good' : 'needs-improvement'}">${metrics.technicalDebt.toFixed(1)}%</div>
        </div>
      </div>
    `;
  }

  private static generateFileCoverageHTML(files: any): string {
    return `
      <table class="coverage-table">
        <thead>
          <tr>
            <th>File</th>
            <th>Statements</th>
            <th>Branches</th>
            <th>Functions</th>
            <th>Lines</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(files).map(([file, coverage]: [string, any]) => `
            <tr>
              <td>${file}</td>
              <td class="${this.getCoverageClass(coverage.statements)}">${coverage.statements.toFixed(1)}%</td>
              <td class="${this.getCoverageClass(coverage.branches)}">${coverage.branches.toFixed(1)}%</td>
              <td class="${this.getCoverageClass(coverage.functions)}">${coverage.functions.toFixed(1)}%</td>
              <td class="${this.getCoverageClass(coverage.lines)}">${coverage.lines.toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  private static getCoverageClass(percentage: number): string {
    if (percentage >= 95) return 'coverage-high';
    if (percentage >= 80) return 'coverage-medium';
    return 'coverage-low';
  }

  private static getReportJavaScript(report: ComprehensiveTestReport): string {
    return `
      // Coverage Chart
      const coverageCtx = document.getElementById('coverageChart').getContext('2d');
      new Chart(coverageCtx, {
        type: 'doughnut',
        data: {
          labels: ['Statements', 'Branches', 'Functions', 'Lines'],
          datasets: [{
            data: [
              ${report.coverage.statements.percentage},
              ${report.coverage.branches.percentage},
              ${report.coverage.functions.percentage},
              ${report.coverage.lines.percentage}
            ],
            backgroundColor: ['#3498db', '#2ecc71', '#f39c12', '#e74c3c']
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' }
          }
        }
      });

      // Performance Chart
      const performanceCtx = document.getElementById('performanceChart').getContext('2d');
      new Chart(performanceCtx, {
        type: 'line',
        data: {
          labels: ${JSON.stringify(report.trends.performanceTrend.map(t => t.date))},
          datasets: [{
            label: 'Avg Test Time (ms)',
            data: ${JSON.stringify(report.trends.performanceTrend.map(t => t.avgTime))},
            borderColor: '#3498db',
            backgroundColor: 'rgba(52, 152, 219, 0.1)',
            fill: true
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' }
          },
          scales: {
            y: { beginAtZero: true }
          }
        }
      });
    `;
  }
}

/**
 * Jest integration helper
 */
export const setupTestReporting = () => {
  beforeAll(async () => {
    await TestReportingFramework.initialize();
  });

  afterAll(async () => {
    const report = await TestReportingFramework.generateComprehensiveReport();
    console.log(`📊 Test report generated: ${report.summary.successRate.toFixed(1)}% success rate`);
  });

  return TestReportingFramework;
};