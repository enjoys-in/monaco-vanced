// ── Dockerfile Monarch tokenizer ──────────────────────────────
import type * as monacoNs from "monaco-editor";

export const dockerfileTokenizer: monacoNs.languages.IMonarchLanguage = {
  defaultToken: "",
  ignoreCase: true,

  keywords: [
    "FROM", "AS", "MAINTAINER", "RUN", "CMD", "LABEL", "EXPOSE", "ENV",
    "ADD", "COPY", "ENTRYPOINT", "VOLUME", "USER", "WORKDIR", "ARG",
    "ONBUILD", "STOPSIGNAL", "HEALTHCHECK", "SHELL",
  ],

  tokenizer: {
    root: [
      [/#.*$/, "comment"],
      [/\b(FROM|AS|RUN|CMD|LABEL|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL|MAINTAINER)\b/i, "keyword"],
      [/\$\{[^}]+\}/, "variable"],
      [/\$[A-Za-z_]\w*/, "variable"],
      [/"[^"]*"/, "string"],
      [/'[^']*'/, "string"],
      [/\d+/, "number"],
      [/--[\w-]+=?/, "attribute.name"],
    ],
  },
};
