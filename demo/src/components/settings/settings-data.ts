// ── Settings data — extracted from settings-webview for reuse ─

import { THEME_DEFS, BUILTIN_THEME_NAMES } from "../theme";

export interface SettingDef {
  id: string;
  label: string;
  type: "checkbox" | "number" | "text" | "select" | "color";
  value: string;
  options?: string[];
  desc: string;
  group: string;
  category: string;
  tags?: string[];
}

export interface PluginInfo {
  name: string;
  id: string;
  desc: string;
  category: string;
  color: string;
  installed: boolean;
  settings: SettingDef[];
}

export interface ThemeInfo {
  name: string;
  type: "dark" | "light" | "contrast";
  colors: { bg: string; fg: string; accent: string; sidebar: string };
}

export interface KeybindingInfo {
  command: string;
  key: string;
  when: string;
}

export interface SettingsCategory {
  id: string;
  label: string;
  icon: string;
  children?: { id: string; label: string }[];
}

// ── Editor Settings ──────────────────────────────────────────
export const EDITOR_SETTINGS: SettingDef[] = [
  { id: "editor.fontSize", label: "Font Size", type: "number", value: "14", desc: "Controls the font size in pixels.", group: "Font", category: "Text Editor", tags: ["font"] },
  { id: "editor.fontFamily", label: "Font Family", type: "text", value: "'JetBrains Mono', monospace", desc: "Controls the font family for the editor.", group: "Font", category: "Text Editor", tags: ["font"] },
  { id: "editor.fontWeight", label: "Font Weight", type: "select", value: "normal", options: ["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"], desc: "Controls the font weight.", group: "Font", category: "Text Editor", tags: ["font"] },
  { id: "editor.fontLigatures", label: "Font Ligatures", type: "checkbox", value: "true", desc: "Enables/disables font ligatures.", group: "Font", category: "Text Editor", tags: ["font"] },
  { id: "editor.lineHeight", label: "Line Height", type: "number", value: "0", desc: "Controls the line height. Use 0 for automatic.", group: "Font", category: "Text Editor", tags: ["font"] },
  { id: "editor.letterSpacing", label: "Letter Spacing", type: "number", value: "0", desc: "Controls the letter spacing in pixels.", group: "Font", category: "Text Editor", tags: ["font"] },
  { id: "editor.cursorBlinking", label: "Cursor Blinking", type: "select", value: "smooth", options: ["blink", "smooth", "phase", "expand", "solid"], desc: "Controls the cursor animation style.", group: "Cursor", category: "Text Editor", tags: ["cursor"] },
  { id: "editor.cursorStyle", label: "Cursor Style", type: "select", value: "line", options: ["line", "block", "underline", "line-thin", "block-outline", "underline-thin"], desc: "Controls the cursor style.", group: "Cursor", category: "Text Editor", tags: ["cursor"] },
  { id: "editor.cursorSmoothCaretAnimation", label: "Smooth Caret Animation", type: "select", value: "on", options: ["off", "explicit", "on"], desc: "Controls smooth caret animation.", group: "Cursor", category: "Text Editor", tags: ["cursor"] },
  { id: "editor.minimap.enabled", label: "Minimap Enabled", type: "checkbox", value: "true", desc: "Controls whether the minimap is shown.", group: "Minimap", category: "Text Editor", tags: ["minimap"] },
  { id: "editor.minimap.side", label: "Minimap Side", type: "select", value: "right", options: ["left", "right"], desc: "Controls the side where minimap is rendered.", group: "Minimap", category: "Text Editor", tags: ["minimap"] },
  { id: "editor.suggestOnTriggerCharacters", label: "Suggest On Trigger", type: "checkbox", value: "true", desc: "Controls whether suggestions auto-show on trigger characters.", group: "Suggest", category: "Text Editor", tags: ["suggest"] },
  { id: "editor.quickSuggestions", label: "Quick Suggestions", type: "checkbox", value: "true", desc: "Enable quick suggestions (autocomplete as you type).", group: "Suggest", category: "Text Editor", tags: ["suggest"] },
  { id: "editor.snippetSuggestions", label: "Snippet Suggestions", type: "select", value: "inline", options: ["top", "bottom", "inline", "none"], desc: "Controls how snippets appear with other suggestions.", group: "Suggest", category: "Text Editor", tags: ["suggest"] },
  { id: "editor.formatOnPaste", label: "Format on Paste", type: "checkbox", value: "false", desc: "Auto-format pasted content.", group: "Formatting", category: "Text Editor", tags: ["format"] },
  { id: "editor.formatOnSave", label: "Format on Save", type: "checkbox", value: "false", desc: "Format a file on save.", group: "Formatting", category: "Text Editor", tags: ["format"] },
  { id: "editor.formatOnType", label: "Format on Type", type: "checkbox", value: "false", desc: "Auto-format the line after typing.", group: "Formatting", category: "Text Editor", tags: ["format"] },
  { id: "editor.defaultFormatter", label: "Default Formatter", type: "text", value: "esbenp.prettier-vscode", desc: "Default formatter for document formatting.", group: "Formatting", category: "Text Editor", tags: ["format"] },
  { id: "editor.smoothScrolling", label: "Smooth Scrolling", type: "checkbox", value: "true", desc: "Scroll using an animation.", group: "Scrolling", category: "Text Editor", tags: ["scroll"] },
  { id: "editor.scrollBeyondLastLine", label: "Scroll Beyond Last Line", type: "checkbox", value: "false", desc: "Scroll beyond the last line.", group: "Scrolling", category: "Text Editor", tags: ["scroll"] },
  { id: "editor.renderWhitespace", label: "Render Whitespace", type: "select", value: "selection", options: ["none", "boundary", "selection", "trailing", "all"], desc: "How to render whitespace characters.", group: "Rendering", category: "Text Editor", tags: ["whitespace"] },
  { id: "editor.renderLineHighlight", label: "Render Line Highlight", type: "select", value: "all", options: ["none", "gutter", "line", "all"], desc: "How to render current line highlight.", group: "Rendering", category: "Text Editor", tags: ["highlight"] },
  { id: "editor.bracketPairColorization.enabled", label: "Bracket Pair Colorization", type: "checkbox", value: "true", desc: "Enable bracket pair colorization.", group: "Rendering", category: "Text Editor", tags: ["bracket"] },
  { id: "editor.tabSize", label: "Tab Size", type: "number", value: "2", desc: "The number of spaces a tab is equal to.", group: "Indentation", category: "Text Editor", tags: ["tab", "indent"] },
  { id: "editor.insertSpaces", label: "Insert Spaces", type: "checkbox", value: "true", desc: "Insert spaces instead of tabs.", group: "Indentation", category: "Text Editor", tags: ["tab", "indent"] },
  { id: "editor.wordWrap", label: "Word Wrap", type: "select", value: "off", options: ["off", "on", "wordWrapColumn", "bounded"], desc: "Controls how lines should wrap.", group: "Word Wrap", category: "Text Editor", tags: ["wrap"] },
  { id: "editor.lineNumbers", label: "Line Numbers", type: "select", value: "on", options: ["on", "off", "relative", "interval"], desc: "Controls line number display.", group: "Misc", category: "Text Editor", tags: ["line numbers"] },
  { id: "editor.folding", label: "Folding", type: "checkbox", value: "true", desc: "Controls folding enabled.", group: "Misc", category: "Text Editor", tags: ["fold"] },
  { id: "editor.glyphMargin", label: "Glyph Margin", type: "checkbox", value: "true", desc: "Render the glyph margin.", group: "Misc", category: "Text Editor", tags: ["glyph"] },
  { id: "diffEditor.renderSideBySide", label: "Diff: Side by Side", type: "checkbox", value: "true", desc: "Show diff side-by-side or inline.", group: "Diff Editor", category: "Text Editor" },
];

