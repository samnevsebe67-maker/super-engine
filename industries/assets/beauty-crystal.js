/* KINETIA / Beauty вЂ” emerald crystal installation
   Procedural Three.js scene. No external 3D assets are used.
   The supplied reference image is only the static no-WebGL fallback. */
(function () {
  'use strict';

  var host = document.getElementById('bt3d');
  var canvas = document.getElementById('btCrystal');
  var stageLabel = document.getElementById('bt3dStage');
  if (!host || !canvas) return;

  var THREE = window.THREE;
  var mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = mqReduced.matches;
  var mqSmall = window.matchMedia('(max-width: 1000px)');
  var mqNarrow = window.matchMedia('(max-width: 640px)');

  function useFallback() {
    host.classList.remove('is-live');
    host.classList.add('bt-no3d');
  }

  if (!THREE) { useFallback(); return; }

  var probe = document.createElement('canvas');
  var probeGL = probe.getContext('webgl2') || probe.getContext('webgl');
  if (!probeGL) { useFallback(); return; }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: !mqSmall.matches,
      alpha: true,
      powerPreference: 'high-performance'
    });
  } catch (err) {
    useFallback();
    return;
  }

  var isSmall = mqSmall.matches;
  var isNarrow = mqNarrow.matches;
  var useTransmission = !isSmall && renderer.capabilities.isWebGL2;
  var maxAniso = renderer.capabilities.getMaxAnisotropy ? renderer.capabilities.getMaxAnisotropy() : 1;

  renderer.setClearColor(0x050807, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = reduced ? 1 : 0.03;

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050807, 0.042);

  var camera = new THREE.PerspectiveCamera(isNarrow ? 44 : 40, 1, 0.1, 90);
  var LOOK = new THREE.Vector3(0, isNarrow ? 2.0 : 1.85, -0.1);
  var BASE_AZ = 0.30;
  var BASE_RADIUS = isNarrow ? 8.6 : 7.2;
  var BASE_Y = isNarrow ? 1.75 : 1.62;
  camera.position.set(Math.sin(BASE_AZ) * BASE_RADIUS, BASE_Y, Math.cos(BASE_AZ) * BASE_RADIUS);
  camera.lookAt(LOOK);

  /* deterministic pseudo-random */
  var seed = 20261112;
  function rnd() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function smoothstep(a, b, x) {
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  /* ------------------------------------------------------------------ textures */
  function dotTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 128;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(210,255,238,.85)');
    grd.addColorStop(0.6, 'rgba(120,255,203,.22)');
    grd.addColorStop(1, 'rgba(120,255,203,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function beamTexture() {
    var c = document.createElement('canvas');
    c.width = 64; c.height = 512;
    var g = c.getContext('2d');
    var grd = g.createLinearGradient(0, 0, 0, 512);
    grd.addColorStop(0, 'rgba(122,255,203,0)');
    grd.addColorStop(0.32, 'rgba(122,255,203,.16)');
    grd.addColorStop(0.62, 'rgba(25,223,160,.34)');
    grd.addColorStop(0.86, 'rgba(25,223,160,.10)');
    grd.addColorStop(1, 'rgba(25,223,160,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 512);
    g.globalCompositeOperation = 'destination-in';
    var h = g.createLinearGradient(0, 0, 64, 0);
    h.addColorStop(0, 'rgba(0,0,0,0)');
    h.addColorStop(0.42, 'rgba(0,0,0,.85)');
    h.addColorStop(0.58, 'rgba(0,0,0,.85)');
    h.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = h;
    g.fillRect(0, 0, 64, 512);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function radialFloorTexture(inner, outer) {
    var c = document.createElement('canvas');
    c.width = c.height = 512;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(256, 256, 0, 256, 256, 256);
    grd.addColorStop(0, inner);
    grd.addColorStop(0.45, outer);
    grd.addColorStop(1, 'rgba(3,10,8,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 512, 512);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  var TEX_DOT = dotTexture();
  var TEX_BEAM = beamTexture();
  var TEX_FLOOR = radialFloorTexture('rgba(25,223,160,.30)', 'rgba(8,122,88,.10)');
  var TEX_SHADOW = radialFloorTexture('rgba(0,0,0,.72)', 'rgba(0,0,0,.24)');

  /* environment: dark gallery with emerald light bars */
  function envTexture() {
    var c = document.createElement('canvas');
    c.width = 1024; c.height = 512;
    var g = c.getContext('2d');
    var base = g.createLinearGradient(0, 0, 0, 512);
    base.addColorStop(0, '#020705');
    base.addColorStop(0.48, '#051410');
    base.addColorStop(0.72, '#03100c');
    base.addColorStop(1, '#010403');
    g.fillStyle = base;
    g.fillRect(0, 0, 1024, 512);

    var bars = [
      [110, 130, 0.22], [248, 46, 0.16], [410, 90, 0.26],
      [560, 34, 0.18], [700, 120, 0.14], [846, 58, 0.22], [950, 38, 0.12]
    ];
    for (var i = 0; i < bars.length; i++) {
      var x = bars[i][0], w = bars[i][1], a = bars[i][2];
      var grd = g.createLinearGradient(x - w, 0, x + w, 0);
      grd.addColorStop(0, 'rgba(25,223,160,0)');
      grd.addColorStop(0.5, 'rgba(190,255,235,' + a + ')');
      grd.addColorStop(1, 'rgba(25,223,160,0)');
      g.fillStyle = grd;
      g.fillRect(x - w, 0, w * 2, 512);
    }
    g.globalCompositeOperation = 'lighter';
    var low = g.createLinearGradient(0, 330, 0, 512);
    low.addColorStop(0, 'rgba(8,122,88,0)');
    low.addColorStop(0.7, 'rgba(25,223,160,.20)');
    low.addColorStop(1, 'rgba(122,255,203,.06)');
    g.fillStyle = low;
    g.fillRect(0, 330, 1024, 182);

    var t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  var pmrem = new THREE.PMREMGenerator(renderer);
  var envSrc = envTexture();
  var envMap = pmrem.fromEquirectangular(envSrc).texture;
  envSrc.dispose();
  pmrem.dispose();
  scene.environment = envMap;

  /* ------------------------------------------------------------------ materials */
  var crystalMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f7d5c,
    metalness: 0.0,
    roughness: 0.075,
    transmission: useTransmission ? 0.92 : 0,
    thickness: 2.1,
    ior: 1.48,
    attenuationColor: new THREE.Color(0x0a6b4f),
    attenuationDistance: 1.7,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 2.0,
    flatShading: true,
    transparent: !useTransmission,
    opacity: useTransmission ? 1 : 0.9,
    emissive: new THREE.Color(0x062e23),
    emissiveIntensity: 1.5,
    side: THREE.FrontSide
  });

  var hairMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a6349,
    metalness: 0.05,
    roughness: 0.1,
    transmission: useTransmission ? 0.78 : 0,
    thickness: 2.6,
    ior: 1.5,
    attenuationColor: new THREE.Color(0x08513c),
    attenuationDistance: 1.25,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: 2.2,
    flatShading: true,
    transparent: !useTransmission,
    opacity: useTransmission ? 1 : 0.92,
    emissive: new THREE.Color(0x04241b),
    emissiveIntensity: 1.3
  });

  var darkMat = new THREE.MeshStandardMaterial({
    color: 0x04100c,
    metalness: 0.5,
    roughness: 0.24,
    emissive: new THREE.Color(0x02140f),
    emissiveIntensity: 1
  });

  var lipMat = new THREE.MeshStandardMaterial({
    color: 0x0c5a43,
    metalness: 0.18,
    roughness: 0.2,
    emissive: new THREE.Color(0x052018),
    emissiveIntensity: 0.9
  });

  var METAL = new THREE.MeshStandardMaterial({
    color: 0x030807,
    metalness: 0.92,
    roughness: 0.2,
    envMapIntensity: 0.8
  });

  var FIN_MAT = new THREE.MeshStandardMaterial({
    color: 0x040a08,
    metalness: 0.7,
    roughness: 0.45,
    envMapIntensity: 0.45
  });

  var REFLECT_MAT = new THREE.MeshBasicMaterial({
    color: 0x0b5a43,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
  });

  /* ------------------------------------------------------------------ lights */
  var hemi = new THREE.HemisphereLight(0x0b3a2c, 0x010403, 0.7);
  scene.add(hemi);

  var ambient = new THREE.AmbientLight(0x0a2a20, 0.55);
  scene.add(ambient);

  var key = new THREE.DirectionalLight(0xc9ffe9, 1.9);
  key.position.set(-4.5, 6.2, 4.4);
  scene.add(key);

  var rim = new THREE.DirectionalLight(0x19dfa0, 1.25);
  rim.position.set(5.2, 3.2, -4.6);
  scene.add(rim);

  var spot = new THREE.SpotLight(0x7affcb, 26, 18, 0.5, 0.55, 1.6);
  spot.position.set(-3.4, 6.4, 2.6);
  spot.target.position.set(0.2, 1.6, 0);
  scene.add(spot);
  scene.add(spot.target);

  var under = new THREE.PointLight(0x19dfa0, 4.2, 6, 2);
  under.position.set(0.2, 0.55, 1.1);
  scene.add(under);

  var innerLight = new THREE.PointLight(0x7affcb, 5, 4.5, 2);
  innerLight.position.set(0, 2.55, 0.1);
  scene.add(innerLight);

  /* ------------------------------------------------------------------ sculpture */
  var bust = new THREE.Group();
  bust.position.x = 0.22;
  bust.rotation.y = 0.1;
  scene.add(bust);

  function gauss(x, y, z, cx, cy, cz, sx, sy, sz, amp) {
    var dx = (x - cx) / sx;
    var dy = (y - cy) / sy;
    var dz = (z - cz) / sz;
    return amp * Math.exp(-0.5 * (dx * dx + dy * dy + dz * dz));
  }

  function makeHeadGeometry() {
    var geo = new THREE.IcosahedronGeometry(1, 4);
    var pos = geo.attributes.position;
    var v = new THREE.Vector3();
    var dir = new THREE.Vector3();
    for (var i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      dir.copy(v).normalize();
      var x = v.x * 0.74;
      var y = v.y * 1.0;
      var z = v.z * 0.84;

      if (y < 0) {
        var t = Math.min(1, -y);
        var taper = 1 - 0.26 * t * t;
        x *= taper;
        z *= 1 - 0.05 * t * t;
      }

      var d = 0;
      /* brow ridge + sockets */
      d += gauss(x, y, z, -0.25, 0.30, 0.62, 0.20, 0.07, 0.30, 0.045);
      d += gauss(x, y, z, 0.25, 0.30, 0.62, 0.20, 0.07, 0.30, 0.045);
      d -= gauss(x, y, z, -0.28, 0.13, 0.66, 0.18, 0.10, 0.28, 0.075);
      d -= gauss(x, y, z, 0.28, 0.13, 0.66, 0.18, 0.10, 0.28, 0.075);
      /* nose */
      d += gauss(x, y, z, 0, 0.02, 0.78, 0.075, 0.30, 0.26, 0.12);
      d += gauss(x, y, z, 0, -0.22, 0.82, 0.085, 0.09, 0.20, 0.1);
      d -= gauss(x, y, z, -0.085, -0.24, 0.80, 0.035, 0.04, 0.14, 0.025);
      d -= gauss(x, y, z, 0.085, -0.24, 0.80, 0.035, 0.04, 0.14, 0.025);
      /* cheekbones + jaw */
      d += gauss(x, y, z, -0.44, -0.03, 0.52, 0.20, 0.16, 0.30, 0.05);
      d += gauss(x, y, z, 0.44, -0.03, 0.52, 0.20, 0.16, 0.30, 0.05);
      d += gauss(x, y, z, -0.42, -0.42, 0.42, 0.16, 0.20, 0.28, 0.03);
      d += gauss(x, y, z, 0.42, -0.42, 0.42, 0.16, 0.20, 0.28, 0.03);
      /* lips + chin */
      d += gauss(x, y, z, 0, -0.355, 0.80, 0.16, 0.035, 0.20, 0.05);
      d += gauss(x, y, z, 0, -0.435, 0.80, 0.135, 0.04, 0.20, 0.055);
      d -= gauss(x, y, z, 0, -0.395, 0.82, 0.155, 0.012, 0.18, 0.032);
      d += gauss(x, y, z, 0, -0.60, 0.70, 0.13, 0.13, 0.24, 0.06);
      /* temples */
      d -= gauss(x, y, z, -0.55, 0.30, 0.35, 0.14, 0.18, 0.30, 0.02);
      d -= gauss(x, y, z, 0.55, 0.30, 0.35, 0.14, 0.18, 0.30, 0.02);
      /* irregular faceting */
      d += Math.sin(x * 24 + y * 13) * Math.cos(z * 19 - y * 7) * 0.006;

      x += dir.x * d;
      y += dir.y * d;
      z += dir.z * d;
      pos.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    return geo;
  }

  function makeTorsoGeometry() {
    var rings = [
      [1.98, 0.30, 0.32], [1.80, 0.31, 0.33], [1.62, 0.34, 0.35],
      [1.45, 0.40, 0.38], [1.28, 0.50, 0.42], [1.10, 0.66, 0.46],
      [0.92, 0.88, 0.50], [0.74, 1.12, 0.53], [0.57, 1.30, 0.54],
      [0.42, 1.38, 0.52], [0.30, 1.30, 0.48]
    ];
    var seg = 64;
    var verts = [];
    var idx = [];
    var i, j;
    for (i = 0; i < rings.length; i++) {
      var y = rings[i][0], rx = rings[i][1], rz = rings[i][2];
      for (j = 0; j <= seg; j++) {
        var a = (j / seg) * Math.PI * 2;
        var ripple = 1 + Math.sin(a * 7 + y * 5.5) * 0.007;
        verts.push(Math.cos(a) * rx * ripple, y, Math.sin(a) * rz * ripple);
      }
    }
    for (i = 0; i < rings.length - 1; i++) {
      for (j = 0; j < seg; j++) {
        var a0 = i * (seg + 1) + j;
        var a1 = a0 + 1;
        var b0 = a0 + seg + 1;
        var b1 = b0 + 1;
        idx.push(a0, b0, a1, a1, b0, b1);
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  var headGeo = makeHeadGeometry();
  var headMesh = new THREE.Mesh(headGeo, crystalMat);
  var head = new THREE.Group();
  head.position.y = 2.55;
  head.add(headMesh);
  bust.add(head);

  var torsoGeo = makeTorsoGeometry();
  var torso = new THREE.Mesh(torsoGeo, crystalMat);
  bust.add(torso);

  var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.62, 24, 1, true), crystalMat);
  neck.position.y = 1.78;
  bust.add(neck);

  /* face accents: eyes, brows, lips */
  var eyeGeo = new THREE.SphereGeometry(1, 18, 12);
  var glintGeo = new THREE.SphereGeometry(0.014, 8, 6);
  var glintMat = new THREE.MeshBasicMaterial({ color: 0xdffff2, toneMapped: false });
  [-1, 1].forEach(function (s) {
    var eye = new THREE.Mesh(eyeGeo, darkMat);
    eye.scale.set(0.105, 0.055, 0.058);
    eye.position.set(0.29 * s, 0.10, 0.715);
    eye.rotation.z = -0.06 * s;
    head.add(eye);

    var glint = new THREE.Mesh(glintGeo, glintMat);
    glint.position.set(0.29 * s + 0.018, 0.115, 0.765);
    head.add(glint);

    var brow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.022, 0.035), darkMat);
    brow.position.set(0.29 * s, 0.265, 0.775);
    brow.rotation.z = 0.1 * s;
    brow.rotation.y = -0.12 * s;
    head.add(brow);
  });

  var upperLip = new THREE.Mesh(eyeGeo, lipMat);
  upperLip.scale.set(0.145, 0.032, 0.042);
  upperLip.position.set(0, -0.382, 0.842);
  head.add(upperLip);

  var lowerLip = new THREE.Mesh(eyeGeo, lipMat);
  lowerLip.scale.set(0.128, 0.038, 0.048);
  lowerLip.position.set(0, -0.443, 0.845);
  head.add(lowerLip);

  /* crystalline hair: instanced shards */
  var UP = new THREE.Vector3(0, 1, 0);
  var hairGeo = new THREE.OctahedronGeometry(1, 0);
  var shards = [];
  var rings = [
    { y: 1.03, r: 0.58, n: 5, gap: 1.3, len: [0.55, 0.9] },
    { y: 0.86, r: 0.88, n: 8, gap: 1.12, len: [0.55, 0.95] },
    { y: 0.6, r: 1.02, n: 10, gap: 0.98, len: [0.55, 1.0] },
    { y: 0.34, r: 1.04, n: 11, gap: 0.86, len: [0.5, 1.0] },
    { y: 0.08, r: 0.98, n: 10, gap: 0.78, len: [0.5, 1.05] },
    { y: -0.18, r: 0.86, n: 9, gap: 0.72, len: [0.45, 0.95] },
    { y: -0.44, r: 0.7, n: 7, gap: 0.68, len: [0.4, 0.85] }
  ];
  rings.forEach(function (ring, ri) {
    var span = Math.PI * 2 - ring.gap * 2;
    for (var i = 0; i < ring.n; i++) {
      var a = ring.gap + (ring.n === 1 ? span / 2 : (i / (ring.n - 1)) * span) + (rnd() - 0.5) * 0.1;
      var bx = Math.sin(a) * ring.r * 0.84;
      var bz = Math.cos(a) * ring.r * 0.9;
      var by = ring.y + (rnd() - 0.5) * 0.05;
      var len = lerp(ring.len[0], ring.len[1], rnd());
      var wid = 0.15 + rnd() * 0.12;
      var dir = new THREE.Vector3(bx, by * 0.25 + 0.4 + (ri < 2 ? 0.35 : 0), bz).normalize();
      var q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
      var p = new THREE.Vector3(bx, by, bz).addScaledVector(dir, len * 0.36);
      var s = new THREE.Vector3(wid, len * 0.5, wid * 0.85);
      shards.push({ p: p, q: q, s: s });
    }
  });
  /* long back locks */
  for (var li = 0; li < 5; li++) {
    var la = Math.PI + (li - 2) * 0.29;
    var lb = new THREE.Vector3(Math.sin(la) * 0.72, -0.42 - rnd() * 0.2, Math.cos(la) * 0.55);
    var ld = new THREE.Vector3(Math.sin(la) * 0.3, -1, Math.cos(la) * 0.25).normalize();
    var lq = new THREE.Quaternion().setFromUnitVectors(UP, ld);
    var lp = lb.clone().addScaledVector(ld, 0.34);
    shards.push({ p: lp, q: lq, s: new THREE.Vector3(0.2, 0.62, 0.16) });
  }

  var hairMesh = new THREE.InstancedMesh(hairGeo, hairMat, shards.length);
  var m4 = new THREE.Matrix4();
  shards.forEach(function (sh, i) {
    m4.compose(sh.p, sh.q, sh.s);
    hairMesh.setMatrixAt(i, m4);
  });
  hairMesh.instanceMatrix.needsUpdate = true;
  hairMesh.frustumCulled = false;
  head.add(hairMesh);

  /* pedestal + emerald rim */
  var pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 1.05, 0.55, 6, 1), METAL);
  pedestal.position.set(0.22, 0.025, 0);
  pedestal.rotation.y = Math.PI / 6;
  scene.add(pedestal);

  var rimRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.985, 0.008, 4, 96),
    new THREE.MeshBasicMaterial({ color: 0x7affcb, transparent: true, opacity: 0.55, toneMapped: false })
  );
  rimRing.position.set(0.22, 0.303, 0);
  rimRing.rotation.x = Math.PI / 2;
  scene.add(rimRing);

  /* floor, contact shadow, light pool */
  var FLOOR_Y = -0.25;

  var floor = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 70),
    new THREE.MeshStandardMaterial({
      color: 0x030807,
      metalness: 0.9,
      roughness: 0.22,
      envMapIntensity: 0.75,
      transparent: true,
      opacity: 0.84
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = FLOOR_Y;
  floor.renderOrder = 0;
  scene.add(floor);

  var contact = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 4.2),
    new THREE.MeshBasicMaterial({
      map: TEX_SHADOW, transparent: true, opacity: 0.85,
      depthWrite: false, toneMapped: false
    })
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(0.22, FLOOR_Y + 0.004, 0);
  contact.renderOrder = 1;
  scene.add(contact);

  var pool = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 9),
    new THREE.MeshBasicMaterial({
      map: TEX_FLOOR, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0.22, FLOOR_Y + 0.006, 0);
  pool.renderOrder = 2;
  scene.add(pool);

  /* mirrored head + shoulders (fake polished-floor reflection) */
  var mirror = new THREE.Group();
  mirror.scale.y = -1;
  mirror.position.y = FLOOR_Y * 2;
  mirror.rotation.y = 0.1;
  var mHead = new THREE.Mesh(headGeo, REFLECT_MAT);
  mHead.position.y = 2.55;
  mirror.add(mHead);
  var mTorso = new THREE.Mesh(torsoGeo, REFLECT_MAT);
  mirror.add(mTorso);
  mirror.position.x = 0.22;
  scene.add(mirror);

  /* ------------------------------------------------------------------ gallery architecture */
  var fins = new THREE.Group();
  scene.add(fins);
  var finEdgeMat = new THREE.MeshBasicMaterial({
    color: 0x19dfa0, transparent: true, opacity: 0.22,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
  });
  var finData = [
    [-10.5, -9.5, 1.2, 12], [-7.2, -11.5, 0.8, 15], [-4.1, -8.2, 0.55, 9],
    [-1.4, -12.5, 1.0, 16], [1.8, -9.1, 0.7, 11], [4.6, -11.8, 1.1, 14],
    [7.6, -9.4, 0.65, 10], [10.2, -12.2, 1.3, 16]
  ];
  finData.forEach(function (f, i) {
    var w = f[2] * (isNarrow ? 1.4 : 1);
    var h = f[3];
    var box = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.55), FIN_MAT);
    box.position.set(f[0] * (isNarrow ? 0.72 : 1), h / 2 + FLOOR_Y, f[1]);
    fins.add(box);
    if (i % 2 === 0) {
      var edge = new THREE.Mesh(new THREE.BoxGeometry(0.022, h * 0.92, 0.57), finEdgeMat);
      edge.position.set(box.position.x + (f[0] < 0 ? w / 2 : -w / 2), box.position.y, f[1]);
      fins.add(edge);
    }
  });

  var beams = [];
  var beamDefs = [
    [-2.7, -2.6, 0.9, -0.22, 0.16],
    [2.2, -3.2, 0.7, 0.18, 0.12],
    [-0.4, -5.2, 1.3, 0.05, 0.09]
  ];
  beamDefs.forEach(function (b) {
    var mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(b[2], 7.4),
      new THREE.MeshBasicMaterial({
        map: TEX_BEAM, transparent: true, opacity: b[4],
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
        color: 0x7affcb, toneMapped: false
      })
    );
    mesh.position.set(b[0], 3.35, b[1]);
    mesh.rotation.set(0, b[3], b[3] * 0.5);
    mesh.userData.base = b[4];
    scene.add(mesh);
    beams.push(mesh);
  });

  /* floating crystal fragments */
  var fragGeo = new THREE.OctahedronGeometry(1, 0);
  var fragMat = new THREE.MeshStandardMaterial({
    color: 0x0e8a66, emissive: new THREE.Color(0x0b6b4e),
    emissiveIntensity: 1.1, metalness: 0.2, roughness: 0.25,
    transparent: true, opacity: 0.72, flatShading: true
  });
  var fragCount = isSmall ? 10 : 18;
  var fragMesh = new THREE.InstancedMesh(fragGeo, fragMat, fragCount);
  fragMesh.frustumCulled = false;
  scene.add(fragMesh);
  var frags = [];
  for (var fi = 0; fi < fragCount; fi++) {
    var fa = rnd() * Math.PI * 2;
    var fr = 1.7 + rnd() * 1.7;
    frags.push({
      x: Math.cos(fa) * fr + 0.22,
      y: 0.5 + rnd() * 3.3,
      z: Math.sin(fa) * fr * 0.75 - 0.4,
      s: 0.035 + rnd() * 0.085,
      rot: rnd() * Math.PI * 2,
      spd: 0.35 + rnd() * 0.5,
      phase: rnd() * Math.PI * 2
    });
  }

  /* atmospheric dust */
  var dustCount = isSmall ? 110 : 230;
  var dustGeo = new THREE.BufferGeometry();
  var dustPos = new Float32Array(dustCount * 3);
  var dustSeed = [];
  for (var di = 0; di < dustCount; di++) {
    dustPos[di * 3] = (rnd() - 0.5) * 9;
    dustPos[di * 3 + 1] = rnd() * 4.6 - 0.1;
    dustPos[di * 3 + 2] = (rnd() - 0.5) * 6 - 1;
    dustSeed.push(rnd() * Math.PI * 2);
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  var dustMat = new THREE.PointsMaterial({
    map: TEX_DOT, size: 0.045, sizeAttenuation: true, transparent: true,
    opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
    color: 0x7affcb, toneMapped: false
  });
  var dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  /* inner emerald glow inside the crystal head */
  var innerGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: TEX_DOT, color: 0x19dfa0, transparent: true, opacity: 0.34,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
  }));
  innerGlow.scale.set(2.5, 2.5, 1);
  innerGlow.position.set(0.22, 2.55, 0);
  scene.add(innerGlow);

  /* ------------------------------------------------------------------ glass interfaces */
  var PANEL_DATA = [
    {
      kicker: 'ACQUISITION', title: 'Р РµРєР»Р°РјР°',
      rows: [['Instagram', 'РѕС…РІР°С‚'], ['Meta Ads', 'Р·Р°СЏРІРєРё'], ['Google Ads', 'РїРѕРёСЃРє']],
      foot: 'РўСЂР°С„РёРє в†’ Р·Р°СЏРІРєР°'
    },
    {
      kicker: 'WEBSITE', title: 'РЎР°Р№С‚',
      rows: [['РЈСЃР»СѓРіРё', '12'], ['РњР°СЃС‚РµСЂР°', '6'], ['Р—Р°РїРёСЃСЊ', 'РѕРЅР»Р°Р№РЅ']],
      foot: 'РџСЂРµР·РµРЅС‚Р°С†РёСЏ в†’ Р·Р°РїРёСЃСЊ'
    },
    {
      kicker: 'BOOKING', title: 'Р—Р°РїРёСЃСЊ',
      rows: [['РЈСЃР»СѓРіР°', 'РЎС‚СЂРёР¶РєР°'], ['РњР°СЃС‚РµСЂ', 'РђРЅРЅР°'], ['РћРєРЅРѕ', '14:30']],
      foot: 'РЎРІРѕР±РѕРґРЅРѕРµ РѕРєРЅРѕ в†’ РїРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ'
    },
    {
      kicker: 'CRM', title: 'CRM',
      rows: [['РљР»РёРµРЅС‚', 'РђРЅРЅР° Рљ.'], ['Р’РёР·РёС‚С‹', '8'], ['РЎС‚Р°С‚СѓСЃ', 'РїРѕСЃС‚РѕСЏРЅРЅС‹Р№']],
      foot: 'РљР°СЂС‚РѕС‡РєР° в†’ РёСЃС‚РѕСЂРёСЏ РІРёР·РёС‚РѕРІ'
    },
    {
      kicker: 'AUTOMATION', title: 'РђРІС‚РѕРјР°С‚РёР·Р°С†РёСЏ',
      rows: [['РџРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ', 'СЃСЂР°Р·Сѓ'], ['РќР°РїРѕРјРёРЅР°РЅРёРµ', 'Р·Р° 2 С‡Р°СЃР°'], ['РџРѕСЃР»Рµ РІРёР·РёС‚Р°', 'С‡РµСЂРµР· РґРµРЅСЊ']],
      foot: 'РЎРѕРѕР±С‰РµРЅРёСЏ Р±РµР· СЂСѓС‡РЅРѕР№ СЂР°Р±РѕС‚С‹'
    },
    {
      kicker: 'RETENTION', title: 'Р’РѕР·РІСЂР°С‚',
      rows: [['РџРѕРІС‚РѕСЂРЅС‹Р№ РІРёР·РёС‚', '4 РЅРµРґРµР»Рё'], ['РќР°РїРѕРјРёРЅР°РЅРёРµ', 'РїРѕСЃР»Рµ РІРёР·РёС‚Р°'], ['РћС„С„РµСЂ', 'РїРµСЂСЃРѕРЅР°Р»СЊРЅС‹Р№']],
      foot: 'Р’РёР·РёС‚ в†’ РІРѕР·РІСЂР°С‚'
    }
  ];

  var THRESHOLDS = [0.10, 0.24, 0.38, 0.52, 0.64, 0.76];
  var STAGE_LABELS = [
    '01 В· Artwork', '02 В· Acquisition', '03 В· Website', '04 В· Booking',
    '05 В· CRM', '06 В· Automation', '07 В· Complete system'
  ];

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }

  function panelTexture(data, index) {
    var c = document.createElement('canvas');
    c.width = 512; c.height = 320;
    var g = c.getContext('2d');

    var bg = g.createLinearGradient(0, 0, 512, 320);
    bg.addColorStop(0, 'rgba(8,32,24,.94)');
    bg.addColorStop(0.55, 'rgba(5,20,15,.9)');
    bg.addColorStop(1, 'rgba(3,12,9,.92)');
    roundRect(g, 5, 5, 502, 310, 22);
    g.fillStyle = bg;
    g.fill();
    g.strokeStyle = 'rgba(25,223,160,.42)';
    g.lineWidth = 1.5;
    g.stroke();

    var sheen = g.createLinearGradient(0, 0, 512, 180);
    sheen.addColorStop(0, 'rgba(122,255,203,.12)');
    sheen.addColorStop(0.5, 'rgba(122,255,203,.02)');
    sheen.addColorStop(1, 'rgba(122,255,203,0)');
    roundRect(g, 6, 6, 500, 190, 21);
    g.fillStyle = sheen;
    g.fill();

    g.fillStyle = 'rgba(122,255,203,.8)';
    g.font = '600 17px Consolas, "Courier New", monospace';
    g.fillText(('0' + (index + 1)).slice(-2) + ' / ' + data.kicker, 34, 52);

    g.fillStyle = '#e9fff8';
    g.font = '600 46px "Segoe UI", system-ui, -apple-system, sans-serif';
    g.fillText(data.title, 33, 104);

    g.strokeStyle = 'rgba(25,223,160,.24)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(34, 128);
    g.lineTo(478, 128);
    g.stroke();

    var y = 166;
    data.rows.forEach(function (row) {
      g.fillStyle = 'rgba(160,196,182,.82)';
      g.font = '400 22px "Segoe UI", system-ui, -apple-system, sans-serif';
      g.fillText(row[0], 34, y);
      g.fillStyle = 'rgba(233,255,248,.96)';
      g.font = '600 22px "Segoe UI", system-ui, -apple-system, sans-serif';
      g.textAlign = 'right';
      g.fillText(row[1], 478, y);
      g.textAlign = 'left';
      g.strokeStyle = 'rgba(25,223,160,.13)';
      g.beginPath();
      g.moveTo(34, y + 15);
      g.lineTo(478, y + 15);
      g.stroke();
      y += 42;
    });

    g.fillStyle = 'rgba(122,255,203,.62)';
    g.font = '400 16px "Segoe UI", system-ui, -apple-system, sans-serif';
    g.fillText(data.foot, 34, 292);

    var barW = 120;
    g.fillStyle = 'rgba(25,223,160,.18)';
    g.fillRect(478 - barW, 284, barW, 3);
    g.fillStyle = 'rgba(122,255,203,.75)';
    g.fillRect(478 - barW, 284, barW * (0.35 + index * 0.1), 3);

    g.strokeStyle = 'rgba(122,255,203,.55)';
    g.lineWidth = 1.5;
    [[18, 18, 1, 1], [494, 18, -1, 1], [18, 302, 1, -1], [494, 302, -1, -1]].forEach(function (t) {
      g.beginPath();
      g.moveTo(t[0], t[1] + 9 * t[3]);
      g.lineTo(t[0], t[1]);
      g.lineTo(t[0] + 9 * t[2], t[1]);
      g.stroke();
    });

    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, maxAniso);
    return tex;
  }

  var PANEL_POS = isNarrow ? [
    [-2.3, 3.35, -1.7, 0.34], [-2.35, 2.25, -1.15, 0.3], [-2.2, 1.12, -0.4, 0.26],
    [1.9, 3.1, -1.62, -0.32], [1.9, 2.0, -1.05, -0.28], [1.85, 0.9, -0.34, -0.24]
  ] : [
    [-2.33, 3.05, -1.5, 0.42], [-2.29, 1.95, -0.8, 0.34], [-2.17, 0.95, -0.05, 0.3],
    [2.1, 2.8, -1.5, -0.42], [2.0, 1.75, -0.9, -0.36], [1.8, 0.75, -0.25, -0.3]
  ];

  var ANCHORS = [
    [-0.55, 1.55, 0.1], [-0.35, 1.25, 0.2], [-0.45, 0.85, 0.15],
    [0.85, 1.6, 0.0], [0.8, 1.15, 0.1], [0.7, 0.8, 0.15]
  ];

  var panels = [];
  var panelGroup = new THREE.Group();
  scene.add(panelGroup);
  var travGeo = new THREE.BufferGeometry();
  var travPos = new Float32Array(6 * 3);
  for (var ti = 0; ti < 6; ti++) { travPos[ti * 3 + 1] = -99; }
  travGeo.setAttribute('position', new THREE.BufferAttribute(travPos, 3));
  var travellers = new THREE.Points(travGeo, new THREE.PointsMaterial({
    map: TEX_DOT, size: 0.075, sizeAttenuation: true, transparent: true,
    opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending,
    color: 0x7affcb, toneMapped: false
  }));
  travellers.frustumCulled = false;
  scene.add(travellers);

  PANEL_DATA.forEach(function (data, i) {
    var tex = panelTexture(data, i);
    var mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0, depthWrite: false,
      side: THREE.DoubleSide, toneMapped: false
    });
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.0), mat);
    var p = PANEL_POS[i];
    mesh.position.set(p[0], p[1], p[2]);
    mesh.rotation.y = p[3];
    mesh.rotation.x = isNarrow ? 0 : 0.02;
    mesh.renderOrder = 6;
    panelGroup.add(mesh);

    var start = mesh.position.clone().add(new THREE.Vector3(p[0] > 0 ? -0.92 : 0.92, 0, 0.06));
    var end = new THREE.Vector3(ANCHORS[i][0] + 0.22, ANCHORS[i][1], ANCHORS[i][2]);
    var mid = start.clone().lerp(end, 0.5);
    mid.y += 0.35;
    mid.z += 0.55;
    var curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    var lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(42));
    var lineMat = new THREE.LineBasicMaterial({
      color: 0x19dfa0, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    });
    var line = new THREE.Line(lineGeo, lineMat);
    line.renderOrder = 5;
    scene.add(line);

    panels.push({
      mesh: mesh,
      mat: mat,
      line: line,
      lineMat: lineMat,
      curve: curve,
      baseY: p[1],
      threshold: THRESHOLDS[i],
      op: 0,
      phase: i * 1.7
    });
  });

  /* ------------------------------------------------------------------ state */
  var pointer = { x: 0, y: 0, tx: 0, ty: 0, hover: 0, hoverT: 0 };
  var scrollStart = 0;
  var scrollSpan = 620;
  var scrollTarget = 0;
  var scrollSmooth = 0;
  var stageIdx = -1;
  var introT = reduced ? 1 : 0;
  var last = performance.now();
  var startTime = performance.now();
  var W = 1, H = 1;
  var frameTimes = [];
  var fps = 0;

  function setStageLabel(p) {
    if (reduced) { p = 1; }
    var idx = p < 0.10 ? 0 : p < 0.24 ? 1 : p < 0.38 ? 2 : p < 0.52 ? 3 : p < 0.64 ? 4 : p < 0.76 ? 5 : 6;
    if (idx !== stageIdx && stageLabel) {
      stageIdx = idx;
      stageLabel.textContent = STAGE_LABELS[idx];
    }
  }

  function readScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop || 0;
    scrollTarget = clamp((y - scrollStart) / scrollSpan, 0, 1);
    setStageLabel(scrollTarget);
    if (!running && !reduced && panels.length) snapPanels();
  }

  function measureScroll() {
    var r = host.getBoundingClientRect();
    var top = r.top + (window.pageYOffset || document.documentElement.scrollTop || 0);
    scrollStart = top - 150;
    scrollSpan = Math.max(isNarrow ? 320 : 260, host.offsetHeight * (isNarrow ? 0.9 : 0.55));
    readScroll();
  }

  function dpr() {
    return Math.min(window.devicePixelRatio || 1, isSmall ? 1.6 : 1.8);
  }

  function resize() {
    var w = host.clientWidth;
    var h = host.clientHeight;
    if (!w || !h) { w = 640; h = 520; }
    W = w; H = h;
    renderer.setPixelRatio(dpr());
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    measureScroll();
    if (reduced) {
      updateScene(performance.now(), 0);
      renderer.render(scene, camera);
    }
  }

  /* ------------------------------------------------------------------ animation */
  function updateScene(now, dt) {
    var t = reduced ? 0 : Math.max(0, (now - startTime) / 1000);
    if (!reduced) introT = Math.min(1, t / 2.9);
    var ease = 1 - Math.pow(1 - introT, 3);
    var k = reduced ? 1 : 1 - Math.exp(-dt * 4.5);

    scrollSmooth += (scrollTarget - scrollSmooth) * k;
    pointer.x += (pointer.tx - pointer.x) * k;
    pointer.y += (pointer.ty - pointer.y) * k;
    pointer.hover += (pointer.hoverT - pointer.hover) * k;

    renderer.toneMappingExposure = 0.025 + ease * 1.16;
    hemi.intensity = 0.08 + ease * 0.85;
    ambient.intensity = 0.05 + ease * 0.65;
    key.intensity = 0.15 + ease * 2.4;
    rim.intensity = 0.05 + ease * 1.7;
    spot.intensity = 0.4 + ease * 32;
    under.intensity = 0.2 + ease * 5.2;
    innerLight.intensity = (0.3 + ease * 7) * (0.9 + pointer.hover * 0.25);
    spot.position.x = lerp(-5.6, -3.4, ease);

    if (!reduced) {
      var az = BASE_AZ + Math.sin(t * 0.055) * 0.045 + pointer.x * 0.028;
      var rad = BASE_RADIUS + Math.sin(t * 0.041) * 0.09;
      var cy = BASE_Y + Math.sin(t * 0.068) * 0.028 + pointer.y * 0.045;
      camera.position.set(Math.sin(az) * rad, cy, Math.cos(az) * rad);
      camera.lookAt(LOOK.x, LOOK.y + scrollSmooth * 0.03, LOOK.z);
    }

    for (var i = 0; i < panels.length; i++) {
      var panel = panels[i];
      var target = reduced
        ? 0.94
        : smoothstep(panel.threshold - 0.01, panel.threshold + 0.06, scrollTarget);
      panel.op += (target - panel.op) * (reduced ? 1 : 0.06);
      panel.mat.opacity = panel.op * (0.9 + pointer.hover * 0.07);
      if (!reduced) {
        panel.mesh.position.y = panel.baseY + Math.sin(t * 0.55 + panel.phase) * 0.022 - (1 - panel.op) * 0.07;
      }
      panel.mesh.scale.setScalar(0.955 + panel.op * 0.045);
      panel.lineMat.opacity = panel.op * (0.15 + (scrollTarget > 0.86 ? 0.16 : 0));
    }

    var tArr = travGeo.attributes.position.array;
    for (var pi = 0; pi < panels.length; pi++) {
      var pp = panels[pi];
      if (pp.op > 0.16) {
        var tt = reduced ? 0.25 + pi * 0.11 : (t * 0.11 + pi * 0.163) % 1;
        var pt = pp.curve.getPointAt(tt);
        tArr[pi * 3] = pt.x;
        tArr[pi * 3 + 1] = pt.y;
        tArr[pi * 3 + 2] = pt.z;
      } else {
        tArr[pi * 3 + 1] = -99;
      }
    }
    travGeo.attributes.position.needsUpdate = true;
    travellers.material.opacity = 0.55 + pointer.hover * 0.35;

    for (var b = 0; b < beams.length; b++) {
      beams[b].material.opacity = beams[b].userData.base * (0.62 + ease * 0.5 + Math.sin(t * 0.3 + b * 1.4) * 0.12) + pointer.hover * 0.015;
    }

    innerLight.position.y = 1.45 + ease * 1.1 + Math.sin(t * 0.23) * 0.04;
    innerLight.position.x = Math.sin(t * 0.19) * 0.12;
    innerGlow.material.opacity = (0.16 + ease * 0.2) * (0.82 + Math.sin(t * 0.7) * 0.18 + pointer.hover * 0.16);
    innerGlow.position.x = 0.22 + Math.sin(t * 0.21) * 0.05;
    innerGlow.position.y = 2.52 + Math.cos(t * 0.17) * 0.04;
    rimRing.material.opacity = 0.3 + ease * 0.3;

    if (!reduced) {
      dust.rotation.y = t * 0.009;
      dust.position.y = Math.sin(t * 0.16) * 0.04;
      dustMat.opacity = 0.22 + ease * 0.34 + pointer.hover * 0.12;

      for (var f = 0; f < frags.length; f++) {
        var fr = frags[f];
        var fy = fr.y + Math.sin(t * fr.spd * 0.4 + fr.phase) * 0.1;
        var rx = fr.rot + t * fr.spd * 0.25;
        var rz = fr.rot * 0.6 + t * fr.spd * 0.18;
        m4.makeRotationFromEuler(new THREE.Euler(rx, fr.rot + t * 0.08, rz));
        m4.scale(new THREE.Vector3(fr.s, fr.s * 1.7, fr.s));
        m4.setPosition(fr.x + Math.sin(t * 0.2 + fr.phase) * 0.05, fy, fr.z);
        fragMesh.setMatrixAt(f, m4);
      }
      fragMesh.instanceMatrix.needsUpdate = true;
    }

    setStageLabel(scrollTarget);
  }

  function loop(now) {
    if (!running) return;
    var dt = Math.min(0.06, Math.max(0.001, (now - last) / 1000));
    last = now;
    frameTimes.push(dt);
    if (frameTimes.length > 90) frameTimes.shift();
    var sum = 0;
    for (var i = 0; i < frameTimes.length; i++) sum += frameTimes[i];
    fps = frameTimes.length / sum;

    updateScene(now, dt);
    renderer.render(scene, camera);
    rafId = requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------------ lifecycle */
  var running = false;
  var rafId = 0;
  var visible = false;
  var io = null;
  var ro = null;

  function start() {
    if (running || reduced || !visible || document.hidden) return;
    running = true;
    last = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    snapPanels();
  }

  function snapPanels() {
    for (var i = 0; i < panels.length; i++) {
      var p = panels[i];
      var target = reduced ? 0.94 : smoothstep(p.threshold - 0.01, p.threshold + 0.06, scrollTarget);
      p.op = target;
      p.mat.opacity = target * 0.9;
      p.lineMat.opacity = target * (0.15 + (scrollTarget > 0.86 ? 0.16 : 0));
    }
  }

  function onPointerMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    var r = host.getBoundingClientRect();
    if (!r.width || !r.height) return;
    pointer.tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
    pointer.ty = clamp(-(((e.clientY - r.top) / r.height) * 2 - 1), -1, 1);
    pointer.hoverT = 1;
  }
  function onPointerLeave() {
    pointer.tx = 0; pointer.ty = 0; pointer.hoverT = 0;
  }

  host.addEventListener('pointermove', onPointerMove, { passive: true });
  host.addEventListener('pointerleave', onPointerLeave, { passive: true });
  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  if ('ResizeObserver' in window) {
    ro = new ResizeObserver(resize);
    ro.observe(host);
  }

  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }, { rootMargin: '120px' });
    io.observe(host);
  } else {
    visible = true;
  }

  resize();
  measureScroll();
  if (!reduced) host.classList.add('is-start');

  renderer.compile(scene, camera);
  startTime = performance.now();
  updateScene(startTime, reduced ? 1 : 0.016);
  renderer.render(scene, camera);

  if (reduced) {
    host.classList.add('is-live');
    host.classList.remove('is-start');
  } else {
    requestAnimationFrame(function () {
      host.classList.remove('is-start');
      host.classList.add('is-live');
    });
  }

  setTimeout(function () { if (!running && visible) start(); }, 60);

  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    stop();
    useFallback();
  }, false);

  /* QA / debug hook (read-only metrics) */
  function projectBox(obj) {
    if (!obj) return null;
    obj.updateWorldMatrix(true, false);
    var box = new THREE.Box3().setFromObject(obj);
    var min = box.min, max = box.max;
    var xs = [min.x, max.x], ys = [min.y, max.y], zs = [min.z, max.z];
    var minX = 1, minY = 1, maxX = 0, maxY = 0;
    for (var xi = 0; xi < 2; xi++) for (var yi = 0; yi < 2; yi++) for (var zi = 0; zi < 2; zi++) {
      var v = new THREE.Vector3(xs[xi], ys[yi], zs[zi]).project(camera);
      var nx = v.x * 0.5 + 0.5;
      var ny = -v.y * 0.5 + 0.5;
      if (nx < minX) minX = nx; if (nx > maxX) maxX = nx;
      if (ny < minY) minY = ny; if (ny > maxY) maxY = ny;
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  window.KINETIA_BEAUTY_3D = {
    renderer: renderer,
    scene: scene,
    camera: camera,
    panels: panels,
    bust: bust,
    head: headMesh,
    reduced: reduced,
    get fps() { return Math.round(fps); },
    metrics: function () {
      return {
        width: W, height: H,
        head: projectBox(headMesh),
        bust: projectBox(bust),
        panels: panels.map(function (p) { return Math.round(p.mat.opacity * 100) / 100; }),
        transmission: useTransmission,
        stage: STAGE_LABELS[Math.max(0, stageIdx)],
        scroll: Math.round(scrollSmooth * 100) / 100,
        running: running
      };
    }
  };

  var disposed = false;
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    if (io) io.disconnect();
    if (ro) ro.disconnect();
    window.removeEventListener('scroll', readScroll);
    window.removeEventListener('resize', resize);
    host.removeEventListener('pointermove', onPointerMove);
    host.removeEventListener('pointerleave', onPointerLeave);
    var geos = [], mats = [], texs = [];
    scene.traverse(function (o) {
      if (o.geometry) geos.push(o.geometry);
      if (o.material) {
        var list = Array.isArray(o.material) ? o.material : [o.material];
        list.forEach(function (m) {
          mats.push(m);
          if (m.map) texs.push(m.map);
        });
      }
    });
    geos.forEach(function (g) { g.dispose(); });
    mats.forEach(function (m) { m.dispose(); });
    texs.forEach(function (x) { x.dispose(); });
    envMap.dispose();
    renderer.dispose();
    delete window.KINETIA_BEAUTY_3D;
  }
  window.addEventListener('pagehide', dispose, { once: true });
})();






