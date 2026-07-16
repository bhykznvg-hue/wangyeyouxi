// ============ pixelfont.js : 自制5x7像素字体 + 中文像素化渲染 ============
'use strict';
const Font = (() => {
  // 每个字符5列x7行, 用7个5bit行编码 (自绘字体)
  const RAW = {
    'A':[0b01110,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
    'B':[0b11110,0b10001,0b10001,0b11110,0b10001,0b10001,0b11110],
    'C':[0b01111,0b10000,0b10000,0b10000,0b10000,0b10000,0b01111],
    'D':[0b11110,0b10001,0b10001,0b10001,0b10001,0b10001,0b11110],
    'E':[0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b11111],
    'F':[0b11111,0b10000,0b10000,0b11110,0b10000,0b10000,0b10000],
    'G':[0b01111,0b10000,0b10000,0b10111,0b10001,0b10001,0b01111],
    'H':[0b10001,0b10001,0b10001,0b11111,0b10001,0b10001,0b10001],
    'I':[0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b11111],
    'J':[0b00111,0b00010,0b00010,0b00010,0b00010,0b10010,0b01100],
    'K':[0b10001,0b10010,0b10100,0b11000,0b10100,0b10010,0b10001],
    'L':[0b10000,0b10000,0b10000,0b10000,0b10000,0b10000,0b11111],
    'M':[0b10001,0b11011,0b10101,0b10101,0b10001,0b10001,0b10001],
    'N':[0b10001,0b11001,0b10101,0b10011,0b10001,0b10001,0b10001],
    'O':[0b01110,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
    'P':[0b11110,0b10001,0b10001,0b11110,0b10000,0b10000,0b10000],
    'Q':[0b01110,0b10001,0b10001,0b10001,0b10101,0b10010,0b01101],
    'R':[0b11110,0b10001,0b10001,0b11110,0b10100,0b10010,0b10001],
    'S':[0b01111,0b10000,0b10000,0b01110,0b00001,0b00001,0b11110],
    'T':[0b11111,0b00100,0b00100,0b00100,0b00100,0b00100,0b00100],
    'U':[0b10001,0b10001,0b10001,0b10001,0b10001,0b10001,0b01110],
    'V':[0b10001,0b10001,0b10001,0b10001,0b10001,0b01010,0b00100],
    'W':[0b10001,0b10001,0b10001,0b10101,0b10101,0b11011,0b10001],
    'X':[0b10001,0b01010,0b00100,0b00100,0b00100,0b01010,0b10001],
    'Y':[0b10001,0b10001,0b01010,0b00100,0b00100,0b00100,0b00100],
    'Z':[0b11111,0b00001,0b00010,0b00100,0b01000,0b10000,0b11111],
    '0':[0b01110,0b10011,0b10101,0b10101,0b10101,0b11001,0b01110],
    '1':[0b00100,0b01100,0b00100,0b00100,0b00100,0b00100,0b01110],
    '2':[0b01110,0b10001,0b00001,0b00110,0b01000,0b10000,0b11111],
    '3':[0b11110,0b00001,0b00001,0b01110,0b00001,0b00001,0b11110],
    '4':[0b00010,0b00110,0b01010,0b10010,0b11111,0b00010,0b00010],
    '5':[0b11111,0b10000,0b11110,0b00001,0b00001,0b10001,0b01110],
    '6':[0b01110,0b10000,0b10000,0b11110,0b10001,0b10001,0b01110],
    '7':[0b11111,0b00001,0b00010,0b00100,0b01000,0b01000,0b01000],
    '8':[0b01110,0b10001,0b10001,0b01110,0b10001,0b10001,0b01110],
    '9':[0b01110,0b10001,0b10001,0b01111,0b00001,0b00001,0b01110],
    ' ':[0,0,0,0,0,0,0],
    '.':[0,0,0,0,0,0b00100,0b00100],
    ',':[0,0,0,0,0,0b00100,0b01000],
    '!':[0b00100,0b00100,0b00100,0b00100,0b00100,0,0b00100],
    '?':[0b01110,0b10001,0b00001,0b00110,0b00100,0,0b00100],
    ':':[0,0b00100,0b00100,0,0b00100,0b00100,0],
    '-':[0,0,0,0b11111,0,0,0],
    '+':[0,0b00100,0b00100,0b11111,0b00100,0b00100,0],
    '/':[0b00001,0b00010,0b00010,0b00100,0b01000,0b01000,0b10000],
    "'":[0b00100,0b00100,0,0,0,0,0],
    '%':[0b11001,0b11010,0b00010,0b00100,0b01000,0b01011,0b10011],
    '(':[0b00010,0b00100,0b01000,0b01000,0b01000,0b00100,0b00010],
    ')':[0b01000,0b00100,0b00010,0b00010,0b00010,0b00100,0b01000],
    '>':[0b01000,0b00100,0b00010,0b00001,0b00010,0b00100,0b01000],
    '<':[0b00010,0b00100,0b01000,0b10000,0b01000,0b00100,0b00010],
    '=':[0,0,0b11111,0,0b11111,0,0],
    '*':[0,0b10101,0b01110,0b11111,0b01110,0b10101,0],
    '#':[0b01010,0b01010,0b11111,0b01010,0b11111,0b01010,0b01010],
    // 方向箭头 (出招表用)
    '←':[0,0b00100,0b01000,0b11111,0b01000,0b00100,0],
    '→':[0,0b00100,0b00010,0b11111,0b00010,0b00100,0],
    '↑':[0b00100,0b01110,0b10101,0b00100,0b00100,0b00100,0],
    '↓':[0,0b00100,0b00100,0b00100,0b10101,0b01110,0b00100],
    '↘':[0,0b10000,0b01000,0b00101,0b00011,0b00111,0],
    '↙':[0,0b00001,0b00010,0b10100,0b11000,0b11100,0],
    '↖':[0,0b11100,0b11000,0b10100,0b00010,0b00001,0],
    '↗':[0,0b00111,0b00011,0b00101,0b01000,0b10000,0],
    '~':[0,0,0b01000,0b10101,0b00010,0,0],
  };
  const hasCJK = s => /[\u3000-\u9fff\uff00-\uffef\u3040-\u30ff·]/.test(s);
  const cjkCache = new Map();

  // 中文文本 -> 像素化离屏画布
  function cjkCanvas(str, px, color){
    const key = str + '|' + px + '|' + color;
    if (cjkCache.has(key)) return cjkCache.get(key);
    if (cjkCache.size > 400) cjkCache.clear();
    const base = 12; // 小字号渲染再放大 => 像素化
    const tmp = U.makeCanvas(4 + str.length * (base + 2), base + 6);
    const tc = tmp.getContext('2d');
    if (!tc) return null;
    tc.font = 'bold ' + base + 'px "SimSun","MS Gothic",monospace';
    tc.textBaseline = 'top';
    tc.fillStyle = color;
    tc.fillText(str, 1, 1);
    // 阈值化 alpha, 保持硬边
    const w = tmp.width, h = tmp.height;
    const id = tc.getImageData(0, 0, w, h);
    for (let i = 3; i < id.data.length; i += 4) id.data[i] = id.data[i] > 90 ? 255 : 0;
    tc.putImageData(id, 0, 0);
    // 测量实际宽度
    let maxX = 0;
    for (let y = 0; y < h; y++) for (let x = w - 1; x > maxX; x--)
      if (id.data[(y * w + x) * 4 + 3]) { maxX = x; break; }
    const out = { cv: tmp, w: maxX + 2, h: base + 4, base };
    cjkCache.set(key, out);
    return out;
  }

  function measure(str, size){
    size = size || 2;
    if (hasCJK(str)){
      let w = 0;
      for (const seg of segment(str)) w += seg.cjk ? seg.text.length * 13 * size / 2 : seg.text.length * 6 * size;
      return w;
    }
    return str.length * 6 * size;
  }

  // 中英混排切段
  function segment(str){
    const segs = []; let cur = '', curCJK = null;
    for (const ch of str){
      const c = hasCJK(ch);
      if (curCJK === null || c === curCJK){ cur += ch; curCJK = c; }
      else { segs.push({ text: cur, cjk: curCJK }); cur = ch; curCJK = c; }
    }
    if (cur) segs.push({ text: cur, cjk: curCJK });
    return segs;
  }

  // 主绘制: 支持阴影/描边/对齐; size为像素放大倍数
  function draw(ctx, str, x, y, opt){
    opt = opt || {};
    const size = opt.size || 2;
    const color = opt.color || '#fff';
    const align = opt.align || 'left';
    str = String(str);
    const wTotal = measure(str, size);
    if (align === 'center') x -= wTotal / 2;
    else if (align === 'right') x -= wTotal;
    x = Math.round(x); y = Math.round(y);
    if (opt.shadow !== false){
      drawRaw(ctx, str, x + size, y + size, size, opt.shadowColor || '#000');
    }
    if (opt.outline){
      for (const [dx, dy] of [[-size,0],[size,0],[0,-size],[0,size]])
        drawRaw(ctx, str, x + dx, y + dy, size, opt.outline);
    }
    drawRaw(ctx, str, x, y, size, color);
    return wTotal;
  }

  function drawRaw(ctx, str, x, y, size, color){
    let cx = x;
    for (const seg of segment(str)){
      if (seg.cjk){
        const cc = cjkCanvas(seg.text, size, color);
        if (cc){
          const scale = size * 7 / cc.h * 1.15;
          const dw = Math.round(cc.w * scale), dh = Math.round(cc.h * scale);
          ctx.imageSmoothingEnabled = false;
          // 用染色: cjkCanvas 已按颜色渲染
          ctx.drawImage(cc.cv, 0, 0, cc.w, cc.h, cx, y - Math.round(size*0.5), dw, dh);
          cx += seg.text.length * 13 * size / 2;
        }
      } else {
        ctx.fillStyle = color;
        for (const ch of seg.text.toUpperCase()){
          const g = RAW[ch] || RAW['?'];
          for (let r = 0; r < 7; r++){
            const bits = g[r];
            for (let c = 0; c < 5; c++){
              if (bits & (1 << (4 - c))) ctx.fillRect(cx + c * size, y + r * size, size, size);
            }
          }
          cx += 6 * size;
        }
      }
    }
  }

  return { draw, measure };
})();