// ── Workbench Settings ───────────────────────────────────────
export const WORKBENCH_SETTINGS: SettingDef[] = [
  { id: "workbench.activityBar.visible", label: "Activity Bar Visible", type: "checkbox", value: "true", desc: "Controls activity bar visibility.", group: "Appearance", category: "Workbench" },
  { id: "workbench.sideBar.location", label: "Sidebar Location", type: "select", value: "left", options: ["left", "right"], desc: "Controls sidebar location.", group: "Appearance", category: "Workbench" },
  { id: "workbench.statusBar.visible", label: "Status Bar Visible", type: "checkbox", value: "true", desc: "Controls status bar visibility.", group: "Appearance", category: "Workbench" },
  { id: "workbench.colorTheme", label: "Color Theme", type: "text", value: "Dark+ (Default)", desc: "Specifies the color theme.", group: "Appearance", category: "Workbench" },
  { id: "workbench.startupEditor", label: "Startup Editor", type: "select", value: "welcomePage", options: ["none", "welcomePage", "newUntitledFile", "readme"], desc: "Controls startup editor.", group: "Startup", category: "Workbench" },
  { id: "workbench.editor.tabSizing", label: "Tab Sizing", type: "select", value: "fit", options: ["fit", "shrink", "fixed"], desc: "Controls tab sizing.", group: "Editor Tabs", category: "Workbench" },
  { id: "workbench.editor.showIcons", label: "Show Tab Icons", type: "checkbox", value: "true", desc: "Show file icons in tabs.", group: "Editor Tabs", category: "Workbench" },
  { id: "workbench.editor.enablePreview", label: "Enable Preview Tabs", type: "checkbox", value: "true", desc: "Single-click opens preview tabs.", group: "Editor Tabs", category: "Workbench" },
  { id: "workbench.editor.highlightModifiedTabs", label: "Highlight Modified Tabs", type: "checkbox", value: "false", desc: "Show border color on modified tabs.", group: "Editor Tabs", category: "Workbench" },
  { id: "breadcrumbs.enabled", label: "Breadcrumbs Enabled", type: "checkbox", value: "true", desc: "Enable breadcrumb navigation.", group: "Breadcrumbs", category: "Workbench" },
];

