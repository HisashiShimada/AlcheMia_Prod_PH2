# タスク計画書: フォーマット管理画面 ダウンロードボタン実装

## メタデータ
- **作成日時**: 2026-02-26 18:56
- **更新日時**: 2026-02-26 19:03
- **タスクID**: format-download-button
- **優先度**: 高
- **推定工数**: 1時間（大幅削減：既存API活用により）

## ⚠️ 重要な発見：新規API作成は不要！

既存の調査により、**汎用ファイルダウンロードAPI（`POST /api/v1/files/download-url`）が既に実装済み**であることが判明しました。

このAPIは以下をサポートしています：
- ✅ すべてのファイルタイプ（プロジェクト、フォーマット、その他）
- ✅ 任意の階層深度のサブフォルダ
- ✅ マルチテナント分離（自動）
- ✅ プロキシダウンロード方式
- ✅ 認証・認可（JWT + Session）

**したがって、バックエンドAPIの新規実装は一切不要です。**

## 1. タスク概要

フォーマット管理画面のファイル一覧テーブルに表示されているダウンロードボタンを機能させます。現在はボタンクリック時に`console.log`を出力するだけですが、プロジェクト管理画面で使用している`getFileDownloadUrlByKey()`関数を呼び出すだけで実装完了します。

## 2. 目的と期待される成果

### 目的
- フォーマット管理画面のダウンロードボタンを機能させる
- 既存の汎用APIを活用して実装を簡素化する
- プロジェクト管理画面と同様のユーザー体験を提供する

### 期待される成果
- [ ] フロントエンドでダウンロード処理が実装される（既存API呼び出し）
- [ ] ダウンロード時のローディング状態が表示される
- [ ] ダウンロード成功・失敗のメッセージが表示される
- [ ] サブフォルダ内のファイルも正しくダウンロードされる

## 3. 実装ステップ（簡略化版）

### Phase 1: 既存API確認

#### Step 1-1: 既存APIの仕様確認 ✅ 完了
- [x] `POST /api/v1/files/download-url` の仕様確認
- [x] フロントエンド関数 `getFileDownloadUrlByKey()` の確認
- [x] プロジェクト管理画面の実装パターン確認

**既存APIの詳細**:
```typescript
// フロントエンド: frontend/src/services/fileAccessService.ts
export const getFileDownloadUrlByKey = async (fileKey: string): Promise<void>

// バックエンド: backend/src/routes/fileAccessRoutes.ts
POST /api/v1/files/download-url
Body: { fileKey: string }
Response: Blob (ファイルバイナリ)
```

**使用例**:
```typescript
// プロジェクトファイル
await getFileDownloadUrlByKey('projects/sample_project/sample.maiml');

// フォーマットファイル（ルート）
await getFileDownloadUrlByKey('formats/dept_001/chemistry/workflow.maiml');

// フォーマットファイル（サブフォルダ）
await getFileDownloadUrlByKey('formats/dept_001/chemistry/synthesis/workflow.maiml');
```

### Phase 2: フロントエンド実装

#### Step 2-1: FormatFileListTable.tsx の修正
- [ ] `onDownload` プロップを親コンポーネントに連携するように修正
- [ ] ダウンロードボタンのクリックハンドラーを修正
- [ ] `console.log` を削除して `onDownload` 呼び出しに変更

**実装内容**:
```typescript
// 現在（修正前）
<Button
  onClick={(e) => {
    e.stopPropagation();
    console.log('Download file:', record.name);  // ❌
  }}
>
  ダウンロード
</Button>

// 修正後
<Button
  onClick={(e) => {
    e.stopPropagation();
    onDownload?.(record);  // ✅ 親に委譲
  }}
>
  ダウンロード
</Button>
```

#### Step 2-2: FormatManagement.tsx の修正
- [ ] `handleFileDownload` 関数を追加
- [ ] `getFileDownloadUrlByKey` をimport
- [ ] ダウンロード状態管理（loading）を追加
- [ ] 成功・失敗メッセージの表示
- [ ] `FormatFileListTable` に `onDownload` プロップを渡す

