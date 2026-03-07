# タスク計画書: templateApi.ts の APIパス二重付与修正

## メタデータ
- **作成日時**: 2026-03-07 23:28
- **タスクID**: templateApi_APIパス二重付与修正
- **優先度**: 高
- **推定工数**: 0.25時間

---

## 1. タスク概要

`GET http://localhost:3001/api/v1/api/v1/maiml/formats` を叩くと **404 Not Found** が返る問題を修正する。

`/api/v1` が URL に二重付与されていることが原因であり、
`frontend/src/services/templateApi.ts` のリクエストパスを修正する。

---

## 2. 調査結果

### 問題の構造

#### `frontend/src/utils/authUtils.ts`（createApiClient）
```typescript
const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
// ↑ baseURL に /api/v1 が既に含まれている
```

#### `frontend/src/services/templateApi.ts`（修正対象）
```typescript
// fetchTemplateFiles
client.get('/api/v1/maiml/formats')          // ← /api/v1 を重複指定

// fetchTemplateContent
client.get('/api/v1/maiml/file-content', ...) // ← /api/v1 を重複指定
```

#### 結果として生成される URL（バグ状態）
```
baseURL:     http://localhost:3001/api/v1
リクエストパス: /api/v1/maiml/formats
実際の URL:   http://localhost:3001/api/v1/api/v1/maiml/formats  ← 404
```

### 他ファイルの正しい記述例

同じ `createApiClient()` を使う他のファイルはすべてパスに `/api/v1` を含めていない。

| ファイル | パス記述例 |
|---------|-----------|
| `formatApi.ts` | `/formats` |
| `apiClient.ts` | `/projects` |

---

## 3. 修正内容

### 修正ファイル
- `frontend/src/services/templateApi.ts`（1ファイルのみ）

### 修正箇所

| # | 関数 | 修正前 | 修正後 |
|---|------|--------|--------|
| 1 | `fetchTemplateFiles` | `/api/v1/maiml/formats` | `/maiml/formats` |
| 2 | `fetchTemplateContent` | `/api/v1/maiml/file-content` | `/maiml/file-content` |

---

## 4. 実装ステップ

- [ ] Step 1: `fetchTemplateFiles` の URL パスを修正
- [ ] Step 2: `fetchTemplateContent` の URL パスを修正
- [ ] Step 3: 修正後の内容を確認

---

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/services/templateApi.ts` - APIパスから `/api/v1` を除去（2箇所）

### 影響を受ける機能
- テンプレートファイル一覧取得（`fetchTemplateFiles`）
- テンプレートファイル内容取得（`fetchTemplateContent`）
- `TemplateEditorDialog.tsx` など `templateApi.ts` を利用するコンポーネント

### 影響なし
- バックエンド（変更なし）
- 他のフロントエンドファイル（変更なし）

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 修正後も動作しない | 低 | 低 | コントローラー `maimlController.listFormats` の実装を確認 |

---

## 7. テスト計画

### 手動テスト
- [ ] ブラウザ or curl で `GET http://localhost:3001/api/v1/maiml/formats` が 200 を返すことを確認
- [ ] `TemplateEditorDialog` でテンプレートファイル一覧が表示されることを確認

---

## 8. 承認記録

- **計画書提示日時**: 2026-03-07 23:28
- **承認日時**: 2026-03-07 23:28
- **承認者コメント**: 調査結果を含めてタスク計画書を作成し、なるべく細かく分けて実装すること

---

## 9. 実施記録

### 実施日時
開始: 2026-03-07 23:28
完了: （作業完了時に記入）

### 計画からの変更点
（なし）

### 最終的な成果物
- [ ] `frontend/src/services/templateApi.ts` 修正完了
