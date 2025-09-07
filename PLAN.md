# Ruby on Rails Support Plan for dev3000

## Executive Summary

This plan outlines the implementation strategy for adding Ruby on Rails support to dev3000, enabling the tool to capture Rails server logs, monitor asset compilation, and provide AI-assisted debugging for Rails applications alongside the existing JavaScript ecosystem support.

## Updated Requirements (Based on Feedback)

### Scope Decisions
- **Rails Version**: Support Rails 6+ only
- **Default Command**: Use `bin/dev` (Foreman-based) as default
- **Background Jobs**: Defer to future release
- **Database Monitoring**: Keep existing log capture approach
- **Hybrid Apps**: Skip Rails API + SPA complexity for now
- **Test Application**: `/Users/david/dev/breakfast/fantasy-drafter` (Rails 7.2.2 with esbuild + Tailwind)

## Current State Analysis

### What Works Already
- **JavaScript ecosystem support** - Works with any JS project that has package.json scripts (Next.js, Vite, React, Vue, Svelte, etc.)
- **Package manager detection** - Auto-detects npm/yarn/pnpm based on lockfiles
- **Browser monitoring via CDP** - Works universally for any web application
- **Screenshot capture** - Framework-agnostic
- **MCP server and AI tools** - Can analyze any structured logs
- **Unified log format** - Extensible to new sources

### What Needs Adaptation for Rails
- **Process spawning** - Currently uses package.json scripts exclusively
- **Log capture** - Rails logs to files, not just stdout/stderr
- **Project detection** - Only recognizes JavaScript lockfiles
- **Server commands** - Assumes npm/yarn/pnpm script execution pattern

## Real-World Rails Application Analysis

### Test Application: fantasy-drafter
Based on examination of `/Users/david/dev/breakfast/fantasy-drafter`:

**Technology Stack:**
- Rails 7.2.2 with Ruby 3.3.6
- PostgreSQL database
- Foreman-based development (`bin/dev` with `Procfile.dev`)
- Multiple processes:
  - Rails server (port 3000)
  - JavaScript bundling via esbuild (`npm run watch`)
  - CSS compilation via Tailwind CLI
- Sidekiq for background jobs (not in Procfile.dev)
- Modern Rails stack: Turbo, Stimulus, Hotwire

**Key Observations:**
1. **Multi-process Architecture**: `bin/dev` spawns 3 processes via Foreman
2. **Mixed Package Managers**: Uses both Bundler (Ruby) and npm (JavaScript)
3. **Log Sources**: Each process outputs to stdout with Foreman prefix
4. **Asset Pipeline**: Modern approach with esbuild and Tailwind (no Sprockets)

## Implementation Approaches

## Approach C: OutputParserFactory with Existing --server-command (NEW - RECOMMENDED)

### Overview
Leverage the existing `--server-command` flag with a factory pattern that maps commands to specific output parsers. No new flags, no auto-detection, just clean command-to-parser mapping.

### Pros
- **Minimal changes** - Only adds parser classes, reuses existing CLI
- **No new flags** - Works with existing `--server-command`
- **No detection logic** - Explicit command-to-parser mapping
- **Highly extensible** - Easy to add parsers for Docker, PM2, etc.
- **1-week implementation** - Fastest approach
- **Zero breaking changes** - Purely additive

### Cons
- Requires users to use `--server-command` for Rails (not a real con since it already exists)
- Commands must be recognized by the factory (fallback to standard parser handles unknowns)

### Implementation (1 Week Total)

