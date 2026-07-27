# タスク計画書: Insertion機能整理（共通コンポーネント化）

## メタデータ
- **作成日時**: 2026-07-24 15:57
- **更新日時**: 2026-07-27 09:12
- **タスクID**: insertion-editor-refactor
- **優先度**: 中
- **推定工数**: 3〜5時間

## 1. タスク概要

TemplateEditorDialog の Insertion 入力UI（テキスト4項目）と、WorkRecordPanel の Insertion 機能（未実装）を整理し、共通コンポーネント `InsertionEditor` として実装する。

**方針**:
- テキスト入力4項目（URI / Hash Method / Hash Value / Format）は常時表示（現行TemplateEditorDialogと同等）
- 「ファイルを選択」ボタンを追加し、ローカルファイルを選択するとURI・Hash Method・Hash Value・Format を自動入力する
- ファイル選択後にサーバーへのアップロード確認ダイアログを表示し、Yesの場合はS3にアップロードしてURIをS3キーで更新する
- `FileExplorerModal`（サーバー上のファイル一覧選択）は作成しない
- **ロジックはカスタムフックに共通化**し、**UIは各画面のレイアウトに合わせた別コンポーネント**として実装する（TemplateEditorDialogとWorkRecordPanelではダイアログサイズ・フォントサイズ・レイアウトが異なるため）

## 2. 目的と期待される成果

### 目的
- TemplateEditorDialog の Insertion 入力を共通コンポーネントに切り出し、再利用性を高める
- WorkRecordPanel の Insertion 機能を実装する
- ローカルファイルを選択するとURI/Hash Method/Hash Value/Formatを自動入力できる機能を提供する
- アップロード確認フローをシンプルに実装する

### 期待される成果
- [x] `useInsertionEditor` カスタムフックを新規作成する（ファイル選択・ハッシュ計算・アップロード確認・S3アップロードのロジックを共通化）
- [x] `InsertionEditorForm.tsx` を新規作成する（TemplateEditorDialog用のFormレイアウト）
- [x] `InsertionEditorCompact.tsx` を新規作成する（WorkRecordPanel用のコンパクトレイアウト）
- [x] `TemplateEditorDialog.tsx` の Insertion 入力欄（Form.Item×4）を `InsertionEditorForm` に置き換え
- [x] `WorkRecordPanel.tsx` に `InsertionEditorCompact` を組み込んだ Insertion 機能を実装（actuals連携・複数Insertion対応）

## 3. 実装ステップ

### Phase 1: 共通ロジックフックと UIコンポーネントの作成

#### Phase 1-1: `useInsertionEditor` カスタムフック

- [ ] `frontend/src/hooks/useInsertionEditor.ts` を新規作成
  - **役割**: ファイル選択 → ハッシュ計算 → 入力値セット → アップロード確認 → S3アップロード → URI更新 の一連のロジックを担う
  - **戻り値**:
    - `insertion`: 現在のInsertion値
    - `handleFileSelect(file: File): Promise<void>` : ファイル選択時の処理
    - `handleFieldChange(field: keyof Insertion, value: string): void` : 手動テキスト編集
    - `isUploading: boolean` : アップロード中フラグ
  - **内部処理**:
    1. `Format` = `file.type`（MIMEタイプ）
    2. `Hash Method` = `process.env.NEXT_PUBLIC_INSERTION_DEFAULT_HASH_METHOD ?? 'SHA-256'`
    3. `Hash Value` = `crypto.subtle.digest(hashMethod, await file.arrayBuffer())` の16進数文字列
    4. `URI` = `file.name`（ファイル名のみ、フルパスはブラウザ制約で取得不可）
    5. 上記4項目を即座に `onChange` で親へ伝播
    6. `Modal.confirm` でアップロード確認を表示:
       - 「アップロード」→ `uploadFiles({ uploadMode: 'single', targetPath: uploadTargetPath, files: [file] })` → 成功時にURIをs3Keyで上書き
       - 「キャンセル」→ 何もしない（URIはfile.nameのまま確定）
  - **引数**:
    ```typescript
    interface UseInsertionEditorOptions {
      value: Insertion;
      onChange: (v: Insertion) => void;
      uploadTargetPath?: string; // 未指定時はアップロード確認ダイアログを出さない
    }
    ```

#### Phase 1-2: `InsertionEditorForm.tsx`（TemplateEditorDialog用）

