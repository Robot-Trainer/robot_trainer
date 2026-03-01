export const ENABLE_SIM_FLAG = 'enable-sim';

type FeatureFlags = {
  enableSim: boolean;
};

const truthyValues = new Set(['1', 'true', 'yes', 'on']);

const parseBooleanEnv = (value?: string): boolean => {
  if (!value) return false;
  return truthyValues.has(value.trim().toLowerCase());
};

const argvHasFlag = (argv: string[], flagName: string): boolean => {
  const longForm = `--${flagName}`;
  const legacySingleDash = `-${flagName}`;

  return argv.some((arg) => {
    if (arg === longForm || arg === legacySingleDash) return true;
    if (arg.startsWith(`${longForm}=`)) return true;
    if (arg.startsWith(`${legacySingleDash}=`)) return true;
    return false;
  });
};

export const getFeatureFlags = (
  argv: string[] = process.argv,
  env: NodeJS.ProcessEnv = process.env,
): FeatureFlags => {
  const cliEnabled = argvHasFlag(argv, ENABLE_SIM_FLAG);

  // npm run start --enable-sim (without "--") can be exposed as npm_config_enable_sim.
  const npmRunEnabled = parseBooleanEnv(env.npm_config_enable_sim);
  const appEnvEnabled = parseBooleanEnv(env.ROBOT_TRAINER_ENABLE_SIM);

  return {
    enableSim: cliEnabled || npmRunEnabled || appEnvEnabled,
  };
};

export const featureFlags = getFeatureFlags();