#### Day 1-2: Core Parser Infrastructure
```typescript
// src/services/output-parser.ts
export interface LogEntry {
  source: string;
  message: string;
}

export abstract class OutputParser {
  abstract parse(text: string): LogEntry[];
}

export class StandardOutputParser extends OutputParser {
  parse(text: string): LogEntry[] {
    const lines = text.trim().split('\n').filter(Boolean);
    return lines.map(line => ({
      source: 'server',
      message: line
    }));
  }
}

export class ForemanOutputParser extends OutputParser {
  parse(text: string): LogEntry[] {
    const lines = text.trim().split('\n').filter(Boolean);
    return lines.map(line => {
      // Foreman format: "HH:MM:SS process.N | message"
      const match = line.match(/^\d{2}:\d{2}:\d{2}\s+(\w+)\.\d+\s+\|\s+(.*)$/);
      if (match) {
        const [_, process, message] = match;
        return {
          source: `server:${process.toLowerCase()}`,
          message: message.trim()
        };
      }
      // Non-Foreman lines (startup messages, etc.)
      return { source: 'server', message: line };
    });
  }
}

export class OutputParserFactory {
  private static readonly PARSER_PATTERNS = [
    { pattern: 'bin/dev', parser: ForemanOutputParser },
    { pattern: 'foreman', parser: ForemanOutputParser },
    { pattern: 'hivemind', parser: ForemanOutputParser },
    { pattern: 'overmind', parser: ForemanOutputParser },
    // Future: { pattern: 'docker-compose', parser: DockerComposeOutputParser },
    // Future: { pattern: 'pm2', parser: PM2OutputParser },
  ];
  
  static create(serverCommand: string): OutputParser {
    for (const { pattern, parser } of this.PARSER_PATTERNS) {
      if (serverCommand.includes(pattern)) {
        return new parser();
      }
    }
    return new StandardOutputParser();
  }
}
```

#### Day 3-4: Integration with DevEnvironment
```typescript
// Modify src/dev-environment.ts
import { OutputParserFactory, OutputParser } from './services/output-parser';

export class DevEnvironment {
  private outputParser: OutputParser;
  
  constructor(options: DevEnvironmentOptions) {
    // ...existing code...
    this.outputParser = OutputParserFactory.create(options.serverCommand);
  }
  
  private async startServer() {
    // ...existing spawn code...
    
    this.serverProcess.stdout?.on('data', (data) => {
      const entries = this.outputParser.parse(data.toString());
      entries.forEach(entry => {
        this.logger.log('server', 
          entry.source === 'server' 
            ? entry.message 
            : `[${entry.source.split(':')[1]?.toUpperCase()}] ${entry.message}`
        );
      });
    });
    
    // Same for stderr
    this.serverProcess.stderr?.on('data', (data) => {
      const entries = this.outputParser.parse(data.toString());
      entries.forEach(entry => {
        this.logger.log('server', 
          `ERROR: ${entry.source === 'server' 
            ? entry.message 
            : `[${entry.source.split(':')[1]?.toUpperCase()}] ${entry.message}`}`
        );
      });
    });
  }
}
```

#### Day 5: Testing & Documentation
- Test with fantasy-drafter Rails app
- Test with existing JavaScript projects (ensure no regression)
- Update README with Rails examples
- Add examples for other frameworks

### Usage Examples
```bash
# Rails with Foreman (automatic parser selection)
dev3000 --server-command "bin/dev"

# Rails with explicit rails server
dev3000 --server-command "bundle exec rails server"

# JavaScript projects (unchanged)
dev3000  # Uses package.json scripts

# Django (works today, standard parser)
dev3000 --server-command "python manage.py runserver"

# Future: Docker Compose (would use DockerComposeParser)
dev3000 --server-command "docker-compose up"
```

### Future Extensibility
Adding support for a new tool is trivial:
```typescript
// Add to PARSER_PATTERNS
{ pattern: 'docker-compose', parser: DockerComposeOutputParser }

// Implement the parser
export class DockerComposeOutputParser extends OutputParser {
  parse(text: string): LogEntry[] {
    // Parse Docker Compose format: "container_name | message"
    // ...
  }
}
```

## Approach A: Clean Architecture with Full Abstractions

### Overview
Complete rewrite with proper abstractions, making the codebase truly multi-ecosystem from the ground up. This approach treats JavaScript and Ruby/Rails as equal citizens with shared interfaces.

### Pros
- Clean, maintainable codebase
- Easy to add more frameworks later (Django, Laravel, etc.)
- Better testing and separation of concerns
- No technical debt accumulation

