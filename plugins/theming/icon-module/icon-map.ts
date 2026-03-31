// ── Icon Module — Default Icon Map ───────────────────────────

const ICON_MAP: Record<string, string> = {
  // JavaScript / TypeScript
  ".ts": "typescript",
  ".tsx": "react_ts",
  ".js": "javascript",
  ".jsx": "react",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".d.ts": "typescript-def",

  // Web
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".scss": "sass",
  ".sass": "sass",
  ".less": "less",
  ".svg": "svg",
  ".woff": "font",
  ".woff2": "font",
  ".ttf": "font",
  ".eot": "font",

  // Data / Config
  ".json": "json",
  ".jsonc": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "settings",
  ".xml": "xml",
  ".csv": "table",

  // Python
  ".py": "python",
  ".pyi": "python",
  ".pyw": "python",
  ".ipynb": "notebook",

  // Systems
  ".rs": "rust",
  ".go": "go",
  ".c": "c",
  ".cpp": "cpp",
  ".h": "header",
  ".hpp": "header",
  ".java": "java",
  ".kt": "kotlin",
  ".swift": "swift",
  ".cs": "csharp",

  // Shell / DevOps
  ".sh": "shell",
  ".bash": "shell",
  ".zsh": "shell",
  ".fish": "shell",
  ".ps1": "powershell",
  ".bat": "console",
  ".cmd": "console",
  ".dockerfile": "docker",

  // Markup / Documentation
  ".md": "markdown",
  ".mdx": "markdown",
  ".txt": "document",
  ".pdf": "pdf",
  ".tex": "tex",
  ".rst": "document",

  // Images
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".gif": "image",
  ".webp": "image",
  ".ico": "image",
  ".bmp": "image",

  // Build / Config files
  ".lock": "lock",
  ".env": "settings",
  ".gitignore": "git",
  ".gitattributes": "git",
  ".editorconfig": "settings",
  ".prettierrc": "prettier",
  ".eslintrc": "eslint",

  // Archives
  ".zip": "zip",
  ".tar": "zip",
  ".gz": "zip",
  ".bz2": "zip",
  ".7z": "zip",
  ".rar": "zip",

  // Misc
  ".wasm": "assembly",
  ".sql": "database",
  ".graphql": "graphql",
  ".gql": "graphql",
  ".vue": "vue",
  ".svelte": "svelte",
  ".astro": "astro",
  ".php": "php",
  ".rb": "ruby",
  ".lua": "lua",
  ".r": "r",
  ".dart": "dart",
  ".ex": "elixir",
  ".exs": "elixir",
  ".erl": "erlang",
  ".hs": "haskell",
  ".ml": "ocaml",
  ".clj": "clojure",
};

/** File name overrides (exact matches) */
const FILENAME_MAP: Record<string, string> = {
  "package.json": "nodejs",
  "tsconfig.json": "tsconfig",
  "vite.config.ts": "vite",
  "vite.config.js": "vite",
  ".gitignore": "git",
  ".dockerignore": "docker",
  "Dockerfile": "docker",
  "docker-compose.yml": "docker",
  "Makefile": "settings",
  "LICENSE": "license",
  "README.md": "readme",
  "Cargo.toml": "rust",
  "go.mod": "go",
  "go.sum": "go",
};

export class DefaultIconMap {
  /** Get the icon name for a filename */
  static getIconName(filename: string): string {
    // Check exact filename match first
    const baseName = filename.split("/").pop() ?? filename;
    if (FILENAME_MAP[baseName]) return FILENAME_MAP[baseName];

    // Check extension
    const ext = getExtension(baseName);
    if (ext && ICON_MAP[ext]) return ICON_MAP[ext];

    // Check compound extension (e.g., .d.ts)
    const compoundExt = getCompoundExtension(baseName);
    if (compoundExt && ICON_MAP[compoundExt]) return ICON_MAP[compoundExt];

    return "file";
  }
}

function getExtension(filename: string): string | null {
  const dot = filename.lastIndexOf(".");
  return dot > 0 ? filename.slice(dot).toLowerCase() : null;
}

function getCompoundExtension(filename: string): string | null {
  const parts = filename.split(".");
  if (parts.length >= 3) {
    return `.${parts.slice(-2).join(".")}`.toLowerCase();
  }
  return null;
}
