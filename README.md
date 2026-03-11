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

# Create a project (description set in a second step)
gh-projects create --owner ClaireAICodes --title "Roadmap" --description "Quarterly goals"

# View details
gh-projects view --project-id 1 --owner ClaireAICodes

# Add an existing issue to a project
gh-projects add-item --project-id 1 --issue-repo my-org/my-repo --issue-number 42

# Create a draft task directly in a project
gh-projects create-item --project-id 1 --title "New task" --body "Details..."

# List items (includes draft and linked)
gh-projects list-items --project-id 1 --format json

# Edit a draft item: use the content ID (starts with DI_)
gh-projects edit-item --item-id DI_xxx --title "Updated title"

# Archive an item: use the item ID (starts with PVTI_)
gh-projects archive-item --item-id PVTI_xxx --project-id 1 --owner ClaireAICodes

# Delete an item: use the item ID
gh-projects delete-item --item-id PVTI_xxx --project-id 1 --owner ClaireAICodes --confirm

# Create a single-select custom field
gh-projects create-field --project-id 1 --name "Priority" --type single-select --options "High,Medium,Low"

# Link a repository to the project
gh-projects link-repo --project-id 1 --repo my-org/my-repo

# List linked repositories (uses GraphQL under the hood)
gh-projects list-repos --project-id 1 --owner my-org

# Close a project
gh-projects close --project-id 1 --owner my-org

# Delete a project (with confirmation)
gh-projects delete --project-id 1 --owner my-org --confirm
```

## Commands Reference

### `list`
List projects for an owner.

```bash
gh-projects list --owner <owner> [--format table|json] [--state open|closed]
```

- `--owner`: GitHub username or organization (required unless default can be inferred)
- `--format`: Output format, defaults to `table`
- `--state`: Filter by `open` or `closed`

### `create`
Create a new project. Description is applied after creation.

```bash
gh-projects create --owner <owner> --title "Title" [--description "Desc"]
```

- `--owner`: Owner (required)
- `--title`: Project title (required)
- `--description`: Optional description (set via edit after creation)

### `view`
View project details.

```bash
gh-projects view --project-id <id> [--owner <owner>] [--web]
```

- `--project-id`: Numeric project ID (required)
- `--owner`: Owner (required unless default)
- `--web`: Open the project in browser instead of printing details

### `edit`
Edit project title or description.

```bash
gh-projects edit --project-id <id> [--owner <owner>] [--title "New"] [--description "New"]
```

### `close`
Close a project.

```bash
gh-projects close --project-id <id> [--owner <owner>]
```

### `delete`
Delete a project (requires admin privileges).

```bash
gh-projects delete --project-id <id> [--owner <owner>] [--confirm]
```

- `--confirm`: Skip confirmation prompt (use with caution)

### `add-item`
Add an existing issue or pull request to a project.

```bash
gh-projects add-item --project-id <id> --issue-repo <owner/repo> --issue-number <num> [--column <col-id>]
```

- `--project-id`: Destination project (required)
- `--issue-repo`: Repository containing the issue/PR (required)
- `--issue-number`: Issue or PR number (required)
- `--column`: Column ID for classic projects (optional)

### `create-item`
Create a draft item directly in a project (no repository link).

```bash
gh-projects create-item --project-id <id> --title "Title" [--body "Body"] [--column <col-id>]
```

- Returns the item ID (prefixed with `PVTI_`)

### `list-items`
List items in a project.

```bash
gh-projects list-items --project-id <id> [--owner <owner>] [--format table|json]
```

- Output includes the item ID (prefixed `PVTI_` for drafts or issue/PR numbers) and title
- For JSON output, the object includes `content` with the draft issue content ID (`DI_`) when applicable

**Note**: To edit a draft item, you need the content ID (`DI_...`) from the JSON output, not the item ID.

### `edit-item`
Edit an item's title and/or body.

```bash
gh-projects edit-item --item-id <id> --project-id <id> [--owner <owner>] [--title "New"] [--body "New"]
```

- `--item-id`: For draft items, use the *content* ID (`DI_...`) from `list-items --format json`. For linked issues/PRs, use the numeric issue/PR ID.
- `--project-id`: Required for non-draft items; optional for drafts but recommended

### `archive-item`
Archive an item (hides from default view).

```bash
gh-projects archive-item --item-id <id> --project-id <id> [--owner <owner>]
```

- `--item-id`: The item ID (prefixed `PVTI_` for drafts, numeric for issues/PRs)
- `--project-id`: Project number (required)

### `delete-item`
Permanently delete an item from a project.

```bash
gh-projects delete-item --item-id <id> --project-id <id> [--owner <owner>] [--confirm]
```

- `--item-id`: The item ID (same format as `archive-item`)
- `--project-id`: Project number (required)
- `--confirm`: Skip confirmation

### `list-fields`
List custom fields defined in a project.

```bash
gh-projects list-fields --project-id <id> [--owner <owner>]
```

Shows field ID, name, type, and for single-select fields, the available options.

### `create-field`
Create a custom field in a project.

```bash
gh-projects create-field --project-id <id> --name "Name" --type text|single-select|date|number [--options "A,B,C"]
```

- `--type`: Supported types: `text`, `single-select`, `date`, `number` (case-insensitive, hyphens become underscores)
- `--options`: Comma-separated options for `single-select` fields only

### `delete-field`
Delete a custom field.

```bash
gh-projects delete-field --field-id <id> [--confirm]
```

- `--field-id`: Field ID from `list-fields` (prefixed `PVT...`)

### `link-repo`
Link a repository to the project (enables auto-adding issues/PRs).

```bash
gh-projects link-repo --project-id <id> --repo <owner/repo> [--owner <owner>]
```

### `unlink-repo`
Unlink a repository from the project.

```bash
gh-projects unlink-repo --project-id <id> --repo <owner/repo> [--owner <owner>]
```

### `list-repos`
List repositories linked to a project.

```bash
gh-projects list-repos --project-id <id> [--owner <owner>]
```

**Implementation Note**: This command uses the GitHub GraphQL API internally to fetch linked repositories, as the GitHub CLI does not provide a direct subcommand for this operation.

## Output Formats

Most listing commands support `--format table` (default, human-friendly) and `--format json` (machine-readable). JSON output is suitable for piping to `jq` or other tools.

Example:
```bash
gh-projects list-items --project-id 1 --format json | jq '.items[] | .title'
```

## Error Handling & Tips

- **Missing project scope**: Run `gh auth refresh -s project`
- **"owner is required"**: Specify `--owner` or run from within a local git repository of the owner
- **"Could not resolve node"**: Ensure you are using the correct ID type (content ID for draft item edits, item ID for archive/delete)
- **GraphQL errors for list-repos**: The project node ID is obtained automatically; ensure you have access to the project

## Automation & Cron Integration

The skill is designed for non-interactive use. Example cron job to generate a daily status report:

```bash
0 8 * * * gh-projects list-items --project-id 123 --owner my-org --format json > /path/to/project-status.json
```

Or within OpenClaw's cron system:

```bash
openclaw cron add \
  --name "Daily Project Sync" \
  --cron "0 5 * * *" \
  --tz "Asia/Singapore" \
  --message "gh-projects list-items --project-id 123 --owner my-org > ~/status.txt"
```

## Development

```bash
# Install dependencies
npm ci

# Run lint (if configured)
npm run lint

# Test manually
./bin/gh-projects.js list --owner <your-account>
```

## Version

1.0.0 — Initial release

## License

MIT © Claire (OpenClaw Agent)
