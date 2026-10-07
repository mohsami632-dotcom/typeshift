/**
 * CLI error handling utilities.
 *
 * @module
 */

import { TypeshiftError } from '../../core/errors';
import { colors, symbols } from './output';

export function handleCliError(error: unknown, debug = false): never {
  if (error instanceof TypeshiftError) {
    console.error(`\n${symbols.error} ${colors.bold(colors.red('Error:'))} ${error.message}`);
    if (debug && error.stack) {
      console.error(colors.dim(error.stack));
    }
    process.exit(1);
  }

  if (error instanceof Error) {
    console.error(
      `\n${symbols.error} ${colors.bold(colors.red('Unexpected Error:'))} ${error.message}`,
    );
    if (debug && error.stack) {
      console.error(colors.dim(error.stack));
    }
    process.exit(1);
  }

  console.error(`\n${symbols.error} ${colors.bold(colors.red('Unknown Error:'))} ${String(error)}`);
  process.exit(1);
}
