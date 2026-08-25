# タスク計画書: WorkRecordPanel ビューアボタン追加

## メタデータ

- **作成日時**: 2026-08-19
- **タスクID**: 20260819_WorkRecordPanelビューアボタン追加
- **優先度**: 中
- **推定工数**: 1〜2時間
- **担当**: Cline

---

## 1. タスク概要

`frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` のボタン群に、ペトリネットビューアボタン（「ペトリネットを表示」）を追加する。

実装パターンは前タスク（`ExperimentInstructionTab` ビューアボタン修正）と同一で、`getProjectMaiml(projectId)` API 経由でバックエンドにファイル解決を委ねて `ViewRendererDialog` をフローティング表示する。

---

## 2. 調査結果

### WorkRecordPanel の現状構造

```
WorkRecordPanel（export default, 1753行）
├── Props: { projectName?: string }  ← projectId は未受け取り
├── PlanB（描画レイアウト）
│   ├── InstructionCollapse
│   ├── WorkHeader
│   └── Layout
│       ├── 左Sider: テンプレート一覧
│       └── 右Content: PropertyList
│           └── ボタン群（965〜996行）
│               ├── コメントボタン
│               ├── 保存ボタン
│               ├── スキップボタン
│               └── 保存して次へボタン
```

### 呼び出し元の状態（ExperimentWorkerMenu.tsx）

```tsx
<WorkRecordPanel projectName={selectedProjectName || undefined} />
```

- `selectedProject`（= projectId UUID）は `ExperimentWorkerMenu` の state に存在する
- `projectId` は現在 `WorkRecordPanel` に渡されていない

---

## 3. 修正方針

`ExperimentInstructionTab` と同一パターンに揃える。

| 項目 | 内容 |
|------|------|
| MAIMLコンテンツ取得 | `getProjectMaiml(projectId)` 呼び出し（バックエンドが `project_uuid → file_metadata → file_key` で解決） |
| ボタン配置 | `PropertyList` の既存ボタン群 `Flex` 内に追加。`isReadOnly` に関わらず常に表示 |
| `fileContent` prop | API取得済み `maimlContent` を `ViewRendererDialog` に渡す（S3再取得防止） |
| `projectId` 未設定時 | ボタンを `disabled` にする |

---

## 4. 実装ステップ

### Step 1: `WorkRecordPanel.tsx` — import 追加

- [ ] `ViewRendererDialog`（`@/components/viewer/ViewRendererDialog`）を追加
- [ ] `getProjectMaiml`（`@/services/projectApiService`）を追加
- [ ] `FileData`（`@/types/editor`）を追加
- [ ] `FileSearchOutlined`（`@ant-design/icons`）を追加

### Step 2: `WorkRecordPanel.tsx` — Props インターフェース変更

- [ ] `WorkRecordPanelProps` に `projectId?: string` を追加
- [ ] `PlanProps` に `onOpenViewer?: () => void`・`viewerLoading?: boolean` を追加
- [ ] `PropertyListProps` に `onOpenViewer?: () => void`・`viewerLoading?: boolean` を追加

### Step 3: `WorkRecordPanel.tsx` — `PropertyList` JSX にボタン追加

- [ ] 既存ボタン群 `Flex`（965〜996行）の外側（条件ブロックとは独立）にビューアボタンを追加
  ```tsx
  <Flex justify="flex-end" style={{ marginTop: 4 }}>
    <Button
      size="small"
      icon={<FileSearchOutlined />}
      onClick={onOpenViewer}
      disabled={!onOpenViewer}
      loading={viewerLoading}
    >
      ペトリネットを表示（i18nキー）
    </Button>
  </Flex>
  ```

### Step 4: `WorkRecordPanel.tsx` — `PlanB` に props を流す

- [ ] `PlanB` の props 分割代入に `onOpenViewer`・`viewerLoading` を追加
- [ ] `PropertyList` への props に `onOpenViewer`・`viewerLoading` を流す

### Step 5: `WorkRecordPanel.tsx` — `WorkRecordPanel` 本体に state・ハンドラ追加

- [ ] `projectId` を props で受け取る
- [ ] `viewerDialogs` state を追加（型: `{id: string; file: FileData; fileContent: string | null; zIndex: number}[]`）
- [ ] `petriNetViewerLoading` state を追加（`useState(false)`）
- [ ] `handleOpenPetriNetViewer` を async 実装（`getProjectMaiml(projectId)` 呼び出し）
- [ ] `handleCloseViewer` / `handleFocusViewer` を実装
- [ ] `planProps` に `onOpenViewer: handleOpenPetriNetViewer`・`viewerLoading: petriNetViewerLoading` を追加
- [ ] `ViewRendererDialog` のレンダリングを追加（`viewerDialogs.map`）

### Step 6: `ExperimentWorkerMenu.tsx` — `projectId` を渡す

