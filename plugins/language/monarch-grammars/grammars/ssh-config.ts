// ── SSH Config Monarch tokenizer ──────────────────────────────
import type * as monacoNs from "monaco-editor";

export const sshConfigTokenizer: monacoNs.languages.IMonarchLanguage = {
  defaultToken: "",
  keywords: [
    "Host", "Match", "HostName", "User", "Port", "IdentityFile",
    "ForwardAgent", "ProxyJump", "ProxyCommand", "LocalForward",
    "RemoteForward", "DynamicForward", "ServerAliveInterval",
    "ServerAliveCountMax", "StrictHostKeyChecking", "UserKnownHostsFile",
    "AddKeysToAgent", "IdentitiesOnly", "Compression", "LogLevel",
    "SendEnv", "SetEnv", "RequestTTY", "TCPKeepAlive", "Ciphers",
    "MACs", "KexAlgorithms", "PubkeyAcceptedAlgorithms",
  ],

  tokenizer: {
    root: [
      [/#.*$/, "comment"],
      [/\b(Host|Match)\b/, "keyword.control"],
      [/^\s*[A-Z]\w+/, { cases: { "@keywords": "variable.name", "@default": "variable.name" } }],
      [/"[^"]*"/, "string"],
      [/\d+/, "number"],
      [/\b(yes|no)\b/, "keyword.constant"],
      [/[*?]/, "keyword.operator"],
      [/~\/[^\s]+/, "string"],
    ],
  },
};
