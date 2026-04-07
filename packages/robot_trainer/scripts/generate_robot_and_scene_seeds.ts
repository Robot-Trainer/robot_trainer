import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { parseMujocoCameras } from "../src/lib/mujoco_parser";
import { type InferSelectModel } from "drizzle-orm";
import { robotModelsTable } from "../src/db/schema";

const MENAGERIE_PATH = path.join(process.cwd(), "mujoco_menagerie");
const TARGET_FILE = path.join(process.cwd(), "src/db/seed_robot_models.ts");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const VENV_LIB = path.join(PROJECT_ROOT, ".venv/lib");
const pythonDir = fsSync.readdirSync(VENV_LIB).find((d) => d.startsWith("python"));
const PYTHON_ENV_PATH = path.join(
  VENV_LIB,
  pythonDir ?? "python3",
  "site-packages/lerobot",
);
const ROBOTS_PATH = path.join(PYTHON_ENV_PATH, "robots");
const TELEOPERATORS_PATH = path.join(PYTHON_ENV_PATH, "teleoperators");
const SIMILARITY_THRESHOLD = 0.82;

type RobotModelRecord = Partial<InferSelectModel<typeof robotModelsTable>>;

type MenagerieConfiguration = {
  name: string;
  sceneXmlPath: string;
  includedRobots: string[];
  cameras: ReturnType<typeof parseMujocoCameras>;
};

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

function formatDirName(dirName: string): string {
  return dirName
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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
      name: formatDirName(realDirName),
      dirName: realDirName,
      supportedModalities: ["real"],
    });
  }
}


async function scanMenagerie() {
  const results = {
    robotModels: [] as RobotModelRecord[],
    configurations: [] as MenagerieConfiguration[],
    teleoperators: [] as RobotModelRecord[],
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

          results.robotModels.push({
            name: formatDirName(dirent.name), // Robot name is directory name
            dirName: dirent.name,
            modelPath: path.join("mujoco_menagerie", dirent.name, file),
            modelFormat: "mjcf",
            simProperties: {
              xml_string: content,
              modelPath: path.join("mujoco_menagerie", dirent.name, file),
              modelFormat: "mjcf",
              ...metadata,
            },
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
    mergeRealRobotModalities(results.robotModels, realRobotDirNames);

    // Stage 3: Teleoperator Detection
    const teleoperatorDirNames = await getDirectoryNames(TELEOPERATORS_PATH);
    for (const dirName of teleoperatorDirNames) {
      results.teleoperators.push({
        name: formatDirName(dirName),
        dirName,
        teleoperator: true,
        supportedModalities: ["real"],
      });
    }
  } catch (error) {
    console.error("Error scanning menagerie:", error);
  }
  return results;
}

async function main() {
  console.log("Scanning menagerie...");
  const data = await scanMenagerie();

  console.log(
    `Found ${data.robotModels.length} robots, ${data.teleoperators.length} teleoperators, and ${data.configurations.length} configurations.`
  );

  const robotModels = data.robotModels.map((r, index) => ({
    id: index + 1,
    ...r
  }));

  const teleoperatorModels = data.teleoperators.map((t, index) => ({
    id: robotModels.length + index + 1,
    ...t
  }));

  const allRobotModels = [...robotModels, ...teleoperatorModels];





  const output = `import { db } from "./db";
import { sql } from "drizzle-orm";
import { robotModelsTable, robotsTable, scenesTable, sceneRobotsTable } from "./schema";

const robotModelsData = ${JSON.stringify(allRobotModels, null, 2)};

export async function seedRobotModels() {
  console.log("Seeding robot models...");
  try {
    if (robotModelsData.length > 0) {
      await db.insert(robotModelsTable).values(robotModelsData as (typeof robotModelsTable.$inferInsert)[]).onConflictDoNothing();
    }

    await db.execute(sql\`SELECT setval(pg_get_serial_sequence('robot_models', 'id'), (SELECT MAX(id) FROM robot_models))\`);

    console.log("Seeding complete.");
  } catch (error) {
    console.error("Error seeding robot models:", error);
  }
}
`;

  await fs.writeFile(TARGET_FILE, output);
  console.log("Updated seed_robot_models.ts");
}

main().catch(console.error);
