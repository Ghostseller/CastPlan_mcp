/**
 * Error Utilities
 *
 * Type-safe error handling utilities for proper TypeScript error management
 *
 * Created: 2025-08-01
 * Author: TypeScript Specialist
 */
/**
 * Type guard to check if a value is an Error instance
 */
export function isError(error) {
    return error instanceof Error;
}
/**
 * Type guard to check if a value has a message property
 */
export function hasMessage(error) {
    return typeof error === 'object' && error !== null && 'message' in error;
}
/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error) {
    if (isError(error)) {
        return error.message;
    }
    if (hasMessage(error)) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'Unknown error occurred';
}
/**
 * Safely extract error stack from unknown error
 */
export function getErrorStack(error) {
    if (isError(error)) {
        return error.stack;
    }
    return undefined;
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
 * Convert unknown error to standardized error object
 */
export function toStandardError(error, code) {
    const errorInstance = toError(error);
    return {
        message: errorInstance.message,
        code,
        stack: errorInstance.stack,
        timestamp: new Date().toISOString()
    };
}
/**
 * Type-safe error logging utility
 */
export function logError(error, context) {
    const errorMessage = getErrorMessage(error);
    const errorStack = getErrorStack(error);
    console.error(`${context ? `[${context}] ` : ''}${errorMessage}`);
    if (errorStack) {
        console.error(errorStack);
    }
}
//# sourceMappingURL=errorUtils.js.map