/**
 * Output parser system for handling different server output formats
 * Supports standard output and specialized formats like Foreman
 */

export interface LogEntry {
  formatted: string;  // Ready-to-log formatted message
  isCritical?: boolean;  // Optional flag for critical errors that should be shown to console
  rawMessage?: string;  // Optional raw message for critical error display
}

/**
 * Base class for all output parsers
 */
export abstract class OutputParser {
  abstract parse(text: string, isError?: boolean): LogEntry[];
  
  /**
   * Check if an error message is critical and should be shown to console
   */
  protected isCriticalError(message: string): boolean {
    return message.includes('EADDRINUSE') || 
           message.includes('EACCES') || 
           message.includes('ENOENT') ||
           (message.includes('FATAL') && !message.includes('generateStaticParams')) ||
           (message.includes('Cannot find module') && !message.includes('.next'));
  }
}

/**
 * Standard output parser - preserves existing behavior
 * Used for npm/yarn/pnpm scripts and simple commands
 */
export class StandardOutputParser extends OutputParser {
  parse(text: string, isError: boolean = false): LogEntry[] {
    if (!text || !text.trim()) {
      return [];
    }
    
    const lines = text.trim().split('\n').filter(Boolean);
    return lines.map(line => ({
      formatted: isError ? `ERROR: ${line}` : line,
      isCritical: isError && this.isCriticalError(line),
      rawMessage: isError ? line : undefined
    }));
  }
}

/**
 * Foreman output parser for Rails bin/dev and similar tools
 * Parses format: "HH:MM:SS process.N | message"
 */
export class ForemanOutputParser extends OutputParser {
  private readonly FOREMAN_REGEX = /^(\d{2}:\d{2}:\d{2})\s+(\w+)\.(\d+)\s+\|\s+(.*)$/;
  
  parse(text: string, isError: boolean = false): LogEntry[] {
    if (!text || !text.trim()) {
      return [];
    }
    
    const lines = text.trim().split('\n').filter(Boolean);
    return lines.map(line => {
      const match = line.match(this.FOREMAN_REGEX);
      
      if (match) {
        const [_, _timestamp, process, _instance, message] = match;
        const processName = process.toUpperCase();
        const formattedMessage = `[${processName}] ${message.trim()}`;
        
        return {
          formatted: isError ? `ERROR: ${formattedMessage}` : formattedMessage,
          isCritical: isError && this.isCriticalError(message),
          rawMessage: isError ? message.trim() : undefined
        };
      }
      
      // Non-Foreman lines (startup messages, errors, etc.)
      // Keep them as-is without process prefix
      return {
        formatted: isError ? `ERROR: ${line}` : line,
        isCritical: isError && this.isCriticalError(line),
        rawMessage: isError ? line : undefined
      };
    });
  }
}

/**
 * Factory for creating the appropriate output parser based on the server command
 */
export class OutputParserFactory {
  private static readonly PARSER_PATTERNS: Array<{
    pattern: string;
    parser: new () => OutputParser;
  }> = [
    // Foreman-based tools
    { pattern: 'bin/dev', parser: ForemanOutputParser },
    { pattern: 'foreman start', parser: ForemanOutputParser },
    { pattern: 'foreman', parser: ForemanOutputParser },
    { pattern: 'hivemind', parser: ForemanOutputParser },
    { pattern: 'overmind start', parser: ForemanOutputParser },
    { pattern: 'overmind', parser: ForemanOutputParser },
    
    // Future parsers can be added here
    // { pattern: 'docker-compose', parser: DockerComposeOutputParser },
    // { pattern: 'pm2', parser: PM2OutputParser },
  ];
  
  /**
   * Create the appropriate parser based on the server command
   * @param serverCommand The command being used to start the server
   * @returns An OutputParser instance
   */
  static create(serverCommand: string): OutputParser {
    // Check each pattern to find a matching parser
    for (const { pattern, parser } of this.PARSER_PATTERNS) {
      if (serverCommand.includes(pattern)) {
        return new parser();
      }
    }
    
    // Default to standard parser for unrecognized commands
    return new StandardOutputParser();
  }
}