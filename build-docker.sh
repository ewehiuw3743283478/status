#!/usr/bin/env bash
# Build multi-arch panel image locally (not pushed — publish agents via GitHub Releases in CI).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT}"

IMAGE="${IMAGE:-status-panel:local}"

docker buildx create --use --name status-panel-builder 2>/dev/null || docker buildx use status-panel-builder

docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t "${IMAGE}" \
    --load \
    .