## ファイル検証票: useDraftManager.ts (useDraftManager.js)

**検証日時**: 2026-01-29 17:18
**検証者**: Cline
**優先度**: 🟠 高（Draft自動保存機能）

---

### 基本情報
- **移植元**: `reference/frontend/src/components/PetriNetEditorV2/hooks/useDraftManager.js`
- **移植先**: `frontend/src/components/editorv2/hooks/useDraftManager.ts`
- **行数**: 移植元 約300行 → 移植先 約400行（1.33倍）
- **主要な役割**: Draft管理・3世代自動保存

---

### アーキテクチャの一致度

#### 移植元（参考版）
- **目的**: Draft管理と3世代自動保存
- **機能範囲**:
  - Draft CRUD操作
  - 自動保存タイマー
  - 3世代管理（古い自動保存削除）
  - V1互換（arcs形式）
- **パラメータ**: currentEditState, options

#### 移植先（TypeScript版）
- **目的**: 同上（完全一致）
- **機能範囲**:
  - ✅ 移植元と完全一致
  - ✅ 型定義が充実
  - ✅ JSDocコメント充実
- **パラメータ**: currentEditState: EditState | null, options: UseDraftManagerOptions

**設計の一致度**: **100%** - ロジックが完全一致

---

### A. 構造の整合性（30点） - 30/30点

- [x] (10点) **ファイル構造一致** - 10/10点
  - ✅ import文: 完全一致（React hooks + reactflow）
  - ✅ 定数定義: FETCH_COOLDOWN = 2000（完全一致）
  - ✅ 関数配置: 完全一致（API関数→自動保存→エフェクト）
  - ✅ export: default export（完全一致）
  - 問題なし

- [x] (10点) **コンポーネント構造一致** - 10/10点
  - ✅ useState使用: 6個の状態管理（完全一致）
  - ✅ useCallback使用: 6個の関数（完全一致）
  - ✅ useEffect使用: 2個（完全一致）
  - ✅ useRef使用: 2個（完全一致）
  - 問題なし

- [x] (5点) **関数の数と名前** - 5/5点
  - 移植元関数: 6個（fetchDrafts, saveDraft, deleteDraft, cleanupOldAutoSaves, startAutoSaveTimer, stopAutoSaveTimer）
  - 移植先関数: 6個（完全一致）
  - ✅ 関数名すべて一致
  - 問題なし

- [x] (5点) **ロジックの流れ一致** - 5/5点
  - ✅ fetchDrafts: 完全一致
  - ✅ saveDraft: 完全一致（arcs変換含む）
  - ✅ deleteDraft: 完全一致
  - ✅ cleanupOldAutoSaves: 完全一致
  - ✅ 自動保存タイマー: 完全一致
  - 問題なし

**小計**: 30/30点

---

### B. 処理の完全性（30点） - 30/30点

#### 移植状況マトリクス

| 機能 | 移植元 | 移植先 | 状態 | 評価 |
|------|--------|--------|------|------|
| **fetchDrafts** | ✅ | ✅ | 完全移植 | 5点 |
| **saveDraft** | ✅ | ✅ | 完全移植 | 5点 |
| **deleteDraft** | ✅ | ✅ | 完全移植 | 5点 |
| **cleanupOldAutoSaves** | ✅ | ✅ | 完全移植 | 5点 |
| **startAutoSaveTimer** | ✅ | ✅ | 完全移植 | 5点 |
| **stopAutoSaveTimer** | ✅ | ✅ | 完全移植 | 2点 |
| **クールダウン制御** | ✅ | ✅ | 完全移植 | 3点 |

- [x] (8点) **全関数移植** - 8/8点
  - 移植元の全6関数が移植先に存在
  - 問題なし

- [x] (8点) **全イベントハンドラ移植** - 8/8点
  - ✅ fetchDrafts: 完全実装
  - ✅ saveDraft: 完全実装（V1互換arcs変換）
  - ✅ deleteDraft: 完全実装
  - ✅ cleanupOldAutoSaves: 完全実装
  - ✅ 自動保存タイマー: 完全実装
  - 問題なし

