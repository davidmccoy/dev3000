/**
 * Django error detector for Django applications
 */

import { BaseErrorDetector } from './base.js';

export class DjangoErrorDetector extends BaseErrorDetector {
  isCritical(message: string): boolean {
    // Check parent class errors first
    if (super.isCritical(message)) {
      return true;
    }
    
    // Django-specific critical errors
    const criticalPatterns = [
      /django\.core\.exceptions\./,       // Django core exceptions
      /ImportError:/,                     // Missing Python modules
      /ModuleNotFoundError:/,             // Missing Python modules
      /SyntaxError:/,                     // Python syntax errors
      /IndentationError:/,                // Python indentation errors
      /AttributeError:/,                  // Attribute access errors
      /KeyError:/,                        // Dictionary key errors
      /ValueError:/,                      // Value errors
      /TypeError:/,                       // Type errors
      /OperationalError:/,                // Database operational errors
      /ProgrammingError:/,                // Database programming errors
      /IntegrityError:/,                  // Database integrity errors
      /DataError:/,                       // Database data errors
      /ValidationError:/,                 // Model validation errors
      /PermissionDenied:/,                // Permission errors
      /Http404:/,                         // 404 errors (in development)
    ];
    
    // Django-specific non-critical patterns
    const nonCriticalPatterns = [
      /WARNING:/,                         // Django warnings
      /INFO:/,                            // Info messages
      /DEBUG:/,                           // Debug messages
      /Watching for file changes/,        // File watcher messages
      /Performing system checks/,         // System check messages
      /System check identified/,          // System check results
      /migrations/,                       // Migration-related messages
      /collectstatic/,                    // Static file collection
    ];
    
    // Check if it's a non-critical pattern first
    if (nonCriticalPatterns.some(pattern => pattern.test(message))) {
      return false;
    }
    
    // Check for critical patterns
    return criticalPatterns.some(pattern => pattern.test(message));
  }
}