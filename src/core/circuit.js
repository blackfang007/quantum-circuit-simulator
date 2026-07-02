/**
 * circuit.js — circuit data model
 */

export class Circuit {
  constructor(numQubits = 2, numCols = 12) {
    this.numQubits = numQubits;
    this.numCols   = numCols;
    this.ops       = [];
    this._history  = [];
  }

  addGate(op) {
    this._saveHistory();
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

  removeAllGatesOnQubit(qubit) {
    this._saveHistory();
    this.ops = this.ops.filter(g =>
      g.qubit !== qubit && g.ctrl !== qubit && g.target !== qubit
    );
  }

  clear() {
    this._saveHistory();
    this.ops = [];
  }

  undo() {
    if (this._history.length === 0) return;
    this.ops = this._history.pop();
  }

  sorted() {
    return [...this.ops].sort((a, b) =>
      a.col !== b.col ? a.col - b.col : a.qubit - b.qubit
    );
  }

  hasGateAt(col, qubit) {
    return this.ops.some(g =>
      g.col === col &&
      (g.qubit === qubit || g.ctrl === qubit || g.target === qubit)
    );
  }

  toJSON() {
    return JSON.stringify({ numQubits: this.numQubits, numCols: this.numCols, ops: this.ops }, null, 2);
  }

  static fromJSON(json) {
    const data = JSON.parse(json);
    const c = new Circuit(data.numQubits, data.numCols);
    c.ops = data.ops;
    return c;
  }

  toQASM() {
    const lines = [
      'OPENQASM 2.0;',
      'include "qelib1.inc";',
      `qreg q[${this.numQubits}];`,
      `creg c[${this.numQubits}];`,
      '',
    ];
    const NAMES = { H:'h', X:'x', Y:'y', Z:'z', S:'s', Sdg:'sdg', T:'t', Tdg:'tdg',
                    Rz:'rz(pi/4)', Rx:'rx(pi/2)', Ry:'ry(pi/2)', CNOT:'cx', SWAP:'swap' };
    for (const op of this.sorted()) {
      if (op.gate === 'M') {
        lines.push(`measure q[${op.qubit}] -> c[${op.qubit}];`);
      } else if (op.ctrl !== undefined) {
        lines.push(`${NAMES[op.gate] ?? op.gate.toLowerCase()} q[${op.ctrl}],q[${op.target}];`);
      } else {
        lines.push(`${NAMES[op.gate] ?? op.gate.toLowerCase()} q[${op.qubit}];`);
      }
    }
    return lines.join('\n');
  }

  toQiskit() {
    const NAMES = { H:'h', X:'x', Y:'y', Z:'z', S:'s', Sdg:'sdg', T:'t', Tdg:'tdg',
                    Rz:'rz(pi/4)', Rx:'rx(pi/2)', Ry:'ry(pi/2)' };
    const lines = [
      'from qiskit import QuantumCircuit',
      'import numpy as np', '',
      `qc = QuantumCircuit(${this.numQubits}, ${this.numQubits})`, '',
    ];
    for (const op of this.sorted()) {
      if (op.gate === 'CNOT')      lines.push(`qc.cx(${op.ctrl}, ${op.target})`);
      else if (op.gate === 'SWAP') lines.push(`qc.swap(${op.qubit}, ${op.target ?? op.qubit+1})`);
      else if (op.gate === 'M')    lines.push(`qc.measure(${op.qubit}, ${op.qubit})`);
      else if (NAMES[op.gate])     lines.push(`qc.${NAMES[op.gate]}(${op.qubit})`);
    }
    lines.push('', 'print(qc.draw())');
    return lines.join('\n');
  }

  _conflicts(existing, incoming) {
    if (existing.col !== incoming.col) return false;
    const qubits = g => new Set([g.qubit,
      ...(g.ctrl   !== undefined ? [g.ctrl]   : []),
      ...(g.target !== undefined ? [g.target] : [])]);
    const a = qubits(existing), b = qubits(incoming);
    return [...a].some(q => b.has(q));
  }

  _saveHistory() {
    this._history.push(JSON.parse(JSON.stringify(this.ops)));
    if (this._history.length > 50) this._history.shift();
  }
}

export const PRESETS = {
  bell:    { name:'Bell state',       numQubits:2, ops:[{col:0,qubit:0,gate:'H'},{col:1,qubit:0,gate:'CNOT',ctrl:0,target:1}] },
  ghz:     { name:'GHZ (3-qubit)',    numQubits:3, ops:[{col:0,qubit:0,gate:'H'},{col:1,qubit:0,gate:'CNOT',ctrl:0,target:1},{col:2,qubit:0,gate:'CNOT',ctrl:0,target:2}] },
  qft2:    { name:'QFT (2-qubit)',    numQubits:2, ops:[{col:0,qubit:0,gate:'H'},{col:1,qubit:0,gate:'CNOT',ctrl:1,target:0},{col:2,qubit:1,gate:'H'},{col:3,qubit:0,gate:'SWAP',qubit:0,target:1}] },
  grover2: { name:'Grover (2-qubit)', numQubits:2, ops:[{col:0,qubit:0,gate:'H'},{col:0,qubit:1,gate:'H'},{col:1,qubit:0,gate:'X'},{col:1,qubit:1,gate:'X'},{col:2,qubit:0,gate:'CNOT',ctrl:0,target:1},{col:3,qubit:0,gate:'X'},{col:3,qubit:1,gate:'X'},{col:4,qubit:0,gate:'H'},{col:4,qubit:1,gate:'H'}] },
  teleport:{ name:'Teleportation',    numQubits:3, ops:[{col:0,qubit:0,gate:'H'},{col:1,qubit:0,gate:'CNOT',ctrl:0,target:1},{col:2,qubit:2,gate:'CNOT',ctrl:2,target:1},{col:3,qubit:2,gate:'H'},{col:4,qubit:2,gate:'M'},{col:4,qubit:1,gate:'M'}] },
};