# Output Parser Refactor Plan

## Problem Statement

The current implementation conflates two separate concerns:
1. **Process Manager Format** - How logs are formatted (e.g., Foreman's `HH:MM:SS process.1 | message`)
2. **Framework Error Detection** - Which errors are critical (e.g., Rails' `ActiveRecord::Error`)

This creates incorrect assumptions:
- `bin/dev` is assumed to mean Rails + Foreman
- A Node.js app using Foreman would get Rails error detection
- A Rails app using Docker Compose wouldn't get proper parsing

## Proposed Architecture

### Core Principle: Separation of Concerns

```typescript
// Two independent responsibilities
interface FormatParser {
  parse(text: string): ParsedLine[];
}

interface ErrorDetector {
  isCritical(message: string): boolean;
}

// Composed together
class OutputProcessor {
  constructor(
    private formatParser: FormatParser,
    private errorDetector: ErrorDetector
  ) {}
  
  process(text: string, isError: boolean): LogEntry[] {
    const parsed = this.formatParser.parse(text);
    return parsed.map(line => ({
      formatted: line.formatted,
      isCritical: isError && this.errorDetector.isCritical(line.message),
      rawMessage: isError ? line.message : undefined
    }));
  }
}
```

## Implementation Details

### 1. Format Parsers (Process Manager Layer)

```typescript
// Base interface
interface FormatParser {
  parse(text: string): ParsedLine[];
}

interface ParsedLine {
  formatted: string;  // Display format
  message: string;    // Raw message for error detection
  processName?: string;  // Optional process identifier
}

// Implementations
class StandardFormatParser implements FormatParser {
  // Direct passthrough - no special formatting
}

class ForemanFormatParser implements FormatParser {
  // Parses: "10:23:45 web.1 | Started GET /"
  // Returns: { formatted: "[WEB] Started GET /", message: "Started GET /", processName: "web" }
}

class DockerComposeFormatParser implements FormatParser {
  // Parses: "container_1 | [2024-01-01] Starting server"
  // Returns: { formatted: "[CONTAINER] [2024-01-01] Starting server", ... }
}

class PM2FormatParser implements FormatParser {
  // Parses PM2 JSON logs or formatted output
}
```

### 2. Error Detectors (Framework Layer)

```typescript
// Base interface
interface ErrorDetector {
  isCritical(message: string): boolean;
}

// Base implementation with system errors
class BaseErrorDetector implements ErrorDetector {
  isCritical(message: string): boolean {
    // System-level errors all frameworks care about
    return message.includes('EADDRINUSE') || 
           message.includes('EACCES') || 
           message.includes('ENOENT');
  }
}

// Framework-specific implementations
class RailsErrorDetector extends BaseErrorDetector {
  isCritical(message: string): boolean {
    if (super.isCritical(message)) return true;
    
    // Rails-specific critical errors
    const criticalPatterns = [
      /LoadError:/,
      /ActiveRecord::.*Error/,
      /PG::ConnectionBad/,
      // etc...
    ];
    
    // Rails-specific exclusions
    const nonCriticalPatterns = [
      /DEPRECATION WARNING/,
      /asset.*not found/i,
    ];
    
    if (nonCriticalPatterns.some(p => p.test(message))) return false;
    return criticalPatterns.some(p => p.test(message));
  }
}

class NextJsErrorDetector extends BaseErrorDetector {
  isCritical(message: string): boolean {
    if (super.isCritical(message)) return true;
    
    // Next.js specific logic
    return (message.includes('FATAL') && !message.includes('generateStaticParams')) ||
           (message.includes('Cannot find module') && !message.includes('.next'));
  }
}

class DjangoErrorDetector extends BaseErrorDetector {
  // Django-specific patterns
}
```

### 3. Factories with Smart Detection

```typescript
class FormatParserFactory {
  static create(processManager: string | 'auto', serverCommand?: string): FormatParser {
    if (processManager === 'auto' && serverCommand) {
      processManager = this.detectProcessManager(serverCommand);
    }
    
    switch (processManager) {
      case 'foreman':
      case 'overmind':
      case 'hivemind':
        return new ForemanFormatParser();
      case 'docker-compose':
        return new DockerComposeFormatParser();
      case 'pm2':
        return new PM2FormatParser();
      default:
        return new StandardFormatParser();
    }
  }
  
  private static detectProcessManager(serverCommand: string): string {
    if (serverCommand.includes('bin/dev') || 
        serverCommand.includes('foreman') ||
        serverCommand.includes('overmind')) {
      return 'foreman';
    }
    if (serverCommand.includes('docker-compose')) {
      return 'docker-compose';
    }
    if (serverCommand.includes('pm2')) {
      return 'pm2';
    }
    return 'standard';
  }
}

class ErrorDetectorFactory {
  static create(framework: string | 'auto', serverCommand?: string): ErrorDetector {
    if (framework === 'auto' && serverCommand) {
      framework = this.detectFramework(serverCommand);
    }
    
    switch (framework) {
      case 'rails':
        return new RailsErrorDetector();
      case 'nextjs':
        return new NextJsErrorDetector();
      case 'django':
        return new DjangoErrorDetector();
      default:
        return new BaseErrorDetector();
    }
  }
  
  private static detectFramework(serverCommand: string): string {
    if (serverCommand.includes('rails') || serverCommand.includes('bin/dev')) {
      return 'rails';
    }
    if (serverCommand.includes('next')) {
      return 'nextjs';
    }
    if (serverCommand.includes('django') || serverCommand.includes('manage.py')) {
      return 'django';
    }
    return 'unknown';
  }
}
```

## CLI Interface

### New Options

```typescript
interface CLIOptions {
  // Existing
  serverCommand: string;  // What to run
  
  // New (with smart defaults)
  framework?: 'rails' | 'nextjs' | 'django' | 'express' | 'auto';  // default: 'auto'
  processManager?: 'foreman' | 'standard' | 'docker-compose' | 'pm2' | 'auto';  // default: 'auto'
}
```

### Usage Examples

```bash
# Minimal - uses smart detection
dev3000 --server-command "bin/dev"
# Auto-detects: foreman + rails

# Override when detection is wrong
dev3000 --server-command "bin/dev" --framework node
# bin/dev running a Node.js app with Foreman

# Explicit configuration
dev3000 --server-command "./start.sh" --framework rails --process-manager foreman
# Custom script with explicit config

# Rails without process manager
dev3000 --server-command "rails server"
# Auto-detects: standard + rails

# Node.js with Foreman
dev3000 --server-command "foreman start -f Procfile.dev" --framework express
# Auto-detects: foreman, manually specifies: express
```

## Migration Path

### Phase 1: Refactor Current Code (This PR)
1. Create new separated architecture
2. Migrate existing `ForemanOutputParser` → `ForemanFormatParser` + `RailsErrorDetector`
3. Migrate existing `StandardOutputParser` → `StandardFormatParser` + `NextJsErrorDetector`
4. Maintain backward compatibility

### Phase 2: Add CLI Flags (Next PR)
1. Add `--framework` and `--process-manager` flags
2. Implement auto-detection logic
3. Update documentation

### Phase 3: Expand Support (Future PRs)
1. Add more format parsers (Docker, PM2)
2. Add more error detectors (Django, Express, Laravel)
3. Consider config file support for complex setups

### Phase 4: Nested Process Manager Support (Future Enhancement)
1. Implement variadic `--process-manager` option for chained parsers
2. Support nested format parsing (e.g., Docker Compose wrapping Foreman)
3. Auto-detect common nesting patterns

## Benefits

1. **Correct Behavior**: Each combination works correctly (Rails+Docker, Node+Foreman, etc.)
2. **Extensibility**: Easy to add new frameworks or process managers independently
3. **Clarity**: Clear separation of concerns makes code easier to understand
4. **Flexibility**: Users can mix and match any framework with any process manager
5. **Smart Defaults**: Most users won't need to specify flags
6. **Backward Compatible**: Existing usage patterns continue to work

## Testing Strategy

### Unit Tests
```typescript
describe('FormatParsers', () => {
  describe('ForemanFormatParser', () => {
    it('should parse foreman format correctly');
    it('should handle process names with hyphens');
    it('should handle millisecond timestamps');
  });
});

describe('ErrorDetectors', () => {
  describe('RailsErrorDetector', () => {
    it('should detect Rails-specific errors');
    it('should exclude deprecation warnings');
    it('should inherit system errors from base');
  });
});
```

### Integration Tests
```typescript
describe('OutputProcessor', () => {
  it('should correctly combine Rails+Foreman');
  it('should correctly combine NextJS+Standard');
  it('should correctly combine Rails+DockerCompose');
});
```

### E2E Tests
- Test actual Rails app with `bin/dev`
- Test Node.js app with Foreman
- Test Rails app with `rails server`
- Test with explicit flag overrides

## Future Enhancement: Chaining Format Parsers

### Problem: Nested Process Managers
When using Docker Compose with Rails `bin/dev` (Foreman), logs have multiple format layers:
```bash
# Raw output from docker-compose up
web_1     | 10:23:45 web.1  | Started GET "/" for 127.0.0.1
web_1     | 10:23:45 js.1   | ✓ Built in 150ms
redis_1   | 1:M 01 Jan 2024 10:23:45.123 * Ready to accept connections
```

### Solution: Parser Chaining with Variadic Options

#### CLI Interface
```typescript
// Using Commander.js variadic options
program
  .option('--process-manager <managers...>', 
          'Process manager(s) in parsing order (outer to inner)', 
          ['auto'])
  .option('--framework <framework>', 
          'Framework for error detection', 
          'auto')
```

#### Usage Examples
```bash
# Single process manager
dev3000 --process-manager foreman

# Chained parsers for Docker + Foreman
dev3000 --process-manager docker-compose foreman --framework rails

# The order matters: outer to inner
# docker-compose parses first, then foreman parses the extracted message
```

#### Implementation Architecture
```typescript
class ParserChain implements FormatParser {
  private parsers: FormatParser[];
  
  constructor(managerNames: string[]) {
    // Build parser chain from configuration
    this.parsers = managerNames.map(name => 
      FormatParserFactory.createSingle(name)
    );
  }
  
  parse(text: string): ParsedLine[] {
    // Initial line structure
    let lines: ParsedLine[] = [{
      formatted: text,
      message: text,
      metadata: {}
    }];
    
    // Apply each parser in sequence
    for (const parser of this.parsers) {
      lines = lines.flatMap(line => {
        const parsed = parser.parse(line.message);
        return parsed.map(p => ({
          ...p,
          // Accumulate formatting from each layer
          formatted: this.combineFormatting(line, p),
          // Preserve innermost message for error detection
          message: p.message,
          // Merge metadata from all layers
          metadata: { ...line.metadata, ...p.metadata }
        }));
      });
    }
    
    return lines;
  }
  
  private combineFormatting(outer: ParsedLine, inner: ParsedLine): string {
    // Smart formatting that doesn't duplicate prefixes
    // e.g., [WEB] [WEB] becomes [WEB:WEB], or just [WEB]
    return this.mergeFormats(outer.formatted, inner.formatted);
  }
}

// Factory updates
class FormatParserFactory {
  static create(managers: string[]): FormatParser {
    if (managers.length === 1 && managers[0] === 'auto') {
      return this.createAuto();
    }
    
    if (managers.length === 1) {
      return this.createSingle(managers[0]);
    }
    
    // Multiple managers = chained parsing
    return new ParserChain(managers);
  }
  
  static createSingle(manager: string): FormatParser {
    switch (manager) {
      case 'docker-compose': return new DockerComposeFormatParser();
      case 'foreman': return new ForemanFormatParser();
      case 'pm2': return new PM2FormatParser();
      default: return new StandardFormatParser();
    }
  }
}
```

#### Example Processing Flow

```typescript
// Input: "web_1     | 10:23:45 web.1  | Started GET '/'"

// Step 1: DockerComposeFormatParser
{
  formatted: "[WEB]",
  message: "10:23:45 web.1  | Started GET '/'",
  metadata: { container: "web" }
}

// Step 2: ForemanFormatParser (processes the message)
{
  formatted: "[WEB] [WEB]", // Or smart combination: "[WEB:RAILS]"
  message: "Started GET '/'",
  metadata: { container: "web", process: "web", timestamp: "10:23:45" }
}

// Step 3: Error detection only looks at final message
errorDetector.isCritical("Started GET '/'") // = false
```

### Benefits of This Approach
1. **Composable**: Any combination of parsers can be chained
2. **Order matters**: Reflects real-world log nesting accurately  
3. **Clean separation**: Each parser only knows its own format
4. **Metadata preservation**: Each layer can add context
5. **Future-proof**: Easy to add new process managers

### Implementation Notes
- Start with single parser support (Phase 1-3)
- Add chaining support as Phase 4 enhancement
- Consider smart format combination to avoid redundant prefixes
- Preserve all metadata for potential debugging use

### Alternative: Configuration File Support

Instead of long CLI commands, support a `.dev3000.json` config file:

```json
{
  "serverCommand": "docker-compose up",
  "processManagers": ["docker-compose", "foreman"],
  "framework": "rails"
}
```

This would allow:
```bash
# Instead of:
dev3000 --server-command "docker-compose up" --process-manager docker-compose foreman --framework rails

# Just:
dev3000
# (reads from .dev3000.json in project root)

# Or override specific values:
dev3000 --framework django
# (uses config file but overrides framework)
```

Benefits:
- Cleaner for complex setups
- Project-specific configuration
- Shareable with team via version control
- Reduces command-line complexity for parser chains

Config file detection order:
1. `.dev3000.json` in current directory
2. `dev3000.config.json` in current directory  
3. CLI flags override config file values
4. Auto-detection as fallback

## Phase 3: Simplify Auto-Detection API (Future Enhancement)

### Problem: Repetitive "auto" Defaults
Currently, we default to "auto" in multiple places throughout the codebase:
- CLI option defaults: `'auto'`
- DevEnvironment constructor: `options.processManager || 'auto'`
- Factory method parameters: `processManager: ProcessManager | string = 'auto'`

This repetition is a code smell that could be improved.

### Proposed Solutions

#### Option 1: Make `undefined` Mean Auto-Detect (Recommended)
Treat `undefined` as the signal for auto-detection, eliminating "auto" as an explicit value:

```typescript
// Simplified types (remove 'auto')
type ProcessManager = 'foreman' | 'docker-compose' | 'pm2' | 'standard';
type Framework = 'rails' | 'nextjs' | 'django' | 'express';

// Factory methods with natural undefined handling
static create(
  serverCommand: string,
  processManager?: ProcessManager,  // undefined = auto-detect
  framework?: Framework             // undefined = auto-detect
) {
  // Auto-detect when undefined
  if (!processManager && serverCommand) {
    processManager = this.detectProcessManager(serverCommand);
  }
}

// CLI needs no default value
.option('--framework <framework>', 'Framework for error detection')
// undefined naturally flows through the system
```

**Benefits:**
- Cleaner API - users don't need to know about "auto"
- Less code - no need to specify defaults everywhere
- Natural cascading - `undefined` flows through naturally
- Backwards compatible - can still accept "auto" for explicit requests

#### Option 2: Configuration Object Pattern
Create a single configuration object that handles all defaults in one place:

```typescript
interface ParserConfig {
  serverCommand: string;
  processManager?: ProcessManager | 'auto';
  framework?: Framework | 'auto';
}

class ParserConfigDefaults {
  static apply(config: ParserConfig): Required<ParserConfig> {
    return {
      serverCommand: config.serverCommand,
      processManager: config.processManager ?? 'auto',
      framework: config.framework ?? 'auto'
    };
  }
}
```

**Benefits:**
- Single source of truth for defaults
- Easy to extend with new options
- Clear separation of concerns

#### Option 3: Factory-Level Default Handling
Make factories handle defaults internally once:

```typescript
export class OutputProcessorFactory {
  private static readonly DEFAULT_PROCESS_MANAGER = 'auto';
  private static readonly DEFAULT_FRAMEWORK = 'auto';
  
  static create(
    serverCommand: string,
    processManager?: ProcessManager | string,
    framework?: Framework | string
  ): OutputProcessor {
    const pm = processManager ?? this.DEFAULT_PROCESS_MANAGER;
    const fw = framework ?? this.DEFAULT_FRAMEWORK;
    // ...
  }
}
```

**Benefits:**
- Centralized default values
- Easy to change defaults
- Clear documentation of what defaults are

#### Option 4: Type Alias for Auto-Detectable
Create a type that makes the auto behavior explicit:

```typescript
type AutoDetectable<T> = T | 'auto' | undefined;

// Use throughout the codebase
processManager: AutoDetectable<ProcessManager> = undefined
```

**Benefits:**
- Type-safe and explicit
- Self-documenting
- Flexible for different default behaviors

### Recommendation
**Option 1 (undefined = auto)** is the most idiomatic TypeScript/JavaScript approach and would provide the cleanest API. It aligns with how optional parameters typically work in the ecosystem.

### Implementation Impact
- Minimal breaking changes if "auto" is still accepted
- Simplifies mental model for users
- Reduces code throughout the codebase
- Makes the API more intuitive

## Open Questions

1. **Config File Support**: Should we support `.dev3000rc` for project-specific settings?
2. **Framework Detection**: Should we look for `Gemfile`, `package.json`, etc. for better auto-detection?
3. **Custom Patterns**: Should users be able to define custom error patterns?
4. **Logging Verbosity**: Should we log which parser/detector was selected for debugging?

## Timeline

- **Week 1**: Refactor to separated architecture (maintain current functionality) ✅
- **Week 2**: Add CLI flags and smart detection ✅
- **Week 3**: Add tests and documentation ✅
- **Future**: Add support for more frameworks and process managers as needed
- **Future**: Implement Phase 3 (Simplify Auto-Detection API)
- **Future**: Implement Phase 4 (Chaining Format Parsers)

## Alternative Architecture Considerations

### Current Implementation (Class-Based OOP)
The refactor implemented a class-based architecture with inheritance hierarchies. While this works well, there are alternative approaches to consider for future iterations:

### Alternative Architectures Analyzed

#### Option 1: Pure Functional Approach
```typescript
// Pure functions with type guards
export type FormatParser = (text: string) => ParsedLine[];

const FOREMAN_REGEX = /^(\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s+([\w-]+)\.(\d+)\s+\|\s*(.*)$/;

export const parseForeman: FormatParser = (text) => {
  if (!text?.trim()) return [];
  
  return text.trim().split('\n').filter(Boolean).map(line => {
    const match = line.match(FOREMAN_REGEX);
    // ... parsing logic
  });
};

// Simple map-based factory
const PARSER_MAP: Record<string, FormatParser> = {
  foreman: parseForeman,
  standard: parseStandard,
};
```

#### Option 2: Object Literal Approach
```typescript
// Object factories without classes
export const foremanParser = {
  regex: /^(\d{2}:\d{2}:\d{2}(?:\.\d{3})?)\s+([\w-]+)\.(\d+)\s+\|\s*(.*)$/,
  
  parse(text: string): ParsedLine[] {
    if (!text?.trim()) return [];
    // ... parsing logic
  }
};
```

#### Option 3: Functional Composition with Pipelines
```typescript
// Composable transformation functions
const pipe = <T>(...fns: Array<(arg: any) => any>) => 
  (val: T) => fns.reduce((prev, fn) => fn(prev), val);

const processOutput = pipe(
  splitLines,
  (lines: string[]) => lines.map(parseForeman),
  (entries: ParsedLine[]) => entries.map(detectErrors('rails'))
);
```

### Performance Characteristics (Benchmarked)

Based on performance testing with 100,000+ iterations on typical log data:

#### Throughput Performance (ops/sec)
- **Object Literal**: ~492,589 ops/sec (fastest)
- **Pure Functional**: ~485,052 ops/sec (1.5% slower than object literal)
- **Class-based (current)**: ~467,150 ops/sec (5% slower than object literal)

#### Memory Usage
- **Class instances (1000x)**: 103.38 KB
- **Functional approach**: 0.22 KB (470x less memory)
- **Object literal**: 0.22 KB (470x less memory)

#### Key Findings
1. **V8 Optimization**: Modern V8 automatically caches regex literals - no performance difference between inline regex and const regex
2. **Non-matching lines**: Process 4-5x faster than matching lines (important for mixed log formats)
3. **Singleton vs Multiple Instances**: Memory differences only matter with multiple instances

### Recommendation

**For dev3000's current use case** (single parser instance created at startup):
- Current class-based approach is fine - performance differences are negligible
- Architecture choice should prioritize maintainability over micro-optimizations

**If this were a library** or needed multiple parser instances:
- Pure functional approach would be optimal (better memory usage, tree-shaking, testing)
- Object literal approach provides good middle ground

**For future refactoring**, consider:
1. If adding many more parsers/detectors → Pure functional for better modularity
2. If keeping current scope → Current architecture is adequate
3. If maximizing performance → Object literal (marginally fastest)

The bottleneck for log processing is typically I/O, not parsing logic. All approaches can handle 400k+ ops/sec, far exceeding typical log volumes.