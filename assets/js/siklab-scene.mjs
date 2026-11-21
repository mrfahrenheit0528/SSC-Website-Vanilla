import { ACESFilmicToneMapping, AmbientLight, Color, DirectionalLight, Group, Mesh, MeshPhysicalMaterial,
  PerspectiveCamera, PMREMGenerator, Scene, SphereGeometry, WebGLRenderer } from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadSiklabModel } from './siklab-model-loader.mjs';

const container = document.querySelector('[data-trophy-scene]');
if (container) initializeScene(container).catch(() => {
  // A failed model request or unsupported GPU leaves the supplied fallback visible.
  container.classList.remove('is-ready');
  container.querySelector('canvas').hidden = true;
  container.querySelector('img').removeAttribute('aria-hidden');
  document.querySelector('[data-scene-toggle]').hidden = true;
});

async function initializeScene(container) {
  const canvas = container.querySelector('canvas');
  const fallback = container.querySelector('img');
  const toggle = document.querySelector('[data-scene-toggle]');
  const caption = document.querySelector('[data-scene-caption]');
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    // The supplied artwork remains fully visible when WebGL is unsupported.
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, .1, 100);
  camera.position.set(0, .48, 8.9);
  camera.lookAt(0, .28, 0);
  const room = new RoomEnvironment();
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  scene.add(new AmbientLight('#ffffff', .7));
  const key = new DirectionalLight('#fff6df', 3.5);
  key.position.set(-3, 5, 6); scene.add(key);
  const edge = new DirectionalLight('#c8d9ff', 3.0);
  edge.position.set(4, 3, -4); scene.add(edge);
  const fill = new DirectionalLight('#ffbddf', 1.3);
  fill.position.set(-4, .4, 1); scene.add(fill);

  let trophy;
  try {
    trophy = await loadSiklabModel(container.dataset.modelUrl);
  } catch (error) {
    environment.dispose(); renderer.dispose(); throw error;
  }
  scene.add(trophy);
  const accents = new Group();
  for (const [radius, color, x, y, z] of [[.1, '#ec36b3', 1.8, 1.55, -.8], [.16, '#ffc61c', -1.75, -.85, .1]]) {
    const sphere = new Mesh(new SphereGeometry(radius, 24, 16), new MeshPhysicalMaterial({ color: new Color(color), roughness: .15, metalness: .45, clearcoat: 1 }));
    sphere.position.set(x, y, z);
    accents.add(sphere);
  }
  scene.add(accents);

  let paused = motionPreference.matches;
  let visible = true;
  let frame = 0;
  let phase = 0;
  let previous = performance.now();
  let yaw = -.28;
  let drag = null;
  let disposed = false;
  function draw(now = performance.now()) {
    frame = 0;
    const delta = Math.min((now - previous) / 1000, .05);
    if (!paused && !drag) { phase += delta; yaw += delta * .18; }
    previous = now;
    trophy.rotation.y = yaw;
    trophy.position.y = .28 + Math.sin(phase * .85) * .055;
    accents.rotation.y = Math.sin(phase * .25) * .12;
    renderer.render(scene, camera);
    if (!paused && visible && !document.hidden && !disposed) frame = requestAnimationFrame(draw);
  }
  function schedule() {
    if (frame) cancelAnimationFrame(frame);
    if (!disposed) { previous = performance.now(); draw(); }
  }
  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // The complete trophy must fit the narrowest mobile stage too.
    camera.position.z = camera.aspect < .65 ? 9.7 : 8.9;
    camera.updateProjectionMatrix();
    schedule();
  }
  function updateToggle() {
    toggle.textContent = paused ? 'Play animation' : 'Pause animation';
    toggle.setAttribute('aria-label', paused ? 'Play trophy animation' : 'Pause trophy animation');
  }
  toggle.addEventListener('click', () => { paused = !paused; updateToggle(); schedule(); });
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    drag = { x: event.clientX, yaw };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    yaw = drag.yaw + (event.clientX - drag.x) * .008;
    schedule();
  });
  const release = () => { drag = null; schedule(); };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
    event.preventDefault();
    yaw = event.key === 'Home' ? -.28 : yaw + (event.key === 'ArrowLeft' ? -.18 : .18);
    schedule();
  });
  motionPreference.addEventListener('change', () => { paused = motionPreference.matches; updateToggle(); schedule(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else schedule();
  });
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) { cancelAnimationFrame(frame); frame = 0; } else schedule();
  });
  visibility.observe(container);
  const resizer = new ResizeObserver(resize);
  resizer.observe(container);
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    disposed = true;
    cancelAnimationFrame(frame);
    container.classList.remove('is-ready');
    canvas.hidden = true;
    fallback.removeAttribute('aria-hidden');
    toggle.hidden = true;
    caption.textContent = 'SIKLAB 2026';
  });
  addEventListener('pagehide', () => {
    disposed = true; cancelAnimationFrame(frame); visibility.disconnect(); resizer.disconnect();
    scene.traverse((object) => {
      object.geometry?.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    environment.dispose(); renderer.dispose();
  }, { once: true });
  try {
    canvas.hidden = false;
    resize();
    container.classList.add('is-ready');
    fallback.setAttribute('aria-hidden', 'true');
    toggle.hidden = false;
    caption.textContent = 'DRAG TO EXPLORE';
    updateToggle();
  } catch {
    disposed = true; cancelAnimationFrame(frame); renderer.dispose();
    canvas.hidden = true;
    // Initialization can fail on constrained devices; retain the original art.
  }
}