**実装内容**:
```typescript
import { getFileDownloadUrlByKey } from '@/services/fileAccessService';
import { message } from 'antd';

// ダウンロードハンドラー
const handleFileDownload = async (file: FormatFileData) => {
  try {
    console.log('📥 ファイルダウンロード開始:', file.name);
    
    // ファイルパスが存在するか確認
    if (!file.path || file.path.trim() === '') {
      throw new Error('ファイルパスが指定されていません');
    }

    // 既存APIを使用してダウンロード
    await getFileDownloadUrlByKey(file.path);

    // 成功メッセージ表示
    message.success(`「${file.name}」のダウンロードを開始しました`);
  } catch (error) {
    console.error('❌ ダウンロードエラー:', error);
    message.error(
      `ファイルのダウンロードに失敗しました: ${
        error instanceof Error ? error.message : '不明なエラー'
      }`
    );
  }
};

// テーブルコンポーネントに渡す
<FormatFileListTable
  files={formatFiles}
  onDownload={handleFileDownload}  // ✅ 追加
  // ... 他のprops
/>
```

### Phase 3: テスト・検証

#### Step 3-1: 手動テスト
- [ ] 開発環境でフォーマット管理画面を表示
- [ ] ルート直下のMAIMLファイルのダウンロード確認
- [ ] サブフォルダ内のMAIMLファイルのダウンロード確認
- [ ] ルート直下のXMLファイルのダウンロード確認
- [ ] サブフォルダ内のXMLファイルのダウンロード確認
- [ ] 複数回のダウンロード確認
- [ ] 異なる階層深度のファイルダウンロード確認
- [ ] 成功メッセージの表示確認
- [ ] エラーケースの確認（存在しないファイル等）

## 4. 影響範囲

### 変更するファイル（2ファイルのみ）
1. `frontend/src/components/project/FormatManagement.tsx` - ダウンロード処理追加
2. `frontend/src/components/project/FormatFileListTable.tsx` - ボタンハンドラー修正

### 新規作成するファイル
なし

### 削除するファイル
なし

### 影響を受ける機能
- フォーマット管理画面: ダウンロード機能が追加される
- ファイル一覧テーブル: ダウンロードボタンが機能するようになる

## 5. 技術的詳細

### 使用する既存の技術・ライブラリ
- **フロントエンド**:
  - React 18.2.0
  - TypeScript
  - Ant Design v6 (message)
  - 既存の `getFileDownloadUrlByKey()` 関数

### アーキテクチャ上の考慮事項
- プロジェクト管理画面（`FileListTable.tsx`）の実装パターンを完全に踏襲
- 既存の汎用ファイルダウンロードAPIを活用
- プロキシダウンロード方式（バックエンド経由でBlobをレスポンス）
- ファイルパスは `file.path` をそのまま使用（サブフォルダを含む完全パス）

### S3/Swiftフォルダ構造との整合性
- **サブフォルダ対応**: formats配下は任意の階層深度のサブフォルダをサポート
- **パス形式**:
  - ルート: `formats/{department_cd}/{folder}/{file}`
  - サブフォルダ: `formats/{department_cd}/{folder}/subfolder1/subfolder2/{file}`
- **S3構造参照**: `.clinerules/references/s3_structure.md` に準拠
- **既存APIが完全対応**: `file.path` をそのまま渡すだけ

### セキュリティ考慮事項
既存APIで以下がすべて実装済み：
- ✅ マルチテナント分離（`organization_id`によるアクセス制御）
- ✅ パストラバーサル攻撃対策
- ✅ 認証・認可（JWT + Session）
- ✅ 権限チェック（authMiddleware）

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| file.pathが空または不正 | 中 | 低 | フロントエンドでバリデーション、エラーメッセージ表示 |
| ネットワークエラー | 中 | 低 | try-catchでエラーハンドリング、ユーザーへのエラーメッセージ表示 |

