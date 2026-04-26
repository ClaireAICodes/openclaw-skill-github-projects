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
  const issueUrl = `https://github.com/${options.issueRepo}/issues/${options.issueNumber}`;
  const args = ['project', 'item-add', projectId, '--owner', owner, '--url', issueUrl];

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
  const args = ['project', 'item-create', projectId, '--owner', owner, '--title', options.title, '--format', 'json'];

  if (options.body) {
    args.push('--body', options.body);
  }

  if (options.columnId) {
    args.push('--column', options.columnId);
  }

  const { stdout } = await execa('gh', args, { reject: false });
  let data;
  try {
    data = JSON.parse(stdout);
  } catch (e) {
    throw new Error(`Failed to parse item-create output: ${stdout}`);
  }
  return data; // includes id, title, etc.
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
  const args = ['project', 'item-edit', '--id', itemId];

  if (options.projectId) {
    args.push('--project-id', options.projectId);
  }

  if (options.title) {
    args.push('--title', options.title);
  }

  if (options.body) {
    args.push('--body', options.body);
  }

  if (options.fields && typeof options.fields === 'object') {
    Object.entries(options.fields).forEach(([fieldId, value]) => {
      args.push('--field', `${fieldId}=${value}`);
    });
  }

  await execa('gh', args);
}

/**
 * Archive an item
 * @param {string} owner - GitHub owner
 * @param {string} projectId - Project ID (as positional)
 * @param {string} itemId - Item ID
 */
async function archive(owner, projectId, itemId) {
  const args = ['project', 'item-archive', projectId, '--id', itemId, '--owner', owner];
  await execa('gh', args);
}

/**
 * Delete an item from a project
 * @param {string} owner - GitHub owner
 * @param {string} projectId - Project number (not node ID)
 * @param {string} itemId - Item ID
 */
async function removeItem(owner, projectId, itemId) {
  const args = ['project', 'item-delete', projectId, '--owner', owner, '--id', itemId];
  await execa('gh', args);
}

/**
 * Move an item to a new status (Kanban column)
 * @param {string} owner - GitHub owner
 * @param {string} projectId - Project NUMBER (not node ID)
 * @param {string} itemId - Item ID (PVTI_...)
 * @param {string} statusOption - Target status: "Todo", "In Progress", "Review", "Done", "Cancelled"
 */
async function moveItem(owner, projectId, itemId, statusOption) {
  // Use gh CLI directly - it handles the field/option ID resolution
  // We need to get the Status field ID and option ID first
  
  // Get project fields via GraphQL
  const query = `query {
    organization(login: "${owner}") {
      projectV2(number: ${projectId}) {
        fields(first: 20) {
          nodes {
            __typename
            ... on ProjectV2FieldCommon {
              name
            }
            ... on ProjectV2SingleSelectField {
              id
              name
              options {
                id
                name
              }
            }
          }
        }
      }
    }
  `;
  
  const { stdout } = await execa('gh', ['api', 'graphql', '-f', `query=${query}`], { reject: false });
  
  let data;
  try {
    data = JSON.parse(stdout);
  } catch (e) {
    throw new Error(`Failed to parse fields: ${stdout}`);
  }
  
  const statusField = data?.data?.organization?.projectV2?.fields?.nodes?.find(
    f => f.name === 'Status' && f.id
  );
  
  if (!statusField) {
    throw new Error('Status field not found in project');
  }
  
  const option = statusField.options?.find(o => o.name === statusOption);
  if (!option) {
    const available = statusField.options?.map(o => o.name).join(', ') || 'none';
    throw new Error(`Status option "${statusOption}" not found. Available: ${available}`);
  }
  
  // Update the item's status field
  const args = [
    'project', 'item-edit',
    '--id', itemId,
    '--project-id', projectId,
    '--field-id', statusField.id,
    '--single-select-option-id', option.id
  ];
  
  await execa('gh', args);
}

/**
 * Update a custom field value on an item
 * @param {string} owner - GitHub owner
 * @param {string} projectId - Project number
 * @param {string} itemId - Item ID
 * @param {string} fieldName - Field name (e.g., "Priority", "Assigned Agent")
 * @param {string} value - New value
 * @param {string} fieldType - Field type to determine value format
 */
async function updateField(owner, projectId, itemId, fieldName, value, fieldType = 'text') {
  // Get the field ID
  const fields = await listFields(owner, projectId);
  const field = fields.find(f => f.name === fieldName);
  
  if (!field) {
    throw new Error(`Field "${fieldName}" not found in project`);
  }
  
  const args = [
    'project', 'item-edit',
    '--id', itemId,
    '--project-id', projectId,
    '--field-id', field.id
  ];
  
  switch (fieldType) {
    case 'single-select':
      // Find the option ID
      const option = field.options?.find(o => o.name === value);
      if (!option) {
        const available = field.options?.map(o => o.name).join(', ') || 'none';
        throw new Error(`Option "${value}" not found. Available: ${available}`);
      }
      args.push('--single-select-option-id', option.id);
      break;
    case 'number':
      args.push('--number', value);
      break;
    case 'date':
      args.push('--date', value);
      break;
    default: // text
      args.push('--text', value);
  }
  
  await execa('gh', args);
}

/**
 * Helper: List all fields in a project (for internal use)
 * @param {string} owner - GitHub owner
 * @param {string} projectId - Project number
 * @returns {Promise<Array>}
 */
async function listFields(owner, projectId) {
  const args = ['project', 'field-list', projectId, '--owner', owner, '--format', 'json'];
  const { stdout } = await execa('gh', args, { reject: false });
  
  try {
    const parsed = JSON.parse(stdout);
    return parsed.fields || [];
  } catch (e) {
    return [];
  }
}

/**
 * List items filtered by status (Kanban column)
 * @param {string} owner - GitHub owner
 * @param {string} projectId - Project number
 * @param {string} status - Status to filter: Todo, In Progress, Review, Done, Cancelled
 * @param {string} format - Output format: table or json
 * @returns {Promise<string>}
 */
async function listByStatus(owner, projectId, status, format = 'table') {
  // Get the Status field and its option ID
  const fields = await listFields(owner, projectId);
  const statusField = fields.find(f => f.name === 'Status' && f.type === 'ProjectV2SingleSelectField');
  
  if (!statusField) {
    throw new Error('Status field not found in project');
  }
  
  const option = statusField.options?.find(o => o.name === status);
  if (!option) {
    const available = statusField.options?.map(o => o.name).join(', ') || 'none';
    throw new Error(`Status "${status}" not found. Available: ${available}`);
  }
  
  // Get all items, then filter by status
  const args = ['project', 'item-list', projectId, '--owner', owner, '--format', 'json'];
  const { stdout } = await execa('gh', args, { reject: false });
  
  let data;
  try {
    const parsed = JSON.parse(stdout);
    data = parsed.items || [];
  } catch (e) {
    data = [];
  }
  
  // Filter items where Status field = requested status
  const filtered = data.filter(item => {
    // Check the field values for Status
    const statusValue = item.fieldValues?.find(fv => fv.field?.name === 'Status');
    return statusValue?.name === status;
  });
  
  if (format === 'json') {
    return JSON.stringify(filtered, null, 2);
  }
  
  return formatTableOutput(filtered);
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
  remove: removeItem,
  moveItem,
  updateField
};
