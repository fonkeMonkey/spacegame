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

for ROLE in architect dev qa; do
  case "$ROLE" in
    architect) LABEL="Architect" ;;
    dev)       LABEL="Dev"       ;;
    qa)        LABEL="QA"        ;;
  esac

  # Open a new workspace in the project directory (output: "OK workspace:N")
  WS=$($CMUX new-workspace --cwd "$CWD" | awk '{print $2}')

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
