/**
 * GitHub Project Columns Management
 * Handles column operations for classic projects
 */

const { getOctokit } = require('./octokit-client');
const { formatTable } = require('./utils');

/**
 * List columns in a project
 * @param {Object} options - Command options
 * @param {number|string} options.project - Project ID
 * @param {boolean} [options.json] - Output JSON
 */
async function listColumns(options) {
  const octokit = getOctokit(options);
  const { project, json } = options;

  try {
    const response = await octokit.request('GET /projects/{project_id}/columns', {
      project_id: project,
      per_page: 100
    });

    const columns = response.data;

    if (columns.length === 0) {
      return 'No columns found.';
    }

    if (json) {
      return JSON.stringify(columns, null, 2);
    }

    return formatTable(columns, null, 'Columns');
  } catch (error) {
    throw new Error(`Failed to list columns: ${error.message}`);
  }
}

/**
 * Create a new column in a project
 * @param {Object} options - Command options
 * @param {number|string} options.project - Project ID
 * @param {string} options.name - Column name
 */
async function createColumn(options) {
  const octokit = getOctokit(options);
  const { project, name } = options;

  try {
    const response = await octokit.request('POST /projects/{project_id}/columns', {
      project_id: project,
      name
    });

    const column = response.data;

    return formatTable([column], null, 'Created Column');
  } catch (error) {
    throw new Error(`Failed to create column: ${error.message}`);
  }
}

/**
 * Delete a column
 * @param {Object} options - Command options
 * @param {number|string} options.column - Column ID
 * @param {boolean} [options.confirm] - Skip confirmation
 */
async function deleteColumn(options) {
  const octokit = getOctokit(options);
  const { column, confirm } = options;

  if (!confirm) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const answer = await new Promise(resolve => {
      rl.question(`Delete column ${column}? This may move cards. (yes/no): `, resolve);
    });
    rl.close();
    if (answer !== 'yes') {
      return 'Deletion cancelled.';
    }
  }

  try {
    await octokit.request('DELETE /projects/columns/{column_id}', {
      column_id: column
    });
    return `Column ${column} deleted successfully.`;
  } catch (error) {
    throw new Error(`Failed to delete column: ${error.message}`);
  }
}

module.exports = {
  listColumns,
  createColumn,
  deleteColumn
};