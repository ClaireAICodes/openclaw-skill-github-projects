#!/usr/bin/env bash
# Integration tests for github-projects skill
# These tests run against a real GitHub repository and project
# Run with: TEST_OWNER=yourname npm run test:integration

set -e

OWNER="${TEST_OWNER:-ClaireAICodes}"
PROJECT_ID="${TEST_PROJECT_ID:-4}"
REPO="${TEST_REPO:-ClaireAICodes/openclaw-skill-github-projects}"

echo "========================================"
echo "GitHub Projects Skill - Integration Tests"
echo "Owner: $OWNER"
echo "Project ID: $PROJECT_ID"
echo "Repository: $REPO"
echo "========================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

pass() {
  echo -e "${GREEN}✓${NC} $1"
}

fail() {
  echo -e "${RED}✗${NC} $1"
  exit 1
}

# Test 1: List projects
echo ""
echo "Test: List projects"
OUTPUT=$(./bin/gh-projects.js list --owner "$OWNER")
echo "$OUTPUT" | grep -q "ID" && pass "List shows table header" || fail "Missing header"
echo "$OUTPUT" | grep -q "Total:" && pass "List shows total count" || fail "Missing total"

# Test 2: View project
echo ""
echo "Test: View project"
OUTPUT=$(./bin/gh-projects.js view --project-id "$PROJECT_ID" --owner "$OWNER")
echo "$OUTPUT" | grep -q "Project #$PROJECT_ID" && pass "View shows project ID" || fail "Missing project ID"
echo "$OUTPUT" | grep -q "URL:" && pass "View shows URL" || fail "Missing URL"

# Test 3: Create a test issue (using gh directly)
echo ""
echo "Test: Create test issue"
ISSUE_TITLE="Test Issue from Integration $(date +%s)"
ISSUE_URL=$(gh issue create --repo "$REPO" --title "$ISSUE_TITLE" --body "Integration test" | tail -1)
echo "Created: $ISSUE_URL"
[[ -n "$ISSUE_URL" ]] && pass "Issue created" || fail "Failed to create issue"

# Extract issue number from URL (last segment)
ISSUE_NUM=$(echo "$ISSUE_URL" | sed 's/.*\/issues\///')
echo "Issue number: $ISSUE_NUM"

# Wait a moment for GitHub to process
sleep 2

# Test 4: Add item to project
echo ""
echo "Test: Add item to project"
./bin/gh-projects.js add-item --project-id "$PROJECT_ID" --owner "$OWNER" --issue-repo "$REPO" --issue-number "$ISSUE_NUM" 2>&1 | grep -q "Item added" && pass "Item added" || fail "Failed to add item"

# Test 5: List items
echo ""
echo "Test: List items in project"
OUTPUT=$(./bin/gh-projects.js list-items --project-id "$PROJECT_ID" --owner "$OWNER")
echo "$OUTPUT" | grep -q "ID" && pass "List shows ID column" || fail "Missing ID column"
# Title includes timestamp, so match partial
echo "$OUTPUT" | grep -q "Test Issue from Integration" && pass "List shows issue title" || { echo "Output:"; echo "$OUTPUT"; fail "Missing issue title"; }

# Test 6: List fields
echo ""
echo "Test: List custom fields"
OUTPUT=$(./bin/gh-projects.js list-fields --project-id "$PROJECT_ID" --owner "$OWNER")
echo "$OUTPUT" | grep -q "ID" && pass "Fields show ID column" || fail "Missing fields ID column"
echo "$OUTPUT" | grep -q "Name" && pass "Fields show Name column" || fail "Missing fields Name column"

# Test 7: Create a custom field
echo ""
echo "Test: Create custom field"
FIELD_NAME="TestPriority$(date +%s)"
./bin/gh-projects.js create-field --project-id "$PROJECT_ID" --owner "$OWNER" --name "$FIELD_NAME" --type single-select --options "A,B,C" 2>&1 | grep -q "Field created" && pass "Field created" || fail "Failed to create field"

# Verify field appears in list
sleep 1
OUTPUT=$(./bin/gh-projects.js list-fields --project-id "$PROJECT_ID" --owner "$OWNER")
echo "$OUTPUT" | grep -q "$FIELD_NAME" && pass "Field appears in list" || fail "Field not in list"

# Test 8: Link repository (should already be linked, but test idempotency)
echo ""
echo "Test: Link repository (idempotent)"
./bin/gh-projects.js link-repo --project-id "$PROJECT_ID" --owner "$OWNER" --repo "$REPO" 2>&1 | grep -q "linked" && pass "Repository linked (or already linked)" || fail "Failed"

# Test 9: List linked repos
echo ""
echo "Test: List linked repositories"
OUTPUT=$(./bin/gh-projects.js list-repos --project-id "$PROJECT_ID" --owner "$OWNER")
echo "$OUTPUT" | grep -q "$REPO" && pass "Repository appears in list" || fail "Repository not in list"

# Summary
echo ""
echo "========================================"
echo -e "${GREEN}All integration tests passed!${NC}"
echo "========================================"

# Cleanup: don't delete anything; leave test data for manual inspection if needed
echo ""
echo "Note: Test data remains in project for manual inspection."
echo "To clean up:"
echo "  - Delete test issue: gh issue delete $ISSUE_NUM --repo $REPO --confirm"
echo "  - Delete test field: gh project field-delete <field-id>"
echo ""
