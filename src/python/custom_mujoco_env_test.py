import pytest
from unittest.mock import MagicMock, patch
import numpy as np
import gymnasium as gym
from custom_mujoco_env import GenericMujocoEnv, CameraSpec

SIMPLE_MJCF = """
<mujoco>
  <worldbody>
    <body name="body" pos="0 0 1">
      <joint type="hinge" name="joint1" axis="0 0 1"/>
      <geom type="capsule" size="0.05 0.2"/>
    </body>
  </worldbody>
  <actuator>
    <motor joint="joint1" name="motor1"/>
  </actuator>
</mujoco>
"""

@pytest.fixture
def mock_mujoco_renderer():
    with patch("mujoco.Renderer") as mock:
        instance = mock.return_value
        # Return a black image (numpy array) — renderer.render() should return an ndarray
        instance.render.return_value = np.zeros((128, 128, 3), dtype=np.uint8)
        # Allow update_scene
        instance.update_scene = MagicMock()
        yield mock

class TestCustomMujocoEnv:
    
    def test_initialization_defaults(self, mock_mujoco_renderer):
        env = GenericMujocoEnv(model_xml=SIMPLE_MJCF)
        
        # Check if environment is initialized
        assert isinstance(env, gym.Env)
        assert len(env._joint_names) == 1
        assert "joint1" in env._joint_names
        assert len(env._camera_ids) == 1 
        assert env._camera_ids[0] == -1 # Default free camera

    def test_camera_injection(self, mock_mujoco_renderer):
        camera_specs = [
            CameraSpec(name="cam1", pos=[1, 1, 1], euler=[0, 0, 0], width=64, height=64)
        ]
        
        env = GenericMujocoEnv(model_xml=SIMPLE_MJCF, cameras=camera_specs)
        
        # Check if camera was injected
        # Note: GenericMujocoEnv assembles XML. We can check if camera is in the model
        assert len(env._camera_ids) == 1
        assert env._camera_ids[0] >= 0 # Should have found the camera ID
        
        # Check observation space
        assert "observation.images.cam1" in env.observation_space.spaces
        obs_shape = env.observation_space.spaces["observation.images.cam1"].shape
        assert obs_shape == (64, 64, 3)

    def test_observation_structure(self, mock_mujoco_renderer):
        env = GenericMujocoEnv(model_xml=SIMPLE_MJCF, image_obs=True)
        obs, _ = env.reset()
        
        assert "observation.state" in obs
        # 1 joint -> qpos(1) + qvel(1) = 2. No gripper.
        assert obs["observation.state"].shape == (2,) 
        assert "observation.images.free" in obs

    def test_step_and_reset(self, mock_mujoco_renderer):
        env = GenericMujocoEnv(model_xml=SIMPLE_MJCF)
        obs, _ = env.reset()
        
        # Action space should correspond to 1 motor
        action = env.action_space.sample()
        assert action.shape == (1,)
        
        obs, reward, terminated, truncated, info = env.step(action)
        
        assert isinstance(obs, dict)
        assert "observation.state" in obs
        assert not terminated
        assert not truncated

    def test_multiple_cameras(self, mock_mujoco_renderer):
        camera_specs = [
            CameraSpec(name="cam1", pos=[1, 0, 0], euler=[0, 0, 0]),
            CameraSpec(name="cam2", pos=[0, 1, 0], euler=[0, 0, 0])
        ]
        env = GenericMujocoEnv(model_xml=SIMPLE_MJCF, cameras=camera_specs)
        
        assert len(env._camera_ids) == 2
        assert env._camera_ids[0] != -1
        assert env._camera_ids[1] != -1
        assert "observation.images.cam1" in env.observation_space.spaces
        assert "observation.images.cam2" in env.observation_space.spaces

    def test_gripper_detection(self, mock_mujoco_renderer):
        # XML with a gripper actuator
        gripper_xml = """
        <mujoco>
          <worldbody>
             <body name="b1" pos="0 0 0"><joint name="j1"/><geom size="0.1"/></body>
             <body name="b2" pos="0 1 0"><joint name="j2"/><geom size="0.1"/></body>
          </worldbody>
          <actuator>
            <motor joint="j1" name="arm_motor"/>
            <motor joint="j2" name="gripper_motor"/>
          </actuator>
        </mujoco>
        """
        env = GenericMujocoEnv(model_xml=gripper_xml)
        assert env._has_gripper is True
        assert env._gripper_ctrl_id == 1  # second actuator
        
        # State dim: 2 joints * 2 (pos, vel) + 1 gripper ctrl = 5
        assert env.observation_space["observation.state"].shape == (5,)

    def test_render(self, mock_mujoco_renderer):
        # We need to manually handle the mock return value for list of frames
        env = GenericMujocoEnv(model_xml=SIMPLE_MJCF, render_mode="rgb_array")
        env.reset()
        frames = env.render()
        assert isinstance(frames, list)
        assert len(frames) == 1 # free camera
        assert frames[0].shape == (128, 128, 3) # default size
