/**
 * GitHub Projects Management
 * Handles project creation, listing, deletion, and viewing
 */

const { getOctokit } = require('./octokit-client');
const { formatOutput } = require('./utils');

/**
 * List projects for an owner
 * @param {Object} options - Command options
 * @param {string} options.owner - GitHub owner (user or org)
 * @param {string} [options.type] - Filter: 'org', 'user', or 'repo'
 * @param {boolean} [options.json] - Output JSON
 */
async function listProjects(options) {
  const octokit = getOctokit(options);
  const { owner, type, json } = options;

  try {
    // For organization projects (classic)
    if (type === 'org' || !type) {
      const orgResponse = await octokit.request('GET /orgs/{owner}/projects', {
        owner,
        per_page: 100
      }).catch(() => null);

      if (orgResponse?.data) {
        if (json) {
          return JSON.stringify(orgResponse.data, null, 2);
        }
        return formatTable(orgResponse.data, owner, 'Org Project');
      }
    }

    // For user projects (classic)
    if (type === 'user' || !type) {
      const userResponse = await octokit.request('GET /users/{owner}/projects', {
        owner,
        per_page: 100
      }).catch(() => null);

      if (userResponse?.data && userResponse.data.length > 0) {
        if (json) {
          return JSON.stringify(userResponse.data, null, 2);
        }
        // Combine with org projects if both exist
        const allProjects = orgResponse?.data?.length 
          ? [...orgResponse.data, ...userResponse.data]
          : userResponse.data;
        return formatTable(allProjects, owner, 'User/Org Project');
      }
    }

    return 'No projects found.';
  } catch (error) {
    throw new Error(`Failed to list projects: ${error.message}`);
  }
}

/**
 * Create a new project
 * @param {Object} options - Command options
 * @param {string} [options.owner] - Owner for org/user projects
 * @param {string} [options.repo] - Repository for repository projects
 * @param {string} options.name - Project name
 * @param {string} [options.body] - Project description
 * @param {boolean} [options.json] - Output JSON
 */
async function createProject(options) {
  const octokit = getOctokit(options);
  const { owner, repo, name, body, json } = options;

  try {
    let response;

    if (repo) {
      // Repository project (new style)
      const [repoOwner, repoName] = repo.split('/');
      response = await octokit.request('POST /repos/{owner}/{repo}/projects', {
        owner: repoOwner,
        repo: repoName,
        name,
        body: body || ''
      });
    } else if (owner) {
      // Org/User project (classic)
      response = await octokit.request('POST /orgs/{owner}/projects', {
        owner,
        name,
        body: body || ''
      }).catch(async () => {
        // Try user projects if org fails
        return await octokit.request('POST /users/{owner}/projects', {
          owner,
          name,
          body: body || ''
        });
      });
    } else {
      throw new Error('Must specify either --owner or --repo');
    }

    const project = response.data;

    if (json) {
      return JSON.stringify(project, null, 2);
    }

    return formatTable([project], repo || owner, 'Created Project');
  } catch (error) {
    throw new Error(`Failed to create project: ${error.message}`);
  }
}

/**
 * View project details
 * @param {Object} options - Command options
 * @param {number|string} options.id - Project ID
 * @param {boolean} [options.json] - Output JSON
 */
async function viewProject(options) {
  const octokit = getOctokit(options);
  const { id, json } = options;

  try {
    const response = await octokit.request('GET /projects/{project_id}', {
      project_id: id
    });

    const project = response.data;

    if (json) {
      return JSON.stringify(project, null, 2);
    }

    return formatTable([project], null, 'Project Details');
  } catch (error) {
    throw new Error(`Failed to view project: ${error.message}`);
  }
}

/**
 * Delete a project
 * @param {Object} options - Command options
 * @param {number|string} options.id - Project ID
 * @param {boolean} [options.confirm] - Skip confirmation
 */
async function deleteProject(options) {
  const octokit = getOctokit(options);
  const { id, confirm } = options;

  if (!confirm) {
    const response = await octokit.request('GET /projects/{project_id}', { project_id: id });
    const project = response.data;
    console.log(`About to delete project: ${project.name} (ID: ${id})`);
    console.log('This action cannot be undone.');
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    const answer = await new Promise(resolve => {
      rl.question('Type "yes" to confirm: ', resolve);
    });
    rl.close();
    if (answer !== 'yes') {
      return 'Deletion cancelled.';
    }
  }

  try {
    await octokit.request('DELETE /projects/{project_id}', {
      project_id: id
    });
    return `Project ${id} deleted successfully.`;
  } catch (error) {
    throw new Error(`Failed to delete project: ${error.message}`);
  }
}

// --------------------
// Table formatting
// --------------------
function formatTable(projects, owner, title) {
  const lines = [];
  if (title) lines.push(title);
  lines.push('─'.repeat(80));
  lines.push(
    pad('ID', 8) + 
    pad('Name', 30) + 
    pad('Owner', 20) + 
    pad('Type', 12)
  );
  lines.push('─'.repeat(80));

  projects.forEach(p => {
    const id = p.number || p.id;
    const name = (p.name || '').substring(0, 28);
    const projOwner = p.owner?.login || owner || 'N/A';
    const type = p.body?.includes('repository') ? 'repo' : 'classic';
    lines.push(
      pad(String(id), 8) + 
      pad(name, 30) + 
      pad(projOwner, 20) + 
      pad(type, 12)
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
  listProjects,
  createProject,
  deleteProject,
  viewProject
};