/**
 * Base interfaces and types for format parsers
 * Responsible for parsing output formats from different process managers
 */

/**
 * Parsed line structure after format parsing
 */
export interface ParsedLine {
  formatted: string;     // Display format (e.g., "[WEB] Started GET /")
  message: string;       // Raw message for error detection (e.g., "Started GET /")
  processName?: string;  // Optional process identifier (e.g., "web", "js")
  metadata?: Record<string, any>;  // Additional metadata from parsing
}

/**
 * Base interface for format parsers
 * Responsible for parsing the structure/format of output (timestamps, process names, etc.)
 */
export interface FormatParser {
  /**
   * Parse text into structured lines
   * @param text Raw text to parse
   * @returns Array of parsed lines with formatting and metadata
   */
  parse(text: string): ParsedLine[];
}