# UI仕様書: Petri Netエディタスクリーン

## 1. 概要

### 1.1 目的
MAIMLファイルをフルスクリーンで編集するためのエディタ画面。ProjectManagementまたはFormatManagementから呼び出され、Petri Net形式でMAIMLファイルを視覚的に編集する。

### 1.2 使用場面
- プロジェクト管理画面からMAIMLファイルを編集する場合（editMode='project'）
- フォーマット管理画面からフォーマットファイルを編集する場合（editMode='format'）

### 1.3 アクセス権限
- **実験管理者（Experiment Admin）**: 読み取り・編集可能

---

## 2. 画面構成

### 2.1 レイアウト構造

```
┌─────────────────────────────────────────────────────────────┐
│ ヘッダーバー                                                  │
│ [← 戻る] [タイトル・サブタイトル]         [● 未保存の変更]   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│                 PetriNetEditorInner                          │
│                 （React Flow編集エリア）                      │
│                                                               │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 UI要素

#### ヘッダーバー
- **戻るボタン**: 編集画面を閉じて元の画面に戻る（ラベル: `t('editor.screen.back')`）（2026-09-09 修正: i18n対応）
- **タイトル**: 
  - editMode='project': `t('editor.screen.titleProject') + ' - ' + displayTitle`（2026-09-09 修正: i18n対応）
  - editMode='format': `t('editor.screen.titleFormat') + ' - ' + displayTitle`（2026-09-09 修正: i18n対応）
- **サブタイトル**: displaySubtitle（存在する場合のみ表示）
- **未保存変更インジケーター**: hasUnsavedChangesがtrueの場合に表示

#### エディタ本体
- **PetriNetEditorInner**: Petri Net編集コンポーネント（ReactFlowProviderでラップ）

#### ローディング画面
- **Spin**: ファイル読み込み中に表示

---

## 3. 機能仕様

### 3.1 Props定義

```typescript
interface PetriNetEditorScreenProps {
  /** 編集パラメータ（共通型） */
  params: MaimlEditorParams;
  /** 画面を閉じるコールバック */
  onClose: () => void;
}

// MaimlEditorParams型の内容（@/types/maimlEditor.ts で定義）
interface MaimlEditorParams {
  editMode: 'project' | 'format';
  editingFileName: string;
  originalFileName: string;
  sourceS3Key: string;
  displayTitle: string;
  displaySubtitle?: string;
  documentId?: string;
  description?: string;
  /**
   * エディタ起動時に DraftManager を自動表示するかどうか（任意）。
   * MAIMLファイルが存在せず、バックエンドDraftがある場合に使用。
   * （2026-09-09 追加）
   */
  openDraftManagerOnStart?: boolean;
  /**
   * プロジェクトが属する組織グループCD（任意）。
   * TemplateEditorDialog の用語スコープ絞り込みに使用する。
   * （2026-09-09 追加）
   */
  organizationGroupCd?: string;
  /**
   * MAIMLファイルがS3に登録済みかどうか（任意）。
   * false の場合、API呼び出しをスキップして新規作成モードで起動する。
   * undefined の場合は従来通り API を呼び出す（後方互換）。
   * （2026-09-09 追加）
   */
  maimlFileRegistered?: boolean;
}
```

### 3.2 State管理

```typescript
// ローディング状態
const [isLoading, setIsLoading] = useState<boolean>(true);

// MAIMLファイルの内容（文字列）
const [maimlContent, setMaimlContent] = useState<string | null>(null);

