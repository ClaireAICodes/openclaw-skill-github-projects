/**
 * Item (issue/PR/draft) management commands
 */

const execa = require('execa');

/**
 * Add an issue or PR to a project
 * @param {string} owner - Project owner
 * @param {string} projectId - Project ID
 * @param {Object} options - issueRepo, issueNumber, columnId
 */
async function add(owner, projectId, options = {}) {
  const args = ['project', 'item-add', projectId, '--owner', owner, '--repo', options.issueRepo, '--issue', options.issueNumber];

  if (options.columnId) {
    args.push('--column', options.columnId);
  }

  await execa('gh', args);
}

/**
 * Create a draft item directly in a project
 * @param {string} owner - Project owner
 * @param {string} projectId - Project ID
 * @param {Object} options - title, body, columnId
 * @returns {Promise<Object>}
 */
async function create(owner, projectId, options = {}) {
  const args = ['project', 'item-create', projectId, '--owner', owner, '--title', options.title];

  if (options.body) {
    args.push('--body', options.body);
  }

  if (options.columnId) {
    args.push('--column', options.columnId);
  }

  const { stdout } = await execa('gh', args, { json: true, text: true });
  return parseItemCreateOutput(stdout);
}

/**
 * List items in a project
 * @param {string} owner - Project owner
 * @param {string} projectId - Project ID
 * @param {Object} options - state ('added' or 'archived'), format
 * @returns {Promise<string>}
 */
async function list(owner, projectId, options = {}) {
  const args = ['project', 'item-list', projectId, '--owner', owner, '--format', 'json'];

  if (options.state) {
    args.push('--state', options.state);
  }

  const { stdout } = await execa('gh', args, { reject: false });

  if (options.format === 'json') {
    return formatJsonOutput(stdout);
  }

  // The output is {items: [...], totalCount: N}. Extract items.
  let data;
  try {
    const parsed = JSON.parse(stdout);
    data = parsed.items || [];
  } catch (e) {
    data = [];
  }

  return formatTableOutput(data);
}

/**
 * Edit an item
 * @param {string} itemId - Item ID
 * @param {Object} options - projectId, title, body, fields
 */
async function edit(itemId, options = {}) {
  const args = ['project', 'item-edit', itemId];

  if (options.projectId) {
    args.push('--project-id', options.projectId);
  }

  if (options.title) {
    args.push('--title', options.title);
  }

  if (options.body) {
    args.push('--body', options.body);
  }

  // Handle custom fields
  if (options.fields && typeof options.fields === 'object') {
    Object.entries(options.fields).forEach(([fieldId, value]) => {
      args.push('--field', `${fieldId}=${value}`);
    });
  }

  await execa('gh', args);
}

/**
 * Archive an item
 * @param {string} itemId - Item ID
 * @param {string} projectId - Project ID (optional, for context)
 */
async function archive(itemId, projectId = null) {
  const args = ['project', 'item-archive', itemId];

  if (projectId) {
    args.push('--project-id', projectId);
  }

  await execa('gh', args);
}

/**
 * Delete an item from a project
 * @param {string} itemId - Item ID
 * @param {string} projectId - Project ID (optional, for context)
 */
async function removeItem(itemId, projectId = null) {
  const args = ['project', 'item-delete', itemId];

  if (projectId) {
    args.push('--project-id', projectId);
  }

  await execa('gh', args);
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

function formatTableOutput(input) {
  let data;
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      data = parsed.items || parsed; // If it's {items: [...]} or direct array
    } catch (e) {
      return input;
    }
  } else {
    data = input; // assume already parsed array
  }

  if (!Array.isArray(data) || data.length === 0) {
    return 'No items found.';
  }

  // Calculate column widths
  const idWidth = Math.max(2, Math.max(...data.map(i => String(i.id).length)));
  const titleWidth = Math.max(5, Math.min(60, Math.max(...data.map(i => (i.content?.title || '').length))));

  // Header
  let output = '';
  output += padRight('ID', idWidth) + '  ';
  output += padRight('Title', titleWidth) + '\n';
  output += '-'.repeat(idWidth) + '  ';
  output += '-'.repeat(titleWidth) + '\n';

  // Rows
  data.forEach(item => {
    output += padRight(String(item.id), idWidth) + '  ';
    output += padRight(truncate(item.content?.title || '(no title)', titleWidth), titleWidth) + '\n';
  });

  return output + `\nTotal: ${data.length} item(s)`;
}

function parseItemCreateOutput(stdout) {
  // Output: "✓ Created item https://github.com/.../project/items/12345"
  const match = stdout.match(/\/items\/(\d+)/);
  if (match) {
    return { id: match[1], url: stdout.trim() };
  }
  return { raw: stdout };
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

module.exports = {
  add,
  create,
  list,
  edit,
  archive,
  remove: removeItem
};
