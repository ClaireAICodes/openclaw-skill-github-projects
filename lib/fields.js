/**
 * Custom field management commands
 */

const execa = require('execa');

/**
 * List custom fields in a project
 * @param {string} owner - Project owner
 * @param {string} projectId - Project ID
 * @returns {Promise<string>}
 */
async function list(owner, projectId) {
  const args = ['project', 'field-list', projectId, '--owner', owner, '--format', 'json'];

  const { stdout } = await execa('gh', args, { reject: false });
  return formatTableOutput(stdout);
}

/**
 * Create a custom field in a project
 * @param {string} owner - Project owner
 * @param {string} projectId - Project ID
 * @param {Object} options - name, type, options (for single-select)
 */
async function create(owner, projectId, options = {}) {
  let dataType = options.type;
  if (dataType) {
    dataType = dataType.replace(/-/g, '_').toUpperCase();
  }

  const args = ['project', 'field-create', projectId, '--owner', owner, '--name', options.name, '--data-type', dataType];

  if (options.options && Array.isArray(options.options)) {
    // For SINGLE_SELECT, use --single-select-options with multiple occurrences
    options.options.forEach(opt => {
      args.push('--single-select-options', opt);
    });
  }

  await execa('gh', args);
}

/**
 * Delete a custom field
 * @param {string} fieldId - Field ID
 */
async function removeField(fieldId) {
  const args = ['project', 'field-delete', '--id', fieldId];
  await execa('gh', args);
}

// =====================
// OUTPUT FORMATTING
// =====================

function formatTableOutput(stdout) {
  try {
    const parsed = JSON.parse(stdout);
    const data = parsed.fields || [];

    if (data.length === 0) {
      return 'No custom fields found.';
    }

    // Calculate column widths
    const idWidth = Math.max(2, Math.max(...data.map(f => String(f.id).length)));
    const nameWidth = Math.max(4, Math.min(30, Math.max(...data.map(f => (f.name || '').length))));
    const typeWidth = Math.max(4, Math.max(...data.map(f => (f.type || '').length)));

    // Header
    let output = '';
    output += padRight('ID', idWidth) + '  ';
    output += padRight('Name', nameWidth) + '  ';
    output += padRight('Type', typeWidth) + '\n';
    output += '-'.repeat(idWidth) + '  ';
    output += '-'.repeat(nameWidth) + '  ';
    output += '-'.repeat(typeWidth) + '\n';

    // Rows
    data.forEach(field => {
      output += padRight(truncate(field.id, idWidth), idWidth) + '  ';
      output += padRight(truncate(field.name || '', nameWidth), nameWidth) + '  ';
      output += padRight(field.type || '', typeWidth) + '\n';
    });

    // Show options for single-select fields
    data.forEach(field => {
      if (field.options && field.options.length > 0) {
        const optionNames = field.options.map(o => o.name).join(' | ');
        output += `\n  Field "${field.name}" options: ${optionNames}\n`;
      }
    });

    return output;
  } catch (e) {
    return stdout;
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

module.exports = {
  list,
  create,
  remove: removeField
};
