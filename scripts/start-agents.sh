#!/usr/bin/env bash
# start-agents.sh
# Opens three cmux workspaces — Architect, Dev, QA — each with Claude Code
# pre-loaded and the role declaration already sent.
#
# Usage: ./scripts/start-agents.sh

set -e

CMUX=/Applications/cmux.app/Contents/Resources/bin/cmux
CLAUDE=/Applications/cmux.app/Contents/Resources/bin/claude
CWD="$(cd "$(dirname "$0")/.." && pwd)"

# Capitalise first letter (works on macOS bash 3)
capitalise() { echo "$(tr '[:lower:]' '[:upper:]' <<< "${1:0:1}")${1:1}"; }

for ROLE in architect dev qa; do
  LABEL=$(capitalise "$ROLE")

  # Open a new workspace in the project directory
  WS=$($CMUX new-workspace --cwd "$CWD")

  # Give it a readable name
  $CMUX rename-workspace --workspace "$WS" "$LABEL"

  # Start Claude Code in that workspace
  $CMUX send --workspace "$WS" "claude"$'\n'

  # Wait for Claude to boot, then declare the role
  sleep 4
  $CMUX send --workspace "$WS" "You are the ${LABEL}."$'\n'

  echo "Started $LABEL in workspace $WS"
done

echo ""
echo "All three agents running. Switch between them with Ctrl+Tab (or your cmux workspace shortcut)."
