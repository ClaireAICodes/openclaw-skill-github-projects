const { list: listFields, create: createField, remove: removeField } = require('../lib/fields');

// Mock execa
const mockExeca = jest.fn();
global.execa = mockExeca;

describe('fields.js', () => {
  beforeEach(() => {
    mockExeca.mockClear();
  });

  describe('list', () => {
    it('should list fields in table format', async () => {
      const stdout = '[{"id":"123","name":"Priority","type":"SINGLE_SELECT","options":[{"name":"High"},{"name":"Low"}]}]';
      mockExeca.mockResolvedValue({ stdout });
      const result = await listFields('owner', '1');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'field-list', '1', '--owner', 'owner', '--format', 'json'], expect.anything());
      expect(result).toContain('ID');
      expect(result).toContain('Priority');
      expect(result).toContain('High');
    });
  });

  describe('create', () => {
    it('should create a text field', async () => {
      mockExeca.mockResolvedValue({ stdout: '' });
      await createField('owner', '1', { name: 'Notes', type: 'text' });
      expect(mockExeca).toHaveBeenCalledWith('gh', [
        'project', 'field-create', '1', '--owner', 'owner',
        '--name', 'Notes', '--data-type', 'TEXT'
      ], expect.anything());
    });

    it('should create a single-select field with options', async () => {
      mockExeca.mockResolvedValue({ stdout: '' });
      await createField('owner', '1', { name: 'Priority', type: 'single-select', options: ['High', 'Medium', 'Low'] });
      expect(mockExeca).toHaveBeenCalledWith('gh', [
        'project', 'field-create', '1', '--owner', 'owner',
        '--name', 'Priority', '--data-type', 'SINGLE_SELECT',
        '--single-select-options', 'High',
        '--single-select-options', 'Medium',
        '--single-select-options', 'Low'
      ], expect.anything());
    });
  });

  describe('removeField', () => {
    it('should delete a field', async () => {
      mockExeca.mockResolvedValue({ stdout: '' });
      await removeField('123', '1');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'field-delete', '123', '--project-id', '1'], expect.anything());
    });
  });
});
