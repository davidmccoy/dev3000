/**
 * Error detectors module exports
 */

export { ErrorDetector, BaseErrorDetector } from './base.js';
export { NextJsErrorDetector } from './nextjs.js';
export { RailsErrorDetector } from './rails.js';
export { ErrorDetectorFactory, Framework } from './factory.js';