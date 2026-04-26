const mockExeca = jest.fn();
jest.doMock('execa', () => mockExeca);

const { list: listFields, create: createField, remove: removeField } = require('../lib/fields');

const mockFieldsJson = JSON.stringify({
  fields: [
    { id: 'F1', name: 'Priority', type: 'SINGLE_SELECT', options: [{ name: 'High' }, { name: 'Low' }] },
    { id: 'F2', name: 'Notes', type: 'TEXT', options: [] }
  ]
});

describe('fields.js', () => {
  beforeEach(() => {
    mockExeca.mockClear();
    mockExeca.mockImplementation((cmd, args) => {
      if (args.includes('field-list')) {
        return Promise.resolve({ stdout: mockFieldsJson, stderr: '' });
      }
      return Promise.resolve({ stdout: '', stderr: '' });
    });
  });

  describe('list', () => {
    it('lists fields in table format', async () => {
      const result = await listFields('owner', '1');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'field-list', '1', '--owner', 'owner', '--format', 'json'], { reject: false });
      expect(result).toContain('ID');
      expect(result).toContain('Priority');
      expect(result).toContain('High');
    });
  });

  describe('create', () => {
    it('creates a text field', async () => {
      await createField('owner', '1', { name: 'Notes', type: 'text' });
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'field-create', '1', '--owner', 'owner', '--name', 'Notes', '--data-type', 'TEXT']);
    });

    it('creates a single-select field with options', async () => {
      await createField('owner', '1', { name: 'Priority', type: 'single-select', options: ['High', 'Medium', 'Low'] });
      expect(mockExeca).toHaveBeenCalledWith('gh', [
        'project', 'field-create', '1', '--owner', 'owner',
        '--name', 'Priority', '--data-type', 'SINGLE_SELECT',
        '--single-select-options', 'High',
        '--single-select-options', 'Medium',
        '--single-select-options', 'Low'
      ]);
    });
  });

  describe('removeField', () => {
    it('deletes a field by id', async () => {
      await removeField('F1');
      expect(mockExeca).toHaveBeenCalledWith('gh', ['project', 'field-delete', '--id', 'F1']);
    });
  });
});
