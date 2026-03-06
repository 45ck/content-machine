import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';

const DEFAULT_TIMEOUT_MS = 30_000;
const METADATA_BASE_URL = process.env.GCE_METADATA_HOST?.trim()
  ? `http://${process.env.GCE_METADATA_HOST.trim()}`
  : 'http://metadata.google.internal';
const CLOUD_PLATFORM_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

type ServiceAccountCredentials = {
  type: 'service_account';
  client_email: string;
  private_key: string;
  token_uri?: string;
  project_id?: string;
};

type AuthorizedUserCredentials = {
  type: 'authorized_user';
  client_id: string;
  client_secret: string;
  refresh_token: string;
  token_uri?: string;
  quota_project_id?: string;
};

type GoogleApplicationCredentials = ServiceAccountCredentials | AuthorizedUserCredentials;

function execFileWithOutput(
  cmd: string,
  args: string[],
  options: { timeout: number; windowsHide: boolean }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout: String(stdout ?? ''), stderr: String(stderr ?? '') });
    });
  });
}

function getEnvAccessToken(): string | null {
  const envToken =
    process.env.GOOGLE_CLOUD_ACCESS_TOKEN ??
    process.env.GCLOUD_ACCESS_TOKEN ??
    process.env.CLOUDSDK_AUTH_ACCESS_TOKEN;
  return envToken?.trim() ? envToken.trim() : null;
}

function getEnvProjectId(): string | null {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT?.trim();
  return projectId ? projectId : null;
}

function getGoogleApplicationCredentialsPath(): string | null {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  return path ? path : null;
}

async function loadGoogleApplicationCredentials(): Promise<GoogleApplicationCredentials | null> {
  const path = getGoogleApplicationCredentialsPath();
  if (!path) return null;

  const raw = await readFile(path, 'utf8');
  const parsed = JSON.parse(raw) as Partial<GoogleApplicationCredentials>;
  if (parsed.type === 'service_account' && parsed.client_email && parsed.private_key) {
    return parsed as ServiceAccountCredentials;
  }
  if (
    parsed.type === 'authorized_user' &&
    parsed.client_id &&
    parsed.client_secret &&
    parsed.refresh_token
  ) {
    return parsed as AuthorizedUserCredentials;
  }
  throw new Error(
    'GOOGLE_APPLICATION_CREDENTIALS does not point to a supported Google credentials JSON file.'
  );
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/gu, '-')
    .replace(/\//gu, '_')
    .replace(/=+$/u, '');
}

async function exchangeServiceAccountForAccessToken(
  credentials: ServiceAccountCredentials,
  timeoutMs: number
): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const tokenUri = credentials.token_uri ?? 'https://oauth2.googleapis.com/token';
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = base64UrlEncode(
    JSON.stringify({
      iss: credentials.client_email,
      sub: credentials.client_email,
      aud: tokenUri,
      scope: CLOUD_PLATFORM_SCOPE,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    })
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claimSet}`);
  signer.end();
  const signature = signer.sign(credentials.private_key);
  const assertion = `${header}.${claimSet}.${base64UrlEncode(signature)}`;

  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Failed to exchange Google service account credentials for an access token. ${detail}`.trim()
    );
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error('Google OAuth token response did not include access_token.');
  }
  return payload.access_token;
}

async function exchangeRefreshTokenForAccessToken(
  credentials: AuthorizedUserCredentials,
  timeoutMs: number
): Promise<string> {
  const tokenUri = credentials.token_uri ?? 'https://oauth2.googleapis.com/token';
  const response = await fetch(tokenUri, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      refresh_token: credentials.refresh_token,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Failed to exchange Google refresh_token credentials for an access token. ${detail}`.trim()
    );
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error('Google OAuth token response did not include access_token.');
  }
  return payload.access_token;
}

async function getAccessTokenFromMetadataServer(timeoutMs: number): Promise<string | null> {
  try {
    const response = await fetch(
      `${METADATA_BASE_URL.replace(/\/+$/u, '')}/computeMetadata/v1/instance/service-accounts/default/token`,
      {
        headers: {
          'Metadata-Flavor': 'Google',
        },
        signal: AbortSignal.timeout(timeoutMs),
      }
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { access_token?: string };
    return payload.access_token?.trim() || null;
  } catch {
    return null;
  }
}

async function getProjectIdFromMetadataServer(timeoutMs: number): Promise<string | null> {
  try {
    const response = await fetch(
      `${METADATA_BASE_URL.replace(/\/+$/u, '')}/computeMetadata/v1/project/project-id`,
      {
        headers: {
          'Metadata-Flavor': 'Google',
        },
        signal: AbortSignal.timeout(timeoutMs),
      }
    );
    if (!response.ok) return null;
    const projectId = (await response.text()).trim();
    return projectId || null;
  } catch {
    return null;
  }
}

async function getAccessTokenFromApplicationCredentials(timeoutMs: number): Promise<string | null> {
  const credentials = await loadGoogleApplicationCredentials();
  if (!credentials) return null;
  if (credentials.type === 'service_account') {
    return exchangeServiceAccountForAccessToken(credentials, timeoutMs);
  }
  return exchangeRefreshTokenForAccessToken(credentials, timeoutMs);
}

export async function getGoogleCloudProjectId(options?: { timeoutMs?: number }): Promise<string> {
  const envProject = getEnvProjectId();
  if (envProject) return envProject;

  const credentials = await loadGoogleApplicationCredentials().catch(() => null);
  if (credentials && 'project_id' in credentials && credentials.project_id?.trim()) {
    return credentials.project_id.trim();
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const metadataProject = await getProjectIdFromMetadataServer(timeoutMs);
  if (metadataProject) return metadataProject;

  throw new Error(
    'Google Cloud project id not available. Set GOOGLE_CLOUD_PROJECT, provide GOOGLE_APPLICATION_CREDENTIALS with project_id, or run on Google Cloud with metadata access.'
  );
}

export async function getGoogleAccessToken(options?: {
  gcloudBinary?: string;
  timeoutMs?: number;
}): Promise<string> {
  const envToken = getEnvAccessToken();
  if (envToken) return envToken;

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const adcToken = await getAccessTokenFromApplicationCredentials(timeoutMs).catch(() => null);
  if (adcToken) return adcToken;

  const metadataToken = await getAccessTokenFromMetadataServer(timeoutMs);
  if (metadataToken) return metadataToken;

  const gcloudBinary = options?.gcloudBinary ?? 'gcloud';
  const commands: string[][] = [
    ['auth', 'print-access-token'],
    ['auth', 'application-default', 'print-access-token'],
  ];

  let lastError: unknown;
  for (const args of commands) {
    try {
      const { stdout } = await execFileWithOutput(gcloudBinary, args, {
        timeout: timeoutMs,
        windowsHide: true,
      });
      const token = stdout.trim();
      if (token) return token;
    } catch (error) {
      lastError = error;
    }
  }

  const detail = lastError instanceof Error ? ` ${lastError.message}` : '';
  throw new Error(
    'Google Cloud access token not available. Set GOOGLE_CLOUD_ACCESS_TOKEN, provide GOOGLE_APPLICATION_CREDENTIALS, use Google Cloud metadata credentials, or authenticate gcloud with `gcloud auth print-access-token`.' +
      detail
  );
}
