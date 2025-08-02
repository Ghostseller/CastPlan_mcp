/**
 * Internationalization Service
 * Provides centralized locale and timezone handling for CastPlan MCP
 */
import { LocalizationConfig } from '../types/index.js';
export interface I18nConfig {
    locale: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    language: string;
}
export interface I18nTranslations {
    [key: string]: {
        [locale: string]: string;
    };
}
export declare class I18nService {
    private config;
    private translations;
    constructor(localizationConfig?: LocalizationConfig);
    /**
     * Initialize i18n configuration with auto-detection fallbacks
     */
    private initializeConfig;
    /**
     * Detect system locale with fallback to English
     */
    private detectSystemLocale;
    /**
     * Detect system timezone with fallback to UTC
     */
    private detectSystemTimezone;
    /**
     * Get default date format for language
     */
    private getDefaultDateFormat;
    /**
     * Get default time format for language
     */
    private getDefaultTimeFormat;
    /**
     * Load translation strings
     */
    private loadTranslations;
    /**
     * Get current configuration
     */
    getConfig(): I18nConfig;
    /**
     * Update configuration
     */
    updateConfig(updates: Partial<I18nConfig>): void;
    /**
     * Get translated string
     */
    translate(key: string, fallback?: string): string;
    /**
     * Format date according to current locale
     */
    formatDate(date: Date): string;
    /**
     * Format time according to current locale
     */
    formatTime(date: Date): string;
    /**
     * Format date and time according to current locale
     */
    formatDateTime(date: Date): string;
    /**
     * Get current date in user's timezone
     */
    getCurrentDate(): Date;
    /**
     * Get formatted current date string
     */
    getCurrentDateString(): string;
    /**
     * Get formatted current time string
     */
    getCurrentTimeString(): string;
    /**
     * Get formatted current date and time string
     */
    getCurrentDateTimeString(): string;
    /**
     * Check if current locale is Korean (for backward compatibility)
     */
    isKoreanLocale(): boolean;
    /**
     * Get date in timezone-aware format
     */
    getDateInTimezone(date: Date, timezone?: string): Date;
    /**
     * Get timezone offset in milliseconds
     */
    private getTimezoneOffset;
    /**
     * Create a new I18nService instance with different configuration
     */
    withConfig(config: Partial<LocalizationConfig>): I18nService;
}
export declare const i18nService: I18nService;
//# sourceMappingURL=I18nService.d.ts.map