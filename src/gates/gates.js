/**
 * gates.js — standard quantum gate definitions
 *
 * Each gate is a 2×2 matrix of Complex numbers [[m00,m01],[m10,m11]].
 * Single-qubit gates are all 2×2 unitaries (UU† = I, det = ±1).
 *
 * WHY 2×2: A single qubit is a 2D complex vector space. Any valid
 * single-qubit operation that preserves normalization must be a
 * 2×2 unitary matrix. For n qubits you'd need 2ⁿ × 2ⁿ, but our
 * applyGate() in statevector.js works qubit-by-qubit so 2×2 is enough.
 */

import { Complex } from '../core/complex.js';

const C = (re, im = 0) => new Complex(re, im);
const S  = 1 / Math.SQRT2; // 1/√2 ≈ 0.7071

// ── Single-qubit gates ────────────────────────────────────────────────

export const GATES = {

  /**
   * Hadamard — creates superposition from |0⟩ or |1⟩
   * H|0⟩ = (|0⟩+|1⟩)/√2   H|1⟩ = (|0⟩-|1⟩)/√2
   * Matrix: 1/√2 · [[1,1],[1,-1]]
   */
  H: [
    [C(S),  C(S)],
    [C(S),  C(-S)],
  ],

  /**
   * Pauli-X — quantum NOT gate, flips |0⟩↔|1⟩
   * Matrix: [[0,1],[1,0]]
   */
  X: [
    [C(0), C(1)],
    [C(1), C(0)],
  ],

  /**
   * Pauli-Y — rotation by π around Y axis on Bloch sphere
   * Y|0⟩ = i|1⟩,  Y|1⟩ = -i|0⟩
   * Matrix: [[0,-i],[i,0]]
   */
  Y: [
    [C(0, 0), C(0, -1)],
    [C(0, 1), C(0,  0)],
  ],

  /**
   * Pauli-Z — phase flip, |0⟩→|0⟩, |1⟩→-|1⟩
   * No effect on |0⟩, negates amplitude of |1⟩
   * Matrix: [[1,0],[0,-1]]
   */
  Z: [
    [C(1), C(0)],
    [C(0), C(-1)],
  ],

  /**
   * S gate — phase gate, applies e^(iπ/2) = i to |1⟩
   * S² = Z
   * Matrix: [[1,0],[0,i]]
   */
  S: [
    [C(1), C(0)],
    [C(0), C(0, 1)],
  ],

  /**
   * S† (S-dagger) — inverse of S
   * Applies e^(-iπ/2) = -i to |1⟩
   * Matrix: [[1,0],[0,-i]]
   */
  Sdg: [
    [C(1), C(0)],
    [C(0), C(0, -1)],
  ],

  /**
   * T gate — π/8 gate, applies e^(iπ/4) to |1⟩
   * T² = S,  T⁴ = Z
   * Matrix: [[1,0],[0,e^(iπ/4)]]
   * e^(iπ/4) = 1/√2 + i/√2
   */
  T: [
    [C(1), C(0)],
    [C(0), C(S, S)],
  ],

  /**
   * T† (T-dagger) — inverse of T
   * Applies e^(-iπ/4) to |1⟩
   */
  Tdg: [
    [C(1), C(0)],
    [C(0), C(S, -S)],
  ],

  /**
   * Rz(π/4) — rotation around Z axis by π/4 radians
   * General Rz(θ) = [[e^(-iθ/2), 0],[0, e^(iθ/2)]]
   * At θ=π/4: diagonal entries are e^(∓iπ/8)
   */
  Rz: rzGate(Math.PI / 4),

  /**
   * RX(π/2) — rotation around X axis by π/2
   * RX(θ) = [[cos(θ/2), -i·sin(θ/2)],[-i·sin(θ/2), cos(θ/2)]]
   */
  Rx: rxGate(Math.PI / 2),

  /**
   * Ry(π/2) — rotation around Y axis by π/2
   * RY(θ) = [[cos(θ/2), -sin(θ/2)],[sin(θ/2), cos(θ/2)]]
   */
  Ry: ryGate(Math.PI / 2),
};

// ── Gate factories (for parameterised gates) ──────────────────────────

/** Rz(θ) = [[e^(-iθ/2), 0], [0, e^(iθ/2)]] */
export function rzGate(theta) {
  return [
    [Complex.fromPolar(1, -theta / 2), Complex.ZERO],
    [Complex.ZERO, Complex.fromPolar(1, theta / 2)],
  ];
}

/** RX(θ) = [[cos(θ/2), -i·sin(θ/2)], [-i·sin(θ/2), cos(θ/2)]] */
export function rxGate(theta) {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [C(c, 0),   C(0, -s)],
    [C(0, -s),  C(c, 0)],
  ];
}

/** RY(θ) = [[cos(θ/2), -sin(θ/2)], [sin(θ/2), cos(θ/2)]] */
export function ryGate(theta) {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [C(c, 0),  C(-s, 0)],
    [C(s, 0),  C(c,  0)],
  ];
}

/**
 * U3 gate — most general single-qubit gate (used in IBM Qiskit)
 * U3(θ,φ,λ) parameterizes any point on the Bloch sphere
 * U3 = [[cos(θ/2), -e^(iλ)sin(θ/2)], [e^(iφ)sin(θ/2), e^(i(φ+λ))cos(θ/2)]]
 */
export function u3Gate(theta, phi, lambda) {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [C(c, 0),
     Complex.fromPolar(s, lambda + Math.PI).scale(-1)],
    [Complex.fromPolar(s, phi),
     Complex.fromPolar(c, phi + lambda)],
  ];
}

// ── Gate metadata (for the UI) ────────────────────────────────────────

export const GATE_META = {
  H:    { label: 'H',    color: '#534AB7', desc: 'Hadamard',    qubits: 1 },
  X:    { label: 'X',    color: '#D85A30', desc: 'Pauli-X (NOT)', qubits: 1 },
  Y:    { label: 'Y',    color: '#D4537E', desc: 'Pauli-Y',     qubits: 1 },
  Z:    { label: 'Z',    color: '#0F6E56', desc: 'Pauli-Z',     qubits: 1 },
  S:    { label: 'S',    color: '#185FA5', desc: 'Phase (S)',   qubits: 1 },
  Sdg:  { label: 'S†',   color: '#185FA5', desc: 'S-dagger',   qubits: 1 },
  T:    { label: 'T',    color: '#854F0B', desc: 'T gate (π/8)', qubits: 1 },
  Tdg:  { label: 'T†',   color: '#854F0B', desc: 'T-dagger',   qubits: 1 },
  Rz:   { label: 'Rz',   color: '#639922', desc: 'Rotate Z',   qubits: 1 },
  Rx:   { label: 'Rx',   color: '#639922', desc: 'Rotate X',   qubits: 1 },
  Ry:   { label: 'Ry',   color: '#639922', desc: 'Rotate Y',   qubits: 1 },
  CNOT: { label: '⊕',    color: '#3B3489', desc: 'CNOT',       qubits: 2, twoQubit: true },
  SWAP: { label: '×',    color: '#3B3489', desc: 'SWAP',       qubits: 2, twoQubit: true },
  M:    { label: 'M',    color: '#993556', desc: 'Measure',    qubits: 1 },
};
