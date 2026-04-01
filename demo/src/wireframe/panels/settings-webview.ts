// ── Settings Webview — Full VS Code-style settings editor ───
//
// Opens as a tab in the editor area (not sidebar).
// Covers: Text Editor, Workbench, Features, Plugins (all 81),
// Themes, Keybindings, and more.

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import { FileEvents, SidebarEvents } from "@enjoys/monaco-vanced/core/events";
import type { DOMRefs, WireframeAPIs, OnHandler } from "../types";
import { C } from "../types";
import { el } from "../utils";

// ── Settings URI sentinel ────────────────────────────────────
export const SETTINGS_URI = "__settings__";

// ── Setting definition ───────────────────────────────────────
interface SettingDef {
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

// ── Plugin config definition ─────────────────────────────────
interface PluginInfo {
  name: string;
  id: string;
  desc: string;
  category: string;
  color: string;
  installed: boolean;
  settings: SettingDef[];
}

// ── Theme definition ─────────────────────────────────────────
interface ThemeInfo {
  name: string;
  type: "dark" | "light" | "contrast";
  colors: { bg: string; fg: string; accent: string; sidebar: string };
}

// ══════════════════════════════════════════════════════════════
// Setting Definitions — Comprehensive VS Code-style
// ══════════════════════════════════════════════════════════════

const EDITOR_SETTINGS: SettingDef[] = [
  // Font
  { id: "editor.fontSize", label: "Font Size", type: "number", value: "14", desc: "Controls the font size in pixels.", group: "Font", category: "Text Editor", tags: ["font"] },
  { id: "editor.fontFamily", label: "Font Family", type: "text", value: "'JetBrains Mono', monospace", desc: "Controls the font family for the editor.", group: "Font", category: "Text Editor", tags: ["font"] },
  { id: "editor.fontWeight", label: "Font Weight", type: "select", value: "normal", options: ["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"], desc: "Controls the font weight.", group: "Font", category: "Text Editor", tags: ["font"] },
  { id: "editor.fontLigatures", label: "Font Ligatures", type: "checkbox", value: "true", desc: "Enables/disables font ligatures ('ffi', '=>', '!=' become special glyphs).", group: "Font", category: "Text Editor", tags: ["font"] },
  { id: "editor.lineHeight", label: "Line Height", type: "number", value: "0", desc: "Controls the line height. Use 0 for automatic from font size.", group: "Font", category: "Text Editor", tags: ["font"] },
  { id: "editor.letterSpacing", label: "Letter Spacing", type: "number", value: "0", desc: "Controls the letter spacing in pixels.", group: "Font", category: "Text Editor", tags: ["font"] },
  // Cursor
  { id: "editor.cursorBlinking", label: "Cursor Blinking", type: "select", value: "smooth", options: ["blink", "smooth", "phase", "expand", "solid"], desc: "Controls the cursor animation style.", group: "Cursor", category: "Text Editor", tags: ["cursor"] },
  { id: "editor.cursorStyle", label: "Cursor Style", type: "select", value: "line", options: ["line", "block", "underline", "line-thin", "block-outline", "underline-thin"], desc: "Controls the cursor style.", group: "Cursor", category: "Text Editor", tags: ["cursor"] },
  { id: "editor.cursorSmoothCaretAnimation", label: "Smooth Caret Animation", type: "select", value: "on", options: ["off", "explicit", "on"], desc: "Controls smooth caret animation.", group: "Cursor", category: "Text Editor", tags: ["cursor"] },
  { id: "editor.cursorWidth", label: "Cursor Width", type: "number", value: "0", desc: "Controls cursor width in pixels when cursorStyle is 'line'. 0 uses default.", group: "Cursor", category: "Text Editor", tags: ["cursor"] },
  // Minimap
  { id: "editor.minimap.enabled", label: "Minimap Enabled", type: "checkbox", value: "true", desc: "Controls whether the minimap is shown.", group: "Minimap", category: "Text Editor", tags: ["minimap"] },
  { id: "editor.minimap.side", label: "Minimap Side", type: "select", value: "right", options: ["left", "right"], desc: "Controls the side where minimap is rendered.", group: "Minimap", category: "Text Editor", tags: ["minimap"] },
  { id: "editor.minimap.scale", label: "Minimap Scale", type: "select", value: "1", options: ["1", "2", "3"], desc: "Scale of content drawn in the minimap.", group: "Minimap", category: "Text Editor", tags: ["minimap"] },
  { id: "editor.minimap.maxColumn", label: "Minimap Max Column", type: "number", value: "120", desc: "Limit minimap width to render at most a certain number of columns.", group: "Minimap", category: "Text Editor", tags: ["minimap"] },
  { id: "editor.minimap.renderCharacters", label: "Render Characters", type: "checkbox", value: "true", desc: "Render actual characters on a line (vs. color blocks).", group: "Minimap", category: "Text Editor", tags: ["minimap"] },
  // Suggest & Autocomplete
  { id: "editor.suggestOnTriggerCharacters", label: "Suggest On Trigger", type: "checkbox", value: "true", desc: "Controls whether suggestions should automatically show up when typing trigger characters.", group: "Suggest", category: "Text Editor", tags: ["suggest", "autocomplete"] },
  { id: "editor.acceptSuggestionOnCommitCharacter", label: "Accept on Commit Char", type: "checkbox", value: "true", desc: "Accept suggestions on commit character (e.g., dot, semicolon).", group: "Suggest", category: "Text Editor", tags: ["suggest"] },
  { id: "editor.acceptSuggestionOnEnter", label: "Accept on Enter", type: "select", value: "on", options: ["on", "off", "smart"], desc: "Controls whether suggestions should be accepted on Enter.", group: "Suggest", category: "Text Editor", tags: ["suggest"] },
  { id: "editor.quickSuggestions", label: "Quick Suggestions", type: "checkbox", value: "true", desc: "Enable quick suggestions (autocomplete as you type).", group: "Suggest", category: "Text Editor", tags: ["suggest", "autocomplete"] },
  { id: "editor.quickSuggestionsDelay", label: "Quick Suggestions Delay", type: "number", value: "10", desc: "Controls the delay in milliseconds after which quick suggestions will show up.", group: "Suggest", category: "Text Editor", tags: ["suggest"] },
  { id: "editor.snippetSuggestions", label: "Snippet Suggestions", type: "select", value: "inline", options: ["top", "bottom", "inline", "none"], desc: "Controls whether snippets are shown with other suggestions and how they are sorted.", group: "Suggest", category: "Text Editor", tags: ["suggest", "snippet"] },
  // Formatting
  { id: "editor.formatOnPaste", label: "Format on Paste", type: "checkbox", value: "false", desc: "Controls whether the editor should automatically format pasted content.", group: "Formatting", category: "Text Editor", tags: ["format"] },
  { id: "editor.formatOnSave", label: "Format on Save", type: "checkbox", value: "false", desc: "Format a file on save.", group: "Formatting", category: "Text Editor", tags: ["format"] },
  { id: "editor.formatOnType", label: "Format on Type", type: "checkbox", value: "false", desc: "Controls whether the editor should automatically format the line after typing.", group: "Formatting", category: "Text Editor", tags: ["format"] },
  { id: "editor.defaultFormatter", label: "Default Formatter", type: "text", value: "esbenp.prettier-vscode", desc: "Defines a default formatter which takes precedence over all other formatters.", group: "Formatting", category: "Text Editor", tags: ["format"] },
  // Find
  { id: "editor.find.autoFindInSelection", label: "Auto Find in Selection", type: "select", value: "never", options: ["never", "always", "multiline"], desc: "Controls the condition for turning on find in selection automatically.", group: "Find", category: "Text Editor", tags: ["find", "search"] },
  { id: "editor.find.seedSearchStringFromSelection", label: "Seed from Selection", type: "select", value: "always", options: ["never", "always", "selection"], desc: "Controls whether the search string is seeded from the editor selection.", group: "Find", category: "Text Editor", tags: ["find", "search"] },
  // Scrolling
  { id: "editor.smoothScrolling", label: "Smooth Scrolling", type: "checkbox", value: "true", desc: "Controls whether the editor will scroll using an animation.", group: "Scrolling", category: "Text Editor", tags: ["scroll"] },
  { id: "editor.scrollBeyondLastLine", label: "Scroll Beyond Last Line", type: "checkbox", value: "false", desc: "Controls whether the editor will scroll beyond the last line.", group: "Scrolling", category: "Text Editor", tags: ["scroll"] },
  { id: "editor.fastScrollSensitivity", label: "Fast Scroll Sensitivity", type: "number", value: "5", desc: "Scrolling speed multiplier when pressing Alt.", group: "Scrolling", category: "Text Editor", tags: ["scroll"] },
  { id: "editor.mouseWheelScrollSensitivity", label: "Mouse Wheel Sensitivity", type: "number", value: "1", desc: "A multiplier to be used on the deltaX and deltaY of mouse wheel events.", group: "Scrolling", category: "Text Editor", tags: ["scroll"] },
  // Rendering
  { id: "editor.renderWhitespace", label: "Render Whitespace", type: "select", value: "selection", options: ["none", "boundary", "selection", "trailing", "all"], desc: "Controls how the editor should render whitespace characters.", group: "Rendering", category: "Text Editor", tags: ["whitespace"] },
  { id: "editor.renderControlCharacters", label: "Render Control Characters", type: "checkbox", value: "true", desc: "Controls whether the editor should render control characters.", group: "Rendering", category: "Text Editor", tags: ["render"] },
  { id: "editor.renderLineHighlight", label: "Render Line Highlight", type: "select", value: "all", options: ["none", "gutter", "line", "all"], desc: "Controls how the editor should render the current line highlight.", group: "Rendering", category: "Text Editor", tags: ["highlight"] },
  { id: "editor.guides.bracketPairs", label: "Bracket Pair Guides", type: "select", value: "true", options: ["true", "false", "active"], desc: "Controls whether bracket pair guides are enabled.", group: "Rendering", category: "Text Editor", tags: ["bracket", "guides"] },
  { id: "editor.bracketPairColorization.enabled", label: "Bracket Pair Colorization", type: "checkbox", value: "true", desc: "Controls whether bracket pair colorization is enabled.", group: "Rendering", category: "Text Editor", tags: ["bracket", "color"] },
  { id: "editor.renderIndentGuides", label: "Render Indent Guides", type: "checkbox", value: "true", desc: "Controls whether the editor should render indent guides.", group: "Rendering", category: "Text Editor", tags: ["indent", "guides"] },
  // Indentation
  { id: "editor.tabSize", label: "Tab Size", type: "number", value: "2", desc: "The number of spaces a tab is equal to.", group: "Indentation", category: "Text Editor", tags: ["tab", "indent"] },
  { id: "editor.insertSpaces", label: "Insert Spaces", type: "checkbox", value: "true", desc: "Insert spaces instead of tabs when pressing Tab.", group: "Indentation", category: "Text Editor", tags: ["tab", "indent", "spaces"] },
  { id: "editor.detectIndentation", label: "Detect Indentation", type: "checkbox", value: "true", desc: "Controls whether tabSize and insertSpaces will be auto-detected from content.", group: "Indentation", category: "Text Editor", tags: ["tab", "indent"] },
  { id: "editor.autoIndent", label: "Auto Indent", type: "select", value: "full", options: ["none", "keep", "brackets", "advanced", "full"], desc: "Controls auto indentation adjustments.", group: "Indentation", category: "Text Editor", tags: ["indent"] },
  // Word Wrap
  { id: "editor.wordWrap", label: "Word Wrap", type: "select", value: "off", options: ["off", "on", "wordWrapColumn", "bounded"], desc: "Controls how lines should wrap.", group: "Word Wrap", category: "Text Editor", tags: ["wrap"] },
  { id: "editor.wordWrapColumn", label: "Word Wrap Column", type: "number", value: "80", desc: "Controls the wrapping column when wordWrap is 'wordWrapColumn' or 'bounded'.", group: "Word Wrap", category: "Text Editor", tags: ["wrap"] },
  // Misc
  { id: "editor.lineNumbers", label: "Line Numbers", type: "select", value: "on", options: ["on", "off", "relative", "interval"], desc: "Controls the display of line numbers.", group: "Misc", category: "Text Editor", tags: ["line numbers"] },
  { id: "editor.folding", label: "Folding", type: "checkbox", value: "true", desc: "Controls whether the editor has code folding enabled.", group: "Misc", category: "Text Editor", tags: ["fold"] },
  { id: "editor.glyphMargin", label: "Glyph Margin", type: "checkbox", value: "true", desc: "Controls whether the editor should render the glyph margin (for breakpoints/icons).", group: "Misc", category: "Text Editor", tags: ["glyph", "margin"] },
  { id: "editor.linkedEditing", label: "Linked Editing", type: "checkbox", value: "false", desc: "Controls whether linked editing is enabled (e.g., editing HTML tags).", group: "Misc", category: "Text Editor", tags: ["linked"] },
  { id: "editor.occurrencesHighlight", label: "Occurrences Highlight", type: "checkbox", value: "true", desc: "Controls whether the editor should highlight occurrences of the selected word.", group: "Misc", category: "Text Editor" },
  { id: "editor.selectionHighlight", label: "Selection Highlight", type: "checkbox", value: "true", desc: "Controls whether the editor should highlight matches similar to the selection.", group: "Misc", category: "Text Editor" },
  { id: "editor.colorDecorators", label: "Color Decorators", type: "checkbox", value: "true", desc: "Controls whether the editor should render inline color decorators.", group: "Misc", category: "Text Editor" },
  { id: "editor.padding.top", label: "Padding Top", type: "number", value: "12", desc: "Controls the amount of padding above the first line of the editor.", group: "Misc", category: "Text Editor" },
  { id: "editor.padding.bottom", label: "Padding Bottom", type: "number", value: "0", desc: "Controls the amount of padding below the last line of the editor.", group: "Misc", category: "Text Editor" },
  // Diff
  { id: "diffEditor.renderSideBySide", label: "Diff: Side by Side", type: "checkbox", value: "true", desc: "Controls whether the diff editor shows changes in side-by-side or inline.", group: "Diff Editor", category: "Text Editor" },
  { id: "diffEditor.ignoreTrimWhitespace", label: "Diff: Ignore Whitespace", type: "checkbox", value: "true", desc: "When enabled, the diff editor ignores leading/trailing whitespace.", group: "Diff Editor", category: "Text Editor" },
  { id: "diffEditor.wordWrap", label: "Diff: Word Wrap", type: "select", value: "inherit", options: ["off", "on", "inherit"], desc: "Controls whether the diff editor should show word wrap.", group: "Diff Editor", category: "Text Editor" },
];

const WORKBENCH_SETTINGS: SettingDef[] = [
  // Appearance
  { id: "workbench.activityBar.visible", label: "Activity Bar Visible", type: "checkbox", value: "true", desc: "Controls the visibility of the activity bar.", group: "Appearance", category: "Workbench" },
  { id: "workbench.sideBar.location", label: "Sidebar Location", type: "select", value: "left", options: ["left", "right"], desc: "Controls the location of the sidebar.", group: "Appearance", category: "Workbench" },
  { id: "workbench.statusBar.visible", label: "Status Bar Visible", type: "checkbox", value: "true", desc: "Controls the visibility of the status bar.", group: "Appearance", category: "Workbench" },
  { id: "workbench.panel.defaultLocation", label: "Panel Default Location", type: "select", value: "bottom", options: ["bottom", "right", "left"], desc: "Controls the default location of the panel.", group: "Appearance", category: "Workbench" },
  { id: "workbench.colorTheme", label: "Color Theme", type: "text", value: "Dark+ (Default)", desc: "Specifies the color theme used in the workbench.", group: "Appearance", category: "Workbench" },
  { id: "workbench.iconTheme", label: "Icon Theme", type: "text", value: "vs-seti", desc: "Specifies the product icon theme used.", group: "Appearance", category: "Workbench" },
  // Startup
  { id: "workbench.startupEditor", label: "Startup Editor", type: "select", value: "welcomePage", options: ["none", "welcomePage", "newUntitledFile", "readme"], desc: "Controls which editor is shown on startup.", group: "Startup", category: "Workbench" },
  { id: "workbench.tips.enabled", label: "Show Tips", type: "checkbox", value: "true", desc: "Controls whether startup tips are shown.", group: "Startup", category: "Workbench" },
  // Tabs
  { id: "workbench.editor.tabSizing", label: "Tab Sizing", type: "select", value: "fit", options: ["fit", "shrink", "fixed"], desc: "Controls the sizing of editor tabs.", group: "Editor Tabs", category: "Workbench" },
  { id: "workbench.editor.showIcons", label: "Show Tab Icons", type: "checkbox", value: "true", desc: "Controls whether file icons are shown in tabs.", group: "Editor Tabs", category: "Workbench" },
  { id: "workbench.editor.enablePreview", label: "Enable Preview Tabs", type: "checkbox", value: "true", desc: "Controls whether opened editors show as preview (single-click italic).", group: "Editor Tabs", category: "Workbench" },
  { id: "workbench.editor.closeOnFileDelete", label: "Close on File Delete", type: "checkbox", value: "true", desc: "Controls whether editors close when file is deleted.", group: "Editor Tabs", category: "Workbench" },
  { id: "workbench.editor.tabCloseButton", label: "Tab Close Button", type: "select", value: "right", options: ["off", "left", "right"], desc: "Controls the position of the tab close button.", group: "Editor Tabs", category: "Workbench" },
  { id: "workbench.editor.highlightModifiedTabs", label: "Highlight Modified Tabs", type: "checkbox", value: "false", desc: "Controls whether modified tabs show a border color.", group: "Editor Tabs", category: "Workbench" },
  // Breadcrumbs
  { id: "breadcrumbs.enabled", label: "Breadcrumbs Enabled", type: "checkbox", value: "true", desc: "Enable/disable breadcrumb navigation above the editor.", group: "Breadcrumbs", category: "Workbench" },
  { id: "breadcrumbs.filePath", label: "Breadcrumb File Path", type: "select", value: "on", options: ["on", "off", "last"], desc: "Controls whether file path is shown in breadcrumbs.", group: "Breadcrumbs", category: "Workbench" },
  { id: "breadcrumbs.symbolPath", label: "Breadcrumb Symbol Path", type: "select", value: "on", options: ["on", "off", "last"], desc: "Controls whether symbol path is shown in breadcrumbs.", group: "Breadcrumbs", category: "Workbench" },
];

const FILES_SETTINGS: SettingDef[] = [
  { id: "files.autoSave", label: "Auto Save", type: "select", value: "off", options: ["off", "afterDelay", "onFocusChange", "onWindowChange"], desc: "Controls auto save of editors.", group: "Auto Save", category: "Files" },
  { id: "files.autoSaveDelay", label: "Auto Save Delay", type: "number", value: "1000", desc: "Controls the delay in milliseconds after which an editor with unsaved changes is auto-saved.", group: "Auto Save", category: "Files" },
  { id: "files.trimTrailingWhitespace", label: "Trim Trailing Whitespace", type: "checkbox", value: "false", desc: "When enabled, will trim trailing whitespace when saving a file.", group: "Saving", category: "Files" },
  { id: "files.insertFinalNewline", label: "Insert Final Newline", type: "checkbox", value: "false", desc: "When enabled, insert a final newline at end of file when saving.", group: "Saving", category: "Files" },
  { id: "files.trimFinalNewlines", label: "Trim Final Newlines", type: "checkbox", value: "false", desc: "When enabled, trim all new lines after the final new line at end of file.", group: "Saving", category: "Files" },
  { id: "files.encoding", label: "File Encoding", type: "select", value: "utf8", options: ["utf8", "utf8bom", "utf16le", "utf16be", "windows1252", "iso88591"], desc: "The default character set encoding to use when reading and writing files.", group: "Encoding", category: "Files" },
  { id: "files.eol", label: "End of Line", type: "select", value: "auto", options: ["\\n", "\\r\\n", "auto"], desc: "The default end of line character.", group: "Encoding", category: "Files" },
  { id: "files.exclude", label: "Files: Exclude", type: "text", value: "**/.git, **/node_modules", desc: "Glob patterns to exclude files and folders.", group: "Explorer", category: "Files" },
  { id: "files.watcherExclude", label: "Watcher Exclude", type: "text", value: "**/node_modules/**", desc: "Glob patterns of paths to exclude from file watching.", group: "Explorer", category: "Files" },
];

const FEATURES_SETTINGS: SettingDef[] = [
  // Terminal
  { id: "terminal.integrated.fontFamily", label: "Terminal Font Family", type: "text", value: "'JetBrains Mono', monospace", desc: "Controls the font family used in the integrated terminal.", group: "Terminal", category: "Features" },
  { id: "terminal.integrated.fontSize", label: "Terminal Font Size", type: "number", value: "13", desc: "Controls the font size in pixels for the integrated terminal.", group: "Terminal", category: "Features" },
  { id: "terminal.integrated.cursorStyle", label: "Terminal Cursor Style", type: "select", value: "block", options: ["block", "underline", "line"], desc: "Controls the cursor style for the terminal.", group: "Terminal", category: "Features" },
  { id: "terminal.integrated.cursorBlinking", label: "Terminal Cursor Blinking", type: "checkbox", value: "false", desc: "Controls whether the terminal cursor blinks.", group: "Terminal", category: "Features" },
  { id: "terminal.integrated.scrollback", label: "Terminal Scrollback", type: "number", value: "1000", desc: "Controls the maximum number of lines the terminal keeps in its buffer.", group: "Terminal", category: "Features" },
  { id: "terminal.integrated.copyOnSelection", label: "Copy on Selection", type: "checkbox", value: "false", desc: "Copy text to clipboard when selection occurs in the terminal.", group: "Terminal", category: "Features" },
  // Explorer
  { id: "explorer.autoReveal", label: "Auto Reveal", type: "select", value: "true", options: ["true", "false", "focusNoScroll"], desc: "Controls whether the explorer should auto-reveal the active file.", group: "Explorer", category: "Features" },
  { id: "explorer.sortOrder", label: "Sort Order", type: "select", value: "default", options: ["default", "mixed", "filesFirst", "type", "modified"], desc: "Controls the property-based sorting of files and folders.", group: "Explorer", category: "Features" },
  { id: "explorer.compactFolders", label: "Compact Folders", type: "checkbox", value: "true", desc: "Controls whether folders with single child are rendered as compact tree nodes.", group: "Explorer", category: "Features" },
  { id: "explorer.confirmDelete", label: "Confirm Delete", type: "checkbox", value: "true", desc: "Controls whether the explorer should ask for confirmation when deleting a file.", group: "Explorer", category: "Features" },
  // Search
  { id: "search.useIgnoreFiles", label: "Use Ignore Files", type: "checkbox", value: "true", desc: "Controls whether to use .gitignore and .ignore files when searching.", group: "Search", category: "Features" },
  { id: "search.followSymlinks", label: "Follow Symlinks", type: "checkbox", value: "true", desc: "Controls whether to follow symlinks while searching.", group: "Search", category: "Features" },
  { id: "search.smartCase", label: "Smart Case", type: "checkbox", value: "false", desc: "Search case-insensitively when pattern is all lowercase, otherwise match case.", group: "Search", category: "Features" },
  // Debug
  { id: "debug.allowBreakpointsEverywhere", label: "Breakpoints Everywhere", type: "checkbox", value: "false", desc: "Allow setting breakpoints in any file.", group: "Debug", category: "Features" },
  { id: "debug.inlineValues", label: "Debug Inline Values", type: "select", value: "auto", options: ["on", "off", "auto"], desc: "Show variable values inline in the editor during debugging.", group: "Debug", category: "Features" },
  { id: "debug.toolBarLocation", label: "Debug Toolbar Location", type: "select", value: "floating", options: ["floating", "docked", "hidden"], desc: "Controls the location of the debug toolbar.", group: "Debug", category: "Features" },
  // Git
  { id: "git.enabled", label: "Git Enabled", type: "checkbox", value: "true", desc: "Controls whether Git is enabled.", group: "Git", category: "Features" },
  { id: "git.autofetch", label: "Git Auto Fetch", type: "checkbox", value: "false", desc: "When enabled, auto-fetches from git remotes periodically.", group: "Git", category: "Features" },
  { id: "git.confirmSync", label: "Confirm Sync", type: "checkbox", value: "true", desc: "Controls whether Git should ask for confirmation before syncing.", group: "Git", category: "Features" },
  { id: "git.enableSmartCommit", label: "Smart Commit", type: "checkbox", value: "false", desc: "Commit all changes when there are no staged changes.", group: "Git", category: "Features" },
];

const WINDOW_SETTINGS: SettingDef[] = [
  { id: "window.title", label: "Window Title", type: "text", value: "${dirty}${activeEditorShort}${separator}${rootName}", desc: "Controls the window title format.", group: "Title Bar", category: "Window" },
  { id: "window.titleSeparator", label: "Title Separator", type: "text", value: " — ", desc: "Separator used in the window title.", group: "Title Bar", category: "Window" },
  { id: "window.zoomLevel", label: "Zoom Level", type: "number", value: "0", desc: "Adjust the zoom level of the window. Use 0 for default.", group: "Zoom", category: "Window" },
  { id: "window.restoreWindows", label: "Restore Windows", type: "select", value: "all", options: ["all", "none", "one", "folders"], desc: "Controls how windows are restored after reopening.", group: "Startup", category: "Window" },
  { id: "window.menuBarVisibility", label: "Menu Bar Visibility", type: "select", value: "classic", options: ["classic", "visible", "toggle", "hidden", "compact"], desc: "Controls the visibility of the menu bar.", group: "Title Bar", category: "Window" },
  { id: "window.newWindowDimensions", label: "New Window Dimensions", type: "select", value: "default", options: ["default", "inherit", "offset", "maximized", "fullscreen"], desc: "Controls the dimensions of opening a new window.", group: "Startup", category: "Window" },
];

// ── Plugin catalog (all 81 modules with per-plugin settings) ─
const PLUGIN_CATALOG: PluginInfo[] = [
  // Theming
  { name: "Theme Engine", id: "theme-module", desc: "Color theme management, switching & custom theme registration", category: "Theming", color: "#ce9178", installed: true, settings: [
    { id: "theme.autoDetectColorScheme", label: "Auto Detect Color Scheme", type: "checkbox", value: "false", desc: "Automatically switch between light/dark theme based on OS setting.", group: "Theme Engine", category: "Plugins" },
    { id: "theme.customCSS", label: "Custom CSS Overrides", type: "text", value: "", desc: "Inject custom CSS into the editor (advanced).", group: "Theme Engine", category: "Plugins" },
  ]},
  { name: "Icon Pack", id: "icon-module", desc: "File & folder icon management with multiple icon sets", category: "Theming", color: "#dcdcaa", installed: true, settings: [
    { id: "iconTheme.active", label: "Active Icon Theme", type: "select", value: "seti", options: ["seti", "material", "vscode-icons", "none"], desc: "Choose the active file icon theme.", group: "Icon Pack", category: "Plugins" },
    { id: "iconTheme.folders", label: "Folder Icons", type: "checkbox", value: "true", desc: "Show distinctive folder icons in the explorer.", group: "Icon Pack", category: "Plugins" },
  ]},
  // Editor
  { name: "Code Editor", id: "editor-module", desc: "Core Monaco editor integration & lifecycle management", category: "Editor", color: "#569cd6", installed: true, settings: [
    { id: "editor-module.autoSwitchModel", label: "Auto Switch Model", type: "checkbox", value: "true", desc: "Automatically switch editor model when a file is opened.", group: "Code Editor", category: "Plugins" },
    { id: "editor-module.retainUndoHistory", label: "Retain Undo History", type: "checkbox", value: "true", desc: "Keep undo/redo stack when switching between models.", group: "Code Editor", category: "Plugins" },
  ]},
  { name: "Tabs Manager", id: "tabs-module", desc: "Multi-file tab management with drag reorder", category: "Editor", color: "#4ec9b0", installed: true, settings: [
    { id: "tabs.maxOpen", label: "Max Open Tabs", type: "number", value: "20", desc: "Maximum number of tabs to keep open. Oldest close automatically.", group: "Tabs Manager", category: "Plugins" },
    { id: "tabs.showDirtyDot", label: "Show Dirty Indicator", type: "checkbox", value: "true", desc: "Show a dot on tabs with unsaved changes.", group: "Tabs Manager", category: "Plugins" },
    { id: "tabs.previewMode", label: "Preview Mode", type: "checkbox", value: "true", desc: "Single-click opens files in preview (italic) tab.", group: "Tabs Manager", category: "Plugins" },
  ]},
  { name: "Decorations", id: "decorations-module", desc: "Text decorations, highlights, and inline annotations", category: "Editor", color: "#c586c0", installed: false, settings: [
    { id: "decorations.enabled", label: "Decorations Enabled", type: "checkbox", value: "true", desc: "Enable inline text decorations.", group: "Decorations", category: "Plugins" },
  ]},
  { name: "Preview Pane", id: "preview-module", desc: "Live preview for Markdown, HTML, and SVG files", category: "Editor", color: "#9cdcfe", installed: false, settings: [
    { id: "preview.autoRefresh", label: "Auto Refresh", type: "checkbox", value: "true", desc: "Auto-refresh preview on content change.", group: "Preview Pane", category: "Plugins" },
    { id: "preview.scrollSync", label: "Scroll Sync", type: "checkbox", value: "true", desc: "Sync scrolling between editor and preview.", group: "Preview Pane", category: "Plugins" },
  ]},
  { name: "Snippets", id: "snippets-module", desc: "Code snippet management with tabstops", category: "Editor", color: "#dcdcaa", installed: false, settings: [] },
  { name: "Virtualization", id: "virtualization-module", desc: "Large file virtual scrolling for 100K+ line files", category: "Editor", color: "#4fc1ff", installed: false, settings: [] },
  { name: "Webview", id: "webview-module", desc: "Embedded webview panels within the editor", category: "Editor", color: "#c586c0", installed: false, settings: [] },
  // Layout
  { name: "Layout Manager", id: "layout-module", desc: "Split panes, panel management & layout persistence", category: "Layout", color: "#4ec9b0", installed: true, settings: [
    { id: "layout.restoreLayout", label: "Restore Layout", type: "checkbox", value: "true", desc: "Restore editor layout (splits, panel positions) on reload.", group: "Layout Manager", category: "Plugins" },
    { id: "layout.panelPosition", label: "Panel Position", type: "select", value: "bottom", options: ["bottom", "right", "left"], desc: "Default panel position.", group: "Layout Manager", category: "Plugins" },
  ]},
  { name: "Header", id: "header-module", desc: "Title bar & menu bar management", category: "Layout", color: "#9cdcfe", installed: true, settings: [] },
  { name: "Sidebar", id: "sidebar-module", desc: "Sidebar view management with collapsible sections", category: "Layout", color: "#ce9178", installed: true, settings: [
    { id: "sidebar.defaultWidth", label: "Default Width", type: "number", value: "240", desc: "Default sidebar width in pixels.", group: "Sidebar", category: "Plugins" },
    { id: "sidebar.visible", label: "Visible on Start", type: "checkbox", value: "true", desc: "Show sidebar when the editor launches.", group: "Sidebar", category: "Plugins" },
  ]},
  { name: "Status Bar", id: "statusbar-module", desc: "Bottom status bar items & click commands", category: "Layout", color: "#569cd6", installed: true, settings: [
    { id: "statusbar.visible", label: "Status Bar Visible", type: "checkbox", value: "true", desc: "Show the status bar.", group: "Status Bar", category: "Plugins" },
  ]},
  { name: "Title Bar", id: "title-module", desc: "Window title & document indicator management", category: "Layout", color: "#dcdcaa", installed: true, settings: [] },
  { name: "Navigation", id: "navigation-module", desc: "Breadcrumbs & go-to navigation", category: "Layout", color: "#c586c0", installed: true, settings: [] },
  { name: "UI Components", id: "ui-module", desc: "Common UI widget primitives (buttons, inputs, dropdowns)", category: "Layout", color: "#4fc1ff", installed: true, settings: [] },
  { name: "Context Menu", id: "context-menu-module", desc: "Right-click context menus with action registration", category: "Layout", color: "#9cdcfe", installed: true, settings: [] },
  // Infrastructure
  { name: "Command Palette", id: "command-module", desc: "Command registration, execution & fuzzy search palette", category: "Infrastructure", color: "#569cd6", installed: true, settings: [
    { id: "command.preserveInput", label: "Preserve Input", type: "checkbox", value: "false", desc: "Keep the previous search text when reopening the command palette.", group: "Command Palette", category: "Plugins" },
    { id: "command.maxResults", label: "Max Results", type: "number", value: "50", desc: "Maximum number of results to show in the command palette.", group: "Command Palette", category: "Plugins" },
  ]},
  { name: "Keybindings", id: "keybinding-module", desc: "Keyboard shortcut management with when-clause contexts", category: "Infrastructure", color: "#4ec9b0", installed: true, settings: [] },
  { name: "Settings", id: "settings-module", desc: "User & workspace settings with layered config", category: "Infrastructure", color: "#dcdcaa", installed: true, settings: [
    { id: "settings.openDefaultSettings", label: "Open Default Settings", type: "checkbox", value: "false", desc: "When opening settings, show the default JSON settings side-by-side.", group: "Settings", category: "Plugins" },
    { id: "settings.useSplitJSON", label: "Use Split JSON", type: "checkbox", value: "false", desc: "Open settings.json in split view alongside the UI.", group: "Settings", category: "Plugins" },
  ]},
  { name: "Notifications", id: "notification-module", desc: "Toast notification system with actions & progress", category: "Infrastructure", color: "#ce9178", installed: true, settings: [
    { id: "notification.defaultDuration", label: "Default Duration", type: "number", value: "5000", desc: "Default notification display time in milliseconds.", group: "Notifications", category: "Plugins" },
    { id: "notification.position", label: "Position", type: "select", value: "bottom-right", options: ["bottom-right", "top-right", "bottom-left", "top-left"], desc: "Position of the notification toasts.", group: "Notifications", category: "Plugins" },
    { id: "notification.doNotDisturb", label: "Do Not Disturb", type: "checkbox", value: "false", desc: "Suppress all notifications.", group: "Notifications", category: "Plugins" },
  ]},
  { name: "Dialogs", id: "dialog-module", desc: "Modal dialog management with confirm/prompt/custom views", category: "Infrastructure", color: "#c586c0", installed: true, settings: [] },
  { name: "Authentication", id: "auth-module", desc: "OAuth & token-based authentication with provider support", category: "Infrastructure", color: "#4fc1ff", installed: false, settings: [
    { id: "auth.provider", label: "Auth Provider", type: "select", value: "github", options: ["github", "microsoft", "google", "custom"], desc: "Default authentication provider.", group: "Authentication", category: "Plugins" },
    { id: "auth.autoLogin", label: "Auto Login", type: "checkbox", value: "false", desc: "Automatically attempt login on startup.", group: "Authentication", category: "Plugins" },
  ]},
  { name: "Deep Links", id: "deep-link-module", desc: "URL deep linking support for files & positions", category: "Infrastructure", color: "#9cdcfe", installed: false, settings: [] },
  { name: "Storage", id: "storage-module", desc: "Persistent key-value storage with scoped namespaces", category: "Infrastructure", color: "#569cd6", installed: false, settings: [
    { id: "storage.backend", label: "Storage Backend", type: "select", value: "indexeddb", options: ["indexeddb", "localstorage", "memory"], desc: "Backend for persistent storage.", group: "Storage", category: "Plugins" },
  ]},
  // AI / Intelligence
  { name: "AI Assistant", id: "ai-module", desc: "AI code completion, inline suggestions & chat", category: "AI / Intelligence", color: "#b5cea8", installed: false, settings: [
    { id: "ai.provider", label: "AI Provider", type: "select", value: "openai", options: ["openai", "anthropic", "local", "copilot", "custom"], desc: "Choose the AI completion provider.", group: "AI Assistant", category: "Plugins" },
    { id: "ai.model", label: "AI Model", type: "text", value: "gpt-4", desc: "Model name for completions.", group: "AI Assistant", category: "Plugins" },
    { id: "ai.inlineEnabled", label: "Inline Suggestions", type: "checkbox", value: "true", desc: "Show AI inline ghost text suggestions.", group: "AI Assistant", category: "Plugins" },
    { id: "ai.temperature", label: "Temperature", type: "number", value: "0.2", desc: "Sampling temperature for AI completions (0-2).", group: "AI Assistant", category: "Plugins" },
    { id: "ai.maxTokens", label: "Max Tokens", type: "number", value: "2048", desc: "Maximum tokens for AI response.", group: "AI Assistant", category: "Plugins" },
  ]},
  { name: "AI Agent", id: "agent-module", desc: "Autonomous coding agents with tool-use capabilities", category: "AI / Intelligence", color: "#4ec9b0", installed: false, settings: [
    { id: "agent.autoApprove", label: "Auto Approve", type: "checkbox", value: "false", desc: "Automatically approve agent actions without confirmation.", group: "AI Agent", category: "Plugins" },
    { id: "agent.maxSteps", label: "Max Steps", type: "number", value: "25", desc: "Maximum number of agent steps per task.", group: "AI Agent", category: "Plugins" },
  ]},
  { name: "AI Memory", id: "ai-memory-module", desc: "AI conversation persistence & context window management", category: "AI / Intelligence", color: "#9cdcfe", installed: false, settings: [] },
  { name: "Context Fusion", id: "context-fusion-module", desc: "Multi-source context blending for AI prompts", category: "AI / Intelligence", color: "#c586c0", installed: false, settings: [] },
  { name: "Eval Engine", id: "eval-module", desc: "AI model evaluation, benchmarking & A/B testing", category: "AI / Intelligence", color: "#ce9178", installed: false, settings: [] },
  { name: "Intent Detection", id: "intent-module", desc: "User intent recognition for smart actions", category: "AI / Intelligence", color: "#dcdcaa", installed: false, settings: [] },
  { name: "Knowledge Graph", id: "knowledge-graph-module", desc: "Semantic code knowledge graph with relationship mapping", category: "AI / Intelligence", color: "#569cd6", installed: false, settings: [] },
  { name: "Memory Store", id: "memory-module", desc: "Long-term memory management for AI context", category: "AI / Intelligence", color: "#4fc1ff", installed: false, settings: [] },
  { name: "Predictive", id: "predictive-module", desc: "Predictive code actions & next-edit suggestions", category: "AI / Intelligence", color: "#b5cea8", installed: false, settings: [] },
  { name: "RAG Engine", id: "rag-module", desc: "Retrieval-augmented generation with codebase indexing", category: "AI / Intelligence", color: "#4ec9b0", installed: false, settings: [
    { id: "rag.chunkSize", label: "Chunk Size", type: "number", value: "512", desc: "Number of tokens per retrieval chunk.", group: "RAG Engine", category: "Plugins" },
    { id: "rag.topK", label: "Top K Results", type: "number", value: "5", desc: "Number of relevant chunks to retrieve.", group: "RAG Engine", category: "Plugins" },
  ]},
  // Devtools
  { name: "Debugger", id: "debugger-module", desc: "Breakpoints, step debugging & variable inspection", category: "Devtools", color: "#f14c4c", installed: false, settings: [
    { id: "debugger.showInlineValues", label: "Display Inline Values", type: "checkbox", value: "true", desc: "Show variable values inline during debug sessions.", group: "Debugger", category: "Plugins" },
    { id: "debugger.autoExpandLazy", label: "Auto-Expand Lazy", type: "checkbox", value: "false", desc: "Auto-expand lazy variables in the debugger.", group: "Debugger", category: "Plugins" },
  ]},
  { name: "Notebook", id: "notebook-module", desc: "Jupyter-style notebooks with cell execution", category: "Devtools", color: "#dcdcaa", installed: false, settings: [] },
  { name: "Profiler", id: "profiler-module", desc: "Performance profiling tools & flame graphs", category: "Devtools", color: "#ce9178", installed: false, settings: [] },
  { name: "Task Runner", id: "task-module", desc: "Build & script task management from tasks.json", category: "Devtools", color: "#4ec9b0", installed: false, settings: [] },
  { name: "Terminal", id: "terminal-module", desc: "Integrated terminal emulation via xterm.js", category: "Devtools", color: "#89d185", installed: false, settings: [
    { id: "terminal.shellPath", label: "Shell Path", type: "text", value: "", desc: "Path to the shell executable.", group: "Terminal", category: "Plugins" },
    { id: "terminal.shellArgs", label: "Shell Arguments", type: "text", value: "", desc: "Arguments to pass to the shell.", group: "Terminal", category: "Plugins" },
    { id: "terminal.cwd", label: "Initial Working Directory", type: "text", value: "", desc: "The current working directory to use for new terminals.", group: "Terminal", category: "Plugins" },
  ]},
  { name: "Test Runner", id: "test-module", desc: "Unit & integration test execution with coverage", category: "Devtools", color: "#569cd6", installed: false, settings: [] },
  // Enterprise
  { name: "API Stability", id: "api-stability-module", desc: "API versioning & deprecation tracking", category: "Enterprise", color: "#4fc1ff", installed: false, settings: [] },
  { name: "Audit Trail", id: "audit-module", desc: "User action audit logging for compliance", category: "Enterprise", color: "#ce9178", installed: false, settings: [
    { id: "audit.enabled", label: "Audit Logging", type: "checkbox", value: "false", desc: "Enable audit trail logging.", group: "Audit Trail", category: "Plugins" },
    { id: "audit.retentionDays", label: "Retention (days)", type: "number", value: "90", desc: "Number of days to retain audit logs.", group: "Audit Trail", category: "Plugins" },
  ]},
  { name: "Billing", id: "billing-module", desc: "Usage metering & billing integration", category: "Enterprise", color: "#b5cea8", installed: false, settings: [] },
  { name: "Context Engine", id: "context-engine", desc: "Workspace context aggregation & scoping", category: "Enterprise", color: "#9cdcfe", installed: false, settings: [] },
  { name: "Policy Engine", id: "policy-module", desc: "Security & compliance policy enforcement", category: "Enterprise", color: "#f14c4c", installed: false, settings: [
    { id: "policy.enforceCSP", label: "Enforce CSP", type: "checkbox", value: "true", desc: "Enforce Content Security Policy for webviews.", group: "Policy Engine", category: "Plugins" },
  ]},
  { name: "Realtime", id: "realtime-module", desc: "WebSocket realtime channels & presence", category: "Enterprise", color: "#c586c0", installed: false, settings: [] },
  { name: "SaaS Tenant", id: "saas-tenant-module", desc: "Multi-tenant SaaS isolation & config", category: "Enterprise", color: "#dcdcaa", installed: false, settings: [] },
  { name: "Secrets Vault", id: "secrets-module", desc: "Secure secret management & key rotation", category: "Enterprise", color: "#f14c4c", installed: false, settings: [
    { id: "secrets.encryptionAlgorithm", label: "Encryption Algorithm", type: "select", value: "aes-256-gcm", options: ["aes-256-gcm", "aes-128-gcm", "chacha20-poly1305"], desc: "Encryption algorithm for secrets at rest.", group: "Secrets Vault", category: "Plugins" },
  ]},
  { name: "Telemetry", id: "telemetry-module", desc: "Usage analytics & metrics collection", category: "Enterprise", color: "#4ec9b0", installed: false, settings: [
    { id: "telemetry.enabled", label: "Telemetry Enabled", type: "checkbox", value: "true", desc: "Enable anonymous usage telemetry.", group: "Telemetry", category: "Plugins" },
    { id: "telemetry.level", label: "Telemetry Level", type: "select", value: "error", options: ["off", "error", "crash", "all"], desc: "Level of telemetry data to collect.", group: "Telemetry", category: "Plugins" },
  ]},
  // Extensions
  { name: "Extension Host", id: "extension-module", desc: "Extension lifecycle & sandboxed API host", category: "Extensions", color: "#569cd6", installed: false, settings: [] },
  { name: "Marketplace", id: "marketplace-module", desc: "Extension marketplace browser & installer", category: "Extensions", color: "#ce9178", installed: false, settings: [
    { id: "marketplace.showRecommendations", label: "Show Recommendations", type: "checkbox", value: "true", desc: "Show recommended extensions.", group: "Marketplace", category: "Plugins" },
  ]},
  { name: "Embed", id: "embed-module", desc: "Embeddable editor widgets for third-party sites", category: "Extensions", color: "#dcdcaa", installed: false, settings: [] },
  { name: "VSIX Loader", id: "vsix-module", desc: "Load .vsix extension packages at runtime", category: "Extensions", color: "#c586c0", installed: false, settings: [] },
  // Filesystem
  { name: "File System", id: "fs-module", desc: "Virtual file system operations & watchers", category: "Filesystem", color: "#dcdcaa", installed: false, settings: [] },
  { name: "Symbol Indexer", id: "indexer-module", desc: "File & symbol index service for workspace search", category: "Filesystem", color: "#9cdcfe", installed: false, settings: [] },
  { name: "Search Engine", id: "search-module", desc: "Full-text file search with ripgrep-like speed", category: "Filesystem", color: "#4ec9b0", installed: false, settings: [] },
  { name: "Workspace", id: "workspace-module", desc: "Multi-root workspace support & management", category: "Filesystem", color: "#569cd6", installed: false, settings: [] },
  // Language
  { name: "TextMate Grammars", id: "context-module", desc: "TextMate grammar integration for syntax highlighting", category: "Language", color: "#ce9178", installed: false, settings: [] },
  { name: "Diagnostics", id: "diagnostics-module", desc: "Error & warning diagnostics with quick fixes", category: "Language", color: "#f14c4c", installed: false, settings: [] },
  { name: "ESLint", id: "eslint-module", desc: "ESLint integration with auto-fix on save", category: "Language", color: "#c586c0", installed: false, settings: [
    { id: "eslint.autoFixOnSave", label: "Auto Fix on Save", type: "checkbox", value: "false", desc: "Auto-fix ESLint issues on file save.", group: "ESLint", category: "Plugins" },
    { id: "eslint.probe", label: "ESLint Probe Languages", type: "text", value: "javascript, typescript, typescriptreact", desc: "Languages to probe for ESLint validation.", group: "ESLint", category: "Plugins" },
  ]},
  { name: "Language Config", id: "language-config", desc: "Language configuration rules (brackets, comments)", category: "Language", color: "#dcdcaa", installed: false, settings: [] },
  { name: "Language Detection", id: "language-detection", desc: "Automatic language detection by content analysis", category: "Language", color: "#9cdcfe", installed: false, settings: [] },
  { name: "LSP Bridge", id: "lsp-bridge-module", desc: "Language Server Protocol bridge for external LSPs", category: "Language", color: "#569cd6", installed: false, settings: [
    { id: "lsp.serverPath", label: "LSP Server Path", type: "text", value: "", desc: "Path to the language server binary.", group: "LSP Bridge", category: "Plugins" },
    { id: "lsp.autoStart", label: "Auto Start", type: "checkbox", value: "true", desc: "Auto-start language servers when files are opened.", group: "LSP Bridge", category: "Plugins" },
  ]},
  { name: "Monarch Grammars", id: "monarch-grammars", desc: "Monarch tokenizer grammars for Monaco-native highlighting", category: "Language", color: "#4ec9b0", installed: false, settings: [] },
  { name: "Prettier", id: "prettier-module", desc: "Prettier code formatter integration", category: "Language", color: "#c586c0", installed: false, settings: [
    { id: "prettier.printWidth", label: "Print Width", type: "number", value: "80", desc: "Line width for Prettier formatting.", group: "Prettier", category: "Plugins" },
    { id: "prettier.tabWidth", label: "Tab Width", type: "number", value: "2", desc: "Tab width for Prettier formatting.", group: "Prettier", category: "Plugins" },
    { id: "prettier.useSingleQuote", label: "Single Quotes", type: "checkbox", value: "false", desc: "Use single quotes instead of double quotes.", group: "Prettier", category: "Plugins" },
    { id: "prettier.trailingComma", label: "Trailing Comma", type: "select", value: "all", options: ["all", "es5", "none"], desc: "Print trailing commas wherever possible.", group: "Prettier", category: "Plugins" },
    { id: "prettier.semi", label: "Semicolons", type: "checkbox", value: "true", desc: "Add semicolons at the end of statements.", group: "Prettier", category: "Plugins" },
  ]},
  { name: "Symbol Index", id: "symbol-index-module", desc: "Workspace symbol indexing for go-to-symbol", category: "Language", color: "#4fc1ff", installed: false, settings: [] },
  // Platform
  { name: "Concurrency", id: "concurrency-module", desc: "Async task concurrency control & scheduling", category: "Platform", color: "#4ec9b0", installed: false, settings: [] },
  { name: "Crash Recovery", id: "crash-recovery-module", desc: "Auto-save & crash recovery with state snapshots", category: "Platform", color: "#f14c4c", installed: false, settings: [
    { id: "crash.autoSaveInterval", label: "Auto-Save Interval", type: "number", value: "30000", desc: "Interval (ms) for crash recovery auto-saves.", group: "Crash Recovery", category: "Plugins" },
  ]},
  { name: "Fallback", id: "fallback-module", desc: "Graceful degradation fallbacks for missing features", category: "Platform", color: "#dcdcaa", installed: false, settings: [] },
  { name: "Feature Flags", id: "feature-flags-module", desc: "Runtime feature flag toggles with rollout percentages", category: "Platform", color: "#b5cea8", installed: false, settings: [
    { id: "featureFlags.source", label: "Flag Source", type: "select", value: "local", options: ["local", "remote", "hybrid"], desc: "Source for feature flag values.", group: "Feature Flags", category: "Plugins" },
  ]},
  { name: "Performance", id: "performance-module", desc: "Performance monitoring & bottleneck detection", category: "Platform", color: "#ce9178", installed: false, settings: [] },
  { name: "Resources", id: "resource-module", desc: "Resource lifecycle management & cleanup", category: "Platform", color: "#9cdcfe", installed: false, settings: [] },
  { name: "Security", id: "security-module", desc: "CSP enforcement & input sanitization", category: "Platform", color: "#f14c4c", installed: false, settings: [
    { id: "security.trustedDomains", label: "Trusted Domains", type: "text", value: "*.github.com, *.microsoft.com", desc: "Trusted domains for external link navigation.", group: "Security", category: "Plugins" },
    { id: "security.workspace.trust.enabled", label: "Workspace Trust", type: "checkbox", value: "true", desc: "Enable the Workspace Trust feature.", group: "Security", category: "Plugins" },
  ]},
  { name: "Streaming", id: "streaming-module", desc: "Server-sent event streams for real-time data", category: "Platform", color: "#569cd6", installed: false, settings: [] },
  { name: "Web Workers", id: "worker-module", desc: "Background worker threads for heavy computation", category: "Platform", color: "#4fc1ff", installed: false, settings: [] },
  // SCM
  { name: "Collaboration", id: "collab-module", desc: "Real-time collaborative editing with CRDT", category: "SCM", color: "#89d185", installed: false, settings: [
    { id: "collab.cursorColors", label: "Cursor Colors", type: "checkbox", value: "true", desc: "Show colored cursors for other collaborators.", group: "Collaboration", category: "Plugins" },
  ]},
  { name: "Git Integration", id: "git-module", desc: "Git operations, status, blame & history", category: "SCM", color: "#ce9178", installed: false, settings: [
    { id: "git.enableStatusBarSync", label: "Status Bar Sync", type: "checkbox", value: "true", desc: "Show sync button in the status bar.", group: "Git Integration", category: "Plugins" },
    { id: "git.decorations", label: "Git Decorations", type: "checkbox", value: "true", desc: "Show git status decorations in the explorer.", group: "Git Integration", category: "Plugins" },
  ]},
  { name: "Code Review", id: "review-module", desc: "Pull request review tools with inline comments", category: "SCM", color: "#c586c0", installed: false, settings: [] },
  { name: "Snapshots", id: "snapshot-module", desc: "Local history snapshots with timeline view", category: "SCM", color: "#dcdcaa", installed: false, settings: [] },
  { name: "Sync Service", id: "sync-module", desc: "Settings & state sync across devices", category: "SCM", color: "#569cd6", installed: false, settings: [] },
];

// ── Theme catalog ────────────────────────────────────────────
const THEMES: ThemeInfo[] = [
  { name: "Dark+ (Default)", type: "dark", colors: { bg: "#1e1e1e", fg: "#d4d4d4", accent: "#007acc", sidebar: "#252526" } },
  { name: "Monokai", type: "dark", colors: { bg: "#272822", fg: "#f8f8f2", accent: "#a6e22e", sidebar: "#1e1f1c" } },
  { name: "Dracula", type: "dark", colors: { bg: "#282a36", fg: "#f8f8f2", accent: "#bd93f9", sidebar: "#21222c" } },
  { name: "One Dark Pro", type: "dark", colors: { bg: "#282c34", fg: "#abb2bf", accent: "#61afef", sidebar: "#21252b" } },
  { name: "Tokyo Night", type: "dark", colors: { bg: "#1a1b26", fg: "#a9b1d6", accent: "#7aa2f7", sidebar: "#16161e" } },
  { name: "GitHub Dark", type: "dark", colors: { bg: "#0d1117", fg: "#c9d1d9", accent: "#58a6ff", sidebar: "#161b22" } },
  { name: "Catppuccin Mocha", type: "dark", colors: { bg: "#1e1e2e", fg: "#cdd6f4", accent: "#cba6f7", sidebar: "#181825" } },
  { name: "Nord", type: "dark", colors: { bg: "#2e3440", fg: "#eceff4", accent: "#88c0d0", sidebar: "#2e3440" } },
  { name: "Ayu Dark", type: "dark", colors: { bg: "#0a0e14", fg: "#b3b1ad", accent: "#e6b450", sidebar: "#0d1016" } },
  { name: "Gruvbox Dark", type: "dark", colors: { bg: "#282828", fg: "#ebdbb2", accent: "#fabd2f", sidebar: "#1d2021" } },
  { name: "Light+ (Default)", type: "light", colors: { bg: "#ffffff", fg: "#000000", accent: "#007acc", sidebar: "#f3f3f3" } },
  { name: "Solarized Light", type: "light", colors: { bg: "#fdf6e3", fg: "#657b83", accent: "#268bd2", sidebar: "#eee8d5" } },
  { name: "GitHub Light", type: "light", colors: { bg: "#ffffff", fg: "#24292f", accent: "#0969da", sidebar: "#f6f8fa" } },
  { name: "Catppuccin Latte", type: "light", colors: { bg: "#eff1f5", fg: "#4c4f69", accent: "#8839ef", sidebar: "#e6e9ef" } },
  { name: "High Contrast", type: "contrast", colors: { bg: "#000000", fg: "#ffffff", accent: "#1aebff", sidebar: "#000000" } },
  { name: "High Contrast Light", type: "contrast", colors: { bg: "#ffffff", fg: "#000000", accent: "#0f4a85", sidebar: "#f5f5f5" } },
];

// ── Keybindings catalog ──────────────────────────────────────
const KEYBINDINGS = [
  { command: "Open Command Palette", key: "Ctrl+Shift+P", when: "" },
  { command: "Quick Open File", key: "Ctrl+P", when: "" },
  { command: "Toggle Sidebar", key: "Ctrl+B", when: "" },
  { command: "Toggle Terminal", key: "Ctrl+`", when: "" },
  { command: "Find", key: "Ctrl+F", when: "editorFocus" },
  { command: "Replace", key: "Ctrl+H", when: "editorFocus" },
  { command: "Go to Line", key: "Ctrl+G", when: "" },
  { command: "Save File", key: "Ctrl+S", when: "" },
  { command: "Save All", key: "Ctrl+K S", when: "" },
  { command: "Close Tab", key: "Ctrl+W", when: "" },
  { command: "Split Editor", key: "Ctrl+\\", when: "" },
  { command: "Toggle Word Wrap", key: "Alt+Z", when: "editorFocus" },
  { command: "Format Document", key: "Shift+Alt+F", when: "editorFocus" },
  { command: "Go to Definition", key: "F12", when: "editorFocus" },
  { command: "Peek Definition", key: "Alt+F12", when: "editorFocus" },
  { command: "Go to References", key: "Shift+F12", when: "editorFocus" },
  { command: "Rename Symbol", key: "F2", when: "editorFocus" },
  { command: "Toggle Comment", key: "Ctrl+/", when: "editorFocus" },
  { command: "Toggle Block Comment", key: "Shift+Alt+A", when: "editorFocus" },
  { command: "Zoom In", key: "Ctrl+=", when: "" },
  { command: "Zoom Out", key: "Ctrl+-", when: "" },
  { command: "Select All", key: "Ctrl+A", when: "" },
  { command: "Undo", key: "Ctrl+Z", when: "" },
  { command: "Redo", key: "Ctrl+Y", when: "" },
  { command: "Cut Line", key: "Ctrl+X", when: "editorFocus" },
  { command: "Copy Line", key: "Ctrl+C", when: "editorFocus" },
  { command: "Move Line Up", key: "Alt+Up", when: "editorFocus" },
  { command: "Move Line Down", key: "Alt+Down", when: "editorFocus" },
  { command: "Duplicate Line", key: "Shift+Alt+Down", when: "editorFocus" },
  { command: "Delete Line", key: "Ctrl+Shift+K", when: "editorFocus" },
  { command: "Add Cursor Above", key: "Ctrl+Alt+Up", when: "editorFocus" },
  { command: "Add Cursor Below", key: "Ctrl+Alt+Down", when: "editorFocus" },
  { command: "Select Word", key: "Ctrl+D", when: "editorFocus" },
  { command: "Show Explorer", key: "Ctrl+Shift+E", when: "" },
  { command: "Show Search", key: "Ctrl+Shift+F", when: "" },
  { command: "Show Source Control", key: "Ctrl+Shift+G", when: "" },
  { command: "Show Debug", key: "Ctrl+Shift+D", when: "" },
  { command: "Show Extensions", key: "Ctrl+Shift+X", when: "" },
  { command: "Open Settings", key: "Ctrl+,", when: "" },
  { command: "Open Keyboard Shortcuts", key: "Ctrl+K Ctrl+S", when: "" },
];

// ══════════════════════════════════════════════════════════════
// Build the Settings Webview
// ══════════════════════════════════════════════════════════════

export function wireSettingsWebview(
  dom: DOMRefs,
  apis: WireframeAPIs,
  eventBus: EventBus,
  on: OnHandler,
) {
  let isOpen = false;

  // All settings flattened
  const allSettings: SettingDef[] = [
    ...EDITOR_SETTINGS,
    ...WORKBENCH_SETTINGS,
    ...FILES_SETTINGS,
    ...FEATURES_SETTINGS,
    ...WINDOW_SETTINGS,
  ];
  // Add plugin settings
  for (const p of PLUGIN_CATALOG) {
    allSettings.push(...p.settings);
  }

  // ── Category navigation ────────────────────────────────────
  type Category = {
    id: string;
    label: string;
    icon: string;
    children?: { id: string; label: string }[];
  };

  const CATEGORIES: Category[] = [
    { id: "commonly-used", label: "Commonly Used", icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M7.22 2.11a.76.76 0 011.56 0l1.13 3.49h3.67a.76.76 0 01.45 1.38l-2.97 2.16 1.13 3.49a.76.76 0 01-1.17.85L8 11.32l-2.97 2.16a.76.76 0 01-1.17-.85l1.13-3.49-2.97-2.16a.76.76 0 01.45-1.38h3.67L7.22 2.1z"/></svg>` },
    { id: "text-editor", label: "Text Editor", icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M0 11.5V1h1v10.5l.5.5H5v1H.5l-.5-.5zM9 2H7V1h2v1zm3 0h-2V1h2v1zM9 13h6.5l.5-.5V7H9v6zm1-5h5v4h-5V8zm-9 2h4V9H1v1zm3 3H1v-1h3v1z"/></svg>`, children: [
      { id: "font", label: "Font" }, { id: "cursor", label: "Cursor" }, { id: "minimap", label: "Minimap" },
      { id: "suggest", label: "Suggest" }, { id: "formatting", label: "Formatting" }, { id: "find", label: "Find" },
      { id: "scrolling", label: "Scrolling" }, { id: "rendering", label: "Rendering" },
      { id: "indentation", label: "Indentation" }, { id: "word-wrap", label: "Word Wrap" },
      { id: "misc", label: "Misc" }, { id: "diff-editor", label: "Diff Editor" },
    ] },
    { id: "workbench", label: "Workbench", icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2.5l.5-.5h13l.5.5v11l-.5.5h-13l-.5-.5v-11zM2 3v10h12V3H2z"/></svg>`, children: [
      { id: "appearance", label: "Appearance" }, { id: "startup", label: "Startup" },
      { id: "editor-tabs", label: "Editor Tabs" }, { id: "breadcrumbs", label: "Breadcrumbs" },
    ] },
    { id: "files", label: "Files", icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.85 4.44l-3.28-3.3-.35-.14H2.5l-.5.5v13l.5.5h11l.5-.5V4.8l-.15-.36zM10.5 2l2.5 2.5h-2.5V2zM3 14V2h6.5v3.5l.5.5H13v8H3z"/></svg>` },
    { id: "window", label: "Window", icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M14.5 2h-13l-.5.5v11l.5.5h13l.5-.5v-11l-.5-.5zM14 3v2H2V3h12zM2 13V6h12v7H2z"/></svg>` },
    { id: "features", label: "Features", icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1 2h14v1H1V2zm0 4h14v1H1V6zm0 4h14v1H1v-1zm0 4h14v1H1v-1z"/></svg>`, children: [
      { id: "terminal", label: "Terminal" }, { id: "explorer", label: "Explorer" },
      { id: "search", label: "Search" }, { id: "debug", label: "Debug" }, { id: "git", label: "Git" },
    ] },
    { id: "plugins", label: "Plugins", icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13.5 1.5L15 0h7.5L24 1.5V9l-1.5 1.5H15L13.5 9V1.5zM0 15l1.5-1.5H9L10.5 15v7.5L9 24H1.5L0 22.5V15zm0-12L1.5 1.5H9L10.5 3v7.5L9 12H1.5L0 10.5V3zm13.5 12L15 13.5h7.5L24 15v7.5L22.5 24H15l-1.5-1.5V15z" transform="scale(0.667)"/></svg>` },
    { id: "themes", label: "Themes", icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zM1.5 8a6.5 6.5 0 0113 0 6.5 6.5 0 01-13 0z"/><circle cx="8" cy="4" r="1.5"/><circle cx="5" cy="6" r="1.5"/><circle cx="11" cy="6" r="1.5"/><circle cx="6" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/></svg>` },
    { id: "keybindings", label: "Keybindings", icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M14 3H2a1 1 0 00-1 1v8a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1zm0 9H2V4h12v8zM3 5h2v2H3V5zm3 0h2v2H6V5zm3 0h2v2H9V5zm3 0h1v2h-1V5zM3 8h1v2H3V8zm2 0h6v2H5V8zm7 0h1v2h-1V8z"/></svg>` },
  ];

  const COMMONLY_USED_IDS = [
    "editor.fontSize", "editor.fontFamily", "editor.tabSize", "editor.wordWrap",
    "editor.minimap.enabled", "editor.formatOnSave", "editor.cursorBlinking",
    "editor.bracketPairColorization.enabled", "editor.renderWhitespace",
    "files.autoSave", "workbench.colorTheme", "editor.smoothScrolling",
    "editor.lineNumbers", "terminal.integrated.fontSize",
  ];

  // ── Build the settings DOM ─────────────────────────────────
  const container = dom.settingsWebview;
  let activeCategoryId = "commonly-used";
  let searchQuery = "";

  function buildSettingsDOM() {
    container.innerHTML = "";

    // Top bar with search
    const topBar = el("div", {
      style: `display:flex;align-items:center;gap:12px;padding:12px 20px;border-bottom:1px solid ${C.border};background:${C.editorBg};`,
    });
    const gearIcon = el("span", { style: `color:${C.fgDim};display:flex;` });
    gearIcon.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.85 8.75l4.15.83v4.84l-4.15.83 2.35 3.52-3.42 3.42-3.52-2.35-.83 4.16H9.58l-.84-4.15-3.52 2.35-3.42-3.43 2.35-3.52L0 12.42V7.58l4.15-.84L1.8 3.22 5.22 1.8l3.52 2.35L9.58 0h4.84l.84 4.15 3.52-2.35 3.42 3.42-2.35 3.53zM12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"/></svg>`;
    const title = el("span", { style: `font-size:14px;color:${C.fg};font-weight:600;` }, "Settings");
    const searchBox = el("input", {
      type: "text",
      placeholder: "Search settings...",
      class: "vsc-input",
      style: "flex:1;max-width:500px;padding:6px 12px;font-size:13px;",
    }) as HTMLInputElement;
    const scopeTabs = el("div", { style: "display:flex;gap:2px;margin-left:auto;" });
    for (const scope of ["User", "Workspace"]) {
      const tab = el("div", {
        class: "vsc-tab-pill",
        "data-active": scope === "User" ? "true" : "false",
        style: "font-size:12px;padding:3px 10px;",
      }, scope);
      tab.addEventListener("click", () => {
        scopeTabs.querySelectorAll(".vsc-tab-pill").forEach((t) => (t as HTMLElement).dataset.active = "false");
        tab.dataset.active = "true";
      });
      scopeTabs.appendChild(tab);
    }
    const jsonBtn = el("div", {
      title: "Open Settings (JSON)",
      style: `width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:${C.fgDim};border-radius:4px;margin-left:8px;`,
    });
    jsonBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M5.04 1H3v1.04l.4.37c.55.53.56.9.56 1.59v2.78c0 .84.26 1.42.73 1.84.27.24.56.39.85.49-.29.1-.58.25-.85.49-.47.42-.73 1-.73 1.84V14c0 .69-.01 1.06-.56 1.59l-.4.37V17h2.04c1.07 0 1.96-.64 1.96-2.09v-3.35c0-.9.62-1.16 1.37-1.18v-1.76c-.75-.02-1.37-.28-1.37-1.18V4.09C7 2.64 6.07 1 5.04 1zm5.92 0c-1.03 0-1.96 1.64-1.96 3.09v3.35c0 .9-.62 1.16-1.37 1.18v1.76c.75.02 1.37.28 1.37 1.18V14.91c0 1.45.89 2.09 1.96 2.09H13v-1.04l-.4-.37c-.55-.53-.56-.9-.56-1.59v-2.78c0-.84-.26-1.42-.73-1.84-.27-.24-.56-.39-.85-.49.29-.1.58-.25.85-.49.47-.42.73-1 .73-1.84V4c0-.69.01-1.06.56-1.59l.4-.37V1h-2.04z"/></svg>`;
    jsonBtn.addEventListener("mouseenter", () => { jsonBtn.style.background = "rgba(255,255,255,0.1)"; });
    jsonBtn.addEventListener("mouseleave", () => { jsonBtn.style.background = "transparent"; });
    jsonBtn.addEventListener("click", () => {
      apis.notification?.show({ type: "info", message: "settings.json editor coming soon.", duration: 3000 });
    });
    topBar.append(gearIcon, title, searchBox, scopeTabs, jsonBtn);

    // Main body: sidebar nav + content
    const body = el("div", { style: "display:flex;flex:1;overflow:hidden;" });

    // Left nav
    const nav = el("div", {
      style: `width:220px;min-width:180px;overflow-y:auto;border-right:1px solid ${C.border};padding:8px 0;background:${C.sidebarBg};`,
    });
    const navItems: HTMLElement[] = [];

    for (const cat of CATEGORIES) {
      const item = el("div", {
        "data-cat": cat.id,
        style: `display:flex;align-items:center;gap:8px;padding:5px 16px;cursor:pointer;font-size:13px;color:${cat.id === activeCategoryId ? C.fg : C.fgDim};background:${cat.id === activeCategoryId ? C.hover : "transparent"};border-left:2px solid ${cat.id === activeCategoryId ? C.accent : "transparent"};transition:all .1s;`,
      });
      const iconEl = el("span", { style: "display:flex;align-items:center;flex-shrink:0;" });
      iconEl.innerHTML = cat.icon;
      item.append(iconEl, el("span", {}, cat.label));
      item.addEventListener("click", () => {
        activeCategoryId = cat.id;
        searchQuery = "";
        searchBox.value = "";
        updateNav();
        renderContent();
      });
      item.addEventListener("mouseenter", () => {
        if (cat.id !== activeCategoryId) item.style.background = C.hover;
      });
      item.addEventListener("mouseleave", () => {
        if (cat.id !== activeCategoryId) item.style.background = "transparent";
      });
      navItems.push(item);
      nav.appendChild(item);

      // Sub-items
      if (cat.children) {
        for (const sub of cat.children) {
          const subItem = el("div", {
            "data-cat": sub.id,
            style: `padding:3px 16px 3px 40px;cursor:pointer;font-size:12px;color:${C.fgDim};transition:all .1s;`,
          });
          subItem.textContent = sub.label;
          subItem.addEventListener("click", () => {
            activeCategoryId = sub.id;
            searchQuery = "";
            searchBox.value = "";
            updateNav();
            renderContent();
          });
          subItem.addEventListener("mouseenter", () => {
            if (sub.id !== activeCategoryId) subItem.style.background = C.hover;
          });
          subItem.addEventListener("mouseleave", () => {
            if (sub.id !== activeCategoryId) subItem.style.background = "transparent";
          });
          navItems.push(subItem);
          nav.appendChild(subItem);
        }
      }
    }

    function updateNav() {
      for (const item of navItems) {
        const catId = item.dataset.cat;
        const isActive = catId === activeCategoryId;
        item.style.color = isActive ? C.fg : C.fgDim;
        item.style.background = isActive ? C.hover : "transparent";
        item.style.borderLeft = item.style.paddingLeft === "40px"
          ? "none"
          : `2px solid ${isActive ? C.accent : "transparent"}`;
        if (isActive && item.style.paddingLeft === "40px") {
          item.style.color = C.fg;
          item.style.background = C.hover;
        }
      }
    }

    // Right content
    const content = el("div", {
      style: "flex:1;overflow-y:auto;padding:16px 24px 40px;",
    });

    function renderContent() {
      content.innerHTML = "";

      if (searchQuery) {
        renderSearchResults(content);
        return;
      }

      switch (activeCategoryId) {
        case "commonly-used":
          renderSettingsList(content, allSettings.filter((s) => COMMONLY_USED_IDS.includes(s.id)), "Commonly Used");
          break;
        case "text-editor":
          renderSettingsList(content, EDITOR_SETTINGS, "Text Editor");
          break;
        case "workbench":
          renderSettingsList(content, WORKBENCH_SETTINGS, "Workbench");
          break;
        case "files":
          renderSettingsList(content, FILES_SETTINGS, "Files");
          break;
        case "window":
          renderSettingsList(content, WINDOW_SETTINGS, "Window");
          break;
        case "features":
          renderSettingsList(content, FEATURES_SETTINGS, "Features");
          break;
        case "plugins":
          renderPluginsConfig(content);
          break;
        case "themes":
          renderThemesConfig(content);
          break;
        case "keybindings":
          renderKeybindingsConfig(content);
          break;
        default: {
          // Sub-category — filter by group name
          const groupName = activeCategoryId.replace(/-/g, " ");
          const matched = allSettings.filter(
            (s) => s.group.toLowerCase() === groupName ||
                   s.group.toLowerCase().replace(/ /g, "-") === activeCategoryId
          );
          if (matched.length > 0) {
            renderSettingsList(content, matched, matched[0].group);
          } else {
            content.appendChild(el("div", { style: `color:${C.fgDim};padding:24px;font-size:13px;` }, "No settings in this category."));
          }
          break;
        }
      }
    }

    function renderSearchResults(parent: HTMLElement) {
      const q = searchQuery.toLowerCase();
      const matched = allSettings.filter(
        (s) => s.label.toLowerCase().includes(q) ||
               s.desc.toLowerCase().includes(q) ||
               s.id.toLowerCase().includes(q) ||
               (s.tags ?? []).some((t) => t.includes(q))
      );
      const header = el("div", { style: `font-size:12px;color:${C.fgDim};margin-bottom:16px;` },
        `${matched.length} setting${matched.length !== 1 ? "s" : ""} found for "${searchQuery}"`);
      parent.appendChild(header);
      renderSettingsItems(parent, matched);
    }

    // Search handler
    searchBox.addEventListener("input", () => {
      searchQuery = searchBox.value.trim();
      renderContent();
    });

    body.append(nav, content);
    container.append(topBar, body);
    renderContent();
  }

  // ── Render a list of settings ──────────────────────────────
  function renderSettingsList(parent: HTMLElement, settings: SettingDef[], title: string) {
    const header = el("div", { style: `font-size:18px;color:${C.fg};font-weight:600;margin-bottom:4px;` }, title);
    const count = el("div", { style: `font-size:12px;color:${C.fgDim};margin-bottom:20px;` }, `${settings.length} settings`);
    parent.append(header, count);

    // Group by sub-group
    const groups = new Map<string, SettingDef[]>();
    for (const s of settings) {
      const arr = groups.get(s.group) ?? [];
      arr.push(s);
      groups.set(s.group, arr);
    }

    for (const [group, items] of groups) {
      const groupHeader = el("div", {
        style: `font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:${C.fgDim};padding:16px 0 8px;border-bottom:1px solid ${C.separator};margin-bottom:8px;font-weight:600;`,
      }, group);
      parent.appendChild(groupHeader);
      renderSettingsItems(parent, items);
    }
  }

  function renderSettingsItems(parent: HTMLElement, items: SettingDef[]) {
    for (const s of items) {
      const row = el("div", {
        style: `padding:10px 0;border-bottom:1px solid color-mix(in srgb, ${C.border} 13%, transparent);`,
      });

      const labelRow = el("div", { style: "display:flex;align-items:baseline;gap:8px;margin-bottom:2px;" });
      const labelEl = el("span", { style: `font-size:13px;color:${C.fg};font-weight:500;` }, s.label);
      const idEl = el("span", { style: `font-size:11px;color:${C.fgDim};font-family:monospace;` }, s.id);
      labelRow.append(labelEl, idEl);

      const descEl = el("div", { style: `font-size:12px;color:${C.fgDim};margin-bottom:8px;line-height:1.5;` }, s.desc);

      row.append(labelRow, descEl);

      if (s.type === "checkbox") {
        const wrap = el("label", { style: "display:flex;align-items:center;gap:8px;cursor:pointer;" });
        const cb = el("input", { type: "checkbox", style: `accent-color:${C.accent};width:16px;height:16px;cursor:pointer;` }) as HTMLInputElement;
        cb.checked = s.value === "true";
        const label = el("span", { style: `font-size:12px;color:${C.fg};` }, cb.checked ? "Enabled" : "Disabled");
        cb.addEventListener("change", () => {
          s.value = String(cb.checked);
          label.textContent = cb.checked ? "Enabled" : "Disabled";
          eventBus.emit("settings:change", { id: s.id, value: cb.checked });
        });
        wrap.append(cb, label);
        row.appendChild(wrap);
      } else if (s.type === "select") {
        const sel = el("select", {
          class: "vsc-input",
          style: "width:auto;min-width:180px;padding:5px 8px;font-size:13px;",
        }) as HTMLSelectElement;
        for (const opt of s.options ?? []) {
          const o = el("option", { value: opt }, opt) as HTMLOptionElement;
          if (opt === s.value) o.selected = true;
          sel.appendChild(o);
        }
        sel.addEventListener("change", () => {
          s.value = sel.value;
          eventBus.emit("settings:change", { id: s.id, value: sel.value });
        });
        row.appendChild(sel);
      } else if (s.type === "color") {
        const inp = el("input", { type: "color", value: s.value, style: "width:40px;height:28px;border:none;cursor:pointer;" }) as HTMLInputElement;
        inp.addEventListener("change", () => {
          s.value = inp.value;
          eventBus.emit("settings:change", { id: s.id, value: inp.value });
        });
        row.appendChild(inp);
      } else {
        const inp = el("input", {
          type: s.type,
          value: s.value,
          class: "vsc-input",
          style: `width:${s.type === "number" ? "100px" : "280px"};padding:5px 8px;font-size:13px;`,
        }) as HTMLInputElement;
        inp.addEventListener("change", () => {
          s.value = inp.value;
          eventBus.emit("settings:change", { id: s.id, value: s.type === "number" ? Number(inp.value) : inp.value });
        });
        row.appendChild(inp);
      }

      parent.appendChild(row);
    }
  }

  // ── Plugins config ─────────────────────────────────────────
  function renderPluginsConfig(parent: HTMLElement) {
    const header = el("div", { style: `font-size:18px;color:${C.fg};font-weight:600;margin-bottom:4px;` }, "Plugin Configuration");
    const desc = el("div", { style: `font-size:12px;color:${C.fgDim};margin-bottom:16px;` },
      `Configure all ${PLUGIN_CATALOG.length} plugins. Each plugin shows its available settings.`);

    const searchInput = el("input", {
      type: "text",
      placeholder: "Filter plugins...",
      class: "vsc-input",
      style: "margin-bottom:16px;max-width:400px;",
    }) as HTMLInputElement;

    const filterRow = el("div", { style: "display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap;" });
    let activeFilter = "all";
    const cats = ["all", "installed", ...new Set(PLUGIN_CATALOG.map((p) => p.category))];
    const filterEls: HTMLElement[] = [];
    for (const cat of cats) {
      const pill = el("div", {
        class: "vsc-tab-pill",
        "data-active": cat === activeFilter ? "true" : "false",
        style: "font-size:11px;padding:2px 8px;",
      }, cat === "all" ? `All (${PLUGIN_CATALOG.length})` : cat === "installed" ? "Installed" : cat);
      pill.addEventListener("click", () => {
        activeFilter = cat;
        filterEls.forEach((f) => f.dataset.active = "false");
        pill.dataset.active = "true";
        renderPluginList();
      });
      filterEls.push(pill);
      filterRow.appendChild(pill);
    }

    const pluginList = el("div");

    function renderPluginList() {
      pluginList.innerHTML = "";
      const q = searchInput.value.trim().toLowerCase();
      let filtered = PLUGIN_CATALOG;
      if (activeFilter === "installed") filtered = filtered.filter((p) => p.installed);
      else if (activeFilter !== "all") filtered = filtered.filter((p) => p.category === activeFilter);
      if (q) filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));

      if (filtered.length === 0) {
        pluginList.appendChild(el("div", { style: `color:${C.fgDim};padding:16px;font-size:13px;` }, "No plugins match the filter."));
        return;
      }

      for (const p of filtered) {
        const card = el("div", {
          style: `margin-bottom:12px;border:1px solid ${C.border};border-radius:6px;overflow:hidden;background:${C.cardBg};`,
        });

        // Plugin header
        const cardHeader = el("div", {
          style: `display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;`,
        });
        const iconEl = el("div", {
          style: `width:32px;height:32px;min-width:32px;display:flex;align-items:center;justify-content:center;border-radius:6px;background:${p.color}18;`,
        });
        iconEl.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="${p.color}"><path d="M13.5 1.5L15 0h7.5L24 1.5V9l-1.5 1.5H15L13.5 9V1.5zM0 15l1.5-1.5H9L10.5 15v7.5L9 24H1.5L0 22.5V15zm0-12L1.5 1.5H9L10.5 3v7.5L9 12H1.5L0 10.5V3zm13.5 12L15 13.5h7.5L24 15v7.5L22.5 24H15l-1.5-1.5V15z"/></svg>`;

        const info = el("div", { style: "flex:1;min-width:0;" });
        const titleRow = el("div", { style: "display:flex;align-items:center;gap:8px;" });
        titleRow.append(
          el("span", { style: `font-size:13px;color:${C.fg};font-weight:500;` }, p.name),
          el("span", { style: `font-size:11px;color:${C.fgDim};font-family:monospace;` }, p.id),
        );
        if (p.installed) {
          const badge = el("span", { style: `font-size:10px;padding:1px 6px;border-radius:3px;background:color-mix(in srgb, ${C.successGreen} 13%, transparent);color:${C.successGreen};` }, "Installed");
          titleRow.appendChild(badge);
        }
        info.append(titleRow, el("div", { style: `font-size:12px;color:${C.fgDim};margin-top:2px;` }, p.desc));

        const categoryTag = el("span", { class: "vsc-tag", style: "flex-shrink:0;" }, p.category);

        // Toggle chevron
        const chevron = el("span", {
          style: `display:flex;align-items:center;color:${C.fgDim};transition:transform .15s;transform:rotate(0);flex-shrink:0;`,
        });
        chevron.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;

        cardHeader.append(iconEl, info, categoryTag, chevron);

        // Settings body (collapsible)
        const cardBody = el("div", {
          style: `display:none;border-top:1px solid ${C.border};padding:10px 14px;`,
        });

        if (p.settings.length > 0) {
          renderSettingsItems(cardBody, p.settings);
        } else {
          cardBody.appendChild(el("div", { style: `font-size:12px;color:${C.fgDim};padding:8px 0;font-style:italic;` }, "No configurable settings for this plugin."));
        }

        let expanded = false;
        cardHeader.addEventListener("click", () => {
          expanded = !expanded;
          cardBody.style.display = expanded ? "" : "none";
          chevron.style.transform = `rotate(${expanded ? "90deg" : "0"})`;
        });

        card.append(cardHeader, cardBody);
        pluginList.appendChild(card);
      }
    }

    searchInput.addEventListener("input", renderPluginList);
    parent.append(header, desc, searchInput, filterRow, pluginList);
    requestAnimationFrame(renderPluginList);
  }

  // ── Themes config ──────────────────────────────────────────
  function renderThemesConfig(parent: HTMLElement) {
    const header = el("div", { style: `font-size:18px;color:${C.fg};font-weight:600;margin-bottom:4px;` }, "Color Themes");
    const desc = el("div", { style: `font-size:12px;color:${C.fgDim};margin-bottom:20px;` },
      `Select a color theme for the editor. ${THEMES.length} themes available.`);

    const filterRow = el("div", { style: "display:flex;gap:6px;margin-bottom:16px;" });
    let themeFilter = "all";
    const filterEls: HTMLElement[] = [];
    for (const f of ["all", "dark", "light", "contrast"]) {
      const pill = el("div", {
        class: "vsc-tab-pill",
        "data-active": f === themeFilter ? "true" : "false",
      }, f.charAt(0).toUpperCase() + f.slice(1));
      pill.addEventListener("click", () => {
        themeFilter = f;
        filterEls.forEach((e) => e.dataset.active = "false");
        pill.dataset.active = "true";
        renderThemes();
      });
      filterEls.push(pill);
      filterRow.appendChild(pill);
    }

    const grid = el("div", { style: "display:grid;grid-template-columns:repeat(auto-fill, minmax(200px, 1fr));gap:12px;" });
    let activeTheme = "Dark+ (Default)";

    function renderThemes() {
      grid.innerHTML = "";
      const filtered = themeFilter === "all" ? THEMES : THEMES.filter((t) => t.type === themeFilter);
      for (const theme of filtered) {
        const card = el("div", {
          style: `cursor:pointer;border-radius:8px;overflow:hidden;border:2px solid ${theme.name === activeTheme ? C.accent : C.border};transition:border-color .15s;background:${C.cardBg};`,
        });

        // Preview
        const preview = el("div", { style: `height:64px;background:${theme.colors.bg};display:flex;overflow:hidden;` });
        const miniSidebar = el("div", { style: `width:28px;background:${theme.colors.sidebar};border-right:1px solid rgba(255,255,255,0.06);` });
        const miniEditor = el("div", { style: "flex:1;padding:8px 10px;" });
        miniEditor.innerHTML = `
          <div style="width:50%;height:4px;background:${theme.colors.fg}30;border-radius:2px;margin-bottom:4px;"></div>
          <div style="width:75%;height:4px;background:${theme.colors.fg}20;border-radius:2px;margin-bottom:4px;"></div>
          <div style="width:35%;height:4px;background:${theme.colors.accent}60;border-radius:2px;margin-bottom:4px;"></div>
          <div style="width:60%;height:4px;background:${theme.colors.fg}15;border-radius:2px;"></div>`;
        const miniStatus = el("div", { style: `height:3px;background:${theme.colors.accent};` });
        preview.append(miniSidebar, miniEditor);
        preview.appendChild(miniStatus);

        // Label
        const label = el("div", { style: `padding:8px 10px;display:flex;align-items:center;justify-content:space-between;` });
        label.append(
          el("span", { style: `font-size:12px;color:${C.fg};font-weight:500;` }, theme.name),
          el("span", { class: "vsc-tag", style: "font-size:10px;" }, theme.type),
        );

        card.append(preview, label);
        card.addEventListener("click", () => {
          activeTheme = theme.name;
          renderThemes();
          const monacoTheme = theme.type === "light" ? "vs" : theme.type === "contrast" ? "hc-black" : "vs-dark";
          eventBus.emit("theme:change", { name: theme.name, type: theme.type, monacoTheme });
          apis.notification?.show({ type: "success", message: `Theme changed to ${theme.name}`, duration: 2000 });
        });
        card.addEventListener("mouseenter", () => {
          if (theme.name !== activeTheme) card.style.borderColor = C.fgDim;
        });
        card.addEventListener("mouseleave", () => {
          card.style.borderColor = theme.name === activeTheme ? C.accent : C.border;
        });

        grid.appendChild(card);
      }
    }

    parent.append(header, desc, filterRow, grid);
    renderThemes();
  }

  // ── Keybindings config ─────────────────────────────────────
  function renderKeybindingsConfig(parent: HTMLElement) {
    const header = el("div", { style: `font-size:18px;color:${C.fg};font-weight:600;margin-bottom:4px;` }, "Keyboard Shortcuts");
    const desc = el("div", { style: `font-size:12px;color:${C.fgDim};margin-bottom:16px;` },
      `${KEYBINDINGS.length} keybindings configured. Search to find a specific shortcut.`);

    const searchInput = el("input", {
      type: "text",
      placeholder: "Search keybindings...",
      class: "vsc-input",
      style: "margin-bottom:12px;max-width:400px;",
    }) as HTMLInputElement;

    // Table header
    const tableHead = el("div", {
      style: `display:flex;padding:6px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:${C.fgDim};border-bottom:1px solid ${C.border};margin-bottom:4px;`,
    });
    tableHead.append(
      el("span", { style: "flex:1;" }, "Command"),
      el("span", { style: "width:160px;text-align:center;" }, "Keybinding"),
      el("span", { style: "width:120px;" }, "When"),
    );

    const list = el("div");

    function renderList(q = "") {
      list.innerHTML = "";
      const filtered = q
        ? KEYBINDINGS.filter((k) => k.command.toLowerCase().includes(q.toLowerCase()) || k.key.toLowerCase().includes(q.toLowerCase()))
        : KEYBINDINGS;

      for (const kb of filtered) {
        const row = el("div", {
          class: "vsc-file-item",
          style: `display:flex;align-items:center;padding:6px 12px;height:32px;font-size:13px;cursor:pointer;`,
        });
        const cmdSpan = el("span", { style: `flex:1;color:${C.fg};` }, kb.command);
        const keySpan = el("span", { style: "width:160px;text-align:center;display:flex;align-items:center;justify-content:center;gap:3px;" });
        const parts = kb.key.split("+");
        for (let i = 0; i < parts.length; i++) {
          if (i > 0) keySpan.appendChild(el("span", { style: `color:${C.fgDim};font-size:10px;` }, "+"));
          keySpan.appendChild(el("span", {
            style: `display:inline-block;padding:2px 6px;background:${C.cardBg};border:1px solid ${C.borderLight};border-radius:3px;font-size:11px;color:${C.fg};font-family:monospace;`,
          }, parts[i].trim()));
        }
        const whenSpan = el("span", { style: `width:120px;font-size:11px;color:${C.fgDim};` }, kb.when || "—");
        row.append(cmdSpan, keySpan, whenSpan);
        list.appendChild(row);
      }

      if (filtered.length === 0) {
        list.appendChild(el("div", { style: `color:${C.fgDim};padding:16px;font-size:13px;text-align:center;` }, "No keybindings found."));
      }
    }

    searchInput.addEventListener("input", () => renderList(searchInput.value));
    parent.append(header, desc, searchInput, tableHead, list);
    requestAnimationFrame(() => renderList());
  }

  // ── Show / hide the settings webview ───────────────────────
  function openSettings() {
    if (!isOpen) {
      buildSettingsDOM();
    }
    isOpen = true;
    container.style.display = "flex";
    dom.editorContainer.style.display = "none";
    dom.welcomePage.style.display = "none";
    // Open a "Settings" tab
    eventBus.emit("tab:open-special", { uri: SETTINGS_URI, label: "Settings" });
  }

  function closeSettings() {
    if (!isOpen) return;
    isOpen = false;
    container.style.display = "none";
    dom.editorContainer.style.display = "";
  }

  // ── Event listeners ────────────────────────────────────────
  on("settings:ui-open", () => {
    openSettings();
  });

  // When a file tab is activated (not settings), close the settings webview
  on(FileEvents.Open, (p) => {
    const { uri } = p as { uri: string };
    if (uri !== SETTINGS_URI && isOpen) {
      closeSettings();
    }
  });

  // When settings tab is re-clicked
  on("tab:switch-special", (p) => {
    const { uri } = p as { uri: string };
    if (uri === SETTINGS_URI) {
      openSettings();
    }
  });
}
