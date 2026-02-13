# useDraftManager.ts 移植検証票

**検証日時**: 2026-01-30 08:25  
**検証者**: Cline  
**ファイル**: `frontend/src/components/editorv2/hooks/useDraftManager.ts`  
**移植元**: `reference/frontend/src/components/PetriNetEditorV2/hooks/useDraftManager.js`

---

## 📊 検証結果サマリー

| 項目 | 評価 | 詳細 |
|------|------|------|
| **総合評価** | **98点 ✅** | **非常に優秀な移植** |
| 構造の一致性 | 100% | 完全一致 |
| ロジックの一致性 | 100% | 完全一致 |
| 型安全性 | 100% | TypeScript型定義完備 |
| コメント | 95% | ほぼ完全保持 |

### 評価コメント

**useDraftManager.tsは非常に優秀な移植です。**

Draft管理機能が完璧に移植されており、型定義も非常に充実しています。3世代管理、自動保存、クールダウン機能などすべてのロジックが完全に移植されています。reference版からの改善点も多数あり、より堅牢な実装になっています。

---

## 🎯 ファイルの役割

### 主要機能

PetriNetEditorV2用のDraft（下書き）管理カスタムフックを提供します。

### 実装機能

1. **Draft一覧取得** - fetchDrafts関数
2. **Draft保存** - saveDraft関数
3. **Draft削除** - deleteDraft関数
4. **自動保存機能** - startAutoSaveTimer/stopAutoSaveTimer関数
5. **3世代管理** - cleanupOldAutoSaves関数
6. **取得クールダウン** - 2秒間のクールダウンで重複取得を防止

---

## ✅ 移植完了項目

### 1. 完璧な型定義

#### インターフェース定義

```typescript
// ✅ editorv2版（完璧な型定義）
export interface Draft {
  draft_key: string;
  draft_name: string;
  original_file_key?: string;
  last_saved_at: string;
  nodes?: Node[];
  edges?: Edge[];
  templates?: Record<string, unknown>;
  documentData?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface EditState {
  fileName: string;
  nodes: Node[];
  edges: Edge[];
  templates?: Record<string, unknown>;
  documentData?: Record<string, unknown>;
}

export interface DraftSaveData {
  draftKey: string;
  draftName: string;
  originalFileKey?: string;
  nodes: Node[];
  edges: Edge[];
  templates?: Record<string, unknown>;
  documentData?: Record<string, unknown>;
}

export interface UseDraftManagerOptions {
  userId?: string;
  autoSaveInterval?: number;
  autoSaveGenerations?: number;
  onAutoSaveSuccess?: (result: { draft_key: string }) => void;
  onAutoSaveError?: (error: Error) => void;
}

export interface UseDraftManagerReturn {
  // 状態
  drafts: Draft[];
  isLoading: boolean;
  error: string | null;
  autoSaveEnabled: boolean;
  lastSavedDraft: Draft | null;
  lastAutoSaveTime: Date | null;
  
  // 操作関数
  fetchDrafts: () => Promise<Draft[] | undefined>;
  saveDraft: (draftData: DraftSaveData) => Promise<{ draft: Draft }>;
  deleteDraft: (draftKey: string) => Promise<unknown>;
  
  // 自動保存制御
  setAutoSaveEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  startAutoSaveTimer: () => void;
  stopAutoSaveTimer: () => void;
  cleanupOldAutoSaves: () => Promise<void>;
}
```

すべての関数とデータ構造が完璧に型定義されています。

### 2. fetchDrafts関数

**ロジック完全一致** ✅

```typescript
const fetchDrafts = useCallback(async (): Promise<Draft[] | undefined> => {
  // クールダウンチェック（2秒）
  const now = Date.now();
  if (now - lastFetchTimeRef.current < FETCH_COOLDOWN) {
    console.log('⏸️ [useDraftManager V2] 取得クールダウン中');
    return;
  }
  lastFetchTimeRef.current = now;

  setIsLoading(true);
  setError(null);
  
  try {
    console.log('📂 [useDraftManager V2] Draft一覧取得開始');
    const currentOrgId = localStorage.getItem('currentOrganizationId');
    const response = await fetch(
      `/api/s3/drafts?userId=${encodeURIComponent(userId)}&organizationId=${currentOrgId}`,
      { credentials: 'include' }
    );
    
    if (!response.ok) {
      throw new Error(`Draft取得失敗: ${response.status} ${response.statusText}`);
    }
    
    const data: DraftsResponse = await response.json();
    console.log(`✅ [useDraftManager V2] Draft取得成功: ${data.drafts?.length || 0}件`);
    
    setDrafts(data.drafts || []);
    return data.drafts;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ [useDraftManager V2] Draft取得エラー:', err);
    setError(errorMessage);
    setDrafts([]);
    throw err;
  } finally {
    setIsLoading(false);
  }
}, [userId]);
```

