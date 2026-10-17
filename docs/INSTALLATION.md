# Installing P.A.W.

P.A.W. is a native Electron desktop application. It does not require a hosted website or a Vercel deployment.

> **Release status:** this guide describes the intended release installation path. Do not treat the feature branch or CI build artifacts as a stable release. Installers become supported downloads only after the release checklist is completed and a versioned GitHub Release is published.

## Download a published release

1. Open the [P.A.W. GitHub Releases](https://github.com/Liladizilla/PAW/releases) page.
2. Download the installer for your operating system and CPU architecture.
3. Download `SHA256SUMS.txt` from the same release.
4. Verify the installer checksum before running it. If verification fails, do not install that file.

Published filenames include the product name, version, operating system, architecture and installer format. Only use files attached to a P.A.W. release, not similarly named files from an issue, pull request, or third-party mirror.

## Linux (including Fedora)

The Linux release is intended to include an AppImage and a Debian package.

### AppImage

After downloading the matching `.AppImage` and checksum manifest:

```sh
sha256sum -c SHA256SUMS.txt
chmod +x P.A.W-<version>-linux-<arch>.AppImage
./P.A.W-<version>-linux-<arch>.AppImage
```

Replace the example filename with the exact name attached to the release. If the AppImage reports a missing FUSE library, install the appropriate FUSE compatibility package for your distribution and retry. Do not run the AppImage as root.

### Debian or Ubuntu

Download the matching `.deb` package, verify its checksum, then install it using your distribution's package manager:

```sh
sha256sum -c SHA256SUMS.txt
sudo apt install ./P.A.W-<version>-linux-<arch>.deb
```

The Debian package is not the recommended installation route for Fedora.

## Windows and macOS

- **Windows:** use the signed or explicitly identified unsigned NSIS `.exe` installer from the release. Review the release notes before proceeding if the package is unsigned.
- **macOS:** use the `.dmg` or `.zip` package for your architecture. Unless a release explicitly says otherwise, expect that notarization/signing may not yet be configured and that macOS may display an identity warning.

Do not bypass an operating-system warning unless you have verified the download and understand the warning.

## Build from source (development)

Requirements: Node.js 22.12 or newer, npm, Git, and the native build prerequisites required by Electron for your operating system.

```sh
git clone https://github.com/Liladizilla/PAW.git
cd PAW
npm ci
npm run typecheck
npm test
npm run dev
```

To build a local Linux package:

```sh
npm run package:linux
```

Build output is written to `release/`. A locally built package is a development artifact, not a signed or certified stable release. The source build requires internet access for dependency installation; P.A.W.'s intended runtime is local-first, but some provider features require a configured network connection and API key.

## Data and troubleshooting

- Workspace data and imported GLB assets are stored in the app's user-data directory, separate from the application installer.
- Back up workspace data before testing upgrades or uninstalling development builds.
- A provider API key is optional for local-only workflows and must never be shared in screenshots, logs, or issue reports.
- If startup fails, record the operating system, package filename, P.A.W. version, and the exact error. Never attach credentials or private workspace files to a public issue.
- A successful Linux CI smoke test is not proof of clean-machine compatibility on Windows or macOS. Release notes should identify which operating systems have received manual acceptance testing.
