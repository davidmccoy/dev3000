/**
 * Public API for the parsers module
 * Only exposes what external consumers need
 */

// Main output processor and types
export {
  OutputProcessor,
  LogEntry,
} from './output-processor.js';

// Factory for creating processors
export {
  OutputProcessorFactory,
  // Type definitions for future CLI options
  ProcessManager,
  Framework,
} from './factories.js';