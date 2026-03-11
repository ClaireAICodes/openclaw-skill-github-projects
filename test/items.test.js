const { add, create: createItem, list: listItems, edit, archive, remove: removeItem } = require('../lib/items');

// Mock execa
const mockExeca = jest.fn();
global.execa = mockExeca;

describe('items.js', () => {
  beforeEach(() => {
    mockExeca.mockClear();
  });

  describe('add', () => {
    it('should add an issue to a project', async () => {
      mockExeca.mockResolvedValue({ stdout: '' });
      await add('owner', '1', { issueRepo: 'owner/repo', issueNumber: '42' });
      expect(mockExeca).toHaveBeenCalledWith('gh', [
        'project', 'item-add', '1', '--owner', 'owner',
        '--url', 'https://github.com/owner/repo/issues/42'
      ], expect.anything());
    });
  });

  describe('create', () => {
    it('should create a draft item', async () => {
      const stdout = '✓ Created item https://github.com/.../project/items/12345';
      mockExeca.mockResolvedValue({ stdout });
      const result = await createItem('owner', '1', { title: 'Draft' });
      expect(mockExeca).toHaveBeenCalledWith('gh', expect.arrayContaining(['project', 'item-create', '1', '--owner', 'owner', '--title', 'Draft']), expect.anything());
      expect(result.id).toBe('12345');
    });
  });

  describe('list', () => {
    it('should list items in table format', async () => {
      const stdout = '[{"id":"123","content":{"title":"Test Issue"}}]';
      mockExeca.mockResolvedValue({ stdout });
      const result = await listItems('owner', '1', { state: 'added', format: 'table' });
      expect(result).toContain('ID');
      expect(result).toContain('Test Issue');
    });

    it('should return JSON when requested', async () => {
      const stdout = '[{"id":"123","content":{"title":"Test"}}]';
      mockExeca.mockResolvedValue({ stdout });
      const result = await listItems('owner', '1', { format: 'json' });
      expect(JSON.parse(result)).toEqual(JSON.parse(stdout));
    });
  });

  describe('edit', () => {
    it('should edit an item', async () => {
      mockExeca.mockResolvedValue({ stdout: '' });
      await edit('123', { projectId: '1', title: 'New Title' });
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'item-edit', '123', '--project-id', '1', '--title', 'New Title'], expect.anything());
    });

    it('should set custom fields', async () => {
      mockExeca.mockResolvedValue({ stdout: '' });
      await edit('123', { fields: { 'field1': 'value1', 'field2': 'value2' } });
      const call = mockExeca.mock.calls[0];
      expect(call[1]).toContain('--field');
      expect(call[1]).toContain('field1=value1');
      expect(call[1]).toContain('field2=value2');
    });
  });

  describe('archive', () => {
    it('should archive an item', async () => {
      mockExeca.mockResolvedValue({ stdout: '' });
      await archive('123', '1');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'item-archive', '123', '--project-id', '1'], expect.anything());
    });
  });

  describe('removeItem', () => {
    it('should delete an item', async () => {
      mockExeca.mockResolvedValue({ stdout: '' });
      await removeItem('123', '1');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'item-delete', '123', '--project-id', '1'], expect.anything());
    });
  });
});