#### 実装内容の完全一致

1. **クールダウン機能**: 2秒間の重複取得防止
2. **organizationId取得**: localStorageから取得
3. **API呼び出し**: `/api/s3/drafts`エンドポイント
4. **エラーハンドリング**: try-catch-finally
5. **状態更新**: setDrafts, setIsLoading, setError

すべてreference版と完全に一致しています。

### 3. saveDraft関数

**ロジック完全一致** ✅

```typescript
const saveDraft = useCallback(async (draftData: DraftSaveData): Promise<{ draft: Draft }> => {
  setIsLoading(true);
  setError(null);
  
  try {
    console.log('💾 [useDraftManager V2] Draft保存開始:', draftData.draftName);
    
    const currentOrgId = localStorage.getItem('currentOrganizationId');
    
    // V1互換のためarcsに変換
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
    
    if (!response.ok) {
      throw new Error(`Draft保存失敗: ${response.status}`);
    }
    
    const result: SaveDraftResponse = await response.json();
    console.log('✅ [useDraftManager V2] Draft保存成功:', result.draft?.draft_key);
    
    setLastSavedDraft(result.draft);
    
    // 保存後にDraft一覧を再取得
    await fetchDrafts();
    
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ [useDraftManager V2] Draft保存エラー:', err);
    setError(errorMessage);
    throw err;
  } finally {
    setIsLoading(false);
  }
}, [userId, fetchDrafts]);
```

#### 実装内容の完全一致

1. **V1互換変換**: edges → arcs変換
2. **organizationId取得**: localStorageから取得
3. **API呼び出し**: POST `/api/s3/drafts/save`
4. **保存後の処理**: lastSavedDraftの更新、fetchDrafts呼び出し
5. **エラーハンドリング**: 完璧

すべてreference版と完全に一致しています。

### 4. deleteDraft関数

**ロジック完全一致** ✅

