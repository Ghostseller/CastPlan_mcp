import { I18nService } from './I18nService.js';
/**
 * Enhanced DateTime Service for CastPlan Documentation Automation
 *
 * Comprehensive date/time utility service with full internationalization support
 * integrated with I18nService for dynamic locale and timezone handling.
 *
 * Created: 2025-07-29
 * Updated: 2025-07-31 - Added internationalization support and I18nService integration
 */
export class DateTimeService {
    i18nService;
    localizationConfig;
    logger;
    constructor(logger, i18nService, localizationConfig) {
        this.logger = logger;
        this.i18nService = i18nService || new I18nService(localizationConfig);
        const i18nConfig = this.i18nService.getConfig();
        this.localizationConfig = {
            timezone: i18nConfig.timezone,
            locale: i18nConfig.locale,
            dateFormat: i18nConfig.dateFormat,
            timeFormat: i18nConfig.timeFormat
        };
        if (this.logger) {
            this.logger.info(`DateTimeService initialized with locale: ${this.localizationConfig.locale}, timezone: ${this.localizationConfig.timezone}`);
        }
    }
    /**
     * Get current timestamp in ISO 8601 format
     */
    getCurrentTimestamp() {
        return new Date().toISOString();
    }
    /**
     * Format date with flexible format support
     * Supports both legacy format strings and localization
     */
    formatDate(date, format = 'iso') {
        const dateObj = new Date(date);
        // Check for invalid date
        if (isNaN(dateObj.getTime())) {
            if (this.logger) {
                this.logger.error('Invalid date provided for formatting:', date);
            }
            return 'Invalid Date';
        }
        // Handle format options using I18nService
        switch (format) {
            case 'iso':
                return dateObj.toISOString();
            case 'localized':
                return this.i18nService.formatDateTime(dateObj);
            case 'short':
                return this.i18nService.formatDate(dateObj);
            default:
                return dateObj.toISOString();
        }
    }
    formatWithTimezone(date, options) {
        const config = this.i18nService.getConfig();
        return date.toLocaleString(config.locale, {
            ...options,
            timeZone: config.timezone
        });
    }
    /**
     * Parse date string with flexible format support
     */
    parseDate(dateString, format) {
        if (!dateString || typeof dateString !== 'string') {
            if (this.logger) {
                this.logger.error('Failed to parse date:', dateString);
            }
            return null;
        }
        try {
            let parsedDate;
            if (format === 'DD/MM/YYYY') {
                const parts = dateString.split('/');
                if (parts.length === 3) {
                    const [day, month, year] = parts;
                    parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                }
                else {
                    throw new Error('Invalid DD/MM/YYYY format');
                }
            }
            else if (format === 'YYYY-MM-DD HH:mm:ss') {
                // Handle timezone context for non-UTC parsing
                const config = this.i18nService.getConfig();
                if (config.timezone !== 'UTC') {
                    // Parse as local time in the service timezone
                    const localDate = new Date(dateString + 'Z'); // Force UTC parsing
                    const timeZoneOffset = this.getTimezoneOffset(config.timezone);
                    // Convert local time to UTC by subtracting the timezone offset
                    parsedDate = new Date(localDate.getTime() - (timeZoneOffset * 60000));
                }
                else {
                    parsedDate = new Date(dateString);
                }
            }
            else {
                parsedDate = new Date(dateString);
            }
            if (isNaN(parsedDate.getTime())) {
                throw new Error('Invalid date');
            }
            return parsedDate;
        }
        catch (error) {
            if (this.logger) {
                this.logger.error('Failed to parse date:', dateString);
            }
            return null;
        }
    }
    getTimezoneOffset(timezone) {
        try {
            const now = new Date();
            const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
            const target = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
            return (target.getTime() - utc.getTime()) / (1000 * 60); // Return offset in minutes
        }
        catch (error) {
            if (this.logger) {
                this.logger.warn(`Failed to calculate timezone offset for ${timezone}, using 0`);
            }
            return 0;
        }
    }
    /**
     * Add days to a date
     */
    addDays(date, days) {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    }
    /**
     * Calculate days between two dates
     */
    getDaysBetween(startDate, endDate) {
        const diffTime = endDate.getTime() - startDate.getTime();
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
    /**
     * Check if date is a business day (Monday-Friday)
     */
    isBusinessDay(date) {
        // Adjust for timezone if not UTC
        const config = this.i18nService.getConfig();
        let dayOfWeek;
        if (config.timezone !== 'UTC') {
            // Get the day of week in the target timezone
            const dateInTimezone = new Date(date.toLocaleString('en-US', { timeZone: config.timezone }));
            dayOfWeek = dateInTimezone.getDay();
        }
        else {
            dayOfWeek = date.getUTCDay();
        }
        return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday = 1, Friday = 5
    }
    /**
     * Get next business day
     */
    getNextBusinessDay(date) {
        let nextDay = this.addDays(date, 1);
        while (!this.isBusinessDay(nextDay)) {
            nextDay = this.addDays(nextDay, 1);
        }
        return nextDay;
    }
    /**
     * Count business days between two dates (exclusive of end date)
     */
    getBusinessDaysBetween(startDate, endDate) {
        let count = 0;
        // Handle reverse order
        const isReverse = endDate.getTime() < startDate.getTime();
        const actualEndDate = isReverse ? startDate : endDate;
        const actualStartDate = isReverse ? endDate : startDate;
        let currentDate = new Date(actualStartDate);
        currentDate = this.addDays(currentDate, 1); // Start from next day (exclusive)
        while (currentDate.getTime() < actualEndDate.getTime()) {
            if (this.isBusinessDay(currentDate)) {
                count++;
            }
            currentDate = this.addDays(currentDate, 1);
        }
        return isReverse ? -count : count;
    }
    /**
     * Format relative time (e.g., "5 minutes ago", "in 2 hours")
     */
    formatRelativeTime(date) {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const isFuture = diffMs < 0;
        const prefix = isFuture ? 'in ' : '';
        const suffix = isFuture ? '' : ' ago';
        if (diffSeconds < 10) {
            return 'just now';
        }
        else if (diffSeconds < 60) {
            return `${prefix}${diffSeconds} seconds${suffix}`;
        }
        else if (diffMinutes < 60) {
            return `${prefix}${diffMinutes} minutes${suffix}`;
        }
        else if (diffHours < 24) {
            return `${prefix}${diffHours} hours${suffix}`;
        }
        else if (diffDays < 7) {
            return `${prefix}${diffDays} days${suffix}`;
        }
        else {
            return `${prefix}${diffWeeks} weeks${suffix}`;
        }
    }
    // ===== KOREAN LOCALIZATION METHODS (Legacy) =====
    /**
     * Get current date in localized format
     */
    getCurrentLocalizedDate() {
        const now = new Date();
        const config = this.i18nService.getConfig();
        return now.toLocaleString(config.locale, {
            timeZone: config.timezone,
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    /**
     * Get current date in Korean format - Legacy method for backward compatibility
     * @deprecated Use getCurrentLocalizedDate() instead
     */
    getCurrentKoreanDate() {
        const now = new Date();
        const config = this.i18nService.getConfig();
        // If current locale is Korean, use it; otherwise force Korean for backward compatibility
        const locale = config.locale.startsWith('ko') ? config.locale : 'ko-KR';
        const timezone = config.locale.startsWith('ko') ? config.timezone : 'Asia/Seoul';
        return now.toLocaleString(locale, {
            timeZone: timezone,
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    /**
     * Set localization configuration
     */
    setLocalizationConfig(config) {
        // Update I18nService configuration
        this.i18nService.updateConfig({
            locale: config.locale,
            timezone: config.timezone,
            dateFormat: config.dateFormat,
            timeFormat: config.timeFormat
        });
        // Update local configuration cache
        const i18nConfig = this.i18nService.getConfig();
        this.localizationConfig = {
            locale: i18nConfig.locale,
            timezone: i18nConfig.timezone,
            dateFormat: i18nConfig.dateFormat,
            timeFormat: i18nConfig.timeFormat
        };
        if (this.logger) {
            this.logger.info(`DateTimeService localization updated: locale=${this.localizationConfig.locale}, timezone=${this.localizationConfig.timezone}`);
        }
    }
    /**
     * Get current localization configuration
     */
    getLocalizationConfig() {
        return { ...this.localizationConfig };
    }
    /**
     * Get current year (for replacing hardcoded 2024)
     */
    getCurrentYear() {
        return new Date().getFullYear();
    }
    /**
     * Validate if a string is a valid datetime
     */
    isValidDateTime(dateString) {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }
    /**
     * Create ISO timestamp for specific date
     */
    createTimestamp(year, month, day, hour = 0, minute = 0) {
        const date = new Date(year, month - 1, day, hour, minute);
        return date.toISOString();
    }
    /**
     * Get relative time description (localized)
     */
    getRelativeTime(dateString) {
        const now = new Date();
        const target = new Date(dateString);
        const diffMs = now.getTime() - target.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const config = this.i18nService.getConfig();
        // Localized relative time based on language
        if (config.language === 'ko') {
            if (diffMinutes < 1)
                return '방금 전';
            if (diffMinutes < 60)
                return `${diffMinutes}분 전`;
            if (diffHours < 24)
                return `${diffHours}시간 전`;
            if (diffDays < 30)
                return `${diffDays}일 전`;
        }
        else {
            // English and other languages
            if (diffMinutes < 1)
                return 'just now';
            if (diffMinutes < 60)
                return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
            if (diffHours < 24)
                return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
            if (diffDays < 30)
                return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        }
        return this.formatDate(dateString, 'localized');
    }
    /**
     * Check if date is in current year (2025)
     */
    isCurrentYear(dateString) {
        const date = new Date(dateString);
        return date.getFullYear() === this.getCurrentYear();
    }
    /**
     * Get work day date (business hours consideration)
     */
    getWorkDay(daysOffset = 0) {
        const config = this.i18nService.getConfig();
        let date;
        if (config.timezone !== 'UTC') {
            // Get current date in the target timezone
            date = this.i18nService.getDateInTimezone(new Date(), config.timezone);
        }
        else {
            date = new Date();
        }
        date.setDate(date.getDate() + daysOffset);
        // Adjust for weekends (standard business week)
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0) { // Sunday
            date.setDate(date.getDate() + 1);
        }
        else if (dayOfWeek === 6) { // Saturday
            date.setDate(date.getDate() + 2);
        }
        return date.toISOString();
    }
    /**
     * Schedule next review date based on document type
     */
    getNextReviewDate(documentType) {
        const now = new Date();
        // Different review cycles for different document types
        const reviewDays = {
            master: 90, // Master docs reviewed quarterly
            api: 30, // API docs reviewed monthly
            database: 60, // Database docs reviewed bi-monthly
            component: 45, // Component docs reviewed every 1.5 months
            electron: 30, // Electron docs reviewed monthly
            testing: 21 // Test docs reviewed every 3 weeks
        };
        now.setDate(now.getDate() + reviewDays[documentType]);
        return now.toISOString();
    }
    /**
     * Create documentation header with current date (localized)
     */
    createDocumentHeader(title, author = 'CastPlan Team') {
        const currentDate = this.getCurrentLocalizedDate();
        const currentYear = this.getCurrentYear();
        const config = this.i18nService.getConfig();
        // Localized headers based on language
        if (config.language === 'ko') {
            return `# ${title}

**작성일**: ${currentDate}  
**작성자**: ${author}  
**년도**: ${currentYear}년  
**최종 업데이트**: ${this.formatDate(this.getCurrentTimestamp(), 'localized')}

---
`;
        }
        else {
            // English and other languages
            return `# ${title}

**Created**: ${currentDate}  
**Author**: ${author}  
**Year**: ${currentYear}  
**Last Updated**: ${this.formatDate(this.getCurrentTimestamp(), 'localized')}

---
`;
        }
    }
    /**
     * Parse various date formats and normalize to ISO
     */
    normalizeDate(dateInput) {
        const config = this.i18nService.getConfig();
        // Handle localized date formats based on language
        if (config.language === 'ko') {
            // Handle Korean date formats
            const koreanDatePattern = /(\d{4})년?\s*(\d{1,2})월?\s*(\d{1,2})일?/;
            const match = dateInput.match(koreanDatePattern);
            if (match) {
                const [, year, month, day] = match;
                return this.createTimestamp(parseInt(year), parseInt(month), parseInt(day));
            }
        }
        // Handle other localized date patterns could be added here
        // For now, fall back to standard parsing
        // Handle standard formats
        const date = new Date(dateInput);
        if (this.isValidDateTime(dateInput)) {
            return date.toISOString();
        }
        throw new Error(`Cannot parse date: ${dateInput}`);
    }
    /**
     * Get timezone information
     */
    getTimezoneInfo() {
        const now = new Date();
        const config = this.i18nService.getConfig();
        return {
            name: config.timezone,
            offset: now.toLocaleString(config.locale, { timeZoneName: 'short' }),
            current: this.getCurrentTimestamp()
        };
    }
}
// Export singleton instance with auto-detected localization
export const dateTimeService = new DateTimeService();
//# sourceMappingURL=DateTimeService.js.map