// ── Files ────────────────────────────────────────────────────
export const FILES_SETTINGS: SettingDef[] = [
  { id: "files.autoSave", label: "Auto Save", type: "select", value: "off", options: ["off", "afterDelay", "onFocusChange", "onWindowChange"], desc: "Controls auto save.", group: "Auto Save", category: "Files" },
  { id: "files.autoSaveDelay", label: "Auto Save Delay", type: "number", value: "1000", desc: "Auto-save delay in ms.", group: "Auto Save", category: "Files" },
  { id: "files.trimTrailingWhitespace", label: "Trim Trailing Whitespace", type: "checkbox", value: "false", desc: "Trim trailing whitespace on save.", group: "Saving", category: "Files" },
  { id: "files.insertFinalNewline", label: "Insert Final Newline", type: "checkbox", value: "false", desc: "Insert final newline on save.", group: "Saving", category: "Files" },
  { id: "files.encoding", label: "File Encoding", type: "select", value: "utf8", options: ["utf8", "utf8bom", "utf16le", "utf16be"], desc: "Default character set encoding.", group: "Encoding", category: "Files" },
  { id: "files.eol", label: "End of Line", type: "select", value: "auto", options: ["\\n", "\\r\\n", "auto"], desc: "Default end of line.", group: "Encoding", category: "Files" },
  { id: "files.exclude", label: "Files: Exclude", type: "text", value: "**/.git, **/node_modules", desc: "Glob patterns to exclude.", group: "Explorer", category: "Files" },
];

// ── Features ─────────────────────────────────────────────────
export const FEATURES_SETTINGS: SettingDef[] = [
  { id: "terminal.integrated.fontFamily", label: "Terminal Font Family", type: "text", value: "'JetBrains Mono', monospace", desc: "Terminal font family.", group: "Terminal", category: "Features" },
  { id: "terminal.integrated.fontSize", label: "Terminal Font Size", type: "number", value: "13", desc: "Terminal font size.", group: "Terminal", category: "Features" },
  { id: "terminal.integrated.cursorStyle", label: "Terminal Cursor Style", type: "select", value: "block", options: ["block", "underline", "line"], desc: "Terminal cursor style.", group: "Terminal", category: "Features" },
  { id: "explorer.autoReveal", label: "Auto Reveal", type: "select", value: "true", options: ["true", "false", "focusNoScroll"], desc: "Auto-reveal active file.", group: "Explorer", category: "Features" },
  { id: "explorer.sortOrder", label: "Sort Order", type: "select", value: "default", options: ["default", "mixed", "filesFirst", "type", "modified"], desc: "Sort order in explorer.", group: "Explorer", category: "Features" },
  { id: "explorer.compactFolders", label: "Compact Folders", type: "checkbox", value: "true", desc: "Compact single-child folders.", group: "Explorer", category: "Features" },
  { id: "search.useIgnoreFiles", label: "Use Ignore Files", type: "checkbox", value: "true", desc: "Use .gitignore when searching.", group: "Search", category: "Features" },
  { id: "search.smartCase", label: "Smart Case", type: "checkbox", value: "false", desc: "Case-insensitive when lowercase.", group: "Search", category: "Features" },
  { id: "debug.inlineValues", label: "Debug Inline Values", type: "select", value: "auto", options: ["on", "off", "auto"], desc: "Show variable values inline during debugging.", group: "Debug", category: "Features" },
  { id: "git.enabled", label: "Git Enabled", type: "checkbox", value: "true", desc: "Controls whether Git is enabled.", group: "Git", category: "Features" },
  { id: "git.autofetch", label: "Git Auto Fetch", type: "checkbox", value: "false", desc: "Auto-fetch from remotes.", group: "Git", category: "Features" },
  { id: "git.enableSmartCommit", label: "Smart Commit", type: "checkbox", value: "false", desc: "Commit all changes when nothing staged.", group: "Git", category: "Features" },
];

