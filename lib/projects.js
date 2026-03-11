/**
 * Project management commands
 */

const execa = require('execa');

/**
 * List projects for an owner
 * @param {string} owner - GitHub owner (user or org)
 * @param {string} state - 'open' or 'closed' (optional)
 * @param {string} format - 'table' or 'json'
 * @returns {Promise<string>}
 */
async function list(owner, state = null, format = 'table') {
  const args = ['project', 'list', '--owner', owner, '--format', 'json'];

  if (state) {
    args.push('--state', state);
  }

  const { stdout } = await execa('gh', args, { reject: false });

  if (format === 'json') {
    return formatJsonOutput(stdout);
  }

  return formatTableOutput(stdout);
}

/**
 * Create a new project
 * @param {string} owner - GitHub owner
 * @param {string} title - Project title
 * @param {Object} options - description
 * @returns {Promise<Object>}
 */
async function create(owner, title, options = {}) {
  // Create the project with JSON output for reliable parsing
  const createArgs = ['project', 'create', '--owner', owner, '--title', title, '--format', 'json'];
  const { stdout } = await execa('gh', createArgs, { json: true });
  // stdout is parsed JSON object
  const projectId = stdout.number;

  // If description provided, set it via edit
  if (options.description) {
    try {
      await edit(owner, projectId, { description: options.description });
    } catch (e) {
      // Log warning but don't fail
      console.error('Warning: Failed to set project description:', e.message);
    }
  }

  return stdout;
}

/**
 * View project details
 * @param {string} owner - GitHub owner
 * @param {string} projectId - Project ID
 * @returns {Promise<string>}
 */
async function view(owner, projectId) {
  const args = ['project', 'view', projectId, '--owner', owner, '--format', 'json'];

  const { stdout } = await execa('gh', args, { json: true });
  return formatProjectDetails(stdout);
}

/**
 * Edit a project
 * @param {string} owner - GitHub owner
 * @param {string} projectId - Project ID
 * @param {Object} updates - title, description, readme
 */
async function edit(owner, projectId, updates = {}) {
  const args = ['project', 'edit', projectId, '--owner', owner];

  if (updates.title) {
    args.push('--title', updates.title);
  }

  if (updates.description) {
    args.push('--description', updates.description);
  }

  if (updates.readme) {
    args.push('--readme', updates.readme);
  }

  await execa('gh', args);
}

/**
 * Close a project
 * @param {string} owner - GitHub owner
 * @param {string} projectId - Project ID
 */
async function close(owner, projectId) {
  await execa('gh', ['project', 'close', projectId, '--owner', owner]);
}

/**
 * Delete a project
 * @param {string} owner - GitHub owner
 * @param {string} projectId - Project ID
 */
async function remove(owner, projectId) {
  await execa('gh', ['project', 'delete', projectId, '--owner', owner]);
}

// =====================
// OUTPUT FORMATTING
// =====================

function formatJsonOutput(stdout) {
  try {
    const data = JSON.parse(stdout);
    return JSON.stringify(data, null, 2);
  } catch (e) {
    return stdout;
  }
}

function formatTableOutput(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    const data = parsed.projects || [];

    if (data.length === 0) {
      return 'No projects found.';
    }

    // Calculate column widths
    const idWidth = Math.max(2, Math.max(...data.map(p => String(p.number).length)));
    const titleWidth = Math.max(5, Math.min(50, Math.max(...data.map(p => (p.title || '').length))));
    const stateWidth = Math.max(5, Math.max(...data.map(p => (p.closed ? 'closed' : 'open')  )));

    // Header
    let output = '';
    output += padRight('ID', idWidth) + '  ';
    output += padRight('Title', titleWidth) + '  ';
    output += padRight('State', stateWidth) + '\n';
    output += '-'.repeat(idWidth) + '  ';
    output += '-'.repeat(titleWidth) + '  ';
    output += '-'.repeat(stateWidth) + '\n';

    // Rows
    data.forEach(p => {
      output += padRight(String(p.number), idWidth) + '  ';
      output += padRight(truncate(p.title || '', titleWidth), titleWidth) + '  ';
      output += padRight(p.closed ? 'closed' : 'open', stateWidth) + '\n';
    });

    return output + `\nTotal: ${data.length} project(s)`;
  } catch (e) {
    // Fallback to raw output
    return stdout;
  }
}

function formatProjectDetails(data) {
  // data is already a parsed JSON object from gh view
  let output = '';

  output += `Project #${data.number}: ${data.title}\n`;
  output += `State: ${data.closed ? 'closed' : 'open'}\n`;
  output += `URL: ${data.url || data.html_url}\n`;
  output += `Created: ${formatDate(data.created_at)}\n`;
  output += `Updated: ${formatDate(data.updated_at)}\n`;

  if (data.shortDescription) {
    output += `\nDescription:\n${data.shortDescription}\n`;
  }

  if (data.readme) {
    output += `\nREADME:\n${data.readme}\n`;
  }

  return output;
}

function parseCreateOutput(stdout) {
  // Output looks like: "✓ Created project https://github.com/orgs/owner/projects/1"
  const match = stdout.match(/https:\/\/github\.com\/orgs\/[^\/]+\/projects\/(\d+)/);
  if (match) {
    return { number: parseInt(match[1]), url: stdout.trim() };
  }

  // Try parsing JSON
  try {
    return JSON.parse(stdout);
  } catch (e) {
    return { raw: stdout };
  }
}

function padRight(str, width) {
  if (str.length >= width) {
    return str.substring(0, width);
  }
  return str + ' '.repeat(width - str.length);
}

function truncate(str, maxLength) {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + '...';
}

function formatDate(isoString) {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return date.toISOString().split('T')[0];
}

module.exports = {
  list,
  create,
  view,
  edit,
  close,
  remove
};