```typescript
const deleteDraft = useCallback(async (draftKey: string): Promise<unknown> => {
  setIsLoading(true);
  setError(null);
  
  try {
    console.log('🗑️ [useDraftManager V2] Draft削除開始:', draftKey);
    
    const currentOrgId = localStorage.getItem('currentOrganizationId');
    const response = await fetch(
      `/api/s3/drafts/${encodeURIComponent(draftKey)}?userId=${encodeURIComponent(userId)}&organizationId=${currentOrgId}`,
      { 
        method: 'DELETE',
        credentials: 'include'
      }
    );
    
    if (!response.ok) {
      throw new Error(`Draft削除失敗: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ [useDraftManager V2] Draft削除成功');
    
    await fetchDrafts();
    
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ [useDraftManager V2] Draft削除エラー:', err);
    setError(errorMessage);
    throw err;
  } finally {
    setIsLoading(false);
  }
}, [userId, fetchDrafts]);
```

完全にreference版と一致しています。

### 5. cleanupOldAutoSaves関数（3世代管理）

**ロジック完全一致** ✅

```typescript
const cleanupOldAutoSaves = useCallback(async (): Promise<void> => {
  try {
    const currentDrafts = await fetchDrafts();
    
    if (!currentDrafts) {
      return;
    }
    
    // 自動保存のみフィルタ（draft_nameに「自動保存」を含む）
    const autoSaves = currentDrafts
      .filter(d => d.draft_name && d.draft_name.includes('自動保存'))
      .sort((a, b) => new Date(b.last_saved_at).getTime() - new Date(a.last_saved_at).getTime());
    
    console.log(`🧹 [useDraftManager V2] 自動保存クリーンアップ: 総数${autoSaves.length}, 保持世代${autoSaveGenerations}`);
    
    // 3世代より古いものを削除
    if (autoSaves.length > autoSaveGenerations) {
      const toDelete = autoSaves.slice(autoSaveGenerations);
      console.log(`🗑️ [useDraftManager V2] ${toDelete.length}件の古い自動保存を削除`);
      
      for (const draft of toDelete) {
        await deleteDraft(draft.draft_key);
      }
    }
  } catch (err) {
    console.error('❌ [useDraftManager V2] 自動保存クリーンアップエラー:', err);
  }
}, [fetchDrafts, deleteDraft, autoSaveGenerations]);
```

#### 実装内容の完全一致

1. **自動保存フィルタ**: draft_nameに「自動保存」を含むもの
2. **ソート**: last_saved_atで降順（新しい順）
3. **削除**: autoSaveGenerations（デフォルト3）より古いものを削除
4. **エラーハンドリング**: try-catch

すべてreference版と完全に一致しています。

### 6. startAutoSaveTimer関数

**ロジック完全一致** ✅

```typescript
const startAutoSaveTimer = useCallback(() => {
  // 既存タイマーのクリア
  if (autoSaveTimerRef.current) {
    clearInterval(autoSaveTimerRef.current);
    autoSaveTimerRef.current = null;
  }

  // 自動保存無効チェック
  if (!autoSaveEnabled) {
    console.log('🔕 [useDraftManager V2] 自動保存無効');
    return;
  }

  // 編集状態チェック
  if (!currentEditState?.nodes || !currentEditState?.fileName) {
    console.log('⚠️ [useDraftManager V2] 編集状態なし - 自動保存スキップ');
    return;
  }

  console.log('⏰ [useDraftManager V2] 自動保存タイマー開始:', {
    interval: `${autoSaveInterval / 1000}秒`,
    fileName: currentEditState.fileName,
  });

  // setIntervalでタイマー起動
  autoSaveTimerRef.current = setInterval(async () => {
    try {
      console.log('💾 [useDraftManager V2] 自動保存実行');
      
      const draftKey = `draft_auto_${Date.now()}`;
      
      const draftPayload: DraftSaveData = {
        draftKey,
        draftName: `自動保存 - ${currentEditState.fileName}`,
        originalFileKey: currentEditState.fileName,
        nodes: currentEditState.nodes || [],
        edges: currentEditState.edges || [],
        templates: currentEditState.templates || {},
        documentData: currentEditState.documentData || {}
      };
      
      await saveDraft(draftPayload);
      
      // 最終保存時刻を更新
      setLastAutoSaveTime(new Date());
      
      // 古い自動保存を削除
      await cleanupOldAutoSaves();
      
      if (onAutoSaveSuccess) {
        onAutoSaveSuccess({ draft_key: draftKey });
      }
    } catch (error) {
      console.error('❌ [useDraftManager V2] 自動保存エラー:', error);
      if (onAutoSaveError && error instanceof Error) {
        onAutoSaveError(error);
      }
    }
  }, autoSaveInterval);
}, [
  autoSaveEnabled,
  autoSaveInterval,
  currentEditState,
  saveDraft,
  cleanupOldAutoSaves,
  onAutoSaveSuccess,
  onAutoSaveError
]);
```

#### 実装内容の完全一致

1. **タイマークリア**: 既存タイマーを確実にクリア
2. **状態チェック**: autoSaveEnabled, currentEditStateの検証
3. **自動保存実行**: setIntervalで定期実行
4. **保存後処理**: lastAutoSaveTime更新、cleanupOldAutoSaves呼び出し
5. **コールバック**: onAutoSaveSuccess/onAutoSaveErrorの呼び出し

すべてreference版と完全に一致しています。

### 7. stopAutoSaveTimer関数

**ロジック完全一致** ✅

```typescript
const stopAutoSaveTimer = useCallback(() => {
  if (autoSaveTimerRef.current) {
    console.log('🛑 [useDraftManager V2] 自動保存タイマー停止');
    clearInterval(autoSaveTimerRef.current);
    autoSaveTimerRef.current = null;
  }
}, []);
```

シンプルかつ完璧な実装です。

### 8. useEffect（自動保存の開始/停止）

**ロジック完全一致** ✅

```typescript
useEffect(() => {
  if (autoSaveEnabled) {
    startAutoSaveTimer();
  } else {
    stopAutoSaveTimer();
  }

  return () => {
    stopAutoSaveTimer();
  };
}, [autoSaveEnabled, autoSaveInterval, startAutoSaveTimer, stopAutoSaveTimer]);
```

autoSaveEnabledの変更を監視して自動保存を制御しています。

### 9. useEffect（クリーンアップ）

**ロジック完全一致** ✅

```typescript
useEffect(() => {
  return () => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }
  };
}, []);
```

コンポーネントアンマウント時のタイマークリーンアップが完璧です。

---

## 🔍 差異分析

### ✨ 改善点1: より詳細な型定義

#### editorv2版

```typescript
// ✅ UseDraftManagerReturnインターフェースで完全な戻り値型を定義
export interface UseDraftManagerReturn {
  // 状態
  drafts: Draft[];
  isLoading: boolean;
  error: string | null;
  autoSaveEnabled: boolean;
  lastSavedDraft: Draft | null;
  lastAutoSaveTime: Date | null;
  
  // 操作関数
  fetchDrafts: () => Promise<Draft[] | undefined>;
  saveDraft: (draftData: DraftSaveData) => Promise<{ draft: Draft }>;
  deleteDraft: (draftKey: string) => Promise<unknown>;
  
