// ── Language config plugin — registers extra languages with Monaco ──
import type * as monacoNs from "monaco-editor";
import type { MonacoPlugin, Monaco } from "@core/types";

import { dockerfileLanguageConfig } from "./configs/dockerfile";
import { dotenvLanguageConfig } from "./configs/dotenv";
import { graphqlLanguageConfig } from "./configs/graphql";
import { ignoreLanguageConfig } from "./configs/ignore";
import { iniLanguageConfig } from "./configs/ini";
import { nginxLanguageConfig } from "./configs/nginx";
import { prismaLanguageConfig } from "./configs/prisma";
import { protoLanguageConfig } from "./configs/proto";
import { shellscriptLanguageConfig } from "./configs/shellscript";
import { tomlLanguageConfig } from "./configs/toml";

interface LanguageDef {
  id: string;
  extensions: string[];
  aliases: string[];
  filenames?: string[];
  mimetypes?: string[];
  config: monacoNs.languages.LanguageConfiguration;
}

/**
 * Languages that Monaco does not register natively.
 * Each includes: language registration + language configuration (brackets, comments, etc.)
 */
const extraLanguages: LanguageDef[] = [
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
        // Only register if not already registered
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
    },
  };
}

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
