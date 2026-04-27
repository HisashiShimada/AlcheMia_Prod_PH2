# 対応結果: MAIMLバリデーション機能追加・関連バグ修正まとめ

> このファイルは以下4タスクの計画・結果を統合したものです。
> - `20260423_1620_MAIMLバリデーション機能追加`
> - `20260424_1059_MAIMLバリデーションダイアログ修正`
> - `20260424_1318_MAIMLバリデーション表示バグ修正`
> - `20260424_1406_保存時ファイル名バグ修正`

---

## 対応期間

2026-04-23 16:20 〜 2026-04-24 14:45

---

## 1. MAIMLバリデーション機能追加（メイン実装）

### 概要

1. プロジェクト管理画面にバリデーション確認ボタンを追加
2. バリデーション結果をDBに保存し、過去結果をダイアログで表示・再実行可能にする
3. バリデーションエラーがある場合の警告アイコン表示・操作ブロック

### 実装内容

#### バックエンド

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/services/maimlService.ts` | `validateMaiML` の `skipAnalysisSave` デフォルトを `false` に変更（fileKeyが空の場合はスキップ）。`saveMaiML()` 完了後にバリデーション実行・DB保存を追加 |
| `backend/src/services/fileAccessService.ts` | アップロード時バリデーションの `skipSave=true` → `false` に変更（DB保存有効化） |
| `backend/src/controllers/maimlController.ts` | `getAnalysisResult` 関数を追加（`GET /maiml/analysis-result?fileKey=xxx`） |
| `backend/src/routes/maimlRoutes.ts` | `GET /analysis-result` エンドポイントを登録 |

#### フロントエンド

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/services/maimlApiService.ts` | `validateMaiml` 引数拡張（`fileKey` 追加）、`getAnalysisResult` 関数・`MaimlAnalysisResultRow` 型を追加 |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | バリデーション呼び出し2箇所（保存前・ValidationPanel）に `fileKey` を渡してDB保存有効化 |
| `frontend/src/components/project/ProjectManagement.tsx` | バリデーションボタン・`MaimlValidationModal` ダイアログ・警告アイコン追加。プロジェクト選択時にDB結果取得する `useEffect` 追加。`maimlHasErrors` を算出して `TaskRegistrationTab` に渡す |
| `frontend/src/components/project/MaimlValidationModal.tsx` | 新規作成。ValidationPanel スタイル（Card + Collapse + List + Tag）でエラー/警告を分類表示。再バリデーションボタン付き |
| `frontend/src/components/project/FileListTable.tsx` | `maimlValidationRow` prop 追加。MAIMLファイル行に警告アイコン表示 |
| `frontend/src/components/project/TaskRegistrationTab.tsx` | `maimlHasErrors` prop 追加。エラー時の Alert 表示・保存ボタン/プロジェクト指示ボタン無効化 |

#### UI仕様書

| ファイル | 変更内容 |
|---------|---------|
| `docs/design/ui/ui_project_management.md` | バリデーションボタン・ダイアログ仕様追加 |
| `docs/design/ui/ui_file_list_table.md` | 警告アイコン仕様追加 |
| `docs/design/ui/ui_task_registration_tab.md` | `maimlHasErrors` による操作ブロック仕様追加 |

### バリデーション結果DB保存のルール（最終仕様）

| 実行箇所 | fileKey | DB保存 |
|---------|---------|--------|
| エディタ：保存前バリデーション | あり | ✅ |
| エディタ：ValidationPanel | あり | ✅ |
| ファイルアップロード時 | あり | ✅ |
| MAIML保存時（saveMaiML） | あり | ✅ |
| 新規作成中（fileKeyなし） | なし | ❌（スキップ） |

### 警告アイコン色分け仕様

| 状態 | アイコン色 | 意味 |
|------|----------|------|
| `errors.length > 0` | 🔴 赤（`colorError`） | タスク登録タブをブロック |
| `errors.length === 0 && warnings.length > 0` | 🟡 黄（`colorWarning`） | 進行可能・注意喚起のみ |
| 問題なし | — | アイコンなし |

---

## 2. MAIMLバリデーションダイアログ修正

### 概要（2026-04-24 10:59 〜 11:30）

メイン実装完了後に判明した3点を修正。

### 修正内容

