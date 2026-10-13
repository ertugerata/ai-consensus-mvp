# 🔧 Security Fixes Summary - ai-consensus-mvp

## Issues Identified and Fixed (2026-10-13)

### 1. Hardcoded API Key Leakage
- **File**: `.env`
- **Issue**: `OPENROUTER_API_KEY` had a hardcoded value
- **Fix**: Removed key from `.env`; env var now empty, to be managed via CI/CD

### 2. Production API Token Exemption
- **File**: `lib/security.ts`
- **Issue**: `verifyApiToken`/`validateApiToken` allowed unauthenticated access in production when token not set
- **Fix**: Production now requires token by default; `ALLOW_UNAUTHENTICATED` only works when explicitly `true`

### 3. Rate Limit IP Defaulting
- **File**: `lib/security.ts`
- **Issue**: `getClientIp` defaulted to `127.0.0.1` when `TRUST_PROXY` not set, disabling external rate limiting
- **Fix**: Function now extracts IP from `x-real-ip` and `x-forwarded-for` headers when `TRUST_PROXY='true'`

### 4. SSRF Protection Gap
- **File**: `lib/security.ts`
- **Issue**: `validateAndPinTargetUrl` lacked DNS rebinding protection
- **Fix**: Added checks for all resolved IPs; pinned IP re-validated against private ranges

### 5. X-Forwarded-For IP Spoofing
- **File**: `lib/security.ts`
- **Issue**: `x-forwarded-for` usable without proxy trust, enabling IP spoofing
- **Fix**: Header only processed when `TRUST_PROXY='true'` is configured

### 6. Incomplete Blocked Metadata Hosts
- **File**: `lib/security.ts`
- **Issue**: Only AWS/GCP metadata IPs blocked
- **Fix**: Expanded list to include Azure, Alibaba Cloud, and metadata subdomain patterns

### 7. API Key Masking Regex
- **File**: `lib/harness/utils.ts`
- **Issue**: Regex didn't cover all provider API key formats
- **Fix**: Added patterns for Anthropic (`sk-ant-`) and OpenRouter (`sk-or-v1-`) keys

### 8. DNS Lookup DoS Vector
- **File**: `lib/security.ts`
- **Issue**: `dns.lookup()` called without caching, enabling potential DoS
- **Fix**: Added `dnsCache` Map with max 50 entries

### 9. Overly Restrictive URL Path Checks
- **File**: `lib/security.ts`
- **Issue**: `validateAndPinTargetUrl` required `pathname === '/'`, blocking valid use cases
- **Fix**: Blocks only `username`/`password` and `search`/`hash`; path now permitted

### 10. Database File Permissions
- **File**: `Dockerfile`
- **Issue**: SQLite files in mounted volume had unrestricted permissions
- **Fix**: Added `chmod 600` and `chown 1001:1001` for `.db`, `.db-shm`, `.db-wal` files

## Files Modified
- `.env` - Removed hardcoded API key
- `lib/security.ts` - 6 fixes (token validation, rate limit, SSRF, metadata hosts, DNS cache, path checks)
- `lib/harness/utils.ts` - API key masking enhancement
- `Dockerfile` - Database file permissions
- `ai-consensus-mvp-issues.md` - Full bug report with fixes section