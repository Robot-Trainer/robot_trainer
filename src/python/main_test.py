import os
import tempfile
import textwrap
import unittest
from pathlib import Path

import importlib.util

# Import the scanner module
import main as scanner


class TestPluginScanner(unittest.TestCase):
    def write_file(self, dirpath: Path, relpath: str, content: str):
        p = dirpath / relpath
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(textwrap.dedent(content))
        return p

    def test_detects_robot_and_teleoperator_subclasses(self):
        with tempfile.TemporaryDirectory() as td:
            base = Path(td)
            robots_dir = base / 'robots'
            teleops_dir = base / 'teleoperators'

            # create a robot module defining a Robot base and a subclass
            self.write_file(robots_dir, 'example_robot.py', '''
class Robot:
    pass

class MyRobot(Robot):
    name = 'my_robot'
    class_config = None
''')

            # create a teleoperator module defining Teleoperator base and subclass
            self.write_file(teleops_dir, 'example_teleop.py', '''
class Teleoperator:
    pass

class MyTeleop(Teleoperator):
    name = 'my_teleop'
''')

            # Run the scanner pointing to these directories
            res = scanner.scan_plugins(str(robots_dir), str(teleops_dir))

            robots = res.get('robots', [])
            teleops = res.get('teleoperators', [])

            # Validate robot discovered
            self.assertTrue(any(r['class_name'] == 'MyRobot' and r['kind'] == 'robot' for r in robots), f'robots: {robots}')

            # Validate teleoperator discovered
            self.assertTrue(any(t['class_name'] == 'MyTeleop' and t['kind'] == 'teleoperator' for t in teleops), f'teleops: {teleops}')


if __name__ == '__main__':
    unittest.main()
