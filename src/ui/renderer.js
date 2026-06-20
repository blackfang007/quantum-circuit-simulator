/**
 * renderer.js — renders the Circuit as an interactive SVG grid
 *
 * Purely a view: reads from Circuit, writes to an <svg> element.
 * All state changes go back through the Circuit model, not this file.
 *
 * COORDINATE SYSTEM:
 *   x = LEFT_PAD + col * COL_W + COL_W/2   (centre of column)
 *   y = TOP_PAD  + qubit * ROW_H + ROW_H/2  (centre of qubit row)
 */

import { GATE_META } from '../gates/gates.js';

const LEFT_PAD = 56;  // space for qubit labels on left
const TOP_PAD  = 24;  // space at top
const ROW_H    = 56;  // height per qubit row
const COL_W    = 68;  // width per time column

export class Renderer {
  /**
   * @param {SVGElement}  svgEl     — the <svg> DOM element to render into
   * @param {Circuit}     circuit   — the circuit data model
   * @param {object}      callbacks — { onClickCell(col, qubit), onClickGate(col, qubit) }
   */
  constructor(svgEl, circuit, callbacks) {
    this.svg       = svgEl;
    this.circuit   = circuit;
    this.callbacks = callbacks;
  }

  render(measureResults = new Map()) {
    const { numQubits, numCols } = this.circuit;
    const W = LEFT_PAD + numCols * COL_W + 24;
    const H = TOP_PAD  + numQubits * ROW_H + 32;

    this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    this.svg.setAttribute('width',  W);
    this.svg.setAttribute('height', H);

    this.svg.innerHTML = this._buildSVG(numQubits, numCols, W, measureResults);
    this._attachListeners();
  }

  // ── Private builders ──────────────────────────────────────────────

  _buildSVG(numQubits, numCols, W, measureResults) {
    let html = '';

    // Wire lines for each qubit
    for (let q = 0; q < numQubits; q++) {
      const y = this._qy(q);
      html += `<line x1="${LEFT_PAD - 10}" y1="${y}" x2="${W - 16}" y2="${y}"
                     stroke="var(--wire)" stroke-width="1" opacity="0.4"/>`;
      html += `<text x="4" y="${y}" font-size="12" fill="var(--label)"
                     dominant-baseline="central" font-family="monospace">q${q}|0⟩</text>`;
    }

    // Hit-target circles on the grid (invisible, just for click detection)
    for (let c = 0; c < numCols; c++) {
      for (let q = 0; q < numQubits; q++) {
        const x = this._cx(c), y = this._qy(q);
        if (!this.circuit.hasGateAt(c, q)) {
          html += `<circle cx="${x}" cy="${y}" r="12" fill="transparent"
                            class="cell-target" data-col="${c}" data-qubit="${q}"
                            style="cursor:crosshair"/>`;
        }
      }
    }

    // Render each placed gate
    for (const op of this.circuit.ops) {
      const mResult = measureResults.get(`${op.col}:${op.qubit}`);
      html += this._renderOp(op, mResult);
    }

    return html;
  }

