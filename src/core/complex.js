/**
 * complex.js — immutable complex number arithmetic
 *
 * Every quantum amplitude is a complex number (re + im·i).
 * All functions here are pure — they return new objects, never mutate.
 *
 * WHY: Quantum gates are unitary matrices over ℂ. Every probability
 * amplitude in the state vector is a complex number. Without these
 * primitives nothing in the simulator works.
 */

export class Complex {
  constructor(re = 0, im = 0) {
    this.re = re;
    this.im = im;
  }

  // ── Arithmetic ────────────────────────────────────────────────────

  add(other) {
    return new Complex(this.re + other.re, this.im + other.im);
  }

  sub(other) {
    return new Complex(this.re - other.re, this.im - other.im);
  }

  // (a+bi)(c+di) = (ac-bd) + (ad+bc)i
  mul(other) {
    return new Complex(
      this.re * other.re - this.im * other.im,
      this.re * other.im + this.im * other.re
    );
  }

  // Scale by a real scalar (used when normalising state vectors)
  scale(r) {
    return new Complex(this.re * r, this.im * r);
  }

  // Complex conjugate: flip imaginary sign
  conj() {
    return new Complex(this.re, -this.im);
  }

  // ── Derived quantities ────────────────────────────────────────────

  // |z|² = re² + im²  — used for Born-rule probabilities (no sqrt needed)
  abs2() {
    return this.re * this.re + this.im * this.im;
  }

  // |z| — magnitude/modulus
  abs() {
    return Math.sqrt(this.abs2());
  }

  // Phase angle in radians (arg z)
  phase() {
    return Math.atan2(this.im, this.re);
  }

  // ── Factories ─────────────────────────────────────────────────────

  // e^(iθ) = cos θ + i sin θ  — Euler's formula, used for Rz/phase gates
  static fromPolar(r, theta) {
    return new Complex(r * Math.cos(theta), r * Math.sin(theta));
  }

  static ZERO = new Complex(0, 0);
  static ONE  = new Complex(1, 0);
  static I    = new Complex(0, 1);

  toString() {
    const sign = this.im >= 0 ? '+' : '-';
    return `${this.re.toFixed(4)}${sign}${Math.abs(this.im).toFixed(4)}i`;
  }
}