/**
 * app.js — top-level controller
 *
 * DATA FLOW (unidirectional, always):
 *   User action → circuit model mutation → refresh() → re-render all views
 */

import { Circuit, PRESETS } from './core/circuit.js';
import { Renderer }         from './ui/renderer.js';
import { StatePanel }       from './ui/statepanel.js';
import { QASMPanel }        from './ui/qasmpanel.js';
import { Palette }          from './ui/palette.js';
import { runCircuit }       from './core/runner.js';

// ── DOM refs ──────────────────────────────────────────────────────────
const svgEl        = document.getElementById('circuit-svg');
const statePanelEl = document.getElementById('state-panel');
const qasmEl       = document.getElementById('qasm-panel');
const paletteEl    = document.getElementById('palette');
const qubitSel     = document.getElementById('qubit-count');
const stepDisplay  = document.getElementById('step-display');

// ── State ─────────────────────────────────────────────────────────────
let circuit      = new Circuit(2, 12);
let selectedGate = 'H';
let stepMode     = false;   // column step-through mode
let stepCol      = -1;      // current step column (-1 = run all)

// ── Instantiate views ─────────────────────────────────────────────────
const palette = new Palette(paletteEl, gate => { selectedGate = gate; });
palette.render();

// Make palette gates draggable
paletteEl.addEventListener('mousedown', e => {
  const btn = e.target.closest('.palette-gate');
  if (!btn) return;
  selectedGate = btn.dataset.gate;
  palette.el.querySelectorAll('.palette-gate').forEach(b =>
    b.classList.toggle('selected', b === btn));
  renderer.startDrag(btn.dataset.gate, e.clientX - 17, e.clientY - 17);
});

const renderer = new Renderer(svgEl, circuit, {
  onClickCell:  (col, qubit)       => placeGate(col, qubit, selectedGate),
  onClickGate:  (col, qubit)       => { circuit.removeGateAt(col, qubit); refresh(); },
  onDeleteRow:  (qubit)            => { circuit.removeAllGatesOnQubit(qubit); refresh(); },
  onDropCell:   (col, qubit, gate) => placeGate(col, qubit, gate),
});

const statePanel = new StatePanel(statePanelEl);
const qasmPanel  = new QASMPanel(qasmEl);

// ── Core actions ──────────────────────────────────────────────────────

function placeGate(col, qubit, gate) {
  const op = { col, qubit, gate };
  if (gate === 'CNOT') {
    const target = (qubit + 1) % circuit.numQubits;
    Object.assign(op, { ctrl: qubit, target });
  }
  if (gate === 'SWAP') {
    const target = (qubit + 1) % circuit.numQubits;
    Object.assign(op, { target });
  }
  circuit.addGate(op);
  refresh();
}

function refresh() {
  // In step mode, only run up to stepCol; otherwise run full circuit
  let simCircuit = circuit;
  if (stepMode && stepCol >= 0) {
    const { Circuit: C } = { Circuit };
    // Build a temporary circuit with only ops up to stepCol inclusive
    const tempOps = circuit.sorted().filter(op => op.col <= stepCol);
    const fake = { numQubits: circuit.numQubits, numCols: circuit.numCols,
                   ops: tempOps, sorted: () => tempOps };
    simCircuit = fake;
  }

  const { state, measureResults } = runCircuit(simCircuit);
  renderer.render(measureResults);
  statePanel.update(state, measureResults);
  qasmPanel.update(circuit);

  if (stepMode) {
    stepDisplay.textContent = stepCol < 0 ? 'All steps'
      : `Viewing after step ${stepCol + 1}`;
    stepDisplay.hidden = false;
  } else {
    stepDisplay.hidden = true;
  }
}

// ── Toolbar controls ──────────────────────────────────────────────────

// Qubit count
qubitSel.addEventListener('change', () => {
  circuit = new Circuit(+qubitSel.value, 12);
  renderer.circuit = circuit;
  refresh();
});

// Presets
document.querySelectorAll('[data-preset]').forEach(btn => {
  btn.addEventListener('click', () => {
    const p = PRESETS[btn.dataset.preset];
    if (!p) return;
    circuit = Circuit.fromJSON(JSON.stringify({ numQubits: p.numQubits, numCols: 12, ops: p.ops }));
    qubitSel.value    = p.numQubits;
    renderer.circuit  = circuit;
    stepMode = false;
    stepCol  = -1;
    refresh();
  });
});

// Undo / Clear
document.getElementById('btn-undo').addEventListener('click', () => { circuit.undo(); refresh(); });
document.getElementById('btn-clear').addEventListener('click', () => { circuit.clear(); refresh(); });

// Dark mode toggle
const darkBtn = document.getElementById('btn-dark');
darkBtn.addEventListener('click', () => {
  document.documentElement.classList.toggle('dark');
  darkBtn.textContent = document.documentElement.classList.contains('dark') ? '☀ Light' : '☾ Dark';
});

// Step through
document.getElementById('btn-step-back').addEventListener('click', () => {
  stepMode = true;
  stepCol  = Math.max(-1, stepCol - 1);
  refresh();
});
document.getElementById('btn-step-fwd').addEventListener('click', () => {
  stepMode = true;
  stepCol  = Math.min(circuit.numCols - 1, stepCol + 1);
  refresh();
});
document.getElementById('btn-step-reset').addEventListener('click', () => {
  stepMode = false;
  stepCol  = -1;
  refresh();
});

// ── Init ──────────────────────────────────────────────────────────────
refresh();