# apiClient.ts → projectApiService.ts 移行計画書

## メタデータ
- **作成日時**: 2026-01-23 14:37
- **タスクID**: apiClient移行
- **優先度**: 高
- **推定工数**: 4時間

---

## 1. タスク概要

apiClient.tsの関数をAxios形式でprojectApiService.tsに移行し、API規約に準拠した実装に統一する。

### 目的
1. HTTPクライアントをAxiosに統一
2. API仕様書に基づいた正しいエンドポイント呼び出し
3. モックデータの適切な統合（API実装までの橋渡し）
4. コードの保守性向上

### 期待される成果
- [x] apiClient.tsの全関数を分析
- [ ] 実装済みAPIをprojectApiService.tsに移行
- [ ] 未実装API用のスタブ関数を作成（モック統合）
- [ ] 使用箇所の更新
- [ ] 動作確認

---

## 2. 現状分析

### apiClient.tsの関数分類

#### A. 実装済みAPIに対応（即座に移行可能）
| 関数名 | 対応API | 状態 | 移行先 |
|--------|---------|------|--------|
| fetchProjects | GET /api/v1/projects (2.1) | ✅ 実装済み | projectApiService.ts |
| fetchProjectById | GET /api/v1/projects/:id | ✅ 実装済み | projectApiService.ts |

#### B. 未実装APIに対応（スタブ作成 + モック統合）
| 関数名 | 対応API | 状態 | 対応方針 |
|--------|---------|------|----------|
| fetchProjectFiles | GET /api/v1/projects/:projectId/files (2.5) | ⏳ 未実装 | スタブ作成 + モックデータ統合 |
| validateMaimlContent | POST /api/v1/maiml/validate (5.7) | ⏳ 未実装 | スタブ作成 + 簡易バリデーション |
| autoCorrectMaiml | POST /api/v1/maiml/correct (5.8) | ⏳ 未実装 | スタブ作成 + モック処理 |
| fetchMultipleMethodsStructureFromContent | POST /api/v1/maiml/parse (5.1) | ⏳ 未実装 | スタブ作成 + モックデータ統合 |
| fetchPetriNetStructure | POST /api/v1/maiml/parse (5.1) | ⏳ 未実装 | 上記と統合 |

#### C. API仕様書未定義（別途API設計が必要）
| 関数名 | 現状 | 対応方針 |
|--------|------|----------|
| fetchFormats | モック | フォーマット管理API設計書を確認後、実装 |
| fetchFormatById | モック | 同上 |
| fetchFormatFiles | モック | 同上 |
| fetchTransitionStatus | モック | 進捗確認API設計書を確認後、実装 |
| fetchExperimentRecords | モック | 同上 |
| fetchCreators | モック | マスタAPI設計が必要 |
| fetchVendors | モック | 同上 |
| fetchOwners | モック | 同上 |
| fetchInstruments | モック | 同上 |
| fetchFileList | モック | テンプレート管理API設計が必要 |
| fetchFileContent | モック | 同上 |

---

## 3. 実装ステップ

### Phase 1: 基盤整備（30分）

#### Step 1.1: 共通Axiosクライアントの抽出
```typescript
// frontend/src/api/axiosClient.ts を新規作成
```

**内容:**
- createApiClient() 関数を独立ファイルに抽出
- インターセプター設定（エラーハンドリング、認証）
- タイムアウト設定（30秒）
- withCredentials: true設定

#### Step 1.2: 型定義の整理
```typescript
// frontend/src/types/api.ts を確認・更新
```

**内容:**
- ApiResponse<T> 型
- エラーレスポンス型
- ページネーション型

---

### Phase 2: 実装済みAPI移行（30分）

#### Step 2.1: fetchProjects の移行

**現状（apiClient.ts）:**
```typescript
export async function fetchProjects(): Promise<ApiResponse<ProjectListResponse>> {
  const response = await fetch(`${API_BASE_URL}/projects`, {
    method: 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  // エラーハンドリング...
  return await response.json();
}
```

**移行後（projectApiService.ts）:**
```typescript
export const getProjects = async (): Promise<ProjectListResponse> => {
  const client = createApiClient();
  try {
    const response = await client.get<{
      success: true;
      data: ProjectListResponse;
      meta: { timestamp: string; requestId: string };
    }>('/api/v1/projects');
    return response.data.data;
  } catch (error) {
    console.error('プロジェクト一覧取得APIエラー:', error);
    throw error;
  }
};
```

#### Step 2.2: fetchProjectById の移行

同様のパターンで移行。

---

### Phase 3: 未実装API用スタブ作成（1時間）

#### Step 3.1: fetchProjectFiles の実装

