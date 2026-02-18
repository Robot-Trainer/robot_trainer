import { DOMParser as DOMParserImpl } from 'xmldom';

/**
 * Standard MJCF Camera attributes as defined by MuJoCo XML reference.
 * See: https://mujoco.readthedocs.io/en/stable/XMLreference.html#body-camera
 */
export interface MjcfCamera {
  name: string;
  // Positioning
  pos?: [number, number, number];
  quat?: [number, number, number, number];
  axis?: [number, number, number]; // target equivalent to zaxis usually described as 'target' in high level apis but 'target' is body target
  target?: string; // target body name
  xyaxes?: [number, number, number, number, number, number];
  zaxis?: [number, number, number];
  euler?: [number, number, number];

  // Optical properties
  fovy?: number;
  ipd?: number;
  
  // Resolution/Mode usually not in XML body-camera but in visual/global or managed by renderer
  // We can carry them if we find custom attributes or just defaults
}

/**
 * Helper to parse a space-separated string of numbers into an array.
 */
function parseFloats(str: string | null): number[] | undefined {
  if (!str) return undefined;
  // Handle multiple spaces, tabs, newlines
  const parts = str.trim().split(/\s+/);
  const nums = parts.map(p => parseFloat(p));
  if (nums.some(isNaN)) return undefined; 
  return nums;
}

/**
 * Parse an MJCF XML string and extract all camera definitions.
 * Works in both Browser (using native DOMParser) and Node (using xmldom).
 */
export function parseMujocoCameras(xmlContent: string): MjcfCamera[] {
  let doc: Document;

  if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
    const parser = new window.DOMParser();
    doc = parser.parseFromString(xmlContent, "text/xml");
  } else {
    const parser = new DOMParserImpl();
    doc = parser.parseFromString(xmlContent, "text/xml");
  }

  const cameras: MjcfCamera[] = [];
  
  // Queries all <camera> tags. 
  // Note: MJCF structure usually nests cameras in <worldbody> or other bodies. 
  // getElementsByTagName returns all descendants which is what we want.
  const camNodes = doc.getElementsByTagName('camera');

  for (let i = 0; i < camNodes.length; i++) {
    const node = camNodes[i];
    const name = node.getAttribute('name');
    if (!name) continue; // Skip unnamed cameras as they are harder to reference

    const cam: MjcfCamera = { name };

    const posStr = node.getAttribute('pos');
    if (posStr) {
      const vals = parseFloats(posStr);
      if (vals && vals.length === 3) cam.pos = vals as [number, number, number];
    }

    const quatStr = node.getAttribute('quat');
    if (quatStr) {
      const vals = parseFloats(quatStr);
      if (vals && vals.length === 4) cam.quat = vals as [number, number, number, number];
    }

    const axisStr = node.getAttribute('axis'); // deprecated in favor of zaxis/target? or synonym?
    if (axisStr) {
      const vals = parseFloats(axisStr);
      if (vals && vals.length === 3) cam.axis = vals as [number, number, number];
    }
    
    // 'target' attribute in MJCF camera usually refers to a target body name to look at
    const targetStr = node.getAttribute('target');
    if (targetStr) {
      cam.target = targetStr;
    }

    const xyaxesStr = node.getAttribute('xyaxes');
    if (xyaxesStr) {
        const vals = parseFloats(xyaxesStr);
        if (vals && vals.length === 6) cam.xyaxes = vals as [number, number, number, number, number, number];
    }

    const zaxisStr = node.getAttribute('zaxis');
    if (zaxisStr) {
        const vals = parseFloats(zaxisStr);
        if (vals && vals.length === 3) cam.zaxis = vals as [number, number, number];
    }

    const eulerStr = node.getAttribute('euler');
    if (eulerStr) {
        const vals = parseFloats(eulerStr);
        if (vals && vals.length === 3) cam.euler = vals as [number, number, number];
    }
    
    const fovyStr = node.getAttribute('fovy');
    if(fovyStr) {
        const val = parseFloat(fovyStr);
        if(!isNaN(val)) cam.fovy = val;
    }

    cameras.push(cam);
  }

  return cameras;
}
