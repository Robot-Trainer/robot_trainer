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

import logging
import os
import glob
import ctypes.util
from dataclasses import dataclass, field
from typing import Any
import re

import gymnasium as gym
import numpy as np
import mujoco

from lerobot.envs.configs import EnvConfig

# Detect if hardware acceleration is available (EGL) or not (OSMesa)
# This needs to be set before mujoco is used for rendering in some contexts,
# though often the main entry point handles it.
if "MUJOCO_GL" not in os.environ:
    if ctypes.util.find_library("EGL"):
        os.environ["MUJOCO_GL"] = "egl"
    else:
        os.environ["MUJOCO_GL"] = "osmesa"

# ---------------------------------------------------------------------------
# Custom MuJoCo environment for user-uploaded MJCF / URDF models
# ---------------------------------------------------------------------------

@dataclass
class CameraSpec:
    """Specification for a camera to inject into MuJoCo XML."""
    name: str
    # Positioning attributes (optional, if overriding or injecting)
    pos: list[float] | None = None       # [x, y, z]
    quat: list[float] | None = None      # [w, x, y, z]
    axis: list[float] | None = None      # [x, y, z] target position relative to camera
    target: str | None = None            # target body name
    xyaxes: list[float] | None = None    # [x1, y1, z1, x2, y2, z2]
    zaxis: list[float] | None = None     # [x, y, z]
    euler: list[float] | None = None     # [rx, ry, rz] degrees in 'xyz' convention (usually)

    # Rendering properties
    width: int = 128
    height: int = 128
    fovy: float | None = None



@dataclass
class GripperConfig:
    use_gripper: bool = True
    gripper_penalty: float = -0.02

@dataclass
class ObservationConfig:
    display_cameras: bool = True

@dataclass
class ResetConfig:
    reset_time_s: float = 2.0
    control_time_s: float = 15.0
    terminate_on_success: bool = True


@dataclass
class CustomMujocoProcessorConfig:
    """Lightweight processor config for custom_mujoco envs."""
    control_mode: str = "keyboard"
    gripper: GripperConfig | None = None
    observation: ObservationConfig | None = None
    reset: ResetConfig | None = None


@EnvConfig.register_subclass("custom_mujoco")
@dataclass
class CustomMujocoEnvConfig(EnvConfig):
    """Configuration for a generic user-uploaded MuJoCo model."""
    name: str = "custom_mujoco"
    model_xml: str | None = None
    model_path: str | None = None
    model_format: str = "mjcf"
    scene_xml_path: str | None = None
    robot_xml_path: str | None = None
    cameras: list[CameraSpec] = field(default_factory=list)
    home_position: list[float] | None = None
    cartesian_bounds: list[list[float]] | None = None
    image_obs: bool = True
    render_mode: str = "rgb_array"
    reward_type: str = "sparse"
    control_dt: float = 0.02
    physics_dt: float = 0.002
    seed: int = 0
    processor: CustomMujocoProcessorConfig = field(default_factory=CustomMujocoProcessorConfig)

    @property
    def gym_kwargs(self) -> dict:
        return {}


