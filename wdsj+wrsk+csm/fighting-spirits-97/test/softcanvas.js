// 软件Canvas光栅器 + PNG输出 : 用于无头视觉验证
'use strict';
const zlib = require('zlib');
const fs = require('fs');

function parseColor(s){
  if (typeof s !== 'string') return null; // gradient object
  s = s.trim();
  if (s[0] === '#'){
    if (s.length === 4) return [parseInt(s[1]+s[1],16), parseInt(s[2]+s[2],16), parseInt(s[3]+s[3],16), 255];
    return [parseInt(s.slice(1,3),16), parseInt(s.slice(3,5),16), parseInt(s.slice(5,7),16), 255];
  }
  let m = /rgba?\(([^)]+)\)/.exec(s);
  if (m){
    const p = m[1].split(',').map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? Math.round(p[3] * 255) : 255];
  }
  return [0, 0, 0, 255];
}

class Gradient {
  constructor(type, args){ this.type = type; this.args = args; this.stops = []; }
  addColorStop(t, c){ this.stops.push([t, parseColor(c)]); this.stops.sort((a,b)=>a[0]-b[0]); }
  colorAt(x, y){
    if (this.stops.length === 0) return [0,0,0,0];
    let t = 0;
    if (this.type === 'linear'){
      const [x0,y0,x1,y1] = this.args;
      const dx = x1-x0, dy = y1-y0, len2 = dx*dx+dy*dy || 1;
      t = ((x-x0)*dx + (y-y0)*dy) / len2;
    } else {
      const [x0,y0,r0,x1,y1,r1] = this.args;
      const d = Math.hypot(x-x1, y-y1);
      t = (d - r0) / ((r1 - r0) || 1);
    }
    t = Math.max(0, Math.min(1, t));
    let lo = this.stops[0], hi = this.stops[this.stops.length-1];
    for (let i = 0; i < this.stops.length-1; i++){
      if (t >= this.stops[i][0] && t <= this.stops[i+1][0]){ lo = this.stops[i]; hi = this.stops[i+1]; break; }
    }
    const span = (hi[0]-lo[0]) || 1;
    const k = Math.max(0, Math.min(1, (t - lo[0]) / span));
    return [0,1,2,3].map(i => Math.round(lo[1][i] + (hi[1][i]-lo[1][i])*k));
  }
}

class SoftCtx {
  constructor(canvas){
    this.canvas = canvas;
    this.fillStyle = '#000'; this.strokeStyle = '#000';
    this.lineWidth = 1; this.lineCap = 'butt'; this.lineJoin = 'miter';
    this.globalAlpha = 1; this.globalCompositeOperation = 'source-over';
    this.imageSmoothingEnabled = false;
    this.font = ''; this.textBaseline = 'top';
    this.m = { a:1, d:1, e:0, f:0 };
    this.stack = [];
    this.path = [];
    this.cur = null;
  }
  get _d(){ return this.canvas._data; }
  get _w(){ return this.canvas.width; }
  get _h(){ return this.canvas.height; }
  save(){ this.stack.push({ fillStyle:this.fillStyle, strokeStyle:this.strokeStyle, lineWidth:this.lineWidth, globalAlpha:this.globalAlpha, gco:this.globalCompositeOperation, m:Object.assign({},this.m) }); }
  restore(){ const s = this.stack.pop(); if (!s) return; this.fillStyle=s.fillStyle; this.strokeStyle=s.strokeStyle; this.lineWidth=s.lineWidth; this.globalAlpha=s.globalAlpha; this.globalCompositeOperation=s.gco; this.m=s.m; }
  translate(x,y){ this.m.e += this.m.a*x; this.m.f += this.m.d*y; }
  scale(sx,sy){ this.m.a *= sx; this.m.d *= sy; }
  rotate(){ /* 简化: 忽略旋转(仅特效用) */ }
  tx(x,y){ return [this.m.a*x + this.m.e, this.m.d*y + this.m.f]; }

