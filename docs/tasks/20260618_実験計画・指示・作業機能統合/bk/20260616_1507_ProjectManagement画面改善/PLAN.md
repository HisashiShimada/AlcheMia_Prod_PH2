# タスク計画書: ProjectManagement画面改善

## メタデータ
- **作成日時**: 2026-06-16 15:07
- **タスクID**: PM画面改善3機能
- **優先度**: 高
- **推定工数**: 4-5日

## タスク概要

ProjectManagementのMockをユーザー確認した結果、以下3つの改善を実施する。

1. **実験指示タブ：ペトリネットビューア機能追加**（工数：0.5日）
2. **実験指示タブ：テーブル列表示カスタマイズ機能**（工数：1日）
3. **実験計画指示ダイアログ：トランジション実行順序登録機能**（工数：2-3日）

> **ステータス更新（2026-06-16 15:45）**  
> 全3フェーズ実装完了。  
> Phase 2はユーザーフィードバックにより仕様変更：  
> XMLViewer+モーダル → **ViewRendererDialogによるフローティング表示**（ファイル管理タブと同等）  
> ボタンラベルも「MAIMLを表示」→「**ペトリネットを表示**」に変更済み。

## 目的と期待される成果
- [x] 実験指示タブでペトリネット図をフローティングダイアログで確認できるようになる（仕様変更後・実装済み）
- [x] 実験指示タブのテーブル表示列をチェックボックスで任意に切替できるようになる（実装済み）
- [x] 実験計画指示ダイアログで並列トランジションの実行順序を登録できるようになる（実装済み）

---

## 実装ステップ

### Phase 1: 実験指示タブ — 列カスタマイズ機能

**対象ファイル**: `frontend/src/components/project/ExperimentInstructionTab.tsx`

#### 確定仕様
- チェックボックスによるドロップダウンで各列の表示/非表示を切替
- **固定列**（非表示にできない）：タスクNo、Key、操作
- **デフォルト**：全列表示
- **LocalStorage保存**：なし（毎回デフォルトに戻る）
- **列名変更**：
  - 現「メソッドID」→「メソッド名」（`methodName`を優先表示、なければ`methodId`）
  - 現「トランジションID」→「トランジション名」（`transitionName`を優先表示、なければ`transitionId`）

#### 変更内容
- `FlatRow`型に`methodName`・`transitionName`フィールドを確認（既存コード調査済み）
- `columns`定義に表示/非表示フラグを連動させる
- ツールバーに「列を選択▼」Dropdownボタンを追加
- Dropdownメニューにチェックボックスリストを実装

- [x] `visibleColumnKeys` state追加（デフォルト：全列）
- [x] `FIXED_COLUMN_KEYS` / `TOGGLEABLE_COLUMN_DEFS` / `ALL_COLUMN_KEYS` 定数定義
- [x] `columns` useMemoを `visibleColumnKeys` に連動させる
- [x] ツールバーに Dropdown + Checkbox リストを追加
- [x] 列名を「メソッド名」「トランジション名」に変更し name 優先表示に対応

---

### Phase 2: 実験指示タブ — ペトリネットビューア機能

**対象ファイル**: `frontend/src/components/project/ExperimentInstructionTab.tsx`

> ⚠️ **仕様変更（2026-06-16 ユーザーフィードバックにより）**
> - ~~XMLViewer + Modalによるテキスト表示~~
> - → **ViewRendererDialogによるフローティング表示**（ファイル管理タブと同等のUI/UX）
> - ~~「MAIMLを表示」~~ → **「ペトリネットを表示」**

#### 確定仕様（変更後）
- ツールバーに「ペトリネットを表示」ボタン（`FileSearchOutlined` アイコン）を追加
- クリックで `ViewRendererDialog` フローティングダイアログを開く
  - ドラッグ＆リサイズ可能（react-rnd）
  - 最小化・最大化機能あり
  - ファイル管理タブのビューアと**同等の機能**
- MAIMLファイルパスはプロジェクト名から自動生成
  - `{projectName}/{projectName}.maiml`

