/**
 * circuit.js — circuit data model
 *
 * A circuit is just an ordered array of gate operations.
 * Each operation is a plain object (easy to serialize to JSON).
 *
 * WHY THIS DESIGN:
 * Separating the data model from the simulator means you can:
 * - Save/load circuits as JSON
 * - Undo/redo (keep a history of circuit states)
 * - Export to Qiskit/OpenQASM
 * - Test the simulator independently of the UI
 */

export class Circuit {
  /**
   * @param {number} numQubits
   * @param {number} numCols   — number of time steps (columns) available
   */
  constructor(numQubits = 2, numCols = 8) {
    this.numQubits = numQubits;
    this.numCols   = numCols;
    this.ops       = []; // Gate[]
    this._history  = []; // for undo
  }

  // ── Mutation ──────────────────────────────────────────────────────

  /**
   * Place a gate. Automatically removes conflicts at the same position.
   *
   * @param {object} op — gate operation descriptor:
   *   { col, qubit, gate }              — single-qubit
   *   { col, qubit, gate, ctrl, target } — two-qubit (CNOT / SWAP)
   *   { col, qubit, gate }              — measure (gate === 'M')
   */
  addGate(op) {
    this._saveHistory();
    // Remove any gate occupying the same column × qubit slot
    this.ops = this.ops.filter(g => !this._conflicts(g, op));
    this.ops.push(op);
  }

  removeGateAt(col, qubit) {
    this._saveHistory();
    this.ops = this.ops.filter(g => {
      if (g.col !== col) return true;
      if (g.qubit === qubit) return false;
      if (g.ctrl   === qubit) return false;
      if (g.target === qubit) return false;
      return true;
    });
  }

  clear() {
    this._saveHistory();
    this.ops = [];
  }

  undo() {
    if (this._history.length === 0) return;
    this.ops = this._history.pop();
  }

  // ── Query ─────────────────────────────────────────────────────────

  /**
   * Return ops sorted by column (the execution order).
   * Within the same column, order doesn't matter for independent
   * single-qubit gates, but we sort by qubit for determinism.
   */
  sorted() {
    return [...this.ops].sort((a, b) =>
      a.col !== b.col ? a.col - b.col : a.qubit - b.qubit
    );
  }

  /** Check whether a column slot is occupied. */
  hasGateAt(col, qubit) {
    return this.ops.some(g =>
      g.col === col &&
      (g.qubit === qubit || g.ctrl === qubit || g.target === qubit)
    );
  }

  // ── Serialization ─────────────────────────────────────────────────

  toJSON() {
    return JSON.stringify({
      numQubits: this.numQubits,
      numCols:   this.numCols,
      ops:       this.ops,
    }, null, 2);
  }

  static fromJSON(json) {
    const data = JSON.parse(json);
    const c = new Circuit(data.numQubits, data.numCols);
    c.ops = data.ops;
    return c;
  }