  _blend(px, py, col, alpha){
    px |= 0; py |= 0;
    if (px < 0 || py < 0 || px >= this._w || py >= this._h) return;
    const i = (py * this._w + px) * 4, d = this._d;
    const a = (col[3] / 255) * alpha;
    if (this.globalCompositeOperation === 'source-in'){
      if (d[i+3] > 0){ d[i] = col[0]; d[i+1] = col[1]; d[i+2] = col[2]; }
      return;
    }
    if (a <= 0) return;
    const na = a + (d[i+3]/255) * (1-a);
    if (na <= 0) return;
    d[i]   = Math.round((col[0]*a + d[i]  *(d[i+3]/255)*(1-a)) / na);
    d[i+1] = Math.round((col[1]*a + d[i+1]*(d[i+3]/255)*(1-a)) / na);
    d[i+2] = Math.round((col[2]*a + d[i+2]*(d[i+3]/255)*(1-a)) / na);
    d[i+3] = Math.round(na * 255);
  }
  _styleColor(style, x, y){
    if (style instanceof Gradient) return style.colorAt(x, y);
    return parseColor(style);
  }
  clearRect(x, y, w, h){
    const [x0,y0] = this.tx(x,y), [x1,y1] = this.tx(x+w,y+h);
    const ax = Math.max(0, Math.min(x0,x1)|0), ay = Math.max(0, Math.min(y0,y1)|0);
    const bx = Math.min(this._w, Math.max(x0,x1)|0), by = Math.min(this._h, Math.max(y0,y1)|0);
    for (let yy = ay; yy < by; yy++) for (let xx = ax; xx < bx; xx++){
      const i = (yy*this._w+xx)*4; this._d[i]=this._d[i+1]=this._d[i+2]=this._d[i+3]=0;
    }
  }
  fillRect(x, y, w, h){
    const [x0,y0] = this.tx(x,y), [x1,y1] = this.tx(x+w,y+h);
    const ax = Math.min(x0,x1), ay = Math.min(y0,y1), bx = Math.max(x0,x1), by = Math.max(y0,y1);
    for (let yy = Math.round(ay); yy < Math.round(by); yy++)
      for (let xx = Math.round(ax); xx < Math.round(bx); xx++)
        this._blend(xx, yy, this._styleColor(this.fillStyle, xx, yy), this.globalAlpha);
  }
  strokeRect(x, y, w, h){
    const lw = Math.max(1, this.lineWidth * Math.abs(this.m.a));
    this.fillRectStyle(x, y, w, lw/Math.abs(this.m.d||1), this.strokeStyle);
    this.fillRectStyle(x, y+h-1, w, lw/Math.abs(this.m.d||1), this.strokeStyle);
    this.fillRectStyle(x, y, lw/Math.abs(this.m.a||1), h, this.strokeStyle);
    this.fillRectStyle(x+w-1, y, lw/Math.abs(this.m.a||1), h, this.strokeStyle);
  }
  fillRectStyle(x, y, w, h, style){
    const old = this.fillStyle; this.fillStyle = style; this.fillRect(x, y, w, h); this.fillStyle = old;
  }
  beginPath(){ this.path = []; this.cur = null; }
  moveTo(x, y){ this.cur = [this.tx(x,y)]; this.path.push(this.cur); }
  lineTo(x, y){ if (!this.cur) this.moveTo(x,y); else this.cur.push(this.tx(x,y)); }
  closePath(){ if (this.cur && this.cur.length) this.cur.push(this.cur[0].slice()); }
  arc(x, y, r, a0, a1, ccw){
    const pts = [];
    if (a1 == null){ a0 = 0; a1 = Math.PI*2; }
    const full = Math.abs(a1 - a0) >= Math.PI*2 - 0.001;
    const steps = 26;
    for (let i = 0; i <= steps; i++){
      const a = a0 + (a1-a0) * (i/steps);
      pts.push(this.tx(x + Math.cos(a)*r, y + Math.sin(a)*r));
    }
    this.cur = pts; this.path.push(pts);
  }
  ellipse(x, y, rx, ry, rot, a0, a1){
    const pts = [];
    for (let i = 0; i <= 26; i++){
      const a = (i/26) * Math.PI*2;
      pts.push(this.tx(x + Math.cos(a)*rx, y + Math.sin(a)*ry));
    }
    this.cur = pts; this.path.push(pts);
  }
  rect(x, y, w, h){
    this.cur = [this.tx(x,y), this.tx(x+w,y), this.tx(x+w,y+h), this.tx(x,y+h), this.tx(x,y)];
    this.path.push(this.cur);
  }
  fill(){
    // 扫描线 even-odd
    let minY = 1e9, maxY = -1e9, minX = 1e9, maxX = -1e9;
    for (const sp of this.path) for (const p of sp){
      minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
    }
    if (minY > maxY) return;
    for (let yy = Math.max(0, Math.floor(minY)); yy <= Math.min(this._h-1, Math.ceil(maxY)); yy++){
      const yc = yy + 0.5;
      const xs = [];
      for (const sp of this.path){
        for (let i = 0; i < sp.length - 1; i++){
          const [x0,y0] = sp[i], [x1,y1] = sp[i+1];
          if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)){
            xs.push(x0 + (yc - y0) / (y1 - y0) * (x1 - x0));
          }
        }
        // 隐式闭合
        if (sp.length > 1){
          const [x0,y0] = sp[sp.length-1], [x1,y1] = sp[0];
          if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)){
            xs.push(x0 + (yc - y0) / (y1 - y0) * (x1 - x0));
          }
        }
      }
      xs.sort((a,b)=>a-b);
      for (let k = 0; k + 1 < xs.length; k += 2){
        for (let xx = Math.max(0, Math.round(xs[k])); xx < Math.min(this._w, Math.round(xs[k+1])); xx++)
          this._blend(xx, yy, this._styleColor(this.fillStyle, xx, yy), this.globalAlpha);
      }
    }
  }
  stroke(){
    const w = Math.max(1, this.lineWidth * Math.abs(this.m.a)) / 2;
    const col = this._styleColor(this.strokeStyle, 0, 0);
    for (const sp of this.path){
      for (let i = 0; i < sp.length - 1; i++){
        this._capsule(sp[i], sp[i+1], w, col);
      }
      if (sp.length === 1) this._capsule(sp[0], sp[0], w, col);
    }
  }
  _capsule(p0, p1, r, colBase){
    const minX = Math.floor(Math.min(p0[0],p1[0]) - r), maxX = Math.ceil(Math.max(p0[0],p1[0]) + r);
    const minY = Math.floor(Math.min(p0[1],p1[1]) - r), maxY = Math.ceil(Math.max(p0[1],p1[1]) + r);
    const dx = p1[0]-p0[0], dy = p1[1]-p0[1], len2 = dx*dx+dy*dy;
    for (let yy = Math.max(0,minY); yy <= Math.min(this._h-1,maxY); yy++){
      for (let xx = Math.max(0,minX); xx <= Math.min(this._w-1,maxX); xx++){
        const px = xx+0.5, py = yy+0.5;
        let t = len2 ? ((px-p0[0])*dx + (py-p0[1])*dy) / len2 : 0;
        t = Math.max(0, Math.min(1, t));
        const cx = p0[0]+dx*t, cy = p0[1]+dy*t;
        const d = Math.hypot(px-cx, py-cy);
        if (d <= r + 0.35){
          const aa = d > r - 0.5 ? Math.max(0, Math.min(1, r + 0.35 - d)) : 1;
          this._blend(xx, yy, colBase, this.globalAlpha * aa);
        }
      }
    }
  }
  drawImage(img, ...args){
    let sx=0, sy=0, sw=img.width, sh=img.height, dx, dy, dw, dh;
    if (args.length === 2){ [dx,dy] = args; dw = sw; dh = sh; }
    else if (args.length === 4){ [dx,dy,dw,dh] = args; }
    else { [sx,sy,sw,sh,dx,dy,dw,dh] = args; }
    const [X0,Y0] = this.tx(dx,dy), [X1,Y1] = this.tx(dx+dw,dy+dh);
    const ax = Math.min(X0,X1), bx = Math.max(X0,X1);
    const ay = Math.min(Y0,Y1), by = Math.max(Y0,Y1);
    const flipX = X1 < X0, flipY = Y1 < Y0;
    const src = img._data, srcW = img.width;
    if (!src) return;
    for (let yy = Math.max(0, Math.round(ay)); yy < Math.min(this._h, Math.round(by)); yy++){
      for (let xx = Math.max(0, Math.round(ax)); xx < Math.min(this._w, Math.round(bx)); xx++){
        let u = (xx + 0.5 - ax) / (bx - ax || 1);
        let v = (yy + 0.5 - ay) / (by - ay || 1);
        if (flipX) u = 1 - u;
        if (flipY) v = 1 - v;
        const sxx = Math.min(img.width - 1, sx + Math.floor(u * sw));
        const syy = Math.min(img.height - 1, sy + Math.floor(v * sh));
        const si = (syy * srcW + sxx) * 4;
        if (src[si+3] === 0) continue;
        this._blend(xx, yy, [src[si], src[si+1], src[si+2], src[si+3]], this.globalAlpha);
      }
    }
  }
  createLinearGradient(x0,y0,x1,y1){ return new Gradient('linear', [x0,y0,x1,y1]); }
  createRadialGradient(x0,y0,r0,x1,y1,r1){ return new Gradient('radial', [x0,y0,r0,x1,y1,r1]); }
  getImageData(x, y, w, h){
    const out = new Uint8ClampedArray(w*h*4);
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++){
      const sx2 = x+xx, sy2 = y+yy;
      if (sx2 < 0 || sy2 < 0 || sx2 >= this._w || sy2 >= this._h) continue;
      const si = (sy2*this._w+sx2)*4, di = (yy*w+xx)*4;
      out[di]=this._d[si]; out[di+1]=this._d[si+1]; out[di+2]=this._d[si+2]; out[di+3]=this._d[si+3];
    }
    return { data: out, width: w, height: h };
  }
  putImageData(id, x, y){
    for (let yy = 0; yy < id.height; yy++) for (let xx = 0; xx < id.width; xx++){
      const dx2 = x+xx, dy2 = y+yy;
      if (dx2 < 0 || dy2 < 0 || dx2 >= this._w || dy2 >= this._h) continue;
      const di = (dy2*this._w+dx2)*4, si = (yy*id.width+xx)*4;
      this._d[di]=id.data[si]; this._d[di+1]=id.data[si+1]; this._d[di+2]=id.data[si+2]; this._d[di+3]=id.data[si+3];
    }
  }
  fillText(){ /* CJK文本截图中略过 */ }
  measureText(s){ return { width: String(s).length * 7 }; }
}

class SoftCanvas {
  constructor(w, h){ this._w = w || 300; this._h = h || 150; this._alloc(); this.style = {}; this.className = ''; }
  _alloc(){ this._data = new Uint8ClampedArray(this._w * this._h * 4); this._ctx = null; }
  get width(){ return this._w; } set width(v){ this._w = v; this._alloc(); }
  get height(){ return this._h; } set height(v){ this._h = v; this._alloc(); }
  getContext(){ if (!this._ctx) this._ctx = new SoftCtx(this); return this._ctx; }
}

// ---------- PNG ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++){
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf){
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function savePNG(canvas, file){
  const w = canvas.width, h = canvas.height, d = canvas._data;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++){
    raw[y * (w*4+1)] = 0;
    for (let x = 0; x < w * 4; x++) raw[y * (w*4+1) + 1 + x] = d[y * w * 4 + x];
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
}

module.exports = { SoftCanvas, savePNG };
