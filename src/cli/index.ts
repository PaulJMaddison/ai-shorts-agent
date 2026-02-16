import { runAgent } from '../core/app.js';

function main(): void {
  const command = process.argv[2] ?? 'run';

  switch (command) {
    case 'run': {
      // eslint-disable-next-line no-console
      console.log(runAgent());
      break;
    }
    default: {
      // eslint-disable-next-line no-console
      console.error(`Unknown command: ${command}`);
      process.exitCode = 1;
    }
  }
}

main();