- [ ] `<WorkRecordPanel>` の呼び出しに `projectId={selectedProject || undefined}` を追加

### Step 7: i18n キー追加

- [ ] `ja.json` / `en.json` にビューアボタンのラベルキーを追加
  - キー例: `workRecord.petriNetViewer`
  - ja: `ペトリネットを表示`
  - en: `View Petri Net`

### Step 8: 型チェック

- [ ] `tsc --noEmit` でエラーがないことを確認

---

## 5. 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/ExperimentWorker/WorkRecordPanel.tsx` | import 追加、Props 変更、ビューアボタン追加、state・ハンドラ追加、`ViewRendererDialog` レンダリング追加 |
| `frontend/src/components/menus/ExperimentWorkerMenu.tsx` | `<WorkRecordPanel>` に `projectId` を追加 |
| `frontend/src/locales/ja.json` | `workRecord.petriNetViewer` キー追加 |
| `frontend/src/locales/en.json` | `workRecord.petriNetViewer` キー追加 |

---

## 6. 影響範囲

| 影響箇所 | 内容 |
|---------|------|
| `WorkRecordPanel` のボタン群 | 新ボタンが追加される（既存ボタンは変更なし） |
| `ExperimentWorkerMenu` | `WorkRecordPanel` への props が1つ増える（既存動作に影響なし） |
| 他コンポーネント | 変更なし |
| バックエンド | 変更なし（既存の `GET /projects/:projectId/maiml` を利用するだけ） |
| 認証・認可 | 影響なし |
| マルチテナント分離 | 影響なし（`getProjectMaiml` は認証情報から `organization_id` を自動取得） |

---

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `projectId` が未設定のまま呼び出された場合 | 低 | 低 | `disabled={!projectId}` / ハンドラ冒頭で `if (!projectId) return` ガード |
| `PlanProps` のバケツリレーが3段になる | 低 | 高（確定） | 許容範囲。`WorkRecordPanel` がフェーズBでAPI接続されたタイミングで整理 |
| フェーズA（モックデータ）との整合 | 低 | 低 | `projectId` が渡されれば実ファイルを表示し、モック表示には影響しない |

---

## 8. テスト計画

### 手動テスト

- [ ] プロジェクトを選択した状態でボタンが有効化されること
- [ ] プロジェクト未選択時にボタンが `disabled` 状態であること
- [ ] ボタン押下中にローディング表示が出ること
- [ ] ビューアダイアログが正常にペトリネットを描画すること
- [ ] ビューアダイアログを複数開けること（既存の `viewerDialogs.map` 実装）
- [ ] `isReadOnly`（完了済みトランジション閲覧中）でもボタンが表示されること

---

## 9. 関連ドキュメント

- `docs/tasks/20260819_ExperimentInstructionTabビューアボタン修正/PLAN.md` — 同一パターンの参照実装
- `frontend/src/components/ExperimentWorker/ProgressCheckTable.tsx` — 正常動作している参照実装
- `frontend/src/services/projectApiService.ts` — `getProjectMaiml` 定義

---

## 10. 承認記録

- **計画書提示日時**: 2026-08-19
- **承認日時**: 2026-08-19（act モードで作業指示を受け実施）
- **承認者コメント**: 計画書ファイルを起こしてから実行するよう指示

---

## 11. 実施記録

### 実施日時

- 開始: 2026-08-19
- 完了: 2026-08-19

### 計画からの変更点

なし。計画どおりに実施。

### 発生した問題と解決方法

なし。

### 最終的な成果物

- [x] import 追加（`ViewRendererDialog`・`getProjectMaiml`・`FileData`・`FileSearchOutlined`）
- [x] `WorkRecordPanelProps` に `projectId?: string` 追加
- [x] `PlanProps` / `PropertyListProps` に `onOpenViewer`・`viewerLoading` 追加
- [x] `PropertyList` にビューアボタン追加（readOnly に関わらず常に表示）
- [x] `PlanB` のデストラクチャリングに `onOpenViewer`・`viewerLoading` 追加し `PropertyList` に流す対応
- [x] `WorkRecordPanel` 本体に `viewerDialogs` state・`petriNetViewerLoading` state 追加
- [x] `handleOpenPetriNetViewer`・`handleCloseViewer`・`handleFocusViewer` 実装
- [x] `planProps` に `onOpenViewer`・`viewerLoading` 追加
- [x] `ViewRendererDialog` のレンダリング追加（`viewerDialogs.map`）
- [x] `ExperimentWorkerMenu.tsx` に `projectId={selectedProject || undefined}` 追加
- [x] i18n キー追加（ja.json: `"petriNetViewer": "ペトリネットを表示"` / en.json: `"petriNetViewer": "View Petri Net"`）
- [x] `tsc --noEmit` エラーなし確認済み
