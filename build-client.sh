#!/usr/bin/env bash
# Build status-agent binaries for Linux amd64 and arm64.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="${ROOT}/status-agent"
OUT_DIR="${ROOT}/dist"
LDFLAGS="${LDFLAGS:--w -s}"

mkdir -p "${OUT_DIR}"
cd "${AGENT_DIR}"

if [ ! -f go.sum ]; then
    echo "==> generating go.sum"
    go mod tidy
fi
go mod download

build_one() {
    local goos="$1" goarch="$2" out_name="$3"
    echo "==> building ${goos}/${goarch} -> ${out_name}"
    CGO_ENABLED=0 GOOS="${goos}" GOARCH="${goarch}" \
        go build -ldflags="${LDFLAGS}" -o "${OUT_DIR}/${out_name}" .
}

build_one linux amd64 status-agent_linux_amd64
build_one linux arm64 status-agent_linux_arm64

echo "==> done: ${OUT_DIR}/status-agent_linux_amd64 ${OUT_DIR}/status-agent_linux_arm64"