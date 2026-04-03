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
  py: "python", rs: "rust", go: "go", toml: "toml", sh: "shell", bash: "shell",
  svg: "xml", xml: "xml", sql: "sql", graphql: "graphql",
  dockerfile: "dockerfile", env: "plaintext", gitignore: "plaintext",
  lock: "plaintext", txt: "plaintext",
  lua: "lua", rb: "ruby", java: "java", kt: "kotlin",
  c: "c", h: "c", cpp: "cpp", hpp: "cpp",
  php: "php", r: "r", swift: "swift",
  zig: "zig", nim: "nim", dart: "dart",
  makefile: "makefile", cmake: "cmake",
};

function detectLanguage(path: string): string {
  const name = path.split("/").pop() ?? "";
  if (name === "Dockerfile" || name.startsWith("Dockerfile.")) return "dockerfile";
  if (name === "Makefile" || name === "makefile") return "makefile";
  if (name === "CMakeLists.txt") return "cmake";
  if (name === ".env" || name.startsWith(".env.")) return "plaintext";
  if (name === ".gitignore") return "plaintext";
  if (name === "Gemfile") return "ruby";
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
    name: "monaco-vanced-demo",
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "vite",
      build: "tsc && vite build",
      preview: "vite preview",
      lint: "eslint src/",
      test: "vitest run",
      "db:migrate": "prisma migrate dev",
      "db:seed": "tsx prisma/seed.ts",
    },
    dependencies: {
      react: "^19.0.0",
      "react-dom": "^19.0.0",
      "react-router": "^7.0.0",
      zustand: "^5.0.0",
      "@tanstack/react-query": "^5.0.0",
      zod: "^3.23.0",
    },
    devDependencies: {
      typescript: "^6.0.0",
      vite: "^8.0.0",
      vitest: "^4.0.0",
      "@types/react": "^19.0.0",
      "@types/react-dom": "^19.0.0",
      tailwindcss: "^4.0.0",
      tsx: "^4.0.0",
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

  fs.writeFile("README.md", `# Monaco Vanced Demo

A modern web application built with React 19 + TypeScript.

## Getting Started

\`\`\`bash
bun install
bun run dev
\`\`\`

## Project Structure

\`\`\`
src/
├── app.tsx              # Root application component
├── main.tsx             # Entry point
├── types.ts             # Shared TypeScript types
├── components/          # Reusable UI components
│   ├── layout.tsx
│   ├── button.tsx
│   └── card.tsx
├── pages/               # Route-level pages
│   ├── home.tsx
│   ├── dashboard.tsx
│   └── settings.tsx
├── store/               # Zustand state management
│   ├── theme.ts
│   └── auth.ts
├── db/                  # Database schema & queries
│   ├── schema.ts
│   └── queries.ts
├── services/            # External API integrations
│   ├── api-client.ts
│   └── auth-service.ts
├── lib/                 # Shared utilities
│   ├── cn.ts
│   ├── format.ts
│   └── validators.ts
├── hooks/               # Custom React hooks
│   ├── use-debounce.ts
│   └── use-media-query.ts
└── styles/              # Global styles
    └── global.css
\`\`\`

## Features

- ⚡ Vite for blazing fast HMR
- 🎨 Tailwind CSS v4 for styling
- 📦 Zustand for state management
- 🧪 Vitest for unit testing
- 🗃️ Type-safe database layer
- 🔐 Auth with session management
`);

  fs.writeFile(".gitignore", `node_modules/
dist/
.env.local
.vite/
*.log
`);

  fs.writeFile(".env", `VITE_API_URL=http://localhost:3000
VITE_APP_NAME=MonacoVanced
DATABASE_URL=file:./data.db
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

  // ── src/ entry ───────────────────────────────────────────

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

  // ── src/db/ — Database schema & queries ──────────────────

  fs.writeFile("src/db/schema.ts", `import { z } from "zod";

// ── Zod schemas as source of truth for DB types ─────────

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  avatar: z.string().url().optional(),
  role: z.enum(["admin", "editor", "viewer"]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  ownerId: z.string().uuid(),
  status: z.enum(["active", "archived", "draft"]),
  tags: z.array(z.string()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const SessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
});

export type DBUser = z.infer<typeof UserSchema>;
export type DBProject = z.infer<typeof ProjectSchema>;
export type DBSession = z.infer<typeof SessionSchema>;
`);

  fs.writeFile("src/db/queries.ts", `import type { DBUser, DBProject } from "./schema";

// ── In-memory store (replace with actual DB in production) ──

const users = new Map<string, DBUser>();
const projects = new Map<string, DBProject>();

export const db = {
  users: {
    findById(id: string): DBUser | undefined {
      return users.get(id);
    },
    findByEmail(email: string): DBUser | undefined {
      return [...users.values()].find((u) => u.email === email);
    },
    create(user: DBUser): DBUser {
      users.set(user.id, user);
      return user;
    },
    update(id: string, data: Partial<DBUser>): DBUser | undefined {
      const existing = users.get(id);
      if (!existing) return undefined;
      const updated = { ...existing, ...data, updatedAt: new Date() };
      users.set(id, updated);
      return updated;
    },
    delete(id: string): boolean {
      return users.delete(id);
    },
    list(): DBUser[] {
      return [...users.values()];
    },
  },

  projects: {
    findById(id: string): DBProject | undefined {
      return projects.get(id);
    },
    findByOwner(ownerId: string): DBProject[] {
      return [...projects.values()].filter((p) => p.ownerId === ownerId);
    },
    create(project: DBProject): DBProject {
      projects.set(project.id, project);
      return project;
    },
    update(id: string, data: Partial<DBProject>): DBProject | undefined {
      const existing = projects.get(id);
      if (!existing) return undefined;
      const updated = { ...existing, ...data, updatedAt: new Date() };
      projects.set(id, updated);
      return updated;
    },
    delete(id: string): boolean {
      return projects.delete(id);
    },
    list(filters?: { status?: string; ownerId?: string }): DBProject[] {
      let result = [...projects.values()];
      if (filters?.status) result = result.filter((p) => p.status === filters.status);
      if (filters?.ownerId) result = result.filter((p) => p.ownerId === filters.ownerId);
      return result;
    },
  },
};
`);

  // ── src/services/ — External API integrations ────────────

  fs.writeFile("src/services/api-client.ts", `const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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

  fs.writeFile("src/services/auth-service.ts", `import { api } from "./api-client";
import type { User } from "../types";

interface LoginResponse {
  user: User;
  token: string;
  expiresAt: string;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    return api.post<LoginResponse>("/auth/login", { email, password });
  },

  async register(name: string, email: string, password: string): Promise<LoginResponse> {
    return api.post<LoginResponse>("/auth/register", { name, email, password });
  },

  async me(): Promise<User> {
    return api.get<User>("/auth/me");
  },

  async logout(): Promise<void> {
    await api.post("/auth/logout", {});
    api.setToken(null);
  },

  async refresh(refreshToken: string): Promise<{ token: string; expiresAt: string }> {
    return api.post("/auth/refresh", { refreshToken });
  },
};
`);

  // ── src/store/ — State management ────────────────────────

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
import { persist } from "zustand/middleware";
import type { User } from "../types";
import { authService } from "../services/auth-service";
import { api } from "../services/api-client";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await authService.login(email, password);
          api.setToken(token);
          set({ user, token, isLoading: false });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      logout: () => {
        authService.logout().catch(() => {});
        set({ user: null, token: null });
      },

      setUser: (user) => set({ user }),
      clearError: () => set({ error: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ token: state.token }),
    }
  )
);
`);

  fs.writeFile("src/store/projects.ts", `import { create } from "zustand";
