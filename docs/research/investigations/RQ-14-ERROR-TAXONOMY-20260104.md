# RQ-14: CLI Error Taxonomy

**Date:** 2026-01-04  
**Status:** Research Complete  
**Priority:** P1  
**Question:** What error taxonomy should we use for CLI error messages and exit codes?

---

## 1. Problem Statement

CLI tools need consistent error handling for:

- User-friendly error messages
- Scriptable exit codes
- Retryable vs fatal error classification
- Debug information without overwhelming users

---

## 2. Vendor Evidence

### 2.1 MCP Standard Error Codes

**Source:** [vendor/mcp/specification](../../../vendor/mcp/specification) (JSON-RPC 2.0 based)

```typescript
// JSON-RPC standard error codes
const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700, // Invalid JSON
  INVALID_REQUEST: -32600, // Not a valid request
  METHOD_NOT_FOUND: -32601, // Method doesn't exist
  INVALID_PARAMS: -32602, // Invalid method parameters
  INTERNAL_ERROR: -32603, // Internal JSON-RPC error

  // Custom range: -32000 to -32099
  SERVER_ERROR: -32000, // Generic server error
};
```

### 2.2 n8n Error Hierarchy

**Source:** [vendor/orchestration/n8n/packages/workflow/src/errors](../../../vendor/orchestration/n8n/packages/workflow/src/errors)

```typescript
// n8n error class hierarchy
class WorkflowError extends Error {
  code: string; // Semantic error code
  httpCode?: number; // HTTP status equivalent
  node?: string; // Node that caused error
  description?: string; // User-friendly description
  cause?: Error; // Original error
}

class NodeOperationError extends WorkflowError {
  constructor(node: INode, message: string, options?: ErrorOptions) {
    super(message);
    this.code = 'NODE_OPERATION_ERROR';
    this.node = node.name;
  }
}

class NodeConnectionError extends WorkflowError {
  constructor(node: INode, message: string) {
    super(message);
    this.code = 'NODE_CONNECTION_ERROR';
  }
}
```

### 2.3 POSIX Exit Codes

**Standard Unix conventions:**

| Code | Meaning                              | Retryable |
| ---- | ------------------------------------ | --------- |
| 0    | Success                              | N/A       |
| 1    | General error                        | Maybe     |
| 2    | Misuse of command                    | No        |
| 126  | Command not executable               | No        |
| 127  | Command not found                    | No        |
| 128  | Invalid exit argument                | No        |
| 130  | Script terminated by Ctrl+C (SIGINT) | No        |
| 137  | Process killed (SIGKILL)             | Maybe     |
| 143  | SIGTERM                              | Maybe     |

---

## 3. Error Categories

### 3.1 Classification by Retryability

```typescript
enum ErrorRetryability {
  /** Retry will likely succeed (network timeout, rate limit) */
  RETRYABLE = 'retryable',

  /** Retry after user action (fix config, provide input) */
  USER_FIXABLE = 'user_fixable',

  /** Retry won't help (code bug, invalid input) */
  FATAL = 'fatal',

  /** Unknown (should be classified) */
  UNKNOWN = 'unknown',
}
```

### 3.2 Classification by Source

```typescript
enum ErrorSource {
  /** User provided invalid input */
  USER_INPUT = 'user_input',

  /** Configuration problem */
  CONFIG = 'config',

  /** External service failure */
  EXTERNAL = 'external',

  /** Internal bug */
  INTERNAL = 'internal',

  /** Resource exhaustion */
  RESOURCE = 'resource',
}
```

---

## 4. Recommended Error Codes

### 4.1 Exit Code Mapping