#### 変更内容
- `XMLViewer` import と `getProjectMaiml` API呼び出しを削除
- `ViewRendererDialog` import を追加（`@/components/viewer/ViewRendererDialog`）
- `FileData` 型 import を追加（`@/types/editor`）
- `maimlViewerOpen` / `maimlContent` 関連 state を削除
- `viewerDialogs` state を追加（フローティングダイアログの管理）
- ハンドラ `handleOpenPetriNetViewer` / `handleCloseViewer` / `handleFocusViewer` を実装
- XMLViewerモーダルのJSXを削除し、ViewRendererDialogのレンダリングに差し替え

#### 実装タスク（完了）
- [x] `XMLViewer` / `getProjectMaiml` の import を削除
- [x] `ViewRendererDialog` / `ProjectFile` の import を追加
- [x] `viewerDialogs` state 追加（型: `{id: string; file: ProjectFile; zIndex: number}[]`）
- [x] `maimlViewerOpen` / `maimlContent` state を削除
- [x] `handleOpenPetriNetViewer` ハンドラ実装（ProjectFileオブジェクト生成 → viewerDialogsに追加）
- [x] `handleCloseViewer` / `handleFocusViewer` ハンドラ実装
- [x] ツールバーボタンのラベルを「ペトリネットを表示」に変更、onClick を `handleOpenPetriNetViewer` に変更
- [x] XMLViewerモーダルのJSXを削除
- [x] ViewRendererDialogのレンダリングを追加（viewerDialogs.mapで複数対応）

---

### Phase 3: 実験計画指示ダイアログ — トランジション実行順序登録機能

**対象ファイル**: `frontend/src/components/project/ExperimentPlanDialog.tsx`

#### 確定仕様
- 選択方式：**単一選択（ラジオボタン）**（変更なし）
- トランジションを選択→「追加」ボタンで実行順序リストに追加
- 実行順序リスト内で上下移動ボタン（↑/↓）で順序変更・削除ボタン（🗑）
- 保存時：`selected_transitions` 配列に**順序付きで**保存（例: `["t3", "t1", "t2"]`）
- 並列トランジションのみが対象（MAIMLのペトリネット構造から判断）

#### 画面イメージ
```
左パネル（トランジション選択）
  ┌────────────────────────────────────────┐
  │ トランジション一覧                   │
  │ ─────────────────────────────────     │
  │ ○ Transition_A（並列）               │ ← 単一選択
  │ ○ Transition_B（並列）               │
  │ ○ Transition_C（逐次）               │
  │                                        │
  │ [追加] ← 選択中のトランジションを     │
  │          実行順序リストに追加         │
  │                                        │
  │ ─── 実行順序 ──────────────────────── │
  │ 1. Transition_B  [↑][↓][🗑]          │
  │ 2. Transition_A  [↑][↓][🗑]          │
  └────────────────────────────────────────┘
```

#### 変更内容
- `selectedTransitions: string[]` を**順序付き配列**として扱う（既存の型は配列型）
- `TransitionRow`に選択状態を`radioSelected`として管理
- 実行順序リスト（`orderedTransitions`）を別stateで管理
- 追加・削除・上下移動のハンドラを実装
- `tabDataMap`の`selectedTransitions`更新ロジックを修正
- 継承ロジック（overrideFlags）への影響を確認・対応

- [x] `radioSelectedTransition` state（単一選択用）
- [x] `orderedTransitions` state実装（順序付き配列）
- [x] 「追加」ボタンハンドラ実装（重複チェック含む）
- [x] 上下移動ハンドラ実装（handleMoveUp / handleMoveDown）
- [x] 削除ハンドラ実装
- [x] 実行順序リストのUI実装（順序番号 + ↑↓ + 🗑）
- [x] 保存時の`selectedTransitions`配列が順序を保持していることを確認
- [x] 継承ロジック（全体タブ → タスクNへの伝播）が`selectedTransitions`にも正しく動作することを確認

---

## 変更ファイル一覧

### 修正（既存ファイル）
1. `frontend/src/components/project/ExperimentInstructionTab.tsx` — Phase1・Phase2の改修
2. `frontend/src/components/project/ExperimentPlanDialog.tsx` — Phase3の改修

