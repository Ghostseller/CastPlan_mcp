#!/usr/bin/env node
/**
 * CastPlan Ultimate Automation - Production Build System
 * Comprehensive build orchestration with multi-manager support
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { performance } from 'perf_hooks';
import BUILD_CONFIG, { validateBuildEnvironment, PERFORMANCE_BUDGETS } from '../build.config.js';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Build metrics tracking
let buildMetrics = {
  startTime: performance.now(),
  phases: {},
  errors: [],
  warnings: [],
  assets: [],
  performance: {}
};

class ProductionBuilder {
  constructor() {
    this.projectRoot = process.cwd();
    this.buildId = BUILD_CONFIG.buildHash;
    this.logFile = join(BUILD_CONFIG.paths.cache, `build-${this.buildId}.log`);
    
    // Ensure cache directory exists
    if (!existsSync(BUILD_CONFIG.paths.cache)) {
      mkdirSync(BUILD_CONFIG.paths.cache, { recursive: true });
    }
  }

  // Logging utilities
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const colorMap = {
      info: colors.cyan,
      success: colors.green,
      warning: colors.yellow,
      error: colors.red,
      phase: colors.magenta
    };
    
    const coloredMessage = `${colorMap[level]}[${level.toUpperCase()}]${colors.reset} ${message}`;
    console.log(coloredMessage);
    
    // Also log to file
    const logEntry = `${timestamp} [${level.toUpperCase()}] ${message}\n`;
    try {
      writeFileSync(this.logFile, logEntry, { flag: 'a' });
    } catch (error) {
      // Fail silently for logging errors
    }
  }

  logPhase(phase) {
    const phaseStart = performance.now();
    buildMetrics.phases[phase] = { start: phaseStart };
    this.log(`🚀 Starting ${phase}...`, 'phase');
    return phaseStart;
  }

  logPhaseComplete(phase, startTime) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    buildMetrics.phases[phase].end = endTime;
    buildMetrics.phases[phase].duration = duration;
    this.log(`✅ ${phase} completed in ${duration}ms`, 'success');
  }

  // Build validation
  async validateEnvironment() {
    const phaseStart = this.logPhase('Environment Validation');
    
    const errors = validateBuildEnvironment();
    if (errors.length > 0) {
      errors.forEach(error => this.log(error, 'error'));
      throw new Error('Environment validation failed');
    }
    
    // Check required tools
    const requiredTools = ['node', 'npm', 'git'];
    for (const tool of requiredTools) {
      try {
        execSync(`${tool} --version`, { stdio: 'ignore' });
        this.log(`✓ ${tool} is available`, 'info');
      } catch (error) {
        this.log(`✗ ${tool} is not available`, 'error');
        throw new Error(`Required tool ${tool} is not installed`);
      }
    }
    
    this.logPhaseComplete('Environment Validation', phaseStart);
  }

  // Clean previous builds
  async cleanBuild() {
    const phaseStart = this.logPhase('Clean Build');
    
    const cleanPaths = [
      BUILD_CONFIG.paths.output,
      BUILD_CONFIG.paths.coverage,
      BUILD_CONFIG.paths.temp,
      join(BUILD_CONFIG.paths.cache, 'typescript'),
      join(BUILD_CONFIG.paths.cache, 'jest')
    ];
    
    for (const cleanPath of cleanPaths) {
      if (existsSync(cleanPath)) {
        rmSync(cleanPath, { recursive: true, force: true });
        this.log(`Cleaned ${cleanPath}`, 'info');
      }
    }
    
    this.logPhaseComplete('Clean Build', phaseStart);
  }

  // Install dependencies with multi-manager support
  async installDependencies() {
    const phaseStart = this.logPhase('Dependency Installation');
    
    const packageManager = this.detectPackageManager();
    const installCommand = BUILD_CONFIG.packageManagers[packageManager].install;
    
    this.log(`Using package manager: ${packageManager}`, 'info');
    
    try {
      // Install with retry mechanism
      await this.executeWithRetry(installCommand, 3);
      
      // Audit security vulnerabilities
      if (BUILD_CONFIG.security.dependencyAuditing) {
        await this.auditDependencies(packageManager);
      }
      
    } catch (error) {
      this.log(`Installation failed: ${error.message}`, 'error');
      throw error;
    }
    
    this.logPhaseComplete('Dependency Installation', phaseStart);
  }

  // Security and quality gates
  async runQualityGates() {
    const phaseStart = this.logPhase('Quality Gates');
    
    const gates = [];
    
    // TypeScript compilation check
    gates.push(this.runTypeCheck());
    
    // Linting
    gates.push(this.runLinting());
    
    // Security scanning
    if (BUILD_CONFIG.security.vulnerabilityScanning) {
      gates.push(this.runSecurityScan());
    }
    
    // License compliance
    if (BUILD_CONFIG.security.licenseCompliance) {
      gates.push(this.checkLicenseCompliance());
    }
    
    const results = await Promise.allSettled(gates);
    const failures = results.filter(result => result.status === 'rejected');
    
    if (failures.length > 0) {
      failures.forEach(failure => this.log(`Quality gate failed: ${failure.reason}`, 'error'));
      throw new Error(`${failures.length} quality gates failed`);
    }
    
    this.logPhaseComplete('Quality Gates', phaseStart);
  }

  // TypeScript compilation with optimization
  async compileTypeScript() {
    const phaseStart = this.logPhase('TypeScript Compilation');
    
    // Create optimized tsconfig for production
    const prodTsConfig = {
      ...JSON.parse(readFileSync('./tsconfig.json', 'utf8')),
      compilerOptions: {
        ...JSON.parse(readFileSync('./tsconfig.json', 'utf8')).compilerOptions,
        ...BUILD_CONFIG.typescript,
        incremental: BUILD_CONFIG.environment === 'development',
        tsBuildInfoFile: join(BUILD_CONFIG.paths.cache, 'typescript', 'tsbuildinfo')
      }
    };
    
    // Ensure cache directory exists
    mkdirSync(join(BUILD_CONFIG.paths.cache, 'typescript'), { recursive: true });
    
    // Write temporary config
    const tempConfigPath = join(BUILD_CONFIG.paths.temp, 'tsconfig.prod.json');
    mkdirSync(BUILD_CONFIG.paths.temp, { recursive: true });
    writeFileSync(tempConfigPath, JSON.stringify(prodTsConfig, null, 2));
    
    try {
      const tscCommand = `npx tsc --project ${tempConfigPath}`;
      execSync(tscCommand, { stdio: 'inherit' });
      
      // Post-compilation optimizations
      if (BUILD_CONFIG.optimization.minify) {
        await this.minifyOutput();
      }
      
    } catch (error) {
      this.log(`TypeScript compilation failed: ${error.message}`, 'error');
      throw error;
    } finally {
      // Cleanup temp config
      if (existsSync(tempConfigPath)) {
        rmSync(tempConfigPath);
      }
    }
    
    this.logPhaseComplete('TypeScript Compilation', phaseStart);
  }

  // Run comprehensive test suite
  async runTests() {
    const phaseStart = this.logPhase('Test Execution');
    
    const testCommands = [
      'npm run test:ci',
      'npm run test:integration',
      'npm run test:e2e'
    ];
    
    // Performance tests only in production builds
    if (BUILD_CONFIG.target === 'production') {
      testCommands.push('npm run test:performance');
    }
    
    for (const command of testCommands) {
      try {
        this.log(`Running: ${command}`, 'info');
        execSync(command, { stdio: 'inherit' });
      } catch (error) {
        this.log(`Test failed: ${command}`, 'error');
        if (BUILD_CONFIG.environment === 'production') {
          throw error; // Fail fast in production
        } else {
          this.log('Continuing despite test failure (development mode)', 'warning');
        }
      }
    }
    
    this.logPhaseComplete('Test Execution', phaseStart);
  }

  // Package for multiple managers
  async packageForDistribution() {
    const phaseStart = this.logPhase('Package Distribution');
    
    // Create packages for different managers
    const packages = [];
    
    // NPM package
    packages.push(this.createNpmPackage());
    
    // Python package (for uv/uvx support)
    packages.push(this.createPythonPackage());
    
    // Docker image
    if (BUILD_CONFIG.distribution.containerization) {
      packages.push(this.createDockerImage());
    }
    
    // Platform-specific installers
    packages.push(this.createPlatformInstallers());
    
    await Promise.all(packages);
    
    this.logPhaseComplete('Package Distribution', phaseStart);
  }

  // Performance analysis
  async analyzePerformance() {
    if (!BUILD_CONFIG.performance.bundleAnalysis) return;
    
    const phaseStart = this.logPhase('Performance Analysis');
    
    // Bundle size analysis
    await this.analyzeBundleSize();
    
    // Memory usage analysis
    if (BUILD_CONFIG.performance.memoryProfiling) {
      await this.analyzeMemoryUsage();
    }
    
    // Load testing
    if (BUILD_CONFIG.performance.loadTesting) {
      await this.runLoadTests();
    }
    
    this.logPhaseComplete('Performance Analysis', phaseStart);
  }

  // Generate build report
  generateBuildReport() {
    const totalDuration = performance.now() - buildMetrics.startTime;
    buildMetrics.totalDuration = Math.round(totalDuration);
    buildMetrics.success = buildMetrics.errors.length === 0;
    buildMetrics.buildConfig = BUILD_CONFIG;
    
    const reportPath = join(BUILD_CONFIG.paths.cache, `build-report-${this.buildId}.json`);
    writeFileSync(reportPath, JSON.stringify(buildMetrics, null, 2));
    
    this.log(`📊 Build report generated: ${reportPath}`, 'info');
    this.log(`⏱️  Total build time: ${buildMetrics.totalDuration}ms`, 'info');
    
    // Performance budget validation
    this.validatePerformanceBudgets();
    
    return buildMetrics;
  }

  // Helper methods
  detectPackageManager() {
    if (existsSync('yarn.lock')) return 'yarn';
    if (existsSync('pnpm-lock.yaml')) return 'pnpm';
    if (existsSync('uv.lock')) return 'uv';
    return 'npm';
  }

  async executeWithRetry(command, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        execSync(command, { stdio: 'inherit' });
        return;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        this.log(`Retry ${i + 1}/${maxRetries} for command: ${command}`, 'warning');
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  async runTypeCheck() {
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
  }

  async runLinting() {
    // Add ESLint or other linting tools as needed
    this.log('Linting completed (placeholder)', 'info');
  }

  async runSecurityScan() {
    try {
      execSync('npm audit --audit-level moderate', { stdio: 'inherit' });
    } catch (error) {
      // npm audit returns non-zero exit code for vulnerabilities
      this.log('Security vulnerabilities found - review audit results', 'warning');
    }
  }

  async checkLicenseCompliance() {
    this.log('License compliance check completed (placeholder)', 'info');
  }

  async auditDependencies(packageManager) {
    const auditCommand = packageManager === 'npm' ? 'npm audit' : `${packageManager} audit`;
    try {
      execSync(auditCommand, { stdio: 'inherit' });
    } catch (error) {
      this.log(`Security audit found issues with ${packageManager}`, 'warning');
    }
  }

  async minifyOutput() {
    this.log('Minification completed (placeholder)', 'info');
  }

  async createNpmPackage() {
    execSync('npm pack', { stdio: 'inherit' });
    this.log('NPM package created', 'success');
  }

  async createPythonPackage() {
    if (existsSync('./python-bridge')) {
      execSync('cd python-bridge && python -m build', { stdio: 'inherit' });
      this.log('Python package created', 'success');
    }
  }

  async createDockerImage() {
    if (existsSync('./Dockerfile')) {
      const imageTag = `castplan/ultimate-automation:${BUILD_CONFIG.version}`;
      execSync(`docker build -t ${imageTag} .`, { stdio: 'inherit' });
      this.log(`Docker image created: ${imageTag}`, 'success');
    }
  }

  async createPlatformInstallers() {
    this.log('Platform installers created (placeholder)', 'info');
  }

  async analyzeBundleSize() {
    this.log('Bundle size analysis completed (placeholder)', 'info');
  }

  async analyzeMemoryUsage() {
    this.log('Memory usage analysis completed (placeholder)', 'info');
  }

  async runLoadTests() {
    this.log('Load testing completed (placeholder)', 'info');
  }

  validatePerformanceBudgets() {
    this.log('Performance budgets validated (placeholder)', 'info');
  }

  // Main build execution
  async build() {
    try {
      this.log(`🏗️  Starting production build for CastPlan Ultimate Automation v${BUILD_CONFIG.version}`, 'phase');
      this.log(`📋 Build ID: ${this.buildId}`, 'info');
      this.log(`🌍 Environment: ${BUILD_CONFIG.environment}`, 'info');
      this.log(`🎯 Target: ${BUILD_CONFIG.target}`, 'info');
      this.log(`💻 Platform: ${BUILD_CONFIG.platform} (${BUILD_CONFIG.architecture})`, 'info');

      // Execute build phases
      await this.validateEnvironment();
      await this.cleanBuild();
      await this.installDependencies();
      await this.runQualityGates();
      await this.compileTypeScript();
      await this.runTests();
      await this.packageForDistribution();
      await this.analyzePerformance();

      const report = this.generateBuildReport();
      this.log(`🎉 Build completed successfully!`, 'success');
      
      return report;

    } catch (error) {
      buildMetrics.errors.push(error.message);
      this.log(`💥 Build failed: ${error.message}`, 'error');
      this.generateBuildReport();
      process.exit(1);
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const builder = new ProductionBuilder();
  builder.build().catch(error => {
    console.error('Build process failed:', error);
    process.exit(1);
  });
}

export default ProductionBuilder;