```typescript
// Exit codes for content-machine CLI
export const EXIT_CODES = {
  SUCCESS: 0,

  // User errors (1-19)
  INVALID_ARGS: 1, // Invalid CLI arguments
  INVALID_CONFIG: 2, // Config file error
  MISSING_INPUT: 3, // Required input missing
  INVALID_INPUT: 4, // Input validation failed

  // External errors (20-39)
  NETWORK_ERROR: 20, // Network request failed
  API_ERROR: 21, // External API returned error
  RATE_LIMIT: 22, // Rate limited
  AUTH_ERROR: 23, // Authentication failed

  // Resource errors (40-59)
  FILE_NOT_FOUND: 40, // File doesn't exist
  PERMISSION_DENIED: 41, // Permission error
  DISK_FULL: 42, // Out of disk space
  MEMORY_EXHAUSTED: 43, // Out of memory

  // Pipeline errors (60-79)
  SCRIPT_FAILED: 60, // Script generation failed
  AUDIO_FAILED: 61, // TTS/audio failed
  VISUALS_FAILED: 62, // Visual asset failed
  RENDER_FAILED: 63, // Video rendering failed

  // Internal errors (100+)
  INTERNAL_ERROR: 100, // Unexpected internal error
  NOT_IMPLEMENTED: 101, // Feature not implemented

  // Signals
  SIGINT: 130, // Ctrl+C
  SIGTERM: 143, // Termination signal
} as const;
```

### 4.2 Semantic Error Codes

```typescript
// String codes for logging and debugging
export const ERROR_CODES = {
  // Input validation
  E_INVALID_JSON: 'E_INVALID_JSON',
  E_SCHEMA_VALIDATION: 'E_SCHEMA_VALIDATION',
  E_MISSING_FIELD: 'E_MISSING_FIELD',

  // Configuration
  E_CONFIG_NOT_FOUND: 'E_CONFIG_NOT_FOUND',
  E_CONFIG_INVALID: 'E_CONFIG_INVALID',
  E_ENV_MISSING: 'E_ENV_MISSING',

  // External services
  E_NETWORK_TIMEOUT: 'E_NETWORK_TIMEOUT',
  E_API_RESPONSE: 'E_API_RESPONSE',
  E_RATE_LIMITED: 'E_RATE_LIMITED',
  E_AUTH_FAILED: 'E_AUTH_FAILED',

  // LLM
  E_LLM_TIMEOUT: 'E_LLM_TIMEOUT',
  E_LLM_PARSE: 'E_LLM_PARSE',
  E_LLM_RATE_LIMIT: 'E_LLM_RATE_LIMIT',
  E_LLM_CONTENT_FILTER: 'E_LLM_CONTENT_FILTER',

  // Audio
  E_TTS_FAILED: 'E_TTS_FAILED',
  E_AUDIO_ENCODE: 'E_AUDIO_ENCODE',

  // Visuals
  E_ASSET_NOT_FOUND: 'E_ASSET_NOT_FOUND',
  E_ASSET_DOWNLOAD: 'E_ASSET_DOWNLOAD',

  // Rendering
  E_REMOTION_CRASH: 'E_REMOTION_CRASH',
  E_FFMPEG_FAILED: 'E_FFMPEG_FAILED',
  E_MEMORY_EXCEEDED: 'E_MEMORY_EXCEEDED',

  // Internal
  E_INTERNAL: 'E_INTERNAL',
  E_ASSERTION: 'E_ASSERTION',
} as const;
```

---

## 5. Error Class Implementation

### 5.1 Base Error Class

```typescript
// src/common/errors.ts
import { EXIT_CODES, ERROR_CODES } from './error-codes';

interface ContentMachineErrorOptions {
  code: keyof typeof ERROR_CODES;
  exitCode: number;
  retryable: boolean;
  cause?: Error;
  context?: Record<string, unknown>;
  suggestion?: string;
}

export class ContentMachineError extends Error {
  readonly code: string;
  readonly exitCode: number;
  readonly retryable: boolean;
  readonly context: Record<string, unknown>;
  readonly suggestion?: string;
  readonly cause?: Error;
  readonly timestamp: Date;

  constructor(message: string, options: ContentMachineErrorOptions) {
    super(message);
    this.name = 'ContentMachineError';
    this.code = options.code;
    this.exitCode = options.exitCode;
    this.retryable = options.retryable;
    this.context = options.context ?? {};
    this.suggestion = options.suggestion;
    this.cause = options.cause;
    this.timestamp = new Date();

    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      exitCode: this.exitCode,
      retryable: this.retryable,
      context: this.context,
      suggestion: this.suggestion,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}
```

### 5.2 Specialized Error Classes

