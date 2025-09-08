/**
 * Base interfaces and implementations for error detectors
 * Responsible for identifying critical errors that need user attention
 */

/**
 * Base interface for error detectors
 * Responsible for determining if an error message is critical
 */
export interface ErrorDetector {
  /**
   * Check if an error message is critical and should be shown to console
   * @param message The error message to check
   * @returns true if the error is critical, false otherwise
   */
  isCritical(message: string): boolean;
}

/**
 * Base error detector with system-level error detection
 * Contains errors that are critical across all frameworks
 */
export class BaseErrorDetector implements ErrorDetector {
  isCritical(message: string): boolean {
    // System-level errors all frameworks care about
    const systemErrors = [
      'EADDRINUSE',     // Port already in use
      'EACCES',         // Permission denied
      'ENOENT',         // File not found
      'ECONNREFUSED',   // Connection refused
      'ETIMEDOUT',      // Connection timeout
      'ENOTFOUND',      // DNS lookup failed
    ];
    
    return systemErrors.some(error => message.includes(error));
  }
}