class GenericMujocoEnv(gym.Env):
    """Generic MuJoCo environment for any uploaded MJCF/URDF robot model.

    Provides joint-space control, dynamic joint/actuator discovery,
    camera injection, and multi-camera rendering.  Mirrors the
    MujocoGymEnv -> FrankaGymEnv hierarchy from gym_hil but discovers
    everything dynamically instead of hardcoding robot-specific names.
    """

    metadata = {"render_modes": ["rgb_array", "human"]}

    def __init__(
        self,
        model_xml: str | None = None,
        model_path: str | None = None,
        scene_xml_path: str | None = None,
        robot_xml_path: str | None = None,
        model_format: str = "mjcf",
        cameras: list[CameraSpec] | None = None,
        seed: int = 0,
        control_dt: float = 0.02,
        physics_dt: float = 0.002,
        render_spec_height: int = 128,
        render_spec_width: int = 128,
        render_mode: str = "rgb_array",
        image_obs: bool = True,
        home_position: np.ndarray | None = None,
        cartesian_bounds: np.ndarray | None = None,
    ):
        super().__init__()

        self._cameras_spec = cameras or []
        self._control_dt = control_dt
        self._render_mode = render_mode
        self._image_obs = image_obs
        self._cartesian_bounds = cartesian_bounds

        # ----- load model -----
        if scene_xml_path and robot_xml_path:
            # Merge case: we create a temporary file in the scene directory
            # so that relative assets in the scene are resolved correctly.
            logging.info(f"Merging scene: {scene_xml_path} and robot: {robot_xml_path}")
            merged_content = self._merge_xmls_via_include(scene_xml_path, robot_xml_path)
            print("Merged XML content:\n", merged_content)  # Debugging output
            scene_dir = os.path.dirname(os.path.abspath(scene_xml_path))
            import tempfile
            # Create a temp file in the same directory as the scene file
            fd, temp_path = tempfile.mkstemp(suffix=".xml", dir=scene_dir, text=True)
            try:
                with os.fdopen(fd, 'w') as f:
                    f.write(merged_content)
                self._model = mujoco.MjModel.from_xml_path(temp_path)
            finally:
                if os.path.exists(temp_path):
                    os.unlink(temp_path)

        elif model_path:
            # Direct file path case
            logging.info(f"Loading model from path: {model_path}")
            if os.path.isfile(model_path) and model_path.endswith(".xml"):
                target_path = model_path
            else:
                # Glob search
                xml_files = glob.glob(os.path.join(model_path, "*.xml"))
                if not xml_files:
                    raise ValueError(f"No .xml files found in {model_path}")
                target_path = xml_files[0]
            
            self._model = mujoco.MjModel.from_xml_path(target_path)
        
        elif model_xml:
            # Direct XML string case
            if "<mujoco" not in model_xml:
                 raise ValueError("Provided model_xml does not look like a valid MJCF file (missing <mujoco> tag).")

            # If camera specs were provided alongside a raw MJCF string, inject
            # any missing <camera name="..."/> declarations into the model XML
            # before creating the MjModel so mujoco can find them by name.
            if self._cameras_spec:
                # Prefer inserting cameras inside <worldbody> so they are valid MJCF elements.
                wb_close = model_xml.rfind("</worldbody>")
                root_close = model_xml.rfind("</mujoco>")
                if wb_close == -1 and root_close == -1:
                    logging.warning("Could not find </worldbody> or </mujoco> in provided model_xml — skipping camera injection.")
                else:
                    camera_nodes: list[str] = []
                    for cs in self._cameras_spec:
                        # skip if camera with same name already present anywhere in XML
                        if re.search(rf'<camera[^>]*name\s*=\s*["\']{re.escape(cs.name)}["\']', model_xml):
                            continue
                        attrs = [f'name="{cs.name}"']
                        if cs.pos is not None:
                            attrs.append('pos="' + " ".join(str(x) for x in cs.pos) + '"')
                        if cs.euler is not None:
                            attrs.append('euler="' + " ".join(str(x) for x in cs.euler) + '"')
                        if cs.target is not None:
                            attrs.append(f'target="{cs.target}"')
                        # mode/xyaxes/fovy etc. can be added by user if needed
                        camera_nodes.append(f'    <camera {" ".join(attrs)}/>' )

                    if camera_nodes:
                        insert_at = wb_close if wb_close != -1 else root_close
                        # keep indentation consistent with existing <worldbody>
                        model_xml = model_xml[:insert_at] + "\n" + "\n".join(camera_nodes) + "\n" + model_xml[insert_at:]

            self._model = mujoco.MjModel.from_xml_string(model_xml)
            
        else:
            raise ValueError("No model configuration provided (need model_xml, model_path, or scene_xml_path + robot_xml_path).")

        self._model.opt.timestep = physics_dt
        self._model.vis.global_.offwidth = render_spec_width
        self._model.vis.global_.offheight = render_spec_height
        self._data = mujoco.MjData(self._model)
        self._n_substeps = max(1, int(control_dt / physics_dt))
        self._random = np.random.RandomState(seed)

        # ----- discover joints & actuators dynamically -----
        all_joints = []
        for i in range(self._model.njnt):
            jnt = self._model.joint(i)
            # Skip free and ball joints – they are not directly controllable
            if jnt.type in (mujoco.mjtJoint.mjJNT_FREE, mujoco.mjtJoint.mjJNT_BALL):
                continue
            all_joints.append((jnt.name, jnt.id))

        self._joint_names = [n for n, _ in all_joints]
        self._dof_ids = np.array([self._model.joint(n).qposadr[0] for n in self._joint_names], dtype=np.int32)

        all_actuators = []
        for i in range(self._model.nu):
            act = self._model.actuator(i)
            all_actuators.append((act.name, i))

        self._actuator_names = [n for n, _ in all_actuators]
        self._ctrl_ids = np.array([idx for _, idx in all_actuators], dtype=np.int32)

        # ----- gripper detection -----
        self._gripper_ctrl_id: int | None = None
        self._has_gripper = False
        for name, idx in all_actuators:
            if re.search(r'gripper|finger', name, re.IGNORECASE):
                self._gripper_ctrl_id = idx
                self._has_gripper = True
                break

        # ----- auto-detect cameras if not provided -----
        if not self._cameras_spec and self._model.ncam > 0:
            logging.info(f"No cameras specified, detecting {self._model.ncam} cameras from model.")
            for i in range(self._model.ncam):
                cam_name = mujoco.mj_id2name(self._model, mujoco.mjtObj.mjOBJ_CAMERA, i)
                if not cam_name:
                    cam_name = f"cam_{i}"
                # Get camera config (pos/quat) if needed, but here we just need name reference for rendering
                # Note: Default width/height will be applied.
                self._cameras_spec.append(CameraSpec(
                    name=cam_name,
                    # We don't populate pos/euler here as we trust the XML for existing cameras.
                    width=render_spec_width,
                    height=render_spec_height
                ))


        # ----- camera setup -----
        self._camera_ids: list[int] = []
        for cs in self._cameras_spec:
            cid = mujoco.mj_name2id(self._model, mujoco.mjtObj.mjOBJ_CAMERA, cs.name)
            if cid >= 0:
                self._camera_ids.append(cid)
            else:
                logging.warning(f"Camera '{cs.name}' not found in model, falling back to free camera")
                self._camera_ids.append(-1)
        if not self._camera_ids:
            self._camera_ids = [-1]  # free camera fallback

        # ----- home position -----
        num_dofs = len(self._joint_names)
        if home_position is not None:
            self._home_position = np.array(home_position[:num_dofs], dtype=np.float64)
        else:
            # Auto-detect from keyframe if available
            if self._model.nkey > 0:
                logging.info(f"Using first keyframe as home position.")
                # Use qpos of the first keyframe.
                # Keyframes store full qpos (including free joints), so we need to map to our dofs.
                key_qpos = self._model.key_qpos[0]
                self._home_position = np.array([key_qpos[self._dof_ids[i]] for i in range(num_dofs)], dtype=np.float64)
            else:
                self._home_position = np.zeros(num_dofs, dtype=np.float64)

        # ----- renderer -----
        self._viewer: mujoco.Renderer | None = None
        self._render_height = render_spec_height
        self._render_width = render_spec_width

        # ----- spaces -----
        self._setup_observation_space()
        self._setup_action_space()

    def _merge_xmls_via_include(self, scene_path: str, robot_path: str) -> str:
        """Merge robot XML into scene XML by injecting an <include> tag."""
        with open(scene_path, 'r', encoding='utf-8') as f:
            scene_content = f.read()

        robot_abs_path = os.path.abspath(robot_path)
        
        # Find the last closing </mujoco> tag
        # We use simple string search/replace to avoid parsing XML, as files might contain non-standard includes.
        # This assumes valid MJCF structure where </mujoco> is near the end.
        
        # Search for </mujoco> (case insensitive matching not strictly needed as MJCF is case sensitive)
        marker = "</mujoco>"
        idx = scene_content.rfind(marker)
        
        if idx == -1:
             # Fallback if the user provided something weird
             logging.warning("Could not find </mujoco> in scene file, appending include at the end (might fail).")
             return scene_content + f'\n<include file="{robot_abs_path}"/>'
        
        # Inject the include tag before the closing tag. 
        # We put it in root <mujoco> block so it's a sibling of <worldbody> etc.
        # This allows the robot file to define its own <asset>, <default>, etc. which is valid if scene has child <mujoco> elements?
        # Actually proper MJCF include merges children.

        # If the scene already contains an <include> referencing the same base filename
        # (for example a relative path to a previous robot file), remove that include so
        # we can replace it with the provided absolute path.
        robot_basename = os.path.basename(robot_abs_path)
        include_pattern = re.compile(r'<include\s+[^>]*file\s*=\s*["\'](?P<file>[^"\']+)["\'][^>]*/?>', re.IGNORECASE)

        def _remove_same_basename_includes(text: str) -> str:
            def _repl(m):
                existing = m.group('file')
                if os.path.basename(existing) == robot_basename:
                    logging.info(f"Removing existing include for '{existing}' (basename matches '{robot_basename}')")
                    return ''
                return m.group(0)

            return include_pattern.sub(_repl, text)

        scene_content = _remove_same_basename_includes(scene_content)
        
        injection = f'  <include file="{robot_abs_path}"/>\n'
        new_content = scene_content[:idx] + injection + scene_content[idx:]
        
        return new_content

    # ---- spaces ----

    def _setup_observation_space(self) -> None:
        num_dofs = len(self._joint_names)
        gripper_dim = 1 if self._has_gripper else 0
        agent_pos_dim = num_dofs * 2 + gripper_dim  # qpos + qvel + gripper

        obs_spaces: dict[str, gym.spaces.Space] = {
            "observation.state": gym.spaces.Box(
                low=-np.inf, high=np.inf, shape=(agent_pos_dim,), dtype=np.float32
            ),
        }

        if self._image_obs:
            for i, cs in enumerate(self._cameras_spec):
                h = cs.height if cs else self._render_height
                w = cs.width if cs else self._render_width
                obs_spaces[f"observation.images.{cs.name}"] = gym.spaces.Box(
                    low=0, high=255, shape=(h, w, 3), dtype=np.uint8
                )
            if not self._cameras_spec:
                obs_spaces["observation.images.free"] = gym.spaces.Box(
                    low=0, high=255, shape=(self._render_height, self._render_width, 3), dtype=np.uint8
                )

        self.observation_space = gym.spaces.Dict(obs_spaces)

    def _setup_action_space(self) -> None:
        num_ctrl = len(self._ctrl_ids)
        if num_ctrl == 0:
            num_ctrl = len(self._joint_names)
        self.action_space = gym.spaces.Box(
            low=-1.0, high=1.0, shape=(num_ctrl,), dtype=np.float32
        )

    # ---- core gym methods ----

    def reset(self, *, seed=None, options=None):
        super().reset(seed=seed, options=options)
        self._data.qpos[self._dof_ids] = self._home_position
        self._data.qvel[:] = 0.0
        self._data.ctrl[:] = 0.0
        mujoco.mj_forward(self._model, self._data)
        obs = self._get_observation()
        return obs, {}

    def step(self, action):
        # Apply action to actuators
        action = np.asarray(action, dtype=np.float64)
        if len(self._ctrl_ids) > 0:
            self._data.ctrl[self._ctrl_ids] = action[:len(self._ctrl_ids)]
        else:
            # No actuators defined — set qpos directly (limited usefulness)
            num = min(len(action), len(self._dof_ids))
            self._data.qpos[self._dof_ids[:num]] = action[:num]

        for _ in range(self._n_substeps):
            mujoco.mj_step(self._model, self._data)

        obs = self._get_observation()
        reward = 0.0
        terminated = False
        truncated = False
        return obs, reward, terminated, truncated, {}

    def _get_observation(self) -> dict:
        qpos = self._data.qpos[self._dof_ids].astype(np.float32)
        qvel = self._data.qvel[self._dof_ids].astype(np.float32) if len(self._dof_ids) <= self._data.qvel.shape[0] else np.zeros_like(qpos)

        parts = [qpos, qvel]
        if self._has_gripper and self._gripper_ctrl_id is not None:
            parts.append(np.array([self._data.ctrl[self._gripper_ctrl_id]], dtype=np.float32))

        agent_pos = np.concatenate(parts)
        obs: dict[str, Any] = {"observation.state": agent_pos}

        if self._image_obs:
            frames = self.render()
            if isinstance(frames, list):
                for i, frame in enumerate(frames):
                    if i < len(self._cameras_spec):
                        cam_name = self._cameras_spec[i].name
                    else:
                        cam_name = "free"
                    obs[f"observation.images.{cam_name}"] = frame
            elif frames is not None:
                obs["observation.images.free"] = frames

        return obs

    def render(self):
        if self._viewer is None:
            self._viewer = mujoco.Renderer(
                model=self._model,
                height=self._render_height,
                width=self._render_width,
            )

        rendered_frames = []
        for cam_id in self._camera_ids:
            self._viewer.update_scene(self._data, camera=cam_id)
            rendered_frames.append(self._viewer.render().copy())
        return rendered_frames

    def get_robot_state(self) -> np.ndarray:
        qpos = self._data.qpos[self._dof_ids].astype(np.float32)
        qvel = self._data.qvel[self._dof_ids].astype(np.float32) if len(self._dof_ids) <= self._data.qvel.shape[0] else np.zeros_like(qpos)
        parts = [qpos, qvel]
        if self._has_gripper and self._gripper_ctrl_id is not None:
            parts.append(np.array([self._data.ctrl[self._gripper_ctrl_id]], dtype=np.float32))
        return np.concatenate(parts)

    def get_raw_joint_positions(self) -> dict[str, float]:
        return {
            f"{name}.pos": float(self._data.qpos[self._dof_ids[i]])
            for i, name in enumerate(self._joint_names)
        }

    def close(self) -> None:
        if self._viewer is not None:
            if hasattr(self._viewer, "close") and callable(self._viewer.close):
                try:
                    self._viewer.close()
                except Exception:
                    pass
            self._viewer = None

    # Properties for compatibility
    @property
    def model(self) -> mujoco.MjModel:
        return self._model

    @property
    def data(self) -> mujoco.MjData:
        return self._data
