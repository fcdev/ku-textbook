/** KU 前置关系图（DAG）。纯函数，构建期、CI、客户端共用。 */

export interface GraphNode {
  id: string;
  title: string;
  prerequisites: string[];
}

export interface Graph<N extends GraphNode = GraphNode> {
  nodes: N[];
  byId: Map<string, N>;
  /** 原始顺序（frontmatter 列表顺序），用作同层的稳定排序键 */
  order: Map<string, number>;
  /** 每个节点的层号 = 最长前置链长度 */
  depth: Map<string, number>;
}

export class GraphError extends Error {
  constructor(message: string, public readonly ids: string[] = []) {
    super(message);
    this.name = "GraphError";
  }
}

/** 检查 id 唯一、前置都存在、无环，并计算层号。 */
export function buildGraph<N extends GraphNode>(nodes: N[]): Graph<N> {
  const byId = new Map<string, N>();
  const order = new Map<string, number>();
  nodes.forEach((n, i) => {
    if (byId.has(n.id)) throw new GraphError(`重复的 KU id：${n.id}`, [n.id]);
    byId.set(n.id, n);
    order.set(n.id, i);
  });
  for (const n of nodes) {
    for (const p of n.prerequisites) {
      if (!byId.has(p)) throw new GraphError(`KU「${n.id}」的前置「${p}」不存在`, [n.id, p]);
      if (p === n.id) throw new GraphError(`KU「${n.id}」把自己列为前置`, [n.id]);
    }
  }
  const g: Graph<N> = { nodes, byId, order, depth: new Map() };
  assertAcyclic(g);
  const depth = g.depth;
  const visit = (id: string): number => {
    const cached = depth.get(id);
    if (cached !== undefined) return cached;
    const pre = byId.get(id)!.prerequisites;
    const d = pre.length ? 1 + Math.max(...pre.map(visit)) : 0;
    depth.set(id, d);
    return d;
  };
  nodes.forEach((n) => visit(n.id));
  return g;
}

/** 有环时抛错，错误里带环上的 id（首尾相同，如 a → b → a）。 */
export function assertAcyclic(g: Pick<Graph, "nodes" | "byId">): void {
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const stack: string[] = [];
  const dfs = (id: string) => {
    color.set(id, GRAY);
    stack.push(id);
    for (const p of g.byId.get(id)?.prerequisites ?? []) {
      const c = color.get(p) ?? WHITE;
      if (c === GRAY) {
        const cycle = [...stack.slice(stack.indexOf(p)), p];
        throw new GraphError(`前置关系成环：${cycle.join(" → ")}`, cycle);
      }
      if (c === WHITE) dfs(p);
    }
    stack.pop();
    color.set(id, BLACK);
  };
  for (const n of g.nodes) if ((color.get(n.id) ?? WHITE) === WHITE) dfs(n.id);
}

/** 目标集合及其全部（传递）前置。 */
export function closure(g: Graph, ids: Iterable<string>): Set<string> {
  const seen = new Set<string>();
  const go = (id: string) => {
    if (seen.has(id)) return;
    const n = g.byId.get(id);
    if (!n) throw new GraphError(`未知的 KU：${id}`, [id]);
    seen.add(id);
    n.prerequisites.forEach(go);
  };
  for (const id of ids) go(id);
  return seen;
}

/** 稳定拓扑排序：先按层号，同层按原始顺序。层号保证前置一定排在前面。 */
export function topoSort(g: Graph, ids: Iterable<string>): string[] {
  return [...new Set(ids)].sort(
    (a, b) => g.depth.get(a)! - g.depth.get(b)! || g.order.get(a)! - g.order.get(b)!,
  );
}

/** 学习路径：目标的闭包按拓扑序，去掉已完成的。 */
export function learningPath(g: Graph, target: string, done: Iterable<string> = []): string[] {
  const skip = new Set(done);
  return topoSort(g, closure(g, [target])).filter((id) => id === target || !skip.has(id));
}

/**
 * 知识地图布局：每层一列，同层按父节点平均行号排序以减少交叉。
 * 返回 layers[层][行] = id。
 */
export function layers(g: Graph): string[][] {
  const cols: string[][] = [];
  for (const n of g.nodes) (cols[g.depth.get(n.id)!] ??= []).push(n.id);
  const row = new Map<string, number>();
  cols.forEach((col, ci) => {
    if (ci > 0) {
      const bary = (id: string) => {
        const pre = g.byId.get(id)!.prerequisites;
        return pre.reduce((s, p) => s + row.get(p)!, 0) / pre.length;
      };
      col.sort((a, b) => bary(a) - bary(b) || g.order.get(a)! - g.order.get(b)!);
    }
    col.forEach((id, ri) => row.set(id, ri));
  });
  return cols;
}

/** 直接后继（以该 KU 为前置的 KU），用于“解锁下一个知识点”。 */
export function successors(g: Graph, id: string): string[] {
  return g.nodes.filter((n) => n.prerequisites.includes(id)).map((n) => n.id);
}
