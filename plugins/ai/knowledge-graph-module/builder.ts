// ── Builder ────────────────────────────────────────────────
// Creates graph nodes and edges from file content analysis.

import type { EdgeKind, GraphEdge } from "./types";
import { Graph } from "./graph";

/**
 * Build nodes from a simplistic import/export scan.
 * Real implementations would use AST parsing; this uses regex heuristics.
 */
export function buildFromSource(
  filePath: string,
  content: string,
  graph: Graph,
): void {
  // Remove old entries for this file
  graph.removeFile(filePath);

  const lines = content.split("\n");
  const fileNodeId = `file:${filePath}`;

  graph.addNode({
    id: fileNodeId,
    filePath,
    symbol: filePath.split("/").pop() ?? filePath,
    kind: "file",
  });

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect import edges
    const importMatch = line.match(/import\s+.*?from\s+['"](.+?)['"]/);
    if (importMatch) {
      const target = importMatch[1];
      const targetId = `file:${resolveImport(filePath, target)}`;
      addEdgeSafe(graph, fileNodeId, targetId, "imports");
    }

    // Detect class/function/const definitions
    const defMatch = line.match(/^export\s+(?:default\s+)?(?:class|function|const|let|interface|type|enum)\s+(\w+)/);
    if (defMatch) {
      const symbolName = defMatch[1];
      const nodeId = `${filePath}:${symbolName}`;
      graph.addNode({ id: nodeId, filePath, symbol: symbolName, kind: detectKind(line), line: i + 1 });
      addEdgeSafe(graph, fileNodeId, nodeId, "defines");
    }

    // Detect extends
    const extendsMatch = line.match(/class\s+\w+\s+extends\s+(\w+)/);
    if (extendsMatch) {
      const parentName = extendsMatch[1];
      const childMatch = line.match(/class\s+(\w+)/);
      if (childMatch) {
        addEdgeSafe(graph, `${filePath}:${childMatch[1]}`, `ref:${parentName}`, "extends");
      }
    }

    // Detect implements
    const implMatch = line.match(/class\s+(\w+)\s+.*implements\s+([\w,\s]+)/);
    if (implMatch) {
      const className = implMatch[1];
      const interfaces = implMatch[2].split(",").map((s) => s.trim());
      for (const iface of interfaces) {
        addEdgeSafe(graph, `${filePath}:${className}`, `ref:${iface}`, "implements");
      }
    }
  }
}

function addEdgeSafe(graph: Graph, source: string, target: string, kind: EdgeKind): void {
  const edge: GraphEdge = { source, target, kind };
  graph.addEdge(edge);
}

function detectKind(line: string): string {
  if (line.includes("class ")) return "class";
  if (line.includes("function ")) return "function";
  if (line.includes("interface ")) return "interface";
  if (line.includes("type ")) return "type";
  if (line.includes("enum ")) return "enum";
  return "variable";
}

function resolveImport(fromPath: string, importPath: string): string {
  if (importPath.startsWith("@") || !importPath.startsWith(".")) {
    return importPath;
  }
  const dir = fromPath.substring(0, fromPath.lastIndexOf("/"));
  return `${dir}/${importPath}`.replace(/\/\.\//g, "/");
}
