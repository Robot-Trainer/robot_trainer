# !/usr/bin/env python

# Copyright 2025 The HuggingFace Inc. team. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Note, this script was modified from its original version to allow the use of a custom environment and processor pipeline.

import logging
import time
import socket
import json
import traceback
import sys
import os
import ctypes.util
import shutil
from pathlib import Path
from dataclasses import dataclass
from typing import Any

# Detect if hardware acceleration is available (EGL) or not (OSMesa)
if ctypes.util.find_library("EGL"):
    os.environ["MUJOCO_GL"] = "egl"
else:
    os.environ["MUJOCO_GL"] = "osmesa"

import gymnasium as gym
import numpy as np
import torch
import mujoco
import re
import tempfile
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from typing import Any

from lerobot.cameras import opencv  # noqa: F401
from lerobot.configs import parser
from lerobot.datasets.lerobot_dataset import LeRobotDataset
from lerobot.envs.configs import EnvConfig, HILSerlRobotEnvConfig
from lerobot.model.kinematics import RobotKinematics
from lerobot.processor import (
    AddBatchDimensionProcessorStep,
    AddTeleopActionAsComplimentaryDataStep,
    AddTeleopEventsAsInfoStep,
    DataProcessorPipeline,
    DeviceProcessorStep,
    EnvTransition,
    GripperPenaltyProcessorStep,
    ImageCropResizeProcessorStep,
    InterventionActionProcessorStep,
    MapDeltaActionToRobotActionStep,
    MapTensorToDeltaActionDictStep,
    Numpy2TorchActionProcessorStep,
    RewardClassifierProcessorStep,
    RobotActionToPolicyActionProcessorStep,
    RobotObservation,
    TimeLimitProcessorStep,
    Torch2NumpyActionProcessorStep,
    TransitionKey,
    VanillaObservationProcessorStep,
    create_transition,
)
from lerobot.processor.converters import identity_transition
from lerobot.robots import (  # noqa: F401
    RobotConfig,
    make_robot_from_config,
    so_follower,
)
from lerobot.robots.robot import Robot
from lerobot.robots.so_follower.robot_kinematic_processor import (
    EEBoundsAndSafety,
    EEReferenceAndDelta,
    ForwardKinematicsJointsToEEObservation,
    GripperVelocityToJoint,
    InverseKinematicsRLStep,
)
from lerobot.teleoperators import (
    gamepad,  # noqa: F401
    keyboard,  # noqa: F401
    make_teleoperator_from_config,
    so_leader,  # noqa: F401
)
from lerobot.teleoperators.teleoperator import Teleoperator
from lerobot.teleoperators.utils import TeleopEvents
from lerobot.teleoperators.keyboard.configuration_keyboard import KeyboardTeleopConfig
from lerobot.teleoperators.gamepad.configuration_gamepad import GamepadTeleopConfig
from lerobot.utils.constants import ACTION, DONE, OBS_IMAGES, OBS_STATE, REWARD
from lerobot.utils.robot_utils import precise_sleep
from lerobot.utils.utils import log_say

from lerobot.rl.joint_observations_processor import JointVelocityProcessorStep, MotorCurrentProcessorStep

import socketio
import asyncio
from aiohttp import web
import base64
import cv2


# ---------------------------------------------------------------------------
# Custom MuJoCo environment for user-uploaded MJCF / URDF models
# ---------------------------------------------------------------------------

from custom_mujoco_env import (
    CameraSpec,
    CustomMujocoProcessorConfig,
    CustomMujocoEnvConfig,
    GenericMujocoEnv,
)


# ---------------------------------------------------------------------------
# Socket.IO server setup
# ---------------------------------------------------------------------------

# Initialize the Socket.IO server
sio = socketio.AsyncServer(async_mode='aiohttp', cors_allowed_origins='*')
app = web.Application()
sio.attach(app)

@sio.event
def connect(sid, environ):
    logging.info(f"Client connected: {sid}")

@sio.event
def disconnect(sid):
    logging.info(f"Client disconnected: {sid}")

logging.basicConfig(level=logging.INFO)

@dataclass
class DatasetConfig:
    """Configuration for dataset creation and management."""

    repo_id: str
    task: str
    root: str | None = None
    num_episodes_to_record: int = 5
    replay_episode: int | None = None
    push_to_hub: bool = False


@dataclass
class GymManipulatorConfig:
    """Main configuration for gym manipulator environment."""

    env: EnvConfig
    dataset: DatasetConfig
    mode: str | None = None  # Either "record", "replay", None
    device: str = "cpu"


async def reset_follower_position(robot_arm: Robot, target_position: np.ndarray) -> None:
    """Reset robot arm to target position using smooth trajectory."""
    current_position_dict = robot_arm.bus.sync_read("Present_Position")
    current_position = np.array(
        [current_position_dict[name] for name in current_position_dict], dtype=np.float32
    )
    trajectory = torch.from_numpy(
        np.linspace(current_position, target_position, 50)
    )  # NOTE: 30 is just an arbitrary number
    for pose in trajectory:
        action_dict = dict(zip(current_position_dict, pose, strict=False))
        robot_arm.bus.sync_write("Goal_Position", action_dict)
        await asyncio.sleep(0.015)


