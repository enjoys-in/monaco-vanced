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
  id: string;
  name: string;
  type: "dark" | "light" | "contrast";
  colors: { bg: string; fg: string; accent: string; sidebar: string };
  remote?: boolean;
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
  // ── Font & Typography ──────────────────────────────────
  { id: "editor.fontSize", label: "Font Size", type: "number", value: "14", desc: "Controls the font size in pixels.", group: "Font", category: "Text Editor", tags: ["font"] },
  { id: "editor.fontFamily", label: "Font Family", type: "text", value: "'JetBrains Mono', monospace", desc: "Controls the font family for the editor.", group: "Font", category: "Text Editor", tags: ["font"] },
  { id: "editor.fontWeight", label: "Font Weight", type: "select", value: "normal", options: ["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"], desc: "Controls the font weight.", group: "Font", category: "Text Editor", tags: ["font"] },
  { id: "editor.fontLigatures", label: "Font Ligatures", type: "checkbox", value: "true", desc: "Enables/disables font ligatures.", group: "Font", category: "Text Editor", tags: ["font"] },
  { id: "editor.fontVariations", label: "Font Variations", type: "checkbox", value: "false", desc: "Enable font variations (variable fonts).", group: "Font", category: "Text Editor", tags: ["font"] },
  { id: "editor.lineHeight", label: "Line Height", type: "number", value: "0", desc: "Controls the line height. Use 0 for automatic.", group: "Font", category: "Text Editor", tags: ["font"] },
  { id: "editor.letterSpacing", label: "Letter Spacing", type: "number", value: "0", desc: "Controls the letter spacing in pixels.", group: "Font", category: "Text Editor", tags: ["font"] },

  // ── Cursor ─────────────────────────────────────────────
  { id: "editor.cursorBlinking", label: "Cursor Blinking", type: "select", value: "smooth", options: ["blink", "smooth", "phase", "expand", "solid"], desc: "Controls the cursor animation style.", group: "Cursor", category: "Text Editor", tags: ["cursor"] },
  { id: "editor.cursorStyle", label: "Cursor Style", type: "select", value: "line", options: ["line", "block", "underline", "line-thin", "block-outline", "underline-thin"], desc: "Controls the cursor style.", group: "Cursor", category: "Text Editor", tags: ["cursor"] },
  { id: "editor.cursorSmoothCaretAnimation", label: "Smooth Caret Animation", type: "select", value: "on", options: ["off", "explicit", "on"], desc: "Controls smooth caret animation.", group: "Cursor", category: "Text Editor", tags: ["cursor"] },
  { id: "editor.cursorWidth", label: "Cursor Width", type: "number", value: "0", desc: "Cursor width in pixels (0 = default for cursor style).", group: "Cursor", category: "Text Editor", tags: ["cursor"] },
  { id: "editor.cursorSurroundingLines", label: "Cursor Surrounding Lines", type: "number", value: "0", desc: "Minimum visible lines around the cursor.", group: "Cursor", category: "Text Editor", tags: ["cursor"] },
  { id: "editor.cursorSurroundingLinesStyle", label: "Surrounding Lines Style", type: "select", value: "default", options: ["default", "all"], desc: "When cursorSurroundingLines is enforced.", group: "Cursor", category: "Text Editor", tags: ["cursor"] },

  // ── Indentation ────────────────────────────────────────
  { id: "editor.tabSize", label: "Tab Size", type: "number", value: "2", desc: "The number of spaces a tab is equal to.", group: "Indentation", category: "Text Editor", tags: ["tab", "indent"] },
  { id: "editor.insertSpaces", label: "Insert Spaces", type: "checkbox", value: "true", desc: "Insert spaces instead of tabs.", group: "Indentation", category: "Text Editor", tags: ["tab", "indent"] },
  { id: "editor.detectIndentation", label: "Detect Indentation", type: "checkbox", value: "true", desc: "Auto-detect tabSize and insertSpaces from file content.", group: "Indentation", category: "Text Editor", tags: ["tab", "indent"] },
  { id: "editor.trimAutoWhitespace", label: "Trim Auto Whitespace", type: "checkbox", value: "true", desc: "Remove trailing auto-inserted whitespace.", group: "Indentation", category: "Text Editor", tags: ["indent", "whitespace"] },
  { id: "editor.autoIndent", label: "Auto Indent", type: "select", value: "advanced", options: ["none", "keep", "brackets", "advanced", "full"], desc: "Controls auto indentation adjustment.", group: "Indentation", category: "Text Editor", tags: ["indent"] },
  { id: "editor.useTabStops", label: "Use Tab Stops", type: "checkbox", value: "true", desc: "Tab/Backspace follows tab stops.", group: "Indentation", category: "Text Editor", tags: ["tab", "indent"] },
  { id: "editor.stickyTabStops", label: "Sticky Tab Stops", type: "checkbox", value: "false", desc: "Emulate tab selection with spaces.", group: "Indentation", category: "Text Editor", tags: ["tab", "indent"] },

  // ── Minimap ────────────────────────────────────────────
  { id: "editor.minimap.enabled", label: "Minimap Enabled", type: "checkbox", value: "true", desc: "Controls whether the minimap is shown.", group: "Minimap", category: "Text Editor", tags: ["minimap"] },
  { id: "editor.minimap.side", label: "Minimap Side", type: "select", value: "right", options: ["left", "right"], desc: "Controls the side where minimap is rendered.", group: "Minimap", category: "Text Editor", tags: ["minimap"] },
  { id: "editor.minimap.maxColumn", label: "Minimap Max Column", type: "number", value: "120", desc: "Maximum width of the minimap in columns.", group: "Minimap", category: "Text Editor", tags: ["minimap"] },

  // ── Sticky Scroll ──────────────────────────────────────
  { id: "editor.stickyScroll.enabled", label: "Sticky Scroll", type: "checkbox", value: "false", desc: "Show nested scope headers at the top of the editor.", group: "Sticky Scroll", category: "Text Editor", tags: ["scroll", "sticky"] },

  // ── Suggestions & Completions ──────────────────────────
  { id: "editor.suggestOnTriggerCharacters", label: "Suggest On Trigger", type: "checkbox", value: "true", desc: "Controls whether suggestions auto-show on trigger characters.", group: "Suggest", category: "Text Editor", tags: ["suggest"] },
  { id: "editor.quickSuggestions", label: "Quick Suggestions", type: "checkbox", value: "true", desc: "Enable quick suggestions (autocomplete as you type).", group: "Suggest", category: "Text Editor", tags: ["suggest"] },
  { id: "editor.quickSuggestionsDelay", label: "Quick Suggestions Delay", type: "number", value: "10", desc: "Delay in ms before showing quick suggestions.", group: "Suggest", category: "Text Editor", tags: ["suggest"] },
  { id: "editor.snippetSuggestions", label: "Snippet Suggestions", type: "select", value: "inline", options: ["top", "bottom", "inline", "none"], desc: "Controls how snippets appear with other suggestions.", group: "Suggest", category: "Text Editor", tags: ["suggest"] },
  { id: "editor.acceptSuggestionOnEnter", label: "Accept On Enter", type: "select", value: "on", options: ["on", "smart", "off"], desc: "Accept suggestion on Enter key.", group: "Suggest", category: "Text Editor", tags: ["suggest"] },
  { id: "editor.acceptSuggestionOnCommitCharacter", label: "Accept On Commit Character", type: "checkbox", value: "true", desc: "Accept suggestion on provider-defined commit characters.", group: "Suggest", category: "Text Editor", tags: ["suggest"] },
  { id: "editor.suggestSelection", label: "Suggest Selection", type: "select", value: "first", options: ["first", "recentlyUsed", "recentlyUsedByPrefix"], desc: "How suggestions are pre-selected.", group: "Suggest", category: "Text Editor", tags: ["suggest"] },
  { id: "editor.suggestFontSize", label: "Suggest Font Size", type: "number", value: "0", desc: "Suggest widget font size (0 = editor font size).", group: "Suggest", category: "Text Editor", tags: ["suggest", "font"] },
  { id: "editor.suggestLineHeight", label: "Suggest Line Height", type: "number", value: "0", desc: "Suggest widget line height (0 = editor line height).", group: "Suggest", category: "Text Editor", tags: ["suggest", "font"] },
  { id: "editor.tabCompletion", label: "Tab Completion", type: "select", value: "off", options: ["on", "off", "onlySnippets"], desc: "Enable tab completion.", group: "Suggest", category: "Text Editor", tags: ["suggest", "tab"] },
  { id: "editor.wordBasedSuggestions", label: "Word Based Suggestions", type: "select", value: "currentDocument", options: ["off", "currentDocument", "matchingDocuments", "allDocuments"], desc: "Word-based completions source.", group: "Suggest", category: "Text Editor", tags: ["suggest"] },
  { id: "editor.suggest.showMethods", label: "Show Methods", type: "checkbox", value: "true", desc: "Show methods in suggestions.", group: "Suggest", category: "Text Editor", tags: ["suggest"] },
  { id: "editor.suggest.showFunctions", label: "Show Functions", type: "checkbox", value: "true", desc: "Show functions in suggestions.", group: "Suggest", category: "Text Editor", tags: ["suggest"] },
  { id: "editor.inlineSuggest.enabled", label: "Inline Suggestions", type: "checkbox", value: "true", desc: "Enable inline suggestions (ghost text).", group: "Suggest", category: "Text Editor", tags: ["suggest", "ai"] },
  { id: "editor.parameterHints.enabled", label: "Parameter Hints", type: "checkbox", value: "true", desc: "Show parameter hints on function call.", group: "Suggest", category: "Text Editor", tags: ["suggest"] },

  // ── Formatting ─────────────────────────────────────────
  { id: "editor.formatOnPaste", label: "Format on Paste", type: "checkbox", value: "false", desc: "Auto-format pasted content.", group: "Formatting", category: "Text Editor", tags: ["format"] },
  { id: "editor.formatOnSave", label: "Format on Save", type: "checkbox", value: "false", desc: "Format a file on save.", group: "Formatting", category: "Text Editor", tags: ["format"] },
  { id: "editor.formatOnType", label: "Format on Type", type: "checkbox", value: "false", desc: "Auto-format the line after typing.", group: "Formatting", category: "Text Editor", tags: ["format"] },
  { id: "editor.defaultFormatter", label: "Default Formatter", type: "text", value: "esbenp.prettier-vscode", desc: "Default formatter for document formatting.", group: "Formatting", category: "Text Editor", tags: ["format"] },

  // ── Scrolling ──────────────────────────────────────────
  { id: "editor.smoothScrolling", label: "Smooth Scrolling", type: "checkbox", value: "true", desc: "Scroll using an animation.", group: "Scrolling", category: "Text Editor", tags: ["scroll"] },
  { id: "editor.scrollBeyondLastLine", label: "Scroll Beyond Last Line", type: "checkbox", value: "false", desc: "Scroll beyond the last line.", group: "Scrolling", category: "Text Editor", tags: ["scroll"] },
  { id: "editor.scrollBeyondLastColumn", label: "Scroll Beyond Last Column", type: "number", value: "5", desc: "Extra columns scrollable past last character.", group: "Scrolling", category: "Text Editor", tags: ["scroll"] },
  { id: "editor.mouseWheelZoom", label: "Mouse Wheel Zoom", type: "checkbox", value: "false", desc: "Zoom with Ctrl+mouse wheel.", group: "Scrolling", category: "Text Editor", tags: ["scroll", "zoom"] },
  { id: "editor.mouseWheelScrollSensitivity", label: "Mouse Wheel Sensitivity", type: "number", value: "1", desc: "Mouse wheel scroll speed multiplier.", group: "Scrolling", category: "Text Editor", tags: ["scroll"] },
  { id: "editor.fastScrollSensitivity", label: "Fast Scroll Sensitivity", type: "number", value: "5", desc: "Fast scroll multiplier with Alt key.", group: "Scrolling", category: "Text Editor", tags: ["scroll"] },

  // ── Rendering ──────────────────────────────────────────
  { id: "editor.renderWhitespace", label: "Render Whitespace", type: "select", value: "selection", options: ["none", "boundary", "selection", "trailing", "all"], desc: "How to render whitespace characters.", group: "Rendering", category: "Text Editor", tags: ["whitespace"] },
  { id: "editor.renderControlCharacters", label: "Render Control Characters", type: "checkbox", value: "true", desc: "Render control characters.", group: "Rendering", category: "Text Editor", tags: ["rendering"] },
  { id: "editor.renderLineHighlight", label: "Render Line Highlight", type: "select", value: "all", options: ["none", "gutter", "line", "all"], desc: "How to render current line highlight.", group: "Rendering", category: "Text Editor", tags: ["highlight"] },
  { id: "editor.renderLineHighlightOnlyWhenFocus", label: "Line Highlight Only When Focus", type: "checkbox", value: "false", desc: "Line highlight only when editor is focused.", group: "Rendering", category: "Text Editor", tags: ["highlight"] },
  { id: "editor.renderFinalNewline", label: "Render Final Newline", type: "select", value: "on", options: ["on", "off", "dimmed"], desc: "Render final newline.", group: "Rendering", category: "Text Editor", tags: ["rendering"] },
  { id: "editor.renderValidationDecorations", label: "Render Validation Decorations", type: "select", value: "editable", options: ["editable", "on", "off"], desc: "Render validation decorations.", group: "Rendering", category: "Text Editor", tags: ["rendering"] },
  { id: "editor.bracketPairColorization.enabled", label: "Bracket Pair Colorization", type: "checkbox", value: "true", desc: "Enable bracket pair colorization.", group: "Rendering", category: "Text Editor", tags: ["bracket"] },
  { id: "editor.guides.bracketPairs", label: "Bracket Pair Guides", type: "select", value: "false", options: ["true", "false", "active"], desc: "Enable bracket pair guides.", group: "Rendering", category: "Text Editor", tags: ["bracket", "guides"] },
  { id: "editor.guides.indentation", label: "Indentation Guides", type: "checkbox", value: "true", desc: "Render indentation guides.", group: "Rendering", category: "Text Editor", tags: ["indent", "guides"] },
  { id: "editor.colorDecorators", label: "Color Decorators", type: "checkbox", value: "true", desc: "Show inline color decorators.", group: "Rendering", category: "Text Editor", tags: ["color"] },
  { id: "editor.colorDecoratorsActivatedOn", label: "Color Decorators Activation", type: "select", value: "clickAndHover", options: ["clickAndHover", "click", "hover"], desc: "Color picker activation method.", group: "Rendering", category: "Text Editor", tags: ["color"] },
  { id: "editor.colorDecoratorsLimit", label: "Color Decorators Limit", type: "number", value: "500", desc: "Max color decorators per editor.", group: "Rendering", category: "Text Editor", tags: ["color"] },
  { id: "editor.overviewRulerLanes", label: "Overview Ruler Lanes", type: "number", value: "3", desc: "Overview ruler vertical lanes.", group: "Rendering", category: "Text Editor", tags: ["rendering"] },
  { id: "editor.overviewRulerBorder", label: "Overview Ruler Border", type: "checkbox", value: "true", desc: "Show border around overview ruler.", group: "Rendering", category: "Text Editor", tags: ["rendering"] },
  { id: "editor.showUnused", label: "Show Unused", type: "checkbox", value: "true", desc: "Fade unused variables.", group: "Rendering", category: "Text Editor", tags: ["rendering"] },
  { id: "editor.showDeprecated", label: "Show Deprecated", type: "checkbox", value: "true", desc: "Strikethrough deprecated variables.", group: "Rendering", category: "Text Editor", tags: ["rendering"] },

  // ── Word Wrap ──────────────────────────────────────────
  { id: "editor.wordWrap", label: "Word Wrap", type: "select", value: "off", options: ["off", "on", "wordWrapColumn", "bounded"], desc: "Controls how lines should wrap.", group: "Word Wrap", category: "Text Editor", tags: ["wrap"] },
  { id: "editor.wordWrapColumn", label: "Word Wrap Column", type: "number", value: "80", desc: "Column at which to wrap (when wordWrap is 'wordWrapColumn' or 'bounded').", group: "Word Wrap", category: "Text Editor", tags: ["wrap"] },
  { id: "editor.wrappingIndent", label: "Wrapping Indent", type: "select", value: "none", options: ["none", "same", "indent", "deepIndent"], desc: "Controls indentation of wrapped lines.", group: "Word Wrap", category: "Text Editor", tags: ["wrap", "indent"] },
  { id: "editor.wrappingStrategy", label: "Wrapping Strategy", type: "select", value: "simple", options: ["simple", "advanced"], desc: "Wrapping algorithm.", group: "Word Wrap", category: "Text Editor", tags: ["wrap"] },

  // ── Bracket Matching ───────────────────────────────────
  { id: "editor.matchBrackets", label: "Match Brackets", type: "select", value: "always", options: ["never", "near", "always"], desc: "Highlight matching brackets.", group: "Brackets", category: "Text Editor", tags: ["bracket"] },
  { id: "editor.autoClosingBrackets", label: "Auto Closing Brackets", type: "select", value: "languageDefined", options: ["always", "languageDefined", "beforeWhitespace", "never"], desc: "Auto-close brackets.", group: "Brackets", category: "Text Editor", tags: ["bracket", "auto"] },
  { id: "editor.autoClosingQuotes", label: "Auto Closing Quotes", type: "select", value: "languageDefined", options: ["always", "languageDefined", "beforeWhitespace", "never"], desc: "Auto-close quotes.", group: "Brackets", category: "Text Editor", tags: ["bracket", "auto"] },
  { id: "editor.autoClosingComments", label: "Auto Closing Comments", type: "select", value: "languageDefined", options: ["always", "languageDefined", "beforeWhitespace", "never"], desc: "Auto-close block comments.", group: "Brackets", category: "Text Editor", tags: ["bracket", "auto"] },
  { id: "editor.autoClosingDelete", label: "Auto Closing Delete", type: "select", value: "auto", options: ["auto", "always", "never"], desc: "Backspace behavior near auto-closed pairs.", group: "Brackets", category: "Text Editor", tags: ["bracket", "auto"] },
  { id: "editor.autoClosingOvertype", label: "Auto Closing Overtype", type: "select", value: "auto", options: ["auto", "always", "never"], desc: "Type over closing brackets/quotes.", group: "Brackets", category: "Text Editor", tags: ["bracket", "auto"] },
  { id: "editor.autoSurround", label: "Auto Surround", type: "select", value: "languageDefined", options: ["languageDefined", "quotes", "brackets", "never"], desc: "Surround selected text with brackets/quotes.", group: "Brackets", category: "Text Editor", tags: ["bracket", "auto"] },

  // ── Folding ────────────────────────────────────────────
  { id: "editor.folding", label: "Folding", type: "checkbox", value: "true", desc: "Enable code folding.", group: "Folding", category: "Text Editor", tags: ["fold"] },
  { id: "editor.foldingStrategy", label: "Folding Strategy", type: "select", value: "auto", options: ["auto", "indentation"], desc: "Folding strategy.", group: "Folding", category: "Text Editor", tags: ["fold"] },
  { id: "editor.showFoldingControls", label: "Show Folding Controls", type: "select", value: "mouseover", options: ["always", "never", "mouseover"], desc: "When to show fold controls.", group: "Folding", category: "Text Editor", tags: ["fold"] },
  { id: "editor.foldingHighlight", label: "Folding Highlight", type: "checkbox", value: "true", desc: "Highlight folded regions.", group: "Folding", category: "Text Editor", tags: ["fold"] },
  { id: "editor.foldingImportsByDefault", label: "Fold Imports by Default", type: "checkbox", value: "true", desc: "Auto fold import statements.", group: "Folding", category: "Text Editor", tags: ["fold"] },
  { id: "editor.foldingMaximumRegions", label: "Max Foldable Regions", type: "number", value: "5000", desc: "Maximum number of foldable regions.", group: "Folding", category: "Text Editor", tags: ["fold"] },
  { id: "editor.unfoldOnClickAfterEndOfLine", label: "Unfold On Click After EOL", type: "checkbox", value: "false", desc: "Unfold when clicking after end of folded line.", group: "Folding", category: "Text Editor", tags: ["fold"] },

  // ── Line Numbers & Gutter ──────────────────────────────
  { id: "editor.lineNumbers", label: "Line Numbers", type: "select", value: "on", options: ["on", "off", "relative", "interval"], desc: "Controls line number display.", group: "Line Numbers", category: "Text Editor", tags: ["line numbers"] },
  { id: "editor.lineNumbersMinChars", label: "Line Numbers Min Chars", type: "number", value: "5", desc: "Min chars reserved for line numbers.", group: "Line Numbers", category: "Text Editor", tags: ["line numbers"] },
  { id: "editor.glyphMargin", label: "Glyph Margin", type: "checkbox", value: "true", desc: "Render the glyph margin.", group: "Line Numbers", category: "Text Editor", tags: ["glyph"] },
  { id: "editor.selectOnLineNumbers", label: "Select On Line Numbers", type: "checkbox", value: "true", desc: "Select line when clicking line number.", group: "Line Numbers", category: "Text Editor", tags: ["line numbers"] },
  { id: "editor.rulers", label: "Rulers", type: "text", value: "", desc: "Vertical ruler columns (comma-separated numbers, e.g. 80,120).", group: "Line Numbers", category: "Text Editor", tags: ["rulers"] },

  // ── Selection & Highlighting ───────────────────────────
  { id: "editor.selectionHighlight", label: "Selection Highlight", type: "checkbox", value: "true", desc: "Highlight matching text on selection.", group: "Selection", category: "Text Editor", tags: ["selection", "highlight"] },
  { id: "editor.occurrencesHighlight", label: "Occurrences Highlight", type: "select", value: "singleFile", options: ["off", "singleFile", "multiFile"], desc: "Highlight semantic occurrences.", group: "Selection", category: "Text Editor", tags: ["selection", "highlight"] },
  { id: "editor.columnSelection", label: "Column Selection", type: "checkbox", value: "false", desc: "Enable column (box) selection mode.", group: "Selection", category: "Text Editor", tags: ["selection"] },
  { id: "editor.roundedSelection", label: "Rounded Selection", type: "checkbox", value: "true", desc: "Rounded selection borders.", group: "Selection", category: "Text Editor", tags: ["selection"] },
  { id: "editor.linkedEditing", label: "Linked Editing", type: "checkbox", value: "false", desc: "Rename matching tag pairs automatically.", group: "Selection", category: "Text Editor", tags: ["selection", "html"] },

  // ── Multi-Cursor ───────────────────────────────────────
  { id: "editor.multiCursorModifier", label: "Multi-Cursor Modifier", type: "select", value: "alt", options: ["ctrlCmd", "alt"], desc: "Modifier key for adding cursors.", group: "Multi-Cursor", category: "Text Editor", tags: ["cursor", "multi"] },
  { id: "editor.multiCursorMergeOverlapping", label: "Merge Overlapping Cursors", type: "checkbox", value: "true", desc: "Merge overlapping multi-cursor selections.", group: "Multi-Cursor", category: "Text Editor", tags: ["cursor", "multi"] },
  { id: "editor.multiCursorPaste", label: "Multi-Cursor Paste", type: "select", value: "spread", options: ["spread", "full"], desc: "How to paste with multiple cursors.", group: "Multi-Cursor", category: "Text Editor", tags: ["cursor", "multi"] },

  // ── Clipboard ──────────────────────────────────────────
  { id: "editor.copyWithSyntaxHighlighting", label: "Copy With Syntax Highlighting", type: "checkbox", value: "true", desc: "Copy with syntax highlighting.", group: "Clipboard", category: "Text Editor", tags: ["clipboard"] },
  { id: "editor.emptySelectionClipboard", label: "Empty Selection Clipboard", type: "checkbox", value: "true", desc: "Copy current line when no selection.", group: "Clipboard", category: "Text Editor", tags: ["clipboard"] },

  // ── Hover ──────────────────────────────────────────────
  { id: "editor.hover.enabled", label: "Hover Enabled", type: "checkbox", value: "true", desc: "Controls whether the hover widget is shown.", group: "Hover", category: "Text Editor", tags: ["hover"] },
  { id: "editor.hover.delay", label: "Hover Delay", type: "number", value: "300", desc: "Delay in ms before showing hover.", group: "Hover", category: "Text Editor", tags: ["hover"] },

  // ── Code Lens ──────────────────────────────────────────
  { id: "editor.codeLens", label: "Code Lens", type: "checkbox", value: "true", desc: "Show code lens references.", group: "Code Lens", category: "Text Editor", tags: ["codelens"] },
  { id: "editor.codeLensFontFamily", label: "Code Lens Font Family", type: "text", value: "", desc: "Code lens font family (empty = editor font).", group: "Code Lens", category: "Text Editor", tags: ["codelens", "font"] },
  { id: "editor.codeLensFontSize", label: "Code Lens Font Size", type: "number", value: "0", desc: "Code lens font size (0 = 90% of editor font).", group: "Code Lens", category: "Text Editor", tags: ["codelens", "font"] },

  // ── Links ──────────────────────────────────────────────
  { id: "editor.links", label: "Links", type: "checkbox", value: "true", desc: "Detect and render clickable links.", group: "Links", category: "Text Editor", tags: ["links"] },

  // ── Find ───────────────────────────────────────────────
  { id: "editor.find.seedSearchStringFromSelection", label: "Seed Search From Selection", type: "select", value: "always", options: ["never", "always", "selection"], desc: "Populate search field from editor selection.", group: "Find", category: "Text Editor", tags: ["find", "search"] },
  { id: "editor.find.autoFindInSelection", label: "Auto Find In Selection", type: "select", value: "never", options: ["never", "always", "multiline"], desc: "Auto constrain search to selection.", group: "Find", category: "Text Editor", tags: ["find", "search"] },

  // ── Padding ────────────────────────────────────────────
  { id: "editor.padding.top", label: "Padding Top", type: "number", value: "8", desc: "Top padding in pixels.", group: "Padding", category: "Text Editor", tags: ["padding"] },
  { id: "editor.padding.bottom", label: "Padding Bottom", type: "number", value: "8", desc: "Bottom padding in pixels.", group: "Padding", category: "Text Editor", tags: ["padding"] },

  // ── Drag & Drop ────────────────────────────────────────
  { id: "editor.dragAndDrop", label: "Drag and Drop", type: "checkbox", value: "false", desc: "Drag and drop text selections.", group: "Misc", category: "Text Editor", tags: ["drag"] },

  // ── Accessibility ──────────────────────────────────────
  { id: "editor.accessibilitySupport", label: "Accessibility Support", type: "select", value: "auto", options: ["auto", "off", "on"], desc: "Enable accessibility support for screen readers.", group: "Accessibility", category: "Text Editor", tags: ["accessibility"] },

  // ── Inlay Hints ────────────────────────────────────────
  { id: "editor.inlayHints.enabled", label: "Inlay Hints", type: "select", value: "on", options: ["on", "off", "onUnlessPressed", "offUnlessPressed"], desc: "Enable inlay hints in the editor.", group: "Inlay Hints", category: "Text Editor", tags: ["inlay"] },

  // ── Unicode ────────────────────────────────────────────
  { id: "editor.unicodeHighlight.ambiguousCharacters", label: "Highlight Ambiguous Unicode", type: "checkbox", value: "true", desc: "Highlight ambiguous unicode characters.", group: "Unicode", category: "Text Editor", tags: ["unicode", "security"] },

  // ── Performance ────────────────────────────────────────
  { id: "editor.largeFileOptimizations", label: "Large File Optimizations", type: "checkbox", value: "true", desc: "Disable memory-intensive features for large files.", group: "Performance", category: "Text Editor", tags: ["performance"] },
  { id: "editor.maxTokenizationLineLength", label: "Max Tokenization Line Length", type: "number", value: "20000", desc: "Max line length for tokenization.", group: "Performance", category: "Text Editor", tags: ["performance"] },
  { id: "editor.stopRenderingLineAfter", label: "Stop Rendering Line After", type: "number", value: "10000", desc: "Stop rendering line after x characters.", group: "Performance", category: "Text Editor", tags: ["performance"] },

  // ── Peek ───────────────────────────────────────────────
  { id: "editor.stablePeek", label: "Stable Peek", type: "checkbox", value: "false", desc: "Keep peek editors open when double-clicking.", group: "Peek", category: "Text Editor", tags: ["peek"] },
  { id: "editor.peekWidgetDefaultFocus", label: "Peek Widget Focus", type: "select", value: "tree", options: ["tree", "editor"], desc: "Default focus in peek widget.", group: "Peek", category: "Text Editor", tags: ["peek"] },
  { id: "editor.definitionLinkOpensInPeek", label: "Definition Opens In Peek", type: "checkbox", value: "false", desc: "Ctrl+click opens in peek instead of navigate.", group: "Peek", category: "Text Editor", tags: ["peek"] },

  // ── Miscellaneous ──────────────────────────────────────
  { id: "editor.wordSeparators", label: "Word Separators", type: "text", value: "`~!@#$%^&*()-=+[{]}\\|;:'\",.<>/?", desc: "Characters used as word separators for navigation.", group: "Misc", category: "Text Editor", tags: ["word"] },
  { id: "editor.contextmenu", label: "Context Menu", type: "checkbox", value: "true", desc: "Show custom context menu in editor.", group: "Misc", category: "Text Editor", tags: ["menu"] },
  { id: "editor.mouseStyle", label: "Mouse Style", type: "select", value: "text", options: ["text", "default", "copy"], desc: "Mouse pointer style.", group: "Misc", category: "Text Editor", tags: ["mouse"] },

  // ── Diff Editor ────────────────────────────────────────
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
    id: def.id ?? name,
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
