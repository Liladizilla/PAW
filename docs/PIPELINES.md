# P.A.W. Delivery Pipelines

Status: CI and security checks are operational. Native packaging is exercised on Linux, Windows, and macOS before a release tag is created.

## Desktop release pipeline

- The `native-package-check` pull-request label runs all three native packaging jobs before merge.
- Version-tag pushes (`v*`) package Linux AppImage/deb/RPM, Windows NSIS, and macOS dmg/zip.
- Platform outputs are uploaded as distinct workflow artifacts; missing outputs fail the job.
- The publication job runs only for version tags and only after every platform job succeeds.
- Publication aggregates the artifacts, creates and verifies `SHA256SUMS.txt`, and attaches all files to the GitHub Release.
- Manual workflow runs and labeled PR runs validate packaging and upload temporary Actions artifacts; they do not publish a release.
- After publication, manually test clean-machine install, launch/quit, streamed city geometry, camera and agent controls, asset-import error reporting, workspace recovery, and scene restoration before calling the release certified. Fedora acceptance must use the RPM package or AppImage, not the Debian package.

The release workflow has read-only repository permissions by default. Only the publication job receives `contents: write`. Platform packaging commands use `--publish never`; the dedicated publication job owns release uploads.

## Release policy

1. Run CI, security, and all three native package jobs.
2. Review and merge the fix.
3. Create a new version tag on the merged, verified commit. Never reuse a broken release tag.
4. Verify all expected installers and `SHA256SUMS.txt` are attached to the release.
5. Keep the release marked as uncertified until manual install and persistence acceptance checks are complete.