- [ ] `frontend/src/components/common/InsertionEditorForm.tsx` を新規作成
  - **レイアウト**: 現行TemplateEditorDialogと同等の `Form.Item` レイアウト（ラベル付き・標準フォントサイズ）
  - **UI仕様**:
    ```
    URI:          [____________________________________]  [ファイルを選択]
    Hash Method:  [____________________________________]
    Hash Value:   [____________________________________]
    Format:       [____________________________________]
    ```
  - `useInsertionEditor` フックを呼び出してロジックを委譲
  - `readOnly` 時はテキスト入力・ボタン共に無効化
  - **Props**:
    ```typescript
    interface InsertionEditorFormProps {
      value: Insertion;
      onChange: (v: Insertion) => void;
      readOnly?: boolean;
      /** S3アップロード先パス。未指定時はアップロードボタン非表示 */
      uploadTargetPath?: string;
    }
    ```

#### Phase 1-3: `InsertionEditorCompact.tsx`（WorkRecordPanel用）

- [ ] `frontend/src/components/common/InsertionEditorCompact.tsx` を新規作成
  - **レイアウト**: `PropertyCard` と同じ小型・グリッド馴染みの見た目
    - フォントサイズ: 11〜13px（PropertyCardに準拠）
    - ラベルを上部に小さく表示し、Input欄を下に配置（縦並び）
    - 「ファイルを選択」ボタンはコンパクトなアイコンボタン（`Button icon={<UploadOutlined />}` + `size="small"`）
  - **UI仕様**:
    ```
    URI [📂]
    [_______________]
    Hash Method
    [_______________]
    Hash Value
    [_______________]
    Format
    [_______________]
    ```
  - `useInsertionEditor` フックを呼び出してロジックを委譲
  - `readOnly` 時はテキスト入力・ボタン共に無効化
  - **Props**: `InsertionEditorFormProps` と同一型

### Phase 2: TemplateEditorDialog の修正

- [ ] `TemplateEditorDialog.tsx` の Insertion セクション（Form.Item × 4）を `InsertionEditorForm` に置き換え
  - `value={insertion}`
  - `onChange={(v) => { setInsertion(v); setHasChanges(true); }}`
  - `readOnly={false}`
  - `uploadTargetPath`: `editingFileName`（例: `projectName.maiml`）からプロジェクト名を取り出し `projects/${projectName}/attachments` を渡す
    - `editingFileName` は `PetriNetEditorInnerProps.editingFileName` として存在するため、TemplateEditorDialogにpropsとして渡す（または内部でcontextから取得）

### Phase 3: WorkRecordPanel の Insertion 実装

- [ ] `WorkRecordPanel.tsx` の PropertyList コンポーネントにInsertionセクションを追加
  - `MockTemplate` 型に `insertions?: { id: string; label?: string }[]` を追加（型拡張）
  - テンプレートに `insertions` フィールドがある場合、各insertionに対して `InsertionEditorCompact` を表示
  - InsertionEditorの`value`は`TaskTransitionState.actuals`に `insertion_{id}` キーとして管理
  - `uploadTargetPath` は将来的な実API接続時のためにpropsで受け取れる設計にする（現状モックのため空でもよい）
  - `onActualChange` コールバックでInsertionの変化を親へ伝播

## 4. 影響範囲

### 新規作成するファイル
1. `frontend/src/hooks/useInsertionEditor.ts` - Insertion操作の共通ロジック（ハッシュ計算・アップロード確認・S3アップロード）
2. `frontend/src/components/common/InsertionEditorForm.tsx` - TemplateEditorDialog用Insertionコンポーネント（Form.Itemレイアウト）
3. `frontend/src/components/common/InsertionEditorCompact.tsx` - WorkRecordPanel用Insertionコンポーネント（PropertyCard風コンパクトレイアウト）

### 修正するファイル
1. `frontend/src/components/editorv2/TemplateEditorDialog.tsx` - InsertionセクションをInsertionEditorFormに置き換え
2. `frontend/src/components/editorv2/PetriNetEditorInner.tsx` - TemplateEditorDialogに`editingFileName`を渡す（既に渡している場合は不要）
3. `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` - Insertion機能を実装

### 削除するファイル
- なし（`FileExplorerModal.tsx`は作成しないため削除対象もなし）

### 影響を受ける機能
- TemplateEditorDialog：Insertionの入力動作（既存のInput×4 → InsertionEditor。機能は同等、ファイル選択機能が追加）
- WorkRecordPanel：Insertion未実装部分の新規追加

