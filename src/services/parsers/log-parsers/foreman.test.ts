/**
 * Tests for Foreman log parser
 */

import { describe, it, expect } from 'vitest';
import { ForemanLogParser } from './foreman.js';

describe('ForemanLogParser', () => {
  const parser = new ForemanLogParser();

  it('should parse Foreman format correctly', () => {
    const input = '14:23:45 web.1    | Started GET "/" for ::1 at 2023-01-01 14:23:45';
    const result = parser.parse(input);

    expect(result).toHaveLength(1);
    expect(result[0].formatted).toBe('[WEB] Started GET "/" for ::1 at 2023-01-01 14:23:45');
    expect(result[0].message).toBe('Started GET "/" for ::1 at 2023-01-01 14:23:45');
    expect(result[0].processName).toBe('web');
    expect(result[0].metadata).toEqual({
      timestamp: '14:23:45',
      instance: 1,
    });
  });

  it('should parse Foreman format with milliseconds', () => {
    const input = '14:23:45.123 js.0     | webpack compiled with 1 warning';
    const result = parser.parse(input);

    expect(result).toHaveLength(1);
    expect(result[0].formatted).toBe('[JS] webpack compiled with 1 warning');
    expect(result[0].message).toBe('webpack compiled with 1 warning');
    expect(result[0].processName).toBe('js');
    expect(result[0].metadata).toEqual({
      timestamp: '14:23:45.123',
      instance: 0,
    });
  });

  it('should handle non-Foreman lines as-is', () => {
    const input = 'Starting development server...';
    const result = parser.parse(input);

    expect(result).toHaveLength(1);
    expect(result[0].formatted).toBe('Starting development server...');
    expect(result[0].message).toBe('Starting development server...');
    expect(result[0].processName).toBeUndefined();
    expect(result[0].metadata).toBeUndefined();
  });

  it('should handle multiple lines with mixed formats', () => {
    const input = `Starting development server...
14:23:45 web.1    | Rails server started on port 3000
14:23:45 js.0     | webpack: bundle is now VALID
Another non-Foreman line`;

    const result = parser.parse(input);

    expect(result).toHaveLength(4);
    
    // Non-Foreman line
    expect(result[0].formatted).toBe('Starting development server...');
    expect(result[0].processName).toBeUndefined();
    
    // Foreman web process
    expect(result[1].formatted).toBe('[WEB] Rails server started on port 3000');
    expect(result[1].processName).toBe('web');
    
    // Foreman js process
    expect(result[2].formatted).toBe('[JS] webpack: bundle is now VALID');
    expect(result[2].processName).toBe('js');
    
    // Non-Foreman line
    expect(result[3].formatted).toBe('Another non-Foreman line');
    expect(result[3].processName).toBeUndefined();
  });

  it('should handle empty input', () => {
    const result = parser.parse('');
    expect(result).toHaveLength(0);
  });
});