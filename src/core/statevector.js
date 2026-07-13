import { Complex } from './complex.js';

export class StateVector {
  /**
   * @param {number} numQubits
   * Creates |00...0⟩ — all amplitude in the zero state
   */
  constructor(numQubits) {
    this.n = numQubits;
    this.dim = 1 << numQubits; // 2^n
    this.amplitudes = Array.from({ length: this.dim }, (_, i) =>
      i === 0 ? Complex.ONE : Complex.ZERO
    );
  }

  
  /**
   * Apply a 2×2 unitary matrix to a single qubit.
   * @param {number} qubit  — which qubit (0-indexed)
   * @param {Complex[][]} mat — 2×2 matrix [[m00,m01],[m10,m11]]
   */
  applyGate(qubit, mat) {
    const bit = this.n - 1 - qubit; 
    for (let i = 0; i < this.dim; i++) {
      if ((i >> bit) & 1) continue; 

      const j = i | (1 << bit); 
      const a = this.amplitudes[i]; 
      const b = this.amplitudes[j]; 

      this.amplitudes[i] = mat[0][0].mul(a).add(mat[0][1].mul(b));
      this.amplitudes[j] = mat[1][0].mul(a).add(mat[1][1].mul(b));
    }
  }

  /**
   * CNOT gate — controlled-NOT (2-qubit gate).
   
   
   * @param {number} ctrl   — control qubit index
   * @param {number} target — target qubit index
   */
  applyCNOT(ctrl, target) {
    const ctrlBit   = this.n - 1 - ctrl;
    const targetBit = this.n - 1 - target;

    for (let i = 0; i < this.dim; i++) {
      
      if (!((i >> ctrlBit) & 1)) continue;
      if ((i >> targetBit) & 1)  continue; 

      const j = i ^ (1 << targetBit); 
      
      [this.amplitudes[i], this.amplitudes[j]] =
        [this.amplitudes[j], this.amplitudes[i]];
    }
  }

  /**
   * SWAP gate — exchange two qubits.
   * Decomposed into 3 CNOTs: SWAP(a,b) = CNOT(a,b)·CNOT(b,a)·CNOT(a,b)
   * This is mathematically equivalent and avoids writing a 4×4 matrix.
   */
  applySWAP(q1, q2) {
    this.applyCNOT(q1, q2);
    this.applyCNOT(q2, q1);
    this.applyCNOT(q1, q2);
  }

  
  applyToffoli(ctrl1, ctrl2, target) {
    const c1bit  = this.n - 1 - ctrl1;
    const c2bit  = this.n - 1 - ctrl2;
    const tgtBit = this.n - 1 - target;

    for (let i = 0; i < this.dim; i++) {
      if (!((i >> c1bit) & 1))  continue;
      if (!((i >> c2bit) & 1))  continue;
      if ((i >> tgtBit) & 1)    continue;
      const j = i ^ (1 << tgtBit);
      [this.amplitudes[i], this.amplitudes[j]] =
        [this.amplitudes[j], this.amplitudes[i]];
    }
  }

  // ── Measurement ───────────────────────────────────────────────────

  /**
   * Measure a single qubit — collapses the state.
   
   * @returns {number} 0 or 1 — the measurement result
   */
  measure(qubit) {
    const bit = this.n - 1 - qubit;
    let prob0 = 0;
    for (let i = 0; i < this.dim; i++) {
      if (!((i >> bit) & 1)) prob0 += this.amplitudes[i].abs2();
    }

    const result = Math.random() < prob0 ? 0 : 1;

    
    const norm = result === 0 ? Math.sqrt(prob0) : Math.sqrt(1 - prob0);
    for (let i = 0; i < this.dim; i++) {
      const bitVal = (i >> bit) & 1;
      if (bitVal !== result) {
        this.amplitudes[i] = Complex.ZERO;
      } else {
        this.amplitudes[i] = this.amplitudes[i].scale(1 / norm);
      }
    }

    return result;
  }

 
  measureAll() {
    const probs = this.amplitudes.map(a => a.abs2());
    const r = Math.random();
    let cumul = 0;
    for (let i = 0; i < this.dim; i++) {
      cumul += probs[i];
      if (r < cumul) return i.toString(2).padStart(this.n, '0');
    }
    return (this.dim - 1).toString(2).padStart(this.n, '0');
  }

  

  /**
   * Probability distribution — P(|i⟩) = |amplitude_i|²
   * @returns {number[]}
   */
  probabilities() {
    return this.amplitudes.map(a => a.abs2());
  }

  /**
   * Partial trace to get density matrix of qubit 0.
   
   * @returns {{r00, r01, r10, r11}} — 2×2 density matrix entries
   */
  reducedDensityMatrix(qubit = 0) {
    let r00 = Complex.ZERO, r01 = Complex.ZERO,
        r10 = Complex.ZERO, r11 = Complex.ZERO;
    const bit = this.n - 1 - qubit;

    for (let i = 0; i < this.dim; i++) {
      for (let j = 0; j < this.dim; j++) {
        // Must agree on all OTHER qubits
        const mask = ~(1 << bit) & (this.dim - 1);
        if ((i & mask) !== (j & mask)) continue;

        const bi = (i >> bit) & 1;
        const bj = (j >> bit) & 1;
        const val = this.amplitudes[i].mul(this.amplitudes[j].conj());

        if (bi === 0 && bj === 0) r00 = r00.add(val);
        if (bi === 0 && bj === 1) r01 = r01.add(val);
        if (bi === 1 && bj === 0) r10 = r10.add(val);
        if (bi === 1 && bj === 1) r11 = r11.add(val);
      }
    }
    return { r00, r01, r10, r11 };
  }

  /**
   
   * |r| < 1 → mixed state (entangled with other qubits)
   */
  blochVector(qubit = 0) {
    const { r00, r01, r11 } = this.reducedDensityMatrix(qubit);
    return {
      x: 2 * r01.re,
      y: 2 * r01.im,
      z: r00.re - r11.re,
    };
  }

  /**
   * Clone the state — useful for running simulations non-destructively.
   */
  clone() {
    const copy = new StateVector(this.n);
    copy.amplitudes = this.amplitudes.map(a => new Complex(a.re, a.im));
    return copy;
  }
}