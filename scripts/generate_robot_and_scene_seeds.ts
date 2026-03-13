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
    configurations: [] as MenagerieConfiguration[],
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
  } catch (error) {
    console.error("Error scanning menagerie:", error);
  }
  return results;
}

async function main() {
  console.log("Scanning menagerie...");
  const data = await scanMenagerie();

  console.log(
    `Found ${data.robots.length} robots and ${data.configurations.length} configurations.`
  );

  const robotModels = data.robots.map((r, index) => ({
    id: index + 1,
    ...r
  }));

  const scenes = data.configurations.map((c, index) => ({
    id: index + 1,
    name: c.name,
    sceneXmlPath: c.sceneXmlPath,
  }));

  let robotIdCounter = 1;
  const robots: Record<string, unknown>[] = [];
  const sceneRobots: Record<string, unknown>[] = [];

  const dirToRobotModelId = new Map(robotModels.map((r) => [r.dirName, r.id]));
  const robotModelToRobotId = new Map();

  for (const rm of robotModels) {
    if (rm.supportedModalities?.includes("simulated")) {
      robots.push({
        id: robotIdCounter,
        name: rm.name,
        modality: "simulated",
        robotModelId: rm.id,
        data: { type: "simulation" }
      });
      robotModelToRobotId.set(rm.id, robotIdCounter);
      robotIdCounter++;
    }
  }

  for (const c of data.configurations) {
    const sceneId = scenes.find((s) => s.sceneXmlPath === c.sceneXmlPath).id;

    for (const robotDirName of c.includedRobots) {
      const rmId = dirToRobotModelId.get(robotDirName);
      if (rmId) {
        const rId = robotModelToRobotId.get(rmId);
        if (rId) {
          sceneRobots.push({
            sceneId: sceneId,
            robotId: rId,
            snapshot: robots.find(r => r.id === rId)
          });
        }
      }
    }

  }

  const output = `import { db } from "./db";
import { sql } from "drizzle-orm";
import { robotModelsTable, robotsTable, scenesTable, sceneRobotsTable } from "./schema";

const robotModelsData = ${JSON.stringify(robotModels, null, 2)};
const robotsData = ${JSON.stringify(robots, null, 2)};
const scenesData = ${JSON.stringify(scenes, null, 2)};
const sceneRobotsData = ${JSON.stringify(sceneRobots, null, 2)};

export async function seedRobotModels() {
  console.log("Seeding robot models...");
  try {
    if (robotModelsData.length > 0) {
      await db.insert(robotModelsTable).values(robotModelsData as (typeof robotModelsTable.$inferInsert)[]).onConflictDoNothing();
    }
    if (robotsData.length > 0) {
      await db.insert(robotsTable).values(robotsData as (typeof robotsTable.$inferInsert)[]).onConflictDoNothing();
    }
    if (scenesData.length > 0) {
      await db.insert(scenesTable).values(scenesData as (typeof scenesTable.$inferInsert)[]).onConflictDoNothing();
    }
    if (sceneRobotsData.length > 0) {
      await db.insert(sceneRobotsTable).values(sceneRobotsData as (typeof sceneRobotsTable.$inferInsert)[]).onConflictDoNothing();
    }

    await db.execute(sql\`SELECT setval(pg_get_serial_sequence('robot_models', 'id'), (SELECT MAX(id) FROM robot_models))\`);
    await db.execute(sql\`SELECT setval(pg_get_serial_sequence('robots', 'id'), (SELECT MAX(id) FROM robots))\`);
    await db.execute(sql\`SELECT setval(pg_get_serial_sequence('scenes', 'id'), (SELECT MAX(id) FROM scenes))\`);
    await db.execute(sql\`SELECT setval(pg_get_serial_sequence('cameras', 'id'), (SELECT MAX(id) FROM cameras))\`);

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
