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
export declare function isError(error: unknown): error is Error;
/**
 * Type guard to check if a value has a message property
 */
export declare function hasMessage(error: unknown): error is {
    message: string;
};
/**
 * Safely extract error message from unknown error
 */
export declare function getErrorMessage(error: unknown): string;
/**
 * Safely extract error stack from unknown error
 */
export declare function getErrorStack(error: unknown): string | undefined;
/**
 * Convert unknown error to proper Error instance
 */
export declare function toError(error: unknown): Error;
/**
 * Create a standardized error response
 */
export interface StandardError {
    message: string;
    code?: string;
    stack?: string;
    timestamp: string;
}
/**
 * Convert unknown error to standardized error object
 */
export declare function toStandardError(error: unknown, code?: string): StandardError;
/**
 * Type-safe error logging utility
 */
export declare function logError(error: unknown, context?: string): void;
//# sourceMappingURL=errorUtils.d.ts.map