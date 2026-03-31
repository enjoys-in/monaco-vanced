// ── Prisma Monarch tokenizer ──────────────────────────────────
import type * as monacoNs from "monaco-editor";

export const prismaTokenizer: monacoNs.languages.IMonarchLanguage = {
  defaultToken: "",
  keywords: [
    "datasource", "generator", "model", "enum", "type",
    "relation", "default", "map", "unique", "index", "id",
    "ignore", "updatedAt",
  ],
  typeKeywords: [
    "String", "Int", "Float", "Boolean", "DateTime", "Json",
    "Bytes", "BigInt", "Decimal", "Unsupported",
  ],

  tokenizer: {
    root: [
      [/\/\/.*$/, "comment"],
      [/@[\w.]+/, "annotation"],
      [/\b(datasource|generator|model|enum|type)\b/, "keyword"],
      [/\b(relation|default|map|unique|index|id|ignore|updatedAt)\b/, "keyword"],
      [/\b(String|Int|Float|Boolean|DateTime|Json|Bytes|BigInt|Decimal|Unsupported)\b/, "type"],
      [/\b(true|false|null)\b/, "keyword.constant"],
      [/"[^"]*"/, "string"],
      [/\d+/, "number"],
      [/[?!\[\]]/, "delimiter"],
      [/[{}()]/, "delimiter.bracket"],
      [/[A-Z]\w*/, "type.identifier"],
      [/[a-z_]\w*/, "identifier"],
    ],
  },
};
