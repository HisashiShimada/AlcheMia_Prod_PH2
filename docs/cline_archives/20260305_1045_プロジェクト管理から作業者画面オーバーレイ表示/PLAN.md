# タスク計画書: プロジェクト管理から作業者画面オーバーレイ表示

## メタデータ
- **作成日時**: 2026-03-05 10:45
- **タスクID**: worker-screen-overlay
- **優先度**: 中
- **推定工数**: 3時間

## タスク概要

プロジェクト管理画面（実験管理者: `ExperimentAdminMenu` → `ProjectManagement`）から、
実験作業者画面（`ExperimentWorkerMenu`）を一回り小さいオーバーレイ（フローティングウィンドウ）で表示する機能を実装する。

## 目的と期待される成果

### 目的
実験管理者がプロジェクト管理画面を操作しながら、作業者の画面状態を確認できるようにする。
画面遷移なしで両方の画面を同時に参照できることで、管理効率を向上させる。

### 期待される成果
- [ ] プロジェクト管理画面に「作業者画面を開く」ボタンを追加
- [ ] クリックすると作業者画面が小さいオーバーレイで表示される
- [ ] オーバーレイは移動・リサイズ可能（またはドラッグ可能）
- [ ] オーバーレイを閉じる×ボタンがある
- [ ] オーバーレイ内では作業者画面が正常に動作する

## 実装ステップ

### Phase 1: オーバーレイコンポーネントの作成
- [ ] `WorkerScreenOverlay.tsx` を新規作成（`frontend/src/components/project/`）
  - Ant Design の `Modal` コンポーネントを使用
  - 幅は画面の約80%（`width: '80vw'`）
  - 高さはモーダルのスタイルで約80vh相当に設定
  - タイトルバー（「作業者画面」タイトル + 閉じるボタン）
  - フッターなし（`footer={null}`）

### Phase 2: ExperimentWorkerMenu の組み込み対応
- [ ] `ExperimentWorkerMenu.tsx` に以下 Props を追加
  - `overlayMode?: boolean` - true のとき Header/SubHeader を非表示にし、コンテンツのみ表示
  - `fixedProjectId?: string` - 固定するプロジェクトID（変更不可）
  - `readOnly?: boolean` - true のときボタン類をすべて無効化
- [ ] `overlayMode=true` 時の表示制御:
  - Layout の `marginTop` を 0 に変更
  - 高さを親コンテナに合わせる (`height: 100%`)
- [ ] `fixedProjectId` 指定時:
  - プロジェクト選択コンボボックスを disabled にする
  - 初期値として `fixedProjectId` を設定する
- [ ] `readOnly=true` 時:
  - 「選択」ボタンを disabled にする
  - 「承認依頼」ボタンを disabled にする
  - メソッド・タスクのドロップダウンは操作可能のまま

### Phase 3: ProjectManagement への「作業者画面を開く」ボタン追加
- [ ] `ProjectManagement.tsx` のファイル操作ツールバーに「作業者画面」ボタンを追加
  - **配置位置**: チェックイン/チェックアウトボタン と 問題確認ボタン の間
  - 既存: `[ダウンロード] [編集] [チェックアウト] [問題確認] [公開]`
  - 変更後: `[ダウンロード] [編集] [チェックアウト] [作業者画面] [問題確認] [公開]`
- [ ] ボタンクリックで `WorkerScreenOverlay` を表示するステート管理を追加
- [ ] 選択中プロジェクトがある場合、そのプロジェクトIDをオーバーレイに渡す

### Phase 4: ExperimentAdminMenu での統合
- [ ] `ExperimentAdminMenu.tsx` でオーバーレイのステートを管理
- [ ] `ProjectManagement` から「作業者画面開く」イベントを受け取る
- [ ] `WorkerScreenOverlay` にユーザー情報を渡す

## 変更ファイル

### 新規作成
1. `frontend/src/components/project/WorkerScreenOverlay.tsx`
   - 作業者画面を表示するドラッグ可能オーバーレイコンポーネント

### 修正
2. `frontend/src/components/project/ProjectManagement.tsx`
   - Props に `onOpenWorkerScreen?: (projectId?: string) => void` を追加
   - ファイル操作ツールバーに「作業者画面」ボタンを追加

3. `frontend/src/components/menus/ExperimentWorkerMenu.tsx`
   - Props に `overlayMode?: boolean` を追加
   - `overlayMode=true` 時は Header/SubHeader を非表示にする分岐を追加