class RobotEnv(gym.Env):
    """Gym environment for robotic control with human intervention support."""

    def __init__(
        self,
        robot,
        use_gripper: bool = False,
        display_cameras: bool = False,
        reset_pose: list[float] | None = None,
        reset_time_s: float = 5.0,
    ) -> None:
        """Initialize robot environment with configuration options.

        Args:
            robot: Robot interface for hardware communication.
            use_gripper: Whether to include gripper in action space.
            display_cameras: Whether to show camera feeds during execution.
            reset_pose: Joint positions for environment reset.
            reset_time_s: Time to wait during reset.
        """
        super().__init__()

        self.robot = robot
        self.display_cameras = display_cameras

        # Connect to the robot if not already connected.
        if not self.robot.is_connected:
            self.robot.connect()

        # Episode tracking.
        self.current_step = 0
        self.episode_data = None

        self._joint_names = [f"{key}.pos" for key in self.robot.bus.motors]
        self._image_keys = self.robot.cameras.keys()

        self.reset_pose = reset_pose
        self.reset_time_s = reset_time_s

        self.use_gripper = use_gripper

        self._joint_names = list(self.robot.bus.motors.keys())
        self._raw_joint_positions = None

        self._setup_spaces()

    def _get_observation(self) -> RobotObservation:
        """Get current robot observation including joint positions and camera images."""
        obs_dict = self.robot.get_observation()
        raw_joint_joint_position = {f"{name}.pos": obs_dict[f"{name}.pos"] for name in self._joint_names}
        joint_positions = np.array([raw_joint_joint_position[f"{name}.pos"] for name in self._joint_names])

        images = {key: obs_dict[key] for key in self._image_keys}

        return {"agent_pos": joint_positions, "pixels": images, **raw_joint_joint_position}

    def _setup_spaces(self) -> None:
        """Configure observation and action spaces based on robot capabilities."""
        current_observation = self._get_observation()

        observation_spaces = {}

        # Define observation spaces for images and other states.
        if current_observation is not None and "pixels" in current_observation:
            prefix = OBS_IMAGES
            observation_spaces = {
                f"{prefix}.{key}": gym.spaces.Box(
                    low=0, high=255, shape=current_observation["pixels"][key].shape, dtype=np.uint8
                )
                for key in current_observation["pixels"]
            }

        if current_observation is not None:
            agent_pos = current_observation["agent_pos"]
            observation_spaces[OBS_STATE] = gym.spaces.Box(
                low=0,
                high=10,
                shape=agent_pos.shape,
                dtype=np.float32,
            )

        self.observation_space = gym.spaces.Dict(observation_spaces)

        # Define the action space for joint positions along with setting an intervention flag.
        action_dim = 3
        bounds = {}
        bounds["min"] = -np.ones(action_dim)
        bounds["max"] = np.ones(action_dim)

        if self.use_gripper:
            action_dim += 1
            bounds["min"] = np.concatenate([bounds["min"], [0]])
            bounds["max"] = np.concatenate([bounds["max"], [2]])

        self.action_space = gym.spaces.Box(
            low=bounds["min"],
            high=bounds["max"],
            shape=(action_dim,),
            dtype=np.float32,
        )

    async def reset(
        self, *, seed: int | None = None, options: dict[str, Any] | None = None
    ) -> tuple[RobotObservation, dict[str, Any]]:
        """Reset environment to initial state.

        Args:
            seed: Random seed for reproducibility.
            options: Additional reset options.

        Returns:
            Tuple of (observation, info) dictionaries.
        """
        # Reset the robot
        # self.robot.reset()
        start_time = time.perf_counter()
        if self.reset_pose is not None:
            log_say("Reset the environment.", play_sounds=True)
            await reset_follower_position(self.robot, np.array(self.reset_pose))
            log_say("Reset the environment done.", play_sounds=True)

        await asyncio.sleep(max(self.reset_time_s - (time.perf_counter() - start_time), 0.0))

        # super().reset() works fine even if parent is sync as long as we don't await non-awaitables.
        # gym.Env.reset usually just sets np_random.
        super().reset(seed=seed, options=options)

        # Reset episode tracking variables.
        self.current_step = 0
        self.episode_data = None
        obs = self._get_observation()
        self._raw_joint_positions = {f"{key}.pos": obs[f"{key}.pos"] for key in self._joint_names}
        return obs, {TeleopEvents.IS_INTERVENTION: False}

    async def step(self, action) -> tuple[RobotObservation, float, bool, bool, dict[str, Any]]:
        """Execute one environment step with given action."""
        logging.info(f"Received action: {action}")
        joint_targets_dict = {f"{key}.pos": action[i] for i, key in enumerate(self.robot.bus.motors.keys())}

        self.robot.send_action(joint_targets_dict)

        obs = self._get_observation()

        self._raw_joint_positions = {f"{key}.pos": obs[f"{key}.pos"] for key in self._joint_names}

        if self.display_cameras:
            await self.render()

        self.current_step += 1

        reward = 0.0
        terminated = False
        truncated = False

        return (
            obs,
            reward,
            terminated,
            truncated,
            {TeleopEvents.IS_INTERVENTION: False},
        )

    async def render(self) -> None:
        """Display robot camera feeds via Socket.IO."""
        current_observation = self._get_observation()
        logging.info("Rendering camera feeds...")
        logging.info(f"Current observation keys: {list(current_observation.keys())}")
        if current_observation is not None:
            image_keys = [key for key in current_observation if "image" in key]

            for key in image_keys:
                frame_bgr = cv2.cvtColor(current_observation[key].numpy(), cv2.COLOR_RGB2BGR)
                _, buffer = cv2.imencode('.jpg', frame_bgr)
                jpg_as_text = base64.b64encode(buffer).decode('utf-8')
                
                # Emit the frame
                await sio.emit('video_frame', {'image': jpg_as_text, 'camera_name': key})
            
            # Yield to asyncio loop
            await sio.sleep(0)

    def close(self) -> None:
        """Close environment and disconnect robot."""
        if self.robot.is_connected:
            self.robot.disconnect()

    def get_raw_joint_positions(self) -> dict[str, float]:
        """Get raw joint positions."""
        return self._raw_joint_positions


