/**
 * Standard format parser - direct passthrough with no special formatting
 * Used for simple commands that don't use process managers
 */

import { FormatParser, ParsedLine } from './base.js';

export class StandardFormatParser implements FormatParser {
  parse(text: string): ParsedLine[] {
    if (!text || !text.trim()) {
      return [];
    }
    
    const lines = text.trim().split('\n').filter(Boolean);
    return lines.map(line => ({
      formatted: line,
      message: line,
    }));
  }
}