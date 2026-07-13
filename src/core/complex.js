export class Complex {
  constructor(re = 0, im = 0) {
    this.re = re;
    this.im = im;
  }



  add(other) {
    return new Complex(this.re + other.re, this.im + other.im);
  }

  sub(other) {
    return new Complex(this.re - other.re, this.im - other.im);
  }

  
  mul(other) {
    return new Complex(
      this.re * other.re - this.im * other.im,
      this.re * other.im + this.im * other.re
    );
  }

  
  scale(r) {
    return new Complex(this.re * r, this.im * r);
  }

  
  conj() {
    return new Complex(this.re, -this.im);
  }


  abs2() {
    return this.re * this.re + this.im * this.im;
  }


  abs() {
    return Math.sqrt(this.abs2());
  }


  phase() {
    return Math.atan2(this.im, this.re);
  }

  

  
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