class AsyncGymWrapper(gym.Wrapper):
    """Wrapper that makes standard gym environments comply with async interface used in this script."""

    def __init__(self, env: gym.Env):
        super().__init__(env)

    async def reset(self, **kwargs):
        return self.env.reset(**kwargs)

    async def step(self, action):
        return self.env.step(action)

    def get_raw_joint_positions(self) -> dict[str, float]:
        if hasattr(self.unwrapped, "get_raw_joint_positions"):
            return self.unwrapped.get_raw_joint_positions()
        return {}


def _get_action_space_dim(env: gym.Env) -> int:
    if hasattr(env, "action_space") and hasattr(env.action_space, "shape") and env.action_space.shape is not None:
        return int(env.action_space.shape[0])
    if (
        hasattr(env, "unwrapped")
        and hasattr(env.unwrapped, "action_space")
        and hasattr(env.unwrapped.action_space, "shape")
        and env.unwrapped.action_space.shape is not None
    ):
        return int(env.unwrapped.action_space.shape[0])
    return 0


def _custom_mujoco_action_features(env: gym.Env) -> dict[str, Any]:
    action_dim = _get_action_space_dim(env)
    if action_dim <= 0:
        return {
            "dtype": "float32",
            "shape": (0,),
            "names": {},
        }

    unwrapped = env.unwrapped if hasattr(env, "unwrapped") else env
    actuator_names = list(getattr(unwrapped, "_actuator_names", []) or [])
    joint_names = list(getattr(unwrapped, "_joint_names", []) or [])

    if actuator_names and len(actuator_names) == action_dim:
        names = {name: idx for idx, name in enumerate(actuator_names)}
    elif joint_names and len(joint_names) == action_dim:
        names = {name: idx for idx, name in enumerate(joint_names)}
    else:
        names = {f"actuator_{idx}": idx for idx in range(action_dim)}

    return {
        "dtype": "float32",
        "shape": (action_dim,),
        "names": names,
    }


def _fit_action_to_env_space(action: Any, env: gym.Env) -> np.ndarray:
    target_dim = _get_action_space_dim(env)
    if target_dim <= 0:
        return np.asarray(action, dtype=np.float32).reshape(-1)

    action_np = np.asarray(action, dtype=np.float32).reshape(-1)
    if action_np.shape[0] == target_dim:
        return action_np

    out = np.zeros(target_dim, dtype=np.float32)
    count = min(action_np.shape[0], target_dim)
    out[:count] = action_np[:count]

    unwrapped = env.unwrapped if hasattr(env, "unwrapped") else env
    if action_np.shape[0] >= 4 and target_dim > 4:
        gripper_ctrl_id = getattr(unwrapped, "_gripper_ctrl_id", None)
        ctrl_ids = getattr(unwrapped, "_ctrl_ids", None)
        if gripper_ctrl_id is not None and ctrl_ids is not None:
            try:
                ctrl_ids_list = list(ctrl_ids)
                if gripper_ctrl_id in ctrl_ids_list:
                    gripper_idx = ctrl_ids_list.index(gripper_ctrl_id)
                    out[gripper_idx] = action_np[3]
            except Exception:
                pass

    return out


def _remove_batch_dim(value: Any) -> Any:
    if isinstance(value, torch.Tensor):
        if value.dim() > 0 and value.shape[0] == 1:
            return value.squeeze(0)
        return value
    if isinstance(value, np.ndarray):
        if value.ndim > 0 and value.shape[0] == 1:
            return value[0]
        return value
    return value


def _to_torch_cpu_float32(value: Any) -> torch.Tensor:
    if isinstance(value, torch.Tensor):
        return value.detach().to(dtype=torch.float32).cpu()
    return torch.as_tensor(value, dtype=torch.float32).cpu()


def _to_torch_cpu(value: Any) -> torch.Tensor:
    if isinstance(value, torch.Tensor):
        return value.detach().cpu()
    return torch.as_tensor(value).cpu()


def _features_compatible(existing: dict[str, Any], desired: dict[str, Any]) -> tuple[bool, str]:
    existing_keys = set(existing.keys())
    desired_keys = set(desired.keys())

    missing_keys = desired_keys - existing_keys
    extra_keys = existing_keys - desired_keys
    if missing_keys or extra_keys:
        return (
            False,
            f"feature keys mismatch (missing={sorted(missing_keys)}, extra={sorted(extra_keys)})",
        )

    for key in desired_keys:
        existing_spec = existing.get(key, {})
        desired_spec = desired.get(key, {})
        if existing_spec.get("dtype") != desired_spec.get("dtype"):
            return (
                False,
                f"feature '{key}' dtype mismatch (existing={existing_spec.get('dtype')}, desired={desired_spec.get('dtype')})",
            )
        if tuple(existing_spec.get("shape", ())) != tuple(desired_spec.get("shape", ())):
            return (
                False,
                f"feature '{key}' shape mismatch (existing={existing_spec.get('shape')}, desired={desired_spec.get('shape')})",
            )

    return True, ""


def _sanitize_dataset_name(repo_id: str) -> str:
    name = repo_id.split("/")[-1].strip()
    if not name:
        name = "dataset"
    name = re.sub(r"[^A-Za-z0-9._-]+", "-", name)
    name = name.strip("-._")
    return name or "dataset"


