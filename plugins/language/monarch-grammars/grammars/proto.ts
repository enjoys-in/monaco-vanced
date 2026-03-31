// ── Protobuf Monarch tokenizer ────────────────────────────────
import type * as monacoNs from "monaco-editor";

export const protoTokenizer: monacoNs.languages.IMonarchLanguage = {
  defaultToken: "",
  keywords: [
    "syntax", "package", "import", "option", "message", "enum", "service",
    "rpc", "returns", "stream", "oneof", "map", "reserved", "extensions",
    "extend", "repeated", "optional", "required", "public", "weak",
  ],
  typeKeywords: [
    "double", "float", "int32", "int64", "uint32", "uint64",
    "sint32", "sint64", "fixed32", "fixed64", "sfixed32", "sfixed64",
    "bool", "string", "bytes", "any", "google.protobuf.Any",
  ],

  tokenizer: {
    root: [
      [/\/\/.*$/, "comment"],
      [/\/\*/, "comment", "@comment"],
      [/"[^"]*"/, "string"],
      [/'[^']*'/, "string"],
      [/\d+(\.\d+)?/, "number"],
      [/\b(true|false)\b/, "keyword.constant"],
      [/[a-z_]\w*/, { cases: { "@keywords": "keyword", "@typeKeywords": "type", "@default": "identifier" } }],
      [/[A-Z]\w*/, "type.identifier"],
      [/[{}()\[\]]/, "delimiter.bracket"],
      [/[;,=]/, "delimiter"],
    ],
    comment: [
      [/\*\//, "comment", "@pop"],
      [/./, "comment"],
    ],
  },
};
