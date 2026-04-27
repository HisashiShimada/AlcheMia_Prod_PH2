# タスク計画書: コンソールエラー・警告修正（antd 非推奨 API 対応）

## メタデータ
- **作成日時**: 2026-04-22 10:58
- **更新日時**: 2026-04-22 11:05
- **タスクID**: fix-console-errors-antd-deprecated
- **優先度**: 低
- **推定工数**: 0.5時間

---

## タスク概要

フロントエンドのコンソールに出力されるエラー・警告を調査し、原因箇所を特定して修正する。
主に Ant Design のバージョンアップに伴う非推奨 API の置き換えが対象。
新たなエラーが発見された場合は、本計画書の「エラー一覧」および「エラー発生箇所詳細」に追記して管理する。

---

## 目的と期待される成果

- [ ] コンソールエラー・警告の解消
- [ ] Ant Design 最新 API への追従
- [ ] 発見したエラーをすべて本計画書に記録・追跡

---

## エラー一覧

> 新しいエラーが見つかった場合は、以下のテーブルに行を追加し、「エラー発生箇所詳細」セクションにも対応する No. のセクションを追記すること。

### ■ 実験管理者

| No. | 発生ファイル | 行番号 | エラー概要 | ステータス |
|-----|------------|--------|-----------|----------|
| 1 | `frontend/src/components/project/FileListTable.tsx` | 396 | [antd: Modal] `destroyOnClose` 非推奨 | 対応済 |
| 2 | `frontend/src/components/project/RenameProjectModal.tsx` | 85 | [antd: Modal] `destroyOnClose` 非推奨 | 対応済 |
| 3 | `frontend/src/components/project/ProjectManagement.tsx` | 47 / 1397 | [antd: message] 静的関数で動的テーマ非対応 | 対応済 |
| 4 | `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` | 357-358 | `useForm` 未接続状態で `resetFields()` 呼び出し | 対応済 |
| 5 | `frontend/src/components/project/RenameProjectModal.tsx` | 4 / 49・60・64 | [antd: message] 静的インポート | 対応済 |
| 6 | `frontend/src/components/project/ProjectManagement.tsx` | `IssueManagementModal` 呼び出し箇所 | `useForm` 未接続警告（`IssueManagementModal` 常時マウント） | 対応済 |
| 7 | `frontend/src/utils/formatApi.ts` / `frontend/src/components/project/FormatManagement.tsx` / `frontend/src/components/project/CreateFormatModal.tsx` | 192 / 877 / 60 | 409（フォルダ重複）時に不要な `console.error` が3重出力 | 対応済 |
| 8 | `frontend/src/components/editorv2/components/EditorToolbar.tsx` | 185他（計8箇所） | [antd: Divider] `type` 非推奨 | 対応済 |
| 9 | `backend/src/server.ts` / `frontend/src/services/maimlApiService.ts` / `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | server.ts: express.json()行 / maimlApiService.ts: 71 / PetriNetEditorInner.tsx: 915 | MAIML バリデーション API が 413（Express ボディサイズ制限超過） | 対応済 |
| 10 | `frontend/src/components/editorv2/components/DocumentEditDialog.tsx` | 24 | [antd: message] 静的インポート | 対応済 |
| 11 | `frontend/src/components/editorv2/components/DocumentEditDialog.tsx` | 523他（計4箇所） | [antd: Alert] `message` → `title` に変更 | 対応済 |
| 12 | `frontend/src/components/editorv2/components/MultiObjectEditor.tsx` | `Alert` 使用箇所（2箇所） | [antd: Alert] `message` → `title` に変更 | 対応済 |
| 13 | `frontend/src/components/editorv2/components/ValidationPanel.tsx` | 197〜265 / 278〜324 | [rc-collapse] `children`/`Panel` 記法 → `items` 形式に変換（2箇所） | 対応済 |
| 14 | `frontend/src/components/editorv2/components/ValidationPanel.tsx` | 407 | [antd: Alert] `message` → `title` に変更 | 対応済 |
| 15 | `frontend/src/components/progress/PetriNetVisualization.tsx` | `parseMaiml(fileKey)` 呼び出し箇所 | fileKey をXMLとして誤送信 → `POST /maiml/parse` が 500 | 対応済 |
| 16 | `frontend/src/components/progress/PetriNetVisualization.tsx` | 431 / 946 | `parseMaiml` 誤用 → 500エラー＋`node.data` undefined TypeError | 対応済 |
| 17 | `frontend/src/components/progress/PetriNetVisualization.tsx` | 1171 | [antd: Divider] `type` 非推奨 | 対応済 |

### ■ 実験作業者

| No. | 発生ファイル | 行番号 | エラー概要 | ステータス |
|-----|------------|--------|-----------|----------|
| 18 | `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` / `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | ExperimentRecordTab: 540他（計3箇所）/ DataRecordDialog: 2780 | [antd: Space] `direction` 非推奨（3箇所）・`useForm` 未接続・[antd: Alert] `message` → `title`（1箇所） | 対応済 |
| 19 | `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` | - | `useForm` 未接続警告（`DataRecordDialog` 常時描画） | 対応済 |
| 20 | `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` / `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` | - | `useForm` 未接続警告（`IssueManagementModal` 常時描画 / `commentForm` 未接続） | 対応済 |
| 21 | `frontend/src/components/ExperimentWorker/TransitionList.tsx` | 534 | [antd: Table] `pagination.position` 非推奨 | 対応済 |
| 22 | `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` | `<Modal forceRender>` 行 | `useForm` 未接続警告（`forceRender` と条件レンダリングの相反） | 対応済 |
| 23 | `frontend/src/components/ExperimentWorker/TransitionList.tsx` | 562 | `useForm` 未接続警告（`DataRecordDialog` 常時マウント） | 対応済 |
| 24 | `frontend/src/components/ExperimentWorker/TransitionList.tsx` | `IssueManagementModal` 呼び出し箇所 | `useForm` 未接続警告（`IssueManagementModal` 常時マウント） | 対応済 |
| 25 | `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` | `IssueManagementModal` 呼び出し箇所 | `useForm` 未接続警告（`IssueManagementModal` 常時マウント） | 対応済 |
> 各エラーの詳細情報・修正内容を記載する。新しいエラーが見つかった場合は `### No.N：...` のセクションを末尾に追加すること。

