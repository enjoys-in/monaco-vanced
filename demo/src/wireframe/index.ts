// ── Wireframe entry — mounts plugin-driven IDE chrome ───────

import type { EventBus } from "@enjoys/monaco-vanced/core/event-bus";
import type { WireframeAPIs, VirtualFile } from "./types";
import type { MockFsAPI } from "../mock-fs";
import type { SidebarExtras } from "./layout/sidebar/index";
import { FileEvents, SettingsEvents, TabEvents, WelcomeEvents, TitlebarEvents, MarketplaceEvents } from "@enjoys/monaco-vanced/core/events";

// Layout
import { buildReactShell, unmountReactShell } from "../components/mount";
import { wireSidebarVisibility } from "./layout/sidebar-visibility";
import { wireSidebar, wireResizeHandle } from "./layout/sidebar/index";

// Panels

export type { WireframeAPIs, VirtualFile } from "./types";

export type { SidebarExtras as WireframeExtras } from "./layout/sidebar/index";

// ── Settings URI constant for tab integration ────────────────
const SETTINGS_URI = "__settings__";
const EXT_DETAIL_URI = "__ext-detail__";

const OPENVSX = "https://open-vsx.org/api";

// ── Extension detail panel renderer ──────────────────────────
function renderExtDetailContent(
  container: HTMLElement,
  ext: { id: string; name: string },
  eventBus: InstanceType<typeof EventBus>,
) {
  container.innerHTML = "";
  container.style.overflowY = "auto";
  const [ns, extName] = ext.id.includes(".") ? ext.id.split(".", 2) : ["unknown", ext.id];

  // loading state
  container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--vsc-fg-dim);font-size:13px;">Loading extension details…</div>`;

  fetch(`${OPENVSX}/api/${ns}/${extName}`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .then((data: any) => {
      container.innerHTML = "";
      const wrap = document.createElement("div");
      wrap.style.cssText = "max-width:780px;margin:0 auto;padding:28px 32px 40px;";

      // ── Header row ──
      const header = document.createElement("div");
      header.style.cssText = "display:flex;align-items:flex-start;gap:16px;margin-bottom:24px;";

      // icon
      const iconUrl = data.files?.icon;
      const iconEl = document.createElement("div");
      iconEl.style.cssText = "width:64px;height:64px;min-width:64px;border-radius:10px;overflow:hidden;background:var(--vsc-card-bg);display:flex;align-items:center;justify-content:center;";
      if (iconUrl) {
        const img = document.createElement("img");
        img.src = iconUrl;
        img.width = 64; img.height = 64;
        img.style.cssText = "object-fit:cover;border-radius:10px;";
        img.onerror = () => { img.remove(); iconEl.textContent = (data.displayName || extName).charAt(0).toUpperCase(); iconEl.style.cssText += "font-size:28px;font-weight:700;color:var(--vsc-accent);"; };
        iconEl.appendChild(img);
      } else {
        iconEl.textContent = (data.displayName || extName).charAt(0).toUpperCase();
        iconEl.style.cssText += "font-size:28px;font-weight:700;color:var(--vsc-accent);";
      }

      const meta = document.createElement("div");
      meta.style.cssText = "flex:1;min-width:0;";
      meta.innerHTML = `
        <div style="font-size:20px;font-weight:600;color:var(--vsc-fg);margin-bottom:4px;">${esc(data.displayName || extName)}</div>
        <div style="font-size:12px;color:var(--vsc-fg-dim);margin-bottom:6px;">${esc(ns)} · v${esc(data.version || "0.0.0")}</div>
        <div style="font-size:13px;color:var(--vsc-fg-dim);line-height:1.4;">${esc(data.description || "")}</div>
      `;

      // install button
      const installBtn = document.createElement("button");
      installBtn.className = "vsc-btn vsc-btn-primary";
      installBtn.style.cssText = "flex-shrink:0;font-size:12px;padding:6px 18px;margin-top:4px;";
      installBtn.textContent = "Install";
      installBtn.addEventListener("click", () => {
        installBtn.textContent = "Installed";
        installBtn.className = "vsc-btn vsc-btn-secondary";
        installBtn.setAttribute("disabled", "true");
        eventBus.emit(MarketplaceEvents.InstallStart, { id: ext.id });
      });

      header.append(iconEl, meta, installBtn);
      wrap.appendChild(header);

      // ── Stats bar ──
      const stats = document.createElement("div");
      stats.style.cssText = "display:flex;gap:20px;padding:12px 0;border-top:1px solid var(--vsc-border);border-bottom:1px solid var(--vsc-border);margin-bottom:20px;font-size:12px;color:var(--vsc-fg-dim);";
      const dl = data.downloadCount ?? 0;
      const dlStr = dl >= 1_000_000 ? `${(dl / 1_000_000).toFixed(1)}M` : dl >= 1_000 ? `${(dl / 1_000).toFixed(0)}K` : String(dl);
      const cats = (data.categories || []).join(", ") || "—";
      const license = data.license || "—";
      stats.innerHTML = `<span><strong>Downloads:</strong> ${esc(dlStr)}</span><span><strong>License:</strong> ${esc(license)}</span><span><strong>Categories:</strong> ${esc(cats)}</span>`;
      wrap.appendChild(stats);

      // ── README / description body ──
      const body = document.createElement("div");
      body.style.cssText = "font-size:13px;line-height:1.6;color:var(--vsc-fg);";
      body.className = "ext-detail-readme";

      const readmeUrl = data.files?.readme;
      if (readmeUrl) {
        body.innerHTML = `<p style="color:var(--vsc-fg-dim);">Loading README…</p>`;
        fetch(readmeUrl)
          .then((r) => (r.ok ? r.text() : ""))
          .then((md) => {
            // Basic markdown-to-html: headings, bold, code blocks, links, paragraphs
            body.innerHTML = simpleMarkdown(md);
          })
          .catch(() => { body.innerHTML = `<p>${esc(data.description || "No README available.")}</p>`; });
      } else {
        body.innerHTML = `<p>${esc(data.description || "No additional details available.")}</p>`;
      }
      wrap.appendChild(body);
      container.appendChild(wrap);
    })
    .catch((err) => {
      container.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--vsc-fg-dim);font-size:13px;gap:8px;"><div style="color:var(--vsc-error-red);">Failed to load extension details</div><div>${esc(String((err as Error).message))}</div></div>`;
    });
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function simpleMarkdown(md: string): string {
  let html = md
    // code blocks
    .replace(/```[\s\S]*?```/g, (m) => {
      const code = m.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
      return `<pre style="background:var(--vsc-card-bg);border:1px solid var(--vsc-border);border-radius:6px;padding:12px;overflow-x:auto;font-size:12px;font-family:'JetBrains Mono','Fira Code',monospace;"><code>${esc(code)}</code></pre>`;
    })
    // inline code
    .replace(/`([^`]+)`/g, `<code style="background:var(--vsc-card-bg);padding:1px 4px;border-radius:3px;font-size:12px;">$1</code>`)
    // images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, `<img src="$2" alt="$1" style="max-width:100%;border-radius:4px;margin:8px 0;" />`)
    // links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" target="_blank" rel="noopener" style="color:var(--vsc-text-link);">$1</a>`)
    // headings
    .replace(/^#### (.+)$/gm, `<h4 style="font-size:14px;font-weight:600;margin:16px 0 8px;color:var(--vsc-fg);">$1</h4>`)
    .replace(/^### (.+)$/gm, `<h3 style="font-size:15px;font-weight:600;margin:20px 0 8px;color:var(--vsc-fg);">$1</h3>`)
    .replace(/^## (.+)$/gm, `<h2 style="font-size:17px;font-weight:600;margin:24px 0 10px;color:var(--vsc-fg);">$1</h2>`)
    .replace(/^# (.+)$/gm, `<h1 style="font-size:20px;font-weight:600;margin:28px 0 12px;color:var(--vsc-fg);">$1</h1>`)
    // bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // horizontal rule
    .replace(/^---+$/gm, `<hr style="border:none;border-top:1px solid var(--vsc-border);margin:16px 0;" />`)
    // unordered lists
    .replace(/^[*-] (.+)$/gm, `<li style="margin-left:20px;margin-bottom:4px;">$1</li>`)
    // line breaks → paragraphs
    .replace(/\n{2,}/g, "</p><p style=\"margin:8px 0;\">")
    .replace(/\n/g, "<br/>");
  return `<p style="margin:8px 0;">${html}</p>`;
}

// ── React panel visibility wiring (show/hide containers) ─────
function wireReactPanelVisibility(
  dom: import("./types").DOMRefs,
  eventBus: InstanceType<typeof import("@enjoys/monaco-vanced/core/event-bus").EventBus>,
  on: (ev: string, fn: (p: unknown) => void) => void,
  files: VirtualFile[],
) {
  let settingsOpen = false;
  let welcomeVisible = true;
  let extDetailOpen = false;

  function showWelcome() {
    welcomeVisible = true;
    dom.welcomePage.style.display = "flex";
    dom.editorContainer.style.display = "none";
    dom.settingsWebview.style.display = "none";
    dom.extensionDetailWebview.style.display = "none";
    dom.tabBar.style.display = "none";
    dom.breadcrumbBar.style.display = "none";
    eventBus.emit(TitlebarEvents.Update, { fileName: "Welcome" });
    document.title = "Welcome — Monaco Vanced";
  }

  function hideWelcome() {
    if (!welcomeVisible) return;
    welcomeVisible = false;
    dom.welcomePage.style.display = "none";
    dom.editorContainer.style.display = "";
    dom.tabBar.style.display = "";
    dom.breadcrumbBar.style.display = "";
  }

  function openSettings() {
    settingsOpen = true;
    if (extDetailOpen) closeExtDetail();
    dom.settingsWebview.style.display = "flex";
    dom.editorContainer.style.display = "none";
    dom.welcomePage.style.display = "none";
    dom.breadcrumbBar.style.display = "none";
    eventBus.emit(TabEvents.OpenSpecial, { uri: SETTINGS_URI, label: "Settings" });
  }

  function closeSettings() {
    if (!settingsOpen) return;
    settingsOpen = false;
    dom.settingsWebview.style.display = "none";
    dom.editorContainer.style.display = "";
    dom.breadcrumbBar.style.display = "";
  }

  function openExtDetail(ext?: { id: string; name: string }) {
    extDetailOpen = true;
    if (settingsOpen) closeSettings();
    hideWelcome();
    dom.extensionDetailWebview.style.display = "flex";
    dom.editorContainer.style.display = "none";
    dom.breadcrumbBar.style.display = "none";
    const label = ext?.name ? `Extension: ${ext.name}` : "Extension Details";
    eventBus.emit(TabEvents.OpenSpecial, { uri: EXT_DETAIL_URI, label });
  }

  function closeExtDetail() {
    if (!extDetailOpen) return;
    extDetailOpen = false;
    dom.extensionDetailWebview.style.display = "none";
    dom.editorContainer.style.display = "";
    dom.breadcrumbBar.style.display = "";
  }

  // Show welcome on startup
  showWelcome();

  on(FileEvents.Open, (p) => {
    const { uri } = p as { uri: string };
    if (uri !== SETTINGS_URI && uri !== EXT_DETAIL_URI) {
      hideWelcome();
      if (settingsOpen) closeSettings();
      if (extDetailOpen) closeExtDetail();
    }
  });

  on(SettingsEvents.UIOpen, () => {
    hideWelcome();
    openSettings();
  });

  on(MarketplaceEvents.OpenDetail, (p) => {
    const ext = p as { id: string; name: string };
    openExtDetail(ext);
    renderExtDetailContent(dom.extensionDetailWebview, ext, eventBus);
  });

  on(TabEvents.SwitchSpecial, (p) => {
    const { uri } = p as { uri: string };
    if (uri === SETTINGS_URI) openSettings();
    if (uri === EXT_DETAIL_URI) {
      extDetailOpen = true;
      if (settingsOpen) closeSettings();
      dom.extensionDetailWebview.style.display = "flex";
      dom.editorContainer.style.display = "none";
      dom.breadcrumbBar.style.display = "none";
    }
  });

  on(WelcomeEvents.Show, () => {
    if (settingsOpen) closeSettings();
    if (extDetailOpen) closeExtDetail();
    showWelcome();
  });
}

export function mountWireframe(
  root: HTMLElement,
  apis: WireframeAPIs,
  eventBus: InstanceType<typeof EventBus>,
  files: VirtualFile[],
  mockFs?: MockFsAPI,
  extras?: SidebarExtras,
): {
  editorContainer: HTMLElement;
  settingsEl: HTMLElement;
  welcomeEl: HTMLElement;
  tabListEl: HTMLElement;
  breadcrumbEl: HTMLElement;
  titleCenterEl: HTMLElement;
  activityBarEl: HTMLElement;
  statusBarEl: HTMLElement;
  sidebarEl: HTMLElement;
  destroy: () => void;
} {
  const dom = buildReactShell(root, eventBus, {
    authApi: extras?.authApi,
    commandApi: apis.command,
    statusbarApi: apis.statusbar,
    contextMenuApi: apis.contextMenu,
    aiApi: extras?.aiApi,
    indexerApi: extras?.indexerApi,
    files,
  });
  const disposers: (() => void)[] = [];
  const on = (ev: string, fn: (p: unknown) => void) => {
    eventBus.on(ev, fn);
    disposers.push(() => eventBus.off(ev, fn));
  };

  wireSidebarVisibility(dom, on);
  wireSidebar(dom, apis, eventBus, on, files, mockFs, extras);

  wireReactPanelVisibility(dom, eventBus, on, files);

  wireResizeHandle(dom);

  return {
    editorContainer: dom.editorContainer,
    settingsEl: dom.settingsWebview,
    welcomeEl: dom.welcomePage,
    tabListEl: dom.tabList,
    breadcrumbEl: dom.breadcrumbBar,
    titleCenterEl: dom.titleCenter,
    activityBarEl: dom.activityBar,
    statusBarEl: dom.statusBar,
    sidebarEl: dom.sidebarContainer,
    destroy: () => { disposers.forEach((d) => d()); unmountReactShell(); dom.root.innerHTML = ""; },
  };
}
