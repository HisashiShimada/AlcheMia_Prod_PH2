# 対応結果: InstructionEditDialog 保存→追加ボタン変更と多言語対応

## 実施日時
2026-04-23 09:12 〜 09:18

## 対応概要

`frontend/src/components/project/InstructionEditDialog.tsx` の保存ボタンを追加ボタンに変更し、
コンポーネント全体の多言語対応（i18n）を実施した。

---

## 変更ファイル一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `frontend/src/components/project/InstructionEditDialog.tsx` | 修正 | ボタン変更・多言語対応 |
| `frontend/src/locales/ja.json` | 追記 | `instructionEditDialog` セクション追加 |
| `frontend/src/locales/en.json` | 追記 | `instructionEditDialog` セクション追加 |

---

## 変更詳細

### 1. `frontend/src/components/project/InstructionEditDialog.tsx`

#### ボタン変更
- **保存ボタン**
  - アイコン: `SaveOutlined` → `PlusOutlined`
  - ラベル: 「保存」→ `t('instructionEditDialog.saveButton')`（= 「追加」 / "Add"）
- **連続指示ボタン**
  - ラベル: 「連続指示」→ `t('instructionEditDialog.saveAndContinueButton')`
- **キャンセルボタン**: `t('common.cancel')` に変更
- **閉じるボタン**（送信済み時）: `t('common.close')` に変更
- `SaveOutlined` の import を削除（不要になったため）

#### 多言語対応（ハードコード文字列の置き換え）
| 箇所 | 変更前 | 変更後 |
|---|---|---|
| Modal title（送信済み） | `'指示詳細'` | `t('instructionEditDialog.titleDetail')` |
| Modal title（新規） | `'新規指示の追加'` | `t('instructionEditDialog.titleCreate')` |
| Modal title（編集） | `'指示の編集'` | `t('instructionEditDialog.titleEdit')` |
| 指示対象ラベル | `'🎯 指示対象'` | `t('instructionEditDialog.targetLabel')` |
| プロジェクト全体テキスト | `'プロジェクト全体'` | `t('instructionEditDialog.wholeProject')` |
| 優先度ラベル | `'優先度'` | `t('instructionEditDialog.priorityLabel')` |
| 優先度バリデーション | `'優先度を選択してください'` | `t('instructionEditDialog.priorityRequired')` |
| タイプラベル | `'タイプ'` | `t('instructionEditDialog.typeLabel')` |
| タイプバリデーション | `'タイプを選択してください'` | `t('instructionEditDialog.typeRequired')` |
| 対象タスクラベル | `'🎯 対象タスク'` | `t('instructionEditDialog.taskLabel')` |
| タスク placeholder | `'タスク番号を選択...'` | `t('instructionEditDialog.taskPlaceholder')` |
| タスクオプション | `'タスク {n}'` | `t('instructionEditDialog.taskOption').replace('{taskNum}', ...)` |
| トランジションIDラベル | `'🔗 トランジションID'` | `t('instructionEditDialog.transitionLabel')` |
| トランジション placeholder | `'トランジションを選択...'` | `t('instructionEditDialog.transitionPlaceholder')` |
| Alert「選択中:」 | `'選択中:'` | `t('instructionEditDialog.alertSelected')` |
| Alert「カテゴリ:」 | `'カテゴリ:'` | `t('instructionEditDialog.alertCategory')` |
| Alert「説明:」 | `'説明:'` | `t('instructionEditDialog.alertDescription')` |
| 指示内容ラベル | `'指示内容'` | `t('instructionEditDialog.contentLabel')` |
| 指示内容バリデーション（必須） | `'指示内容を入力してください'` | `t('instructionEditDialog.contentRequired')` |
| 指示内容バリデーション（文字数） | `'1000文字以内で入力してください'` | `t('instructionEditDialog.contentMaxLength')` |
| 指示内容 placeholder | `'作業者への具体的な指示を入力してください...'` | `t('instructionEditDialog.contentPlaceholder')` |

#### import 変更
```diff
- import { FileTextOutlined, AimOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons';
+ import { FileTextOutlined, AimOutlined, PlusOutlined } from '@ant-design/icons';
+ import { useLanguage } from '@/contexts/LanguageContext';
```

---

### 2. `frontend/src/locales/ja.json` / `frontend/src/locales/en.json`

末尾に `instructionEditDialog` セクションを追加（各26キー）。

#### ja.json 追加内容
```json
"instructionEditDialog": {
  "titleDetail": "指示詳細",
  "titleCreate": "新規指示の追加",
  "titleEdit": "指示の編集",
  "saveButton": "追加",
  "saveAndContinueButton": "連続指示",
  "targetLabel": "🎯 指示対象",
  "wholeProject": "プロジェクト全体",
  "priorityLabel": "優先度",
  "priorityRequired": "優先度を選択してください",
  "typeLabel": "タイプ",
  "typeRequired": "タイプを選択してください",
  "taskLabel": "🎯 対象タスク",
  "taskPlaceholder": "タスク番号を選択...",
  "taskOption": "タスク {taskNum}",
  "transitionLabel": "🔗 トランジションID",
  "transitionPlaceholder": "トランジションを選択...",
  "alertSelected": "選択中:",
  "alertCategory": "カテゴリ:",
  "alertDescription": "説明:",
  "contentLabel": "指示内容",
  "contentRequired": "指示内容を入力してください",
  "contentMaxLength": "1000文字以内で入力してください",
  "contentPlaceholder": "作業者への具体的な指示を入力してください..."
}
```

#### en.json 追加内容（主要キーのみ抜粋）
```json
"instructionEditDialog": {
  "titleDetail": "Instruction Detail",
  "titleCreate": "Add New Instruction",
  "titleEdit": "Edit Instruction",
  "saveButton": "Add",
  "saveAndContinueButton": "Continue Adding",
  ...
}
```

---

## 備考

- フォールバック用ハードコード文字列（優先度・タイプの Select.Option 内）はコードマスタ未取得時のみ表示される。今回の対応スコープ外のため日本語のままとした。
- `saveInstruction` 内のインラインバリデーションメッセージ（`'指示内容を入力してください'`）は、フォームバリデーションが先に走るため実質到達しないコードだが、今回の対応スコープ外として変更しなかった。
