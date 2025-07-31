/**
 * Internationalization Test Utilities
 * 
 * Provides utilities for testing internationalization features with configurable
 * locales and timezones to ensure tests work in any environment.
 */

export interface I18nTestConfig {
  locale: string;
  timezone: string;
  dateFormat?: string;
  currency?: string;
  rtl?: boolean;
}

export interface LocaleTestCase {
  name: string;
  config: I18nTestConfig;
  expectedFormats: {
    date?: string;
    time?: string;
    currency?: string;
    number?: string;
  };
}

/**
 * Common locale configurations for testing
 */
export const TEST_LOCALES: Record<string, I18nTestConfig> = {
  // English locales
  'en-US': {
    locale: 'en-US',
    timezone: 'America/New_York',
    dateFormat: 'MM/dd/yyyy',
    currency: 'USD'
  },
  'en-GB': {
    locale: 'en-GB',
    timezone: 'Europe/London',
    dateFormat: 'dd/MM/yyyy',
    currency: 'GBP'
  },
  
  // Asian locales
  'ko-KR': {
    locale: 'ko-KR',
    timezone: 'Asia/Seoul',
    dateFormat: 'yyyy-MM-dd',
    currency: 'KRW'
  },
  'ja-JP': {
    locale: 'ja-JP',
    timezone: 'Asia/Tokyo',
    dateFormat: 'yyyy/MM/dd',
    currency: 'JPY'
  },
  'zh-CN': {
    locale: 'zh-CN',
    timezone: 'Asia/Shanghai',
    dateFormat: 'yyyy-MM-dd',
    currency: 'CNY'
  },
  
  // European locales
  'de-DE': {
    locale: 'de-DE',
    timezone: 'Europe/Berlin',
    dateFormat: 'dd.MM.yyyy',
    currency: 'EUR'
  },
  'fr-FR': {
    locale: 'fr-FR',
    timezone: 'Europe/Paris',
    dateFormat: 'dd/MM/yyyy',
    currency: 'EUR'
  },
  'es-ES': {
    locale: 'es-ES',
    timezone: 'Europe/Madrid',
    dateFormat: 'dd/MM/yyyy',
    currency: 'EUR'
  },
  
  // RTL locales
  'ar-SA': {
    locale: 'ar-SA',
    timezone: 'Asia/Riyadh',
    dateFormat: 'dd/MM/yyyy',
    currency: 'SAR',
    rtl: true
  },
  'he-IL': {
    locale: 'he-IL',
    timezone: 'Asia/Jerusalem',
    dateFormat: 'dd/MM/yyyy',
    currency: 'ILS',
    rtl: true
  },
  
  // Default/Universal
  'UTC': {
    locale: 'en-US',
    timezone: 'UTC',
    dateFormat: 'yyyy-MM-dd',
    currency: 'USD'
  }
};

/**
 * Common timezone test cases
 */
export const TEST_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Seoul',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney'
];

/**
 * I18n Test Environment Manager
 */
export class I18nTestEnvironment {
  private originalLocale: string;
  private originalTimezone: string;
  private originalIntlLocale: string;

  constructor() {
    // Store original environment settings
    this.originalLocale = process.env.LANG || 'en-US';
    this.originalTimezone = process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.originalIntlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
  }

  /**
   * Set test environment to specific locale configuration
   */
  setTestEnvironment(config: I18nTestConfig): void {
    process.env.LANG = config.locale;
    process.env.TZ = config.timezone;
    
    // Mock Intl.DateTimeFormat for consistent testing
    const originalDateTimeFormat = Intl.DateTimeFormat;
    jest.spyOn(Intl, 'DateTimeFormat').mockImplementation((locales?: any, options?: any) => {
      return new originalDateTimeFormat(config.locale, {
        ...options,
        timeZone: config.timezone
      });
    });
  }

  /**
   * Restore original environment settings
   */
  restoreEnvironment(): void {
    process.env.LANG = this.originalLocale;
    process.env.TZ = this.originalTimezone;
    
    // Restore Intl mocks
    if (jest.isMockFunction(Intl.DateTimeFormat)) {
      (Intl.DateTimeFormat as jest.MockedFunction<any>).mockRestore();
    }
  }

