/**
 * GCP Authentication Module
 * 
 * Generates short-lived OAuth2 access tokens from a Service Account JSON key.
 * Uses pure Node.js crypto (no external SDK dependency).
 * 
 * The service account key is read from GCP_SA_KEY env var,
 * which can be either raw JSON or base64-encoded JSON.
 * 
 * Tokens are cached in-memory and refreshed 5 minutes before expiry.
 */
import crypto from 'crypto';

interface ServiceAccountKey {
    client_email: string;
    private_key: string;
    project_id: string;
}

/** Cached access token */
let cachedToken: { token: string; expiry: number } | null = null;

/** Base64url encode (no padding) */
function base64url(input: string): string {
    return Buffer.from(input, 'utf-8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Parse the service account JSON from GCP_SA_KEY env var.
 * Supports both raw JSON and base64-encoded JSON.
 */
export function getServiceAccountKey(): ServiceAccountKey {
    const raw = process.env.GCP_SA_KEY;
    if (!raw) {
        throw new Error('GCP_SA_KEY environment variable is not set');
    }

    let json: string;
    try {
        // Try base64 decode first
        const decoded = Buffer.from(raw, 'base64').toString('utf-8');
        JSON.parse(decoded); // validate it's valid JSON
        json = decoded;
    } catch {
        // Fall back to raw JSON
        json = raw;
    }

    const key = JSON.parse(json) as ServiceAccountKey;
    if (!key.client_email || !key.private_key) {
        throw new Error('Invalid service account key: missing client_email or private_key');
    }
    return key;
}

/**
 * Get a valid GCP OAuth2 access token.
 * Generates a JWT, signs it with the SA private key, and exchanges it
 * at Google's OAuth2 token endpoint.
 * 
 * Tokens are cached for up to 55 minutes (1 hour validity minus 5 min buffer).
 */
export async function getAccessToken(): Promise<string> {
    // Return cached token if still valid (5 min buffer)
    if (cachedToken && Date.now() < cachedToken.expiry - 300_000) {
        return cachedToken.token;
    }

    const sa = getServiceAccountKey();
    const now = Math.floor(Date.now() / 1000);

    // Build JWT
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = base64url(JSON.stringify({
        iss: sa.client_email,
        sub: sa.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
    }));

    const signInput = `${header}.${payload}`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signInput);
    const signature = sign.sign(sa.private_key, 'base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const jwt = `${signInput}.${signature}`;

    // Exchange JWT for access token
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`GCP token exchange failed (${res.status}): ${errText}`);
    }

    const data = await res.json() as { access_token: string; expires_in: number };
    cachedToken = {
        token: data.access_token,
        expiry: Date.now() + data.expires_in * 1000,
    };

    return cachedToken.token;
}

/**
 * Get the GCP project ID (from env var or service account key).
 */
export function getProjectId(): string {
    return process.env.GCP_PROJECT_ID || getServiceAccountKey().project_id;
}

/**
 * Get the GCP region (from env var, default: europe-west1).
 */
export function getRegion(): string {
    return process.env.GCP_REGION || 'europe-west1';
}
