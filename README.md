# GitHub Projects Skill for OpenClaw

OpenClaw skill for comprehensive GitHub Projects automation. Manage projects, items (issues/PRs/drafts), custom fields, and repository links using the GitHub CLI with consistent interfaces and automation-friendly JSON output.

## Features

- **Project Management**: Create, view, edit, close, and delete GitHub Projects
- **Item Operations**: Add issues/PRs, create draft items, edit titles/bodies, archive, and delete items
- **Field Management**: Create and list custom fields (single-select, text, date, number)
- **Repository Linking**: Link and unlink repositories, list linked repos via GraphQL
- **Automation Ready**: JSON output, machine-readable formats, designed for cron jobs and scripts
- **Consistent Interface**: Common `--owner` and `--project-id` patterns across commands

## Prerequisites

- Node.js 16+
- GitHub CLI (`gh`) authenticated with `project` scope
- Verify with: `gh auth status` (should show `project` in scopes)
- If `project` scope missing: `gh auth refresh -s project`

## Installation

```bash
# From the skill directory
cd ~/.openclaw/workspace/skills/github-projects
npm ci

# Optional: link globally to use from anywhere
npm link

# Verify
gh-projects --version
```

## Quick Examples

```bash
# List your projects
gh-projects list --owner ClaireAICodes

# Create a project
gh-projects create --owner ClaireAICodes --title "Roadmap" --description "Quarterly goals"

# View details
gh-projects view --project-id 1 --owner ClaireAICodes

# Add an existing issue to a project
gh-projects add-item --project-id 1 --issue-repo my-org/my-repo --issue-number 42

# Create a draft task directly in a project
gh-projects create-item --project-id 1 --title "New task" --body "Details..."

# List items (includes draft and linked)
gh-projects list-items --project-id 1 --format json

# Edit a draft item
gh-projects edit-item --item-id <item-id> --title "Updated title" [--project-id 1]

# Archive an item
gh-projects archive-item --item-id <item-id> [--project-id 1]

# Delete an item
gh-projects delete-item --item-id <item-id> [--project-id 1] --confirm

# Create a single-select custom field
gh-projects create-field --project-id 1 --name "Priority" --type single-select --options "High,Medium,Low"

# Link a repository to the project
gh-projects link-repo --project-id 1 --repo my-org/my-repo

# List linked repositories
gh-projects list-repos --project-id 1 --owner my-org

# Close a project
gh-projects close --project-id 1 --owner my-org

# Delete a project
gh-projects delete --project-id 1 --owner my-org --confirm
```

## Commands Reference

### Project Commands

#### `list`
List projects for an owner.

```bash
gh-projects list --owner <owner> [--format table|json] [--state open|closed]
```

- `--owner`: GitHub username or organization (required unless default can be inferred)
- `--format`: Output format, defaults to `table`
- `--state`: Filter by `open` or `closed`

**Example (JSON):**
```bash
gh-projects list --owner ClaireAICodes --format json | jq '.[] | .number, .title'
```

#### `create`
Create a new project. Note: GitHub CLI does not support setting description at creation time, so it's applied via a follow-up edit if provided.

```bash
gh-projects create --owner <owner> --title "Title" [--description "Desc"]
```

- Returns the project number and URL on success.

**Example:**
```bash
gh-projects create --owner ClaireAICodes --title "OpenClaw Development" --description "Track skill development tasks"
```

#### `view`
View project details.

```bash
gh-projects view --project-id <id> --owner <owner> [--web]
```

- `--web`: Opens the project in your browser instead of printing details.

**Example:**
```bash
gh-projects view --project-id 4 --owner ClaireAICodes
```

#### `edit`
Edit project metadata.

```bash
gh-projects edit --project-id <id> --owner <owner> [--title "New"] [--description "New"] [--readme "content" or @filepath]
```

- `--readme`: Can be a string or `@path/to/file.md` to read from file.

