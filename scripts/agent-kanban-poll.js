#!/usr/bin/env node
/**
 * Agent Kanban Poll - Autonomous Task Picker (2-Tier Architecture)
 * 
 * TIER 1: Planner Agent - Polls Ideas column, breaks them into atomic tasks
 * TIER 2: Worker Agent - Polls Todo column, works on atomic tasks
 * 
 * USAGE: node scripts/agent-kanban-poll.js [--source-column Ideas|Todo] [--dry-run]
 */

const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  owner: 'ClaireAICodes',
  projectNumber: 9, // AI Agent Kanban project
  statusFieldName: 'Status',
  priorityFieldName: 'Priority',
  agentFieldName: 'Assigned Agent',
  columns: {
    ideas: 'Ideas',
    todo: 'Todo',
    inProgress: 'In Progress',
    testing: 'Testing',
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
  '[TEST]': 'tester',
  '[DEBUG]': 'debugger',
  '[DEPLOY]': 'devops',
  '[REVIEW]': 'reviewer',
  '[DATA]': 'data-analyst',
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
    return null;
  }

  // Sort by priority (High → Medium → Low)
  const sorted = items.map(item => {
    // For Ideas, there's no priority field - treat as Medium
    const priority = item.status === CONFIG.columns.ideas ? 'Medium' : 'Low';
    return { item, priority, order: getPriorityOrder(priority) };
  }).sort((a, b) => a.order - b.order);

  return sorted[0].item;
}

