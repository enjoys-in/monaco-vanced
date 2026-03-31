// ── Nginx Monarch tokenizer ───────────────────────────────────
import type * as monacoNs from "monaco-editor";

export const nginxTokenizer: monacoNs.languages.IMonarchLanguage = {
  defaultToken: "",
  keywords: [
    "server", "location", "upstream", "http", "events", "worker_processes",
    "listen", "server_name", "root", "index", "try_files", "proxy_pass",
    "fastcgi_pass", "include", "return", "rewrite", "if", "set",
    "error_page", "access_log", "error_log", "ssl_certificate",
    "ssl_certificate_key", "ssl_protocols", "ssl_ciphers",
    "client_max_body_size", "keepalive_timeout", "sendfile",
    "gzip", "gzip_types", "add_header", "expires",
    "worker_connections", "use", "default_type", "types",
  ],

  tokenizer: {
    root: [
      [/#.*$/, "comment"],
      [/\$[A-Za-z_]\w*/, "variable"],
      [/\$\{[^}]+\}/, "variable"],
      [/~\*?/, "regexp"],
      [/[a-z_][\w_]*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
      [/\d+[kmg]?/i, "number"],
      [/"[^"]*"/, "string"],
      [/'[^']*'/, "string"],
      [/[{}]/, "delimiter.bracket"],
      [/;/, "delimiter"],
    ],
  },
};
