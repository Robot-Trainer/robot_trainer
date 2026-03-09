/**
 * MuJoCoSimView — Three.js-based simulation viewport React component.
 *
 * Renders the MuJoCo WASM scene using Three.js, driven by the renderer
 * process directly.
 */

import React, { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { MujocoSimulation, ObservationData, SimulationState } from '../lib/MujocoSimulation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MuJoCoSimViewProps {
  /** An already-initialised MujocoSimulation instance. */
  simulation: MujocoSimulation;
  /** Canvas width. Defaults to 640. */
  width?: number;
  /** Canvas height. Defaults to 480. */
  height?: number;
  /** CSS class applied to root container. */
  className?: string;
  /** Called every physics tick with observation data. */
  onStep?: (obs: ObservationData, state: SimulationState) => void;
}

export interface MuJoCoSimViewHandle {
  /** Get the canvas element for video capture. */
  getCanvas(): HTMLCanvasElement | null;
  /** Get the Three.js renderer. */
  getRenderer(): THREE.WebGLRenderer | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const MuJoCoSimView = forwardRef<MuJoCoSimViewHandle, MuJoCoSimViewProps>(
  function MuJoCoSimView({ simulation, width = 640, height = 480, className, onStep }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const frameIdRef = useRef<number | null>(null);
    const onStepRef = useRef(onStep);
    onStepRef.current = onStep;

    // Expose imperative handle
    useImperativeHandle(ref, () => ({
      getCanvas: () => rendererRef.current?.domElement ?? null,
      getRenderer: () => rendererRef.current,
    }), []);

    // Keyboard forwarding
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      simulation.handleKeyDown(e.key);
    }, [simulation]);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      simulation.handleKeyUp(e.key);
    }, [simulation]);

    useEffect(() => {
      if (!containerRef.current) return;

      // ── Three.js setup ──────────────────────────────────────────

      const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 100);
      camera.position.set(2.0, -1.7, 1.8);
      camera.up.set(0, 0, 1); // MuJoCo Z-up
      camera.lookAt(0, 0, 0.3);
      cameraRef.current = camera;

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(0, 0, 0.3);
      controls.enableDamping = true;
      controls.dampingFactor = 0.25;
      controls.update();
      controlsRef.current = controls;

      // ── Keyboard listeners ──────────────────────────────────────
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      // ── Animation loop ──────────────────────────────────────────
      const animate = () => {
        frameIdRef.current = requestAnimationFrame(animate);

        // Step physics + update Three scene
        const obs = simulation.tick();

        controls.update();
        renderer.render(simulation.scene, camera);

        if (obs && onStepRef.current) {
          const state: SimulationState = {
            qpos: new Float64Array(0), // placeholder — full state from tick callback
            qvel: new Float64Array(0),
            ctrl: new Float64Array(0),
            time: 0,
          };
          onStepRef.current(obs, state);
        }
      };

      animate();

      // ── Cleanup ─────────────────────────────────────────────────
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);

        if (frameIdRef.current !== null) {
          cancelAnimationFrame(frameIdRef.current);
          frameIdRef.current = null;
        }
        controls.dispose();
        renderer.dispose();
        if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(renderer.domElement);
        }
        rendererRef.current = null;
        cameraRef.current = null;
        controlsRef.current = null;
      };
    }, [simulation, width, height, handleKeyDown, handleKeyUp]);

    // Handle resize
    useEffect(() => {
      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.setSize(width, height);
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }
    }, [width, height]);

    return (
      <div
        ref={containerRef}
        className={className}
        style={{ width, height, position: 'relative', overflow: 'hidden' }}
      />
    );
  }
);

export default MuJoCoSimView;
