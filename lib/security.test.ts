import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { isBlockedUrl, verifyApiToken, checkRateLimit } from './security.ts';
import { sanitizeErrorMessage } from './harness/utils.ts';

describe('Security Utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isBlockedUrl (SSRF Protection)', () => {
    test('blocks loopback and IPv6 addresses', async () => {
      assert.equal(await isBlockedUrl('http://[::1]:5055'), true);
      assert.equal(await isBlockedUrl('http://127.0.0.1:3000'), true);
      assert.equal(await isBlockedUrl('http://[::ffff:127.0.0.1]'), true);
      assert.equal(await isBlockedUrl('http://[64:ff9b::7f00:1]'), true);
      assert.equal(await isBlockedUrl('http://[2002:7f00:1::]'), true);
      assert.equal(await isBlockedUrl('http://[::127.0.0.1]'), true);
    });

    test('blocks link-local, ULA, and IPv6 metadata', async () => {
      assert.equal(await isBlockedUrl('http://[fe80::1]'), true);
      assert.equal(await isBlockedUrl('http://[fc00::1]'), true);
      assert.equal(await isBlockedUrl('http://[fd00:ec2::254]'), true);
    });

    test('blocks cloud metadata IPs and hostnames', async () => {
      assert.equal(await isBlockedUrl('http://169.254.169.254'), true);
      assert.equal(await isBlockedUrl('http://100.100.100.200'), true);
      assert.equal(await isBlockedUrl('http://168.63.129.16'), true);
      assert.equal(await isBlockedUrl('http://100.64.0.1'), true);
      assert.equal(await isBlockedUrl('http://metadata.google.internal./'), true);
    });

    test('blocks private IPv4 ranges (10.x, 172.16.x, 192.168.x, 0.x)', async () => {
      assert.equal(await isBlockedUrl('http://10.0.0.1:5055'), true);
      assert.equal(await isBlockedUrl('http://172.16.0.1:5055'), true);
      assert.equal(await isBlockedUrl('http://192.168.1.50:5055'), true);
      assert.equal(await isBlockedUrl('http://0.1.2.3'), true);
    });

    test('blocks DNS entries resolving to loopback', async () => {
      assert.equal(await isBlockedUrl('http://127.0.0.1.nip.io'), true);
      assert.equal(await isBlockedUrl('http://localtest.me'), true);
    });

    test('allows private IPs when ALLOW_PRIVATE_IPS=true', async () => {
      process.env.ALLOW_PRIVATE_IPS = 'true';
      assert.equal(await isBlockedUrl('http://192.168.1.50:5055'), false);
    });

    test('allows specific hosts in OPEN_NOTEBOOK_ALLOW_LIST', async () => {
      process.env.OPEN_NOTEBOOK_ALLOW_LIST = '192.168.1.50, my-notebook.local';
      assert.equal(await isBlockedUrl('http://192.168.1.50:5055'), false);
      assert.equal(await isBlockedUrl('http://my-notebook.local:5055'), false);
    });
  });

  describe('verifyApiToken', () => {
    test('returns true when API_ACCESS_TOKEN is not configured', () => {
      delete process.env.API_ACCESS_TOKEN;
      const req = new Request('http://localhost/api/consensus');
      assert.equal(verifyApiToken(req), true);
    });

    test('verifies Bearer token and x-api-token header when API_ACCESS_TOKEN is set', () => {
      process.env.API_ACCESS_TOKEN = 'super-secret-token-123';

      const validBearerReq = new Request('http://localhost/api/consensus', {
        headers: { authorization: 'Bearer super-secret-token-123' },
      });
      assert.equal(verifyApiToken(validBearerReq), true);

      const validHeaderReq = new Request('http://localhost/api/consensus', {
        headers: { 'x-api-token': 'super-secret-token-123' },
      });
      assert.equal(verifyApiToken(validHeaderReq), true);

      const invalidReq = new Request('http://localhost/api/consensus', {
        headers: { authorization: 'Bearer wrong-token' },
      });
      assert.equal(verifyApiToken(invalidReq), false);
    });
  });

  describe('checkRateLimit', () => {
    test('enforces rate limits per key', () => {
      const req = new Request('http://localhost/api/test-limit', {
        headers: { 'x-real-ip': '203.0.113.195' },
      });

      // Allow initial requests
      for (let i = 0; i < 5; i++) {
        assert.equal(checkRateLimit(req, 5), false);
      }

      // Block 6th request
      assert.equal(checkRateLimit(req, 5), true);
    });
  });

  describe('sanitizeErrorMessage', () => {
    test('masks API keys and internal hosts', () => {
      const errorMsg = 'Failed to connect sk-proj-123456789012345678901234 at http://localhost:8080/v1';
      const sanitized = sanitizeErrorMessage(new Error(errorMsg));

      assert.equal(sanitized.includes('sk-proj-'), false);
      assert.equal(sanitized.includes('[MASKED_KEY]'), true);
      assert.equal(sanitized.includes('localhost'), false);
      assert.equal(sanitized.includes('[INTERNAL_HOST]'), true);
    });

    test('does not mask regular words like disk-space', () => {
      const msg = 'Not enough disk-space on volume';
      assert.equal(sanitizeErrorMessage(msg), 'Not enough disk-space on volume');
    });
  });
});