  /**
   * Export to OpenQASM 2.0 — the standard quantum assembly language.
   * Compatible with IBM Qiskit and most quantum cloud services.
   */
  toQASM() {
    const lines = [
      'OPENQASM 2.0;',
      'include "qelib1.inc";',
      `qreg q[${this.numQubits}];`,
      `creg c[${this.numQubits}];`,
      '',
    ];

    const QASM_NAMES = {
      H: 'h', X: 'x', Y: 'y', Z: 'z',
      S: 's', Sdg: 'sdg', T: 't', Tdg: 'tdg',
      Rz: 'rz(pi/4)', Rx: 'rx(pi/2)', Ry: 'ry(pi/2)',
      CNOT: 'cx', SWAP: 'swap', M: 'measure',
    };

    for (const op of this.sorted()) {
      const name = QASM_NAMES[op.gate] ?? op.gate.toLowerCase();
      if (op.gate === 'M') {
        lines.push(`measure q[${op.qubit}] -> c[${op.qubit}];`);
      } else if (op.ctrl !== undefined) {
        lines.push(`${name} q[${op.ctrl}],q[${op.target}];`);
      } else {
        lines.push(`${name} q[${op.qubit}];`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Export to Qiskit Python code (runnable on IBM Quantum).
   */
  toQiskit() {
    const QISKIT_NAMES = {
      H: 'h', X: 'x', Y: 'y', Z: 'z',
      S: 's', Sdg: 'sdg', T: 't', Tdg: 'tdg',
      Rz: 'rz(pi/4)', Rx: 'rx(pi/2)', Ry: 'ry(pi/2)',
    };

    const lines = [
      'from qiskit import QuantumCircuit',
      'import numpy as np',
      '',
      `qc = QuantumCircuit(${this.numQubits}, ${this.numQubits})`,
      '',
    ];

    for (const op of this.sorted()) {
      if (op.gate === 'CNOT') {
        lines.push(`qc.cx(${op.ctrl}, ${op.target})`);
      } else if (op.gate === 'SWAP') {
        lines.push(`qc.swap(${op.qubit}, ${op.target ?? op.qubit + 1})`);
      } else if (op.gate === 'M') {
        lines.push(`qc.measure(${op.qubit}, ${op.qubit})`);
      } else {
        const name = QISKIT_NAMES[op.gate];
        if (name) lines.push(`qc.${name}(${op.qubit})`);
      }
    }

    lines.push('', 'print(qc.draw())');
    return lines.join('\n');
  }

  // ── Private ───────────────────────────────────────────────────────

  _conflicts(existing, incoming) {
    if (existing.col !== incoming.col) return false;
    const qubits = (g) => new Set([
      g.qubit,
      ...(g.ctrl   !== undefined ? [g.ctrl]   : []),
      ...(g.target !== undefined ? [g.target] : []),
    ]);
    const a = qubits(existing), b = qubits(incoming);
    return [...a].some(q => b.has(q));
  }

  _saveHistory() {
    this._history.push(JSON.parse(JSON.stringify(this.ops)));
    if (this._history.length > 50) this._history.shift(); // cap at 50 undo steps
  }
}

// ── Preset circuits ───────────────────────────────────────────────────

export const PRESETS = {
  bell: {
    name: 'Bell state',
    numQubits: 2,
    ops: [
      { col: 0, qubit: 0, gate: 'H' },
      { col: 1, qubit: 0, gate: 'CNOT', ctrl: 0, target: 1 },
    ],
  },
  ghz: {
    name: 'GHZ state (3-qubit)',
    numQubits: 3,
    ops: [
      { col: 0, qubit: 0, gate: 'H' },
      { col: 1, qubit: 0, gate: 'CNOT', ctrl: 0, target: 1 },
      { col: 2, qubit: 0, gate: 'CNOT', ctrl: 0, target: 2 },
    ],
  },
  qft2: {
    name: 'QFT (2-qubit)',
    numQubits: 2,
    ops: [
      { col: 0, qubit: 0, gate: 'H' },
      { col: 1, qubit: 0, gate: 'CNOT', ctrl: 1, target: 0 }, // CPhase approximation
      { col: 2, qubit: 1, gate: 'H' },
      { col: 3, qubit: 0, gate: 'SWAP', ctrl: 0, target: 1 },
    ],
  },
  grover2: {
    name: 'Grover (2-qubit)',
    numQubits: 2,
    ops: [
      { col: 0, qubit: 0, gate: 'H' },
      { col: 0, qubit: 1, gate: 'H' },
      { col: 1, qubit: 0, gate: 'X' },
      { col: 1, qubit: 1, gate: 'X' },
      { col: 2, qubit: 0, gate: 'CNOT', ctrl: 0, target: 1 },
      { col: 3, qubit: 0, gate: 'X' },
      { col: 3, qubit: 1, gate: 'X' },
      { col: 4, qubit: 0, gate: 'H' },
      { col: 4, qubit: 1, gate: 'H' },
    ],
  },
};
