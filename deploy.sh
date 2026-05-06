#!/usr/bin/env bash
# Paperclip one-click deploy script
# Usage: bash deploy.sh [--public] [--port 3100] [--url https://example.com]
set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

PORT=3100
PUBLIC_URL=""
MODE="authenticated"
EXPOSURE="private"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --public)   EXPOSURE="public"; shift ;;
    --port)     PORT="$2"; shift 2 ;;
    --url)      PUBLIC_URL="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo -e "${BOLD}${CYAN}"
echo "  ____                       ____ _ _       "
echo " |  _ \ __ _ _ __   ___ _ __|  __| (_)_ __  "
echo " | |_) / _\` | '_ \ / _ \ '__| |   | | | '_ \ "
echo " |  __/ (_| | |_) |  __/ |  | |___| | | |_) |"
echo " |_|   \__,_| .__/ \___|_|   \____|_|_| .__/ "
echo "            |_|                        |_|    "
echo -e "${NC}"
echo -e "${BOLD}Paperclip — One-Click Docker Deploy${NC}"
echo "--------------------------------------"

# Check Docker
if ! command -v docker &>/dev/null; then
  echo -e "${YELLOW}Docker not found. Installing...${NC}"
  curl -fsSL https://get.docker.com | sh
  sudo systemctl enable --now docker
fi

# Check docker compose
if ! docker compose version &>/dev/null; then
  echo -e "${YELLOW}Docker Compose plugin not found. Installing...${NC}"
  sudo apt-get install -y docker-compose-plugin 2>/dev/null || \
  sudo yum install -y docker-compose-plugin 2>/dev/null || \
  (echo "Please install docker-compose-plugin manually." && exit 1)
fi

# Create .env if not exists
if [ ! -f .env ]; then
  echo -e "${CYAN}Creating .env from .env.example...${NC}"
  cp .env.example .env

  SECRET=$(openssl rand -hex 32)
  sed -i "s/^BETTER_AUTH_SECRET=.*/BETTER_AUTH_SECRET=${SECRET}/" .env
  echo -e "${GREEN}✓ Generated BETTER_AUTH_SECRET${NC}"

  # UID/GID
  sed -i "s/^USER_UID=.*/USER_UID=$(id -u)/" .env
  sed -i "s/^USER_GID=.*/USER_GID=$(id -g)/" .env

  # Port
  sed -i "s/^PORT=.*/PORT=${PORT}/" .env
else
  echo -e "${GREEN}✓ Found existing .env, keeping it${NC}"
fi

# Set PUBLIC_URL
if [ -n "$PUBLIC_URL" ]; then
  sed -i "s|^PAPERCLIP_PUBLIC_URL=.*|PAPERCLIP_PUBLIC_URL=${PUBLIC_URL}|" .env
elif [ -z "$(grep -E '^PAPERCLIP_PUBLIC_URL=https?://' .env)" ]; then
  # Auto-detect server IP
  SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
  sed -i "s|^PAPERCLIP_PUBLIC_URL=.*|PAPERCLIP_PUBLIC_URL=http://${SERVER_IP}:${PORT}|" .env
  echo -e "${CYAN}Auto-detected URL: http://${SERVER_IP}:${PORT}${NC}"
fi

# Set exposure
sed -i "s/^PAPERCLIP_DEPLOYMENT_EXPOSURE=.*/PAPERCLIP_DEPLOYMENT_EXPOSURE=${EXPOSURE}/" .env

echo ""
echo -e "${CYAN}Building and starting Paperclip...${NC}"
echo "(This may take 5-10 minutes on first run)"
echo ""

docker compose up -d --build

echo ""
echo -e "${GREEN}${BOLD}✓ Paperclip is running!${NC}"
echo ""

FINAL_URL=$(grep '^PAPERCLIP_PUBLIC_URL=' .env | cut -d= -f2-)
echo -e "  Open: ${BOLD}${FINAL_URL}${NC}"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f paperclip   # view logs"
echo "  docker compose ps                  # check status"
echo "  docker compose down                # stop"
echo "  docker compose up -d --build       # update & restart"