## 5. 技術的詳細

### 使用する型

```typescript
// types/maiml-unified.ts（既存）
interface Insertion {
  uri: string;
  hash?: { method: string; value: string };
  format?: string;
}
```

### ハッシュ計算ロジック（DataRecordDialogと同一）

```typescript
const hashMethod = process.env.NEXT_PUBLIC_INSERTION_DEFAULT_HASH_METHOD ?? 'SHA-256';
const arrayBuffer = await file.arrayBuffer();
const hashBuffer = await crypto.subtle.digest(hashMethod, arrayBuffer);
const hashArray = Array.from(new Uint8Array(hashBuffer));
const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
```

### Hash Method の環境変数設定

```bash
# frontend/.env.local（デフォルト不要、未設定時は SHA-256）
NEXT_PUBLIC_INSERTION_DEFAULT_HASH_METHOD=SHA-256
```

### 使用する既存API・サービス

- `frontend/src/services/fileAccessService.ts` - `uploadFiles({ uploadMode: 'single', targetPath, files })` : ファイルアップロード

### InsertionEditor の UI 仕様

```
URI:          [____________________________________]  [ファイルを選択]
Hash Method:  [____________________________________]
Hash Value:   [____________________________________]
Format:       [____________________________________]
```

ファイル選択後のアップロード確認ダイアログ:
```
┌─────────────────────────────────────────────┐
│ ファイルをサーバーにアップロードしますか？     │
│ example_file.csv                             │
│                 [キャンセル]  [アップロード]  │
└─────────────────────────────────────────────┘
```
- 「アップロード」: `uploadFiles()` 実行 → 成功時にURIをs3Keyで上書き
- 「キャンセル」: 何もしない（URIはfile.nameのまま確定済み）

### uploadTargetPath の構築方法（TemplateEditorDialog）

`editingFileName` が `"sample_project.maiml"` の場合:
```typescript
const projectName = editingFileName?.replace(/\.maiml$/, '') ?? '';
const uploadTargetPath = projectName ? `projects/${projectName}/attachments` : undefined;
```

## 6. リスク対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| TemplateEditorDialog の動作変更による既存データの影響 | 中 | 低 | InsertionEditorのvalueはInsertionと同じ型のため、既存データは変わらない |
| `editingFileName` が TemplateEditorDialog で取得できない | 中 | 低 | PetriNetEditorInnerのpropsに既存（`editingFileName`として存在）、必要に応じてTemplateEditorDialogにpropsとして追加 |
| WorkRecordPanel が現在モックデータのみで `projectName` が未定 | 低 | 高 | `uploadTargetPath` を未指定のまま実装し、「ファイルを選択」ボタンのみ表示してアップロード機能はスキップ。実API接続時に `projectName` propを追加して有効化する |
| ハッシュ計算中（大容量ファイル）にUIがブロックされる | 低 | 低 | `crypto.subtle.digest` は非同期のため問題なし。必要に応じてローディング表示追加 |
| アップロード中のエラーハンドリング | 中 | 中 | `uploadFiles` 既存のエラーハンドリングを使用、エラー時は`message.error`で通知 |

## 7. テスト計画

### 手動テスト
- [ ] InsertionEditor: テキスト直接入力でvalue/onChangeが正常に動作すること
- [ ] InsertionEditor: 「ファイルを選択」でファイル選択 → URI/Hash Method/Hash Value/Format が自動入力されること
- [ ] InsertionEditor: アップロード確認ダイアログで「アップロード」→ S3アップロード成功 → URIがs3Keyに更新されること
- [ ] InsertionEditor: アップロード確認ダイアログで「キャンセル」→ URIはfile.nameのまま維持されること
- [ ] TemplateEditorDialog: 既存のInsertion入力がInsertionEditorに置き換え後も同等に動作すること（保存 → XML出力も同じ）
- [ ] WorkRecordPanel: InsertionEditorが表示されること（mockデータにinsertions追加時）
- [ ] エラー時（アップロード失敗など）にエラーメッセージが表示されること

## 8. 承認記録

- **計画書初版提示日時**: 2026-07-24 15:57
- **計画書更新日時**: 2026-07-24 16:26
- **承認日時**: 2026-07-24 16:26（ユーザーによりActモード切り替えで承認確認）
- **承認者コメント**: FileExplorerModalは不要、テキスト+ファイル選択ボタン+アップロード確認の方針で確定
