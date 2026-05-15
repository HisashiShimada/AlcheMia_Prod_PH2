# タスク計画書: 実験管理者タブ遷移時の状態保持修正

## メタデータ
- **作成日時**: 2026-05-14 13:13
- **タスクID**: tab-state-preserve-fix
- **優先度**: 中
- **推定工数**: 0.5時間

## タスク概要

実験管理者画面（ExperimentAdminMenu）において、フォーマット管理タブ（タブ2）と進捗確認タブ（タブ3）で設定したフィルタ・選択状態が、別のタブへ遷移した後に元に戻ってしまう問題を修正する。

## 目的と期待される成果

### 目的
タブ切り替え時にコンポーネントのローカル state が破棄される問題を解消し、ユーザー操作の継続性を確保する。

### 期待される成果
- [ ] フォーマット管理タブで設定したフィルタ（カテゴリ・ファイルタイプ・検索テキスト）が他タブ遷移後も保持される
- [ ] フォーマット管理タブで選択したフォーマット・フォルダ階層が他タブ遷移後も保持される
- [ ] 進捗確認タブで設定したフィルタ（担当者・部門・プロジェクトステータス・チェックアウト・検索テキスト）が他タブ遷移後も保持される
- [ ] 進捗確認タブのページネーション状態が他タブ遷移後も保持される

## 実装ステップ

### Phase 1: ExperimentAdminMenu.tsx の修正
- [ ] Content エリア内の三項演算子ネストを `display: none` 方式に書き換える

## 変更ファイル

### 修正
1. `frontend/src/components/menus/ExperimentAdminMenu.tsx` - コンテンツエリアのタブ切り替え実装を修正

## 技術詳細

### 問題の原因
`ExperimentAdminMenu.tsx` のコンテンツエリアは三項演算子のネストで実装されており、アクティブでないタブのコンポーネントがアンマウントされる。

```tsx
// 現在の実装（問題あり）
{currentTab === '1' ? (
  <ProjectManagement ... />
) : currentTab === '2' ? (
  <FormatManagement ... />   // タブ切替時にアンマウント→state消滅
) : currentTab === '3' ? (
  <ProgressMonitoring />     // タブ切替時にアンマウント→state消滅
) : (...)}
```

### 解決方法
全タブのコンポーネントを常時マウントしつつ、`display: none` で非アクティブなタブを非表示にする。これによりアンマウントが発生せず、内部 state が保持される。

この方式は `ExperimentWorkerMenu.tsx` で採用されている `<Tabs items={[{children}]}>` 方式と**同等の動作原理**である。

- `ExperimentWorkerMenu`: Ant Design `<Tabs>` が内部で自動的に `display: none` を適用してコンポーネントをマウント維持
- `ExperimentAdminMenu`（修正後）: 手動で `display: none` を適用してコンポーネントをマウント維持

`ExperimentAdminMenu` は `SubHeader` コンポーネントにタブバーのナビゲーションを委譲するアーキテクチャのため、`SubHeader` は**タブラベル・アイコンのみを受け取り `children` は持たない設計**になっている。そのため `<Tabs items={[{children}]}>` 方式への統一にはアーキテクチャの大幅変更が必要となり、今回は `display: none` 方式で state 保持の動作を実現する。

```tsx
// 修正後の実装
<Content style={{ marginTop: TOTAL_HEADER_HEIGHT, padding: 0, height: `calc(100vh - ${TOTAL_HEADER_HEIGHT}px)`, overflow: 'hidden' }}>
  {/* タブ1: プロジェクト管理 */}
  <div style={{ display: currentTab === '1' ? 'block' : 'none', height: '100%', overflow: 'hidden' }}>
    <ProjectManagement onEdit={handleEditProject} onOpenWorkerScreen={handleOpenWorkerScreen} />
  </div>

  {/* タブ2: フォーマット管理 */}
  <div style={{ display: currentTab === '2' ? 'block' : 'none', height: '100%', overflow: 'hidden' }}>
    <FormatManagement user={user} />
  </div>

  {/* タブ3: 進捗確認 */}
  <div style={{ display: currentTab === '3' ? 'block' : 'none', height: '100%', overflow: 'auto' }}>
    <ProgressMonitoring />
  </div>
</Content>
```

### アーキテクチャ上の考慮事項
- `SubHeader.tsx` はタブバー（ナビゲーション）のみを担当。`children`（コンテンツ）は含まない設計
- `ExperimentWorkerMenu.tsx` は `<Tabs items>` を Content エリアに直接配置しているため state が保持される
- `display: none` 方式は Ant Design `<Tabs>` の内部動作と等価であり、state 保持効果は同じ

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 非表示タブのコンポーネントが初回マウント時にAPI呼び出しを実行する | 低 | 高 | 許容範囲（既存の初回ロード動作と同様） |
| display:none 時に isFullWidthTab の高さ計算が干渉する | 低 | 低 | 各 div の height/overflow を個別に設定することで回避 |

## テスト計画

### 手動テスト
- [ ] フォーマット管理タブでカテゴリフィルタを変更 → プロジェクト管理タブへ遷移 → フォーマット管理タブに戻る → フィルタが保持されていることを確認
- [ ] フォーマット管理タブでフォーマットを選択してフォルダを開く → 別タブへ遷移 → 戻る → 選択・フォルダ状態が保持されていることを確認
- [ ] 進捗確認タブで各フィルタを変更 → 別タブへ遷移 → 戻る → フィルタが保持されていることを確認
- [ ] 進捗確認タブでページ2に移動 → 別タブへ遷移 → 戻る → ページが保持されていることを確認

## 承認記録
- **計画書提示日時**: 2026-05-14 13:13
- **承認日時**: 
- **承認者コメント**: 

## 実施記録

### 実施日時
開始:
完了:

### 最終的な成果物
- [ ] `ExperimentAdminMenu.tsx` の修正完了
