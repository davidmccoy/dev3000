/**
 * Docker Compose format parser
 * Parses format: "container_name | message"
 */

import { FormatParser, ParsedLine } from './base.js';

export class DockerComposeFormatParser implements FormatParser {
  /**
   * Regex to match Docker Compose output
   * Format: "container_name | message" or "container_name | [timestamp] message"
   */
  private readonly DOCKER_REGEX = /^(\S+)\s+\|\s+(.*)$/;
  
  parse(text: string): ParsedLine[] {
    if (!text || !text.trim()) {
      return [];
    }
    
    const lines = text.trim().split('\n').filter(Boolean);
    return lines.map(line => {
      const match = line.match(this.DOCKER_REGEX);
      
      if (match) {
        const [_, container, message] = match;
        const containerName = container.replace(/_\d+$/, '').toUpperCase();
        const formattedMessage = `[${containerName}] ${message.trim()}`;
        
        return {
          formatted: formattedMessage,
          message: message.trim(),
          processName: container,
          metadata: {
            container,
          }
        };
      }
      
      // Non-Docker lines
      return {
        formatted: line,
        message: line,
      };
    });
  }
}