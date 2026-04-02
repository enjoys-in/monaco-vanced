# Backend Setup Guide

Step-by-step instructions for enabling backend-dependent modules in Monaco Vanced.

---

## 1. Debugger Module (`debugger-module`)

**Protocol**: Debug Adapter Protocol (DAP) over WebSocket

### What You Need

| Component | Description |
|---|---|
| WebSocket server | Accepts connections at `ws://host:port/dap` |
| Debug adapter | Language-specific DAP adapter binary |

### Step-by-Step

#### A. Pick a debug adapter for your target language

| Language | Adapter | Install |
|---|---|---|
| Node.js | `@vscode/js-debug` | `npm i -g @vscode/js-debug` |
| Python | `debugpy` | `pip install debugpy` |
| C/C++/Rust | `codelldb` | Download from [GitHub releases](https://github.com/nickelc/codelldb) |
| Go | `dlv` (Delve) | `go install github.com/go-delve/delve/cmd/dlv@latest` |

#### B. Create a WebSocket-to-DAP bridge

The adapter speaks DAP over stdio. You need a thin server that pipes WebSocket ↔ stdio.

```bash
npm install ws
```

```ts
// dap-server.ts
import { WebSocketServer } from "ws";
import { spawn } from "child_process";

const wss = new WebSocketServer({ port: 4711, path: "/dap" });

wss.on("connection", (ws) => {
  // Spawn the debug adapter (Node.js example)
  const adapter = spawn("node", ["path/to/js-debug/src/dapDebugServer.js"]);

  // DAP uses Content-Length headers over stdio
  let buffer = Buffer.alloc(0);

  adapter.stdout.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) break;
      const header = buffer.subarray(0, headerEnd).toString();
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) break;
      const len = parseInt(match[1], 10);
      const msgStart = headerEnd + 4;
      if (buffer.length < msgStart + len) break;
      const msg = buffer.subarray(msgStart, msgStart + len).toString();
      buffer = buffer.subarray(msgStart + len);
      ws.send(msg);
    }
  });

  ws.on("message", (data) => {
    const msg = data.toString();
    const header = `Content-Length: ${Buffer.byteLength(msg)}\r\n\r\n`;
    adapter.stdin.write(header + msg);
  });

  ws.on("close", () => adapter.kill());
  adapter.on("exit", () => ws.close());
});

console.log("DAP server listening on ws://localhost:4711/dap");
```

#### C. Wire into Monaco Vanced

```ts
const { plugin: debugPlugin, api: debugApi } = createDebugPlugin({
  adapterUrl: "ws://localhost:4711/dap",   // your server URL
  launchConfig: {
    program: "${workspaceFolder}/src/index.ts",
    type: "node",
    request: "launch",
  },
});
```

#### D. Production deployment

- Run the DAP server behind a reverse proxy (nginx/caddy) with `wss://`
- Use `wss://your-domain.com/dap` as `adapterUrl`
- Add authentication middleware (JWT/session) on the WebSocket upgrade

---

## 2. Review Module (`review-module`)

**Protocol**: GitHub REST API / GitLab REST API

### What You Need

| Component | Description |
|---|---|
| GitHub/GitLab OAuth app | For user authentication |
| API proxy server | Avoids CORS + hides tokens from the browser |
| Personal Access Token (PAT) | For testing (OAuth for production) |

### Step-by-Step

#### A. Create a GitHub OAuth App

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New**
2. Set:
   - Homepage URL: `https://your-app.com`
   - Callback URL: `https://your-app.com/auth/github/callback`
3. Note the **Client ID** and **Client Secret**

#### B. Build an API proxy

The browser cannot call `api.github.com` directly with tokens (CORS + security). Build a thin proxy:

```bash
npm install express cors
```

```ts
// review-proxy.ts
import express from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: "https://your-app.com" }));
app.use(express.json());

// Proxy all /api/github/* to api.github.com
app.all("/api/github/*", async (req, res) => {
  const githubPath = req.params[0]; // everything after /api/github/
  const token = req.headers.authorization; // "Bearer ghp_xxx"

  const resp = await fetch(`https://api.github.com/${githubPath}`, {
    method: req.method,
    headers: {
      Authorization: token ?? "",
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body),
  });

  const data = await resp.json();
  res.status(resp.status).json(data);
});

