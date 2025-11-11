/**
 * Large computational function to stress-test FaaS + IPFS upload.
 * It performs matrix multiplication, normalization, determinant approximation,
 * and vector operations — purely for demo and benchmarking.
 */

module.exports = function (n) {
  if (typeof n !== 'number' || n < 1 || !Number.isInteger(n)) {
    return 'Input must be a positive integer.';
  }

  // Helper to generate random matrix
  function generateMatrix(size) {
    const matrix = [];
    for (let i = 0; i < size; i++) {
      const row = [];
      for (let j = 0; j < size; j++) {
        row.push(Math.random() * 10);
      }
      matrix.push(row);
    }
    return matrix;
  }

  // Multiply two matrices
  function multiplyMatrices(A, B) {
    const n = A.length;
    const result = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += A[i][k] * B[k][j];
        }
        result[i][j] = sum;
      }
    }
    return result;
  }

  // Compute matrix transpose
  function transpose(matrix) {
    const n = matrix.length;
    const result = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        result[j][i] = matrix[i][j];
      }
    }
    return result;
  }

  // Normalize a matrix
  function normalize(matrix) {
    const n = matrix.length;
    let maxVal = -Infinity;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (matrix[i][j] > maxVal) maxVal = matrix[i][j];
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        matrix[i][j] /= maxVal;
      }
    }
    return matrix;
  }

  // Approximate determinant (recursive minor expansion)
  function determinant(m) {
    const n = m.length;
    if (n === 1) return m[0][0];
    if (n === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
    let det = 0;
    for (let i = 0; i < n; i++) {
      const minor = m.slice(1).map(row => row.filter((_, j) => j !== i));
      det += ((i % 2 === 0 ? 1 : -1) * m[0][i] * determinant(minor));
    }
    return det;
  }

  // Perform a sequence of computations to increase code size
  const A = generateMatrix(n);
  const B = generateMatrix(n);
  const C = multiplyMatrices(A, B);
  const D = transpose(C);
  const E = multiplyMatrices(D, A);
  const F = normalize(E);

  // Vector transformation and aggregation
  function vectorOps(matrix) {
    const flat = matrix.flat();
    const squared = flat.map(x => x * x);
    const sqrted = squared.map(Math.sqrt);
    const mean = sqrted.reduce((a, b) => a + b, 0) / sqrted.length;
    const variance = sqrted.reduce((sum, val) => sum + (val - mean) ** 2, 0) / sqrted.length;
    return { mean, variance };
  }

  const stats = vectorOps(F);
  const detApprox = determinant(A.slice(0, Math.min(5, n))); // small subset for speed

  // Create some additional repetitive code blocks to inflate file size
  function polynomialEval(x) {
    let val = 0;
    for (let i = 0; i < 500; i++) {
      val += Math.pow(x, i % 10) / (i + 1);
    }
    return val;
  }

  const polyResults = [];
  for (let i = 0; i < 100; i++) {
    polyResults.push(polynomialEval(i / 10));
  }

  // Combine everything into a single result
  const result = {
    matrixSize: n,
    determinantEstimate: detApprox.toFixed(4),
    mean: stats.mean.toFixed(4),
    variance: stats.variance.toFixed(4),
    polynomialSamples: polyResults.slice(0, 10),
    comment: "Heavy computation complete for demo."
  };

  return result;
};
