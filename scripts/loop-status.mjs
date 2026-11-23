#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const tasksPath = path.join(root, 'tasks.json');

if (!fs.existsSync(tasksPath)) {
  console.error('tasks.json not found.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
const tasks = data.tasks ?? [];
const doneIds = new Set(tasks.filter((t) => t.status === 'done').map((t) => t.id));
const doneCount = doneIds.size;
const totalCount = tasks.length;
const pct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

console.log(`\n=== BaroEnglish Loop Status (${data.specVersion}) ===`);
console.log(`Progress: ${doneCount}/${totalCount} (${pct}%)\n`);

for (const task of tasks) {
  const icon =
    task.status === 'done' ? '[x]' : task.status === 'in_progress' ? '[>]' : '[ ]';
  console.log(`${icon} ${task.id} (${task.milestone}) - ${task.title}`);
}

const active = tasks.find((t) => t.status === 'in_progress');
const nextReady = tasks.find(
  (t) =>
    t.status === 'todo' &&
    (t.dependsOn ?? []).every((depId) => doneIds.has(depId))
);

const target = active ?? nextReady;
if (target) {
  console.log(`\nNext Target: ${target.id} - ${target.title}`);
  console.log('Acceptance Criteria:');
  for (const c of target.acceptanceCriteria ?? []) {
    console.log(`  - ${c}`);
  }
} else {
  console.log('\nAll tasks completed!');
}
console.log('');
