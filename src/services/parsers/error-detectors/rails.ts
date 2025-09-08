/**
 * Rails error detector for Ruby on Rails applications
 * Extends base detector with Rails-specific error patterns
 */

import { BaseErrorDetector } from './base.js';

export class RailsErrorDetector extends BaseErrorDetector {
  isCritical(message: string): boolean {
    // Check parent class errors first
    if (super.isCritical(message)) {
      return true;
    }
    
    // Rails-specific critical errors
    const criticalPatterns = [
      /LoadError:/,                      // Missing gems or required files
      /NameError:/,                      // Undefined constants or variables
      /NoMethodError:/,                  // Calling methods that don't exist
      /SyntaxError:/,                    // Ruby syntax errors
      /ActiveRecord::/,                  // All ActiveRecord errors
      /Bundler::.*Error/,                // Gem dependency errors
      /PG::ConnectionBad/,               // PostgreSQL connection failures
      /Mysql2::Error::ConnectionError/,  // MySQL connection failures
      /Redis::.*Error/,                  // Redis connection errors
      /ActionView::.*Error/,             // View rendering errors
      /ActionController::.*Error/,       // Controller errors
      /ArgumentError:/,                  // Wrong number of arguments
      /TypeError:/,                      // Type mismatch errors
      /RuntimeError:/,                   // Generic runtime errors
    ];
    
    // Rails-specific non-critical patterns to exclude
    const nonCriticalPatterns = [
      /DEPRECATION WARNING/,              // Deprecation notices are informational
      /asset.*not found/i,               // Missing assets during compilation
      /Precompiling assets/,             // Asset compilation progress messages
      /WARNING:/,                        // General Rails warnings
      /WARN/,                            // Logger warnings
      /Already initialized constant/,    // Constant redefinition warnings
    ];
    
    // Check if it's a non-critical pattern first
    if (nonCriticalPatterns.some(pattern => pattern.test(message))) {
      return false;
    }
    
    // Check for critical patterns
    return criticalPatterns.some(pattern => pattern.test(message));
  }
}