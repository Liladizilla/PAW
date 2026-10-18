#!/bin/sh
set -eu

# electron-builder installs P.A.W. under /opt/P.A.W. on Linux.
# Keep software-center metadata in the standard AppStream location.
APP_RESOURCES="/opt/P.A.W./resources/appdata"
METADATA="$APP_RESOURCES/dev.paw.workspace.metainfo.xml"
ICON="$APP_RESOURCES/paw-icon.png"

if [ -f "$METADATA" ]; then
  install -d -m 0755 /usr/share/metainfo
  install -m 0644 "$METADATA" /usr/share/metainfo/dev.paw.workspace.metainfo.xml
fi

if [ -f "$ICON" ]; then
  install -d -m 0755 /usr/share/icons/hicolor/512x512/apps
  install -m 0644 "$ICON" /usr/share/icons/hicolor/512x512/apps/dev.paw.workspace.png
fi

if command -v appstreamcli >/dev/null 2>&1; then
  appstreamcli refresh-cache --force 2>/dev/null || true
fi

exit 0
