import { createServer } from 'node:http';

function createReply(response) {
  let statusCode = 200;

  return {
    code(code) {
      statusCode = code;
      return this;
    },
    send(payload) {
      if (!response.headersSent) {
        response.writeHead(statusCode, { 'content-type': 'application/json' });
      }

      response.end(JSON.stringify(payload));
    }
  };
}

export default function Fastify() {
  const routes = new Map();

  return {
    post(path, handler) {
      routes.set(`POST ${path}`, handler);
    },
    async listen({ port, host }) {
      const server = createServer(async (request, response) => {
        if (!request.url || !request.method) {
          response.writeHead(404);
          response.end();
          return;
        }

        const route = routes.get(`${request.method} ${request.url}`);

        if (!route) {
          response.writeHead(404);
          response.end();
          return;
        }

        const chunks = [];
        for await (const chunk of request) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }

        let body;
        try {
          const rawBody = Buffer.concat(chunks).toString('utf8');
          body = rawBody.length > 0 ? JSON.parse(rawBody) : {};
        } catch {
          body = {};
        }

        const reply = createReply(response);
        const result = await route({ body }, reply);

        if (!response.writableEnded && result !== undefined) {
          reply.send(result);
        }
      });

      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, host, resolve);
      });
    }
  };
}
