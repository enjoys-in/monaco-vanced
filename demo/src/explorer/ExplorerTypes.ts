// ── Explorer Types ──────────────────────────────────────────

// Re-export core enums so local imports keep working
export { ExplorerAction, ExplorerEvents } from "@enjoys/monaco-vanced/core/events";
import { ExplorerAction } from "@enjoys/monaco-vanced/core/events";

export interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNode[];
  expanded?: boolean;
}

export interface ExplorerState {
  rootLabel: string;
  tree: TreeNode[];
  activeFileUri: string | null;
  /** Last clicked node path (file or folder) — used for smart new file/folder placement */
  selectedPath: string | null;
  openFileUris: Set<string>;
  modifiedFileUris: Set<string>;
  expandedPaths: Set<string>;
  renaming: string | null;
  inlineInput: InlineInputState | null;
}

export interface InlineInputState {
  parentPath: string;
  type: "file" | "folder";
  /** Depth in tree for indent calculation */
  depth: number;
}

export interface ContextMenuAction {
  label: string;
  icon: string;
  action: ExplorerAction;
  separator?: boolean;
}

/** Map file extension → icon color */
const EXT_COLORS: Record<string, string> = {
  ts: "#3178c6", tsx: "#3178c6", js: "#f7df1e", jsx: "#f7df1e",
  json: "#a9a9a9", css: "#563d7c", scss: "#c6538c", less: "#1d365d",
  html: "#e44d26", htm: "#e44d26", md: "#ffffff", mdx: "#ffffff",
  py: "#3572a5", rs: "#dea584", go: "#00add8", rb: "#cc342d",
  java: "#b07219", kt: "#a97bff", c: "#555555", cpp: "#f34b7d", h: "#555555",
  yml: "#cb171e", yaml: "#cb171e", toml: "#9c4221",
  sh: "#89e051", bash: "#89e051", zsh: "#89e051",
  sql: "#e38c00", graphql: "#e535ab",
  svg: "#ffb13b", xml: "#0060ac",
  env: "#ecd53f", gitignore: "#f54d27",
  lock: "#6a737d", txt: "#6a737d",
  vue: "#41b883", svelte: "#ff3e00", astro: "#ff5d01",
  dockerfile: "#384d54", docker: "#384d54",
  png: "#a074c4", jpg: "#a074c4", jpeg: "#a074c4", gif: "#a074c4", webp: "#a074c4", ico: "#a074c4",
};

/** Known folder names → icon color */
const FOLDER_COLORS: Record<string, string> = {
  src: "#42a5f5", lib: "#42a5f5", app: "#42a5f5",
  components: "#7cb342", pages: "#7cb342", views: "#7cb342",
  hooks: "#ab47bc", composables: "#ab47bc",
  utils: "#ffa726", helpers: "#ffa726", tools: "#ffa726",
  styles: "#ec407a", css: "#ec407a",
  assets: "#26c6da", images: "#26c6da", icons: "#26c6da", public: "#26c6da",
  api: "#ef5350", services: "#ef5350",
  config: "#78909c", ".vscode": "#007acc",
  test: "#66bb6a", tests: "#66bb6a", __tests__: "#66bb6a", spec: "#66bb6a",
  node_modules: "#689f63", dist: "#78909c", build: "#78909c",
  types: "#3178c6", typings: "#3178c6",
};

export function getExtColor(ext: string): string {
  return EXT_COLORS[ext] ?? "#858585";
}

export function getFolderColor(name: string): string {
  return FOLDER_COLORS[name] ?? "#dcb67a";
}