// 未保存の変更があるか
const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
```

### 3.3 主要機能

#### 3.3.1 MAIMLファイルの読み込み

**トリガー**: useEffect（sourceS3Keyが変更されたとき）

**処理フロー**:
1. `params.maimlFileRegistered === false` の場合: API呼び出しをスキップして `maimlContent = null` のまま新規作成モードで起動（2026-09-09 追加）
2. `setIsLoading(true)`
3. `getFileContentAsText(sourceS3Key)` でS3からファイル取得
4. 取得成功:
   - `setMaimlContent(content)` - 内容を設定
   - コンソールログ: ✅ 読み込み成功、文字列長を出力
5. 取得失敗またはnull:
   - `setMaimlContent(null)` - 新規作成モード
   - コンソールログ: ✅ 新規作成モード
6. `setIsLoading(false)`

**新規作成モード**:
- `maimlFileRegistered === false` の場合（明示的未登録）: S3 API呼び出し不要なため即座に新規作成モードで開始
- ファイルが存在しない場合（404エラーやnull）: `maimlContent=null` で新規作成として扱う

#### 3.3.2 戻るボタンの処理

**トリガー**: 戻るボタンクリック（`useCallback` でメモ化）

**処理フロー**:
1. `hasUnsavedChanges`をチェック
2. 未保存変更がある場合:
   - `window.confirm(t('editor.screen.confirmDiscard'))` で確認ダイアログ表示（i18n対応・2026-09-09 修正）
   - ユーザーが「OK」: `onClose()` を呼び出し
   - ユーザーが「キャンセル」: 何もしない
3. 未保存変更がない場合:
   - `onClose()` を呼び出し

#### 3.3.3 コンテンツ変更の検知

**トリガー**: PetriNetEditorInnerからの通知（未実装、将来的な拡張ポイント）

**処理フロー**:
1. `hasUnsavedChanges`がfalseの場合のみ
2. `setHasUnsavedChanges(true)` に変更
3. コンソールログ: 📝 変更を検知

**注**: 現在は`handleContentChange`コールバックが定義されているが、PetriNetEditorInnerに渡されていない

---

## 4. データ仕様

### 4.1 Props型定義

```typescript
interface PetriNetEditorScreenProps {
  params: MaimlEditorParams;
  onClose: () => void;
}

interface MaimlEditorParams {
  editMode: 'project' | 'format';
  editingFileName: string;
  originalFileName?: string;
  sourceS3Key: string;
  displayTitle: string;
  displaySubtitle?: string;
  documentId?: string;
  description?: string;
}
```

### 4.2 State型定義

```typescript
const isLoading: boolean;
const maimlContent: string | null;
const hasUnsavedChanges: boolean;
```

---

## 5. API連携

### 5.1 ファイル取得API

| 関数 | 説明 | パラメータ | 戻り値 |
|------|------|----------|--------|
| `getFileContentAsText` | S3からMAIMLファイルをテキストとして取得 | `s3Key: string` | `Promise<string \| null>` |

**エラーハンドリング**:
- ファイルが存在しない場合はnullを返す
- エラーが発生した場合もnullを返し、新規作成モードとして続行

---

## 6. 子コンポーネント

### 6.1 PetriNetEditorInner

**Props**:
```typescript
{
  maimlData: string | null;
  editingFileName: string;
  editMode: 'project' | 'format';
  originalFileName?: string;
  sourceS3Key: string;
  initialDocumentId?: string;
  initialDescription?: string;
}
```

**役割**: Petri Net編集の本体（React Flowを使用したノード・エッジ編集）

### 6.2 ReactFlowProvider

**役割**: React Flowのコンテキストを提供（PetriNetEditorInnerをラップ）

---

## 7. スタイリング

### 7.1 画面全体
- **width**: 100vw
- **height**: 100vh
- **display**: flex（縦方向）
- **overflow**: hidden
- **backgroundColor**: #ffffff

### 7.2 ヘッダーバー
- **padding**: 12px 16px
- **borderBottom**: 1px solid #f0f0f0
- **display**: flex（横方向）
- **alignItems**: center
- **gap**: 16px
- **backgroundColor**: white
- **boxShadow**: 0 2px 8px rgba(0,0,0,0.06)
- **zIndex**: 10

### 7.3 タイトル
- **fontSize**: 18px
- **fontWeight**: 600
- **color**: #262626

### 7.4 サブタイトル
- **fontSize**: 14px
- **color**: #8c8c8c

### 7.5 未保存変更インジケーター
- **padding**: 4px 12px
- **backgroundColor**: #fff7e6
- **border**: 1px solid #ffd591
- **borderRadius**: 4px
- **fontSize**: 14px
- **color**: #d46b08

### 7.6 ローディング画面
- **display**: flex
- **justifyContent**: center
- **alignItems**: center
- **height**: 100vh
- **backgroundColor**: #f0f2f5

---

## 8. エラーハンドリング

### 8.1 ファイル読み込みエラー

**発生条件**: 
- S3からのファイル取得に失敗
- ファイルが存在しない

**対応**: 
- エラーをコンソールに出力（❌マーク付き）
- `maimlContent = null` として新規作成モードで続行
- ユーザーにエラーメッセージは表示しない（新規作成として扱う）

### 8.2 未保存変更の破棄確認

**発生条件**: 
- 未保存変更がある状態で戻るボタンをクリック

**対応**: 
- ブラウザネイティブの`window.confirm()`で確認
- メッセージ: 「保存されていない変更があります。破棄して戻りますか？」

---

## 9. 実装ファイル

### 9.1 メインファイル
- **パス**: `frontend/src/components/editorv2/PetriNetEditorScreen.tsx`
- **行数**: 約210行
- **言語**: TypeScript + React

### 9.2 関連ファイル
- `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - エディタ本体
- `frontend/src/services/fileAccessService.ts` - ファイルアクセスサービス
- `frontend/src/types/maimlEditor.ts` - 型定義