#### `close`
Close a project.

```bash
gh-projects close --project-id <id> --owner <owner>
```

#### `delete`
Delete a project permanently. Requires confirmation unless `--confirm` is provided.

```bash
gh-projects delete --project-id <id> --owner <owner> [--confirm]
```

---

### Item Commands

Items are issues, PRs, or draft items within a project.

#### `add-item`
Add an existing issue or pull request to a project.

```bash
gh-projects add-item --project-id <id> --issue-repo <owner/repo> --issue-number <num> [--owner <owner>]
```

- `--issue-repo`: Repository containing the issue/PR
- `--issue-number`: The issue or PR number

**Example:**
```bash
gh-projects add-item --project-id 4 --issue-repo ClaireAICodes/openclaw-skill-github-projects --issue-number 1
```

#### `create-item`
Create a draft item directly in a project (not linked to any issue/PR).

```bash
gh-projects create-item --project-id <id> --title "Title" [--body "Body"] [--owner <owner>]
```

- Returns the item ID on success.

**Example:**
```bash
gh-projects create-item --project-id 4 --title "Research new feature" --body "Investigate options"
```

#### `list-items`
List items in a project.

```bash
gh-projects list-items --project-id <id> --owner <owner> [--state added|archived] [--format table|json]
```

- `--state`: Filter by `added` (default) or `archived`

**Example (JSON for scripting):**
```bash
gh-projects list-items --project-id 4 --format json | jq '.[] | {id, title: .content.title}'
```

#### `edit-item`
Edit an item's title, body, or custom fields.

```bash
gh-projects edit-item --item-id <id> [--project-id <id>] [--title "New"] [--body "New"] [--field <field-id>=<value>]
```

- `--field`: Can be repeated to set multiple custom fields.

**Example:**
```bash
gh-projects edit-item --item-id PVTI_xxx --title "Updated" --field PVTSSF_xxx=High
```

#### `archive-item`
Archive an item (hides from default view).

```bash
gh-projects archive-item --item-id <id> [--project-id <id>]
```

#### `delete-item`
Delete an item from a project. Requires confirmation unless `--confirm` provided.

```bash
gh-projects delete-item --item-id <id> [--project-id <id>] [--confirm]
```

---

### Field Commands

Custom fields add structured data to project items.

#### `list-fields`
List custom fields defined in a project.

```bash
gh-projects list-fields --project-id <id> --owner <owner>
```

**Example output:**
```
ID                              Name                  Type
PVTSSF_xxx                      Status                ProjectV2SingleSelectField
  Field "Status" options: Todo | In Progress | Done
```

#### `create-field`
Create a new custom field.

```bash
gh-projects create-field --project-id <id> --name "Name" --type <type> [--options "a,b,c"]
```

- `--type`: One of `text`, `single-select`, `date`, `number`
- `--options`: Comma-separated options for `single-select` fields only.

**Examples:**
```bash
gh-projects create-field --project-id 1 --name "Priority" --type single-select --options "High,Medium,Low"
gh-projects create-field --project-id 1 --name "Notes" --type text
```

#### `delete-field`
Delete a custom field. Requires confirmation unless `--confirm` provided.

```bash
gh-projects delete-field --field-id <id> [--project-id <id>] [--confirm]
```

---

### Link Commands

Link repositories to projects so that issues/PRs from those repos can be added.

#### `link-repo`
Link a repository to a project.

```bash
gh-projects link-repo --project-id <id> --repo <owner/repo> [--owner <owner>]
```

#### `unlink-repo`
Unlink a repository from a project.

```bash
gh-projects unlink-repo --project-id <id> --repo <owner/repo> [--owner <owner>]
```

#### `list-repos`
List repositories linked to a project.

```bash
gh-projects list-repos --project-id <id> --owner <owner>
```

---

## Output Formats

Most listing commands support:

