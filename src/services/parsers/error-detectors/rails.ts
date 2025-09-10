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
    
    // Rails-specific critical errors that prevent server startup or development
    const criticalPatterns = [
      // Gem and dependency errors that prevent server startup
      /LoadError/,                       // Missing gems or required files (usually critical)
      /Bundler::.*Error/,                // Gem dependency errors
      /Gem::.*Error/,                    // Gem loading errors  
      /could not find gem/i,             // Missing gem dependencies
      /bundle.*install.*required/i,      // Bundle install needed
      
      // Configuration and application startup errors
      /SyntaxError.*(?:config|application|boot)/i,        // Syntax errors in startup files
      /NameError.*(?:config|application|boot)/i,          // Missing constants during startup
      /LoadError.*(?:config|application|boot)/i,          // Missing files during startup
      /Rails.*application.*failed.*initialize/i,         // Application initialization failures
      /configuration.*error/i,                           // Rails configuration errors
      /invalid.*configuration/i,                         // Invalid Rails config
      
      // Database connection errors that prevent startup
      /ActiveRecord::ConnectionNotEstablished/,          // No database connection
      /ActiveRecord::NoDatabaseError/,                   // Database doesn't exist
      /PG::ConnectionBad/,               // PostgreSQL connection failures
      /Mysql2::Error::ConnectionError/,  // MySQL connection failures
      /Redis::.*Error/,                  // Redis connection errors (if required for startup)
      /database.*does not exist/i,       // Database missing
      /connection.*refused.*database/i,   // Database connection refused
      
      // Server startup failures
      /Address already in use/,          // Port conflicts
      /server.*failed.*start/i,          // General server startup failures
      /rails.*server.*error/i,           // Rails server errors
      /Puma.*failed.*start/i,            // Puma server startup failures
      /Unicorn.*failed.*start/i,         // Unicorn server startup failures
      
      // Migration and schema errors that block development
      /ActiveRecord::PendingMigrationError/,             // Pending migrations
      /ActiveRecord::StatementInvalid.*migration/i,     // Migration failures
      /database.*migration.*failed/i,                   // Migration failures
    ];
    
    // Early return false for Rails warnings and runtime errors  
    if (/DEPRECATION WARNING/i.test(message) || 
        /asset.*not found/i.test(message) ||
        /Precompiling assets/i.test(message)) {
      return false;
    }
    
    // Check for critical patterns
    return criticalPatterns.some(pattern => pattern.test(message));
  }
}