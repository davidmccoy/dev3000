/**
 * Express/Node.js error detector
 */

import { BaseErrorDetector } from './base.js';

export class ExpressErrorDetector extends BaseErrorDetector {
  isCritical(message: string): boolean {
    // Check parent class errors first
    if (super.isCritical(message)) {
      return true;
    }
    
    // Express/Node.js specific critical errors
    const criticalPatterns = [
      /Error:/,                           // Generic errors
      /SyntaxError:/,                     // JavaScript syntax errors
      /TypeError:/,                       // Type errors
      /ReferenceError:/,                  // Reference errors
      /RangeError:/,                      // Range errors
      /URIError:/,                        // URI errors
      /Cannot find module/,               // Module not found
      /UnhandledPromiseRejection/,       // Unhandled promise rejections
      /FATAL ERROR/,                      // Fatal errors
      /DeprecationWarning:.*\(node:/,    // Node.js internal deprecations
      /MongoError:/,                      // MongoDB errors
      /SequelizeError:/,                  // Sequelize ORM errors
      /ValidationError:/,                 // Validation errors
    ];
    
    // Express/Node.js non-critical patterns
    const nonCriticalPatterns = [
      /DeprecationWarning: (?!.*\(node:)/, // Package deprecations (not Node internals)
      /\(node:\d+\) \[DEP/,              // Node.js deprecation codes
      /morgan/,                           // Morgan logger output
      /Server listening/,                 // Server startup messages
      /Listening on/,                     // Server listening messages
      /nodemon/,                          // Nodemon messages
      /restarting due to changes/,        // File watcher messages
      /watching for changes/,             // File watcher messages
    ];
    
    // Check if it's a non-critical pattern first
    if (nonCriticalPatterns.some(pattern => pattern.test(message))) {
      return false;
    }
    
    // Check for critical patterns
    return criticalPatterns.some(pattern => pattern.test(message));
  }
}