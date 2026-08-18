# 用語管理機能 実装調査レポート

- **作成日時**: 2026-07-29 15:08
- **調査対象**: 名前空間管理タブ > 用語管理（TermManagement）

---

## 1. 調査対象ファイル一覧

| ファイル | 役割 |
|---------|------|
| `frontend/src/components/namespace/TermManagement.tsx` | 用語管理画面コンポーネント |
| `frontend/src/services/namespaceApiService.ts` | フロントエンドAPI呼び出し関数群 |
| `backend/src/routes/namespaceRoutes.ts` | APIルート定義 |
| `backend/src/controllers/namespaceController.ts` | APIハンドラ |
| `backend/src/repositories/namespaceTermRepository.ts` | DBアクセス層 |
| `docs/design/db/ddl/namespace_term.sql` | DBテーブル定義 |

---

## 2. DBテーブル構造

### namespace_term テーブル

主キー: `(organization_id, namespace_id, prefix, localname)`

| カラム | 型 | 概要 |
|--------|-----|------|
| organization_id | string | テナント分離キー |
| namespace_id | string | `NS0001`形式 |
| prefix | string | 名前空間の接頭辞 |
| localname | string | ローカル名 |
| display_name | string \| null | 表示名 |
| description | string \| null | 説明 |
| xsi_type | string \| null | 型ヒント（`stringType` 等） |
| units | string \| null | 単位ヒント |
| is_active | boolean | アクティブフラグ（デフォルト TRUE） |
| create_at / update_at | Date | タイムスタンプ |

### 関連テーブル（FK 関係）

```
namespace     (organization_id, namespace_id)         ← URIを保持
    ↑FK
prefix        (organization_id, namespace_id, prefix) ← prefix文字列を保持
    ↑FK
namespace_term(organization_id, namespace_id, prefix, localname)
```

---

## 3. 現状の実装フロー

### 3-1. データ取得（どこから取得するか）

```
TermManagement.tsx マウント時 → fetchAll()
  ↓
Promise.all で2つのAPIを並列実行
  ├─ getNamespaceList()  → GET /api/v1/namespaces
  │     → findNamespacesByOrganization(organizationId)
  │     → SELECT prefix, uri FROM prefix JOIN namespace
  │        WHERE organization_id=$1 AND is_active=TRUE
  │     → prefixOptions ステートに格納（Prefix絞り込みプルダウン用）
  │
  └─ getTerms()          → GET /api/v1/namespaces/terms
        → findAllByOrganization(organizationId)  ← organizationId はミドルウェアから取得
        → SELECT qname,prefix,localName,displayName,description,type,unitHint
           FROM namespace_term
           WHERE organization_id=$1 AND is_active=TRUE   ← アクティブ用語のみ
           ORDER BY prefix ASC, localname ASC
        → terms ステートに格納（テーブル表示データ）
```

**重要な制約**: `is_active = TRUE` の用語のみ返す。非アクティブ用語はDBに存在していてもAPIから返ってこない。

### 3-2. 取得後の表示方法

#### ステート構成

```typescript
const [terms, setTerms]           // 取得済み用語一覧
const [prefixOptions, ...]         // Prefixプルダウン選択肢
const [newRows, setNewRows]        // 未保存の新規入力行（黄背景）
const [editingKey, ...]            // 現在編集中の行キー
const [editingValues, ...]         // 編集中の一時値
```

#### テーブル表示データの組み立て

```typescript
// newRows（黄背景・入力中の新規行）を先頭に、filteredTerms を後ろに結合
const tableData = [...newRows, ...filteredTerms];
```

#### フィルタリング（表示前に適用）

```typescript
const filteredTerms = terms.filter((t) => {
  if (filterPrefix && t.prefix !== filterPrefix) return false;  // Prefix絞り込み
  if (filterType && t.type !== filterType) return false;        // 型絞り込み
  if (searchText) {                                              // フリーテキスト検索
    // prefix / localName / displayName / description のいずれかにヒット
  }
});
```

#### 列構成

