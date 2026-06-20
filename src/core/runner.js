/**
 * runner.js — connects the Circuit model to the StateVector simulator
 *
 * This is the bridge between the two halves of the system:
 *   Circuit (what gates to run, and where)  →  Runner  →  StateVector (the math)
 *
 * It knows about BOTH the gate matrix definitions AND the statevector
 * operations. Neither the Circuit nor the StateVector knows about the other.
 */

import { StateVector } from './statevector.js';
import { GATES, rzGate, rxGate, ryGate } from '../gates/gates.js';

/**
 * Run all gates in the circuit and return the resulting state vector.
 *
 * @param {Circuit} circuit
 * @returns {{ state: StateVector, measureResults: Map<string, number> }}
 *
 * measureResults maps "col:qubit" → 0|1 for any M gates encountered.
 */
export function runCircuit(circuit) {
  const state = new StateVector(circuit.numQubits);
  const measureResults = new Map();

  for (const op of circuit.sorted()) {
    applyOp(state, op, measureResults);
  }

  return { state, measureResults };
}

/**
 * Run circuit up to (but not including) a given column.
 * Used by the UI to show intermediate states when hovering.
 */
export function runUpTo(circuit, col) {
  const state = new StateVector(circuit.numQubits);
  const subset = circuit.sorted().filter(op => op.col < col);
  for (const op of subset) applyOp(state, op, new Map());
  return state;
}

// ── Private ───────────────────────────────────────────────────────────

function applyOp(state, op, measureResults) {
  const { gate, qubit, ctrl, target } = op;

  // Two-qubit gates
  if (gate === 'CNOT') {
    state.applyCNOT(ctrl, target);
    return;
  }
  if (gate === 'SWAP') {
    state.applySWAP(qubit, target ?? qubit + 1);
    return;
  }

  // Measurement
  if (gate === 'M') {
    const result = state.measure(qubit);
    measureResults.set(`${op.col}:${qubit}`, result);
    return;
  }

  // Parameterised gates (if op carries an angle)
  if (gate === 'Rz' && op.angle !== undefined) {
    state.applyGate(qubit, rzGate(op.angle));
    return;
  }
  if (gate === 'Rx' && op.angle !== undefined) {
    state.applyGate(qubit, rxGate(op.angle));
    return;
  }
  if (gate === 'Ry' && op.angle !== undefined) {
    state.applyGate(qubit, ryGate(op.angle));
    return;
  }

  // All other single-qubit gates — look up the matrix
  const mat = GATES[gate];
  if (!mat) {
    console.warn(`Unknown gate: ${gate}`);
    return;
  }
  state.applyGate(qubit, mat);
}
