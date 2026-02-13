# Audit and Refactor Plan

This plan ensures all views use standard Material Design inputs, handle save failures gracefully, and implement a consistent "toast + stay on form" behavior for successful saves.

## Phase 1: Infrastructure (Global Toast)
1.  **Create `src/ui/ToastContext.tsx`**
    -   Implement a context and provider using `@mui/material/Snackbar` and `Alert`.
    -   Expose `useToast()` hook with `success(msg)` and `error(msg)` methods.
2.  **Update `src/app.tsx`**
    -   Wrap the application root with `<ToastProvider>`.

## Phase 2: Generic Resource Manager Update
3.  **Update `src/ui/ResourceManager.tsx`**
    -   Integrate `useToast`.
    -   Modify `onSave` logic:
        -   **Success**: Show "Saved successfully" toast. Update internal `editing` state to the returned item (so the form stays open in "edit" mode). **Remove** `setShowForm(false)` to prevent closing.
        -   **Failure**: Show error toast (replacing or augmenting inline error).
        -   **Create vs Update**: Ensure `create` operations transition the form to "edit" mode by setting the new ID/record in `editing` state.

## Phase 3: View-Specific Refactoring
4.  **Refactor `src/views/SessionForm.tsx`**
    -   Replace raw HTML `<input>` and `<select>` with standard `src/ui/Input` and `src/ui/Select` wrappers.
    -   Ensure all inputs use `variant="standard"`.
    -   Remove local error logging; rely on `ResourceManager` for feedback. (Check if it uses local state for errors; if so, sync with `ResourceManager`).

5.  **Refactor `src/views/SystemSettings.tsx`**
    -   Integrate `useToast`.
    -   Update `save` function to trigger toasts on success/failure.
    -   Remove inline success messages in favor of toasts.

6.  **Refactor `src/views/CameraConfigurationForm.tsx`** (Unused but will fix)
    -   Update internal `TextField` usage to include `variant="standard"`.
    -   Add `useToast` to `handleSave`.

7.  **Review `src/views/RobotForm.tsx` & `src/views/RobotConfigurationForm.tsx`**
    -   Verify inputs use `variant="standard"` (via `Input` wrapper).
    -   Verify they work correctly with the new `ResourceManager` "stay on form" behavior (ensure `useEffect` on `initialData` correctly resets form state).

## Verification
-   **Manual Test**: Go to "System Settings". Save. Expect toast + stay.
-   **Manual Test**: Go to "Robots" (ResourceManager). Create new. Expect toast + form stays open with new ID.
-   **Manual Test**: Go to "Sessions". Verify inputs look standard (underline style). Create new. Expect toast + stay.
-   **Error Test**: Trigger a save error (e.g., duplicate name if validated) and verify error toast appears.

## Decisions
-   **Custom Toast**: Chose generic `MUI Snackbar` over `notistack` to avoid new dependencies.
-   **ResourceManager Strategy**: `ResourceManager` will handle the "stay on form" logic centrally for all resource-based views (`Robots`, `Sessions`, `Skills`, etc.), ensuring consistency without editing every single form file for logic.