| 列 | 通常表示 | 新規行 | 編集中 |
|----|---------|-------|-------|
| Prefix | テキスト（太字） | `<Select>` | 変更不可（キー列） |
| ローカル名 | `<Text code>` | `<Input>` | 変更不可（キー列） |
| 表示名 | テキスト | `<Input>` | `<Input>` |
| 説明 | テキスト（省略） | `<Input>` | `<Input>` |
| 型 | Tag（色付き） | `<Select>` | `<Select>` |
| 単位 | テキスト | `<Input>` | `<Input>` |
| 操作 | 「編集」「非アクティブ/アクティブ」 | 「削除」 | 「保存」「キャンセル」 |

### 3-3. 更新タイミング

| タイミング | 処理 | ステート更新方法 |
|-----------|------|---------------|
| コンポーネントマウント時 | `fetchAll()` → API全件取得 | `setTerms(termList)` で全件置き換え |
| `globalOnly` props変更時 | `useEffect([globalOnly])` → `fetchAll()` | 同上 |
| 用語追加保存（「保存」ボタン） | `createTerm()` で1件ずつAPI登録 → 成功した用語を先頭に追加 | `setTerms(prev => [...added, ...prev])` |
| 用語編集保存（「保存」ボタン） | `updateTerm()` でAPI更新 → 対象行を差し替え | `setTerms(prev => prev.map(...))` |
| CSVインポート | `createTerm()` を行単位で繰り返し | `setTerms(prev => [...prev, ...added])` |
| アクティブ/非アクティブ切替 | ⚠️ **APIなし・ローカル状態のみ** | `setTerms(prev => prev.map(...isActive切替...))` |
| 新規行キャンセル | `setNewRows([])` | `terms` は変更なし |

**注意**: 他ユーザーの変更はポーリングがないため手動リロードまで反映されない。

---

## 4. 実装済み API エンドポイント

| メソッド | パス | コントローラー | Repository関数 | 状態 |
|---------|------|-------------|--------------|------|
| GET | `/api/v1/namespaces` | `getNamespaces` | `findNamespacesByOrganization` | ✅ 完了 |
| POST | `/api/v1/namespaces` | `createNamespace` | `createNamespace` | ✅ 完了 |
| DELETE | `/api/v1/namespaces/:prefix` | `deleteNamespace` | `removeNamespace` | ✅ 完了 |
| GET | `/api/v1/namespaces/terms` | `getTerms` | `findAllByOrganization` | ✅ 完了 |
| POST | `/api/v1/namespaces/terms` | `createTerm` | `create` | ✅ 完了 |
| PUT | `/api/v1/namespaces/terms/:prefix/:localName` | `updateTerm` | `update` | ✅ 完了 |
| DELETE | `/api/v1/namespaces/terms/:prefix/:localName` | `deleteTerm` | `remove` | ✅ 完了（フロント未使用） |
| GET | `/api/v1/namespaces/declarations` | `getDeclarations` | `findDeclarationsByOrganization` | ✅ 完了 |
| GET | `/api/v1/namespaces/project-declarations` | `getDeclarationsByProject` | `findDeclarationsByProjectScope` | ✅ 完了 |

---

## 5. 未実装・課題一覧

### 課題① アクティブ/非アクティブ切替がAPIに未接続【最優先】

**現状**:
```typescript
// TermManagement.tsx L239 コメント
// アクティブ/非アクティブ切替（ローカルのみ、APIは未対応のためトグル表示のみ）
const handleToggleActive = (record: NamespaceTermRow) => {
  // Modal.confirm で確認後、ローカルの setTerms() のみ更新
  // → ページリロードで元に戻る
};
```

**必要な実装**:

| 層 | 対応内容 |
|----|---------|
| **DB** | 変更不要（`is_active` カラムは既存） |
| **Repository** | `toggleActive(organizationId, prefix, localName, isActive)` 関数追加 |
| **Controller** | `toggleTermActive` ハンドラ追加 |
| **Route** | `PATCH /api/v1/namespaces/terms/:prefix/:localName/active` 追加 |
| **namespaceApiService.ts** | `toggleTermActive(prefix, localName, isActive)` 関数追加 |
| **TermManagement.tsx** | `handleToggleActive` を API呼び出しに変更 |

