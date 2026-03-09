/**
 * MuJoCo WASM simulation engine.
 *
 * Translates the functionality of custom_mujoco_env.py to run entirely
 * in the browser/renderer using the mujoco_wasm WASM bindings and Three.js
 * for rendering. No Python subprocess, no WebSocket streaming.
 *
 * Key features ported from GenericMujocoEnv:
 *  - Dynamic joint/actuator/camera discovery
 *  - Camera injection into XML
 *  - Auto-detect home position from keyframes
 *  - Gripper detection
 *  - Multi-camera rendering via Three.js
 *  - Keyboard-based control
 */

import * as THREE from 'three';
import loadMujoco from 'mujoco_wasm';
import type { MainModule, MjModel, MjData, MjvScene as MjvSceneType } from 'mujoco_wasm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CameraSpec {
  name: string;
  pos?: number[];
  quat?: number[];
  xyaxes?: number[];
  euler?: number[];
  target?: string;
  fovy?: number;
  width: number;
  height: number;
}

export interface SimulationConfig {
  modelXml?: string;
  modelPath?: string;
  sceneXmlPath?: string;
  robotXmlPath?: string;
  cameras?: CameraSpec[];
  homePosition?: number[];
  controlDt?: number;
  physicsDt?: number;
  seed?: number;
}

export interface JointInfo {
  name: string;
  id: number;
  qposAdr: number;
}

export interface ActuatorInfo {
  name: string;
  id: number;
}

export interface SimulationState {
  qpos: Float64Array;
  qvel: Float64Array;
  ctrl: Float64Array;
  time: number;
}

export interface ObservationData {
  /** qpos + qvel + optional gripper state */
  'observation.state': Float32Array;
  /** Per-camera rendered images (name → ImageData) */
  [key: `observation.images.${string}`]: ImageData;
}

// ---------------------------------------------------------------------------
// CapsuleGeometry (matches mujoco WASM demo_app)
// ---------------------------------------------------------------------------

class CapsuleGeometry extends THREE.BufferGeometry {
  constructor(radius = 1, length = 1, capSegments = 4, radialSegments = 8) {
    const path = new THREE.Path();
    path.absarc(0, -length / 2, radius, Math.PI * 1.5, 0, false);
    path.absarc(0, length / 2, radius, 0, Math.PI * 0.5, false);
    const lathe = new THREE.LatheGeometry(path.getPoints(capSegments), radialSegments);
    super();
    this.setIndex(lathe.getIndex());
    this.setAttribute('position', lathe.getAttribute('position'));
    this.setAttribute('normal', lathe.getAttribute('normal'));
    this.setAttribute('uv', lathe.getAttribute('uv'));
  }
}

// ---------------------------------------------------------------------------
// MujocoSimulation class
// ---------------------------------------------------------------------------

export class MujocoSimulation {
  private mujoco!: MainModule;
  private mjModel!: MjModel;
  private mjData!: MjData;
  private mjvScene!: MjvSceneType;
  private mjvOption: any;
  private mjvPerturb: any;
  private mjvCamera: any;

  // Three.js
  readonly scene = new THREE.Scene();
  private meshes: THREE.Mesh[] = [];
  private bufferGeometryCache = new Map<string, THREE.BufferGeometry>();
  private maxGeoms = 2 ** 15;

  // Simulation metadata (discovered dynamically)
  private _joints: JointInfo[] = [];
  private _actuators: ActuatorInfo[] = [];
  private _dofIds: number[] = [];
  private _ctrlIds: number[] = [];
  private _cameraSpecs: CameraSpec[] = [];
  private _cameraIds: number[] = [];
  private _homePosition: Float64Array = new Float64Array(0);
  private _gripperCtrlId: number | null = null;
  private _hasGripper = false;
  private _nSubsteps = 1;

  // Control state (keyboard input)
  private _keyState = new Map<string, boolean>();
  private _controlDt = 0.02;
  private _physicsDt = 0.002;

  private _running = false;
  private _paused = false;
  private _disposed = false;
  private _frameId: number | null = null;

  /** Callback invoked each simulation step with observation data. */
  onStep?: (obs: ObservationData, state: SimulationState) => void;

  /** Callback invoked when the simulation encounters an error. */
  onError?: (error: Error) => void;

