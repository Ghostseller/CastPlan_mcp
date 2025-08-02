/**
 * Type Helper Utilities
 *
 * Common utility functions for type safety and error handling
 * Created to resolve TypeScript type errors across the codebase
 */
/**
 * Safely extracts error message from unknown error type
 */
export declare function getErrorMessage(error: unknown): string;
/**
 * Type guard to check if a value is defined (not null or undefined)
 */
export declare function isDefined<T>(value: T | undefined | null): value is T;
/**
 * Returns the value if defined, otherwise returns the default value
 */
export declare function withDefault<T>(value: T | undefined | null, defaultValue: T): T;
/**
 * Type guard to check if a value is an Error instance
 */
export declare function isError(error: unknown): error is Error;
/**
 * Convert unknown error to proper Error instance
 */
export declare function toError(error: unknown): Error;
/**
 * Safely access a property on an object that might be undefined
 */
export declare function safeAccess<T, K extends keyof T>(obj: T | undefined | null, key: K): T[K] | undefined;
/**
 * Assert that a value is defined, throwing an error if not
 */
export declare function assertDefined<T>(value: T | undefined | null, message: string): asserts value is T;
/**
 * Safely parse JSON with a fallback value
 */
export declare function safeJsonParse<T>(json: string, fallback: T): T;
/**
 * Type guard for checking if a value is a non-empty string
 */
export declare function isNonEmptyString(value: unknown): value is string;
/**
 * Type guard for checking if a value is a valid number
 */
export declare function isValidNumber(value: unknown): value is number;
/**
 * Safely convert a value to string
 */
export declare function toString(value: unknown): string;
/**
 * Create a type-safe error handler wrapper
 */
export declare function createErrorHandler<T>(operation: () => T, fallback: T, logger?: (error: string) => void): T;
/**
 * Async version of createErrorHandler
 */
export declare function createAsyncErrorHandler<T>(operation: () => Promise<T>, fallback: T, logger?: (error: string) => void): Promise<T>;
/**
 * Type-safe object key check
 */
export declare function hasProperty<T extends object, K extends PropertyKey>(obj: T, key: K): obj is T & Record<K, unknown>;
/**
 * Safe array access with bounds checking
 */
export declare function safeArrayAccess<T>(array: T[] | undefined | null, index: number, defaultValue: T): T;
/**
 * Type guard for checking if value is an array
 */
export declare function isArray<T>(value: unknown): value is T[];
/**
 * Deep clone an object safely
 */
export declare function deepClone<T>(obj: T): T;
//# sourceMappingURL=typeHelpers.d.ts.map