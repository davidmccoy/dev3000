/**
 * Public API for the log parsers module
 * Only exposes what external consumers need
 */

// Main output processor and types
export {
  OutputProcessor,
  LogEntry,
} from './output-processor.js';

// Factory for creating processors with auto-detection
export {
  OutputProcessorFactory,
  ProcessManagerOption,
  FrameworkOption,
} from './output-processor-factory.js';
