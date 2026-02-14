# Plan: Rename Robot Configurations to Scenes

This plan refactors the codebase to replace the concept of "Robot Configuration" with "Scene", improving domain clarity. This involves database schema changes, UI component renaming, and updating all references.

**Steps**

1.  **Stop Development Server**
    *   Ensure the dev server is stopped to release database locks.

2.  **Refactor Database Schema** ([src/db/schema.ts](src/db/schema.ts))
    *   Rename table exports and definitions:
        *   `robotConfigurationsTable` → `scenesTable` (table name: `"scenes"`).
        *   `configRobotsTable` → `sceneRobotsTable` (table name: `"scene_robots"`).
        *   `configCamerasTable` → `sceneCamerasTable` (table name: `"scene_cameras"`).
        *   `configTeleoperatorsTable` → `sceneTeleoperatorsTable` (table name: `"scene_teleoperators"`).
    *   Rename columns:
        *   `configurationId` → `sceneId` (in all link tables).
        *   `robotConfigurationId` → `sceneId` (in `sessionsTable`).
        *   `robotConfigSnapshot` → `sceneSnapshot` (in `sessionsTable`).

3.  **Generate Migration**
    *   Run `npx drizzle-kit generate` to create the SQL migration file for these changes.

4.  **Update Data Logic**
    *   **Selectors**: In [src/db/selectors.ts](src/db/selectors.ts), rename `getRobotConfigurationSnapshot` to `getSceneSnapshot` and update internal queries to use `scenesTable` and `sceneId`.
    *   **Seeding**: In [src/db/seed_robot_models.ts](src/db/seed_robot_models.ts), rename `robotConfigurationsData` to `scenesData` and update insertion logic.

5.  **Rename Views & Components**
    *   **Files**:
        *   Rename [src/views/RobotConfigurations.tsx](src/views/RobotConfigurations.tsx) → `src/views/Scenes.tsx`.
        *   Rename [src/views/RobotConfigurationForm.tsx](src/views/RobotConfigurationForm.tsx) → `src/views/SceneForm.tsx`.
    *   **Components**:
        *   In `Scenes.tsx`: Rename `RobotsView` (conflicting name) to `ScenesView` and update `ResourceManager` title to "Scenes".
        *   In `SceneForm.tsx`: Rename `RobotConfigurationForm` to `SceneForm` and "Advanced Robot Configuration" labels to "Advanced Scene Configuration".
        * Change the advanced view to show a plain textarea with the XML content of the scene for direct editing (instead of a JSON editor).
        *   In [src/views/SessionForm.tsx](src/views/SessionForm.tsx): Rename `RobotConfigurationDropdown` to `SceneDropdown` and update labels from "Robot Configuration" to "Scene".

6.  **Update Application Usage**
    *   **Routes**: In [src/app.tsx](src/app.tsx), update imports to reference `Scenes.tsx` and rename the route/tab from "Robot Configurations" to "Scenes".
    *   **Robot Creation**: In [src/views/RobotForm.tsx](src/views/RobotForm.tsx), update the automatic creation logic to insert into `scenesTable` (naming the record `<RobotName> Default Scene`).
    *   **Tests**: Update `Robots.test.tsx`, `Cameras.test.tsx`, `RobotConfigurations.test.tsx` (rename file to `Scenes.test.tsx`), `Sessions.test.tsx`, and `Skills.test.tsx` to use the new table names and mocks.

**Verification**
1.  Run `npx connect-pg-simple` (or equivalent check) to verify migration applied (via app startup).
2.  Start app: `npm run start`.
3.  Check "Scenes" tab appears in navigation.
4.  Create a new Scene and verify it saves to the `scenes` table.
5.  Create a Session and verify the "Scene" dropdown works.
6.  Run tests: `npm test`.

**Decisions**
-   Renamed `config_*` tables to `scene_*` to align with the new concept and avoid confusion with system configuration.
-   Renamed `RobotsView` in the configurations file to `ScenesView` to fix a naming collision with the actual Robots view.
