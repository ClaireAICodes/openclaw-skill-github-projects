/**
 * GitHub Projects Skill
 * Main entry point - exports all command modules
 */

// Octokit client factory
const { getOctokit } = require('./octokit-client');

// Project management
const { 
  listProjects, 
  createProject, 
  deleteProject, 
  viewProject 
} = require('./projects');

// Card management
const { 
  addCard, 
  listCards, 
  moveCard, 
  removeCard 
} = require('./cards');

// Column management
const { 
  listColumns, 
  createColumn, 
  deleteColumn 
} = require('./columns');

// Sync operations
const { 
  syncIssues, 
  syncPRs 
} = require('./sync');

// Webhook management
const { 
  setupWebhook, 
  listWebhooks, 
  removeWebhook 
} = require('./webhook');

module.exports = {
  getOctokit,
  listProjects,
  createProject,
  deleteProject,
  viewProject,
  addCard,
  listCards,
  moveCard,
  removeCard,
  listColumns,
  createColumn,
  deleteColumn,
  syncIssues,
  syncPRs,
  setupWebhook,
  listWebhooks,
  removeWebhook
};