---

## エラー発生箇所詳細

### ■ 実験管理者

### No.1：[antd: Modal] `destroyOnClose` 非推奨警告

| 項目 | 内容 |
|------|------|
| **画面名** | 実験管理者 > プロジェクト管理 |
| **操作トリガー** | ファイル名変更モーダルを開いたとき |
| **発生ファイル** | `frontend/src/components/project/FileListTable.tsx` |
| **行番号** | 396行目 |
| **エラーメッセージ** | `Warning: [antd: Modal] destroyOnClose is deprecated. Please use destroyOnHidden instead.` |
| **スタックトレース** | `FileListTable` ← `ProjectManagementInner` ← `ProjectManagement` ← `ExperimentAdminMenu` ← `HomeContent` ← `Home` |

#### 修正内容

ファイル名変更モーダルの `destroyOnClose` を `destroyOnHidden` に変更する。

```tsx
// 変更前（396行目付近）
<Modal
  title="名前の変更"
  ...
  destroyOnClose
>

// 変更後
<Modal
  title="名前の変更"
  ...
  destroyOnHidden
>
```

---

### No.2：[antd: Modal] `destroyOnClose` 非推奨警告

| 項目 | 内容 |
|------|------|
| **画面名** | 実験管理者 > プロジェクト管理 |
| **操作トリガー** | プロジェクト名変更モーダルを開いたとき |
| **発生ファイル** | `frontend/src/components/project/RenameProjectModal.tsx` |
| **行番号** | 85行目 |
| **エラーメッセージ** | `Warning: [antd: Modal] destroyOnClose is deprecated. Please use destroyOnHidden instead.` |
| **スタックトレース** | `RenameProjectModal` ← `ProjectManagement` ← `ExperimentAdminMenu` ← `HomeContent` ← `Home` |

#### 修正内容

プロジェクト名変更モーダルの `destroyOnClose` を `destroyOnHidden` に変更する。

```tsx
// 変更前（85行目付近）
<Modal
  title={t('projectManagement.rename.title')}
  ...
  destroyOnClose
>

// 変更後
<Modal
  title={t('projectManagement.rename.title')}
  ...
  destroyOnHidden
>
```

---

### No.3：[antd: message] 静的関数で動的テーマコンテキスト非対応

| 項目 | 内容 |
|------|------|
| **画面名** | 実験管理者 > プロジェクト管理 |
| **操作トリガー** | プロジェクトダウンロードボタン押下後 |
| **発生ファイル** | `frontend/src/components/project/ProjectManagement.tsx` |
| **行番号** | 47行目（静的インポート）、1397行目（エラー発生箇所） |
| **エラーメッセージ** | `Warning: [antd: message] Static function can not consume context like dynamic theme. Please use 'App' component instead.` |
| **スタックトレース** | `ProjectManagementInner.useCallback[handleProjectDownload]` ← `ProjectManagement` ← `ExperimentAdminMenu` ← `HomeContent` ← `Home` |

#### 修正内容

`message` の静的インポートを削除し、`App.useApp()` フック経由で取得する。

```tsx
// 変更前（47行目）
import { message } from 'antd';  // 静的インポート

// 変更後: antd の import から message を削除し App を追加
import { App, ... } from 'antd';

// ProjectManagementInner コンポーネント内に追加
const { message } = App.useApp();
```

影響箇所: `message.success` / `message.error` / `message.warning` の呼び出し 48箇所（すべて同一コンポーネント内）

---

### No.8：[antd: Divider] `type` 非推奨警告

| 項目 | 内容 |
|------|------|
| **画面名** | 実験管理者 > MAIML エディタ |
| **操作トリガー** | 編集ボタン押下後（エディタ画面表示時） |
| **発生ファイル** | `frontend/src/components/editorv2/components/EditorToolbar.tsx` |
| **行番号** | 185行目他（計8箇所） |
| **エラーメッセージ** | `Warning: [antd: Divider] type is deprecated. Please use orientation instead.` |
| **スタックトレース** | `EditorToolbar` ← `PetriNetEditorInnerUI` ← `PetriNetEditorContent` ← `PetriNetEditorInner` ← `PetriNetEditorScreen` ← `ExperimentAdminMenu` |

#### 修正内容

`type="vertical"` を `orientation="vertical"` に置換する（8箇所一括）。

```tsx
// 変更前
<Divider type="vertical" style={{ height: 24 }} />

// 変更後
<Divider orientation="vertical" style={{ height: 24 }} />
```

---

### No.10：[antd: message] 静的インポート（DocumentEditDialog）

| 項目 | 内容 |
|------|------|
| **画面名** | 実験管理者 > MAIML エディタ > Document編集ダイアログ |
| **操作トリガー** | Document編集ダイアログ内での操作時 |
| **発生ファイル** | `frontend/src/components/editorv2/components/DocumentEditDialog.tsx` |
| **行番号** | 24行目（静的インポート） |
| **エラーメッセージ** | `Warning: [antd: message] Static function can not consume context like dynamic theme.` |

#### 修正内容

`message` の静的インポートを削除し、`App.useApp()` フック経由で取得する。

```tsx
// 変更前（24行目）
import { ..., message } from 'antd';

// 変更後: App を追加して message を削除
import { App, ..., } from 'antd';

// DocumentEditDialog コンポーネント内に追加
const { message } = App.useApp();
```

---

### No.12：[rc-collapse] `children`/`Panel` 記法 → `items` 形式に変換（MultiObjectEditor）

| 項目 | 内容 |
|------|------|
| **画面名** | 実験管理者 > MAIML エディタ > Document編集ダイアログ |
| **操作トリガー** | Document編集ダイアログを開いたとき（MultiObjectEditor が描画されるとき） |
| **発生ファイル** | `frontend/src/components/editorv2/components/MultiObjectEditor.tsx` |
| **行番号** | `const { Panel } = Collapse;` および `<Panel>` 使用箇所（2箇所） |
| **エラーメッセージ** | `Warning: [rc-collapse] children will be removed in next major version. Please use items instead.` |
| **原因** | `Collapse.Panel` の旧 children 記法を使用している。Ant Design v5 以降では `items` 配列形式が推奨される。 |

#### 修正内容

