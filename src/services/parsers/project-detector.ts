/**
 * Service for detecting project type and process manager from environment
 * Handles all the filesystem checks and command analysis
 */

import { existsSync } from 'fs';
export type Framework = 'nextjs' | 'rails';
export type ProcessManager = 'standard' | 'foreman';

// CLI options that include auto-detection
export type FrameworkOption = Framework | 'auto';
export type ProcessManagerOption = ProcessManager | 'auto';

/**
 * Project detection service that analyzes the environment
 * Separated from factories to keep concerns clean
 */
export class ProjectDetector {
  /**
   * Detect the framework from the server command and project context
   * @param serverCommand Optional server command for additional context
   * @returns The detected framework type, or null if detection fails
   */
  static detectFramework(serverCommand?: string): Framework | null {
    // Check for Rails project indicators
    if (this.isRailsProject() || (serverCommand && this.isRailsCommand(serverCommand))) {
      return 'rails';
    }

    // Check for Next.js project indicators
    if (this.isNextJsProject()) {
      return 'nextjs';
    }

    return null;
  }

  /**
   * Detect the process manager from the server command
   * @param serverCommand The command used to start the server
   * @returns The detected process manager type, defaults to standard
   */
  static detectProcessManager(serverCommand: string): ProcessManager {
    const command = serverCommand.toLowerCase();

    // Check for Foreman-style process managers
    if (command.includes('bin/dev') ||
        command.includes('foreman') ||
        command.includes('overmind') ||
        command.includes('hivemind')) {
      return 'foreman';
    }

    // Default to standard for most commands
    return 'standard';
  }

  /**
   * Check if this is a Rails project
   * Uses multiple indicators for higher confidence
   */
  private static isRailsProject(): boolean {
    return existsSync('Gemfile') ||
           existsSync('config/application.rb') ||
           existsSync('bin/rails');
  }

  /**
   * Check if this is a Next.js project
   * Uses Next.js-specific indicators to avoid false positives
   */
  private static isNextJsProject(): boolean {
    return existsSync('next.config.js') ||
           existsSync('next.config.ts') ||
           existsSync('next.config.mjs') ||
           existsSync('.next') ||
           existsSync('next-env.d.ts')
  }

  /**
   * Check if the server command indicates Rails
   */
  private static isRailsCommand(serverCommand: string): boolean {
    const command = serverCommand.toLowerCase();
    return command.includes('rails') ||
           command.includes('bin/dev') ||
           command.includes('bin/rails');
  }
}
