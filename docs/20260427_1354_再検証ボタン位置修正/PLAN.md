# タスク計画書: 再検証ボタンと閉じるボタンの位置修正

## メタデータ
- **作成日時**: 2026-04-27 13:54
- **タスクID**: revalidate-button-position-fix
- **優先度**: 低
- **推定工数**: 0.1時間

## タスク概要

MAIML編集画面のバリデーション結果パネル（ValidationPanel）において、再検証ボタン（🔄）と Modal の閉じるボタン（✕）が近すぎて誤操作が発生しやすい。両ボタン間に余白を追加して位置をずらす。

## 目的と期待される成果

### 目的
再検証ボタンと閉じるボタンが隣接しているため、誤クリックのリスクがある。適切な余白を設けることで操作性を向上させる。

### 期待される成果
- [ ] 再検証ボタンと閉じるボタンの間に十分な余白が確保される
- [ ] 誤クリックのリスクが低減される

## 実装ステップ

### Phase 1: 修正実装
- [ ] `frontend/src/components/editorv2/components/ValidationPanel.tsx` の該当箇所に `marginRight` を追加

## 変更ファイル

### 修正
1. `frontend/src/components/editorv2/components/ValidationPanel.tsx` - 再検証ボタンを含む `<Space>` に `style={{ marginRight: 32 }}` を追加

## 技術的詳細

### 問題箇所
`ValidationPanel.tsx` 328〜354行目の Modal `title` prop 内：

```tsx
// 現在（問題あり）
<Space>
  {onRevalidate && (
    <Tooltip title="再検証">
      <Button 
        icon={<ReloadOutlined />}
        onClick={onRevalidate}
        disabled={isValidating}
        type="text"
      />
    </Tooltip>
  )}
</Space>
```

Ant Design の Modal は `title` の右端に閉じるボタン（✕）を自動配置するため、右寄せで配置された再検証ボタンと隣接してしまう。

### 修正内容
```tsx
// 修正後
<Space style={{ marginRight: 32 }}>
  {onRevalidate && (
    <Tooltip title="再検証">
      <Button 
        icon={<ReloadOutlined />}
        onClick={onRevalidate}
        disabled={isValidating}
        type="text"
      />
    </Tooltip>
  )}
</Space>
```

`marginRight: 32` を追加することで、再検証ボタンが閉じるボタンから32px離れる。

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 余白が大きすぎてレイアウトが崩れる | 低 | 低 | 32pxは適切な値だが、必要に応じて調整 |

## テスト計画

### 手動テスト
- [ ] ValidationPanel を開いて、再検証ボタンと閉じるボタンの間隔が広がっていることを目視確認

## 承認記録
- **計画書提示日時**: 2026-04-27 13:54
- **承認日時**: （承認後記入）
