import { access, copyFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

export const clientProfileSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  niche: z.string().trim().min(1),
  topics: z.array(z.string().trim().min(1)).min(1),
  voice: z.object({
    provider: z.string().trim().min(1),
    voiceId: z.string().trim().min(1)
  }),
  avatar: z.object({
    provider: z.string().trim().min(1),
    avatarId: z.string().trim().min(1)
  }),
  youtube: z.object({
    provider: z.string().trim().min(1),
    channelId: z.string().trim().min(1)
  })
});

const clientsSchema = z.array(clientProfileSchema);

export type ClientProfile = z.infer<typeof clientProfileSchema>;

export async function loadClients(filePath: string): Promise<ClientProfile[]> {
  const json = await readFile(filePath, 'utf8');

  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error(`Invalid JSON in clients file: ${filePath}`, { cause: error });
  }

  return clientsSchema.parse(parsed);
}

export function getClientById(clients: ClientProfile[], id: string): ClientProfile | undefined {
  return clients.find((client) => client.id === id);
}

export async function ensureDefaultClientsFile(filePath: string): Promise<void> {
  try {
    await access(filePath);
    return;
  } catch {
    // No-op: copy the example file if it does not exist.
  }

  await mkdir(path.dirname(filePath), { recursive: true });

  const parsedFilePath = path.parse(filePath);
  const exampleFilePath = path.join(parsedFilePath.dir, `${parsedFilePath.name}.example${parsedFilePath.ext}`);

  await copyFile(exampleFilePath, filePath);
}
