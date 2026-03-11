const execa = require('execa');

module.exports = jest.fn(() =>
  Promise.resolve({
    stdout: JSON.stringify({
      id: 'PVT_lah123',
      number: 1,
      title: 'Test Project',
      state: 'open',
      description: 'Test',
      html_url: 'https://github.com/orgs/owner/projects/1'
    }),
    stderr: ''
  })
);

// For commands that need different responses, we can extend this mock as needed