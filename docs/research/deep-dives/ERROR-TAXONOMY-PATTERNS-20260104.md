# CLI Error Taxonomy Patterns Research

**Date:** 2026-01-04  
**Status:** Complete  
**Sources:** n8n, MCP SDK, short-video-maker-gyori, Remotion, external CLIs

---

## Executive Summary

Research into vendored repos reveals several mature error handling patterns for CLI applications. Key findings:

1. **JSON-RPC Error Codes** (MCP SDK) - Standard numeric codes for protocol errors
2. **Hierarchical Error Classes** (n8n) - Base error classes with levels and reporting
3. **Semantic Error Categorization** (n8n) - User/Operational/Unexpected error types
4. **Flaky Error Detection** (Remotion) - Pattern matching for retryable conditions
5. **Structured Validation Errors** (short-video-maker-gyori) - Zod + JSON error responses

---

## 1. Error Code Systems

### MCP SDK - JSON-RPC Standard Error Codes

**Source:** [vendor/mcp/mcp-python-sdk/src/mcp/types.py](vendor/mcp/mcp-python-sdk/src/mcp/types.py#L186-L190)

```python
# Standard JSON-RPC error codes (MCP SDK)
PARSE_ERROR = -32700       # Invalid JSON was received
INVALID_REQUEST = -32600   # The request was not valid JSON-RPC
METHOD_NOT_FOUND = -32601  # The method does not exist
INVALID_PARAMS = -32602    # Invalid method parameters
INTERNAL_ERROR = -32603    # Internal server error

# SDK-specific error codes
CONNECTION_CLOSED = -32000 # Connection was closed unexpectedly
# REQUEST_TIMEOUT = -32001  # (TypeScript SDK uses this)
```

**Usage Example:**

```python
from mcp import types

raise McpError(ErrorData(
    code=types.INVALID_PARAMS,
    message="Tool 'unknown' not found",
    data={"available_tools": ["list", "get", "create"]}
))
```

### n8n - String-Based Error Code Constants

**Source:** [vendor/orchestration/n8n/.../evaluation.constants.ts](vendor/orchestration/n8n/packages/frontend/editor-ui/src/features/ai/evaluation.ee/evaluation.constants.ts)

```typescript
// Semantic error codes (n8n evaluation system)
const TEST_CASE_EXECUTION_ERROR_CODE = {
  MOCKED_NODE_NOT_FOUND: 'MOCKED_NODE_NOT_FOUND',
  FAILED_TO_EXECUTE_WORKFLOW: 'FAILED_TO_EXECUTE_WORKFLOW',
  INVALID_METRICS: 'INVALID_METRICS',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NO_METRICS_COLLECTED: 'NO_METRICS_COLLECTED',
} as const;

const TEST_RUN_ERROR_CODES = {
  TEST_CASES_NOT_FOUND: 'TEST_CASES_NOT_FOUND',
  INTERRUPTED: 'INTERRUPTED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  EVALUATION_TRIGGER_NOT_FOUND: 'EVALUATION_TRIGGER_NOT_FOUND',
  EVALUATION_TRIGGER_NOT_CONFIGURED: 'EVALUATION_TRIGGER_NOT_CONFIGURED',
  EVALUATION_TRIGGER_DISABLED: 'EVALUATION_TRIGGER_DISABLED',
  SET_OUTPUTS_NODE_NOT_CONFIGURED: 'SET_OUTPUTS_NODE_NOT_CONFIGURED',
  SET_METRICS_NODE_NOT_FOUND: 'SET_METRICS_NODE_NOT_FOUND',
  SET_METRICS_NODE_NOT_CONFIGURED: 'SET_METRICS_NODE_NOT_CONFIGURED',
  CANT_FETCH_TEST_CASES: 'CANT_FETCH_TEST_CASES',
  PARTIAL_CASES_FAILED: 'PARTIAL_CASES_FAILED',
} as const;

// Type-safe error code types
export type TestCaseExecutionErrorCodes =
  (typeof TEST_CASE_EXECUTION_ERROR_CODE)[keyof typeof TEST_CASE_EXECUTION_ERROR_CODE];
export type TestRunErrorCode = (typeof TEST_RUN_ERROR_CODES)[keyof typeof TEST_RUN_ERROR_CODES];
```

---

## 2. Error Categorization (Retryable vs Fatal)

### n8n - Semantic Error Hierarchy

**Source:** [vendor/orchestration/n8n/packages/workflow/src/errors/](vendor/orchestration/n8n/packages/workflow/src/errors/)

```typescript
// Error Level Types (determines severity and reporting)
export type ErrorLevel = 'fatal' | 'error' | 'warning' | 'info';

// Three main error categories:

// 1. UserError - User caused the problem (bad input, permissions)
//    Default level: 'info' (not reported to Sentry)
export class UserError extends BaseError {
  constructor(message: string, opts: UserErrorOptions = {}) {
    opts.level = opts.level ?? 'info';
    super(message, opts);
  }
}

// 2. OperationalError - Transient issues (network, timeouts)
//    Default level: 'warning' (expected to happen, handle gracefully)
export class OperationalError extends BaseError {
  constructor(message: string, opts: OperationalErrorOptions = {}) {
    opts.level = opts.level ?? 'warning';
    super(message, opts);
  }
}

// 3. UnexpectedError - Code bugs, unhandled cases
//    Default level: 'error' (needs developer attention)
export class UnexpectedError extends BaseError {
  constructor(message: string, opts: UnexpectedErrorOptions = {}) {
    opts.level = opts.level ?? 'error';
    super(message, opts);
  }
}
```

### Remotion - Flaky Error Detection (Pattern Matching)

**Source:** [vendor/render/remotion/packages/lambda-client/src/is-flaky-error.ts](vendor/render/remotion/packages/lambda-client/src/is-flaky-error.ts)

```typescript
// Retryable errors identified by message pattern matching
export const isFlakyError = (err: Error): boolean => {
  const message = err.stack ?? '';

  // Network-related (always retryable)
  if (
    message.includes('getaddrinfo') ||
    message.includes('ECONNRESET') ||
    message.includes('ERR_CONNECTION_TIMED_OUT') ||
    message.includes('ERR_NETWORK_CHANGED') ||
    message.includes('A network error occurred') ||
    message.includes('socket hang up')
  ) {
    return true;
  }

  // Browser/rendering issues (retryable)
  if (message.includes('Target closed') || message.includes('Session closed')) {
    return true;
  }
  if (message.includes('Page crashed!')) {
    return true;
  }
  if (message.includes('FATAL:zygote_communication_linux.cc')) {
    return true;
  }

  // Cloud provider transient errors
  if (message.includes('We encountered an internal error.')) {
    return true; // S3 rare occasions
  }
  if (message.includes('ServiceException: We currently do not have sufficient capacity')) {
    return true;
  }

  // Timeouts (retryable)
  if (message.includes('Timed out evaluating page function')) {
    return true;
  }
  if (message.includes('Timeout exceeded rendering the component')) {
    return true;
  }

  // Non-retryable: Compositor SIGSEGV (fatal crash)
  if (message.includes('Compositor exited') && !message.includes('SIGSEGV')) {
    return true; // Only retry if NOT a segfault
  }

  return false;
};

// Usage in error handling:
const shouldRetry = isRetryableError && params.retriesLeft > 0 && !shouldNotRetry;

onStream({
  type: 'error-occurred',
  payload: {
    error: (err as Error).stack,
    shouldRetry,
    errorInfo: {
      name: (err as Error).name,
      message: (err as Error).message,
      stack: (err as Error).stack,
      isFatal: !shouldRetry,
      attempt: params.attempt,
      totalAttempts: params.retriesLeft + params.attempt,
      willRetry: shouldRetry,
    },
  },
});
```

### n8n - Common Error Mapping

**Source:** [vendor/orchestration/n8n/packages/workflow/src/errors/abstract/node.error.ts](vendor/orchestration/n8n/packages/workflow/src/errors/abstract/node.error.ts)

```typescript
// Descriptive messages for common system errors
const COMMON_ERRORS: IDataObject = {
  // Node.js network errors
  ECONNREFUSED: 'The service refused the connection - perhaps it is offline',
  ECONNRESET:
    'The connection to the server was closed unexpectedly, perhaps it is offline. You can retry the request immediately or wait and retry later.',
  ENOTFOUND:
    'The connection cannot be established, this usually occurs due to an incorrect host (domain) value',
  ETIMEDOUT:
    "The connection timed out, consider setting the 'Retry on Fail' option in the node settings",
  ERRADDRINUSE: 'The port is already occupied by some other application',
  EADDRNOTAVAIL: 'The address is not available, ensure that you have the right IP address',
  ECONNABORTED: 'The connection was aborted, perhaps the server is offline',
  EHOSTUNREACH: 'The host is unreachable, perhaps the server is offline',
  EAI_AGAIN: 'The DNS server returned an error, perhaps the server is offline',

  // File system errors
  ENOENT: 'The file or directory does not exist',
  EISDIR: 'The file path was expected but the given path is a directory',
  ENOTDIR: 'The directory path was expected but the given path is a file',
  EACCES: 'Forbidden by access permissions, make sure you have the right permissions',
  EEXIST: 'The file or directory already exists',
  EPERM: 'Operation not permitted, make sure you have the right permissions',

  // Other
  GETADDRINFO: 'The server closed the connection unexpectedly',
};
```

---

## 3. Structured Error Output (JSON Format)

### MCP SDK - ErrorData Schema

**Source:** [vendor/mcp/mcp-python-sdk/src/mcp/types.py](vendor/mcp/mcp-python-sdk/src/mcp/types.py)

```python
class ErrorData(BaseModel):
    """Error information for JSON-RPC error responses."""

    code: int
    """The error type that occurred."""

    message: str
    """
    A short description of the error. The message SHOULD be limited
    to a concise single sentence.
    """

    data: Any | None = None
    """
    Additional information about the error. The value of this member
    is defined by the sender (e.g. detailed error information, nested errors).
    """

class JSONRPCError(BaseModel):
    """A response to a request that indicates an error occurred."""
    jsonrpc: Literal["2.0"]
    id: str | int
    error: ErrorData

# Example error response:
{
    "jsonrpc": "2.0",
    "id": 1,
    "error": {
        "code": -32602,
        "message": "Invalid params",
        "data": {
            "param": "url",
            "expected": "string",
            "received": "number"
        }
    }
}
```

### MCP SDK - Specialized Error Classes

**Source:** [vendor/mcp/mcp-python-sdk/src/mcp/shared/exceptions.py](vendor/mcp/mcp-python-sdk/src/mcp/shared/exceptions.py)

```python
class McpError(Exception):
    """Exception type raised when an error arrives over an MCP connection."""
    error: ErrorData

    def __init__(self, error: ErrorData):
        super().__init__(error.message)
        self.error = error


class UrlElicitationRequiredError(McpError):
    """
    Specialized error for when a tool requires URL mode elicitation(s)
    before proceeding.
    """
    def __init__(
        self,
        elicitations: list[ElicitRequestURLParams],
        message: str | None = None,
    ):
        if message is None:
            message = f"URL elicitation{'s' if len(elicitations) > 1 else ''} required"

        self._elicitations = elicitations
        error = ErrorData(
            code=URL_ELICITATION_REQUIRED,
            message=message,
            data={"elicitations": [e.model_dump() for e in elicitations]},
        )
        super().__init__(error)
```

### short-video-maker-gyori - Validation Error Format

**Source:** [vendor/short-video-maker-gyori/src/server/validator.ts](vendor/short-video-maker-gyori/src/server/validator.ts)

```typescript
export interface ValidationErrorResult {
  message: string;
  missingFields: Record<string, string>;
}

function formatZodError(error: ZodError): ValidationErrorResult {
  const missingFields: Record<string, string> = {};

  // Extract all errors into human-readable format
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    missingFields[path] = err.message;
  });

  // Create human-readable message
  const errorPaths = Object.keys(missingFields);
  let message = `Validation failed for ${errorPaths.length} field(s): `;
  message += errorPaths.join(', ');

  return { message, missingFields };
}

// Throws structured JSON error
throw new Error(
  JSON.stringify({
    message: errorResult.message,
    missingFields: errorResult.missingFields,
  })
);
```

### short-video-maker-gyori - REST API Error Responses

**Source:** [vendor/short-video-maker-gyori/src/server/routers/rest.ts](vendor/short-video-maker-gyori/src/server/routers/rest.ts)

```typescript
// Validation error response (400)
res.status(400).json({
  error: 'Validation failed',
  message: errorData.message,
  missingFields: errorData.missingFields,
});

// Generic error response (400)
res.status(400).json({
  error: 'Invalid input',
  message: error instanceof Error ? error.message : 'Unknown error',
});

// Not found response (404)
res.status(404).json({
  error: 'Video not found',
});

// Required field error (400)
res.status(400).json({
  error: 'videoId is required',
});

// Server error response (500)
res.status(500).json({
  error: 'Error reading tmp file',
  tmpFile,
});
```

---

## 4. Exit Code Conventions

### Standard Unix/POSIX Exit Codes

```typescript
// Common exit code conventions:
const EXIT_CODES = {
  SUCCESS: 0, // Successful execution
  GENERAL_ERROR: 1, // General/unspecified error
  MISUSE: 2, // Misuse of shell command
  CANNOT_EXECUTE: 126, // Command found but not executable
  COMMAND_NOT_FOUND: 127, // Command not found
  INVALID_ARGUMENT: 128, // Invalid argument
  FATAL_SIGNAL_BASE: 128, // + signal number for fatal signals
  CTRL_C: 130, // Script terminated by Ctrl+C (SIGINT)
} as const;
```

### n8n Script Exit Patterns

**Source:** Various n8n scripts

```typescript
// Success
process.exit(0);

// General error
process.exit(1);

// Error from subprocess
if (error.exitCode === 1) {
  // Handle specific exit code
}
process.exit(error.exitCode || 1);
```

### Recommended CLI Exit Code Taxonomy

```typescript
// Proposed exit code system for content-machine CLI
export const EXIT_CODES = {
  // Success (0-9)
  SUCCESS: 0,
  SUCCESS_WITH_WARNINGS: 1,

  // User Errors (10-29)
  INVALID_ARGUMENTS: 10,
  INVALID_CONFIG: 11,
  MISSING_REQUIRED_FILE: 12,
  PERMISSION_DENIED: 13,
  VALIDATION_ERROR: 14,

  // Operational Errors (30-49) - Retryable
  NETWORK_ERROR: 30,
  TIMEOUT: 31,
  SERVICE_UNAVAILABLE: 32,
  RATE_LIMITED: 33,
  TEMPORARY_FAILURE: 34,

  // Fatal Errors (50-69)
  INTERNAL_ERROR: 50,
  OUT_OF_MEMORY: 51,
  DEPENDENCY_MISSING: 52,
  CORRUPTED_STATE: 53,

  // External Tool Errors (70-89)
  FFMPEG_ERROR: 70,
  REMOTION_ERROR: 71,
  PLAYWRIGHT_ERROR: 72,
  TTS_ERROR: 73,

  // Interrupts (128+)
  SIGINT: 130, // Ctrl+C
  SIGTERM: 143, // Graceful termination
} as const;
```

---

## 5. User-Friendly Error Messages

### n8n - HTTP Status Code Messages

**Source:** [vendor/orchestration/n8n/packages/workflow/src/errors/node-api.error.ts](vendor/orchestration/n8n/packages/workflow/src/errors/node-api.error.ts)

```typescript
const STATUS_CODE_MESSAGES: IStatusCodeMessages = {
  '4XX': 'Your request is invalid or could not be processed by the service',
  '400': 'Bad request - please check your parameters',
  '401': 'Authorization failed - please check your credentials',
  '402': 'Payment required - perhaps check your payment details?',
  '403': 'Forbidden - perhaps check your credentials?',
  '404': 'The resource you are requesting could not be found',
  '405': 'Method not allowed - please check you are using the right HTTP method',
  '429': 'The service is receiving too many requests from you',

  '5XX': 'The service failed to process your request',
  '500': 'The service was not able to process your request',
  '502': 'Bad gateway - the service failed to handle your request',
  '503':
    'Service unavailable - try again later or consider setting this node to retry automatically (in the node settings)',
  '504': 'Gateway timed out - perhaps try again later?',
};
```

### n8n - Error-to-i18n Mapping

**Source:** [vendor/orchestration/n8n/.../evaluation.constants.ts](vendor/orchestration/n8n/packages/frontend/editor-ui/src/features/ai/evaluation.ee/evaluation.constants.ts)

```typescript
// Map error codes to i18n keys for localized messages
const testCaseErrorDictionary: Partial<Record<TestCaseExecutionErrorCodes, BaseTextKey>> = {
  MOCKED_NODE_NOT_FOUND: 'evaluation.runDetail.error.mockedNodeMissing',
  FAILED_TO_EXECUTE_WORKFLOW: 'evaluation.runDetail.error.executionFailed',
  INVALID_METRICS: 'evaluation.runDetail.error.invalidMetrics',
  UNKNOWN_ERROR: 'evaluation.runDetail.error.unknownError',
  NO_METRICS_COLLECTED: 'evaluation.runDetail.error.noMetricsCollected',
} as const;

// Lookup function
export const getErrorBaseKey = (errorCode?: string): string => {
  return (
    testCaseErrorDictionary[errorCode as TestCaseExecutionErrorCodes] ??
    testRunErrorDictionary[errorCode as TestRunErrorCode] ??
    ''
  );
};
```

---

## 6. Base Error Class Pattern (n8n)

### Complete Error Hierarchy

```typescript
// Base error with reporting/observability integration
export type BaseErrorOptions = {
  description?: string | undefined | null;
  level?: ErrorLevel;
  shouldReport?: boolean;
  tags?: ErrorTags;
  extra?: Event['extra'];
} & ErrorOptions;

export abstract class BaseError extends Error {
  level: ErrorLevel;
  readonly shouldReport: boolean;
  readonly description: string | null | undefined;
  readonly tags: ErrorTags;
  readonly extra?: Event['extra'];
  readonly packageName?: string;

  constructor(message: string, opts: BaseErrorOptions = {}) {
    super(message, opts);

    this.level = opts.level ?? 'error';
    this.shouldReport = opts.shouldReport ?? (this.level === 'error' || this.level === 'fatal');
    this.description = opts.description;
    this.tags = opts.tags ?? {};
    this.extra = opts.extra;

    // Auto-detect package name from call stack
    try {
      const filePath = callsites()[2].getFileName() ?? '';
      const match = /packages\/([^\/]+)\//.exec(filePath)?.[1];
      if (match) this.tags.packageName = match;
    } catch {}
  }
}
```

---

## 7. Recommendations for content-machine CLI

### Proposed Error Taxonomy

```typescript
// src/common/errors/codes.ts
export const ErrorCodes = {
  // Input/Validation (E1xx)
  E100_INVALID_CONFIG: 'E100',
  E101_MISSING_REQUIRED_FIELD: 'E101',
  E102_INVALID_VIDEO_FORMAT: 'E102',
  E103_INVALID_AUDIO_FORMAT: 'E103',
  E104_SCENE_VALIDATION_FAILED: 'E104',

  // Network/API (E2xx)
  E200_NETWORK_ERROR: 'E200',
  E201_API_RATE_LIMITED: 'E201',
  E202_API_UNAUTHORIZED: 'E202',
  E203_API_NOT_FOUND: 'E203',
  E204_API_SERVER_ERROR: 'E204',

  // External Tools (E3xx)
  E300_FFMPEG_ERROR: 'E300',
  E301_REMOTION_RENDER_FAILED: 'E301',
  E302_PLAYWRIGHT_ERROR: 'E302',
  E303_WHISPER_ERROR: 'E303',
  E304_TTS_ERROR: 'E304',

  // File System (E4xx)
  E400_FILE_NOT_FOUND: 'E400',
  E401_PERMISSION_DENIED: 'E401',
  E402_DISK_FULL: 'E402',
  E403_PATH_TOO_LONG: 'E403',

  // Internal (E5xx)
  E500_INTERNAL_ERROR: 'E500',
  E501_NOT_IMPLEMENTED: 'E501',
  E502_STATE_CORRUPTION: 'E502',
} as const;
```

### Proposed Error Classes

```typescript
// src/common/errors/base.ts
import { z } from 'zod';

export type ErrorLevel = 'fatal' | 'error' | 'warning' | 'info';
export type ErrorCategory = 'user' | 'operational' | 'internal';

export interface ContentMachineErrorOptions {
  code: string;
  message: string;
  description?: string;
  level?: ErrorLevel;
  category?: ErrorCategory;
  retryable?: boolean;
  cause?: Error;
  context?: Record<string, unknown>;
}

export class ContentMachineError extends Error {
  readonly code: string;
  readonly level: ErrorLevel;
  readonly category: ErrorCategory;
  readonly retryable: boolean;
  readonly description?: string;
  readonly context?: Record<string, unknown>;

  constructor(opts: ContentMachineErrorOptions) {
    super(opts.message, { cause: opts.cause });
    this.code = opts.code;
    this.level = opts.level ?? 'error';
    this.category = opts.category ?? 'internal';
    this.retryable = opts.retryable ?? false;
    this.description = opts.description;
    this.context = opts.context;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      description: this.description,
      level: this.level,
      category: this.category,
      retryable: this.retryable,
      context: this.context,
      stack: this.stack,
    };
  }
}

// Specialized error types
export class UserError extends ContentMachineError {
  constructor(opts: Omit<ContentMachineErrorOptions, 'category' | 'level'>) {
    super({ ...opts, category: 'user', level: 'info', retryable: false });
  }
}

export class OperationalError extends ContentMachineError {
  constructor(opts: Omit<ContentMachineErrorOptions, 'category' | 'level'>) {
    super({ ...opts, category: 'operational', level: 'warning', retryable: true });
  }
}

export class InternalError extends ContentMachineError {
  constructor(opts: Omit<ContentMachineErrorOptions, 'category' | 'level'>) {
    super({ ...opts, category: 'internal', level: 'error', retryable: false });
  }
}
```

### CLI Output Format

```typescript
// Human-readable format (default)
$ cm render video.json
Error [E301]: Remotion render failed

  The video rendering process encountered an error.

  Details:
    - Frame 42: Memory limit exceeded
    - Composition: main
    - Duration: 30s

  Suggestions:
    - Try reducing video resolution
    - Close other applications to free memory
    - Use --memory-limit flag to increase allocation

  Run with --verbose for full stack trace.

// JSON format (--json flag)
$ cm render video.json --json
{
  "success": false,
  "error": {
    "code": "E301",
    "message": "Remotion render failed",
    "description": "The video rendering process encountered an error.",
    "level": "error",
    "category": "internal",
    "retryable": false,
    "context": {
      "frame": 42,
      "composition": "main",
      "duration": "30s"
    },
    "suggestions": [
      "Try reducing video resolution",
      "Close other applications to free memory",
      "Use --memory-limit flag to increase allocation"
    ]
  },
  "exitCode": 71
}
```

---

## Summary Table

| Pattern           | Source                  | Key Feature                           |
| ----------------- | ----------------------- | ------------------------------------- |
| JSON-RPC Codes    | MCP SDK                 | Standard numeric codes (-32xxx)       |
| Error Hierarchy   | n8n                     | User/Operational/Unexpected classes   |
| Flaky Detection   | Remotion                | Pattern matching for retryable errors |
| Structured Output | short-video-maker-gyori | Zod + JSON error responses            |
| i18n Mapping      | n8n                     | Error codes → localized messages      |
| HTTP Mapping      | n8n                     | Status codes → user-friendly text     |
| Exit Codes        | Standard                | POSIX conventions + custom ranges     |

---

## Next Steps

1. **Create error codes enum** in `src/common/errors/codes.ts`
2. **Implement base error classes** following n8n pattern
3. **Add Zod validation** with structured error output
4. **Create CLI error formatter** for human/JSON output
5. **Define exit code mapping** for all error categories
6. **Add flaky error detection** for network operations