```typescript
/**
 * プロジェクトに紐づくファイル一覧を取得
 * ※ 未実装API: 2.5 GET /api/v1/projects/:projectId/files
 * 
 * @param projectId プロジェクトID
 * @returns ファイル一覧
 */
export const getProjectFiles = async (
  projectId: string
): Promise<{ files: ProjectFile[]; archiveFiles: ProjectFile[] }> => {
  const client = createApiClient();
  
  try {
    // TODO: API実装後にコメント解除
    // const response = await client.get<{
    //   success: true;
    //   data: { files: ProjectFile[]; archiveFiles: ProjectFile[] };
    //   meta: { timestamp: string; requestId: string };
    // }>(`/api/v1/projects/${projectId}/files`);
    // return response.data.data;
    
    // 一時的にモックデータを返す
    console.warn('⚠️ [getProjectFiles] API未実装のためモックデータを使用');
    const mockData = await import('@/data/mock/mockFiles.json');
    const allFiles = mockData.files as Record<string, { root: ProjectFile[]; archive?: ProjectFile[] }>;
    const projectFiles = allFiles[projectId];
    
    if (!projectFiles) {
      throw new Error(`プロジェクトのファイルが見つかりません: ${projectId}`);
    }
    
    return {
      files: projectFiles.root || [],
      archiveFiles: projectFiles.archive || [],
    };
  } catch (error) {
    console.error('ファイル一覧取得エラー:', error);
    throw error;
  }
};
```

#### Step 3.2: validateMaimlContent の実装

```typescript
/**
 * MAIMLコンテンツのバリデーション
 * ※ 未実装API: 5.7 POST /api/v1/maiml/validate
 * 
 * @param maimlContent MAIML XML文字列
 * @returns バリデーション結果
 */
export const validateMaiml = async (
  maimlContent: string
): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> => {
  const client = createApiClient();
  
  try {
    // TODO: API実装後にコメント解除
    // const response = await client.post<{
    //   success: true;
    //   data: { valid: boolean; errors: string[]; warnings: string[] };
    // }>('/api/v1/maiml/validate', { maimlContent });
    // return response.data.data;
    
    // 一時的に簡易バリデーションを実行
    console.warn('⚠️ [validateMaiml] API未実装のため簡易バリデーション');
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // XMLパースチェック
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(maimlContent, 'text/xml');
      const parseError = xmlDoc.querySelector('parsererror');
      
      if (parseError) {
        errors.push('XML形式が不正です');
      }
    } catch {
      errors.push('XMLのパースに失敗しました');
    }
    
    // 基本構造チェック
    if (!maimlContent.includes('<document')) {
      warnings.push('document要素が見つかりません');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    console.error('MAIMLバリデーションエラー:', error);
    throw error;
  }
};
```

#### Step 3.3: その他の未実装API用スタブ

同様のパターンで以下を実装：
- autoCorrectMaiml
- parseMaimlContent（fetchMultipleMethodsStructureFromContent統合）

---

### Phase 4: API仕様書未定義関数の対応（30分）

#### Step 4.1: 別ファイルに分離

```typescript
// frontend/src/api/mockApiService.ts を新規作成
```

**内容:**
- fetchFormats
- fetchFormatById
- fetchFormatFiles
- fetchTransitionStatus
- fetchExperimentRecords
- fetchCreators
- fetchVendors
- fetchOwners
- fetchInstruments
- fetchFileList
- fetchFileContent

**コメント:**
```typescript
/**
 * モックAPIサービス
 * 
 * このファイルはAPI設計書未定義の関数を一時的に管理します。
 * 各関数は将来的に適切なAPI設計を行い、本番実装に移行する予定です。
 * 
 * TODO:
 * - フォーマット管理API設計（fetchFormats, fetchFormatById, fetchFormatFiles）
 * - 進捗確認API設計（fetchTransitionStatus, fetchExperimentRecords）
 * - マスタ管理API設計（fetchCreators, fetchVendors, fetchOwners, fetchInstruments）
 * - テンプレート管理API設計（fetchFileList, fetchFileContent）
 */
```

---

### Phase 5: 使用箇所の更新（1時間）

#### Step 5.1: インポート文の更新

**検索対象:**
- `from '@/utils/apiClient'`
- `from '../utils/apiClient'`

**置換:**
```typescript
// 旧
import { fetchProjects, fetchProjectById } from '@/utils/apiClient';

// 新
import { getProjects } from '@/api/projectApiService';
import { fetchFormats } from '@/api/mockApiService'; // 一時的
```

#### Step 5.2: 関数名の変更

