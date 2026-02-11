
import sys
import os
import typing
import types
import json
import dataclasses
import importlib
import pkgutil
from pathlib import Path
from typing import Union, List, Optional, Type, Any, get_origin, get_args

# Add site-packages to ensure we can import lerobot
site_packages = Path("src/python/.venv/lib/python3.12/site-packages").resolve()
sys.path.append(str(site_packages))

print(f"Using site-packages: {site_packages}")

try:
    import lerobot
    import pydantic
    from pydantic import TypeAdapter
    print("Successfully imported lerobot and pydantic")
except ImportError as e:
    print(f"Error importing modules: {e}")
    sys.exit(1)

# Import all submodules to ensure registries are populated
def import_submodules(package_name):
    try:
        package = importlib.import_module(package_name)
    except Exception as e:
        print(f"Could not import {package_name}: {e}")
        return

    if not hasattr(package, "__path__"):
        return
        
    for _, name, is_pkg in pkgutil.walk_packages(package.__path__):
        full_name = package.__name__ + "." + name
        try:
            importlib.import_module(full_name)
            if is_pkg:
                import_submodules(full_name)
        except Exception as e:
            pass

print("Crawling lerobot modules to register configs...")
import_submodules("lerobot")

# Explicitly import top-level configs of interest
try:
    from lerobot.configs.train import TrainPipelineConfig
    from lerobot.rl.gym_manipulator import GymManipulatorConfig
    from lerobot.configs.default import EvalConfig
    from lerobot.configs.policies import PreTrainedConfig
    from lerobot.envs.configs import EnvConfig
    from lerobot.teleoperators.config import TeleoperatorConfig
    from lerobot.cameras.configs import CameraConfig
    from lerobot.optim.optimizers import OptimizerConfig
    from lerobot.optim.schedulers import LRSchedulerConfig
    from lerobot.robots.config import RobotConfig
except ImportError as e:
    print(f"Error importing config classes: {e}")
    sys.exit(1)

REGISTRIES = [
    PreTrainedConfig, EnvConfig, TeleoperatorConfig, CameraConfig, 
    OptimizerConfig, LRSchedulerConfig, RobotConfig
]

registry_unions = {}
for reg in REGISTRIES:
    choices = reg.get_known_choices()
    if choices:
        sorted_choices = [choices[k] for k in sorted(choices.keys())]
        registry_unions[reg] = Union[tuple(sorted_choices)]
        print(f"Registry {reg.__name__}: {len(sorted_choices)} choices")

class_cache = {}

def resolve_type(t):
    # Check if t is one of our registries
    if t in registry_unions:
        raw_union = registry_unions[t]
        choices = get_args(raw_union)
        # Patch all choices so the union contains schema-ready classes
        patched_choices = tuple(patch_class(c) for c in choices)
        return Union[patched_choices]

    origin = get_origin(t)
    args = get_args(t)
    
    if origin is not None:
        new_args = tuple(resolve_type(a) for a in args)
        if new_args != args:
            if isinstance(origin, type) and origin is types.UnionType:
                return Union[new_args]
            return origin[new_args]
        return t

    # If simple type, check if it is a dataclass we should visit
    if dataclasses.is_dataclass(t):
        # Only patch lerobot classes to avoid patching standard lib or others
        if hasattr(t, '__module__') and t.__module__ and t.__module__.startswith('lerobot'):
            return patch_class(t)
    
    return t

def patch_class(cls):
    if cls in class_cache:
        return class_cache[cls]
    
    try:
        hints = typing.get_type_hints(cls)
    except Exception as e:
        class_cache[cls] = cls
        return cls

    new_hints = {}
    changed = False
    
    for name, t in hints.items():
        resolved = resolve_type(t)
        if resolved != t:
            new_hints[name] = resolved
            changed = True
        else:
            new_hints[name] = t
            
    if not changed:
        class_cache[cls] = cls
        return cls

    # Reconstruct dataclass
    field_defs = []
    # Use existing fields to preserve defaults
    for f in dataclasses.fields(cls):
        new_type = new_hints.get(f.name, f.type)
        
        kw = {}
        if f.default is not dataclasses.MISSING:
            kw['default'] = f.default
        if f.default_factory is not dataclasses.MISSING:
            kw['default_factory'] = f.default_factory
        if not f.init:
             kw['init'] = False
        kw['repr'] = f.repr
        kw['hash'] = f.hash
        kw['compare'] = f.compare
        if f.metadata:
            kw['metadata'] = f.metadata
        if hasattr(f, 'kw_only'):
             kw['kw_only'] = f.kw_only
             
        field_obj = dataclasses.field(**kw)
        field_defs.append((f.name, new_type, field_obj))
    
    patched_cls = dataclasses.make_dataclass(
        cls.__name__,
        field_defs,
        bases=(cls,), 
        module=cls.__module__ 
    )
    
    class_cache[cls] = patched_cls
    return patched_cls

roots = [TrainPipelineConfig, GymManipulatorConfig, EvalConfig]

print("Patching classes...")
# We must patch roots and use the patched versions
patched_roots = [patch_class(r) for r in roots]

print(f"Patched roots: {[r.__name__ for r in patched_roots]}")

# Verify one patch
for r in patched_roots:
    if r.__name__ == "TrainPipelineConfig":
        # Check annotations of the NEW class
        t = r.__annotations__.get('policy')
        print(f"TrainPipelineConfig.policy type: {t}")

print("Generating schema...")
MasterUnion = Union[tuple(patched_roots)]
try:
    adapter = TypeAdapter(MasterUnion)
    schema = adapter.json_schema()
except Exception as e:
    print(f"Error generating schema: {e}")
    sys.exit(1)

output_path = "src/python/lerobot_schema.json"
try:
    with open(output_path, "w") as f:
        json.dump(schema, f, indent=2)
    print(f"Schema successfully saved to {output_path}")
except Exception as e:
    print(f"Error saving schema: {e}")
