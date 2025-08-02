/**
 * Package Manager Detection and Fallback System
 *
 * Detects available Node.js package managers and provides intelligent
 * fallback strategies for cross-platform installation.
 */
import { z } from 'zod';
declare const PackageManagerInfoSchema: z.ZodObject<{
    name: z.ZodString;
    path: z.ZodString;
    version: z.ZodString;
    globalFlag: z.ZodString;
    installCommand: z.ZodArray<z.ZodString, "many">;
    available: z.ZodBoolean;
    priority: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    name: string;
    version: string;
    path: string;
    globalFlag: string;
    installCommand: string[];
    available: boolean;
    priority: number;
}, {
    name: string;
    version: string;
    path: string;
    globalFlag: string;
    installCommand: string[];
    available: boolean;
    priority: number;
}>;
declare const DetectionResultSchema: z.ZodObject<{
    managers: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        path: z.ZodString;
        version: z.ZodString;
        globalFlag: z.ZodString;
        installCommand: z.ZodArray<z.ZodString, "many">;
        available: z.ZodBoolean;
        priority: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        version: string;
        path: string;
        globalFlag: string;
        installCommand: string[];
        available: boolean;
        priority: number;
    }, {
        name: string;
        version: string;
        path: string;
        globalFlag: string;
        installCommand: string[];
        available: boolean;
        priority: number;
    }>, "many">;
    recommended: z.ZodOptional<z.ZodObject<{
        name: z.ZodString;
        path: z.ZodString;
        version: z.ZodString;
        globalFlag: z.ZodString;
        installCommand: z.ZodArray<z.ZodString, "many">;
        available: z.ZodBoolean;
        priority: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        name: string;
        version: string;
        path: string;
        globalFlag: string;
        installCommand: string[];
        available: boolean;
        priority: number;
    }, {
        name: string;
        version: string;
        path: string;
        globalFlag: string;
        installCommand: string[];
        available: boolean;
        priority: number;
    }>>;
    platform: z.ZodString;
    environment: z.ZodRecord<z.ZodString, z.ZodString>;
}, "strip", z.ZodTypeAny, {
    environment: Record<string, string>;
    managers: {
        name: string;
        version: string;
        path: string;
        globalFlag: string;
        installCommand: string[];
        available: boolean;
        priority: number;
    }[];
    platform: string;
    recommended?: {
        name: string;
        version: string;
        path: string;
        globalFlag: string;
        installCommand: string[];
        available: boolean;
        priority: number;
    } | undefined;
}, {
    environment: Record<string, string>;
    managers: {
        name: string;
        version: string;
        path: string;
        globalFlag: string;
        installCommand: string[];
        available: boolean;
        priority: number;
    }[];
    platform: string;
    recommended?: {
        name: string;
        version: string;
        path: string;
        globalFlag: string;
        installCommand: string[];
        available: boolean;
        priority: number;
    } | undefined;
}>;
export type PackageManagerInfo = z.infer<typeof PackageManagerInfoSchema>;
export type DetectionResult = z.infer<typeof DetectionResultSchema>;
export interface InstallationOptions {
    global?: boolean;
    preferManager?: string;
    timeout?: number;
    retries?: number;
    fallbackChain?: string[];
}
export interface InstallationResult {
    success: boolean;
    manager: string;
    output: string;
    error?: string;
    duration: number;
}
export declare class PackageManagerDetector {
    private platform;
    private detectionCache;
    private cacheExpiry;
    private lastDetection;
    constructor();
    /**
     * Detect all available package managers
     */
    detectAvailableManagers(): Promise<DetectionResult>;
    /**
     * Detect a single package manager
     */
    private detectSingleManager;
    /**
     * Find executable in PATH
     */
    private findExecutableInPath;
    /**
     * Get package manager version
     */
    private getManagerVersion;
    /**
     * Build detection result from cache
     */
    private buildDetectionResult;
    /**
     * Install package with intelligent fallback
     */
    installPackage(packageName: string, options?: InstallationOptions): Promise<InstallationResult>;
    /**
     * Order managers by preference
     */
    private orderManagersByPreference;
    /**
     * Attempt installation with a specific package manager
     */
    private attemptInstallation;
    /**
     * Check if package is already installed
     */
    isPackageInstalled(packageName: string, global?: boolean): Promise<{
        installed: boolean;
        version?: string;
        location?: string;
        manager?: string;
    }>;
    /**
     * Check if package is installed with specific manager
     */
    private checkPackageWithManager;
    /**
     * Get installation information for debugging
     */
    getInstallationInfo(): Promise<{
        managers: PackageManagerInfo[];
        environment: Record<string, string>;
        platform: string;
        recommendations: string[];
    }>;
    /**
     * Utility: delay execution
     */
    private delay;
    /**
     * Clear detection cache (force re-detection)
     */
    clearCache(): void;
}
export {};
//# sourceMappingURL=PackageManagerDetector.d.ts.map