`const { Panel } = Collapse;` を削除し、`<Collapse>` に `items` プロパティを使用する記法に変換する（2箇所）。

```tsx
// 変更前
const { Panel } = Collapse;
...
<Collapse activeKey={isExpanded ? ['1'] : []}>
  <Panel header={panelHeader} key="1">
    {/* コンテンツ */}
  </Panel>
</Collapse>

// 変更後
  activeKey={isExpanded ? ['1'] : []}
  items={[{
    key: '1',
    label: panelHeader,
    children: (
      {/* コンテンツ */}
    ),
  }]}
/>
```

---

### No.11：[antd: Alert] `message` → `title` に変更（MultiObjectEditor）

| 項目 | 内容 |
|------|------|
| **画面名** | 実験管理者 > MAIML エディタ > Document編集ダイアログ |
| **操作トリガー** | Document編集ダイアログを開いたとき（MultiObjectEditor が描画されるとき） |
| **発生ファイル** | `frontend/src/components/editorv2/components/MultiObjectEditor.tsx` |
| **行番号** | `Alert` 使用箇所（2箇所） |
| **エラーメッセージ** | `Warning: [antd: Alert] message is deprecated. Please use title instead.` |

#### 修正内容

`message=` を `title=` に置換する（2箇所）。

```tsx
// 変更前（箇所1: マスタデータから追加された項目の Alert）
<Alert
  message="📌 マスタデータから追加された項目"
  description="この項目はマスタデータから追加されたため、編集できません。"
  ...
/>

// 変更後
<Alert
  title="📌 マスタデータから追加された項目"
  description="この項目はマスタデータから追加されたため、編集できません。"
  ...
/>

// 変更前（箇所2: 未登録警告の Alert）
<Alert
  message={`${title}が登録されていません。最低${minItems}件必要です。`}
  type="warning"
/>

// 変更後
<Alert
  title={`${title}が登録されていません。最低${minItems}件必要です。`}
  type="warning"
/>
```

---

### No.5：[antd: message] 静的インポート（RenameProjectModal）

| 項目 | 内容 |
|------|------|
| **画面名** | 実験管理者 > プロジェクト管理 |
| **操作トリガー** | プロジェクト名を変更し保存したとき |
| **発生ファイル** | `frontend/src/components/project/RenameProjectModal.tsx` |
| **行番号** | 4行目（静的インポート）、49行目（成功時 `message.success`）、60・64行目（エラー時 `message.error`） |
| **エラーメッセージ** | `Warning: [antd: message] Static function can not consume context like dynamic theme. Please use 'App' component instead.` |
| **スタックトレース** | `RenameProjectModal.handleOk` ← `ProjectManagement` ← `ExperimentAdminMenu` ← `HomeContent` ← `Home` |

#### 修正内容

`message` の静的インポートを削除し、`App.useApp()` フック経由で取得する。

```tsx
// 変更前（4行目）
import { Modal, Form, Input, message } from 'antd';

// 変更後: App を追加し message を削除
import { App, Modal, Form, Input } from 'antd';

// RenameProjectModal コンポーネント内（useLanguage の直下）に追加
const { message } = App.useApp();
```

影響箇所: `handleOk` 内の `message.success`（49行目）、`message.error`（60・64行目）の計3箇所

---

### No.7：409（フォルダ重複）時に不要な `console.error` が3重出力される

| 項目 | 内容 |
|------|------|
| **画面名** | 実験管理者 > フォーマット管理 |
| **操作トリガー** | 新規フォーマットフォルダ作成ボタンを押下し、既存フォルダ名を入力して作成ボタンを押下したとき |
| **発生ファイル** | `frontend/src/utils/formatApi.ts`（192行目）、`frontend/src/components/project/FormatManagement.tsx`（877行目）、`frontend/src/components/project/CreateFormatModal.tsx`（60行目） |
| **エラーメッセージ** | `AxiosError: Request failed with status code 409` |
| **スタックトレース** | `createFormatFolder (formatApi.ts:174)` ← `FormatManagement.handleCreateFormat (FormatManagement.tsx:864)` ← `CreateFormatModal.handleSubmit (CreateFormatModal.tsx:50)` |
| **原因** | 409（E6006: フォルダ重複）は正常なバリデーション結果だが、3層すべてで `console.error` が呼ばれているため同一エラーがコンソールに3回出力される。`CreateFormatModal` は最終的に `setErrorMessage()` でフォーム内にエラーを表示しており、ユーザーへの通知は正常に機能している |

#### 修正内容

各層の `console.error` を削除する。

```ts
// formatApi.ts 192行目
// 変更前
console.error('createFormatFolder error:', error);
// 変更後: 削除

// FormatManagement.tsx 877行目
// 変更前
console.error('❌ [FormatManagement] フォルダ作成エラー:', error);
// 変更後: 削除

// CreateFormatModal.tsx 60行目
// 変更前
console.error('❌ [CreateFormatModal] エラー:', error);
// 変更後: 削除
```

---

### No.9：MAIML バリデーション API が 413 を返す（Express ボディサイズ制限超過）

| 項目 | 内容 |
|------|------|
| **画面名** | 実験管理者 > MAIML エディタ |
| **操作トリガー** | フォーマット管理の編集ボタン押下後（エディタ画面遷移時の自動バリデーション実行） |
| **発生ファイル** | `backend/src/server.ts`（`express.json()` 行）、`frontend/src/services/maimlApiService.ts`（71行目）、`frontend/src/components/editorv2/PetriNetEditorInner.tsx`（915行目） |
| **エラーメッセージ** | `AxiosError: Request failed with status code 413` / `❌ [PetriNetEditorInner] 自動バリデーション例外: {}` |
| **スタックトレース** | `validateMaiml (maimlApiService.ts:71)` ← `PetriNetEditorContent.useEffect.fetchPetriNetData (PetriNetEditorInner.tsx:915)` |
| **原因** | `backend/src/server.ts` の `express.json()` にサイズ制限が未指定のためデフォルト値（100KB）が適用されている。フロント側では MAIML の XML 文字列を Base64 エンコード（約1.33倍に増大）してから送信するため、ある程度の規模のファイルで 100KB を超え HTTP 413 が発生する。nginx は `client_max_body_size 500M` が設定されており問題なし。 |

