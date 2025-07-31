#!/usr/bin/env node
/**
 * CastPlan Ultimate Automation - Bundle Size Analyzer
 * Performance monitoring and optimization insights
 */

import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, extname, relative } from 'path';
import { execSync } from 'child_process';
import { PERFORMANCE_BUDGETS } from '../build.config.js';

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

class BundleAnalyzer {
  constructor() {
    this.distPath = './dist';
    this.results = {
      timestamp: new Date().toISOString(),
      totalSize: 0,
      files: [],
      chunks: {},
      dependencies: {},
      performance: {
        budgets: PERFORMANCE_BUDGETS,
        violations: []
      },
      recommendations: []
    };
  }

  log(message, level = 'info') {
    const colorMap = {
      info: colors.cyan,
      success: colors.green,
      warning: colors.yellow,
      error: colors.red,
      header: colors.magenta
    };
    console.log(`${colorMap[level]}${message}${colors.reset}`);
  }

  // Parse size string to bytes
  parseSize(sizeStr) {
    const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)(\w+)$/);
    if (!match) return 0;
    return parseFloat(match[1]) * (units[match[2]] || 1);
  }

  // Format bytes to human readable
  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Analyze individual file
  analyzeFile(filePath) {
    const stats = statSync(filePath);
    const relativePath = relative('.', filePath);
    const ext = extname(filePath);
    
    const fileInfo = {
      path: relativePath,
      size: stats.size,
      formattedSize: this.formatSize(stats.size),
      type: this.getFileType(ext),
      compressed: false
    };

    // Check if gzipped version exists
    if (existsSync(`${filePath}.gz`)) {
      const gzipStats = statSync(`${filePath}.gz`);
      fileInfo.compressed = true;
      fileInfo.gzipSize = gzipStats.size;
      fileInfo.gzipFormattedSize = this.formatSize(gzipStats.size);
      fileInfo.compressionRatio = ((stats.size - gzipStats.size) / stats.size * 100).toFixed(1);
    }

    return fileInfo;
  }

  // Get file type category
  getFileType(ext) {
    const typeMap = {
      '.js': 'JavaScript',
      '.mjs': 'JavaScript (Module)',
      '.ts': 'TypeScript',
      '.json': 'JSON',
      '.map': 'Source Map',
      '.d.ts': 'Type Definition',
      '.css': 'Stylesheet',
      '.html': 'HTML'
    };
    return typeMap[ext] || 'Other';
  }

  // Recursively scan directory
  scanDirectory(dirPath) {
    const files = [];
    
    const items = readdirSync(dirPath);
    for (const item of items) {
      const fullPath = join(dirPath, item);
      const stats = statSync(fullPath);
      
      if (stats.isDirectory()) {
        files.push(...this.scanDirectory(fullPath));
      } else {
        files.push(this.analyzeFile(fullPath));
      }
    }
    
    return files;
  }

  // Analyze dependencies from package.json
  analyzeDependencies() {
    try {
      const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      for (const [name, version] of Object.entries(deps)) {
        try {
          const depPackageJson = readFileSync(`./node_modules/${name}/package.json`, 'utf8');
          const depInfo = JSON.parse(depPackageJson);
          
          this.results.dependencies[name] = {
            version,
            size: this.estimatePackageSize(name),
            license: depInfo.license,
            description: depInfo.description
          };
        } catch (error) {
          this.results.dependencies[name] = {
            version,
            size: 'Unknown',
            error: 'Could not analyze'
          };
        }
      }
    } catch (error) {
      this.log(`Error analyzing dependencies: ${error.message}`, 'error');
    }
  }

  // Estimate package size (simplified)
  estimatePackageSize(packageName) {
    try {
      const packagePath = `./node_modules/${packageName}`;
      if (!existsSync(packagePath)) return 'Not installed';
      
      // Simple approximation - count main files
      const mainFiles = ['index.js', 'main.js', 'lib/index.js', 'dist/index.js'];
      for (const file of mainFiles) {
        const filePath = join(packagePath, file);
        if (existsSync(filePath)) {
          const stats = statSync(filePath);
          return this.formatSize(stats.size);
        }
      }
      
      return 'Unknown';
    } catch (error) {
      return 'Error';
    }
  }

  // Check performance budgets
  checkPerformanceBudgets() {
    const budgets = PERFORMANCE_BUDGETS;
    
    // Check total bundle size
    const maxBundleSize = this.parseSize(budgets.maxBundleSize);
    if (this.results.totalSize > maxBundleSize) {
      this.results.performance.violations.push({
        type: 'Bundle Size',
        limit: budgets.maxBundleSize,
        actual: this.formatSize(this.results.totalSize),
        severity: 'high'
      });
    }

    // Check individual file sizes
    const maxChunkSize = this.parseSize(budgets.maxChunkSize);
    for (const file of this.results.files) {
      if (file.size > maxChunkSize && file.type === 'JavaScript') {
        this.results.performance.violations.push({
          type: 'Chunk Size',
          file: file.path,
          limit: budgets.maxChunkSize,
          actual: file.formattedSize,
          severity: 'medium'
        });
      }
    }
  }

  // Generate optimization recommendations
  generateRecommendations() {
    const recommendations = [];

    // Large files recommendation
    const largeFiles = this.results.files
      .filter(f => f.size > 100 * 1024 && f.type === 'JavaScript')
      .sort((a, b) => b.size - a.size);

    if (largeFiles.length > 0) {
      recommendations.push({
        type: 'Code Splitting',
        priority: 'high',
        description: 'Consider splitting large JavaScript files',
        files: largeFiles.slice(0, 3).map(f => f.path),
        impact: 'Improved initial load time'
      });
    }

    // Compression recommendation
    const uncompressedFiles = this.results.files.filter(f => !f.compressed && f.size > 10 * 1024);
    if (uncompressedFiles.length > 0) {
      recommendations.push({
        type: 'Compression',
        priority: 'medium',
        description: 'Enable gzip compression for static assets',
        count: uncompressedFiles.length,
        impact: 'Reduced bandwidth usage'
      });
    }

    // Source maps in production
    const sourceMaps = this.results.files.filter(f => f.path.endsWith('.map'));
    if (sourceMaps.length > 0) {
      recommendations.push({
        type: 'Source Maps',
        priority: 'low',
        description: 'Consider removing source maps in production builds',
        count: sourceMaps.length,
        impact: 'Reduced bundle size'
      });
    }

    this.results.recommendations = recommendations;
  }

  // Generate detailed report
  generateReport() {
    const report = {
      summary: {
        totalFiles: this.results.files.length,
        totalSize: this.formatSize(this.results.totalSize),
        largestFile: this.results.files.reduce((max, file) => 
          file.size > max.size ? file : max, { size: 0 }),
        violations: this.results.performance.violations.length,
        recommendations: this.results.recommendations.length
      },
      details: this.results
    };

    // Write detailed report
    writeFileSync('./bundle-analysis.json', JSON.stringify(report, null, 2));
    
    return report;
  }

  // Display console output
  displayResults() {
    this.log('\n📊 Bundle Analysis Results', 'header');
    this.log('=' .repeat(50), 'header');
    
    // Summary
    this.log(`📦 Total Files: ${this.results.files.length}`, 'info');
    this.log(`📏 Total Size: ${this.formatSize(this.results.totalSize)}`, 'info');
    
    // Top 5 largest files
    this.log('\n🔝 Largest Files:', 'header');
    const topFiles = this.results.files
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);
      
    for (const file of topFiles) {
      const color = file.size > 500 * 1024 ? 'error' : file.size > 100 * 1024 ? 'warning' : 'success';
      this.log(`   ${file.formattedSize.padEnd(8)} ${file.path}`, color);
    }

    // Performance budget violations
    if (this.results.performance.violations.length > 0) {
      this.log('\n⚠️  Performance Budget Violations:', 'warning');
      for (const violation of this.results.performance.violations) {
        this.log(`   ${violation.type}: ${violation.actual} (limit: ${violation.limit})`, 'error');
      }
    } else {
      this.log('\n✅ All performance budgets met!', 'success');
    }

    // Recommendations
    if (this.results.recommendations.length > 0) {
      this.log('\n💡 Optimization Recommendations:', 'header');
      for (const rec of this.results.recommendations) {
        const priorityColor = rec.priority === 'high' ? 'error' : rec.priority === 'medium' ? 'warning' : 'info';
        this.log(`   [${rec.priority.toUpperCase()}] ${rec.type}: ${rec.description}`, priorityColor);
      }
    }

    this.log('\n📄 Detailed report saved to: bundle-analysis.json', 'info');
  }

  // Main analysis method
  async analyze() {
    try {
      this.log('🔍 Starting bundle analysis...', 'header');

      if (!existsSync(this.distPath)) {
        throw new Error('Dist directory not found. Run build first.');
      }

      // Scan all files
      this.results.files = this.scanDirectory(this.distPath);
      this.results.totalSize = this.results.files.reduce((sum, file) => sum + file.size, 0);

      // Analyze dependencies
      this.analyzeDependencies();

      // Check performance budgets
      this.checkPerformanceBudgets();

      // Generate recommendations
      this.generateRecommendations();

      // Generate and display report
      const report = this.generateReport();
      this.displayResults();

      return report;

    } catch (error) {
      this.log(`❌ Analysis failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new BundleAnalyzer();
  analyzer.analyze().catch(error => {
    console.error('Bundle analysis failed:', error);
    process.exit(1);
  });
}

export default BundleAnalyzer;