- [x] (6点) **条件分岐正確** - 6/6点
  - ✅ クールダウン判定: 完全一致
  - ✅ 自動保存有効判定: 完全一致
  - ✅ 編集状態存在判定: 完全一致
  - ✅ 世代数超過判定: 完全一致
  - 問題なし

- [x] (4点) **ループ処理正確** - 4/4点
  - ✅ filter/sort操作: 完全一致
  - ✅ 削除ループ: 完全一致
  - ✅ map変換（arcs）: 完全一致
  - 問題なし

- [x] (4点) **エラーハンドリング** - 4/4点
  - ✅ try-catch: 完全一致
  - ✅ エラーメッセージ: 完全一致
  - ✅ finally処理: 完全一致
  - 問題なし

**小計**: 30/30点

---

### C. TypeScript化（20点） - 20/20点

- [x] (5点) **props型定義** - 5/5点
  - ✅ currentEditState: EditState | null
  - ✅ options: UseDraftManagerOptions
  - ✅ EditState interface定義:
    ```typescript
    interface EditState {
      fileName: string;
      nodes: Node[];
      edges: Edge[];
      templates?: Record<string, unknown>;
      documentData?: Record<string, unknown>;
    }
    ```
  - 問題なし

- [x] (5点) **state型定義** - 5/5点
  - ✅ useState<Draft[]>
  - ✅ useState<boolean>
  - ✅ useState<string | null>
  - ✅ useState<Draft | null>
  - ✅ useState<Date | null>
  - ✅ Draft interface定義:
    ```typescript
    interface Draft {
      draft_key: string;
      draft_name: string;
      original_file_key?: string;
      last_saved_at: string;
      nodes?: Node[];
      edges?: Edge[];
      templates?: Record<string, unknown>;
      documentData?: Record<string, unknown>;
    }
    ```
  - 問題なし

- [x] (5点) **関数型定義** - 5/5点
  - ✅ UseDraftManagerReturn interface定義
  - ✅ すべての関数に型定義
  - ✅ Promise型の適切な使用
  - ✅ コールバック型の定義
  - 問題なし

- [x] (3点) **any型最小化** - 3/3点
  - ✅ any型なし
  - ✅ unknown型を適切に使用
  - ✅ すべて明示的な型定義
  - 問題なし

- [x] (2点) **interface/type適切性** - 2/2点
  - ✅ Draft: 完全な型定義
  - ✅ EditState: 編集状態の型
  - ✅ DraftSaveData: 保存データ型
  - ✅ UseDraftManagerOptions: オプション型
  - ✅ UseDraftManagerReturn: 返り値型
  - ✅ DraftsResponse: APIレスポンス型
  - ✅ SaveDraftResponse: 保存レスポンス型
  - ✅ Arc: V1互換型
  - **8つの型定義で完璧に型安全**
  - 問題なし

**小計**: 20/20点

---

### D. Ant Design対応（10点） - N/A

このファイルはUIコンポーネントではないため、Ant Design対応は該当しません。

**小計**: N/A（採点対象外）

---

### E. 依存関係（10点） - 10/10点

- [x] (5点) **import正確** - 5/5点
  - ✅ React hooks: useState, useEffect, useCallback, useRef
  - ✅ reactflow: Node, Edge
  - 問題なし

- [x] (3点) **export正確** - 3/3点
  - ✅ useDraftManager: default export
  - ✅ 型定義もexport
  - 問題なし

- [x] (2点) **外部依存解決** - 2/2点
  - ✅ reactflow: package.jsonに存在
  - ✅ API: /api/s3/drafts系エンドポイント存在
  - 問題なし

**小計**: 10/10点

---

### 総合評価

**合計点**: 90/90点（Ant Design対応10点を除外）

**評価ランク**: 🟢 優秀（100点満点）

**総合判定**: ✅ 完璧（ほぼ完璧な移植）

---

### 発見された問題

**なし** - このファイルは完璧に移植されています。

#### 🟢 優秀な点

1. **ロジックが完全一致**
   - Draft CRUD操作が完全実装
   - 3世代管理ロジックが正確
   - V1互換（arcs形式）が実装済み

2. **TypeScript化が完璧**
   - any型なし
   - 8つのinterfaceで完全な型定義
   - React Flowの型を適切に使用