| 旧関数名 | 新関数名 | 備考 |
|---------|---------|------|
| fetchProjects | getProjects | projectApiService |
| fetchProjectById | getProject | projectApiService |
| fetchProjectFiles | getProjectFiles | projectApiService（モック統合） |
| validateMaimlContent | validateMaiml | projectApiService（モック統合） |
| autoCorrectMaiml | correctMaiml | projectApiService（モック統合） |
| fetchMultipleMethodsStructureFromContent | parseMaimlContent | projectApiService（モック統合） |

---

### Phase 6: 動作確認（30分）

#### Step 6.1: ビルド確認
```bash
cd frontend
npm run build
```

#### Step 6.2: 画面動作確認
- プロジェクト一覧画面
- プロジェクト詳細画面
- Maiml編集画面

#### Step 6.3: エラーログ確認
- コンソールにエラーが出ていないか
- モックデータ使用の警告が正しく表示されているか

---

## 4. ファイル構成（移行後）

```
frontend/src/api/
├── axiosClient.ts              # 共通Axiosクライアント（新規）
├── projectApiService.ts        # プロジェクト関連API（拡張）
├── authApiService.ts           # 認証API（将来作成）
├── maimlApiService.ts          # MAIML編集API（将来作成）
└── mockApiService.ts           # API設計書未定義のモック（新規）

frontend/src/utils/
├── apiClient.ts                # 削除または非推奨化
└── (その他ユーティリティ)
```

---

## 5. 影響範囲

### 変更するファイル
1. `frontend/src/api/axiosClient.ts` - 新規作成
2. `frontend/src/api/projectApiService.ts` - 大幅拡張
3. `frontend/src/api/mockApiService.ts` - 新規作成
4. `frontend/src/utils/apiClient.ts` - 非推奨化マーク
5. `frontend/src/components/**/*.tsx` - インポート文更新

### 影響を受ける機能
- プロジェクト管理画面
- Maiml編集画面
- フォーマット管理画面
- 進捗確認画面
- 実験記録画面

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 関数名変更による呼び出しエラー | 高 | 中 | 段階的に移行、動作確認を徹底 |
| モックデータの不整合 | 中 | 低 | 既存のモックデータを検証 |
| 型定義の不一致 | 中 | 低 | TypeScriptの型チェックで検出 |
| パフォーマンス劣化 | 低 | 低 | Axiosの方が高速なため改善される |

---

## 7. テスト計画

### ユニットテスト
- [ ] axiosClient.ts のテスト
- [ ] projectApiService.ts の各関数テスト
- [ ] エラーハンドリングのテスト

### 統合テスト
- [ ] プロジェクト一覧取得
- [ ] プロジェクト詳細取得
- [ ] ファイル一覧取得（モック）
- [ ] MAIMLバリデーション（モック）

### 手動テスト
- [ ] プロジェクト管理画面の動作確認
- [ ] Maiml編集画面の動作確認
- [ ] エラー時の挙動確認

---

## 8. ロールバック計画

### 問題発生時の対応

#### Step 1: 即座にロールバック
```bash
git revert <commit-hash>
```

#### Step 2: apiClient.tsを復活
- 非推奨化マークを削除
- インポート文を元に戻す

#### Step 3: 原因調査
- エラーログを確認
- 型定義の不一致をチェック
- モックデータの整合性を確認

---

## 9. ベストプラクティス

### DO（推奨）
✅ 段階的に移行（Phase単位）
✅ 各Phaseで動作確認
✅ モック使用時は警告ログを出力
✅ TODO コメントで未実装APIを明示
✅ 型安全性を維持

### DON'T（非推奨）
❌ 一度に全関数を移行しない
❌ モックと本番APIを混在させない
❌ エラーハンドリングを省略しない
❌ 動作確認なしでコミットしない

---

## 10. 次のステップ

### 短期（1週間以内）
1. [ ] この計画書の承認
2. [ ] Phase 1-2の実装（基盤整備・実装済みAPI移行）
3. [ ] Phase 3の実装（未実装API用スタブ）
4. [ ] 動作確認

### 中期（1ヶ月以内）
5. [ ] 未実装APIの実装（バックエンド）
6. [ ] モックからAPI呼び出しへの切り替え
7. [ ] API設計書未定義関数のAPI設計

### 長期（3ヶ月以内）
8. [ ] apiClient.tsの完全削除
9. [ ] 全APIの本番実装完了
10. [ ] パフォーマンステスト

---

## 11. 承認記録

- **計画書提示日時**: 2026-01-23 14:37
- **承認日時**: （承認時に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

---

**作成日**: 2026-01-23 14:37  
**作成者**: Cline  
**対象バージョン**: mmdpf v1.0