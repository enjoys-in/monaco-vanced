// ── Tree Component Logic ───────────────────────────────────
// Headless tree state: expand/collapse, selection, filtering.

import type { TreeConfig, TreeNode } from "../types";

export class TreeState {
  private roots: TreeNode[];
  private expanded = new Set<string>();
  private selected = new Set<string>();
  private multiSelect: boolean;
  private filter: string;

  constructor(config: TreeConfig) {
    this.roots = config.roots;
    this.multiSelect = config.multiSelect ?? false;
    this.filter = config.filter ?? "";
    this.initExpanded(config.roots);
  }

  private initExpanded(nodes: TreeNode[]): void {
    for (const node of nodes) {
      if (node.expanded) this.expanded.add(node.id);
      if (node.selected) this.selected.add(node.id);
      if (node.children) this.initExpanded(node.children);
    }
  }

  // ── Expand / Collapse ───────────────────────────────────

  toggleExpand(nodeId: string): void {
    if (this.expanded.has(nodeId)) {
      this.expanded.delete(nodeId);
    } else {
      this.expanded.add(nodeId);
    }
  }

  expand(nodeId: string): void {
    this.expanded.add(nodeId);
  }

  collapse(nodeId: string): void {
    this.expanded.delete(nodeId);
  }

  isExpanded(nodeId: string): boolean {
    return this.expanded.has(nodeId);
  }

  expandAll(): void {
    this.walkNodes(this.roots, (node) => {
      if (node.children && node.children.length > 0) {
        this.expanded.add(node.id);
      }
    });
  }

  collapseAll(): void {
    this.expanded.clear();
  }

  // ── Selection ───────────────────────────────────────────

  select(nodeId: string): void {
    if (!this.multiSelect) {
      this.selected.clear();
    }
    this.selected.add(nodeId);
  }

  deselect(nodeId: string): void {
    this.selected.delete(nodeId);
  }

  toggleSelect(nodeId: string): void {
    if (this.selected.has(nodeId)) {
      this.deselect(nodeId);
    } else {
      this.select(nodeId);
    }
  }

  isSelected(nodeId: string): boolean {
    return this.selected.has(nodeId);
  }

  getSelected(): string[] {
    return Array.from(this.selected);
  }

  // ── Filter ──────────────────────────────────────────────

  setFilter(filter: string): void {
    this.filter = filter;
  }

  getVisibleNodes(): TreeNode[] {
    if (!this.filter) return this.roots;
    return this.filterNodes(this.roots);
  }

  private filterNodes(nodes: TreeNode[]): TreeNode[] {
    const result: TreeNode[] = [];
    const lowerFilter = this.filter.toLowerCase();
    for (const node of nodes) {
      const matches = node.label.toLowerCase().includes(lowerFilter);
      const filteredChildren = node.children
        ? this.filterNodes(node.children)
        : [];
      if (matches || filteredChildren.length > 0) {
        result.push({
          ...node,
          children: filteredChildren.length > 0 ? filteredChildren : node.children,
        });
      }
    }
    return result;
  }

  // ── Flatten (for virtual scrolling) ─────────────────────

  getFlatNodes(): { node: TreeNode; depth: number }[] {
    const flat: { node: TreeNode; depth: number }[] = [];
    const visible = this.getVisibleNodes();
    this.flattenNodes(visible, 0, flat);
    return flat;
  }

  private flattenNodes(
    nodes: TreeNode[],
    depth: number,
    flat: { node: TreeNode; depth: number }[],
  ): void {
    for (const node of nodes) {
      flat.push({ node, depth });
      if (node.children && this.expanded.has(node.id)) {
        this.flattenNodes(node.children, depth + 1, flat);
      }
    }
  }

  // ── Utility ─────────────────────────────────────────────

  setRoots(roots: TreeNode[]): void {
    this.roots = roots;
  }

  findNode(nodeId: string, nodes?: TreeNode[]): TreeNode | undefined {
    const search = nodes ?? this.roots;
    for (const node of search) {
      if (node.id === nodeId) return node;
      if (node.children) {
        const found = this.findNode(nodeId, node.children);
        if (found) return found;
      }
    }
    return undefined;
  }

  private walkNodes(nodes: TreeNode[], fn: (node: TreeNode) => void): void {
    for (const node of nodes) {
      fn(node);
      if (node.children) this.walkNodes(node.children, fn);
    }
  }
}