#### 修正内容

`backend/src/server.ts` の `express.json()` と `express.urlencoded()` に `{ limit: '50mb' }` を追加する。

```ts
// 変更前
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 変更後
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
```

---

### No.15：`PetriNetVisualization` で fileKey を XML として誤送信（POST /maiml/parse 500 エラー）

| 項目 | 内容 |
|------|------|
| **画面名** | 実験管理者 > 進捗管理 > 詳細表示 |
| **操作トリガー** | 進捗管理画面でプロジェクトの「詳細表示」ボタンを押下（ペトリネット描画時） |
| **発生ファイル** | `frontend/src/components/progress/PetriNetVisualization.tsx` |
| **行番号** | `parseMaiml(fileKey)` 呼び出し箇所（`fetchPetriNetStructure` 内） |
| **エラーメッセージ** | `AxiosError: Request failed with status code 500`（`POST /maiml/parse`） |
| **スタックトレース** | `parseMaiml (maimlApiService.ts:211)` ← `PetriNetVisualization.useCallback[fetchPetriNetStructure] (PetriNetVisualization.tsx:426)` |
| **原因** | `parseMaiml(content)` は XML 文字列を期待しているが、`fileKey`（ストレージパス文字列、例: `550e8400-.../projects/xxx/xxx.maiml`）をそのまま第1引数に渡しているため、バックエンドで XML パースに失敗して 500 が発生する。コメントには `// ペトリネット構造取得: POST /api/v1/maiml/parse-petri-net-structure` と記載されているが実際は `/maiml/parse` を呼ぶ `parseMaiml()` を使用している。 |

#### 修正内容

先に `getStorageFileContent(fileKey)` でファイル内容（XML 文字列）を取得してから `parseMaiml(content)` に渡す。

```tsx
// 変更前（fetchPetriNetStructure 内）
structureResult = await parseMaiml(fileKey);  // fileKey はパス文字列

// 変更後
import { parseMaiml, getStorageFileContent } from '@/services/maimlApiService';

// fetchPetriNetStructure 内
const fileContentResponse = await getStorageFileContent(fileKey);
if (!fileContentResponse.data?.content) {
  throw new Error('MAIMLファイルの取得に失敗しました');
}
structureResult = await parseMaiml(fileContentResponse.data.content);  // XML 文字列
```

---

### No.16：`parseMaiml`（`/maiml/parse`）を誤用 → 500エラー＋`node.data` undefined TypeError

| 項目 | 内容 |
|------|------|
| **画面名** | 実験管理者 > 進捗管理 > プロジェクト進捗詳細 |
| **操作トリガー** | 進捗管理画面でプロジェクトの「詳細表示」ボタンを押下 → プロジェクト進捗詳細画面が表示される際に自動実行 |
| **発生ファイル** | `frontend/src/components/progress/PetriNetVisualization.tsx` |
| **行番号** | 431行目（`parseMaiml` 呼び出し）、946行目（`node.data.label` 参照） |
| **エラー1** | `AxiosError: Request failed with status code 500`（`POST /maiml/parse`） |
| **エラー2** | `TypeError: Cannot read properties of undefined (reading 'label')` at `convertToFlowNodes` (946行目) |
| **原因** | No.14 修正で `getStorageFileContent` による XML 文字列取得は正しくなったが、`parseMaiml`（`/maiml/parse`）はシンプルなパース専用エンドポイントで `PetriNetVisualization` が必要とする `{ data: { label, stereotype } }` 形式の places/transitions・複数 method 対応構造（`isMultiMethod`, `methods[]`）を返さない。複数 method 対応の完全な構造は `/maiml/parse-petri-net-structure` が返す。 |

#### 修正内容

`parseMaiml` → `parsePetriNetStructure`（`POST /maiml/parse-petri-net-structure`）に切り替え。

```tsx
// 変更前（431行目付近）
import { parseMaiml, getStorageFileContent } from '@/services/maimlApiService';
...
structureResult = await parseMaiml(xmlContent);

// 変更後
import { parsePetriNetStructure, getStorageFileContent } from '@/services/maimlApiService';
...
structureResult = await parsePetriNetStructure(xmlContent);
```

---

### No.17：[antd: Divider] `type` 非推奨警告（PetriNetVisualization）

| 項目 | 内容 |
|------|------|
| **画面名** | 実験管理者 > 進捗管理 > プロジェクト進捗詳細 |
| **操作トリガー** | 進捗管理画面でプロジェクトの「詳細表示」ボタンを押下 |
| **発生ファイル** | `frontend/src/components/progress/PetriNetVisualization.tsx` |
| **行番号** | 1171行目 |
| **エラーメッセージ** | `Warning: [antd: Divider] type is deprecated. Please use orientation instead.` |
| **スタックトレース** | `PetriNetVisualization` ← `ProgressMonitoring` ← `ExperimentAdminMenu` ← `HomeContent` ← `Home` |

#### 修正内容

`type="vertical"` を `orientation="vertical"` に置換する（1箇所）。

```tsx
// 変更前（1171行目付近）
<Divider type="vertical" />

// 変更後
<Divider orientation="vertical" />
```

---

### ■ 実験作業者

### No.18：実験作業者 > 実験記録 関連の警告修正（ExperimentRecordTab / DataRecordDialog）

| 項目 | 内容 |
|------|------|
| **画面名** | 実験作業者 > 実験記録 |
| **操作トリガー** | 実験記録タブ表示直後（プロジェクト選択済み・タスク選択済み状態） |
| **発生ファイル** | `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` / `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` |

#### 修正1：[antd: Space] `direction` 非推奨警告（ExperimentRecordTab）

| 項目 | 内容 |
|------|------|
| **行番号** | ExperimentRecordTab.tsx: 540行目他（計3箇所） |
| **エラーメッセージ** | `Warning: [antd: Space] direction is deprecated. Please use orientation instead.` |

`direction="vertical"` を `orientation="vertical"` に置換する（3箇所）。

```tsx
// 変更前
<Space direction="vertical" align="center" style={{ ... }}>
// 変更後
<Space orientation="vertical" align="center" style={{ ... }}>
```

#### 修正2：`useForm` 未接続警告（DataRecordDialog）

