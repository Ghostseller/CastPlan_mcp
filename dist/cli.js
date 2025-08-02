#!/usr/bin/env node
/**
 * CastPlan Automation - Universal CLI
 *
 * Cross-platform command-line interface with universal package manager support,
 * intelligent environment detection, and comprehensive configuration management.
 */
import { Command } from 'commander';
import { ConfigurationManager } from './config/ConfigurationManager.js';
import { PackageManagerDetector } from './config/PackageManagerDetector.js';
import { promises as fs } from 'fs';
import os from 'os';
import winston from 'winston';
const program = new Command();
// Package information
const packageJson = JSON.parse(await fs.readFile(new URL('../package.json', import.meta.url), 'utf-8'));
program
    .name('castplan-mcp')
    .description('CastPlan Automation - Universal MCP Server')
    .version(packageJson.version);
// Initialize logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [new winston.transports.Console()]
});
/**
 * Initialize command - Set up MCP server configuration
 */
program
    .command('init')
    .description('Initialize CastPlan Automation MCP server')
    .option('--server-name <name>', 'Name for the MCP server configuration', 'castplan-mcp')
    .option('--global', 'Use global installation')
    .option('--dry-run', 'Preview changes without making them')
    .action(async (options) => {
    try {
        console.log('🚀 Initializing CastPlan Automation MCP Server');
        const configManager = new ConfigurationManager({
            logger,
            projectRoot: process.cwd()
        });
        // Initialize configuration
        console.log('🔧 Generating configuration...');
        const config = await configManager.initialize();
        console.log('✅ Configuration initialized successfully!');
        if (options.dryRun) {
            console.log('\nConfiguration Summary:');
            console.log(configManager.getConfigurationSummary());
            return;
        }
        // Generate MCP configuration files
        console.log('📄 Generating MCP configuration files...');
        const mcpConfigs = await configManager.generateMCPConfigFiles({
            serverName: options.serverName,
            global: options.global
        });
        console.log(`✅ Generated ${mcpConfigs.length} MCP configuration files`);
        console.log('✨ CastPlan Automation MCP Server initialized successfully!');
    }
    catch (error) {
        console.error('❌ Initialization failed:', error);
        process.exit(1);
    }
});
/**
 * Health check command
 */
program
    .command('health')
    .description('Check system health and configuration')
    .action(async () => {
    try {
        console.log('🏥 CastPlan Automation - Health Check');
        console.log('================================');
        // Check Node.js version
        console.log(`📦 Node.js: ${process.version}`);
        console.log(`🖥️  Platform: ${os.platform()} ${os.arch()}`);
        // Check package managers
        const detector = new PackageManagerDetector();
        const managers = await detector.detectAvailableManagers();
        console.log(`⚙️  Available managers: ${managers.managers.filter(m => m.available).map(m => m.name).join(', ')}`);
        console.log('✅ System is healthy!');
    }
    catch (error) {
        console.error('❌ Health check failed:', error);
        process.exit(1);
    }
});
/**
 * Configuration status command
 */
program
    .command('status')
    .description('Show current configuration status')
    .action(async () => {
    try {
        const configManager = new ConfigurationManager({
            logger,
            projectRoot: process.cwd()
        });
        const config = await configManager.initialize();
        console.log('📊 Configuration Status');
        console.log('=======================');
        console.log(configManager.getConfigurationSummary());
    }
    catch (error) {
        console.error('❌ Status check failed:', error);
        process.exit(1);
    }
});
/**
 * Version information
 */
program
    .command('version')
    .description('Show version information')
    .action(() => {
    console.log(`CastPlan Automation v${packageJson.version}`);
    console.log(`Node.js ${process.version}`);
    console.log(`Platform: ${os.platform()} ${os.arch()}`);
});
// Parse command line arguments
program.parse(process.argv);
// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
//# sourceMappingURL=cli.js.map