def _default_app_user_data_dir() -> Path:
    home = Path.home()
    if sys.platform == "darwin":
        return home / "Library" / "Application Support" / "robot_trainer"
    if sys.platform.startswith("win"):
        appdata = os.environ.get("APPDATA")
        if appdata:
            return Path(appdata) / "robot_trainer"
        return home / "AppData" / "Roaming" / "robot_trainer"
    return home / ".config" / "robot_trainer"


def _resolve_local_dataset_storage(cfg: GymManipulatorConfig) -> tuple[str, str, Path]:
    explicit_dataset_dir = (cfg.dataset.root or "").strip() if cfg.dataset.root is not None else ""
    if explicit_dataset_dir:
        dataset_dir = Path(explicit_dataset_dir).expanduser().resolve()
        dataset_name = _sanitize_dataset_name(dataset_dir.name or cfg.dataset.repo_id)
        datasets_root = dataset_dir.parent
        dataset_dir = datasets_root / dataset_name
    else:
        dataset_name = _sanitize_dataset_name(cfg.dataset.repo_id)
        user_data_dir = _default_app_user_data_dir()
        datasets_root = user_data_dir / "datasets"
        dataset_dir = datasets_root / dataset_name

    datasets_root.mkdir(parents=True, exist_ok=True)

    cfg.dataset.repo_id = dataset_name
    cfg.dataset.root = str(dataset_dir)

    return dataset_name, str(dataset_dir), dataset_dir


def _has_valid_local_dataset(dataset_dir: Path) -> bool:
    required_files = [
        dataset_dir / "meta" / "info.json",
        dataset_dir / "meta" / "tasks.parquet",
        dataset_dir / "meta" / "stats.json",
    ]
    return all(path.exists() for path in required_files)


def _init_record_dataset(cfg: GymManipulatorConfig, features: dict[str, Any]) -> LeRobotDataset:
    local_repo_id, local_root, dataset_dir = _resolve_local_dataset_storage(cfg)

    if dataset_dir.exists() and not _has_valid_local_dataset(dataset_dir):
        logging.warning("Found incomplete local dataset at %s, recreating it.", dataset_dir)
        shutil.rmtree(dataset_dir, ignore_errors=True)

    if _has_valid_local_dataset(dataset_dir):
        dataset = LeRobotDataset(
            local_repo_id,
            root=local_root,
            download_videos=False,
        )
        compatible, reason = _features_compatible(dataset.features, features)
        if not compatible:
            raise ValueError(
                "Existing dataset schema is incompatible with current recording schema: "
                f"{reason}. Please choose a different dataset name or clear the existing dataset folder."
            )
        dataset.start_image_writer(num_processes=0, num_threads=4)
        logging.info(
            "Appending to local dataset '%s' at %s (episodes=%s, frames=%s)",
            local_repo_id,
            dataset_dir,
            dataset.num_episodes,
            dataset.num_frames,
        )
        return dataset

    logging.info("Creating local dataset '%s' at %s", local_repo_id, dataset_dir)
    return LeRobotDataset.create(
        local_repo_id,
        cfg.env.fps,
        root=local_root,
        use_videos=True,
        image_writer_threads=4,
        image_writer_processes=0,
        features=features,
    )


def make_robot_env(cfg: EnvConfig) -> tuple[gym.Env, Any]:
    """Create robot environment from configuration.

    Args:
        cfg: Environment configuration.

    Returns:
        Tuple of (gym environment, teleoperator device).
    """
    # Check if this is a custom MuJoCo environment
    if cfg.type == "custom_mujoco":
        assert isinstance(cfg, CustomMujocoEnvConfig)
        
        camera_specs = []
        if cfg.cameras:
            for i, c in enumerate(cfg.cameras):
                # Helper to get attribute or dict item
                def get_val(obj, key, default=None):
                    if isinstance(obj, dict):
                        return obj.get(key, default)
                    return getattr(obj, key, default)

                camera_specs.append(
                    CameraSpec(
                        name=get_val(c, "name", f"cam_{i}"),
                        pos=get_val(c, "pos", None),
                        quat=get_val(c, "quat", None),
                        axis=get_val(c, "axis", None),
                        target=get_val(c, "target", None),
                        xyaxes=get_val(c, "xyaxes", None),
                        zaxis=get_val(c, "zaxis", None),
                        euler=get_val(c, "euler", None),
                        fovy=get_val(c, "fovy", None),
                        width=get_val(c, "width", 128),
                        height=get_val(c, "height", 128),
                    )
                )

        env = GenericMujocoEnv(
            model_xml=cfg.model_xml,
            model_path=cfg.model_path,
            scene_xml_path=cfg.scene_xml_path,
            robot_xml_path=cfg.robot_xml_path,
            model_format=cfg.model_format,
            cameras=camera_specs,
            seed=cfg.seed,
            control_dt=cfg.control_dt,
            physics_dt=cfg.physics_dt,
            render_spec_height=camera_specs[0].height if camera_specs else 128,
            render_spec_width=camera_specs[0].width if camera_specs else 128,
            render_mode=cfg.render_mode,
            image_obs=cfg.image_obs,
            home_position=np.array(cfg.home_position) if cfg.home_position else None,
            cartesian_bounds=np.array(cfg.cartesian_bounds) if cfg.cartesian_bounds else None,
        )
        env = AsyncGymWrapper(env)

        # Initialize teleoperator if control mode is set
        teleop = None
        teleop_config = None
        if cfg.processor and cfg.processor.control_mode:
            control_mode = cfg.processor.control_mode
            if control_mode == "keyboard":
                teleop_config = keyboard.KeyboardTeleopConfig()
            elif control_mode == "gamepad":
                teleop_config = gamepad.GamepadTeleopConfig()

        if teleop_config:
            teleop = make_teleoperator_from_config(teleop_config)
            teleop.connect()

        return env, teleop

    # Check if this is a GymHIL simulation environment
    if cfg.name == "gym_hil":
        assert cfg.robot is None and cfg.teleop is None, "GymHIL environment does not support robot or teleop"
        import gym_hil  # noqa: F401

        # Extract gripper settings with defaults
        use_gripper = cfg.processor.gripper.use_gripper if cfg.processor.gripper is not None else True
        gripper_penalty = cfg.processor.gripper.gripper_penalty if cfg.processor.gripper is not None else 0.0

        env = gym.make(
            f"gym_hil/{cfg.task}",
            image_obs=True,
            render_mode="rgb_array",
            use_gripper=use_gripper,
            gripper_penalty=gripper_penalty,
        )

        env = AsyncGymWrapper(env)
        return env, None

    # Real robot environment
    assert cfg.robot is not None, "Robot config must be provided for real robot environment"
    assert cfg.teleop is not None, "Teleop config must be provided for real robot environment"

    robot = make_robot_from_config(cfg.robot)
    teleop_device = make_teleoperator_from_config(cfg.teleop)
    teleop_device.connect()

    # Create base environment with safe defaults
    use_gripper = cfg.processor.gripper.use_gripper if cfg.processor.gripper is not None else True
    display_cameras = (
        cfg.processor.observation.display_cameras if cfg.processor.observation is not None else False
    )
    reset_pose = cfg.processor.reset.fixed_reset_joint_positions if cfg.processor.reset is not None else None

    env = RobotEnv(
        robot=robot,
        use_gripper=use_gripper,
        display_cameras=display_cameras,
        reset_pose=reset_pose,
    )

    return env, teleop_device


