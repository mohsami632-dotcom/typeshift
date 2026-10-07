/**
 * Error types for typeshift.
 * @module
 */

/** Base class for all typeshift errors. */
export class TypeshiftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TypeshiftError';
  }
}

/** Thrown when a parser encounters invalid or unparsable input. */
export class ParseError extends TypeshiftError {
  readonly filename?: string;
  readonly line?: number;
  readonly column?: number;

  constructor(message: string, options?: { filename?: string; line?: number; column?: number }) {
    super(message);
    this.name = 'ParseError';
    this.filename = options?.filename;
    this.line = options?.line;
    this.column = options?.column;
  }
}

/** Thrown when a requested format is not found in the registry. */
export class UnknownFormatError extends TypeshiftError {
  readonly formatId: string;

  constructor(formatId: string) {
    super(`Unknown format: "${formatId}". Use "typeshift list" to see available formats.`);
    this.name = 'UnknownFormatError';
    this.formatId = formatId;
  }
}

/** Thrown when a generator encounters an IR construct it cannot represent. */
export class GenerateError extends TypeshiftError {
  constructor(message: string) {
    super(message);
    this.name = 'GenerateError';
  }
}

/** Thrown when schema validation fails. */
export class ValidationError extends TypeshiftError {
  readonly issues: readonly string[];

  constructor(message: string, issues: readonly string[]) {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}