### Cons
- Longer implementation time (4-6 weeks)
- Risk of breaking existing JavaScript ecosystem functionality
- Requires extensive refactoring of current code
- More complex initial PR

### Implementation Plan

#### Week 1: Foundation Refactoring
```typescript
// New file structure
src/
├── core/
│   ├── framework-detector.ts
│   ├── process-manager.ts
│   └── log-aggregator.ts
├── ecosystems/
│   ├── base-ecosystem.ts
│   ├── javascript/
│   │   ├── detector.ts
│   │   ├── process-spawner.ts
│   │   └── package-managers/
│   └── rails/
│       ├── detector.ts
│       ├── foreman-spawner.ts
│       └── log-parser.ts
└── cli.ts (updated to use framework detector)
```

#### Week 2: Rails Implementation
- Implement `RailsFramework` class extending `BaseFramework`
- Add Foreman process parsing (splits stdout by process name)
- Create Rails log parser for development.log tailing
- Handle Gemfile detection and bundle commands

#### Week 3: Integration & Testing
- Integrate Rails support into CLI
- Test with fantasy-drafter application
- Fix edge cases and improve log parsing

#### Week 4: Polish & Documentation
- Add Rails-specific MCP tools
- Update documentation
- Create example Rails configurations

### Code Sample
```typescript
// src/frameworks/base-framework.ts
export abstract class Framework {
  abstract detect(projectPath: string): Promise<boolean>;
  abstract getDefaultCommand(): string;
  abstract spawnProcess(command: string): ProcessSpawner;
  abstract getLogSources(): LogSource[];
}

// src/frameworks/rails/index.ts
export class RailsFramework extends Framework {
  async detect(projectPath: string): Promise<boolean> {
    return await fileExists(path.join(projectPath, 'Gemfile'));
  }
  
  getDefaultCommand(): string {
    return fileExists('bin/dev') ? 'bin/dev' : 'rails server';
  }
  
  spawnProcess(command: string): ProcessSpawner {
    if (command.includes('bin/dev')) {
      return new ForemanSpawner(command);
    }
    return new SimpleSpawner(command);
  }
}
```

## Approach B: Pragmatic Incremental Addition

### Overview
Add Rails support alongside existing JavaScript ecosystem code with minimal refactoring. Use conditional logic and Rails-specific modules that plug into the existing architecture.

### Pros
- Faster implementation (2-3 weeks)
- Lower risk to existing functionality
- Can ship incrementally
- Simpler to review and merge

### Cons
- Some code duplication
- Less elegant architecture
- Harder to add more frameworks later
- Technical debt for future refactoring

### Implementation Plan

#### Week 1: Add Type Flag & Rails Support
```typescript
// Modify src/cli.ts - add type option
.option('-t, --type <type>', 'Project type (js, rails)', 'js')

// Modify src/dev-environment.ts - use type flag
private getServerCommand(): string {
  // If custom server-command provided, use it (existing behavior)
  if (this.options.serverCommand) {
    return this.options.serverCommand;
  }
  
  // Otherwise use type-specific defaults
  switch(this.options.type) {
    case 'rails':
      return fs.existsSync('bin/dev') ? 'bin/dev' : 'bundle exec rails server';
    case 'js':
    default:
      return this.getPackageScriptCommand();
  }
}
```

#### Week 2: Foreman Output Parsing
```typescript
// New file: src/services/foreman-parser.ts
export class ForemanParser {
  private processes: Map<string, string> = new Map();
  
  parse(line: string): ParsedLog[] {
    // Foreman format: "10:23:45 web.1  | Started GET..."
    const match = line.match(/^\d{2}:\d{2}:\d{2}\s+(\w+)\.\d+\s+\|\s+(.*)$/);
    if (match) {
      const [_, processName, message] = match;
      return [{
        source: `RAILS:${processName.toUpperCase()}`,
        message,
        timestamp: new Date().toISOString()
      }];
    }
    return [];
  }
}

// Modify src/dev-environment.ts
private handleServerOutput(data: Buffer) {
  const text = data.toString();
  
  // Parse Foreman output for Rails projects using bin/dev
  if (this.options.type === 'rails' && this.serverCommand.includes('bin/dev')) {
    const logs = this.foremanParser.parse(text);
    logs.forEach(log => this.writeLog(log));
  } else {
    // Existing logic for JavaScript projects and direct commands
    this.writeLog({ source: 'SERVER', message: text, timestamp: new Date().toISOString() });
  }
}
```

