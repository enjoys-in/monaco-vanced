// ── Virtual list — core virtual scroll engine ───────────────
// Renders only visible rows + overscan buffer. All other rows are empty padding.

import type { VirtualListConfig, VirtualHandle, VirtualScrollState } from "./types";

export function createVirtualList(config: VirtualListConfig): VirtualHandle {
  const {
    container,
    renderItem,
    overscan = 5,
  } = config;

  let itemCount = config.itemCount;
  let itemHeight = config.itemHeight;
  let state: VirtualScrollState = { scrollTop: 0, startIndex: 0, endIndex: 0, visibleCount: 0 };
  let disposed = false;

  // Create inner wrapper for total height
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.overflow = "hidden";
  container.style.overflow = "auto";
  container.appendChild(wrapper);

  // Content holder
  const content = document.createElement("div");
  content.style.position = "absolute";
  content.style.left = "0";
  content.style.right = "0";
  wrapper.appendChild(content);

  const getItemHeight = (index: number): number =>
    typeof itemHeight === "function" ? itemHeight(index) : itemHeight;

  const getTotalHeight = (): number => {
    if (typeof itemHeight === "number") return itemCount * itemHeight;
    let total = 0;
    for (let i = 0; i < itemCount; i++) total += getItemHeight(i);
    return total;
  };

  const getOffsetForIndex = (index: number): number => {
    if (typeof itemHeight === "number") return index * itemHeight;
    let offset = 0;
    for (let i = 0; i < index; i++) offset += getItemHeight(i);
    return offset;
  };

  const getStartIndex = (scrollTop: number): number => {
    if (typeof itemHeight === "number") {
      return Math.floor(scrollTop / itemHeight);
    }
    let offset = 0;
    for (let i = 0; i < itemCount; i++) {
      if (offset + getItemHeight(i) > scrollTop) return i;
      offset += getItemHeight(i);
    }
    return itemCount - 1;
  };

  function render() {
    if (disposed) return;

    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;

    // Calculate total height
    const totalHeight = getTotalHeight();
    wrapper.style.height = `${totalHeight}px`;

    // Calculate visible range
    let startIndex = Math.max(0, getStartIndex(scrollTop) - overscan);
    let endIndex = startIndex;

    let accum = getOffsetForIndex(startIndex);
    while (endIndex < itemCount && accum < scrollTop + viewportHeight) {
      accum += getItemHeight(endIndex);
      endIndex++;
    }
    endIndex = Math.min(itemCount, endIndex + overscan);

    state = {
      scrollTop,
      startIndex,
      endIndex,
      visibleCount: endIndex - startIndex,
    };

    // Clear and re-render
    content.innerHTML = "";
    content.style.top = `${getOffsetForIndex(startIndex)}px`;

    for (let i = startIndex; i < endIndex; i++) {
      const el = renderItem(i);
      el.style.height = `${getItemHeight(i)}px`;
      el.style.boxSizing = "border-box";
      content.appendChild(el);
    }
  }

  // Scroll listener
  const onScroll = () => {
    requestAnimationFrame(render);
  };
  container.addEventListener("scroll", onScroll, { passive: true });

  // Initial render
  render();

  return {
    scrollToIndex(index: number, align = "start") {
      const offset = getOffsetForIndex(index);
      const viewportHeight = container.clientHeight;
      const h = getItemHeight(index);

      let scrollTarget: number;
      switch (align) {
        case "center":
          scrollTarget = offset - viewportHeight / 2 + h / 2;
          break;
        case "end":
          scrollTarget = offset - viewportHeight + h;
          break;
        default:
          scrollTarget = offset;
      }
      container.scrollTop = Math.max(0, scrollTarget);
    },

    setItemCount(count: number) {
      itemCount = count;
      render();
    },

    refresh() {
      render();
    },

    getVisibleRange() {
      return { start: state.startIndex, end: state.endIndex };
    },

    dispose() {
      disposed = true;
      container.removeEventListener("scroll", onScroll);
      wrapper.remove();
    },
  };
}
