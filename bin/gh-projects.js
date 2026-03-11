#!/usr/bin/env node

/**
 * GitHub Projects Skill CLI
 * Comprehensive tool for managing GitHub Projects
 */

const { program } = require('commander');
const chalk = require('chalk');
const execa = require('execa');
const path = require('path');

// Import command handlers
const projectCommands = require('../lib/projects');
const itemCommands = require('../lib/items');
const fieldCommands = require('../lib/fields');
const linkCommands = require('../lib/links');

program
  .name('gh-projects')
  .description('GitHub Projects automation and management for OpenClaw')
  .version('1.0.0');

// =====================
// PROJECT COMMANDS
// =====================

const listProjects = program
  .command('list')
  .description('List projects for an owner')
  .option('--owner <owner>', 'GitHub owner (user or org)')
  .option('--state <state>', 'Filter by state: open or closed')
  .option('--format <format>', 'Output format: table or json', 'table')
  .action(async (options) => {
    try {
      const owner = options.owner || await getDefaultOwner();
      const result = await projectCommands.list(owner, options.state, options.format);
      console.log(result);
    } catch (error) {
      handleError(error);
    }
  });

listProjects.addHelpText('after', `
Examples:
  $ gh-projects list --owner ClaireAICodes
  $ gh-projects list --state open --format json
`);

const createProject = program
  .command('create')
  .description('Create a new project')
  .option('--owner <owner>', 'GitHub owner (user or org)')
  .requiredOption('--title <title>', 'Project title')
  .option('--description <desc>', 'Project description (set after creation)')
  .action(async (options) => {
    try {
      const owner = options.owner || await getDefaultOwner();
      const result = await projectCommands.create(owner, options.title, {
        description: options.description
      });
      console.log(chalk.green('✓ Project created successfully'));
      console.log(`ID: ${result.number}`);
      console.log(`URL: https://github.com/orgs/${owner}/projects/${result.number}`);
    } catch (error) {
      handleError(error);
    }
  });

const viewProject = program
  .command('view')
  .description('View project details')
  .option('--owner <owner>', 'GitHub owner (user or org)')
  .requiredOption('--project-id <id>', 'Project ID')
  .option('--web', 'Open in browser')
  .action(async (options) => {
    try {
      const owner = options.owner || await getDefaultOwner();

      if (options.web) {
        await openInBrowser(owner, options.projectId);
        return;
      }

      const result = await projectCommands.view(owner, options.projectId);
      console.log(result);
    } catch (error) {
      handleError(error);
    }
  });

const editProject = program
  .command('edit')
  .description('Edit a project')
  .option('--owner <owner>', 'GitHub owner (user or org)')
  .requiredOption('--project-id <id>', 'Project ID')
  .option('--title <title>', 'New title')
  .option('--description <desc>', 'New description')
  .option('--readme <content>', 'New readme content (or @filepath)')
  .action(async (options) => {
    try {
      const owner = options.owner || await getDefaultOwner();
      const readme = options.readme?.startsWith('@')
        ? await readFileContent(options.readme.slice(1))
        : options.readme;

      await projectCommands.edit(owner, options.projectId, {
        title: options.title,
        description: options.description,
        readme
      });
      console.log(chalk.green('✓ Project updated'));
    } catch (error) {
      handleError(error);
    }
  });

const closeProject = program
  .command('close')
  .description('Close a project')
  .option('--owner <owner>', 'GitHub owner (user or org)')
  .requiredOption('--project-id <id>', 'Project ID')
  .action(async (options) => {
    try {
      const owner = options.owner || await getDefaultOwner();
      await projectCommands.close(owner, options.projectId);
      console.log(chalk.green('✓ Project closed'));
    } catch (error) {
      handleError(error);
    }
  });

const deleteProject = program
  .command('delete')
  .description('Delete a project')
  .option('--owner <owner>', 'GitHub owner (user or org)')
  .requiredOption('--project-id <id>', 'Project ID')
  .option('--confirm', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      const owner = options.owner || await getDefaultOwner();

      if (!options.confirm) {
        const confirmed = await confirm(`Delete project ${options.projectId}? This cannot be undone.`);
        if (!confirmed) {
          console.log(chalk.yellow('Cancelled'));
          process.exit(0);
        }
      }

      await projectCommands.remove(owner, options.projectId);
      console.log(chalk.green('✓ Project deleted'));
    } catch (error) {
      handleError(error);
    }
  });

// =====================
// ITEM COMMANDS
// =====================

