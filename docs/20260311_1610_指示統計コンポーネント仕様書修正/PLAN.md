# タスク計画書: 指示統計コンポーネント仕様書修正

## メタデータ
- **作成日時**: 2026-03-11 16:10
- **タスクID**: 指示統計コンポーネント仕様書修正
- **優先度**: 低
- **推定工数**: 0.5時間

## タスク概要

`docs/design/ui/experiment_worker/ui_instruction_stats.md` の仕様書を、実際のソースコード `frontend/src/components/ExperimentWorker/InstructionStats.tsx` と一致するように修正する。

## 目的と期待される成果
- [ ] 仕様書のCardコンポーネントのbodyStyleプロパティ記述をソースコードと一致させる
- [ ] 仕様書のアイコンdivのスタイル記述をソースコードと一致させる

## 差分サマリー

### 差分1: CardコンポーネントのbodyStyleプロパティ（セクション4.3、7.2）

| 項目 | 仕様書（現状） | ソースコード（正） |
|------|-------------|----------------|
| Cardボディのpadding指定 | `bodyStyle={{ padding: '8px 24px' }}` | `styles={{ body: { padding: '8px 24px' } }}` |

### 差分2: アイコンdivの追加スタイル（セクション4.2、4.3）

| 項目 | 仕様書（現状） | ソースコード（正） |
|------|-------------|----------------|
| アイコンdivのスタイル | `fontSize: 24, color: iconColor` のみ | `display: 'flex', alignItems: 'center'` が追加されている |

## 実装ステップ

### Step 1: セクション4.3のCardコンポーネントコードブロック修正
- [ ] `bodyStyle={{ padding: '8px 24px' }}` を `styles={{ body: { padding: '8px 24px' } }}` に変更
- [ ] アイコンdivに `display: 'flex', alignItems: 'center',` を追加

### Step 2: セクション7.2のカードスタイル説明修正
- [ ] `bodyStyle`の記述を `styles.body` に変更

## 変更ファイル
1. `docs/design/ui/experiment_worker/ui_instruction_stats.md` - 仕様書の差分修正

## リスク
| リスク | 対策 |
|--------|------|
| なし | ドキュメント修正のみのため影響なし |

## テスト計画
- [ ] 修正後の仕様書を目視確認し、ソースコードと一致していることを確認

## 承認記録
- **計画書提示日時**: 2026-03-11 16:10
- **承認日時**: 2026-03-11 16:10
