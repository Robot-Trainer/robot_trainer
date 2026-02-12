#!/usr/bin/env python3
"""
Simple simulator that tries to use `lerobot` if available, otherwise falls
back to a minimal built-in simulator that draws a moving robot. The script
writes newline-delimited JSON messages to stdout. Frame messages are:
  {"type": "frame", "data": "<base64-jpeg>"}

This is intended to be spawned by the Electron main process and piped into
the renderer for display.
"""
from __future__ import annotations
import sys
import time
import json
import base64
import signal
import argparse
from io import BytesIO
from pathlib import Path

STOP = False


def handle_sigterm(_signum, _frame):
    global STOP
    STOP = True


signal.signal(signal.SIGINT, handle_sigterm)
signal.signal(signal.SIGTERM, handle_sigterm)


def output_frame_raw(img):
    # Ensure 640x480 resolution for FFmpeg consistency
    if img.size != (640, 480):
        img = img.resize((640, 480))
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    try:
        sys.stdout.buffer.write(img.tobytes())
        sys.stdout.flush()
    except BrokenPipeError:
        # FFmpeg process likely died
        global STOP
        STOP = True

def run_fallback_sim(fps=30):
    # Minimal simulation using Pillow to draw a moving circle representing a robot
    try:
        from PIL import Image, ImageDraw
    except Exception:
        sys.stderr.write('Pillow is required for fallback simulator\n')
        sys.stderr.flush()
        return 1

    w, h = 640, 480
    radius = 24
    t = 0.0
    dt = 1.0 / fps
    while not STOP:
        # simple circular motion
        cx = int(w/2 + (w/3) * 0.6 * __import__('math').cos(t))
        cy = int(h/2 + (h/3) * __import__('math').sin(t))
        img = Image.new('RGB', (w, h), (30, 30, 30))
        draw = ImageDraw.Draw(img)
        # robot body
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=(200, 80, 80))
        # heading
        draw.line((cx, cy, cx + radius, cy), fill=(255,255,255), width=3)
        output_frame_raw(img)
        t += 0.2
        time.sleep(dt)
    return 0