| 項目 | 内容 |
|------|------|
| **行番号** | DataRecordDialog.tsx: `<Form form={form}>` 箇所 |
| **エラーメッセージ** | `Warning: Instance created by useForm is not connected to any Form element. Forget to pass form prop?` |
| **原因** | `<Form form={form}>` が `selectedTemplate` の条件分岐内にあるため、テンプレート未選択時は `<Form>` が DOM に存在せず `form` インスタンスが未接続になる |

`<Form form={form}>` を条件分岐の外側に移動し、`forceRender` を `<Modal>` に追加。

```tsx
// 変更前（Form が selectedTemplate の条件分岐内にある）
{selectedTemplate ? (
  <Form form={form} layout="vertical" autoComplete="off">...</Form>
) : (
  <Alert title="テンプレートを選択してください" ... />
)}

// 変更後（Form は常時 DOM に存在）
<Form form={form} layout="vertical" autoComplete="off">
  {selectedTemplate ? (...) : (<Alert title="テンプレートを選択してください" ... />)}
</Form>
```

#### 修正3：[antd: Alert] `message` 非推奨警告（DataRecordDialog）

| 項目 | 内容 |
|------|------|
| **行番号** | DataRecordDialog.tsx: 2780行目 |
| **エラーメッセージ** | `Warning: [antd: Alert] message is deprecated. Please use title instead.` |

`message=` → `title=` に置換する（1箇所）。

```tsx
// 変更前
<Alert message="テンプレートを選択してください" ... />
// 変更後
<Alert title="テンプレートを選択してください" ... />
```

---

### No.21：[antd: Table] `pagination.position` 非推奨警告

| 項目 | 内容 |
|------|------|
| **画面名** | 実験作業者 > 実験記録 |
| **操作トリガー** | 実験作業者画面でプロジェクトを選択 → 実験記録タブ → タスクを選択した直後 |
| **発生ファイル** | `frontend/src/components/ExperimentWorker/TransitionList.tsx` |
| **行番号** | 534行目 |
| **エラーメッセージ** | `Warning: [antd: Table] pagination.position is deprecated. Please use pagination.placement instead.` |
| **スタックトレース** | `TransitionList` ← `ExperimentRecordTab` ← `ExperimentWorkerMenu` ← `HomeContent` ← `Home` |

#### 修正内容

`pagination.position`（配列形式）は非推奨のため削除する。ページネーションはデフォルトで右下に表示されるため、`position` を削除しても表示位置は変わらない（`placement` プロパティへの置き換えは型定義上サポートされていないため削除で対応）。

```tsx
// 変更前（534行目）
position: ['bottomRight'],

// 変更後: 削除（デフォルト値のため不要）
```

---

### No.22：`useForm` 未接続警告（DataRecordDialog の `forceRender` と条件レンダリングの相反）

| 項目 | 内容 |
|------|------|
| **画面名** | 実験作業者 > 実験記録 |
| **操作トリガー** | 実験記録タブでタスクを選択 → 「記録」ボタンを押下した直後 |
| **発生ファイル** | `frontend/src/components/ExperimentWorker/DataRecordDialog.tsx` |
| **行番号** | `<Modal forceRender>` 行 |
| **エラーメッセージ** | `Warning: Instance created by useForm is not connected to any Form element. Forget to pass form prop?` |
| **スタックトレース** | `DataRecordDialog` ← `ExperimentRecordTab` ← `ExperimentWorkerMenu` ← `HomeContent` ← `Home` |
| **原因** | No.18 修正（`ExperimentRecordTab` 側で条件レンダリング化）と No.17 修正（`<Modal forceRender>` 追加）が相反している。`{dataRecordModalOpen && <DataRecordDialog>}` により `open=true` のときだけコンポーネントがマウントされるため `forceRender` は機能せず、むしろ Modal 内部の事前レンダリング処理が `form` インスタンス生成と `<Form form={form}>` の DOM 接続タイミングにズレを生じさせ、警告が発生する |

#### 修正内容

`DataRecordDialog` 内の `<Modal forceRender>` から `forceRender` を削除する。コンポーネント自体が `open=true` のときだけマウントされる（No.18 の条件レンダリングにより）ため、`forceRender` は不要。

```tsx
// 変更前
<Modal
  forceRender
  ...
>

// 変更後
<Modal
  ...
>
```

---

### No.19：`useForm` 未接続警告（ExperimentRecordTab 常時描画問題）

| 項目 | 内容 |
|------|------|
| **画面名** | 実験作業者 > 実験記録 |
| **操作トリガー** | 実験記録タブ表示直後 |
| **発生ファイル** | `frontend/src/components/ExperimentWorker/ExperimentRecordTab.tsx` |
| **行番号** | `<DataRecordDialog>` 呼び出し箇所 |
| **エラーメッセージ** | `Warning: Instance created by useForm is not connected to any Form element. Forget to pass form prop?` |
| **スタックトレース** | `DataRecordDialog` ← `ExperimentRecordTab` ← `ExperimentWorkerMenu` ← `HomeContent` ← `Home` |
| **原因** | `ExperimentRecordTab` が `DataRecordDialog` を `open=false` の状態でも**常時描画**している。React の Modal は Portal（`document.body` の別の場所）に描画されるため、コンポーネントがマウントされた最初の描画サイクルで `form` インスタンスが生成された瞬間は `<Form>` の DOM マウントがまだ完了していない。そのため「form が何にも接続されていない」という警告が発生する。No.17 修正（`<Modal forceRender>` + `<Form>` を条件分岐外に移動）では DataRecordDialog 内部の問題は解消されたが、ExperimentRecordTab 側の常時描画による Portal タイミング問題は残存している |

#### 修正内容

`ExperimentRecordTab` 側で `DataRecordDialog` を**ダイアログが開くときだけ描画**する条件レンダリングに変更する。

```tsx
// 変更前（ExperimentRecordTab.tsx）
<DataRecordDialog
  open={dataRecordModalOpen}
  transition={selectedTransition}
  ...
/>

// 変更後
{dataRecordModalOpen && (
  <DataRecordDialog
    open={dataRecordModalOpen}
    transition={selectedTransition}
    ...
  />
)}
```

これにより `open=false` の状態で `DataRecordDialog` がマウントされることがなくなり、`form` インスタンスと `<Form>` が同時に生成・マウントされるため警告が解消される。