#### Week 3: Rails Log File Monitoring
```typescript
// New file: src/services/rails-log-monitor.ts
export class RailsLogMonitor {
  private watcher?: FSWatcher;
  
  start(logPath: string, callback: (log: LogEntry) => void) {
    // Use tail-like behavior for development.log
    this.watcher = fs.watch(logPath, (eventType) => {
      if (eventType === 'change') {
        // Read new lines and parse Rails format
        const newLines = this.readNewLines(logPath);
        newLines.forEach(line => {
          callback({
            source: 'RAILS:LOG',
            message: this.parseRailsLog(line),
            timestamp: this.extractTimestamp(line)
          });
        });
      }
    });
  }
}
```

### Code Changes Required (Incremental)

1. **Modify `src/cli.ts`**:
   - Add `--type <type>` option (default: 'js')
   - Keep all existing options working

2. **Modify `src/dev-environment.ts`**:
   - Use type flag instead of auto-detection
   - Add conditional logic based on type
   - Add Foreman output parser for Rails with bin/dev

3. **Add new files**:
   - `src/services/foreman-parser.ts` - Parse Foreman prefixed output
   - `src/services/rails-log-monitor.ts` - Monitor Rails log files
   - `src/services/gemfile-detector.ts` - Detect Ruby/Rails projects

4. **Update `package.json`**:
   - Add file watching dependencies if needed

### Migration Path (Incremental to Clean)
If we start with Approach B, we can migrate to Approach A later:
1. Ship Rails support quickly with incremental approach
2. Gather user feedback and real-world usage
3. Refactor to clean architecture in v2.0
4. Maintain backwards compatibility throughout

## Recommendation

**Start with Approach C (OutputParserFactory)** for these reasons:

1. **Fastest Implementation**: 1 week vs 2-3 weeks for Approach B or 4-6 weeks for Approach A
2. **Zero Breaking Changes**: Purely additive, reuses existing `--server-command` flag
3. **No Complex Detection**: Clean command-to-parser mapping, no magic
4. **Immediately Extensible**: Adding Docker, PM2, etc. is trivial
5. **Works Today**: Rails users can already use `--server-command "bin/dev"`, we just improve the output parsing

The OutputParserFactory approach:
- Ships Rails support in days, not weeks
- Requires minimal code changes (~100 lines)
- Maintains perfect backwards compatibility
- Sets foundation for supporting any command-line tool

## Next Steps for OutputParserFactory Approach

1. **Day 1-2**: Create parser infrastructure
   - Implement `OutputParser` base class
   - Create `StandardOutputParser` (existing behavior)
   - Create `ForemanOutputParser` for Rails
   - Build `OutputParserFactory` with command mapping

2. **Day 3-4**: Integrate with DevEnvironment
   - Modify server output handlers to use parsers
   - Test with fantasy-drafter Rails app
   - Ensure no regression for JavaScript projects

3. **Day 5**: Documentation and release
   - Update README with Rails examples
   - Add usage examples for other frameworks
   - Release as minor version (no breaking changes)

## Quick Start Examples

### For Approach C (OutputParserFactory - Recommended)
```bash
# Day 1: Implement parsers
git checkout -b rails-parser-support
# Create src/services/output-parser.ts with factory

# Day 2-3: Test with Rails app
cd /Users/david/dev/breakfast/fantasy-drafter
dev3000 --server-command "bin/dev"
# Should see parsed output:
# [SERVER] [WEB] Started GET "/" 
# [SERVER] [JS] ✓ Built in 150ms
# [SERVER] [CSS] Rebuilding...

# Day 4: Verify no regression
cd any-javascript-project
dev3000  # Should work exactly as before

# Day 5: Ship it
pnpm run build
pnpm run release  # Minor version, no breaking changes
```

