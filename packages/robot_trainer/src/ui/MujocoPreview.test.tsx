import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];
  observeCalls = 0;
  disconnectCalls = 0;
  constructor(public callback: ResizeObserverCallback) {
    MockResizeObserver.instances.push(this);
  }
  observe(): void {
    this.observeCalls += 1;
  }
  disconnect(): void {
    this.disconnectCalls += 1;
  }
}

vi.mock("three", () => {
  class Vector3 {
    constructor(
      public x = 0,
      public y = 0,
      public z = 0,
    ) {}
    set(x: number, y: number, z: number): this {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    add(v: Vector3): this {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
    }
    copy(v: Vector3): this {
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
      return this;
    }
    normalize(): this {
      const len = Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2) || 1;
      this.x /= len;
      this.y /= len;
      this.z /= len;
      return this;
    }
  }

  class Quaternion {
    constructor(
      public x = 0,
      public y = 0,
      public z = 0,
      public w = 1,
    ) {}
    set(x: number, y: number, z: number, w: number): this {
      this.x = x;
      this.y = y;
      this.z = z;
      this.w = w;
      return this;
    }
    copy(q: Quaternion): this {
      this.x = q.x;
      this.y = q.y;
      this.z = q.z;
      this.w = q.w;
      return this;
    }
    premultiply(_: Quaternion): this {
      return this;
    }
    setFromUnitVectors(_: Vector3, __: Vector3): this {
      return this.set(0, 0, 0, 1);
    }
  }

  class Object3D {
    position = new Vector3();
    quaternion = new Quaternion();
    rotation = { x: 0, y: 0, z: 0 };
    userData: Record<string, unknown> = {};
    children: Object3D[] = [];
    traverse(cb: (child: Object3D) => void): void {
      cb(this);
      this.children.forEach((child) => child.traverse(cb));
    }
  }

  const state = {
    sceneAdds: [] as Object3D[],
    sceneRemoves: [] as Object3D[],
    renderers: [] as Array<{
      setSizeCalls: Array<[number, number]>;
      disposeCalls: number;
      domElement: HTMLCanvasElement;
    }>,
  };

  class Scene extends Object3D {
    add(obj: Object3D): void {
      this.children.push(obj);
      state.sceneAdds.push(obj);
    }
    remove(obj: Object3D): void {
      this.children = this.children.filter((c) => c !== obj);
      state.sceneRemoves.push(obj);
    }
  }

  class BaseGeometry {
    disposeCalls = 0;
    rotateX(_: number): void {}
    scale(_: number, __: number, ___: number): void {}
    dispose(): void {
      this.disposeCalls += 1;
    }
  }
  class PlaneGeometry extends BaseGeometry {}
  class SphereGeometry extends BaseGeometry {}
  class BoxGeometry extends BaseGeometry {}
  class CylinderGeometry extends BaseGeometry {}
  class CapsuleGeometry extends BaseGeometry {}

  class Material {
    disposeCalls = 0;
    dispose(): void {
      this.disposeCalls += 1;
    }
  }
  class MeshPhongMaterial extends Material {
    constructor(public options: Record<string, unknown>) {
      super();
    }
  }

  class Mesh extends Object3D {
    castShadow = false;
    receiveShadow = false;
    constructor(
      public geometry: BaseGeometry,
      public material: Material | Material[],
    ) {
      super();
    }
  }

  class PerspectiveCamera extends Object3D {
    aspect = 1;
    up = new Vector3(0, 1, 0);
    updateProjectionMatrix(): void {}
  }

  class WebGLRenderer {
    domElement: HTMLCanvasElement;
    shadowMap = { enabled: false, type: null as unknown };
    setPixelRatio(_: number): void {}
    setClearColor(_: number, __: number): void {}
    setSize(w: number, h: number): void {
      state.renderers[state.renderers.length - 1].setSizeCalls.push([w, h]);
    }
    render(_: unknown, __: unknown): void {}
    dispose(): void {
      state.renderers[state.renderers.length - 1].disposeCalls += 1;
    }
    constructor() {
      this.domElement = document.createElement("canvas");
      state.renderers.push({
        setSizeCalls: [],
        disposeCalls: 0,
        domElement: this.domElement,
      });
    }
  }

  class AmbientLight extends Object3D {}
  class DirectionalLight extends Object3D {
    castShadow = false;
  }
  class PointLight extends Object3D {}
  class GridHelper extends Object3D {}

  class Box3 {
    private objects: Object3D[] = [];
    expandByObject(obj: Object3D): this {
      this.objects.push(obj);
      return this;
    }
    isEmpty(): boolean {
      return this.objects.length === 0;
    }
    getCenter(target: Vector3): Vector3 {
      if (this.objects.length === 0) return target.set(0, 0, 0);
      const totals = this.objects.reduce(
        (acc, obj) =>
          new Vector3(
            acc.x + obj.position.x,
            acc.y + obj.position.y,
            acc.z + obj.position.z,
          ),
        new Vector3(0, 0, 0),
      );
      return target.set(
        totals.x / this.objects.length,
        totals.y / this.objects.length,
        totals.z / this.objects.length,
      );
    }
    getSize(target: Vector3): Vector3 {
      return target.set(1, 1, 1);
    }
  }

  class Color {
    constructor(
      public r: number,
      public g: number,
      public b: number,
    ) {}
  }

  return {
    __mockState: state,
    Vector3,
    Quaternion,
    Object3D,
    Scene,
    Mesh,
    PerspectiveCamera,
    WebGLRenderer,
    AmbientLight,
    DirectionalLight,
    PointLight,
    GridHelper,
    PlaneGeometry,
    SphereGeometry,
    BoxGeometry,
    CylinderGeometry,
    CapsuleGeometry,
    MeshPhongMaterial,
    Material,
    Color,
    Box3,
    PCFSoftShadowMap: "PCFSoftShadowMap",
    DoubleSide: "DoubleSide",
    FrontSide: "FrontSide",
  };
});