---

### No.23：`useForm` 未接続警告（TransitionList 常時マウント問題）

| 項目 | 内容 |
|------|------|
| **画面名** | 実験作業者 > 実験記録 |
| **操作トリガー** | 実験記録タブでタスクを選択した直後 |
| **発生ファイル** | `frontend/src/components/ExperimentWorker/TransitionList.tsx` |
| **行番号** | 562行目 |
| **エラーメッセージ** | `Warning: Instance created by useForm is not connected to any Form element. Forget to pass form prop?` |
| **スタックトレース** | `DataRecordDialog` ← `TransitionList` ← `ExperimentRecordTab` ← `ExperimentWorkerMenu` ← `HomeContent` ← `Home` |
| **原因** | `ExperimentRecordTab` 側（No.18 対応済み）とは別に、`TransitionList.tsx` 内でも `DataRecordDialog` が条件レンダリングなしで**常時マウント**されている。No.18 と同じ Portal タイミング問題が `TransitionList` 経由でも発生しており、警告が残存している |

#### 修正内容

`TransitionList` 内の `<DataRecordDialog>` を `{dataRecordModalOpen && ...}` の条件レンダリングに変更する。

```tsx
// 変更前（TransitionList.tsx 562行目付近）
<DataRecordDialog
  open={dataRecordModalOpen}
  transition={selectedTransition}
  ...
/>

// 変更後
{dataRecordModalOpen && (
  <DataRecordDialog
    open={dataRecordModalOpen}
    transition={selectedTransition}
    ...
  />
)}
```

---

### No.24：`useForm` 未接続警告（TransitionList の IssueManagementModal 常時マウント問題）

| 項目 | 内容 |
|------|------|
| **画面名** | 実験作業者 > 実験記録 |
| **操作トリガー** | 実験記録タブでタスクを選択した直後 |
| **発生ファイル** | `frontend/src/components/ExperimentWorker/TransitionList.tsx` |
| **行番号** | `IssueManagementModal` 呼び出し箇所 |
| **エラーメッセージ** | `Warning: Instance created by useForm is not connected to any Form element. Forget to pass form prop?` |
| **原因** | `IssueManagementModal` が `selectedTransition` 条件のみで常時マウントされており、モーダルが閉じている状態でも `Form.useForm()` インスタンスが生成されるため Portal タイミング問題が発生する |

#### 修正内容

`issueModalOpen` フラグを条件レンダリングの先頭に追加する。

```tsx
// 変更前
{selectedTransition && (
  <IssueManagementModal open={issueModalOpen} ... />
)}

// 変更後
{issueModalOpen && selectedTransition && (
  <IssueManagementModal open={issueModalOpen} ... />
)}
```

### No.25：`useForm` 未接続警告（ProgressCheckTab の IssueManagementModal 常時マウント問題）

| 項目 | 内容 |
|------|------|
| **画面名** | 実験作業者 > 進捗確認 |
| **操作トリガー** | 進捗確認タブでタスクを選択した直後 |
| **発生ファイル** | `frontend/src/components/ExperimentWorker/ProgressCheckTab.tsx` |
| **行番号** | `IssueManagementModal` 呼び出し箇所 |
| **エラーメッセージ** | `Warning: Instance created by useForm is not connected to any Form element. Forget to pass form prop?` |
| **原因** | `IssueManagementModal` が `selectedTaskForIssue && projectId` 条件のみで常時マウントされており、No.23・24 と同じ Portal タイミング問題が発生する |

#### 修正内容

`issueModalVisible` フラグを条件レンダリングの先頭に追加する。

```tsx
// 変更前
{selectedTaskForIssue && projectId && (
  <IssueManagementModal open={issueModalVisible} ... />
)}

// 変更後
{issueModalVisible && selectedTaskForIssue && projectId && (
  <IssueManagementModal open={issueModalVisible} ... />
)}
```

---

### No.43：重複 `taskId` による React key 警告（ProgressCheckTab）

| 項目 | 内容 |
|------|------|
| **画面名** | 実験作業者 > 進捗確認 |
| **操作トリガー** | 進捗確認タブでプロジェクトを選択したとき |
| **発生ファイル** | `frontend/src/components/ExperimentWorker/TaskListTable.tsx`（284行目 `rowKey="taskId"`） |
| **エラーメッセージ** | `Warning: Encountered two children with the same key, ...` |
| **原因** | `ProgressCheckTab.tsx` で `taskId = ${project_id}-${method_id}-${task_no}` として生成するが、APIが同一の組み合わせを重複して返す場合がある。`TaskListTable` 側の `rowKey="taskId"` は正しいため、`ProgressCheckTab` 側で `allTasks` 生成後に重複を排除する必要がある。 |

#### 修正内容

`allTasks` 生成後、`setTasks()` の前に `Map` を使って重複 `taskId` を排除する（初回フェッチ・タスク開始後再取得・強制終了後再取得・409競合後再取得の計4箇所）。

```tsx
// 変更前
setTasks(allTasks);

// 変更後（重複 taskId を排除）
const uniqueTasksMap = new Map<string, Task>();
allTasks.forEach(task => uniqueTasksMap.set(task.taskId, task));
setTasks(Array.from(uniqueTasksMap.values()));
```

---

### ■ その他

### No.44：`RoleManagement.tsx` の `rowKey` 内 `Math.random()` 使用

| 項目 | 内容 |
|------|------|
| **画面名** | システム管理 > ロール管理 |
| **操作トリガー** | ロール管理画面を表示したとき（再レンダリングのたびに発生） |
| **発生ファイル** | `frontend/src/components/SystemManagement/RoleManagement.tsx`（715〜719行目） |
| **エラーメッセージ** | 警告なし（目に見えるパフォーマンス問題：毎レンダリングで全行が remount される） |
| **原因** | `rowKey` 関数内で `selectedMasterInfo` 未設定時・`record[idField]` が falsy 時に `Math.random()` を返しているため、レンダリングのたびに key が変わり全行が remount される。 |

#### 修正内容

antd `Table` の `rowKey` は `(record, index?) => string` のシグネチャを持つため、第2引数 `index` をフォールバックとして使用する。

