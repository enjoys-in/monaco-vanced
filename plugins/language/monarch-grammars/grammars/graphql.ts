// ── GraphQL Monarch tokenizer ─────────────────────────────────
import type * as monacoNs from "monaco-editor";

export const graphqlTokenizer: monacoNs.languages.IMonarchLanguage = {
  defaultToken: "",
  keywords: [
    "query", "mutation", "subscription", "fragment", "on", "type", "interface",
    "union", "enum", "input", "scalar", "schema", "extend", "directive",
    "implements", "repeatable",
  ],
  typeKeywords: ["Int", "Float", "String", "Boolean", "ID"],
  operators: ["=", "!", "|", "&", ":", "@", "..."],

  tokenizer: {
    root: [
      [/#.*$/, "comment"],
      [/"""/, "string", "@mlstring"],
      [/"[^"]*"/, "string"],
      [/\d+(\.\d+)?([eE][+-]?\d+)?/, "number"],
      [/\$[A-Za-z_]\w*/, "variable"],
      [/@[A-Za-z_]\w*/, "annotation"],
      [/\b(true|false|null)\b/, "keyword"],
      [/[A-Z]\w*/, { cases: { "@typeKeywords": "type", "@default": "type.identifier" } }],
      [/[a-z_]\w*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
      [/[{}()\[\]]/, "delimiter.bracket"],
      [/[!|&:=]/, "delimiter"],
      [/\.\.\./, "delimiter"],
    ],
    mlstring: [
      [/"""/, "string", "@pop"],
      [/./, "string"],
    ],
  },
};
