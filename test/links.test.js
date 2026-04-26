const mockExeca = jest.fn();
jest.doMock('execa', () => mockExeca);

const { link, unlink, list: listRepos } = require('../lib/links');

const mockViewJson = JSON.stringify({ id: 'PVT_node123' });
const mockGraphqlData = JSON.stringify({
  data: { node: { repositories: { nodes: [{ nameWithOwner: 'owner/repo', url: 'https://github.com/owner/repo' }] } } }
});
const mockGraphqlEmpty = JSON.stringify({
  data: { node: { repositories: { nodes: [] } } }
});

describe('links.js', () => {
  beforeEach(() => {
    mockExeca.mockClear();
  });

  describe('link', () => {
    it('links repository', async () => {
      mockExeca.mockImplementation(() => Promise.resolve({ stdout: '', stderr: '' }));
      await link('owner', '1', 'owner/repo');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'link', '1', '--owner', 'owner', '--repo', 'owner/repo']);
    });
  });

  describe('unlink', () => {
    it('unlinks repository', async () => {
      mockExeca.mockImplementation(() => Promise.resolve({ stdout: '', stderr: '' }));
      await unlink('owner', '1', 'owner/repo');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'unlink', '1', '--owner', 'owner', '--repo', 'owner/repo']);
    });
  });

  describe('list', () => {
    it('lists linked repositories via GraphQL', async () => {
      mockExeca.mockImplementation((cmd, args) => {
        if (args.includes('view')) {
          return Promise.resolve({ stdout: mockViewJson, stderr: '' });
        }
        if (args.includes('graphql')) {
          return Promise.resolve({ stdout: mockGraphqlData, stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await listRepos('owner', '1');
      expect(result).toContain('owner/repo');
      expect(result).toContain('https://github.com/owner/repo');
    });

    it('returns empty message when no repos linked', async () => {
      mockExeca.mockImplementation((cmd, args) => {
        if (args.includes('view')) {
          return Promise.resolve({ stdout: mockViewJson, stderr: '' });
        }
        if (args.includes('graphql')) {
          return Promise.resolve({ stdout: mockGraphqlEmpty, stderr: '' });
        }
        return Promise.resolve({ stdout: '', stderr: '' });
      });

      const result = await listRepos('owner', '1');
      expect(result).toBe('No repositories linked.');
    });
  });
});
