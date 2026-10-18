# Precision Workspace UI Plan

This document separates current UI foundations from interaction work that still requires implementation and verification. A CSS token change is not evidence that a feature exists.

## Design rules

- Use compact, flat desktop-tool surfaces: panels near `#181818`–`#1D1D1D`, viewport grid near `#282828`, functional amber `#F2994A`, muted success `#219653`, and error `#EB5757`.
- Keep hierarchy dense and readable: approximately 13px section titles, 11–12px standard controls, and 10–11px monospace telemetry. Do not shrink critical text below comfortable accessibility needs.
- Prefer square or minimally rounded geometry, thin borders, one-color icons, and no decorative gradients, bloom, or glossy materials.
- The renderer must remain adaptive on integrated graphics. UI refinement must not silently increase scene complexity or turn estimated metrics into runtime facts.

## Existing foundations observed in the current source

- Electron + React + Babylon.js workspace and a three-column layout with left workspace navigation, central viewport, and right inspector.
- Babylon scene uses `StandardMaterial` for procedural elements and includes a streamed city renderer.
- Persistent approval records and execution-node status styles exist in the current implementation.
- Renderer performance diagnostics and adaptive crowd quality have supporting code/tests on related work.

These foundations do not imply that every requested interaction below is already implemented or accepted.

## UI interaction backlog

### Layout and resize
- Preserve a non-overlapping tiled layout with user-resizable panel boundaries and saved layout presets.
- Observe the viewport container with `ResizeObserver`; call the Babylon engine resize path after panel changes and verify canvas aspect ratio and camera framing.
- Keep the inspector attached to the right edge and organized into collapsible property groups.
- Keep one low-profile bottom status bar. Display only metrics actually supplied by the runtime; mark unavailable measurements as unavailable instead of fabricating them.

### Viewport
- Add explicit perspective and orthographic camera modes.
- Add top/front/side view actions and numpad bindings, with keyboard handling disabled while typing into editable controls.
- Add focus-selection framing and an X/Y/Z axis gizmo with click-to-snap behavior.
- Keep labels readable at practical zoom levels using screen-space overlays or a tested scale strategy.
- Use thin data-flow links and restrained transfer indicators. Queued work should be represented from scheduler state, not guessed from visual proximity.

### Editing and command access
- Add numeric field scrubbing with Shift precision and Ctrl snapping, guarded against accidental text selection.
- Evaluate arithmetic input using a small, explicit arithmetic parser. Do not use `eval` or `Function`.
- Add multi-field coordinate editing only where keyboard and screen-reader behavior remain clear.
- Add a searchable command HUD on F3 / Ctrl+P, with command registry entries rather than hard-coded display-only matches.
- Consider pie menus only after the core keyboard and pointer interactions are stable and tested.

### Security and destructive actions
- Show a truthful environment badge based on Electron/preload capability state; never infer native security from a visual label.
- Pending approvals must show the actual persisted request payload, requested capability, scope, and any known cost estimate. A missing cost must be shown as unknown.
- Approval-required states must disable conflicting run controls and clearly communicate the blocked execution state. Avoid freezing all viewport navigation unless the approval interaction genuinely requires it.
- Use hold-to-confirm for destructive actions and ensure keyboard accessibility, cancellation, and pointer-leave behavior.

## Acceptance gates

1. Typecheck, full unit tests, production build, and security workflow pass.
2. Automated tests cover keyboard shortcuts, numeric parsing, scrubbing boundaries, layout persistence, resize observer cleanup, and approval/destructive-action state.
3. Verify packaged Electron startup and rendering on Fedora, including a cold launch, viewport resize, selection/focus, approval flow, and persistence after restart.
4. Do not describe an item as complete until its behavior is implemented and verified. CI smoke tests do not replace manual packaged-app acceptance.
