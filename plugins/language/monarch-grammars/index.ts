// ── Monarch grammars plugin — fetches tokenizers from @enjoys/context-engine CDN ──
import type * as monacoNs from "monaco-editor";
import type { MonacoPlugin, Monaco } from "@core/types";

const CDN_BASE =
  "https://cdn.jsdelivr.net/npm/@enjoys/context-engine@latest/data/monarchTokens";

const languageIds = [
  "dockerfile",
  "dotenv",
  "graphql",
  "ignore",
  "ini",
  "makefile",
  "nginx",
  "prisma",
  "protobuf",
  "ssh-config",
  "toml",
] as const;

export type MonarchLanguageId = (typeof languageIds)[number];

/** Inline fallback tokenizers for CDN entries that lack a valid `tokenizer` property */
const fallbackTokenizers: Partial<
  Record<string, monacoNs.languages.IMonarchLanguage>
> = {
  ignore: {
    tokenPostfix: ".ignore",
    defaultToken: "",
    tokenizer: {
      root: [
        [/#.*$/, "comment"],
        [/!/, "keyword"],
        [/\*\*/, "keyword"],
        [/[*?]/, "keyword"],
        [/[^\s]/, "string"],
      ],
    },
  },
  prisma: {
    tokenPostfix: ".prisma",
    defaultToken: "",
    keywords: [
      "model",
      "enum",
      "datasource",
      "generator",
      "type",
    ],
    typeKeywords: [
      "String",
      "Int",
      "Float",
      "Boolean",
      "DateTime",
      "Json",
      "Bytes",
      "BigInt",
    ],
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/@\w+/, "annotation"],
        [/"([^"\\]|\\.)*"/, "string"],
        [/\d+(\.\d+)?/, "number"],
        [/[{}()\[\]]/, "delimiter"],
        [
          /[a-zA-Z_]\w*/,
          {
            cases: {
              "@keywords": "keyword",
              "@typeKeywords": "type",
              "@default": "identifier",
            },
          },
        ],
      ],
      comment: [
        [/\*\//, "comment", "@pop"],
        [/./, "comment"],
      ],
    },
  },
};

async function fetchTokenizer(
  langId: string,
): Promise<monacoNs.languages.IMonarchLanguage> {
  const url = `${CDN_BASE}/${langId}.json`;
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) {
    throw new Error(`[monarch-grammars] ${langId}: HTTP ${res.status}`);
  }
  const data = await res.json();
  if (data && typeof data.tokenizer === "object") {
    return data as monacoNs.languages.IMonarchLanguage;
  }
  const fallback = fallbackTokenizers[langId];
  if (fallback) {
    console.warn(`[monarch-grammars] ${langId}: CDN definition missing tokenizer, using fallback`);
    return fallback;
  }
  throw new Error(`[monarch-grammars] ${langId}: CDN definition missing required 'tokenizer' attribute`);
}

export function createMonarchGrammarsPlugin(): MonacoPlugin {
  return {
    id: "monarch-grammars",
    name: "Monarch Grammars",
    version: "1.0.0",
    description:
      "Syntax highlighting for extra languages via CDN Monarch tokenizers (@enjoys/context-engine)",
    dependencies: ["language-config"],
    priority: 98,
    defaultEnabled: true,

    async onBeforeMount(monaco: Monaco) {
      const results = await Promise.allSettled(
        languageIds.map(async (langId) => {
          const tokenizer = await fetchTokenizer(langId);
          monaco.languages.setMonarchTokensProvider(langId, tokenizer);
        }),
      );

      for (const r of results) {
        if (r.status === "rejected") {
          console.warn(r.reason);
        }
      }
    },
  };
}

export { languageIds, CDN_BASE, fetchTokenizer };
