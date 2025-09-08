/**
 * Next.js error detector for Next.js applications
 * Extends base detector with Next.js-specific error patterns
 */

import { BaseErrorDetector } from './base.js';

export class NextJsErrorDetector extends BaseErrorDetector {
  isCritical(message: string): boolean {
    // Check parent class errors first
    if (super.isCritical(message)) {
      return true;
    }
    
    // Next.js specific critical patterns
    const criticalPatterns = [
      /Module not found: Can't resolve/,  // Missing dependencies
      /SyntaxError:/,                     // JavaScript syntax errors
      /TypeError:/,                       // Type errors in JavaScript
      /ReferenceError:/,                  // Undefined variables
      /Build error occurred/,             // Build failures
      /Failed to compile/,                // Compilation errors
      /Error: Cannot find module/,        // Module resolution errors
      /FATAL ERROR:/,                     // Fatal errors
      /Unhandled Runtime Error/,          // Runtime errors
      /Error occurred prerendering/,      // SSG/ISR errors
    ];
    
    // Next.js specific exclusions
    const nonCriticalPatterns = [
      /generateStaticParams/,             // Static generation warnings
      /\.next/,                           // .next directory related messages
      /Fast Refresh/,                     // Hot reload messages
      /warn  -/,                          // Next.js warnings
      /Compiling/,                        // Compilation progress
      /Compiled client and server/,       // Successful compilation
      /Ready in/,                         // Server ready messages
      /\.map/,                            // Source map related
      /Waiting for the changes/,          // Dev server waiting
    ];
    
    // Special handling for FATAL errors - exclude known non-critical ones
    if (message.includes('FATAL') && !message.includes('generateStaticParams')) {
      return true;
    }
    
    // Special handling for module errors - exclude .next directory
    if (message.includes('Cannot find module') && !message.includes('.next')) {
      return true;
    }
    
    // Check if it's a non-critical pattern
    if (nonCriticalPatterns.some(pattern => pattern.test(message))) {
      return false;
    }
    
    // Check for critical patterns
    return criticalPatterns.some(pattern => pattern.test(message));
  }
}