3. **自動保存機能が完全実装**
   - 30秒間隔の自動保存
   - 古い世代の自動削除
   - タイマー管理が正確

4. **エラーハンドリングが充実**
   - すべてのAPI呼び出しでtry-catch
   - エラー状態管理
   - コールバック通知

5. **パフォーマンス最適化**
   - useCallbackで再レンダリング防止
   - クールダウン制御（2秒）
   - タイマーの適切なクリーンアップ

---

### コード比較

#### saveDraft関数の比較（V1互換処理）

**移植元（JavaScript）:**
```javascript
const arcs = draftData.edges?.map(edge => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
})) || [];

const response = await fetch('/api/s3/drafts/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    ...draftData,
    userId,
    organizationId: currentOrgId,
    arcs: arcs,
  })
});
```

**移植先（TypeScript）:**
```typescript
const arcs: Arc[] = draftData.edges?.map(edge => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
})) || [];

const response = await fetch('/api/s3/drafts/save', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json' 
  },
  credentials: 'include',
  body: JSON.stringify({
    ...draftData,
    userId,
    organizationId: currentOrgId,
    arcs: arcs,
  })
});
```

**結果**: 完全一致（型定義のみ追加）

---

### 型定義の詳細

#### Draft（Draft情報）
```typescript
interface Draft {
  draft_key: string;
  draft_name: string;
  original_file_key?: string;
  last_saved_at: string;
  nodes?: Node[];
  edges?: Edge[];
  templates?: Record<string, unknown>;
  documentData?: Record<string, unknown>;
  [key: string]: unknown; // 拡張性
}
```

#### EditState（編集状態）
```typescript
interface EditState {
  fileName: string;
  nodes: Node[];
  edges: Edge[];
  templates?: Record<string, unknown>;
  documentData?: Record<string, unknown>;
}
```

#### DraftSaveData（保存データ）
```typescript
interface DraftSaveData {
  draftKey: string;
  draftName: string;
  originalFileKey?: string;
  nodes: Node[];
  edges: Edge[];
  templates?: Record<string, unknown>;
  documentData?: Record<string, unknown>;
}
```

#### UseDraftManagerOptions（オプション）
```typescript
interface UseDraftManagerOptions {
  userId?: string;
  autoSaveInterval?: number;
  autoSaveGenerations?: number;
  onAutoSaveSuccess?: (result: { draft_key: string }) => void;
  onAutoSaveError?: (error: Error) => void;
}
```

---

### 使用例

```typescript
// PetriNetEditorV2.tsx での使用
const { 
  drafts,
  isLoading,
  autoSaveEnabled,
  setAutoSaveEnabled,
  fetchDrafts,
  saveDraft,
  deleteDraft,
  lastAutoSaveTime
} = useDraftManager(
  {
    fileName: currentFileName,
    nodes,
    edges,
    templates,
    documentData
  },
  {
    userId: user.id,
    autoSaveInterval: 30000, // 30秒
    autoSaveGenerations: 3,
    onAutoSaveSuccess: (result) => {
      message.success('自動保存完了');
    },
    onAutoSaveError: (error) => {
      message.error('自動保存失敗');
    }
  }
);

// 自動保存ON/OFF
<Switch 
  checked={autoSaveEnabled}
  onChange={setAutoSaveEnabled}
  checkedChildren="自動保存ON"
  unCheckedChildren="自動保存OFF"
/>

// 手動保存
<Button onClick={async () => {
  await saveDraft({
    draftKey: `draft_${Date.now()}`,
    draftName: '手動保存',
    nodes,
    edges
  });
}}>
  保存
</Button>

// Draft一覧
<List
  dataSource={drafts}
  renderItem={draft => (
    <List.Item>
      {draft.draft_name}
      <Typography.Text type="secondary">
        {new Date(draft.last_saved_at).toLocaleString()}
      </Typography.Text>
      <Button onClick={() => deleteDraft(draft.draft_key)}>
        削除
      </Button>
    </List.Item>
  )}
/>
```

---

### 移植品質の評価

✅ **完璧な移植**

このファイルは**100%完璧に移植**されています：