  /**
   * Get current system locale for fallback testing
   */
  getSystemLocale(): I18nTestConfig {
    return {
      locale: this.originalIntlLocale,
      timezone: this.originalTimezone
    };
  }
}

/**
 * Locale-aware test utilities
 */
export class LocaleTestUtils {
  /**
   * Format date according to locale configuration
   */
  static formatDate(date: Date | string, config: I18nTestConfig): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat(config.locale, {
      timeZone: config.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(dateObj);
  }

  /**
   * Format time according to locale configuration
   */
  static formatTime(date: Date | string, config: I18nTestConfig): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat(config.locale, {
      timeZone: config.timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(dateObj);
  }

  /**
   * Format currency according to locale configuration
   */
  static formatCurrency(amount: number, config: I18nTestConfig): string {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency || 'USD'
    }).format(amount);
  }

  /**
   * Get timezone offset for specific timezone
   */
  static getTimezoneOffset(timezone: string, date?: Date): number {
    const testDate = date || new Date();
    
    // Create two dates: one in UTC, one in the target timezone
    const utcDate = new Date(testDate.toLocaleString('en-US', { timeZone: 'UTC' }));
    const timezoneDate = new Date(testDate.toLocaleString('en-US', { timeZone: timezone }));
    
    return (utcDate.getTime() - timezoneDate.getTime()) / (1000 * 60); // Return offset in minutes
  }

  /**
   * Check if date/time is valid in timezone context
   */
  static isValidInTimezone(date: Date, timezone: string): boolean {
    try {
      const formatted = date.toLocaleString('en-US', { timeZone: timezone });
      return !isNaN(Date.parse(formatted));
    } catch {
      return false;
    }
  }

  /**
   * Convert date between timezones
   */
  static convertTimezone(date: Date, fromTimezone: string, toTimezone: string): Date {
    // Get the time in the source timezone
    const sourceTime = new Date(date.toLocaleString('en-US', { timeZone: fromTimezone }));
    
    // Calculate the offset difference
    const sourceOffset = this.getTimezoneOffset(fromTimezone, date);
    const targetOffset = this.getTimezoneOffset(toTimezone, date);
    const offsetDiff = targetOffset - sourceOffset;
    
    // Apply the offset difference
    return new Date(sourceTime.getTime() + (offsetDiff * 60 * 1000));
  }
}

/**
 * Test case generator for parameterized locale testing
 */
export class LocaleTestCaseGenerator {
  /**
   * Generate test cases for multiple locales
   */
  static generateLocaleTestCases(
    baseTestCase: Omit<LocaleTestCase, 'name' | 'config'>,
    locales: string[] = ['en-US', 'ko-KR', 'de-DE', 'ja-JP']
  ): LocaleTestCase[] {
    return locales.map(localeKey => ({
      ...baseTestCase,
      name: `${baseTestCase.name || 'test'} (${localeKey})`,
      config: TEST_LOCALES[localeKey] || TEST_LOCALES['UTC']
    }));
  }

  /**
   * Generate timezone-specific test cases
   */
  static generateTimezoneTestCases(
    baseTestCase: Omit<LocaleTestCase, 'name' | 'config'>,
    timezones: string[] = ['UTC', 'America/New_York', 'Asia/Seoul', 'Europe/London']
  ): LocaleTestCase[] {
    return timezones.map(timezone => ({
      ...baseTestCase,
      name: `${baseTestCase.name || 'test'} (${timezone})`,
      config: {
        locale: 'en-US',
        timezone,
        dateFormat: 'yyyy-MM-dd'
      }
    }));
  }

