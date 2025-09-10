/**
 * Integration tests for Rails + Foreman combination
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'fs';
import { OutputProcessorFactory } from './output-processor-factory.js';

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

describe('Rails + Foreman Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle Rails bin/dev output end-to-end', () => {
    // Mock Rails project
    vi.mocked(existsSync).mockImplementation((path) => {
      return path === 'Gemfile';
    });

    const processor = OutputProcessorFactory.create('bin/dev');
    
    // Test Foreman-formatted Rails output
    const railsOutput = `14:23:45 web.1    | Rails 7.0.0 application starting in development
14:23:46 web.1    | => Booting Puma
14:23:47 web.1    | => Rails 7.0.0 application starting in development on http://0.0.0.0:3000`;

    const result = processor.process(railsOutput, false);
    
    expect(result).toHaveLength(3);
    expect(result[0].formatted).toBe('[WEB] Rails 7.0.0 application starting in development');
    expect(result[1].formatted).toBe('[WEB] => Booting Puma');
    expect(result[2].formatted).toBe('[WEB] => Rails 7.0.0 application starting in development on http://0.0.0.0:3000');
    
    // None should be critical for stdout
    result.forEach(entry => {
      expect(entry.isCritical).toBeUndefined();
    });
  });

  it('should detect Rails critical errors in Foreman format', () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return path === 'Gemfile';
    });

    const processor = OutputProcessorFactory.create('bin/dev');
    
    const railsErrorOutput = `14:23:45 web.1    | LoadError: cannot load such file -- missing_gem
14:23:46 web.1    | ActiveRecord::ConnectionNotEstablished: No connection pool for 'ActiveRecord::Base'`;

    const result = processor.process(railsErrorOutput, true);
    
    expect(result).toHaveLength(2);
    
    // LoadError should be critical
    expect(result[0].formatted).toBe('ERROR: [WEB] LoadError: cannot load such file -- missing_gem');
    expect(result[0].isCritical).toBe(true);
    expect(result[0].rawMessage).toBe('LoadError: cannot load such file -- missing_gem');
    
    // ActiveRecord error should be critical
    expect(result[1].formatted).toBe('ERROR: [WEB] ActiveRecord::ConnectionNotEstablished: No connection pool for \'ActiveRecord::Base\'');
    expect(result[1].isCritical).toBe(true);
  });

  it('should ignore Rails deprecation warnings in Foreman format', () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return path === 'Gemfile';
    });

    const processor = OutputProcessorFactory.create('bin/dev');
    
    const deprecationOutput = `14:23:45 web.1    | DEPRECATION WARNING: ActiveModel::Errors#keys is deprecated`;

    const result = processor.process(deprecationOutput, true);
    
    expect(result).toHaveLength(1);
    expect(result[0].formatted).toBe('ERROR: [WEB] DEPRECATION WARNING: ActiveModel::Errors#keys is deprecated');
    expect(result[0].isCritical).toBeUndefined(); // Should not be critical
  });

  it('should handle mixed Foreman and non-Foreman output', () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      return path === 'Gemfile';
    });

    const processor = OutputProcessorFactory.create('bin/dev');
    
    const mixedOutput = `Starting Rails development environment...
14:23:45 web.1    | Rails server started
Non-Foreman error message
14:23:46 js.0     | webpack compiled successfully`;

    const result = processor.process(mixedOutput, false);
    
    expect(result).toHaveLength(4);
    expect(result[0].formatted).toBe('Starting Rails development environment...');
    expect(result[1].formatted).toBe('[WEB] Rails server started');
    expect(result[2].formatted).toBe('Non-Foreman error message');
    expect(result[3].formatted).toBe('[JS] webpack compiled successfully');
  });
});