  _renderOp(op, measureResult) {
    const meta = GATE_META[op.gate] ?? { label: op.gate, color: '#888' };
    const x    = this._cx(op.col);

    // ── CNOT ──────────────────────────────────────────────────────
    if (op.gate === 'CNOT') {
      const cy = this._qy(op.ctrl);
      const ty = this._qy(op.target);
      return `<g class="gate-group" data-col="${op.col}" data-qubit="${op.qubit}" style="cursor:pointer">
        <line x1="${x}" y1="${cy}" x2="${x}" y2="${ty}" stroke="${meta.color}" stroke-width="1.5"/>
        <circle cx="${x}" cy="${cy}" r="6" fill="${meta.color}"/>
        <circle cx="${x}" cy="${ty}" r="11" fill="none" stroke="${meta.color}" stroke-width="1.5"/>
        <line x1="${x-11}" y1="${ty}" x2="${x+11}" y2="${ty}" stroke="${meta.color}" stroke-width="1.5"/>
        <line x1="${x}" y1="${ty-11}" x2="${x}" y2="${ty+11}" stroke="${meta.color}" stroke-width="1.5"/>
        <rect x="${x-14}" y="${Math.min(cy,ty)-14}" width="28"
              height="${Math.abs(ty-cy)+28}" fill="transparent"/>
      </g>`;
    }

    // ── SWAP ──────────────────────────────────────────────────────
    if (op.gate === 'SWAP') {
      const y1 = this._qy(op.qubit);
      const y2 = this._qy(op.target ?? op.qubit + 1);
      const X = (cx, cy, r) =>
        `<line x1="${cx-r}" y1="${cy-r}" x2="${cx+r}" y2="${cy+r}" stroke="${meta.color}" stroke-width="2"/>
         <line x1="${cx+r}" y1="${cy-r}" x2="${cx-r}" y2="${cy+r}" stroke="${meta.color}" stroke-width="2"/>`;
      return `<g class="gate-group" data-col="${op.col}" data-qubit="${op.qubit}" style="cursor:pointer">
        <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${meta.color}" stroke-width="1.5"/>
        ${X(x, y1, 7)} ${X(x, y2, 7)}
        <rect x="${x-14}" y="${Math.min(y1,y2)-14}" width="28"
              height="${Math.abs(y2-y1)+28}" fill="transparent"/>
      </g>`;
    }

    // ── Measure ───────────────────────────────────────────────────
    if (op.gate === 'M') {
      const y = this._qy(op.qubit);
      const resultLabel = measureResult !== undefined
        ? `<text x="${x}" y="${y+26}" font-size="11" text-anchor="middle"
                 fill="${meta.color}" font-family="monospace" font-weight="bold">=${measureResult}</text>`
        : '';
      return `<g class="gate-group" data-col="${op.col}" data-qubit="${op.qubit}" style="cursor:pointer">
        <rect x="${x-15}" y="${y-15}" width="30" height="30" rx="5"
              fill="none" stroke="${meta.color}" stroke-width="1.5"/>
        <path d="M${x-8} ${y+4} Q${x} ${y-8} ${x+8} ${y+4}" stroke="${meta.color}" stroke-width="1.5" fill="none"/>
        <line x1="${x}" y1="${y-1}" x2="${x+7}" y2="${y-9}" stroke="${meta.color}" stroke-width="1.5"/>
        ${resultLabel}
      </g>`;
    }

    // ── Standard single-qubit gate ────────────────────────────────
    const y = this._qy(op.qubit);
    return `<g class="gate-group" data-col="${op.col}" data-qubit="${op.qubit}" style="cursor:pointer">
      <rect x="${x-16}" y="${y-16}" width="32" height="32" rx="7"
            fill="${meta.color}" opacity="0.9"/>
      <text x="${x}" y="${y+1}" font-size="12" font-weight="500" fill="white"
            text-anchor="middle" dominant-baseline="central" font-family="monospace">
        ${meta.label}
      </text>
    </g>`;
  }

  _attachListeners() {
    // Click on empty cell → place gate
    this.svg.querySelectorAll('.cell-target').forEach(el => {
      el.addEventListener('click', () => {
        const col   = +el.dataset.col;
        const qubit = +el.dataset.qubit;
        this.callbacks.onClickCell(col, qubit);
      });
    });

    // Click on placed gate → remove it
    this.svg.querySelectorAll('.gate-group').forEach(el => {
      el.addEventListener('click', () => {
        const col   = +el.dataset.col;
        const qubit = +el.dataset.qubit;
        this.callbacks.onClickGate(col, qubit);
      });
    });
  }

  // ── Coordinate helpers ────────────────────────────────────────────

  _cx(col)   { return LEFT_PAD + col * COL_W + COL_W / 2; }
  _qy(qubit) { return TOP_PAD  + qubit * ROW_H + ROW_H / 2; }
}
