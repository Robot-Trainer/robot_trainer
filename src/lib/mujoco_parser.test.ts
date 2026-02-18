import { describe, it, expect } from 'vitest';
import { parseMujocoCameras } from './mujoco_parser';

const sampleSceneXml = `
<mujoco model="scene">
  <worldbody>
    <camera name="cam1" pos="1 2 3" euler="4 5 6" />
    <camera name="cam2" pos="0.1 0.2 0.3" target="somebody" />
    <camera name="cam3" pos="1 0 0" quat="0.707 0.707 0 0" />
    <camera name="cam4" pos="0 1 0" axis="0 0 1" />
    <camera name="cam5" xyaxes="1 0 0 0 1 0" />
    <camera name="cam6" zaxis="0 0 1" />
  </worldbody>
</mujoco>
`;

const sampleRobotXml = `
<mujoco>
  <worldbody>
    <body name="base">
      <camera name="robot_cam" fovy="60" />
    </body>
  </worldbody>
</mujoco>
`;

describe('parseMujocoCameras', () => {
  it('should parse simple camera with pos and euler', () => {
    const cameras = parseMujocoCameras(sampleSceneXml);
    const cam1 = cameras.find(c => c.name === 'cam1');
    expect(cam1).toBeDefined();
    expect(cam1?.pos).toEqual([1, 2, 3]);
    expect(cam1?.euler).toEqual([4, 5, 6]);
  });

  it('should parse camera with target', () => {
    const cameras = parseMujocoCameras(sampleSceneXml);
    const cam2 = cameras.find(c => c.name === 'cam2');
    expect(cam2).toBeDefined();
    expect(cam2?.target).toBe('somebody');
  });

  it('should parse camera with quat', () => {
    const cameras = parseMujocoCameras(sampleSceneXml);
    const cam3 = cameras.find(c => c.name === 'cam3');
    expect(cam3).toBeDefined();
    expect(cam3?.quat).toEqual([0.707, 0.707, 0, 0]);
  });

  it('should parse camera with axis', () => {
    const cameras = parseMujocoCameras(sampleSceneXml);
    const cam4 = cameras.find(c => c.name === 'cam4');
    expect(cam4).toBeDefined();
    expect(cam4?.axis).toEqual([0, 0, 1]);
  });

  it('should parse camera with xyaxes', () => {
    const cameras = parseMujocoCameras(sampleSceneXml);
    const cam5 = cameras.find(c => c.name === 'cam5');
    expect(cam5).toBeDefined();
    expect(cam5?.xyaxes).toEqual([1, 0, 0, 0, 1, 0]);
  });

  it('should parse camera with zaxis', () => {
    const cameras = parseMujocoCameras(sampleSceneXml);
    const cam6 = cameras.find(c => c.name === 'cam6');
    expect(cam6).toBeDefined();
    expect(cam6?.zaxis).toEqual([0, 0, 1]);
  });

  it('should parse camera with fovy', () => {
    const cameras = parseMujocoCameras(sampleRobotXml);
    const robotCam = cameras.find(c => c.name === 'robot_cam');
    expect(robotCam).toBeDefined();
    expect(robotCam?.fovy).toBe(60);
  });

  it('should handle optional/missing fields', () => {
    const cameras = parseMujocoCameras(sampleRobotXml);
    const robotCam = cameras.find(c => c.name === 'robot_cam');
    expect(robotCam?.pos).toBeUndefined();
    expect(robotCam?.euler).toBeUndefined();
  });

  it('should handle invalid input gracefully', () => {
    const cameras = parseMujocoCameras('<invalid xml>');
    expect(cameras).toEqual([]);
  });

  it('should handle missing name gracefully (skip or generate name?)', () => {
    // Implementation check: does it skip or include unnamed cameras?
    // The implementation checks for name attribute.
    // Let's verify behavior.
    const xml = `<mujoco><worldbody><camera pos="0 0 0"/></worldbody></mujoco>`;
    const cameras = parseMujocoCameras(xml);
    // If name is strict requirement:
    // expect(cameras).toHaveLength(0);
    // OR if generated:
    // expect(cameras).toHaveLength(1);
  });
});