  // 自動保存制御
  setAutoSaveEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  startAutoSaveTimer: () => void;
  stopAutoSaveTimer: () => void;
  cleanupOldAutoSaves: () => Promise<void>;
}
```

reference版にはこの詳細な戻り値型定義がありませんが、editorv2版では完璧に型定義されています。

**評価**: ✨ 改善（型安全性向上）

### ✨ 改善点2: APIレスポンスの型定義

```typescript
// ✅ editorv2版
interface DraftsResponse {
  drafts: Draft[];
}

interface SaveDraftResponse {
  draft: Draft;
}
```

APIレスポンスの型も明示的に定義されています。

**評価**: ✨ 改善（型安全性向上）

---

## 📈 型安全性の評価

### 完璧な型定義

#### すべての関数に明示的な型

```typescript
// ✅ 完璧な型定義
const fetchDrafts = useCallback(async (): Promise<Draft[] | undefined> => {
  // 実装
}, [userId]);

const saveDraft = useCallback(async (draftData: DraftSaveData): Promise<{ draft: Draft }> => {
  // 実装
}, [userId, fetchDrafts]);

const deleteDraft = useCallback(async (draftKey: string): Promise<unknown> => {
  // 実装
}, [userId, fetchDrafts]);
```

すべての関数が完璧に型定義されています。

#### useCallbackの依存配列

```typescript
// ✅ 完璧な依存配列管理
const cleanupOldAutoSaves = useCallback(async (): Promise<void> => {
  // 実装
}, [fetchDrafts, deleteDraft, autoSaveGenerations]);

const startAutoSaveTimer = useCallback(() => {
  // 実装
}, [
  autoSaveEnabled,
  autoSaveInterval,
  currentEditState,
  saveDraft,
  cleanupOldAutoSaves,
  onAutoSaveSuccess,
  onAutoSaveError
]);
```

すべての依存関係が正しく管理されています。

---

## 🏆 結論

### 総合評価: **98点 / 100点** ✅

**useDraftManager.tsは非常に優秀な移植です。**

#### 成功要因

1. **完璧な型定義**: すべてのインターフェースと関数が完璧に型定義
2. **完全なロジック移植**: fetchDrafts, saveDraft, deleteDraftが完璧
3. **3世代管理**: cleanupOldAutoSavesが完璧に実装
4. **自動保存機能**: startAutoSaveTimer/stopAutoSaveTimerが完璧
5. **クールダウン機能**: 2秒間の重複取得防止が実装
6. **エラーハンドリング**: すべての関数で完璧なエラー処理
7. **コールバック**: onAutoSaveSuccess/onAutoSaveErrorの実装
8. **useEffect管理**: 依存配列が完璧

#### 軽微な減点理由（-2点）

**コメントの若干の削減**（-2点）
- reference版の一部のコメントが削除されている
- 機能には影響なし

#### 優れている点

- Draft, EditState, DraftSaveData, UseDraftManagerOptionsの完璧な型定義
- UseDraftManagerReturnインターフェースによる戻り値の完全な型定義
- APIレスポンスの型定義（DraftsResponse, SaveDraftResponse）
- Arc型の定義（V1互換用）
- すべての状態管理が型安全
- すべてのコールバックの依存配列が正しい
- クリーンアップ処理が完璧

#### 推奨事項

**なし** - 現在の実装が非常に優秀で、改善の余地がほとんどありません。

---

## 📋 検証完了確認

- [x] ファイル読み込み完了
- [x] 構造比較完了（完全一致）
- [x] ロジック比較完了（完全一致）
- [x] 型定義確認完了（完璧）
- [x] コメント確認完了（ほぼ保持）
- [x] fetchDrafts確認完了（完全移植）
- [x] saveDraft確認完了（完全移植）
- [x] deleteDraft確認完了（完全移植）
- [x] cleanupOldAutoSaves確認完了（完全移植）
- [x] startAutoSaveTimer確認完了（完全移植）
- [x] stopAutoSaveTimer確認完了（完全移植）
- [x] useEffect確認完了（完全移植）
- [x] 評価・採点完了
- [x] 検証票作成完了

---

## 🎯 Phase 3 進捗

**Phase 3 (hooks/) の1/4完了** ✅

| No | ファイル | 得点 | 評価 |
|----|---------|------|------|
| 7 | useDraftManager.ts | 98点 | ✨ 非常に優秀 |
| 8 | useHistory.ts | - | ⏳ 次 |
| 9 | useNamespaceOperations.ts | - | ⏳ 未着手 |
| 10 | useWorkflow.ts | - | ⏳ 未着手 |

---

**検証完了**: 2026-01-30 08:25  
**次の検証**: useHistory.ts  
**Phase 3完了まで**: あと3ファイル