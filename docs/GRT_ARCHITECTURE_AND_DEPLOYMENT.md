# GRT System — Architecture & Deployment Specification

**Version:** 1.0.0
**Date:** 2026-02-23
**Classification:** INTERNAL — CONFIDENTIAL
**Author:** GRT DevOps & Security Architecture Team

---

## Table of Contents

1. [3-Server Zero-Trust Model](#1-3-server-zero-trust-model)
2. [CI/CD Pipeline — One-Way Code Promotion](#2-cicd-pipeline--one-way-code-promotion)
3. [Mixed Cloud & Domain Gateway](#3-mixed-cloud--domain-gateway)
4. [Environment Isolation Matrix](#4-environment-isolation-matrix)
5. [Security Policies](#5-security-policies)

---

## 1. 3-Server Zero-Trust Model

The GRT System operates on a **3-Server architecture** designed under Zero-Trust principles:
_"Never trust, always verify — even inside the network perimeter."_

```
┌───────────────────────────────────────────────────────────────────────┐
│                     GRT ZERO-TRUST ARCHITECTURE                       │
│                                                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │
│  │   SERVER 1       │  │   SERVER 2       │  │   SERVER 3       │     │
│  │   PROD VAULT     │  │   DEV/TEST       │  │   AI DMZ         │     │
│  │   (Air-Gapped)   │  │   SANDBOX        │  │   GATEWAY        │     │
│  │                   │  │                   │  │                   │    │
│  │  ┌─────────────┐ │  │  ┌─────────────┐ │  │  ┌─────────────┐ │    │
│  │  │ grt_prod_db │ │  │  │ grt_dev_db  │ │  │  │ AI Proxy    │ │    │
│  │  │ PostgreSQL  │ │  │  │ grt_test_db │ │  │  │ (Nginx)     │ │    │
│  │  │ Redis       │ │  │  │ PostgreSQL  │ │  │  │             │ │    │
│  │  │ S3 Storage  │ │  │  │ Redis       │ │  │  │ ┌─────────┐│ │    │
│  │  └─────────────┘ │  │  │ Ollama LLM  │ │  │  │ │Firewall ││ │    │
│  │  ┌─────────────┐ │  │  └─────────────┘ │  │  │ │(Egress) ││ │    │
│  │  │ GRT App     │ │  │  ┌─────────────┐ │  │  │ └─────────┘│ │    │
│  │  │ (Node.js)   │ │  │  │ GRT App     │ │  │  └─────────────┘ │    │
│  │  │ Port 3000   │ │  │  │ Dev + Test  │ │  │                   │    │
│  │  └─────────────┘ │  │  │ Port 3000   │ │  │  Allowed Egress:  │    │
│  │                   │  │  └─────────────┘ │  │  ✓ api.openai.com │    │
│  │  Access: VPN +    │  │                   │  │  ✓ api.deepseek   │    │
│  │  mTLS only        │  │  Access: Office   │  │  ✓ ollama local   │    │
│  │                   │  │  LAN + VPN        │  │  ✗ ALL OTHER      │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘      │
│           ▲                    ▲                    ▲                  │
│           │                    │                    │                  │
│     ══════╪════════════════════╪════════════════════╪═══════          │
│           │    INTERNAL LAN (172.28.0.0/16)        │                  │
│     ══════╪════════════════════╪════════════════════╪═══════          │
└───────────────────────────────────────────────────────────────────────┘
```

### Server 1: Production Vault (Air-Gapped)

| Attribute | Value |
|-----------|-------|
| **Hostname** | `server1.internal` / `prod.gerrytech.com` |
| **OS** | Ubuntu 22.04 LTS (hardened) |
| **Network** | Internal LAN only — NO direct internet access |
| **Database** | PostgreSQL 16 → `grt_prod_db` |
| **Cache** | Redis 7 (AOF persistence, password-protected) |
| **Storage** | MinIO S3 (on-premise object storage) |
| **App** | GRT System (Node.js), port 3000 |
| **Access** | VPN + mTLS certificate required |

**Security Controls:**
- No outbound internet connectivity (air-gapped from public internet)
- All AI API calls are routed through Server 3 (AI DMZ Gateway)
- Database accepts connections ONLY from `172.28.0.0/16` subnet
- SSH access requires hardware key (YubiKey) + bastion host
- File system encryption at rest (LUKS)
- Automated daily backup to encrypted off-site storage
- All operations logged to immutable audit trail

### Server 2: Dev/Test Sandbox

| Attribute | Value |
|-----------|-------|
| **Hostname** | `server2.internal` |
| **OS** | Windows 11 Pro / Ubuntu 22.04 LTS |
| **Network** | Office LAN + VPN for remote developers |
| **Database** | PostgreSQL 16 → `grt_dev_db` + `grt_test_db` |
| **Cache** | Redis 7 (no persistence in test) |
| **AI** | Ollama (local LLM, no cloud API needed) |
| **App** | GRT System (dev mode + test runner) |

**Security Controls:**
- Dev and Test databases are physically separate from production
- Test database is wiped and re-seeded before each test cycle
- Cannot connect to `grt_prod_db` — blocked by code-level safety guard AND network ACL
- Developer laptops connect via office LAN or WireGuard VPN
- Hot-reload (HMR) enabled for rapid development

### Server 3: AI DMZ Gateway

| Attribute | Value |
|-----------|-------|
| **Hostname** | `server3-dmz.internal` |
| **OS** | Alpine Linux (minimal attack surface) |
| **Network** | DMZ — bridged between internal LAN and controlled internet egress |
| **Role** | Reverse proxy for all external AI API calls |
| **Port** | 8443 (internal) → 443 (external, strict egress) |

**Architecture:**
```
Production App (Server 1)
        │
        │  POST http://server3-dmz.internal:8443/v1/chat/completions
        │  Header: X-GRT-Service-Token: <signed JWT>
        ▼
┌──────────────────────────────────────┐
│         SERVER 3: AI DMZ GATEWAY     │
│                                      │
│  ┌──────────────────────────────┐   │
│  │  Nginx Reverse Proxy         │   │
│  │  - Validates service token   │   │
│  │  - Rate limits (100 req/min) │   │
│  │  - Request/response logging  │   │
│  │  - PII scrubbing filter      │   │
│  │  - Max payload: 128KB        │   │
│  └──────────────┬───────────────┘   │
│                 │                     │
│  ┌──────────────▼───────────────┐   │
│  │  Outbound Firewall (iptables)│   │
│  │                              │   │
│  │  ALLOW:                      │   │
│  │   → api.openai.com:443      │   │
│  │   → api.deepseek.com:443    │   │
│  │   → generativelanguage.     │   │
│  │     googleapis.com:443      │   │
│  │                              │   │
│  │  DENY:                       │   │
│  │   → ALL OTHER DESTINATIONS  │   │
│  └──────────────────────────────┘   │
└──────────────────────────────────────┘
```

**Egress Firewall Rules (iptables):**
```bash
# Default: deny all outbound
iptables -P OUTPUT DROP

# Allow DNS resolution (internal DNS only)
iptables -A OUTPUT -p udp --dport 53 -d 172.28.0.1 -j ACCEPT

# Allow OpenAI API
iptables -A OUTPUT -p tcp --dport 443 -d api.openai.com -j ACCEPT

# Allow DeepSeek API
iptables -A OUTPUT -p tcp --dport 443 -d api.deepseek.com -j ACCEPT

# Allow Google Gemini API
iptables -A OUTPUT -p tcp --dport 443 -d generativelanguage.googleapis.com -j ACCEPT

# Allow internal LAN responses
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Log and drop everything else
iptables -A OUTPUT -j LOG --log-prefix "DMZ-BLOCKED: "
iptables -A OUTPUT -j DROP
```

**PII Scrubbing Filter:**
The AI DMZ proxy strips sensitive data before forwarding to external APIs:
- Chinese national ID numbers (身份证号)
- Phone numbers matching `1[3-9]\d{9}`
- Email addresses
- Internal IP addresses and hostnames
- Employee names (matched against HR database)

---

## 2. CI/CD Pipeline — One-Way Code Promotion

Code flows in ONE direction only. There is no mechanism to push code backward from production to dev.

```
┌──────────┐     ┌──────────┐     ┌───────────┐     ┌──────────────┐     ┌──────────┐
│  DEV     │     │  BUILD   │     │   TEST    │     │   MANUAL     │     │  PROD    │
│  Win11   │────▶│  CI      │────▶│  Server 2 │────▶│   APPROVAL   │────▶│ Server 1 │
│  Local   │     │  GitHub  │     │  Auto     │     │   CEO/CTO    │     │ Air-Gap  │
│          │     │  Actions │     │  Suite    │     │   Sign-off   │     │ Deploy   │
└──────────┘     └──────────┘     └───────────┘     └──────────────┘     └──────────┘
    git push        build &          E2E test         PR approval +        Secure
    to branch       typecheck        DB migration     manual gate          rsync/SCP
                    lint             test              required             via bastion
```

### Stage 1: Development (Win11 Workstation)

- Developer works on feature branch
- `NODE_ENV=development` → connects to `grt_dev_db`
- Local Ollama for AI features (no cloud API costs)
- `pnpm dev` with hot-reload

### Stage 2: Build (GitHub Actions CI)

Triggered on push to any branch:

```yaml
# .github/workflows/ci.yml (conceptual)
jobs:
  build:
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      # TypeScript compilation validates all types
      # Vite build catches import errors
      # esbuild bundles server code
```

**Gate:** Build must succeed (exit code 0). No TypeScript errors.

### Stage 3: Test (Server 2 — Automated)

- Deploy build artifact to Server 2 test environment
- `NODE_ENV=test` → connects to `grt_test_db` (wiped before run)
- Run database migrations against test DB
- Execute automated test suite
- Validate all tRPC endpoints respond correctly

**Gate:** All tests pass. Zero regressions.

### Stage 4: Manual Approval

- Pull Request reviewed by at least 1 senior engineer
- **CEO or CTO explicit sign-off required** for production deployment
- PR description must include:
  - What changed and why
  - Database migration impact assessment
  - Rollback procedure

**Gate:** Human approval on GitHub PR. No automated bypass.

### Stage 5: Production Deployment (Server 1)

- Artifact transferred to Server 1 via secure channel (SCP through bastion host)
- `NODE_ENV=production` → connects to `grt_prod_db`
- Database migration runs with backup taken first
- Health check confirms app is responding
- DNS/load balancer switches traffic

**Rollback:** Previous artifact is retained. If health check fails, automatic rollback to last known good state.

---

## 3. Mixed Cloud & Domain Gateway

### Network Topology

```
                        ┌─────────────────────────┐
                        │     INTERNET             │
                        └─────────┬───────────────┘
                                  │
                        ┌─────────▼───────────────┐
                        │  Cloudflare / Aliyun CDN │
                        │  DDoS Protection         │
                        │  WAF (OWASP Top 10)      │
                        │  SSL Termination         │
                        └─────────┬───────────────┘
                                  │ HTTPS :443
                        ┌─────────▼───────────────┐
                        │  EDGE GATEWAY            │
                        │  Nginx / Traefik         │
                        │  *.gerrytech.com         │
                        │                          │
                        │  Rate Limiting:          │
                        │   API: 200 req/min/IP    │
                        │   Auth: 10 req/min/IP    │
                        │                          │
                        │  Routes:                 │
                        │   /        → GRT App     │
                        │   /api/*   → GRT API     │
                        │   /sso/*   → OAuth       │
                        └─────┬─────┬─────────────┘
                              │     │
               ┌──────────────┘     └──────────────┐
               │                                    │
     ┌─────────▼─────────┐              ┌──────────▼──────────┐
     │  Server 1 (Prod)  │              │  Server 3 (AI DMZ)  │
     │  :3000            │─────────────▶│  :8443              │
     │  GRT Application  │  AI calls    │  AI Proxy           │
     └───────────────────┘              └─────────────────────┘
```

### Reverse Proxy Configuration (Nginx)

```nginx
# /etc/nginx/conf.d/grt-prod.conf

upstream grt_app {
    server server1.internal:3000;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name grt.gerrytech.com;

    # TLS 1.3 only (zero-trust minimum)
    ssl_protocols TLSv1.3;
    ssl_certificate     /etc/ssl/gerrytech/fullchain.pem;
    ssl_certificate_key /etc/ssl/gerrytech/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss:;" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=200r/m;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=10r/m;

    location /api/auth/ {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://grt_app;
    }

    location /api/ {
        limit_req zone=api burst=50 nodelay;
        proxy_pass http://grt_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://grt_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### VPN / Zero-Trust Access for Remote Employees

GRT operates across three global offices. Remote employees access the system through a Zero-Trust model:

| Office | Location | Access Method |
|--------|----------|---------------|
| **HQ** | China (Suzhou/Shanghai) | Office LAN (direct) |
| **Detroit** | USA (Michigan) | WireGuard VPN → Prod |
| **Memmingen** | Germany (Bavaria) | WireGuard VPN → Prod |

**WireGuard VPN Configuration:**

```ini
# /etc/wireguard/wg0.conf (Server 1)
[Interface]
Address = 10.0.0.1/24
ListenPort = 51820
PrivateKey = <server-private-key>

# Detroit office gateway
[Peer]
PublicKey = <detroit-public-key>
AllowedIPs = 10.0.0.10/32
Endpoint = detroit-vpn.gerrytech.com:51820

# Memmingen office gateway
[Peer]
PublicKey = <memmingen-public-key>
AllowedIPs = 10.0.0.20/32
Endpoint = memmingen-vpn.gerrytech.com:51820
```

**Zero-Trust Access Flow:**
1. Employee authenticates via SSO (`sso.gerrytech.com`)
2. Device posture check (OS version, disk encryption, antivirus)
3. VPN tunnel established (WireGuard, always-on)
4. mTLS client certificate validates device identity
5. Role-based access control (18 roles, BU-scoped) enforced at application layer
6. Session audit logging (all actions recorded)

---

## 4. Environment Isolation Matrix

| Aspect | Development | Test | Production |
|--------|-------------|------|------------|
| **Server** | Win11 Workstation | Server 2 | Server 1 (Air-Gapped) |
| **NODE_ENV** | `development` | `test` | `production` |
| **Database** | `grt_dev_db` | `grt_test_db` | `grt_prod_db` |
| **DB Host** | localhost:5432 | server2.internal:5432 | server1.internal:5432 |
| **Env File** | `.env.development` | `.env.test` | `.env.production` |
| **AI Provider** | Ollama (local) | Ollama (local) | OpenAI via DMZ |
| **AI Endpoint** | localhost:11434 | localhost:11434 | server3-dmz:8443 |
| **Auth** | Local (PIN) | Local (PIN) | SSO + mTLS |
| **Internet** | Full access | Restricted | None (air-gapped) |
| **Secrets** | .env file | .env file | Vault injection |
| **Data** | Seed/mock data | Seed/mock data | Real customer data |
| **Backup** | None | None | Daily encrypted |
| **Access** | Developer only | CI + team | VPN + approval |

### Safety Guards (Code-Level)

| Guard | Location | Behavior |
|-------|----------|----------|
| Production DB blocker | `server/db.ts` | Refuses `grt_prod_db` if `NODE_ENV !== production` |
| Drizzle migration guard | `drizzle.config.ts` | Halts with error if prod URL + non-prod env |
| Default env fallback | `server/_core/env.ts` | Defaults to `development` if `NODE_ENV` unset |
| Startup log | `server/_core/env.ts` | Prints active environment on every boot |

---

## 5. Security Policies

### Secret Management

| Environment | Method | Tool |
|-------------|--------|------|
| Development | `.env.development` file (gitignored) | dotenv |
| Test | `.env.test` file (gitignored) | dotenv |
| Production | OS environment injection at deploy time | HashiCorp Vault / systemd env |

**NEVER store production secrets in files on disk.** Production credentials are:
1. Stored in HashiCorp Vault (or equivalent)
2. Injected into the process environment at container/service start
3. Never written to `.env.production` in deployed state

### Rotation Schedule

| Secret | Rotation | Method |
|--------|----------|--------|
| JWT_SECRET | 90 days | Vault auto-rotate |
| DATABASE_URL password | 90 days | Vault auto-rotate |
| OPENAI_API_KEY | On compromise | Manual + Vault |
| ENCRYPTION_MASTER_KEY | Yearly | Manual ceremony |
| VPN keys | Yearly | WireGuard re-keying |
| TLS certificates | Auto-renew | Let's Encrypt / ACME |

### Incident Response

1. **Detection:** Automated health checks (30s interval) + log anomaly alerts
2. **Containment:** Kill switch revokes VPN + API tokens within 60 seconds
3. **Eradication:** Rotate all secrets, redeploy from known-good artifact
4. **Recovery:** Restore from daily backup (RPO: 24h, RTO: 1h)
5. **Post-mortem:** Mandatory written report within 48 hours

---

*This document is the authoritative reference for GRT System deployment architecture. All team members must read and acknowledge before receiving production access.*
