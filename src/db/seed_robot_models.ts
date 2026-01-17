import { db } from "./db";
import { robotModelsTable } from "./schema";

export const robotModelsData = [
  {id: 1, name: "BI SO100 Follower", dirName: "bi_so100_follower", className: "BiSO100Follower", configClassName: "BiSO100FollowerConfig" },
  {id: 2, name: "EarthRover Mini Plus", dirName: "earthrover_mini_plus", className: "EarthRoverMiniPlus", configClassName: "EarthRoverMiniPlusConfig" },
  {id: 3, name: "Hope Jr Arm", dirName: "hope_jr_arm", className: "HopeJrArm", configClassName: "HopeJrArmConfig" },
  {id: 4, name: "Hope Jr Hand", dirName: "hope_jr_hand", className: "HopeJrHand", configClassName: "HopeJrHandConfig" },
  {id: 5, name: "Koch Follower", dirName: "koch_follower", className: "KochFollower", configClassName: "KochFollowerConfig" },
  {id: 6, name: "LeKiwi", dirName: "lekiwi", className: "LeKiwi", configClassName: "LeKiwiConfig" },
  {id: 7, name: "LeKiwi Client", dirName: "lekiwi_client", className: "LeKiwiClient", configClassName: "LeKiwiClientConfig" },
  {id: 8, name: "Omx Follower", dirName: "omx_follower", className: "OmxFollower", configClassName: "OmxFollowerConfig" },
  {id: 9, name: "Reachy 2", dirName: "reachy2", className: "Reachy2Robot", configClassName: "Reachy2RobotConfig" },
  {id: 10, name: "SO100 Follower", dirName: "so100_follower", className: "SO100Follower", configClassName: "SO100FollowerConfig" },
  {id: 11, name: "SO101 Follower", dirName: "so101_follower", className: "SO101Follower", configClassName: "SO101FollowerConfig" },
  {id: 12, name: "Unitree G1", dirName: "unitree_g1", className: "UnitreeG1", configClassName: "UnitreeG1Config" },
];

export async function seedRobotModels() {
  console.log("Seeding robot models...");
  try {
    await db.insert(robotModelsTable).values(robotModelsData).onConflictDoNothing();
    console.log("Seeding complete.");
  } catch (error) {
    console.error("Error seeding robot models:", error);
  }
}
