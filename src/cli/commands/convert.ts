/**
 * CLI command: convert
 *
 * Compiles schemas between formats with loss detection and diagnostics.
 *
 * @module
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Command } from 'commander';
import { getDefaultRegistry } from '../../index';
import { convert } from '../../core/converter';
import { formatDiagnostics, colors, symbols } from '../utils/output';
import { handleCliError } from '../utils/errors';

export interface ConvertCommandOptions {
  from?: string;
  to?: string;
  output?: string;
  lossPolicy?: 'ignore' | 'warn' | 'error';
  header?: boolean;
}

/**
 * Reads all content from standard input.
 */
async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
    process.stdin.on('error', (err) => {
      reject(err);
    });
  });
}

export function registerConvertCommand(program: Command): void {
  program
    .command('convert [input]')
    .description('Convert a schema between definition formats')
    .option('-f, --from <format>', 'Source schema format (e.g. typescript, json-schema, zod)')
    .option('-t, --to <format>', 'Target schema format (e.g. typescript, json-schema, zod)')
    .option('-o, --output <path>', 'Output file path (defaults to stdout)')
    .option('--loss-policy <policy>', 'Action on information loss: ignore, warn, error', 'warn')
    .option('--header', 'Include generated timestamp/banner comment in output', true)
    .option('--no-header', 'Do not include generated banner comment in output')
    .action(async (inputPath: string | undefined, options: ConvertCommandOptions) => {
      try {
        const registry = getDefaultRegistry();
        let inputText = '';
        let resolvedFrom = options.from;
        let resolvedTo = options.to;

        // 1. Read input
        if (!inputPath || inputPath === '-') {
          // Read from stdin
          if (process.stdin.isTTY && !inputPath) {
            console.error(
              `${symbols.error} ${colors.red('No input file provided and nothing piped to stdin.')}`,
            );
            console.error(`Usage: typeshift convert <file> --to <format>`);
            console.error(`       cat schema.ts | typeshift convert --from ts --to jsonschema`);
            process.exit(1);
          }
          inputText = await readStdin();
        } else {
          // Read from file
          const resolvedFilePath = path.resolve(process.cwd(), inputPath);
          if (!fs.existsSync(resolvedFilePath)) {
            console.error(`${symbols.error} ${colors.red(`Input file not found: ${inputPath}`)}`);
            process.exit(1);
          }
          inputText = fs.readFileSync(resolvedFilePath, 'utf8');

          // Auto-detect source format if not specified
          if (!resolvedFrom) {
            const adapter = registry.getByExtension(resolvedFilePath);
            if (adapter) {
              resolvedFrom = adapter.id;
            }
          }

          // If detected as json-schema (or generic json), check if it's an OpenAPI 3 document
          if ((!resolvedFrom || resolvedFrom === 'json-schema') && inputText.includes('"openapi"')) {
            try {
              const parsed = JSON.parse(inputText) as Record<string, unknown>;
              if (typeof parsed?.openapi === 'string' && (parsed.openapi.startsWith('3.') || parsed.openapi.startsWith('3.1'))) {
                resolvedFrom = 'openapi';
              }
            } catch {
              // Ignore and let standard parser handle syntax error
            }
          }
        }

        // 2. Validate --from
        if (!resolvedFrom) {
          if (inputPath && (inputPath.endsWith('.yaml') || inputPath.endsWith('.yml'))) {
            console.error(
              `${symbols.error} ${colors.red('YAML format (.yaml/.yml) is not yet supported natively.')} Please convert to JSON (e.g. openapi.json).`,
            );
            process.exit(1);
          }

          console.error(
            `${symbols.error} ${colors.red('Could not determine source format.')} Please specify with ${colors.bold('--from <format>')}.`,
          );
          console.error(
            `Available formats: ${registry
              .getAll()
              .map((a) => a.id)
              .join(', ')}`,
          );
          process.exit(1);
        }

        // Auto-detect target format from output path if not specified
        if (!resolvedTo && options.output) {
          const adapter = registry.getByExtension(options.output);
          if (adapter) {
            resolvedTo = adapter.id;
          }
        }

        // 3. Validate --to
        if (!resolvedTo) {
          console.error(
            `${symbols.error} ${colors.red('Target format is required.')} Please specify with ${colors.bold('--to <format>')}.`,
          );
          console.error(
            `Available formats: ${registry
              .getAll()
              .map((a) => a.id)
              .join(', ')}`,
          );
          process.exit(1);
        }

        // 4. Perform conversion
        const result = convert(
          inputText,
          {
            from: resolvedFrom,
            to: resolvedTo,
            parseOptions: { filename: inputPath },
            generateOptions: { header: options.header ?? true },
          },
          registry,
        );

        // 5. Handle diagnostics based on loss policy
        const lossPolicy = options.lossPolicy ?? 'warn';
        const hasLoss = result.diagnostics.length > 0;
        const hasErrors = result.diagnostics.some((d) => d.severity === 'error');
        const hasWarnings = result.diagnostics.some((d) => d.severity === 'warning');

        if (lossPolicy !== 'ignore' && hasLoss) {
          process.stderr.write(formatDiagnostics(result.diagnostics));
        }

        if (lossPolicy === 'error' && (hasErrors || hasWarnings)) {
          console.error(
            `${symbols.error} ${colors.red('Aborting due to --loss-policy error.')} Information loss was detected during conversion.`,
          );
          process.exit(2);
        }

        // 6. Write output
        if (options.output) {
          const outPath = path.resolve(process.cwd(), options.output);
          const outDir = path.dirname(outPath);
          if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
          }
          fs.writeFileSync(outPath, result.output, 'utf8');
          if (lossPolicy !== 'ignore') {
            console.error(
              `${symbols.success} ${colors.green(`Successfully converted ${resolvedFrom} → ${resolvedTo} (${options.output})`)}`,
            );
          }
        } else {
          // Print directly to stdout
          process.stdout.write(result.output);
          if (!result.output.endsWith('\n')) {
            process.stdout.write('\n');
          }
        }
      } catch (err) {
        handleCliError(err, program.opts().debug);
      }
    });
}
