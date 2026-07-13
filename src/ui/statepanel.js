export class StatePanel {
  constructor(containerEl) {
    this.el          = containerEl;
    this.threshold   = 0.01; 
    this.activeTab   = 'sv';
    this._lastState  = null;
  }

  update(state, measureResults) {
    this._lastState = state;
    this.el.innerHTML = `
      <div class="sp-tabs">
        <button class="sp-tab ${this.activeTab==='sv'?'on':''}"    data-tab="sv">State vector</button>
        <button class="sp-tab ${this.activeTab==='bloch'?'on':''}" data-tab="bloch">Bloch sphere</button>
        <button class="sp-tab ${this.activeTab==='hist'?'on':''}"  data-tab="hist">Histogram</button>
      </div>
      <label class="threshold-row">
        <input type="checkbox" id="chk-threshold" ${this.threshold > 0 ? 'checked' : ''}/>
        Hide amplitudes &lt; 1%
      </label>
      <div class="sp-pane" id="pane-sv"    ${this.activeTab!=='sv'    ? 'hidden':''}>
        ${this._buildSV(state)}
      </div>
      <div class="sp-pane" id="pane-bloch" ${this.activeTab!=='bloch' ? 'hidden':''}>
        ${this._buildBloch(state)}
      </div>
      <div class="sp-pane" id="pane-hist"  ${this.activeTab!=='hist'  ? 'hidden':''}>
        ${this._buildHist(state)}
      </div>`;
    this._attachEvents();
  }

 

  _buildSV(state) {
    const n     = state.n;
    const probs = state.probabilities();
    const maxP  = Math.max(...probs, 1e-10);

    let html = '<div class="sv-list">';
    for (let i = 0; i < state.dim; i++) {
      const p = probs[i];
      if (this.threshold > 0 && p < this.threshold && p < 0.0001) continue;

      const basis = i.toString(2).padStart(n, '0');
      const pct   = (p * 100).toFixed(1);
      const bar   = (p / maxP * 100).toFixed(1);
      const amp   = state.amplitudes[i];
      const phase = amp.phase();                  // -π to π
      const hue   = ((phase / Math.PI) * 180 + 360) % 360;
      const color = `hsl(${hue.toFixed(0)},70%,55%)`;
      const re    = amp.re >= 0 ? ` ${amp.re.toFixed(3)}` : amp.re.toFixed(3);
      const im    = amp.im >= 0 ? `+${amp.im.toFixed(3)}i` : `${amp.im.toFixed(3)}i`;

      html += `
        <div class="sv-row ${p < 0.001 ? 'sv-dim' : ''}">
          <span class="sv-basis">|${basis}⟩</span>
          <div class="sv-right">
            <div class="sv-barrow">
              <div class="sv-track">
                <div class="sv-bar" style="width:${bar}%;background:${color}"></div>
              </div>
              <span class="sv-pct">${pct}%</span>
            </div>
            <div class="sv-amp">${re}${im} &nbsp;|z|=${amp.abs().toFixed(3)} φ=${(phase*180/Math.PI).toFixed(0)}°</div>
          </div>
        </div>`;
    }
    html += '</div>';
    return html;
  }

  

  _buildBloch(state) {
    const bv  = state.blochVector(0);
    const mag = Math.sqrt(bv.x**2 + bv.y**2 + bv.z**2);

    return `
      <div class="bloch-wrap">${this._blochSVG(bv)}</div>
      <div class="bloch-coords">
        x = ${bv.x.toFixed(3)}&nbsp;&nbsp;y = ${bv.y.toFixed(3)}&nbsp;&nbsp;z = ${bv.z.toFixed(3)}
      </div>
      <div class="bloch-mag">
        |r| = ${mag.toFixed(3)} — ${mag > 0.99 ? 'pure state' : 'mixed state (entangled)'}
      </div>
      ${state.n > 1 ? '<p class="bloch-note">Reduced state of q₀. |r| &lt; 1 means q₀ is entangled.</p>' : ''}
    `;
  }

  _blochSVG(bv) {
    const cx = 95, cy = 100, R = 72;
    const px = cx + R * (bv.x * 0.85 + bv.y * 0.25);
    const py = cy - R * (bv.z   + bv.y * 0.2);
    const mag = Math.sqrt(bv.x**2 + bv.y**2 + bv.z**2);
    const pureColor = mag > 0.99 ? '#6c5ce7' : '#b2bec3';

    return `<svg width="190" height="215" viewBox="0 0 190 215">
      <!-- Sphere outline -->
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--border)" stroke-width="0.5"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${R}" ry="${R*0.32}"
               fill="none" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="4 3"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${R*0.32}" ry="${R}"
               fill="none" stroke="var(--border)" stroke-width="0.5" opacity="0.5"/>
      <!-- Axes -->
      <line x1="${cx}" y1="${cy-R-10}" x2="${cx}" y2="${cy+R+10}"
            stroke="var(--muted)" stroke-width="0.5"/>
      <line x1="${cx-R-10}" y1="${cy}" x2="${cx+R+10}" y2="${cy}"
            stroke="var(--muted)" stroke-width="0.5"/>
      <!-- Axis labels -->
      <text x="${cx}" y="${cy-R-14}" text-anchor="middle" font-size="11"
            fill="var(--label)" font-family="monospace">|0⟩</text>
      <text x="${cx}" y="${cy+R+22}" text-anchor="middle" font-size="11"
            fill="var(--label)" font-family="monospace">|1⟩</text>
      <text x="${cx+R+14}" y="${cy+4}" font-size="11"
            fill="var(--label)" font-family="monospace">x</text>
      <!-- Bloch vector -->
      <line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}"
            stroke="${pureColor}" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="${px}" cy="${py}" r="5.5" fill="${pureColor}"/>
      <!-- Origin dot -->
      <circle cx="${cx}" cy="${cy}" r="2" fill="var(--muted)"/>
    </svg>`;
  }

  

  _buildHist(state) {
    const SHOTS = 1024;
    const counts = new Array(state.dim).fill(0);
    for (let s = 0; s < SHOTS; s++) {
      const outcome = state.clone().measureAll();
      counts[parseInt(outcome, 2)]++;
    }

    const maxC = Math.max(...counts, 1);
    const n    = state.n;
    let bars = '';
    for (let i = 0; i < state.dim; i++) {
      const basis  = i.toString(2).padStart(n, '0');
      const pct    = (counts[i] / SHOTS * 100).toFixed(1);
      const hPct   = (counts[i] / maxC * 100).toFixed(1);
      const phase  = state.amplitudes[i].phase();
      const hue    = ((phase / Math.PI) * 180 + 360) % 360;
      const color  = counts[i] > 0 ? `hsl(${hue.toFixed(0)},65%,55%)` : 'var(--border)';

      bars += `
        <div class="hb-col">
          <div class="hb-pct">${pct > 0 ? pct+'%' : ''}</div>
          <div class="hb-bar-wrap">
            <div class="hb-bar" style="height:${hPct}%;background:${color}"></div>
          </div>
          <div class="hb-label">|${basis}⟩</div>
          <div class="hb-count">${counts[i]}</div>
        </div>`;
    }

    return `
      <div class="hb-title">${SHOTS} simulated shots — bar color = phase angle</div>
      <div class="hb-chart">${bars}</div>`;
  }

  

  _attachEvents() {
    this.el.querySelectorAll('.sp-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.dataset.tab;
        this.el.querySelectorAll('.sp-tab').forEach(t =>
          t.classList.toggle('on', t === tab));
        this.el.querySelectorAll('.sp-pane').forEach(p =>
          p.hidden = p.id !== 'pane-' + this.activeTab);
      });
    });

    const chk = this.el.querySelector('#chk-threshold');
    if (chk) {
      chk.addEventListener('change', () => {
        this.threshold = chk.checked ? 0.01 : 0;
        if (this._lastState) this.update(this._lastState, new Map());
      });
    }
  }
}