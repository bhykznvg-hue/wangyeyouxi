// ============ 主控制器 ============
const Game = (() => {
  let renderer, scene, camera;
  let sun, sunTarget;
  let clock = new THREE.Clock();
  let pointerLocked = false;
  let started = false;
  let underwater = false;
  let fogAir = null, fogWater = null;

  function init() {
    const canvas = document.getElementById('game-canvas');
    renderer = new THREE.WebGLRenderer({
      canvas, antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: !!window.__TEST__,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.physicallyCorrectLights = false;

    camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.08, 300);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcfe8ee);
    fogAir = new THREE.FogExp2(0xc8e2ea, 0.0075);
    fogWater = new THREE.FogExp2(0x0e5468, 0.16);
    scene.fog = fogAir;

    // ---------- 环境反射 (LDR CubeCamera, 全平台兼容) ----------
    const envScene = new THREE.Scene();
    // 天光渐变球
    const envGeo = new THREE.SphereGeometry(50, 16, 12);
    const envMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `
        varying vec3 vPos;
        void main(){
          float h = normalize(vPos).y;
          vec3 sky = mix(vec3(0.55,0.78,0.85), vec3(0.98,1.0,1.0), smoothstep(-0.1,0.7,h));
          vec3 low = mix(vec3(0.2,0.5,0.58), sky, smoothstep(-1.0,0.0,h));
          gl_FragColor = vec4(low, 1.0);
        }`,
    });
    envScene.add(new THREE.Mesh(envGeo, envMat));
    const sunBall = new THREE.Mesh(
      new THREE.SphereGeometry(4, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff2cc })
    );
    sunBall.position.set(18, 30, 22);
    envScene.add(sunBall);
    const cubeRT = new THREE.WebGLCubeRenderTarget(128, {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    const cubeCam = new THREE.CubeCamera(0.1, 120, cubeRT);
    cubeCam.update(renderer, envScene);
    scene.environment = cubeRT.texture;

    // ---------- 光照 ----------
    scene.add(new THREE.AmbientLight(0xd8ecf2, 0.35));
    const hemi = new THREE.HemisphereLight(0xe8f6fa, 0x4a8a96, 0.55);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff2d8, 2.6);
    sun.position.set(14, 40, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 130;
    sun.shadow.camera.left = -55;
    sun.shadow.camera.right = 55;
    sun.shadow.camera.top = 55;
    sun.shadow.camera.bottom = -55;
    sun.shadow.bias = -0.0009;
    sunTarget = new THREE.Object3D();
    scene.add(sunTarget);
    sun.target = sunTarget;
    scene.add(sun);

    // ---------- 模块 ----------
    Gen.setSeed((Math.random() * 1e9) | 0);
    Water.init(renderer);
    World.init(scene);
    Player.init(camera);
    // 中庭走道出生, 面向中央大池
    Player.spawn(Gen.AREA / 2, Gen.AREA - 2.2, 0);
    // 预生成周边
    for (let i = 0; i < 25; i++) World.update(Player.pos.x, Player.pos.z);

    bindEvents();
    animate();
  }

  // ---------- 事件 ----------
  function bindEvents() {
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    const canvas = renderer.domElement;
    const enter = document.getElementById('enter-screen');

    enter.addEventListener('click', () => {
      Sfx.init(); Sfx.resume(); Sfx.ambient();
      enter.classList.add('out');
      started = true;
      canvas.requestPointerLock();
    });
    canvas.addEventListener('click', () => {
      if (started && !pointerLocked) canvas.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      pointerLocked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', e => {
      if (pointerLocked) Player.onMouseMove(e.movementX, e.movementY);
    });
    document.addEventListener('keydown', e => Player.setKey(e.code, true));
    document.addEventListener('keyup', e => Player.setKey(e.code, false));
  }

  // ---------- 水下状态 ----------
  function setUnderwater(on) {
    if (on === underwater) return;
    underwater = on;
    scene.fog = on ? fogWater : fogAir;
    scene.background = on ? new THREE.Color(0x0e5468) : new THREE.Color(0xcfe8ee);
    document.getElementById('underwater-tint').style.opacity = on ? 1 : 0;
    Sfx.setUnderwater(on);
    renderer.toneMappingExposure = on ? 0.85 : 1.05;
  }

  // ---------- 主循环 (画质优先, 无自动降档) ----------
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);

    if (started) Player.update(dt);
    World.update(Player.pos.x, Player.pos.z);
    World.updateCaustics(dt);
    Water.update(dt, camera.position);

    // 阳光跟随玩家 (阴影范围)
    const sx = Math.round(Player.pos.x / 4) * 4;
    const sz = Math.round(Player.pos.z / 4) * 4;
    sun.position.set(sx + 14, 40, sz + 18);
    sunTarget.position.set(sx, 0, sz);
    sunTarget.updateMatrixWorld();

    // 水下判定 (眼睛)
    const water = World.waterAt(Player.pos.x, Player.pos.z);
    const eyeY = Player.eyeY;
    setUnderwater(!!water && eyeY < water.level - 0.02);

    // 双反射 pass (水面 + 湿滑地面)
    if (!underwater) Water.renderReflections(renderer, scene, camera, true);

    renderer.render(scene, camera);
  }

  window.addEventListener('DOMContentLoaded', init);

  return {
    get started() { return started; },
    get underwater() { return underwater; },
    get scene() { return scene; },
    get renderer() { return renderer; },
    get sun() { return sun; },
    get camera() { return camera; },
  };
})();