  /**
   * Generate comprehensive test cases (locales + timezones)
   */
  static generateComprehensiveTestCases(
    baseTestCase: Omit<LocaleTestCase, 'name' | 'config'>,
    options: {
      locales?: string[];
      timezones?: string[];
      combinations?: 'minimal' | 'standard' | 'comprehensive';
    } = {}
  ): LocaleTestCase[] {
    const { combinations = 'standard' } = options;
    
    let locales: string[];
    let timezones: string[];
    
    switch (combinations) {
      case 'minimal':
        locales = ['en-US', 'ko-KR'];
        timezones = ['UTC', 'Asia/Seoul'];
        break;
      case 'comprehensive':
        locales = Object.keys(TEST_LOCALES);
        timezones = TEST_TIMEZONES;
        break;
      default: // standard
        locales = ['en-US', 'ko-KR', 'de-DE', 'ja-JP'];
        timezones = ['UTC', 'America/New_York', 'Asia/Seoul', 'Europe/Berlin'];
    }
    
    // Override with provided options
    if (options.locales) locales = options.locales;
    if (options.timezones) timezones = options.timezones;
    
    const testCases: LocaleTestCase[] = [];
    
    for (const localeKey of locales) {
      for (const timezone of timezones) {
        const baseConfig = TEST_LOCALES[localeKey] || TEST_LOCALES['UTC'];
        testCases.push({
          ...baseTestCase,
          name: `${baseTestCase.name || 'test'} (${localeKey}/${timezone})`,
          config: {
            ...baseConfig,
            timezone // Override timezone for cross-combinations
          }
        });
      }
    }
    
    return testCases;
  }
}

/**
 * Mock I18n Service for testing
 */
export interface MockI18nService {
  getCurrentLocale(): string;
  getCurrentTimezone(): string;
  setLocale(locale: string): void;
  setTimezone(timezone: string): void;
  formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string;
  formatTime(date: Date | string, options?: Intl.DateTimeFormatOptions): string;
  formatCurrency(amount: number, currency?: string): string;
  translate(key: string, params?: Record<string, any>): string;
  detectSystemLocale(): I18nTestConfig;
  isRTL(): boolean;
}

export class MockI18nServiceFactory {
  static create(initialConfig: I18nTestConfig = TEST_LOCALES['en-US']): jest.Mocked<MockI18nService> {
    let currentConfig = { ...initialConfig };
    
    return {
      getCurrentLocale: jest.fn().mockImplementation(() => currentConfig.locale),
      getCurrentTimezone: jest.fn().mockImplementation(() => currentConfig.timezone),
      
      setLocale: jest.fn().mockImplementation((locale: string) => {
        currentConfig.locale = locale;
        // Update related config if we have predefined locale
        const predefinedConfig = TEST_LOCALES[locale];
        if (predefinedConfig) {
          currentConfig = { ...currentConfig, ...predefinedConfig };
        }
      }),
      
      setTimezone: jest.fn().mockImplementation((timezone: string) => {
        currentConfig.timezone = timezone;
      }),
      
      formatDate: jest.fn().mockImplementation((date: Date | string, options?: Intl.DateTimeFormatOptions) => {
        return LocaleTestUtils.formatDate(date, currentConfig);
      }),
      
      formatTime: jest.fn().mockImplementation((date: Date | string, options?: Intl.DateTimeFormatOptions) => {
        return LocaleTestUtils.formatTime(date, currentConfig);
      }),
      
      formatCurrency: jest.fn().mockImplementation((amount: number, currency?: string) => {
        const configWithCurrency = { ...currentConfig, currency: currency || currentConfig.currency };
        return LocaleTestUtils.formatCurrency(amount, configWithCurrency);
      }),
      
      translate: jest.fn().mockImplementation((key: string, params?: Record<string, any>) => {
        // Simple mock translation - in real implementation would use translation dictionaries
        const translations: Record<string, Record<string, string>> = {
          'en-US': {
            'hello': 'Hello',
            'goodbye': 'Goodbye',
            'error': 'Error occurred'
          },
          'ko-KR': {
            'hello': '안녕하세요',
            'goodbye': '안녕히 가세요',
            'error': '오류가 발생했습니다'
          },
          'de-DE': {
            'hello': 'Hallo',
            'goodbye': 'Auf Wiedersehen',
            'error': 'Fehler aufgetreten'
          }
        };
        
        const localeTranslations = translations[currentConfig.locale] || translations['en-US'];
        let translation = localeTranslations[key] || key;
        
        // Simple parameter substitution
        if (params) {
          Object.entries(params).forEach(([paramKey, value]) => {
            translation = translation.replace(`{${paramKey}}`, String(value));
          });
        }
        
        return translation;
      }),
      
      detectSystemLocale: jest.fn().mockImplementation(() => {
        return TEST_LOCALES[Intl.DateTimeFormat().resolvedOptions().locale] || TEST_LOCALES['en-US'];
      }),
      
      isRTL: jest.fn().mockImplementation(() => {
        return currentConfig.rtl || false;
      })
    } as jest.Mocked<MockI18nService>;
  }
}

