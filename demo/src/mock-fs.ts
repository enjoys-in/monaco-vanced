// ── Mock File System API — simulates a real project structure ─
// Stores files in memory as a flat Map<path, content>.
// Provides CRUD, directory listing, and file watching via EventBus.

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { FileEvents } from "@enjoys/monaco-vanced/core/events";

// ── Types ────────────────────────────────────────────────────

export interface FsEntry {
  path: string;
  name: string;
  type: "file" | "directory";
  language?: string;
  size?: number;
  modified?: number;
}

export interface MockFsAPI {
  readFile(path: string): string | null;
  writeFile(path: string, content: string): void;
  deleteFile(path: string): void;
  rename(oldPath: string, newPath: string): void;
  exists(path: string): boolean;
  readDir(dirPath: string): FsEntry[];
  createDir(path: string): void;
  getTree(): FsEntry[];
  getAllFiles(): Map<string, string>;
  stat(path: string): FsEntry | null;
}

// ── Language detection ───────────────────────────────────────

const EXT_LANG: Record<string, string> = {
  ts: "typescript", tsx: "typescriptreact", js: "javascript", jsx: "javascriptreact",
  json: "json", css: "css", scss: "scss", less: "less",
  html: "html", htm: "html", md: "markdown", yaml: "yaml", yml: "yaml",
  py: "python", rs: "rust", go: "go", toml: "toml", sh: "shell",
  svg: "xml", xml: "xml", sql: "sql", graphql: "graphql",
  dockerfile: "dockerfile", env: "plaintext", gitignore: "plaintext",
  lock: "plaintext", txt: "plaintext",
};

function detectLanguage(path: string): string {
  const name = path.split("/").pop() ?? "";
  if (name === "Dockerfile") return "dockerfile";
  if (name === ".env" || name.startsWith(".env.")) return "plaintext";
  if (name === ".gitignore") return "plaintext";
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  return EXT_LANG[ext] ?? "plaintext";
}

// ── Create the mock FS ───────────────────────────────────────

export function createMockFs(eventBus: EventBus): MockFsAPI {
  const files = new Map<string, string>();
  const dirs = new Set<string>();

  // Ensure parent directories exist
  function ensureDirs(path: string) {
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join("/"));
    }
  }

  function readFile(path: string): string | null {
    return files.get(path) ?? null;
  }

  function writeFile(path: string, content: string) {
    const isNew = !files.has(path);
    files.set(path, content);
    ensureDirs(path);
    eventBus.emit(isNew ? FileEvents.Created : FileEvents.Save, {
      uri: path,
      label: path.split("/").pop(),
      content,
    });
  }

  function deleteFile(path: string) {
    if (files.has(path)) {
      files.delete(path);
      eventBus.emit(FileEvents.Deleted, { uri: path });
    }
    // Also delete all files under a directory
    const prefix = path + "/";
    for (const key of [...files.keys()]) {
      if (key.startsWith(prefix)) {
        files.delete(key);
        eventBus.emit(FileEvents.Deleted, { uri: key });
      }
    }
    dirs.delete(path);
  }

  function rename(oldPath: string, newPath: string) {
    const content = files.get(oldPath);
    if (content != null) {
      files.delete(oldPath);
      files.set(newPath, content);
      ensureDirs(newPath);
      eventBus.emit(FileEvents.Renamed, { oldUri: oldPath, newUri: newPath });
    }
  }

  function exists(path: string): boolean {
    return files.has(path) || dirs.has(path);
  }

  function readDir(dirPath: string): FsEntry[] {
    const prefix = dirPath ? dirPath + "/" : "";
    const seen = new Set<string>();
    const entries: FsEntry[] = [];

    for (const path of files.keys()) {
      if (!path.startsWith(prefix)) continue;
      const rest = path.slice(prefix.length);
      const firstSegment = rest.split("/")[0];
      if (seen.has(firstSegment)) continue;
      seen.add(firstSegment);

      if (rest.includes("/")) {
        entries.push({
          path: prefix + firstSegment,
          name: firstSegment,
          type: "directory",
        });
      } else {
        const content = files.get(path)!;
        entries.push({
          path,
          name: firstSegment,
          type: "file",
          language: detectLanguage(path),
          size: content.length,
          modified: Date.now(),
        });
      }
    }

    // Sort: directories first, then alphabetical
    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return entries;
  }

  function createDir(path: string) {
    dirs.add(path);
    ensureDirs(path);
  }

  function getTree(): FsEntry[] {
    return readDir("");
  }

  function getAllFiles(): Map<string, string> {
    return new Map(files);
  }

  function stat(path: string): FsEntry | null {
    if (files.has(path)) {
      const content = files.get(path)!;
      return {
        path,
        name: path.split("/").pop()!,
        type: "file",
        language: detectLanguage(path),
        size: content.length,
        modified: Date.now(),
      };
    }
    if (dirs.has(path)) {
      return { path, name: path.split("/").pop()!, type: "directory" };
    }
    return null;
  }

  return { readFile, writeFile, deleteFile, rename, exists, readDir, createDir, getTree, getAllFiles, stat };
}

