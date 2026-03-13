import { db } from "./db";
import { sql } from "drizzle-orm";
import { robotModelsTable, robotsTable, scenesTable, camerasTable, sceneRobotsTable, sceneCamerasTable } from "./schema";

const robotModelsData = [
  {
    "id": 1,
    "name": "agilex_piper",
    "dirName": "agilex_piper",
    "modelPath": "mujoco_menagerie/agilex_piper/piper.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 8,
      "jointNames": [
        "joint1",
        "joint2",
        "joint3",
        "joint4",
        "joint5",
        "joint6",
        "joint7",
        "joint8"
      ],
      "actuatorNames": [
        "joint1",
        "joint2",
        "joint3",
        "joint4",
        "joint5",
        "joint6",
        "gripper"
      ],
      "siteNames": [],
      "hasGripper": true
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 2,
    "name": "agility_cassie",
    "dirName": "agility_cassie",
    "modelPath": "mujoco_menagerie/agility_cassie/cassie.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 22,
      "jointNames": [
        "left-hip-roll",
        "left-hip-yaw",
        "left-hip-pitch",
        "left-achilles-rod",
        "left-knee",
        "left-shin",
        "left-tarsus",
        "left-heel-spring",
        "left-foot-crank",
        "left-plantar-rod",
        "left-foot",
        "right-hip-roll",
        "right-hip-yaw",
        "right-hip-pitch",
        "right-achilles-rod",
        "right-knee",
        "right-shin",
        "right-tarsus",
        "right-heel-spring",
        "right-foot-crank",
        "right-plantar-rod",
        "right-foot"
      ],
      "actuatorNames": [
        "left-hip-roll",
        "left-hip-yaw",
        "left-hip-pitch",
        "left-knee",
        "left-foot",
        "right-hip-roll",
        "right-hip-yaw",
        "right-hip-pitch",
        "right-knee",
        "right-foot"
      ],
      "siteNames": [
        "imu"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 3,
    "name": "aloha",
    "dirName": "aloha",
    "modelPath": "mujoco_menagerie/aloha/filtered_cartesian_actuators.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 0,
      "jointNames": [],
      "actuatorNames": [
        "left/X",
        "left/Y",
        "left/Z",
        "left/RX",
        "left/RY",
        "left/RZ",
        "left/finger",
        "right/X",
        "right/Y",
        "right/Z",
        "right/RX",
        "right/RY",
        "right/RZ",
        "right/finger"
      ],
      "siteNames": [
        "left/actuation_center",
        "right/actuation_center"
      ],
      "hasGripper": true
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 4,
    "name": "anybotics_anymal_b",
    "dirName": "anybotics_anymal_b",
    "modelPath": "mujoco_menagerie/anybotics_anymal_b/anymal_b.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 12,
      "jointNames": [
        "LF_HAA",
        "LF_HFE",
        "LF_KFE",
        "RF_HAA",
        "RF_HFE",
        "RF_KFE",
        "LH_HAA",
        "LH_HFE",
        "LH_KFE",
        "RH_HAA",
        "RH_HFE",
        "RH_KFE"
      ],
      "actuatorNames": [
        "LF_HAA",
        "LF_HFE",
        "LF_KFE",
        "RF_HAA",
        "RF_HFE",
        "RF_KFE",
        "LH_HAA",
        "LH_HFE",
        "LH_KFE",
        "RH_HAA",
        "RH_HFE",
        "RH_KFE"
      ],
      "siteNames": [],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 5,
    "name": "anybotics_anymal_c",
    "dirName": "anybotics_anymal_c",
    "modelPath": "mujoco_menagerie/anybotics_anymal_c/anymal_c.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 12,
      "jointNames": [
        "LF_HAA",
        "LF_HFE",
        "LF_KFE",
        "RF_HAA",
        "RF_HFE",
        "RF_KFE",
        "LH_HAA",
        "LH_HFE",
        "LH_KFE",
        "RH_HAA",
        "RH_HFE",
        "RH_KFE"
      ],
      "actuatorNames": [
        "LF_HAA",
        "LF_HFE",
        "LF_KFE",
        "RF_HAA",
        "RF_HFE",
        "RF_KFE",
        "LH_HAA",
        "LH_HFE",
        "LH_KFE",
        "RH_HAA",
        "RH_HFE",
        "RH_KFE"
      ],
      "siteNames": [],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 6,
    "name": "apptronik_apollo",
    "dirName": "apptronik_apollo",
    "modelPath": "mujoco_menagerie/apptronik_apollo/apptronik_apollo.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 33,
      "jointNames": [
        "floating_base",
        "torso_yaw",
        "torso_roll",
        "torso_pitch",
        "neck_yaw",
        "neck_roll",
        "neck_pitch",
        "l_shoulder_aa",
        "l_shoulder_ie",
        "l_shoulder_fe",
        "l_elbow_fe",
        "l_wrist_roll",
        "l_wrist_yaw",
        "l_wrist_pitch",
        "r_shoulder_aa",
        "r_shoulder_ie",
        "r_shoulder_fe",
        "r_elbow_fe",
        "r_wrist_roll",
        "r_wrist_yaw",
        "r_wrist_pitch",
        "l_hip_ie",
        "l_hip_aa",
        "l_hip_fe",
        "l_knee_fe",
        "l_ankle_ie",
        "l_ankle_pd",
        "r_hip_ie",
        "r_hip_aa",
        "r_hip_fe",
        "r_knee_fe",
        "r_ankle_ie",
        "r_ankle_pd"
      ],
      "actuatorNames": [
        "torso_yaw",
        "torso_roll",
        "torso_pitch",
        "neck_yaw",
        "neck_roll",
        "neck_pitch",
        "l_shoulder_aa",
        "l_shoulder_ie",
        "l_shoulder_fe",
        "l_elbow_fe",
        "l_wrist_roll",
        "l_wrist_yaw",
        "l_wrist_pitch",
        "r_shoulder_aa",
        "r_shoulder_ie",
        "r_shoulder_fe",
        "r_elbow_fe",
        "r_wrist_roll",
        "r_wrist_yaw",
        "r_wrist_pitch",
        "l_hip_ie",
        "l_hip_aa",
        "l_hip_fe",
        "l_knee_fe",
        "l_ankle_ie",
        "l_ankle_pd",
        "r_hip_ie",
        "r_hip_aa",
        "r_hip_fe",
        "r_knee_fe",
        "r_ankle_ie",
        "r_ankle_pd"
      ],
      "siteNames": [
        "imu",
        "l_foot_fr",
        "l_foot_br",
        "l_foot_fl",
        "l_foot_bl",
        "r_foot_fr",
        "r_foot_br",
        "r_foot_fl",
        "r_foot_bl"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 7,
    "name": "arx_l5",
    "dirName": "arx_l5",
    "modelPath": "mujoco_menagerie/arx_l5/arx_l5.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 8,
      "jointNames": [
        "joint1",
        "joint2",
        "joint3",
        "joint4",
        "joint5",
        "joint6",
        "joint7",
        "joint8"
      ],
      "actuatorNames": [
        "joint1",
        "joint2",
        "joint3",
        "joint4",
        "joint5",
        "joint6",
        "gripper"
      ],
      "siteNames": [],
      "hasGripper": true
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 8,
    "name": "berkeley_humanoid",
    "dirName": "berkeley_humanoid",
    "modelPath": "mujoco_menagerie/berkeley_humanoid/berkeley_humanoid.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 12,
      "jointNames": [
        "LL_HR",
        "LL_HAA",
        "LL_HFE",
        "LL_KFE",
        "LL_FFE",
        "LL_FAA",
        "LR_HR",
        "LR_HAA",
        "LR_HFE",
        "LR_KFE",
        "LR_FFE",
        "LR_FAA"
      ],
      "actuatorNames": [
        "LL_HR",
        "LL_HAA",
        "LL_HFE",
        "LL_KFE",
        "LL_FFE",
        "LL_FAA",
        "LR_HR",
        "LR_HAA",
        "LR_HFE",
        "LR_KFE",
        "LR_FFE",
        "LR_FAA"
      ],
      "siteNames": [
        "imu",
        "LL_FOOT",
        "LR_FOOT"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 9,
    "name": "bitcraze_crazyflie_2",
    "dirName": "bitcraze_crazyflie_2",
    "modelPath": "mujoco_menagerie/bitcraze_crazyflie_2/cf2.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 0,
      "jointNames": [],
      "actuatorNames": [
        "body_thrust",
        "x_moment",
        "y_moment",
        "z_moment"
      ],
      "siteNames": [
        "imu",
        "actuation"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 10,
    "name": "booster_t1",
    "dirName": "booster_t1",
    "modelPath": "mujoco_menagerie/booster_t1/t1.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 23,
      "jointNames": [
        "AAHead_yaw",
        "Head_pitch",
        "Left_Shoulder_Pitch",
        "Left_Shoulder_Roll",
        "Left_Elbow_Pitch",
        "Left_Elbow_Yaw",
        "Right_Shoulder_Pitch",
        "Right_Shoulder_Roll",
        "Right_Elbow_Pitch",
        "Right_Elbow_Yaw",
        "Waist",
        "Left_Hip_Pitch",
        "Left_Hip_Roll",
        "Left_Hip_Yaw",
        "Left_Knee_Pitch",
        "Left_Ankle_Pitch",
        "Left_Ankle_Roll",
        "Right_Hip_Pitch",
        "Right_Hip_Roll",
        "Right_Hip_Yaw",
        "Right_Knee_Pitch",
        "Right_Ankle_Pitch",
        "Right_Ankle_Roll"
      ],
      "actuatorNames": [
        "AAHead_yaw",
        "Head_pitch",
        "Left_Shoulder_Pitch",
        "Left_Shoulder_Roll",
        "Left_Elbow_Pitch",
        "Left_Elbow_Yaw",
        "Right_Shoulder_Pitch",
        "Right_Shoulder_Roll",
        "Right_Elbow_Pitch",
        "Right_Elbow_Yaw",
        "Waist",
        "Left_Hip_Pitch",
        "Left_Hip_Roll",
        "Left_Hip_Yaw",
        "Left_Knee_Pitch",
        "Left_Ankle_Pitch",
        "Left_Ankle_Roll",
        "Right_Hip_Pitch",
        "Right_Hip_Roll",
        "Right_Hip_Yaw",
        "Right_Knee_Pitch",
        "Right_Ankle_Pitch",
        "Right_Ankle_Roll"
      ],
      "siteNames": [
        "imu"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 11,
    "name": "boston_dynamics_spot",
    "dirName": "boston_dynamics_spot",
    "modelPath": "mujoco_menagerie/boston_dynamics_spot/spot.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 12,
      "jointNames": [
        "fl_hx",
        "fl_hy",
        "fl_kn",
        "fr_hx",
        "fr_hy",
        "fr_kn",
        "hl_hx",
        "hl_hy",
        "hl_kn",
        "hr_hx",
        "hr_hy",
        "hr_kn"
      ],
      "actuatorNames": [
        "fl_hx",
        "fl_hy",
        "fl_kn",
        "fr_hx",
        "fr_hy",
        "fr_kn",
        "hl_hx",
        "hl_hy",
        "hl_kn",
        "hr_hx",
        "hr_hy",
        "hr_kn"
      ],
      "siteNames": [],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 12,
    "name": "dynamixel_2r",
    "dirName": "dynamixel_2r",
    "modelPath": "mujoco_menagerie/dynamixel_2r/dynamixel_2r.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 2,
      "jointNames": [
        "R1",
        "R2"
      ],
      "actuatorNames": [
        "R2",
        "R1"
      ],
      "siteNames": [
        "base",
        "end"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 13,
    "name": "flybody",
    "dirName": "flybody",
    "modelPath": "mujoco_menagerie/flybody/fruitfly.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 102,
      "jointNames": [
        "head_abduct",
        "head_twist",
        "head",
        "rostrum",
        "haustellum_abduct",
        "haustellum",
        "labrum_left",
        "labrum_right",
        "antenna_abduct_left",
        "antenna_twist_left",
        "antenna_left",
        "antenna_abduct_right",
        "antenna_twist_right",
        "antenna_right",
        "wing_yaw_left",
        "wing_roll_left",
        "wing_pitch_left",
        "wing_yaw_right",
        "wing_roll_right",
        "wing_pitch_right",
        "abdomen_abduct",
        "abdomen",
        "abdomen_abduct_2",
        "abdomen_2",
        "abdomen_abduct_3",
        "abdomen_3",
        "abdomen_abduct_4",
        "abdomen_4",
        "abdomen_abduct_5",
        "abdomen_5",
        "abdomen_abduct_6",
        "abdomen_6",
        "abdomen_abduct_7",
        "abdomen_7",
        "haltere_left",
        "haltere_right",
        "coxa_abduct_T1_left",
        "coxa_twist_T1_left",
        "coxa_T1_left",
        "femur_twist_T1_left",
        "femur_T1_left",
        "tibia_T1_left",
        "tarsus_T1_left",
        "tarsus2_T1_left",
        "tarsus3_T1_left",
        "tarsus4_T1_left",
        "tarsus5_T1_left",
        "coxa_abduct_T1_right",
        "coxa_twist_T1_right",
        "coxa_T1_right",
        "femur_twist_T1_right",
        "femur_T1_right",
        "tibia_T1_right",
        "tarsus_T1_right",
        "tarsus2_T1_right",
        "tarsus3_T1_right",
        "tarsus4_T1_right",
        "tarsus5_T1_right",
        "coxa_abduct_T2_left",
        "coxa_twist_T2_left",
        "coxa_T2_left",
        "femur_twist_T2_left",
        "femur_T2_left",
        "tibia_T2_left",
        "tarsus_T2_left",
        "tarsus2_T2_left",
        "tarsus3_T2_left",
        "tarsus4_T2_left",
        "tarsus5_T2_left",
        "coxa_abduct_T2_right",
        "coxa_twist_T2_right",
        "coxa_T2_right",
        "femur_twist_T2_right",
        "femur_T2_right",
        "tibia_T2_right",
        "tarsus_T2_right",
        "tarsus2_T2_right",
        "tarsus3_T2_right",
        "tarsus4_T2_right",
        "tarsus5_T2_right",
        "coxa_abduct_T3_left",
        "coxa_twist_T3_left",
        "coxa_T3_left",
        "femur_twist_T3_left",
        "femur_T3_left",
        "tibia_T3_left",
        "tarsus_T3_left",
        "tarsus2_T3_left",
        "tarsus3_T3_left",
        "tarsus4_T3_left",
        "tarsus5_T3_left",
        "coxa_abduct_T3_right",
        "coxa_twist_T3_right",
        "coxa_T3_right",
        "femur_twist_T3_right",
        "femur_T3_right",
        "tibia_T3_right",
        "tarsus_T3_right",
        "tarsus2_T3_right",
        "tarsus3_T3_right",
        "tarsus4_T3_right",
        "tarsus5_T3_right"
      ],
      "actuatorNames": [
        "head_abduct",
        "head_twist",
        "head",
        "rostrum",
        "haustellum_abduct",
        "haustellum",
        "labrum_left",
        "labrum_right",
        "antenna_abduct_left",
        "antenna_twist_left",
        "antenna_left",
        "antenna_abduct_right",
        "antenna_twist_right",
        "antenna_right",
        "wing_yaw_left",
        "wing_roll_left",
        "wing_pitch_left",
        "wing_yaw_right",
        "wing_roll_right",
        "wing_pitch_right",
        "abdomen_abduct",
        "abdomen",
        "coxa_abduct_T1_left",
        "coxa_twist_T1_left",
        "coxa_T1_left",
        "femur_twist_T1_left",
        "femur_T1_left",
        "tibia_T1_left",
        "tarsus_T1_left",
        "tarsus2_T1_left",
        "coxa_abduct_T1_right",
        "coxa_twist_T1_right",
        "coxa_T1_right",
        "femur_twist_T1_right",
        "femur_T1_right",
        "tibia_T1_right",
        "tarsus_T1_right",
        "tarsus2_T1_right",
        "coxa_abduct_T2_left",
        "coxa_twist_T2_left",
        "coxa_T2_left",
        "femur_twist_T2_left",
        "femur_T2_left",
        "tibia_T2_left",
        "tarsus_T2_left",
        "tarsus2_T2_left",
        "coxa_abduct_T2_right",
        "coxa_twist_T2_right",
        "coxa_T2_right",
        "femur_twist_T2_right",
        "femur_T2_right",
        "tibia_T2_right",
        "tarsus_T2_right",
        "tarsus2_T2_right",
        "coxa_abduct_T3_left",
        "coxa_twist_T3_left",
        "coxa_T3_left",
        "femur_twist_T3_left",
        "femur_T3_left",
        "tibia_T3_left",
        "tarsus_T3_left",
        "tarsus2_T3_left",
        "coxa_abduct_T3_right",
        "coxa_twist_T3_right",
        "coxa_T3_right",
        "femur_twist_T3_right",
        "femur_T3_right",
        "tibia_T3_right",
        "tarsus_T3_right",
        "tarsus2_T3_right",
        "adhere_labrum_left",
        "adhere_labrum_right",
        "adhere_claw_T1_left",
        "adhere_claw_T1_right",
        "adhere_claw_T2_left",
        "adhere_claw_T2_right",
        "adhere_claw_T3_left",
        "adhere_claw_T3_right"
      ],
      "siteNames": [
        "thorax",
        "hover_up_dir",
        "head",
        "tarsus_T1_left",
        "claw_T1_left",
        "tarsus_T1_right",
        "claw_T1_right",
        "tarsus_T2_left",
        "claw_T2_left",
        "tarsus_T2_right",
        "claw_T2_right",
        "tarsus_T3_left",
        "claw_T3_left",
        "tarsus_T3_right",
        "claw_T3_right"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 14,
    "name": "fourier_n1",
    "dirName": "fourier_n1",
    "modelPath": "mujoco_menagerie/fourier_n1/n1.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 23,
      "jointNames": [
        "left_hip_pitch_joint",
        "left_hip_roll_joint",
        "left_hip_yaw_joint",
        "left_knee_pitch_joint",
        "left_ankle_roll_joint",
        "left_ankle_pitch_joint",
        "right_hip_pitch_joint",
        "right_hip_roll_joint",
        "right_hip_yaw_joint",
        "right_knee_pitch_joint",
        "right_ankle_roll_joint",
        "right_ankle_pitch_joint",
        "waist_yaw_joint",
        "left_shoulder_pitch_joint",
        "left_shoulder_roll_joint",
        "left_shoulder_yaw_joint",
        "left_elbow_pitch_joint",
        "left_wrist_yaw_joint",
        "right_shoulder_pitch_joint",
        "right_shoulder_roll_joint",
        "right_shoulder_yaw_joint",
        "right_elbow_pitch_joint",
        "right_wrist_yaw_joint"
      ],
      "actuatorNames": [
        "left_hip_pitch_link",
        "left_hip_roll_link",
        "left_hip_yaw_link",
        "left_knee_pitch_link",
        "left_ankle_roll_link",
        "left_ankle_pitch_link",
        "right_hip_pitch",
        "right_hip_roll",
        "right_hip_yaw",
        "right_knee_pitch",
        "right_ankle_roll",
        "right_ankle_pitch",
        "waist_yaw",
        "left_shoulder_pitch",
        "left_shoulder_roll",
        "left_shoulder_yaw",
        "left_elbow_pitch",
        "left_wrist_yaw",
        "right_shoulder_pitch",
        "right_shoulder_roll",
        "right_shoulder_yaw",
        "right_elbow_pitch",
        "right_wrist_yaw"
      ],
      "siteNames": [
        "imu_sensor"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 15,
    "name": "franka_emika_panda",
    "dirName": "franka_emika_panda",
    "modelPath": "mujoco_menagerie/franka_emika_panda/hand.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 2,
      "jointNames": [
        "finger_joint1",
        "finger_joint2"
      ],
      "actuatorNames": [
        "actuator8"
      ],
      "siteNames": [],
      "hasGripper": true
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 16,
    "name": "franka_fr3",
    "dirName": "franka_fr3",
    "modelPath": "mujoco_menagerie/franka_fr3/fr3.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 7,
      "jointNames": [
        "fr3_joint1",
        "fr3_joint2",
        "fr3_joint3",
        "fr3_joint4",
        "fr3_joint5",
        "fr3_joint6",
        "fr3_joint7"
      ],
      "actuatorNames": [
        "fr3_joint1",
        "fr3_joint2",
        "fr3_joint3",
        "fr3_joint4",
        "fr3_joint5",
        "fr3_joint6",
        "fr3_joint7"
      ],
      "siteNames": [
        "attachment_site"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 17,
    "name": "franka_fr3_v2",
    "dirName": "franka_fr3_v2",
    "modelPath": "mujoco_menagerie/franka_fr3_v2/fr3v2.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 7,
      "jointNames": [
        "fr3v2_joint1",
        "fr3v2_joint2",
        "fr3v2_joint3",
        "fr3v2_joint4",
        "fr3v2_joint5",
        "fr3v2_joint6",
        "fr3v2_joint7"
      ],
      "actuatorNames": [
        "fr3v2_joint1",
        "fr3v2_joint2",
        "fr3v2_joint3",
        "fr3v2_joint4",
        "fr3v2_joint5",
        "fr3v2_joint6",
        "fr3v2_joint7"
      ],
      "siteNames": [],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 18,
    "name": "google_barkour_v0",
    "dirName": "google_barkour_v0",
    "modelPath": "mujoco_menagerie/google_barkour_v0/barkour_v0.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 12,
      "jointNames": [
        "abduction_front_right",
        "hip_front_right",
        "knee_front_right",
        "abduction_front_left",
        "hip_front_left",
        "knee_front_left",
        "abduction_hind_right",
        "hip_hind_right",
        "knee_hind_right",
        "abduction_hind_left",
        "hip_hind_left",
        "knee_hind_left"
      ],
      "actuatorNames": [
        "abduction_front_left",
        "hip_front_left",
        "knee_front_left",
        "abduction_hind_left",
        "hip_hind_left",
        "knee_hind_left",
        "abduction_front_right",
        "hip_front_right",
        "knee_front_right",
        "abduction_hind_right",
        "hip_hind_right",
        "knee_hind_right"
      ],
      "siteNames": [
        "origin"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 19,
    "name": "google_barkour_vb",
    "dirName": "google_barkour_vb",
    "modelPath": "mujoco_menagerie/google_barkour_vb/barkour_vb.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 12,
      "jointNames": [
        "abduction_front_left",
        "hip_front_left",
        "knee_front_left",
        "abduction_hind_left",
        "hip_hind_left",
        "knee_hind_left",
        "abduction_front_right",
        "hip_front_right",
        "knee_front_right",
        "abduction_hind_right",
        "hip_hind_right",
        "knee_hind_right"
      ],
      "actuatorNames": [
        "abduction_front_left",
        "hip_front_left",
        "knee_front_left",
        "abduction_hind_left",
        "hip_hind_left",
        "knee_hind_left",
        "abduction_front_right",
        "hip_front_right",
        "knee_front_right",
        "abduction_hind_right",
        "hip_hind_right",
        "knee_hind_right"
      ],
      "siteNames": [
        "imu_frame",
        "base_frame",
        "vicon_frame",
        "head_camera_frame",
        "realsense/depth_frame",
        "realsense/rgb_frame",
        "realsense/imu",
        "handle_camera_frame",
        "vicon_0",
        "vicon_1",
        "vicon_2",
        "vicon_3",
        "vicon_4",
        "vicon_5",
        "vicon_6",
        "vicon_8",
        "vicon_9",
        "foot_front_left",
        "foot_hind_left",
        "foot_front_right",
        "foot_hind_right"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 20,
    "name": "google_robot",
    "dirName": "google_robot",
    "modelPath": "mujoco_menagerie/google_robot/robot.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 9,
      "jointNames": [
        "joint_torso",
        "joint_shoulder",
        "joint_bicep",
        "joint_elbow",
        "joint_forearm",
        "joint_wrist",
        "joint_gripper",
        "joint_finger_right",
        "joint_finger_left"
      ],
      "actuatorNames": [],
      "siteNames": [
        "wrist",
        "gripper"
      ],
      "hasGripper": true
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 21,
    "name": "hello_robot_stretch",
    "dirName": "hello_robot_stretch",
    "modelPath": "mujoco_menagerie/hello_robot_stretch/stretch.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 17,
      "jointNames": [
        "joint_right_wheel",
        "joint_left_wheel",
        "joint_lift",
        "joint_arm_l3",
        "joint_arm_l2",
        "joint_arm_l1",
        "joint_arm_l0",
        "joint_wrist_yaw",
        "joint_gripper_slide",
        "joint_gripper_finger_left_open",
        "rubber_left_x",
        "rubber_left_y",
        "joint_gripper_finger_right_open",
        "rubber_right_x",
        "rubber_right_y",
        "joint_head_pan",
        "joint_head_tilt"
      ],
      "actuatorNames": [
        "forward",
        "turn",
        "lift",
        "arm_extend",
        "wrist_yaw",
        "grip",
        "head_pan",
        "head_tilt"
      ],
      "siteNames": [],
      "hasGripper": true
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 22,
    "name": "hello_robot_stretch_3",
    "dirName": "hello_robot_stretch_3",
    "modelPath": "mujoco_menagerie/hello_robot_stretch_3/stretch.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 20,
      "jointNames": [
        "joint_right_wheel",
        "joint_left_wheel",
        "joint_lift",
        "joint_arm_l3",
        "joint_arm_l2",
        "joint_arm_l1",
        "joint_arm_l0",
        "joint_wrist_yaw",
        "joint_wrist_pitch",
        "joint_wrist_roll",
        "joint_gripper_slide",
        "joint_gripper_finger_left_open",
        "rubber_left_x",
        "rubber_left_y",
        "joint_gripper_finger_right_open",
        "rubber_right_x",
        "rubber_right_y",
        "joint_head_pan",
        "joint_head_tilt",
        "joint_head_nav_cam"
      ],
      "actuatorNames": [
        "left_wheel_vel",
        "right_wheel_vel",
        "lift",
        "arm",
        "wrist_yaw",
        "wrist_pitch",
        "wrist_roll",
        "gripper",
        "head_pan",
        "head_tilt"
      ],
      "siteNames": [
        "base_imu"
      ],
      "hasGripper": true
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 23,
    "name": "i2rt_yam",
    "dirName": "i2rt_yam",
    "modelPath": "mujoco_menagerie/i2rt_yam/yam.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 8,
      "jointNames": [
        "joint1",
        "joint2",
        "joint3",
        "joint4",
        "joint5",
        "joint6",
        "left_finger",
        "right_finger"
      ],
      "actuatorNames": [
        "joint1",
        "joint2",
        "joint3",
        "joint4",
        "joint5",
        "joint6",
        "gripper"
      ],
      "siteNames": [
        "tcp_site",
        "grasp_site"
      ],
      "hasGripper": true
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 24,
    "name": "kinova_gen3",
    "dirName": "kinova_gen3",
    "modelPath": "mujoco_menagerie/kinova_gen3/gen3.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 7,
      "jointNames": [
        "joint_1",
        "joint_2",
        "joint_3",
        "joint_4",
        "joint_5",
        "joint_6",
        "joint_7"
      ],
      "actuatorNames": [
        "joint_1",
        "joint_2",
        "joint_3",
        "joint_4",
        "joint_5",
        "joint_6",
        "joint_7"
      ],
      "siteNames": [
        "pinch_site"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 25,
    "name": "kuka_iiwa_14",
    "dirName": "kuka_iiwa_14",
    "modelPath": "mujoco_menagerie/kuka_iiwa_14/iiwa14.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 7,
      "jointNames": [
        "joint1",
        "joint2",
        "joint3",
        "joint4",
        "joint5",
        "joint6",
        "joint7"
      ],
      "actuatorNames": [
        "actuator1",
        "actuator2",
        "actuator3",
        "actuator4",
        "actuator5",
        "actuator6",
        "actuator7"
      ],
      "siteNames": [
        "attachment_site"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 26,
    "name": "leap_hand",
    "dirName": "leap_hand",
    "modelPath": "mujoco_menagerie/leap_hand/left_hand.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 16,
      "jointNames": [
        "if_mcp",
        "if_rot",
        "if_pip",
        "if_dip",
        "mf_mcp",
        "mf_rot",
        "mf_pip",
        "mf_dip",
        "rf_mcp",
        "rf_rot",
        "rf_pip",
        "rf_dip",
        "th_cmc",
        "th_axl",
        "th_mcp",
        "th_ipl"
      ],
      "actuatorNames": [
        "if_mcp_act",
        "if_rot_act",
        "if_pip_act",
        "if_dip_act",
        "mf_mcp_act",
        "mf_rot_act",
        "mf_pip_act",
        "mf_dip_act",
        "rf_mcp_act",
        "rf_rot_act",
        "rf_pip_act",
        "rf_dip_act",
        "th_cmc_act",
        "th_axl_act",
        "th_mcp_act",
        "th_ipl_act"
      ],
      "siteNames": [],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 27,
    "name": "low_cost_robot_arm",
    "dirName": "low_cost_robot_arm",
    "modelPath": "mujoco_menagerie/low_cost_robot_arm/low_cost_robot_arm.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 6,
      "jointNames": [
        "base_rotation",
        "pitch",
        "elbow",
        "wrist_pitch",
        "wrist_roll",
        "gripper"
      ],
      "actuatorNames": [
        "base_rotation",
        "pitch",
        "elbow",
        "wrist_pitch",
        "wrist_roll",
        "gripper"
      ],
      "siteNames": [],
      "hasGripper": true
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 28,
    "name": "pal_talos",
    "dirName": "pal_talos",
    "modelPath": "mujoco_menagerie/pal_talos/talos_motor.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 0,
      "jointNames": [],
      "actuatorNames": [
        "torso_1_joint_torque",
        "torso_2_joint_torque",
        "head_1_joint_torque",
        "head_2_joint_torque",
        "arm_left_1_joint_torque",
        "arm_left_2_joint_torque",
        "arm_left_3_joint_torque",
        "arm_left_4_joint_torque",
        "arm_left_5_joint_torque",
        "arm_left_6_joint_torque",
        "arm_left_7_joint_torque",
        "gripper_left_joint_torque",
        "arm_right_1_joint_torque",
        "arm_right_2_joint_torque",
        "arm_right_3_joint_torque",
        "arm_right_4_joint_torque",
        "arm_right_5_joint_torque",
        "arm_right_6_joint_torque",
        "arm_right_7_joint_torque",
        "gripper_right_joint_torque",
        "leg_left_1_joint_torque",
        "leg_left_2_joint_torque",
        "leg_left_3_joint_torque",
        "leg_left_4_joint_torque",
        "leg_left_5_joint_torque",
        "leg_left_6_joint_torque",
        "leg_right_1_joint_torque",
        "leg_right_2_joint_torque",
        "leg_right_3_joint_torque",
        "leg_right_4_joint_torque",
        "leg_right_5_joint_torque",
        "leg_right_6_joint_torque"
      ],
      "siteNames": [],
      "hasGripper": true
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 29,
    "name": "pal_tiago",
    "dirName": "pal_tiago",
    "modelPath": "mujoco_menagerie/pal_tiago/tiago_motor.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 0,
      "jointNames": [],
      "actuatorNames": [
        "arm_1_joint_motor",
        "arm_2_joint_motor",
        "arm_3_joint_motor",
        "arm_4_joint_motor",
        "arm_5_joint_motor",
        "arm_6_joint_motor",
        "arm_7_joint_motor",
        "gripper_left_finger_position",
        "gripper_right_finger_position",
        "head_1_joint_position",
        "head_2_joint_position",
        "torso_lift_joint_position",
        "wheel_left_joint_vel",
        "wheel_right_joint_vel"
      ],
      "siteNames": [],
      "hasGripper": true
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 30,
    "name": "pal_tiago_dual",
    "dirName": "pal_tiago_dual",
    "modelPath": "mujoco_menagerie/pal_tiago_dual/tiago_dual_motor.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 0,
      "jointNames": [],
      "actuatorNames": [
        "wheel_front_right_joint_velocity",
        "wheel_front_left_joint_velocity",
        "wheel_rear_right_joint_velocity",
        "wheel_rear_left_joint_velocity",
        "torso_lift_joint_position",
        "head_1_joint_position",
        "head_2_joint_position",
        "arm_left_1_joint_torque",
        "arm_left_2_joint_torque",
        "arm_left_3_joint_torque",
        "arm_left_4_joint_torque",
        "arm_left_5_joint_torque",
        "arm_left_6_joint_torque",
        "arm_left_7_joint_torque",
        "gripper_left_left_finger_joint_position",
        "gripper_left_right_finger_joint_position",
        "arm_right_1_joint_torque",
        "arm_right_2_joint_torque",
        "arm_right_3_joint_torque",
        "arm_right_4_joint_torque",
        "arm_right_5_joint_torque",
        "arm_right_6_joint_torque",
        "arm_right_7_joint_torque",
        "gripper_right_left_finger_joint_position",
        "gripper_right_right_finger_joint_position"
      ],
      "siteNames": [],
      "hasGripper": true
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 31,
    "name": "pndbotics_adam_lite",
    "dirName": "pndbotics_adam_lite",
    "modelPath": "mujoco_menagerie/pndbotics_adam_lite/adam_lite.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 26,
      "jointNames": [
        "floating_joint",
        "hipPitch_Left",
        "hipRoll_Left",
        "hipYaw_Left",
        "kneePitch_Left",
        "anklePitch_Left",
        "ankleRoll_Left",
        "hipPitch_Right",
        "hipRoll_Right",
        "hipYaw_Right",
        "kneePitch_Right",
        "anklePitch_Right",
        "ankleRoll_Right",
        "waistRoll",
        "waistPitch",
        "waistYaw",
        "shoulderPitch_Left",
        "shoulderRoll_Left",
        "shoulderYaw_Left",
        "elbow_Left",
        "wristYaw_Left",
        "shoulderPitch_Right",
        "shoulderRoll_Right",
        "shoulderYaw_Right",
        "elbow_Right",
        "wristYaw_Right"
      ],
      "actuatorNames": [
        "hipPitch_Left",
        "hipRoll_Left",
        "hipYaw_Left",
        "kneePitch_Left",
        "anklePitch_Left",
        "ankleRoll_Left",
        "hipPitch_Right",
        "hipRoll_Right",
        "hipYaw_Right",
        "kneePitch_Right",
        "anklePitch_Right",
        "ankleRoll_Right",
        "waistRoll",
        "waistPitch",
        "waistYaw",
        "shoulderPitch_Left",
        "shoulderRoll_Left",
        "shoulderYaw_Left",
        "elbow_Left",
        "wristYaw_Left",
        "shoulderPitch_Right",
        "shoulderRoll_Right",
        "shoulderYaw_Right",
        "elbow_Right",
        "wristYaw_Right"
      ],
      "siteNames": [
        "imu"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 32,
    "name": "rethink_robotics_sawyer",
    "dirName": "rethink_robotics_sawyer",
    "modelPath": "mujoco_menagerie/rethink_robotics_sawyer/sawyer.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 7,
      "jointNames": [
        "right_j0",
        "right_j1",
        "right_j2",
        "right_j3",
        "right_j4",
        "right_j5",
        "right_j6"
      ],
      "actuatorNames": [
        "a0",
        "a1",
        "a2",
        "a3",
        "a4",
        "a5",
        "a6"
      ],
      "siteNames": [
        "attachment_site"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 33,
    "name": "robot_soccer_kit",
    "dirName": "robot_soccer_kit",
    "modelPath": "mujoco_menagerie/robot_soccer_kit/robot_soccer_kit.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 64,
      "jointNames": [
        "wheel1_speed",
        "wheel1_passive_1",
        "wheel1_passive_2",
        "wheel1_passive_3",
        "wheel1_passive_4",
        "wheel1_passive_5",
        "wheel1_passive_6",
        "wheel1_passive_7",
        "wheel1_passive_8",
        "wheel1_passive_9",
        "wheel1_passive_10",
        "wheel1_passive_11",
        "wheel1_passive_12",
        "wheel1_passive_13",
        "wheel1_passive_14",
        "wheel1_passive_15",
        "wheel1_passive_16",
        "wheel1_passive_17",
        "wheel1_passive_18",
        "wheel1_passive_19",
        "wheel1_passive_20",
        "wheel2_speed",
        "wheel2_passive1",
        "wheel2_passive2",
        "wheel2_passive3",
        "wheel2_passive4",
        "wheel2_passive5",
        "wheel2_passive6",
        "wheel2_passive7",
        "wheel2_passive8",
        "wheel2_passive9",
        "wheel2_passive10",
        "wheel2_passive11",
        "wheel2_passive12",
        "wheel2_passive13",
        "wheel2_passive14",
        "wheel2_passive15",
        "wheel2_passive16",
        "wheel2_passive17",
        "wheel2_passive18",
        "wheel2_passive19",
        "wheel2_passive20",
        "wheel3_speed",
        "wheel3_passive1",
        "wheel3_passive2",
        "wheel3_passive3",
        "wheel3_passive4",
        "wheel3_passive5",
        "wheel3_passive6",
        "wheel3_passive7",
        "wheel3_passive8",
        "wheel3_passive9",
        "wheel3_passive10",
        "wheel3_passive11",
        "wheel3_passive12",
        "wheel3_passive13",
        "wheel3_passive14",
        "wheel3_passive15",
        "wheel3_passive16",
        "wheel3_passive17",
        "wheel3_passive18",
        "wheel3_passive19",
        "wheel3_passive20",
        "kicker"
      ],
      "actuatorNames": [
        "wheel1_speed",
        "wheel2_speed",
        "wheel3_speed",
        "kicker"
      ],
      "siteNames": [],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 34,
    "name": "robotiq_2f85",
    "dirName": "robotiq_2f85",
    "modelPath": "mujoco_menagerie/robotiq_2f85/2f85.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 8,
      "jointNames": [
        "right_driver_joint",
        "right_coupler_joint",
        "right_spring_link_joint",
        "right_follower_joint",
        "left_driver_joint",
        "left_coupler_joint",
        "left_spring_link_joint",
        "left_follower_joint"
      ],
      "actuatorNames": [
        "fingers_actuator"
      ],
      "siteNames": [
        "pinch"
      ],
      "hasGripper": true
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 35,
    "name": "robotiq_2f85_v4",
    "dirName": "robotiq_2f85_v4",
    "modelPath": "mujoco_menagerie/robotiq_2f85_v4/2f85.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 6,
      "jointNames": [
        "left_driver_joint",
        "left_spring_link_joint",
        "left_follower",
        "right_driver_joint",
        "right_spring_link_joint",
        "right_follower_joint"
      ],
      "actuatorNames": [
        "fingers_actuator"
      ],
      "siteNames": [],
      "hasGripper": true
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 36,
    "name": "robotis_op3",
    "dirName": "robotis_op3",
    "modelPath": "mujoco_menagerie/robotis_op3/op3.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 20,
      "jointNames": [
        "head_pan",
        "head_tilt",
        "l_sho_pitch",
        "l_sho_roll",
        "l_el",
        "r_sho_pitch",
        "r_sho_roll",
        "r_el",
        "l_hip_yaw",
        "l_hip_roll",
        "l_hip_pitch",
        "l_knee",
        "l_ank_pitch",
        "l_ank_roll",
        "r_hip_yaw",
        "r_hip_roll",
        "r_hip_pitch",
        "r_knee",
        "r_ank_pitch",
        "r_ank_roll"
      ],
      "actuatorNames": [
        "head_pan_act",
        "head_tilt_act",
        "l_sho_pitch_act",
        "l_sho_roll_act",
        "l_el_act",
        "r_sho_pitch_act",
        "r_sho_roll_act",
        "r_el_act",
        "l_hip_yaw_act",
        "l_hip_roll_act",
        "l_hip_pitch_act",
        "l_knee_act",
        "l_ank_pitch_act",
        "l_ank_roll_act",
        "r_hip_yaw_act",
        "r_hip_roll_act",
        "r_hip_pitch_act",
        "r_knee_act",
        "r_ank_pitch_act",
        "r_ank_roll_act"
      ],
      "siteNames": [
        "torso"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 37,
    "name": "robotstudio_so101",
    "dirName": "robotstudio_so101",
    "modelPath": "mujoco_menagerie/robotstudio_so101/so101.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 6,
      "jointNames": [
        "shoulder_pan",
        "shoulder_lift",
        "elbow_flex",
        "wrist_flex",
        "wrist_roll",
        "gripper"
      ],
      "actuatorNames": [
        "shoulder_pan",
        "shoulder_lift",
        "elbow_flex",
        "wrist_flex",
        "wrist_roll",
        "gripper"
      ],
      "siteNames": [
        "baseframe",
        "gripperframe"
      ],
      "hasGripper": true
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 38,
    "name": "shadow_dexee",
    "dirName": "shadow_dexee",
    "modelPath": "mujoco_menagerie/shadow_dexee/shadow_dexee.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 12,
      "jointNames": [
        "F0/J0",
        "F0/J1",
        "F0/J2",
        "F0/J3",
        "F1/J0",
        "F1/J1",
        "F1/J2",
        "F1/J3",
        "F2/J0",
        "F2/J1",
        "F2/J2",
        "F2/J3"
      ],
      "actuatorNames": [
        "F0/J0_actuator",
        "F0/J1_actuator",
        "F0/J2_actuator",
        "F0/J3_actuator",
        "F1/J0_actuator",
        "F1/J1_actuator",
        "F1/J2_actuator",
        "F1/J3_actuator",
        "F2/J0_actuator",
        "F2/J1_actuator",
        "F2/J2_actuator",
        "F2/J3_actuator"
      ],
      "siteNames": [
        "tcp",
        "attachment_site",
        "F0/attachment_site",
        "F0/j0_site",
        "F0/j1_site",
        "F0/j2_site",
        "F0/j3_site",
        "F0/fingertip_site",
        "F0/distal_site",
        "F1/attachment_site",
        "F1/j0_site",
        "F1/j1_site",
        "F1/j2_site",
        "F1/j3_site",
        "F1/fingertip_site",
        "F1/distal_site",
        "F2/attachment_site",
        "F2/j0_site",
        "F2/j1_site",
        "F2/j2_site",
        "F2/j3_site",
        "F2/fingertip_site",
        "F2/distal_site"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 39,
    "name": "shadow_hand",
    "dirName": "shadow_hand",
    "modelPath": "mujoco_menagerie/shadow_hand/left_hand.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 24,
      "jointNames": [
        "lh_WRJ2",
        "lh_WRJ1",
        "lh_FFJ4",
        "lh_FFJ3",
        "lh_FFJ2",
        "lh_FFJ1",
        "lh_MFJ4",
        "lh_MFJ3",
        "lh_MFJ2",
        "lh_MFJ1",
        "lh_RFJ4",
        "lh_RFJ3",
        "lh_RFJ2",
        "lh_RFJ1",
        "lh_LFJ5",
        "lh_LFJ4",
        "lh_LFJ3",
        "lh_LFJ2",
        "lh_LFJ1",
        "lh_THJ5",
        "lh_THJ4",
        "lh_THJ3",
        "lh_THJ2",
        "lh_THJ1"
      ],
      "actuatorNames": [
        "lh_A_WRJ2",
        "lh_A_WRJ1",
        "lh_A_THJ5",
        "lh_A_THJ4",
        "lh_A_THJ3",
        "lh_A_THJ2",
        "lh_A_THJ1",
        "lh_A_FFJ4",
        "lh_A_FFJ3",
        "lh_A_FFJ0",
        "lh_A_MFJ4",
        "lh_A_MFJ3",
        "lh_A_MFJ0",
        "lh_A_RFJ4",
        "lh_A_RFJ3",
        "lh_A_RFJ0",
        "lh_A_LFJ5",
        "lh_A_LFJ4",
        "lh_A_LFJ3",
        "lh_A_LFJ0"
      ],
      "siteNames": [],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 40,
    "name": "skydio_x2",
    "dirName": "skydio_x2",
    "modelPath": "mujoco_menagerie/skydio_x2/x2.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 0,
      "jointNames": [],
      "actuatorNames": [
        "thrust1",
        "thrust2",
        "thrust3",
        "thrust4"
      ],
      "siteNames": [
        "imu",
        "thrust1",
        "thrust2",
        "thrust3",
        "thrust4"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 41,
    "name": "stanford_tidybot",
    "dirName": "stanford_tidybot",
    "modelPath": "mujoco_menagerie/stanford_tidybot/base.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 3,
      "jointNames": [
        "joint_x",
        "joint_y",
        "joint_th"
      ],
      "actuatorNames": [
        "joint_x",
        "joint_y",
        "joint_th"
      ],
      "siteNames": [],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 42,
    "name": "tetheria_aero_hand_open",
    "dirName": "tetheria_aero_hand_open",
    "modelPath": "mujoco_menagerie/tetheria_aero_hand_open/left_hand.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 16,
      "jointNames": [
        "left_index_mcp_flex",
        "left_index_pip",
        "left_index_dip",
        "left_middle_mcp_flex",
        "left_middle_pip",
        "left_middle_dip",
        "left_ring_mcp_flex",
        "left_ring_pip",
        "left_ring_dip",
        "left_pinky_mcp_flex",
        "left_pinky_pip",
        "left_pinky_dip",
        "left_thumb_cmc_abd",
        "left_thumb_cmc_flex",
        "left_thumb_mcp",
        "left_thumb_ip"
      ],
      "actuatorNames": [
        "left_index_A_tendon",
        "left_middle_A_tendon",
        "left_ring_A_tendon",
        "left_pinky_A_tendon",
        "left_thumb_A_cmc_abd",
        "left_th1_A_tendon",
        "left_th2_A_tendon"
      ],
      "siteNames": [
        "grasp_site",
        "palm_collision_1",
        "palm_collision_2",
        "palm_collision_3",
        "palm_collision_4",
        "if_f_spring1_s1",
        "if_proximal_tendon0_s0",
        "if_proximal_tendon0_s1",
        "if_proximal_tendon0_s2",
        "if_proximal_tendon0_s3",
        "if_proximal_tendon0_s4",
        "if_proximal_tendon1_s0",
        "if_proximal_tendon1_s1",
        "if_proximal_spring0_s0",
        "if_proximal_spring0_s1",
        "if_proximal_spring1_s0",
        "if_middle_spring0_s0",
        "if_tip",
        "if_dip_tendon0_s0",
        "if_dip_tendon0_s2",
        "if_dip_tendon1_s0",
        "if_dip_tendon1_s1",
        "mf_f_spring1_s1",
        "mf_proximal_tendon0_s0",
        "mf_proximal_tendon0_s1",
        "mf_proximal_tendon0_s2",
        "mf_proximal_tendon0_s3",
        "mf_proximal_tendon0_s4",
        "mf_proximal_tendon1_s0",
        "mf_proximal_tendon1_s1",
        "mf_proximal_spring0_s0",
        "mf_proximal_spring0_s1",
        "mf_proximal_spring1_s0",
        "mf_middle_spring0_s0",
        "mf_tip",
        "mf_dip_tendon0_s0",
        "mf_dip_tendon0_s2",
        "mf_dip_tendon1_s0",
        "mf_dip_tendon1_s1",
        "rf_f_spring1_s1",
        "rf_proximal_tendon0_s0",
        "rf_proximal_tendon0_s1",
        "rf_proximal_tendon0_s2",
        "rf_proximal_tendon0_s3",
        "rf_proximal_tendon0_s4",
        "rf_proximal_tendon1_s0",
        "rf_proximal_tendon1_s1",
        "rf_proximal_spring0_s0",
        "rf_proximal_spring0_s1",
        "rf_proximal_spring1_s0",
        "rf_middle_spring0_s0",
        "rf_tip",
        "rf_dip_tendon0_s0",
        "rf_dip_tendon0_s2",
        "rf_dip_tendon1_s0",
        "rf_dip_tendon1_s1",
        "pf_f_spring1_s1",
        "pf_proximal_tendon0_s0",
        "pf_proximal_tendon0_s1",
        "pf_proximal_tendon0_s2",
        "pf_proximal_tendon0_s3",
        "pf_proximal_tendon0_s4",
        "pf_proximal_tendon1_s0",
        "pf_proximal_tendon1_s1",
        "pf_proximal_spring0_s0",
        "pf_proximal_spring0_s1",
        "pf_proximal_spring1_s0",
        "pf_middle_spring0_s0",
        "pf_tip",
        "pf_dip_tendon0_s0",
        "pf_dip_tendon0_s2",
        "pf_dip_tendon1_s0",
        "pf_dip_tendon1_s1",
        "th_t_tendon0_s0",
        "th_t_tendon0_s1",
        "th_t_tendon0_s2",
        "th_t_tendon0_s3",
        "th_t_tendon1_s0",
        "th_t_tendon1_s1",
        "th_t_tendon1_s2",
        "th_t_tendon1_s3",
        "th_t_spring0_s0",
        "th_mcp_tendon0_s0",
        "th_mcp_tendon1_s0",
        "th_mcp_spring0_s0",
        "th_mcp_spring1_s0",
        "th_proximal_spring1_s0",
        "th_proximal_spring1_s1",
        "th_tip",
        "th_tendon1_ip_s0",
        "th_tendon1_ip_s1"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 43,
    "name": "toddlerbot_2xc",
    "dirName": "toddlerbot_2xc",
    "modelPath": "mujoco_menagerie/toddlerbot_2xc/toddlerbot_2xc.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 44,
      "jointNames": [
        "neck_yaw_drive",
        "neck_yaw_driven",
        "neck_pitch",
        "neck_pitch_act",
        "neck_pitch_front",
        "neck_pitch_back",
        "waist_yaw",
        "waist_roll",
        "waist_act_1",
        "waist_act_2",
        "left_hip_pitch",
        "left_hip_roll",
        "left_hip_yaw_driven",
        "left_hip_yaw_drive",
        "left_knee",
        "left_ankle_pitch",
        "left_ankle_roll",
        "right_hip_pitch",
        "right_hip_roll",
        "right_hip_yaw_driven",
        "right_hip_yaw_drive",
        "right_knee",
        "right_ankle_pitch",
        "right_ankle_roll",
        "left_shoulder_pitch",
        "left_shoulder_roll",
        "left_shoulder_yaw_drive",
        "left_shoulder_yaw_driven",
        "left_elbow_roll",
        "left_elbow_yaw_drive",
        "left_elbow_yaw_driven",
        "left_wrist_pitch_driven",
        "left_wrist_pitch_drive",
        "left_wrist_roll",
        "right_shoulder_pitch",
        "right_shoulder_roll",
        "right_shoulder_yaw_drive",
        "right_shoulder_yaw_driven",
        "right_elbow_roll",
        "right_elbow_yaw_drive",
        "right_elbow_yaw_driven",
        "right_wrist_pitch_driven",
        "right_wrist_pitch_drive",
        "right_wrist_roll"
      ],
      "actuatorNames": [
        "neck_yaw_drive",
        "neck_pitch_act",
        "waist_act_1",
        "waist_act_2",
        "left_hip_pitch",
        "left_hip_roll",
        "left_hip_yaw_drive",
        "left_knee",
        "left_ankle_roll",
        "left_ankle_pitch",
        "right_hip_pitch",
        "right_hip_roll",
        "right_hip_yaw_drive",
        "right_knee",
        "right_ankle_roll",
        "right_ankle_pitch",
        "left_shoulder_pitch",
        "left_shoulder_roll",
        "left_shoulder_yaw_drive",
        "left_elbow_roll",
        "left_elbow_yaw_drive",
        "left_wrist_pitch_drive",
        "left_wrist_roll",
        "right_shoulder_pitch",
        "right_shoulder_roll",
        "right_shoulder_yaw_drive",
        "right_elbow_roll",
        "right_elbow_yaw_drive",
        "right_wrist_pitch_drive",
        "right_wrist_roll"
      ],
      "siteNames": [
        "closing_neck_pitch_front_2",
        "closing_neck_pitch_front_2_z",
        "closing_neck_pitch_back_2",
        "closing_neck_pitch_back_2_z",
        "closing_neck_pitch_front_1",
        "closing_neck_pitch_front_1_z",
        "closing_neck_pitch_back_1",
        "closing_neck_pitch_back_1_z",
        "left_foot_center",
        "right_foot_center",
        "left_hand_center",
        "right_hand_center"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 44,
    "name": "toddlerbot_2xm",
    "dirName": "toddlerbot_2xm",
    "modelPath": "mujoco_menagerie/toddlerbot_2xm/toddlerbot_2xm.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 44,
      "jointNames": [
        "neck_yaw_drive",
        "neck_yaw_driven",
        "neck_pitch",
        "neck_pitch_act",
        "neck_pitch_front",
        "neck_pitch_back",
        "waist_yaw",
        "waist_roll",
        "waist_act_1",
        "waist_act_2",
        "left_hip_pitch",
        "left_hip_roll",
        "left_hip_yaw_driven",
        "left_hip_yaw_drive",
        "left_knee",
        "left_ankle_pitch",
        "left_ankle_roll",
        "right_hip_pitch",
        "right_hip_roll",
        "right_hip_yaw_driven",
        "right_hip_yaw_drive",
        "right_knee",
        "right_ankle_pitch",
        "right_ankle_roll",
        "left_shoulder_pitch",
        "left_shoulder_roll",
        "left_shoulder_yaw_drive",
        "left_shoulder_yaw_driven",
        "left_elbow_roll",
        "left_elbow_yaw_drive",
        "left_elbow_yaw_driven",
        "left_wrist_pitch_driven",
        "left_wrist_pitch_drive",
        "left_wrist_roll",
        "right_shoulder_pitch",
        "right_shoulder_roll",
        "right_shoulder_yaw_drive",
        "right_shoulder_yaw_driven",
        "right_elbow_roll",
        "right_elbow_yaw_drive",
        "right_elbow_yaw_driven",
        "right_wrist_pitch_driven",
        "right_wrist_pitch_drive",
        "right_wrist_roll"
      ],
      "actuatorNames": [
        "neck_yaw_drive",
        "neck_pitch_act",
        "waist_act_1",
        "waist_act_2",
        "left_hip_pitch",
        "left_hip_roll",
        "left_hip_yaw_drive",
        "left_knee",
        "left_ankle_roll",
        "left_ankle_pitch",
        "right_hip_pitch",
        "right_hip_roll",
        "right_hip_yaw_drive",
        "right_knee",
        "right_ankle_roll",
        "right_ankle_pitch",
        "left_shoulder_pitch",
        "left_shoulder_roll",
        "left_shoulder_yaw_drive",
        "left_elbow_roll",
        "left_elbow_yaw_drive",
        "left_wrist_pitch_drive",
        "left_wrist_roll",
        "right_shoulder_pitch",
        "right_shoulder_roll",
        "right_shoulder_yaw_drive",
        "right_elbow_roll",
        "right_elbow_yaw_drive",
        "right_wrist_pitch_drive",
        "right_wrist_roll"
      ],
      "siteNames": [
        "closing_neck_pitch_front_2",
        "closing_neck_pitch_front_2_z",
        "closing_neck_pitch_back_2",
        "closing_neck_pitch_back_2_z",
        "closing_neck_pitch_front_1",
        "closing_neck_pitch_front_1_z",
        "closing_neck_pitch_back_1",
        "closing_neck_pitch_back_1_z",
        "left_foot_center",
        "right_foot_center",
        "left_hand_center",
        "right_hand_center"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 45,
    "name": "trossen_vx300s",
    "dirName": "trossen_vx300s",
    "modelPath": "mujoco_menagerie/trossen_vx300s/vx300s.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 8,
      "jointNames": [
        "waist",
        "shoulder",
        "elbow",
        "forearm_roll",
        "wrist_angle",
        "wrist_rotate",
        "left_finger",
        "right_finger"
      ],
      "actuatorNames": [
        "waist",
        "shoulder",
        "elbow",
        "forearm_roll",
        "wrist_angle",
        "wrist_rotate",
        "gripper"
      ],
      "siteNames": [
        "pinch"
      ],
      "hasGripper": true
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 46,
    "name": "trossen_wx250s",
    "dirName": "trossen_wx250s",
    "modelPath": "mujoco_menagerie/trossen_wx250s/wx250s.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 8,
      "jointNames": [
        "waist",
        "shoulder",
        "elbow",
        "forearm_roll",
        "wrist_angle",
        "wrist_rotate",
        "left_finger",
        "right_finger"
      ],
      "actuatorNames": [
        "waist",
        "shoulder",
        "elbow",
        "forearm_roll",
        "wrist_angle",
        "wrist_rotate",
        "gripper"
      ],
      "siteNames": [],
      "hasGripper": true
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 47,
    "name": "trossen_wxai",
    "dirName": "trossen_wxai",
    "modelPath": "mujoco_menagerie/trossen_wxai/trossen_ai_bimanual.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 16,
      "jointNames": [
        "left/joint_0",
        "left/joint_1",
        "left/joint_2",
        "left/joint_3",
        "left/joint_4",
        "left/joint_5",
        "left/right_carriage_joint",
        "left/left_carriage_joint",
        "right/joint_0",
        "right/joint_1",
        "right/joint_2",
        "right/joint_3",
        "right/joint_4",
        "right/joint_5",
        "right/right_carriage_joint",
        "right/left_carriage_joint"
      ],
      "actuatorNames": [
        "left/joint_0",
        "left/joint_1",
        "left/joint_2",
        "left/joint_3",
        "left/joint_4",
        "left/joint_5",
        "left/joint_gl",
        "left/joint_gr",
        "right/joint_0",
        "right/joint_1",
        "right/joint_2",
        "right/joint_3",
        "right/joint_4",
        "right/joint_5",
        "right/joint_gl",
        "right/joint_gr"
      ],
      "siteNames": [
        "left/carriage_site",
        "right/carriage_site"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 48,
    "name": "trs_so_arm100",
    "dirName": "trs_so_arm100",
    "modelPath": "mujoco_menagerie/trs_so_arm100/so_arm100.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 6,
      "jointNames": [
        "Rotation",
        "Pitch",
        "Elbow",
        "Wrist_Pitch",
        "Wrist_Roll",
        "Jaw"
      ],
      "actuatorNames": [
        "Rotation",
        "Pitch",
        "Elbow",
        "Wrist_Pitch",
        "Wrist_Roll",
        "Jaw"
      ],
      "siteNames": [],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 49,
    "name": "ufactory_lite6",
    "dirName": "ufactory_lite6",
    "modelPath": "mujoco_menagerie/ufactory_lite6/lite6.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 6,
      "jointNames": [
        "joint1",
        "joint2",
        "joint3",
        "joint4",
        "joint5",
        "joint6"
      ],
      "actuatorNames": [],
      "siteNames": [
        "attachment_site"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 50,
    "name": "ufactory_xarm7",
    "dirName": "ufactory_xarm7",
    "modelPath": "mujoco_menagerie/ufactory_xarm7/hand.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 6,
      "jointNames": [
        "left_driver_joint",
        "left_finger_joint",
        "left_inner_knuckle_joint",
        "right_driver_joint",
        "right_finger_joint",
        "right_inner_knuckle_joint"
      ],
      "actuatorNames": [
        "fingers_actuator"
      ],
      "siteNames": [],
      "hasGripper": true
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 51,
    "name": "umi_gripper",
    "dirName": "umi_gripper",
    "modelPath": "mujoco_menagerie/umi_gripper/umi_gripper.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 8,
      "jointNames": [
        "gripper_joint_x",
        "gripper_joint_y",
        "gripper_joint_z",
        "gripper_joint_rx",
        "gripper_joint_ry",
        "gripper_joint_rz",
        "left_finger_joint",
        "right_finger_joint"
      ],
      "actuatorNames": [
        "fingers_actuator",
        "gripper_joint_x_act",
        "gripper_joint_y_act",
        "gripper_joint_z_act",
        "gripper_joint_rx_act",
        "gripper_joint_ry_act",
        "gripper_joint_rz_act"
      ],
      "siteNames": [],
      "hasGripper": true
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 52,
    "name": "unitree_a1",
    "dirName": "unitree_a1",
    "modelPath": "mujoco_menagerie/unitree_a1/a1.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 12,
      "jointNames": [
        "FR_hip_joint",
        "FR_thigh_joint",
        "FR_calf_joint",
        "FL_hip_joint",
        "FL_thigh_joint",
        "FL_calf_joint",
        "RR_hip_joint",
        "RR_thigh_joint",
        "RR_calf_joint",
        "RL_hip_joint",
        "RL_thigh_joint",
        "RL_calf_joint"
      ],
      "actuatorNames": [
        "FR_hip",
        "FR_thigh",
        "FR_calf",
        "FL_hip",
        "FL_thigh",
        "FL_calf",
        "RR_hip",
        "RR_thigh",
        "RR_calf",
        "RL_hip",
        "RL_thigh",
        "RL_calf"
      ],
      "siteNames": [],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 53,
    "name": "unitree_g1",
    "dirName": "unitree_g1",
    "modelPath": "mujoco_menagerie/unitree_g1/g1.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 29,
      "jointNames": [
        "left_hip_pitch_joint",
        "left_hip_roll_joint",
        "left_hip_yaw_joint",
        "left_knee_joint",
        "left_ankle_pitch_joint",
        "left_ankle_roll_joint",
        "right_hip_pitch_joint",
        "right_hip_roll_joint",
        "right_hip_yaw_joint",
        "right_knee_joint",
        "right_ankle_pitch_joint",
        "right_ankle_roll_joint",
        "waist_yaw_joint",
        "waist_roll_joint",
        "waist_pitch_joint",
        "left_shoulder_pitch_joint",
        "left_shoulder_roll_joint",
        "left_shoulder_yaw_joint",
        "left_elbow_joint",
        "left_wrist_roll_joint",
        "left_wrist_pitch_joint",
        "left_wrist_yaw_joint",
        "right_shoulder_pitch_joint",
        "right_shoulder_roll_joint",
        "right_shoulder_yaw_joint",
        "right_elbow_joint",
        "right_wrist_roll_joint",
        "right_wrist_pitch_joint",
        "right_wrist_yaw_joint"
      ],
      "actuatorNames": [
        "left_hip_pitch_joint",
        "left_hip_roll_joint",
        "left_hip_yaw_joint",
        "left_knee_joint",
        "left_ankle_pitch_joint",
        "left_ankle_roll_joint",
        "right_hip_pitch_joint",
        "right_hip_roll_joint",
        "right_hip_yaw_joint",
        "right_knee_joint",
        "right_ankle_pitch_joint",
        "right_ankle_roll_joint",
        "waist_yaw_joint",
        "waist_roll_joint",
        "waist_pitch_joint",
        "left_shoulder_pitch_joint",
        "left_shoulder_roll_joint",
        "left_shoulder_yaw_joint",
        "left_elbow_joint",
        "left_wrist_roll_joint",
        "left_wrist_pitch_joint",
        "left_wrist_yaw_joint",
        "right_shoulder_pitch_joint",
        "right_shoulder_roll_joint",
        "right_shoulder_yaw_joint",
        "right_elbow_joint",
        "right_wrist_roll_joint",
        "right_wrist_pitch_joint",
        "right_wrist_yaw_joint"
      ],
      "siteNames": [
        "imu_in_pelvis",
        "left_foot",
        "right_foot",
        "imu_in_torso"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated",
      "real"
    ]
  },
  {
    "id": 54,
    "name": "unitree_go1",
    "dirName": "unitree_go1",
    "modelPath": "mujoco_menagerie/unitree_go1/go1.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 12,
      "jointNames": [
        "FR_hip_joint",
        "FR_thigh_joint",
        "FR_calf_joint",
        "FL_hip_joint",
        "FL_thigh_joint",
        "FL_calf_joint",
        "RR_hip_joint",
        "RR_thigh_joint",
        "RR_calf_joint",
        "RL_hip_joint",
        "RL_thigh_joint",
        "RL_calf_joint"
      ],
      "actuatorNames": [
        "FR_hip",
        "FR_thigh",
        "FR_calf",
        "FL_hip",
        "FL_thigh",
        "FL_calf",
        "RR_hip",
        "RR_thigh",
        "RR_calf",
        "RL_hip",
        "RL_thigh",
        "RL_calf"
      ],
      "siteNames": [
        "head",
        "imu",
        "FR",
        "FL",
        "RR",
        "RL"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 55,
    "name": "unitree_go2",
    "dirName": "unitree_go2",
    "modelPath": "mujoco_menagerie/unitree_go2/go2.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 12,
      "jointNames": [
        "FL_hip_joint",
        "FL_thigh_joint",
        "FL_calf_joint",
        "FR_hip_joint",
        "FR_thigh_joint",
        "FR_calf_joint",
        "RL_hip_joint",
        "RL_thigh_joint",
        "RL_calf_joint",
        "RR_hip_joint",
        "RR_thigh_joint",
        "RR_calf_joint"
      ],
      "actuatorNames": [
        "FL_hip",
        "FL_thigh",
        "FL_calf",
        "FR_hip",
        "FR_thigh",
        "FR_calf",
        "RL_hip",
        "RL_thigh",
        "RL_calf",
        "RR_hip",
        "RR_thigh",
        "RR_calf"
      ],
      "siteNames": [
        "imu"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 56,
    "name": "unitree_h1",
    "dirName": "unitree_h1",
    "modelPath": "mujoco_menagerie/unitree_h1/h1.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 19,
      "jointNames": [
        "left_hip_yaw",
        "left_hip_roll",
        "left_hip_pitch",
        "left_knee",
        "left_ankle",
        "right_hip_yaw",
        "right_hip_roll",
        "right_hip_pitch",
        "right_knee",
        "right_ankle",
        "torso",
        "left_shoulder_pitch",
        "left_shoulder_roll",
        "left_shoulder_yaw",
        "left_elbow",
        "right_shoulder_pitch",
        "right_shoulder_roll",
        "right_shoulder_yaw",
        "right_elbow"
      ],
      "actuatorNames": [
        "left_hip_yaw",
        "left_hip_roll",
        "left_hip_pitch",
        "left_knee",
        "left_ankle",
        "right_hip_yaw",
        "right_hip_roll",
        "right_hip_pitch",
        "right_knee",
        "right_ankle",
        "torso",
        "left_shoulder_pitch",
        "left_shoulder_roll",
        "left_shoulder_yaw",
        "left_elbow",
        "right_shoulder_pitch",
        "right_shoulder_roll",
        "right_shoulder_yaw",
        "right_elbow"
      ],
      "siteNames": [
        "imu"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 57,
    "name": "unitree_z1",
    "dirName": "unitree_z1",
    "modelPath": "mujoco_menagerie/unitree_z1/z1.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 6,
      "jointNames": [
        "joint1",
        "joint2",
        "joint3",
        "joint4",
        "joint5",
        "joint6"
      ],
      "actuatorNames": [
        "motor1",
        "motor2",
        "motor3",
        "motor4",
        "motor5",
        "motor6"
      ],
      "siteNames": [],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 58,
    "name": "universal_robots_ur10e",
    "dirName": "universal_robots_ur10e",
    "modelPath": "mujoco_menagerie/universal_robots_ur10e/ur10e.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 6,
      "jointNames": [
        "shoulder_pan_joint",
        "shoulder_lift_joint",
        "elbow_joint",
        "wrist_1_joint",
        "wrist_2_joint",
        "wrist_3_joint"
      ],
      "actuatorNames": [
        "shoulder_pan",
        "shoulder_lift",
        "elbow",
        "wrist_1",
        "wrist_2",
        "wrist_3"
      ],
      "siteNames": [
        "attachment_site"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 59,
    "name": "universal_robots_ur5e",
    "dirName": "universal_robots_ur5e",
    "modelPath": "mujoco_menagerie/universal_robots_ur5e/ur5e.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 6,
      "jointNames": [
        "shoulder_pan_joint",
        "shoulder_lift_joint",
        "elbow_joint",
        "wrist_1_joint",
        "wrist_2_joint",
        "wrist_3_joint"
      ],
      "actuatorNames": [
        "shoulder_pan",
        "shoulder_lift",
        "elbow",
        "wrist_1",
        "wrist_2",
        "wrist_3"
      ],
      "siteNames": [
        "attachment_site"
      ],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 60,
    "name": "wonik_allegro",
    "dirName": "wonik_allegro",
    "modelPath": "mujoco_menagerie/wonik_allegro/left_hand.xml",
    "modelFormat": "mjcf",
    "properties": {
      "numJoints": 16,
      "jointNames": [
        "rfj0",
        "rfj1",
        "rfj2",
        "rfj3",
        "mfj0",
        "mfj1",
        "mfj2",
        "mfj3",
        "ffj0",
        "ffj1",
        "ffj2",
        "ffj3",
        "thj0",
        "thj1",
        "thj2",
        "thj3"
      ],
      "actuatorNames": [
        "ffa0",
        "ffa1",
        "ffa2",
        "ffa3",
        "mfa0",
        "mfa1",
        "mfa2",
        "mfa3",
        "rfa0",
        "rfa1",
        "rfa2",
        "rfa3",
        "tha0",
        "tha1",
        "tha2",
        "tha3"
      ],
      "siteNames": [],
      "hasGripper": false
    },
    "supportedModalities": [
      "simulated"
    ]
  },
  {
    "id": 61,
    "name": "bi_openarm_follower",
    "dirName": "bi_openarm_follower",
    "supportedModalities": [
      "simulated",
      "real"
    ]
  },
  {
    "id": 62,
    "name": "bi_so_follower",
    "dirName": "bi_so_follower",
    "supportedModalities": [
      "simulated",
      "real"
    ]
  },
  {
    "id": 63,
    "name": "earthrover_mini_plus",
    "dirName": "earthrover_mini_plus",
    "supportedModalities": [
      "real"
    ]
  },
  {
    "id": 64,
    "name": "hope_jr",
    "dirName": "hope_jr",
    "supportedModalities": [
      "real"
    ]
  },
  {
    "id": 65,
    "name": "koch_follower",
    "dirName": "koch_follower",
    "supportedModalities": [
      "real"
    ]
  },
  {
    "id": 66,
    "name": "lekiwi",
    "dirName": "lekiwi",
    "supportedModalities": [
      "real"
    ]
  },
  {
    "id": 67,
    "name": "omx_follower",
    "dirName": "omx_follower",
    "supportedModalities": [
      "real"
    ]
  },
  {
    "id": 68,
    "name": "reachy2",
    "dirName": "reachy2",
    "supportedModalities": [
      "real"
    ]
  }
];
const robotsData = [
  {
    "id": 1,
    "name": "agilex_piper",
    "modality": "simulated",
    "robotModelId": 1,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 2,
    "name": "agility_cassie",
    "modality": "simulated",
    "robotModelId": 2,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 3,
    "name": "aloha",
    "modality": "simulated",
    "robotModelId": 3,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 4,
    "name": "anybotics_anymal_b",
    "modality": "simulated",
    "robotModelId": 4,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 5,
    "name": "anybotics_anymal_c",
    "modality": "simulated",
    "robotModelId": 5,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 6,
    "name": "apptronik_apollo",
    "modality": "simulated",
    "robotModelId": 6,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 7,
    "name": "arx_l5",
    "modality": "simulated",
    "robotModelId": 7,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 8,
    "name": "berkeley_humanoid",
    "modality": "simulated",
    "robotModelId": 8,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 9,
    "name": "bitcraze_crazyflie_2",
    "modality": "simulated",
    "robotModelId": 9,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 10,
    "name": "booster_t1",
    "modality": "simulated",
    "robotModelId": 10,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 11,
    "name": "boston_dynamics_spot",
    "modality": "simulated",
    "robotModelId": 11,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 12,
    "name": "dynamixel_2r",
    "modality": "simulated",
    "robotModelId": 12,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 13,
    "name": "flybody",
    "modality": "simulated",
    "robotModelId": 13,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 14,
    "name": "fourier_n1",
    "modality": "simulated",
    "robotModelId": 14,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 15,
    "name": "franka_emika_panda",
    "modality": "simulated",
    "robotModelId": 15,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 16,
    "name": "franka_fr3",
    "modality": "simulated",
    "robotModelId": 16,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 17,
    "name": "franka_fr3_v2",
    "modality": "simulated",
    "robotModelId": 17,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 18,
    "name": "google_barkour_v0",
    "modality": "simulated",
    "robotModelId": 18,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 19,
    "name": "google_barkour_vb",
    "modality": "simulated",
    "robotModelId": 19,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 20,
    "name": "google_robot",
    "modality": "simulated",
    "robotModelId": 20,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 21,
    "name": "hello_robot_stretch",
    "modality": "simulated",
    "robotModelId": 21,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 22,
    "name": "hello_robot_stretch_3",
    "modality": "simulated",
    "robotModelId": 22,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 23,
    "name": "i2rt_yam",
    "modality": "simulated",
    "robotModelId": 23,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 24,
    "name": "kinova_gen3",
    "modality": "simulated",
    "robotModelId": 24,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 25,
    "name": "kuka_iiwa_14",
    "modality": "simulated",
    "robotModelId": 25,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 26,
    "name": "leap_hand",
    "modality": "simulated",
    "robotModelId": 26,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 27,
    "name": "low_cost_robot_arm",
    "modality": "simulated",
    "robotModelId": 27,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 28,
    "name": "pal_talos",
    "modality": "simulated",
    "robotModelId": 28,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 29,
    "name": "pal_tiago",
    "modality": "simulated",
    "robotModelId": 29,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 30,
    "name": "pal_tiago_dual",
    "modality": "simulated",
    "robotModelId": 30,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 31,
    "name": "pndbotics_adam_lite",
    "modality": "simulated",
    "robotModelId": 31,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 32,
    "name": "rethink_robotics_sawyer",
    "modality": "simulated",
    "robotModelId": 32,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 33,
    "name": "robot_soccer_kit",
    "modality": "simulated",
    "robotModelId": 33,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 34,
    "name": "robotiq_2f85",
    "modality": "simulated",
    "robotModelId": 34,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 35,
    "name": "robotiq_2f85_v4",
    "modality": "simulated",
    "robotModelId": 35,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 36,
    "name": "robotis_op3",
    "modality": "simulated",
    "robotModelId": 36,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 37,
    "name": "robotstudio_so101",
    "modality": "simulated",
    "robotModelId": 37,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 38,
    "name": "shadow_dexee",
    "modality": "simulated",
    "robotModelId": 38,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 39,
    "name": "shadow_hand",
    "modality": "simulated",
    "robotModelId": 39,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 40,
    "name": "skydio_x2",
    "modality": "simulated",
    "robotModelId": 40,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 41,
    "name": "stanford_tidybot",
    "modality": "simulated",
    "robotModelId": 41,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 42,
    "name": "tetheria_aero_hand_open",
    "modality": "simulated",
    "robotModelId": 42,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 43,
    "name": "toddlerbot_2xc",
    "modality": "simulated",
    "robotModelId": 43,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 44,
    "name": "toddlerbot_2xm",
    "modality": "simulated",
    "robotModelId": 44,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 45,
    "name": "trossen_vx300s",
    "modality": "simulated",
    "robotModelId": 45,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 46,
    "name": "trossen_wx250s",
    "modality": "simulated",
    "robotModelId": 46,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 47,
    "name": "trossen_wxai",
    "modality": "simulated",
    "robotModelId": 47,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 48,
    "name": "trs_so_arm100",
    "modality": "simulated",
    "robotModelId": 48,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 49,
    "name": "ufactory_lite6",
    "modality": "simulated",
    "robotModelId": 49,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 50,
    "name": "ufactory_xarm7",
    "modality": "simulated",
    "robotModelId": 50,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 51,
    "name": "umi_gripper",
    "modality": "simulated",
    "robotModelId": 51,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 52,
    "name": "unitree_a1",
    "modality": "simulated",
    "robotModelId": 52,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 53,
    "name": "unitree_g1",
    "modality": "simulated",
    "robotModelId": 53,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 54,
    "name": "unitree_go1",
    "modality": "simulated",
    "robotModelId": 54,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 55,
    "name": "unitree_go2",
    "modality": "simulated",
    "robotModelId": 55,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 56,
    "name": "unitree_h1",
    "modality": "simulated",
    "robotModelId": 56,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 57,
    "name": "unitree_z1",
    "modality": "simulated",
    "robotModelId": 57,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 58,
    "name": "universal_robots_ur10e",
    "modality": "simulated",
    "robotModelId": 58,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 59,
    "name": "universal_robots_ur5e",
    "modality": "simulated",
    "robotModelId": 59,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 60,
    "name": "wonik_allegro",
    "modality": "simulated",
    "robotModelId": 60,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 61,
    "name": "bi_openarm_follower",
    "modality": "simulated",
    "robotModelId": 61,
    "data": {
      "type": "simulation"
    }
  },
  {
    "id": 62,
    "name": "bi_so_follower",
    "modality": "simulated",
    "robotModelId": 62,
    "data": {
      "type": "simulation"
    }
  }
];
const scenesData = [
  {
    "id": 1,
    "name": "piper_scene",
    "sceneXmlPath": "mujoco_menagerie/agilex_piper/scene.xml"
  },
  {
    "id": 2,
    "name": "cassie scene",
    "sceneXmlPath": "mujoco_menagerie/agility_cassie/scene.xml"
  },
  {
    "id": 3,
    "name": "aloha_scene",
    "sceneXmlPath": "mujoco_menagerie/aloha/scene.xml"
  },
  {
    "id": 4,
    "name": "anymal_b scene",
    "sceneXmlPath": "mujoco_menagerie/anybotics_anymal_b/scene.xml"
  },
  {
    "id": 5,
    "name": "anymal_c scene",
    "sceneXmlPath": "mujoco_menagerie/anybotics_anymal_c/scene.xml"
  },
  {
    "id": 6,
    "name": "anymal_c scene",
    "sceneXmlPath": "mujoco_menagerie/anybotics_anymal_c/scene_mjx.xml"
  },
  {
    "id": 7,
    "name": "apptronik_apollo scene",
    "sceneXmlPath": "mujoco_menagerie/apptronik_apollo/scene.xml"
  },
  {
    "id": 8,
    "name": "ARX L5 scene",
    "sceneXmlPath": "mujoco_menagerie/arx_l5/scene.xml"
  },
  {
    "id": 9,
    "name": "berkeley humanoid scene",
    "sceneXmlPath": "mujoco_menagerie/berkeley_humanoid/scene.xml"
  },
  {
    "id": 10,
    "name": "CF2 scene",
    "sceneXmlPath": "mujoco_menagerie/bitcraze_crazyflie_2/scene.xml"
  },
  {
    "id": 11,
    "name": "t1 scene",
    "sceneXmlPath": "mujoco_menagerie/booster_t1/scene.xml"
  },
  {
    "id": 12,
    "name": "spot scene",
    "sceneXmlPath": "mujoco_menagerie/boston_dynamics_spot/scene.xml"
  },
  {
    "id": 13,
    "name": "spot with arm scene",
    "sceneXmlPath": "mujoco_menagerie/boston_dynamics_spot/scene_arm.xml"
  },
  {
    "id": 14,
    "name": "scene",
    "sceneXmlPath": "mujoco_menagerie/dynamixel_2r/scene.xml"
  },
  {
    "id": 15,
    "name": "fruitfly scene",
    "sceneXmlPath": "mujoco_menagerie/flybody/scene.xml"
  },
  {
    "id": 16,
    "name": "N1 scene",
    "sceneXmlPath": "mujoco_menagerie/fourier_n1/scene.xml"
  },
  {
    "id": 17,
    "name": "panda scene",
    "sceneXmlPath": "mujoco_menagerie/franka_emika_panda/mjx_scene.xml"
  },
  {
    "id": 18,
    "name": "panda scene",
    "sceneXmlPath": "mujoco_menagerie/franka_emika_panda/mjx_single_cube.xml"
  },
  {
    "id": 19,
    "name": "panda scene",
    "sceneXmlPath": "mujoco_menagerie/franka_emika_panda/scene.xml"
  },
  {
    "id": 20,
    "name": "fr3 scene",
    "sceneXmlPath": "mujoco_menagerie/franka_fr3/scene.xml"
  },
  {
    "id": 21,
    "name": "fr3v2 scene",
    "sceneXmlPath": "mujoco_menagerie/franka_fr3_v2/scene.xml"
  },
  {
    "id": 22,
    "name": "barkour v0 scene",
    "sceneXmlPath": "mujoco_menagerie/google_barkour_v0/scene.xml"
  },
  {
    "id": 23,
    "name": "barkour scene with obstacles",
    "sceneXmlPath": "mujoco_menagerie/google_barkour_v0/scene_barkour.xml"
  },
  {
    "id": 24,
    "name": "barkour v0 scene",
    "sceneXmlPath": "mujoco_menagerie/google_barkour_v0/scene_mjx.xml"
  },
  {
    "id": 25,
    "name": "barkour vB scene",
    "sceneXmlPath": "mujoco_menagerie/google_barkour_vb/scene.xml"
  },
  {
    "id": 26,
    "name": "barkour vB scene",
    "sceneXmlPath": "mujoco_menagerie/google_barkour_vb/scene_hfield_mjx.xml"
  },
  {
    "id": 27,
    "name": "barkour vB scene",
    "sceneXmlPath": "mujoco_menagerie/google_barkour_vb/scene_mjx.xml"
  },
  {
    "id": 28,
    "name": "robot scene",
    "sceneXmlPath": "mujoco_menagerie/google_robot/scene.xml"
  },
  {
    "id": 29,
    "name": "stretch scene",
    "sceneXmlPath": "mujoco_menagerie/hello_robot_stretch/scene.xml"
  },
  {
    "id": 30,
    "name": "stretch scene",
    "sceneXmlPath": "mujoco_menagerie/hello_robot_stretch_3/scene.xml"
  },
  {
    "id": 31,
    "name": "yam scene",
    "sceneXmlPath": "mujoco_menagerie/i2rt_yam/scene.xml"
  },
  {
    "id": 32,
    "name": "softfoot scene",
    "sceneXmlPath": "mujoco_menagerie/iit_softfoot/scene.xml"
  },
  {
    "id": 33,
    "name": "gen3 scene",
    "sceneXmlPath": "mujoco_menagerie/kinova_gen3/scene.xml"
  },
  {
    "id": 34,
    "name": "iiwa14 scene",
    "sceneXmlPath": "mujoco_menagerie/kuka_iiwa_14/scene.xml"
  },
  {
    "id": 35,
    "name": "left leap hand scene",
    "sceneXmlPath": "mujoco_menagerie/leap_hand/scene_left.xml"
  },
  {
    "id": 36,
    "name": "right leap hand scene",
    "sceneXmlPath": "mujoco_menagerie/leap_hand/scene_right.xml"
  },
  {
    "id": 37,
    "name": "low_cost_robot scene",
    "sceneXmlPath": "mujoco_menagerie/low_cost_robot_arm/scene.xml"
  },
  {
    "id": 38,
    "name": "talos motor scene",
    "sceneXmlPath": "mujoco_menagerie/pal_talos/scene_motor.xml"
  },
  {
    "id": 39,
    "name": "talos position scene",
    "sceneXmlPath": "mujoco_menagerie/pal_talos/scene_position.xml"
  },
  {
    "id": 40,
    "name": "tiago motor scene",
    "sceneXmlPath": "mujoco_menagerie/pal_tiago/scene_motor.xml"
  },
  {
    "id": 41,
    "name": "tiago position scene",
    "sceneXmlPath": "mujoco_menagerie/pal_tiago/scene_position.xml"
  },
  {
    "id": 42,
    "name": "tiago velocity scene",
    "sceneXmlPath": "mujoco_menagerie/pal_tiago/scene_velocity.xml"
  },
  {
    "id": 43,
    "name": "tiago dual motor scene",
    "sceneXmlPath": "mujoco_menagerie/pal_tiago_dual/scene_motor.xml"
  },
  {
    "id": 44,
    "name": "tiago dual position scene",
    "sceneXmlPath": "mujoco_menagerie/pal_tiago_dual/scene_position.xml"
  },
  {
    "id": 45,
    "name": "tiago dual velocity scene",
    "sceneXmlPath": "mujoco_menagerie/pal_tiago_dual/scene_velocity.xml"
  },
  {
    "id": 46,
    "name": "adam_lite scene",
    "sceneXmlPath": "mujoco_menagerie/pndbotics_adam_lite/scene.xml"
  },
  {
    "id": 47,
    "name": "sawyer scene",
    "sceneXmlPath": "mujoco_menagerie/rethink_robotics_sawyer/scene.xml"
  },
  {
    "id": 48,
    "name": "scene",
    "sceneXmlPath": "mujoco_menagerie/robot_soccer_kit/scene.xml"
  },
  {
    "id": 49,
    "name": "2f85 scene",
    "sceneXmlPath": "mujoco_menagerie/robotiq_2f85/scene.xml"
  },
  {
    "id": 50,
    "name": "2f85 scene",
    "sceneXmlPath": "mujoco_menagerie/robotiq_2f85_v4/scene.xml"
  },
  {
    "id": 51,
    "name": "op3 scene",
    "sceneXmlPath": "mujoco_menagerie/robotis_op3/scene.xml"
  },
  {
    "id": 52,
    "name": "scene",
    "sceneXmlPath": "mujoco_menagerie/robotstudio_so101/scene.xml"
  },
  {
    "id": 53,
    "name": "scene",
    "sceneXmlPath": "mujoco_menagerie/robotstudio_so101/scene_box.xml"
  },
  {
    "id": 54,
    "name": "shadow dex-ee hand scene",
    "sceneXmlPath": "mujoco_menagerie/shadow_dexee/scene.xml"
  },
  {
    "id": 55,
    "name": "left_shadow_hand scene",
    "sceneXmlPath": "mujoco_menagerie/shadow_hand/scene_left.xml"
  },
  {
    "id": 56,
    "name": "right_shadow_hand scene",
    "sceneXmlPath": "mujoco_menagerie/shadow_hand/scene_right.xml"
  },
  {
    "id": 57,
    "name": "Skydio X2 scene",
    "sceneXmlPath": "mujoco_menagerie/skydio_x2/scene.xml"
  },
  {
    "id": 58,
    "name": "tidybot scene",
    "sceneXmlPath": "mujoco_menagerie/stanford_tidybot/scene.xml"
  },
  {
    "id": 59,
    "name": "base scene",
    "sceneXmlPath": "mujoco_menagerie/stanford_tidybot/scene_base.xml"
  },
  {
    "id": 60,
    "name": "tetheria_aero_hand_open_right_scene",
    "sceneXmlPath": "mujoco_menagerie/tetheria_aero_hand_open/scene_right.xml"
  },
  {
    "id": 61,
    "name": "toddlerbot_2xc_scene",
    "sceneXmlPath": "mujoco_menagerie/toddlerbot_2xc/scene.xml"
  },
  {
    "id": 62,
    "name": "toddlerbot_2xc_mjx_scene",
    "sceneXmlPath": "mujoco_menagerie/toddlerbot_2xc/scene_mjx.xml"
  },
  {
    "id": 63,
    "name": "toddlerbot_2xc_pos_scene",
    "sceneXmlPath": "mujoco_menagerie/toddlerbot_2xc/scene_pos.xml"
  },
  {
    "id": 64,
    "name": "toddlerbot_2xm_scene",
    "sceneXmlPath": "mujoco_menagerie/toddlerbot_2xm/scene.xml"
  },
  {
    "id": 65,
    "name": "toddlerbot_2xm_mjx_scene",
    "sceneXmlPath": "mujoco_menagerie/toddlerbot_2xm/scene_mjx.xml"
  },
  {
    "id": 66,
    "name": "toddlerbot_2xm_pos_scene",
    "sceneXmlPath": "mujoco_menagerie/toddlerbot_2xm/scene_pos.xml"
  },
  {
    "id": 67,
    "name": "vx300s scene",
    "sceneXmlPath": "mujoco_menagerie/trossen_vx300s/scene.xml"
  },
  {
    "id": 68,
    "name": "wx250s scene",
    "sceneXmlPath": "mujoco_menagerie/trossen_wx250s/scene.xml"
  },
  {
    "id": 69,
    "name": "trossen_wxai_scene",
    "sceneXmlPath": "mujoco_menagerie/trossen_wxai/scene.xml"
  },
  {
    "id": 70,
    "name": "so_arm100 scene",
    "sceneXmlPath": "mujoco_menagerie/trs_so_arm100/scene.xml"
  },
  {
    "id": 71,
    "name": "lite6 scene",
    "sceneXmlPath": "mujoco_menagerie/ufactory_lite6/scene.xml"
  },
  {
    "id": 72,
    "name": "xarm7 scene",
    "sceneXmlPath": "mujoco_menagerie/ufactory_xarm7/scene.xml"
  },
  {
    "id": 73,
    "name": "scene",
    "sceneXmlPath": "mujoco_menagerie/umi_gripper/scene.xml"
  },
  {
    "id": 74,
    "name": "a1 scene",
    "sceneXmlPath": "mujoco_menagerie/unitree_a1/scene.xml"
  },
  {
    "id": 75,
    "name": "g1_29dof_rev_1_0 scene",
    "sceneXmlPath": "mujoco_menagerie/unitree_g1/scene.xml"
  },
  {
    "id": 76,
    "name": "g1 mjx flat terrain scene",
    "sceneXmlPath": "mujoco_menagerie/unitree_g1/scene_mjx.xml"
  },
  {
    "id": 77,
    "name": "g1_29dof_with_hand_rev_1_0 scene",
    "sceneXmlPath": "mujoco_menagerie/unitree_g1/scene_with_hands.xml"
  },
  {
    "id": 78,
    "name": "go1 scene",
    "sceneXmlPath": "mujoco_menagerie/unitree_go1/scene.xml"
  },
  {
    "id": 79,
    "name": "go2 scene",
    "sceneXmlPath": "mujoco_menagerie/unitree_go2/scene.xml"
  },
  {
    "id": 80,
    "name": "go2 scene",
    "sceneXmlPath": "mujoco_menagerie/unitree_go2/scene_mjx.xml"
  },
  {
    "id": 81,
    "name": "h1 scene",
    "sceneXmlPath": "mujoco_menagerie/unitree_h1/scene.xml"
  },
  {
    "id": 82,
    "name": "z1 scene",
    "sceneXmlPath": "mujoco_menagerie/unitree_z1/scene.xml"
  },
  {
    "id": 83,
    "name": "ur10e scene",
    "sceneXmlPath": "mujoco_menagerie/universal_robots_ur10e/scene.xml"
  },
  {
    "id": 84,
    "name": "ur5e scene",
    "sceneXmlPath": "mujoco_menagerie/universal_robots_ur5e/scene.xml"
  },
  {
    "id": 85,
    "name": "left_allegro_hand scene",
    "sceneXmlPath": "mujoco_menagerie/wonik_allegro/scene_left.xml"
  },
  {
    "id": 86,
    "name": "right_allegro_hand scene",
    "sceneXmlPath": "mujoco_menagerie/wonik_allegro/scene_right.xml"
  }
];
const camerasData = [
  {
    "id": 1,
    "name": "overhead_cam",
    "modality": "simulated",
    "data": {
      "name": "overhead_cam",
      "pos": [
        0,
        -0.303794,
        1.02524
      ],
      "quat": [
        0.976332,
        0.216277,
        0,
        0
      ]
    },
    "posX": 0,
    "posY": -0.303794,
    "posZ": 1.02524,
    "quatW": 0.976332,
    "quatX": 0.216277,
    "quatY": 0,
    "quatZ": 0,
    "xyaxesX1": 1,
    "xyaxesY1": 0,
    "xyaxesZ1": 0,
    "xyaxesX2": 0,
    "xyaxesY2": 1,
    "xyaxesZ2": 0
  },
  {
    "id": 2,
    "name": "worms_eye_cam",
    "modality": "simulated",
    "data": {
      "name": "worms_eye_cam",
      "pos": [
        0,
        -0.377167,
        0.0316055
      ],
      "quat": [
        0.672659,
        0.739953,
        0,
        0
      ]
    },
    "posX": 0,
    "posY": -0.377167,
    "posZ": 0.0316055,
    "quatW": 0.672659,
    "quatX": 0.739953,
    "quatY": 0,
    "quatZ": 0,
    "xyaxesX1": 1,
    "xyaxesY1": 0,
    "xyaxesZ1": 0,
    "xyaxesX2": 0,
    "xyaxesY2": 1,
    "xyaxesZ2": 0
  },
  {
    "id": 3,
    "name": "default",
    "modality": "simulated",
    "data": {
      "name": "default",
      "pos": [
        0.846,
        -1.465,
        0.916
      ],
      "xyaxes": [
        0.866,
        0.5,
        0,
        -0.171,
        0.296,
        0.94
      ]
    },
    "posX": 0.846,
    "posY": -1.465,
    "posZ": 0.916,
    "quatW": 1,
    "quatX": 0,
    "quatY": 0,
    "quatZ": 0,
    "xyaxesX1": 0.866,
    "xyaxesY1": 0.5,
    "xyaxesZ1": 0,
    "xyaxesX2": -0.171,
    "xyaxesY2": 0.296,
    "xyaxesZ2": 0.94
  },
  {
    "id": 4,
    "name": "side",
    "modality": "simulated",
    "data": {
      "name": "side",
      "pos": [
        -0.183,
        0.396,
        0.296
      ],
      "xyaxes": [
        -0.783,
        -0.622,
        0,
        0.332,
        -0.419,
        0.845
      ]
    },
    "posX": -0.183,
    "posY": 0.396,
    "posZ": 0.296,
    "quatW": 1,
    "quatX": 0,
    "quatY": 0,
    "quatZ": 0,
    "xyaxesX1": -0.783,
    "xyaxesY1": -0.622,
    "xyaxesZ1": 0,
    "xyaxesX2": 0.332,
    "xyaxesY2": -0.419,
    "xyaxesZ2": 0.845
  },
  {
    "id": 5,
    "name": "perspective",
    "modality": "simulated",
    "data": {
      "name": "perspective",
      "pos": [
        0.7,
        -0.7,
        0.7
      ],
      "xyaxes": [
        1,
        1,
        0,
        -1,
        1,
        3
      ]
    },
    "posX": 0.7,
    "posY": -0.7,
    "posZ": 0.7,
    "quatW": 1,
    "quatX": 0,
    "quatY": 0,
    "quatZ": 0,
    "xyaxesX1": 1,
    "xyaxesY1": 1,
    "xyaxesZ1": 0,
    "xyaxesX2": -1,
    "xyaxesY2": 1,
    "xyaxesZ2": 3
  },
  {
    "id": 6,
    "name": "top",
    "modality": "simulated",
    "data": {
      "name": "top",
      "pos": [
        0,
        0,
        1
      ],
      "xyaxes": [
        0,
        1,
        0,
        -1,
        0,
        0
      ]
    },
    "posX": 0,
    "posY": 0,
    "posZ": 1,
    "quatW": 1,
    "quatX": 0,
    "quatY": 0,
    "quatZ": 0,
    "xyaxesX1": 0,
    "xyaxesY1": 1,
    "xyaxesZ1": 0,
    "xyaxesX2": -1,
    "xyaxesY2": 0,
    "xyaxesZ2": 0
  },
  {
    "id": 7,
    "name": "front",
    "modality": "simulated",
    "data": {
      "name": "front",
      "pos": [
        1,
        0,
        0.6
      ],
      "xyaxes": [
        0,
        1,
        0,
        -1,
        0,
        3
      ]
    },
    "posX": 1,
    "posY": 0,
    "posZ": 0.6,
    "quatW": 1,
    "quatX": 0,
    "quatY": 0,
    "quatZ": 0,
    "xyaxesX1": 0,
    "xyaxesY1": 1,
    "xyaxesZ1": 0,
    "xyaxesX2": -1,
    "xyaxesY2": 0,
    "xyaxesZ2": 3
  }
];
const sceneRobotsData = [
  {
    "sceneId": 1,
    "robotId": 1,
    "snapshot": {
      "id": 1,
      "name": "agilex_piper",
      "modality": "simulated",
      "robotModelId": 1,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 2,
    "robotId": 2,
    "snapshot": {
      "id": 2,
      "name": "agility_cassie",
      "modality": "simulated",
      "robotModelId": 2,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 3,
    "robotId": 3,
    "snapshot": {
      "id": 3,
      "name": "aloha",
      "modality": "simulated",
      "robotModelId": 3,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 4,
    "robotId": 4,
    "snapshot": {
      "id": 4,
      "name": "anybotics_anymal_b",
      "modality": "simulated",
      "robotModelId": 4,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 5,
    "robotId": 5,
    "snapshot": {
      "id": 5,
      "name": "anybotics_anymal_c",
      "modality": "simulated",
      "robotModelId": 5,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 6,
    "robotId": 5,
    "snapshot": {
      "id": 5,
      "name": "anybotics_anymal_c",
      "modality": "simulated",
      "robotModelId": 5,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 7,
    "robotId": 6,
    "snapshot": {
      "id": 6,
      "name": "apptronik_apollo",
      "modality": "simulated",
      "robotModelId": 6,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 8,
    "robotId": 7,
    "snapshot": {
      "id": 7,
      "name": "arx_l5",
      "modality": "simulated",
      "robotModelId": 7,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 9,
    "robotId": 8,
    "snapshot": {
      "id": 8,
      "name": "berkeley_humanoid",
      "modality": "simulated",
      "robotModelId": 8,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 10,
    "robotId": 9,
    "snapshot": {
      "id": 9,
      "name": "bitcraze_crazyflie_2",
      "modality": "simulated",
      "robotModelId": 9,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 11,
    "robotId": 10,
    "snapshot": {
      "id": 10,
      "name": "booster_t1",
      "modality": "simulated",
      "robotModelId": 10,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 12,
    "robotId": 11,
    "snapshot": {
      "id": 11,
      "name": "boston_dynamics_spot",
      "modality": "simulated",
      "robotModelId": 11,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 13,
    "robotId": 11,
    "snapshot": {
      "id": 11,
      "name": "boston_dynamics_spot",
      "modality": "simulated",
      "robotModelId": 11,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 14,
    "robotId": 12,
    "snapshot": {
      "id": 12,
      "name": "dynamixel_2r",
      "modality": "simulated",
      "robotModelId": 12,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 15,
    "robotId": 13,
    "snapshot": {
      "id": 13,
      "name": "flybody",
      "modality": "simulated",
      "robotModelId": 13,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 16,
    "robotId": 14,
    "snapshot": {
      "id": 14,
      "name": "fourier_n1",
      "modality": "simulated",
      "robotModelId": 14,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 17,
    "robotId": 15,
    "snapshot": {
      "id": 15,
      "name": "franka_emika_panda",
      "modality": "simulated",
      "robotModelId": 15,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 18,
    "robotId": 15,
    "snapshot": {
      "id": 15,
      "name": "franka_emika_panda",
      "modality": "simulated",
      "robotModelId": 15,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 19,
    "robotId": 15,
    "snapshot": {
      "id": 15,
      "name": "franka_emika_panda",
      "modality": "simulated",
      "robotModelId": 15,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 20,
    "robotId": 16,
    "snapshot": {
      "id": 16,
      "name": "franka_fr3",
      "modality": "simulated",
      "robotModelId": 16,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 21,
    "robotId": 17,
    "snapshot": {
      "id": 17,
      "name": "franka_fr3_v2",
      "modality": "simulated",
      "robotModelId": 17,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 22,
    "robotId": 18,
    "snapshot": {
      "id": 18,
      "name": "google_barkour_v0",
      "modality": "simulated",
      "robotModelId": 18,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 23,
    "robotId": 18,
    "snapshot": {
      "id": 18,
      "name": "google_barkour_v0",
      "modality": "simulated",
      "robotModelId": 18,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 24,
    "robotId": 18,
    "snapshot": {
      "id": 18,
      "name": "google_barkour_v0",
      "modality": "simulated",
      "robotModelId": 18,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 25,
    "robotId": 19,
    "snapshot": {
      "id": 19,
      "name": "google_barkour_vb",
      "modality": "simulated",
      "robotModelId": 19,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 26,
    "robotId": 19,
    "snapshot": {
      "id": 19,
      "name": "google_barkour_vb",
      "modality": "simulated",
      "robotModelId": 19,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 27,
    "robotId": 19,
    "snapshot": {
      "id": 19,
      "name": "google_barkour_vb",
      "modality": "simulated",
      "robotModelId": 19,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 28,
    "robotId": 20,
    "snapshot": {
      "id": 20,
      "name": "google_robot",
      "modality": "simulated",
      "robotModelId": 20,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 29,
    "robotId": 21,
    "snapshot": {
      "id": 21,
      "name": "hello_robot_stretch",
      "modality": "simulated",
      "robotModelId": 21,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 30,
    "robotId": 22,
    "snapshot": {
      "id": 22,
      "name": "hello_robot_stretch_3",
      "modality": "simulated",
      "robotModelId": 22,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 31,
    "robotId": 23,
    "snapshot": {
      "id": 23,
      "name": "i2rt_yam",
      "modality": "simulated",
      "robotModelId": 23,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 33,
    "robotId": 24,
    "snapshot": {
      "id": 24,
      "name": "kinova_gen3",
      "modality": "simulated",
      "robotModelId": 24,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 34,
    "robotId": 25,
    "snapshot": {
      "id": 25,
      "name": "kuka_iiwa_14",
      "modality": "simulated",
      "robotModelId": 25,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 35,
    "robotId": 26,
    "snapshot": {
      "id": 26,
      "name": "leap_hand",
      "modality": "simulated",
      "robotModelId": 26,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 36,
    "robotId": 26,
    "snapshot": {
      "id": 26,
      "name": "leap_hand",
      "modality": "simulated",
      "robotModelId": 26,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 37,
    "robotId": 27,
    "snapshot": {
      "id": 27,
      "name": "low_cost_robot_arm",
      "modality": "simulated",
      "robotModelId": 27,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 38,
    "robotId": 28,
    "snapshot": {
      "id": 28,
      "name": "pal_talos",
      "modality": "simulated",
      "robotModelId": 28,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 39,
    "robotId": 28,
    "snapshot": {
      "id": 28,
      "name": "pal_talos",
      "modality": "simulated",
      "robotModelId": 28,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 40,
    "robotId": 29,
    "snapshot": {
      "id": 29,
      "name": "pal_tiago",
      "modality": "simulated",
      "robotModelId": 29,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 41,
    "robotId": 29,
    "snapshot": {
      "id": 29,
      "name": "pal_tiago",
      "modality": "simulated",
      "robotModelId": 29,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 42,
    "robotId": 29,
    "snapshot": {
      "id": 29,
      "name": "pal_tiago",
      "modality": "simulated",
      "robotModelId": 29,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 43,
    "robotId": 30,
    "snapshot": {
      "id": 30,
      "name": "pal_tiago_dual",
      "modality": "simulated",
      "robotModelId": 30,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 44,
    "robotId": 30,
    "snapshot": {
      "id": 30,
      "name": "pal_tiago_dual",
      "modality": "simulated",
      "robotModelId": 30,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 45,
    "robotId": 30,
    "snapshot": {
      "id": 30,
      "name": "pal_tiago_dual",
      "modality": "simulated",
      "robotModelId": 30,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 46,
    "robotId": 31,
    "snapshot": {
      "id": 31,
      "name": "pndbotics_adam_lite",
      "modality": "simulated",
      "robotModelId": 31,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 47,
    "robotId": 32,
    "snapshot": {
      "id": 32,
      "name": "rethink_robotics_sawyer",
      "modality": "simulated",
      "robotModelId": 32,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 48,
    "robotId": 33,
    "snapshot": {
      "id": 33,
      "name": "robot_soccer_kit",
      "modality": "simulated",
      "robotModelId": 33,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 49,
    "robotId": 34,
    "snapshot": {
      "id": 34,
      "name": "robotiq_2f85",
      "modality": "simulated",
      "robotModelId": 34,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 50,
    "robotId": 35,
    "snapshot": {
      "id": 35,
      "name": "robotiq_2f85_v4",
      "modality": "simulated",
      "robotModelId": 35,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 51,
    "robotId": 36,
    "snapshot": {
      "id": 36,
      "name": "robotis_op3",
      "modality": "simulated",
      "robotModelId": 36,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 52,
    "robotId": 37,
    "snapshot": {
      "id": 37,
      "name": "robotstudio_so101",
      "modality": "simulated",
      "robotModelId": 37,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 53,
    "robotId": 37,
    "snapshot": {
      "id": 37,
      "name": "robotstudio_so101",
      "modality": "simulated",
      "robotModelId": 37,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 54,
    "robotId": 38,
    "snapshot": {
      "id": 38,
      "name": "shadow_dexee",
      "modality": "simulated",
      "robotModelId": 38,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 55,
    "robotId": 39,
    "snapshot": {
      "id": 39,
      "name": "shadow_hand",
      "modality": "simulated",
      "robotModelId": 39,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 56,
    "robotId": 39,
    "snapshot": {
      "id": 39,
      "name": "shadow_hand",
      "modality": "simulated",
      "robotModelId": 39,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 57,
    "robotId": 40,
    "snapshot": {
      "id": 40,
      "name": "skydio_x2",
      "modality": "simulated",
      "robotModelId": 40,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 58,
    "robotId": 41,
    "snapshot": {
      "id": 41,
      "name": "stanford_tidybot",
      "modality": "simulated",
      "robotModelId": 41,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 59,
    "robotId": 41,
    "snapshot": {
      "id": 41,
      "name": "stanford_tidybot",
      "modality": "simulated",
      "robotModelId": 41,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 60,
    "robotId": 42,
    "snapshot": {
      "id": 42,
      "name": "tetheria_aero_hand_open",
      "modality": "simulated",
      "robotModelId": 42,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 61,
    "robotId": 43,
    "snapshot": {
      "id": 43,
      "name": "toddlerbot_2xc",
      "modality": "simulated",
      "robotModelId": 43,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 62,
    "robotId": 43,
    "snapshot": {
      "id": 43,
      "name": "toddlerbot_2xc",
      "modality": "simulated",
      "robotModelId": 43,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 63,
    "robotId": 43,
    "snapshot": {
      "id": 43,
      "name": "toddlerbot_2xc",
      "modality": "simulated",
      "robotModelId": 43,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 64,
    "robotId": 44,
    "snapshot": {
      "id": 44,
      "name": "toddlerbot_2xm",
      "modality": "simulated",
      "robotModelId": 44,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 65,
    "robotId": 44,
    "snapshot": {
      "id": 44,
      "name": "toddlerbot_2xm",
      "modality": "simulated",
      "robotModelId": 44,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 66,
    "robotId": 44,
    "snapshot": {
      "id": 44,
      "name": "toddlerbot_2xm",
      "modality": "simulated",
      "robotModelId": 44,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 67,
    "robotId": 45,
    "snapshot": {
      "id": 45,
      "name": "trossen_vx300s",
      "modality": "simulated",
      "robotModelId": 45,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 68,
    "robotId": 46,
    "snapshot": {
      "id": 46,
      "name": "trossen_wx250s",
      "modality": "simulated",
      "robotModelId": 46,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 69,
    "robotId": 47,
    "snapshot": {
      "id": 47,
      "name": "trossen_wxai",
      "modality": "simulated",
      "robotModelId": 47,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 70,
    "robotId": 48,
    "snapshot": {
      "id": 48,
      "name": "trs_so_arm100",
      "modality": "simulated",
      "robotModelId": 48,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 71,
    "robotId": 49,
    "snapshot": {
      "id": 49,
      "name": "ufactory_lite6",
      "modality": "simulated",
      "robotModelId": 49,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 72,
    "robotId": 50,
    "snapshot": {
      "id": 50,
      "name": "ufactory_xarm7",
      "modality": "simulated",
      "robotModelId": 50,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 73,
    "robotId": 51,
    "snapshot": {
      "id": 51,
      "name": "umi_gripper",
      "modality": "simulated",
      "robotModelId": 51,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 74,
    "robotId": 52,
    "snapshot": {
      "id": 52,
      "name": "unitree_a1",
      "modality": "simulated",
      "robotModelId": 52,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 75,
    "robotId": 53,
    "snapshot": {
      "id": 53,
      "name": "unitree_g1",
      "modality": "simulated",
      "robotModelId": 53,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 76,
    "robotId": 53,
    "snapshot": {
      "id": 53,
      "name": "unitree_g1",
      "modality": "simulated",
      "robotModelId": 53,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 77,
    "robotId": 53,
    "snapshot": {
      "id": 53,
      "name": "unitree_g1",
      "modality": "simulated",
      "robotModelId": 53,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 78,
    "robotId": 54,
    "snapshot": {
      "id": 54,
      "name": "unitree_go1",
      "modality": "simulated",
      "robotModelId": 54,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 79,
    "robotId": 55,
    "snapshot": {
      "id": 55,
      "name": "unitree_go2",
      "modality": "simulated",
      "robotModelId": 55,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 80,
    "robotId": 55,
    "snapshot": {
      "id": 55,
      "name": "unitree_go2",
      "modality": "simulated",
      "robotModelId": 55,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 81,
    "robotId": 56,
    "snapshot": {
      "id": 56,
      "name": "unitree_h1",
      "modality": "simulated",
      "robotModelId": 56,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 82,
    "robotId": 57,
    "snapshot": {
      "id": 57,
      "name": "unitree_z1",
      "modality": "simulated",
      "robotModelId": 57,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 83,
    "robotId": 58,
    "snapshot": {
      "id": 58,
      "name": "universal_robots_ur10e",
      "modality": "simulated",
      "robotModelId": 58,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 84,
    "robotId": 59,
    "snapshot": {
      "id": 59,
      "name": "universal_robots_ur5e",
      "modality": "simulated",
      "robotModelId": 59,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 85,
    "robotId": 60,
    "snapshot": {
      "id": 60,
      "name": "wonik_allegro",
      "modality": "simulated",
      "robotModelId": 60,
      "data": {
        "type": "simulation"
      }
    }
  },
  {
    "sceneId": 86,
    "robotId": 60,
    "snapshot": {
      "id": 60,
      "name": "wonik_allegro",
      "modality": "simulated",
      "robotModelId": 60,
      "data": {
        "type": "simulation"
      }
    }
  }
];
const sceneCamerasData = [
  {
    "sceneId": 3,
    "cameraId": 1,
    "snapshot": {
      "name": "overhead_cam",
      "pos": [
        0,
        -0.303794,
        1.02524
      ],
      "quat": [
        0.976332,
        0.216277,
        0,
        0
      ]
    }
  },
  {
    "sceneId": 3,
    "cameraId": 2,
    "snapshot": {
      "name": "worms_eye_cam",
      "pos": [
        0,
        -0.377167,
        0.0316055
      ],
      "quat": [
        0.672659,
        0.739953,
        0,
        0
      ]
    }
  },
  {
    "sceneId": 22,
    "cameraId": 3,
    "snapshot": {
      "name": "default",
      "pos": [
        0.846,
        -1.465,
        0.916
      ],
      "xyaxes": [
        0.866,
        0.5,
        0,
        -0.171,
        0.296,
        0.94
      ]
    }
  },
  {
    "sceneId": 23,
    "cameraId": 3,
    "snapshot": {
      "name": "default",
      "pos": [
        -1.947,
        -0.59,
        5.008
      ],
      "xyaxes": [
        -0.351,
        -0.936,
        0,
        0.728,
        -0.273,
        0.628
      ]
    }
  },
  {
    "sceneId": 24,
    "cameraId": 3,
    "snapshot": {
      "name": "default",
      "pos": [
        0.846,
        -1.465,
        0.916
      ],
      "xyaxes": [
        0.866,
        0.5,
        0,
        -0.171,
        0.296,
        0.94
      ]
    }
  },
  {
    "sceneId": 25,
    "cameraId": 3,
    "snapshot": {
      "name": "default",
      "pos": [
        0.846,
        -1.465,
        0.916
      ],
      "xyaxes": [
        0.866,
        0.5,
        0,
        -0.171,
        0.296,
        0.94
      ]
    }
  },
  {
    "sceneId": 26,
    "cameraId": 3,
    "snapshot": {
      "name": "default",
      "pos": [
        0.846,
        -1.465,
        0.916
      ],
      "xyaxes": [
        0.866,
        0.5,
        0,
        -0.171,
        0.296,
        0.94
      ]
    }
  },
  {
    "sceneId": 27,
    "cameraId": 3,
    "snapshot": {
      "name": "default",
      "pos": [
        0.846,
        -1.465,
        0.916
      ],
      "xyaxes": [
        0.866,
        0.5,
        0,
        -0.171,
        0.296,
        0.94
      ]
    }
  },
  {
    "sceneId": 60,
    "cameraId": 4,
    "snapshot": {
      "name": "side",
      "pos": [
        -0.183,
        0.396,
        0.296
      ],
      "xyaxes": [
        -0.783,
        -0.622,
        0,
        0.332,
        -0.419,
        0.845
      ]
    }
  },
  {
    "sceneId": 61,
    "cameraId": 5,
    "snapshot": {
      "name": "perspective",
      "pos": [
        0.7,
        -0.7,
        0.7
      ],
      "xyaxes": [
        1,
        1,
        0,
        -1,
        1,
        3
      ]
    }
  },
  {
    "sceneId": 61,
    "cameraId": 4,
    "snapshot": {
      "name": "side",
      "pos": [
        0,
        -1,
        0.6
      ],
      "xyaxes": [
        1,
        0,
        0,
        0,
        1,
        3
      ]
    }
  },
  {
    "sceneId": 61,
    "cameraId": 6,
    "snapshot": {
      "name": "top",
      "pos": [
        0,
        0,
        1
      ],
      "xyaxes": [
        0,
        1,
        0,
        -1,
        0,
        0
      ]
    }
  },
  {
    "sceneId": 61,
    "cameraId": 7,
    "snapshot": {
      "name": "front",
      "pos": [
        1,
        0,
        0.6
      ],
      "xyaxes": [
        0,
        1,
        0,
        -1,
        0,
        3
      ]
    }
  },
  {
    "sceneId": 62,
    "cameraId": 5,
    "snapshot": {
      "name": "perspective",
      "pos": [
        0.7,
        -0.7,
        0.7
      ],
      "xyaxes": [
        1,
        1,
        0,
        -1,
        1,
        3
      ]
    }
  },
  {
    "sceneId": 62,
    "cameraId": 4,
    "snapshot": {
      "name": "side",
      "pos": [
        0,
        -1,
        0.6
      ],
      "xyaxes": [
        1,
        0,
        0,
        0,
        1,
        3
      ]
    }
  },
  {
    "sceneId": 62,
    "cameraId": 6,
    "snapshot": {
      "name": "top",
      "pos": [
        0,
        0,
        1
      ],
      "xyaxes": [
        0,
        1,
        0,
        -1,
        0,
        0
      ]
    }
  },
  {
    "sceneId": 62,
    "cameraId": 7,
    "snapshot": {
      "name": "front",
      "pos": [
        1,
        0,
        0.6
      ],
      "xyaxes": [
        0,
        1,
        0,
        -1,
        0,
        3
      ]
    }
  },
  {
    "sceneId": 63,
    "cameraId": 5,
    "snapshot": {
      "name": "perspective",
      "pos": [
        0.7,
        -0.7,
        0.7
      ],
      "xyaxes": [
        1,
        1,
        0,
        -1,
        1,
        3
      ]
    }
  },
  {
    "sceneId": 63,
    "cameraId": 4,
    "snapshot": {
      "name": "side",
      "pos": [
        0,
        -1,
        0.6
      ],
      "xyaxes": [
        1,
        0,
        0,
        0,
        1,
        3
      ]
    }
  },
  {
    "sceneId": 63,
    "cameraId": 6,
    "snapshot": {
      "name": "top",
      "pos": [
        0,
        0,
        1
      ],
      "xyaxes": [
        0,
        1,
        0,
        -1,
        0,
        0
      ]
    }
  },
  {
    "sceneId": 63,
    "cameraId": 7,
    "snapshot": {
      "name": "front",
      "pos": [
        1,
        0,
        0.6
      ],
      "xyaxes": [
        0,
        1,
        0,
        -1,
        0,
        3
      ]
    }
  },
  {
    "sceneId": 64,
    "cameraId": 5,
    "snapshot": {
      "name": "perspective",
      "pos": [
        0.7,
        -0.7,
        0.7
      ],
      "xyaxes": [
        1,
        1,
        0,
        -1,
        1,
        3
      ]
    }
  },
  {
    "sceneId": 64,
    "cameraId": 4,
    "snapshot": {
      "name": "side",
      "pos": [
        0,
        -1,
        0.6
      ],
      "xyaxes": [
        1,
        0,
        0,
        0,
        1,
        3
      ]
    }
  },
  {
    "sceneId": 64,
    "cameraId": 6,
    "snapshot": {
      "name": "top",
      "pos": [
        0,
        0,
        1
      ],
      "xyaxes": [
        0,
        1,
        0,
        -1,
        0,
        0
      ]
    }
  },
  {
    "sceneId": 64,
    "cameraId": 7,
    "snapshot": {
      "name": "front",
      "pos": [
        1,
        0,
        0.6
      ],
      "xyaxes": [
        0,
        1,
        0,
        -1,
        0,
        3
      ]
    }
  },
  {
    "sceneId": 65,
    "cameraId": 5,
    "snapshot": {
      "name": "perspective",
      "pos": [
        0.7,
        -0.7,
        0.7
      ],
      "xyaxes": [
        1,
        1,
        0,
        -1,
        1,
        3
      ]
    }
  },
  {
    "sceneId": 65,
    "cameraId": 4,
    "snapshot": {
      "name": "side",
      "pos": [
        0,
        -1,
        0.6
      ],
      "xyaxes": [
        1,
        0,
        0,
        0,
        1,
        3
      ]
    }
  },
  {
    "sceneId": 65,
    "cameraId": 6,
    "snapshot": {
      "name": "top",
      "pos": [
        0,
        0,
        1
      ],
      "xyaxes": [
        0,
        1,
        0,
        -1,
        0,
        0
      ]
    }
  },
  {
    "sceneId": 65,
    "cameraId": 7,
    "snapshot": {
      "name": "front",
      "pos": [
        1,
        0,
        0.6
      ],
      "xyaxes": [
        0,
        1,
        0,
        -1,
        0,
        3
      ]
    }
  },
  {
    "sceneId": 66,
    "cameraId": 5,
    "snapshot": {
      "name": "perspective",
      "pos": [
        0.7,
        -0.7,
        0.7
      ],
      "xyaxes": [
        1,
        1,
        0,
        -1,
        1,
        3
      ]
    }
  },
  {
    "sceneId": 66,
    "cameraId": 4,
    "snapshot": {
      "name": "side",
      "pos": [
        0,
        -1,
        0.6
      ],
      "xyaxes": [
        1,
        0,
        0,
        0,
        1,
        3
      ]
    }
  },
  {
    "sceneId": 66,
    "cameraId": 6,
    "snapshot": {
      "name": "top",
      "pos": [
        0,
        0,
        1
      ],
      "xyaxes": [
        0,
        1,
        0,
        -1,
        0,
        0
      ]
    }
  },
  {
    "sceneId": 66,
    "cameraId": 7,
    "snapshot": {
      "name": "front",
      "pos": [
        1,
        0,
        0.6
      ],
      "xyaxes": [
        0,
        1,
        0,
        -1,
        0,
        3
      ]
    }
  }
];

export async function seedRobotModels() {
  console.log("Seeding robot models...");
  try {
    if (robotModelsData.length > 0) {
      await db.insert(robotModelsTable).values(robotModelsData as any[]).onConflictDoNothing();
    }
    if (robotsData.length > 0) {
      await db.insert(robotsTable).values(robotsData as any[]).onConflictDoNothing();
    }
    if (scenesData.length > 0) {
      await db.insert(scenesTable).values(scenesData as any[]).onConflictDoNothing();
    }
    if (camerasData.length > 0) {
      await db.insert(camerasTable).values(camerasData as any[]).onConflictDoNothing();
    }
    if (sceneRobotsData.length > 0) {
      await db.insert(sceneRobotsTable).values(sceneRobotsData as any[]).onConflictDoNothing();
    }
    if (sceneCamerasData.length > 0) {
      await db.insert(sceneCamerasTable).values(sceneCamerasData as any[]).onConflictDoNothing();
    }

    await db.execute(sql`SELECT setval(pg_get_serial_sequence('robot_models', 'id'), (SELECT MAX(id) FROM robot_models))`);
    await db.execute(sql`SELECT setval(pg_get_serial_sequence('robots', 'id'), (SELECT MAX(id) FROM robots))`);
    await db.execute(sql`SELECT setval(pg_get_serial_sequence('scenes', 'id'), (SELECT MAX(id) FROM scenes))`);
    await db.execute(sql`SELECT setval(pg_get_serial_sequence('cameras', 'id'), (SELECT MAX(id) FROM cameras))`);

    console.log("Seeding complete.");
  } catch (error) {
    console.error("Error seeding robot models:", error);
  }
}