```tsx
// 変更前
rowKey={(record) => {
  if (!selectedMasterInfo) return String(Math.random());
  const idField = Object.keys(selectedMasterInfo.itemCategories)[0];
  return String(record[idField] || Math.random());
}}

// 変更後
rowKey={(record, index) => {
  if (!selectedMasterInfo) return String(index ?? 0);
  const idField = Object.keys(selectedMasterInfo.itemCategories)[0];
  return String(record[idField] ?? index ?? 0);
}}
```

## 実装ステップ

- [x] No.1: `frontend/src/components/project/FileListTable.tsx` 396行目の `destroyOnClose` を `destroyOnHidden` に変更
- [x] No.2: `frontend/src/components/project/RenameProjectModal.tsx` 85行目の `destroyOnClose` を `destroyOnHidden` に変更
- [x] No.3: `frontend/src/components/project/ProjectManagement.tsx` の `message` 静的インポートを `App.useApp()` フックへ置き換え
- [x] No.4: `frontend/src/components/ExperimentWorker/IssueManagementModal.tsx` の `handleClose` 内 `resetFields()` を削除し `useEffect` でリセット処理に変更
- [x] No.5: `frontend/src/components/project/RenameProjectModal.tsx` の `message` 静的インポートを `App.useApp()` フックへ置き換え（49・60・64行目 計3箇所）
- [x] No.6: `frontend/src/components/project/ProjectManagement.tsx` の `IssueManagementModal` を `{issueManagementModalOpen && selectedProject && ...}` で条件レンダリングに変更
- [ ] No.7: `frontend/src/components/ExperimentWorker/InstructionFlowDialog.tsx` の `<Spin tip="..."/>` をネストパターンに変更（未対応）
- [ ] No.8: `frontend/src/services/projectApiService.ts` の `[DEBUG]` プレフィックス付き `console.log` / `console.error`（計82件）を削除（残課題）
- [ ] No.9: `backend/src/services/projectService.ts` / `backend/src/controllers/projectController.ts` のチェックイン500エラー対応（未対応）
- [x] No.10: `frontend/src/utils/formatApi.ts`（192行目）、`frontend/src/components/project/FormatManagement.tsx`（877行目）、`frontend/src/components/project/CreateFormatModal.tsx`（60行目）の `console.error` を削除（計3箇所）
- [ ] No.11: `frontend/src/components/project/FormatUploadDialog.tsx` の `<List>` / `<List.Item>` を `.map()` + `<div>` に変換（2箇所）、`import` から `List` を削除
- [x] No.12: `frontend/src/components/editorv2/components/EditorToolbar.tsx` の `Divider type="vertical"` を `orientation="vertical"` に置換（8箇所）
- [x] No.13: `backend/src/server.ts` の `express.json()` / `express.urlencoded()` に `{ limit: '50mb' }` を追加
- [ ] No.14: `frontend/src/components/editorv2/components/DocumentEditDialog.tsx` の `form.getFieldValue()` を `documentData` props 参照に変更（4箇所）（未対応）
- [x] No.15: `frontend/src/components/editorv2/components/DocumentEditDialog.tsx` の `message` 静的インポートを `App.useApp()` フックへ置き換え
- [ ] No.16: `frontend/src/components/editorv2/components/MultiObjectEditor.tsx` の `Collapse` を `Panel` 記法から `items` 記法に変換（2箇所）、`const { Panel } = Collapse;` を削除（未対応）
- [x] No.17: `frontend/src/components/editorv2/components/DocumentEditDialog.tsx` の `Alert message=` を `title=` に置換（4箇所）
- [x] No.18: `frontend/src/components/editorv2/components/MultiObjectEditor.tsx` の `Alert message=` を `title=` に置換（2箇所）
- [x] No.19: `frontend/src/components/editorv2/components/ValidationPanel.tsx` の `Collapse` を `Panel` 記法から `items` 記法に変換（2箇所）、`const { Panel } = Collapse;` を削除
- [x] No.20: `frontend/src/components/editorv2/components/ValidationPanel.tsx` の `Alert message=` を `title=` に置換（1箇所）
- [ ] No.21: `frontend/src/components/editorv2/components/ValidationPanel.tsx` の `<List>` / `<List.Item>` を `.map()` + `<div>` に変換（2箇所）、`import` から `List` を削除（未対応）
- [ ] No.22: `frontend/src/components/editorv2/components/WorkflowSelectorDialog.tsx` の `<List>` / `<List.Item>` を `.map()` + `<div>` に変換（1箇所）、`import` から `List` を削除（未対応）
- [ ] No.23: `frontend/src/components/editorv2/components/NestedPropertyEditor.tsx` の `Space direction="vertical"` を `orientation="vertical"` に置換（4箇所）（未対応）
- [ ] No.24: `frontend/src/components/editorv2/components/SaveConfirmDialog.tsx` の `Space direction="vertical"` を `orientation="vertical"` に置換（5箇所）（未対応）
- [ ] No.25: `frontend/src/components/editorv2/components/XMLViewerWrapper.tsx` 120行目の `<Spin tip="..."/>` をネストパターンに変更（未対応）
- [ ] 動作確認（各操作後にコンソール警告が消えていることを確認）

---

## 変更ファイル

| No. | ファイル | 変更内容 |
|-----|---------|---------|
| 1 | `frontend/src/components/project/FileListTable.tsx` | 396行目 `destroyOnClose` → `destroyOnHidden` |
| 2 | `frontend/src/components/project/RenameProjectModal.tsx` | 85行目 `destroyOnClose` → `destroyOnHidden` |
| 3 | `frontend/src/components/project/ProjectManagement.tsx` | `import { message }` を削除し `App.useApp()` フックで `message` を取得 |

---

## 影響範囲

- **ファイル名変更モーダル**（FileListTable）: モーダルを閉じた際にフォームが破棄される挙動は維持される
- **プロジェクト名変更モーダル**（RenameProjectModal）: 同上。`useEffect` でのフォーム初期化と組み合わせて正常動作する
- **プロジェクト管理全般**（ProjectManagement）: `message` の取得方法変更のみで、表示挙動は変わらない

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `destroyOnHidden` で挙動差異が生じる可能性 | 低 | 低 | モーダル開閉・フォームリセット動作を手動テストで確認 |
| `App.useApp()` 適用後に `message` が undefined になる可能性 | 低 | 低 | `ProjectManagementInner` が `App` コンポーネントのツリー内にあることを確認 |

