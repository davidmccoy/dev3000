/**
 * Tests for OutputProcessor
 */

import { describe, it, expect } from 'vitest';
import { OutputProcessor } from './output-processor.js';
import { StandardFormatParser, ForemanFormatParser } from './format-parsers/index.js';
import { RailsErrorDetector, NextJsErrorDetector } from './error-detectors/index.js';

describe('OutputProcessor', () => {
  it('should correctly combine Rails + Foreman', () => {
    const processor = new OutputProcessor(
      new ForemanFormatParser(),
      new RailsErrorDetector()
    );
    
    const result = processor.process('10:23:45 web.1    | Started GET "/"', false);
    expect(result[0]).toEqual({
      formatted: '[WEB] Started GET "/"',
    });
    
    const errorResult = processor.process('10:23:45 web.1    | LoadError: cannot load', true);
    expect(errorResult[0]).toEqual({
      formatted: 'ERROR: [WEB] LoadError: cannot load',
      isCritical: true,
      rawMessage: 'LoadError: cannot load',
    });
  });
  
  it('should correctly combine NextJS + Standard', () => {
    const processor = new OutputProcessor(
      new StandardFormatParser(),
      new NextJsErrorDetector()
    );
    
    const result = processor.process('Module not found: Can\'t resolve', true);
    expect(result[0]).toEqual({
      formatted: 'ERROR: Module not found: Can\'t resolve',
      isCritical: true,
      rawMessage: 'Module not found: Can\'t resolve',
    });
  });
});