import fs from "node:fs/promises";
import path from "node:path";
import { JSDOM } from "jsdom";
import { parseMujocoCameras } from "../src/lib/mujoco_parser";
import { type InferSelectModel } from "drizzle-orm";
import { robotModelsTable } from "../src/db/schema";

const MENAGERIE_PATH = path.join(process.cwd(), "mujoco_menagerie");
const TARGET_FILE = path.join(process.cwd(), "src/db/seed_robot_models.ts");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const PYTHON_ENV_PATH = path.join(
  PROJECT_ROOT,
  ".venv/lib/python3.12/site-packages/lerobot",
);
const ROBOTS_PATH = path.join(PYTHON_ENV_PATH, "robots");
const SIMILARITY_THRESHOLD = 0.82;

type RobotModelRecord = Partial<InferSelectModel<typeof robotModelsTable>>;

function parseRobotXmlMetadata(xmlContent: string) {
  const dom = new JSDOM(xmlContent, { contentType: "text/xml" });
  const doc = dom.window.document;

  const joints = Array.from(doc.querySelectorAll("joint"));
  const jointNames = joints
    .map((j) => j.getAttribute("name"))
    .filter((n): n is string => !!n);

  const actuators = Array.from(doc.querySelectorAll("actuator > *"));
  const actuatorNames = actuators
    .map((a) => a.getAttribute("name"))
    .filter((n): n is string => !!n);

  const sites = Array.from(doc.querySelectorAll("site"));
  const siteNames = sites
    .map((s) => s.getAttribute("name"))
    .filter((n): n is string => !!n);

  const hasGripper =
    actuatorNames.some((n) => /gripper|finger/i.test(n)) ||
    jointNames.some((n) => /gripper|finger/i.test(n));

  return {
    numJoints: jointNames.length,
    jointNames,
    actuatorNames,
    siteNames,
    hasGripper,
  };
}

async function getDirectoryNames(source: string): Promise<string[]> {
  const isDirectory = await fs
    .stat(source)
    .then((stats) => stats.isDirectory())
    .catch(() => false);

  if (!isDirectory) {
    console.warn(`Directory not found: ${source}`);
    return [];
  }

  return fs.readdir(source, { withFileTypes: true }).then((dirents) => {
    return dirents
      .filter((dirent) => dirent.isDirectory() && dirent.name !== "__pycache__")
      .map((dirent) => dirent.name);
  });
}

function normalizeRobotName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array<number>(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j <= b.length; j += 1) {
      prev[j] = curr[j];
    }
  }

  return prev[b.length];
}

function getNameSimilarity(a: string, b: string): number {
  const left = normalizeRobotName(a);
  const right = normalizeRobotName(b);

  if (!left || !right) return 0;
  if (left === right) return 1;

  if (
    (left.includes(right) || right.includes(left)) &&
    Math.min(left.length, right.length) >= 4
  ) {
    return 0.92;
  }

  const distance = levenshteinDistance(left, right);
  return 1 - distance / Math.max(left.length, right.length);
}

function mergeRealRobotModalities(
  menagerieRobots: RobotModelRecord[],
  realRobotDirNames: string[],
) {
  for (const realDirName of realRobotDirNames) {
    let bestMatch: RobotModelRecord | undefined;
    let bestScore = 0;

    for (const robot of menagerieRobots) {
      const candidateName = (robot.name ?? robot.dirName ?? "") as string;
      const score = getNameSimilarity(candidateName, realDirName);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = robot;
      }
    }

    if (bestMatch && bestScore >= SIMILARITY_THRESHOLD) {
      const existingModalities =
        (bestMatch.supportedModalities as ("real" | "simulated")[] | undefined) ??
        [];
      const merged = Array.from(new Set(["simulated", ...existingModalities, "real"])) as (
        | "real"
        | "simulated"
      )[];
      bestMatch.supportedModalities = merged;
      continue;
    }

    menagerieRobots.push({
      name: realDirName,
      dirName: realDirName,
      supportedModalities: ["real"],
    });
  }
}