### Usage Examples (After Implementation)

```bash
# JavaScript projects (default, unchanged)
dev3000                          # Auto-detects package manager, runs 'dev' script
dev3000 --script build          # Run different script
dev3000 --port 5173            # Vite on different port

# Rails projects (new)
dev3000 --type rails            # Use bin/dev or rails server
dev3000 --type rails --port 4000  # Rails on different port

# Ultimate flexibility (existing feature!)
dev3000 --server-command "python manage.py runserver"  # Django
dev3000 --server-command "mix phx.server"             # Phoenix
dev3000 --server-command "cargo run"                  # Rust
```

## Key Technical Decisions

### Foreman Output Parsing
The fantasy-drafter app shows a typical modern Rails setup where `bin/dev` uses Foreman to run multiple processes. The output looks like:
```
10:23:45 web.1  | Started GET "/" for 127.0.0.1
10:23:45 js.1   | ✓ Built in 150ms
10:23:45 css.1  | Rebuilding...
```

We'll parse this to maintain process separation in logs:
- `[SERVER:WEB]` for Rails server
- `[SERVER:JS]` for JavaScript bundler  
- `[SERVER:CSS]` for CSS compiler

### CLI Design Philosophy (Updated Based on Feedback)

Instead of relying heavily on auto-detection, we'll use a **flag-based approach with smart defaults**:

```bash
# Default behavior (backwards compatible)
dev3000                          # Runs package.json scripts (current behavior)

# Explicit type selection (new)
dev3000 --type rails             # Rails mode with bin/dev
dev3000 --type js                # Explicit JavaScript mode

# Override with custom command (already exists!)
dev3000 --server-command "bin/dev"
dev3000 --server-command "python manage.py runserver"  # Future: Django
```

### Benefits of Flag-Based Approach

1. **No Breaking Changes**: Default behavior unchanged (JavaScript projects)
2. **Explicit Control**: Users specify their framework/language
3. **Future-Proof**: Easy to add `--type django`, `--type laravel`, etc.
4. **No Ambiguity**: Hybrid projects (Rails + package.json) work predictably
5. **Simpler Code**: No complex detection logic or precedence rules

### Implementation Strategy

```typescript
// src/cli.ts
.option('--type <type>', 'Project type (js, rails)', 'js')

// src/dev-environment.ts
private getServerCommand(): string {
  switch(this.options.type) {
    case 'rails':
      return fs.existsSync('bin/dev') ? 'bin/dev' : 'bundle exec rails server';
    case 'js':
    default:
      return this.getPackageScriptCommand();
  }
}
```

### Optional: Config File Support (Future Enhancement)

```json
// .dev3000.json (optional)
{
  "type": "rails",
  "command": "bin/dev",
  "port": 3000
}
```

Priority order:
1. CLI flags (highest priority)
2. Config file
3. Auto-detection (lowest priority)

## Implementation Priority

### Must Have (MVP)
1. Framework auto-detection (Gemfile vs package.json)
2. `bin/dev` process spawning with Foreman parsing
3. Basic Rails stdout/stderr capture
4. Unified log format preservation

### Should Have
1. Rails log file monitoring (development.log)
2. Multiple process coordination via Foreman
3. Proper process termination handling

### Nice to Have (Future)
1. Background job monitoring (Sidekiq)
2. SQL query extraction and analysis
3. Rails-specific MCP tools
4. N+1 query detection

## Success Metrics

- **Functionality**: Successfully monitors Rails servers via bin/dev
- **Compatibility**: Works with Rails 6+ and fantasy-drafter test app
- **Performance**: No degradation vs JavaScript project monitoring
- **User Experience**: Zero configuration required - just run `dev3000`

## Estimated Timeline

### Approach C (OutputParserFactory): 1 week ✅
- Day 1-2: Parser infrastructure
- Day 3-4: Integration and testing
- Day 5: Documentation and release

### Approach B (Incremental): 2-3 weeks
- Week 1: Framework detection and basic Rails support
- Week 2: Foreman parsing and log handling
- Week 3: Testing, documentation, and release

