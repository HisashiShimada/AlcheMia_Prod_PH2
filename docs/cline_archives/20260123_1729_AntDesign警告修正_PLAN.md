# タスク計画書: Ant Design v6 Deprecation警告修正

## メタデータ
- **作成日時**: 2026-01-23 17:36
- **タスクID**: antd-deprecation-fix
- **優先度**: 中
- **推定工数**: 1時間

## 1. タスク概要

コンソールに表示されているAnt Design v6のdeprecation警告を修正する。
非推奨プロパティを新しいプロパティに置き換えることで、将来のメジャーバージョンアップへの準備を行う。

## 2. 目的と期待される成果

### 目的
Ant Design v6の非推奨プロパティを最新の推奨プロパティに置き換え、コンソール警告をクリーンにする。

### 期待される成果
- [ ] コンソールにAnt Design関連の警告が表示されない
- [ ] すべてのコンポーネントがAnt Design v6の推奨プロパティを使用
- [ ] 既存の機能が正常に動作する

## 3. 確認された警告一覧

### 警告1: Space - direction → orientation
```
Warning: [antd: Space] `direction` is deprecated. Please use `orientation` instead.
```
- **影響ファイル**: 複数（検索で特定）

### 警告2: Card - bodyStyle → styles.body
```
Warning: [antd: Card] `bodyStyle` is deprecated. Please use `styles.body` instead.
```
- **影響ファイル**: ProjectManagement.tsx:977

### 警告3: Card - bordered → variant
```
Warning: [antd: Card] `bordered` is deprecated. Please use `variant` instead.
```
- **影響ファイル**: ProjectManagement.tsx:977

### 警告4: List - コンポーネント自体が非推奨
```
Warning: [antd: List] The `List` component is deprecated. And will be removed in next major version.
```
- **影響ファイル**: ProjectFolderTree.tsx:173
- **対応**: 代替コンポーネントへの移行検討が必要

### 警告5: Modal - destroyOnClose → destroyOnHidden
```
Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.
```
- **影響ファイル**: ProjectSearchModal.tsx:326

## 4. 実装ステップ

### Phase 1: ファイル特定と影響範囲調査
- [ ] search_filesで`direction`プロパティを使用している箇所を特定
- [ ] ProjectManagement.tsxの該当箇所を確認
- [ ] ProjectFolderTree.tsxの該当箇所を確認
- [ ] ProjectSearchModal.tsxの該当箇所を確認

### Phase 2: Space - direction → orientation修正
- [ ] すべての`<Space direction="vertical">`を`<Space orientation="vertical">`に変更
- [ ] すべての`<Space direction="horizontal">`を`<Space orientation="horizontal">`に変更（デフォルトなので省略も検討）

### Phase 3: Card修正
- [ ] `bodyStyle`を`styles={{ body: {...} }}`に変更
- [ ] `bordered={false}`を`variant="borderless"`に変更
- [ ] `bordered={true}`はデフォルトなので削除

### Phase 4: Modal修正
- [ ] `destroyOnClose`を`destroyOnHidden`に変更

### Phase 5: List対応検討
- [ ] ProjectFolderTree.tsxでのList使用状況を確認
- [ ] 代替コンポーネント（Flex、Space等）への移行を検討
- [ ] または非推奨警告の抑制を検討（短期的対応）

### Phase 6: 動作確認
- [ ] プロジェクト管理画面が正常に表示される
- [ ] 実験管理者メニューが正常に動作する
- [ ] コンソールに警告が表示されない

## 5. 影響範囲

### 変更するファイル（予定）
1. `frontend/src/components/project/ProjectManagement.tsx` - Card修正
2. `frontend/src/components/project/ProjectFolderTree.tsx` - List対応
3. `frontend/src/components/project/ProjectSearchModal.tsx` - Modal修正
4. その他（search_filesで特定）- Space修正

### 影響を受ける機能
- プロジェクト管理画面
- 実験管理者メニュー画面
- すべてのSpaceコンポーネントを使用している画面

## 6. 技術的詳細

### 修正パターン

#### Pattern 1: Space修正
```tsx
// ❌ 修正前
<Space direction="vertical">
  {children}
</Space>

// ✅ 修正後
<Space orientation="vertical">
  {children}
</Space>
```

#### Pattern 2: Card修正（bodyStyle）
```tsx
// ❌ 修正前
<Card bodyStyle={{ padding: 24 }}>
  {children}
</Card>

// ✅ 修正後
<Card styles={{ body: { padding: 24 } }}>
  {children}
</Card>
```

#### Pattern 3: Card修正（bordered）
```tsx
// ❌ 修正前
<Card bordered={false}>
  {children}
</Card>

// ✅ 修正後
<Card variant="borderless">
  {children}
</Card>
```

#### Pattern 4: Modal修正
```tsx
// ❌ 修正前
<Modal destroyOnClose>
  {children}
</Modal>

// ✅ 修正後
<Modal destroyOnHidden>
  {children}
</Modal>
```

## 7. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| Listの代替コンポーネント移行が困難 | 高 | 中 | 段階的移行、または警告抑制で対応 |
| スタイルの微妙な変化 | 低 | 低 | 視覚的な確認を徹底 |
| 大量のファイル修正 | 中 | 高 | search_filesで一括特定、段階的修正 |

## 8. テスト計画

### 手動テスト
- [ ] プロジェクト管理画面が正常に表示される
- [ ] カードのスタイルが変わっていない
- [ ] モーダルの動作が正常
- [ ] プロジェクトフォルダツリーが正常に表示される
- [ ] ブラウザコンソールに警告が表示されない

### 視覚的確認
- [ ] レイアウトに崩れがない
- [ ] スペーシングが適切
- [ ] カードのボーダー表示が正しい

## 9. ロールバック計画

問題が発生した場合：
1. Gitで変更を元に戻す
2. 個別ファイルごとにロールバック可能

## 10. 関連ドキュメント

- [Ant Design v6 Migration Guide](https://ant.design/docs/react/migration-v6)
- [Ant Design v6 Changelog](https://ant.design/changelog)

## 11. 承認記録

- **計画書提示日時**: 2026-01-23 17:36
- **承認日時**: （承認待ち）
- **承認者コメント**: （承認後記入）

## 12. 実施記録

### 実施日時
- 開始: （実施時記入）
- 完了: （実施時記入）

### 計画からの変更点
（実施中に発生した変更を記録）

### 発生した問題と解決方法
（実施中の問題を記録）

### 最終的な成果物
- [ ] 修正完了ファイルリスト

## 13. 振り返り

### うまくいった点
（完了後記入）

### 改善が必要な点
（完了後記入）

### 学んだこと
（完了後記入）