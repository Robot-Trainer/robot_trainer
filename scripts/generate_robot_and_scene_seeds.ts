
import fs from 'node:fs/promises';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { parseMujocoCameras } from '../src/lib/mujoco_parser';

const MENAGERIE_PATH = path.join(process.cwd(), 'mujoco_menagerie');
const TARGET_FILE = path.join(process.cwd(), 'src/db/seed_robot_models.ts');

const SPECIAL_CLASSES: Record<string, { className: string, configClassName: string }> = {
  "bi_so100_follower": { className: "BiSO100Follower", configClassName: "BiSO100FollowerConfig" },
  "earthrover_mini_plus": { className: "EarthRoverMiniPlus", configClassName: "EarthRoverMiniPlusConfig" },
  "hope_jr_arm": { className: "HopeJrArm", configClassName: "HopeJrArmConfig" },
  "hope_jr_hand": { className: "HopeJrHand", configClassName: "HopeJrHandConfig" },
  "koch_follower": { className: "KochFollower", configClassName: "KochFollowerConfig" },
  "lekiwi": { className: "LeKiwi", configClassName: "LeKiwiConfig" },
  "lekiwi_client": { className: "LeKiwiClient", configClassName: "LeKiwiClientConfig" },
  "omx_follower": { className: "OmxFollower", configClassName: "OmxFollowerConfig" },
  "reachy2": { className: "Reachy2Robot", configClassName: "Reachy2RobotConfig" },
  "so100_follower": { className: "SO100Follower", configClassName: "SO100FollowerConfig" },
  "so101_follower": { className: "SO101Follower", configClassName: "SO101FollowerConfig" },
  "unitree_g1": { className: "UnitreeG1", configClassName: "UnitreeG1Config" },
};

function parseRobotXmlMetadata(xmlContent: string) {
  const dom = new JSDOM(xmlContent, { contentType: 'text/xml' });
  const doc = dom.window.document;

  const joints = Array.from(doc.querySelectorAll('joint'));
  const jointNames = joints
    .map((j) => j.getAttribute('name'))
    .filter((n): n is string => !!n);

  const actuators = Array.from(doc.querySelectorAll('actuator > *'));
  const actuatorNames = actuators
    .map((a) => a.getAttribute('name'))
    .filter((n): n is string => !!n);

  const sites = Array.from(doc.querySelectorAll('site'));
  const siteNames = sites
    .map((s) => s.getAttribute('name'))
    .filter((n): n is string => !!n);

  const hasGripper = actuatorNames.some(
    (n) => /gripper|finger/i.test(n)
  ) || jointNames.some(
    (n) => /gripper|finger/i.test(n)
  );

  return {
    numJoints: jointNames.length,
    jointNames,
    actuatorNames,
    siteNames,
    hasGripper,
  };
}

async function scanMenagerie() {
  const results = {
    robots: [] as any[],
    configurations: [] as any[]
  };

  try {
    const dirs = await fs.readdir(MENAGERIE_PATH, { withFileTypes: true });
    // Use a counter for IDs
    let robotIdCounter = 1;

    for (const dirent of dirs) {
      if (!dirent.isDirectory() || dirent.name.startsWith('.')) continue;

      const dirPath = path.join(MENAGERIE_PATH, dirent.name);
      const files = await fs.readdir(dirPath);

      // Stage 1: Robot Detection
      for (const file of files) {
        if (!file.endsWith('.xml') || file.toLowerCase().includes('scene')) continue;

        const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
        if (content.includes('<actuator>')) {
          const metadata = parseRobotXmlMetadata(content);
          const dirName = dirent.name;

          const special = SPECIAL_CLASSES[dirName] || {
            className: 'GenericMujocoEnv',
            configClassName: 'CustomMujocoEnvConfig'
          };

          results.robots.push({
            id: robotIdCounter++,
            name: dirent.name, // Robot name is directory name
            dirName: dirent.name,
            className: special.className,
            configClassName: special.configClassName,
            modelPath: path.join('mujoco_menagerie', dirent.name, file),
            modelFormat: 'mjcf',
            properties: metadata
          });
          break; // One robot per folder
        }
      }
    }

    // Stage 2: Configuration Detection
    for (const dirent of dirs) {
      if (!dirent.isDirectory() || dirent.name.startsWith('.')) continue;
      const dirPath = path.join(MENAGERIE_PATH, dirent.name);
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        if (!file.endsWith('.xml')) continue;
        const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
        // Check for model attribute containing "scene"
        const modelMatch = content.match(/<mujoco[^>]*model="([^"]*scene[^"]*)"/i);
        if (modelMatch) {
          const includeMatches = Array.from(content.matchAll(/<include[^>]*file="([^"]+)"/g));
          const includedRobots = includeMatches.map(m => {
            const resolved = path.resolve(dirPath, m[1]);
            const includeDir = path.dirname(resolved);
            return path.basename(includeDir);
          });

          const cameras = parseMujocoCameras(content);

          results.configurations.push({
            name: modelMatch[1],
            sceneXmlPath: path.join('mujoco_menagerie', dirent.name, file),
            includedRobots,
            cameras
          });
        }
      }
    }

  } catch (e) {
    console.error("Error scanning menagerie:", e);
  }
  return results;
}

async function main() {
  console.log("Scanning menagerie...");
  const data = await scanMenagerie();

  console.log(`Found ${data.robots.length} robots and ${data.configurations.length} configurations.`);

  let fileContent = await fs.readFile(TARGET_FILE, 'utf-8');

  // Replace Robots
  const robotStartMarker = "/** START GENERATED MUJOCO MENAGERIE RECORDS */";
  const robotEndMarker = "/** END GENERATED MUJOCO MENAGERIE RECORDS */";

  const robotJSON = data.robots.map(r => JSON.stringify(r)).join(',\n  ');

  const robotRegex = new RegExp(`(${escapeRegExp(robotStartMarker)})[\\s\\S]*?(${escapeRegExp(robotEndMarker)})`);

  fileContent = fileContent.replace(robotRegex, `$1\n  ${robotJSON}\n  $2`);

  // Replace Configurations
  const configStartMarker = "/** START GENERATED MUJOCO MENAGERIE CONFIGURATIONS */";
  const configEndMarker = "/** END GENERATED MUJOCO MENAGERIE CONFIGURATIONS */";

  const configJSON = data.configurations.map(c => JSON.stringify(c)).join(',\n  ');

  const configRegex = new RegExp(`(${escapeRegExp(configStartMarker)})[\\s\\S]*?(${escapeRegExp(configEndMarker)})`);

  fileContent = fileContent.replace(configRegex, `$1\n  ${configJSON}\n  $2`);

  await fs.writeFile(TARGET_FILE, fileContent);
  console.log("Updated seed_robot_models.ts");
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

main().catch(console.error);
