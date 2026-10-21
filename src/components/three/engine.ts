/**
 * Motor 3D de HYPSOS (three.js). Se carga bajo demanda con `import()`: no pesa en la portada
 * hasta que la sección 3D está a punto de entrar en pantalla.
 *
 * - Rotación por arrastre propia (no OrbitControls): con `touch-action: pan-y` el navegador
 *   conserva el scroll vertical en móvil y los gestos horizontales giran el objeto.
 * - Teclado: flechas para girar, Inicio para restablecer.
 * - Renderizado solo cuando el lienzo es visible; se pausa fuera de pantalla y con la pestaña oculta.
 * - Iluminación de estudio (RoomEnvironment) para el acabado cromado y un contraluz rojo de marca.
 */
import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface ViewerOptions {
  /** Giro automático lento (desactivado con movimiento reducido). */
  autoRotate: boolean;
  /** Se llama una vez renderizado el primer fotograma. */
  onReady?: () => void;
}

export interface ViewerHandle {
  dispose: () => void;
  reset: () => void;
}

export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function createStage(container: HTMLElement) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.style.touchAction = 'pan-y';
  renderer.domElement.style.cursor = 'grab';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;

  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  // Contraluz rojo muy contenido y luz principal que sigue levemente al puntero.
  const key = new DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 4, 5);
  const rim = new PointLight(new Color('#c8102e'), 18, 12, 2);
  rim.position.set(-3, -2, -2.5);
  scene.add(key, rim);

  return { renderer, scene, camera, environment, pmrem, key };
}

/** Rotación por arrastre con inercia, teclado y bucle de render bajo demanda. */
function runViewer(container: HTMLElement, target: Object3D, options: ViewerOptions, stage: ReturnType<typeof createStage>): ViewerHandle {
  const { renderer, scene, camera, key } = stage;
  const pivot = new Group();
  pivot.add(target);
  scene.add(pivot);

  const rotation = { x: -0.12, y: -0.45, vx: 0, vy: 0 };
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let visible = true;
  let frame = 0;
  let readyFired = false;
  let lightX = 0;

  const resize = () => {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const loop = () => {
    frame = 0;
    if (!visible) return;
    if (!dragging) {
      rotation.y += rotation.vy;
      rotation.x += rotation.vx;
      rotation.vy *= 0.94;
      rotation.vx *= 0.9;
      if (options.autoRotate && Math.abs(rotation.vy) < 0.0015) rotation.y += 0.0025;
    }
    rotation.x = MathUtils.clamp(rotation.x, -0.6, 0.6);
    pivot.rotation.set(rotation.x, rotation.y, 0);
    key.position.x = MathUtils.lerp(key.position.x, 3 + lightX * 4, 0.05);
    renderer.render(scene, camera);
    if (!readyFired) {
      readyFired = true;
      options.onReady?.();
    }
    frame = requestAnimationFrame(loop);
  };
  const start = () => {
    if (!frame && visible) frame = requestAnimationFrame(loop);
  };

  const onDown = (event: PointerEvent) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    renderer.domElement.style.cursor = 'grabbing';
    renderer.domElement.setPointerCapture(event.pointerId);
  };
  const onMove = (event: PointerEvent) => {
    const bounds = container.getBoundingClientRect();
    lightX = (event.clientX - bounds.left) / bounds.width - 0.5;
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    rotation.vy = dx * 0.006;
    rotation.y += rotation.vy;
    // En táctil el eje vertical queda para el scroll de la página.
    if (event.pointerType === 'mouse') {
      rotation.vx = dy * 0.004;
      rotation.x += rotation.vx;
    }
  };
  const onUp = (event: PointerEvent) => {
    dragging = false;
    renderer.domElement.style.cursor = 'grab';
    if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId);
  };
  const reset = () => {
    rotation.x = -0.12;
    rotation.y = -0.45;
    rotation.vx = rotation.vy = 0;
  };
  const onKey = (event: KeyboardEvent) => {
    const step = 0.18;
    if (event.key === 'ArrowLeft') rotation.y -= step;
    else if (event.key === 'ArrowRight') rotation.y += step;
    else if (event.key === 'ArrowUp') rotation.x -= step / 2;
    else if (event.key === 'ArrowDown') rotation.x += step / 2;
    else if (event.key === 'Home') reset();
    else return;
    event.preventDefault();
  };

  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  container.addEventListener('keydown', onKey);

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && document.visibilityState === 'visible';
    if (visible) start();
  });
  observer.observe(container);
  const onVisibility = () => {
    visible = document.visibilityState === 'visible';
    if (visible) start();
  };
  document.addEventListener('visibilitychange', onVisibility);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();
  start();

  return {
    reset,
    dispose: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      container.removeEventListener('keydown', onKey);
      scene.traverse((object) => {
        const mesh = object as Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material?.dispose();
      });
      stage.environment.dispose();
      stage.pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

/** Centra y escala un objeto para que ocupe `size` unidades en su lado mayor. */
function fit(object: Object3D, size: number) {
  const box = new Box3().setFromObject(object);
  const dimensions = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const scale = size / Math.max(dimensions.x, dimensions.y, dimensions.z);
  object.scale.multiplyScalar(scale);
  object.position.sub(center.multiplyScalar(scale));
}

/** Monograma H oficial extruido desde su vector (mismo trazado que el logotipo, en volumen cromado). */
export function mountMonogram(
  container: HTMLElement,
  vector: { viewBox: string; transform: string; d: string },
  options: ViewerOptions,
): ViewerHandle {
  const stage = createStage(container);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vector.viewBox}"><g transform="${vector.transform}"><path d="${vector.d}"/></g></svg>`;
  const data = new SVGLoader().parse(svg);
  const shapes = data.paths.flatMap((path) => SVGLoader.createShapes(path));
  const geometry = new ExtrudeGeometry(shapes, {
    depth: 260,
    bevelEnabled: true,
    bevelThickness: 70,
    bevelSize: 34,
    bevelSegments: 8,
    curveSegments: 12,
  });
  geometry.computeVertexNormals();
  const material = new MeshPhysicalMaterial({
    color: 0xe6e6e6,
    metalness: 1,
    roughness: 0.14,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.25,
  });
  const mesh = new Mesh(geometry, material);
  mesh.scale.set(1, -1, 1); // SVG (y hacia abajo) → 3D (y hacia arriba)
  const holder = new Group();
  holder.add(mesh);
  fit(holder, 3.2);
  return runViewer(container, holder, options, stage);
}

/** Visor de modelos reales del producto (GLB/GLTF). Rechaza la promesa si el archivo no carga. */
export async function mountModel(container: HTMLElement, src: string, options: ViewerOptions): Promise<ViewerHandle> {
  const stage = createStage(container);
  try {
    const gltf = await new GLTFLoader().loadAsync(src);
    const holder = new Group();
    holder.add(gltf.scene);
    fit(holder, 3);
    return runViewer(container, holder, options, stage);
  } catch (error) {
    stage.environment.dispose();
    stage.pmrem.dispose();
    stage.renderer.dispose();
    stage.renderer.domElement.remove();
    throw error;
  }
}