#### ① アップロード後にDB結果が画面に反映されない

**原因**:
`handleUploadComplete` でアップロード後に `refetchProjects()` + `reloadMaiml()` するが、
`maimlFileKey` が変化しない場合（既存MAIMLの更新アップロード）は `selectedProject?.maimlFileKey`
を依存とする `useEffect` が再発火しない。

**修正**:
`handleUploadComplete` に `hasMaimlFile=true` の場合 `getAnalysisResult()` を呼んで
`setSavedValidationRow()` を更新する処理を追加（`ProjectManagement.tsx`）。

#### ② バリデーションダイアログのレイアウト修正

`MaimlValidationModal.tsx` を ValidationPanel スタイル（Card + Collapse + List + Tag）に合わせて実装。
`canBeIgnoredOnUpload` でエラーを「致命的エラー」「編集可能エラー」に分類表示。

#### ③ MAIML保存時のDB登録

`backend/src/services/maimlService.ts` の `saveMaiML()` 完了後に
`maimlParser.analyzeMaiMLFile()` を `skipSave=false` で呼び出すよう修正。

#### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/project/ProjectManagement.tsx` | ①②の修正 |
| `backend/src/services/maimlService.ts` | ③の修正（saveMaiML後にバリデーション・DB保存） |

---

## 3. MAIMLバリデーション表示バグ修正

### 概要（2026-04-24 13:18 〜 13:50）

ダイアログ修正後に残っていた2件のバグを修正。

### Bug 1: アップロード後に警告アイコンが表示されない

**原因**:
`handleUploadComplete` 内で `refetchProjects()` 呼び出し**前**に `currentProject` を取得しているため、
初回アップロード時は `currentProject.maimlFileKey` が `null` のままでバリデーション取得がスキップされる。

**修正**:
`refetchProjects()` 完了後に `getProjects()` API を直接呼んで最新の `maimlFileKey` を確定させてから
`getAnalysisResult()` を呼ぶよう修正（`ProjectManagement.tsx`）。

### Bug 2: ダイアログで Collapse パネルの中身が描画されない

**原因**:
Ant Design の `Modal` はデフォルト `destroyOnClose={false}`。
DOM に残り続けるため2回目以降のオープン時に `defaultActiveKey` が適用されずパネルが閉じたまま。

**修正**:
`MaimlValidationModal.tsx` の `Modal` コンポーネントに `destroyOnClose` プロパティを追加。
モーダルを閉じるたびにDOM破棄・再マウントされ `defaultActiveKey` が毎回適用される。

### Bug 3: アップロード後にバリデーション結果が更新されない（追加修正）

**原因**:
`handleUploadComplete` 内で `validateMaiml` を呼んでいなかったため、
アップロード直後のバリデーション結果がUI（`savedValidationRow`）に反映されなかった。

