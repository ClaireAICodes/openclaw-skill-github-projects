/**
 * Repository linking commands
 */

const execa = require('execa');

/**
 * Link a repository to a project
 * @param {string} owner - Project owner
 * @param {string} projectId - Project ID
 * @param {string} repo - Repository to link (owner/repo)
 */
async function link(owner, projectId, repo) {
  await execa('gh', ['project', 'link', projectId, '--owner', owner, '--repo', repo]);
}

/**
 * Unlink a repository from a project
 * @param {string} owner - Project owner
 * @param {string} projectId - Project ID
 * @param {string} repo - Repository to unlink
 */
async function unlink(owner, projectId, repo) {
  await execa('gh', ['project', 'unlink', projectId, '--owner', owner, '--repo', repo]);
}

/**
 * List repositories linked to a project
 * Uses GraphQL query since no direct gh command exists.
 * @param {string} owner - Project owner
 * @param {string} projectId - Project ID (numeric)
 * @returns {Promise<string>}
 */
async function list(owner, projectId) {
  // Get project node ID
  const viewArgs = ['project', 'view', projectId, '--owner', owner, '--format', 'json'];
  const { stdout: viewOut } = await execa('gh', viewArgs, { reject: false });
  let projectData;
  try {
    projectData = JSON.parse(viewOut);
  } catch (e) {
    throw new Error(`Failed to parse project data: ${viewOut}`);
  }
  const nodeId = projectData.id;
  if (!nodeId) {
    throw new Error('Could not determine project node ID');
  }

  // GraphQL query for linked repositories
  const query = `query($id: ID!){
    node(id:$id){
      ... on ProjectV2 {
        repositories(first:100){
          nodes{
            nameWithOwner
            url
          }
        }
      }
    }
  }`;

  const { stdout } = await execa('gh', ['api', 'graphql', '-f', `query=${query}`, '-f', `id=${nodeId}`], { reject: false });

  let data;
  try {
    const parsed = JSON.parse(stdout);
    data = parsed.data?.node?.repositories?.nodes || [];
  } catch (e) {
    data = [];
  }

  return formatOutput(data);
}

function formatOutput(repos) {
  if (!Array.isArray(repos) || repos.length === 0) {
    return 'No repositories linked.';
  }

  const output = repos.map(repo => `- ${repo.nameWithOwner} (${repo.url})`).join('\n');
  return output + `\n\nTotal: ${repos.length} repository(s)`;
}

module.exports = {
  link,
  unlink,
  list
};
