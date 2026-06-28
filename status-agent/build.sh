#!/usr/bin/env bash
# Local agent builds. Default: Linux amd64 + arm64 (same as CI).
# Set BUILD_ALL=1 to also build additional cross-platform targets.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ROOT}/dist"
BUILD_DIR="$(cd "$(dirname "$0")" && pwd)"
LDFLAGS="${LDFLAGS:--w -s}"

mkdir -p "${OUT_DIR}"
cd "${BUILD_DIR}"

build_one() {
    local goos="$1" goarch="$2" out_name="$3"
    shift 3
    echo "==> building ${goos}/${goarch} -> ${out_name}"
    (
        export CGO_ENABLED=0 GOOS="${goos}" GOARCH="${goarch}"
        while [ $# -gt 0 ] && [[ "$1" == *=* ]]; do
            export "$1"
            shift
        done
        go build -ldflags="${LDFLAGS}" -o "${OUT_DIR}/${out_name}" .
    )
}

# CI / default targets
build_one linux amd64 status-agent_linux_amd64
build_one linux arm64 status-agent_linux_arm64
cp "${OUT_DIR}/status-agent_linux_amd64" "${OUT_DIR}/status-agent"

if [ "${BUILD_ALL:-}" != "1" ]; then
    echo "==> linux amd64/arm64 done (set BUILD_ALL=1 for extra platforms)"
    exit 0
fi

build_one darwin amd64 status-agent_darwin_amd64
build_one freebsd amd64 status-agent_freebsd_amd64
build_one openbsd amd64 status-agent_openbsd_amd64
build_one netbsd amd64 status-agent_netbsd_amd64
build_one darwin arm64 status-agent_darwin_arm64
build_one linux 386 status-agent_linux_386
build_one freebsd 386 status-agent_freebsd_386
build_one openbsd 386 status-agent_openbsd_386
build_one netbsd 386 status-agent_netbsd_386
build_one linux arm status-agent_linux_arm7 GOARM=7
build_one linux arm status-agent_linux_arm6 GOARM=6
build_one linux arm status-agent_linux_arm5 GOARM=5
build_one linux mips status-agent_linux_mips
build_one linux mipsle status-agent_linux_mipsle
build_one linux mips status-agent_linux_mips_softfloat GOMIPS=softfloat
build_one linux mipsle status-agent_linux_mipsle_softfloat GOMIPS=softfloat
build_one linux mips64 status-agent_linux_mips64
build_one linux mips64le status-agent_linux_mips64le
build_one linux mips64 status-agent_linux_mips64_softfloat GOMIPS=softfloat
build_one linux mips64le status-agent_linux_mips64le_softfloat GOMIPS=softfloat
build_one linux ppc64 status-agent_linux_ppc64
build_one linux ppc64le status-agent_linux_ppc64le

echo "==> all platforms built under ${OUT_DIR}/"