def make_processors(
    env: gym.Env, teleop_device: Teleoperator | None, cfg: EnvConfig, device: str = "cpu"
) -> tuple[
    DataProcessorPipeline[EnvTransition, EnvTransition], DataProcessorPipeline[EnvTransition, EnvTransition]
]:
    """Create environment and action processors.

    Args:
        env: Robot environment instance.
        teleop_device: Teleoperator device for intervention.
        cfg: Processor configuration.
        device: Target device for computations.

    Returns:
        Tuple of (environment processor, action processor).
    """
    # Custom MuJoCo environment — lightweight pipeline (no real robot/teleop)
    if cfg.name == "custom_mujoco":
        terminate_on_success = True
        if hasattr(cfg, 'processor') and cfg.processor is not None:
            reset_cfg = getattr(cfg.processor, 'reset', None)
            if reset_cfg is not None:
                terminate_on_success = getattr(reset_cfg, 'terminate_on_success', True)

        action_pipeline_steps = []
        if teleop_device is not None:
            action_pipeline_steps.append(AddTeleopActionAsComplimentaryDataStep(teleop_device=teleop_device))

        action_pipeline_steps.extend([
            InterventionActionProcessorStep(terminate_on_success=terminate_on_success),
            Torch2NumpyActionProcessorStep(),
        ])

        env_pipeline_steps = [
            Numpy2TorchActionProcessorStep(),
            VanillaObservationProcessorStep(),
            AddBatchDimensionProcessorStep(),
            DeviceProcessorStep(device=device),
        ]

        return DataProcessorPipeline(
            steps=env_pipeline_steps, to_transition=identity_transition, to_output=identity_transition
        ), DataProcessorPipeline(
            steps=action_pipeline_steps, to_transition=identity_transition, to_output=identity_transition
        )

    terminate_on_success = (
        cfg.processor.reset.terminate_on_success if cfg.processor.reset is not None else True
    )

    if cfg.name == "gym_hil":
        action_pipeline_steps = [
            InterventionActionProcessorStep(terminate_on_success=terminate_on_success),
            Torch2NumpyActionProcessorStep(),
        ]

        env_pipeline_steps = [
            Numpy2TorchActionProcessorStep(),
            VanillaObservationProcessorStep(),
            AddBatchDimensionProcessorStep(),
            DeviceProcessorStep(device=device),
        ]

        return DataProcessorPipeline(
            steps=env_pipeline_steps, to_transition=identity_transition, to_output=identity_transition
        ), DataProcessorPipeline(
            steps=action_pipeline_steps, to_transition=identity_transition, to_output=identity_transition
        )

    # Full processor pipeline for real robot environment
    # Get robot and motor information for kinematics
    motor_names = list(env.robot.bus.motors.keys())

    # Set up kinematics solver if inverse kinematics is configured
    kinematics_solver = None
    if cfg.processor.inverse_kinematics is not None:
        kinematics_solver = RobotKinematics(
            urdf_path=cfg.processor.inverse_kinematics.urdf_path,
            target_frame_name=cfg.processor.inverse_kinematics.target_frame_name,
            joint_names=motor_names,
        )

    env_pipeline_steps = [VanillaObservationProcessorStep()]

    if cfg.processor.observation is not None:
        if cfg.processor.observation.add_joint_velocity_to_observation:
            env_pipeline_steps.append(JointVelocityProcessorStep(dt=1.0 / cfg.fps))
        if cfg.processor.observation.add_current_to_observation:
            env_pipeline_steps.append(MotorCurrentProcessorStep(robot=env.robot))

    if kinematics_solver is not None:
        env_pipeline_steps.append(
            ForwardKinematicsJointsToEEObservation(
                kinematics=kinematics_solver,
                motor_names=motor_names,
            )
        )

    if cfg.processor.image_preprocessing is not None:
        env_pipeline_steps.append(
            ImageCropResizeProcessorStep(
                crop_params_dict=cfg.processor.image_preprocessing.crop_params_dict,
                resize_size=cfg.processor.image_preprocessing.resize_size,
            )
        )

    # Add time limit processor if reset config exists
    if cfg.processor.reset is not None:
        env_pipeline_steps.append(
            TimeLimitProcessorStep(max_episode_steps=int(cfg.processor.reset.control_time_s * cfg.fps))
        )

    # Add gripper penalty processor if gripper config exists and enabled
    if cfg.processor.gripper is not None and cfg.processor.gripper.use_gripper:
        env_pipeline_steps.append(
            GripperPenaltyProcessorStep(
                penalty=cfg.processor.gripper.gripper_penalty,
                max_gripper_pos=cfg.processor.max_gripper_pos,
            )
        )

    if (
        cfg.processor.reward_classifier is not None
        and cfg.processor.reward_classifier.pretrained_path is not None
    ):
        env_pipeline_steps.append(
            RewardClassifierProcessorStep(
                pretrained_path=cfg.processor.reward_classifier.pretrained_path,
                device=device,
                success_threshold=cfg.processor.reward_classifier.success_threshold,
                success_reward=cfg.processor.reward_classifier.success_reward,
                terminate_on_success=terminate_on_success,
            )
        )

    env_pipeline_steps.append(AddBatchDimensionProcessorStep())
    env_pipeline_steps.append(DeviceProcessorStep(device=device))

    action_pipeline_steps = [
        AddTeleopActionAsComplimentaryDataStep(teleop_device=teleop_device),
        AddTeleopEventsAsInfoStep(teleop_device=teleop_device),
        InterventionActionProcessorStep(
            use_gripper=cfg.processor.gripper.use_gripper if cfg.processor.gripper is not None else False,
            terminate_on_success=terminate_on_success,
        ),
    ]

    # Replace InverseKinematicsProcessor with new kinematic processors
    if cfg.processor.inverse_kinematics is not None and kinematics_solver is not None:
        # Add EE bounds and safety processor
        inverse_kinematics_steps = [
            MapTensorToDeltaActionDictStep(
                use_gripper=cfg.processor.gripper.use_gripper if cfg.processor.gripper is not None else False
            ),
            MapDeltaActionToRobotActionStep(),
            EEReferenceAndDelta(
                kinematics=kinematics_solver,
                end_effector_step_sizes=cfg.processor.inverse_kinematics.end_effector_step_sizes,
                motor_names=motor_names,
                use_latched_reference=False,
                use_ik_solution=True,
            ),
            EEBoundsAndSafety(
                end_effector_bounds=cfg.processor.inverse_kinematics.end_effector_bounds,
            ),
            GripperVelocityToJoint(
                clip_max=cfg.processor.max_gripper_pos,
                speed_factor=1.0,
                discrete_gripper=True,
            ),
            InverseKinematicsRLStep(
                kinematics=kinematics_solver, motor_names=motor_names, initial_guess_current_joints=False
            ),
        ]
        action_pipeline_steps.extend(inverse_kinematics_steps)
        action_pipeline_steps.append(RobotActionToPolicyActionProcessorStep(motor_names=motor_names))

    return DataProcessorPipeline(
        steps=env_pipeline_steps, to_transition=identity_transition, to_output=identity_transition
    ), DataProcessorPipeline(
        steps=action_pipeline_steps, to_transition=identity_transition, to_output=identity_transition
    )


