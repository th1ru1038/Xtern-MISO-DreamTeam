// Very small PCA utility: centers data and computes top-2 principal components
// using power iteration on the 2x2 covariance matrix when possible.

export function projectTo2D(vectors: number[][]) {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  // center
  const mean = new Array(dim).fill(0);
  for (const v of vectors) for (let i = 0; i < dim; i++) mean[i] += v[i];
  for (let i = 0; i < dim; i++) mean[i] /= vectors.length;

  const centered = vectors.map((v) => v.map((x, i) => x - mean[i]));

  // For simplicity, if dim === 2 use centered coords directly
  if (dim === 2) return centered.map((c) => [c[0], c[1]]);

  // Compute covariance matrix (dim x dim) but reduce to top-2 via SVD-lite
  // We'll project by computing top 2 eigenvectors of the covariance matrix using power iteration.
  // Build covariance matrix
  const cov = Array.from({ length: dim }, () => new Array(dim).fill(0));
  for (const v of centered) {
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        cov[i][j] += v[i] * v[j];
      }
    }
  }
  const n = vectors.length;
  for (let i = 0; i < dim; i++) for (let j = 0; j < dim; j++) cov[i][j] /= n;

  function matVec(mat: number[][], vec: number[]) {
    const out = new Array(mat.length).fill(0);
    for (let i = 0; i < mat.length; i++) {
      let s = 0;
      for (let j = 0; j < vec.length; j++) s += mat[i][j] * vec[j];
      out[i] = s;
    }
    return out;
  }

  function norm(v: number[]) {
    return Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  }

  function powerIteration(mat: number[][], iters = 50) {
    const n = mat.length;
    // deterministic initial vector to avoid randomness between renders
    let b = new Array(n).fill(1);
    // normalize
    const bnorm = norm(b);
    b = b.map((x) => x / bnorm);
    for (let k = 0; k < iters; k++) {
      const Mb = matVec(mat, b);
      const mag = norm(Mb);
      b = Mb.map((x) => x / mag);
    }
    // ensure returned eigenvector is normalized
    const nb = norm(b);
    return b.map((x) => x / nb);
  }

  // First eigenvector
  const e1 = powerIteration(cov, 80);
  // Deflate matrix: cov2 = cov - lambda1 * (e1 e1^T)
  const lambda1vec = matVec(cov, e1);
  const lambda1 = lambda1vec.reduce((s, x, i) => s + x * e1[i], 0);

  const cov2 = Array.from({ length: dim }, () => new Array(dim).fill(0));
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) {
      cov2[i][j] = cov[i][j] - lambda1 * e1[i] * e1[j];
    }
  }

  const e2 = powerIteration(cov2, 80);

  // Project centered vectors onto [e1, e2]
  const projected = centered.map((v) => {
    const x = v.reduce((s, val, i) => s + val * e1[i], 0);
    const y = v.reduce((s, val, i) => s + val * e2[i], 0);
    return [x, y];
  });

  return projected;
}
