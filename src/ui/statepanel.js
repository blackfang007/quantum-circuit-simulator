/**
 * statepanel.js — displays the quantum state after simulation
 *
 * Three views:
 *   1. State vector  — probability bars + complex amplitudes for each basis state
 *   2. Bloch sphere  — geometric representation of qubit 0's reduced state
 *   3. Histogram     — probability distribution (for repeated measurement view)
 */

export class StatePanel {
  /**
   * @param {HTMLElement} container — the panel DOM element
   */
  constructor(container) {
    this.container = container;
  }

  /**
   * Re-render the panel after a simulation run.
   *
   * @param {StateVector} state
   * @param {Map}         measureResults — from runner.runCircuit()
   */
  update(state, measureResults) {
    this.container.innerHTML = `
      <div class="tab-row">
        <button class="tab active" data-tab="sv">State vector</button>
        <button class="tab" data-tab="bloch">Bloch sphere</button>
        <button class="tab" data-tab="hist">Histogram</button>
      </div>
      <div data-pane="sv">${this._buildStateVector(state, measureResults)}</div>
      <div data-pane="bloch" hidden>${this._buildBloch(state)}</div>
      <div data-pane="hist" hidden>${this._buildHistogram(state)}</div>
    `;
    this._attachTabs();
  }

  // ── Pane builders ─────────────────────────────────────────────────

  _buildStateVector(state, measureResults) {
    const n   = state.n;
    const dim = state.dim;
    const probs = state.probabilities();
    const maxP  = Math.max(...probs, 1e-10);

    let html = '<div class="sv-list">';
    for (let i = 0; i < dim; i++) {
      const basis  = i.toString(2).padStart(n, '0');
      const p      = probs[i];
      const pct    = (p * 100).toFixed(1);
      const barPct = (p / maxP * 100).toFixed(1);
      const amp    = state.amplitudes[i];
      const mag    = amp.abs().toFixed(3);
      const phase  = (amp.phase() * 180 / Math.PI).toFixed(0);
      const re     = amp.re.toFixed(3);
      const im     = amp.im >= 0 ? `+${amp.im.toFixed(3)}` : amp.im.toFixed(3);

      html += `
        <div class="sv-row">
          <span class="sv-basis">|${basis}⟩</span>
          <div class="sv-right">
            <div class="sv-bar-row">
              <div class="sv-bar-track">
                <div class="sv-bar" style="width:${barPct}%"></div>
              </div>
              <span class="sv-pct">${pct}%</span>
            </div>
            <div class="sv-amp">${re}${im}i &nbsp;|&nbsp; |z|=${mag} &nbsp; φ=${phase}°</div>
          </div>
        </div>`;
    }
    html += '</div>';
    return html;
  }

  _buildBloch(state) {
    const bv = state.blochVector(0);
    const mag = Math.sqrt(bv.x**2 + bv.y**2 + bv.z**2);
    const svg = this._blochSVG(bv);
    const mixed = mag < 0.99;
    return `
      <div class="bloch-wrap">${svg}</div>
      <div class="bloch-info">
        q₀: x=${bv.x.toFixed(3)}, y=${bv.y.toFixed(3)}, z=${bv.z.toFixed(3)}<br>
        |r|=${mag.toFixed(3)} ${mixed ? '← mixed state (entangled)' : '← pure state'}
      </div>
      ${state.n > 1 ? '<p class="bloch-note">Shows reduced state of q₀ only. Bloch vector shrinks when q₀ is entangled with other qubits.</p>' : ''}
    `;
  }

  _buildHistogram(state) {
    // Simulate 1024 measurements to show the distribution
    const SHOTS = 1024;
    const counts = new Array(state.dim).fill(0);
    for (let s = 0; s < SHOTS; s++) {
      const outcome = state.clone().measureAll();
      counts[parseInt(outcome, 2)]++;
    }

    const n = state.n;
    let html = `<div class="hist-title">Simulated ${SHOTS} measurements</div><div class="hist-bars">`;
    for (let i = 0; i < state.dim; i++) {
      const basis = i.toString(2).padStart(n, '0');
      const pct   = (counts[i] / SHOTS * 100).toFixed(1);
      html += `
        <div class="hist-item">
          <div class="hist-bar-wrap">
            <div class="hist-bar" style="height:${pct}%"></div>
          </div>
          <div class="hist-label">|${basis}⟩</div>
          <div class="hist-count">${counts[i]}</div>
        </div>`;
    }
    html += '</div>';
    return html;
  }

  _blochSVG(bv) {
    // Simple 3D-ish projection: x→right, y→depth (scaled), z→up
    const cx = 90, cy = 90, R = 65;
    const px = cx + R * (bv.x * 0.85 + bv.y * 0.25);
    const py = cy - R * (bv.z + bv.y * 0.2);

    return `<svg width="180" height="200" viewBox="0 0 180 200">
      <ellipse cx="${cx}" cy="${cy}" rx="${R}" ry="${R*0.33}"
               fill="none" stroke="var(--wire)" stroke-width="0.5" stroke-dasharray="4 3"/>
      <circle cx="${cx}" cy="${cy}" r="${R}"
              fill="none" stroke="var(--wire)" stroke-width="0.5"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${R*0.33}" ry="${R}"
               fill="none" stroke="var(--wire)" stroke-width="0.5" opacity="0.5"/>
      <line x1="${cx}" y1="${cy-R-8}" x2="${cx}" y2="${cy+R+8}"
            stroke="var(--wire)" stroke-width="0.5"/>
      <line x1="${cx-R-8}" y1="${cy}" x2="${cx+R+8}" y2="${cy}"
            stroke="var(--wire)" stroke-width="0.5"/>
      <text x="${cx}" y="${cy-R-13}" text-anchor="middle"
            font-size="11" fill="var(--label)" font-family="monospace">|0⟩</text>
      <text x="${cx}" y="${cy+R+20}" text-anchor="middle"
            font-size="11" fill="var(--label)" font-family="monospace">|1⟩</text>
      <text x="${cx+R+10}" y="${cy+4}" font-size="11" fill="var(--label)" font-family="monospace">x</text>
      <line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}"
            stroke="#534AB7" stroke-width="2" stroke-linecap="round"/>
      <circle cx="${px}" cy="${py}" r="5" fill="#534AB7"/>
    </svg>`;
  }

  // ── Tab switching ─────────────────────────────────────────────────

  _attachTabs() {
    this.container.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const paneId = tab.dataset.tab;
        this.container.querySelectorAll('.tab').forEach(t =>
          t.classList.toggle('active', t === tab));
        this.container.querySelectorAll('[data-pane]').forEach(p =>
          p.hidden = p.dataset.pane !== paneId);
      });
    });
  }
}