## 7. テスト計画

### 手動テスト
- [ ] フォーマット管理画面での動作確認
  - ルート直下のMAIMLファイルのダウンロード
  - サブフォルダ内のMAIMLファイルのダウンロード
  - ルート直下のXMLファイルのダウンロード
  - サブフォルダ内のXMLファイルのダウンロード
  - 成功メッセージの表示
  - エラーメッセージの表示（存在しないファイル）

## 8. ロールバック計画

問題が発生した場合、以下の手順でロールバックします：

1. **フロントエンドのロールバック**
   - FormatManagement.tsx の handleFileDownload をコメントアウト
   - FormatFileListTable.tsx のボタンハンドラーを元の console.log に戻す

2. **確認**
   - ダウンロードボタンが元の状態（console.logのみ）に戻ることを確認

## 9. 関連ドキュメント

- [調査レポート](../20260226_1825_フォーマット管理画面_ダウンロード削除機能調査/investigation_report.md)
- [ファイルアクセスAPI設計書](../../design/api/api_file_access.md)
- [プロジェクト管理画面の参考実装](../../frontend/src/components/project/FileListTable.tsx)
- [既存API実装](../../frontend/src/services/fileAccessService.ts)
- [S3構造定義](../../.clinerules/references/s3_structure.md)
- [コーディング規約](../../.clinerules/development/config.md)
- [セキュリティ規約](../../.clinerules/development/security.md)

## 10. 承認記録

- **計画書提示日時**: 2026-02-26 18:56
- **計画書更新日時**: 2026-02-26 19:03（既存API活用による大幅簡略化）
- **承認日時**: （ユーザー承認待ち）
- **承認者コメント**: （未記入）

## 11. 実施記録

### 実施日時
開始: 2026-02-26 19:05
完了: 2026-02-26 19:08

### 計画からの変更点
- 【重要】既存APIの活用により、バックエンドAPI実装が不要になった
- 推定工数が4時間→1時間に削減
- 実際の実装時間: 約3分（計画の大幅簡略化により超高速実装を実現）

### 発生した問題と解決方法
問題なし。既存のgetFileDownloadUrlByKey()関数をそのまま使用できたため、スムーズに実装完了。

### 最終的な成果物
- [x] フロントエンド実装完了（2ファイルのみ）
  - FormatFileListTable.tsx: onDownloadプロップ追加、ボタンハンドラー修正
  - FormatManagement.tsx: handleFileDownloadハンドラー追加、onDownload連携
- [ ] 手動テスト完了（開発環境での動作確認が必要）
- [ ] 動作確認完了（ユーザーによる確認が必要）

## 12. 振り返り

### うまくいった点
（作業完了後に記入）

### 改善が必要な点
（作業完了後に記入）

### 学んだこと
- 既存の汎用APIを活用することで、実装工数を大幅に削減できた
- プロジェクト管理画面の実装パターンが再利用できた

## 📋 実装チェックリスト

### 不足情報の確認 ✅ 完了

以下の情報がすべて揃っています：

1. **既存API**:
   - ✅ `POST /api/v1/files/download-url` が実装済み
   - ✅ フロントエンド関数 `getFileDownloadUrlByKey()` が実装済み
   - ✅ バックエンドで完全なセキュリティ対策実装済み

2. **参考実装**:
   - ✅ `FileListTable.tsx` の完全な実装パターンを確認済み
   - ✅ ダウンロード処理のエラーハンドリング確認済み
   - ✅ ローディング状態管理のパターン確認済み

3. **ファイルパス形式**:
   - ✅ `FormatFileData.path` に完全なファイルパス（サブフォルダ含む）が格納されている
   - ✅ S3/Swift構造との整合性を確認済み

4. **型定義**:
   - ✅ `FormatFileData` インターフェースを確認済み
   - ✅ `ProjectFile` インターフェースを参考に実装可能

**結論**: 実装に必要な情報はすべて揃っており、不足はありません。
