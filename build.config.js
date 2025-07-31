/**
 * CastPlan Automation - Comprehensive Production Build Configuration
 * Multi-manager, cross-platform, enterprise-grade build system
 */

import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { execSync } from 'child_process';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

// Environment detection
const NODE_ENV = process.env.NODE_ENV || 'development';
const BUILD_TARGET = process.env.BUILD_TARGET || 'production';
const PLATFORM = process.platform;
const ARCH = process.arch;

// Build metadata
const BUILD_TIMESTAMP = new Date().toISOString();
const GIT_COMMIT = getGitCommit();
const BUILD_VERSION = packageJson.version;
const BUILD_HASH = generateBuildHash();

// Environment-specific configurations
const CONFIG = {
  development: {
    minify: false,
    sourceMaps: true,
    debugging: true,
    compression: false,
    optimization: 'fast',
    bundleAnalysis: false,
    securityScanning: false,
    performanceMonitoring: false
  },
  
  staging: {
    minify: true,
    sourceMaps: true,
    debugging: true,
    compression: true,
    optimization: 'balanced',
    bundleAnalysis: true,
    securityScanning: true,
    performanceMonitoring: true
  },
  
  production: {
    minify: true,
    sourceMaps: false,
    debugging: false,
    compression: true,
    optimization: 'aggressive',
    bundleAnalysis: true,
    securityScanning: true,
    performanceMonitoring: true,
    cdnOptimization: true,
    treeShaking: true
  }
};

const currentConfig = CONFIG[NODE_ENV] || CONFIG.production;

// Platform-specific configurations
const PLATFORM_CONFIG = {
  win32: {
    executable: '.exe',
    pathSeparator: '\\',
    packageManager: 'npm',
    shell: 'cmd'
  },
  darwin: {
    executable: '',
    pathSeparator: '/',
    packageManager: 'npm',
    shell: 'bash'
  },
  linux: {
    executable: '',
    pathSeparator: '/',
    packageManager: 'npm',
    shell: 'bash'
  }
};

// Multi-manager support configuration
const PACKAGE_MANAGERS = {
  npm: {
    install: 'npm install',
    build: 'npm run build',
    test: 'npm test',
    publish: 'npm publish',
    registry: 'https://registry.npmjs.org/'
  },
  yarn: {
    install: 'yarn install',
    build: 'yarn build',
    test: 'yarn test',
    publish: 'yarn publish',
    registry: 'https://registry.yarnpkg.com/'
  },
  pnpm: {
    install: 'pnpm install',
    build: 'pnpm build',
    test: 'pnpm test',
    publish: 'pnpm publish',
    registry: 'https://registry.npmjs.org/'
  },
  uv: {
    install: 'uv add',
    build: 'uv run build',
    test: 'uv run test',
    publish: 'uv publish',
    registry: 'https://pypi.org/simple/'
  }
};

// Build targets and optimization
export const BUILD_CONFIG = {
  // Core configuration
  environment: NODE_ENV,
  target: BUILD_TARGET,
  platform: PLATFORM,
  architecture: ARCH,
  
  // Build metadata
  version: BUILD_VERSION,
  buildHash: BUILD_HASH,
  timestamp: BUILD_TIMESTAMP,
  gitCommit: GIT_COMMIT,
  
  // Compilation settings
  typescript: {
    target: 'ES2022',
    module: 'ES2022',
    strict: true,
    declaration: currentConfig.debugging,
    sourceMap: currentConfig.sourceMaps,
    removeComments: currentConfig.minify,
    incremental: NODE_ENV === 'development'
  },
  
  // Optimization settings
  optimization: {
    minify: currentConfig.minify,
    compression: currentConfig.compression,
    treeShaking: currentConfig.treeShaking,
    deadCodeElimination: currentConfig.optimization === 'aggressive',
    bundleSplitting: currentConfig.optimization !== 'fast',
    codeInlining: currentConfig.optimization === 'aggressive'
  },
  
  // Security settings
  security: {
    vulnerabilityScanning: currentConfig.securityScanning,
    dependencyAuditing: true,
    licenseCompliance: true,
    secretDetection: true,
    integrityHashes: true
  },
  
  // Performance settings
  performance: {
    monitoring: currentConfig.performanceMonitoring,
    bundleAnalysis: currentConfig.bundleAnalysis,
    memoryProfiling: NODE_ENV !== 'production',
    loadTesting: BUILD_TARGET === 'production',
    benchmarking: true
  },
  
  // Distribution settings
  distribution: {
    multiManager: true,
    crossPlatform: true,
    containerization: BUILD_TARGET === 'production',
    cdnOptimization: currentConfig.cdnOptimization,
    caching: true
  },
  
  // Platform-specific settings
  platform: PLATFORM_CONFIG[PLATFORM],
  
  // Package manager configurations
  packageManagers: PACKAGE_MANAGERS,
  
  // Build paths
  paths: {
    source: './src',
    output: './dist',
    tests: './__tests__',
    coverage: './coverage',
    docs: './docs',
    configs: './configs',
    cache: './node_modules/.cache/castplan-mcp',
    temp: './temp'
  },
  
  // External dependencies
  externals: [
    '@modelcontextprotocol/sdk',
    'fs',
    'path',
    'os',
    'crypto',
    'child_process'
  ],
  
  // Bundle splitting strategy
  chunks: {
    vendor: ['@modelcontextprotocol/sdk', 'commander', 'winston'],
    tools: ['glob', 'chokidar', 'js-yaml'],
    services: /src\/services/,
    utils: /src\/utils/
  }
};

// Utility functions
function getGitCommit() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function generateBuildHash() {
  const content = JSON.stringify({
    version: BUILD_VERSION,
    timestamp: BUILD_TIMESTAMP,
    platform: PLATFORM,
    arch: ARCH,
    env: NODE_ENV
  });
  return createHash('sha256').update(content).digest('hex').substring(0, 8);
}

// Build validation
export function validateBuildEnvironment() {
  const errors = [];
  
  // Check Node.js version
  const nodeVersion = process.version;
  const requiredNodeVersion = packageJson.engines.node;
  if (!nodeVersion.match(new RegExp(requiredNodeVersion.replace('>=', '')))) {
    errors.push(`Node.js version ${nodeVersion} does not meet requirement ${requiredNodeVersion}`);
  }
  
  // Check platform support
  if (!packageJson.os.includes(PLATFORM)) {
    errors.push(`Platform ${PLATFORM} is not officially supported`);
  }
  
  // Check architecture support
  if (!packageJson.cpu.includes(ARCH)) {
    errors.push(`Architecture ${ARCH} is not officially supported`);
  }
  
  return errors;
}

// Performance budgets
export const PERFORMANCE_BUDGETS = {
  maxBundleSize: '2MB',
  maxChunkSize: '500KB',
  maxAssetSize: '250KB',
  buildTime: NODE_ENV === 'development' ? '30s' : '300s',
  testTime: '600s'
};

export default BUILD_CONFIG;