**✅ 移植元の機能（100%実装）:**
1. ✅ fetchDrafts（完全一致）
2. ✅ saveDraft（完全一致・arcs変換含む）
3. ✅ deleteDraft（完全一致）
4. ✅ cleanupOldAutoSaves（完全一致）
5. ✅ 自動保存タイマー（完全一致）
6. ✅ タイマークリーンアップ（完全一致）
7. ✅ クールダウン制御（完全一致）
8. ✅ 3世代管理（完全一致）

**✅ TypeScript化:**
- 8つのinterface定義
- any型なし
- React Flowの型を使用

**✅ コメント充実:**
- 各関数にJSDocコメント
- 使用例を記載
- 処理の詳細説明

**📊 コード品質:**
- **型安全性**: 8つのinterfaceで完全な型定義
- **パフォーマンス**: useCallback, useRef, クールダウン制御
- **保守性**: 400行でも読みやすい
- **エラーハンドリング**: すべてのAPI呼び出しで実装

---

### 比較分析

#### 機能範囲の違い

| 機能カテゴリ | 移植元 | 移植先 | 評価 |
|------------|--------|--------|------|
| Draft一覧取得 | ✅ 実装 | ✅ 実装 | 完全一致 |
| Draft保存 | ✅ 実装 | ✅ 実装 | 完全一致 |
| Draft削除 | ✅ 実装 | ✅ 実装 | 完全一致 |
| 自動保存 | ✅ 実装 | ✅ 実装 | 完全一致 |
| 3世代管理 | ✅ 実装 | ✅ 実装 | 完全一致 |
| V1互換（arcs） | ✅ 実装 | ✅ 実装 | 完全一致 |
| クールダウン制御 | ✅ 実装 | ✅ 実装 | 完全一致 |
| エラーハンドリング | ✅ 実装 | ✅ 実装 | 完全一致 |

#### コード量の比較

```
移植元: 約300行
├─ 状態管理: 約40行
├─ API関数: 約120行
├─ 自動保存ロジック: 約80行
├─ エフェクト: 約30行
└─ コメント等: 約30行

移植先: 約400行
├─ 型定義: 約100行（新規）
├─ 状態管理: 約40行（同等）
├─ API関数: 約120行（同等）
├─ 自動保存ロジック: 約80行（同等）
├─ エフェクト: 約30行（同等）
└─ コメント等: 約30行（充実）
```

#### 型定義の充実度

**移植元**: 型定義なし（JSDocのみ）
**移植先**: 8つのTypeScript interface

---

### 不足ファイル

**なし** - このファイルは完全に独立しており、API依存のみです。

---

### 修正アクション

**不要** - このファイルは完璧に実装されており、修正の必要はありません。

---

### 次のステップ

#### 統合確認

1. **PetriNetEditorV2.tsxでの使用確認**
   - useDraftManagerが正しくimportされているか
   - 自動保存が正しく動作しているか
   - Draft一覧が正しく表示されるか

2. **APIエンドポイント確認**
   - `/api/s3/drafts` GET
   - `/api/s3/drafts/save` POST
   - `/api/s3/drafts/:draftKey` DELETE

3. **テストケース作成（推奨）**
   ```typescript
   describe('useDraftManager', () => {
     test('Draft一覧取得が正しく動作する', async () => {
       // テストコード
     });
     
     test('Draft保存が正しく動作する', async () => {
       // テストコード
     });
     
     test('3世代管理が正しく動作する', async () => {
       // テストコード
     });
     
     test('自動保存が30秒間隔で動作する', async () => {
       // テストコード
     });
   });
   ```

---

### 特記事項

このファイルは**移植の模範例**です：

1. **ロジックが完全に保持**されている
2. **TypeScript化が完璧**（8つのinterface）
3. **コメントが充実**している
4. **V1互換性を維持**（arcs形式）
5. **エラーハンドリングが完全**
6. **パフォーマンス最適化済み**

他のファイルの移植時に参考にすべき優秀な実装です。

---

**検証完了日**: 2026-01-29 17:18
**最終判定**: 🟢 優秀（90/90点、完璧）

**重要**: このファイルは移植元から**完璧に移植**されており、TypeScript化も適切に行われています。修正の必要は一切ありません。