const { link, unlink, list: listRepos } = require('../lib/links');

// Mock execa
const mockExeca = jest.fn();
global.execa = mockExeca;

describe('links.js', () => {
  beforeEach(() => {
    mockExeca.mockClear();
  });

  describe('link', () => {
    it('should link a repository to a project', async () => {
      mockExeca.mockResolvedValue({ stdout: '' });
      await link('owner', '1', 'owner/repo');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'link', '1', '--owner', 'owner', '--repo', 'owner/repo'], expect.anything());
    });
  });

  describe('unlink', () => {
    it('should unlink a repository', async () => {
      mockExeca.mockResolvedValue({ stdout: '' });
      await unlink('owner', '1', 'owner/repo');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'unlink', '1', '--owner', 'owner', '--repo', 'owner/repo'], expect.anything());
    });
  });

  describe('list', () => {
    it('should list linked repositories', async () => {
      const stdout = '[{"name":"owner/repo","url":"https://github.com/owner/repo"}]';
      mockExeca.mockResolvedValue({ stdout });
      const result = await listRepos('owner', '1');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'list-repos', '1', '--owner', 'owner', '--format', 'json'], expect.anything());
      expect(result).toContain('owner/repo');
    });
  });
});
