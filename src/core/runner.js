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


export function runUpTo(circuit, col) {
  const state = new StateVector(circuit.numQubits);
  const subset = circuit.sorted().filter(op => op.col < col);
  for (const op of subset) applyOp(state, op, new Map());
  return state;
}



function applyOp(state, op, measureResults) {
  const { gate, qubit, ctrl, target } = op;

  
  if (gate === 'CNOT') {
    state.applyCNOT(ctrl, target);
    return;
  }
  if (gate === 'SWAP') {
    state.applySWAP(qubit, target ?? qubit + 1);
    return;
  }

  
  if (gate === 'M') {
    const result = state.measure(qubit);
    measureResults.set(`${op.col}:${qubit}`, result);
    return;
  }

  
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

  
  const mat = GATES[gate];
  if (!mat) {
    console.warn(`Unknown gate: ${gate}`);
    return;
  }
  state.applyGate(qubit, mat);
}