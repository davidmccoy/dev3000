/**
 * PM2 format parser for PM2 process manager
 */

import { FormatParser, ParsedLine } from './base.js';

export class PM2FormatParser implements FormatParser {
  /**
   * PM2 log format: "timestamp | processName | message"
   * Example: "2024-01-01 10:23:45 | app-0 | Server started"
   */
  private readonly PM2_REGEX = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+\|\s+([^|]+)\s+\|\s+(.*)$/;
  
  parse(text: string): ParsedLine[] {
    if (!text || !text.trim()) {
      return [];
    }
    
    const lines = text.trim().split('\n').filter(Boolean);
    return lines.map(line => {
      const match = line.match(this.PM2_REGEX);
      
      if (match) {
        const [_, timestamp, process, message] = match;
        const processName = process.trim().replace(/-\d+$/, '').toUpperCase();
        const formattedMessage = `[${processName}] ${message.trim()}`;
        
        return {
          formatted: formattedMessage,
          message: message.trim(),
          processName: process.trim(),
          metadata: {
            timestamp,
          }
        };
      }
      
      // Non-PM2 lines
      return {
        formatted: line,
        message: line,
      };
    });
  }
}