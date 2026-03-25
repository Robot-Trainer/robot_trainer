import React, { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Box } from '@mui/material';

interface MujocoPreviewProps {
  /** MJCF XML string to render */
  xml: string;
  /** Width of the preview canvas */
  width?: number | string;
  /** Height of the preview canvas */
  height?: number | string;
  /** Callback when XML parsing/rendering fails */
  onError?: (error: string) => void;
  /** Callback when rendering succeeds (clears previous error) */
  onSuccess?: () => void;
}

/**
 * Lightweight static 3D preview of an MJCF XML model.
 *
 * Parses the MJCF XML using DOM parsing and renders the geometry
 * primitives (box, sphere, capsule, cylinder, plane) with Three.js.
 * Supports OrbitControls for camera manipulation.
 *
 * This is a *static preview* — no MuJoCo WASM physics simulation.
 * It visualises the model geometry only, which is sufficient
 * for an editor preview.
 */
export const MujocoPreview: React.FC<MujocoPreviewProps> = ({
  xml,
  width = '100%',
  height = 500,
  onError,
  onSuccess,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const meshesRef = useRef<THREE.Object3D[]>([]);

  // Initialize Three.js scene once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x1a1a2e, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
    camera.up.set(0, 0, 1); // MuJoCo uses Z-up
    camera.position.set(1.5, -1.5, 1.2);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.target.set(0, 0, 0.3);
    controls.update();
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, -2, 4);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.3);
    pointLight.position.set(0, 0, 3);
    scene.add(pointLight);

    // Grid helper (ground plane reference)
    const gridHelper = new THREE.GridHelper(4, 20, 0x444444, 0x333333);
    gridHelper.rotation.x = Math.PI / 2; // rotate to XY plane (Z-up)
    scene.add(gridHelper);

    // Resize observer
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w > 0 && h > 0) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    handleResize();

    // Animation loop
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameIdRef.current = requestAnimationFrame(animate);
    };
    frameIdRef.current = requestAnimationFrame(animate);

    return () => {
      resizeObserver.disconnect();
      if (frameIdRef.current != null) {
        cancelAnimationFrame(frameIdRef.current);
      }
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Clear model meshes
  const clearMeshes = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    for (const obj of meshesRef.current) {
      scene.remove(obj);
      obj.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).geometry) {
          (child as THREE.Mesh).geometry.dispose();
        }
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      });
    }
    meshesRef.current = [];
  }, []);

  // Parse XML and build geometry
  const buildScene = useCallback(
    (xmlStr: string) => {
      const scene = sceneRef.current;
      if (!scene || !xmlStr.trim()) return;

      clearMeshes();

      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlStr, 'text/xml');

        // Check for parse errors
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
          throw new Error(parseError.textContent || 'XML parsing error');
        }

        const root = doc.querySelector('mujoco');
        if (!root) {
          throw new Error('No <mujoco> root element found');
        }

        // Collect all geom elements
        const geoms = root.querySelectorAll('geom');
        const bodies = root.querySelectorAll('body');

        // Parse each geom into a Three.js mesh
        geoms.forEach((geom) => {
          const mesh = createMeshFromGeom(geom);
          if (mesh) {
            scene.add(mesh);
            meshesRef.current.push(mesh);
          }
        });

        // Parse body-level transformations
        bodies.forEach((body) => {
          const bodyGeoms = Array.from(body.children).filter(
            (c) => c.tagName === 'geom'
          );
          if (bodyGeoms.length === 0) return;

          const posAttr = body.getAttribute('pos');
          const quatAttr = body.getAttribute('quat');

          bodyGeoms.forEach((geom) => {
            // Check if this geom was already added at top-level
            // (querySelectorAll('geom') catches all nested geoms)
            // So we handle positioning here
            const _geomName = geom.getAttribute('name') || '';
            const existing = meshesRef.current.find(
              (m) => m.userData.geomElement === geom
            );
            if (existing && posAttr) {
              const [x, y, z] = posAttr.split(/\s+/).map(Number);
              existing.position.add(new THREE.Vector3(x, y, z));
            }
            if (existing && quatAttr) {
              const [w, qx, qy, qz] = quatAttr.split(/\s+/).map(Number);
              const bodyQuat = new THREE.Quaternion(qx, qy, qz, w);
              existing.quaternion.premultiply(bodyQuat);
            }
          });
        });

        // Auto-fit camera to scene content
        autoFitCamera();

        onSuccess?.();
      } catch (e: unknown) {
        onError?.(e instanceof Error ? e.message : String(e));
      }
    },
    [clearMeshes, onError, onSuccess]
  );

  // Auto-fit camera to bound the model
  const autoFitCamera = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls || meshesRef.current.length === 0) return;

    const box = new THREE.Box3();
    for (const obj of meshesRef.current) {
      box.expandByObject(obj);
    }

    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2.5;

    controls.target.copy(center);
    camera.position.set(
      center.x + distance * 0.6,
      center.y - distance * 0.6,
      center.z + distance * 0.5
    );
    controls.update();
  }, []);

  // Rebuild scene when XML changes
  useEffect(() => {
    if (xml) {
      buildScene(xml);
    }
  }, [xml, buildScene]);

  return (
    <Box
      ref={containerRef}
      sx={{
        width,
        height,
        borderRadius: 1,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        '& canvas': {
          display: 'block',
          width: '100% !important',
          height: '100% !important',
        },
      }}
    />
  );
};

