/**
 * typeshift CLI entry point.
 *
 * @module
 */

import { Command } from 'commander';
import { registerConvertCommand } from './commands/convert';
import { registerListCommand } from './commands/list';
import { registerValidateCommand } from './commands/validate';
import { getPackageVersion } from './version';

const program = new Command();

program
  .name('typeshift')
  .description(
    'Developer-first, CLI and programmatic schema compiler for bidirectional, loss-aware conversion between schema definition formats.',
  )
  .version(getPackageVersion())
  .option('--debug', 'Print full error stack traces on failure', false);

// Register commands
registerConvertCommand(program);
registerListCommand(program);
registerValidateCommand(program);

// Add custom examples to help
program.addHelpText(
  'after',
  `
Examples:
  $ typeshift convert schema.ts --to json-schema -o schema.json
  $ typeshift convert openapi.json --to typescript -o models.ts
  $ typeshift convert schema.json --to zod -o schema.zod.ts
  $ typeshift convert schema.zod.ts --to ts -o schema.ts
  $ typeshift convert schema.ts --to json-schema --loss-policy error
  $ cat types.ts | typeshift convert --from ts --to zod
  $ typeshift validate openapi.json
  $ typeshift list --detailed
`,
);

program.parse(process.argv);
