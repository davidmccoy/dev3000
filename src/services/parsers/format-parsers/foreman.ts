/**
 * Foreman format parser for Rails bin/dev and similar tools
 * Parses format: "HH:MM:SS process.N | message"
 */

import { FormatParser, ParsedLine } from './base.js';

export class ForemanFormatParser implements FormatParser {
  /**
   * Regex pattern to match Foreman/Overmind/Hivemind output format
   * 
   * Captures:
   * - Group 1: Timestamp (HH:MM:SS or HH:MM:SS.mmm)
   * - Group 2: Process name (alphanumeric with hyphens/underscores)
   * - Group 3: Instance number (digits only)
   * - Group 4: Message (everything after the pipe)
   */
  private readonly FOREMAN_REGEX = /^(\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s+([\w-]+)\.(\d+)\s+\|\s*(.*)$/;
  
  parse(text: string): ParsedLine[] {
    if (!text || !text.trim()) {
      return [];
    }
    
    const lines = text.trim().split('\n').filter(Boolean);
    return lines.map(line => {
      const match = line.match(this.FOREMAN_REGEX);
      
      if (match) {
        const [_, timestamp, process, instance, message] = match;
        const processName = process.toUpperCase();
        const formattedMessage = `[${processName}] ${message.trim()}`;
        
        return {
          formatted: formattedMessage,
          message: message.trim(),
          processName: process,
          metadata: {
            timestamp,
            instance: parseInt(instance, 10),
          }
        };
      }
      
      // Non-Foreman lines (startup messages, errors, etc.)
      // Keep them as-is without process prefix
      return {
        formatted: line,
        message: line,
      };
    });
  }
}