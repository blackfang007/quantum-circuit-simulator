import { Complex }     from './core/complex.js';
import { StateVector } from './core/statevector.js';
import { GATES }       from './gates/gates.js';
import { Circuit }     from './core/circuit.js';
import { runCircuit }  from './core/runner.js';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (!condition) {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  } else {
    console.log(`  ✓ ${msg}`);
    passed++;
  }
}

function approx(a, b, eps = 1e-6) {
  return Math.abs(a - b) < eps;
}

function assertAmp(state, index, re, im, label) {
  const a = state.amplitudes[index];
  assert(
    approx(a.re, re) && approx(a.im, im),
    `${label}: amp[${index}] = ${a} (expected ${re}+${im}i)`
  );
}



console.log('\n── Complex arithmetic ──');
{
  const a = new Complex(3, 4);
  const b = new Complex(1, -2);

  assert(approx(a.abs(), 5), 'abs: |3+4i| = 5');
  assert(approx(a.abs2(), 25), 'abs2: |3+4i|² = 25');

  const prod = a.mul(b);
  assert(approx(prod.re, 11) && approx(prod.im, -2), 'mul: (3+4i)(1-2i) = 11-2i');

  const sum = a.add(b);
  assert(approx(sum.re, 4) && approx(sum.im, 2), 'add: (3+4i)+(1-2i) = 4+2i');

  const e = Complex.fromPolar(1, Math.PI / 2);
  assert(approx(e.re, 0) && approx(e.im, 1), 'fromPolar: e^(iπ/2) = i');
}



console.log('\n── Single-qubit gates ──');
{
  
  const sv = new StateVector(1);
  sv.applyGate(0, GATES.H);
  const s = 1 / Math.SQRT2;
  assertAmp(sv, 0, s, 0, 'H|0⟩[0]');
  assertAmp(sv, 1, s, 0, 'H|0⟩[1]');

  
  sv.applyGate(0, GATES.H);
  assertAmp(sv, 0, 1, 0, 'H²|0⟩ = |0⟩');
  assertAmp(sv, 1, 0, 0, 'H²|0⟩[1] = 0');

  
  const sv2 = new StateVector(1);
  sv2.applyGate(0, GATES.X);
  assertAmp(sv2, 0, 0, 0, 'X|0⟩[0] = 0');
  assertAmp(sv2, 1, 1, 0, 'X|0⟩[1] = 1');

  
  const sv3 = new StateVector(1);
  sv3.applyGate(0, GATES.X); 
  sv3.applyGate(0, GATES.Z); 
  assertAmp(sv3, 0, 0, 0, 'Z|1⟩[0] = 0');
  assertAmp(sv3, 1, -1, 0, 'Z|1⟩[1] = -1');

  
  const sv4 = new StateVector(1);
  sv4.applyGate(0, GATES.X); 
  sv4.applyGate(0, GATES.S); 
  sv4.applyGate(0, GATES.S); 
  assertAmp(sv4, 1, -1, 0, 'S²|1⟩ = -|1⟩ (S²=Z)');
}



console.log('\n── Two-qubit gates ──');
{
  
  const sv = new StateVector(2);
  sv.applyGate(0, GATES.X); 
  sv.applyCNOT(0, 1);       
  assertAmp(sv, 2, 0, 0, 'CNOT|10⟩[2] = 0');
  assertAmp(sv, 3, 1, 0, 'CNOT|10⟩[3] = 1 (→|11⟩)');

  
  const sv2 = new StateVector(2);
  sv2.applyCNOT(0, 1);
  assertAmp(sv2, 0, 1, 0, 'CNOT|00⟩ = |00⟩ unchanged');
}



console.log('\n── Bell state ──');
{

  const sv = new StateVector(2);
  sv.applyGate(0, GATES.H);
  sv.applyCNOT(0, 1);

  const s = 1 / Math.SQRT2;
  assertAmp(sv, 0, s, 0, 'Bell[0] = 1/√2 (|00⟩)');
  assertAmp(sv, 1, 0, 0, 'Bell[1] = 0    (|01⟩)');
  assertAmp(sv, 2, 0, 0, 'Bell[2] = 0    (|10⟩)');
  assertAmp(sv, 3, s, 0, 'Bell[3] = 1/√2 (|11⟩)');


  const totalProb = sv.probabilities().reduce((a, b) => a + b, 0);
  assert(approx(totalProb, 1.0), 'Bell state normalised (total prob = 1)');

 
  const bv = sv.blochVector(0);
  assert(approx(bv.x, 0) && approx(bv.y, 0) && approx(bv.z, 0),
    'Bell: q0 Bloch vector = (0,0,0) (maximally mixed)');
}



console.log('\n── Circuit runner ──');
{
  const c = new Circuit(2, 6);
  c.addGate({ col: 0, qubit: 0, gate: 'H' });
  c.addGate({ col: 1, qubit: 0, gate: 'CNOT', ctrl: 0, target: 1 });

  const { state } = runCircuit(c);
  const s = 1 / Math.SQRT2;
  assertAmp(state, 0, s, 0, 'Runner: Bell[0]');
  assertAmp(state, 3, s, 0, 'Runner: Bell[3]');

  
  c.undo();
  assert(c.ops.length === 1, 'Undo: one gate removed');
  c.undo();
  assert(c.ops.length === 0, 'Undo: all gates removed');
}



console.log('\n── Measurement ──');
{
  
  let count0 = 0, count1 = 0;
  for (let i = 0; i < 1000; i++) {
    const sv = new StateVector(1);
    sv.applyGate(0, GATES.H); 
    const r = sv.measure(0);
    if (r === 0) count0++; else count1++;
  }
 
  assert(Math.abs(count0 - 500) < 60, `Measurement Born rule: got ${count0}/1000 zeros (expect ~500)`);

  
  let q1_after_0 = 0;
  for (let i = 0; i < 200; i++) {
    const sv = new StateVector(2);
    sv.applyGate(0, GATES.H);
    sv.applyCNOT(0, 1);
    const r0 = sv.measure(0);
    if (r0 === 0) {
      
      const p1 = sv.probabilities();
      
      if (approx(p1[0], 1.0) && approx(p1[1], 0)) q1_after_0++;
    }
  }
  assert(q1_after_0 > 80, 'Bell: measuring q0=0 collapses q1 to |0⟩');
}



console.log('\n── GHZ state ──');
{
  
  const c = new Circuit(3, 5);
  c.addGate({ col: 0, qubit: 0, gate: 'H' });
  c.addGate({ col: 1, qubit: 0, gate: 'CNOT', ctrl: 0, target: 1 });
  c.addGate({ col: 2, qubit: 0, gate: 'CNOT', ctrl: 0, target: 2 });

  const { state } = runCircuit(c);
  const s = 1 / Math.SQRT2;
  assertAmp(state, 0, s, 0, 'GHZ[0] = 1/√2 (|000⟩)');
  assertAmp(state, 7, s, 0, 'GHZ[7] = 1/√2 (|111⟩)');

  const total = state.probabilities().reduce((a, b) => a + b, 0);
  assert(approx(total, 1.0), 'GHZ normalised');
}

console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);