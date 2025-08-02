/**
 * Universal MCP Configuration Generator
 *
 * Generates MCP server configurations for multiple environments with
 * cross-platform support and intelligent auto-detection.
 */
import { z } from 'zod';
declare const MCPServerConfigSchema: z.ZodObject<{
    command: z.ZodString;
    args: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    cwd: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    command: string;
    args?: string[] | undefined;
    env?: Record<string, string> | undefined;
    cwd?: string | undefined;
}, {
    command: string;
    args?: string[] | undefined;
    env?: Record<string, string> | undefined;
    cwd?: string | undefined;
}>;
declare const ClaudeDesktopConfigSchema: z.ZodObject<{
    mcpServers: z.ZodRecord<z.ZodString, z.ZodObject<{
        command: z.ZodString;
        args: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        cwd: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        command: string;
        args?: string[] | undefined;
        env?: Record<string, string> | undefined;
        cwd?: string | undefined;
    }, {
        command: string;
        args?: string[] | undefined;
        env?: Record<string, string> | undefined;
        cwd?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    mcpServers: Record<string, {
        command: string;
        args?: string[] | undefined;
        env?: Record<string, string> | undefined;
        cwd?: string | undefined;
    }>;
}, {
    mcpServers: Record<string, {
        command: string;
        args?: string[] | undefined;
        env?: Record<string, string> | undefined;
        cwd?: string | undefined;
    }>;
}>;
declare const StandardMCPConfigSchema: z.ZodObject<{
    servers: z.ZodRecord<z.ZodString, z.ZodObject<{
        command: z.ZodString;
        env: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        cwd: z.ZodOptional<z.ZodString>;
    } & {
        args: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        command: string;
        args: string[];
        env?: Record<string, string> | undefined;
        cwd?: string | undefined;
    }, {
        command: string;
        args: string[];
        env?: Record<string, string> | undefined;
        cwd?: string | undefined;
    }>>;
    logging: z.ZodOptional<z.ZodObject<{
        level: z.ZodEnum<["error", "warn", "info", "debug"]>;
        file: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        level: "debug" | "info" | "warn" | "error";
        file?: string | undefined;
    }, {
        level: "debug" | "info" | "warn" | "error";
        file?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    servers: Record<string, {
        command: string;
        args: string[];
        env?: Record<string, string> | undefined;
        cwd?: string | undefined;
    }>;
    logging?: {
        level: "debug" | "info" | "warn" | "error";
        file?: string | undefined;
    } | undefined;
}, {
    servers: Record<string, {
        command: string;
        args: string[];
        env?: Record<string, string> | undefined;
        cwd?: string | undefined;
    }>;
    logging?: {
        level: "debug" | "info" | "warn" | "error";
        file?: string | undefined;
    } | undefined;
}>;
export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;
export type ClaudeDesktopConfig = z.infer<typeof ClaudeDesktopConfigSchema>;
export type StandardMCPConfig = z.infer<typeof StandardMCPConfigSchema>;
export interface ConfigLocation {
    name: string;
    path: string;
    exists: boolean;
    writable: boolean;
    environment: string;
}
export interface GenerationOptions {
    serverName?: string;
    customArgs?: string[];
    environment?: Record<string, string>;
    workingDirectory?: string;
    logLevel?: 'error' | 'warn' | 'info' | 'debug';
}
export declare class UniversalMCPConfigGenerator {
    private platform;
    private homeDir;
    private packagePath?;
    private nodePath?;
    constructor();
    /**
     * Initialize with detected Node.js and package paths
     */
    initialize(): Promise<void>;
    /**
     * Detect Node.js installation
     */
    private detectNodeJS;
    /**
     * Detect CastPlan package installation
     */
    private detectPackage;
    /**
     * Get potential package installation paths
     */
    private getPackageSearchPaths;
    /**
     * Detect all configuration locations across environments
     */
    detectConfigLocations(): Promise<ConfigLocation[]>;
    /**
     * Get Claude Desktop configuration locations
     */
    private getClaudeDesktopLocations;
    /**
     * Get standard MCP configuration locations
     */
    private getStandardMCPLocations;
    /**
     * Get Cline configuration locations
     */
    private getClineLocations;
    /**
     * Get Cursor configuration locations
     */
    private getCursorLocations;
    /**
     * Generate Claude Desktop configuration
     */
    generateClaudeDesktopConfig(options?: GenerationOptions): ClaudeDesktopConfig;
    /**
     * Generate standard MCP configuration
     */
    generateStandardMCPConfig(options?: GenerationOptions): StandardMCPConfig;
    /**
     * Install configuration to specified location
     */
    installConfig(location: ConfigLocation, options?: GenerationOptions, backupExisting?: boolean): Promise<void>;
    /**
     * Verify configuration installation
     */
    verifyConfig(location: ConfigLocation): Promise<{
        exists: boolean;
        valid: boolean;
        hasServer: boolean;
        serverName?: string;
        errors: string[];
    }>;
}
export {};
//# sourceMappingURL=UniversalMCPConfigGenerator.d.ts.map