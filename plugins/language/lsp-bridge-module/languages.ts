// ── LSP Bridge Module — Known LSP Languages + URL Builder ──────
// See context/lsp-bridge-module.txt Section 3F

interface LspLanguageEntry {
  name: string;
  wsPath: string;
}

/**
 * Record of 70+ languages with known LSP server support.
 * Used to check if a language can connect to LSP before attempting WebSocket.
 */
export const LSP_LANGUAGES: Record<string, LspLanguageEntry> = {
  // ── JavaScript / TypeScript family ──────────────────────
  typescript: { name: "TypeScript Language Server", wsPath: "typescript" },
  javascript: { name: "TypeScript Language Server", wsPath: "typescript" },
  typescriptreact: { name: "TypeScript Language Server", wsPath: "typescript" },
  javascriptreact: { name: "TypeScript Language Server", wsPath: "typescript" },

  // ── Systems ─────────────────────────────────────────────
  go: { name: "gopls", wsPath: "go" },
  rust: { name: "rust-analyzer", wsPath: "rust" },
  c: { name: "clangd", wsPath: "c" },
  cpp: { name: "clangd", wsPath: "cpp" },

  // ── JVM ─────────────────────────────────────────────────
  java: { name: "Eclipse JDT.LS", wsPath: "java" },
  kotlin: { name: "kotlin-language-server", wsPath: "kotlin" },
  scala: { name: "Metals", wsPath: "scala" },

  // ── .NET ────────────────────────────────────────────────
  csharp: { name: "OmniSharp", wsPath: "csharp" },
  fsharp: { name: "FsAutoComplete", wsPath: "fsharp" },

  // ── Scripting ───────────────────────────────────────────
  python: { name: "Pylsp", wsPath: "python" },
  ruby: { name: "Solargraph", wsPath: "ruby" },
  php: { name: "phpactor", wsPath: "php" },
  lua: { name: "lua-language-server", wsPath: "lua" },
  perl: { name: "Perl::LanguageServer", wsPath: "perl" },
  r: { name: "languageserver", wsPath: "r" },

  // ── Shell ───────────────────────────────────────────────
  shellscript: { name: "bash-language-server", wsPath: "shellscript" },
  bash: { name: "bash-language-server", wsPath: "shellscript" },
  powershell: { name: "PowerShellEditorServices", wsPath: "powershell" },

  // ── Web ─────────────────────────────────────────────────
  html: { name: "vscode-html-languageservice", wsPath: "html" },
  css: { name: "vscode-css-languageservice", wsPath: "css" },
  scss: { name: "vscode-css-languageservice", wsPath: "scss" },
  less: { name: "vscode-css-languageservice", wsPath: "less" },
  json: { name: "vscode-json-languageservice", wsPath: "json" },
  jsonc: { name: "vscode-json-languageservice", wsPath: "json" },
  yaml: { name: "yaml-language-server", wsPath: "yaml" },
  vue: { name: "Volar", wsPath: "vue" },
  svelte: { name: "svelte-language-server", wsPath: "svelte" },
  astro: { name: "astro-language-server", wsPath: "astro" },

  // ── Infrastructure ──────────────────────────────────────
  dockerfile: { name: "dockerfile-language-server", wsPath: "dockerfile" },
  terraform: { name: "terraform-ls", wsPath: "terraform" },
  bicep: { name: "Bicep", wsPath: "bicep" },
  ansible: { name: "ansible-language-server", wsPath: "ansible" },
  nix: { name: "nil", wsPath: "nix" },

  // ── Database ────────────────────────────────────────────
  sql: { name: "sql-language-server", wsPath: "sql" },
  graphql: { name: "graphql-language-service", wsPath: "graphql" },
  prisma: { name: "prisma-language-server", wsPath: "prisma" },

  // ── Functional ──────────────────────────────────────────
  haskell: { name: "haskell-language-server", wsPath: "haskell" },
  ocaml: { name: "ocamllsp", wsPath: "ocaml" },
  elixir: { name: "elixir-ls", wsPath: "elixir" },
  erlang: { name: "erlang_ls", wsPath: "erlang" },
  clojure: { name: "clojure-lsp", wsPath: "clojure" },

  // ── Modern ──────────────────────────────────────────────
  swift: { name: "sourcekit-lsp", wsPath: "swift" },
  zig: { name: "zls", wsPath: "zig" },
  dart: { name: "Dart Analysis Server", wsPath: "dart" },
  julia: { name: "LanguageServer.jl", wsPath: "julia" },
  nim: { name: "nimlangserver", wsPath: "nim" },
  v: { name: "v-analyzer", wsPath: "v" },

  // ── Other compiled ──────────────────────────────────────
  groovy: { name: "groovy-language-server", wsPath: "groovy" },
  vb: { name: "OmniSharp", wsPath: "vb" },

  // ── Docs / Config ──────────────────────────────────────
  markdown: { name: "marksman", wsPath: "markdown" },
  latex: { name: "texlab", wsPath: "latex" },
  toml: { name: "taplo", wsPath: "toml" },
  xml: { name: "lemminx", wsPath: "xml" },

  // ── Build systems ──────────────────────────────────────
  cmake: { name: "cmake-language-server", wsPath: "cmake" },
  makefile: { name: "makefile-language-server", wsPath: "makefile" },

  // ── Specialized ─────────────────────────────────────────
  proto: { name: "buf-language-server", wsPath: "proto" },
  solidity: { name: "solc", wsPath: "solidity" },
  wgsl: { name: "wgsl-analyzer", wsPath: "wgsl" },
  glsl: { name: "glsl-language-server", wsPath: "glsl" },
};

/**
 * Check if a language has known LSP server support.
 */
export function hasLSPSupport(languageId: string): boolean {
  return languageId in LSP_LANGUAGES;
}

/**
 * Build the full WebSocket URL for a given language.
 * Converts http(s) → ws(s) and appends `/lsp/${wsPath}`.
 * Returns null if the language is not supported.
 */
export function buildLSPWebSocketUrl(
  baseUrl: string,
  languageId: string,
): string | null {
  const entry = LSP_LANGUAGES[languageId];
  if (!entry) return null;

  // Convert http(s) to ws(s)
  const wsBase = baseUrl.replace(/^http/, "ws").replace(/\/+$/, "");
  return `${wsBase}/lsp/${entry.wsPath}`;
}
