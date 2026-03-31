// ── Language config plugin — registers extra languages NOT built into Monaco ──
//
// Monaco ships with built-in support for: typescript, javascript, html, css,
// json, markdown, xml, yaml, python, java, c, cpp, csharp, go, rust, ruby,
// php, sql, shell, powershell, lua, r, swift, kotlin, dart, and more.
//
// This plugin registers languages that Monaco does NOT include natively.
// It is exported as an OPTIONAL plugin — users import only if they need
// these extra languages. Each language config is also exported individually
// so users can register a single language without loading all 10.
//
// Usage:
//   import { createLanguageConfigPlugin } from "@enjoys/monaco-vanced/language/language-config";
//   // OR import individual:
//   import { createDockerfileLanguagePlugin } from "@enjoys/monaco-vanced/language/language-config";

import type * as monacoNs from "monaco-editor";
import type { MonacoPlugin, Monaco } from "@core/types";

import { dockerfileLanguageConfig } from "./configs/dockerfile-config";
import { dotenvLanguageConfig } from "./configs/dotenv";
import { graphqlLanguageConfig } from "./configs/graphql";
import { ignoreLanguageConfig } from "./configs/ignore";
import { iniLanguageConfig } from "./configs/ini";
import { nginxLanguageConfig } from "./configs/nginx";
import { prismaLanguageConfig } from "./configs/prisma";
import { protoLanguageConfig } from "./configs/proto";
import { shellscriptLanguageConfig } from "./configs/shellscript";
import { tomlLanguageConfig } from "./configs/toml";

export interface LanguageDef {
  id: string;
  extensions: string[];
  aliases: string[];
  filenames?: string[];
  mimetypes?: string[];
  config: monacoNs.languages.LanguageConfiguration;
}

/**
 * Languages that Monaco does NOT register natively.
 * Each includes: language registration + language configuration (brackets, comments, etc.)
 */
export const extraLanguages: LanguageDef[] = [
  {
    id: "dockerfile",
    extensions: [".dockerfile"],
    aliases: ["Dockerfile"],
    filenames: ["Dockerfile", "Containerfile"],
    config: dockerfileLanguageConfig,
  },
  {
    id: "dotenv",
    extensions: [".env"],
    aliases: ["Environment Variables", "dotenv"],
    filenames: [".env", ".env.local", ".env.production", ".env.development", ".env.test"],
    config: dotenvLanguageConfig,
  },
  {
    id: "graphql",
    extensions: [".graphql", ".gql"],
    aliases: ["GraphQL"],
    mimetypes: ["application/graphql"],
    config: graphqlLanguageConfig,
  },
  {
    id: "ignore",
    extensions: [".gitignore", ".dockerignore", ".npmignore"],
    aliases: ["Ignore File"],
    filenames: [".gitignore", ".dockerignore", ".npmignore", ".eslintignore", ".prettierignore"],
    config: ignoreLanguageConfig,
  },
  {
    id: "ini",
    extensions: [".ini", ".cfg", ".conf"],
    aliases: ["INI", "Config"],
    filenames: [".editorconfig"],
    config: iniLanguageConfig,
  },
  {
    id: "nginx",
    extensions: [".nginx"],
    aliases: ["Nginx"],
    filenames: ["nginx.conf"],
    config: nginxLanguageConfig,
  },
  {
    id: "prisma",
    extensions: [".prisma"],
    aliases: ["Prisma"],
    config: prismaLanguageConfig,
  },
  {
    id: "protobuf",
    extensions: [".proto"],
    aliases: ["Protocol Buffers", "protobuf"],
    config: protoLanguageConfig,
  },
  {
    id: "shellscript",
    extensions: [".sh", ".bash", ".zsh"],
    aliases: ["Shell Script", "bash", "zsh"],
    filenames: [".bashrc", ".zshrc", ".profile", ".bash_profile"],
    config: shellscriptLanguageConfig,
  },
  {
    id: "toml",
    extensions: [".toml"],
    aliases: ["TOML"],
    filenames: ["Cargo.toml", "pyproject.toml"],
    config: tomlLanguageConfig,
  },
];

