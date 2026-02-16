import { runAgent } from '../core/app.js';
import { startWebhooksServer } from '../server/webhooks.js';

function getPortArg(): number {
  const portArgIndex = process.argv.indexOf('--port');

  if (portArgIndex === -1) {
    return 8080;
  }

  const candidatePort = Number(process.argv[portArgIndex + 1]);

  if (!Number.isInteger(candidatePort) || candidatePort <= 0) {
    throw new Error('Invalid --port value. Expected a positive integer.');
  }

  return candidatePort;
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'run';

  switch (command) {
    case 'run': {
      console.log(runAgent());
      break;
    }
    case 'webhooks': {
      const port = getPortArg();
      await startWebhooksServer(port);
      break;
    }
    default: {
      console.error(`Unknown command: ${command}`);
      process.exitCode = 1;
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
