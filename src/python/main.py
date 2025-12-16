#!/usr/bin/env python3
"""
Plugin scanner for robots and teleoperators packages.

This script provides a function `scan_plugins` which inspects python modules
in provided directories (or package paths) and returns a JSON-serializable
list of discovered classes with `class_name`, `config_class`, and `name`.

When invoked as a CLI with `--scan <dir1> <dir2>`, it will print JSON to stdout
with keys `robots` and `teleoperators`.
"""

from __future__ import annotations

import argparse
import importlib.util
import inspect
import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional


def inspect_module_file(path: Path) -> List[Dict[str, Any]]:
    """Load a python file as a module and inspect classes in it.

    Returns list of dicts with keys: class_name, config_class, name
    """
    results: List[Dict[str, Any]] = []
    try:
        spec = importlib.util.spec_from_file_location(path.stem, str(path))
        if spec is None or spec.loader is None:
            return results
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)  # type: ignore

        # module-level name if present
        module_name = getattr(module, 'name', None)

        for _, obj in inspect.getmembers(module, inspect.isclass):
            # only consider classes defined in this module=
            if getattr(obj, '__module__', None) != module.__name__:
                continue

            class_name = obj.__name__
            # determine if this class subclasses Robot or Teleoperator by examining MRO
            try:
                mro_names = [base.__name__ for base in inspect.getmro(obj)[1:]]
            except Exception:
                mro_names = []

            kind: Optional[str] = None
            if any(n.lower() == 'robot' for n in mro_names):
                kind = 'robot'
            elif any(n.lower() == 'teleoperator' or n.lower() == 'teleop' for n in mro_names):
                kind = 'teleoperator'

            # skip classes that are not subclasses of Robot or Teleoperator
            if kind is None:
                continue

            config_class = None
            # try class attribute
            if hasattr(obj, 'config_class'):
                cc = getattr(obj, 'config_class')
                config_class = getattr(cc, '__name__', str(cc))
            # also check module-level config_class
            if config_class is None and hasattr(module, 'config_class'):
                cc = getattr(module, 'config_class')
                config_class = getattr(cc, '__name__', str(cc))

            # try name on class or module
            name_val = getattr(obj, 'name', None) or module_name

            results.append({
                'class_name': class_name,
                'config_class': config_class,
                'name': name_val,
                'module': module.__name__,
                'file': str(path),
                'kind': kind,
            })
    except Exception:
        # ignore noisy import errors and continue
        pass

    return results


def scan_directory_for_plugins(directory: Path) -> List[Dict[str, Any]]:
    found: List[Dict[str, Any]] = []
    if not directory.exists():
        return found
    # inspect .py files and packages
    for entry in directory.rglob('*.py'):
        # skip __init__ files only if they don't define classes
        found.extend(inspect_module_file(entry))
    return found


def scan_plugins(robots_path: Optional[str], teleops_path: Optional[str]) -> Dict[str, List[Dict[str, Any]]]:
    """Scan the provided paths (directories) and return found classes.

    If a path is a package name (no os path separator and exists in sys.path),
    this script currently treats given strings as filesystem paths relative to
    this script's parent directory or absolute paths.
    """
    base = Path(__file__).parent
    robots_dir = Path(robots_path) if robots_path else base / 'robots'
    teleops_dir = Path(teleops_path) if teleops_path else base / 'teleoperators'

    robots = scan_directory_for_plugins(robots_dir)
    teleops = scan_directory_for_plugins(teleops_dir)

    return {'robots': robots, 'teleoperators': teleops}


def main_cli() -> int:
    parser = argparse.ArgumentParser(description='Scan robot and teleoperator python modules')
    parser.add_argument('--robots', nargs='*', help='Paths to robots directories', default=[])
    parser.add_argument('--teleops', nargs='*', help='Paths to teleoperators directories', default=[])
    args = parser.parse_args()

    # Support multiple entries; merge results from all provided paths
    robots_results: List[Dict[str, Any]] = []
    teleops_results: List[Dict[str, Any]] = []

    if args.robots:
        for r in args.robots:
            robots_results.extend(scan_directory_for_plugins(Path(r)))
    else:
        robots_results.extend(scan_directory_for_plugins(Path(__file__).parent / 'robots'))

    if args.teleops:
        for t in args.teleops:
            teleops_results.extend(scan_directory_for_plugins(Path(t)))
    else:
        teleops_results.extend(scan_directory_for_plugins(Path(__file__).parent / 'teleoperators'))

    out = {'robots': robots_results, 'teleoperators': teleops_results}
    print(json.dumps(out))
    return 0


if __name__ == '__main__':
    raise SystemExit(main_cli())
