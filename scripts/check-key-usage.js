#!/usr/bin/env node
const { execSync } = require('child_process');

const checks = [
  'stateRecordDialog',
  'statusUpdateSection',
  'uncertaintyManagement',
  'uncertaintyListTable',
  'workRecord',
  'approvalWizard',
  'experimentInstruction',
  'dataRecordDialog',
  'templateEditor',
];

const nsChecks = [
  'namespace\\.main',
  'namespace\\.project',
  'namespace\\.team',
  'namespace\\.termManagement',
  'namespace\\.duplicateSuggest',
  'teamEditDialog\\.chiefUpdateFailed',
  'teamManagement\\.selectGroupPlaceholder',
  'prefixManagement\\.activateSuccess',
  'namespaceMain\\.activatedSuccess',
  'projectCompletion\\.cancelButton',
  'projectCompletion\\.descText',
  'projectCompletion\\.emptyText',
];

for (const key of checks) {
  try {
    const out = execSync(
      `grep -rl "${key}" /home/mi_ito/mmdpf/frontend/src --include="*.tsx" --include="*.ts" 2>/dev/null`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    ).trim();
    if (out) {
      console.log(`[FOUND] ${key}: ${out.split('\n').length} file(s)`);
    } else {
      console.log(`[NONE ] ${key}`);
    }
  } catch {
    console.log(`[NONE ] ${key}`);
  }
}

for (const key of nsChecks) {
  try {
    const out = execSync(
      `grep -rl "${key}" /home/mi_ito/mmdpf/frontend/src --include="*.tsx" --include="*.ts" 2>/dev/null`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    ).trim();
    if (out) {
      console.log(`[FOUND] ${key}: ${out.split('\n').length} file(s)`);
    } else {
      console.log(`[NONE ] ${key}`);
    }
  } catch {
    console.log(`[NONE ] ${key}`);
  }
}
