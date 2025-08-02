import { Logger } from 'winston';
import { DateTimeService as IDateTimeService, LocalizationConfig } from '../types/enhanced.types.ts';
import { I18nService } from './I18nService.ts';
/**
 * Enhanced DateTime Service for CastPlan Documentation Automation
 *
 * Comprehensive date/time utility service with full internationalization support
 * integrated with I18nService for dynamic locale and timezone handling.
 *
 * Created: 2025-07-29
 * Updated: 2025-07-31 - Added internationalization support and I18nService integration
 */
export declare class DateTimeService implements IDateTimeService {
    private i18nService;
    private localizationConfig;
    private readonly logger?;
    constructor(logger?: Logger, i18nService?: I18nService, localizationConfig?: LocalizationConfig);
    /**
     * Get current timestamp in ISO 8601 format
     */
    getCurrentTimestamp(): string;
    /**
     * Format date with flexible format support
     * Supports both legacy format strings and localization
     * @param date - ISO date string or Date object to format
     * @param format - Output format type
     * @returns Formatted date string
     * @throws Error if date is invalid and strict mode is enabled
     */
    formatDate(date: string | Date, format?: 'iso' | 'localized' | 'short'): string;
    private formatWithTimezone;
    /**
     * Parse date string with flexible format support
     * @param dateString - String representation of date to parse
     * @param format - Expected format pattern (optional)
     * @returns Parsed Date object or null if parsing fails
     */
    parseDate(dateString: string, format?: string): Date | null;
    private getTimezoneOffset;
    /**
     * Add days to a date
     * @param date - Base date
     * @param days - Number of days to add (can be negative)
     * @returns New Date object with days added
     * @throws Error if date is invalid
     */
    addDays(date: Date, days: number): Date;
    /**
     * Calculate days between two dates
     * @param startDate - Start date
     * @param endDate - End date
     * @returns Number of days between dates (negative if endDate is before startDate)
     * @throws Error if either date is invalid
     */
    getDaysBetween(startDate: Date, endDate: Date): number;
    /**
     * Check if date is a business day (Monday-Friday)
     */
    isBusinessDay(date: Date): boolean;
    /**
     * Get next business day
     */
    getNextBusinessDay(date: Date): Date;
    /**
     * Count business days between two dates (exclusive of end date)
     */
    getBusinessDaysBetween(startDate: Date, endDate: Date): number;
    /**
     * Format relative time (e.g., "5 minutes ago", "in 2 hours")
     */
    formatRelativeTime(date: Date): string;
    /**
     * Get current date in localized format
     */
    getCurrentLocalizedDate(): string;
    /**
     * Get current date in Korean format - Legacy method for backward compatibility
     * @deprecated Use getCurrentLocalizedDate() instead
     */
    getCurrentKoreanDate(): string;
    /**
     * Set localization configuration
     */
    setLocalizationConfig(config: LocalizationConfig): void;
    /**
     * Get current localization configuration
     */
    getLocalizationConfig(): LocalizationConfig;
    /**
     * Get current year (for replacing hardcoded 2024)
     */
    getCurrentYear(): number;
    /**
     * Validate if a string is a valid datetime
     */
    isValidDateTime(dateString: string): boolean;
    /**
     * Create ISO timestamp for specific date
     */
    createTimestamp(year: number, month: number, day: number, hour?: number, minute?: number): string;
    /**
     * Get relative time description (localized)
     */
    getRelativeTime(dateString: string): string;
    /**
     * Check if date is in current year (2025)
     */
    isCurrentYear(dateString: string): boolean;
    /**
     * Get work day date (business hours consideration)
     */
    getWorkDay(daysOffset?: number): string;
    /**
     * Schedule next review date based on document type
     */
    getNextReviewDate(documentType: 'master' | 'component' | 'api' | 'database' | 'electron' | 'testing'): string;
    /**
     * Create documentation header with current date (localized)
     */
    createDocumentHeader(title: string, author?: string): string;
    /**
     * Parse various date formats and normalize to ISO
     */
    normalizeDate(dateInput: string): string;
    /**
     * Get timezone information
     */
    getTimezoneInfo(): {
        name: string;
        offset: string;
        current: string;
    };
}
export declare const dateTimeService: DateTimeService;
//# sourceMappingURL=DateTimeService.d.ts.map