### 新規作成
なし（既存コンポーネントを活用）

---

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| MAIMLコンテンツ取得方法が未確認 | 中 | 中 | ProjectMaimlContextのraw XML取得可否を事前確認 |
| トランジション順序UIと既存の選択UIの競合 | 中 | 低 | 選択UIとリストUIを明確に分離して設計 |
| 列カスタマイズでColumnTypeのkeyを固定化する必要がある | 低 | 低 | dataIndexを文字列リテラルで管理 |

---

## テスト計画

### Phase 1 — 列カスタマイズ
- [ ] デフォルトで全列が表示されること
- [ ] チェックボックスOFF → 対応列が非表示になること
- [ ] 固定列（タスクNo、Key、操作）はチェックボックスが無効（グレーアウト）
- [ ] 「デフォルトに戻す」で全列表示に戻ること
- [ ] メソッド名：nameがある場合はname表示、ない場合はIDのフォールバック
- [ ] トランジション名：nameがある場合はname表示、ない場合はIDのフォールバック

### Phase 2 — ペトリネットビューア（仕様変更後）
- [ ] 「ペトリネットを表示」ボタンクリックでViewRendererDialogが開くこと
- [ ] ドラッグ＆リサイズが可能なこと
- [ ] 最小化・最大化が機能すること
- [ ] MAIMLのペトリネット図が表示されること
- [ ] ダイアログを閉じられること

### Phase 3 — トランジション順序
- [ ] トランジション選択 → 追加 → 実行順序リストに表示
- [ ] 同じトランジションを2度追加しようとすると警告またはスキップ
- [ ] ↑ボタンで上に移動、↓ボタンで下に移動
- [ ] 🗑ボタンで削除
- [ ] 保存時にselectedTransitions配列が順序通りに保存されること
- [ ] 全体タブで設定した順序がタスクNタブに継承されること

---

## 承認記録
- **計画書提示日時**: 2026-06-16 15:07
- **承認日時**: 2026-06-16 15:07
- **承認者コメント**: ユーザーがAct Modeに切り替えにより承認

## 実施記録

### 実施日時
開始: 2026-06-16 15:07
完了: 2026-06-16 15:45

### 計画からの変更点
- **Phase 2 仕様変更**（2026-06-16 ユーザーフィードバック）
  - 当初実装: XMLViewer + Ant Design Modal でXMLテキスト表示 → **破棄**
  - 変更後仕様: ViewRendererDialog によるフローティング表示（ファイル管理タブと同等）
  - ボタンラベル: 「MAIMLを表示」 → 「ペトリネットを表示」
  - **変更後の実装完了（2026-06-16 15:42）**

### 実施状況
- [x] Phase 1: ExperimentInstructionTab.tsx — 列カスタマイズ機能（実装済み）
- [x] Phase 2: ExperimentInstructionTab.tsx — ペトリネットビューア機能（**仕様変更後・実装完了 2026-06-16 15:42**）
- [x] Phase 3: ExperimentPlanDialog.tsx — トランジション実行順序登録機能（**追加仕様変更後・実装完了 2026-06-17 09:58**）
  - 変更内容：追加ボタン方式 → 全トランジション表示 + ドラッグ&ドロップ + Select手入力による順序設定
  - モック：transitions[2]（3番目）を依存関係により順序固定（🔒アイコン・オレンジ背景・「固定」タグ表示）
  - TODO：将来的にTransition/Arc/Placeの関係解析により isFixed を自動判定

### Phase 2 変更サマリ（ExperimentInstructionTab.tsx）
| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| ボタンラベル | MAIMLを表示 | ペトリネットを表示 |
| 表示方式 | Ant Design Modalでテキスト（XMLViewer） | ViewRendererDialogフローティング |
| import | XMLViewer, getProjectMaiml | ViewRendererDialog, ProjectFile |
| state | maimlViewerOpen / maimlContent / maimlLoading | viewerDialogs[] |
| ハンドラ | handleOpenMaimlViewer | handleOpenPetriNetViewer / Close / Focus |