// ─── Geometry helpers ────────────────────────────────────────────────

function parseFloatArray(attr: string | null): number[] {
  if (!attr) return [];
  return attr.trim().split(/\s+/).map(Number);
}

function parseRgba(attr: string | null): [number, number, number, number] {
  if (!attr) return [0.6, 0.6, 0.7, 1];
  const parts = attr.trim().split(/\s+/).map(Number);
  return [parts[0] ?? 0.6, parts[1] ?? 0.6, parts[2] ?? 0.7, parts[3] ?? 1];
}

function createMeshFromGeom(geomEl: Element): THREE.Mesh | null {
  const type = geomEl.getAttribute('type') || 'sphere';
  const sizeAttr = parseFloatArray(geomEl.getAttribute('size'));
  const posAttr = parseFloatArray(geomEl.getAttribute('pos'));
  const quatAttr = parseFloatArray(geomEl.getAttribute('quat'));
  const zaxisAttr = parseFloatArray(geomEl.getAttribute('zaxis'));
  const rgba = parseRgba(geomEl.getAttribute('rgba'));
  const fromto = parseFloatArray(geomEl.getAttribute('fromto'));

  let geometry: THREE.BufferGeometry | null;

  switch (type) {
    case 'plane': {
      const sx = sizeAttr[0] || 5;
      const sy = sizeAttr[1] || 5;
      geometry = new THREE.PlaneGeometry(sx * 2, sy * 2);
      break;
    }
    case 'sphere': {
      const r = sizeAttr[0] || 0.05;
      geometry = new THREE.SphereGeometry(r, 24, 16);
      break;
    }
    case 'box': {
      const hx = sizeAttr[0] || 0.05;
      const hy = sizeAttr[1] || 0.05;
      const hz = sizeAttr[2] || 0.05;
      geometry = new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2);
      break;
    }
    case 'cylinder': {
      const r = sizeAttr[0] || 0.05;
      const halfLen = sizeAttr[1] || 0.1;
      geometry = new THREE.CylinderGeometry(r, r, halfLen * 2, 24);
      geometry.rotateX(Math.PI / 2); // MuJoCo cylinders along Z
      break;
    }
    case 'capsule': {
      const r = sizeAttr[0] || 0.05;
      let halfLen = sizeAttr[1] || 0.1;
      if (fromto.length === 6) {
        const dx = fromto[3] - fromto[0];
        const dy = fromto[4] - fromto[1];
        const dz = fromto[5] - fromto[2];
        halfLen = Math.sqrt(dx * dx + dy * dy + dz * dz) / 2;
      }
      geometry = new THREE.CapsuleGeometry(r, halfLen * 2, 8, 16);
      geometry.rotateX(Math.PI / 2); // MuJoCo capsules along Z
      break;
    }
    case 'ellipsoid': {
      const rx = sizeAttr[0] || 0.05;
      const ry = sizeAttr[1] || 0.05;
      const rz = sizeAttr[2] || 0.05;
      geometry = new THREE.SphereGeometry(1, 24, 16);
      geometry.scale(rx, ry, rz);
      break;
    }
    default:
      return null;
  }

  if (!geometry) return null;

  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color(rgba[0], rgba[1], rgba[2]),
    opacity: rgba[3],
    transparent: rgba[3] < 1,
    side: type === 'plane' ? THREE.DoubleSide : THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = type !== 'plane';
  mesh.receiveShadow = true;

  // Position
  if (fromto.length === 6) {
    const cx = (fromto[0] + fromto[3]) / 2;
    const cy = (fromto[1] + fromto[4]) / 2;
    const cz = (fromto[2] + fromto[5]) / 2;
    mesh.position.set(cx, cy, cz);

    // Orientation from fromto
    const dir = new THREE.Vector3(
      fromto[3] - fromto[0],
      fromto[4] - fromto[1],
      fromto[5] - fromto[2]
    ).normalize();
    const up = new THREE.Vector3(0, 0, 1);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
    mesh.quaternion.copy(quat);
  } else {
    if (posAttr.length >= 3) {
      mesh.position.set(posAttr[0], posAttr[1], posAttr[2]);
    }

    if (quatAttr.length >= 4) {
      // MuJoCo quat: [w, x, y, z], Three.js: (x, y, z, w)
      mesh.quaternion.set(quatAttr[1], quatAttr[2], quatAttr[3], quatAttr[0]);
    } else if (zaxisAttr.length >= 3) {
      const zaxis = new THREE.Vector3(zaxisAttr[0], zaxisAttr[1], zaxisAttr[2]).normalize();
      const defaultZ = new THREE.Vector3(0, 0, 1);
      const q = new THREE.Quaternion().setFromUnitVectors(defaultZ, zaxis);
      mesh.quaternion.copy(q);
    }
  }

  mesh.userData.geomElement = geomEl;

  return mesh;
}

export default MujocoPreview;