// ── Seed with a realistic project structure ──────────────────

export function seedDemoProject(fs: MockFsAPI) {
  fs.writeFile("package.json", JSON.stringify({
    name: "antigravity",
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "vite",
      build: "tsc && vite build",
      preview: "vite preview",
      lint: "eslint src/",
      test: "vitest run",
    },
    dependencies: {
      react: "^19.0.0",
      "react-dom": "^19.0.0",
      "react-router": "^7.0.0",
      zustand: "^5.0.0",
    },
    devDependencies: {
      typescript: "^6.0.0",
      vite: "^8.0.0",
      vitest: "^4.0.0",
      "@types/react": "^19.0.0",
      "@types/react-dom": "^19.0.0",
      tailwindcss: "^4.0.0",
    },
  }, null, 2));

  fs.writeFile("tsconfig.json", JSON.stringify({
    compilerOptions: {
      target: "ESNext",
      module: "ESNext",
      moduleResolution: "bundler",
      strict: true,
      jsx: "react-jsx",
      esModuleInterop: true,
      lib: ["ESNext", "DOM", "DOM.Iterable"],
      paths: { "@/*": ["./src/*"] },
    },
    include: ["src"],
  }, null, 2));

  fs.writeFile("README.md", `# Antigravity

A modern web application built with React 19 + TypeScript.

## Getting Started

\`\`\`bash
bun install
bun run dev
\`\`\`

## Architecture

- **src/app.tsx** — Root application component
- **src/store/** — Zustand state management
- **src/components/** — Reusable UI components
- **src/hooks/** — Custom React hooks
- **src/lib/** — Shared utilities

## Features

- ⚡ Vite for blazing fast HMR
- 🎨 Tailwind CSS v4 for styling
- 📦 Zustand for state management
- 🧪 Vitest for unit testing
`);

  fs.writeFile(".gitignore", `node_modules/
dist/
.env.local
.vite/
*.log
`);

  fs.writeFile(".env", `VITE_API_URL=http://localhost:3000
VITE_APP_NAME=Antigravity
`);

  fs.writeFile("vite.config.ts", `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
`);

  // ── src/ ─────────────────────────────────────────────────

  fs.writeFile("src/main.tsx", `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`);

  fs.writeFile("src/app.tsx", `import { BrowserRouter, Routes, Route } from "react-router";
import { Layout } from "./components/layout";
import { Home } from "./pages/home";
import { Dashboard } from "./pages/dashboard";
import { Settings } from "./pages/settings";
import { useThemeStore } from "./store/theme";

export function App() {
  const theme = useThemeStore((s) => s.theme);

  return (
    <div className={\`app \${theme}\`}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}
`);

  fs.writeFile("src/types.ts", `export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: "admin" | "editor" | "viewer";
  createdAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  owner: User;
  members: User[];
  status: "active" | "archived" | "draft";
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T> {
  data: T;
  meta: {
    page: number;
    perPage: number;
    total: number;
  };
}

export type Theme = "light" | "dark" | "system";
`);

  // ── src/store/ ───────────────────────────────────────────

  fs.writeFile("src/store/theme.ts", `import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Theme } from "../types";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => {
        const current = get().theme;
        set({ theme: current === "dark" ? "light" : "dark" });
      },
    }),
    { name: "theme-storage" }
  )
);
`);

  fs.writeFile("src/store/auth.ts", `import { create } from "zustand";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  token: null,
  isLoading: false,

  login: async (email: string, _password: string) => {
    set({ isLoading: true });
    // Mock API call
    await new Promise((r) => setTimeout(r, 800));
    const user: User = {
      id: "usr_1",
      name: "Developer",
      email,
      role: "admin",
      createdAt: new Date(),
    };
    set({ user, token: "mock-jwt-token", isLoading: false });
  },

  logout: () => set({ user: null, token: null }),
  setUser: (user) => set({ user }),
}));
`);

  // ── src/components/ ──────────────────────────────────────

  fs.writeFile("src/components/layout.tsx", `import { Outlet, Link, useLocation } from "react-router";

const NAV_ITEMS = [
  { path: "/", label: "Home", icon: "🏠" },
  { path: "/dashboard", label: "Dashboard", icon: "📊" },
  { path: "/settings", label: "Settings", icon: "⚙️" },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      <aside className="w-64 border-r border-gray-800 p-4">
        <h1 className="text-xl font-bold mb-8">Antigravity</h1>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={\`flex items-center gap-3 px-3 py-2 rounded-lg transition \${
                location.pathname === item.path
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }\`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
`);

  fs.writeFile("src/components/button.tsx", `import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, children, className = "", ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2";
    const variants = {
      primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
      secondary: "bg-gray-700 text-gray-100 hover:bg-gray-600 focus:ring-gray-500",
      ghost: "text-gray-400 hover:text-white hover:bg-gray-800 focus:ring-gray-500",
      danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    };
    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    return (
      <button
        ref={ref}
        className={\`\${base} \${variants[variant]} \${sizes[size]} \${className}\`}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && <span className="mr-2 animate-spin">⏳</span>}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
`);

  fs.writeFile("src/components/card.tsx", `interface CardProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Card({ title, description, children, className = "" }: CardProps) {
  return (
    <div className={\`rounded-xl border border-gray-800 bg-gray-900/50 p-6 \${className}\`}>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-400">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
`);

  // ── src/pages/ ───────────────────────────────────────────

  fs.writeFile("src/pages/home.tsx", `import { Card } from "../components/card";
import { Button } from "../components/button";

const FEATURES = [
  { title: "Fast Builds", desc: "Sub-second HMR with Vite", icon: "⚡" },
  { title: "Type Safe", desc: "End-to-end TypeScript", icon: "🛡️" },
  { title: "Modern Stack", desc: "React 19 + Zustand + Tailwind", icon: "🚀" },
  { title: "Tested", desc: "Vitest for reliable code", icon: "🧪" },
];

export function Home() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white">Welcome to Antigravity</h2>
        <p className="mt-2 text-gray-400">A modern full-stack development platform.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {FEATURES.map((f) => (
          <Card key={f.title} title={\`\${f.icon} \${f.title}\`} description={f.desc} />
        ))}
      </div>
      <Button>Get Started</Button>
    </div>
  );
}
`);

  fs.writeFile("src/pages/dashboard.tsx", `import { Card } from "../components/card";

export function Dashboard() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Dashboard</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card title="Projects" description="12 active projects" />
        <Card title="Deployments" description="48 this week" />
        <Card title="Team" description="8 members" />
      </div>
      <Card title="Recent Activity">
        <ul className="space-y-2 text-sm text-gray-400">
          <li>• Deployed v2.1.0 to production</li>
          <li>• Merged PR #142 — Fix auth flow</li>
          <li>• Created branch feature/payments</li>
          <li>• Updated CI pipeline — added e2e tests</li>
        </ul>
      </Card>
    </div>
  );
}
`);

  fs.writeFile("src/pages/settings.tsx", `import { useThemeStore } from "../store/theme";
import { Button } from "../components/button";
import type { Theme } from "../types";

const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function Settings() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Appearance</h3>
          <div className="flex gap-3">
            {THEMES.map((t) => (
              <Button
                key={t.value}
                variant={theme === t.value ? "primary" : "secondary"}
                onClick={() => setTheme(t.value)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Account</h3>
          <p className="text-sm text-gray-500">Signed in as developer@example.com</p>
        </div>
      </div>
    </div>
  );
}
`);

  // ── src/hooks/ ───────────────────────────────────────────

  fs.writeFile("src/hooks/use-debounce.ts", `import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
`);

  fs.writeFile("src/hooks/use-media-query.ts", `import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
`);

  // ── src/lib/ ─────────────────────────────────────────────

  fs.writeFile("src/lib/api.ts", `const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...init } = options;
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string>),
    };
    if (this.token) headers.Authorization = \`Bearer \${this.token}\`;

    const response = await fetch(url.toString(), { ...init, headers });
    if (!response.ok) {
      throw new Error(\`API Error: \${response.status} \${response.statusText}\`);
    }
    return response.json();
  }

  get<T>(path: string, params?: Record<string, string>) {
    return this.request<T>(path, { method: "GET", params });
  }

  post<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: "POST", body: JSON.stringify(body) });
  }

  put<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: "PUT", body: JSON.stringify(body) });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export const api = new ApiClient(BASE_URL);
`);

  fs.writeFile("src/lib/cn.ts", `type ClassValue = string | number | boolean | null | undefined | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  return inputs.flat(Infinity).filter(Boolean).join(" ");
}
`);

  fs.writeFile("src/lib/format.ts", `export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = Date.now();
  const diff = now - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return \`\${days}d ago\`;
  if (hours > 0) return \`\${hours}h ago\`;
  if (minutes > 0) return \`\${minutes}m ago\`;
  return "just now";
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return \`\${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} \${sizes[i]}\`;
}
`);

  // ── src/styles/ ──────────────────────────────────────────

  fs.writeFile("src/styles/global.css", `@import "tailwindcss";

:root {
  --bg-primary: #0a0a0b;
  --bg-secondary: #141416;
  --text-primary: #e4e4e7;
  --text-muted: #71717a;
  --accent: #3b82f6;
  --border: #27272a;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}
`);

  // ── Config files ─────────────────────────────────────────

  fs.writeFile(".prettierrc", JSON.stringify({
    semi: true,
    singleQuote: false,
    tabWidth: 2,
    trailingComma: "all",
    printWidth: 100,
  }, null, 2));

  fs.writeFile("eslint.config.mjs", `import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { react },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "react/react-in-jsx-scope": "off",
    },
  },
];
`);
}
