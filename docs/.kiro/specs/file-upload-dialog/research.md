# Research & Design Decisions

---
**Feature**: `file-upload-dialog`  
**Discovery Scope**: Extension (既存UI実装のAPI統合)  
**Discovery Date**: 2026-01-19  
---

## Summary
- **Feature**: ファイルアップロードダイアログ
- **Discovery Scope**: Extension
- **Key Findings**:
  - UI実装は完成済み（BulkUploadDialog.tsx）、API統合が必要
  - API仕様は完全に定義済み（POST /api/v1/projects/:projectId/files/upload）
  - multipart/form-data形式のファイル送信が必要
  - 3つのアップロードモード（single/bulk/folder）を既存UIがサポート

## Research Log

### 既存実装の調査
- **Context**: BulkUploadDialog.tsxの実装状況を確認
- **Sources Consulted**: frontend/src/components/project/BulkUploadDialog.tsx
- **Findings**:
  - UIコンポーネントは完全実装済み（Segmented, Dragger, Cascader, Progress, Alert）
  - 3つのアップロードモード切り替え機能実装済み
  - ファイル選択・リスト表示・バリデーション実装済み
  - フォルダ構造保持オプション実装済み
  - モックアップロード処理（setTimeout）のみ実装
- **Implications**: API呼び出し処理の追加のみで機能完成

### API仕様の確認
- **Context**: バックエンドAPI仕様との互換性確認
- **Sources Consulted**: docs/design/api/api_project_management.md セクション2.7
- **Findings**:
  - エンドポイント: POST /api/v1/projects/:projectId/files/upload
  - Content-Type: multipart/form-data
  - 必須フィールド: uploadMode, targetFolder, files
  - オプション: batchName, preserveFolderStructure
  - レスポンス: 201 Created (単一), 201 Created (一括/フォルダ)
  - エラーハンドリング: 400, 401, 403, 404, 500
- **Implications**: 既存UIの状態管理とAPI仕様が完全に一致

### multipart/form-data送信方法
- **Context**: Reactでのファイルアップロード実装方法
- **Sources Consulted**: Ant Design Upload, Axios documentation
- **Findings**:
  - FormDataオブジェクトを使用してmultipart/form-data構築
  - Axiosで`Content-Type: multipart/form-data`自動設定
  - onUploadProgress でリアルタイム進捗取得可能
  - CancelTokenでキャンセル機能実装可能
- **Implications**: Axiosの標準機能で実装可能、追加ライブラリ不要

### フォルダ構造の扱い
- **Context**: webkitRelativePathの利用とS3パス生成
- **Sources Consulted**: HTML5 File API, MDN Web Docs
- **Findings**:
  - webkitdirectory属性でフォルダ選択可能
  - File.webkitRelativePathでフォルダ階層取得
  - フロントエンドで相対パスを保持してバックエンドに送信
  - バックエンドがS3パスを生成（organization_prefix自動付与）
- **Implications**: 既存実装で対応済み、API側でパス処理

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| FormData + Axios | FormDataオブジェクトでmultipart構築、Axiosで送信 | シンプル、標準的、進捗対応 | なし | 既存パターンと一致 |
| Custom multipart | 手動でmultipart/form-data構築 | 完全制御可能 | 複雑、エラーリスク高 | 不要 |
| Upload Component直送 | Ant DesignのUploadコンポーネントで直接送信 | Ant Design統合 | カスタマイズ制約 | 既存UIと不整合 |

**選択**: FormData + Axios（Option 1）

## Design Decisions

### Decision: API統合アプローチ
- **Context**: 既存UI実装にAPI呼び出しを追加する方法
- **Alternatives Considered**:
  1. handleUpload関数内で直接Axios呼び出し
  2. カスタムフック (useFileUpload) に分離
  3. services/fileService.ts に分離
- **Selected Approach**: services/fileService.ts に分離
- **Rationale**: 
  - 再利用性向上（他のコンポーネントでも使用可能）
  - テスト容易性向上
  - APIロジックとUI��ジックの分離
  - 既存のapiService.tsパターンに準拠
- **Trade-offs**: ファイル追加は必要だが、保守性・テスト性が向上
- **Follow-up**: fileService.tsの実装とユニットテスト追加

### Decision: 進捗更新の実装方法
- **Context**: リアルタイムアップロード進捗の表示
- **Alternatives Considered**:
  1. Axios onUploadProgress で実進捗取得
  2. 擬似進捗（現在の実装）を維持
  3. WebSocket/SSEで進捗通知
- **Selected Approach**: Axios onUploadProgress で実進捗取得
- **Rationale**:
  - ネイティブ機能で正確な進捗取得
  - 追加ライブラリ不要
  - ユーザー体験向上
