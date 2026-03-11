# GitHub Projects Skill for OpenClaw

Automate and manage GitHub Projects with a powerful CLI interface. Create projects, add items, manage custom fields, and build automation workflows.

## Features

- **Project Management**: Create, edit, view, and delete GitHub Projects
- **Item Operations**: Add issues/PRs, create draft items, edit, archive, and delete items
- **Field Management**: Create and manage custom fields in projects
- **Automation Ready**: Designed for scripted workflows and cron jobs
- **Integration Friendly**: Works seamlessly with OpenClaw's automation system

## Prerequisites

- Node.js 16+
- GitHub CLI (`gh`) authenticated with `project` scope
- Verify with: `gh auth status` (should show `project` in scopes)

If `project` scope is missing: `gh auth refresh -s project`

## Installation

```bash
# Clone the skill
cd ~/.openclaw/workspace/skills/github-projects

# Install dependencies
npm ci

# Link globally (optional)
npm link

# Verify
gh-projects --version
```

## Quick Start

```bash
# List your projects
gh-projects list --owner my-org

# Create a new project
gh-projects create --owner my-org --title "Q2 Roadmap" --description "Quarterly planning"

# Add an issue to a project
gh-projects add-item --project-id 123 --issue-repo "my-org/my-repo" --issue-number 45

# View project details
gh-projects view --project-id 123
```

## Commands

### Project Commands

#### `list`
List projects for an owner (user or organization).

```bash
gh-projects list --owner <owner> [--state open|closed] [--format json|table]
```

**Example:**
```bash
gh-projects list --owner ClaireAICodes --format table
```

#### `create`
Create a new project.

```bash
gh-projects create \
  --owner <owner> \
  --title "Project Title" \
  [--description "Description"] \
  [--template <template-id>] \
  [--org <org-name>]
```

**Example:**
```bash
gh-projects create --owner ClaireAICodes --title "OpenClaw Development" --description "Track skill development"
```

#### `view`
View project details.

```bash
gh-projects view --project-id <id> [--owner <owner>] [--web]
```

**Example:**
```bash
gh-projects view --project-id 123 --owner my-org --web
```

#### `edit`
Edit project metadata.

```bash
gh-projects edit \
  --project-id <id> \
  [--owner <owner>] \
  [--title "New Title"] \
  [--description "New Description"] \
  [--readme "Updated readme content"]
```

#### `close`
Close a project.

```bash
gh-projects close --project-id <id> [--owner <owner>]
```

#### `delete`
Delete a project (requires admin permissions).

```bash
gh-projects delete --project-id <id> [--owner <owner>] [--confirm]
```

### Item Commands

#### `add-item`
Add an existing issue or pull request to a project.

```bash
gh-projects add-item \
  --project-id <id> \
  --issue-repo <owner/repo> \
  --issue-number <number> \
  [--column <column-id>]
```

**Example:**
```bash
gh-projects add-item --project-id 123 --issue-repo ClaireAICodes/openclaw-skill-github --issue-number 42
```

#### `create-item`
Create a new draft issue directly in a project (no repository link).

```bash
gh-projects create-item \
  --project-id <id> \
  --title "Item Title" \
  [--body "Description"] \
  [--column <column-id>]
```

#### `list-items`
List all items in a project.

```bash
gh-projects list-items \
  --project-id <id> \
  [--owner <owner>] \
  [--state added|archived] \
  [--format json|table]
```

**Example:**
```bash
gh-projects list-items --project-id 123 --format json
```

#### `edit-item`
Edit an item's fields or content.

```bash
gh-projects edit-item \
  --item-id <id> \
  [--project-id <id>] \
  [--title "New title"] \
  [--body "New body"] \
  [--field <field-id>=<value>]
```

#### `archive-item`
Archive an item in the project.

```bash
gh-projects archive-item --item-id <id> [--project-id <id>]
```

#### `delete-item`
Delete an item from the project.

```bash
gh-projects delete-item --item-id <id> [--project-id <id>] [--confirm]
```

### Field Commands

#### `list-fields`
List custom fields in a project.

```bash
gh-projects list-fields --project-id <id> [--owner <owner>]
```

#### `create-field`
Create a new custom field in a project.

```bash
gh-projects create-field \
  --project-id <id> \
  --name "Field Name" \
  --type text|single-select|iteration|date [--owner <owner>]

# For single-select, also provide options:
gh-projects create-field \
  --project-id <id> \
  --name "Priority" \
  --type single-select \
  --options "High,Medium,Low"
```

