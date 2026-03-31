// ── Command Module — When Clause Evaluator ────────────────────
// Evaluates conditional expressions for command visibility/enablement.

export class WhenClauseEvaluator {
  evaluate(expression: string, context: Record<string, unknown>): boolean {
    const trimmed = expression.trim();
    if (!trimmed) return true;
    try {
      return this.evalOr(trimmed, context);
    } catch {
      console.warn(`[when-clause] Failed to evaluate: "${expression}"`);
      return false;
    }
  }

  private evalOr(expr: string, ctx: Record<string, unknown>): boolean {
    const parts = this.splitTopLevel(expr, "||");
    return parts.some((part) => this.evalAnd(part.trim(), ctx));
  }

  private evalAnd(expr: string, ctx: Record<string, unknown>): boolean {
    const parts = this.splitTopLevel(expr, "&&");
    return parts.every((part) => this.evalUnary(part.trim(), ctx));
  }

  private evalUnary(expr: string, ctx: Record<string, unknown>): boolean {
    if (expr.startsWith("!")) {
      return !this.evalUnary(expr.slice(1).trim(), ctx);
    }
    if (expr.startsWith("(") && expr.endsWith(")")) {
      return this.evalOr(expr.slice(1, -1), ctx);
    }
    return this.evalComparison(expr, ctx);
  }

  private evalComparison(expr: string, ctx: Record<string, unknown>): boolean {
    // "not in" operator
    const notInMatch = expr.match(/^(.+?)\s+not\s+in\s+(.+)$/);
    if (notInMatch) {
      const left = this.resolveValue(notInMatch[1].trim(), ctx);
      const right = this.resolveValue(notInMatch[2].trim(), ctx);
      if (Array.isArray(right)) return !right.includes(left);
      if (typeof right === "string") return !right.includes(String(left));
      return true;
    }

    // "in" operator
    const inMatch = expr.match(/^(.+?)\s+in\s+(.+)$/);
    if (inMatch) {
      const left = this.resolveValue(inMatch[1].trim(), ctx);
      const right = this.resolveValue(inMatch[2].trim(), ctx);
      if (Array.isArray(right)) return right.includes(left);
      if (typeof right === "string") return right.includes(String(left));
      return false;
    }

    // != operator
    if (expr.includes("!=")) {
      const [left, right] = expr.split("!=").map((s) => s.trim());
      return this.resolveValue(left, ctx) !== this.resolveValue(right, ctx);
    }

    // == operator
    if (expr.includes("==")) {
      const [left, right] = expr.split("==").map((s) => s.trim());
      return this.resolveValue(left, ctx) === this.resolveValue(right, ctx);
    }

    // Simple truthy check (context variable)
    return Boolean(this.resolveValue(expr, ctx));
  }

  private resolveValue(token: string, ctx: Record<string, unknown>): unknown {
    if (token === "true") return true;
    if (token === "false") return false;
    if (token === "null" || token === "undefined") return undefined;
    if (/^-?\d+(\.\d+)?$/.test(token)) return Number(token);
    if ((token.startsWith("'") && token.endsWith("'")) ||
        (token.startsWith('"') && token.endsWith('"'))) {
      return token.slice(1, -1);
    }
    return ctx[token];
  }

  private splitTopLevel(expr: string, op: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = "";
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === "(") depth++;
      else if (expr[i] === ")") depth--;

      if (depth === 0 && expr.startsWith(op, i)) {
        parts.push(current);
        current = "";
        i += op.length - 1;
      } else {
        current += expr[i];
      }
    }
    parts.push(current);
    return parts;
  }
}