def try_lerobot_sim(fps=30):
    """Try to use the `lerobot` package to make a short-running simulation.
    This will be best-effort: if lerobot isn't installed or its API differs,
    fall back to the simple simulator above.
    """
    try:
        import lerobot
    except Exception as e:
        sys.stderr.write(f'lerobot unavailable: {e}\n')
        sys.stderr.flush()
        return run_fallback_sim(fps=fps)

    # Prefer to create the gym manipulator env directly using the provided
    # `lerobot.rl.gym_manipulator.make_robot_env` factory.
    try:
        import importlib
        import importlib.util
        import os
        import numpy as np
        from PIL import Image

        # Load the gym_manipulator module from the same directory
        gym_manipulator_path = Path(__file__).parent / 'gym_manipulator.py'
        if gym_manipulator_path.exists():
            spec = importlib.util.spec_from_file_location('gym_manipulator', gym_manipulator_path)
            gm = importlib.util.module_from_spec(spec)
            sys.modules['gym_manipulator'] = gm
            spec.loader.exec_module(gm)
        else:
            # Fallback to trying to import from path (if installed as a package)
            gm = importlib.import_module('gym_manipulator')
        
        # locate config file: prefer explicit --config path via env var, else search nearby
        cfg_path = None
        
        parser = argparse.ArgumentParser()

        parser.add_argument('--config_path', type=str)
        parser.add_argument('--config', type=str)
        parser.add_argument('--fps', type=int, default=fps)
        args, _ = parser.parse_known_args()
        
        if args.config_path:
            cfg_path = args.config_path
        elif args.config:
            cfg_path = args.config

        if not cfg_path:
            # look for env-config.json next to this script
            here = Path(__file__).parent
            candidate = here / 'env-config.json'
            if candidate.exists():
                cfg_path = str(candidate)
            else:
                # try repository root
                candidate = Path.cwd() / 'src' / 'python' / 'env-config.json'
                if candidate.exists():
                    cfg_path = str(candidate)

        if not cfg_path:
            sys.stderr.write('env-config.json not found; falling back to simple sim\n')
            sys.stderr.flush()
            return run_fallback_sim(fps=fps)

        # Load config manually first to check structure
        try:
            with open(cfg_path, 'r') as f:
                cfg_data = json.load(f)
        except Exception as e:
            sys.stderr.write(f"Failed to load config file: {e}\n")
            return run_fallback_sim(fps=fps)

        # helper to convert dict -> object with attribute access
        def to_obj(d):
            if isinstance(d, dict):
                ns = type('C', (), {})()
                for k, v in d.items():
                    setattr(ns, k, to_obj(v))
                return ns
            elif isinstance(d, list):
                return [to_obj(x) for x in d]
            else:
                return d

        cfg_obj = None

        # Check if this is a DatasetRecordConfig (from UI) or EnvConfig
        # DatasetRecordConfig usually has 'single_task', 'repo_id', etc. at top level
        # EnvConfig usually has 'env' key or 'name'/'task' at top level.
        is_dataset_config = 'single_task' in cfg_data or ('robot' in cfg_data and cfg_data.get('robot', {}).get('type') == 'simulation')

        if is_dataset_config:
            # TRANSFORM DatasetRecordConfig -> EnvConfig
            
            # We try to load defaults from local env-config.json to fill in the gaps for gym_hil/processor
            defaults = {}
            default_path = Path(__file__).parent / 'env-config.json'
            if default_path.exists():
                try:
                    with open(default_path, 'r') as f:
                         defaults = json.load(f).get('env', {})
                except Exception:
                    pass

            # Construct EnvConfig compatible structure
            wrapper_settings = defaults.get('processor', {
                'control_mode': 'keyboard', 
                'gripper': {'use_gripper': True, 'gripper_penalty': -0.02},
                'reset': {
                     'fixed_reset_joint_positions': [0.0, 0.195, 0.0, -2.43, 0.0, 2.62, 0.785],
                     'reset_time_s': 1.0, 
                     'control_time_s': 60.0,
                     'terminate_on_success': True
                 }
            })
            
            # If default env-config has 'wrapper' instead of processor use that
            if 'wrapper' in defaults:
                wrapper_settings = defaults['wrapper']
            
            # Helper to validate task name - if it contains spaces it's likely a description and not a valid ID
            task_name = cfg_data.get('single_task', 'PandaPickCubeKeyboard-v0')
            if ' ' in task_name:
                sys.stderr.write(f"Task '{task_name}' looks like a description, falling back to 'PandaPickCubeKeyboard-v0'\n")
                task_name = 'PandaPickCubeKeyboard-v0'

            cfg_dict = {
                'name': defaults.get('name', 'gym_hil'),
                'task': task_name,
                'fps': cfg_data.get('fps', fps),
                'robot': None, # Force robot to None for simulation
                'teleop': None,
                'wrapper': wrapper_settings,
                'processor': wrapper_settings,
                'device': cfg_data.get('device', 'cpu')
            }
            
            cfg_obj = to_obj(cfg_dict)

        else:
            # Standard EnvConfig handling (manual parse)
            
            # gym_manipulator expects an EnvConfig-like object. The provided
            # env-config.json places the env data under the "env" key; adjust.
            cfg_dict = cfg_data.get('env', cfg_data)
            # some configs use "name" where EnvConfig expects "type" - map it
            if 'type' not in cfg_dict and 'name' in cfg_dict:
                cfg_dict['type'] = cfg_dict.get('name')
            # map 'processor' -> 'wrapper' if present
            if 'processor' in cfg_dict and 'wrapper' not in cfg_dict:
                cfg_dict['wrapper'] = cfg_dict['processor']

            cfg_obj = to_obj(cfg_dict)
            # add top-level device if provided
            if 'device' in cfg_data:
                setattr(cfg_obj, 'device', cfg_data.get('device'))

        if hasattr(gm, 'make_robot_env'):
            sys.stderr.write(f"Creating gym_hil environment with task: {cfg_obj.task}\n")
            sys.stderr.flush()
            res = gm.make_robot_env(cfg_obj)
            if isinstance(res, tuple):
                env, _ = res
            else:
                env = res
            sys.stderr.write(f"Environment created successfully\n")
            sys.stderr.flush()
        else:
            if hasattr(gm, 'main'):
                gm.main()
                return 0
            sys.stderr.write('gym_manipulator.make_robot_env not found; falling back\n')
            sys.stderr.flush()
            return run_fallback_sim(fps=fps)

        # reset environment and attempt to render repeatedly
        sys.stderr.write(f"Resetting environment and starting render loop at {fps} FPS\n")
        sys.stderr.flush()
        try:
            obs = env.reset()
        except Exception:
            try:
                obs = env.reset(None)
            except Exception:
                obs = None

        dt = 1.0 / fps
        action = None
        # prepare zero action if action_space is available
        if hasattr(env, 'action_space'):
            try:
                a = env.action_space.sample()
                # zero it out where numeric
                try:
                    a = a * 0.0
                except Exception:
                    pass
                action = a
            except Exception:
                action = None

        frame_count = 0
        while not STOP:
            frame = None
            try:
                # step to advance simulation first
                if action is not None:
                    try:
                        result = env.step(action)
                        # Handle different return formats (Gym API changes)
                        if isinstance(result, tuple) and len(result) >= 4:
                            # Standard gym return: (obs, reward, terminated, truncated, info) or (obs, reward, done, info)
                            pass
                    except Exception as e:
                        sys.stderr.write(f"Step error: {e}\n")
                        sys.stderr.flush()
                
                # Now render after stepping
                if hasattr(env, 'render'):
                    frame = env.render()
            except Exception as e:
                sys.stderr.write(f"Render loop error: {e}\n")
                sys.stderr.flush()
                frame = None

            if frame is None:
                time.sleep(dt)
                continue

            # convert numpy array or PIL image or bytes into raw RGB and emit
            try:
                if isinstance(frame, np.ndarray):
                    img = Image.fromarray(frame)
                    output_frame_raw(img)
                    frame_count += 1
                    if frame_count == 1:
                        sys.stderr.write(f"✓ Started outputting frames (frame shape: {frame.shape})\n")
                        sys.stderr.flush()
                elif isinstance(frame, (bytes, bytearray)):
                    # Assume it's already raw RGB bytes if bytes, but we need to be careful about size
                    # If it's raw bytes, we might just write it if we trust it.
                    # But for safety, let's try to load it if it's an encoded image, or assume it's raw.
                    # Given the context of "frame", it's likely a numpy array or similar.
                    # If it is bytes, it might be encoded.
                    try:
                        img = Image.open(BytesIO(frame))
                        output_frame_raw(img)
                        frame_count += 1
                    except Exception:
                        # Maybe raw bytes? Just write it if size matches?
                        # For now, let's assume it's an image we can load or a numpy array.
                        pass
                else:
                    # try to coerce via PIL
                    img = Image.fromarray(np.asarray(frame))
                    output_frame_raw(img)
                    frame_count += 1
            except Exception as e:
                # on any conversion error, sleep and continue
                if frame_count == 0:
                    sys.stderr.write(f"Frame conversion error: {e}\n")
                    sys.stderr.flush()
                time.sleep(dt)

        # attempt to close environment cleanly
        try:
            env.close()
        except Exception:
            pass

        return 0
    except Exception as e:
        sys.stderr.write(f'Error running lerobot sim: {e}\n')
        sys.stderr.flush()
        return run_fallback_sim(fps=fps)


def main():
    fps = 30
    # simple CLI options parsing
    if '--fps' in sys.argv:
        try:
            i = sys.argv.index('--fps')
            fps = int(sys.argv[i+1])
        except Exception:
            pass

    # Try lerobot first, but gracefully fallback
    return_code = try_lerobot_sim(fps=fps)
    sys.exit(return_code)


if __name__ == '__main__':
    raise SystemExit(main())