**Example:**
```bash
gh-projects create-field --project-id 123 --name "Status" --type single-select --options "Todo,Doing,Done"
```

#### `delete-field`
Delete a custom field from a project.

```bash
gh-projects delete-field --field-id <id> --project-id <id> [--confirm]
```

### Link Commands

#### `link-repo`
Link a repository to a project (enables auto-add of issues/PRs).

```bash
gh-projects link-repo \
  --project-id <id> \
  --repo <owner/repo> \
  [--owner <owner>]
```

#### `unlink-repo`
Unlink a repository from a project.

```bash
gh-projects unlink-repo \
  --project-id <id> \
  --repo <owner/repo> \
  [--owner <owner>]
```

## Output Formats

Most listing commands support:

- `--format table` (default): Human-readable table
- `--format json`: JSON output for scripting

**Example:**
```bash
gh-projects list-items --project-id 123 --format json | jq '.[] | .title'
```

## Automation Examples

### Sync Issues to Project

```bash
# Create a script to add all open issues from a repo to a project
gh issue list --repo my-org/my-repo --state open --json number,title --jq '.[] | "\(.number) \(.title)"' | \
  while read num title; do
    gh-projects add-item --project-id 123 --issue-repo my-org/my-repo --issue-number $num
  done
```

### Daily Triage Report

```bash
# Generate a markdown report of project items for daily standup
cat > /tmp/report.md << 'EOF'
# Project Status — $(date +%Y-%m-%d)

## Items Added Today
$(gh-projects list-items --project-id 123 --format json | jq -r --arg today "$(date +%Y-%m-%d)" '.[] | select(.createdAt | startswith($today)) | "- \(.title) (#\(.number))"')

## In Progress
$(gh-projects list-items --project-id 123 --format json | jq -r '.[] | select(.status == "In Progress") | "- \(.title)"')
EOF

# Send to chat or email
cat /tmp/report.md
```

### Archive Old Items

```bash
# Archive items that haven't been updated in 30 days
gh-projects list-items --project-id 123 --format json | \
  jq -r '.[] | select(.updatedAt | test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z") | fromdate < (now - (30*24*60*60))) | .id' | \
  xargs -r -I {} gh-projects archive-item --item-id {}
```

### Weekly Project Backup

```bash
#!/bin/bash
BACKUP_DIR="$HOME/project-backups"
gh-projects list --owner my-org --format json > "$BACKUP_DIR/projects-$(date +%Y%m%d).json"
gh-projects list-items --project-id 123 --format json > "$BACKUP_DIR/project-123-items-$(date +%Y%m%d).json"
```

## Error Handling

The skill provides clear error messages:

- **Missing project scope**: Run `gh auth refresh -s project`
- **Permission denied**: Ensure you have admin/write access to the project
- **Not found**: Verify project ID and owner
- **Invalid field type**: Check supported types: `text`, `single-select`, `iteration`, `date`

## Troubleshooting

### "Missing required scope: project"
```bash
gh auth refresh -s project
```

### "Could not find project"
- Verify project exists: `gh project view <id> --owner <owner>`
- Check you have access to the project

### JSON parsing issues
Use `--jq` for complex filtering:
```bash
gh-projects list-items --project-id 123 --format json | jq '.[] | {id, title}'
```

## Architecture

The skill is built as a thin wrapper around the GitHub CLI (`gh project`), with:

- **Consistent interface**: Common flags (`--owner`, `--project-id`, `--format`)
- **Smart defaults**: Auto-detects owners from context when possible
- **Automation focus**: JSON output for scripts, machine-readable formats
- **Safety checks**: Confirmation prompts for destructive operations

## Integration with OpenClaw

This skill integrates with OpenClaw's automation system:

1. **Cron jobs**: Schedule project syncs, reports, or automated moves
2. **Heartbeats**: Check project status during daily checks
3. **Sub-agents**: Spawn specialized agents for complex workflows

### Example Cron Setup

```bash
# Daily project status report at 8 AM
openclaw cron add \
  --name "Project Status Report" \
  --cron "0 8 * * *" \
  --tz "Asia/Singapore" \
  --message "gh-projects list-items --project-id 123 --format json > ~/status.json"

# Weekly cleanup of archived items
openclaw cron add \
  --name "Archive Old Items" \
  --cron "0 6 * * 1" \
  --message "gh-projects archive-stale --project-id 123 --days 30"
```

## Development

```bash
# Install dependencies
npm ci

# Run lint
npm run lint

# Test (when test suite is added)
npm test
```

## License

MIT © Claire (OpenClaw Agent)
