import { PALETTE_GROUPS } from './palette.js';

const LEFT_PAD = 60;
const TOP_PAD  = 20;
const ROW_H    = 48;
const COL_W    = 62;
const RIGHT_PAD = 36;


const GATE_COLOR = {};
const GATE_LABEL = { CNOT:'⊕', SWAP:'×', Sdg:'S†', Tdg:'T†' };
for (const g of PALETTE_GROUPS.flatMap(gr => gr.gates)) {
  GATE_COLOR[g.name] = g.color;
}

export class Renderer {
  constructor(svgEl, circuit, callbacks) {
    this.svg       = svgEl;
    this.circuit   = circuit;
    this.callbacks = callbacks; 
    
    this._drag     = null; 
    this._svgRect  = null;

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp   = this._onMouseUp.bind(this);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup',   this._onMouseUp);
  }

  render(measureResults = new Map()) {
    const { numQubits, numCols } = this.circuit;
    const W = LEFT_PAD + numCols * COL_W + RIGHT_PAD;
    const H = TOP_PAD  + numQubits * ROW_H + 28;

    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('width',  W);
    this.svg.setAttribute('height', H);
    this.svg.innerHTML = this._build(numQubits, numCols, W, measureResults);
    this._attach();
    this._svgRect = null; 
  }

  

  _build(numQubits, numCols, W, measureResults) {
    let h = '';

    
    for (let c = 0; c < numCols; c++) {
      const x = this._cx(c);
      h += `<text x="${x}" y="14" font-size="10" fill="var(--muted)" text-anchor="middle"
                   font-family="monospace">${c + 1}</text>`;
    }

    
    for (let q = 0; q < numQubits; q++) {
      const y = this._qy(q);

      
      h += `<line x1="${LEFT_PAD - 12}" y1="${y}" x2="${W - RIGHT_PAD + 4}" y2="${y}"
                   stroke="var(--wire)" stroke-width="1" opacity="0.5"/>`;

      
      h += `<text x="4" y="${y}" font-size="12" fill="var(--label)"
                   dominant-baseline="central" font-family="monospace">q${q}|0⟩</text>`;

      
      h += `<g class="del-row" data-qubit="${q}" style="cursor:pointer" title="Clear row">
              <rect x="${W - RIGHT_PAD + 6}" y="${y - 10}" width="20" height="20" rx="4"
                    fill="var(--surface)" stroke="var(--border)" stroke-width="0.5"/>
              <text x="${W - RIGHT_PAD + 16}" y="${y + 1}" font-size="11" fill="var(--muted)"
                    text-anchor="middle" dominant-baseline="central">×</text>
            </g>`;

      
      for (let c = 0; c < numCols; c++) {
        if (!this.circuit.hasGateAt(c, q)) {
          const cx = this._cx(c);
          h += `<rect x="${cx - COL_W/2 + 2}" y="${y - ROW_H/2 + 2}"
                       width="${COL_W - 4}" height="${ROW_H - 4}" rx="6"
                       fill="transparent" class="cell-target"
                       data-col="${c}" data-qubit="${q}" style="cursor:crosshair"/>`;
         
          h += `<circle cx="${cx}" cy="${y}" r="2.5" fill="var(--wire)" opacity="0.25" pointer-events="none"/>`;
        }
      }
    }

    
    for (const op of this.circuit.ops) {
      h += this._renderOp(op, measureResults.get(`${op.col}:${op.qubit}`));
    }

    return h;
  }

