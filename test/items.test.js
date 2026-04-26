const mockExeca = jest.fn();
jest.doMock('execa', () => mockExeca);

const { add, create: createItem, list: listItems, edit, archive, remove: removeItem } = require('../lib/items');

const mockItemCreateJson = JSON.stringify({
  id: 'PVTI_12345',
  title: 'Draft',
  content: { title: 'Draft' },
  state: 'added'
});

const mockItemListJson = JSON.stringify({
  items: [
    { id: '123', content: { title: 'Test Issue' }, state: 'added', createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z', url: 'url' }
  ],
  totalCount: 1
});

describe('items.js', () => {
  beforeEach(() => {
    mockExeca.mockClear();
    mockExeca.mockImplementation((cmd, args, opts) => {
      if (args.includes('--format') && args.includes('json')) {
        if (args.includes('item-create')) {
          return Promise.resolve({ stdout: mockItemCreateJson, stderr: '' });
        }
        if (args.includes('item-list')) {
          return Promise.resolve({ stdout: mockItemListJson, stderr: '' });
        }
        return Promise.resolve({ stdout: '{}', stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });
  });

  describe('add', () => {
    it('adds issue via URL', async () => {
      await add('owner', '1', { issueRepo: 'owner/repo', issueNumber: '42' });
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'item-add', '1', '--owner', 'owner', '--url', 'https://github.com/owner/repo/issues/42']);
    });
  });

  describe('create', () => {
    it('creates draft item and returns data', async () => {
      const result = await createItem('owner', '1', { title: 'Draft' });
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'item-create', '1', '--owner', 'owner', '--title', 'Draft', '--format', 'json'], { reject: false });
      expect(result.id).toBe('PVTI_12345');
    });
  });

  describe('list', () => {
    it('calls with correct args for table', async () => {
      await listItems('owner', '1', { state: 'added', format: 'table' });
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'item-list', '1', '--owner', 'owner', '--format', 'json'], { reject: false });
    });

    it('returns table output containing ID and title', async () => {
      const result = await listItems('owner', '1', { state: 'added', format: 'table' });
      expect(result).toContain('ID');
      expect(result).toContain('Test Issue');
    });

    it('returns raw JSON when format=json', async () => {
      const result = await listItems('owner', '1', { format: 'json' });
      expect(JSON.parse(result)).toEqual(JSON.parse(mockItemListJson));
    });
  });

  describe('edit', () => {
    it('edits title', async () => {
      await edit('123', { projectId: '1', title: 'New Title' });
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'item-edit', '--id', '123', '--project-id', '1', '--title', 'New Title']);
    });

    it('sets custom fields', async () => {
      await edit('123', { projectId: '1', fields: { f1: 'v1', f2: 'v2' } });
      const call = mockExeca.mock.calls[0];
      expect(call[0]).toBe('gh');
      expect(call[1]).toContain('--field');
      expect(call[1]).toContain('f1=v1');
      expect(call[1]).toContain('f2=v2');
    });
  });

  describe('archive', () => {
    it('archives item', async () => {
      // signature: archive(owner, projectId, itemId)
      await archive('owner', '1', '123');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'item-archive', '1', '--id', '123', '--owner', 'owner']);
    });
  });

  describe('removeItem', () => {
    it('deletes item', async () => {
      // signature: removeItem(owner, projectId, itemId)
      await removeItem('owner', '1', '123');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'item-delete', '1', '--id', '123', '--owner', 'owner']);
    });
  });
});