  // ── Accessors ───────────────────────────────────────────────────────────

  get running() { return this._running; }
  get paused() { return this._paused; }
  get joints(): readonly JointInfo[] { return this._joints; }
  get actuators(): readonly ActuatorInfo[] { return this._actuators; }
  get hasGripper() { return this._hasGripper; }
  get cameraSpecs(): readonly CameraSpec[] { return this._cameraSpecs; }
  get jointNames(): string[] { return this._joints.map(j => j.name); }
  get actuatorNames(): string[] { return this._actuators.map(a => a.name); }

  // ── Initialisation ─────────────────────────────────────────────────────

  async init(config: SimulationConfig): Promise<void> {
    this.mujoco = await loadMujoco();
    const mj = this.mujoco;

    // Set up in-memory file system for model files
    try { (mj as any).FS.mkdir('/working'); } catch { /* already exists */ }
    try { (mj as any).FS.mount((mj as any).MEMFS, { root: '.' }, '/working'); } catch { /* already mounted */ }

    // Build the MJCF XML
    let xml = this._resolveModelXml(config);

    // Inject cameras if needed
    if (config.cameras && config.cameras.length > 0) {
      xml = this._injectCameras(xml, config.cameras);
      this._cameraSpecs = config.cameras;
    }

    // Write to virtual FS and load
    (mj as any).FS.writeFile('/working/model.xml', xml);
    this.mjModel = mj.MjModel.mj_loadXML('/working/model.xml');
    if (!this.mjModel) throw new Error('Failed to load MuJoCo model from XML');

    this.mjData = new mj.MjData(this.mjModel);
    if (!this.mjData) throw new Error('Failed to create MjData');

    // Apply physics timestep
    this._controlDt = config.controlDt ?? 0.02;
    this._physicsDt = config.physicsDt ?? 0.002;
    this.mjModel.opt.timestep = this._physicsDt;
    this._nSubsteps = Math.max(1, Math.round(this._controlDt / this._physicsDt));

    // Discover joints, actuators, cameras, gripper
    this._discoverJoints();
    this._discoverActuators();
    this._discoverCameras(config.cameras);
    this._detectGripper();
    this._resolveHomePosition(config.homePosition);

    // Create MuJoCo visualization objects
    this.mjvPerturb = new mj.MjvPerturb();
    this.mjvOption = new mj.MjvOption();
    this.mjvCamera = new mj.MjvCamera();
    this.mjvScene = new mj.MjvScene(this.mjModel, this.maxGeoms);

    // Set up Three.js scene lighting
    this._setupLighting();

    // Reset to home position
    this.reset();
  }

  private _resolveModelXml(config: SimulationConfig): string {
    if (config.modelXml) {
      if (!config.modelXml.includes('<mujoco')) {
        throw new Error('Provided modelXml does not contain a <mujoco> tag');
      }
      return config.modelXml;
    }
    // For file-based models, the XML will need to be fetched/provided externally.
    // In the renderer context, we expect modelXml to be provided directly.
    throw new Error('modelXml is required for browser-based simulation');
  }

  // ── Camera injection (port of custom_mujoco_env.py) ────────────────────