---

## テスト計画

| No. | 画面名 | 操作 | 確認観点 |
|-----|--------|------|---------|
| 1 | 実験管理者 > プロジェクト管理 | ファイル名変更モーダルを開閉する | コンソール警告が消えていること、フォームが再オープン時にリセットされること |
| 2 | 実験管理者 > プロジェクト管理 | プロジェクト名変更モーダルを開閉する | コンソール警告が消えていること、フォームが再オープン時に正しく初期化されること |
| 3 | 実験管理者 > プロジェクト管理 | プロジェクトダウンロードボタンを押下する | コンソール警告が消えていること、成功/エラーメッセージが正常に表示されること |

---

## 承認記録

- **計画書提示日時**: 2026-04-22 10:58
- **承認日時**: 2026-04-22 10:58
- **承認者コメント**: 承認済み

---

## 実施記録

### 実施日時
開始: 2026-04-22 10:58  
完了: -

### 計画からの変更点
- 2026-04-22 11:05: 複数エラー対応形式・画面名追加のため計画書を改訂

### 発生した問題と解決方法
なし

### 最終的な成果物
- [x] No.1 `FileListTable.tsx` 修正完了（`destroyOnClose` → `destroyOnHidden`）
- [x] No.2 `RenameProjectModal.tsx` 修正完了（`destroyOnClose` → `destroyOnHidden`）
- [x] No.3 `ProjectManagement.tsx` 修正完了（`message` 静的インポート → `App.useApp()` フック）
- [x] No.4 `IssueManagementModal.tsx` 修正完了（`handleClose` 内 `resetFields()` 削除 → `useEffect` でリセット）
- [x] No.5 `RenameProjectModal.tsx` 修正完了（`message` 静的インポート → `App.useApp()` フック、計3箇所）
- [x] No.6 `ProjectManagement.tsx` 修正完了（`IssueManagementModal` を `{issueManagementModalOpen && selectedProject && ...}` で条件レンダリングに変更）
- [x] No.10 `formatApi.ts` / `FormatManagement.tsx` / `CreateFormatModal.tsx` 修正完了（不要な `console.error` 3箇所を削除）
- [x] No.12 `EditorToolbar.tsx` 修正完了（`Divider type="vertical"` → `orientation="vertical"` 8箇所）
- [x] No.13 `backend/src/server.ts` 修正完了（`express.json()` / `express.urlencoded()` に `{ limit: '50mb' }` を追加）
- [x] No.15 `DocumentEditDialog.tsx` 修正完了（`message` 静的インポート → `App.useApp()` フック）
- [x] No.17 `DocumentEditDialog.tsx` 修正完了（`Alert message=` → `title=` 4箇所）
- [x] No.16（再対応） `MultiObjectEditor.tsx` 修正完了（`const { Panel } = Collapse;` 削除、`Collapse` を `Panel` 記法から `items` 記法に変換（2箇所））
- [x] No.18 `MultiObjectEditor.tsx` 修正完了（`Alert message=` → `title=` 2箇所）
- [x] No.19 `ValidationPanel.tsx` 修正完了（`const { Panel } = Collapse;` 削除、`Collapse` を `Panel` 記法から `items` 記法に変換（2箇所））
- [x] No.20 `ValidationPanel.tsx` 修正完了（`Alert message=` → `title=` 1箇所）
- [x] No.16 `frontend/src/services/maimlApiService.ts` に `parsePetriNetStructure` 関数を追加（`POST /maiml/parse-petri-net-structure`）、`frontend/src/components/progress/PetriNetVisualization.tsx` で `parseMaiml` → `parsePetriNetStructure` に切り替え
- [x] No.17 `frontend/src/components/progress/PetriNetVisualization.tsx` 修正完了（1171行目 `Divider type="vertical"` → `orientation="vertical"`）
- [x] No.18 `ExperimentRecordTab.tsx` / `DataRecordDialog.tsx` 修正完了（`Space direction` → `orientation` 3箇所 / `<Form>` を条件分岐外に移動＋`<Modal forceRender>` 追加 / `Alert message=` → `title=` 1箇所）
- [x] No.19 `ExperimentRecordTab.tsx` 修正完了（`DataRecordDialog` を `{dataRecordModalOpen && ...}` で条件レンダリングに変更）
- [x] No.20 `ExperimentRecordTab.tsx` / `IssueManagementModal.tsx` 修正完了（`IssueManagementModal` 条件レンダリング化 / `commentForm` 未接続修正）
- [x] No.21 `TransitionList.tsx` 修正完了（`pagination.position: ['bottomRight']` を削除）
- [x] No.22 `DataRecordDialog.tsx` 修正完了（`<Modal forceRender>` から `forceRender` を削除）
- [x] No.23 `TransitionList.tsx` 修正完了（`DataRecordDialog` を `{dataRecordModalOpen && ...}` で条件レンダリングに変更）
- [x] No.24 `TransitionList.tsx` 修正完了（`IssueManagementModal` を `{issueModalOpen && selectedTransition && ...}` で条件レンダリングに変更）
- [x] No.25 `ProgressCheckTab.tsx` 修正完了（`IssueManagementModal` を `{issueModalVisible && selectedTaskForIssue && projectId && ...}` で条件レンダリングに変更）
  - **原因**: `taskId` を `` `${project_id}-${method_id}-${task_no}` `` で生成しているが、同一メソッド内に `task_no` が重複するレコードが存在するため React key 衝突が発生。Map による重複排除（142〜146行目）では対処不完全。
  - **修正箇所（5箇所）**:
    1. 初期取得時 `allTasks` 生成（約115行目）: `method.tasks.map((task: WorkerTask) =>` → `method.tasks.map((task: WorkerTask, taskIndex: number) =>`、`taskId: \`...-${task.task_no}\`` → `\`...-${task.task_no}-${taskIndex}\``
    2. `handleTaskAction` 内ステータス更新後の再マッピング1〜4（各メソッドの tasks.map）: 同様にインデックス引数追加・taskId 末尾に `-${taskIndex}` 追加
  - **修正後キー例**: `project_BwhJy10WCsnZ-method_QuantumDotLED_fbdbf6f5-1-0`（末尾に配列インデックスを付与）