async def emit_observation_frames(observation: dict) -> None:
    """Emit observation images to connected Socket.IO clients.

    extracts image tensors from the observation dict, encodes them as JPEG,
    and emits them as base64 via Socket.IO 'video_frame' events.
    """
    image_keys = [key for key in observation if "image" in key]
    for key in image_keys:
        value = observation[key]
        img_np = None

        if isinstance(value, torch.Tensor):
            # Remove batch dimension if present and move to CPU
            img = _remove_batch_dim(value).cpu()
            # Handle CHW -> HWC conversion if needed
            if img.dim() == 3 and img.shape[0] in (1, 3):
                img = img.permute(1, 2, 0)
            
            img_np = img.numpy()
        elif isinstance(value, np.ndarray):
             img_np = value
             if img_np.ndim == 4:
                 img_np = img_np[0]
             # Handle CHW -> HWC? Mujoco gives HWC.
             if img_np.ndim == 3 and img_np.shape[0] in (1, 3): 
                 img_np = np.transpose(img_np, (1, 2, 0))

        if img_np is not None:
            # Convert from float [0, 1] to uint8 [0, 255]
            if np.issubdtype(img_np.dtype, np.floating) and img_np.max() <= 1.0:
                img_np = (img_np * 255).clip(0, 255)
            
            img_np = img_np.astype(np.uint8)

            # Convert RGB to BGR for cv2 JPEG encoding
            if img_np.ndim == 3 and img_np.shape[-1] == 3:
                img_np = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)
            _, buffer = cv2.imencode('.jpg', img_np)
            jpg_as_text = base64.b64encode(buffer).decode('utf-8')
            await sio.emit('video_frame', {'image': jpg_as_text, 'camera_name': key})
    if image_keys:
        await sio.sleep(0)