function moveToColumn(owner, projectNumber, itemId, fields, targetColumn) {
  const statusField = fields.find(f => f.name === CONFIG.statusFieldName && f.id);
  if (!statusField) {
    throw new Error('Status field not found');
  }

  const targetOption = statusField.options?.find(o => o.name === targetColumn);
  if (!targetOption) {
    throw new Error(`"${targetColumn}" option not found in Status field`);
  }

  gh([
    'project', 'item-edit',
    '--id', itemId,
    '--project-id', projectNumber.toString(),
    '--field-id', statusField.id,
    '--single-select-option-id', targetOption.id
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

function generateTasksFromIdea(ideaTitle) {
  // Simple task generation based on common patterns
  // In real implementation, this would call an AI model to break down the idea
  
  const tasks = [];
  
  // Extract existing prefix if any
  const typeMatch = ideaTitle.match(/^(\[SKILL\]|\[RESEARCH\]|\[CODE\]|\[DOCS\]|\[CRON\]|\[TEST\]|\[DEBUG\]|\[DEPLOY\]|\[REVIEW\]|\[DATA\])/i);
  const prefix = typeMatch ? typeMatch[1].toUpperCase() + ' ' : '';
  const cleanTitle = ideaTitle.replace(/^\[.*?\]\s*/, '');
  
  // Generate standard tasks
  tasks.push({
    title: `${prefix}Research: ${cleanTitle}`,
    body: `Research phase for: ${ideaTitle}`,
    priority: 'High'
  });
  
  tasks.push({
    title: `${prefix}Implement: ${cleanTitle}`,
    body: `Implementation phase for: ${ideaTitle}`,
    priority: 'High'
  });
  
  tasks.push({
    title: `${prefix}Test: ${cleanTitle}`,
    body: `Testing phase for: ${ideaTitle}`,
    priority: 'Medium'
  });
  
  tasks.push({
    title: `${prefix}Document: ${cleanTitle}`,
    body: `Documentation phase for: ${ideaTitle}`,
    priority: 'Medium'
  });
  
  return tasks;
}

async function handleIdea(item, owner, projectNumber, fields) {
  const ideaTitle = item.content?.title || item.title || '';
  console.log(`\n💡 Breaking down idea: "${ideaTitle}"`);
  
  // Generate atomic tasks
  const tasks = generateTasksFromIdea(ideaTitle);
  
  console.log(`\n📝 Generated ${tasks.length} atomic tasks:`);
  
  // Create each task in Todo column
  for (const task of tasks) {
    console.log(`   Creating: ${task.title}`);
    
    const args = [
      'project', 'item-create',
      projectNumber.toString(),
      '--owner', owner,
      '--title', task.title,
      '--body', task.body,
      '--format', 'json'
    ];
    
    const { stdout } = gh(args);
    let newItem;
    try {
      newItem = JSON.parse(stdout);
    } catch (e) {
      console.log(`   ❌ Failed to create task: ${task.title}`);
      continue;
    }
    
    // Set priority if provided
    if (task.priority) {
      const priorityField = fields.find(f => f.name === CONFIG.priorityFieldName && f.id);
      if (priorityField) {
        const option = priorityField.options?.find(o => o.name === task.priority);
        if (option) {
          gh([
            'project', 'item-edit',
            '--id', newItem.id,
            '--project-id', projectNumber.toString(),
            '--field-id', priorityField.id,
            '--single-select-option-id', option.id
          ]);
        }
      }
    }
    
    console.log(`   ✅ Created: ${newItem.id}`);
  }
  
  // Move the idea to Done
  console.log(`\n✅ Idea "${ideaTitle}" broken down into ${tasks.length} tasks.`);
  
  try {
    await moveToColumn(owner, projectNumber, item.id, fields, CONFIG.columns.done);
    console.log(`   Moved idea to "${CONFIG.columns.done}"`);
  } catch (e) {
    console.log(`   Warning: Could not move idea to Done: ${e.message}`);
  }
}

async function handleTask(item, owner, projectNumber, fields) {
  const taskType = getTaskType(item.content?.title || item.title || '');
  
  console.log(`\n🎯 Selected task:`);
  console.log(`   ID: ${item.id}`);
  console.log(`   Title: ${item.content?.title || item.title}`);
  console.log(`   Type: ${taskType.prefix}`);
  console.log(`   Handler: ${taskType.handler}`);
  
  return taskType;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const sourceColumn = getArgValue(args, '--source-column') || CONFIG.columns.ideas; // Default: Ideas
  
  console.log('🔍 Polling Kanban board...');
  console.log(`   Owner: ${CONFIG.owner}`);
  console.log(`   Project: #${CONFIG.projectNumber}`);
  console.log(`   Source: "${sourceColumn}"`);
  console.log(`   Dry run: ${dryRun ? 'YES' : 'NO'}`);
  console.log('');

  try {
    // Get fields and items
    const fields = getProjectFields(CONFIG.owner, CONFIG.projectNumber);
    const items = getItems(CONFIG.owner, CONFIG.projectNumber, sourceColumn);

    console.log(`📋 Found ${items.length} items in "${sourceColumn}"`);

    if (items.length === 0) {
      console.log('✅ No tasks to pick up. Board is clean!');
      process.exit(0);
    }

    // Pick highest priority task
    const selectedItem = pickTask(items);

    if (sourceColumn === CONFIG.columns.ideas) {
      // TIER 1: Planner Agent - Handle Idea
      if (dryRun) {
        console.log('\n🔍 DRY RUN — Would break down idea into atomic tasks');
        process.exit(0);
      }
      
      await handleIdea(selectedItem, CONFIG.owner, CONFIG.projectNumber, fields);
      
      console.log('\n✅ Idea processed successfully!');
      console.log(`   Atomic tasks created in "${CONFIG.columns.todo}"`);
      
    } else {
      // TIER 2: Worker Agent - Handle Task
      const taskType = await handleTask(selectedItem, CONFIG.owner, CONFIG.projectNumber, fields);
      
      if (dryRun) {
        console.log('\n🔍 DRY RUN — Would move to "In Progress" and assign to ' + taskType.handler);
        process.exit(0);
      }

      // Move to In Progress
      console.log(`\n🔄 Moving to "${CONFIG.columns.inProgress}"...`);
      await moveToColumn(CONFIG.owner, CONFIG.projectNumber, selectedItem.id, fields, CONFIG.columns.inProgress);

      // Assign agent
      console.log(`👤 Assigning to ${taskType.handler}...`);
      await assignAgent(CONFIG.owner, CONFIG.projectNumber, selectedItem.id, fields, taskType.handler);

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
        status: CONFIG.columns.inProgress
      }));
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

function getArgValue(args, argName) {
  const index = args.indexOf(argName);
  if (index === -1 || index + 1 >= args.length) return null;
  return args[index + 1];
}

if (require.main === module) {
  main();
}
