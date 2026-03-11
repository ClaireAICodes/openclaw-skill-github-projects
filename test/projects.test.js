const { list, create, view, edit, close, remove } = require('../lib/projects');

// Mock execa
const mockExeca = jest.fn();
const mockStdout = '{"number":1,"title":"Test Project","state":"open","description":"Test","html_url":"https://github.com/orgs/owner/projects/1"}';
const mockStderr = '';

global.execa = mockExeca;

describe('projects.js', () => {
  beforeEach(() => {
    mockExeca.mockClear();
  });

  describe('list', () => {
    it('should list projects in table format by default', async () => {
      mockExeca.mockResolvedValue({ stdout: mockStdout });
      const result = await list('owner', null, 'table');
      expect(mockExeca).toHaveBeenCalledWith('gh', expect.arrayContaining(['project', 'list', '--owner', 'owner', '--json', expect.any(String)]), expect.anything());
      expect(result).toContain('ID');
      expect(result).toContain('Test Project');
    });

    it('should return JSON format when requested', async () => {
      mockExeca.mockResolvedValue({ stdout: mockStdout });
      const result = await list('owner', 'open', 'json');
      expect(JSON.parse(result)).toEqual(JSON.parse(mockStdout));
    });
  });

  describe('create', () => {
    it('should create a project and return parsed data', async () => {
      mockExeca.mockResolvedValue({ stdout: mockStdout });
      const result = await create('owner', 'My Project', {});
      expect(mockExeca).toHaveBeenCalledWith('gh', expect.arrayContaining(['project', 'create', '--owner', 'owner', '--title', 'My Project', '--format', 'json']), expect.anything());
      expect(result.number).toBe(1);
    });

    it('should set description via edit if provided', async () => {
      mockExeca.mockResolvedValue({ stdout: mockStdout });
      await create('owner', 'My Project', { description: 'A desc' });
      // First call: create, second call: edit
      expect(mockExeca).toHaveBeenCalledTimes(2);
      const editCall = mockExeca.mock.calls[1];
      expect(editCall[0]).toBe('gh');
      expect(editCall[1]).toContain('project');
      expect(editCall[1]).toContain('edit');
    });
  });

  describe('view', () => {
    it('should view project details', async () => {
      mockExeca.mockResolvedValue({ stdout: mockStdout });
      const result = await view('owner', '1');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'view', '1', '--owner', 'owner', '--format', 'json'], expect.anything());
      expect(result).toContain('Project #1');
    });
  });

  describe('edit', () => {
    it('should edit project metadata', async () => {
      mockExeca.mockResolvedValue({ stdout: '' });
      await edit('owner', '1', { title: 'New Title' });
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'edit', '1', '--owner', 'owner', '--title', 'New Title'], expect.anything());
    });
  });

  describe('close', () => {
    it('should close a project', async () => {
      mockExeca.mockResolvedValue({ stdout: '' });
      await close('owner', '1');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'close', '1', '--owner', 'owner'], expect.anything());
    });
  });

  describe('remove', () => {
    it('should delete a project', async () => {
      mockExeca.mockResolvedValue({ stdout: '' });
      await remove('owner', '1');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'delete', '1', '--owner', 'owner'], expect.anything());
    });
  });
});
