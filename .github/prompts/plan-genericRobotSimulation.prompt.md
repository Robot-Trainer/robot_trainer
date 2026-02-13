# Plan: Generic Robot Simulation Support

This plan implements a "Generic Mujoco" simulation mode that allows users to bring any robot model (MJCF/URDF) and configure custom cameras directly from the UI.

## Reference Architecture

The existing `gym_hil` package uses a three-tier MuJoCo environment hierarchy that we mirror in our generic implementation:

1. **`MujocoGymEnv`** — base class: loads XML, creates `MjModel`/`MjData`, manages physics substeps (`control_dt` / `physics_dt`), owns a `mujoco.Renderer`, implements single-camera `render()`.
2. **`FrankaGymEnv(MujocoGymEnv)`** — robot-specific: defines `home_position`, `cartesian_bounds`; caches joint/actuator/site IDs by name; runs operational-space control (`opspace()`) each substep; owns multi-camera rendering; provides `get_robot_state()`, `get_gripper_pose()`, `apply_action()`, `reset_robot()`.
3. **`PandaPickCubeGymEnv(FrankaGymEnv)` / `PandaArrangeBoxesGymEnv(FrankaGymEnv)`** — task-specific: defines reward functions (`sparse`/`dense`), task objects (blocks, targets), environment-state observations, reset randomisation, success criteria, sampling bounds.

Key settings surfaced per layer:
| Layer | Settings |
|---|---|
| Base | `xml_path`, `seed`, `control_dt`, `physics_dt`, `GymRenderingSpec` (height, width, camera_id, mode) |
| Robot | `home_position` (ndarray), `cartesian_bounds` (2×3 ndarray), camera names list, joint/actuator/site naming conventions, gripper actuator name, `image_obs` flag |
| Task | `reward_type` (`sparse` | `dense`), `random_block_position`, object body/geom names, sampling bounds |

Wrappers applied by `factory.wrap_env`: `GripperPenaltyWrapper`, `EEActionWrapper` (scales XYZ step sizes, optional gripper), `InputsControlWrapper` (gamepad/keyboard intervention), `PassiveViewerWrapper`, `ResetDelayWrapper`.

## Steps

### 1. Database & File Storage: Robot Model Upload

When a user uploads an MJCF/URDF file for a simulated robot, the system creates entries across three tables and persists the model file itself.

#### 1a. Schema: `robotModelsTable` — store the model file content

