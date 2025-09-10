/**
 * Factory for creating log format parsers
 * Pure factory - only handles object creation
 */

import { StandardLogParser, ForemanLogParser } from './index.js';

/**
 * Supported process managers for log format parsing
 */
export type ProcessManager = 'standard' | 'foreman';

/**
 * Simple factory for creating log format parsers
 * No auto-detection logic - just creates the right parser for the given process manager
 */
export class LogFormatParserFactory {
  /**
   * Create a log format parser for the specified process manager
   * @param processManager The process manager type (must be explicit)
   * @returns A LogFormatParser instance
   */
  static create(processManager: ProcessManager) {
    switch (processManager) {
      case 'foreman':
        return new ForemanLogParser();
      case 'standard':
        return new StandardLogParser();
      default:
        throw new Error(`Unsupported process manager: ${processManager}`);
    }
  }
}