// ── Window ───────────────────────────────────────────────────
export const WINDOW_SETTINGS: SettingDef[] = [
  { id: "window.title", label: "Window Title", type: "text", value: "${dirty}${activeEditorShort}${separator}${rootName}", desc: "Window title format.", group: "Title Bar", category: "Window" },
  { id: "window.zoomLevel", label: "Zoom Level", type: "number", value: "0", desc: "Window zoom level.", group: "Zoom", category: "Window" },
  { id: "window.menuBarVisibility", label: "Menu Bar Visibility", type: "select", value: "classic", options: ["classic", "visible", "toggle", "hidden", "compact"], desc: "Menu bar visibility.", group: "Title Bar", category: "Window" },
];

// ── Plugin catalog (trimmed — key modules) ───────────────────
export const PLUGIN_CATALOG: PluginInfo[] = [
  { name: "Theme Engine", id: "theme-module", desc: "Color theme management & switching", category: "Theming", color: "#ce9178", installed: true, settings: [
    { id: "theme.autoDetectColorScheme", label: "Auto Detect Color Scheme", type: "checkbox", value: "false", desc: "Auto-switch based on OS setting.", group: "Theme Engine", category: "Plugins" },
  ]},
  { name: "Icon Pack", id: "icon-module", desc: "File & folder icon management", category: "Theming", color: "#dcdcaa", installed: true, settings: [
    { id: "iconTheme.active", label: "Active Icon Theme", type: "select", value: "seti", options: ["seti", "material", "vscode-icons", "none"], desc: "Active file icon theme.", group: "Icon Pack", category: "Plugins" },
  ]},
  { name: "Code Editor", id: "editor-module", desc: "Core Monaco editor integration", category: "Editor", color: "#569cd6", installed: true, settings: [
    { id: "editor-module.retainUndoHistory", label: "Retain Undo History", type: "checkbox", value: "true", desc: "Keep undo/redo on model switch.", group: "Code Editor", category: "Plugins" },
  ]},
  { name: "Tabs Manager", id: "tabs-module", desc: "Multi-file tab management", category: "Editor", color: "#4ec9b0", installed: true, settings: [
    { id: "tabs.maxOpen", label: "Max Open Tabs", type: "number", value: "20", desc: "Max tabs before auto-close.", group: "Tabs Manager", category: "Plugins" },
    { id: "tabs.previewMode", label: "Preview Mode", type: "checkbox", value: "true", desc: "Single-click opens preview tab.", group: "Tabs Manager", category: "Plugins" },
  ]},
  { name: "Layout Manager", id: "layout-module", desc: "Split panes & layout persistence", category: "Layout", color: "#4ec9b0", installed: true, settings: [
    { id: "layout.panelPosition", label: "Panel Position", type: "select", value: "bottom", options: ["bottom", "right", "left"], desc: "Default panel position.", group: "Layout Manager", category: "Plugins" },
  ]},
  { name: "Sidebar", id: "sidebar-module", desc: "Sidebar view management", category: "Layout", color: "#ce9178", installed: true, settings: [
    { id: "sidebar.defaultWidth", label: "Default Width", type: "number", value: "240", desc: "Default sidebar width.", group: "Sidebar", category: "Plugins" },
  ]},
  { name: "Command Palette", id: "command-module", desc: "Command registration & fuzzy search", category: "Infrastructure", color: "#569cd6", installed: true, settings: [
    { id: "command.maxResults", label: "Max Results", type: "number", value: "50", desc: "Max palette results.", group: "Command Palette", category: "Plugins" },
  ]},
  { name: "Settings", id: "settings-module", desc: "User & workspace settings", category: "Infrastructure", color: "#dcdcaa", installed: true, settings: [] },
  { name: "Notifications", id: "notification-module", desc: "Toast notification system", category: "Infrastructure", color: "#ce9178", installed: true, settings: [
    { id: "notification.defaultDuration", label: "Default Duration", type: "number", value: "5000", desc: "Default display time (ms).", group: "Notifications", category: "Plugins" },
    { id: "notification.position", label: "Position", type: "select", value: "bottom-right", options: ["bottom-right", "top-right", "bottom-left", "top-left"], desc: "Toast position.", group: "Notifications", category: "Plugins" },
  ]},
  { name: "AI Assistant", id: "ai-module", desc: "AI code completion & chat", category: "AI / Intelligence", color: "#b5cea8", installed: false, settings: [
    { id: "ai.provider", label: "AI Provider", type: "select", value: "openai", options: ["openai", "anthropic", "local", "copilot"], desc: "AI completion provider.", group: "AI Assistant", category: "Plugins" },
    { id: "ai.inlineEnabled", label: "Inline Suggestions", type: "checkbox", value: "true", desc: "Show AI ghost text.", group: "AI Assistant", category: "Plugins" },
  ]},
  { name: "Terminal", id: "terminal-module", desc: "Integrated terminal emulation", category: "Devtools", color: "#89d185", installed: false, settings: [] },
  { name: "Debugger", id: "debugger-module", desc: "Breakpoints & step debugging", category: "Devtools", color: "#f14c4c", installed: false, settings: [] },
  { name: "Git Integration", id: "git-module", desc: "Git operations & status", category: "SCM", color: "#ce9178", installed: false, settings: [
    { id: "git.decorations", label: "Git Decorations", type: "checkbox", value: "true", desc: "Git status decorations in explorer.", group: "Git Integration", category: "Plugins" },
  ]},
  { name: "Extension Host", id: "extension-module", desc: "Extension lifecycle & sandbox", category: "Extensions", color: "#569cd6", installed: false, settings: [] },
  { name: "File System", id: "fs-module", desc: "Virtual file system operations", category: "Filesystem", color: "#dcdcaa", installed: false, settings: [] },
  { name: "LSP Bridge", id: "lsp-bridge-module", desc: "Language Server Protocol bridge", category: "Language", color: "#569cd6", installed: false, settings: [
    { id: "lsp.autoStart", label: "Auto Start", type: "checkbox", value: "true", desc: "Auto-start language servers.", group: "LSP Bridge", category: "Plugins" },
  ]},
  { name: "Prettier", id: "prettier-module", desc: "Prettier code formatter", category: "Language", color: "#c586c0", installed: false, settings: [
    { id: "prettier.printWidth", label: "Print Width", type: "number", value: "80", desc: "Line width for formatting.", group: "Prettier", category: "Plugins" },
    { id: "prettier.useSingleQuote", label: "Single Quotes", type: "checkbox", value: "false", desc: "Use single quotes.", group: "Prettier", category: "Plugins" },
  ]},
  { name: "Security", id: "security-module", desc: "CSP enforcement & sanitization", category: "Platform", color: "#f14c4c", installed: false, settings: [
    { id: "security.workspace.trust.enabled", label: "Workspace Trust", type: "checkbox", value: "true", desc: "Enable workspace trust.", group: "Security", category: "Plugins" },
  ]},
];

