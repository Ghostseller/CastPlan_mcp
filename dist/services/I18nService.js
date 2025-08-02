/**
 * Internationalization Service
 * Provides centralized locale and timezone handling for CastPlan MCP
 */
export class I18nService {
    config;
    translations;
    constructor(localizationConfig) {
        this.config = this.initializeConfig(localizationConfig);
        this.translations = this.loadTranslations();
    }
    /**
     * Initialize i18n configuration with auto-detection fallbacks
     */
    initializeConfig(localizationConfig) {
        // Auto-detect system locale and timezone
        const systemLocale = this.detectSystemLocale();
        const systemTimezone = this.detectSystemTimezone();
        const language = systemLocale.split('-')[0];
        return {
            locale: localizationConfig?.locale || systemLocale,
            timezone: localizationConfig?.timezone || systemTimezone,
            dateFormat: localizationConfig?.dateFormat || this.getDefaultDateFormat(language),
            timeFormat: localizationConfig?.timeFormat || this.getDefaultTimeFormat(language),
            language
        };
    }
    /**
     * Detect system locale with fallback to English
     */
    detectSystemLocale() {
        try {
            // Node.js environment
            if (typeof process !== 'undefined' && process.env) {
                const locale = process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG;
                if (locale) {
                    // Extract locale from environment variable (e.g., "en_US.UTF-8" -> "en-US")
                    const normalized = locale.split('.')[0].replace('_', '-');
                    return normalized;
                }
            }
            // Browser environment
            try {
                if (typeof globalThis !== 'undefined' &&
                    'navigator' in globalThis &&
                    globalThis.navigator) {
                    const nav = globalThis.navigator;
                    return nav.language || nav.languages?.[0] || 'en-US';
                }
            }
            catch (error) {
                // Ignore browser detection errors
            }
            // Use Intl API as fallback
            if (typeof Intl !== 'undefined') {
                return new Intl.DateTimeFormat().resolvedOptions().locale;
            }
        }
        catch (error) {
            console.warn('Failed to detect system locale:', error);
        }
        return 'en-US'; // Default fallback
    }
    /**
     * Detect system timezone with fallback to UTC
     */
    detectSystemTimezone() {
        try {
            // Use Intl API for timezone detection
            if (typeof Intl !== 'undefined') {
                return Intl.DateTimeFormat().resolvedOptions().timeZone;
            }
            // Fallback to timezone offset calculation
            const offset = new Date().getTimezoneOffset();
            const hours = Math.abs(Math.floor(offset / 60));
            const minutes = Math.abs(offset % 60);
            const sign = offset <= 0 ? '+' : '-';
            return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        }
        catch (error) {
            console.warn('Failed to detect system timezone:', error);
        }
        return 'UTC'; // Default fallback
    }
    /**
     * Get default date format for language
     */
    getDefaultDateFormat(language) {
        const formats = {
            'ko': 'YYYY-MM-DD',
            'en': 'MM/DD/YYYY',
            'de': 'DD.MM.YYYY',
            'fr': 'DD/MM/YYYY',
            'ja': 'YYYY/MM/DD',
            'zh': 'YYYY-MM-DD',
            'es': 'DD/MM/YYYY',
            'pt': 'DD/MM/YYYY',
            'it': 'DD/MM/YYYY',
            'ru': 'DD.MM.YYYY'
        };
        return formats[language] || 'YYYY-MM-DD';
    }
    /**
     * Get default time format for language
     */
    getDefaultTimeFormat(language) {
        const formats = {
            'ko': 'HH:mm',
            'en': 'h:mm A',
            'de': 'HH:mm',
            'fr': 'HH:mm',
            'ja': 'HH:mm',
            'zh': 'HH:mm',
            'es': 'HH:mm',
            'pt': 'HH:mm',
            'it': 'HH:mm',
            'ru': 'HH:mm'
        };
        return formats[language] || 'HH:mm';
    }
    /**
     * Load translation strings
     */
    loadTranslations() {
        return {
            // Document templates
            'template.businessPlan.title': {
                'ko': '사업 계획서',
                'en': 'Business Plan',
                'es': 'Plan de Negocio',
                'fr': 'Plan d\'Affaires',
                'de': 'Geschäftsplan',
                'ja': '事業計画書',
                'zh': '商业计划书'
            },
            'template.businessPlan.overview': {
                'ko': '개요',
                'en': 'Overview',
                'es': 'Resumen',
                'fr': 'Aperçu',
                'de': 'Überblick',
                'ja': '概要',
                'zh': '概述'
            },
            'template.businessPlan.marketAnalysis': {
                'ko': '시장 분석',
                'en': 'Market Analysis',
                'es': 'Análisis de Mercado',
                'fr': 'Analyse de Marché',
                'de': 'Marktanalyse',
                'ja': '市場分析',
                'zh': '市场分析'
            },
            'template.businessPlan.financialProjections': {
                'ko': '재정 전망',
                'en': 'Financial Projections',
                'es': 'Proyecciones Financieras',
                'fr': 'Projections Financières',
                'de': 'Finanzprognosen',
                'ja': '財務予測',
                'zh': '财务预测'
            },
            'template.businessPlan.conclusion': {
                'ko': '결론',
                'en': 'Conclusion',
                'es': 'Conclusión',
                'fr': 'Conclusion',
                'de': 'Fazit',
                'ja': '結論',
                'zh': '结论'
            },
            'template.placeholder.businessOverview': {
                'ko': '[비즈니스 개요를 여기에 작성하세요]',
                'en': '[Write business overview here]',
                'es': '[Escribe la descripción del negocio aquí]',
                'fr': '[Rédigez ici l\'aperçu de l\'entreprise]',
                'de': '[Geschäftsüberblick hier schreiben]',
                'ja': '[ビジネス概要をここに記入してください]',
                'zh': '[在此处编写业务概述]'
            },
            'template.placeholder.marketAnalysis': {
                'ko': '[시장 분석 내용을 여기에 작성하세요]',
                'en': '[Write market analysis content here]',
                'es': '[Escribe el contenido del análisis de mercado aquí]',
                'fr': '[Rédigez ici le contenu de l\'analyse de marché]',
                'de': '[Marktanalyse-Inhalt hier schreiben]',
                'ja': '[市場分析の内容をここに記入してください]',
                'zh': '[在此处编写市场分析内容]'
            },
            'template.placeholder.financialProjections': {
                'ko': '[재정 계획 및 전망을 여기에 작성하세요]',
                'en': '[Write financial plans and projections here]',
                'es': '[Escribe los planes financieros y proyecciones aquí]',
                'fr': '[Rédigez ici les plans financiers et les projections]',
                'de': '[Finanzpläne und Prognosen hier schreiben]',
                'ja': '[財務計画と予測をここに記入してください]',
                'zh': '[在此处编写财务计划和预测]'
            },
            'template.placeholder.conclusion': {
                'ko': '[결론 및 다음 단계를 여기에 작성하세요]',
                'en': '[Write conclusion and next steps here]',
                'es': '[Escribe la conclusión y próximos pasos aquí]',
                'fr': '[Rédigez ici la conclusion et les prochaines étapes]',
                'de': '[Fazit und nächste Schritte hier schreiben]',
                'ja': '[結論と次のステップをここに記入してください]',
                'zh': '[在此处编写结论和下一步]'
            },
            'template.placeholder.projectOverview': {
                'ko': '[프로젝트 개요를 여기에 작성하세요]',
                'en': '[Write project overview here]',
                'es': '[Escribe la descripción del proyecto aquí]',
                'fr': '[Rédigez ici l\'aperçu du projet]',
                'de': '[Projektüberblick hier schreiben]',
                'ja': '[プロジェクト概要をここに記入してください]',
                'zh': '[在此处编写项目概述]'
            },
            // Date/time related
            'dateTime.today': {
                'ko': '오늘',
                'en': 'Today',
                'es': 'Hoy',
                'fr': 'Aujourd\'hui',
                'de': 'Heute',
                'ja': '今日',
                'zh': '今天'
            },
            'dateTime.currentTime': {
                'ko': '현재 시간',
                'en': 'Current Time',
                'es': 'Hora Actual',
                'fr': 'Heure Actuelle',
                'de': 'Aktuelle Zeit',
                'ja': '現在時刻',
                'zh': '当前时间'
            },
            // Documentation related
            'docs.lastUpdated': {
                'ko': '최종 업데이트',
                'en': 'Last Updated',
                'es': 'Última Actualización',
                'fr': 'Dernière Mise à Jour',
                'de': 'Zuletzt Aktualisiert',
                'ja': '最終更新',
                'zh': '最后更新'
            },
            'docs.changeHistory': {
                'ko': '변경 이력',
                'en': 'Change History',
                'es': 'Historial de Cambios',
                'fr': 'Historique des Modifications',
                'de': 'Änderungshistorie',
                'ja': '変更履歴',
                'zh': '更改历史'
            },
            'docs.recentMajorUpdates': {
                'ko': '주요 최신 업데이트',
                'en': 'Recent Major Updates',
                'es': 'Actualizaciones Principales Recientes',
                'fr': 'Mises à Jour Majeures Récentes',
                'de': 'Aktuelle Wichtige Updates',
                'ja': '最近の主要アップデート',
                'zh': '最近的主要更新'
            },
            'docs.changeHistoryTitle': {
                'ko': 'CastPlan 문서 변경 이력',
                'en': 'CastPlan Documentation Change History',
                'es': 'Historial de Cambios de Documentación CastPlan',
                'fr': 'Historique des Modifications de Documentation CastPlan',
                'de': 'CastPlan Dokumentationsänderungshistorie',
                'ja': 'CastPlan ドキュメント変更履歴',
                'zh': 'CastPlan 文档更改历史'
            },
            'docs.changeHistoryDescription': {
                'ko': '이 파일은 프로젝트 개발 과정에서 발생한 문서 변경 사항을 자동으로 기록합니다.',
                'en': 'This file automatically records documentation changes that occur during project development.',
                'es': 'Este archivo registra automáticamente los cambios de documentación que ocurren durante el desarrollo del proyecto.',
                'fr': 'Ce fichier enregistre automatiquement les modifications de documentation qui se produisent pendant le développement du projet.',
                'de': 'Diese Datei zeichnet automatisch Dokumentationsänderungen auf, die während der Projektentwicklung auftreten.',
                'ja': 'このファイルは、プロジェクト開発中に発生したドキュメントの変更を自動的に記録します。',
                'zh': '此文件自动记录项目开发过程中发生的文档更改。'
            },
            'docs.filesModified': {
                'ko': '수정된 파일',
                'en': 'Files Modified',
                'es': 'Archivos Modificados',
                'fr': 'Fichiers Modifiés',
                'de': 'Geänderte Dateien',
                'ja': '変更されたファイル',
                'zh': '修改的文件'
            },
            'docs.category': {
                'ko': '카테고리',
                'en': 'Category',
                'es': 'Categoría',
                'fr': 'Catégorie',
                'de': 'Kategorie',
                'ja': 'カテゴリ',
                'zh': '类别'
            },
            'docs.changes': {
                'ko': '변경 사항',
                'en': 'Changes',
                'es': 'Cambios',
                'fr': 'Modifications',
                'de': 'Änderungen',
                'ja': '変更',
                'zh': '更改'
            },
            'docs.timestamp': {
                'ko': '타임스탬프',
                'en': 'Timestamp',
                'es': 'Marca de Tiempo',
                'fr': 'Horodatage',
                'de': 'Zeitstempel',
                'ja': 'タイムスタンプ',
                'zh': '时间戳'
            }
        };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration
     */
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        // Update language if locale changed
        if (updates.locale) {
            this.config.language = updates.locale.split('-')[0];
        }
    }
    /**
     * Get translated string
     */
    translate(key, fallback) {
        const translation = this.translations[key];
        if (!translation) {
            return fallback || key;
        }
        return translation[this.config.locale] ||
            translation[this.config.language] ||
            translation['en'] ||
            fallback ||
            key;
    }
    /**
     * Format date according to current locale
     */
    formatDate(date) {
        try {
            return new Intl.DateTimeFormat(this.config.locale, {
                timeZone: this.config.timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).format(date);
        }
        catch (error) {
            console.warn('Date formatting failed, using fallback:', error);
            return date.toISOString().split('T')[0];
        }
    }
    /**
     * Format time according to current locale
     */
    formatTime(date) {
        try {
            const is24Hour = !this.config.timeFormat.includes('A');
            return new Intl.DateTimeFormat(this.config.locale, {
                timeZone: this.config.timezone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: !is24Hour
            }).format(date);
        }
        catch (error) {
            console.warn('Time formatting failed, using fallback:', error);
            return date.toTimeString().split(' ')[0].substring(0, 5);
        }
    }
    /**
     * Format date and time according to current locale
     */
    formatDateTime(date) {
        try {
            const is24Hour = !this.config.timeFormat.includes('A');
            return new Intl.DateTimeFormat(this.config.locale, {
                timeZone: this.config.timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: !is24Hour
            }).format(date);
        }
        catch (error) {
            console.warn('DateTime formatting failed, using fallback:', error);
            return `${this.formatDate(date)} ${this.formatTime(date)}`;
        }
    }
    /**
     * Get current date in user's timezone
     */
    getCurrentDate() {
        return new Date();
    }
    /**
     * Get formatted current date string
     */
    getCurrentDateString() {
        return this.formatDate(this.getCurrentDate());
    }
    /**
     * Get formatted current time string
     */
    getCurrentTimeString() {
        return this.formatTime(this.getCurrentDate());
    }
    /**
     * Get formatted current date and time string
     */
    getCurrentDateTimeString() {
        return this.formatDateTime(this.getCurrentDate());
    }
    /**
     * Check if current locale is Korean (for backward compatibility)
     */
    isKoreanLocale() {
        return this.config.language === 'ko';
    }
    /**
     * Get date in timezone-aware format
     */
    getDateInTimezone(date, timezone) {
        const targetTimezone = timezone || this.config.timezone;
        try {
            // Create a new date adjusted for the target timezone
            const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
            const targetTime = new Date(utc + this.getTimezoneOffset(targetTimezone));
            return targetTime;
        }
        catch (error) {
            console.warn('Timezone conversion failed, using original date:', error);
            return date;
        }
    }
    /**
     * Get timezone offset in milliseconds
     */
    getTimezoneOffset(timezone) {
        try {
            const now = new Date();
            const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
            const target = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
            return target.getTime() - utc.getTime();
        }
        catch (error) {
            console.warn('Failed to get timezone offset:', error);
            return 0;
        }
    }
    /**
     * Create a new I18nService instance with different configuration
     */
    withConfig(config) {
        return new I18nService({
            locale: config.locale || this.config.locale,
            timezone: config.timezone || this.config.timezone,
            dateFormat: config.dateFormat || this.config.dateFormat,
            timeFormat: config.timeFormat || this.config.timeFormat
        });
    }
}
// Export singleton instance for default usage
export const i18nService = new I18nService();
//# sourceMappingURL=I18nService.js.map