**修正**:
`handleUploadComplete` でアップロード完了後に `validateMaiml` を実行し、
`setSavedValidationRow` を更新するよう修正（`ProjectManagement.tsx`）。

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/project/ProjectManagement.tsx` | Bug 1・Bug 3 の修正（`handleUploadComplete` のバリデーション取得ロジック改善） |
| `frontend/src/components/project/MaimlValidationModal.tsx` | Bug 2 の修正（`Modal` に `destroyOnClose` 追加） |

---

## 4. 保存時ファイル名バグ修正

### 概要（2026-04-24 14:06 〜 14:15）

プロジェクト名と異なるファイル名のMAIMLを編集・保存した際、
元のファイルが更新されずプロジェクト名のファイルが新規生成されるバグを修正。

### 原因

`PetriNetEditorInner.tsx` の S3保存処理にて、保存先 `fileKey` のファイル名を
`documentData.name` から決定していた。

`documentData.name` は MAIML 読み込み時に `originalFileName`（= プロジェクト名）で強制上書きされており、
元のファイル名（例: `different_name.maiml`）が無視されてプロジェクト名のファイルが新規生成されていた。

### fileKey 決定ルール（修正後）

| 状況 | fileKey の決定方法 |
|------|------------------|
| `sourceS3Key` あり、フォルダ変更なし | `sourceS3Key` をそのまま使用 |
| `sourceS3Key` あり、フォルダ変更あり | 選択フォルダ + `sourceS3Key` のファイル名部分 |
| `sourceS3Key` なし（新規作成） | `originalFileName`（プロジェクト名）でファイル名を決定 |
| `documentData.name` | **使用しない**（Document 要素の name 属性でありファイル名とは別物） |

### 修正コード

```tsx
let fileKey;
if (props.sourceS3Key) {
  const sourceFileNameWithExt = props.sourceS3Key.substring(
    props.sourceS3Key.lastIndexOf('/') + 1
  );
  if (folder) {
    fileKey = `${folder}/${sourceFileNameWithExt}`;
  } else {
    fileKey = props.sourceS3Key;
  }
} else {
  const newFileName = `${props.originalFileName?.replace('.maiml', '') || 'document'}.maiml`;
  fileKey = folder ? `${folder}/${newFileName}` : `${currentOrgId}/${newFileName}`;
}
```

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | S3保存時の `fileKey` 決定ロジックを修正 |

---

## 5. 追加バグ修正（2026-04-24 14:35 〜 14:45）

### Bug 4: アップロード後バリデーションが古いMAIMLコンテンツで実行される（stale closure）

**原因**:
`handleUploadComplete` 内で `await reloadMaiml()` を呼んだ後、`maimlContent` を参照しているが、
`maimlContent` は React state であるためクロージャ内では常に古い値（アップロード前のコンテンツ）を参照する。
結果、バリデーションが更新後のMAIMLではなく更新前のコンテンツで実行されていた。

**修正**:
`maimlContent` を使う代わりに `getProjectMaiml(currentProject.id)` を直接呼んで
最新のMAIMLコンテンツを取得してからバリデーションを実行するよう変更（`ProjectManagement.tsx`）。

```tsx
// 修正前: reloadMaiml() 後の maimlContent はクロージャで古い値のまま
const latestMaimlContent = maimlContent;

// 修正後: API を直接呼んで最新コンテンツを取得
const maimlRes = await getProjectMaiml(currentProject.id);
const latestMaimlContent = maimlRes.data?.maimlContent ?? null;
```

### Bug 5: `maimlHasErrors` が JSONB 配列を正しくパースできない

**原因**:
`maiml_analysis_results.errors` カラムは JSONB 型であり、node-postgres が自動的に JavaScript 配列に変換する。
`maimlHasErrors` の算出ロジックで `JSON.parse(savedValidationRow.errors)` を呼んでいたため、
`errors` が既に配列の場合に `JSON.parse(array)` が例外を投げ、`catch` ブロックで `false` を返していた。
結果、MAIMLエラーがあってもタスク登録タブがブロックされない不具合が発生していた。

**修正**:
`errors` が配列なら直接 `.length` で判定し、文字列の場合のみ `JSON.parse` するよう変更（`ProjectManagement.tsx`）。
同様の `parseField` パターンは既にヘッダーの警告アイコン算出部分で採用済みだったため、そちらと同じロジックに統一。

```tsx
// 修正前
const maimlHasErrors = useMemo(() => {
  if (!savedValidationRow) return false;
  try {
    const errors = JSON.parse(savedValidationRow.errors || '[]');
    return Array.isArray(errors) && errors.length > 0;
  } catch {
    return false;
  }
}, [savedValidationRow]);

// 修正後
const maimlHasErrors = useMemo(() => {
  if (!savedValidationRow) return false;
  const v = savedValidationRow.errors;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch {
      return false;
    }
  }
  return false;
}, [savedValidationRow]);
```

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/project/ProjectManagement.tsx` | Bug 4: `getProjectMaiml()` 直接呼び出しで最新MAIMLを取得。Bug 5: `maimlHasErrors` の JSONB 配列パース対応 |
| `frontend/src/services/projectApiService.ts` | Bug 4 の修正で `getProjectMaiml` を import に追加（既存関数の利用） |

### Bug 6: メソッド行の指示追加ボタンが `maimlHasErrors` で無効化されない

**原因**:
`isFieldDisabled`（実験条件・試行回数・指示追加ボタンの無効判定関数）の依存配列に `maimlHasErrors` が含まれておらず、
MAIMLエラーがある場合でも各メソッド行の「指示追加」ボタンが活性化したままになっていた。
保存ボタン・プロジェクト指示ボタンは直接 `disabled={... || maimlHasErrors}` で正しく制御されていたが、
`isFieldDisabled` を経由するボタンには反映されていなかった。

