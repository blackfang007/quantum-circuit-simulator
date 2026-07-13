import { Complex } from '../core/complex.js';

const C = (re, im = 0) => new Complex(re, im);
const S  = 1 / Math.SQRT2; // 1/√2 ≈ 0.7071



export const GATES = {

 
  H: [
    [C(S),  C(S)],
    [C(S),  C(-S)],
  ],

  
  X: [
    [C(0), C(1)],
    [C(1), C(0)],
  ],

 
  Y: [
    [C(0, 0), C(0, -1)],
    [C(0, 1), C(0,  0)],
  ],

  
  Z: [
    [C(1), C(0)],
    [C(0), C(-1)],
  ],

  
  S: [
    [C(1), C(0)],
    [C(0), C(0, 1)],
  ],

  
  Sdg: [
    [C(1), C(0)],
    [C(0), C(0, -1)],
  ],

  
  T: [
    [C(1), C(0)],
    [C(0), C(S, S)],
  ],

  
  Tdg: [
    [C(1), C(0)],
    [C(0), C(S, -S)],
  ],

  
  Rz: rzGate(Math.PI / 4),

  Rx: rxGate(Math.PI / 2),

 
  Ry: ryGate(Math.PI / 2),
};




export function rzGate(theta) {
  return [
    [Complex.fromPolar(1, -theta / 2), Complex.ZERO],
    [Complex.ZERO, Complex.fromPolar(1, theta / 2)],
  ];
}


export function rxGate(theta) {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [C(c, 0),   C(0, -s)],
    [C(0, -s),  C(c, 0)],
  ];
}


export function ryGate(theta) {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [C(c, 0),  C(-s, 0)],
    [C(s, 0),  C(c,  0)],
  ];
}


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