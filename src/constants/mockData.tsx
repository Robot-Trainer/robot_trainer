export const ML_LIBRARIES = [
  { id: 'sb3', name: 'Stable Baselines3', type: 'RL', description: 'PPO, SAC, TD3 algorithms' },
  { id: 'rllib', name: 'Ray RLLib', type: 'RL', description: 'Distributed reinforcement learning' },
  { id: 'lerobot', name: 'Hugging Face LeRobot', type: 'Imitation', description: 'End-to-end learning for real-world robotics' },
  { id: 'dreamer', name: 'DreamerV3', type: 'Model-based', description: 'World models for visual control' }
];

export const DEFAULT_CONFIG = {
  policy_type: 'act',
  episode_time_s: 60,
  reset_time_s: 60,
  num_episodes: 50,
  device: 'cuda',
  fps: 30,
  repo_id: 'lerobot/so100_test'
};

export const MOCK_ROBOTS = [
  { id: 1, name: 'Arm-Alpha (Leader)', status: 'ready', type: 'SO-100', tasks: ['Pick', 'Place'] },
  { id: 2, name: 'Arm-Beta (Follower)', status: 'busy', type: 'SO-100', tasks: ['Assembly'] },
  { id: 3, name: 'Gantry-01', status: 'error', type: 'Gantry', tasks: ['Transport'], error: 'Servo Overload ID:4' }
];

export const ASSEMBLY_STAGES = [
  { id: 'intake', name: 'Intake Station', robots: [1] },
  { id: 'process', name: 'Processing', robots: [2] },
  { id: 'qc', name: 'Quality Control', robots: [] },
  { id: 'pack', name: 'Packaging', robots: [3] }
];

// Mock data for manufacturing lines and notifications
export const MOCK_LINES = [
  {
    id: 1,
    name: "Assembly Line 1",
    status: "active", // active, warning, error
    robots: [
      { id: 101, name: "Robot A", status: "active" },
      { id: 102, name: "Robot B", status: "warning" },
      { id: 103, name: "Robot C", status: "error" }
    ],
    notifications: [
      { id: 1, type: "warning", message: "Robot B needs maintenance", timestamp: "2023-05-15 14:30" },
      { id: 2, type: "error", message: "Robot C has overheated", timestamp: "2023-05-15 14:25" },
      { id: 3, type: "info", message: "Material supply low for component X", timestamp: "2023-05-15 14:20" }
    ]
  },
  {
    id: 2,
    name: "Assembly Line 2",
    status: "warning",
    robots: [
      { id: 201, name: "Robot D", status: "active" },
      { id: 202, name: "Robot E", status: "active" }
    ],
    notifications: [
      { id: 4, type: "info", message: "Material supply low for component Y", timestamp: "2023-05-15 14:15" }
    ]
  },
  {
    id: 3,
    name: "Assembly Line 3",
    status: "error",
    robots: [
      { id: 301, name: "Robot F", status: "error" },
      { id: 302, name: "Robot G", status: "warning" }
    ],
    notifications: [
      { id: 5, type: "error", message: "Robot F has failed completely", timestamp: "2023-05-15 14:10" },
      { id: 6, type: "warning", message: "Robot G has low battery", timestamp: "2023-05-15 14:05" }
    ]
  }
];


export default {
  ML_LIBRARIES,
  DEFAULT_CONFIG,
  MOCK_ROBOTS,
  ASSEMBLY_STAGES,
  MOCK_LINES
};