async def step_env_and_process_transition(
    env: gym.Env,
    transition: EnvTransition,
    action: torch.Tensor,
    env_processor: DataProcessorPipeline[EnvTransition, EnvTransition],
    action_processor: DataProcessorPipeline[EnvTransition, EnvTransition],
) -> EnvTransition:
    """
    Execute one step with processor pipeline.

    Args:
        env: The robot environment
        transition: Current transition state
        action: Action to execute
        env_processor: Environment processor
        action_processor: Action processor

    Returns:
        Processed transition with updated state.
    """

    # Create action transition
    transition[TransitionKey.ACTION] = action
    transition[TransitionKey.OBSERVATION] = (
        env.get_raw_joint_positions() if hasattr(env, "get_raw_joint_positions") else {}
    )
    processed_action_transition = action_processor(transition)
    processed_action = processed_action_transition[TransitionKey.ACTION]
    if hasattr(env, "unwrapped") and isinstance(env.unwrapped, GenericMujocoEnv):
        processed_action = _fit_action_to_env_space(processed_action, env)

    obs, reward, terminated, truncated, info = await env.step(processed_action)

    reward = reward + processed_action_transition[TransitionKey.REWARD]
    terminated = terminated or processed_action_transition[TransitionKey.DONE]
    truncated = truncated or processed_action_transition[TransitionKey.TRUNCATED]
    complementary_data = processed_action_transition[TransitionKey.COMPLEMENTARY_DATA].copy()
    new_info = processed_action_transition[TransitionKey.INFO].copy()
    new_info.update(info)

    new_transition = create_transition(
        observation=obs,
        action=processed_action,
        reward=reward,
        done=terminated,
        truncated=truncated,
        info=new_info,
        complementary_data=complementary_data,
    )
    new_transition = env_processor(new_transition)

    return new_transition


async def control_loop(
    env: gym.Env,
    env_processor: DataProcessorPipeline[EnvTransition, EnvTransition],
    action_processor: DataProcessorPipeline[EnvTransition, EnvTransition],
    teleop_device: Teleoperator,
    cfg: GymManipulatorConfig,
) -> None:
    """Main control loop for robot environment interaction.
    if cfg.mode == "record": then a dataset will be created and recorded

    Args:
     env: The robot environment
     env_processor: Environment processor
     action_processor: Action processor
     teleop_device: Teleoperator device
     cfg: gym_manipulator configuration
    """
    dt = 1.0 / cfg.env.fps

    logging.info(f"Starting control loop at {cfg.env.fps} FPS")
    logging.info("Controls:")
    logging.info("- Use gamepad/teleop device for intervention")
    logging.info("- When not intervening, robot will stay still")
    logging.info("- Press Ctrl+C to exit")

    # Reset environment and processors
    obs, info = await env.reset()
    complementary_data = (
        {"raw_joint_positions": info.pop("raw_joint_positions")} if "raw_joint_positions" in info else {}
    )
    env_processor.reset()
    action_processor.reset()

    # Process initial observation
    transition = create_transition(observation=obs, info=info, complementary_data=complementary_data)
    transition = env_processor(data=transition)

    # Determine if gripper is used
    use_gripper = cfg.env.processor.gripper.use_gripper if cfg.env.processor.gripper is not None else True

    dataset = None
    if cfg.mode == "record":
        if cfg.env.type == "custom_mujoco":
            action_features = _custom_mujoco_action_features(env)
        else:
            try:
                action_features = teleop_device.action_features
            except AttributeError:
                logging.warning(
                    "Teleoperator does not expose action_features correctly; "
                    "falling back to environment action-space schema."
                )
                action_features = _custom_mujoco_action_features(env)

        features = {
            ACTION: action_features,
            REWARD: {"dtype": "float32", "shape": (1,), "names": None},
            DONE: {"dtype": "bool", "shape": (1,), "names": None},
        }
        if use_gripper:
            features["complementary_info.discrete_penalty"] = {
                "dtype": "float32",
                "shape": (1,),
                "names": ["discrete_penalty"],
            }

        for key, value in transition[TransitionKey.OBSERVATION].items():
            value_unbatched = _remove_batch_dim(value)
            if key == OBS_STATE:
                features[key] = {
                    "dtype": "float32",
                    "shape": value_unbatched.shape,
                    "names": None,
                }
            if "image" in key:
                features[key] = {
                    "dtype": "video",
                    "shape": value_unbatched.shape,
                    "names": ["channels", "height", "width"],
                }

        dataset = _init_record_dataset(cfg, features)

    episode_idx = 0
    episode_step = 0
    episode_start_time = time.perf_counter()

    while episode_idx < cfg.dataset.num_episodes_to_record:
        step_start_time = time.perf_counter()

        # Create a neutral action (no movement)
        # Assuming the environment (or wrapper) exposes action_space.
        # This fixes a crash where rigid 3/4-DOF assumptions conflict with custom robots (e.g. 7-DOF).
        action_dim = 4
        if hasattr(env, "action_space") and hasattr(env.action_space, "shape"):
            action_dim = env.action_space.shape[0]
        elif hasattr(env, "unwrapped") and hasattr(env.unwrapped, "action_space") and hasattr(env.unwrapped.action_space, "shape"):
            action_dim = env.unwrapped.action_space.shape[0]
            
        neutral_action = torch.zeros(action_dim, dtype=torch.float32)
        # If strict gripper logic is needed for neutral matching, it should be derived from env metadata.
        # effectively: if use_gripper and action_dim == 4: neutral_action[-1] = 1.0 (maybe?)
        # For now, zeros are safer than a shape mismatch.

        # Use the new step function
        transition = await step_env_and_process_transition(
            env=env,
            transition=transition,
            action=neutral_action,
            env_processor=env_processor,
            action_processor=action_processor,
        )
        terminated = transition.get(TransitionKey.DONE, False)
        truncated = transition.get(TransitionKey.TRUNCATED, False)

        if cfg.mode == "record":
            observations: dict[str, Any] = {}
            for key, value in transition[TransitionKey.OBSERVATION].items():
                value_unbatched = _remove_batch_dim(value)
                if isinstance(value_unbatched, (torch.Tensor, np.ndarray)):
                    observations[key] = _to_torch_cpu(value_unbatched)
            # For custom MuJoCo, always store actions in environment action-space dimensions.
            if cfg.env.type == "custom_mujoco":
                action_to_record = _fit_action_to_env_space(transition[TransitionKey.ACTION], env)
            else:
                action_to_record = transition[TransitionKey.COMPLEMENTARY_DATA].get(
                    "teleop_action", transition[TransitionKey.ACTION]
                )
            frame = {
                **observations,
                ACTION: _to_torch_cpu_float32(action_to_record),
                REWARD: np.array([transition[TransitionKey.REWARD]], dtype=np.float32),
                DONE: np.array([terminated or truncated], dtype=bool),
            }
            if use_gripper:
                discrete_penalty = transition[TransitionKey.COMPLEMENTARY_DATA].get("discrete_penalty", 0.0)
                frame["complementary_info.discrete_penalty"] = np.array([discrete_penalty], dtype=np.float32)

            if dataset is not None:
                frame["task"] = cfg.dataset.task
                dataset.add_frame(frame)

        # Emit observation frames to connected Socket.IO clients
        await emit_observation_frames(transition[TransitionKey.OBSERVATION])

        episode_step += 1

        # Handle episode termination
        if terminated or truncated:
            episode_time = time.perf_counter() - episode_start_time
            logging.info(
                f"Episode ended after {episode_step} steps in {episode_time:.1f}s with reward {transition[TransitionKey.REWARD]}"
            )
            episode_step = 0
            episode_idx += 1

            if dataset is not None:
                if transition[TransitionKey.INFO].get(TeleopEvents.RERECORD_EPISODE, False):
                    logging.info(f"Re-recording episode {episode_idx}")
                    dataset.clear_episode_buffer()
                    episode_idx -= 1
                else:
                    logging.info(f"Saving episode {episode_idx}")
                    dataset.save_episode()

            # Reset for new episode
            obs, info = await env.reset()
            env_processor.reset()
            action_processor.reset()

            transition = create_transition(observation=obs, info=info)
            transition = env_processor(transition)

        # Maintain fps timing
        await asyncio.sleep(max(dt - (time.perf_counter() - step_start_time), 0.0))
        await sio.sleep(0)  # Yield to asyncio loop

    if dataset is not None:
        logging.info("Dataset saved locally at %s", dataset.root)
    if dataset is not None and cfg.dataset.push_to_hub:
        try:
            logging.info("Pushing dataset to hub")
            dataset.push_to_hub()
        except Exception as error:
            logging.warning("Skipping push_to_hub due to authentication/repository issue: %s", error)


