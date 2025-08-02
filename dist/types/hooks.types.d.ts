/**
 * Hooks Integration Types
 * Extracted from castplan-automation for clarity
 */
export interface HookEvent {
    type: 'pre-work' | 'post-work' | 'file-change' | 'session-start' | 'session-end';
    data: Record<string, any>;
    timestamp: string;
}
export interface HookResponse {
    success: boolean;
    message: string;
    data?: Record<string, any>;
}
export interface FileWatchConfig {
    patterns: string[];
    ignored: string[];
    persistent: boolean;
    ignoreInitial: boolean;
}
export interface NotificationConfig {
    enabled: boolean;
    channels: ('console' | 'file' | 'webhook')[];
    webhookUrl?: string;
    logFile?: string;
}
export interface HookRequest {
    event: HookEvent;
    config?: Partial<HooksServiceConfig>;
}
export interface HooksServiceConfig {
    enabled: boolean;
    fileWatch: FileWatchConfig;
    notifications: NotificationConfig;
    gitIntegration: boolean;
}
//# sourceMappingURL=hooks.types.d.ts.map