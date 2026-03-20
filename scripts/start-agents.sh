#!/usr/bin/env bash
# start-agents.sh
# Opens four cmux workspaces — PO, Architect, Dev, QA — each with Claude Code
# pre-loaded and the role declaration already sent.
#
# Usage: ./scripts/start-agents.sh

set -e

CMUX=/Applications/cmux.app/Contents/Resources/bin/cmux
CWD="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE_FILE="$CWD/.claude/workspaces.json"

# Reset workspace registry
echo '{}' > "$WORKSPACE_FILE"

for ROLE in po architect dev qa; do
  case "$ROLE" in
    po)        LABEL="PO"        ;;
    architect) LABEL="Architect" ;;
    dev)       LABEL="Dev"       ;;
    qa)        LABEL="QA"        ;;
  esac

  # Open a new workspace in the project directory (output: "OK workspace:N")
  WS=$($CMUX new-workspace --cwd "$CWD" | awk '{print $2}')

  # Save workspace ID to registry
  tmp=$(mktemp)
  jq --arg role "$ROLE" --arg ws "$WS" '. + {($role): $ws}' "$WORKSPACE_FILE" > "$tmp" && mv "$tmp" "$WORKSPACE_FILE"

  # Give it a readable name
  $CMUX rename-workspace --workspace "$WS" "$LABEL"

  # Start Claude Code in that workspace
  $CMUX send --workspace "$WS" "claude"$'\n'

  # Wait for Claude to boot, then declare the role
  # First agent needs longer — subsequent ones benefit from cumulative loop time
  if [[ "$ROLE" == "po" ]]; then
    sleep 8
  else
    sleep 4
  fi
  $CMUX send --workspace "$WS" "You are the ${LABEL}."$'\n'

  echo "Started $LABEL in workspace $WS"
done

echo ""
echo "Workspace registry saved to .claude/workspaces.json"
echo "Agents can now hand off to each other via: ./scripts/notify.sh <role> <message>"
echo "All four agents running. Switch between them with Ctrl+Tab (or your cmux workspace shortcut)."
