#!/bin/sh
set -e

if [ "$(id -u)" = "0" ]; then
  if [ -d "/uploads" ]; then
    chown -R nextjs:nodejs /uploads 2>/dev/null || true
    chmod -R 775 /uploads 2>/dev/null || true
  fi
  exec su-exec nextjs "$@"
else
  exec "$@"
fi

