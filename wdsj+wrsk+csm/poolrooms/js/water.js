// ============ 反射渲染 (水面 + 湿滑地面 双平面反射) ============
const Water = (() => {
  const WATER_Y = -0.15;
  const FLOOR_Y = 0.0;
  let material = null, floorMaterial = null;
  const waterMeshes = [];
  const floorMeshes = [];
  let time = 0;
  let waterRefl = null, floorRefl = null;

  // ---------- 通用平面反射器 ----------
  function makeReflector(planeY, w, h) {
    const rt = new THREE.WebGLRenderTarget(w, h);
    rt.texture.encoding = THREE.sRGBEncoding;
    const cam = new THREE.PerspectiveCamera();
    const texMatrix = new THREE.Matrix4();
    const plane = new THREE.Plane();
    const normal = new THREE.Vector3(0, 1, 0);
    const view = new THREE.Vector3();
    const target = new THREE.Vector3();
    const q = new THREE.Vector4();

    function render(renderer, scene, camera, hideList) {
      if (camera.position.y < planeY + 0.03) return;
      view.copy(camera.position);
      view.y = 2 * planeY - view.y;
      cam.position.copy(view);
      camera.getWorldDirection(target);
      target.y = -target.y;
      cam.lookAt(view.clone().add(target));
      cam.up.set(0, -1, 0);
      cam.fov = camera.fov; cam.aspect = camera.aspect;
      cam.near = camera.near; cam.far = camera.far;
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld();

      texMatrix.set(
        0.5, 0, 0, 0.5,
        0, 0.5, 0, 0.5,
        0, 0, 0.5, 0.5,
        0, 0, 0, 1
      );
      texMatrix.multiply(cam.projectionMatrix);
      texMatrix.multiply(cam.matrixWorldInverse);

      plane.setFromNormalAndCoplanarPoint(normal, new THREE.Vector3(0, planeY, 0));
      plane.applyMatrix4(cam.matrixWorldInverse);
      const pm = cam.projectionMatrix;
      q.x = (Math.sign(plane.normal.x) + pm.elements[8]) / pm.elements[0];
      q.y = (Math.sign(plane.normal.y) + pm.elements[9]) / pm.elements[5];
      q.z = -1.0;
      q.w = (1.0 + pm.elements[10]) / pm.elements[14];
      const clip = new THREE.Vector4(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
      clip.multiplyScalar(2.0 / clip.dot(q));
      pm.elements[2] = clip.x;
      pm.elements[6] = clip.y;
      pm.elements[10] = clip.z + 1.0;
      pm.elements[14] = clip.w;

      hideList.forEach(m => m.visible = false);
      const oldRT = renderer.getRenderTarget();
      renderer.setRenderTarget(rt);
      renderer.clear();
      renderer.render(scene, cam);
      renderer.setRenderTarget(oldRT);
      hideList.forEach(m => m.visible = true);
    }

    return { rt, texMatrix, render };
  }

  // ---------- 初始化 ----------
  function init(renderer) {
    waterRefl = makeReflector(WATER_Y, 1536, 768);
    floorRefl = makeReflector(FLOOR_Y + 0.005, 1024, 512);

    // ----- 水面材质 -----
    material = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        tReflection: { value: waterRefl.rt.texture },
        uTexMatrix: { value: waterRefl.texMatrix },
        uNormal1: { value: Tex.get('waterNormal', [1, 1]) },
        uNormal2: { value: Tex.get('waterNormal2', [1, 1]) },
        uTime: { value: 0 },
        uSunDir: { value: new THREE.Vector3(0.35, 0.8, 0.45).normalize() },
        uSunColor: { value: new THREE.Color(1.0, 0.97, 0.88) },
        uShallow: { value: new THREE.Color(0x53c2d4) },
        uDeep: { value: new THREE.Color(0x0d5468) },
        uCamPos: { value: new THREE.Vector3() },
      },
      vertexShader: `
        uniform mat4 uTexMatrix;
        attribute float aDepth;
        varying vec4 vReflCoord;
        varying vec3 vWorldPos;
        varying float vDepth;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vDepth = aDepth;
          vReflCoord = uTexMatrix * wp;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform sampler2D tReflection;
        uniform sampler2D uNormal1;
        uniform sampler2D uNormal2;
        uniform float uTime;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform vec3 uShallow;
        uniform vec3 uDeep;
        uniform vec3 uCamPos;
        varying vec4 vReflCoord;
        varying vec3 vWorldPos;
        varying float vDepth;
        void main() {
          vec2 uv1 = vWorldPos.xz * 0.09 + vec2(uTime * 0.020, uTime * 0.012);
          vec2 uv2 = vWorldPos.xz * 0.21 - vec2(uTime * 0.015, uTime * 0.026);
          vec3 n1 = texture2D(uNormal1, uv1).rgb * 2.0 - 1.0;
          vec3 n2 = texture2D(uNormal2, uv2).rgb * 2.0 - 1.0;
          vec3 n = normalize(vec3(n1.x + n2.x, 4.6, n1.y + n2.y));
          vec3 viewDir = normalize(uCamPos - vWorldPos);
          vec2 reflUV = vReflCoord.xy / vReflCoord.w;
          reflUV += n.xz * 0.05;
          reflUV = clamp(reflUV, 0.001, 0.999);
          vec3 refl = texture2D(tReflection, reflUV).rgb;
          float cosT = clamp(dot(viewDir, n), 0.0, 1.0);
          float fres = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);
          fres = clamp(fres * 1.4, 0.0, 0.97);
          float dFac = clamp(vDepth / 3.0, 0.0, 1.0);
          vec3 waterCol = mix(uShallow, uDeep, dFac * 0.75 + (1.0 - cosT) * 0.25);
          vec3 col = mix(waterCol, refl, fres);
          vec3 halfDir = normalize(uSunDir + viewDir);
          float spec = pow(max(dot(n, halfDir), 0.0), 260.0);
          col += uSunColor * spec * 2.4;
          float glit = pow(max(dot(n, halfDir), 0.0), 70.0);
          col += uSunColor * glit * 0.13;
          float alpha = mix(0.6, 0.94, dFac);
          alpha = mix(alpha, 0.97, fres);
          gl_FragColor = vec4(col, alpha);
        }`,
    });

    // ----- 湿滑地面镜面材质 (叠加层) -----
    floorMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      uniforms: {
        tReflection: { value: floorRefl.rt.texture },
        uTexMatrix: { value: floorRefl.texMatrix },
        uNormal1: { value: Tex.get('tileNormal', [1, 1]) },
        uCamPos: { value: new THREE.Vector3() },
      },
      vertexShader: `
        uniform mat4 uTexMatrix;
        varying vec4 vReflCoord;
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vReflCoord = uTexMatrix * wp;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform sampler2D tReflection;
        uniform sampler2D uNormal1;
        uniform vec3 uCamPos;
        varying vec4 vReflCoord;
        varying vec3 vWorldPos;
        void main() {
          // 瓷砖面细微不平 (法线扰动反射)
          vec3 nm = texture2D(uNormal1, vWorldPos.xz * 0.25).rgb * 2.0 - 1.0;
          vec3 n = normalize(vec3(nm.x * 0.6, 6.0, nm.y * 0.6));
          vec3 viewDir = normalize(uCamPos - vWorldPos);
          vec2 reflUV = vReflCoord.xy / vReflCoord.w;
          reflUV += n.xz * 0.02;
          reflUV = clamp(reflUV, 0.001, 0.999);
          vec3 refl = texture2D(tReflection, reflUV).rgb;
          float cosT = clamp(dot(viewDir, vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
          // 釉面瓷砖: 掠射角反射强
          float fres = 0.05 + 0.95 * pow(1.0 - cosT, 3.2);
          float alpha = fres * 0.55;
          gl_FragColor = vec4(refl, alpha);
        }`,
    });
    return material;
  }

  // ---------- 网格工厂 ----------
  function makeWaterMesh(x0, z0, x1, z1, level, depth) {
    const w = x1 - x0, d = z1 - z0;
    const geo = new THREE.PlaneGeometry(w, d, Math.max(1, w / 6 | 0), Math.max(1, d / 6 | 0));
    geo.rotateX(-Math.PI / 2);
    const count = geo.attributes.position.count;
    const depths = new Float32Array(count).fill(depth);
    geo.setAttribute('aDepth', new THREE.BufferAttribute(depths, 1));
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x0 + w / 2, level, z0 + d / 2);
    waterMeshes.push(mesh);
    return mesh;
  }
  function removeWaterMesh(mesh) {
    const i = waterMeshes.indexOf(mesh);
    if (i >= 0) waterMeshes.splice(i, 1);
    mesh.geometry.dispose();
  }

  function makeFloorOverlay(x0, z0, x1, z1, y) {
    const w = x1 - x0, d = z1 - z0;
    const geo = new THREE.PlaneGeometry(w, d);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, floorMaterial);
    mesh.position.set(x0 + w / 2, y + 0.008, z0 + d / 2);
    mesh.renderOrder = 1;
    floorMeshes.push(mesh);
    return mesh;
  }
  function removeFloorOverlay(mesh) {
    const i = floorMeshes.indexOf(mesh);
    if (i >= 0) floorMeshes.splice(i, 1);
    mesh.geometry.dispose();
  }

  // ---------- 每帧反射渲染 ----------
  function renderReflections(renderer, scene, camera, withFloor = true) {
    const hide = waterMeshes.concat(floorMeshes);
    waterRefl.render(renderer, scene, camera, hide);
    if (withFloor) floorRefl.render(renderer, scene, camera, hide);
  }

  function update(dt, camPos) {
    time += dt;
    if (material) {
      material.uniforms.uTime.value = time;
      material.uniforms.uCamPos.value.copy(camPos);
    }
    if (floorMaterial) {
      floorMaterial.uniforms.uCamPos.value.copy(camPos);
    }
  }

  return {
    init, makeWaterMesh, removeWaterMesh, makeFloorOverlay, removeFloorOverlay,
    renderReflections, update,
    WATER_Y,
    get material() { return material; },
  };
})();
