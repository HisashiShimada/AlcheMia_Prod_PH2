#!/usr/bin/env python3
"""
en.json の修正スクリプト:
1. MISSING_EN 25件追加
2. EN_ONLY 351件削除（コンポーネントで未使用のゴミキー）
"""
import json
import sys

EN_JSON = 'frontend/src/locales/en.json'
EN_ONLY_FILE = '/tmp/en_only_keys.txt'

# ---- Load ----
with open(EN_JSON, encoding='utf-8') as f:
    en = json.load(f)

# ---- 1. MISSING_EN 追加 ----

def set_nested(obj, key_path, value):
    parts = key_path.split('.')
    for p in parts[:-1]:
        obj = obj.setdefault(p, {})
    obj[parts[-1]] = value

additions = {
    # approvalWizard
    'approvalWizard.execute': 'Execute',
    'approvalWizard.methodName': 'Method Name',
    'approvalWizard.methodNamePlaceholder': 'Select method',
    'approvalWizard.ng': 'NG',
    'approvalWizard.ngReasonPlaceholder': 'Enter NG reason',
    'approvalWizard.selectAction': 'Select action',
    'approvalWizard.taskNumber': 'Task Number',
    'approvalWizard.taskNumberPlaceholder': 'Select task number',
    # common
    'common.qualitative': 'Qualitative',
    'common.update': 'Update',
    # evaluation.columns (all)
    'evaluation.columns.evalValue': 'Evaluation Value',
    'evaluation.columns.comment': 'Comment',
    'evaluation.columns.criteriaName': 'Criteria Name',
    'evaluation.columns.evalUnit': 'Evaluation Unit',
    'evaluation.columns.evaluatedAt': 'Evaluated At',
    'evaluation.columns.evaluationValue': 'Evaluation Value',
    'evaluation.columns.methodName': 'Method Name',
    'evaluation.columns.projectName': 'Project Name',
    'evaluation.columns.qualEvaluation': 'Qualitative Evaluation',
    'evaluation.columns.target': 'Target',
    'evaluation.columns.taskLabel': 'Task',
    'evaluation.columns.transitionLabel': 'Transition',
    'evaluation.tabLabel': 'Evaluation',
    'evaluation.title': 'Evaluation Management',
    'evaluation.unitLabel.all': 'All',
    # template (top-level) - ja.jsonのtemplateブロックに対応
    'template.xmlParseError': 'Failed to parse XML: {errors}',
    'template.xmlSaveError': 'Cannot save due to XML errors: {errors}',
    # namespaceMain
    'namespaceMain.activateSuccess': 'Term activated',
    'namespaceMain.bulkDeactivateContent': '{count} terms will be deactivated.',
    'namespaceMain.bulkDeactivateSuccess': 'Deactivated {count} terms',
    'namespaceMain.bulkDeactivateTitle': 'Deactivate selected terms?',
    'namespaceMain.cancel': 'Cancel',
    'namespaceMain.deactivate': 'Deactivate',
    'namespaceMain.deactivateSuccess': 'Term deactivated',
    'namespaceMain.term': 'Term',
    # template
    'template.uncertaintyApplied': 'Uncertainty applied to "{key}" ({mode})',
    'template.uncertaintyDeleted': 'Uncertainty deleted from "{key}"',
    # termManagement
    'termManagement.csv.exportSelectAtLeastOne': 'Select at least one item to export',
    # editor.template
    'editor.template.xmlParseError': 'Failed to parse XML: {errors}',
    'editor.template.xmlSaveError': 'Cannot save due to XML errors: {errors}',
    # uncertainty.management
    'uncertainty.management.ctxMenuAddTeam': 'Add Team',
    'uncertainty.management.scopeAll': 'All',
    'uncertainty.management.toastTeamCreated': 'Team "{name}" created ({count} members)',
    'uncertainty.management.toastTeamUpdated': 'Updated members of "{name}" ({count} members)',
}

added = 0
for key_path, value in additions.items():
    set_nested(en, key_path, value)
    added += 1

print(f'Added: {added} keys')

# ---- 2. EN_ONLY 削除 ----
with open(EN_ONLY_FILE, encoding='utf-8') as f:
    en_only_keys = [line.strip() for line in f if line.strip()]

def delete_nested(obj, key_path):
    parts = key_path.split('.')
    cur = obj
    for p in parts[:-1]:
        if not isinstance(cur, dict) or p not in cur:
            return False
        cur = cur[p]
    if isinstance(cur, dict) and parts[-1] in cur:
        del cur[parts[-1]]
        return True
    return False

def remove_empty(obj):
    if not isinstance(obj, dict):
        return
    for k in list(obj.keys()):
        if isinstance(obj[k], dict):
            remove_empty(obj[k])
            if len(obj[k]) == 0:
                del obj[k]

deleted = 0
for key in en_only_keys:
    if delete_nested(en, key):
        deleted += 1

remove_empty(en)
print(f'Deleted: {deleted} keys')

# ---- Save ----
with open(EN_JSON, 'w', encoding='utf-8') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)
    f.write('\n')

print('en.json saved OK')
