#!/usr/bin/env python3
"""
ハードコードメッセージをt()に置き換えるスクリプト
useLanguageが未インポートのファイルにはimportと const { t } を追加する
"""
import re

BASE = 'frontend/src/components'

def read(path):
    with open(path, encoding='utf-8') as f:
        return f.read()

def write(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def ensure_use_language(content, filename):
    """useLanguageのimportとconst { t }がなければ追加する"""
    # import追加
    if "from '@/contexts/LanguageContext'" not in content:
        # 最後のimport行の後に追加
        content = re.sub(
            r"(import\s+.*?;\n)(?!import)",
            r"\1import { useLanguage } from '@/contexts/LanguageContext';\n",
            content,
            count=1,
            flags=re.DOTALL
        )
    # const { t } 追加 - コンポーネント関数内の最初のconst/useStateの前に追加
    if "const { t } = useLanguage()" not in content:
        # 関数本体の最初のuseState/useRefなどの前、またはreturnの前に追加
        content = re.sub(
            r'(\bconst\s+\[)',
            r'const { t } = useLanguage();\n  \1',
            content,
            count=1
        )
    return content

changes = []

# ============================================================
# EncryptionManagement.tsx
# ============================================================
path = f'{BASE}/encryption/EncryptionManagement.tsx'
c = read(path)
c = ensure_use_language(c, path)
c = c.replace("message.error('プレビューの生成に失敗しました。')", "message.error(t('encryption.previewFailed'))")
c = c.replace("message.success(`暗号化が完了しました（${targetPaths.length}件）。`)", "message.success(t('encryption.encryptSuccess', { count: targetPaths.length }))")
c = c.replace("message.error('暗号化に失敗しました。')", "message.error(t('encryption.encryptFailed'))")
c = c.replace("message.warning('暗号化用の鍵を設定してください。')", "message.warning(t('encryption.keyRequired'))")
c = c.replace("message.error('復号化プレビューの生成に失敗しました。')", "message.error(t('encryption.decryptPreviewFailed'))")
c = c.replace("message.success(`復号化が完了しました（${targetPaths.length}件）。`)", "message.success(t('encryption.decryptSuccess', { count: targetPaths.length }))")
c = c.replace("message.error('復号化に失敗しました。')", "message.error(t('encryption.decryptFailed'))")
write(path, c)
changes.append(path)

# ============================================================
# KeyCreateModal.tsx
# ============================================================
path = f'{BASE}/encryption/KeyCreateModal.tsx'
c = read(path)
c = ensure_use_language(c, path)
c = c.replace("message.success(`鍵「${newKey.keyName}」を作成しました。`)", "message.success(t('encryption.keyCreate.success', { keyName: newKey.keyName }))")
c = c.replace("message.error('鍵の作成に失敗しました。')", "message.error(t('encryption.keyCreate.failed'))")
write(path, c)
changes.append(path)

# ============================================================
# KeyExportModal.tsx
# ============================================================
path = f'{BASE}/encryption/KeyExportModal.tsx'
c = read(path)
c = ensure_use_language(c, path)
c = c.replace("message.success(`鍵ファイルをエクスポートしました: ${fileName}`)", "message.success(t('encryption.keyExport.success', { fileName }))")
c = c.replace("message.error('エクスポートに失敗しました。')", "message.error(t('encryption.keyExport.failed'))")
write(path, c)
changes.append(path)

# ============================================================
# KeyImportModal.tsx
# ============================================================
path = f'{BASE}/encryption/KeyImportModal.tsx'
c = read(path)
c = ensure_use_language(c, path)
c = c.replace("message.error('.key, .pem, .pfx 形式のファイルのみインポートできます。')", "message.error(t('encryption.keyImport.invalidFormat'))")
c = c.replace("message.warning('インポートするファイルを選択してください。')", "message.warning(t('encryption.keyImport.fileRequired'))")
c = c.replace("message.error('ファイルの読み込みに失敗しました。')", "message.error(t('encryption.keyImport.readFailed'))")
c = c.replace("message.success(`鍵をインポートしました: ${imported.keyName}`)", "message.success(t('encryption.keyImport.success', { keyName: imported.keyName }))")
c = c.replace("message.error('インポートに失敗しました。ファイル形式またはパスワードを確認してください。')", "message.error(t('encryption.keyImport.failed'))")
write(path, c)
changes.append(path)

# ============================================================
# KeyManagement.tsx
# ============================================================
path = f'{BASE}/encryption/KeyManagement.tsx'
c = read(path)
c = ensure_use_language(c, path)
c = c.replace("message.success(`鍵「${keyName}」を削除しました。`)", "message.success(t('encryption.keyManage.deleteSuccess', { keyName }))")
c = c.replace("message.error('鍵の削除に失敗しました。使用中の鍵は削除できません。')", "message.error(t('encryption.keyManage.deleteFailed'))")
write(path, c)
changes.append(path)

# ============================================================
# KeyRotateModal.tsx
# ============================================================
path = f'{BASE}/encryption/KeyRotateModal.tsx'
c = read(path)
c = ensure_use_language(c, path)
c = c.replace("message.error('鍵ローテーションに失敗しました。')", "message.error(t('encryption.keyRotate.failed'))")
write(path, c)
changes.append(path)

# ============================================================
# ExperimentWorkerMenu.tsx (useLanguage既存)
# ============================================================
path = f'{BASE}/menus/ExperimentWorkerMenu.tsx'
c = read(path)
c = c.replace("message.error('作業開始に失敗しました。再度お試しください。')", "message.error(t('experimentWorker.startFailed'))")
c = c.replace("message.error('作業切り替えに失敗しました。再度お試しください。')", "message.error(t('experimentWorker.switchFailed'))")
write(path, c)
changes.append(path)

# ============================================================
# DetailModal.tsx
# ============================================================
path = f'{BASE}/namespace/DetailModal.tsx'
c = read(path)
c = ensure_use_language(c, path)
c = c.replace("message.success('用語を保存しました')", "message.success(t('namespaceDetail.saveTermSuccess'))")
c = c.replace("message.error('接頭辞は必須です')", "message.error(t('namespaceDetail.prefixRequired'))")
c = c.replace("message.error('URIは必須です')", "message.error(t('namespaceDetail.uriRequired'))")
c = c.replace("message.success('名前空間を保存しました')", "message.success(t('namespaceDetail.saveNsSuccess'))")
write(path, c)
changes.append(path)

# ============================================================
# NamespaceAddDialog.tsx
# ============================================================
path = f'{BASE}/namespace/NamespaceAddDialog.tsx'
c = read(path)
c = ensure_use_language(c, path)
c = c.replace("message.success('ORCIDからURIを自動入力しました')", "message.success(t('namespaceAdd.orcidAutoFilled'))")
c = c.replace("message.success(`名前空間「${values.prefix}」を登録しました`)", "message.success(t('namespaceAdd.registerSuccess', { prefix: values.prefix }))")
write(path, c)
changes.append(path)

# ============================================================
# NamespaceMain.tsx (useLanguage既存)
# ============================================================
path = f'{BASE}/namespace/NamespaceMain.tsx'
c = read(path)
# CSVデータ処理
c = c.replace(
    "if (lines.length < 2) { message.error('CSVデータが空です'); return; }",
    "if (lines.length < 2) { message.error(t('namespaceMain.csvEmpty2')); return; }"
)
c = c.replace(
    "if (rows.length === 0) { message.error('取込可能なデータがありませんでした'); return; }",
    "if (rows.length === 0) { message.error(t('namespaceMain.csvNoData2')); return; }"
)
c = c.replace(
    "message.warning(`${added.length}件保存、${failed.length}件失敗しました（失敗: ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '...' : ''}）`)",
    "message.warning(t('namespaceMain.csvImportPartial2', { saved: added.length, failCount: failed.length, names: failed.slice(0, 3).join(', ') + (failed.length > 3 ? '...' : '') }))"
)
c = c.replace(
    "message.success(`${added.length} 件の用語をDBに保存しました`)",
    "message.success(t('namespaceMain.csvImportSuccess2', { count: added.length }))"
)
c = c.replace(
    "message.error('CSVの解析に失敗しました')",
    "message.error(t('namespaceMain.csvParseError2'))"
)
c = c.replace(
    "message.success(`名前空間「${result.prefix}」を登録しました`)",
    "message.success(t('namespaceMain.nsRegisterSuccess', { prefix: result.prefix }))"
)
c = c.replace(
    "message.success(`グループ「${groupName}」を作成しました`)",
    "message.success(t('namespaceMain.groupCreated', { groupName }))"
)
c = c.replace(
    "message.success(`「${name}」を更新しました（メンバー: ${members.length}名）`)",
    "message.success(t('namespaceMain.memberUpdated', { name, count: members.length }))"
)
write(path, c)
changes.append(path)

# ============================================================
# PrefixManagement.tsx
# ============================================================
path = f'{BASE}/namespace/PrefixManagement.tsx'
c = read(path)
c = ensure_use_language(c, path)
c = c.replace(
    "message.warning(`${added.length}件共有完了、${failed.length}件失敗しました`)",
    "message.warning(t('prefixManagement.sharePartial', { saved: added.length, failCount: failed.length }))"
)
c = c.replace(
    "message.success(`${added.length}件のPrefixを「${target.label}」に共有しました`)",
    "message.success(t('prefixManagement.shareSuccess', { count: added.length, target: target.label }))"
)
c = c.replace(
    "message.error('エクスポートするPrefixを1件以上選択してください')",
    "message.error(t('prefixManagement.exportRequired'))"
)
c = c.replace(
    "if (lines.length < 2) { message.error('CSVデータが空です'); return; }",
    "if (lines.length < 2) { message.error(t('prefixManagement.csvEmpty')); return; }"
)
c = c.replace(
    "if (parsedRows.length === 0) { message.error('取込可能なデータがありませんでした'); return; }",
    "if (parsedRows.length === 0) { message.error(t('prefixManagement.csvNoData')); return; }"
)
c = c.replace(
    "message.warning(`${added.length}件保存、${failed.length}件失敗しました（失敗: ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '...' : ''}）`)",
    "message.warning(t('prefixManagement.csvImportPartial', { saved: added.length, failCount: failed.length, names: failed.slice(0, 3).join(', ') + (failed.length > 3 ? '...' : '') }))"
)
c = c.replace(
    "message.success(`${added.length}件のPrefixをDBに保存しました`)",
    "message.success(t('prefixManagement.csvImportSuccess', { count: added.length }))"
)
c = c.replace(
    "message.error('CSVの解析に失敗しました')",
    "message.error(t('prefixManagement.csvParseError'))"
)
c = c.replace(
    "if (!row.prefix) { message.error('すべての行でPrefixを入力してください'); return; }",
    "if (!row.prefix) { message.error(t('prefixManagement.prefixRequired2')); return; }"
)
c = c.replace(
    "message.success(`${added.length}件のPrefixを登録しました`)",
    "message.success(t('prefixManagement.registerSuccess', { count: added.length }))"
)
c = c.replace(
    "if (!editingValues.prefix) { message.error('Prefixは必須です'); return; }",
    "if (!editingValues.prefix) { message.error(t('prefixManagement.prefixFieldRequired')); return; }"
)
c = c.replace(
    "message.success('Prefixを更新しました')",
    "message.success(t('prefixManagement.updateSuccess'))"
)
c = c.replace(
    "message.success(`Prefix「${prefix}」を非アクティブにしました`)",
    "message.success(t('prefixManagement.deactivateSuccess', { prefix }))"
)
c = c.replace(
    "message.success(`Prefix「${prefix}」をアクティブにしました`)",
    "message.success(t('prefixManagement.activateSuccess', { prefix }))"
)
c = c.replace(
    "message.success(`${count}件のPrefixを非アクティブにしました`)",
    "message.success(t('prefixManagement.bulkDeactivateSuccess', { count }))"
)
write(path, c)
changes.append(path)

# ============================================================
# TeamAddDialog.tsx
# ============================================================
path = f'{BASE}/namespace/TeamAddDialog.tsx'
c = read(path)
c = ensure_use_language(c, path)
c = c.replace("message.warning('このメンバーは既に追加されています')", "message.warning(t('teamAdd.memberDuplicate'))")
c = c.replace("message.error('グループCDを入力してください')", "message.error(t('teamAdd.groupCdRequired'))")
c = c.replace("message.error('グループ名を入力してください')", "message.error(t('teamAdd.groupNameRequired'))")
c = c.replace(
    "message.error(`グループの作成に失敗しました: ${(err as any).error?.message ?? res.status}`)",
    "message.error(t('teamAdd.groupCreateFailed', { message: (err as any).error?.message ?? res.status }))"
)
c = c.replace("message.warning('グループは作成しましたが、メンバーの設定に失敗しました')", "message.warning(t('teamAdd.memberSetFailed'))")
c = c.replace("message.success(`グループ「${createdName}」を作成しました`)", "message.success(t('teamAdd.createSuccess', { name: createdName }))")
c = c.replace("message.error('グループの作成中にエラーが発生しました')", "message.error(t('teamAdd.createError'))")
write(path, c)
changes.append(path)

# ============================================================
# TeamEditDialog.tsx
# ============================================================
path = f'{BASE}/namespace/TeamEditDialog.tsx'
c = read(path)
c = ensure_use_language(c, path)
c = c.replace("message.warning('このメンバーは既に追加されています')", "message.warning(t('teamEdit.memberDuplicate'))")
c = c.replace("message.error('グループ名を入力してください')", "message.error(t('teamEdit.groupNameRequired'))")
c = c.replace("message.warning('グループCDが未設定のため、DBへの保存をスキップしました')", "message.warning(t('teamEdit.groupCdMissing'))")
c = c.replace(
    "message.error(`グループ名の更新に失敗しました: ${(err as any).error?.message ?? nameRes.status}`)",
    "message.error(t('teamEdit.nameUpdateFailed', { message: (err as any).error?.message ?? nameRes.status }))"
)
c = c.replace(
    "message.error(`メンバーの更新に失敗しました: ${(err as any).error?.message ?? memRes.status}`)",
    "message.error(t('teamEdit.memberUpdateFailed', { message: (err as any).error?.message ?? memRes.status }))"
)
c = c.replace(
    "message.error(`代表者の更新に失敗しました: ${(err as any).error?.message ?? chiefRes.status}`)",
    "message.error(t('teamEdit.chiefUpdateFailed', { message: (err as any).error?.message ?? chiefRes.status }))"
)
c = c.replace(
    "message.success(`「${teamName.trim()}」を保存しました（メンバー: ${members.length}名）`)",
    "message.success(t('teamEdit.saveSuccess', { name: teamName.trim(), count: members.length }))"
)
c = c.replace("message.error('保存中にエラーが発生しました')", "message.error(t('teamEdit.saveError'))")
write(path, c)
changes.append(path)

# ============================================================
# TeamManagementPanel.tsx
# ============================================================
path = f'{BASE}/namespace/TeamManagementPanel.tsx'
c = read(path)
c = ensure_use_language(c, path)
c = c.replace("message.error('グループ一覧の取得に失敗しました')", "message.error(t('teamManagementPanel.loadFailed'))")
c = c.replace("message.warning('メンバー情報の取得に失敗しました')", "message.warning(t('teamManagementPanel.memberLoadFailed'))")
c = c.replace("message.success(`グループ「${groupName}」を作成しました`)", "message.success(t('teamManagementPanel.groupCreated', { groupName }))")
c = c.replace(
    "message.error(`削除に失敗しました: ${(err as any).error?.message ?? res.status}`)",
    "message.error(t('teamManagementPanel.deleteFailed', { message: (err as any).error?.message ?? res.status }))"
)
c = c.replace("message.success(`グループ「${team.unitName}」を削除しました`)", "message.success(t('teamManagementPanel.deleteSuccess', { name: team.unitName }))")
c = c.replace("message.error('削除中にエラーが発生しました')", "message.error(t('teamManagementPanel.deleteError'))")
write(path, c)
changes.append(path)

# ============================================================
# ExperimentPlanDialog.tsx
# ============================================================
path = f'{BASE}/project/ExperimentPlanDialog.tsx'
c = read(path)
c = ensure_use_language(c, path)
c = c.replace("message.error('実験計画データの取得に失敗しました')", "message.error(t('experimentPlan.loadFailed'))")
c = c.replace("message.success('インポートしました')", "message.success(t('experimentPlan.importSuccess'))")
c = c.replace("message.error('JSONの解析に失敗しました')", "message.error(t('experimentPlan.jsonParseFailed'))")
c = c.replace("message.success('エクスポートしました')", "message.success(t('experimentPlan.exportSuccess'))")
c = c.replace("message.success('実験計画を保存しました')", "message.success(t('experimentPlan.saveSuccess'))")
c = c.replace("message.error('保存に失敗しました')", "message.error(t('experimentPlan.saveFailed'))")
write(path, c)
changes.append(path)

# ============================================================
# TaskRegistrationTab.tsx (useLanguage既存)
# ============================================================
path = f'{BASE}/project/TaskRegistrationTab.tsx'
c = read(path)
c = c.replace("message.success('実験計画を保存しました（モック）')", "message.success(t('taskRegistration.saveMockSuccess'))")
write(path, c)
changes.append(path)

# ============================================================
# SignatureManagement.tsx
# ============================================================
path = f'{BASE}/signature/SignatureManagement.tsx'
c = read(path)
c = ensure_use_language(c, path)
c = c.replace("message.error('署名状態の取得に失敗しました')", "message.error(t('signature.loadFailed'))")
c = c.replace("message.success('署名を実行しました')", "message.success(t('signature.signSuccess'))")
c = c.replace("message.error('署名の実行に失敗しました')", "message.error(t('signature.signFailed'))")
c = c.replace("message.success('署名を削除しました')", "message.success(t('signature.deleteSuccess'))")
c = c.replace("message.error('署名の削除に失敗しました')", "message.error(t('signature.deleteFailed'))")
write(path, c)
changes.append(path)

# ============================================================
# UncertaintyExportModal.tsx
# ============================================================
path = f'{BASE}/uncertainty/UncertaintyExportModal.tsx'
c = read(path)
c = ensure_use_language(c, path)
c = c.replace("message.success('エクスポートファイルのダウンロードを開始します（デモ）')", "message.success(t('uncertaintyExport.startDemo'))")
write(path, c)
changes.append(path)

# ============================================================
# UncertaintyImportModal.tsx
# ============================================================
path = f'{BASE}/uncertainty/UncertaintyImportModal.tsx'
c = read(path)
c = ensure_use_language(c, path)
c = c.replace("message.success('インポート処理を開始します（デモ）')", "message.success(t('uncertaintyImport.startDemo'))")
write(path, c)
changes.append(path)

print(f'Modified {len(changes)} files:')
for f in changes:
    print(f'  {f}')
print('Done')