// ── Theme catalog — derived from builtin plugin themes ───────
export const THEMES: ThemeInfo[] = BUILTIN_THEME_NAMES.map((name) => {
  const def = THEME_DEFS[name];
  const c = def.colors;
  return {
    name: def.name,
    type: def.type === "light" || def.type === "hc-light" ? "light" : def.type === "hc" ? "contrast" : "dark",
    colors: {
      bg: c["editor.background"] ?? "#1e1e1e",
      fg: c["editor.foreground"] ?? "#cccccc",
      accent: c["editorBracketMatch.border"] ?? "#007acc",
      sidebar: c["editor.lineHighlightBackground"]?.slice(0, 7) ?? "#252526",
    },
  };
});

// ── Keybindings catalog ──────────────────────────────────────
export const KEYBINDINGS: KeybindingInfo[] = [
  { command: "Open Command Palette", key: "Ctrl+Shift+P", when: "" },
  { command: "Quick Open File", key: "Ctrl+P", when: "" },
  { command: "Toggle Sidebar", key: "Ctrl+B", when: "" },
  { command: "Toggle Terminal", key: "Ctrl+`", when: "" },
  { command: "Find", key: "Ctrl+F", when: "editorFocus" },
  { command: "Replace", key: "Ctrl+H", when: "editorFocus" },
  { command: "Go to Line", key: "Ctrl+G", when: "" },
  { command: "Save File", key: "Ctrl+S", when: "" },
  { command: "Close Tab", key: "Ctrl+W", when: "" },
  { command: "Format Document", key: "Shift+Alt+F", when: "editorFocus" },
  { command: "Go to Definition", key: "F12", when: "editorFocus" },
  { command: "Peek Definition", key: "Alt+F12", when: "editorFocus" },
  { command: "Toggle Comment", key: "Ctrl+/", when: "editorFocus" },
  { command: "Zoom In", key: "Ctrl+=", when: "" },
  { command: "Zoom Out", key: "Ctrl+-", when: "" },
  { command: "Undo", key: "Ctrl+Z", when: "" },
  { command: "Redo", key: "Ctrl+Y", when: "" },
  { command: "Move Line Up", key: "Alt+Up", when: "editorFocus" },
  { command: "Move Line Down", key: "Alt+Down", when: "editorFocus" },
  { command: "Add Cursor Above", key: "Ctrl+Alt+Up", when: "editorFocus" },
  { command: "Add Cursor Below", key: "Ctrl+Alt+Down", when: "editorFocus" },
  { command: "Select Word", key: "Ctrl+D", when: "editorFocus" },
  { command: "Show Explorer", key: "Ctrl+Shift+E", when: "" },
  { command: "Show Search", key: "Ctrl+Shift+F", when: "" },
  { command: "Show Extensions", key: "Ctrl+Shift+X", when: "" },
  { command: "Open Settings", key: "Ctrl+,", when: "" },
];