const addItem = program
  .command('add-item')
  .description('Add an issue or PR to a project')
  .option('--owner <owner>', 'GitHub owner (user or org)')
  .requiredOption('--project-id <id>', 'Project ID')
  .requiredOption('--issue-repo <repo>', 'Repository containing the issue/PR (owner/repo)')
  .requiredOption('--issue-number <num>', 'Issue or PR number')
  .option('--column <id>', 'Column ID (for classic projects)')
  .action(async (options) => {
    try {
      const owner = options.owner || await getDefaultOwner();
      await itemCommands.add(owner, options.projectId, {
        issueRepo: options.issueRepo,
        issueNumber: options.issueNumber,
        columnId: options.column
      });
      console.log(chalk.green('✓ Item added to project'));
    } catch (error) {
      handleError(error);
    }
  });

const createItem = program
  .command('create-item')
  .description('Create a draft item directly in a project')
  .option('--owner <owner>', 'GitHub owner (user or org)')
  .requiredOption('--project-id <id>', 'Project ID')
  .requiredOption('--title <title>', 'Item title')
  .option('--body <body>', 'Item body/description')
  .option('--column <id>', 'Column ID (for classic projects)')
  .action(async (options) => {
    try {
      const owner = options.owner || await getDefaultOwner();
      const result = await itemCommands.create(owner, options.projectId, {
        title: options.title,
        body: options.body,
        columnId: options.column
      });
      console.log(chalk.green('✓ Draft item created'));
      console.log(`ID: ${result.id}`);
    } catch (error) {
      handleError(error);
    }
  });

const listItems = program
  .command('list-items')
  .description('List items in a project')
  .option('--owner <owner>', 'GitHub owner (user or org)')
  .option('--format <format>', 'Output format: table or json', 'table')
  .requiredOption('--project-id <id>', 'Project ID')
  .action(async (options) => {
    try {
      const owner = options.owner || await getDefaultOwner();
      const result = await itemCommands.list(owner, options.projectId, {
        format: options.format
      });
      console.log(result);
    } catch (error) {
      handleError(error);
    }
  });

const editItem = program
  .command('edit-item')
  .description('Edit an item (title and body only)')
  .option('--owner <owner>', 'GitHub owner (user or org)')
  .requiredOption('--item-id <id>', 'Item ID')
  .option('--project-id <id>', 'Project ID (required for context)')
  .option('--title <title>', 'New title')
  .option('--body <body>', 'New body')
  .action(async (options) => {
    try {
      const owner = options.owner || await getDefaultOwner();
      await itemCommands.edit(options.itemId, {
        projectId: options.projectId,
        title: options.title,
        body: options.body
      });
      console.log(chalk.green('✓ Item updated'));
    } catch (error) {
      handleError(error);
    }
  });

const archiveItem = program
  .command('archive-item')
  .description('Archive an item')
  .option('--owner <owner>', 'GitHub owner (user or org)')
  .requiredOption('--item-id <id>', 'Item ID')
  .requiredOption('--project-id <id>', 'Project ID')
  .action(async (options) => {
    try {
      const owner = options.owner || await getDefaultOwner();
      await itemCommands.archive(owner, options.projectId, options.itemId);
      console.log(chalk.green('✓ Item archived'));
    } catch (error) {
      handleError(error);
    }
  });

const deleteItem = program
  .command('delete-item')
  .description('Delete an item from a project')
  .option('--owner <owner>', 'GitHub owner (user or org)')
  .requiredOption('--item-id <id>', 'Item ID')
  .requiredOption('--project-id <id>', 'Project ID')
  .option('--confirm', 'Skip confirmation')
  .action(async (options) => {
    try {
      const owner = options.owner || await getDefaultOwner();
      if (!options.confirm) {
        const confirmed = await confirm(`Delete item ${options.itemId}?`);
        if (!confirmed) {
          console.log(chalk.yellow('Cancelled'));
          process.exit(0);
        }
      }

      await itemCommands.remove(owner, options.projectId, options.itemId);
      console.log(chalk.green('✓ Item deleted'));
    } catch (error) {
      handleError(error);
    }
  });

// =====================
// FIELD COMMANDS
// =====================

const listFields = program
  .command('list-fields')
  .description('List custom fields in a project')
  .option('--owner <owner>', 'GitHub owner (user or org)')
  .requiredOption('--project-id <id>', 'Project ID')
  .action(async (options) => {
    try {
      const owner = options.owner || await getDefaultOwner();
      const result = await fieldCommands.list(owner, options.projectId);
      console.log(result);
    } catch (error) {
      handleError(error);
    }
  });

const createField = program
  .command('create-field')
  .description('Create a custom field in a project')
  .option('--owner <owner>', 'GitHub owner (user or org)')
  .requiredOption('--project-id <id>', 'Project ID')
  .requiredOption('--name <name>', 'Field name')
  .requiredOption('--type <type>', 'Field type: text, single-select, iteration, date')
  .option('--options <opts>', 'For single-select: comma-separated options')
  .action(async (options) => {
    try {
      const owner = options.owner || await getDefaultOwner();
      const parsedOptions = options.options
        ? options.options.split(',').map(o => o.trim())
        : undefined;

      await fieldCommands.create(owner, options.projectId, {
        name: options.name,
        type: options.type,
        options: parsedOptions
      });
      console.log(chalk.green('✓ Field created'));
    } catch (error) {
      handleError(error);
    }
  });

