#!/usr/bin/env node
/**
 * Check Stale Tasks - Cron job to find stuck tasks
 * 
 * Finds tasks that have been "In Progress" too long,
 * moves them to "Blocked", and notifies Master.
 * 
 * USAGE: node scripts/check-stale-tasks.js [--dry-run] [--hours=2]
 */

const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  owner: 'ClaireAICodes',
  projectNumber: 9, // AI Agent Kanban project
  statusFieldName: 'Kanban Column',
  columns: {
    ideas: 'Ideas',
    todo: 'Todo',
    inProgress: 'In Progress',
    testing: 'Testing',
    review: 'Review',
    blocked: 'Blocked',
    done: 'Done'
  },
  staleThresholdHours: 2 // Move to Blocked if stuck > 2 hours
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

  // Filter by built-in Status field
  if (statusFilter) {
    items = items.filter(item => item.status === statusFilter);
  }

  return items;
}

function moveToColumn(owner, projectNumber, itemId, fields, targetColumn) {
  const statusField = fields.find(f => f.name === CONFIG.statusFieldName && f.id);
  if (!statusField) {
    throw new Error('Kanban Column field not found');
  }

  const targetOption = statusField.options?.find(o => o.name === targetColumn);
  if (!targetOption) {
    throw new Error(`"${targetColumn}" option not found in Kanban Column field`);
  }

  gh([
    'project', 'item-edit',
    '--id', itemId,
    '--project-id', projectNumber.toString(),
    '--field-id', statusField.id,
    '--single-select-option-id', targetOption.id
  ]);
}

function formatDuration(milliseconds) {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const hoursArg = args.find(a => a.startsWith('--hours='));
  const staleThresholdHours = hoursArg ? parseInt(hoursArg.split('=')[1]) : CONFIG.staleThresholdHours;

  console.log('🔍 Checking for stale tasks...');
  console.log(`   Owner: ${CONFIG.owner}`);
  console.log(`   Project: #${CONFIG.projectNumber}`);
  console.log(`   Threshold: ${staleThresholdHours} hours`);
  console.log(`   Dry run: ${dryRun ? 'YES' : 'NO'}`);
  console.log('');

  try {
    const fields = getProjectFields(CONFIG.owner, CONFIG.projectNumber);
    const inProgressItems = getItems(CONFIG.owner, CONFIG.projectNumber, CONFIG.columns.inProgress);

    console.log(`🔄 Found ${inProgressItems.length} items in "In Progress"`);

    if (inProgressItems.length === 0) {
      console.log('✅ No tasks in progress. All clear!');
      process.exit(0);
    }

    const now = new Date();
    let staleCount = 0;

    inProgressItems.forEach(item => {
      const updatedAt = new Date(item.updatedAt);
      const staleMs = now - updatedAt;
      const staleHours = staleMs / (1000 * 60 * 60);

      if (staleHours > staleThresholdHours) {
        staleCount++;
        const title = item.content?.title || item.title || '(no title)';
        const duration = formatDuration(staleMs);

        console.log(`\n⚠️  STALE TASK #${staleCount}:`);
        console.log(`   ID: ${item.id}`);
        console.log(`   Title: ${title}`);
        console.log(`   Stuck for: ${duration}`);
        console.log(`   Last updated: ${updatedAt.toISOString()}`);

        if (dryRun) {
          console.log(`   🔍 DRY RUN — Would move to "${CONFIG.columns.blocked}"`);
        } else {
          try {
            moveToColumn(CONFIG.owner, CONFIG.projectNumber, item.id, fields, CONFIG.columns.blocked);
            console.log(`   ✅ Moved to "${CONFIG.columns.blocked}"`);

            // Output for cron job (machine-readable)
            console.log('\n---');
            console.log(JSON.stringify({
              success: true,
              action: 'moved_to_blocked',
              itemId: item.id,
              title: title,
              stuckHours: Math.round(staleHours * 100) / 100,
              newStatus: CONFIG.columns.blocked
            }));
          } catch (e) {
            console.log(`   ❌ Failed to move: ${e.message}`);
          }
        }
      }
    });

    if (staleCount === 0) {
      console.log('\n✅ No stale tasks found!');
    } else {
      console.log(`\n📊 Summary: ${staleCount} stale task(s) moved to "${CONFIG.columns.blocked}"`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
