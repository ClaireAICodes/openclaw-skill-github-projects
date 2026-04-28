#!/usr/bin/env node
/**
 * Migrate Green Ideas to Kanban Ideas Column
 * Reads ideas/*.md, filters Green ideas, adds to Kanban board.
 * USAGE: node scripts/ideas-to-kanban.js [--dry-run]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  owner: 'ClaireAICodes',
  projectNumber: 9,
  statusFieldName: 'Status',
  riskFieldName: 'Risk Level',
  categoryFieldName: 'Category',
  ideasColumn: 'Ideas',
  greenRisk: 'Green'
};

function gh(args) {
  try {
    return { stdout: execSync(`gh ${args.join(' ')}`, { encoding: 'utf8' }) };
  } catch (e) {
    return { stdout: e.stdout || '', stderr: e.stderr || '' };
  }
}

function getAllGreenIdeas() {
  const ideasDir = path.join('/home/node/.openclaw/workspace', 'ideas');
  if (!fs.existsSync(ideasDir)) return [];

  const files = fs.readdirSync(ideasDir).filter(f => f.endsWith('.md'));
  const greenIdeas = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(ideasDir, file), 'utf8');
    const lines = content.split('\n');

    let currentIdea = null;

    for (const line of lines) {
      const ideaMatch = line.match(/^###\s+\[Green\]\s+(.+)$/);
      if (ideaMatch) {
        if (currentIdea) greenIdeas.push(currentIdea);
        currentIdea = { title: ideaMatch[1].trim(), description: '', category: 'OpenClaw Workflow', sourceFile: file };
        continue;
      }

      if (!currentIdea) continue;

      const catMatch = line.match(/\*Category:\*\s*(.+)$/i);
      if (catMatch) {
        currentIdea.category = catMatch[1].trim();
        continue;
      }

      if (line.trim() && !line.startsWith('###') && !line.startsWith('**')) {
        currentIdea.description += line + '\n';
      }
    }

    if (currentIdea) greenIdeas.push(currentIdea);
  }

  return greenIdeas;
}

function getFieldOptionId(fieldName, optionName) {
  const { stdout } = gh(['project', 'field-list', CONFIG.projectNumber.toString(), '--owner', CONFIG.owner, '--format', 'json']);
  let fields;
  try { fields = JSON.parse(stdout); } catch (e) { return null; }

  const field = fields.fields?.find(f => f.name === fieldName);
  if (!field) return null;

  const option = field.options?.find(o => o.name === optionName);
  return option?.id || null;
}

function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('🔍 Migrating Green Ideas to Kanban...');
  console.log(`   Owner: ${CONFIG.owner}`);
  console.log(`   Project: #${CONFIG.projectNumber}`);
  console.log(`   Target: "${CONFIG.ideasColumn}" column`);
  console.log(`   Dry run: ${dryRun ? 'YES' : 'NO'}`);
  console.log('');

  const ideas = getAllGreenIdeas();
  console.log(`💡 Found ${ideas.length} Green ideas:`);
  console.log('');

  if (ideas.length === 0) {
    console.log('✅ No Green ideas to migrate!');
    process.exit(0);
  }

  // Get option IDs
  const ideasOptionId = getFieldOptionId(CONFIG.statusFieldName, CONFIG.ideasColumn);
  const greenOptionId = getFieldOptionId(CONFIG.riskFieldName, CONFIG.greenRisk);

  if (!ideasOptionId) {
    console.error(`❌ "${CONFIG.ideasColumn}" option not found in ${CONFIG.statusFieldName}`);
    process.exit(1);
  }
  if (!greenOptionId) {
    console.error(`❌ "${CONFIG.greenRisk}" option not found in ${CONFIG.riskFieldName}`);
    process.exit(1);
  }

  let successCount = 0;

  for (const idea of ideas) {
    const title = `[${idea.category.toUpperCase().split(' ').map(w => w[0]).join('')}] ${idea.title}`;

    console.log(`📝 ${title}`);
    console.log(`   Category: ${idea.category}`);
    console.log(`   Source: ${idea.sourceFile}`);

    if (dryRun) {
      console.log(`   🔍 DRY RUN — Would create in Kanban\n`);
      successCount++;
      continue;
    }

    // Create item
    const { stdout } = gh(['project', 'item-create', CONFIG.projectNumber.toString(), '--owner', CONFIG.owner, '--title', title]);

    let newItem;
    try {
      newItem = JSON.parse(stdout);
    } catch (e) {
      console.log(`   ❌ Failed to create: ${stdout}\n`);
      continue;
    }

    // Move to Ideas column
    gh(['project', 'item-edit', '--id', newItem.id, '--project-id', CONFIG.projectNumber.toString(), '--field-id', getFieldOptionId(CONFIG.statusFieldName, ''), '--single-select-option-id', ideasOptionId]);

    // Set Risk Level = Green
    gh(['project', 'item-edit', '--id', newItem.id, '--project-id', CONFIG.projectNumber.toString(), '--field-id', getFieldOptionId(CONFIG.riskFieldName, ''), '--single-select-option-id', greenOptionId]);

    console.log(`   ✅ Created: ${newItem.id}\n`);
    successCount++;
  }

  console.log(`\n📊 Summary: ${successCount}/${ideas.length} ideas migrated to "${CONFIG.ideasColumn}"`);
}

if (require.main === module) {
  main();
}
