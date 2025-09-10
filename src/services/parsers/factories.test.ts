/**
 * Tests for the factory system and ProjectDetector
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'fs';
import { LogFormatParserFactory } from './log-parsers/factory.js';
import { ErrorDetectorFactory } from './error-detectors/factory.js';
import { OutputProcessorFactory } from './output-processor-factory.js';
import { ProjectDetector } from './project-detector.js';
import { StandardLogParser, ForemanLogParser } from './log-parsers/index.js';
import { NextJsErrorDetector, RailsErrorDetector } from './error-detectors/index.js';

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

describe('ProjectDetector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should detect foreman process manager from bin/dev command', () => {
    const result = ProjectDetector.detectProcessManager('bin/dev');
    expect(result).toBe('foreman');
  });

  it('should detect foreman process manager from foreman command', () => {
    const result = ProjectDetector.detectProcessManager('foreman start');
    expect(result).toBe('foreman');
  });

  it('should detect standard process manager for npm run dev', () => {
    const result = ProjectDetector.detectProcessManager('npm run dev');
    expect(result).toBe('standard');
  });

  it('should detect rails framework from project files', () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return path === 'Gemfile';
    });

    const result = ProjectDetector.detectFramework();
    expect(result).toBe('rails');
  });

  it('should detect rails framework from bin/dev command', () => {
    vi.mocked(existsSync).mockReturnValue(false);
    
    const result = ProjectDetector.detectFramework('bin/dev');
    expect(result).toBe('rails');
  });

  it('should detect nextjs framework from project files', () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return path === 'next.config.js';
    });

    const result = ProjectDetector.detectFramework();
    expect(result).toBe('nextjs');
  });
});

describe('LogFormatParserFactory', () => {
  it('should create ForemanLogParser', () => {
    const parser = LogFormatParserFactory.create('foreman');
    expect(parser).toBeInstanceOf(ForemanLogParser);
  });

  it('should create StandardLogParser', () => {
    const parser = LogFormatParserFactory.create('standard');
    expect(parser).toBeInstanceOf(StandardLogParser);
  });
});

describe('ErrorDetectorFactory', () => {
  it('should create RailsErrorDetector', () => {
    const detector = ErrorDetectorFactory.create('rails');
    expect(detector).toBeInstanceOf(RailsErrorDetector);
  });

  it('should create NextJsErrorDetector', () => {
    const detector = ErrorDetectorFactory.create('nextjs');
    expect(detector).toBeInstanceOf(NextJsErrorDetector);
  });
});

describe('OutputProcessorFactory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create Rails + Foreman processor for bin/dev', () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return path === 'Gemfile';
    });

    const processor = OutputProcessorFactory.create('bin/dev');
    
    expect(processor).toBeDefined();
    expect(processor.getLogFormatParser()).toBeInstanceOf(ForemanLogParser);
    expect(processor.getErrorDetector()).toBeInstanceOf(RailsErrorDetector);
  });

  it('should create Next.js + Standard processor for npm run dev', () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return path === 'next.config.js';
    });

    const processor = OutputProcessorFactory.create('npm run dev');
    
    expect(processor).toBeDefined();
    expect(processor.getLogFormatParser()).toBeInstanceOf(StandardLogParser);
    expect(processor.getErrorDetector()).toBeInstanceOf(NextJsErrorDetector);
  });
});