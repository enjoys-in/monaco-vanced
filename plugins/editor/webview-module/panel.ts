// ── Webview Panel Implementation ────────────────────────────
// Concrete WebviewPanel with visibility, messaging, lifecycle,
// and event dispatch via the plugin event bus.

import type { IDisposable, PluginContext } from "@core/types";
import { WebviewEvents } from "@core/events";
import type {
  WebviewLocation,
  WebviewMessage,
  WebviewPanel,
  WebviewPanelOptions,
} from "./types";

type Handler<T = void> = (arg: T) => void;

function createDisposableSet<T>(handlers: Set<Handler<T>>): (handler: Handler<T>) => IDisposable {
  return (handler: Handler<T>): IDisposable => {
    handlers.add(handler);
    return { dispose: () => handlers.delete(handler) };
  };
}

export class WebviewPanelImpl implements WebviewPanel {
  readonly id: string;
  readonly location: WebviewLocation;

  private _title: string;
  private _visible = false;
  private _disposed = false;
  private _badge: string | number | null = null;
  private _initialData: unknown = undefined;
  private _loaderData: unknown = undefined;

  private readonly _messageHandlers = new Set<Handler<WebviewMessage>>();
  private readonly _showHandlers = new Set<Handler<void>>();
  private readonly _hideHandlers = new Set<Handler<void>>();
  private readonly _disposeHandlers = new Set<Handler<void>>();

  private readonly _options: WebviewPanelOptions;
  private readonly _ctx: PluginContext;

  constructor(options: WebviewPanelOptions, ctx: PluginContext) {
    this._options = options;
    this._ctx = ctx;
    this.id = options.id;
    this._title = options.title;
    this.location = options.location;
  }

  get title(): string {
    return this._title;
  }

  get visible(): boolean {
    return this._visible;
  }

  get disposed(): boolean {
    return this._disposed;
  }

  get initialData(): unknown {
    return this._initialData;
  }

  get loaderData(): unknown {
    return this._loaderData;
  }

  get badge(): string | number | null {
    return this._badge;
  }

  get options(): WebviewPanelOptions {
    return this._options;
  }

  // ── Internal setters (used by manager) ─────────────────

  _setInitialData(data: unknown): void {
    this._initialData = data;
  }

  _setLoaderData(data: unknown): void {
    this._loaderData = data;
  }

  _setVisible(visible: boolean): void {
    this._visible = visible;
  }

  // ── Visibility ─────────────────────────────────────────

  show(): void {
    if (this._disposed) return;
    this._visible = true;
    this._ctx.emit(WebviewEvents.Show, { id: this.id });
    for (const h of this._showHandlers) h();
  }

  hide(): void {
    if (this._disposed) return;
    this._visible = false;
    this._ctx.emit(WebviewEvents.Hide, { id: this.id });
    for (const h of this._hideHandlers) h();
  }

  toggle(): void {
    if (this._visible) this.hide();
    else this.show();
  }

  focus(): void {
    if (this._disposed) return;
    this.show();
    // Emit focus event for layout system to handle
    this._ctx.emit(WebviewEvents.Focus, { id: this.id });
  }

  // ── Messaging ──────────────────────────────────────────

  postMessage(msg: WebviewMessage): void {
    if (this._disposed) return;
    this._ctx.emit(WebviewEvents.Post, { id: this.id, message: msg });
  }

  onMessage(handler: (msg: WebviewMessage) => void): IDisposable {
    return createDisposableSet(this._messageHandlers)(handler);
  }

  /** @internal — called by the bridge when the iframe sends a message */
  _receiveMessage(msg: WebviewMessage): void {
    this._ctx.emit(WebviewEvents.Message, { id: this.id, message: msg });
    for (const h of this._messageHandlers) h(msg);
  }

  // ── Lifecycle ──────────────────────────────────────────

  async reload(): Promise<void> {
    if (this._disposed) return;
    if (!this._options.loader) return;

    this._ctx.emit(WebviewEvents.LoaderStart, { id: this.id });
    try {
      const data = await this._options.loader(this._ctx);
      this._loaderData = data;
      this._ctx.emit(WebviewEvents.LoaderDone, { id: this.id, data });
    } catch (error) {
      this._ctx.emit(WebviewEvents.Error, { id: this.id, phase: "loader", error });
    }
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._visible = false;
    this._ctx.emit(WebviewEvents.Dispose, { id: this.id });
    for (const h of this._disposeHandlers) h();
    this._messageHandlers.clear();
    this._showHandlers.clear();
    this._hideHandlers.clear();
    this._disposeHandlers.clear();
  }

  // ── Events ─────────────────────────────────────────────

  onDidShow(handler: () => void): IDisposable {
    return createDisposableSet(this._showHandlers)(handler);
  }

  onDidHide(handler: () => void): IDisposable {
    return createDisposableSet(this._hideHandlers)(handler);
  }

  onDidDispose(handler: () => void): IDisposable {
    return createDisposableSet(this._disposeHandlers)(handler);
  }

  // ── Metadata ───────────────────────────────────────────

  setTitle(title: string): void {
    this._title = title;
  }

  setBadge(text: string | number): void {
    this._badge = text;
  }

  clearBadge(): void {
    this._badge = null;
  }
}