  private _injectCameras(xml: string, cameras: CameraSpec[]): string {
    const nodes: string[] = [];
    for (const cs of cameras) {
      // Skip if camera with same name already exists in XML
      const escaped = cs.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`<camera[^>]*name\\s*=\\s*["']${escaped}["']`).test(xml)) {
        continue;
      }
      const attrs = [`name="${cs.name}"`];
      if (cs.pos) attrs.push(`pos="${cs.pos.join(' ')}"`);
      if (cs.quat) attrs.push(`quat="${cs.quat.join(' ')}"`);
      if (cs.xyaxes) attrs.push(`xyaxes="${cs.xyaxes.join(' ')}"`);
      if (cs.euler) attrs.push(`euler="${cs.euler.join(' ')}"`);
      if (cs.target) attrs.push(`target="${cs.target}"`);
      if (cs.fovy) attrs.push(`fovy="${cs.fovy}"`);
      nodes.push(`    <camera ${attrs.join(' ')}/>`);
    }

    if (nodes.length === 0) return xml;

    // Insert before </worldbody> or </mujoco>
    const wbClose = xml.lastIndexOf('</worldbody>');
    const rootClose = xml.lastIndexOf('</mujoco>');
    const insertAt = wbClose !== -1 ? wbClose : rootClose;
    if (insertAt === -1) return xml;

    return xml.slice(0, insertAt) + '\n' + nodes.join('\n') + '\n' + xml.slice(insertAt);
  }

  // ── Discovery (ports of GenericMujocoEnv) ──────────────────────────────

  private _discoverJoints(): void {
    const mj = this.mujoco;
    const model = this.mjModel;
    this._joints = [];
    this._dofIds = [];

    for (let i = 0; i < model.njnt; i++) {
      const jnt = model.jnt(i);
      // Skip free (0) and ball (1) joints (mjtJoint enum values)
      const jntType = jnt.type;
      if (jntType === 0 || jntType === 1) continue;
      const name = mj.mj_id2name(model, 3 /* mjOBJ_JOINT */, i) || `joint_${i}`;
      this._joints.push({ name, id: i, qposAdr: jnt.qposadr });
      this._dofIds.push(jnt.qposadr);
    }
  }

  private _discoverActuators(): void {
    const mj = this.mujoco;
    const model = this.mjModel;
    this._actuators = [];
    this._ctrlIds = [];

    for (let i = 0; i < model.nu; i++) {
      const name = mj.mj_id2name(model, 2 /* mjOBJ_ACTUATOR */, i) || `actuator_${i}`;
      this._actuators.push({ name, id: i });
      this._ctrlIds.push(i);
    }
  }

  private _discoverCameras(configCameras?: CameraSpec[]): void {
    const mj = this.mujoco;
    const model = this.mjModel;

    // If no cameras configured, auto-detect from model
    if (!this._cameraSpecs.length && model.ncam > 0) {
      for (let i = 0; i < model.ncam; i++) {
        const name = mj.mj_id2name(model, 7 /* mjOBJ_CAMERA */, i) || `cam_${i}`;
        this._cameraSpecs.push({ name, width: 128, height: 128 });
      }
    }

    // Resolve camera IDs
    this._cameraIds = [];
    for (const cs of this._cameraSpecs) {
      const cid = mj.mj_name2id(model, 7 /* mjOBJ_CAMERA */, cs.name);
      this._cameraIds.push(cid >= 0 ? cid : -1);
    }
    if (this._cameraIds.length === 0) {
      this._cameraIds = [-1]; // free camera fallback
    }
  }

  private _detectGripper(): void {
    this._gripperCtrlId = null;
    this._hasGripper = false;
    for (const act of this._actuators) {
      if (/gripper|finger/i.test(act.name)) {
        this._gripperCtrlId = act.id;
        this._hasGripper = true;
        break;
      }
    }
  }

  private _resolveHomePosition(configHome?: number[]): void {
    const numDofs = this._dofIds.length;
    if (configHome && configHome.length > 0) {
      this._homePosition = new Float64Array(configHome.slice(0, numDofs));
    } else if (this.mjModel.nkey > 0) {
      // Use first keyframe qpos mapped to our DOFs
      const keyQpos = this.mjModel.key(0).qpos;
      this._homePosition = new Float64Array(numDofs);
      for (let i = 0; i < numDofs; i++) {
        this._homePosition[i] = keyQpos[this._dofIds[i]];
      }
    } else {
      this._homePosition = new Float64Array(numDofs);
    }
  }

  // ── Three.js setup ─────────────────────────────────────────────────────

  private _setupLighting(): void {
    const pointLight = new THREE.PointLight(0xffffff, 0.4);
    pointLight.position.set(0, 0, 2);
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.set(2048, 2048);
    this.scene.add(pointLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff, 0.2);
    spotLight.position.set(0, 0, 2);
    spotLight.target.position.set(0, 0, 0);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.set(2048, 2048);
    this.scene.add(spotLight);
    this.scene.add(spotLight.target);
  }

  // ── Core simulation methods (ports of gym.Env) ─────────────────────────

  reset(): ObservationData {
    const data = this.mjData;
    // Set home position
    for (let i = 0; i < this._dofIds.length; i++) {
      data.qpos[this._dofIds[i]] = this._homePosition[i];
    }
    // Zero velocities and controls
    for (let i = 0; i < data.qvel.length; i++) data.qvel[i] = 0;
    for (let i = 0; i < data.ctrl.length; i++) data.ctrl[i] = 0;

    this.mujoco.mj_forward(this.mjModel, data);
    this._keyState.clear();
    return this._getObservation();
  }

  step(action?: Float64Array | number[]): ObservationData {
    const data = this.mjData;

    if (action) {
      const act = action instanceof Float64Array ? action : new Float64Array(action);
      for (let i = 0; i < Math.min(act.length, this._ctrlIds.length); i++) {
        data.ctrl[this._ctrlIds[i]] = act[i];
      }
    }

    // Sub-step physics
    for (let s = 0; s < this._nSubsteps; s++) {
      this.mujoco.mj_step(this.mjModel, data);
    }

    return this._getObservation();
  }

  /** Apply keyboard-based control and step. */
  stepWithKeyboard(): ObservationData {
    const action = this._keyboardToAction();
    return this.step(action);
  }

  private _getObservation(): ObservationData {
    const data = this.mjData;
    const qpos = new Float32Array(this._dofIds.length);
    const qvel = new Float32Array(this._dofIds.length);
    for (let i = 0; i < this._dofIds.length; i++) {
      qpos[i] = data.qpos[this._dofIds[i]];
      qvel[i] = data.qvel[this._dofIds[i]] ?? 0;
    }

    const parts: Float32Array[] = [qpos, qvel];
    if (this._hasGripper && this._gripperCtrlId !== null) {
      parts.push(new Float32Array([data.ctrl[this._gripperCtrlId]]));
    }

    const stateLen = parts.reduce((s, p) => s + p.length, 0);
    const state = new Float32Array(stateLen);
    let offset = 0;
    for (const p of parts) {
      state.set(p, offset);
      offset += p.length;
    }

    const obs: ObservationData = { 'observation.state': state };
    return obs;
  }

  /** Get the current robot state as raw joint positions map. */
  getRawJointPositions(): Record<string, number> {
    const result: Record<string, number> = {};
    for (let i = 0; i < this._joints.length; i++) {
      result[`${this._joints[i].name}.pos`] = this.mjData.qpos[this._dofIds[i]];
    }
    return result;
  }

  // ── Keyboard control ───────────────────────────────────────────────────

  handleKeyDown(key: string): void {
    this._keyState.set(key, true);
  }

  handleKeyUp(key: string): void {
    this._keyState.set(key, false);
  }

  /** Convert keyboard state to action vector. */
  private _keyboardToAction(): Float64Array {
    const numCtrl = this._ctrlIds.length || this._dofIds.length;
    const action = new Float64Array(numCtrl);
    const speed = 0.1;

    // Map arrow keys and WASD to first 6 DOFs (typical robot arm)
    const keyMap: [string, number, number][] = [
      ['ArrowUp', 0, speed],
      ['ArrowDown', 0, -speed],
      ['ArrowLeft', 1, speed],
      ['ArrowRight', 1, -speed],
      ['w', 2, speed],
      ['s', 2, -speed],
      ['a', 3, speed],
      ['d', 3, -speed],
      ['q', 4, speed],
      ['e', 4, -speed],
      ['r', 5, speed],
      ['f', 5, -speed],
    ];

    for (const [key, idx, val] of keyMap) {
      if (idx < numCtrl && this._keyState.get(key)) {
        action[idx] += val;
      }
    }

    // Gripper toggle: space or 'g'
    if (this._hasGripper && this._gripperCtrlId !== null) {
      const gripIdx = this._ctrlIds.indexOf(this._gripperCtrlId);
      if (gripIdx >= 0 && gripIdx < numCtrl) {
        if (this._keyState.get(' ') || this._keyState.get('g')) {
          action[gripIdx] = 1.0;
        }
      }
    }

    return action;
  }

  // ── Three.js scene update (from demo_app/app.ts) ──────────────────────

  private _getBufferGeometry(mjvGeom: any): THREE.BufferGeometry {
    const mj = this.mujoco;
    const key = JSON.stringify([mjvGeom.type, mjvGeom.size, mjvGeom.dataid]);
    const found = this.bufferGeometryCache.get(key);
    if (found) return found;

    let geom: THREE.BufferGeometry;
    if (mjvGeom.type === mj.mjtGeom.mjGEOM_PLANE.value) {
      geom = new THREE.PlaneGeometry(
        2 * (mjvGeom.size[0] || 10000),
        2 * (mjvGeom.size[1] || 10000)
      );
      const uv = geom.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) {
        uv.setY(i, 1 - uv.getY(i));
      }
    } else if (mjvGeom.type === mj.mjtGeom.mjGEOM_SPHERE.value) {
      geom = new THREE.SphereGeometry(mjvGeom.size[0]);
    } else if (mjvGeom.type === mj.mjtGeom.mjGEOM_CAPSULE.value) {
      geom = new CapsuleGeometry(mjvGeom.size[0], 2 * mjvGeom.size[2], 32, 16);
      geom.rotateX(0.5 * Math.PI);
    } else if (mjvGeom.type === mj.mjtGeom.mjGEOM_BOX.value) {
      geom = new THREE.BoxGeometry(
        2 * mjvGeom.size[0], 2 * mjvGeom.size[1], 2 * mjvGeom.size[2]
      );
    } else if (mjvGeom.type === mj.mjtGeom.mjGEOM_CYLINDER.value) {
      geom = new THREE.CylinderGeometry(
        mjvGeom.size[0], mjvGeom.size[1], 2 * mjvGeom.size[2], 32
      );
      geom.rotateX(0.5 * Math.PI);
    } else if (mjvGeom.type === mj.mjtGeom.mjGEOM_ELLIPSOID.value) {
      geom = new THREE.SphereGeometry(1);
      geom.scale(mjvGeom.size[0], mjvGeom.size[1], mjvGeom.size[2]);
    } else {
      geom = new THREE.BufferGeometry();
    }

    this.bufferGeometryCache.set(key, geom);
    return geom;
  }

  /** Update the Three.js scene from the current MuJoCo state. */
  updateThreeScene(): void {
    if (!this.mjModel || !this.mjData || !this.mjvScene) return;

    const mj = this.mujoco;

    // Update MuJoCo visualisation scene
    mj.mjv_updateScene(
      this.mjModel, this.mjData, this.mjvOption, this.mjvPerturb,
      this.mjvCamera, mj.mjtCatBit.mjCAT_ALL.value, this.mjvScene
    );

    const geoms = this.mjvScene.geoms;
    for (let i = 0; i < geoms.size(); i++) {
      const mjvGeom = geoms.get(i);

      let mesh: THREE.Mesh;
      if (i < this.meshes.length) {
        mesh = this.meshes[i];
      } else {
        const bufGeom = this._getBufferGeometry(mjvGeom);
        const material = new THREE.MeshPhongMaterial();
        material.color.setRGB(mjvGeom.rgba[0], mjvGeom.rgba[1], mjvGeom.rgba[2]);
        material.opacity = mjvGeom.rgba[3];
        material.transparent = mjvGeom.rgba[3] !== 0;

        mesh = new THREE.Mesh(bufGeom, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.meshes.push(mesh);
        this.scene.add(mesh);
      }

      mesh.matrixAutoUpdate = false;
      mesh.matrix.set(
        mjvGeom.mat[0], mjvGeom.mat[1], mjvGeom.mat[2], mjvGeom.pos[0],
        mjvGeom.mat[3], mjvGeom.mat[4], mjvGeom.mat[5], mjvGeom.pos[1],
        mjvGeom.mat[6], mjvGeom.mat[7], mjvGeom.mat[8], mjvGeom.pos[2],
        0, 0, 0, 1
      );
      mesh.matrixWorldNeedsUpdate = true;

      mjvGeom.delete();
    }
    geoms.delete();

    // Remove excess meshes if geometry count shrinks
    while (this.meshes.length > this.mjvScene.ngeom) {
      const removed = this.meshes.pop()!;
      this.scene.remove(removed);
      removed.geometry.dispose();
      if (Array.isArray(removed.material)) {
        removed.material.forEach(m => m.dispose());
      } else {
        removed.material.dispose();
      }
    }
  }

  // ── Render to offscreen canvas for camera capture ─────────────────────

  /**
   * Render the current Three.js scene from a specific camera to a canvas.
   * Returns an ImageData for dataset recording.
   */
  renderCameraToImageData(
    renderer: THREE.WebGLRenderer,
    cameraIndex: number,
    width: number,
    height: number
  ): ImageData {
    const cam = new THREE.PerspectiveCamera(45, width / height, 0.01, 100);
    cam.up.set(0, 0, 1); // MuJoCo Z-up

    // If we have a MuJoCo camera, use its position/orientation
    if (cameraIndex >= 0 && cameraIndex < this._cameraIds.length) {
      const mjCamId = this._cameraIds[cameraIndex];
      if (mjCamId >= 0) {
        const camData = this.mjData.cam(mjCamId);
        cam.position.set(camData.xpos[0], camData.xpos[1], camData.xpos[2]);
        // MuJoCo camera xmat is a 3x3 rotation matrix stored row-major
        const xmat = camData.xmat;
        const rotMatrix = new THREE.Matrix4().set(
          xmat[0], xmat[1], xmat[2], 0,
          xmat[3], xmat[4], xmat[5], 0,
          xmat[6], xmat[7], xmat[8], 0,
          0, 0, 0, 1
        );
        cam.quaternion.setFromRotationMatrix(rotMatrix);
        // MuJoCo cameras look along -Z in camera frame
        cam.rotateY(Math.PI);
      }
    }

    // Render to offscreen target
    const target = new THREE.WebGLRenderTarget(width, height);
    renderer.setRenderTarget(target);
    renderer.render(this.scene, cam);

    const pixels = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
    renderer.setRenderTarget(null);
    target.dispose();

    // WebGL reads bottom-up; flip vertically
    const flipped = new Uint8ClampedArray(width * height * 4);
    for (let row = 0; row < height; row++) {
      const srcOffset = row * width * 4;
      const dstOffset = (height - 1 - row) * width * 4;
      flipped.set(pixels.subarray(srcOffset, srcOffset + width * 4), dstOffset);
    }

    return new ImageData(flipped, width, height);
  }

  // ── Animation loop ─────────────────────────────────────────────────────

  start(): void {
    if (this._running) return;
    this._running = true;
    this._paused = false;
  }

  pause(): void { this._paused = true; }
  resume(): void { this._paused = false; }

  togglePause(): void {
    this._paused = !this._paused;
  }

  /**
   * Perform a single simulation tick. Called from the React render loop
   * via requestAnimationFrame. Returns the observation data.
   */
  tick(): ObservationData | null {
    if (!this._running || this._paused || this._disposed) return null;
    if (!this.mjModel || !this.mjData) return null;

    try {
      const obs = this.stepWithKeyboard();
      this.updateThreeScene();

      if (this.onStep) {
        const state: SimulationState = {
          qpos: new Float64Array(this.mjData.qpos),
          qvel: new Float64Array(this.mjData.qvel),
          ctrl: new Float64Array(this.mjData.ctrl),
          time: this.mjData.time,
        };
        this.onStep(obs, state);
      }

      return obs;
    } catch (error) {
      if (this.onError) {
        this.onError(error instanceof Error ? error : new Error(String(error)));
      }
      return null;
    }
  }

  // ── Cleanup ────────────────────────────────────────────────────────────

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._running = false;

    if (this._frameId !== null) {
      cancelAnimationFrame(this._frameId);
      this._frameId = null;
    }

    // Dispose Three.js meshes
    for (const mesh of this.meshes) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose());
      } else {
        mesh.material.dispose();
      }
      mesh.geometry.dispose();
    }
    this.meshes = [];
    this.bufferGeometryCache.clear();

    // Dispose Three.js scene children
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    // Dispose MuJoCo C++ objects
    if (this.mjvScene) { try { this.mjvScene.delete(); } catch { /* ok */ } }
    if (this.mjvCamera) { try { this.mjvCamera.delete(); } catch { /* ok */ } }
    if (this.mjvPerturb) { try { this.mjvPerturb.delete(); } catch { /* ok */ } }
    if (this.mjvOption) { try { this.mjvOption.delete(); } catch { /* ok */ } }
    if (this.mjData) { try { this.mjData.delete(); } catch { /* ok */ } }
    if (this.mjModel) { try { this.mjModel.delete(); } catch { /* ok */ } }

    // Unmount FS
    try { (this.mujoco as any).FS.unmount('/working'); } catch { /* ok */ }
  }
}