import type { Project } from "../types";
import { api } from "../services/api-client";

interface ProjectsState {
  projects: Project[];
  isLoading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  createProject: (data: Pick<Project, "name" | "description" | "tags">) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectsStore = create<ProjectsState>()((set, get) => ({
  projects: [],
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<{ data: Project[] }>("/projects");
      set({ projects: data, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  createProject: async (data) => {
    set({ isLoading: true });
    try {
      const project = await api.post<Project>("/projects", data);
      set({ projects: [...get().projects, project], isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  deleteProject: async (id: string) => {
    await api.delete(\`/projects/\${id}\`);
    set({ projects: get().projects.filter((p) => p.id !== id) });
  },
}));
`);

  // ── src/components/ — UI Components ──────────────────────

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
        <h1 className="text-xl font-bold mb-8">Monaco Vanced</h1>
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

  // ── src/pages/ — Route-level pages ───────────────────────

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
        <h2 className="text-3xl font-bold text-white">Welcome to Monaco Vanced</h2>
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
import { useProjectsStore } from "../store/projects";
import { useAuthStore } from "../store/auth";

export function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const projects = useProjectsStore((s) => s.projects);

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Dashboard</h2>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card title="Projects" description={\`\${projects.length} active projects\`} />
        <Card title="Deployments" description="48 this week" />
        <Card title="Team" description="8 members" />
      </div>
      <Card title="Recent Activity">
        <ul className="space-y-2 text-sm text-gray-400">
          <li>• Deployed v2.1.0 to production</li>
          <li>• Merged PR #142 — Fix auth flow</li>
          <li>• Created branch feature/payments</li>
          <li>• Updated CI pipeline — added e2e tests</li>
          {user && <li>• Logged in as {user.name}</li>}
        </ul>
      </Card>
    </div>
  );
}
`);

  fs.writeFile("src/pages/settings.tsx", `import { useThemeStore } from "../store/theme";
import { useAuthStore } from "../store/auth";
import { Button } from "../components/button";
import type { Theme } from "../types";

const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function Settings() {
  const { theme, setTheme } = useThemeStore();
  const { user, logout } = useAuthStore();

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
          {user ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-300">Signed in as {user.email}</p>
              <Button variant="danger" size="sm" onClick={logout}>
                Sign Out
              </Button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Not signed in</p>
          )}
        </div>
      </div>
    </div>
  );
}
`);

  // ── src/hooks/ — Custom React hooks ──────────────────────

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

  // ── src/lib/ — Shared utilities ──────────────────────────

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

  fs.writeFile("src/lib/validators.ts", `import { z } from "zod";

export const emailSchema = z.string().email("Invalid email address");
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
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

  // ── .git directory (simulated git repo) ───────────────────

  fs.writeFile(".git/HEAD", `ref: refs/heads/main\n`);
  fs.writeFile(".git/config", `[core]
	repositoryformatversion = 0
	filemode = true
	bare = false
[remote "origin"]
	url = https://github.com/user/monaco-vanced-demo.git
	fetch = +refs/heads/*:refs/remotes/origin/*
[branch "main"]
	remote = origin
	merge = refs/heads/main
`);
  fs.writeFile(".git/refs/heads/main", "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2\n");

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

  // ═══════════════════════════════════════════════════════════
  // Multilang showcase — diverse language files for testing
  // ═══════════════════════════════════════════════════════════

  // ── Go ─────────────────────────────────────────────────────
  fs.writeFile("services/server.go", `package main

import (
	"fmt"
	"log"
	"net/http"
	"encoding/json"
)

type User struct {
	ID    int    \`json:"id"\`
	Name  string \`json:"name"\`
	Email string \`json:"email"\`
}

type APIResponse struct {
	Status  string      \`json:"status"\`
	Data    interface{} \`json:"data"\`
	Message string      \`json:"message,omitempty"\`
}

func NewUser(id int, name, email string) *User {
	return &User{ID: id, Name: name, Email: email}
}

func (u *User) Validate() error {
	if u.Name == "" {
		return fmt.Errorf("name is required")
	}
	return nil
}

func handleGetUsers(w http.ResponseWriter, r *http.Request) {
	users := []User{
		{ID: 1, Name: "Alice", Email: "alice@example.com"},
		{ID: 2, Name: "Bob", Email: "bob@example.com"},
	}
	json.NewEncoder(w).Encode(APIResponse{Status: "ok", Data: users})
}

func handleHealthCheck(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "healthy")
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/users", handleGetUsers)
	mux.HandleFunc("/health", handleHealthCheck)
	log.Println("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}
`);

  // ── Python ─────────────────────────────────────────────────
  fs.writeFile("services/analytics.py", `"""Analytics service — data processing pipeline."""

from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime
import json

@dataclass
class Event:
    name: str
    timestamp: datetime
    properties: Dict[str, str] = field(default_factory=dict)
    user_id: Optional[str] = None

@dataclass
class AggregatedMetric:
    metric_name: str
    value: float
    count: int
    period: str

class EventProcessor:
    """Processes raw analytics events into aggregated metrics."""

    def __init__(self, batch_size: int = 100):
        self._buffer: List[Event] = []
        self._batch_size = batch_size
        self._metrics: Dict[str, AggregatedMetric] = {}

    def ingest(self, event: Event) -> None:
        self._buffer.append(event)
        if len(self._buffer) >= self._batch_size:
            self.flush()

    def flush(self) -> List[AggregatedMetric]:
        results = self._aggregate(self._buffer)
        self._buffer.clear()
        return results

    def _aggregate(self, events: List[Event]) -> List[AggregatedMetric]:
        counts: Dict[str, int] = {}
        for event in events:
            counts[event.name] = counts.get(event.name, 0) + 1
        return [
            AggregatedMetric(metric_name=name, value=float(count), count=count, period="batch")
            for name, count in counts.items()
        ]

    def get_metrics(self) -> Dict[str, AggregatedMetric]:
        return dict(self._metrics)


def create_pipeline(config: dict) -> EventProcessor:
    batch_size = config.get("batch_size", 100)
    return EventProcessor(batch_size=batch_size)


async def run_pipeline(processor: EventProcessor, events: List[dict]) -> List[AggregatedMetric]:
    for raw in events:
        event = Event(
            name=raw["name"],
            timestamp=datetime.fromisoformat(raw["timestamp"]),
            properties=raw.get("properties", {}),
            user_id=raw.get("user_id"),
        )
        processor.ingest(event)
    return processor.flush()
`);

  // ── Rust ───────────────────────────────────────────────────
  fs.writeFile("services/cache.rs", `// Cache service — thread-safe LRU cache with TTL

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};

pub struct CacheEntry<V> {
    value: V,
    inserted_at: Instant,
    ttl: Duration,
}

pub struct LruCache<K, V> {
    store: Arc<RwLock<HashMap<K, CacheEntry<V>>>>,
    max_size: usize,
    default_ttl: Duration,
}

pub trait Cacheable: Clone + Send + Sync + 'static {}
impl<T: Clone + Send + Sync + 'static> Cacheable for T {}

pub enum CacheError {
    NotFound,
    Expired,
    Full,
}

impl<K: std::hash::Hash + Eq + Clone, V: Cacheable> LruCache<K, V> {
    pub fn new(max_size: usize, default_ttl: Duration) -> Self {
        Self {
            store: Arc::new(RwLock::new(HashMap::with_capacity(max_size))),
            max_size,
            default_ttl,
        }
    }

    pub fn get(&self, key: &K) -> Result<V, CacheError> {
        let store = self.store.read().unwrap();
        match store.get(key) {
            Some(entry) if entry.inserted_at.elapsed() < entry.ttl => {
                Ok(entry.value.clone())
            }
            Some(_) => Err(CacheError::Expired),
            None => Err(CacheError::NotFound),
        }
    }

    pub fn insert(&self, key: K, value: V) -> Result<(), CacheError> {
        let mut store = self.store.write().unwrap();
        if store.len() >= self.max_size && !store.contains_key(&key) {
            self.evict_expired(&mut store);
            if store.len() >= self.max_size {
                return Err(CacheError::Full);
            }
        }
        store.insert(key, CacheEntry {
            value,
            inserted_at: Instant::now(),
            ttl: self.default_ttl,
        });
        Ok(())
    }

    fn evict_expired(&self, store: &mut HashMap<K, CacheEntry<V>>) {
        store.retain(|_, entry| entry.inserted_at.elapsed() < entry.ttl);
    }

    pub fn clear(&self) {
        self.store.write().unwrap().clear();
    }

    pub fn len(&self) -> usize {
        self.store.read().unwrap().len()
    }
}
`);

  // ── Lua ────────────────────────────────────────────────────
  fs.writeFile("scripts/game_logic.lua", `-- Game logic module — entity component system

local GameState = {}
GameState.__index = GameState

function GameState.new(width, height)
  local self = setmetatable({}, GameState)
  self.width = width
  self.height = height
  self.entities = {}
  self.score = 0
  self.running = false
  return self
end

function GameState:addEntity(entity)
  table.insert(self.entities, entity)
  return #self.entities
end

function GameState:removeEntity(id)
  table.remove(self.entities, id)
end

function GameState:update(dt)
  for _, entity in ipairs(self.entities) do
    if entity.update then
      entity:update(dt)
    end
    -- Boundary check
    if entity.x and entity.y then
      entity.x = math.max(0, math.min(self.width, entity.x))
      entity.y = math.max(0, math.min(self.height, entity.y))
    end
  end
end

local function createPlayer(x, y)
  return {
    x = x, y = y,
    speed = 200,
    health = 100,
    update = function(self, dt)
      -- Movement handled by input system
    end
  }
end

local function createEnemy(x, y, patrol_radius)
  local origin_x, origin_y = x, y
  local angle = 0
  return {
    x = x, y = y,
    speed = 80,
    health = 50,
    update = function(self, dt)
      angle = angle + dt
      self.x = origin_x + math.cos(angle) * patrol_radius
      self.y = origin_y + math.sin(angle) * patrol_radius
    end
  }
end

return {
  GameState = GameState,
  createPlayer = createPlayer,
  createEnemy = createEnemy,
}
`);

  // ── Ruby ───────────────────────────────────────────────────
  fs.writeFile("services/mailer.rb", `# Mailer service — template-based email delivery

require "json"

module Mailer
  class Template
    attr_reader :name, :subject, :body_html

    def initialize(name:, subject:, body_html:)
      @name = name
      @subject = subject
      @body_html = body_html
    end

    def render(variables = {})
      result = @body_html.dup
      variables.each do |key, value|
        result.gsub!("{{#{key}}}", value.to_s)
      end
      result
    end
  end

  class Delivery
    attr_reader :to, :from, :subject, :html_body, :status

    def initialize(to:, from:, subject:, html_body:)
      @to = to
      @from = from
      @subject = subject
      @html_body = html_body
      @status = :pending
    end

    def deliver!
      validate!
      @status = :sent
      puts "[Mailer] Sent '#{@subject}' to #{@to}"
      self
    rescue => e
      @status = :failed
      raise e
    end

    private

    def validate!
      raise ArgumentError, "Missing recipient" if @to.nil? || @to.empty?
      raise ArgumentError, "Missing subject" if @subject.nil? || @subject.empty?
    end
  end

  class Service
    def initialize
      @templates = {}
    end

    def register_template(template)
      @templates[template.name] = template
    end

    def send_email(template_name:, to:, from: "noreply@example.com", variables: {})
      template = @templates[template_name]
      raise "Template '#{template_name}' not found" unless template

      html = template.render(variables)
      delivery = Delivery.new(to: to, from: from, subject: template.subject, html_body: html)
      delivery.deliver!
    end
  end
end
`);

  // ── Java ───────────────────────────────────────────────────
  fs.writeFile("services/TaskScheduler.java", `package com.example.scheduler;

import java.util.*;
import java.util.concurrent.*;
import java.time.Instant;

public class TaskScheduler {

    public interface Task {
        String getId();
        void execute() throws Exception;
    }

    public enum TaskStatus {
        PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
    }

    public static class TaskResult {
        private final String taskId;
        private final TaskStatus status;
        private final Instant completedAt;
        private final String error;

        public TaskResult(String taskId, TaskStatus status, Instant completedAt, String error) {
            this.taskId = taskId;
            this.status = status;
            this.completedAt = completedAt;
            this.error = error;
        }

        public String getTaskId() { return taskId; }
        public TaskStatus getStatus() { return status; }
    }

    private final ExecutorService executor;
    private final Map<String, Future<?>> activeTasks = new ConcurrentHashMap<>();
    private final List<TaskResult> history = Collections.synchronizedList(new ArrayList<>());

    public TaskScheduler(int poolSize) {
        this.executor = Executors.newFixedThreadPool(poolSize);
    }

    public void schedule(Task task) {
        Future<?> future = executor.submit(() -> {
            try {
                task.execute();
                history.add(new TaskResult(task.getId(), TaskStatus.COMPLETED, Instant.now(), null));
            } catch (Exception e) {
                history.add(new TaskResult(task.getId(), TaskStatus.FAILED, Instant.now(), e.getMessage()));
            } finally {
                activeTasks.remove(task.getId());
            }
        });
        activeTasks.put(task.getId(), future);
    }

    public boolean cancel(String taskId) {
        Future<?> future = activeTasks.get(taskId);
        if (future != null) {
            boolean cancelled = future.cancel(true);
            if (cancelled) {
                history.add(new TaskResult(taskId, TaskStatus.CANCELLED, Instant.now(), null));
            }
            return cancelled;
        }
        return false;
    }

    public List<TaskResult> getHistory() {
        return Collections.unmodifiableList(history);
    }

    public void shutdown() {
        executor.shutdown();
    }
}
`);

  // ── PHP ────────────────────────────────────────────────────
  fs.writeFile("services/Router.php", [
    '<?php',
    'declare(strict_types=1);',
    '',
    'namespace App\\Http;',
    '',
    'class Route',
    '{',
    '    public string $method;',
    '    public string $path;',
    '    /** @var callable */',
    '    public $handler;',
    '    /** @var string[] */',
    '    public array $middleware;',
    '',
    '    public function __construct(string $method, string $path, callable $handler, array $middleware = [])',
    '    {',
    '        $this->method = $method;',
    '        $this->path = $path;',
    '        $this->handler = $handler;',
    '        $this->middleware = $middleware;',
    '    }',
    '}',
    '',
    'class Request',
    '{',
    '    public string $method;',
    '    public string $uri;',
    '    public array $params;',
    '    public array $headers;',
    '',
    '    public function __construct(string $method, string $uri, array $params = [], array $headers = [])',
    '    {',
    '        $this->method = $method;',
    '        $this->uri = $uri;',
    '        $this->params = $params;',
    '        $this->headers = $headers;',
    '    }',
    '}',
    '',
    'class Response',
    '{',
    '    private int $statusCode = 200;',
    '    private array $headers = [];',
    "    private string $body = '';",
    '',
    '    public function status(int $code): self',
    '    {',
    '        $this->statusCode = $code;',
    '        return $this;',
    '    }',
    '',
    '    public function json(array $data): self',
    '    {',
    "        $this->headers['Content-Type'] = 'application/json';",
    '        $this->body = json_encode($data);',
    '        return $this;',
    '    }',
    '',
    '    public function send(): void',
    '    {',
    '        http_response_code($this->statusCode);',
    '        foreach ($this->headers as $key => $value) {',
    '            header("$key: $value");',
    '        }',
    '        echo $this->body;',
    '    }',
    '}',
    '',
    'class Router',
    '{',
    '    /** @var Route[] */',
    '    private array $routes = [];',
    '',
    '    public function get(string $path, callable $handler, array $middleware = []): void',
    '    {',
    "        $this->routes[] = new Route('GET', $path, $handler, $middleware);",
    '    }',
    '',
    '    public function post(string $path, callable $handler, array $middleware = []): void',
    '    {',
    "        $this->routes[] = new Route('POST', $path, $handler, $middleware);",
    '    }',
    '',
    '    public function dispatch(Request $request): Response',
    '    {',
    '        foreach ($this->routes as $route) {',
    '            if ($route->method === $request->method && $this->matchPath($route->path, $request->uri, $request->params)) {',
    '                $response = new Response();',
    '                ($route->handler)($request, $response);',
    '                return $response;',
    '            }',
    '        }',
    "        return (new Response())->status(404)->json(['error' => 'Not found']);",
    '    }',
    '',
    '    private function matchPath(string $pattern, string $uri, array &$params): bool',
    '    {',
    "        $regex = preg_replace('/\\\\{(\\\\w+)\\\\}/', '(?P<$1>[^/]+)', $pattern);",
    '        if (preg_match("#^{$regex}$#", $uri, $matches)) {',
    '            foreach ($matches as $key => $value) {',
    '                if (is_string($key)) $params[$key] = $value;',
    '            }',
    '            return true;',
    '        }',
    '        return false;',
    '    }',
    '}',
  ].join('\n') + '\n');

  // ── C ──────────────────────────────────────────────────────
  fs.writeFile("lib/hashmap.c", `/* hashmap.c — simple open-addressing hash map */

#include <stdlib.h>
#include <string.h>
#include <stdio.h>

#define INITIAL_CAPACITY 16
#define LOAD_FACTOR 0.75

typedef struct {
    char *key;
    void *value;
    int occupied;
} Entry;

typedef struct {
    Entry *entries;
    size_t capacity;
    size_t size;
} HashMap;

static unsigned long hash_string(const char *str) {
    unsigned long hash = 5381;
    int c;
    while ((c = *str++))
        hash = ((hash << 5) + hash) + c;
    return hash;
}

HashMap *hashmap_create(void) {
    HashMap *map = malloc(sizeof(HashMap));
    map->capacity = INITIAL_CAPACITY;
    map->size = 0;
    map->entries = calloc(map->capacity, sizeof(Entry));
    return map;
}

void hashmap_put(HashMap *map, const char *key, void *value) {
    if ((double)map->size / map->capacity > LOAD_FACTOR) {
        /* resize logic omitted for brevity */
    }
    unsigned long idx = hash_string(key) % map->capacity;
    while (map->entries[idx].occupied) {
        if (strcmp(map->entries[idx].key, key) == 0) {
            map->entries[idx].value = value;
            return;
        }
        idx = (idx + 1) % map->capacity;
    }
    map->entries[idx].key = strdup(key);
    map->entries[idx].value = value;
    map->entries[idx].occupied = 1;
    map->size++;
}

void *hashmap_get(HashMap *map, const char *key) {
    unsigned long idx = hash_string(key) % map->capacity;
    size_t start = idx;
    while (map->entries[idx].occupied) {
        if (strcmp(map->entries[idx].key, key) == 0)
            return map->entries[idx].value;
        idx = (idx + 1) % map->capacity;
        if (idx == start) break;
    }
    return NULL;
}

void hashmap_free(HashMap *map) {
    for (size_t i = 0; i < map->capacity; i++) {
        if (map->entries[i].occupied)
            free(map->entries[i].key);
    }
    free(map->entries);
    free(map);
}

int hashmap_size(HashMap *map) {
    return (int)map->size;
}
`);

  // ── SQL ────────────────────────────────────────────────────
  fs.writeFile("db/migrations/001_init.sql", `-- Initial database schema

CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(100) NOT NULL,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(20) DEFAULT 'user',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    owner_id    INT REFERENCES users(id) ON DELETE CASCADE,
    visibility  VARCHAR(20) DEFAULT 'private',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(300) NOT NULL,
    body        TEXT,
    status      VARCHAR(20) DEFAULT 'open',
    priority    INT DEFAULT 0,
    project_id  INT REFERENCES projects(id) ON DELETE CASCADE,
    assignee_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date    DATE
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- Views
CREATE VIEW active_tasks AS
SELECT t.*, u.name AS assignee_name, p.name AS project_name
FROM tasks t
LEFT JOIN users u ON t.assignee_id = u.id
LEFT JOIN projects p ON t.project_id = p.id
WHERE t.status != 'closed';
`);

  // ── Dockerfile ─────────────────────────────────────────────
  fs.writeFile("Dockerfile", `# Multi-stage build for production
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 appgroup && \\
    adduser --system --uid 1001 appuser

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000
USER appuser
CMD ["node", "dist/server.js"]
`);

  // ── Shell ──────────────────────────────────────────────────
  fs.writeFile("scripts/deploy.sh", [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    '',
    '# Deploy script — builds, tests, and pushes to registry',
    '',
    'PROJECT_NAME="monaco-vanced-demo"',
    'REGISTRY="ghcr.io/user"',
    'VERSION="${1:-latest}"',
    '',
    'log() { echo "[deploy] $(date +%T) $*"; }',
    'error() { echo "[deploy] ERROR: $*" >&2; exit 1; }',
    '',
    'check_prerequisites() {',
    '    command -v docker >/dev/null 2>&1 || error "docker not found"',
    '    command -v git >/dev/null 2>&1 || error "git not found"',
    '    log "Prerequisites OK"',
    '}',
    '',
    'run_tests() {',
    '    log "Running tests..."',
    '    npm test || error "Tests failed"',
    '    log "Tests passed"',
    '}',
    '',
    'build_image() {',
    '    local tag="${REGISTRY}/${PROJECT_NAME}:${VERSION}"',
    '    log "Building Docker image: ${tag}"',
    '    docker build -t "${tag}" .',
    '    log "Image built successfully"',
    '}',
    '',
    'push_image() {',
    '    local tag="${REGISTRY}/${PROJECT_NAME}:${VERSION}"',
    '    log "Pushing image: ${tag}"',
    '    docker push "${tag}"',
    '    log "Image pushed"',
    '}',
    '',
    'main() {',
    '    check_prerequisites',
    '    run_tests',
    '    build_image',
    '    push_image',
    '    log "Deployment complete: ${VERSION}"',
    '}',
    '',
    'main "$@"',
  ].join('\n') + '\n');

  // ── YAML (docker-compose) ──────────────────────────────────
  fs.writeFile("docker-compose.yml", `version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgres://user:pass@db:5432/app
      REDIS_URL: redis://cache:6379
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 5s
      timeout: 3s
      retries: 5

  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
`);

  // ── C++ ────────────────────────────────────────────────────
  fs.writeFile("lib/vector.hpp", `#pragma once
#include <cstddef>
#include <stdexcept>
#include <algorithm>

namespace containers {

template<typename T>
class Vector {
public:
    Vector() : data_(nullptr), size_(0), capacity_(0) {}
    ~Vector() { delete[] data_; }

    void push_back(const T& value) {
        if (size_ >= capacity_) grow();
        data_[size_++] = value;
    }

    T& operator[](size_t index) {
        if (index >= size_) throw std::out_of_range("index out of bounds");
        return data_[index];
    }

    const T& operator[](size_t index) const {
        if (index >= size_) throw std::out_of_range("index out of bounds");
        return data_[index];
    }

    size_t size() const { return size_; }
    bool empty() const { return size_ == 0; }
    T* begin() { return data_; }
    T* end() { return data_ + size_; }

    void clear() { size_ = 0; }

private:
    void grow() {
        size_t new_cap = capacity_ == 0 ? 4 : capacity_ * 2;
        T* new_data = new T[new_cap];
        std::copy(data_, data_ + size_, new_data);
        delete[] data_;
        data_ = new_data;
        capacity_ = new_cap;
    }

    T* data_;
    size_t size_;
    size_t capacity_;
};

} // namespace containers
`);

  // ── Makefile ───────────────────────────────────────────────
  fs.writeFile("Makefile", `# Project Makefile

.PHONY: all build test clean dev lint docker

all: build

build:
	npm run build

dev:
	npm run dev

test:
	npm test

lint:
	npm run lint

clean:
	rm -rf dist node_modules .cache

docker:
	docker build -t monaco-vanced-demo .

docker-run:
	docker run -p 3000:3000 monaco-vanced-demo

install:
	npm ci
`);
}
