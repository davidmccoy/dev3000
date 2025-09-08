/**
 * Tests for format parsers
 */

import { describe, it, expect } from 'vitest';
import {
  StandardFormatParser,
  ForemanFormatParser,
  DockerComposeFormatParser,
  PM2FormatParser,
} from './index';

describe('Format Parsers', () => {
  describe('StandardFormatParser', () => {
    const parser = new StandardFormatParser();
    
    it('should parse standard output correctly', () => {
      const text = 'Server started\nListening on port 3000';
      const result = parser.parse(text);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        formatted: 'Server started',
        message: 'Server started',
      });
      expect(result[1]).toEqual({
        formatted: 'Listening on port 3000',
        message: 'Listening on port 3000',
      });
    });
    
    it('should handle empty input', () => {
      expect(parser.parse('')).toEqual([]);
      expect(parser.parse('  \n  ')).toEqual([]);
    });
  });
  
  describe('ForemanFormatParser', () => {
    const parser = new ForemanFormatParser();
    
    it('should parse Foreman format correctly', () => {
      const text = '10:23:45 web.1    | Started GET "/" for 127.0.0.1';
      const result = parser.parse(text);
      
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        formatted: '[WEB] Started GET "/" for 127.0.0.1',
        message: 'Started GET "/" for 127.0.0.1',
        processName: 'web',
        metadata: {
          timestamp: '10:23:45',
          instance: 1,
        }
      });
    });
    
    it('should handle process names with hyphens', () => {
      const text = '10:23:45 esbuild-worker.1 | ✓ Built in 150ms';
      const result = parser.parse(text);
      
      expect(result[0].processName).toBe('esbuild-worker');
      expect(result[0].formatted).toBe('[ESBUILD-WORKER] ✓ Built in 150ms');
    });
    
    it('should handle millisecond timestamps', () => {
      const text = '10:23:45.123 js.1 | Compiling...';
      const result = parser.parse(text);
      
      expect(result[0].metadata?.timestamp).toBe('10:23:45.123');
    });
    
    it('should handle non-Foreman lines', () => {
      const text = 'Regular log message without Foreman format';
      const result = parser.parse(text);
      
      expect(result[0]).toEqual({
        formatted: 'Regular log message without Foreman format',
        message: 'Regular log message without Foreman format',
      });
    });
  });
  
  describe('DockerComposeFormatParser', () => {
    const parser = new DockerComposeFormatParser();
    
    it('should parse Docker Compose format', () => {
      const text = 'web_1     | Starting server...';
      const result = parser.parse(text);
      
      expect(result[0]).toEqual({
        formatted: '[WEB] Starting server...',
        message: 'Starting server...',
        processName: 'web_1',
        metadata: {
          container: 'web_1',
        }
      });
    });
  });
  
  describe('PM2FormatParser', () => {
    const parser = new PM2FormatParser();
    
    it('should parse PM2 format', () => {
      const text = '2024-01-01 10:23:45 | app-0 | Server started';
      const result = parser.parse(text);
      
      expect(result[0]).toEqual({
        formatted: '[APP] Server started',
        message: 'Server started',
        processName: 'app-0',
        metadata: {
          timestamp: '2024-01-01 10:23:45',
        }
      });
    });
  });
});