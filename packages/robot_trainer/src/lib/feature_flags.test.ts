import { describe, expect, it } from 'vitest';

import { getFeatureFlags } from './feature_flags';

describe('getFeatureFlags', () => {
  it('enables simulation flag via CLI switch --enable-sim', () => {
    const flags = getFeatureFlags(['node', 'electron', '--enable-sim'], {});
    expect(flags.enableSim).toBe(true);
  });

  it('enables simulation flag via legacy single-dash switch', () => {
    const flags = getFeatureFlags(['node', 'electron', '-enable-sim'], {});
    expect(flags.enableSim).toBe(true);
  });

  it('enables simulation flag via CLI switch with = sign', () => {
    const flags = getFeatureFlags(['node', 'electron', '--enable-sim=true'], {});
    expect(flags.enableSim).toBe(true);
  });

  it('enables simulation flag via legacy single-dash switch with = sign', () => {
    const flags = getFeatureFlags(['node', 'electron', '-enable-sim=1'], {});
    expect(flags.enableSim).toBe(true);
  });

  it('enables simulation flag via npm_config_enable_sim', () => {
    const flags = getFeatureFlags(['node', 'electron'], { npm_config_enable_sim: 'true' });
    expect(flags.enableSim).toBe(true);
  });

  it('defaults to disabled when not specified', () => {
    const flags = getFeatureFlags(['node', 'electron'], {});
    expect(flags.enableSim).toBe(false);
  });
});
