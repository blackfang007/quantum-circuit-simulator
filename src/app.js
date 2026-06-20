/**
 * app.js — top-level controller
 *
 * This is the only file that knows about all the others.
 * It wires together: Circuit ↔ Renderer ↔ Runner ↔ StatePanel
 *
 * DATA FLOW (unidirectional):
 *   User clicks cell
 *     → app.js calls circuit.addGate()
 *     → app.js calls runCircuit()  (gets new StateVector)
 *     → app.js calls renderer.render()  (redraws SVG)
 *     → app.js calls statePanel.update()  (updates numbers)
 *
 * Nothing flows backwards. The circuit is always the source of truth.
 */

import { Circuit, PRESETS } from './core/circuit.js';
import { Renderer }         from './ui/renderer.js';
import { StatePanel }       from './ui/statepanel.js';
import { runCircuit }       from './core/runner.js';

// ── DOM refs ──────────────────────────────────────────────────────────

const svgEl         = document.getElementById('circuit-svg');
const statePanelEl  = document.getElementById('state-panel');
const qubitCountEl  = document.getElementById('qubit-count');
const gateButtons   = document.querySelectorAll('[data-gate]');
const runBtn        = document.getElementById('btn-run');
const clearBtn      = document.getElementById('btn-clear');
const undoBtn       = document.getElementById('btn-undo');
const exportQASMBtn = document.getElementById('btn-qasm');
const exportQiskitBtn = document.getElementById('btn-qiskit');
const exportOutput  = document.getElementById('export-output');

// ── State ─────────────────────────────────────────────────────────────

let circuit      = new Circuit(2, 10);
let selectedGate = 'H';

const renderer   = new Renderer(svgEl, circuit, {
  onClickCell:  (col, qubit) => placeGate(col, qubit),
  onClickGate:  (col, qubit) => removeGate(col, qubit),
});

const statePanel = new StatePanel(statePanelEl);

// ── Core actions ──────────────────────────────────────────────────────

function placeGate(col, qubit) {
  const op = { col, qubit, gate: selectedGate };

  // Two-qubit gates need ctrl + target
  if (selectedGate === 'CNOT') {
    const target = (qubit + 1) % circuit.numQubits;
    Object.assign(op, { ctrl: qubit, target });
  }
  if (selectedGate === 'SWAP') {
    const target = (qubit + 1) % circuit.numQubits;
    Object.assign(op, { target });
  }

  circuit.addGate(op);
  refresh();
}

function removeGate(col, qubit) {
  circuit.removeGateAt(col, qubit);
  refresh();
}

/**
 * refresh() — re-runs simulation and redraws everything.
 * Called after every state change. Fast enough to run synchronously
 * for up to ~20 qubits (2^20 = 1M amplitudes), though the UI only
 * exposes 1-3 qubits for readability.
 */
function refresh() {
  const { state, measureResults } = runCircuit(circuit);
  renderer.render(measureResults);
  statePanel.update(state, measureResults);
}

// ── UI event wiring ───────────────────────────────────────────────────

// Gate toolbar
gateButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    selectedGate = btn.dataset.gate;
    gateButtons.forEach(b => b.classList.toggle('active', b === btn));
  });
});

// Qubit count selector
qubitCountEl.addEventListener('change', () => {
  const n = +qubitCountEl.value;
  circuit = new Circuit(n, 10);
  renderer.circuit = circuit; // swap the reference
  refresh();
});

// Preset buttons
document.querySelectorAll('[data-preset]').forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = PRESETS[btn.dataset.preset];
    if (!preset) return;
    circuit = Circuit.fromJSON(JSON.stringify({
      numQubits: preset.numQubits,
      numCols:   10,
      ops:       preset.ops,
    }));
    qubitCountEl.value = preset.numQubits;
    renderer.circuit = circuit;
    refresh();
  });
});

// Run / clear / undo
runBtn.addEventListener('click',   refresh);
clearBtn.addEventListener('click', () => { circuit.clear(); refresh(); });
undoBtn.addEventListener('click',  () => { circuit.undo();  refresh(); });

// Export
exportQASMBtn.addEventListener('click', () => {
  exportOutput.value = circuit.toQASM();
  exportOutput.hidden = false;
  exportOutput.select();
});
exportQiskitBtn.addEventListener('click', () => {
  exportOutput.value = circuit.toQiskit();
  exportOutput.hidden = false;
  exportOutput.select();
});

// ── Init ──────────────────────────────────────────────────────────────

refresh();