async function scanMenagerie() {
  const results = {
    robots: [] as RobotModelRecord[],
    configurations: [] as any[],
  };

  try {
    const dirs = await fs.readdir(MENAGERIE_PATH, { withFileTypes: true });

    for (const dirent of dirs) {
      if (!dirent.isDirectory() || dirent.name.startsWith(".")) continue;

      const dirPath = path.join(MENAGERIE_PATH, dirent.name);
      const files = await fs.readdir(dirPath);

      // Stage 1: Robot Detection
      for (const file of files) {
        if (!file.endsWith(".xml") || file.toLowerCase().includes("scene"))
          continue;

        const content = await fs.readFile(path.join(dirPath, file), "utf-8");
        if (content.includes("<actuator>")) {
          const metadata = parseRobotXmlMetadata(content);
          const dirName = dirent.name;


          results.robots.push({
            name: dirent.name, // Robot name is directory name
            dirName: dirent.name,
            modelPath: path.join("mujoco_menagerie", dirent.name, file),
            modelFormat: "mjcf",
            properties: metadata,
            supportedModalities: ["simulated"],
          });
          break; // One robot per folder
        }
      }
    }

    // Stage 2: Configuration Detection
    for (const dirent of dirs) {
      if (!dirent.isDirectory() || dirent.name.startsWith(".")) continue;
      const dirPath = path.join(MENAGERIE_PATH, dirent.name);
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        if (!file.endsWith(".xml")) continue;
        const content = await fs.readFile(path.join(dirPath, file), "utf-8");
        // Check for model attribute containing "scene"
        const modelMatch = content.match(
          /<mujoco[^>]*model="([^"]*scene[^"]*)"/i,
        );
        if (modelMatch) {
          const includeMatches = Array.from(
            content.matchAll(/<include[^>]*file="([^"]+)"/g),
          );
          const includedRobots = includeMatches.map((m) => {
            const resolved = path.resolve(dirPath, m[1]);
            const includeDir = path.dirname(resolved);
            return path.basename(includeDir);
          });

          const cameras = parseMujocoCameras(content);

          results.configurations.push({
            name: modelMatch[1],
            sceneXmlPath: path.join("mujoco_menagerie", dirent.name, file),
            includedRobots,
            cameras,
          });
        }
      }
    }

    const realRobotDirNames = await getDirectoryNames(ROBOTS_PATH);
    mergeRealRobotModalities(results.robots, realRobotDirNames);
  } catch (e) {
    console.error("Error scanning menagerie:", e);
  }
  return results;
}

async function main() {
  console.log("Scanning menagerie...");
  const data = await scanMenagerie();

  console.log(
    `Found ${data.robots.length} robots and ${data.configurations.length} configurations.`,
  );

  let fileContent = await fs.readFile(TARGET_FILE, "utf-8");

  // Replace Robots
  const robotStartMarker = "/** START GENERATED MUJOCO MENAGERIE RECORDS */";
  const robotEndMarker = "/** END GENERATED MUJOCO MENAGERIE RECORDS */";

  const robotJSON = data.robots
    .map((r, index) => JSON.stringify({ ...r, id: index + 1 }))
    .join(",\n  ");

  const robotRegex = new RegExp(
    `(${escapeRegExp(robotStartMarker)})[\\s\\S]*?(${escapeRegExp(robotEndMarker)})`,
  );

  fileContent = fileContent.replace(robotRegex, `$1\n  ${robotJSON}\n  $2`);

  // Replace Configurations
  const configStartMarker =
    "/** START GENERATED MUJOCO MENAGERIE CONFIGURATIONS */";
  const configEndMarker =
    "/** END GENERATED MUJOCO MENAGERIE CONFIGURATIONS */";

  const configJSON = data.configurations
    .map((c, index) => JSON.stringify({ ...c, id: index + 1 }))
    .join(",\n  ");

  const configRegex = new RegExp(
    `(${escapeRegExp(configStartMarker)})[\\s\\S]*?(${escapeRegExp(configEndMarker)})`,
  );

  fileContent = fileContent.replace(configRegex, `$1\n  ${configJSON}\n  $2`);

  await fs.writeFile(TARGET_FILE, fileContent);
  console.log("Updated seed_robot_models.ts");
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

main().catch(console.error);
