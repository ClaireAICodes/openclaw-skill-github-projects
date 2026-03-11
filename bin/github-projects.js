#!/usr/bin/env node

/**
 * GitHub Projects Skill CLI
 * Entry point for all ghp commands
 */

const { program } = require('commander');
const chalk = require('chalk');
const { listProjects, createProject, deleteProject, viewProject } = require('../src/projects');
const { addCard, listCards, moveCard, removeCard } = require('../src/cards');
const { listColumns, createColumn, deleteColumn } = require('../src/columns');
const { syncIssues, syncPRs } = require('../src/sync');
const { setupWebhook, listWebhooks, removeWebhook } = require('../src/webhook');

program
  .name('ghp')
  .description('GitHub Projects Skill — manage projects, cards, and automation')
  .version('1.0.0');

// Global options
program
  .option('--token <token>', 'GitHub token (overrides GH_TOKEN/gh auth)')
  .option('--json', 'Output JSON')
  .option('--quiet', 'Suppress progress indicators');

// --------------------
// Projects commands
// --------------------
const projectsCmd = program.command('projects')
  .description('Manage GitHub projects');

projectsCmd
  .command('list')
  .description('List projects for an owner')
  .option('--owner <owner>', 'GitHub owner (user or org)', required)
  .option('--type <type>', 'Filter by type: org, user, or repo')
  .action(async (options) => {
    try {
      const result = await listProjects(options);
      console.log(result);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

projectsCmd
  .command('create')
  .description('Create a new project')
  .option('--owner <owner>', 'GitHub owner (user or org, or use --repo)')
  .option('--repo <repo>', 'Repository name (owner/repo) for repository projects')
  .option('--name <name>', 'Project name', required)
  .option('--body <body>', 'Project description')
  .action(async (options) => {
    if (!options.owner && !options.repo) {
      console.error(chalk.red('Error:'), 'Must specify either --owner or --repo');
      process.exit(1);
    }
    try {
      const result = await createProject(options);
      console.log(result);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

projectsCmd
  .command('view')
  .description('View project details')
  .option('--id <id>', 'Project ID', required)
  .action(async (options) => {
    try {
      const result = await viewProject(options);
      console.log(result);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

projectsCmd
  .command('delete')
  .description('Delete a project')
  .option('--id <id>', 'Project ID', required)
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      const result = await deleteProject(options);
      console.log(result);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// --------------------
// Cards commands
// --------------------
const cardsCmd = program.command('cards')
  .description('Manage project cards/items');

cardsCmd
  .command('add')
  .description('Add a card to a project (classic projects only)')
  .option('--project <id>', 'Project ID', required)
  .option('--issue <number>', 'Issue or PR number to add')
  .option('--note <text>', 'Note content for note cards')
  .option('--column <name>', 'Column name (classic projects, required if not using position)')
  .action(async (options) => {
    if (!options.issue && !options.note) {
      console.error(chalk.red('Error:'), 'Must specify either --issue or --note');
      process.exit(1);
    }
    try {
      const result = await addCard(options);
      console.log(result);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

cardsCmd
  .command('list')
  .description('List cards in a project')
  .option('--project <id>', 'Project ID', required)
  .option('--column <name>', 'Filter by column name')
  .action(async (options) => {
    try {
      const result = await listCards(options);
      console.log(result);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

cardsCmd
  .command('move')
  .description('Move a card to a different column')
  .option('--card <id>', 'Card ID', required)
  .option('--to-column <name>', 'Target column name', required)
  .action(async (options) => {
    try {
      const result = await moveCard(options);
      console.log(result);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

cardsCmd
  .command('remove')
  .description('Remove a card from a project')
  .option('--card <id>', 'Card ID', required)
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      const result = await removeCard(options);
      console.log(result);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// --------------------
// Columns commands
// --------------------
const columnsCmd = program.command('columns')
  .description('Manage classic project columns (org/user projects)');

columnsCmd
  .command('list')
  .description('List columns in a project')
  .option('--project <id>', 'Project ID', required)
  .action(async (options) => {
    try {
      const result = await listColumns(options);
      console.log(result);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

columnsCmd
  .command('create')
  .description('Create a new column')
  .option('--project <id>', 'Project ID', required)
  .option('--name <name>', 'Column name', required)
  .action(async (options) => {
    try {
      const result = await createColumn(options);
      console.log(result);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

columnsCmd
  .command('delete')
  .description('Delete a column')
  .option('--column <id>', 'Column ID', required)
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      const result = await deleteColumn(options);
      console.log(result);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// --------------------
// Sync commands
// --------------------
const syncCmd = program.command('sync')
  .description('Sync repository content to projects');

syncCmd
  .command('issues')
  .description('Sync repository issues to a project')
  .option('--repo <repo>', 'Repository (owner/repo)', required)
  .option('--project <id>', 'Project ID', required)
  .option('--column <name>', 'Target column (default: first column)')
  .option('--label <label>', 'Filter by label')
  .option('--state <state>', 'Issue state: open or closed', 'open')
  .option('--dry-run', 'Preview without adding')
  .action(async (options) => {
    try {
      const result = await syncIssues(options);
      console.log(result);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

syncCmd
  .command('prs')
  .description('Sync repository pull requests to a project')
  .option('--repo <repo>', 'Repository (owner/repo)', required)
  .option('--project <id>', 'Project ID', required)
  .option('--column <name>', 'Target column')
  .option('--state <state>', 'PR state: open or closed', 'open')
  .option('--dry-run', 'Preview without adding')
  .action(async (options) => {
    try {
      const result = await syncPRs(options);
      console.log(result);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// --------------------
// Webhook commands
// --------------------
const webhookCmd = program.command('webhook')
  .description('Configure webhooks for GitHub project automation');

webhookCmd
  .command('setup')
  .description('Setup a webhook on a repository')
  .option('--repo <repo>', 'Repository (owner/repo)', required)
  .option('--url <url>', 'Webhook URL', required)
  .option('--events <events>', 'Comma-separated events (default: issues,pull_request)', 'issues,pull_request')
  .action(async (options) => {
    try {
      const result = await setupWebhook(options);
      console.log(result);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

webhookCmd
  .command('list')
  .description('List webhooks for a repository')
  .option('--repo <repo>', 'Repository (owner/repo)', required)
  .action(async (options) => {
    try {
      const result = await listWebhooks(options);
      console.log(result);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

webhookCmd
  .command('remove')
  .description('Remove a webhook')
  .option('--repo <repo>', 'Repository (owner/repo)', required)
  .option('--id <id>', 'Webhook ID', required)
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      const result = await removeWebhook(options);
      console.log(result);
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}