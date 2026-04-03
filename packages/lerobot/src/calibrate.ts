import { WebSerialPortWrapper } from "@robot-trainer/serial";
import {
  readAllMotorPositions,
  type MotorCommunicationPort,
} from "./utils/motor-communication.js";
import {
  setHomingOffsets,
  writeHardwarePositionLimits,
} from "./utils/motor-calibration.js";
import { createSO100Config } from "./robots/so100_config.js";
import type { RobotHardwareConfig } from "./types/robot-config.js";
import type {
  CalibrateConfig,
  CalibrationResults,
  LiveCalibrationData,
  CalibrationProcess,
} from "./types/calibration.js";

import { Robot } from "./robots/robot.js";
import { BiOpenarmFollowerConfig, BiOpenarmFollower } from "./robots/bi_openarm_follower.js";
import { BiSoFollowerConfig, BiSoFollower } from "./robots/bi_so_follower.js";
import { HopeJrConfig, HopeJr } from "./robots/hope_jr.js";
import { KochFollowerConfig, KochFollower } from "./robots/koch_follower.js";
import { LekiwiConfig, Lekiwi } from "./robots/lekiwi.js";
import { OmxFollowerConfig, OmxFollower } from "./robots/omx_follower.js";
import { OpenarmFollowerConfig, OpenarmFollower } from "./robots/openarm_follower.js";
import { SoFollowerConfig, SoFollower } from "./robots/so_follower.js";

// Re-export types for external use
export type {
  CalibrationResults,
  LiveCalibrationData,
  CalibrationProcess,
} from "./types/calibration.js";

export function getRobotInstance(robotType: string): Robot | null {
  switch (robotType) {
    case "bi_openarm_follower":
      return new BiOpenarmFollower(new BiOpenarmFollowerConfig());
    case "bi_so_follower":
      return new BiSoFollower(new BiSoFollowerConfig());
    case "hope_jr":
      return new HopeJr(new HopeJrConfig());
    case "koch_follower":
      return new KochFollower(new KochFollowerConfig());
    case "lekiwi":
      return new Lekiwi(new LekiwiConfig());
    case "omx_follower":
      return new OmxFollower(new OmxFollowerConfig());
    case "openarm_follower":
      return new OpenarmFollower(new OpenarmFollowerConfig());
    case "so_follower":
      return new SoFollower(new SoFollowerConfig());
    default:
      return null;
  }
}

/**
 * Record ranges of motion with live updates
 */
async function recordRangesOfMotion(
  port: MotorCommunicationPort,
  motorIds: number[],
  motorNames: string[],
  shouldStop: () => boolean,
  onLiveUpdate?: (data: LiveCalibrationData) => void
): Promise<{
  rangeMins: { [motor: string]: number };
  rangeMaxes: { [motor: string]: number };
}> {
  const rangeMins: { [motor: string]: number } = {};
  const rangeMaxes: { [motor: string]: number } = {};

  const startPositions = await readAllMotorPositions(port, motorIds);

  for (let i = 0; i < motorNames.length; i++) {
    const motorName = motorNames[i];
    const startPosition = startPositions[i];
    rangeMins[motorName] = startPosition;
    rangeMaxes[motorName] = startPosition;
  }

  while (!shouldStop()) {
    try {
      const positions = await readAllMotorPositions(port, motorIds);

      for (let i = 0; i < motorNames.length; i++) {
        const motorName = motorNames[i];
        const position = positions[i];

        if (position < rangeMins[motorName]) {
          rangeMins[motorName] = position;
        }
        if (position > rangeMaxes[motorName]) {
          rangeMaxes[motorName] = position;
        }
      }

      if (onLiveUpdate) {
        const liveData: LiveCalibrationData = {};
        for (let i = 0; i < motorNames.length; i++) {
          const motorName = motorNames[i];
          liveData[motorName] = {
            current: positions[i],
            min: rangeMins[motorName],
            max: rangeMaxes[motorName],
            range: rangeMaxes[motorName] - rangeMins[motorName],
          };
        }
        onLiveUpdate(liveData);
      }
    } catch {
      // Continue recording despite errors
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return { rangeMins, rangeMaxes };
}

function applyRobotSpecificRangeAdjustments(
  robotType: string,
  protocol: { resolution: number },
  rangeMins: { [motor: string]: number },
  rangeMaxes: { [motor: string]: number }
): void {
  if (robotType.startsWith("so100") && rangeMins["wrist_roll"] !== undefined) {
    rangeMins["wrist_roll"] = 0;
    rangeMaxes["wrist_roll"] = protocol.resolution - 1;
  }
}

/**
 * Main calibrate function - simple API, handles robot types internally
 */
export async function calibrate(
  config: CalibrateConfig
): Promise<CalibrationProcess> {
  const { robot, onLiveUpdate, onProgress, waitForUserStep } = config;

  if (!robot.robotType) {
    throw new Error(
      "Robot type is required for calibration. Please configure the robot first."
    );
  }

  // Interactive path if robust Robot class is matched
  const robotInstance = getRobotInstance(robot.robotType);
  if (robotInstance && waitForUserStep) {
    const resultPromise = (async (): Promise<CalibrationResults> => {
      onProgress?.("⚙️ Connecting to robot...");
      await robotInstance.connect(false);

      const results = await robotInstance.calibrate(waitForUserStep);

      onProgress?.("✅ Calibration finished.");
      await robotInstance.disconnect();
      return results;
    })();

    return {
      stop: () => {
        // no-op for interactive path
      },
      result: resultPromise,
    };
  }

  // Fallback to legacy calibration flow for SO100 backwards compatibility
  const port = new WebSerialPortWrapper(robot.port);
  await port.initialize();

  let robotConfig: RobotHardwareConfig;
  if (robot.robotType.startsWith("so100")) {
    robotConfig = createSO100Config(robot.robotType);
  } else {
    throw new Error(`Unsupported robot type: ${robot.robotType}`);
  }

  let shouldStop = false;
  const stopFunction = () => shouldStop;

  const resultPromise = (async (): Promise<CalibrationResults> => {
    onProgress?.("⚙️ Setting motor homing offsets");
    const homingOffsets = await setHomingOffsets(
      port,
      robotConfig.motorIds,
      robotConfig.motorNames
    );

    const { rangeMins, rangeMaxes } = await recordRangesOfMotion(
      port,
      robotConfig.motorIds,
      robotConfig.motorNames,
      stopFunction,
      onLiveUpdate
    );

    applyRobotSpecificRangeAdjustments(
      robot.robotType!,
      robotConfig.protocol,
      rangeMins,
      rangeMaxes
    );

    await writeHardwarePositionLimits(
      port,
      robotConfig.motorIds,
      robotConfig.motorNames,
      rangeMins,
      rangeMaxes
    );

    const results: CalibrationResults = {};
    for (let i = 0; i < robotConfig.motorNames.length; i++) {
      const motorName = robotConfig.motorNames[i];
      const motorId = robotConfig.motorIds[i];

      results[motorName] = {
        id: motorId,
        drive_mode: robotConfig.driveModes[i],
        homing_offset: homingOffsets[motorName],
        range_min: rangeMins[motorName],
        range_max: rangeMaxes[motorName],
      };
    }

    return results;
  })();

  return {
    stop: () => {
      shouldStop = true;
    },
    result: resultPromise,
  };
}
