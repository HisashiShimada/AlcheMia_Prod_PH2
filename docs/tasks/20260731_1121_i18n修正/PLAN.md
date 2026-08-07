# i18n キー整合性修正 作業資料

## 実施日時
2026-07-31 11:21〜

---

## ■ 発端

`frontend/src/contexts/LanguageContext.tsx` 20行目でエラーが発生。

### 原因
`projectCompletion` セクションの `ja.json` に以下のキーが不足していた：
- `title`, `description`, `projectWholeLabel`, `entireProject`
- `colTarget`, `colQualitative`, `colComment`
- `saveNote`, `unevaluated`, `noEvalTarget`

### 修正内容（完了）
`ja.json` の `projectCompletion` セクションと `common` セクションに不足キーを追加済み。

---

## ■ チェックスクリプト

```bash
cd /home/mi_ito/mmdpf
node scripts/check-i18n-keys.js 2>&1 > scripts/result/i18n-check-report.txt
```

---

## ■ 現状（2026-07-31 11:25 時点）

```
【1】MISSING_BOTH (ja & en 未定義): 29 件  ← 最優先
【2】MISSING_JA   (ja のみ未定義):  28 件  ← 優先
【3】MISSING_EN   (en のみ未定義):   2 件
【4】JA_ONLY      (ja にあって en 無): 2 件
【5】EN_ONLY      (368件)            ← コンポーネント未使用のため対応不要
【6】ハードコード  (89件)            ← 対応は任意（i18n化推奨）
```

---

## ■ 残作業一覧

### 【1】MISSING_BOTH（ja & en 両方に追加が必要）29件

| キー | ja 訳 | en 訳 |
|------|-------|-------|
| `approvalWizard.execute` | 実行 | Execute |
| `approvalWizard.methodName` | メソッド名 | Method Name |
| `approvalWizard.Placeholder` | ※要確認 | ※要確認 |
| `editor.template.xmlParseError` | XMLのパースに失敗しました | Failed to parse XML |
| `editor.template.xmlSaveError` | XMLにエラーがあるため保存できません | Cannot save due to XML errors |
| `evaluation.columns.evalValue` | 評価値 | Evaluation Value |
| `evaluation.tabLabel` | 評価 | Evaluation |
| `evaluation.title` | 評価管理 | Evaluation Management |
| `evaluation.unitLabel.all` | すべて | All |
| `namespaceMain.activateSuccess` | 用語をアクティブにしました | Term activated |
| `namespaceMain.bulkDeactivateContent` | {count}件の用語が非アクティブになります。 | {count} terms will be deactivated. |
| `namespaceMain.bulkDeactivateSuccess` | {count}件の用語を非アクティブにしました | Deactivated {count} terms |
| `namespaceMain.bulkDeactivateTitle` | 選択した用語を非アクティブにしますか？ | Deactivate selected terms? |
| `namespaceMain.cancel` | キャンセル | Cancel |
| `namespaceMain.deactivate` | 非アクティブ | Deactivate |
| `namespaceMain.deactivateSuccess` | 用語を非アクティブにしました | Term deactivated |
| `namespaceMain.term` | 用語 | Term |
| `template.uncertaintyApplied` | 不確かさを付与しました | Uncertainty applied |
| `template.uncertaintyDeleted` | 不確かさを削除しました | Uncertainty deleted |
| `termManagement.csv.exportSelectAtLeastOne` | エクスポートするデータを1件以上選択してください | Select at least one item to export |
| `uncertainty.management.ctxMenuAddTeam` | チームを追加 | Add Team |
| `uncertainty.management.scopeAll` | すべて | All |
| `uncertainty.management.toastTeamCreated` | チーム「{name}」を作成しました（メンバー: {count}名） | Team "{name}" created ({count} members) |
| `uncertainty.management.toastTeamUpdated` | 「{name}」のメンバーを更新しました（{count}名） | Updated members of "{name}" ({count} members) |

> ※ `approvalWizard.Placeholder` はキー名が途中で切れている可能性あり。コンポーネントを直接確認すること。

---

### 【2】MISSING_JA（ja.json のみ追加が必要）28件

すべて `projectManagement` セクションに追加：

