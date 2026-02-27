# タスク計画書: フォーマット管理画面_API呼び出し共通化

## メタデータ
- **作成日時**: 2026-02-27 09:53
- **タスクID**: format_management_api_refactoring
- **優先度**: 中
- **推定工数**: 2時間

## 1. タスク概要

FormatManagement.tsx内で直接行われているAPI呼び出しを、専用のAPI関数経由に変更し、削除処理を共通化します。

### 他画面との比較調査結果

**ProjectManagement.tsx（参考実装）の確認結果:**

✅ **推奨パターンを採用している**
- すべてのAPI呼び出しは専用関数経由
- `@/services/projectApiService`から以下の関数をインポート:
  - `getProjects()` - プロジェクト一覧取得
  - `getProjectFiles()` - プロジェクトファイル取得
  - `getProjectTasks()` - プロジェクトタスク取得
  - `createProjectApi()` - プロジェクト作成
  - `checkoutProject()` - チェックアウト
  - `checkinProject()` - チェックイン
- `@/services/fileAccessService`から:
  - `downloadFolderAsZip()` - ZIPダウンロード
- **直接`createApiClient()`を使用していない**

**FormatManagement.tsx（修正対象）の現状:**

❌ **非推奨パターンを使用している**
- 4箇所で`createApiClient()`を直接呼び出し
- API呼び出しロジックがコンポーネント内に散在
- エラーハンドリングが統一されていない

### 現状の問題点

1. **直接API呼び出し**: `createApiClient()`を使って画面コンポーネント内で直接APIを呼び出している
2. **コードの重複**: 削除処理のモーダル表示とAPI呼び出しが複数箇所で似たようなコードになる可能性
3. **保守性の低下**: API仕様変更時に複数ファイルを修正する必要がある

### 直接API呼び出しを行っている箇所

#### 1. handleFileDelete (行865-909)
```typescript
const client = createApiClient();
await client.delete('/formats/files', {
  data: { filePath: file.path },
});
```

#### 2. handleCreateFormat (行777-800)
```typescript
const client = createApiClient();
const response = await client.post('/formats/folders', {
  folderName,
});
```

#### 3. handleFileEdit - XMLファイル読み込み (行306-318)
```typescript
const client = createApiClient();
const response = await client.post('/files/download-url', 
  { fileKey: file.path },
  { responseType: 'blob' }
);
```

#### 4. XML保存処理 (行1046-1053)
```typescript
const client = createApiClient();
await client.put('/formats/files', {
  content: xmlContent,
  filePath: editingXmlFile.path,
});
```

## 2. 目的と期待される成果

### 目的
- API呼び出しを適切なサービス層に集約し、保守性を向上させる
- 削除処理を`fileAccessService`に配置して汎用的に利用可能にする
- 将来的な機能追加や変更に対応しやすい構造にする

### 期待される成果
- [ ] `fileAccessService.ts`にファイル削除関数を追加
  - `deleteFileByKey`: ファイル削除（汎用）
- [ ] `formatApi.ts`に新しいAPI関数を追加
  - `createFormatFolder`: フォーマットフォルダ作成（部門直下）
  - `updateFormatFileContent`: ファイル内容更新
- [ ] `FormatManagement.tsx`からすべての直接API呼び出しを削除
- [ ] コードの可読性と保守性が向上

## 3. 実装ステップ

### Phase 1: ファイル削除関数の追加 (fileAccessService.ts)

- [ ] `deleteFileByKey`関数を追加
  - パラメータ: `fileKey: string`
  - 戻り値: `Promise<void>`
  - エンドポイント: `DELETE /files/delete`
  - 用途: ファイルキー（相対パス）を指定してファイルを削除
  - 特徴: プロジェクト、フォーマット、その他のファイルで共通利用可能

### Phase 2: その他のAPI関数の追加 (formatApi.ts)

- [ ] `createFormatFolder`関数を追加（部門直下）
  - パラメータ: `folderName: string`
  - 戻り値: `Promise<ApiResponse<{ folderPath: string }>>`
  - エンドポイント: `POST /formats/folders`
  
- [ ] `updateFormatFileContent`関数を追加
  - パラメータ: `filePath: string, content: string`
  - 戻り値: `Promise<ApiResponse<{ message: string }>>`
  - エンドポイント: `PUT /formats/files`

### Phase 3: FormatManagement.tsx の修正

- [ ] `handleFileDelete`を修正
  - `deleteFileByKey`関数を使用するように変更（fileAccessServiceから）
  - エラーハンドリングを統一
  
- [ ] `handleCreateFormat`を修正
  - `createFormatFolder`関数を使用するように変更（formatApiから）
  
- [ ] `handleFileEdit`のXMLファイル読み込みを修正
  - 既に`getFileDownloadUrlByKey`を使用しているため変更不要
  
- [ ] XML保存処理を修正
  - `updateFormatFileContent`関数を使用するように変更（formatApiから）

