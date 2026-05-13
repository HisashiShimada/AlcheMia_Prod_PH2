# PetriNetEditorInner.tsx - 古いS3 APIエンドポイント使用箇所

## 概要

`frontend/src/components/editorv2/PetriNetEditorInner.tsx` ファイル内で、古い `/api/s3/` プレフィックスのAPIエンドポイントが使用されている箇所をリストアップしました。

---

## 使用箇所一覧

### 1. ファイル一覧取得API（ワークフロー選択用）

**場所**: 行1496-1500（`openWorkflowDialogInternal` 関数内）

**現在のコード**:
```typescript
const response = await fetch(`/api/s3/files?organizationId=${currentOrgId}`, {
  credentials: 'include',
});
```

**用途**: ワークフロー追加ダイアログで、S3に保存されている.maimlファイル一覧を取得

**置き換え候補**: 
- `maimlService.listFiles()` または同等の新API
- 組織IDの扱いに注意が必要

---

### 2. ファイルコンテンツ取得API（ワークフロー読み込み用）

**場所**: 行1684-1687（`handleWorkflowFileSelect` 関数内）

**現在のコード**:
```typescript
const response = await fetch(`/api/s3/file-content?key=${encodeURIComponent(file.key)}`, {
  credentials: 'include',
});
```

**用途**: ワークフロー追加時に、選択されたMAIMLファイルの内容を取得

**置き換え候補**: 
- `maimlService.downloadMaiml()` または `maimlService.getMaimlContent()`
- ファイルキーのエンコーディング方法に注意

---

### 3. 自動補正API（保存確認ダイアログから）

**場所**: 行2074-2081（`handleSaveConfirmAction` 関数内）

**現在のコード**:
```typescript
const response = await fetch('/api/s3/maiml-auto-correct-realtime', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    maimlContent: maimlXml,
    organizationId: currentOrgId,
  }),
});
```

**用途**: 保存時に自動補正を実行

**置き換え候補**: 
- `maimlService.autoCorrectMaiml()` または同等の新API
- リアルタイム補正のため、レスポンス形式に注意

---

### 4. 自動補正API（バリデーションパネルから）

**場所**: 行2336-2347（`handleAutoCorrect` 関数内）

**現在のコード**:
```typescript
const response = await fetch('/api/s3/maiml-auto-correct-realtime', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    maimlContent: maimlXml,
    organizationId: currentOrgId,
    selectedErrors,
  }),
});
```

**用途**: バリデーションパネルから選択されたエラーに対して自動補正を実行

**置き換え候補**: 
- `maimlService.autoCorrectMaiml()` または同等の新API
- `selectedErrors` パラメータの扱いに注意

---

### 5. Draft保存API

**場所**: 行2393-2402（`handleSave` 関数内）

**現在のコード**:
```typescript
const response = await fetch('/api/s3/maiml-drafts', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    name: metadata.name,
    description: metadata.description,
    content: maimlXml,
  }),
});
```

**用途**: ドラフトとしてMAIMLファイルを保存

**置き換え候補**: 
- `maimlService.saveDraft()` または同等の新API
- メタデータ構造に注意

---

## 既に新APIを使用している箇所

### ✅ バリデーションAPI

**場所**: 複数箇所で使用

**コード例**:
```typescript
const response = await maimlService.validateMaiml(base64Data);
```

- 行881-882: `handleOpenSaveConfirmDialog`内
- 行1372: 自動バリデーション（複数method）
- 行2176: `handleOpenValidationPanel`内

### ✅ 保存API

**場所**: 行2125（`handleSaveConfirmAction`のS3保存処理内）

**コード**:
```typescript
const response = await maimlService.saveMaiml(fileKey, base64Data)
```

---

## 置き換え対象のまとめ

| # | エンドポイント | 関数名 | 行番号 | 優先度 |
|---|--------------|--------|--------|--------|
| 1 | `/api/s3/files` | `openWorkflowDialogInternal` | 1496 | 高 |
| 2 | `/api/s3/file-content` | `handleWorkflowFileSelect` | 1684 | 高 |
| 3 | `/api/s3/maiml-auto-correct-realtime` | `handleSaveConfirmAction` | 2074 | 中 |
| 4 | `/api/s3/maiml-auto-correct-realtime` | `handleAutoCorrect` | 2336 | 中 |
| 5 | `/api/s3/maiml-drafts` | `handleSave` | 2393 | 中 |

---

## 注意事項

### 1. 新APIサービスの確認

新しいAPIエンドポイントが `maimlApiService.ts` に定義されているか確認する必要があります:
- `listFiles()` - ファイル一覧取得
- `getMaimlContent()` or `downloadMaiml()` - ファイル内容取得
- `autoCorrectMaiml()` - 自動補正
- `saveDraft()` - ドラフト保存

### 2. レスポンス形式の統一

新APIは以下の統一形式を使用している可能性があります:
```typescript
{
  success: boolean;
  data?: T;
  error?: { message: string; code?: string };
}
```

各関数でエラーハンドリングを統一する必要があります。

### 3. 組織IDの扱い

現在は `localStorage.getItem('currentOrganizationId')` で取得していますが、新APIではリクエストヘッダーやコンテキストから自動取得される可能性があります。

### 4. Base64エンコーディング

保存APIでは既にBase64エンコーディングを使用していますが、他のAPIでも同様の処理が必要か確認が必要です。

---

## 推奨作業手順

1. **調査**: `maimlApiService.ts` で新APIメソッドの有無を確認
2. **未実装の場合**: 必要な新APIメソッドを追加
3. **置き換え**: 優先度順に古いエンドポイントを置き換え
4. **テスト**: 各機能が正常に動作することを確認
5. **クリーンアップ**: 不要なfetch呼び出しを削除

---

**作成日**: 2026-02-16 15:53  
**対象ファイル**: `frontend/src/components/editorv2/PetriNetEditorInner.tsx`  
**バージョン**: 2.0.0-beta