```json
"projectManagement": {
  "progressDetailTitle": "プロジェクト進捗詳細",
  "progressDetailReload": "リロード",
  "rename": {
    "title": "プロジェクト名変更",
    "okText": "変更",
    "label": "新しいプロジェクト名",
    "required": "プロジェクト名を入力してください",
    "patternError": "プロジェクト名は英数字・アンダースコア・ハイフンのみ使用できます",
    "maxLengthError": "プロジェクト名は255文字以内で入力してください",
    "success": "プロジェクト名を「{{name}}」に変更しました",
    "duplicateError": "同名のプロジェクトが既に存在します",
    "failed": "プロジェクト名の変更に失敗しました"
  },
  "fileManagement": {
    "emptyState": "ファイルがありません",
    "messages": {
      "downloadStarted": "「{{fileName}}」のダウンロードを開始しました",
      "filePathMissing": "ファイルパスが指定されていません",
      "downloadError": "ファイルのダウンロードに失敗しました: {{error}}",
      "renameFailed": "ファイル名の変更に失敗しました",
      "renameSuccess": "「{{oldName}}」を「{{newName}}」に変更しました"
    }
  },
  "task_results": {
    "no_tasks": "タスク結果がありません",
    "method_name": "メソッド名",
    "task_no": "タスクNo",
    "status": "ステータス",
    "work_completed_at": "作業完了日",
    "review_completed_at": "レビュー完了日",
    "status_pending": "実行待ち",
    "status_in_progress": "実行中",
    "status_review_waiting": "レビュー待ち",
    "status_completed": "完了",
    "status_error": "エラー"
  }
}
```

---

### 【3】MISSING_EN（en.json に追加が必要）2件

`en.json` の `common` セクションに追加：

```json
"common": {
  "qualitative": "Qualitative",
  "update": "Update"
}
```

---

### 【5】EN_ONLY 368件 → 対応不要

これらは `en.json` に定義はあるが、コンポーネントで使用されていないキー。
現時点では対応不要（削除推奨だが影響調査が必要なため保留）。

---

### 【6】ハードコード 89件 → 任意対応

以下のファイルで `message.error/success/warning` に日本語文字列が直接渡されている。
i18n化推奨だが、優先度低。

主な対象ファイル：
- `WorkflowSelectorDialog.tsx`
- `EncryptionManagement.tsx` / `KeyCreateModal.tsx` / `KeyExportModal.tsx` / `KeyImportModal.tsx` / `KeyManagement.tsx` / `KeyRotateModal.tsx`
- `ExperimentWorkerMenu.tsx`
- `DetailModal.tsx` / `NamespaceAddDialog.tsx` / `NamespaceMain.tsx` / `PrefixManagement.tsx`
- `TeamAddDialog.tsx` / `TeamEditDialog.tsx` / `TeamManagementPanel.tsx`
- `ExperimentPlanDialog.tsx`
- `SignatureManagement.tsx`
- `UncertaintyExportModal.tsx` / `UncertaintyImportModal.tsx`

---

## ■ 実施手順（続き）

### Step 1: ja.json に MISSING_JA の28件を追加

`projectManagement` セクションの既存定義に以下を追加・補完：
- `progressDetailTitle`, `progressDetailReload`
- `rename` オブジェクト全体
- `fileManagement.emptyState` と `fileManagement.messages` 配下
- `task_results` 配下の不足キー

### Step 2: ja.json と en.json に MISSING_BOTH の残り25件を追加

- `approvalWizard` セクションに `execute`, `methodName` を追加
- `editor.template` セクションに `xmlParseError`, `xmlSaveError` を追加
- `evaluation` セクションに `columns.evalValue`, `tabLabel`, `title`, `unitLabel.all` を追加
- `namespaceMain` セクションに不足キーを追加
- `template` セクションに `uncertaintyApplied`, `uncertaintyDeleted` を追加
- `termManagement.csv.exportSelectAtLeastOne` を追加
- `uncertainty.management` セクションに4件追加

### Step 3: en.json に MISSING_EN の2件を追加

- `common.qualitative` と `common.update` を追加

### Step 4: チェックスクリプトを再実行して確認

```bash
node scripts/check-i18n-keys.js 2>&1 | grep -E "MISSING_BOTH|MISSING_JA|MISSING_EN"
```

---

## ■ ファイル場所

- `frontend/src/locales/ja.json` — 日本語翻訳
- `frontend/src/locales/en.json` — 英語翻訳
- `scripts/check-i18n-keys.js` — チェックスクリプト
- `scripts/result/i18n-check-report.txt` — 最新チェック結果
