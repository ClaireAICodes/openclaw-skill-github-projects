#!/usr/bin/env node
/**
 * Agent Kanban Poll - Autonomous Task Picker
 *
 * This script polls the AI Agent Kanban board for Todo items,
 * picks the highest priority one, and moves it to "In Progress"
 *
 * USAGE: node scripts/agent-kanban-poll.js [--dry-run]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  owner: 'ClaireAICodes',
  projectNumber: 5, // TODO: Update with actual Kanban project number
  statusFieldName: 'Status',
  priorityFieldName: 'Priority',
  agentFieldName: 'Assigned Agent',
  columns: {
    todo: 'Todo',
    inProgress: 'In Progress',
    review: 'Review',
    done: 'Done'
  }
};

// Task type prefixes and their handlers
const TASK_HANDLERS = {
  '[SKILL]': 'skill-creator',
  '[RESEARCH]': 'researcher',
  '[CODE]': 'coder',
  '[DOCS]': 'documenter',
  '[CRON]': 'cron-manager',
  '[DEFAULT]': 'general-agent'
};

function gh(args, options = {}) {
  try {
    const result = execSync(`gh ${args.join(' ')}`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      ...options
    });
    return { stdout: result, stderr: '', status: 0 };
  } catch (error) {
    return { stdout: error.stdout || '', stderr: error.stderr || '', status: error.status || 1 };
  }
}

function getProjectFields(owner, projectNumber) {
  const { stdout } = gh(['project', 'field-list', projectNumber.toString(), '--owner', owner, '--format', 'json']);

  let data;
  try {
    data = JSON.parse(stdout);
  } catch (e) {
    throw new Error(`Failed to parse fields: ${stdout}`);
  }

  return data.fields || [];
}

function getItems(owner, projectNumber, statusFilter = null) {
  const { stdout } = gh(['project', 'item-list', projectNumber.toString(), '--owner', owner, '--format', 'json']);
  
  let data;
  try {
    data = JSON.parse(stdout);
  } catch (e) {
    throw new Error(`Failed to parse items: ${stdout}`);
  }

  let items = data.items || [];

  // Filter by status if provided (items have a direct 'status' field)
  if (statusFilter) {
    items = items.filter(item => item.status === statusFilter);
  }

  return items;
}

function getPriorityOrder(priority) {
  const order = { 'High': 1, 'Medium': 2, 'Low': 3 };
  return order[priority] || 999;
}

function getTaskType(title) {
  for (const [prefix, handler] of Object.entries(TASK_HANDLERS)) {
    if (title.startsWith(prefix)) {
      return { prefix, handler };
    }
  }
  return { prefix: '[DEFAULT]', handler: TASK_HANDLERS['[DEFAULT]'] };
}

function pickTask(items) {
  if (items.length === 0) {
    return null; // No tasks available
  }

  // Sort by priority (High → Medium → Low)
  const sorted = items.map(item => {
    const priorityField = item.fieldValues?.find(fv => fv.field?.name === CONFIG.priorityFieldName);
    const priority = priorityField?.name || 'Low';
    return { item, priority, order: getPriorityOrder(priority) };
  }).sort((a, b) => a.order - b.order);

  return sorted[0].item;
}

function moveToInProgress(owner, projectNumber, itemId, fields) {
  const statusField = fields.find(f => f.name === CONFIG.statusFieldName && f.id);
  if (!statusField) {
    throw new Error('Status field not found');
  }

  const inProgressOption = statusField.options?.find(o => o.name === CONFIG.columns.inProgress);
  if (!inProgressOption) {
    throw new Error(`"${CONFIG.columns.inProgress}" option not found in Status field`);
  }

  gh([
    'project', 'item-edit',
    '--id', itemId,
    '--project-id', projectNumber.toString(),
    '--field-id', statusField.id,
    '--single-select-option-id', inProgressOption.id
  ]);
}

function assignAgent(owner, projectNumber, itemId, fields, agentName) {
  const agentField = fields.find(f => f.name === CONFIG.agentFieldName && f.id);
  if (!agentField) {
    console.log(`Warning: "${CONFIG.agentFieldName}" field not found, skipping assignment`);
    return;
  }

  gh([
    'project', 'item-edit',
    '--id', itemId,
    '--project-id', projectNumber.toString(),
    '--field-id', agentField.id,
    '--text', agentName
  ]);
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🔍 Polling Kanban board...');
  console.log(`   Owner: ${CONFIG.owner}`);
  console.log(`   Project: #${CONFIG.projectNumber}`);
  console.log(`   Dry run: ${dryRun ? 'YES' : 'NO'}`);
  console.log('');

  try {
    // Get fields and items
    const fields = getProjectFields(CONFIG.owner, CONFIG.projectNumber);
    const todoItems = getItems(CONFIG.owner, CONFIG.projectNumber, CONFIG.columns.todo);

    console.log(`📋 Found ${todoItems.length} items in "Todo"`);

    if (todoItems.length === 0) {
      console.log('✅ No tasks to pick up. Board is clean!');
      process.exit(0);
    }

    // Pick highest priority task
    const selectedItem = pickTask(todoItems);
    const taskType = getTaskType(selectedItem.content?.title || selectedItem.title || '');

    console.log('\n🎯 Selected task:');
    console.log(`   ID: ${selectedItem.id}`);
    console.log(`   Title: ${selectedItem.content?.title || selectedItem.title}`);
    console.log(`   Type: ${taskType.prefix}`);
    console.log(`   Handler: ${taskType.handler}`);

    if (dryRun) {
      console.log('\n🔍 DRY RUN - Would move to "In Progress" and assign to ' + taskType.handler);
      process.exit(0);
    }

    // Move to In Progress
    console.log('\n🔄 Moving to "In Progress"...');
    moveToInProgress(CONFIG.owner, CONFIG.projectNumber, selectedItem.id, fields);

    // Assign agent
    console.log(`👤 Assigning to ${taskType.handler}...`);
    assignAgent(CONFIG.owner, CONFIG.projectNumber, selectedItem.id, fields, taskType.handler);

    console.log('\n✅ Task claimed successfully!');
    console.log(`   Agent "${taskType.handler}" should now work on this task.`);
    console.log(`   Item: ${selectedItem.id}`);

    // Output for cron job (machine-readable)
    console.log('\n---');
    console.log(JSON.stringify({
      success: true,
      itemId: selectedItem.id,
      title: selectedItem.content?.title || selectedItem.title,
      handler: taskType.handler,
      status: 'In Progress'
    }));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
