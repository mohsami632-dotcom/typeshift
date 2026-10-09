/**
 * CLI command: validate
 *
 * Validates a schema file syntax and parses it into the IR.
 *
 * @module
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Command } from 'commander';
import { getDefaultRegistry } from '../../index';
import { parse } from '../../core/converter';
import { colors, symbols } from '../utils/output';
import { handleCliError } from '../utils/errors';

export interface ValidateCommandOptions {
  format?: string;
  json?: boolean;
}

export function registerValidateCommand(program: Command): void {
  program
    .command('validate <file>')
    .description('Validate that a schema file is valid for its format')
    .option('-f, --format <format>', 'Schema format (e.g. typescript, json-schema, zod)')
    .option('--json', 'Output validation result as JSON')
    .action((filePath: string, options: ValidateCommandOptions) => {
      try {
        const registry = getDefaultRegistry();
        const resolvedPath = path.resolve(process.cwd(), filePath);

        if (!fs.existsSync(resolvedPath)) {
          console.error(`${symbols.error} ${colors.red(`File not found: ${filePath}`)}`);
          process.exit(1);
        }

        let formatId = options.format;
        if (!formatId) {
          const adapter = registry.getByExtension(resolvedPath);
          if (adapter) {
            formatId = adapter.id;
          }
        }

        const input = fs.readFileSync(resolvedPath, 'utf8');

        // Sniff for OpenAPI document if detected as generic json
        if ((!formatId || formatId === 'json-schema') && input.includes('"openapi"')) {
          try {
            const parsed = JSON.parse(input) as Record<string, unknown>;
            if (typeof parsed?.openapi === 'string' && (parsed.openapi.startsWith('3.') || parsed.openapi.startsWith('3.1'))) {
              formatId = 'openapi';
            }
          } catch {
            // Let parse handle error
          }
        }

        if (!formatId) {
          if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
            console.error(
              `${symbols.error} ${colors.red('YAML format (.yaml/.yml) is not yet supported natively.')} Please convert to JSON (e.g. openapi.json).`,
            );
            process.exit(1);
          }

          console.error(
            `${symbols.error} ${colors.red('Could not determine schema format.')} Please specify with ${colors.bold('--format <format>')}.`,
          );
          process.exit(1);
        }
        const document = parse(input, formatId, registry, { filename: filePath });

        const definitionCount = Object.keys(document.definitions).length;

        if (options.json) {
          process.stdout.write(
            JSON.stringify(
              {
                valid: true,
                format: formatId,
                file: filePath,
                definitionsCount: definitionCount,
                definitions: Object.keys(document.definitions),
                title: document.metadata?.title,
              },
              null,
              2,
            ) + '\n',
          );
        } else {
          console.log(
            `\n${symbols.success} ${colors.bold(colors.green('Valid Schema:'))} ${filePath}`,
          );
          console.log(`  Format:       ${colors.cyan(formatId)}`);
          console.log(
            `  Definitions:  ${colors.bold(String(definitionCount))} found (${Object.keys(document.definitions).join(', ') || 'root only'})`,
          );
          if (document.metadata?.title) {
            console.log(`  Title:        ${document.metadata.title}`);
          }
          console.log();
        }
      } catch (err) {
        handleCliError(err, program.opts().debug);
      }
    });
}
