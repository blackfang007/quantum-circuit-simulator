/**
 * qasmpanel.js — live QASM / Qiskit code panel
 *
 * Displays the circuit as OpenQASM 2.0 or Qiskit Python,
 * updating every time the circuit changes.
 */

export class QASMPanel {
  constructor(containerEl) {
    this.el   = containerEl;
    this.mode = 'qasm'; // 'qasm' | 'qiskit'
  }

  update(circuit) {
    const code = this.mode === 'qasm' ? circuit.toQASM() : circuit.toQiskit();
    this.el.innerHTML = `
      <div class="qp-header">
        <div class="qp-tabs">
          <button class="qp-tab ${this.mode==='qasm'?'on':''}"   data-mode="qasm">QASM</button>
          <button class="qp-tab ${this.mode==='qiskit'?'on':''}" data-mode="qiskit">Qiskit</button>
        </div>
        <button class="qp-copy" title="Copy to clipboard">⎘ Copy</button>
      </div>
      <pre class="qp-code">${this._highlight(code, this.mode)}</pre>`;

    this.el.querySelectorAll('.qp-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.mode = tab.dataset.mode;
        this.update(circuit);
      });
    });

    this.el.querySelector('.qp-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(code).then(() => {
        const btn = this.el.querySelector('.qp-copy');
        btn.textContent = '✓ Copied';
        setTimeout(() => { btn.textContent = '⎘ Copy'; }, 1500);
      });
    });
  }

  _highlight(code, mode) {
    // Simple syntax highlighting — wrap keywords in spans
    const escape = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    let safe = escape(code);

    if (mode === 'qasm') {
      // Keywords
      safe = safe.replace(/\b(OPENQASM|include|qreg|creg|measure|if)\b/g,
        '<span class="kw">$1</span>');
      // Gate names (lowercase single tokens at start of statement)
      safe = safe.replace(/^(\s*)(h|x|y|z|s|sdg|t|tdg|cx|swap|rz|rx|ry)\b/gm,
        '$1<span class="gate">$2</span>');
      // Strings
      safe = safe.replace(/"([^"]*)"/g, '<span class="str">"$1"</span>');
      // Numbers
      safe = safe.replace(/\b(\d+(\.\d+)?)\b/g, '<span class="num">$1</span>');
      // Comments
      safe = safe.replace(/(\/\/.*)/g, '<span class="cmt">$1</span>');
    } else {
      // Python keywords
      safe = safe.replace(/\b(from|import|as|print)\b/g, '<span class="kw">$1</span>');
      // QuantumCircuit and qc methods
      safe = safe.replace(/\b(QuantumCircuit)\b/g, '<span class="cls">$1</span>');
      safe = safe.replace(/\b(qc)\b/g, '<span class="obj">$1</span>');
      // Strings
      safe = safe.replace(/'([^']*)'/g, '<span class="str">\'$1\'</span>');
      // Numbers
      safe = safe.replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
      // Comments
      safe = safe.replace(/(#.*)/g, '<span class="cmt">$1</span>');
    }

    return safe;
  }
}