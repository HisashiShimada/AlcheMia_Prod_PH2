# タスク計画書: Ant Design警告解消 Phase 2（v6非推奨API対応）

## メタデータ
- **作成日時**: 2026-01-26 09:01
- **タスクID**: antd-warnings-fix-phase2-v6-apis
- **優先度**: 高
- **推定工数**: 1-2時間

## 1. タスク概要

Phase 1で対応した警告に加えて、Ant Design v6で非推奨となったAPIを最新のAPIに置き換えます。

### 発生している警告
1. `[antd: Modal] destroyOnClose is deprecated. Please use destroyOnHidden instead.`
2. `[antd: Alert] message is deprecated. Please use title instead.`
3. `[antd: Spin] tip only work in nest or fullscreen pattern.`
4. `[antd: Card] bordered is deprecated. Please use variant instead.`
5. `[antd: Input] addonAfter is deprecated. Please use Space.Compact instead.`

## 2. 目的と期待される成果

### 目的
- Ant Design v6の最新APIに準拠
- すべてのコンソール警告を解消
- 将来のバージョンアップに備えた実装

### 期待される成果
- [ ] Alert.message → Alert.title 変更完了
- [ ] Spin.tip の適切な使用
- [ ] Card.bordered → Card.variant 変更完了
- [ ] Input.addonAfter → Space.Compact 変更完了
- [ ] Modal.destroyOnClose → Modal.destroyOnHidden 変更完了（該当箇所があれば）

## 3. 実装ステップ

### Phase 1: Alert message → title 変更

#### 対象ファイル（10ファイル）
1. editor/TemplateEditorDialog.tsx (9箇所)
2. editor/DraftManager.tsx (2箇所)
3. editor/WorkflowSelectorDialog.tsx (1箇所)
4. editor/PetriNetEditor.tsx (1箇所)
5. editor/ValidationPanel.tsx (1箇所)
6. editor/SaveConfirmDialog.tsx (2箇所)
7. editor/MultiObjectEditor.tsx (2箇所)
8. editor/DocumentEditDialog.tsx (5箇所)
9. progress/PetriNetVisualization.tsx (2箇所)
10. progress/WorkProgressDetailDialog.tsx (1箇所)

**合計: 約26箇所**

#### 修正パターン
```typescript
// Before (非推奨)
<Alert message="メッセージ" type="info" />

// After (推奨)
<Alert title="メッセージ" type="info" />
```

### Phase 2: Spin tip の修正

#### 対象ファイル（2ファイル）
1. editor/TemplateEditorDialog.tsx (1箇所)
2. progress/WorkProgressDetailDialog.tsx (1箇所)

**合計: 2箇所**

#### 修正パターン
```typescript
// Before (警告が出る）
<Spin tip="読み込み中..." />
{content}

// After（推奨: nest pattern）
<Spin tip="読み込み中...">
  {content}
</Spin>

// または fullscreen pattern
<Spin tip="読み込み中..." fullscreen />
```

### Phase 3: Card bordered → variant 変更

#### 対象ファイル（1ファイル）
1. progress/WorkProgressDetailDialog.tsx (2箇所)

**合計: 2箇所**

#### 修正パターン
```typescript
// Before (非推奨)
<Card bordered={false}>content</Card>

// After (推奨)
<Card variant="borderless">content</Card>
```

### Phase 4: Input addonAfter → Space.Compact 変更

#### 対象ファイル（1ファイル）
1. project/CreateFormatFileModal.tsx (1箇所)

**合計: 1箇所**

#### 修正パターン
```typescript
// Before (非推奨)
<Input addonAfter=".xml" />

// After (推奨)
<Space.Compact>
  <Input />
  <Button>.xml</Button>
</Space.Compact>
```

### Phase 5: Modal destroyOnClose 検索と対応

destroyOnCloseの使用箇所を検索し、必要に応じて修正します。

## 4. 影響範囲

### 変更するファイル
- **editor/**: 8ファイル
- **progress/**: 2ファイル
- **project/**: 1ファイル
- **viewer/**: 0ファイル（該当なし）

### 修正箇所の合計
- Alert message → title: 約26箇所
- Spin tip: 2箇所
- Card bordered: 2箇所
- Input addonAfter: 1箇所
- **合計: 約31箇所**

## 5. 技術的詳細

### Ant Design v6 非推奨API
これらはAnt Design v6で非推奨となり、v7で削除される予定のAPIです。

### 後方互換性
- v6では両方のAPIが動作
- 早期に移行することで将来のバージョンアップが容易

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| UI表示の崩れ | 中 | 低 | 段階的修正と都度確認 |
| 大量修正によるミス | 中 | 中 | パターン化と自動置換 |
| Spin nest patternでの不具合 | 低 | 低 | コンテンツの構造確認 |

## 7. テスト計画

### 手動テスト
- [ ] 開発サーバーでコンソール確認
- [ ] 全画面の表示確認
- [ ] Alertの表示確認
- [ ] Spinの表示確認
- [ ] Cardの表示確認
- [ ] Input.addonAfterの表示確認

## 8. ロールバック計画

Gitでコミット前の状態に戻すことで対応可能

## 9. 関連ドキュメント

- docs/20260126_0831_AntDesign警告解消_最終報告.md (Phase 1)
- [Ant Design v6 Migration](https://ant.design/docs/react/migration-v6)

## 10. 承認記録

- **計画書提示日時**: 2026-01-26 09:01
- **承認日時**: （承認待ち）
- **承認者コメント**: 

## 11. 実施記録

### 実施日時
開始: （未開始）
完了: （未完了）

### 計画からの変更点
（実施後に記録）