```typescript
export class ValidationError extends ContentMachineError {
  constructor(message: string, options: { field?: string; cause?: Error }) {
    super(message, {
      code: 'E_SCHEMA_VALIDATION',
      exitCode: EXIT_CODES.INVALID_INPUT,
      retryable: false,
      cause: options.cause,
      context: options.field ? { field: options.field } : {},
      suggestion: 'Check your input and try again.',
    });
    this.name = 'ValidationError';
  }
}

export class NetworkError extends ContentMachineError {
  constructor(message: string, options: { url?: string; cause?: Error }) {
    super(message, {
      code: 'E_NETWORK_TIMEOUT',
      exitCode: EXIT_CODES.NETWORK_ERROR,
      retryable: true,
      cause: options.cause,
      context: options.url ? { url: options.url } : {},
      suggestion: 'Check your network connection and try again.',
    });
    this.name = 'NetworkError';
  }
}

export class RenderError extends ContentMachineError {
  constructor(message: string, options: { stage?: string; cause?: Error }) {
    super(message, {
      code: 'E_REMOTION_CRASH',
      exitCode: EXIT_CODES.RENDER_FAILED,
      retryable: false,
      cause: options.cause,
      context: options.stage ? { stage: options.stage } : {},
      suggestion: 'Check render logs for details.',
    });
    this.name = 'RenderError';
  }
}
```

---

## 6. CLI Error Display

### 6.1 User-Friendly Output

```typescript
function formatErrorForCLI(error: ContentMachineError): string {
  const lines: string[] = [];

  // Error header with color
  lines.push(chalk.red(`✖ Error [${error.code}]`));
  lines.push('');
  lines.push(error.message);

  // Suggestion if available
  if (error.suggestion) {
    lines.push('');
    lines.push(chalk.yellow('Suggestion: ') + error.suggestion);
  }

  // Context for debugging
  if (Object.keys(error.context).length > 0) {
    lines.push('');
    lines.push(chalk.dim('Context:'));
    for (const [key, value] of Object.entries(error.context)) {
      lines.push(chalk.dim(`  ${key}: ${JSON.stringify(value)}`));
    }
  }

  // Retry hint
  if (error.retryable) {
    lines.push('');
    lines.push(chalk.blue('This error may be temporary. Retry with: cm retry'));
  }

  return lines.join('\n');
}
```

### 6.2 Verbose Mode

```typescript
function formatErrorVerbose(error: ContentMachineError): string {
  const base = formatErrorForCLI(error);
  const lines = [base, ''];

  // Stack trace
  if (error.stack) {
    lines.push(chalk.dim('Stack trace:'));
    lines.push(chalk.dim(error.stack));
  }

  // Cause chain
  if (error.cause) {
    lines.push('');
    lines.push(chalk.dim('Caused by:'));
    lines.push(chalk.dim(error.cause.stack ?? error.cause.message));
  }

  return lines.join('\n');
}
```

---

## 7. Error Logging

### 7.1 Structured Logging

```typescript
function logError(error: ContentMachineError): void {
  const logEntry = {
    level: 'error',
    ...error.toJSON(),
    processId: process.pid,
    hostname: os.hostname(),
  };

  // JSON log for machine parsing
  console.error(JSON.stringify(logEntry));

  // Also write to error log file
  appendFile('./logs/errors.jsonl', JSON.stringify(logEntry) + '\n');
}
```

---

## 8. Implementation Recommendations

| Pattern              | Priority | Location                 |
| -------------------- | -------- | ------------------------ |
| Exit code constants  | P0       | src/common/exit-codes.ts |
| Base error class     | P0       | src/common/errors.ts     |
| Error display helper | P0       | src/cli/error-display.ts |
| Specialized errors   | P1       | src/\*/errors.ts         |
| Error logging        | P1       | src/common/logger.ts     |
| Retry detection      | P2       | src/pipeline/retry.ts    |

---

## 9. References

- [vendor/mcp/specification](../../../vendor/mcp/specification) — JSON-RPC error codes
- [vendor/orchestration/n8n](../../../vendor/orchestration/n8n) — Error hierarchy pattern
- [POSIX Exit Codes](https://tldp.org/LDP/abs/html/exitcodes.html) — Standard conventions
- [SECTION-CLI-ARCHITECTURE-20260104.md](../sections/SECTION-CLI-ARCHITECTURE-20260104.md) — CLI design