4. `frontend/src/components/menus/ExperimentAdminMenu.tsx`
   - オーバーレイのステート (`workerOverlayOpen`, `workerOverlayProjectId`) を追加
   - `WorkerScreenOverlay` のレンダリングを追加
   - `ProjectManagement` の Props に `onOpenWorkerScreen` を渡す

## 技術的詳細

### オーバーレイのサイズ・スタイル
```
幅:  min(900px, 65vw)
高さ: min(700px, 75vh)
初期位置: 右下寄り (right: 40px, bottom: 40px)
z-index: 2000（フローティングダイアログ1000より上）
```

### ドラッグ実装
- `onMouseDown` / `onMouseMove` / `onMouseUp` を使った pure CSS/JS ドラッグ
- または `react-draggable` (既存依存) を利用

### ExperimentWorkerMenu の overlayMode
```typescript
interface ExperimentWorkerMenuProps {
  // 既存 Props
  user: User;
  onLogout: () => void;
  onNavigate: (path: string) => void;
  onMenuChange?: (menuType: MenuType) => void;
  // 新規追加
  overlayMode?: boolean;        // true のとき Header/SubHeader 非表示
  initialProjectId?: string;    // 初期選択プロジェクトID
}
```

## リスク

| リスク | 対策 |
|--------|------|
| ExperimentWorkerMenu の Layout が Header 前提の marginTop を持つ | overlayMode フラグで分岐 |
| z-index の競合（既存のフローティングダイアログとの重なり） | z-index: 2000 以上を使用 |
| オーバーレイ内でのモーダル表示が切り取られる | オーバーレイに `overflow: visible` 設定、またはポータル利用 |

## テスト計画
- [ ] ボタンクリックでオーバーレイが開く
- [ ] オーバーレイが移動できる
- [ ] オーバーレイ内のタブ切り替えが動作する
- [ ] プロジェクト選択が機能する
- [ ] 閉じるボタンでオーバーレイが消える
- [ ] プロジェクト管理画面の操作に支障がない

## 承認記録
- **計画書提示日時**: 2026-03-05 10:45
- **承認日時**: 2026-03-05 10:52

## 実施記録

### 実施日時
開始: 2026-03-05 10:52
完了: 2026-03-05 11:07

### 変更ファイル（実績）

#### 新規作成
1. `frontend/src/components/project/WorkerScreenOverlay.tsx`
   - Ant Design `Modal` を使用した作業者画面オーバーレイコンポーネント
   - `fixedProjectId` / `fixedProjectName` を受け取り `ExperimentWorkerMenu` を内包

#### 修正
2. `frontend/src/components/menus/ExperimentWorkerMenu.tsx`
   - `overlayMode?: boolean` 追加 → true のとき Header/SubHeader を非表示
   - `fixedProjectId?: string` 追加 → 指定時はプロジェクト選択を disabled にして初期選択
   - `readOnly?: boolean` 追加 → 選択ボタン・承認依頼ボタンを disabled に

3. `frontend/src/components/project/ProjectManagement.tsx`
   - `onOpenWorkerScreen?: (projectId, projectName) => void` Props 追加
   - `UserOutlined` icon import 追加
   - チェックアウトボタンと問題確認ボタンの間に「作業者画面」ボタンを追加

4. `frontend/src/components/menus/ExperimentAdminMenu.tsx`
   - `WorkerScreenOverlay` import 追加
   - `workerOverlayOpen`, `workerOverlayProjectId`, `workerOverlayProjectName` ステート追加
   - `handleOpenWorkerScreen`, `handleCloseWorkerScreen` ハンドラー追加
   - `ProjectManagement` に `onOpenWorkerScreen` を渡す
   - `<WorkerScreenOverlay>` のレンダリングを追加

### 最終的な成果物
- [x] プロジェクト管理画面に「作業者画面」ボタンを追加（チェックアウトと問題確認の間）
- [x] クリックで Modal が開き、作業者画面（ExperimentWorkerMenu）を表示
- [x] 遷移元で選択中のプロジェクトに固定（コンボボックス disabled）
- [x] メソッド・タスクのドロップダウンは操作可能
- [x] 「選択」「承認依頼」ボタンは disabled
- [x] Header / SubHeader は非表示（overlayMode）
- [x] 今回の変更ファイルに TypeScript エラーなし
