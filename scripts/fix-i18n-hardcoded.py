#!/usr/bin/env python3
"""
ハードコード89件をi18n化するためのlocale追加スクリプト
"""
import json

JA_JSON = 'frontend/src/locales/ja.json'
EN_JSON = 'frontend/src/locales/en.json'

with open(JA_JSON, encoding='utf-8') as f:
    ja = json.load(f)
with open(EN_JSON, encoding='utf-8') as f:
    en = json.load(f)

def set_nested(obj, key_path, value):
    parts = key_path.split('.')
    for p in parts[:-1]:
        obj = obj.setdefault(p, {})
    obj[parts[-1]] = value

# (key, ja_value, en_value)
entries = [
    # WorkflowSelectorDialog
    ('workflowSelectorDialog.loadFailed',       'プロジェクト一覧の取得に失敗しました',   'Failed to load project list'),
    ('workflowSelectorDialog.selectRequired',   'プロジェクトを選択してください',           'Please select a project'),

    # EncryptionManagement
    ('encryption.previewFailed',                'プレビューの生成に失敗しました。',         'Failed to generate preview.'),
    ('encryption.encryptSuccess',               '暗号化が完了しました（{count}件）。',      'Encryption completed ({count} files).'),
    ('encryption.encryptFailed',                '暗号化に失敗しました。',                   'Encryption failed.'),
    ('encryption.keyRequired',                  '暗号化用の鍵を設定してください。',         'Please set an encryption key.'),
    ('encryption.decryptPreviewFailed',         '復号化プレビューの生成に失敗しました。',   'Failed to generate decryption preview.'),
    ('encryption.decryptSuccess',               '復号化が完了しました（{count}件）。',      'Decryption completed ({count} files).'),
    ('encryption.decryptFailed',                '復号化に失敗しました。',                   'Decryption failed.'),

    # KeyCreateModal
    ('encryption.keyCreate.success',            '鍵「{keyName}」を作成しました。',          'Key "{keyName}" created.'),
    ('encryption.keyCreate.failed',             '鍵の作成に失敗しました。',                 'Failed to create key.'),

    # KeyExportModal
    ('encryption.keyExport.success',            '鍵ファイルをエクスポートしました: {fileName}', 'Key file exported: {fileName}'),
    ('encryption.keyExport.failed',             'エクスポートに失敗しました。',              'Export failed.'),

    # KeyImportModal
    ('encryption.keyImport.invalidFormat',      '.key, .pem, .pfx 形式のファイルのみインポートできます。', 'Only .key, .pem, .pfx files can be imported.'),
    ('encryption.keyImport.fileRequired',       'インポートするファイルを選択してください。', 'Please select a file to import.'),
    ('encryption.keyImport.readFailed',         'ファイルの読み込みに失敗しました。',        'Failed to read file.'),
    ('encryption.keyImport.success',            '鍵をインポートしました: {keyName}',         'Key imported: {keyName}'),
    ('encryption.keyImport.failed',             'インポートに失敗しました。ファイル形式またはパスワードを確認してください。', 'Import failed. Check file format or password.'),

    # KeyManagement
    ('encryption.keyManage.deleteSuccess',      '鍵「{keyName}」を削除しました。',           'Key "{keyName}" deleted.'),
    ('encryption.keyManage.deleteFailed',       '鍵の削除に失敗しました。使用中の鍵は削除できません。', 'Failed to delete key. Keys in use cannot be deleted.'),

    # KeyRotateModal
    ('encryption.keyRotate.failed',             '鍵ローテーションに失敗しました。',          'Key rotation failed.'),

    # ExperimentWorkerMenu
    ('experimentWorker.startFailed',            '作業開始に失敗しました。再度お試しください。', 'Failed to start work. Please try again.'),
    ('experimentWorker.switchFailed',           '作業切り替えに失敗しました。再度お試しください。', 'Failed to switch work. Please try again.'),

    # DetailModal (namespace)
    ('namespaceDetail.saveTermSuccess',         '用語を保存しました',                        'Term saved'),
    ('namespaceDetail.prefixRequired',          '接頭辞は必須です',                          'Prefix is required'),
    ('namespaceDetail.uriRequired',             'URIは必須です',                             'URI is required'),
    ('namespaceDetail.saveNsSuccess',           '名前空間を保存しました',                    'Namespace saved'),

    # NamespaceAddDialog
    ('namespaceAdd.orcidAutoFilled',            'ORCIDからURIを自動入力しました',             'URI auto-filled from ORCID'),
    ('namespaceAdd.registerSuccess',            '名前空間「{prefix}」を登録しました',         'Namespace "{prefix}" registered'),

    # NamespaceMain
    ('namespaceMain.csvEmpty2',                 'CSVデータが空です',                          'CSV data is empty'),
    ('namespaceMain.csvNoData2',                '取込可能なデータがありませんでした',          'No importable data found'),
    ('namespaceMain.csvImportPartial2',         '{saved}件保存、{failCount}件失敗しました（失敗: {names}）', '{saved} saved, {failCount} failed (failed: {names})'),
    ('namespaceMain.csvImportSuccess2',         '{count} 件の用語をDBに保存しました',          '{count} terms saved to DB'),
    ('namespaceMain.csvParseError2',            'CSVの解析に失敗しました',                    'Failed to parse CSV'),
    ('namespaceMain.nsRegisterSuccess',         '名前空間「{prefix}」を登録しました',          'Namespace "{prefix}" registered'),
    ('namespaceMain.groupCreated',              'グループ「{groupName}」を作成しました',       'Group "{groupName}" created'),
    ('namespaceMain.memberUpdated',             '「{name}」を更新しました（メンバー: {count}名）', '"{name}" updated ({count} members)'),

    # PrefixManagement
    ('prefixManagement.sharePartial',           '{saved}件共有完了、{failCount}件失敗しました', '{saved} shared, {failCount} failed'),
    ('prefixManagement.shareSuccess',           '{count}件のPrefixを「{target}」に共有しました', '{count} prefixes shared to "{target}"'),
    ('prefixManagement.exportRequired',         'エクスポートするPrefixを1件以上選択してください', 'Select at least one prefix to export'),
    ('prefixManagement.csvEmpty',               'CSVデータが空です',                          'CSV data is empty'),
    ('prefixManagement.csvNoData',              '取込可能なデータがありませんでした',          'No importable data found'),
    ('prefixManagement.csvImportPartial',       '{saved}件保存、{failCount}件失敗しました（失敗: {names}）', '{saved} saved, {failCount} failed (failed: {names})'),
    ('prefixManagement.csvImportSuccess',       '{count}件のPrefixをDBに保存しました',         '{count} prefixes saved to DB'),
    ('prefixManagement.csvParseError',          'CSVの解析に失敗しました',                    'Failed to parse CSV'),
    ('prefixManagement.prefixRequired2',        'すべての行でPrefixを入力してください',        'Please enter prefix for all rows'),
    ('prefixManagement.registerSuccess',        '{count}件のPrefixを登録しました',             '{count} prefixes registered'),
    ('prefixManagement.prefixFieldRequired',    'Prefixは必須です',                           'Prefix is required'),
    ('prefixManagement.updateSuccess',          'Prefixを更新しました',                       'Prefix updated'),
    ('prefixManagement.deactivateSuccess',      'Prefix「{prefix}」を非アクティブにしました',  'Prefix "{prefix}" deactivated'),
    ('prefixManagement.activateSuccess',        'Prefix「{prefix}」をアクティブにしました',    'Prefix "{prefix}" activated'),
    ('prefixManagement.bulkDeactivateSuccess',  '{count}件のPrefixを非アクティブにしました',   '{count} prefixes deactivated'),

    # TeamAddDialog
    ('teamAdd.memberDuplicate',                 'このメンバーは既に追加されています',          'This member has already been added'),
    ('teamAdd.groupCdRequired',                 'グループCDを入力してください',               'Please enter group CD'),
    ('teamAdd.groupNameRequired',               'グループ名を入力してください',               'Please enter group name'),
    ('teamAdd.groupCreateFailed',               'グループの作成に失敗しました: {message}',     'Failed to create group: {message}'),
    ('teamAdd.memberSetFailed',                 'グループは作成しましたが、メンバーの設定に失敗しました', 'Group created but failed to set members'),
    ('teamAdd.createSuccess',                   'グループ「{name}」を作成しました',            'Group "{name}" created'),
    ('teamAdd.createError',                     'グループの作成中にエラーが発生しました',      'An error occurred while creating the group'),

    # TeamEditDialog
    ('teamEdit.memberDuplicate',                'このメンバーは既に追加されています',          'This member has already been added'),
    ('teamEdit.groupNameRequired',              'グループ名を入力してください',               'Please enter group name'),
    ('teamEdit.groupCdMissing',                 'グループCDが未設定のため、DBへの保存をスキップしました', 'Group CD not set, skipping DB save'),
    ('teamEdit.nameUpdateFailed',               'グループ名の更新に失敗しました: {message}',   'Failed to update group name: {message}'),
    ('teamEdit.memberUpdateFailed',             'メンバーの更新に失敗しました: {message}',     'Failed to update members: {message}'),
    ('teamEdit.chiefUpdateFailed',              '代表者の更新に失敗しました: {message}',       'Failed to update chief: {message}'),
    ('teamEdit.saveSuccess',                    '「{name}」を保存しました（メンバー: {count}名）', '"{name}" saved ({count} members)'),
    ('teamEdit.saveError',                      '保存中にエラーが発生しました',               'An error occurred while saving'),

    # TeamManagementPanel
    ('teamManagementPanel.loadFailed',          'グループ一覧の取得に失敗しました',           'Failed to load group list'),
    ('teamManagementPanel.memberLoadFailed',    'メンバー情報の取得に失敗しました',           'Failed to load member information'),
    ('teamManagementPanel.groupCreated',        'グループ「{groupName}」を作成しました',       'Group "{groupName}" created'),
    ('teamManagementPanel.deleteFailed',        '削除に失敗しました: {message}',              'Failed to delete: {message}'),
    ('teamManagementPanel.deleteSuccess',       'グループ「{name}」を削除しました',            'Group "{name}" deleted'),
    ('teamManagementPanel.deleteError',         '削除中にエラーが発生しました',               'An error occurred while deleting'),

    # ExperimentPlanDialog
    ('experimentPlan.loadFailed',               '実験計画データの取得に失敗しました',          'Failed to load experiment plan data'),
    ('experimentPlan.importSuccess',            'インポートしました',                          'Imported'),
    ('experimentPlan.jsonParseFailed',          'JSONの解析に失敗しました',                   'Failed to parse JSON'),
    ('experimentPlan.exportSuccess',            'エクスポートしました',                       'Exported'),
    ('experimentPlan.saveSuccess',              '実験計画を保存しました',                     'Experiment plan saved'),
    ('experimentPlan.saveFailed',               '保存に失敗しました',                         'Failed to save'),

    # TaskRegistrationTab
    ('taskRegistration.saveMockSuccess',        '実験計画を保存しました（モック）',            'Experiment plan saved (mock)'),

    # SignatureManagement
    ('signature.loadFailed',                    '署名状態の取得に失敗しました',               'Failed to load signature status'),
    ('signature.signSuccess',                   '署名を実行しました',                         'Signature executed'),
    ('signature.signFailed',                    '署名の実行に失敗しました',                   'Signature failed'),
    ('signature.deleteSuccess',                 '署名を削除しました',                         'Signature deleted'),
    ('signature.deleteFailed',                  '署名の削除に失敗しました',                   'Failed to delete signature'),

    # UncertaintyExportModal
    ('uncertaintyExport.startDemo',             'エクスポートファイルのダウンロードを開始します（デモ）', 'Starting export file download (demo)'),

    # UncertaintyImportModal
    ('uncertaintyImport.startDemo',             'インポート処理を開始します（デモ）',          'Starting import process (demo)'),
]

added_ja = 0
added_en = 0
for key, ja_val, en_val in entries:
    set_nested(ja, key, ja_val)
    added_ja += 1
    set_nested(en, key, en_val)
    added_en += 1

with open(JA_JSON, 'w', encoding='utf-8') as f:
    json.dump(ja, f, ensure_ascii=False, indent=2)
    f.write('\n')
with open(EN_JSON, 'w', encoding='utf-8') as f:
    json.dump(en, f, ensure_ascii=False, indent=2)
    f.write('\n')

print(f'ja.json: added {added_ja} keys')
print(f'en.json: added {added_en} keys')
print('Done')