**修正**:
`isFieldDisabled` の条件式と依存配列に `maimlHasErrors` を追加（`TaskRegistrationTab.tsx`）。

```tsx
// 修正前
const isFieldDisabled = useCallback((record: TaskDetail) => {
  return isSaving || loadingMethods || isCheckoutLocked || record.workerLinkedFlg;
}, [isSaving, loadingMethods, isCheckoutLocked]);

// 修正後
const isFieldDisabled = useCallback((record: TaskDetail) => {
  return isSaving || loadingMethods || isCheckoutLocked || record.workerLinkedFlg || !!maimlHasErrors;
}, [isSaving, loadingMethods, isCheckoutLocked, maimlHasErrors]);
```

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/project/TaskRegistrationTab.tsx` | `isFieldDisabled` に `maimlHasErrors` を追加 |

---

## 最終的な変更ファイル一覧

### バックエンド

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/services/maimlService.ts` | `skipAnalysisSave` デフォルト `false`。`saveMaiML()` 後にバリデーション・DB保存追加 |
| `backend/src/services/fileAccessService.ts` | アップロード時の `skipSave` を `false` に変更 |
| `backend/src/controllers/maimlController.ts` | `getAnalysisResult` 追加 |
| `backend/src/routes/maimlRoutes.ts` | `GET /analysis-result` 登録 |

### フロントエンド

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/services/maimlApiService.ts` | `validateMaiml` 引数拡張・`getAnalysisResult` 追加 |
| `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | バリデーション呼び出しに `fileKey` 追加。S3保存時の `fileKey` 決定ロジック修正 |
| `frontend/src/components/project/ProjectManagement.tsx` | バリデーションボタン・ダイアログ・警告アイコン追加。アップロード後のバリデーション取得ロジック修正 |
| `frontend/src/components/project/MaimlValidationModal.tsx` | 新規作成。ValidationPanel スタイルで表示。`destroyOnClose` 追加 |
| `frontend/src/components/project/FileListTable.tsx` | `maimlValidationRow` prop 追加・警告アイコン表示 |
| `frontend/src/components/project/TaskRegistrationTab.tsx` | `maimlHasErrors` prop 追加・Alert 表示・保存ボタン等の無効化 |

### UI仕様書

| ファイル | 変更内容 |
|---------|---------|
| `docs/design/ui/ui_project_management.md` | バリデーションボタン・ダイアログ仕様追加 |
| `docs/design/ui/ui_file_list_table.md` | 警告アイコン仕様追加 |
| `docs/design/ui/ui_task_registration_tab.md` | `maimlHasErrors` による操作ブロック仕様追加 |

---

## 手動テスト結果

| テストケース | 結果 |
|------------|------|
| エディタ保存前バリデーション後にDBに結果が保存される | ✅ |
| エディタ ValidationPanel バリデーション後にDBに結果が保存される | ✅ |
| ファイルアップロード後にDBに結果が保存される | ✅ |
| MAIML保存後にDBにバリデーション結果が保存される | ✅ |
| プロジェクト管理画面にバリデーション確認ボタンが表示される | ✅ |
| プロジェクト選択時にDB保存済みの結果が取得・表示される | ✅ |
| 過去エラーがあった場合、選択時から警告アイコンが表示される | ✅ |
| ダイアログを開くと最終バリデーション日時と結果が表示される | ✅ |
| 再バリデーションボタンで実行でき結果がDBに更新される | ✅ |
| バリデーション成功時に警告アイコンが消える | ✅ |
| ファイル一覧のMAIMLファイル行に警告アイコンが表示される | ✅ |
| 初回MAIMLアップロード後: 警告アイコンが表示される | ✅ |
| 上書きMAIMLアップロード後: 警告アイコンが表示される | ✅ |
| バリデーションダイアログを2回目以降に開いたとき Collapse が開いた状態で表示される | ✅ |
| プロジェクト名と異なるファイル名で編集・保存（フォルダ変更なし）: 元のファイル名で保存される | ✅ |
| プロジェクト名と異なるファイル名で編集・保存（フォルダ変更あり）: 元のファイル名で選択フォルダに保存される | ✅ |
| 新規作成（`sourceS3Key` なし）: プロジェクト名で保存される | ✅ |
