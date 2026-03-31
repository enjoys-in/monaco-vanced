// ── Monarch grammars plugin — registers tokenizers for extra languages ──
import type * as monacoNs from "monaco-editor";
import type { MonacoPlugin, Monaco } from "@core/types";

import { dockerfileTokenizer } from "./grammars/dockerfile";
import { dotenvTokenizer } from "./grammars/dotenv";
import { graphqlTokenizer } from "./grammars/graphql";
import { ignoreTokenizer } from "./grammars/ignore";
import { iniTokenizer } from "./grammars/ini";
import { makefileTokenizer } from "./grammars/makefile";
import { nginxTokenizer } from "./grammars/nginx";
import { prismaTokenizer } from "./grammars/prisma";
import { protoTokenizer } from "./grammars/proto";
import { sshConfigTokenizer } from "./grammars/ssh-config";
import { tomlTokenizer } from "./grammars/toml";

interface GrammarEntry {
  languageId: string;
  tokenizer: monacoNs.languages.IMonarchLanguage;
}

const grammars: GrammarEntry[] = [
  { languageId: "dockerfile", tokenizer: dockerfileTokenizer },
  { languageId: "dotenv", tokenizer: dotenvTokenizer },
  { languageId: "graphql", tokenizer: graphqlTokenizer },
  { languageId: "ignore", tokenizer: ignoreTokenizer },
  { languageId: "ini", tokenizer: iniTokenizer },
  { languageId: "makefile", tokenizer: makefileTokenizer },
  { languageId: "nginx", tokenizer: nginxTokenizer },
  { languageId: "prisma", tokenizer: prismaTokenizer },
  { languageId: "protobuf", tokenizer: protoTokenizer },
  { languageId: "ssh-config", tokenizer: sshConfigTokenizer },
  { languageId: "toml", tokenizer: tomlTokenizer },
];

export function createMonarchGrammarsPlugin(): MonacoPlugin {
  return {
    id: "monarch-grammars",
    name: "Monarch Grammars",
    version: "1.0.0",
    description: "Syntax highlighting for 11 extra languages via Monarch tokenizers",
    dependencies: ["language-config"],
    priority: 98,
    defaultEnabled: true,

    onBeforeMount(monaco: Monaco) {
      for (const { languageId, tokenizer } of grammars) {
        monaco.languages.setMonarchTokensProvider(languageId, tokenizer);
      }
    },
  };
}

export {
  dockerfileTokenizer,
  dotenvTokenizer,
  graphqlTokenizer,
  ignoreTokenizer,
  iniTokenizer,
  makefileTokenizer,
  nginxTokenizer,
  prismaTokenizer,
  protoTokenizer,
  sshConfigTokenizer,
  tomlTokenizer,
};