### Phase 4: 動作確認

- [ ] ファイル削除機能のテスト
- [ ] フォーマットフォルダ作成機能のテスト
- [ ] XMLファイル編集・保存機能のテスト
- [ ] エラーケースの確認

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/services/fileAccessService.ts` - ファイル削除関数を追加
2. `frontend/src/utils/formatApi.ts` - フォーマット関連API関数を追加
3. `frontend/src/components/project/FormatManagement.tsx` - 直接API呼び出しを関数呼び出しに変更

### 新規作成するファイル
なし（すべて既存ファイルへの追加）

### 影響を受ける機能
- フォーマット管理画面のファイル削除機能（`deleteFileByKey`使用）
- フォーマットフォルダ作成機能（`createFormatFolder`使用）
- XMLファイル編集・保存機能（`updateFormatFileContent`使用）
- XMLファイル読み込み（既に`getFileDownloadUrlByKey`使用中のため変更不要）

## 5. 技術的詳細

### fileAccessService.tsに追加する関数

#### deleteFileByKey
```typescript
/**
 * ファイルキーベースの汎用削除
 * 
 * Task: ファイル削除API共通化
 * - ファイルキー（相対パス）を指定してファイルを削除
 * - プロジェクト、フォーマット、その他のファイルで共通利用可能
 * - organization_idは認証情報から自動取得
 * 
 * @param fileKey ファイルキー（相対パス）
 * @returns Promise<void> 削除完了後に解決
 * @throws Error APIエラー時
 * 
 * @example
 * // フォーマットファイル削除
 * await deleteFileByKey('formats/chemistry/template.xml');
 * 
 * // プロジェクトファイル削除
 * await deleteFileByKey('projects/sample_project/data.csv');
 */
export const deleteFileByKey = async (
  fileKey: string
): Promise<void> => {
  const client = createApiClient();

  try {
    await client.delete('/files/delete', {
      data: { fileKey },
    });

    console.log('ファイル削除成功:', fileKey);
  } catch (error) {
    console.error('ファイル削除エラー:', error);
    throw error;
  }
};
```

#### createFormatFolder
```typescript
/**
 * 新規フォーマットフォルダを作成（部門直下）
 */
export async function createFormatFolder(
  folderName: string
): Promise<ApiResponse<{ folderPath: string }>> {
  try {
    const client = createApiClient();
    const response = await client.post('/formats/folders', {
      folderName,
    });
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Failed to create format folder:', error);
    throw error;
  }
}
```

#### updateFormatFileContent
```typescript
/**
 * フォーマットファイルの内容を更新
 */
export async function updateFormatFileContent(
  filePath: string,
  content: string
): Promise<ApiResponse<{ message: string }>> {
  try {
    const client = createApiClient();
    const response = await client.put('/formats/files', {
      content,
      filePath,
    });
    
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Failed to update format file content:', error);
    throw error;
  }
}
```

### 削除確認モーダルの共通化（オプション）

```typescript
// frontend/src/utils/deleteConfirmUtil.ts

import { App } from 'antd';

/**
 * 削除確認モーダルを表示し、削除処理を実行
 */