/**
 * Test assertion helpers for internationalization
 */
export class I18nTestAssertions {
  /**
   * Assert that a date string is valid in the given timezone
   */
  static assertValidDateInTimezone(dateString: string, timezone: string): void {
    const date = new Date(dateString);
    expect(date).toBeInstanceOf(Date);
    expect(date.getTime()).not.toBeNaN();
    expect(LocaleTestUtils.isValidInTimezone(date, timezone)).toBe(true);
  }

  /**
   * Assert that formatted date matches locale expectations
   */
  static assertDateFormatMatchesLocale(
    formattedDate: string, 
    config: I18nTestConfig,
    originalDate?: Date | string
  ): void {
    expect(formattedDate).toBeTruthy();
    expect(typeof formattedDate).toBe('string');
    
    // Basic format validation based on common patterns
    const formatPatterns: Record<string, RegExp> = {
      'MM/dd/yyyy': /^\d{2}\/\d{2}\/\d{4}$/,
      'dd/MM/yyyy': /^\d{2}\/\d{2}\/\d{4}$/,
      'yyyy-MM-dd': /^\d{4}-\d{2}-\d{2}$/,
      'dd.MM.yyyy': /^\d{2}\.\d{2}\.\d{4}$/,
      'yyyy/MM/dd': /^\d{4}\/\d{2}\/\d{2}$/
    };
    
    if (config.dateFormat && formatPatterns[config.dateFormat]) {
      expect(formattedDate).toMatch(formatPatterns[config.dateFormat]);
    }
  }

  /**
   * Assert that time format matches locale expectations
   */
  static assertTimeFormatMatchesLocale(
    formattedTime: string,
    config: I18nTestConfig,
    expectedFormat: '12h' | '24h' = '24h'
  ): void {
    expect(formattedTime).toBeTruthy();
    expect(typeof formattedTime).toBe('string');
    
    if (expectedFormat === '24h') {
      // Expect 24-hour format (00:00:00 to 23:59:59)
      expect(formattedTime).toMatch(/^([01]?\d|2[0-3]):[0-5]\d:[0-5]\d$/);
    } else {
      // Expect 12-hour format with AM/PM
      expect(formattedTime).toMatch(/^(1[0-2]|0?[1-9]):[0-5]\d:[0-5]\d\s?(AM|PM)$/i);
    }
  }

  /**
   * Assert currency format matches locale expectations
   */
  static assertCurrencyFormatMatchesLocale(
    formattedCurrency: string,
    config: I18nTestConfig,
    amount: number
  ): void {
    expect(formattedCurrency).toBeTruthy();
    expect(typeof formattedCurrency).toBe('string');
    
    // Should contain currency code or symbol
    if (config.currency) {
      const currencySymbols: Record<string, string> = {
        'USD': ['$', 'US$'],
        'EUR': ['€', 'EUR'],
        'GBP': ['£', 'GBP'],
        'JPY': ['¥', 'JPY'],
        'KRW': ['₩', 'KRW'],
        'CNY': ['¥', 'CNY'],
        'SAR': ['SR', 'SAR'],
        'ILS': ['₪', 'ILS']
      };
      
      const symbols = currencySymbols[config.currency];
      if (symbols) {
        const hasSymbol = symbols.some(symbol => formattedCurrency.includes(symbol));
        expect(hasSymbol).toBe(true);
      }
    }
    
    // Should contain the amount in some form
    expect(formattedCurrency).toContain(Math.abs(amount).toString().charAt(0));
  }
}

/**
 * Default export with all utilities
 */
export const I18nTestUtils = {
  TEST_LOCALES,
  TEST_TIMEZONES,
  I18nTestEnvironment,
  LocaleTestUtils,
  LocaleTestCaseGenerator,
  MockI18nServiceFactory,
  I18nTestAssertions
};

export default I18nTestUtils;