async def replay_trajectory(
    env: gym.Env, action_processor: DataProcessorPipeline, cfg: GymManipulatorConfig
) -> None:
    """Replay recorded trajectory on robot environment."""
    assert cfg.dataset.replay_episode is not None, "Replay episode must be provided for replay"

    dataset = LeRobotDataset(
        cfg.dataset.repo_id,
        root=cfg.dataset.root,
        episodes=[cfg.dataset.replay_episode],
        download_videos=False,
    )
    episode_frames = dataset.hf_dataset.filter(lambda x: x["episode_index"] == cfg.dataset.replay_episode)
    actions = episode_frames.select_columns(ACTION)

    _, info = await env.reset()

    for action_data in actions:
        start_time = time.perf_counter()
        transition = create_transition(
            observation=env.get_raw_joint_positions() if hasattr(env, "get_raw_joint_positions") else {},
            action=action_data[ACTION],
        )
        transition = action_processor(transition)
        await env.step(transition[TransitionKey.ACTION])
        await asyncio.sleep(max(1 / cfg.env.fps - (time.perf_counter() - start_time), 0.0))


@parser.wrap()
def main(cfg: GymManipulatorConfig) -> None:
    """Main entry point for gym manipulator script."""
    logging.info("Starting gym_manipulator...")
    
    async def run_gym_logic():
        try:
            env, teleop_device = make_robot_env(cfg.env)
            env_processor, action_processor = make_processors(env, teleop_device, cfg.env, cfg.device)

            logging.info("Environment observation space:", env.observation_space)
            # logging.info("Environment action space:", env.action_space)
            # logging.info("Environment processor:", env_processor)
            # logging.info("Action processor:", action_processor)

            if cfg.mode == "replay":
                await replay_trajectory(env, action_processor, cfg)
                return

            await control_loop(env, env_processor, action_processor, teleop_device, cfg)
        except Exception as e:
            logging.error(f"Error in gym logic: {e}", exc_info=True)
            # Send error to Electron
            print(f"__CMD__:{json.dumps({'type': 'error', 'message': str(e), 'traceback': traceback.format_exc()})}", file=sys.stderr, flush=True)

    async def on_startup(app):
        sio.start_background_task(run_gym_logic)

    app.on_startup.append(on_startup)

    # Find a free port
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(('', 0))
    port = sock.getsockname()[1]
    sock.close()

    # Run the web server
    # Print to stderr so VideoManager can catch it
    print(f"__CMD__:{json.dumps({'type': 'server-ready', 'url': f'http://localhost:{port}'})}", file=sys.stderr, flush=True)
    logging.info(f"Socket.IO server running on http://localhost:{port}")
    web.run_app(app, port=port)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, force=True)
    logging.info("Starting gym_manipulator...")
    main()
