/**
 * Factory classes for creating format parsers and error detectors
 * Includes smart detection logic for auto-configuration
 */

import {
  FormatParser,
  StandardFormatParser,
  ForemanFormatParser,
  DockerComposeFormatParser,
  PM2FormatParser,
} from './format-parsers/index.js';

import {
  ErrorDetector,
  BaseErrorDetector,
  RailsErrorDetector,
  NextJsErrorDetector,
  DjangoErrorDetector,
  ExpressErrorDetector,
} from './error-detectors/index.js';

import { OutputProcessor } from './output-processor.js';

/**
 * Supported process managers
 */
export type ProcessManager = 'foreman' | 'overmind' | 'hivemind' | 'docker-compose' | 'pm2' | 'standard' | 'auto';

/**
 * Supported frameworks
 */
export type Framework = 'rails' | 'nextjs' | 'django' | 'express' | 'auto';

/**
 * Factory for creating format parsers
 * Handles auto-detection based on server command
 */
export class FormatParserFactory {
  /**
   * Create a format parser based on process manager type
   * @param processManager The process manager type or 'auto' for detection
   * @param serverCommand Optional server command for auto-detection
   * @returns A FormatParser instance
   */
  static create(processManager: ProcessManager | string = 'auto', serverCommand?: string): FormatParser {
    // Handle auto-detection
    if (processManager === 'auto' && serverCommand) {
      processManager = this.detectProcessManager(serverCommand);
    }

    // Create the appropriate parser
    switch (processManager) {
      case 'foreman':
      case 'overmind':
      case 'hivemind':
        return new ForemanFormatParser();

      case 'docker-compose':
        return new DockerComposeFormatParser();

      case 'pm2':
        return new PM2FormatParser();

      case 'standard':
      default:
        return new StandardFormatParser();
    }
  }

  /**
   * Detect the process manager from the server command
   * @param serverCommand The command used to start the server
   * @returns The detected process manager type
   */
  private static detectProcessManager(serverCommand: string): ProcessManager {
    const command = serverCommand.toLowerCase();

    // Check for Foreman-style process managers
    if (command.includes('bin/dev') ||
        command.includes('foreman') ||
        command.includes('overmind') ||
        command.includes('hivemind')) {
      return 'foreman';
    }

    // Check for Docker Compose
    if (command.includes('docker-compose') ||
        command.includes('docker compose')) {
      return 'docker-compose';
    }

    // Check for PM2
    if (command.includes('pm2')) {
      return 'pm2';
    }

    // Default to standard
    return 'standard';
  }
}

/**
 * Factory for creating error detectors
 * Handles auto-detection based on server command and project context
 */
export class ErrorDetectorFactory {
  /**
   * Create an error detector based on framework type
   * @param framework The framework type or 'auto' for detection
   * @param serverCommand Optional server command for auto-detection
   * @returns An ErrorDetector instance
   */
  static create(framework: Framework | string = 'auto', serverCommand?: string): ErrorDetector {
    // Handle auto-detection
    if (framework === 'auto' && serverCommand) {
      framework = this.detectFramework(serverCommand);
    }

    // Create the appropriate detector
    switch (framework) {
      case 'rails':
        return new RailsErrorDetector();

      case 'nextjs':
        return new NextJsErrorDetector();

      case 'django':
        return new DjangoErrorDetector();

      case 'express':
        return new ExpressErrorDetector();

      default:
        return new BaseErrorDetector();
    }
  }

  /**
   * Detect the framework from the server command
   * @param serverCommand The command used to start the server
   * @returns The detected framework type
   */
  private static detectFramework(serverCommand: string): Framework | 'unknown' {
    const command = serverCommand.toLowerCase();

    // Rails detection
    if (command.includes('rails') ||
        command.includes('bin/dev') ||
        command.includes('bin/rails')) {
      return 'rails';
    }

    // Next.js detection
    if (command.includes('next') ||
        command.includes('npm run dev') ||
        command.includes('pnpm run dev') ||
        command.includes('yarn dev')) {
      return 'nextjs';
    }

    // Django detection
    if (command.includes('django') ||
        command.includes('manage.py') ||
        command.includes('runserver')) {
      return 'django';
    }

    // Express/Node.js detection
    if (command.includes('node ') ||
        command.includes('nodemon') ||
        command.includes('express')) {
      return 'express';
    }

    return 'unknown';
  }
}

/**
 * Main factory for creating output processors
 * Combines format parsers and error detectors
 */
export class OutputProcessorFactory {
  /**
   * Create an output processor with auto-detection
   * @param serverCommand The command used to start the server
   * @param processManager Optional explicit process manager (defaults to auto)
   * @param framework Optional explicit framework (defaults to auto)
   * @returns An OutputProcessor instance
   */
  static create(
    serverCommand: string,
    processManager: ProcessManager | string = 'auto',
    framework: Framework | string = 'auto'
  ): OutputProcessor {
    const formatParser = FormatParserFactory.create(processManager, serverCommand);
    const errorDetector = ErrorDetectorFactory.create(framework, serverCommand);

    return new OutputProcessor(formatParser, errorDetector);
  }

}
