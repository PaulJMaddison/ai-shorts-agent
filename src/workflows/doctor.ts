import { ZodError } from 'zod';

import { ensureDefaultClientsFile, loadClients, type ClientProfile } from '../config/clients.js';
import type { Env } from '../config/env.js';

export interface DoctorClientSummary {
  id: string;
  providers: {
    voice: string;
    avatar: string;
    youtube: string;
  };
}

export interface DoctorCheck {
  label: string;
  status: 'set' | 'not set';
}

export interface DoctorResult {
  ok: boolean;
  mode: 'stubs' | 'live';
  clients: DoctorClientSummary[];
  checks: DoctorCheck[];
  errors: string[];
}

interface RunDoctorInput {
  env: Env;
  clientsFile: string;
  clientId?: string;
}

function summarizeClients(clients: ClientProfile[]): DoctorClientSummary[] {
  return clients.map((client) => ({
    id: client.id,
    providers: {
      voice: client.voice.provider,
      avatar: client.avatar.provider,
      youtube: client.youtube.provider
    }
  }));
}

function hasValue(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function pushEnvCheck(
  checks: DoctorCheck[],
  errors: string[],
  envVarName: string,
  value: string | undefined,
  reason: string
): void {
  const isSet = hasValue(value);
  checks.push({
    label: envVarName,
    status: isSet ? 'set' : 'not set'
  });

  if (!isSet) {
    errors.push(`${envVarName} is not set (${reason}).`);
  }
}

function uniqueProviders(clients: ClientProfile[], key: 'voice' | 'avatar' | 'youtube'): Set<string> {
  return new Set(clients.map((client) => client[key].provider));
}

export async function runDoctor(input: RunDoctorInput): Promise<DoctorResult> {
  await ensureDefaultClientsFile(input.clientsFile);

  let loadedClients: ClientProfile[];

  try {
    loadedClients = await loadClients(input.clientsFile);
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false,
        mode: input.env.USE_STUBS ? 'stubs' : 'live',
        clients: [],
        checks: [],
        errors: [
          `clients.json schema validation failed: ${error.issues
            .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
            .join('; ')}`
        ]
      };
    }

    throw error;
  }

  const selectedClients = input.clientId
    ? loadedClients.filter((client) => client.id === input.clientId)
    : loadedClients;

  if (input.clientId && selectedClients.length === 0) {
    return {
      ok: false,
      mode: input.env.USE_STUBS ? 'stubs' : 'live',
      clients: [],
      checks: [],
      errors: [`Client not found: ${input.clientId}`]
    };
  }

  const summary = summarizeClients(selectedClients);

  if (input.env.USE_STUBS) {
    return {
      ok: true,
      mode: 'stubs',
      clients: summary,
      checks: [],
      errors: []
    };
  }

  const errors: string[] = [];
  const checks: DoctorCheck[] = [];

  const voiceProviders = uniqueProviders(selectedClients, 'voice');
  const avatarProviders = uniqueProviders(selectedClients, 'avatar');
  const youtubeProviders = uniqueProviders(selectedClients, 'youtube');

  if (voiceProviders.has('elevenlabs')) {
    pushEnvCheck(
      checks,
      errors,
      'ELEVENLABS_API_KEY',
      input.env.ELEVENLABS_API_KEY,
      'required by clients using voice.provider=elevenlabs'
    );
  }

  if (avatarProviders.has('heygen')) {
    pushEnvCheck(
      checks,
      errors,
      'HEYGEN_API_KEY',
      input.env.HEYGEN_API_KEY,
      'required by clients using avatar.provider=heygen'
    );
  }

  if (avatarProviders.has('did')) {
    pushEnvCheck(
      checks,
      errors,
      'DID_API_KEY',
      input.env.DID_API_KEY,
      'required by clients using avatar.provider=did'
    );
  }

  if (!youtubeProviders.has('stub')) {
    pushEnvCheck(
      checks,
      errors,
      'YOUTUBE_CLIENT_ID',
      input.env.YOUTUBE_CLIENT_ID,
      'required by clients using youtube.provider!=stub'
    );
    pushEnvCheck(
      checks,
      errors,
      'YOUTUBE_CLIENT_SECRET',
      input.env.YOUTUBE_CLIENT_SECRET,
      'required by clients using youtube.provider!=stub'
    );
    pushEnvCheck(
      checks,
      errors,
      'YOUTUBE_REDIRECT_URI',
      input.env.YOUTUBE_REDIRECT_URI,
      'required by clients using youtube.provider!=stub'
    );
    pushEnvCheck(
      checks,
      errors,
      'YOUTUBE_REFRESH_TOKEN',
      input.env.YOUTUBE_REFRESH_TOKEN,
      'required by clients using youtube.provider!=stub'
    );
  }

  for (const client of selectedClients) {
    if (client.voice.provider === 'elevenlabs' && !hasValue(client.voice.voiceId)) {
      errors.push(`Client ${client.id}: set voice.voiceId for ElevenLabs.`);
    }

    if (client.avatar.provider === 'heygen' || client.avatar.provider === 'did') {
      if (!hasValue(client.avatar.avatarId) && !hasValue(client.avatar.imageUrl)) {
        errors.push(
          `Client ${client.id}: set avatar.avatarId or avatar.imageUrl for ${client.avatar.provider}.`
        );
      }
    }

    if (client.youtube.provider !== 'stub' && !hasValue(client.youtube.authRef)) {
      errors.push(`Client ${client.id}: set youtube.authRef for YouTube uploads.`);
    }
  }

  return {
    ok: errors.length === 0,
    mode: 'live',
    clients: summary,
    checks,
    errors
  };
}
