// ── Security Module — Sanitizer ───────────────────────────────

const SAFE_TAGS = new Set([
  "a", "b", "i", "em", "strong", "p", "br", "hr", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6", "span", "div", "pre", "code",
  "blockquote", "table", "thead", "tbody", "tr", "th", "td",
  "img", "figure", "figcaption", "details", "summary", "mark", "small",
]);

const SAFE_ATTRS = new Set([
  "class", "id", "href", "src", "alt", "title", "width", "height",
  "target", "rel", "colspan", "rowspan", "role", "aria-label",
]);

const EVENT_HANDLER_RE = /^on[a-z]+$/i;
const DATA_URI_RE = /^data:(?!image\/(?:png|jpeg|gif|svg\+xml|webp))/i;
const SCRIPT_TAG_RE = /<script[\s>][\s\S]*?<\/script\s*>/gi;
const SCRIPT_SELF_CLOSE_RE = /<script[^>]*\/>/gi;

export function sanitizeHTML(html: string): string {
  // Strip script tags entirely
  let clean = html.replace(SCRIPT_TAG_RE, "").replace(SCRIPT_SELF_CLOSE_RE, "");

  // Use DOMParser for robust cleaning
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(clean, "text/html");
    sanitizeNode(doc.body);
    return doc.body.innerHTML;
  }

  // Fallback: strip all tags that aren't safe
  return stripUnsafeTags(clean);
}

function sanitizeNode(node: Node): void {
  const toRemove: Node[] = [];

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();

      if (!SAFE_TAGS.has(tag)) {
        toRemove.push(child);
        continue;
      }

      // Remove unsafe attributes
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (EVENT_HANDLER_RE.test(name)) {
          el.removeAttribute(attr.name);
        } else if (!SAFE_ATTRS.has(name)) {
          el.removeAttribute(attr.name);
        } else if ((name === "href" || name === "src") && DATA_URI_RE.test(attr.value)) {
          el.removeAttribute(attr.name);
        }
      }

      // Sanitize href for javascript: protocol
      if (el.hasAttribute("href")) {
        const href = el.getAttribute("href") ?? "";
        if (href.trimStart().toLowerCase().startsWith("javascript:")) {
          el.removeAttribute("href");
        }
      }

      sanitizeNode(el);
    }
  }

  for (const n of toRemove) node.removeChild(n);
}

function stripUnsafeTags(html: string): string {
  return html.replace(/<\/?([a-z][a-z0-9]*)[^>]*>/gi, (match, tag: string) => {
    return SAFE_TAGS.has(tag.toLowerCase()) ? match : "";
  });
}
