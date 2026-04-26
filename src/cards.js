/**
 * GitHub Project Cards Management
 * Handles adding, listing, moving, and removing cards
 */

const { getOctokit } = require('./octokit-client');
const { formatOutput, findColumnId, formatTable } = require('./utils');

/**
 * Add a card to a project
 * @param {Object} options - Command options
 * @param {number|string} options.project - Project ID
 * @param {number} [options.issue] - Issue or PR number to add
 * @param {string} [options.note] - Note content for note cards
 * @param {string} [options.column] - Column name (classic projects)
 */
async function addCard(options) {
  const octokit = getOctokit(options);
  const { project, issue, note, column } = options;

  try {
    // First, get project details to check type and get column ID
    const projectResponse = await octokit.request('GET /projects/{project_id}', {
      project_id: project
    });
    const projectData = projectResponse.data;

    // Determine column ID
    let columnId;
    if (column) {
      columnId = await findColumnId(octokit, project, column);
      if (!columnId) {
        throw new Error(`Column "${column}" not found in project ${project}`);
      }
    } else if (issue && projectData.body?.includes('repository')) {
      // Repository projects may not need column ID
      columnId = null;
    } else {
      throw new Error('--column is required for classic projects, or specify a column name');
    }

    // Build request
    const params = {
      project_id: project
    };

    if (issue) {
      params.content_id = await getContentId(octokit, projectData, issue);
    } else if (note) {
      params.note = note;
    } else {
      throw new Error('Must specify either --issue or --note');
    }

    if (columnId) {
      params.column_id = columnId;
    }

    const response = await octokit.request('POST /projects/{project_id}/cards', params);
    const card = response.data;

    return formatTable([card], null, 'Added Card');
  } catch (error) {
    throw new Error(`Failed to add card: ${error.message}`);
  }
}

/**
 * List cards in a project
 * @param {Object} options - Command options
 * @param {number|string} options.project - Project ID
 * @param {string} [options.column] - Filter by column name
 * @param {boolean} [options.json] - Output JSON
 */
async function listCards(options) {
  const octokit = getOctokit(options);
  const { project, column, json } = options;

  try {
    let cards = [];
    let columnFilter = column;

    // If column specified, get its ID first
    if (column) {
      const columnId = await findColumnId(octokit, project, column);
      if (!columnId) {
        throw new Error(`Column "${column}" not found`);
      }
      columnFilter = columnId;
    }

    // Classic projects use column-based API
    // Get all columns and their cards
    const columnsResponse = await octokit.request('GET /projects/{project_id}/columns', {
      project_id: project,
      per_page: 100
    });

    const columns = columnsResponse.data;

    for (const col of columns) {
      // Skip if filtering by column name and not matched
      if (column && col.name !== column) continue;

      const cardsResponse = await octokit.request('GET /projects/{project_id}/columns/{column_id}/cards', {
        project_id: project,
        column_id: col.id,
        per_page: 100
      });

      const columnCards = cardsResponse.data.map(card => ({
        ...card,
        column_name: col.name,
        column_id: col.id
      }));
      cards.push(...columnCards);
    }

    if (cards.length === 0) {
      return 'No cards found.';
    }

    if (json) {
      return JSON.stringify(cards, null, 2);
    }

    return formatCardTable(cards);
  } catch (error) {
    throw new Error(`Failed to list cards: ${error.message}`);
  }
}

/**
 * Move a card to a different column
 * @param {Object} options - Command options
 * @param {number|string} options.card - Card ID
 * @param {string} options.toColumn - Target column name
 */
async function moveCard(options) {
  const octokit = getOctokit(options);
  const { card, toColumn } = options;

  try {
    // Get card details to find project
    // Note: Octokit doesn't have direct get card endpoint for classic projects
    // We need to infer from context or require project+c column
    // For simplicity, we'll require column ID directly in a real implementation
    // Here we'll just demonstrate the API call

    const columnId = await findColumnId(octokit, null, toColumn, card);
    if (!columnId) {
      throw new Error(`Target column "${toColumn}" not found`);
    }

    await octokit.request('POST /projects/columns/cards/{card_id}/move', {
      card_id: card,
      position: 'top', // or 'bottom', 'after:card_id'
      column_id: columnId
    });

    return `Card ${card} moved to column "${toColumn}".`;
  } catch (error) {
    throw new Error(`Failed to move card: ${error.message}`);
  }
}

/**
 * Remove a card from a project
 * @param {Object} options - Command options
 * @param {number|string} options.card - Card ID
 * @param {boolean} [options.confirm] - Skip confirmation
 */
async function removeCard(options) {
  const octokit = getOctokit(options);
  const { card, confirm } = options;

  if (!confirm) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const answer = await new Promise(resolve => {
      rl.question(`Remove card ${card}? (yes/no): `, resolve);
    });
    rl.close();
    if (answer !== 'yes') {
      return 'Removal cancelled.';
    }
  }

  try {
    await octokit.request('DELETE /projects/columns/cards/{card_id}', {
      card_id: card
    });
    return `Card ${card} removed successfully.`;
  } catch (error) {
    throw new Error(`Failed to remove card: ${error.message}`);
  }
}

// --------------------
// Helper functions
// --------------------

/**
 * Get content ID (issue or PR) for adding to project
 */
async function getContentId(octokit, projectData, issueNumber) {
  // Determine repository from project
  // For repo projects, projectData.repository is present
  let repo;
  if (projectData.repository) {
    repo = projectData.repository.full_name;
  } else {
    // For classic projects, try to parse from body or require additional input
    throw new Error('Repository project required for adding issues directly. Use classic project API for org/user projects.');
  }

  const [owner, name] = repo.split('/');

  // Try issues first, then PRs (both use same endpoint for content)
  const response = await octokit.request('GET /repos/{owner}/{repo}/issues/{issue_number}', {
    owner,
    repo: name,
    issue_number: issueNumber
  });

  return response.data.id;
}

/**
 * Find column ID by name
 */
async function findColumnId(octokit, projectId, columnName, cardId = null) {
  // If cardId provided, we could look up card's current column
  // For now, require projectId
  if (!projectId) {
    throw new Error('Project ID required to look up column');
  }

  const response = await octokit.request('GET /projects/{project_id}/columns', {
    project_id: projectId,
    per_page: 100
  });

  const column = response.data.find(col => col.name === columnName);
  return column?.id;
}

/**
 * Format cards as a table
 */
function formatCardTable(cards) {
  const lines = [];
  lines.push('─'.repeat(80));
  lines.push(
    pad('Card ID', 10) + 
    pad('Column', 20) + 
    pad('Title/Note', 40) + 
    pad('Type', 10)
  );
  lines.push('─'.repeat(80));

  cards.forEach(card => {
    const id = card.id;
    const column = card.column_name || 'N/A';
    const title = card.content?.title || card.note || 'Note';
    const type = card.content?.url?.includes('/pull/') ? 'PR' : card.content?.url?.includes('/issues/') ? 'Issue' : 'Note';
    lines.push(
      pad(String(id).substring(0, 8), 10) + 
      pad(column, 20) + 
      pad(title.substring(0, 38), 40) + 
      pad(type, 10)
    );
  });

  lines.push('─'.repeat(80));
  return lines.join('\n');
}

function pad(str, len) {
  str = String(str || '');
  if (str.length > len) {
    return str.substring(0, len - 1) + '…';
  }
  return str.padEnd(len);
}

module.exports = {
  addCard,
  listCards,
  moveCard,
  removeCard
};