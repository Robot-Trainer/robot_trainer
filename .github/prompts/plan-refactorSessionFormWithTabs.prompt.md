## Plan: Refactor SessionForm with Tabs

This plan refactors `SessionForm.tsx` to use a tabbed interface, separating configuration inputs from the recording/simulation workflow. This solves the overcrowding issue and provides a dedicated, optimized view for video feeds.

**Steps**
1.  **Add MUI Imports** in [src/views/SessionForm.tsx](src/views/SessionForm.tsx):
    *   Import `Tabs`, `Tab`, `Box`, `Grid`, and `Typography` from `@mui/material`.

2.  **Implement Tab State**:
    *   Add `tabValue` state (default `0`) and `handleTabChange` function.
    *   Define tab constants: `TAB_SETTINGS = 0`, `TAB_RECORD = 1`, `TAB_EPISODES = 2`.

3.  **Create Tab Layout Structure**:
    *   Replace the current sidebar layout with a top-level `Tabs` component below the header.
    *   **Header**: Keep "Session Name" input and "Save Session" button persistent at the top.
    *   **Tab 0 (Settings)**:
        *   Move `SceneDropdown` and `Skill` selector here.
        *   Move Dataset Configuration inputs (Repo ID, Directory, Task, FPS) here.
        *   Arrange inputs using `Grid` (e.g., Scene/Skill in one row, Dataset config in another) for better space capability.
    *   **Tab 1 (Record / Simulate)**:
        *   Create a flex layout with a **Left Control Panel** and **Right Video Area**.
        *   **Left Panel**:
            *   Simulation Controls (Play/Pause/Reset).
            *   Recording Controls (Record/Stop, Duration display).
            *   Episode Annotation buttons (Success/Failure).
        *   **Right Video Area**:
            *   Render `VideoPlayer` components in a responsive grid, making sure that there is a separate cell for each camera feed.
            *   Implement dynamic grid columns: 1 camera (`grid-cols-1`), 2-4 (`grid-cols-2`), 5-6 (`grid-cols-3`).
    *   **Tab 2 (Episodes)**: Create a third tab "Session Episodes" that displays a table of all recorded episodes with their status and metadata.

4.  **Verify & Tweak**:
    *   Ensure `VideoPlayer` components resize correctly within the new grid cells.
    *   Check that `SceneDropdown` state persists (managed by parent `SessionForm`) when switching tabs.

**Verification**
*   **Manual**:
    *   Open `SessionForm` and verify tabs appear.
    *   Switch to "Settings": verify Scene/Skill/Dataset inputs are editable.
    *   Switch to "Record/Simulate": verify video players appear and resize correctly.
    *   Start simulation: verify video feeds are active and aligned.
    *   Verify recording timer and annotation buttons work in the new layout.

**Decisions**
*   **Persistent Header**: Kept Session Name above tabs so context is always visible.
*   **Unmounting Tabs**: Used conditional rendering (`tabValue === index && ...`) for tab content. This ensures video players disconnect when in Settings (saving resources) and reconnect when returning to Record.
*   **Grid Logic**: Explicitly defined grid columns based on camera count to maximize video size.
