This directory contains the Python plugin scanner used by the Electron app.

Build the single-file bundled Python executable (requires `pyinstaller`):

1. Install PyInstaller in your environment: `pip install pyinstaller`
2. From the project root run:
   ```bash
   npm run build-python
   ```

The built binary will appear at `src/python/dist/robot_trainer_py` (or `robot_trainer_py.exe` on Windows).

When packaging the Electron app the binary should be included under `python/dist` and the main process will prefer using the bundled binary to scan plugins.
