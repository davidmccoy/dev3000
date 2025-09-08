/**
 * Tests for error detectors
 */

import { describe, it, expect } from 'vitest';
import {
  BaseErrorDetector,
  RailsErrorDetector,
  NextJsErrorDetector,
  DjangoErrorDetector,
  ExpressErrorDetector,
} from './index';

describe('Error Detectors', () => {
  describe('BaseErrorDetector', () => {
    const detector = new BaseErrorDetector();
    
    it('should detect system errors', () => {
      expect(detector.isCritical('Error: EADDRINUSE')).toBe(true);
      expect(detector.isCritical('EACCES: permission denied')).toBe(true);
      expect(detector.isCritical('ENOENT: no such file')).toBe(true);
      expect(detector.isCritical('ECONNREFUSED')).toBe(true);
    });
    
    it('should not flag non-critical messages', () => {
      expect(detector.isCritical('Server started')).toBe(false);
      expect(detector.isCritical('Compiling...')).toBe(false);
    });
  });
  
  describe('RailsErrorDetector', () => {
    const detector = new RailsErrorDetector();
    
    it('should detect Rails-specific errors', () => {
      expect(detector.isCritical('LoadError: cannot load such file')).toBe(true);
      expect(detector.isCritical('NameError: undefined local variable')).toBe(true);
      expect(detector.isCritical('ActiveRecord::ConnectionNotEstablished')).toBe(true);
      expect(detector.isCritical('PG::ConnectionBad')).toBe(true);
    });
    
    it('should exclude deprecation warnings', () => {
      expect(detector.isCritical('DEPRECATION WARNING: something')).toBe(false);
      expect(detector.isCritical('WARNING: something')).toBe(false);
    });
    
    it('should inherit system errors from base', () => {
      expect(detector.isCritical('EADDRINUSE')).toBe(true);
    });
  });
  
  describe('NextJsErrorDetector', () => {
    const detector = new NextJsErrorDetector();
    
    it('should detect Next.js errors', () => {
      expect(detector.isCritical('Module not found: Can\'t resolve')).toBe(true);
      expect(detector.isCritical('Failed to compile')).toBe(true);
      expect(detector.isCritical('Build error occurred')).toBe(true);
    });
    
    it('should handle FATAL errors correctly', () => {
      expect(detector.isCritical('FATAL ERROR: something bad')).toBe(true);
      expect(detector.isCritical('FATAL: generateStaticParams')).toBe(false);
    });
    
    it('should handle module errors correctly', () => {
      expect(detector.isCritical('Error: Cannot find module \'xyz\'')).toBe(true);
      expect(detector.isCritical('Cannot find module \'.next/server\'')).toBe(false);
    });
  });
  
  describe('DjangoErrorDetector', () => {
    const detector = new DjangoErrorDetector();
    
    it('should detect Django errors', () => {
      expect(detector.isCritical('django.core.exceptions.ImproperlyConfigured')).toBe(true);
      expect(detector.isCritical('ImportError: cannot import')).toBe(true);
      expect(detector.isCritical('OperationalError: database is locked')).toBe(true);
    });
  });
  
  describe('ExpressErrorDetector', () => {
    const detector = new ExpressErrorDetector();
    
    it('should detect Express/Node.js errors', () => {
      expect(detector.isCritical('Error: something went wrong')).toBe(true);
      expect(detector.isCritical('TypeError: Cannot read property')).toBe(true);
      expect(detector.isCritical('UnhandledPromiseRejection')).toBe(true);
    });
  });
});