vi.mock("three/examples/jsm/controls/OrbitControls.js", () => {
  const state = {
    instances: [] as Array<{ updateCalls: number; disposeCalls: number }>,
  };

  class TargetVector {
    x = 0;
    y = 0;
    z = 0;
    set(x: number, y: number, z: number): this {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    copy(v: TargetVector): this {
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
      return this;
    }
  }

  class OrbitControls {
    enableDamping = false;
    dampingFactor = 0;
    target = new TargetVector();
    private index: number;
    constructor(_: unknown, __: unknown) {
      state.instances.push({ updateCalls: 0, disposeCalls: 0 });
      this.index = state.instances.length - 1;
    }
    update(): void {
      state.instances[this.index].updateCalls += 1;
    }
    dispose(): void {
      state.instances[this.index].disposeCalls += 1;
    }
  }

  return { OrbitControls, __mockState: state };
});

import * as THREE from "three";
import * as Controls from "three/examples/jsm/controls/OrbitControls.js";
import { MujocoPreview } from "./MujocoPreview";

describe("MujocoPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (
      THREE as unknown as {
        __mockState: {
          sceneAdds: unknown[];
          sceneRemoves: unknown[];
          renderers: unknown[];
        };
      }
    ).__mockState.sceneAdds = [];
    (
      THREE as unknown as {
        __mockState: {
          sceneAdds: unknown[];
          sceneRemoves: unknown[];
          renderers: unknown[];
        };
      }
    ).__mockState.sceneRemoves = [];
    (
      THREE as unknown as {
        __mockState: {
          sceneAdds: unknown[];
          sceneRemoves: unknown[];
          renderers: unknown[];
        };
      }
    ).__mockState.renderers = [];
    (
      Controls as unknown as { __mockState: { instances: unknown[] } }
    ).__mockState.instances = [];
    MockResizeObserver.instances = [];

    (
      globalThis as unknown as { ResizeObserver: typeof ResizeObserver }
    ).ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 77);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(
      () => undefined,
    );

    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 640,
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get: () => 360,
    });
  });

  it("renders supported geoms and triggers success callback", () => {
    const onSuccess = vi.fn();
    const xml = `
      <mujoco>
        <geom type="plane" size="1 2" />
        <geom type="sphere" size="0.2" pos="1 2 3" />
        <geom type="box" size="0.2 0.3 0.4" quat="1 0 0 0" />
        <geom type="cylinder" size="0.1 0.5" />
        <geom type="capsule" size="0.1 0.2" fromto="0 0 0 0 0 2" />
        <geom type="ellipsoid" size="0.1 0.2 0.3" zaxis="0 1 0" />
        <geom type="unsupported" />
      </mujoco>
    `;

    render(<MujocoPreview xml={xml} onSuccess={onSuccess} />);

    const state = (
      THREE as unknown as {
        __mockState: {
          sceneAdds: Array<{ constructor: { name: string } }>;
          renderers: Array<{ setSizeCalls: Array<[number, number]> }>;
        };
      }
    ).__mockState;
    const meshAdds = state.sceneAdds.filter(
      (obj) => obj.constructor.name === "Mesh",
    );
    expect(meshAdds).toHaveLength(6);
    expect(state.renderers[0].setSizeCalls).toContainEqual([640, 360]);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("applies body position offsets to nested geoms", () => {
    const xml = `
      <mujoco>
        <body pos="1 2 3" quat="1 0 0 0">
          <geom name="g1" type="sphere" pos="0.5 0.5 0.5" />
        </body>
      </mujoco>
    `;

    render(<MujocoPreview xml={xml} />);

    const state = (
      THREE as unknown as {
        __mockState: {
          sceneAdds: Array<{
            constructor: { name: string };
            position: { x: number; y: number; z: number };
          }>;
        };
      }
    ).__mockState;
    const mesh = state.sceneAdds.find((obj) => obj.constructor.name === "Mesh");
    expect(mesh?.position).toEqual({ x: 1.5, y: 2.5, z: 3.5 });
  });

  it("calls onError for malformed xml and missing mujoco root", () => {
    const onError = vi.fn();
    const { rerender } = render(
      <MujocoPreview xml="<mujoco><geom></mujoco>" onError={onError} />,
    );
    expect(onError).toHaveBeenCalledTimes(1);

    rerender(<MujocoPreview xml="<root/>" onError={onError} />);
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError.mock.calls[1][0]).toContain(
      "No <mujoco> root element found",
    );
  });

  it("clears previous meshes on xml changes and ignores empty xml", () => {
    const onSuccess = vi.fn();
    const { rerender } = render(
      <MujocoPreview
        xml="<mujoco><geom type='sphere' /></mujoco>"
        onSuccess={onSuccess}
      />,
    );

    rerender(
      <MujocoPreview
        xml="<mujoco><geom type='box' /></mujoco>"
        onSuccess={onSuccess}
      />,
    );
    rerender(<MujocoPreview xml="  " onSuccess={onSuccess} />);

    const state = (
      THREE as unknown as { __mockState: { sceneRemoves: unknown[] } }
    ).__mockState;
    expect(state.sceneRemoves.length).toBeGreaterThan(0);
    expect(onSuccess).toHaveBeenCalledTimes(2);
  });

  it("cleans up observers, renderer, controls, animation, and canvas on unmount", () => {
    const { unmount, container } = render(
      <MujocoPreview xml="<mujoco><geom type='sphere' /></mujoco>" />,
    );
    expect(container.querySelector("canvas")).toBeTruthy();

    unmount();

    const threeState = (
      THREE as unknown as {
        __mockState: { renderers: Array<{ disposeCalls: number }> };
      }
    ).__mockState;
    const controlsState = (
      Controls as unknown as {
        __mockState: { instances: Array<{ disposeCalls: number }> };
      }
    ).__mockState;
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(77);
    expect(threeState.renderers[0].disposeCalls).toBe(1);
    expect(controlsState.instances[0].disposeCalls).toBe(1);
    expect(MockResizeObserver.instances[0].disconnectCalls).toBe(1);
    expect(container.querySelector("canvas")).toBeNull();
  });
});
