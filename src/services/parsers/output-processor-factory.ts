/**
 * Main factory for creating output processors with auto-detection
 * Composes log format parsers and error detectors using ProjectDetector for intelligence
 */

import { LogFormatParserFactory } from './log-parsers/factory.js';
import { ErrorDetectorFactory } from './error-detectors/factory.js';
import { ProjectDetector } from './project-detector.js';
import { OutputProcessor } from './output-processor.js';

import type { ProcessManager } from './log-parsers/factory.js';
import type { Framework } from './error-detectors/factory.js';

// CLI option types that include 'auto'
export type ProcessManagerOption = ProcessManager | 'auto';
export type FrameworkOption = Framework | 'auto';

/**
 * Main factory for creating output processors with auto-detection
 * Handles auto-detection by delegating to ProjectDetector service
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
    processManager: ProcessManagerOption = 'auto',
    framework: FrameworkOption = 'auto'
  ): OutputProcessor {
    // Resolve process manager with fallback
    const resolvedProcessManager: ProcessManager = processManager === 'auto'
      ? ProjectDetector.detectProcessManager(serverCommand)  // Always returns valid ProcessManager
      : processManager as ProcessManager;

    // Resolve framework with fallback using nullish coalescing
    const resolvedFramework: Framework = framework === 'auto'
      ? ProjectDetector.detectFramework(serverCommand) ?? 'nextjs'  // Clean fallback pattern
      : framework as Framework;

    const logFormatParser = LogFormatParserFactory.create(resolvedProcessManager);
    const errorDetector = ErrorDetectorFactory.create(resolvedFramework);

    return new OutputProcessor(logFormatParser, errorDetector);
  }
}
