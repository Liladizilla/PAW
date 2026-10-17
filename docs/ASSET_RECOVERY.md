# P.A.W. Asset Recovery

This guide covers recovery of imported GLB models in the native desktop workspace. Asset restoration is still an acceptance-tested feature, not a guarantee that every older workspace can be repaired automatically.

## Normal recovery path

1. Open the installed P.A.W. desktop application, not a browser preview.
2. Use **Import a GLB model** to import a self-contained `.glb` file. The desktop app copies the file into its app-owned asset store.
3. Allow the scene to finish loading. The footer reports successful restores and any missing catalog records, unavailable files, or loader failures.
4. Check the model's position, rotation, scale, and visibility before closing the app.
5. Close P.A.W. completely and relaunch it. Confirm that the model and its transform are restored. Record the app version and OS when reporting a failure.

## If a model is missing

- **Desktop runtime unavailable:** open the installed desktop app. The browser preview cannot resolve app-owned files.
- **Missing asset catalog:** the saved scene refers to models but the local asset catalog is absent. Keep a copy of the workspace data and original GLB files before attempting recovery.
- **Missing file:** the catalog entry exists, but the referenced app-owned asset file is unavailable. Re-import the original self-contained GLB; do not manually guess or edit an internal asset path.
- **Invalid catalog:** preserve a copy of the workspace data for diagnosis. Do not replace it with a hand-written catalog unless the schema and asset IDs have been verified.
- **Model load failure:** note the bounded error shown in the footer and keep the original GLB for reproducing the issue.

## Release acceptance

For each supported OS, test a clean workspace and an existing workspace containing at least one imported GLB. Save the model at a non-default transform, close the application fully, relaunch, and verify the file, transform, visibility, and recovery message. Also test a deliberately missing file and confirm that the application reports the problem without crashing or silently claiming success.

The current Linux CI smoke verifies that Electron starts and its renderer becomes ready. It does **not** verify interactive scene persistence or file restoration, and it does not certify Windows or macOS.
