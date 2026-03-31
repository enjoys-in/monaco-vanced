// ── Monarch grammars plugin — fetches tokenizers from @enjoys/context-engine CDN ──
import type * as monacoNs from "monaco-editor";
import type { MonacoPlugin, Monaco } from "@core/types";

const CDN_BASE =
  "https://cdn.jsdelivr.net/npm/@enjoys/context-engine/data/monarchTokens";

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

async function fetchTokenizer(
  langId: string,
): Promise<monacoNs.languages.IMonarchLanguage> {
  const url = `${CDN_BASE}/${langId}.json`;
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) {
    throw new Error(`[monarch-grammars] ${langId}: HTTP ${res.status}`);
  }
  return res.json() as Promise<monacoNs.languages.IMonarchLanguage>;
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
