# タスク計画書: DataRecordDialog テンプレート一覧表示修正

## メタデータ
- **作成日時**: 2026-02-27 22:10
- **タスクID**: DataRecordDialog_テンプレート一覧修正
- **優先度**: 高
- **推定工数**: 1時間

---

## 1. タスク概要

実験データ記録モーダル（DataRecordDialog）を開いた際に、テンプレート一覧サイドバーに何も表示されない問題を修正する。

APIは正常にテンプレート情報を返しているにもかかわらず、フロントエンド側でデータの変換・表示処理が実装されていないため、サイドバーが常に空になっている。

---

## 2. 原因調査結果

### 2.1 問題の症状

- `DataRecordDialog` のテンプレート一覧サイドバーに何も表示されない
- API `GET /api/v1/experiments/projects/:projectName/methods/:methodId/tasks/:taskNo/data?transitionId=xxx` は正常に3件のテンプレートを返している

### 2.2 根本原因（2段階）

#### 原因① `transitionsWithProgress` に `templates` フィールドがない

**ファイル**: `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx`

```typescript
const transitionsWithProgress = useMemo(() => {
  return progressData.map(progress => ({
    transitionId: progress.transition_id as string,
    transitionName: (progress.transition_name as string) ?? '',
    status: ...,
    progressRate: ...,
    inputMaterialsCount: ...,
    // ↑ templates フィールドが存在しない！
  }));
}, [progressData]);
```

`Transition` 型の `templates?: Template[]` フィールドが省略されているため、`DataRecordDialog` に渡される `transition.templates` は常に `undefined` になる。

#### 原因② `DataRecordDialog` 内で API レスポンスを `Template[]` に変換していない

**ファイル**: `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx`

`useEffect` 内で `getTemplateData()` を呼び出しているが、取得した `TemplateDataItem[]` をサイドバー表示用の `Template[]` に変換する処理がない。

```typescript
// filteredTemplates の参照先
const filteredTemplates = useMemo(() => {
  let filtered: Template[] = transition?.templates ?? [];  // ← 常に空
  ...
```

#### 原因③ テンプレート一覧表示の責務

- APIは `DataRecordDialog.useEffect` 内で呼ばれている
- テンプレートのリスト表示（サイドバー）もこのダイアログ内で完結している
- よって、**修正は `DataRecordDialog.tsx` のみ**で対応可能

### 2.3 API レスポンスと `Template` 型のマッピング

| API (`TemplateDataItem.data.properties[]`) | フロント (`Template.properties[]`) |
|---|---|
| `key` | `key`（そのまま）/ `label`（そのまま） |
| `xsiType: "stringType"` | `type: "stringType"` |
| `xsiType: "intType"` | `type: "intType"` |
| `xsiType: "floatType"` | `type: "floatType"` |

| API (`TemplateDataItem`) | フロント (`Template`) |
|---|---|
| `templateId` | `templateId` |
| `templateType: "material"` | `category: "Materials"` |
| `templateType: "condition"` | `category: "Conditions"` |
| `templateType: "result"` | `category: "Results"` |
| （生成）`"材料テンプレート"` etc | `name` |

---

## 3. 目的と期待される成果

### 目的
DataRecordDialog のテンプレート一覧サイドバーに、API から取得したテンプレートを正しく表示する。

### 期待される成果
- [ ] 実験データ記録モーダルを開いた際、テンプレート一覧サイドバーに material / condition / result の各テンプレートが表示される
- [ ] テンプレートをクリックすると右側にプロパティ入力フォームが表示される
- [ ] ダイアログを閉じて再度開いた際、前回の状態が残らない（リセット）

---

## 4. 実装ステップ

### Phase 1: `fetchedTemplates` State の追加
- [ ] `DataRecordDialog.tsx` に `fetchedTemplates` state を追加
- [ ] ダイアログを閉じる際（`open` が false になった時）にリセット

### Phase 2: `TemplateDataItem[]` → `Template[]` 変換ヘルパー関数の実装
- [ ] `templateType` → `TemplateCategory` のマッピング関数を実装
- [ ] `properties[].xsiType` → `PropertyType` のマッピングを実装
- [ ] テンプレート名（`name`）の生成ロジックを実装
- [ ] 変換関数全体の実装

### Phase 3: `useEffect` 内で変換結果を `fetchedTemplates` に反映
- [ ] `getTemplateData()` 呼び出し後に変換関数を呼び出し
- [ ] `setFetchedTemplates` で state を更新

### Phase 4: `filteredTemplates` の参照先を `fetchedTemplates` に変更
- [ ] `filteredTemplates` の useMemo を修正
- [ ] `fetchedTemplates.length > 0` の場合は `fetchedTemplates` を使用

---

## 5. 変更ファイル

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | 修正 | fetchedTemplates state追加、変換ロジック実装、filteredTemplates修正 |

---

## 6. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `xsiType` に未知の値がある場合 | 低 | 低 | デフォルト値（`stringType`）にフォールバック |
| テンプレート名が空になる場合 | 低 | 低 | templateType をもとにデフォルト名を生成 |

---

## 7. テスト計画

### 手動テスト
- [ ] プロジェクト・メソッド・タスクを選択し、トランジション一覧を表示する
- [ ] 「記録」ボタンをクリックしてDataRecordDialogを開く
- [ ] テンプレート一覧サイドバーに3件（material/condition/result）が表示されることを確認
- [ ] テンプレートをクリックし、右側にプロパティ入力フォームが表示されることを確認
- [ ] ダイアログを閉じて再度開いた際、テンプレート一覧が再取得・表示されることを確認

---

## 8. 承認記録
- **計画書提示日時**: 2026-02-27 22:10
- **承認日時**: 2026-02-27 22:10