- **Trade-offs**: なし
- **Follow-up**: onUploadProgressコールバックの実装

### Decision: エラーハンドリング戦略
- **Context**: APIエラーの適切な処理とユーザーへの通知
- **Alternatives Considered**:
  1. Alert コンポーネントで全エラー表示
  2. message.error で簡易通知
  3. Notification でリッチな通知
- **Selected Approach**: Alert コンポーネント（既存実装を維持）
- **Rationale**:
  - 既存UI設計に準拠
  - エラー詳細を表示可能
  - ユーザーが閉じるまで表示
- **Trade-offs**: なし
- **Follow-up**: APIエラーメッセージの適切な抽出と表示

### Decision: file_metadataテーブルへの記録
- **Context**: アップロード後のファイルメタデータ管理
- **Alternatives Considered**:
  1. バックエンドで自動記録
  2. フロントエンドから追加API呼び出し
  3. メタデータ記録なし
- **Selected Approach**: バックエンドで自動記録（既存API仕様）
- **Rationale**:
  - S3アップロードとDB記録をトランザクションで管理
  - フロントエンド実装不要
  - データ整合性保証
- **Trade-offs**: なし
- **Follow-up**: なし（API実装済み）

## Risks & Mitigations

### Risk 1: 大容量ファイルアップロード時のタイムアウト
- **Risk**: 100MB/ファイルの制限はあるが、ネットワーク速度によってはタイムアウト
- **Mitigation**: 
  - Axiosのtimeout設定を適切に設定（300秒）
  - Progress表示でユーザーに進捗を通知
  - 将来的にチャンク転送を検討

### Risk 2: ブラウザ互換性（webkitdirectory）
- **Risk**: webkitdirectory属性は標準化されていない
- **Mitigation**:
  - Chrome/Firefox/Safari/Edge最新版で動作確認済み
  - 非対応ブラウザではフォルダモードを非表示または無効化
  - 代替案: 一括ファイル選択を案内

### Risk 3: 同時アップロード時の競合
- **Risk**: 複数ユーザーが同時に同名ファイルをアップロード
- **Mitigation**:
  - バックエンドでファイル名の一意性チェック
  - タイムスタンプ付きファイル名生成オプション
  - 上書き確認ダイアログ（将来実装）

### Risk 4: アップロード中のブラウザクローズ
- **Risk**: アップロード中にブラウザを閉じるとファイル喪失
- **Mitigation**:
  - beforeunloadイベントで警告表示（既存実装）
  - アップロード中のキャンセル確認モーダル（既存実装）
  - 将来的にレジューム機能検討

## Technology Stack Alignment

| Layer | Technology | Version | Role | Notes |
|-------|-----------|---------|------|-------|
| Frontend | React | 18.2.0 | UIフレームワーク | 既存 |
| Frontend | Ant Design | v6 | UIコンポーネント | Upload, Dragger, Progress, Alert使用 |
| Frontend | Axios | 既存 | HTTP通信 | multipart/form-data対応 |
| Backend | Node.js + Express | 既存 | APIサーバー | multipart処理実装済み |
| Storage | AWS S3 / OpenStack Swift | 既存 | ファイルストレージ | organization_prefix強制 |
| Database | PostgreSQL | 既存 | メタデータ記録 | file_metadataテーブル |

## Implementation Notes

### APIサービスの実装場所
- **ファイル**: `frontend/src/services/fileService.ts`（新規作成）
- **エクスポート**: `uploadFiles` 関数
- **インポート元**: BulkUploadDialog.tsx

### 状態管理の変更
- 既存の`UploadState`インターフェースを維持
- `progress`を実進捗に変更（0-100）
- `uploadedCount`を実カウントに変更

### フォルダ選択の互換性
- Chrome, Firefox, Safari, Edge最新版で動作確認
- iOS Safari, Android Chromeでも対応
- 非対応ブラウザ検出ロジック追加検討

## References
- [Ant Design Upload](https://ant.design/components/upload/) — UIコンポーネント仕様
- [Axios multipart/form-data](https://axios-http.com/docs/multipart) — ファイル送信方法
- [HTML5 File API](https://developer.mozilla.org/en-US/docs/Web/API/File) — File, FileList, webkitRelativePath
- [API仕様 2.7節](../../design/api/api_project_management.md#27-ファイルアップロード) — バックエンドAPI詳細
- [S3構造定義](../../../.clinerules/references/s3_structure.md) — S3フォルダ構成とパス規則
- [フロントエンド規約](../../../.clinerules/development/frontend.md) — React開発規約
