/**
 * Octokit Client Factory
 * Handles GitHub authentication and client creation
 */

const { Octokit } = require('octokit');

/**
 * Get an authenticated Octokit instance
 * @param {Object} options - Command options
 * @param {string} [options.token] - Optional GitHub token override
 * @returns {Octokit} Authenticated Octokit instance
 */
function getOctokit(options = {}) {
  let token = options.token || process.env.GH_TOKEN;

  if (!token) {
    // Try to get token from gh CLI auth
    try {
      const { execSync } = require('child_process');
      token = execSync('gh auth token -h github.com', { encoding: 'utf8' }).trim();
    } catch (error) {
      throw new Error(
        'GitHub authentication required. Run `gh auth login` or set GH_TOKEN environment variable.'
      );
    }
  }

  return new Octokit({
    auth: token,
    userAgent: 'openclaw-github-projects-skill/1.0.0'
  });
}

module.exports = { getOctokit };