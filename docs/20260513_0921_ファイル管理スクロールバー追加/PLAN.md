# タスク計画書: ファイル管理タブ縦スクロールバー追加

## メタデータ
- **作成日時**: 2026-05-13 09:21
- **タスクID**: ファイル管理スクロールバー追加
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

「実験管理者メニュー」→「ファイル管理」タブで縦スクロールバーが表示されない問題を修正する。
ファイル一覧が画面の高さを超えた場合に縦スクロールバーが表示されるよう対応する。

## 目的と期待される成果

### 目的
- ファイル管理タブでファイル数が多い場合にスクロールできず、下部のファイルが操作できない問題を解消する

### 期待される成果
- [x] ファイル管理タブで縦スクロールバーが表示される
- [x] 他タブ（タスク登録・指示登録・タスク結果）への影響がない
- [x] フロントエンド TypeScript エラーがない

## 実装ステップ

### Phase 1: 原因調査
- [x] ファイル管理関連コンポーネントを特定
- [x] スクロールが効かない原因を調査（overflow: hidden の重なり）

### Phase 2: 実装
- [x] `ProjectManagement.tsx` の `file_management` タブを `overflow: auto` の div でラップ
- [x] `ProjectManagement.tsx` の `Tabs` コンポーネント style に `minHeight: 0` を追加

### Phase 3: TypeScript エラーチェック
- [x] フロントエンド `tsc --noEmit` 実行
- [x] バックエンド `tsc --noEmit` 実行

## 変更ファイル

| ファイル | 変更種別 | 変更内容 |
|---|---|---|
| `frontend/src/components/project/ProjectManagement.tsx` | 修正 | `file_management` タブの children を `overflow: auto` の div でラップ、Tabs の style に `minHeight: 0` 追加 |
| `frontend/src/utils/__tests__/errorMapper.test.ts` | 付随修正 | import パス `../errorMapper` → `../errorUtils` に修正（TSエラー解消） |

## 技術的詳細

### 原因
`ExperimentAdminMenu` → `Content` → `ProjectManagement` → `Tabs` の各階層に `overflow: hidden` が設定されており、
`FileListTable` のコンテンツが親要素からはみ出してもスクロールバーが表示されない状態だった。

### 修正内容

#### ① file_management タブを overflow:auto でラップ
```tsx
// 修正前
children: (
  <FileListTable ... />
),

// 修正後
children: (
  <div style={{ overflow: 'auto', height: '100%' }}>
    <FileListTable ... />
  </div>
),
```

#### ② Tabs に minHeight:0 を追加
flex コンテナ配下でスクロールを正しく機能させるために必要。
```tsx
style={{
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  minHeight: 0,  // 追加
}}
```

### 付随修正（TSエラー解消）
`errorMapper.test.ts` が存在しないファイル `errorMapper.ts` を import しており、
TypeScript エラーが2件発生していたため、正しいパス `errorUtils.ts` に修正した。

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 他タブのレイアウト崩れ | 低 | 低 | file_management タブのみラップしており他タブ非影響 |

## テスト計画

### 手動テスト
- [x] ファイル管理タブで縦スクロールバーが表示されること
- [x] 他タブのレイアウトが正常であること
- [x] TypeScript エラーがないこと（tsc --noEmit で確認済み）

## 承認記録

- **計画書提示日時**: 2026-05-13 09:21
- **承認日時**: 2026-05-13 09:21
- **承認者コメント**: 実施済み

## 実施記録

### 実施日時
開始: 2026-05-13 09:21  
完了: 2026-05-13 09:40

### 最終的な成果物
- [x] ファイル管理タブに縦スクロールバーを追加（`ProjectManagement.tsx`）
- [x] TypeScript エラーをゼロに修正（フロント・バック両方 EXIT:0 確認済み）
