const mockExeca = jest.fn();
jest.doMock('execa', () => mockExeca);

const { list, create, view, edit, close, remove } = require('../lib/projects');

const mockProjectList = JSON.stringify([
  { number: 1, title: 'Test Project', state: 'open', description: 'Test', html_url: 'https://github.com/orgs/owner/projects/1' }
]);

const mockProjectDetail = JSON.stringify({
  number: 1, title: 'Test', state: 'open', description: '', html_url: 'url', readme: '', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-02T00:00:00Z'
});

describe('projects.js', () => {
  beforeEach(() => {
    mockExeca.mockClear();
    // Default mock: commands that use --format json return JSON; others return empty
    mockExeca.mockImplementation((cmd, args, opts) => {
      if (args.includes('--format') && args.includes('json')) {
        return Promise.resolve({ stdout: args.includes('list') ? mockProjectList : (args.includes('view') ? mockProjectDetail : mockProjectDetail), stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });
  });

  describe('list', () => {
    it('calls gh project list with correct args', async () => {
      await list('owner', null, 'table');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'list', '--owner', 'owner', '--format', 'json'], { reject: false });
    });

    it('returns JSON when format=json', async () => {
      const result = await list('owner', 'open', 'json');
      // Result is pretty-printed by formatJsonOutput; compare parsed objects
      expect(JSON.parse(result)).toEqual(JSON.parse(mockProjectList));
    });
  });

  describe('create', () => {
    it('calls gh project create with correct args', async () => {
      await create('owner', 'My Project', {});
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'create', '--owner', 'owner', '--title', 'My Project', '--format', 'json'], { reject: false });
    });
  });

  describe('view', () => {
    it('calls gh project view correctly', async () => {
      await view('owner', '1');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'view', '1', '--owner', 'owner', '--format', 'json'], { reject: false });
    });
  });

  describe('edit', () => {
    it('edits title', async () => {
      await edit('owner', '1', { title: 'New Title' });
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'edit', '1', '--owner', 'owner', '--title', 'New Title']);
    });

    it('edits description', async () => {
      await edit('owner', '1', { description: 'New desc' });
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'edit', '1', '--owner', 'owner', '--description', 'New desc']);
    });
  });

  describe('close', () => {
    it('closes project', async () => {
      await close('owner', '1');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'close', '1', '--owner', 'owner']);
    });
  });

  describe('remove', () => {
    it('deletes project', async () => {
      await remove('owner', '1');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'delete', '1', '--owner', 'owner']);
    });
  });
});