- `--format table` (default): Human-readable table
- `--format json`: JSON array for scripting

JSON output is ideal for pipelines with `jq`:

```bash
gh-projects list-items --project-id 1 --format json | jq '.[] | select(.content.title | contains("urgent"))'
```

---

## Automation Examples

### Daily Project Status Report

```bash
#!/bin/bash
PROJECT_ID=1
OWNER=my-org
REPORT="/tmp/project-status-$(date +%Y-%m-%d).md"

{
  echo "# Project Status — $(date +%Y-%m-%d)"
  echo ""
  echo "## Items Added Today"
  gh-projects list-items --project-id $PROJECT_ID --owner $OWNER --format json |
    jq -r --arg today "$(date +%Y-%m-%d)" '.[] | select(.createdAt | startswith($today)) | "- \(.content.title)"'

  echo ""
  echo "## In Progress"
  gh-projects list-items --project-id $PROJECT_ID --owner $OWNER --format json |
    jq -r '.[] | select(.status == "In Progress") | "- \(.content.title)"'
} > "$REPORT"

# Send to Telegram, email, or post to Discord
cat "$REPORT"
```

### Sync Open Issues to Project

```bash
# Get all open issues from a repo and add them to a project
gh issue list --repo my-org/my-repo --state open --json number,title |
  jq -r '.[] | "\(.number) \(.title)"' |
  while read num title; do
    gh-projects add-item --project-id 1 --issue-repo my-org/my-repo --issue-number $num
  done
```

### Weekly Archive Cleanup

```bash
# Archive items not updated in 30 days
gh-projects list-items --project-id 1 --format json |
  jq -r '.[] | select(.updatedAt | test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T") | fromdate < (now - (30*24*60*60))) | .id' |
  xargs -r -I {} gh-projects archive-item --item-id {}
```

---

## Error Handling & Troubleshooting

### "Could not determine default owner"
The CLI couldn't automatically detect your GitHub username. Always specify `--owner <username>`.

### "Missing required scope: project"
Run: `gh auth refresh -s project`

### "Could not find project"
Verify the project exists and you have access: `gh project view <id> --owner <owner>`

### "Unknown flag: --repo" on `add-item`
We use `--issue-repo` and `--issue-number` to build the URL internally; pass those, not `--repo` directly.

### JSON parsing errors
If you see JSON parse failures, run with `--format json` and check the raw output. GitHub API may have changed; please open an issue with the full output.

---

## Development

```bash
# Install dependencies
npm ci

# Run manual integration test (requires real GitHub project)
TEST_OWNER=yourname TEST_PROJECT_ID=123 ./test/integration.sh

# Run syntax check of test files
node test/run.js
```

### Project Structure

```
github-projects/
├── bin/
│   └── gh-projects.js      # CLI entry point
├── lib/
│   ├── projects.js         # Project commands (list, create, view, edit, close, delete)
│   ├── items.js            # Item commands (add, create, list, edit, archive, delete)
│   ├── fields.js           # Field commands (list, create, delete)
│   └── links.js            # Link commands (link, unlink, list)
├── test/
│   ├── *.test.js           # Jest unit tests (mocked)
│   ├── integration.sh      # Real integration tests
│   └── __mocks__/execa.js  # Mock for execa
├── README.md
├── SKILL.md
└── package.json
```

---

## Integration with OpenClaw

This skill is designed to be used within OpenClaw automation:

1. **Cron jobs**: Schedule daily project syncs, reports, or archive cleanup
2. **Heartbeats**: Check project status during daily check-ins
3. **Sub-agents**: Spawn agents to manage complex project workflows

Example cron entry:

```bash
openclaw cron add \
  --name "Daily Project Triage" \
  --cron "0 8 * * *" \
  --tz "Asia/Singapore" \
  --message "gh-projects list-items --project-id 1 --format json > ~/project-status.json"
```

---

## License

MIT © Claire (OpenClaw Agent)
