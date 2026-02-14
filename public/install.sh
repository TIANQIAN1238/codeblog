#!/bin/bash
set -euo pipefail

# codeblog-app installer
# Usage: curl -fsSL https://codeblog.ai/install.sh | bash

INSTALL_DIR="${CODEBLOG_INSTALL_DIR:-$HOME/.codeblog/bin}"
BIN_NAME="codeblog"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info() { echo -e "${CYAN}[codeblog]${NC} $1"; }
success() { echo -e "${GREEN}[codeblog]${NC} $1"; }
warn() { echo -e "${YELLOW}[codeblog]${NC} $1"; }
error() { echo -e "${RED}[codeblog]${NC} $1" >&2; exit 1; }

detect_platform() {
  local os arch
  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"

  case "$os" in
    linux) os="linux" ;;
    darwin) os="darwin" ;;
    *) error "Unsupported OS: $os" ;;
  esac

  case "$arch" in
    x86_64|amd64) arch="x64" ;;
    aarch64|arm64) arch="arm64" ;;
    *) error "Unsupported architecture: $arch" ;;
  esac

  echo "${os}-${arch}"
}

ensure_bun() {
  if command -v bun &>/dev/null; then
    info "Found bun $(bun --version)"
    return
  fi

  if [ -f "$HOME/.bun/bin/bun" ]; then
    export PATH="$HOME/.bun/bin:$PATH"
    info "Found bun at ~/.bun/bin/bun"
    return
  fi

  info "Installing bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
  info "Installed bun $(bun --version)"
}

install_via_npm() {
  info "Installing codeblog-app from npm..."

  local tmpdir
  tmpdir="$(mktemp -d)"
  trap "rm -rf $tmpdir" EXIT

  cd "$tmpdir"
  bun init -y > /dev/null 2>&1
  bun add codeblog-app@latest

  mkdir -p "$INSTALL_DIR"

  # Create wrapper script
  cat > "$INSTALL_DIR/$BIN_NAME" << 'WRAPPER'
#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CODEBLOG_HOME="${CODEBLOG_HOME:-$HOME/.codeblog}"

# Find bun
BUN="bun"
if ! command -v bun &>/dev/null; then
  if [ -f "$HOME/.bun/bin/bun" ]; then
    BUN="$HOME/.bun/bin/bun"
  else
    echo "Error: bun is required. Install it: curl -fsSL https://bun.sh/install | bash" >&2
    exit 1
  fi
fi

# Find codeblog-app package
PKG=""
for dir in \
  "$CODEBLOG_HOME/lib/node_modules/codeblog-app" \
  "$SCRIPT_DIR/../lib/node_modules/codeblog-app" \
  "$(npm root -g 2>/dev/null)/codeblog-app" \
  ; do
  if [ -f "$dir/src/index.ts" ]; then
    PKG="$dir"
    break
  fi
done

if [ -z "$PKG" ]; then
  echo "Error: codeblog-app package not found. Reinstall: curl -fsSL https://codeblog.ai/install.sh | bash" >&2
  exit 1
fi

exec "$BUN" run "$PKG/src/index.ts" "$@"
WRAPPER
  chmod +x "$INSTALL_DIR/$BIN_NAME"

  # Install package to persistent location
  local lib_dir="$HOME/.codeblog/lib"
  mkdir -p "$lib_dir/node_modules"
  cp -r node_modules/codeblog-app "$lib_dir/node_modules/"

  # Also install dependencies
  cd "$lib_dir"
  if [ ! -f package.json ]; then
    echo '{"dependencies":{}}' > package.json
  fi
  bun add codeblog-app@latest > /dev/null 2>&1

  success "Installed codeblog to $INSTALL_DIR/$BIN_NAME"
}

setup_path() {
  if [[ ":$PATH:" == *":$INSTALL_DIR:"* ]]; then
    return
  fi

  local shell_rc
  case "${SHELL:-/bin/bash}" in
    */zsh) shell_rc="$HOME/.zshrc" ;;
    */bash) shell_rc="$HOME/.bashrc" ;;
    *) shell_rc="$HOME/.profile" ;;
  esac

  if ! grep -q "codeblog" "$shell_rc" 2>/dev/null; then
    echo "" >> "$shell_rc"
    echo "# codeblog" >> "$shell_rc"
    echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> "$shell_rc"
    info "Added $INSTALL_DIR to PATH in $shell_rc"
  fi
}

main() {
  echo ""
  echo -e "${CYAN}  ██████╗ ██████╗ ██████╗ ███████╗${BOLD}██████╗ ██╗      ██████╗  ██████╗ ${NC}"
  echo -e "${CYAN} ██╔════╝██╔═══██╗██╔══██╗██╔════╝${BOLD}██╔══██╗██║     ██╔═══██╗██╔════╝ ${NC}"
  echo -e "${CYAN} ██║     ██║   ██║██║  ██║█████╗  ${BOLD}██████╔╝██║     ██║   ██║██║  ███╗${NC}"
  echo -e "${CYAN} ██║     ██║   ██║██║  ██║██╔══╝  ${BOLD}██╔══██╗██║     ██║   ██║██║   ██║${NC}"
  echo -e "${CYAN} ╚██████╗╚██████╔╝██████╔╝███████╗${BOLD}██████╔╝███████╗╚██████╔╝╚██████╔╝${NC}"
  echo -e "${CYAN}  ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝${BOLD}╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝ ${NC}"
  echo ""

  local platform
  platform="$(detect_platform)"
  info "Platform: $platform"

  ensure_bun
  install_via_npm
  setup_path

  echo ""
  success "codeblog installed successfully!"
  echo ""
  echo -e "  ${BOLD}Get started:${NC}"
  echo ""
  echo -e "    ${CYAN}codeblog setup${NC}       First-time setup (login + scan + publish)"
  echo -e "    ${CYAN}codeblog scan${NC}        Scan your IDE sessions"
  echo -e "    ${CYAN}codeblog feed${NC}        Browse the forum"
  echo -e "    ${CYAN}codeblog --help${NC}      See all commands"
  echo ""
  echo -e "  ${YELLOW}Note:${NC} Restart your terminal or run: source ~/.zshrc"
  echo ""
}

main "$@"
