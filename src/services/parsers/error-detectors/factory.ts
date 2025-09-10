/**
 * Factory for creating error detectors
 * Pure factory - only handles object creation
 */

import { ErrorDetector, NextJsErrorDetector, RailsErrorDetector } from './index.js';

/**
 * Supported frameworks for error detection
 */
export type Framework = 'nextjs' | 'rails';

/**
 * Simple factory for creating error detectors
 * No auto-detection logic - just creates the right detector for the given framework
 */
export class ErrorDetectorFactory {
  /**
   * Create an error detector for the specified framework
   * @param framework The framework type (must be explicit)
   * @returns An ErrorDetector instance
   */
  static create(framework: Framework): ErrorDetector {
    switch (framework) {
      case 'rails':
        return new RailsErrorDetector();
      case 'nextjs':
        return new NextJsErrorDetector();
      default:
        throw new Error(`Unsupported framework: ${framework}`);
    }
  }
}