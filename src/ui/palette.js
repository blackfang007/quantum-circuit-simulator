export const PALETTE_GROUPS = [
  {
    label: 'Single qubit',
    gates: [
      { name:'H',   color:'#6c5ce7', desc:'Hadamard — creates superposition',        matrix:'1/√2 [[1,1],[1,-1]]' },
      { name:'X',   color:'#e17055', desc:'Pauli-X — quantum NOT gate',              matrix:'[[0,1],[1,0]]' },
      { name:'Y',   color:'#fd79a8', desc:'Pauli-Y — bit + phase flip',              matrix:'[[0,-i],[i,0]]' },
      { name:'Z',   color:'#00b894', desc:'Pauli-Z — phase flip on |1⟩',            matrix:'[[1,0],[0,-1]]' },
      { name:'S',   color:'#0984e3', desc:'Phase gate — applies i to |1⟩',          matrix:'[[1,0],[0,i]]' },
      { name:'Sdg', color:'#0984e3', desc:'S† — inverse phase gate',                matrix:'[[1,0],[0,-i]]' },
      { name:'T',   color:'#e67e22', desc:'T gate — applies e^(iπ/4) to |1⟩',      matrix:'[[1,0],[0,e^iπ/4]]' },
      { name:'Tdg', color:'#e67e22', desc:'T† — inverse T gate',                    matrix:'[[1,0],[0,e^-iπ/4]]' },
    ],
  },
  {
    label: 'Rotation',
    gates: [
      { name:'Rx',  color:'#27ae60', desc:'Rotate around X axis by π/2',            matrix:'[[cos θ/2, -i·sin θ/2],[-i·sin θ/2, cos θ/2]]' },
      { name:'Ry',  color:'#27ae60', desc:'Rotate around Y axis by π/2',            matrix:'[[cos θ/2, -sin θ/2],[sin θ/2, cos θ/2]]' },
      { name:'Rz',  color:'#27ae60', desc:'Rotate around Z axis by π/4',            matrix:'[[e^-iθ/2, 0],[0, e^iθ/2]]' },
    ],
  },
  {
    label: 'Two qubit',
    gates: [
      { name:'CNOT', color:'#6c5ce7', desc:'Controlled-NOT — flips target if ctrl=1', matrix:'|00⟩→|00⟩  |01⟩→|01⟩\n|10⟩→|11⟩  |11⟩→|10⟩' },
      { name:'SWAP', color:'#6c5ce7', desc:'Swap two qubit states',                   matrix:'|01⟩↔|10⟩' },
    ],
  },
  {
    label: 'Measure',
    gates: [
      { name:'M',   color:'#d63031', desc:'Measure — collapses to 0 or 1 (Born rule)', matrix:'P(0)=|α|²  P(1)=|β|²' },
    ],
  },
];

export class Palette {
  /**
   * @param {HTMLElement} containerEl
   * @param {function}    onSelect — called with gate name string when user clicks
   */
  constructor(containerEl, onSelect) {
    this.el       = containerEl;
    this.onSelect = onSelect;
    this.selected = 'H';
    this._tooltip = null;
  }

  render() {
    this.el.innerHTML = '';

    // Tooltip element (shared, repositioned on hover)
    this._tooltip = document.createElement('div');
    this._tooltip.className = 'gate-tooltip';
    this._tooltip.hidden = true;
    document.body.appendChild(this._tooltip);

    for (const group of PALETTE_GROUPS) {
      const section = document.createElement('div');
      section.className = 'palette-group';

      const label = document.createElement('div');
      label.className = 'palette-group-label';
      label.textContent = group.label;
      section.appendChild(label);

      const grid = document.createElement('div');
      grid.className = 'palette-grid';

      for (const gate of group.gates) {
        const btn = document.createElement('button');
        btn.className = 'palette-gate' + (gate.name === this.selected ? ' selected' : '');
        btn.dataset.gate = gate.name;
        btn.textContent = gate.name;
        btn.style.setProperty('--gate-color', gate.color);

        btn.addEventListener('click', () => {
          this.selected = gate.name;
          this.el.querySelectorAll('.palette-gate').forEach(b =>
            b.classList.toggle('selected', b.dataset.gate === gate.name));
          this.onSelect(gate.name);
        });

        btn.addEventListener('mouseenter', (e) => this._showTooltip(e, gate));
        btn.addEventListener('mouseleave', () => { this._tooltip.hidden = true; });

        grid.appendChild(btn);
      }

      section.appendChild(grid);
      this.el.appendChild(section);
    }
  }

  _showTooltip(e, gate) {
    this._tooltip.innerHTML = `
      <div class="tt-name" style="color:${gate.color}">${gate.name}</div>
      <div class="tt-desc">${gate.desc}</div>
      <div class="tt-matrix">${gate.matrix}</div>
    `;
    this._tooltip.hidden = false;

    const rect = e.target.getBoundingClientRect();
    this._tooltip.style.left = (rect.right + 10) + 'px';
    this._tooltip.style.top  = rect.top + 'px';
  }

  destroy() {
    if (this._tooltip) this._tooltip.remove();
  }
}