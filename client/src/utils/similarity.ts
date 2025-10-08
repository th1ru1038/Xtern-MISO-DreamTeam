export function dot(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function norm(a: number[]) {
  return Math.sqrt(a.reduce((s, x) => s + x * x, 0)) || 1;
}

export function cosine(a: number[], b: number[]) {
  return dot(a, b) / (norm(a) * norm(b));
}

export function topKSimilar(
  items: { label: string; vector: number[] }[],
  index: number,
  k = 3
) {
  const base = items[index].vector;
  const scores = items.map((it, i) => ({
    i,
    label: it.label,
    score: cosine(base, it.vector),
  }));
  const filtered = scores.filter((s) => s.i !== index);
  filtered.sort((a, b) => b.score - a.score);
  return filtered.slice(0, k);
}