### Approach A (Clean Architecture): 4-6 weeks
- Week 1-2: Foundation refactoring
- Week 3: Rails implementation
- Week 4: Integration and testing
- Week 5-6: Polish and documentation

## Risk Mitigation

### Technical Risks
- **Foreman Output Variations**: Different Foreman versions may format differently
  - *Mitigation*: Test with multiple versions, use flexible regex patterns
  
- **Process Management**: bin/dev spawns multiple child processes
  - *Mitigation*: Track all child PIDs for proper cleanup

### Implementation Risks  
- **Breaking Changes**: Could affect existing JavaScript ecosystem users
  - *Mitigation*: Incremental approach minimizes changes to existing code

## Local Development & Testing Guide

### Development Setup

The key to testing dev3000 locally is using `pnpm link --global`, which creates a symbolic link from the global `dev3000` command to your local development folder:

```bash
# Terminal 1: Keep TypeScript compiling
cd /Users/david/dev/open source/dev3000
pnpm install
pnpm run dev  # Watches for changes, recompiles to dist/

# Terminal 2: Create global link (one time)
cd /Users/david/dev/open source/dev3000
pnpm link --global
# This makes 'dev3000' command point to your LOCAL code, not npm

# Terminal 3: Test anywhere
cd /Users/david/dev/breakfast/fantasy-drafter
dev3000 --server-command "bin/dev"  # Uses your local code!
```

### How pnpm link Works

**Normal Installation (from npm):**
```
/usr/local/bin/dev3000 → ~/.pnpm/global/5/node_modules/dev3000 (npm registry)
```

**After pnpm link --global:**
```
/usr/local/bin/dev3000 → /Users/david/dev/open source/dev3000 (your local code!)
```

This means:
- Changes to your code are reflected immediately (after TypeScript recompiles)
- You test with the actual `dev3000` command, just like users would
- No need to publish to npm or rebuild for each test

### Testing Workflow

#### 1. Test Existing JavaScript Projects (Regression)
```bash
cd any-javascript-project
dev3000  # Should work exactly as before
tail -f /tmp/dev3000.log  # Verify [SERVER] logs look normal
```

#### 2. Test Rails with Foreman
```bash
cd /Users/david/dev/breakfast/fantasy-drafter
dev3000 --server-command "bin/dev"

# Before parser implementation:
# [SERVER] 10:23:45 web.1  | Started GET "/"

# After parser implementation:
# [SERVER] [WEB] Started GET "/"
```

#### 3. Quick Iteration
```bash
# Make changes
vim src/services/output-parser.ts

# TypeScript recompiles automatically (watch mode in Terminal 1)
# Test immediately - no manual rebuild!
dev3000 --server-command "bin/dev"
```

### Cleanup

When done developing:
```bash
# Remove the global link
pnpm unlink --global dev3000

# To reinstall the published version
pnpm install -g dev3000
```

### Alternative: Direct Execution (No Linking)

If you prefer not to use global linking:
```bash
# Direct execution
node /Users/david/dev/open\ source/dev3000/dist/cli.js --server-command "bin/dev"

# Or create an alias
alias dev3000-local="node /Users/david/dev/open\ source/dev3000/dist/cli.js"
dev3000-local --server-command "bin/dev"
```

## Conclusion

The **OutputParserFactory approach (Approach C)** is the clear winner:

1. **Minimal Code Changes**: ~100 lines of new code, no modifications to existing logic
2. **Fastest Delivery**: 1 week implementation vs 2-3 weeks (Approach B) or 4-6 weeks (Approach A)
3. **Zero Risk**: Purely additive, no breaking changes possible
4. **Already Partially Working**: Rails users can use `--server-command "bin/dev"` today
5. **Future-Proof**: Easy to add parsers for Docker, PM2, or any other tool

The fantasy-drafter application provides an excellent test case with its modern Rails 7.2 setup using bin/dev, esbuild, and Tailwind. With the OutputParserFactory, these logs will be cleanly separated by process type, making debugging much easier for Rails developers.