const deleteField = program
  .command('delete-field')
  .description('Delete a custom field')
  .option('--owner <owner>', 'GitHub owner (user or org)')
  .requiredOption('--field-id <id>', 'Field ID')
  .option('--confirm', 'Skip confirmation')
  .action(async (options) => {
    try {
      const owner = options.owner || await getDefaultOwner();
      if (!options.confirm) {
        const confirmed = await confirm(`Delete field ${options.fieldId}?`);
        if (!confirmed) {
          console.log(chalk.yellow('Cancelled'));
          process.exit(0);
        }
      }

      await fieldCommands.remove(options.fieldId);
      console.log(chalk.green('✓ Field deleted'));
    } catch (error) {
      handleError(error);
    }
  });

// =====================
// LINK COMMANDS
// =====================

const linkRepo = program
  .command('link-repo')
  .description('Link a repository to a project')
  .option('--owner <owner>', 'GitHub owner (user or org)')
  .requiredOption('--project-id <id>', 'Project ID')
  .requiredOption('--repo <repo>', 'Repository to link (owner/repo)')
  .action(async (options) => {
    try {
      const owner = options.owner || await getDefaultOwner();
      await linkCommands.link(owner, options.projectId, options.repo);
      console.log(chalk.green('✓ Repository linked'));
    } catch (error) {
      handleError(error);
    }
  });

const unlinkRepo = program
  .command('unlink-repo')
  .description('Unlink a repository from a project')
  .option('--owner <owner>', 'GitHub owner (user or org)')
  .requiredOption('--project-id <id>', 'Project ID')
  .requiredOption('--repo <repo>', 'Repository to unlink')
  .action(async (options) => {
    try {
      const owner = options.owner || await getDefaultOwner();
      await linkCommands.unlink(owner, options.projectId, options.repo);
      console.log(chalk.green('✓ Repository unlinked'));
    } catch (error) {
      handleError(error);
    }
  });

const listRepos = program
  .command('list-repos')
  .description('List repositories linked to a project')
  .option('--owner <owner>', 'GitHub owner (user or org)')
  .requiredOption('--project-id <id>', 'Project ID')
  .action(async (options) => {
    try {
      const owner = options.owner || await getDefaultOwner();
      const result = await linkCommands.list(owner, options.projectId);
      console.log(result);
    } catch (error) {
      handleError(error);
    }
  });

// =====================
// HELPERS
// =====================

async function getDefaultOwner() {
  try {
    const { stdout } = await execa('gh', ['auth', 'status', '--hostname', 'github.com', '--json', 'hosts'], { reject: false });
    if (stdout) {
      const data = JSON.parse(stdout);
      if (data.hosts && data.hosts['github.com'] && data.hosts['github.com'].length > 0) {
        return data.hosts['github.com'][0].login;
      }
    }
  } catch (e) {
    // Fall through
  }
  throw new Error('Could not determine default owner. Please specify --owner.');
}

async function openInBrowser(owner, projectId) {
  const url = `https://github.com/orgs/${owner}/projects/${projectId}`;
  const { open } = require('open');
  await open(url);
}

async function readFileContent(filepath) {
  const fullPath = path.resolve(process.cwd(), filepath);
  const content = require('fs').readFileSync(fullPath, 'utf-8');
  return content;
}

function parseFieldOptions(fieldOpts) {
  const fields = {};
  if (fieldOpts) {
    const optsArray = Array.isArray(fieldOpts) ? fieldOpts : [fieldOpts];
    optsArray.forEach(opt => {
      const [key, value] = opt.split('=');
      if (key && value) {
        fields[key] = value;
      }
    });
  }
  return fields;
}

async function confirm(message) {
  const inquirer = require('inquirer');
  const answers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: false
    }
  ]);
  return answers.confirmed;
}

function handleError(error) {
  const chalk = require('chalk');

  if (error.stderr) {
    console.error(chalk.red('Error:'), error.stderr.trim());
  } else if (error.message) {
    console.error(chalk.red('Error:'), error.message);
  } else {
    console.error(chalk.red('Error:'), error);
  }

  // Provide helpful hints
  if (error.message?.includes('scope')) {
    console.error(chalk.yellow('\n💡 Tip: Run "gh auth refresh -s project" to add project scope'));
  } else if (error.message?.includes('not found')) {
    console.error(chalk.yellow('\n💡 Tip: Verify the project ID and owner with "gh project list"'));
  }

  process.exit(1);
}

// Parse CLI arguments
program.parse();
