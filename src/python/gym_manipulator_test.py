import pytest
from unittest.mock import MagicMock, patch, AsyncMock
import numpy as np
import gymnasium as gym
import torch
import asyncio

import gym_manipulator as gm
from custom_mujoco_env import CustomMujocoEnvConfig, CameraSpec

class TestRobotEnv:
    @pytest.mark.asyncio
    async def test_robot_env_reset_and_step(self):
        # Mock the robot interface
        mock_robot = MagicMock()
        mock_robot.is_connected = False
        mock_robot.bus.motors = {"motor1": None, "motor2": None}
        mock_robot.cameras = {"cam1": None}
        
        # Mock get_observation
        mock_robot.get_observation.return_value = {
            "motor1.pos": 0.0,
            "motor2.pos": 0.0,
            "cam1": np.zeros((100, 100, 3), dtype=np.uint8)
        }

        # Mock connect
        mock_robot.connect = MagicMock()

        env = gm.RobotEnv(robot=mock_robot, use_gripper=False)
        
        # Check initialization
        assert env._joint_names == ["motor1", "motor2"]
        mock_robot.connect.assert_called_once()
        
        # Test Reset
        obs, info = await env.reset()
        assert "agent_pos" in obs
        assert "pixels" in obs
        assert "cam1" in obs["pixels"]
        assert isinstance(info, dict)

        # Test Step
        action = np.array([0.5, 0.5, 0.0]) 
        obs, reward, terminated, truncated, info = await env.step(action)
        
        assert not terminated
        assert not truncated
        mock_robot.send_action.assert_called()
        args = mock_robot.send_action.call_args[0][0]
        assert args["motor1.pos"] == 0.5
        assert args["motor2.pos"] == 0.5

    def test_robot_env_spaces(self):
        mock_robot = MagicMock()
        mock_robot.is_connected = True
        mock_robot.bus.motors = {"m1": None}
        mock_robot.cameras = {}
        mock_robot.get_observation.return_value = {"m1.pos": 0.0}
        
        # With gripper
        env = gm.RobotEnv(robot=mock_robot, use_gripper=True)
        # Action space: 3 (hardcoded base) + 1 gripper = 4
        assert env.action_space.shape == (4,)
        assert env.observation_space["observation.state"].shape == (1,)

class TestAsyncGymWrapper:
    @pytest.mark.asyncio
    async def test_async_wrapper(self):
        # Create a dummy sync gym env
        class DummyEnv(gym.Env):
            def __init__(self):
                self.observation_space = gym.spaces.Box(0, 1, (1,))
                self.action_space = gym.spaces.Box(0, 1, (1,))
            def reset(self, **kwargs):
                return np.array([0.0]), {}
            def step(self, action):
                return np.array([0.0]), 0.0, False, False, {}
            def get_raw_joint_positions(self):
                return {"j1": 0.5}

        env = DummyEnv()
        async_env = gm.AsyncGymWrapper(env)
        
        obs, info = await async_env.reset()
        assert obs.shape == (1,)
        
        obs, r, t, tr, i = await async_env.step(np.array([0.0]))
        assert r == 0.0
        
        assert async_env.get_raw_joint_positions() == {"j1": 0.5}

class TestMakeRobotEnv:
    def test_make_custom_mujoco_env(self):
        cfg = CustomMujocoEnvConfig(
            model_xml="<mujoco/>", 
            cameras=[CameraSpec(name="test", pos=[0,0,0], euler=[0,0,0])]
        )
        # Manually set name since parser/EnvConfig machinery isn't active in tests
        cfg.name = "custom_mujoco"
        
        xml = """
        <mujoco>
          <worldbody><body/></worldbody>
        </mujoco>
        """
        cfg.model_xml = xml
        
        # Define a dummy class that inherits from gym.Env so isinstance checks pass
        class DummyMujocoEnv(gym.Env):
            def __init__(self, *args, **kwargs):
                self.observation_space = gym.spaces.Dict({})
                self.action_space = gym.spaces.Box(0,1,(1,))
            def step(self, a): return {},0,False,False,{}
            def reset(self, **k): return {}, {}
            def render(self): return []
            def get_raw_joint_positions(self): return {}

        # Patch locally imported GenericMujocoEnv in gym_manipulator to return our dummy
        with patch("gym_manipulator.GenericMujocoEnv", side_effect=DummyMujocoEnv) as MockEnv:
            env, teleop = gm.make_robot_env(cfg)
            MockEnv.assert_called_once()
            
            # Since we patched the class, env is an AsyncGymWrapper wrapping the dummy instance
            assert isinstance(env, gm.AsyncGymWrapper)
            assert isinstance(env.unwrapped, DummyMujocoEnv)
            assert teleop is None
