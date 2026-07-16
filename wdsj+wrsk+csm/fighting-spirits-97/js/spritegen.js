// ============ spritegen.js : 程序化像素精灵渲染 (骨骼->像素) ============
'use strict';
const SpriteGen = (() => {
  const CW = 176, CH = 144;        // 精灵画布(美术像素)
  const OX = 76, OY = 136;         // 原点=双脚中心
  const cache = new Map();

  function dirv(aDeg){ const a = U.deg(aDeg); return [Math.sin(a), Math.cos(a)]; }
  function upv(aDeg){ const a = U.deg(aDeg); return [Math.sin(a), -Math.cos(a)]; }

  function limb(c, x1, y1, x2, y2, w, color){
    c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  function dot(c, x, y, r, color){
    c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, U.TAU); c.fill();
  }
  function poly(c, pts, color){
    c.fillStyle = color; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    c.closePath(); c.fill();
  }

  // ---------- 主渲染: 身体定义+姿势 -> 画布 ----------
  function renderPose(body, pose){
    const cv = U.makeCanvas(CW, CH);
    const c = cv.getContext('2d');
    if (!c) return { cv, ox: OX, oy: OY };
    const S = body.scale || 1;
    const thigh = 18 * S, shin = 17 * S, torsoL = 23 * S, headR = (body.headR || 7) * S;
    const armU = 12.5 * S, armL = 11.5 * S, neck = 3 * S;
    const legW = (body.legW || 6) * S, armW = (body.armW || 5) * S;
    const torsoW = (body.torsoW || 9) * S, fistR = (body.fistR || 4) * S;
    const footL = 8.5 * S;
    const legStand = (thigh + shin) * 1.06 + 3 * S; // 略长于骨长: 保证站姿脚底=原点
    const p = pose;

    const pelvis = [OX + p.px * S, OY - legStand + p.py * S];
    const up = upv(p.lean);
    const chest = [pelvis[0] + torsoL * up[0], pelvis[1] + torsoL * up[1]];
    const headUp = upv(p.lean + p.headA);
    const headC = [chest[0] + (neck + headR * 0.95) * headUp[0] + p.headX * S,
                   chest[1] + (neck + headR * 0.95) * headUp[1] + p.headY * S];

    // 关节计算
    function leg(hipOff, h, k, pitch){
      const hip = [pelvis[0] + hipOff * S, pelvis[1] + 1];
      const dT = dirv(h), knee = [hip[0] + thigh * dT[0], hip[1] + thigh * dT[1]];
      const shinA = h - k, dS = dirv(shinA);
      const ankle = [knee[0] + shin * dS[0], knee[1] + shin * dS[1]];
      const dF = dirv(shinA + 90 - pitch);
      const toe = [ankle[0] + footL * dF[0], ankle[1] + footL * dF[1]];
      return { hip, knee, ankle, toe };
    }
    function arm(shOff, s, e){
      const sh = [chest[0] + shOff * S * Math.cos(U.deg(p.lean)), chest[1] + 2 + shOff * S * Math.sin(U.deg(p.lean))];
      const dU = dirv(s), elbow = [sh[0] + armU * dU[0], sh[1] + armU * dU[1]];
      const dL = dirv(s + e), wrist = [elbow[0] + armL * dL[0], elbow[1] + armL * dL[1]];
      return { sh, elbow, wrist };
    }
    const legF = leg(2.5, p.hF, p.kF, p.fF), legB = leg(-2.5, p.hB, p.kB, p.fB);
    const armF = arm(2, p.sF, p.eF), armB = arm(-2, p.sB, p.eB);

    const skin = body.skin, skinD = U.shade(body.skin, -0.28);
    const top = body.top, pants = body.pants;
    const sleeveF = top.sleeve || skin, sleeveB = top.sleeve ? U.shade(top.sleeve, -0.28) : skinD;
    const pantsD = U.shade(pants.color, -0.3);
    const shoe = body.shoes || '#40342a', shoeD = U.shade(shoe, -0.3);

    // ===== 绘制顺序 =====
    // 长发/马尾(最底层)
    drawHairBack(c, body, headC, headR, p, S);
    // 后臂
    drawArm(c, armB, armW - 0.5, sleeveB, skinD, body.gloves ? U.shade(body.gloves, -0.25) : null, fistR - 0.5, p.handB, top, S);
    // 后腿
    drawLeg(c, legB, legW - 0.5, pantsD, shoeD, pants, S);
    // 大衣/裙摆
    if (top.coat){
      const cd = U.shade(top.coat, -0.15);
      poly(c, [[pelvis[0]-torsoW*0.9, pelvis[1]-2],[pelvis[0]+torsoW*0.8, pelvis[1]-2],
               [pelvis[0]+torsoW*0.6+p.lean*0.1, pelvis[1]+14*S],[pelvis[0]-torsoW*1.3-p.lean*0.2, pelvis[1]+15*S]], cd);
    }
    // 躯干
    limb(c, pelvis[0], pelvis[1], chest[0], chest[1], torsoW * 2, top.color);
    dot(c, chest[0], chest[1] + 1, torsoW * 0.95, top.color);
    if (body.female){
      dot(c, chest[0] + torsoW*0.3, chest[1] + 4.5, torsoW*0.52, U.shade(top.color, 0.12));
      limb(c, pelvis[0], pelvis[1] + 1, pelvis[0], pelvis[1] - 3, torsoW * 2.15, top.color);
    }
    // 躯干细节
    if (top.type === 'jacket'){
      limb(c, pelvis[0]+1, pelvis[1] - 1, chest[0]+1, chest[1] + 1, 1.6, U.shade(top.color, 0.35)); // 拉链
      limb(c, chest[0] - torsoW*0.55, chest[1] - 1, chest[0] + torsoW*0.7, chest[1] - 1, 3, top.trim || '#ddd'); // 领
    } else if (top.type === 'gi'){
      limb(c, chest[0] - torsoW*0.4, chest[1] + 2, pelvis[0] + torsoW*0.5, pelvis[1] - 2, 2.2, top.trim || '#eee');
      limb(c, chest[0] + torsoW*0.4, chest[1] + 2, pelvis[0] - torsoW*0.5, pelvis[1] - 2, 2.2, U.shade(top.trim || '#eee', -0.2));
    } else if (top.type === 'tank'){
      limb(c, chest[0], chest[1] - 2, chest[0], chest[1] + 3, torsoW * 1.4, top.color);
      dot(c, chest[0] - torsoW*0.5, chest[1] - 1, 2*S, skin); dot(c, chest[0] + torsoW*0.6, chest[1] - 1, 2*S, skin);
    } else if (top.type === 'coat'){
      limb(c, pelvis[0], pelvis[1] - 1, chest[0], chest[1] + 1, 1.6, U.shade(top.color, 0.4));
    }
    if (body.emblem){ dot(c, chest[0] + 2, chest[1] + 4, 2.2*S, body.emblem); }
    // 阴影侧条
    limb(c, pelvis[0] - torsoW*0.62, pelvis[1] - 1, chest[0] - torsoW*0.62, chest[1] + 1, 2.4, U.shade(top.color, -0.24));
    // 腰带
    if (body.belt){
      limb(c, pelvis[0] - torsoW*0.9, pelvis[1] - 1, pelvis[0] + torsoW*0.9, pelvis[1] - 1, 3*S, body.belt);
      dot(c, pelvis[0] + 1, pelvis[1] - 1, 1.6*S, U.shade(body.belt, 0.45));
    }
    // 前腿
    drawLeg(c, legF, legW, pants.color, shoe, pants, S);
    // 头
    drawHead(c, body, headC, headR, chest, neck, p, S, skin, skinD);
    // 前臂
    drawArm(c, armF, armW, sleeveF, skin, body.gloves, fistR, p.handF, top, S);

    // ===== 后处理: 阈值化+描边 =====
    outline(c, cv);
    return { cv, ox: OX, oy: OY, joints: { pelvis, chest, headC, wristF: armF.wrist, wristB: armB.wrist, toeF: legF.toe, toeB: legB.toe } };
  }

  function drawLeg(c, L, w, col, shoeCol, pants, S){
    const colD = U.shade(col, -0.18);
    if (pants.style === 'gi' || pants.style === 'loose'){
      limb(c, L.hip[0], L.hip[1], L.knee[0], L.knee[1], w * 1.45, col);
      limb(c, L.knee[0], L.knee[1], L.ankle[0], L.ankle[1], w * 1.15, colD);
    } else if (pants.style === 'shorts'){
      limb(c, L.hip[0], L.hip[1], (L.hip[0]+L.knee[0])/2, (L.hip[1]+L.knee[1])/2, w * 1.3, col);
      limb(c, (L.hip[0]+L.knee[0])/2, (L.hip[1]+L.knee[1])/2, L.knee[0], L.knee[1], w * 0.95, pants.skin || col);
      limb(c, L.knee[0], L.knee[1], L.ankle[0], L.ankle[1], w * 0.85, pants.skin || colD);
    } else {
      limb(c, L.hip[0], L.hip[1], L.knee[0], L.knee[1], w * 1.2, col);
      limb(c, L.knee[0], L.knee[1], L.ankle[0], L.ankle[1], w * 0.95, colD);
    }
    limb(c, L.ankle[0], L.ankle[1], L.toe[0], L.toe[1], w * 0.9, shoeCol);
  }
  function drawArm(c, Aj, w, sleeve, skinCol, glove, fistR, hand, top, S){
    const short = top.sleeveShort;
    if (short){
      const mid = [(Aj.sh[0]+Aj.elbow[0])/2, (Aj.sh[1]+Aj.elbow[1])/2];
      limb(c, Aj.sh[0], Aj.sh[1], mid[0], mid[1], w * 1.25, sleeve);
      limb(c, mid[0], mid[1], Aj.elbow[0], Aj.elbow[1], w, skinCol);
      limb(c, Aj.elbow[0], Aj.elbow[1], Aj.wrist[0], Aj.wrist[1], w * 0.9, skinCol);
    } else {
      limb(c, Aj.sh[0], Aj.sh[1], Aj.elbow[0], Aj.elbow[1], w * 1.15, sleeve);
      limb(c, Aj.elbow[0], Aj.elbow[1], Aj.wrist[0], Aj.wrist[1], w * 0.95, sleeve === skinCol ? skinCol : U.shade(sleeve, -0.1));
    }
    const fc = glove || skinCol;
    if (hand === 'open') { dot(c, Aj.wrist[0], Aj.wrist[1], fistR * 0.8, fc); }
    else if (hand === 'chop'){ limb(c, Aj.wrist[0], Aj.wrist[1], Aj.wrist[0]+fistR*1.4, Aj.wrist[1], fistR*0.9, fc); }
    else dot(c, Aj.wrist[0], Aj.wrist[1], fistR, fc);
  }
  function drawHead(c, body, hc, r, chest, neckL, p, S, skin, skinD){
    // 颈
    limb(c, chest[0], chest[1], hc[0], hc[1] + r * 0.5, 3.4 * S, skin);
    // 头骨
    dot(c, hc[0], hc[1], r, skin);
    // 下颚朝前
    dot(c, hc[0] + r * 0.42, hc[1] + r * 0.42, r * 0.5, skin);
    const h = body.hair || {};
    const hcCol = h.color || '#222';
    const hcD = U.shade(hcCol, -0.25);
    const fw = 1; // 面向右
    // 发型
    switch (h.style){
      case 'spiky': {
        for (let i = -2; i <= 2; i++){
          const bx = hc[0] + i * r * 0.42, by = hc[1] - r * 0.55;
          poly(c, [[bx - r*0.3, by],[bx + r*0.3, by],[bx + i*0.24*r, by - r*(0.85 - Math.abs(i)*0.12)]], i < 0 ? hcD : hcCol);
        }
        poly(c, [[hc[0]-r, hc[1]-r*0.1],[hc[0]+r*0.9, hc[1]-r*0.35],[hc[0]+r*0.6, hc[1]-r*0.8],[hc[0]-r*0.9, hc[1]-r*0.7]], hcCol);
        break; }
      case 'flat': {
        dot(c, hc[0] - r*0.12, hc[1] - r*0.28, r * 0.95, hcCol);
        poly(c, [[hc[0]+r*0.2, hc[1]-r*0.5],[hc[0]+r*0.95, hc[1]-r*0.3],[hc[0]+r*0.7, hc[1]+r*0.1]], hcCol); // 刘海
        break; }
      case 'long': {
        dot(c, hc[0] - r*0.1, hc[1] - r*0.3, r * 0.98, hcCol);
        poly(c, [[hc[0]+r*0.3, hc[1]-r*0.6],[hc[0]+r*1.0, hc[1]-r*0.1],[hc[0]+r*0.55, hc[1]+r*0.35]], hcCol);
        break; }
      case 'pony': {
        dot(c, hc[0] - r*0.1, hc[1] - r*0.3, r * 0.92, hcCol);
        limb(c, hc[0] - r*0.7, hc[1] - r*0.3, hc[0] - r*1.5, hc[1] + r*0.9 + (p.headA||0)*0.03*r, r*0.5, hcD);
        limb(c, hc[0] - r*0.3, hc[1] - r*0.85, hc[0] + r*0.6, hc[1] - r*0.55, r*0.5, hcCol);
        break; }
      case 'buzz': {
        dot(c, hc[0] - r*0.05, hc[1] - r*0.32, r * 0.85, hcCol);
        break; }
      case 'mask': {
        dot(c, hc[0], hc[1] - r*0.05, r * 1.02, hcCol);
        dot(c, hc[0] + r*0.42, hc[1] + r*0.42, r * 0.52, hcCol);
        poly(c, [[hc[0]+r*0.1, hc[1]-r*0.9],[hc[0]+r*0.75, hc[1]-r*0.1],[hc[0]+r*0.35, hc[1]+r*0.55],[hc[0]-r*0.1, hc[1]-r*0.2]], h.panel || '#eee');
        break; }
      case 'wild': {
        for (let i = -2; i <= 2; i++){
          const bx = hc[0] + i * r * 0.4, by = hc[1] - r * 0.4;
          poly(c, [[bx - r*0.34, by],[bx + r*0.34, by],[bx + i*0.5*r - r*0.2, by - r*(1.0 - Math.abs(i)*0.1)]], i % 2 ? hcD : hcCol);
        }
        limb(c, hc[0] - r*0.8, hc[1] - r*0.2, hc[0] - r*1.35, hc[1] + r*1.1, r*0.55, hcD); // 后髮
        poly(c, [[hc[0]-r*0.6, hc[1]-r*0.5],[hc[0]+r*0.95, hc[1]-r*0.4],[hc[0]+r*0.85, hc[1]+r*0.25],[hc[0]+r*0.3, hc[1]-r*0.05]], hcCol);
        break; }
      case 'crown': {
        dot(c, hc[0] - r*0.05, hc[1] - r*0.25, r * 0.95, hcCol);
        for (let i = -1; i <= 2; i++){
          const bx = hc[0] + i * r * 0.4, by = hc[1] - r * 0.75;
          poly(c, [[bx - r*0.22, by],[bx + r*0.22, by],[bx, by - r*0.8]], h.crown || '#e8c34a');
        }
        break; }
      default: dot(c, hc[0] - r*0.08, hc[1] - r*0.3, r * 0.9, hcCol);
    }
    if (h.band){
      limb(c, hc[0] - r*0.95, hc[1] - r*0.32, hc[0] + r*0.95, hc[1] - r*0.32, 2.6*S, h.band);
      limb(c, hc[0] - r*0.9, hc[1] - r*0.2, hc[0] - r*1.6, hc[1] + r*0.5, 1.8*S, h.band);
    }
    // 脸
    const eyeY = hc[1] + r*0.06, eyeX = hc[0] + r*0.45;
    c.fillStyle = '#fff'; c.fillRect(eyeX - 1.5*S, eyeY - 1*S, 3.4*S, 2*S);
    c.fillStyle = '#1a1a2e'; c.fillRect(eyeX + 0.2*S, eyeY - 1*S, 1.6*S, 2*S);
    c.fillStyle = U.shade(skin, -0.45); c.fillRect(eyeX - 1.8*S, eyeY - 2.2*S, 4*S, 1.1*S); // 眉
    c.fillStyle = skinD; c.fillRect(hc[0] + r*0.55, hc[1] + r*0.62, 2.6*S, 1*S); // 嘴
    if (body.beard){ dot(c, hc[0] + r*0.3, hc[1] + r*0.75, r*0.42, body.beard); }
  }
  function drawHairBack(c, body, hc, r, p, S){
    const h = body.hair || {}; const hcCol = h.color || '#222'; const hcD = U.shade(hcCol, -0.3);
    if (h.style === 'long'){
      const sway = Math.sin((p.px + p.lean) * 0.3) * 2;
      poly(c, [[hc[0] - r*0.6, hc[1] - r*0.6],[hc[0] + r*0.2, hc[1] - r*0.8],
               [hc[0] - r*0.5 + sway, hc[1] + r*2.6],[hc[0] - r*1.5 + sway, hc[1] + r*2.3]], hcD);
    }
    if (body.scarf){
      limb(c, hc[0] - r*0.4, hc[1] + r*1.2, hc[0] - r*1.8 - p.lean*0.08, hc[1] + r*2.2, 3.4*S, body.scarf);
    }
  }

  // 阈值化 alpha + 深色描边
  function outline(c, cv){
    let id;
    try { id = c.getImageData(0, 0, cv.width, cv.height); } catch (e) { return; }
    const d = id.data, w = cv.width, h = cv.height;
    const solid = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++){
      if (d[i*4+3] > 70){ solid[i] = 1; d[i*4+3] = 255; } else d[i*4+3] = 0;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++){
      const i = y * w + x;
      if (!solid[i]) continue;
      const edge = (x === 0 || !solid[i-1]) || (x === w-1 || !solid[i+1]) || (y === 0 || !solid[i-w]) || (y === h-1 || !solid[i+w]);
      if (edge){
        d[i*4] = d[i*4] * 0.32; d[i*4+1] = d[i*4+1] * 0.28; d[i*4+2] = d[i*4+2] * 0.34;
      }
    }
    c.putImageData(id, 0, 0);
  }

  // ---------- 帧缓存 ----------
  function getFrame(charDef, animName, idx, variant){
    const key = charDef.id + '|' + animName + '|' + idx + '|' + (variant || 'n');
    if (cache.has(key)) return cache.get(key);
    if (cache.size > 1600) cache.clear();
    const anim = getAnim(charDef, animName);
    const fr = anim.frames[Math.min(idx, anim.frames.length - 1)];
    let out = renderPose(charDef.body, fr.p);
    if (variant === 'w' || (variant && variant.startsWith('t'))){
      const cv2 = U.makeCanvas(out.cv.width, out.cv.height);
      const c2 = cv2.getContext('2d');
      if (c2){
        c2.drawImage(out.cv, 0, 0);
        c2.globalCompositeOperation = 'source-in';
        c2.fillStyle = variant === 'w' ? '#ffffff' : variant.slice(1);
        c2.fillRect(0, 0, cv2.width, cv2.height);
      }
      out = { cv: cv2, ox: out.ox, oy: out.oy, joints: out.joints };
    }
    cache.set(key, out);
    return out;
  }

  // 姿势关节查询(投技定位/特效锚点)
  function getJoints(charDef, animName, idx){
    return getFrame(charDef, animName, idx).joints;
  }

  // ---------- 头像 ----------
  const portraitCache = new Map();
  function portrait(charDef, size){
    const key = charDef.id + '|' + size;
    if (portraitCache.has(key)) return portraitCache.get(key);
    const cv = U.makeCanvas(size, size);
    const c = cv.getContext('2d');
    if (!c){ portraitCache.set(key, cv); return cv; }
    const b = charDef.body, r = size * 0.30;
    const hc = [size * 0.48, size * 0.44];
    // 背景
    const g = charDef.themeColor || '#333';
    c.fillStyle = U.shade(g, -0.55); c.fillRect(0, 0, size, size);
    c.fillStyle = U.shade(g, -0.35);
    for (let i = 0; i < 5; i++) c.fillRect(0, i * size/5 + 2, size, size/10);
    // 肩
    c.fillStyle = b.top.color;
    c.fillRect(size*0.08, size*0.78, size*0.84, size*0.24);
    c.fillStyle = U.shade(b.top.color, -0.25);
    c.fillRect(size*0.08, size*0.78, size*0.2, size*0.24);
    // 颈+头
    c.fillStyle = b.skin; c.fillRect(hc[0]-r*0.3, hc[1]+r*0.5, r*0.65, r*0.8);
    dot(c, hc[0], hc[1], r, b.skin);
    dot(c, hc[0] + r*0.35, hc[1] + r*0.5, r*0.55, b.skin);
    // 发
    const h = b.hair || {}, hcCol = h.color || '#222', hcD = U.shade(hcCol, -0.25);
    if (h.style === 'spiky' || h.style === 'wild'){
      for (let i = -2; i <= 2; i++){
        const bx = hc[0] + i * r * 0.42, by = hc[1] - r * 0.5;
        poly(c, [[bx - r*0.32, by],[bx + r*0.32, by],[bx + i*0.3*r, by - r*(1.0 - Math.abs(i)*0.13)]], i < 0 ? hcD : hcCol);
      }
      poly(c, [[hc[0]-r, hc[1]-r*0.05],[hc[0]+r*0.95, hc[1]-r*0.3],[hc[0]+r*0.5, hc[1]-r*0.75],[hc[0]-r*0.9, hc[1]-r*0.6]], hcCol);
      if (h.style === 'wild') limb(c, hc[0]-r*0.9, hc[1], hc[0]-r*1.15, hc[1]+r*1.5, r*0.5, hcD);
    } else if (h.style === 'long'){
      poly(c, [[hc[0]-r*1.05, hc[1]-r*0.3],[hc[0]-r*0.3, hc[1]-r*0.9],[hc[0]-r*0.6, hc[1]+r*1.9],[hc[0]-r*1.3, hc[1]+r*1.7]], hcD);
      dot(c, hc[0]-r*0.08, hc[1]-r*0.3, r, hcCol);
      poly(c, [[hc[0]+r*0.25, hc[1]-r*0.65],[hc[0]+r*1.0, hc[1]-r*0.05],[hc[0]+r*0.5, hc[1]+r*0.4]], hcCol);
    } else if (h.style === 'pony'){
      dot(c, hc[0]-r*0.08, hc[1]-r*0.3, r*0.95, hcCol);
      limb(c, hc[0]-r*0.75, hc[1]-r*0.2, hc[0]-r*1.2, hc[1]+r*1.1, r*0.5, hcD);
    } else if (h.style === 'mask'){
      dot(c, hc[0], hc[1]-r*0.02, r*1.06, hcCol);
      dot(c, hc[0]+r*0.35, hc[1]+r*0.5, r*0.6, hcCol);
      poly(c, [[hc[0]+r*0.05, hc[1]-r*0.95],[hc[0]+r*0.8, hc[1]-r*0.1],[hc[0]+r*0.35, hc[1]+r*0.6],[hc[0]-r*0.15, hc[1]-r*0.2]], h.panel || '#eee');
    } else if (h.style === 'crown'){
      dot(c, hc[0]-r*0.05, hc[1]-r*0.25, r, hcCol);
      for (let i = -1; i <= 2; i++){
        const bx = hc[0] + i * r * 0.4, by = hc[1] - r*0.7;
        poly(c, [[bx-r*0.2, by],[bx+r*0.2, by],[bx, by-r*0.85]], h.crown || '#e8c34a');
      }
    } else {
      dot(c, hc[0]-r*0.1, hc[1]-r*0.3, r*0.96, hcCol);
      poly(c, [[hc[0]+r*0.2, hc[1]-r*0.55],[hc[0]+r*0.95, hc[1]-r*0.25],[hc[0]+r*0.65, hc[1]+r*0.1]], hcCol);
    }
    if (h.band){
      c.fillStyle = h.band; c.fillRect(hc[0]-r*0.98, hc[1]-r*0.42, r*1.95, r*0.26);
    }
    // 脸
    const ex = hc[0] + r*0.4, ey = hc[1] + r*0.08;
    c.fillStyle = '#fff'; c.fillRect(ex - r*0.28, ey - r*0.12, r*0.6, r*0.26);
    c.fillStyle = '#101828'; c.fillRect(ex + r*0.05, ey - r*0.12, r*0.24, r*0.26);
    c.fillStyle = U.shade(b.skin, -0.5); c.fillRect(ex - r*0.34, ey - r*0.36, r*0.75, r*0.14);
    c.fillStyle = U.shade(b.skin, -0.35); c.fillRect(hc[0] + r*0.42, hc[1] + r*0.62, r*0.42, r*0.12);
    if (b.beard) dot(c, hc[0]+r*0.25, hc[1]+r*0.72, r*0.4, b.beard);
    outline(c, cv);
    portraitCache.set(key, cv);
    return cv;
  }

  return { getFrame, getJoints, portrait, renderPose, CW, CH, OX, OY };
})();