### 9.3 依存ライブラリ
- `react` - Reactフレームワーク
- `antd` - Ant Designコンポーネント（Button, Spin, message）
- `reactflow` - React Flow（ReactFlowProvider）

---

## 10. 特記事項

### 10.1 旧Propsの廃止

以前は`projectId`, `projectName`, `projectOverview`を個別のPropsとして受け取っていたが、現在は`MaimlEditorParams`型に一本化されている。

### 10.2 新規作成モード

ファイルが存在しない場合（S3から取得できない場合）は、`maimlContent = null`として新規作成モードで動作する。PetriNetEditorInnerが空のPetri Netを生成する。

### 10.3 未保存変更の検知

`PetriNetEditorInnerProps` に `onContentChange`（未保存変更フラグ設定）と `onContentSaved`（保存完了後フラグリセット）コールバックが追加済み（2026-09-09 更新）。`PetriNetEditorScreen` では `handleContentChange` を `onContentChange` として `PetriNetEditorInner` に渡している。

### 10.4 ReactFlowProvider

React Flowを使用するため、PetriNetEditorInnerを`<ReactFlowProvider>`でラップする必要がある。これにより、React Flowのコンテキスト（ノード・エッジの状態管理）が提供される。

### 10.5 フルスクリーン表示

この画面は100vw x 100vhのフルスクリーン表示となり、元の画面（ProjectManagement / FormatManagement）を完全に覆う。

---

## 11. 変更履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-03-11 | 実装ベースでUI仕様書を新規作成 | Cline |
| 2026-09-09 | ソースコードとの照合に基づき更新（2026-09-09）：①§2.2 ヘッダーバーのタイトル・戻るボタンラベルを i18n キー（`t('editor.screen.back')` / `t('editor.screen.titleProject')` / `t('editor.screen.titleFormat')`）に修正。②§3.1 `MaimlEditorParams` 型定義に `openDraftManagerOnStart`・`organizationGroupCd`・`maimlFileRegistered` を追加。③§3.3.1 MAIMLファイル読み込みフローに `maimlFileRegistered === false` 時のAPI呼び出しスキップ処理を追記。④§3.3.2 戻るボタンの確認文言を `t('editor.screen.confirmDiscard')` に修正、`useCallback` メモ化を明記。⑤§10.3 未保存変更検知の実装状況を更新（`onContentChange`/`onContentSaved` Props追加済み）| Cline |

---

## 12. 参考情報

### 12.1 呼び出し元

- **ProjectManagement**: プロジェクト内のMAIMLファイルを編集
- **FormatManagement**: フォーマットファイルを編集

### 12.2 関連UI仕様書

- `ui_petri_net_editor.md` - PetriNetEditorInnerの詳細仕様（Phase 6-2で作成予定）
- `ui_project_management.md` - プロジェクト管理画面
- `ui_format_management.md` - フォーマット管理画面