// ── Helpers ──────────────────────────────────────────────────

function registerLanguage(monaco: Monaco, lang: LanguageDef): void {
  const existing = monaco.languages.getLanguages().find((l) => l.id === lang.id);
  if (!existing) {
    monaco.languages.register({
      id: lang.id,
      extensions: lang.extensions,
      aliases: lang.aliases,
      filenames: lang.filenames,
      mimetypes: lang.mimetypes,
    });
  }
  monaco.languages.setLanguageConfiguration(lang.id, lang.config);
}

function createSingleLanguagePlugin(lang: LanguageDef): MonacoPlugin {
  return {
    id: `language-config-${lang.id}`,
    name: `Language Config: ${lang.aliases[0]}`,
    version: "1.0.0",
    description: `Registers ${lang.aliases[0]} language with Monaco`,
    priority: 99,
    defaultEnabled: true,
    onBeforeMount(monaco: Monaco) {
      registerLanguage(monaco, lang);
    },
  };
}

// ── Bundled plugin (all 10 languages) ────────────────────────

/**
 * Registers all 10 extra languages at once.
 * Use this when you want full language support out of the box.
 */
export function createLanguageConfigPlugin(): MonacoPlugin {
  return {
    id: "language-config",
    name: "Language Config",
    version: "1.0.0",
    description: "Registers 10 extra languages with bracket pairs, comments, and auto-closing rules",
    priority: 99,
    defaultEnabled: true,

    onBeforeMount(monaco: Monaco) {
      for (const lang of extraLanguages) {
        registerLanguage(monaco, lang);
      }
    },
  };
}

// ── Individual language plugins (pick only what you need) ────

export function createDockerfileLanguagePlugin(): MonacoPlugin {
  return createSingleLanguagePlugin(extraLanguages.find((l) => l.id === "dockerfile")!);
}
export function createDotenvLanguagePlugin(): MonacoPlugin {
  return createSingleLanguagePlugin(extraLanguages.find((l) => l.id === "dotenv")!);
}
export function createGraphqlLanguagePlugin(): MonacoPlugin {
  return createSingleLanguagePlugin(extraLanguages.find((l) => l.id === "graphql")!);
}
export function createIgnoreLanguagePlugin(): MonacoPlugin {
  return createSingleLanguagePlugin(extraLanguages.find((l) => l.id === "ignore")!);
}
export function createIniLanguagePlugin(): MonacoPlugin {
  return createSingleLanguagePlugin(extraLanguages.find((l) => l.id === "ini")!);
}
export function createNginxLanguagePlugin(): MonacoPlugin {
  return createSingleLanguagePlugin(extraLanguages.find((l) => l.id === "nginx")!);
}
export function createPrismaLanguagePlugin(): MonacoPlugin {
  return createSingleLanguagePlugin(extraLanguages.find((l) => l.id === "prisma")!);
}
export function createProtobufLanguagePlugin(): MonacoPlugin {
  return createSingleLanguagePlugin(extraLanguages.find((l) => l.id === "protobuf")!);
}
export function createShellscriptLanguagePlugin(): MonacoPlugin {
  return createSingleLanguagePlugin(extraLanguages.find((l) => l.id === "shellscript")!);
}
export function createTomlLanguagePlugin(): MonacoPlugin {
  return createSingleLanguagePlugin(extraLanguages.find((l) => l.id === "toml")!);
}

// ── Re-exports ───────────────────────────────────────────────

export {
  dockerfileLanguageConfig,
  dotenvLanguageConfig,
  graphqlLanguageConfig,
  ignoreLanguageConfig,
  iniLanguageConfig,
  nginxLanguageConfig,
  prismaLanguageConfig,
  protoLanguageConfig,
  shellscriptLanguageConfig,
  tomlLanguageConfig,
};
