/**
 * CLI command: list
 *
 * Lists available schema format adapters and their capabilities.
 *
 * @module
 */

import type { Command } from 'commander';
import { getDefaultRegistry } from '../../index';
import { formatAdaptersList } from '../utils/output';
import { handleCliError } from '../utils/errors';

export interface ListCommandOptions {
  json?: boolean;
  detailed?: boolean;
}

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List supported schema formats and their conversion capabilities')
    .option('--json', 'Output list as JSON')
    .option('-d, --detailed', 'Show detailed capabilities flags', false)
    .action((options: ListCommandOptions) => {
      try {
        const registry = getDefaultRegistry();
        const adapters = registry.getAll();

        if (options.json) {
          const data = adapters.map((a) => ({
            id: a.id,
            name: a.name,
            extensions: a.extensions,
            aliases: a.aliases ?? [],
            capabilities: a.capabilities,
          }));
          process.stdout.write(JSON.stringify(data, null, 2) + '\n');
        } else {
          process.stdout.write(formatAdaptersList(adapters, options.detailed ?? false));
        }
      } catch (err) {
        handleCliError(err, program.opts().debug);
      }
    });
}