app.listen(3001, () => console.log("Review proxy on :3001"));
```

#### C. Wire into Monaco Vanced

```ts
const { plugin: reviewPlugin, api: reviewApi } = createReviewPlugin({
  provider: "github",
  apiUrl: "https://your-server.com/api/github",  // your proxy
  token: "<user-oauth-token>",                     // from auth flow
  owner: "enjoys-in",
  repo: "monaco-vanced",
});
```

#### D. GitLab variant

Same pattern — create an OAuth app in GitLab, point `apiUrl` to your proxy at `/api/gitlab/*`, set `provider: "gitlab"`.

---

## 3. Git Module (`git-module`)

**Protocol**: REST API wrapping Git operations

### Option A: Backend Git Server (full features)

#### What You Need

| Component | Description |
|---|---|
| Git REST API server | Wraps `git` CLI / `simple-git` / `libgit2` |
| Repo storage | Filesystem or object storage for cloned repos |

#### Step-by-Step

```bash
npm install express simple-git cors
```

```ts
// git-server.ts
import express from "express";
import cors from "cors";
import simpleGit from "simple-git";

const app = express();
app.use(cors({ origin: "https://your-app.com" }));
app.use(express.json());

const REPO_DIR = "/repos"; // where repos are cloned

app.get("/api/git/status", async (_req, res) => {
  const git = simpleGit(REPO_DIR);
  const status = await git.status();
  res.json(status.files.map((f) => ({
    path: f.path,
    status: f.working_dir === "?" ? "untracked" : f.working_dir === "M" ? "modified" : f.working_dir,
    staged: f.index !== " " && f.index !== "?",
  })));
});

app.post("/api/git/stage", async (req, res) => {
  const git = simpleGit(REPO_DIR);
  await git.add(req.body.paths);
  res.json({ ok: true });
});

app.post("/api/git/commit", async (req, res) => {
  const git = simpleGit(REPO_DIR);
  const result = await git.commit(req.body.message);
  res.json({ hash: result.commit, message: req.body.message });
});

app.get("/api/git/branches", async (_req, res) => {
  const git = simpleGit(REPO_DIR);
  const branches = await git.branch();
  res.json(Object.values(branches.branches).map((b) => ({
    name: b.name,
    current: b.current,
  })));
});

app.post("/api/git/checkout", async (req, res) => {
  const git = simpleGit(REPO_DIR);
  await git.checkout(req.body.branch);
  res.json({ ok: true });
});

app.get("/api/git/log", async (req, res) => {
  const git = simpleGit(REPO_DIR);
  const log = await git.log({ maxCount: Number(req.query.limit) || 50 });
  res.json(log.all.map((c) => ({
    hash: c.hash,
    message: c.message,
    author: c.author_name,
    date: new Date(c.date).getTime(),
  })));
});

app.get("/api/git/diff", async (req, res) => {
  const git = simpleGit(REPO_DIR);
  const diff = await git.diff([req.query.path as string].filter(Boolean));
  res.json({ raw: diff });
});

app.listen(3002, () => console.log("Git server on :3002"));
```

Wire into Monaco Vanced:

```ts
const { plugin: gitPlugin, api: gitApi } = createGitPlugin({
  apiUrl: "https://your-server.com/api/git",
});
```

### Option B: Client-Side Only (no backend)

Use `isomorphic-git` for fully browser-based Git. No server needed.

```bash
npm install isomorphic-git @nicolo-ribaudo/chokidar-2
```

```ts
import * as git from "isomorphic-git";
import http from "isomorphic-git/http/web";
import LightningFS from "@nicolo-ribaudo/chokidar-2";

const fs = new LightningFS("my-repo");

// Clone
await git.clone({
  fs, http,
  dir: "/repo",
  url: "https://github.com/enjoys-in/monaco-vanced",
  corsProxy: "https://cors.isomorphic-git.org",
});

// Status
const status = await git.statusMatrix({ fs, dir: "/repo" });
```

Then wire `isomorphic-git` calls into a custom `GitClient` override.

---

## 4. Context Engine (`context-engine`)

**Protocol**: CDN fetch (static JSON files) + IndexedDB persistence

### What You Need

| Component | Description |
|---|---|
| CDN or static server | Hosts manifest + language/command JSON packs |
| JSON data packs | Per-language provider data (completions, hover, definitions, etc.) |

### Step-by-Step

#### A. Prepare the data directory structure

```
your-cdn/
  data/
    manifest.json                    # language pack catalog
    completion/
      python.json
      javascript.json
      ...
    hover/
      python.json
      javascript.json
      ...
    definition/
      python.json
      ...
    (25 provider-type directories)
    commands/
      manifest.json                  # terminal command catalog
      aws.json
      docker.json
      git.json
      ...
```

#### B. Create the language manifest

```json
// data/manifest.json
{
  "version": "1.0.0",
  "languages": [
    {
      "id": "python",
      "name": "Python",
      "files": {
        "completion": "completion/python.json",
        "hover": "hover/python.json",
        "definition": "definition/python.json",
        "signatureHelp": "signatureHelp/python.json"
      }
    },
    {
      "id": "javascript",
      "name": "JavaScript",
      "files": {
        "completion": "completion/javascript.json",
        "hover": "hover/javascript.json",
        "definition": "definition/javascript.json"
      }
    }
  ]
}
```

#### C. Create provider data files

Each JSON file contains raw provider data that the converter layer transforms into Monaco providers.

```json
// data/completion/python.json
{
  "items": [
    {
      "label": "print",
      "kind": "Function",
      "detail": "print(*objects, sep=' ', end='\\n', file=sys.stdout)",
      "documentation": "Print objects to the text stream file.",
      "insertText": "print($1)"
    },
    {
      "label": "len",
      "kind": "Function",
      "detail": "len(s) -> int",
      "documentation": "Return the number of items in a container.",
      "insertText": "len($1)"
    }
  ]
}
```

```json
// data/hover/python.json
{
  "entries": [
    {
      "pattern": "\\bprint\\b",
      "contents": ["```python\nprint(*objects, sep=' ', end='\\n', file=sys.stdout, flush=False)\n```\n\nPrint objects to the text stream file."]
    }
  ]
}
```

#### D. Create the terminal commands manifest

```json
// data/commands/manifest.json
{
  "version": "1.0.0",
  "categories": [
    {
      "category": "Cloud CLIs",
      "context": ["aws", "gcloud", "az"],
      "files": ["aws.json", "gcloud.json", "az.json"]
    },
    {
      "category": "Container Tools",
      "context": ["docker", "kubectl", "podman"],
      "files": ["docker.json", "kubectl.json"]
    }
  ]
}
```

#### E. Host the data

**Option 1 — npm + jsDelivr (recommended)**:
```bash
# Publish as an npm package
npm publish  # → @your-org/context-packs
# Access via https://cdn.jsdelivr.net/npm/@your-org/context-packs/data/manifest.json
```

**Option 2 — Static hosting** (S3, Vercel, Cloudflare Pages):
```bash
# Upload the data/ directory to your CDN/static host
# Set CORS headers: Access-Control-Allow-Origin: *
```

**Option 3 — Self-hosted Express**:
```ts
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use("/data", express.static("./data"));
app.listen(3003, () => console.log("Context CDN on :3003"));
```

#### F. Configure in Monaco Vanced

Point the context engine API layer to your CDN base URL. The engine fetches manifest → user selects packs → data is downloaded and persisted in IndexedDB → providers are registered into Monaco.

---

## Environment Variable Summary

```bash
# .env

# Debugger
DAP_SERVER_URL=ws://localhost:4711/dap

# Review (GitHub)
GITHUB_CLIENT_ID=Ov23li...
GITHUB_CLIENT_SECRET=secret...
GITHUB_API_PROXY=https://your-server.com/api/github

# Git
GIT_API_URL=https://your-server.com/api/git

# Context Engine
CONTEXT_ENGINE_CDN=https://cdn.jsdelivr.net/npm/@your-org/context-packs

# Auth
AUTH_CALLBACK_URL=https://your-app.com/auth/callback
```

---

## Deployment Checklist

- [ ] **DAP server** running with TLS (`wss://`) and auth middleware
- [ ] **GitHub OAuth app** created with correct callback URL
- [ ] **Review proxy** deployed with CORS configured for your frontend origin
- [ ] **Git API server** deployed with repo storage provisioned
- [ ] **Context packs** published to npm or hosted on CDN with CORS headers
- [ ] **Environment variables** set in production deployment (Vercel/Docker/etc.)
- [ ] **Secrets** stored securely — never commit tokens to git
- [ ] **HTTPS** everywhere — all WebSocket and REST endpoints use TLS in production
