/**
 * CLI output styling and formatting utilities.
 *
 * Lightweight, zero-dependency ANSI formatting with support for NO_COLOR.
 *
 * @module
 */

import type { ConversionDiagnostic, FormatAdapter } from '../../core/types';

// Check if terminal supports color and respects NO_COLOR standard (https://no-color.org)
const noColor =
  process.env.NO_COLOR !== undefined ||
  process.env.NODE_DISABLE_COLORS !== undefined ||
  !process.stdout.isTTY;

function style(code: number, close: number): (text: string) => string {
  if (noColor) return (text: string) => text;
  return (text: string) => `\x1b[${code}m${text}\x1b[${close}m`;
}

export const colors = {
  bold: style(1, 22),
  dim: style(2, 22),
  italic: style(3, 23),
  underline: style(4, 24),
  red: style(31, 39),
  green: style(32, 39),
  yellow: style(33, 39),
  blue: style(34, 39),
  magenta: style(35, 39),
  cyan: style(36, 39),
  gray: style(90, 39),
};

export const symbols = {
  info: noColor ? 'i' : colors.cyan('ℹ'),
  warning: noColor ? '!' : colors.yellow('▲'),
  error: noColor ? '×' : colors.red('✖'),
  success: noColor ? '√' : colors.green('✔'),
  bullet: noColor ? '*' : colors.gray('•'),
};

/**
 * Format a single diagnostic message.
 */
export function formatDiagnostic(diagnostic: ConversionDiagnostic): string {
  const icon =
    diagnostic.severity === 'error'
      ? symbols.error
      : diagnostic.severity === 'warning'
        ? symbols.warning
        : symbols.info;

  const severityColor =
    diagnostic.severity === 'error'
      ? colors.red
      : diagnostic.severity === 'warning'
        ? colors.yellow
        : colors.cyan;

  const severityLabel = severityColor(diagnostic.severity.toUpperCase().padEnd(7));
  const pathLabel = diagnostic.path ? colors.dim(`[${diagnostic.path}] `) : '';
  const constructLabel = diagnostic.sourceConstruct
    ? colors.dim(` (${diagnostic.sourceConstruct})`)
    : '';

  return `  ${icon} ${severityLabel} ${pathLabel}${diagnostic.message}${constructLabel}`;
}

/**
 * Format an array of diagnostics with a header and summary.
 */
export function formatDiagnostics(diagnostics: readonly ConversionDiagnostic[]): string {
  if (diagnostics.length === 0) return '';

  const errors = diagnostics.filter((d) => d.severity === 'error').length;
  const warnings = diagnostics.filter((d) => d.severity === 'warning').length;
  const infos = diagnostics.filter((d) => d.severity === 'info').length;

  const parts: string[] = [];
  if (errors > 0) parts.push(colors.red(`${errors} error${errors > 1 ? 's' : ''}`));
  if (warnings > 0) parts.push(colors.yellow(`${warnings} warning${warnings > 1 ? 's' : ''}`));
  if (infos > 0) parts.push(colors.cyan(`${infos} info`));

  const summary = parts.join(', ');
  const title = colors.bold(`Information-Loss Diagnostics (${summary}):`);

  const list = diagnostics.map(formatDiagnostic).join('\n');
  return `\n${title}\n${list}\n`;
}

/**
 * Format a list of format adapters for display.
 */
export function formatAdaptersList(adapters: readonly FormatAdapter[], detailed = false): string {
  if (adapters.length === 0) return 'No format adapters registered.';

  const header = colors.bold('Available Schema Formats:');
  const rows = adapters.map((a) => {
    const id = colors.cyan(a.id.padEnd(16));
    const name = colors.bold(a.name.padEnd(16));
    const exts = colors.dim(`Extensions: ${a.extensions.join(', ')}`);
    const aliases =
      a.aliases && a.aliases.length > 0 ? colors.dim(` (Aliases: ${a.aliases.join(', ')})`) : '';

    let row = `  ${id} ${name} ${exts}${aliases}`;

    if (detailed) {
      const caps = a.capabilities;
      const flags = [
        caps.supportsConstraints ? colors.green('+constraints') : colors.gray('-constraints'),
        caps.supportsDescriptions ? colors.green('+docs') : colors.gray('-docs'),
        caps.supportsDefaults ? colors.green('+defaults') : colors.gray('-defaults'),
        caps.supportsNullable ? colors.green('+nullable') : colors.gray('-nullable'),
        caps.supportsUnions ? colors.green('+unions') : colors.gray('-unions'),
        caps.supportsIntersections ? colors.green('+intersections') : colors.gray('-intersections'),
        caps.supportsRecursion ? colors.green('+recursion') : colors.gray('-recursion'),
      ].join(' ');
      row += `\n    ${colors.dim('Capabilities:')} ${flags}`;
    }

    return row;
  });

  return `\n${header}\n\n${rows.join('\n\n')}\n`;
}
