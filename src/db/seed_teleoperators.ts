import { db } from "./db";
import { teleoperatorModelsTable } from "./schema";

const teleoperators = [
  { id: 1, name: "Phone",dirName: "phone", className: "Phone", configClassName: "PhoneConfig" },
  { id: 2, name: "Omx Leader",dirName: "omx_leader", className: "OmxLeader", configClassName: "OmxLeaderConfig" },
  { id: 3, name: "SO101 Leader",dirName: "so101_leader", className: "SO101Leader", configClassName: "SO101LeaderConfig" },
  { id: 4, name: "Keyboard",dirName: "keyboard", className: "KeyboardTeleop", configClassName: "KeyboardTeleopConfig" },
  { id: 5, name: "Keyboard EE",dirName: "keyboard_ee", className: "KeyboardEndEffectorTeleop", configClassName: "KeyboardEndEffectorTeleopConfig" },
  { id: 6, name: "Keyboard Rover",dirName: "keyboard_rover", className: "KeyboardRoverTeleop", configClassName: "KeyboardRoverTeleopConfig" },
  { id: 7, name: "SO100 Leader",dirName: "so100_leader", className: "SO100Leader", configClassName: "SO100LeaderConfig" },
  { id: 8, name: "Homunculus Glove",dirName: "homunculus_glove", className: "HomunculusGlove", configClassName: "HomunculusGloveConfig" },
  { id: 9, name: "Homunculus Arm",dirName: "homunculus_arm", className: "HomunculusArm", configClassName: "HomunculusArmConfig" },
  { id: 10, name: "Koch Leader",dirName: "koch_leader", className: "KochLeader", configClassName: "KochLeaderConfig" },
  { id: 11, name: "Reachy2 Teleoperator",dirName: "reachy2_teleoperator", className: "Reachy2Teleoperator", configClassName: "Reachy2TeleoperatorConfig" },
  { id: 12, name: "Bi SO100 Leader",dirName: "bi_so100_leader", className: "BiSO100Leader", configClassName: "BiSO100LeaderConfig" },
  { id: 13, name: "Gamepad",dirName: "gamepad", className: "GamepadTeleop", configClassName: "GamepadTeleopConfig" },
];

export async function seedTeleoperators() {
  console.log("Seeding teleoperator models...");
  for (const t of teleoperators) {    
      await db.insert(teleoperatorModelsTable).values({
          id: t.id,
          className: t.className,
          configClassName: t.configClassName,
          data: { name: t.name }
      }).onConflictDoNothing();
  }
  console.log("Seeding complete.");
}