// ── Category tree ────────────────────────────────────────────
export const CATEGORIES: SettingsCategory[] = [
  { id: "commonly-used", label: "Commonly Used", icon: "star" },
  { id: "text-editor", label: "Text Editor", icon: "edit", children: [
    { id: "font", label: "Font" }, { id: "cursor", label: "Cursor" }, { id: "minimap", label: "Minimap" },
    { id: "suggest", label: "Suggest" }, { id: "formatting", label: "Formatting" },
    { id: "scrolling", label: "Scrolling" }, { id: "rendering", label: "Rendering" },
    { id: "indentation", label: "Indentation" }, { id: "word-wrap", label: "Word Wrap" },
    { id: "misc", label: "Misc" }, { id: "diff-editor", label: "Diff Editor" },
  ]},
  { id: "workbench", label: "Workbench", icon: "window", children: [
    { id: "appearance", label: "Appearance" }, { id: "startup", label: "Startup" },
    { id: "editor-tabs", label: "Editor Tabs" }, { id: "breadcrumbs", label: "Breadcrumbs" },
  ]},
  { id: "files", label: "Files", icon: "file" },
  { id: "window", label: "Window", icon: "window" },
  { id: "features", label: "Features", icon: "list", children: [
    { id: "terminal", label: "Terminal" }, { id: "explorer", label: "Explorer" },
    { id: "search", label: "Search" }, { id: "debug", label: "Debug" }, { id: "git", label: "Git" },
  ]},
  { id: "plugins", label: "Plugins", icon: "extensions" },
  { id: "themes", label: "Themes", icon: "palette" },
  { id: "keybindings", label: "Keybindings", icon: "keyboard" },
];

export const COMMONLY_USED_IDS = [
  "editor.fontSize", "editor.fontFamily", "editor.tabSize", "editor.wordWrap",
  "editor.minimap.enabled", "editor.formatOnSave", "editor.cursorBlinking",
  "editor.bracketPairColorization.enabled", "editor.renderWhitespace",
  "files.autoSave", "workbench.colorTheme", "editor.smoothScrolling",
  "editor.lineNumbers", "terminal.integrated.fontSize",
];
