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

module.exports = {
  link,
  unlink
};