The existing `robotModelsTable` ([src/db/schema.ts](src/db/schema.ts#L12-L20)) has `properties` (JSON). We add a `modelXml` text column (for the raw MJCF/URDF content) and a `modelFormat` varchar column (`"mjcf"` | `"urdf"`):

```ts
// in robotModelsTable definition
modelXml: text('model_xml'),          // raw file content
modelFormat: varchar('model_format'), // "mjcf" or "urdf"
```

For a user-uploaded model, populate:
- `name` — derived from the filename (e.g. `"my_robot"` from `my_robot.xml`)
- `dirName` — `"custom"` (or slugified name)
- `className` — `"GenericMujocoEnv"`
- `configClassName` — `"CustomMujocoEnvConfig"`
- `modelXml` — full file content read from the uploaded path
- `modelFormat` — detected from extension (`.xml` → `"mjcf"`, `.urdf` → `"urdf"`)
- `properties` — extracted metadata: `{ numJoints, jointNames, actuatorNames, siteNames, hasGripper }`. This is parsed from the XML via a main-process IPC handler that uses a lightweight XML parser (no MuJoCo dependency needed; just DOM traversal counting `<joint>`, `<actuator>`, `<site>` elements).

Run `npm run db:generate` to create the migration for these new columns.

#### 1b. `robotsTable` — create the robot instance

After the `robotModelsTable` entry is created, also create a `robotsTable` entry:
- `name` — user-provided name (defaults to model filename with a numeric suffix if needed to differentiate from existing robots)
- `modality` — `"simulated"`
- `robotModelId` — FK pointing to the new `robotModelsTable.id`
- `data` — `{}` (no additional metadata needed; the model XML lives in `robotModelsTable`)

#### 1c. `robotConfigurationsTable` + `configRobotsTable` — create a ready-to-use configuration

After robot creation, automatically create:
1. A `robotConfigurationsTable` entry with `name` = `"<robotName> Default Config"`.
2. A `configRobotsTable` entry linking `configurationId` → the new configuration, `robotId` → the new robot, and `snapshot` → a JSONB snapshot of the full robot row **plus** its `robotModelsTable` properties (so the config is self-contained even if the robot is later edited):
   ```json
   {
     "id": 42,
     "name": "My Panda",
     "modality": "simulated",
     "robotModelId": 7,
     "model": {
       "name": "panda",
       "modelFormat": "mjcf",
       "numJoints": 7,
       "jointNames": ["joint1", ...],
       "actuatorNames": ["actuator1", ...],
       "hasGripper": true
     }
   }
   ```
3. If the user has already created cameras (simulated cameras with position/rotation), create `configCamerasTable` entries with `snapshot` = full camera row JSONB for each selected camera. Snapshots capture position (`positionX/Y/Z`) and rotation (`rotationX/Y/Z`) so the env can reconstruct camera XML at runtime.

### 2. Frontend: Robot Creation Flow (`RobotForm.tsx`)

In [src/views/RobotForm.tsx](src/views/RobotForm.tsx):

*   When `modality === "simulated"`, hide the USB device scanning UI and show a **"Model File"** file input accepting `.xml` and `.urdf` files.
*   On file selection, read the file content client-side (or via IPC `dialog.showOpenDialog` + `fs.readFileSync` in main process).
*   On **Save**, call a new IPC handler `create-simulated-robot` that:
    1. Parses the XML to extract metadata (`numJoints`, `jointNames`, `actuatorNames`, `siteNames`, `hasGripper`).
    2. Inserts into `robotModelsTable` (returns `modelId`).
    3. Inserts into `robotsTable` with `robotModelId = modelId` (returns `robotId`).
    4. Creates a default `robotConfigurationsTable` entry + `configRobotsTable` entry with snapshot.
    5. Returns `{ robotId, modelId, configurationId }` to the renderer.
*   The `RobotForm` calls `onSaved` with the created robot payload so `ResourceManager` can refresh.

### 3. Frontend: Session Configuration (`SessionForm.tsx`)

Modify [src/views/SessionForm.tsx](src/views/SessionForm.tsx#L446) `handleStartSimulation`:

*   After fetching the robot configuration snapshot, check `follower.modality === "simulated"`.
*   If simulated, construct the `GymManipulatorConfig` with:
    ```ts
    env: {
      name: "custom_mujoco",
      task: null,       // no gym_hil task; GenericMujocoEnv handles it
      fps: 10,
      robot: null,
      teleop: null,
      // Custom fields for our registered EnvConfig subclass:
      model_xml: follower.model.modelXml,  // or fetch via IPC if too large for snapshot
      model_format: follower.model.modelFormat,
      home_position: follower.model.homePosition || null,
      cartesian_bounds: follower.model.cartesianBounds || null,
      cameras: snapshot.cameras.map(c => ({
        name: c.name,
        pos: [c.positionX, c.positionY, c.positionZ],
        euler: [c.rotationX, c.rotationY, c.rotationZ],
        width: parseInt(c.resolution?.split('x')[0]) || 128,
        height: parseInt(c.resolution?.split('x')[1]) || 128,
      })),
      image_obs: true,
      render_mode: "rgb_array",
      reward_type: "sparse",
      processor: { ... }  // same as existing gym_hil config
    }
    ```
*   Camera snapshot data from `configCamerasTable` provides stable position/rotation even if the user later edits the camera entity.

### 4. Backend: Generic Environment (`gym_manipulator.py`)

#### 4a. `CustomMujocoEnvConfig` — registered `EnvConfig` subclass

In [src/python/gym_manipulator.py](src/python/gym_manipulator.py), define and register a config:

```python
from lerobot.envs.configs import EnvConfig

@dataclass
class CameraSpec:
    name: str
    pos: list[float]       # [x, y, z]
    euler: list[float]     # [rx, ry, rz] degrees
    width: int = 128
    height: int = 128

@EnvConfig.register_subclass("custom_mujoco")
@dataclass
class CustomMujocoEnvConfig(EnvConfig):
    model_xml: str | None = None
    model_format: str = "mjcf"             # "mjcf" or "urdf"
    cameras: list[CameraSpec] = field(default_factory=list)
    home_position: list[float] | None = None
    cartesian_bounds: list[list[float]] | None = None
    image_obs: bool = True
    render_mode: str = "rgb_array"
    reward_type: str = "sparse"
    control_dt: float = 0.02
    physics_dt: float = 0.002
    seed: int = 0
    processor: HILSerlProcessorConfig = field(default_factory=HILSerlProcessorConfig)

    @property
    def gym_kwargs(self) -> dict:
        return {}
```

#### 4b. `GenericMujocoEnv` — base class for any MJCF robot

This mirrors `MujocoGymEnv` + `FrankaGymEnv` but discovers joints/actuators/cameras dynamically instead of hardcoding Panda-specific names.

```python
class GenericMujocoEnv(gym.Env):
```

**Constructor responsibilities** (mirroring `FrankaGymEnv.__init__`):
1. **XML assembly**: Take `model_xml` (raw MJCF string). If cameras are specified, inject `<camera>` elements into the `<worldbody>`. If the model is URDF, convert it to MJCF via `mujoco.MjModel.from_xml_string` with the URDF compiler directive.
2. **Model creation**: `mujoco.MjModel.from_xml_string(assembled_xml)`. Set `opt.timestep`, rendering dimensions.
3. **Joint/actuator discovery** (replacing hardcoded `joint1..7`, `actuator1..7`):
   - Enumerate all joints: `[model.joint(i).name for i in range(model.njnt)]`.
   - Enumerate all actuators: `[model.actuator(i).name for i in range(model.nact)]`.
   - Filter by prefix or naming convention if `home_position` length is provided, otherwise use all non-free joints.
   - Store `_dof_ids` (joint qpos indices) and `_ctrl_ids` (actuator indices) as ndarrays.
4. **Gripper detection**: Look for an actuator whose name contains `"gripper"` or `"finger"`. If found, store `_gripper_ctrl_id`; otherwise set `_has_gripper = False`.
5. **Camera setup**: For each `CameraSpec`, look up camera ID via `mj_name2id`. Store as `_camera_ids` list. If no cameras specified, use camera ID `-1` (free camera).
6. **Home position**: If provided, use directly. Otherwise, default to zeros for all controlled DOFs.
7. **Observation & action spaces**: Built dynamically based on discovered DOF count and camera specs (mirrors `FrankaGymEnv._setup_observation_space` / `_setup_action_space`).
   - `agent_pos`: `Box(shape=(num_dofs * 2 + gripper_dim + ee_dim,))` — qpos + qvel + gripper + TCP position.
   - `pixels` (if `image_obs`): dict of camera name → `Box(shape=(H, W, 3))`.
   - Action space: `Box(shape=(num_ctrl,))` for joint-space control.

**Key methods** (mirroring `FrankaGymEnv`):
- `reset(seed, **kwargs)` → reset qpos to `home_position`, `mj_forward`, return observation.
- `step(action)` → set `data.ctrl[_ctrl_ids]` to action values, run `_n_substeps` of `mj_step`, return `(obs, reward, terminated, truncated, info)`. Reward defaults to `0.0`; task-specific subclasses override.
- `render()` → iterate `_camera_ids`, render each via `mujoco.Renderer`, return list of frames (same pattern as `FrankaGymEnv.render()`).
- `get_robot_state()` → concatenate `qpos[_dof_ids]`, `qvel[_dof_ids]`, gripper pose (if applicable).
- `apply_action(action)` → for joint-space: directly set `data.ctrl`. No IK needed. The `opspace` controller from `gym_hil` is Panda-specific and **not** used here.

#### 4c. Why a two-tier pattern (`GenericMujocoEnv` + optional `<Robot>MujocoEnv`) is better than a single class

The existing `gym_hil` hierarchy shows that robot-specific concerns (IK strategy, actuator naming conventions, gripper mechanics, sensor names) vary significantly between robot models. A single monolithic `GenericMujocoEnv` would accumulate conditional branches for each robot type.

Instead, we use:

```
GenericMujocoEnv                 ← universal: XML loading, dynamic joint/camera discovery,
│                                   joint-space control, basic step/render/reset
├── PandaMujocoEnv               ← Panda-specific: opspace IK, mocap-based EE control,
│   │                               pinch site, 2f85 gripper, cartesian bounds
│   ├── PandaPickCubeMujocoEnv   ← task: block lifting reward, sampling bounds
│   └── PandaArrangeBoxesMujocoEnv ← task: multi-block arrangement reward
└── (future) KochMujocoEnv       ← Koch-specific overrides
```

`GenericMujocoEnv` is fully functional on its own for any MJCF model (joint-space control). Robot-specific subclasses **optionally** override:
- `apply_action()` — to use EE/IK control instead of joint-space
- `get_robot_state()` — to include TCP pose via specific sensor names
- `_compute_reward()` / `_is_success()` — for task environments
- `reset()` — for object randomisation

For the initial implementation we only build `GenericMujocoEnv`. Robot-specific subclasses can be added later when users need IK-based control for a known robot.

#### 4d. Update `make_robot_env`

In [src/python/gym_manipulator.py](src/python/gym_manipulator.py#L370) `make_robot_env`, add a branch:

```python
if cfg.name == "custom_mujoco":
    assert isinstance(cfg, CustomMujocoEnvConfig)
    env = GenericMujocoEnv(
        model_xml=cfg.model_xml,
        model_format=cfg.model_format,
        cameras=cfg.cameras,
        seed=cfg.seed,
        control_dt=cfg.control_dt,
        physics_dt=cfg.physics_dt,
        render_spec=GymRenderingSpec(
            height=cfg.cameras[0].height if cfg.cameras else 128,
            width=cfg.cameras[0].width if cfg.cameras else 128,
        ),
        render_mode=cfg.render_mode,
        image_obs=cfg.image_obs,
        home_position=np.array(cfg.home_position) if cfg.home_position else None,
        cartesian_bounds=np.array(cfg.cartesian_bounds) if cfg.cartesian_bounds else None,
    )
    env = AsyncGymWrapper(env)
    return env, None
```

#### 4e. Update `GymManipulatorConfig.env` type

Change from `HILSerlRobotEnvConfig` to the base `EnvConfig` (or `HILSerlRobotEnvConfig | CustomMujocoEnvConfig`) so `draccus` can parse both:

```python
@dataclass
class GymManipulatorConfig:
    env: EnvConfig  # was: HILSerlRobotEnvConfig
    dataset: DatasetConfig
    mode: str | None = None
    device: str = "cpu"
```

#### 4f. Update `make_processors` for `custom_mujoco`

Add a branch in `make_processors` that mirrors the `gym_hil` pipeline (since custom_mujoco is also a simulation without a physical teleop device):

```python
if cfg.name == "custom_mujoco":
    # Same lightweight processors as gym_hil — no real robot, no teleop
    action_pipeline_steps = [
        InterventionActionProcessorStep(terminate_on_success=...),
        Torch2NumpyActionProcessorStep(),
    ]
    env_pipeline_steps = [
        Numpy2TorchActionProcessorStep(),
        VanillaObservationProcessorStep(),
        AddBatchDimensionProcessorStep(),
        DeviceProcessorStep(device=device),
    ]
    return DataProcessorPipeline(...), DataProcessorPipeline(...)
```

### 5. IPC Handler: `create-simulated-robot`

In [src/main.ts](src/main.ts) `setupIpcHandlers`, add:

```ts
ipcMain.handle('create-simulated-robot', async (_event, { filePath, name }) => {
  // 1. Read the file
  const content = fs.readFileSync(filePath, 'utf-8');
  const ext = path.extname(filePath).toLowerCase();
  const format = ext === '.urdf' ? 'urdf' : 'mjcf';
  const baseName = name || path.basename(filePath, ext);

  // 2. Parse XML for metadata (lightweight DOM parsing)
  const metadata = parseRobotXmlMetadata(content); // { numJoints, jointNames, actuatorNames, siteNames, hasGripper }

  // 3. Insert into robotModelsTable (via IPC to renderer, or direct DB if main has access)
  //    Since DB lives in renderer, send event and wait for reply:
  mainWindow.webContents.send('request-create-robot-model', {
    name: baseName, dirName: 'custom', className: 'GenericMujocoEnv',
    configClassName: 'CustomMujocoEnvConfig', modelXml: content,
    modelFormat: format, properties: metadata
  });
  // ... await reply with modelId, then request robot + config creation
});
```

Alternatively, since the renderer owns the DB, this entire flow can be done renderer-side: `RobotForm.tsx` reads the file via IPC (`electronAPI.readFile(path)` or `dialog.showOpenDialog`), parses metadata client-side with `DOMParser`, and inserts directly into `robotModelsTable`, `robotsTable`, `robotConfigurationsTable`, and `configRobotsTable` using Drizzle.

In [src/preload.ts](src/preload.ts), expose:
```ts
selectModelFile: () => ipcRenderer.invoke('select-model-file'),
readModelFile: (path: string) => ipcRenderer.invoke('read-model-file', path),
```

### 6. Expose in Preload (`preload.ts`)

In [src/preload.ts](src/preload.ts), add to the `electronAPI` object:
```ts
selectModelFile: () => ipcRenderer.invoke('select-model-file'),
readModelFile: (filePath: string) => ipcRenderer.invoke('read-model-file', filePath),
```

## Settings Matrix: What `GenericMujocoEnv` Must Handle

Derived from analysis of `mujoco_gym_env.py`, `panda_pick_gym_env.py`, `panda_arrange_boxes_gym_env.py`, and the wrapper factory:

| Setting | Source in gym_hil | How GenericMujocoEnv handles it |
|---|---|---|
| `xml_path` / model loading | `MujocoGymEnv.__init__` | Accepts raw XML string (`model_xml`) instead of path; assembles cameras into XML before loading |
| `control_dt` / `physics_dt` | `MujocoGymEnv.__init__` | Same — passed through config |
| `GymRenderingSpec` (H, W) | `MujocoGymEnv.__init__` | Derived from first camera spec or defaults to 128×128 |
| `home_position` (ndarray) | `FrankaGymEnv.__init__` | Optional; defaults to zeros for all DOFs if not provided |
| `cartesian_bounds` (2×3) | `FrankaGymEnv.__init__` | Optional; only used if IK/EE control is enabled (future) |
| Camera names & IDs | `FrankaGymEnv.__init__` hardcodes `"front"`, `"handcam_rgb"` | Discovered dynamically from `CameraSpec` list; injected into XML |
| Joint IDs (`joint1..7`) | `FrankaGymEnv.__init__` hardcodes names | Discovered via `model.njnt` enumeration |
| Actuator IDs (`actuator1..7`) | `FrankaGymEnv.__init__` hardcodes names | Discovered via `model.nact` enumeration |
| Gripper (`fingers_actuator`) | `FrankaGymEnv.__init__` hardcodes name | Auto-detected by name pattern; optional |
| `pinch` site for TCP | `FrankaGymEnv._pinch_site_id` | Optional; discovered if present |
| `opspace()` IK controller | `FrankaGymEnv.apply_action()` | **Not used** — GenericMujocoEnv uses joint-space control. Subclass can override for specific robots. |
| `image_obs` flag | `FrankaGymEnv.__init__` | Same — toggles pixel observations |
| `reward_type` (`sparse`/`dense`) | `PandaPickCubeGymEnv.__init__` | Stored but reward defaults to 0.0; task subclasses override `_compute_reward()` |
| `random_block_position` | `PandaPickCubeGymEnv.__init__` | N/A for generic env; only relevant in task subclasses |
| Object sensors (`block_pos`) | `PandaPick*._compute_observation` | N/A for generic env; `_compute_observation` returns robot state only |
| `EEActionWrapper` step sizes | `factory.wrap_env` | Applied via existing wrapper pipeline when `use_inputs_control` is true |
| `GripperPenaltyWrapper` | `factory.wrap_env` | Applied if `use_gripper` is true in processor config |
| `InputsControlWrapper` | `factory.wrap_env` | Applied via existing wrapper pipeline (keyboard/gamepad) |
| `ResetDelayWrapper` | `factory.wrap_env` | Applied with `reset.reset_time_s` from processor config |

## Verification

1.  **Robot Setup**: In the Robots view, create a new robot with `Modality = "Simulated"`. Select a local `.xml` MJCF file. Verify:
    - A `robotModelsTable` row is created with `modelXml` content and parsed `properties`.
    - A `robotsTable` row is created with `modality = "simulated"` and `robotModelId` FK set.
    - A `robotConfigurationsTable` row + `configRobotsTable` row (with full snapshot) are created automatically.
2.  **Camera Setup**: In the Robot Configuration form, add simulated cameras with positions/rotations. Verify `configCamerasTable` entries are created with JSONB snapshots containing `positionX/Y/Z`, `rotationX/Y/Z`.
3.  **Session Execution**: Create a session selecting the simulated robot configuration. Click Start. Verify:
    - `handleStartSimulation` constructs a `GymManipulatorConfig` with `env.name = "custom_mujoco"`.
    - `gym_manipulator.py` receives the config, `make_robot_env` instantiates `GenericMujocoEnv`.
    - The env loads the model XML, injects cameras, discovers joints dynamically.
    - Video frames stream to the `VideoPlayer` from the configured camera angles.
4.  **Snapshot Integrity**: Edit the robot or camera after creating the configuration. Verify the session still uses the **snapshot** data (not the live entity), so in-flight configs remain stable.

## Decisions

-   **Config Parsing**: We subclass `EnvConfig` locally in `gym_manipulator.py` as `CustomMujocoEnvConfig` and register it with `draccus` to avoid modifying the installed `lerobot` library.
-   **Model Storage**: We store the full MJCF/URDF content in `robotModelsTable.modelXml` (text column). This avoids filesystem path dependencies and makes the model portable across machines. For very large models (>1MB), a future iteration could store the file on disk and keep only a path.
-   **Dynamic XML Camera Injection**: We inject `<camera>` elements into the XML string at runtime rather than managing `MjvCamera` manually. This ensures cameras are first-class citizens in the physics simulation and simplifies multi-camera rendering.
-   **Two-tier Env Pattern**: `GenericMujocoEnv` provides universal joint-space control for any model. Robot-specific subclasses (e.g., `PandaMujocoEnv`) can add IK, custom sensors, or task rewards without modifying the base. This follows the proven `MujocoGymEnv` → `FrankaGymEnv` → `PandaPick*` pattern in `gym_hil`.
-   **Snapshot-based Configurations**: `configRobotsTable.snapshot` and `configCamerasTable.snapshot` store the full entity state at configuration time. This decouples session execution from later edits to robot/camera entities — matching the existing pattern in `RobotConfigurationForm.tsx`.
-   **Renderer-side DB Writes**: Since the renderer owns the Drizzle DB, the multi-table creation flow (model → robot → configuration → config_robots) is done in the renderer. The main process only handles file reading and metadata parsing via IPC.

## Roadblocks & Workarounds

-   **`gym_hil` is a closed package**: We cannot modify it. *Workaround*: `GenericMujocoEnv` re-implements the `MujocoGymEnv` base from scratch, only importing `opspace` if a robot-specific subclass needs it.
-   **`draccus` strict schemas**: *Workaround*: `CustomMujocoEnvConfig` registered via `@EnvConfig.register_subclass("custom_mujoco")` enables polymorphic parsing. Widening `GymManipulatorConfig.env` to `EnvConfig` lets the parser accept both `HILSerlRobotEnvConfig` and `CustomMujocoEnvConfig`.
-   **Inverse Kinematics**: The `opspace()` controller is Panda-specific (hardcodes pinch site, Jacobian assumptions). *Impact*: `GenericMujocoEnv` uses joint-space control only. Cartesian/EE control requires a generic IK solver (e.g., `pink`, `mink`, or MuJoCo's built-in `mj_jac` + pseudoinverse) and would be added in a robot-specific subclass.
-   **URDF Support**: MuJoCo can compile URDF natively, but some URDFs need mesh files. *Workaround*: For the initial iteration we support single-file URDFs. Multi-file models (with mesh references) require uploading a directory, which is deferred to a future iteration.
-   **Large Model Files in DB**: Storing multi-MB XML in a text column may be slow. *Workaround*: Acceptable for typical robot models (10-100KB). For large models, a future iteration stores files on disk with a path reference in the DB.
