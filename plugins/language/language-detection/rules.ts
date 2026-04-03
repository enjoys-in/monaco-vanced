// ── Language detection rules — extension, filename, shebang, content ──
import type { DetectionRule } from "./types";

/**
 * Map of Monaco language ID → detection rules.
 * Monaco already handles common languages (ts, js, html, css, json, etc.)
 * These rules cover languages Monaco may not detect natively +
 * shebang/content heuristics for ambiguous files.
 */
export const detectionRules: Record<string, DetectionRule> = {
  // ── Languages Monaco handles but we add shebang/content support ──
  typescript: {
    extensions: [".ts", ".mts", ".cts"],
    shebangs: [/\bts-node\b/, /\btsx\b/, /\bbun\b/],
  },
  javascript: {
    extensions: [".js", ".mjs", ".cjs"],
    shebangs: [/\bnode\b/, /\bdeno\b/, /\bbun\b/],
  },
  python: {
    extensions: [".py", ".pyw", ".pyi"],
    shebangs: [/\bpython[23]?\b/],
    contentPatterns: [/^#.*coding[:=]\s*(utf-8|ascii)/m],
  },
  ruby: {
    extensions: [".rb", ".rake", ".gemspec"],
    filenames: ["Gemfile", "Rakefile"],
    shebangs: [/\bruby\b/],
  },
  php: {
    extensions: [".php", ".phtml"],
    shebangs: [/\bphp\b/],
    contentPatterns: [/^<\?php\b/],
  },
  perl: {
    extensions: [".pl", ".pm"],
    shebangs: [/\bperl\b/],
  },
  lua: {
    extensions: [".lua"],
    shebangs: [/\blua\b/],
  },
  shell: {
    extensions: [".sh", ".bash", ".zsh"],
    filenames: [".bashrc", ".zshrc", ".profile", ".bash_profile", ".zprofile"],
    shebangs: [/\b(ba)?sh\b/, /\bzsh\b/, /\bfish\b/],
  },
  powershell: {
    extensions: [".ps1", ".psm1", ".psd1"],
  },

  // ── Compiled — Monaco may register but we add content detection ──
  java: {
    extensions: [".java"],
    contentPatterns: [/^\s*(import\s+java\.|public\s+class|package\s+[a-z]+\.)/m],
  },
  c: {
    extensions: [".c", ".h"],
    contentPatterns: [/^#include\s*[<"]/m],
  },
  cpp: {
    extensions: [".cpp", ".hpp", ".cc", ".cxx", ".hh", ".hxx"],
    contentPatterns: [/^#include\s*[<"]|\bnamespace\s+\w+/m],
  },

  // ── Languages Monaco does NOT register natively ──
  dockerfile: {
    extensions: [".dockerfile"],
    filenames: ["Dockerfile", "dockerfile", "Containerfile", "containerfile"],
    contentPatterns: [/^FROM\s+\S+/m],
  },
  dotenv: {
    filenames: [".env", ".env.local", ".env.production", ".env.development", ".env.test"],
  },
  graphql: {
    extensions: [".graphql", ".gql"],
    contentPatterns: [/^\s*(query|mutation|subscription|type|schema|input|enum|interface|fragment)\s/m],
  },
  ignore: {
    filenames: [".gitignore", ".dockerignore", ".npmignore", ".eslintignore", ".prettierignore"],
  },
  ini: {
    extensions: [".ini", ".cfg", ".conf"],
    filenames: [".editorconfig"],
    contentPatterns: [/^\[[\w.-]+\]\s*$/m],
  },
  makefile: {
    filenames: ["Makefile", "makefile", "GNUmakefile", "gnumakefile"],
    contentPatterns: [/^[\w.-]+\s*:(?!=)/m],
  },
  nginx: {
    filenames: ["nginx.conf"],
    extensions: [".nginx"],
    contentPatterns: [/^\s*(server|location|upstream|http)\s*\{/m],
  },
  prisma: {
    extensions: [".prisma"],
    contentPatterns: [/^\s*(generator|datasource|model|enum)\s+\w+\s*\{/m],
  },
  protobuf: {
    extensions: [".proto"],
    contentPatterns: [/^syntax\s*=\s*"proto[23]"/m],
  },
  toml: {
    extensions: [".toml"],
    filenames: ["Cargo.toml", "pyproject.toml"],
    contentPatterns: [/^\[[\w.-]+\]\s*$/m],
  },
  "ssh-config": {
    filenames: ["config", "ssh_config", "sshd_config"],
    contentPatterns: [/^\s*Host\s+\S+/m],
  },

  // ── Data / config formats ──
  yaml: {
    extensions: [".yml", ".yaml"],
    filenames: [".prettierrc", ".eslintrc"],
    contentPatterns: [/^---\s*$/m],
  },
  xml: {
    extensions: [".xml", ".xsl", ".xsd", ".svg", ".plist"],
    contentPatterns: [/^<\?xml\b/],
  },
  markdown: {
    extensions: [".md", ".mdx", ".markdown"],
    filenames: ["README", "CHANGELOG", "LICENSE"],
  },

  // ── Misc ──
  rust: {
    extensions: [".rs"],
    contentPatterns: [/^\s*(fn|struct|impl|enum|mod|use|pub)\s/m],
  },
  go: {
    extensions: [".go"],
    contentPatterns: [/^package\s+(?!com\.|org\.|net\.|io\.|[a-z]+\.)\w+/m],
  },
  swift: {
    extensions: [".swift"],
    contentPatterns: [/^import\s+(Foundation|UIKit|SwiftUI)\b/m],
  },
  kotlin: {
    extensions: [".kt", ".kts"],
    contentPatterns: [/^(package|fun|class|object|interface)\s/m],
  },
  dart: {
    extensions: [".dart"],
    contentPatterns: [/^import\s+'package:/m],
  },
  elixir: {
    extensions: [".ex", ".exs"],
    shebangs: [/\belixir\b/],
    contentPatterns: [/^\s*defmodule\s/m],
  },
  clojure: {
    extensions: [".clj", ".cljs", ".cljc", ".edn"],
    contentPatterns: [/^\s*\(ns\s/m],
  },
  r: {
    extensions: [".r", ".R"],
    shebangs: [/\bRscript\b/],
  },
  julia: {
    extensions: [".jl"],
    shebangs: [/\bjulia\b/],
  },
};
