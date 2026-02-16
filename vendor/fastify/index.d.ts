export interface FastifyRequest<T = { Body: unknown }> {
  body: T extends { Body: infer B } ? B : unknown;
}

export interface FastifyReply {
  code(statusCode: number): FastifyReply;
  send(payload: unknown): void;
}

export interface FastifyInstance {
  post(
    path: string,
    handler: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown> | unknown
  ): void;
  listen(options: { port: number; host: string }): Promise<void>;
}

export default function Fastify(): FastifyInstance;
