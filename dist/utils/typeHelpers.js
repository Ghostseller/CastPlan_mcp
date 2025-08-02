/**
 * Type Helper Utilities
 *
 * Common utility functions for type safety and error handling
 * Created to resolve TypeScript type errors across the codebase
 */
/**
 * Safely extracts error message from unknown error type
 */
export function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String(error.message);
    }
    return 'An unknown error occurred';
}
/**
 * Type guard to check if a value is defined (not null or undefined)
 */
export function isDefined(value) {
    return value !== undefined && value !== null;
}
/**
 * Returns the value if defined, otherwise returns the default value
 */
export function withDefault(value, defaultValue) {
    return isDefined(value) ? value : defaultValue;
}
/**
 * Type guard to check if a value is an Error instance
 */
export function isError(error) {
    return error instanceof Error;
}
/**
 * Convert unknown error to proper Error instance
 */
export function toError(error) {
    if (isError(error)) {
        return error;
    }
    return new Error(getErrorMessage(error));
}
/**
 * Safely access a property on an object that might be undefined
 */
export function safeAccess(obj, key) {
    return obj?.[key];
}
/**
 * Assert that a value is defined, throwing an error if not
 */
export function assertDefined(value, message) {
    if (value === undefined || value === null) {
        throw new Error(message);
    }
}
/**
 * Safely parse JSON with a fallback value
 */
export function safeJsonParse(json, fallback) {
    try {
        return JSON.parse(json);
    }
    catch {
        return fallback;
    }
}
/**
 * Type guard for checking if a value is a non-empty string
 */
export function isNonEmptyString(value) {
    return typeof value === 'string' && value.length > 0;
}
/**
 * Type guard for checking if a value is a valid number
 */
export function isValidNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}
/**
 * Safely convert a value to string
 */
export function toString(value) {
    if (typeof value === 'string') {
        return value;
    }
    if (value === null || value === undefined) {
        return '';
    }
    return String(value);
}
/**
 * Create a type-safe error handler wrapper
 */
export function createErrorHandler(operation, fallback, logger) {
    try {
        return operation();
    }
    catch (error) {
        const message = getErrorMessage(error);
        logger?.(message);
        return fallback;
    }
}
/**
 * Async version of createErrorHandler
 */
export async function createAsyncErrorHandler(operation, fallback, logger) {
    try {
        return await operation();
    }
    catch (error) {
        const message = getErrorMessage(error);
        logger?.(message);
        return fallback;
    }
}
/**
 * Type-safe object key check
 */
export function hasProperty(obj, key) {
    return key in obj;
}
/**
 * Safe array access with bounds checking
 */
export function safeArrayAccess(array, index, defaultValue) {
    if (!array || index < 0 || index >= array.length) {
        return defaultValue;
    }
    return array[index];
}
/**
 * Type guard for checking if value is an array
 */
export function isArray(value) {
    return Array.isArray(value);
}
/**
 * Deep clone an object safely
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }
    if (obj instanceof Object) {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
    return obj;
}
//# sourceMappingURL=typeHelpers.js.map