---

### 課題② `NamespaceTermRow` 型に `isActive` フィールドが存在しない

**現状**:
```typescript
// namespaceTermRepository.ts の NamespaceTermRow（APIレスポンス型）
export interface NamespaceTermRow {
  qname: string;
  prefix: string;
  localName: string;
  displayName: string;
  description: string;
  type: string;
  unitHint: string;
  // isActive が含まれていない
}

// 回避策として型キャストで対処（不安定）
const isActive = (r as NamespaceTermRow & { isActive?: boolean }).isActive !== false;
```

**必要な実装**:
- `namespaceTermRepository.ts` の `NamespaceTermRow` に `isActive: boolean` 追加
- `findAllByOrganization()` の SELECT に `t.is_active AS "isActive"` 追加
- `findAllByOrganization()` の WHERE から `AND t.is_active = TRUE` を削除（全件返す）
- `namespaceApiService.ts` の `NamespaceTermRow` にも `isActive: boolean` 追加
- `TermManagement.tsx` の型キャスト箇所を修正

---

### 課題③ 非アクティブ用語を画面で確認できない

**現状**: `findAllByOrganization()` が `is_active=TRUE` 固定のため、非アクティブにした用語が一覧に表示されない。

**必要な実装**:
- ツールバーに「非アクティブを表示」チェックボックス追加
- フィルタリング処理に `showInactive` 条件追加
- `findAllByOrganization()` から `is_active=TRUE` 条件を削除（または任意化）

---

### 課題④ 一括非アクティブ機能が未実装

**現状**: UI設計書には「チェック選択 → 一括非アクティブ」が仕様として定義されているが未実装。

**必要な実装**:
- テーブル行のチェックボックス（`rowSelection`）追加
- 1件以上選択時にアクションバーを表示（「選択した用語を非アクティブ（N件）」ボタン）
- バックエンド: 一括更新 API（`PATCH /api/v1/namespaces/terms/bulk-active`）または課題①のAPIを繰り返し呼び出し

---

### 課題⑤ `DuplicateSuggestModal` が未接続

**現状**: `frontend/src/components/namespace/DuplicateSuggestModal.tsx` が存在するが `TermManagement.tsx` に import・使用されていない。

**必要な実装**:
- `createTerm()` が 409 Conflict エラーを返した場合に `DuplicateSuggestModal` を表示
- 重複時の代替候補をモーダルで提示

---

## 6. 実装推奨順序

```
Phase 1（基盤整備）
  └─ 課題②: NamespaceTermRow 型に isActive 追加
       ├─ Repository の SELECT クエリ修正
       ├─ API Service の型定義追加
       └─ TermManagement.tsx の型キャスト解消

Phase 2（アクティブ切替 API 接続）
  └─ 課題①: アクティブ/非アクティブ切替 API 実装
       ├─ Repository: toggleActive() 追加
       ├─ Controller: toggleTermActive ハンドラ追加
       ├─ Route: PATCH /terms/:prefix/:localName/active 追加
       ├─ API Service: toggleTermActive() 追加
       └─ TermManagement.tsx: handleToggleActive を API呼び出しに変更

Phase 3（表示改善）
  └─ 課題③: 非アクティブ用語の表示切替
       ├─ ツールバーにトグル追加
       └─ フィルタリング処理修正

Phase 4（追加機能）
  ├─ 課題④: 一括非アクティブ（テーブル行選択 + アクションバー）
  └─ 課題⑤: DuplicateSuggestModal 接続
```

---

## 7. 参考：フロントエンドの型定義ファイルの場所

`NamespaceTermRow` の型定義は現状 **2箇所**に分散している（課題②対応時に統一を検討）:

| ファイル | 型名 | 用途 |
|---------|------|------|
| `backend/src/repositories/namespaceTermRepository.ts` | `NamespaceTermRow` | DB→APIレスポンス変換後の型 |
| `frontend/src/services/namespaceApiService.ts` | `NamespaceTermRow` | APIレスポンス受け取り用型 |
| `frontend/src/types/namespace.ts` | 関連型あり | フロントエンド全般の名前空間型定義 |