  _renderOp(op, measureResult) {
    const color = GATE_COLOR[op.gate] ?? '#888';
    const label = GATE_LABEL[op.gate] ?? op.gate;
    const x     = this._cx(op.col);

    if (op.gate === 'CNOT') {
      const cy = this._qy(op.ctrl);
      const ty = this._qy(op.target);
      const minY = Math.min(cy, ty), spanH = Math.abs(ty - cy);
      return `<g class="gate-group" data-col="${op.col}" data-qubit="${op.qubit}" style="cursor:pointer">
        <rect x="${x - 14}" y="${minY - 14}" width="28" height="${spanH + 28}" fill="transparent"/>
        <line x1="${x}" y1="${cy}" x2="${x}" y2="${ty}" stroke="${color}" stroke-width="1.5"/>
        <circle cx="${x}" cy="${cy}" r="6" fill="${color}"/>
        <circle cx="${x}" cy="${ty}" r="12" fill="none" stroke="${color}" stroke-width="1.5"/>
        <line x1="${x-12}" y1="${ty}" x2="${x+12}" y2="${ty}" stroke="${color}" stroke-width="1.5"/>
        <line x1="${x}" y1="${ty-12}" x2="${x}" y2="${ty+12}" stroke="${color}" stroke-width="1.5"/>
      </g>`;
    }

    if (op.gate === 'SWAP') {
      const y1 = this._qy(op.qubit);
      const y2 = this._qy(op.target ?? op.qubit + 1);
      const minY = Math.min(y1, y2), spanH = Math.abs(y2 - y1);
      const X = (cx, cy, r) =>
        `<line x1="${cx-r}" y1="${cy-r}" x2="${cx+r}" y2="${cy+r}" stroke="${color}" stroke-width="2"/>
         <line x1="${cx+r}" y1="${cy-r}" x2="${cx-r}" y2="${cy+r}" stroke="${color}" stroke-width="2"/>`;
      return `<g class="gate-group" data-col="${op.col}" data-qubit="${op.qubit}" style="cursor:pointer">
        <rect x="${x-14}" y="${minY-14}" width="28" height="${spanH+28}" fill="transparent"/>
        <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${color}" stroke-width="1.5"/>
        ${X(x, y1, 7)} ${X(x, y2, 7)}
      </g>`;
    }

    if (op.gate === 'M') {
      const y = this._qy(op.qubit);
      const badge = measureResult !== undefined
        ? `<text x="${x}" y="${y + 22}" font-size="10" text-anchor="middle"
                 fill="${color}" font-family="monospace" font-weight="bold">=${measureResult}</text>` : '';
      return `<g class="gate-group" data-col="${op.col}" data-qubit="${op.qubit}" style="cursor:pointer">
        <rect x="${x-16}" y="${y-16}" width="32" height="32" rx="6"
              fill="none" stroke="${color}" stroke-width="1.5"/>
        <path d="M${x-8} ${y+4} Q${x} ${y-8} ${x+8} ${y+4}" stroke="${color}" stroke-width="1.5" fill="none"/>
        <line x1="${x}" y1="${y-1}" x2="${x+7}" y2="${y-9}" stroke="${color}" stroke-width="1.5"/>
        ${badge}
      </g>`;
    }

    
    const y = this._qy(op.qubit);
    return `<g class="gate-group" data-col="${op.col}" data-qubit="${op.qubit}" style="cursor:pointer">
      <rect x="${x-17}" y="${y-17}" width="34" height="34" rx="7" fill="${color}"/>
      <text x="${x}" y="${y+1}" font-size="12" font-weight="600" fill="white"
            text-anchor="middle" dominant-baseline="central" font-family="monospace">${label}</text>
    </g>`;
  }

  
  _attach() {
   
    this.svg.querySelectorAll('.cell-target').forEach(el => {
      el.addEventListener('click', () =>
        this.callbacks.onClickCell(+el.dataset.col, +el.dataset.qubit));
      
      el.addEventListener('dragover', e => e.preventDefault());
      el.addEventListener('drop', e => {
        e.preventDefault();
        const gate = e.dataTransfer?.getData('gate');
        if (gate) this.callbacks.onDropCell(+el.dataset.col, +el.dataset.qubit, gate);
      });
    });

    
    this.svg.querySelectorAll('.gate-group').forEach(el => {
      el.addEventListener('click', () =>
        this.callbacks.onClickGate(+el.dataset.col, +el.dataset.qubit));
    });

    
    this.svg.querySelectorAll('.del-row').forEach(el => {
      el.addEventListener('click', () =>
        this.callbacks.onDeleteRow(+el.dataset.qubit));
    });
  }

 
  startDrag(gateName, originX, originY) {
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.textContent = GATE_LABEL[gateName] ?? gateName;
    ghost.style.background = GATE_COLOR[gateName] ?? '#888';
    ghost.style.left = originX + 'px';
    ghost.style.top  = originY + 'px';
    document.body.appendChild(ghost);
    this._drag = { gate: gateName, ghost };
  }

  _onMouseMove(e) {
    if (!this._drag) return;
    this._drag.ghost.style.left = (e.clientX - 17) + 'px';
    this._drag.ghost.style.top  = (e.clientY - 17) + 'px';
  }

  _onMouseUp(e) {
    if (!this._drag) return;
    this._drag.ghost.remove();
    const gate = this._drag.gate;
    this._drag = null;

    // Find which cell the mouse is over
    const svgRect = this.svg.getBoundingClientRect();
    const mx = e.clientX - svgRect.left;
    const my = e.clientY - svgRect.top;

    const col   = Math.floor((mx - LEFT_PAD) / COL_W);
    const qubit = Math.floor((my - TOP_PAD + ROW_H/2) / ROW_H);

    if (col >= 0 && col < this.circuit.numCols &&
        qubit >= 0 && qubit < this.circuit.numQubits) {
      this.callbacks.onDropCell(col, qubit, gate);
    }
  }

  

  _cx(col)   { return LEFT_PAD + col * COL_W + COL_W / 2; }
  _qy(qubit) { return TOP_PAD  + qubit * ROW_H + ROW_H / 2; }

  destroy() {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup',   this._onMouseUp);
  }
}