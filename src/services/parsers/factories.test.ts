/**
 * Tests for factories
 */

import { describe, it, expect } from 'vitest';
import {
  FormatParserFactory,
  ErrorDetectorFactory,
  OutputProcessorFactory,
} from './factories';
import {
  StandardFormatParser,
  ForemanFormatParser,
  DockerComposeFormatParser,
} from './format-parsers';
import {
  RailsErrorDetector,
  NextJsErrorDetector,
  DjangoErrorDetector,
  ExpressErrorDetector,
} from './error-detectors';

describe('Factories', () => {
  describe('FormatParserFactory', () => {
    it('should detect Foreman from bin/dev', () => {
      const parser = FormatParserFactory.create('auto', 'bin/dev');
      expect(parser).toBeInstanceOf(ForemanFormatParser);
    });
    
    it('should detect Docker Compose', () => {
      const parser = FormatParserFactory.create('auto', 'docker-compose up');
      expect(parser).toBeInstanceOf(DockerComposeFormatParser);
    });
    
    it('should default to standard', () => {
      const parser = FormatParserFactory.create('auto', 'npm start');
      expect(parser).toBeInstanceOf(StandardFormatParser);
    });
  });
  
  describe('ErrorDetectorFactory', () => {
    it('should detect Rails from bin/dev', () => {
      const detector = ErrorDetectorFactory.create('auto', 'bin/dev');
      expect(detector).toBeInstanceOf(RailsErrorDetector);
    });
    
    it('should detect Next.js from next dev', () => {
      const detector = ErrorDetectorFactory.create('auto', 'next dev');
      expect(detector).toBeInstanceOf(NextJsErrorDetector);
    });
    
    it('should detect Django', () => {
      const detector = ErrorDetectorFactory.create('auto', 'python manage.py runserver');
      expect(detector).toBeInstanceOf(DjangoErrorDetector);
    });
  });
  
  describe('OutputProcessorFactory', () => {
    it('should auto-detect Rails + Foreman', () => {
      const processor = OutputProcessorFactory.create('bin/dev');
      expect(processor.getFormatParser()).toBeInstanceOf(ForemanFormatParser);
      expect(processor.getErrorDetector()).toBeInstanceOf(RailsErrorDetector);
    });
    
    it('should allow explicit configuration', () => {
      const processor = OutputProcessorFactory.create('custom-script', 'docker-compose', 'express');
      expect(processor.getFormatParser()).toBeInstanceOf(DockerComposeFormatParser);
      expect(processor.getErrorDetector()).toBeInstanceOf(ExpressErrorDetector);
    });
  });
});