export function showDeleteConfirm(
  fileName: string,
  onDelete: () => Promise<void>,
  modal: ReturnType<typeof App.useApp>['modal'],
  message: ReturnType<typeof App.useApp>['message']
) {
  modal.confirm({
    title: 'ファイル削除',
    content: `「${fileName}」を削除しますか？この操作は取り消せません。`,
    okText: '削除',
    okButtonProps: { danger: true },
    cancelText: 'キャンセル',
    onOk: async () => {
      try {
        await onDelete();
        message.success(`「${fileName}」を削除しました`);
      } catch (error) {
        console.error('削除エラー:', error);
        message.error(
          `ファイルの削除に失敗しました: ${
            error instanceof Error ? error.message : '不明なエラー'
          }`
        );
        throw error;
      }
    },
  });
}
```

## 6. セキュリティ考慮事項

- [ ] API関数内でエラーハンドリングを適切に行う
- [ ] 機密情報（認証トークン等）がログ出力されないようにする
- [ ] バックエンドでの認証・認可チェックは変更しない（既存の仕組みを維持）

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| API関数の実装ミスによる動作不良 | 高 | 低 | 既存の関数パターンに従い、慎重に実装。十分なテストを実施 |
| エラーハンドリングの不備 | 中 | 中 | try-catchブロックを適切に配置し、エラーメッセージをユーザーに表示 |
| 既存機能の破壊 | 高 | 低 | 段階的に修正し、各修正後に動作確認を実施 |

## 8. テスト計画

### 機能テスト
- [ ] ファイル削除
  - 正常系: ファイルを選択して削除、成功メッセージ表示、一覧更新
  - 異常系: 削除失敗時のエラーメッセージ表示
  - エッジケース: キャンセルボタン押下、削除中の操作
  
- [ ] フォーマットフォルダ作成
  - 正常系: フォルダ名を入力して作成、成功メッセージ表示、一覧更新
  - 異常系: 作成失敗時のエラーメッセージ表示
  - エッジケース: 同名フォルダが既に存在する場合
  
- [ ] XMLファイル編集・保存
  - 正常系: ファイルを編集して保存、成功メッセージ表示
  - 異常系: 保存失敗時のエラーメッセージ表示

### 結合テスト
- [ ] 削除後にファイル一覧が正しく更新されるか
- [ ] フォルダ作成後にフォーマット一覧が正しく更新されるか
- [ ] 複数の操作を連続して実行した場合の動作確認

## 9. ロールバック計画

変更内容が問題を引き起こした場合:
1. Gitで変更前のコミットに戻す
2. 問題が特定のAPI関数にある場合は、その関数のみを修正
3. 必要に応じて一時的に直接API呼び出しに戻す

## 10. 関連ドキュメント

- `.clinerules/development/config.md` - コーディング規約
- `.clinerules/development/typescript.md` - TypeScript型定義規約
- `frontend/src/utils/formatApi.ts` - 既存のAPI関数実装

## 11. 承認記録

- **計画書提示日時**: 2026-02-27 09:53
- **承認日時**: （承認待ち）
- **承認者コメント**: （承認後に記入）

## 12. 実施記録

### 実施日時
開始: 2026-02-27 17:00
完了: 2026-02-27 17:27

### 現在の実装状況（2026-02-27 17:00時点）

#### ✅ 実装済み
1. **formatApi.ts - `createFormatFolder`関数**
   - 147-176行目に実装済み
   - 部門直下にフォーマットフォルダを作成する関数
   - エンドポイント: `POST /formats/folders`
   - FormatManagement.tsxの40行目でimport済み

#### ❌ 未実装
1. **fileAccessService.ts - `deleteFileByKey`関数**
   - 関数自体が存在しない
   - 必要なエンドポイント: `DELETE /files/delete`
   - 影響箇所: FormatManagement.tsx の handleFileDelete（869-919行目）

2. **formatApi.ts - `updateFormatFileContent`関数**
   - 関数自体が存在しない
   - 必要なエンドポイント: `PUT /formats/files`
   - 影響箇所: FormatManagement.tsx の XML保存処理（1046-1053行目）

3. **FormatManagement.tsx - 直接API呼び出しの修正（3箇所）**
   - ❌ handleFileDelete（869-919行目）: 直接`client.delete('/formats/files')`を呼び出し
     - → `deleteFileByKey`を使用すべき（未実装のため保留）
   - ❌ handleCreateFormat（777-800行目）: 直接`client.post('/formats/folders')`を呼び出し
     - → `createFormatFolder`を使用すべき（関数は実装済み、使用箇所の修正のみ）
   - ❌ XML保存処理（1046-1053行目）: 直接`client.put('/formats/files')`を呼び出し
     - → `updateFormatFileContent`を使用すべき（未実装のため保留）
   - ✅ handleFileEdit - XMLファイル読み込み（306-318行目）: 変更不要
     - 理由: プロキシ方式でBlobを直接取得する必要があるため、専用関数化の必要なし

### 計画からの変更点
1. **`createFormatFolder`関数は既に実装済みであることが判明**
   - 当初は未実装と想定していたが、formatApi.tsに既に実装されていた
   - FormatManagement.tsxでimportも完了しているが、使用箇所では直接API呼び出しのまま

2. **実装の優先順位を調整**
   - Phase 1: `deleteFileByKey`関数の追加（fileAccessService.ts）
   - Phase 2: `updateFormatFileContent`関数の追加（formatApi.ts）
   - Phase 3: FormatManagement.tsxの修正（3箇所）

### 発生した問題と解決方法
（実施中に発生した問題とその解決方法を記録）

### 最終的な成果物
- [x] fileAccessService.ts - `deleteFileByKey`関数追加
- [x] formatApi.ts - `createFormatFolder`関数追加（既に実装済み）
- [x] formatApi.ts - `updateFormatFileContent`関数追加
- [x] FormatManagement.tsx - handleFileDelete修正（`deleteFileByKey`使用）
- [x] FormatManagement.tsx - handleCreateFormat修正（`createFormatFolder`使用）
- [x] FormatManagement.tsx - XML保存処理修正（`updateFormatFileContent`使用）

### 進捗率
- 全体: 6/6項目完了（100%）
- fileAccessService.ts: 1/1完了（100%）
- formatApi.ts: 2/2完了（100%）
- FormatManagement.tsx: 3/3完了（100%）

## 13. 振り返り

### うまくいった点
（作業完了後に記入）

### 改善が必要な点
（作業完了後に記入）

### 学んだこと
（作業完了後に記入）
