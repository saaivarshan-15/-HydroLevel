/*
 * HydroLevel Digital Twin renderer.
 *
 * The renderer is intentionally isolated from dashboard.js. You can replace
 * this file with a higher-fidelity Three.js model later without touching the
 * dataset, equalization, reports or HydroAI logic.
 */
(() => {
  const WHEELS = ['FL', 'FR', 'RL', 'RR'];
  const COLORS = {
    cyan: 0x00e5ff,
    cyanSoft: 0x1ab6d1,
    green: 0x35f28a,
    red: 0xff4055,
    amber: 0xffc857,
    white: 0xdaf9ff,
    dark: 0x061117
  };

  let scene;
  let camera;
  let renderer;
  let vehicleGroup;
  let wheelNodes = {};
  let nodeMaterials = {};
  let grid;
  let ready = false;
  let currentView = 'top';
  const target = new THREE.Vector3(0, 0, 0);

  const views = {
    top: { position: [0, 9.8, 0.2], look: [0, 0, 0] },
    front: { position: [0, 2.6, 10.8], look: [0, 0, 0] },
    side: { position: [10.8, 2.7, 0], look: [0, 0, 0] },
    iso: { position: [8.5, 6.5, 9.5], look: [0, 0, 0] }
  };

  function createLineBox(size, color = COLORS.cyan) {
    const geometry = new THREE.BoxGeometry(...size, 8, 4, 12);
    const lines = new THREE.LineSegments(
      new THREE.WireframeGeometry(geometry),
      new THREE.LineDashedMaterial({
        color,
        dashSize: 0.16,
        gapSize: 0.10,
        transparent: true,
        opacity: 0.82
      })
    );
    lines.computeLineDistances();
    return lines;
  }

  function createWheel(x, z, key) {
    const geometry = new THREE.CylinderGeometry(0.72, 0.72, 0.34, 24, 1, true);
    const material = new THREE.MeshBasicMaterial({
      color: COLORS.cyan,
      wireframe: true,
      transparent: true,
      opacity: 0.9
    });
    const wheel = new THREE.Mesh(geometry, material);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, -0.72, z);
    wheelNodes[key] = wheel;
    nodeMaterials[key] = material;
    vehicleGroup.add(wheel);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.83, 0.025, 6, 32),
      new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.35 })
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.copy(wheel.position);
    vehicleGroup.add(ring);
  }

  function createVehicle() {
    vehicleGroup = new THREE.Group();

    const body = createLineBox([4.2, 1.05, 7.2]);
    body.position.y = 0;
    vehicleGroup.add(body);

    const cabin = createLineBox([3.5, 1.15, 3.0], COLORS.cyanSoft);
    cabin.position.set(0, 1.0, -0.5);
    vehicleGroup.add(cabin);

    const front = createLineBox([3.7, 0.6, 1.0], COLORS.white);
    front.position.set(0, 0.1, -3.55);
    vehicleGroup.add(front);

    const rear = createLineBox([3.7, 0.6, 0.7], COLORS.cyanSoft);
    rear.position.set(0, 0.1, 3.6);
    vehicleGroup.add(rear);

    const centerRail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -0.25, -3.4),
        new THREE.Vector3(0, -0.25, 3.4)
      ]),
      new THREE.LineBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.35 })
    );
    vehicleGroup.add(centerRail);

    createWheel(-2.25, -2.45, 'FL');
    createWheel(2.25, -2.45, 'FR');
    createWheel(-2.25, 2.45, 'RL');
    createWheel(2.25, 2.45, 'RR');

    // Centre-of-gravity crosshair.
    const cg = new THREE.Group();
    cg.name = 'cg3d';
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.24, 0.29, 32),
      new THREE.MeshBasicMaterial({ color: COLORS.white, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
    );
    ring.rotation.x = -Math.PI / 2;
    cg.add(ring);
    const crossMat = new THREE.LineBasicMaterial({ color: COLORS.white, transparent: true, opacity: 0.8 });
    cg.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.45, 0, 0), new THREE.Vector3(0.45, 0, 0)
    ]), crossMat));
    cg.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -0.45), new THREE.Vector3(0, 0, 0.45)
    ]), crossMat));
    vehicleGroup.add(cg);

    scene.add(vehicleGroup);
  }


  function renderFallback() {
    const host = document.getElementById('twinCanvas');
    if (!host) return;
    host.innerHTML = `
      <div class="twinFallback" aria-label="Digital twin fallback renderer">
        <div class="fallbackVehicle">
          <i class="fallbackWheel fl">FL</i><i class="fallbackWheel fr">FR</i>
          <i class="fallbackWheel rl">RL</i><i class="fallbackWheel rr">RR</i>
          <i class="fallbackCg">CG</i>
        </div>
        <span>3D ENGINE UNAVAILABLE · LIVE LOAD MAP ACTIVE</span>
      </div>`;
  }

  function createScene() {
    const host = document.getElementById('twinCanvas');
    if (!host || !window.THREE) { renderFallback(); return false; }

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03080b, 0.055);

    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    host.innerHTML = '';
    host.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0x6eeeff, 0.9);
    scene.add(ambient);

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshBasicMaterial({ color: COLORS.dark, transparent: true, opacity: 0.18 })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -1.05;
    scene.add(plane);

    grid = new THREE.GridHelper(28, 28, COLORS.cyan, 0x12343a);
    grid.material.transparent = true;
    grid.material.opacity = 0.13;
    grid.position.y = -1.06;
    scene.add(grid);

    createVehicle();
    setSize();
    setView('top', true);
    ready = true;
    animate();
    return true;
  }

  function setSize() {
    if (!renderer || !camera) return;
    const host = document.getElementById('twinCanvas');
    const width = Math.max(host.clientWidth, 320);
    const height = Math.max(host.clientHeight, 320);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function setView(view, instant = false) {
    if (!ready || !views[view]) return;
    currentView = view;
    const v = views[view];
    if (window.gsap && !instant) {
      gsap.to(camera.position, {
        x: v.position[0], y: v.position[1], z: v.position[2],
        duration: 1.05, ease: 'power3.inOut',
        onUpdate: () => camera.lookAt(target)
      });
    } else {
      camera.position.set(...v.position);
      camera.lookAt(target);
    }
    document.querySelectorAll('.twinView').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  }

  function setNodeState(key, status) {
    const mat = nodeMaterials[key];
    if (!mat) return;

    const color = status === 'danger' ? COLORS.red : status === 'good' ? COLORS.green : COLORS.cyan;
    mat.color.setHex(color);

    // A small visual pulse makes the engineering state obvious without
    // rotating, shaking, or changing the geometry of the digital twin.
    if (window.gsap) {
      gsap.killTweensOf(mat);
      mat.opacity = 0.9;
      if (status === 'danger' || status === 'good') {
        gsap.to(mat, { opacity: 0.45, duration: 0.45, repeat: 1, yoyo: true, ease: 'power1.inOut' });
      }
    }
  }

  function update(state) {
    if (!ready || !state) return;
    const loads = state.wheel_load_kg || {};
    const eq = state.equalized_load_kg || {};
    const alerts = new Set(state.alerts || []);

    WHEELS.forEach(wheel => {
      const raw = Number(loads[wheel] || 0);
      const equalized = Number(eq[wheel] || raw);
      const status = alerts.has(wheel) ? 'danger' : Math.abs(equalized - raw) > 0.01 ? 'good' : 'normal';
      setNodeState(wheel, status);

      const node = wheelNodes[wheel];
      if (node) {
        const targetScale = 0.85 + Math.min(raw / Math.max(state.total_load_kg || 1, 1), 0.45);
        if (window.gsap) gsap.to(node.scale, { x: targetScale, y: targetScale, z: targetScale, duration: 0.35, overwrite: true });
      }
    });

    const cg = vehicleGroup?.getObjectByName('cg3d');
    if (cg) {
      const x = Number(state.cg_x || 0) * 3.0;
      const z = Number(state.cg_y || 0) * -4.2;
      if (window.gsap) gsap.to(cg.position, { x, z, duration: 0.65, ease: 'power2.out' });
      else cg.position.set(x, 0, z);
    }

    const alert = Boolean(state.anomaly_detected) || alerts.size > 0;
    // Keep alert colors and vehicle state stable. No blinking or shaking on alerts.
    if (window.gsap && vehicleGroup) {
      gsap.to(vehicleGroup.rotation, { y: currentView === 'iso' ? 0.08 : 0, duration: 0.7 });
    }

    const source = document.getElementById('twinSource');
    if (source) source.textContent = state.source === 'hydrolevel-playback' ? `ROW ${state.row_index} · DIGITAL STATE` : 'LIVE DIGITAL STATE';
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!renderer || !scene || !camera) return;
    if (vehicleGroup && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      vehicleGroup.rotation.y += currentView === 'iso' ? 0.0008 : 0.0002;
    }
    renderer.render(scene, camera);
  }

  window.HydroDigitalTwin = {
    init: createScene,
    resize: setSize,
    setView,
    update,
    isReady: () => ready
  };

  window.addEventListener('resize', setSize);

  document.addEventListener('DOMContentLoaded', () => {
    if (window.THREE) createScene();
    else renderFallback();
    document.querySelectorAll('.twinView').forEach(btn => {
      btn.addEventListener('click', () => setView(btn.dataset.view));
    });
  });
})();
