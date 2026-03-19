#!/usr/bin/env bash
# notify.sh — send a message to another agent's cmux workspace
#
# Usage: ./scripts/notify.sh <role> <message>
#   role: po | architect | dev | qa
#
# Example:
#   ./scripts/notify.sh architect "Feature scoring is ready on branch feature-scoring for review."

set -e

CMUX=/Applications/cmux.app/Contents/Resources/bin/cmux
CWD="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE_FILE="$CWD/.claude/workspaces.json"

ROLE="$1"
MESSAGE="$2"

if [[ -z "$ROLE" || -z "$MESSAGE" ]]; then
  echo "Usage: notify.sh <role> <message>"
  echo "Roles: po | architect | dev | qa"
  exit 1
fi

if [[ ! -f "$WORKSPACE_FILE" ]]; then
  echo "Error: .claude/workspaces.json not found. Run start-agents.sh first."
  exit 1
fi

WS=$(jq -r --arg role "$ROLE" '.[$role] // empty' "$WORKSPACE_FILE")

if [[ -z "$WS" ]]; then
  echo "Error: no workspace registered for role '$ROLE'."
  echo "Available: $(jq -r 'keys | join(", ")' "$WORKSPACE_FILE")"
  exit 1
fi

$CMUX send --workspace "$WS" "$MESSAGE"$'\n'
echo "Sent to $ROLE ($WS): $MESSAGE"
