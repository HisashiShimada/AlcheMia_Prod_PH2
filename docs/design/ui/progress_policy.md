# 進捗状況表示ポリシー

## 標準3パターン

### パターン1: 線形プログレス（水平バー）
**用途**: ファイルアップロード、データ処理、タスク進行状況
- タイプ: `line`
- 高さ: 8px（デフォルト）
- 幅: 親要素に合わせる（100%）
- 進捗色: `token.colorPrimary` (#CF0027)
- 背景色: `token.colorFillSecondary` (#f5f5f5)
- ボーダーラジアス: `token.borderRadius` (8px)
- パーセンテージ表示: 右側に表示（例: 75%）
- フォントサイズ: `token.fontSize` (14px)
- テキスト色: `token.colorText` (#212121)

---

### パターン2: 円形プログレス（小）
**用途**: ダッシュボードのKPI表示、コンパクトな進捗表示
- タイプ: `circle`
- サイズ: 80px × 80px
- 線の太さ: 6px
- 進捗色: `token.colorPrimary` (#CF0027)
- 背景色: `token.colorFillSecondary` (#f5f5f5)
- パーセンテージ表示: 中央に表示
- フォントサイズ: 20px（パーセンテージ）
- テキスト色: `token.colorText` (#212121)

---

### パターン3: ステップ表示
**用途**: ウィザード形式の処理、段階的なワークフロー
- タイプ: `Steps` コンポーネント
- サイズ: `default`
- アイコン表示: あり
- 方向: 水平（horizontal）
- 完了色: `token.colorPrimary` (#CF0027)
- 進行中色: `token.colorPrimary` (#CF0027)
- 未完了色: `token.colorTextTertiary` (#9e9e9e)
- 線の色（完了）: `token.colorPrimary` (#CF0027)
- 線の色（未完了）: `token.colorBorderSecondary` (rgba(0,0,0,0.06))

---

## 共通仕様（全パターン）

### 色定義

**成功状態**
- 進捗色: `token.colorSuccess` (#2e7d32)
- 背景色: `token.colorSuccessBg` (#E8F5E9)
- テキスト色: `token.colorSuccess` (#2e7d32)

**警告状態**
- 進捗色: `token.colorWarning` (#ed6c02)
- 背景色: `token.colorWarningBg` (#FFF4E5)
- テキスト色: `token.colorWarning` (#ed6c02)

**エラー状態**
- 進捗色: `token.colorError` (#d32f2f)
- 背景色: `token.colorErrorBg` (#FFEBEE)
- テキスト色: `token.colorError` (#d32f2f)

**通常状態**
- 進捗色: `token.colorPrimary` (#CF0027)
- 背景色: `token.colorFillSecondary` (#f5f5f5)
- テキスト色: `token.colorText` (#212121)

### アニメーション
- 進捗バーの変化: 0.3s ease-in-out
- ステップの遷移: 0.3s ease-in-out

---

## パターン選択

- ファイルアップロード、データ処理 → **パターン1（線形プログレス）**
- ダッシュボードのKPI、コンパクトな進捗 → **パターン2（円形プログレス）**
- ウィザード、段階的なワークフロー → **パターン3（ステップ表示）**

---

## 補足パターン

### 円形プログレス（大）
- **対応する標準パターン**: パターン2（円形プログレス）の拡大版
- **用途**: 大きな画面での強調表示、メインKPI
- **サイズ**: 120px × 120px
- **線の太さ**: 8px
- **フォントサイズ**: 28px（パーセンテージ）

### 細い線形プログレス
- **対応する標準パターン**: パターン1（線形プログレス）の細型
- **用途**: カード内の簡易進捗表示、テーブル行内
- **高さ**: 4px
- **パーセンテージ表示**: なし（省略可）

### ダッシュボードプログレス
- **対応する標準パターン**: パターン2（円形プログレス）の変種
- **用途**: ダッシュボードの統計情報
- **サイズ**: 100px × 100px
- **線の太さ**: 8px
- **追加情報**: 中央にアイコンまたは説明文

### 垂直ステップ表示
- **対応する標準パターン**: パターン3（ステップ表示）の垂直版
- **用途**: 縦長のサイドバーでのワークフロー表示
- **方向**: 垂直（vertical）
- **サイズ**: `small`

---

## 使用ガイドライン

### DO（推奨）
✅ 進捗の変化はアニメーションで滑らかに表示する
✅ 完了時は成功色（緑）で表示する
✅ エラー時は必ずエラー色（赤）で表示する
✅ 長時間かかる処理は線形プログレスを使用する
✅ ステップ表示には明確な各ステップ名を付ける
✅ パーセンテージは常に表示する（コンパクト表示を除く）

### DON'T（非推奨）
❌ 進捗が不明な場合に0%を表示しない（スピナーを使用する）
❌ 複数の進捗バーを縦に密集させない（最低16pxの間隔を空ける）
❌ 進捗色をカスタマイズしない（状態色のみ使用する）
❌ ステップ表示で5ステップを超えない（長すぎる場合は分割する）
❌ 円形プログレスを小さすぎるサイズで使用しない（最小60px）

---

## 実装例

### パターン1: 線形プログレス
```typescript
<Progress 
  percent={75} 
  strokeColor={token.colorPrimary}
  trailColor={token.colorFillSecondary}
/>
```

### パターン2: 円形プログレス（小）
```typescript
<Progress 
  type="circle" 
  percent={75}
  width={80}
  strokeWidth={6}
  strokeColor={token.colorPrimary}
  trailColor={token.colorFillSecondary}
/>
```

### パターン3: ステップ表示
```typescript
<Steps current={1}>
  <Steps.Step title="開始" description="初期設定" />
  <Steps.Step title="処理中" description="データ処理" />
  <Steps.Step title="完了" description="結果確認" />
</Steps>
```

---

## アクセシビリティ

### ARIA属性
- `role="progressbar"` を自動付与（Ant Designデフォルト）
- `aria-valuenow`、`aria-valuemin`、`aria-valuemax` を設定
- スクリーンリーダー用の適切なラベルを提供

### キーボード操作
- 進捗バー自体はフォーカス不可（情報表示のみ）
- ステップ表示は Tab キーでフォーカス可能
- Enter キーでステップをクリック可能（クリッカブルな場合）

---

## レスポンシブ対応

### モバイル（xs, sm）
- 線形プログレス: 幅100%
- 円形プログレス: サイズ60px（縮小）
- ステップ表示: 垂直方向に変更、またはアイコンのみ表示

### タブレット（md）
- 線形プログレス: 幅100%
- 円形プログレス: サイズ80px（デフォルト）
- ステップ表示: 水平方向を維持

### デスクトップ（lg, xl, xxl）
- 線形プログレス: 幅100%
- 円形プログレス: サイズ80px～120px
- ステップ表示: 水平方向、説明文付き

---

## 状態管理

### 進行中（Processing）
- アニメーション: `strokeLinecap="round"` でストライプ効果
- 色: `token.colorPrimary`

### 完了（Success）
- 色: `token.colorSuccess`
- アイコン: チェックマーク（円形プログレスの場合）

### エラー（Error）
- 色: `token.colorError`
- アイコン: エクスクラメーションマーク（円形プログレスの場合）

### 一時停止（Paused）
- 色: `token.colorWarning`
- アニメーション: 停止

---

## パフォーマンス考慮

### 更新頻度
- 線形プログレス: 最大500ms間隔で更新（頻繁すぎる更新を避ける）
- 円形プログレス: 最大1000ms間隔で更新
- ステップ表示: ステップ遷移時のみ更新

### メモリ効率
- 未使用の進捗バーはコンポーネントをアンマウント
- 大量の進捗バーを表示する場合は仮想化を検討

---

## 多言語対応

### テキストラベル
- "完了": `i18n.t('progress.completed')`
- "処理中": `i18n.t('progress.processing')`
- "エラー": `i18n.t('progress.error')`
- ステップ名: 各画面の翻訳ファイルで管理

---

## 関連ポリシー

- [ローディングスピナーポリシー](./loading_spinner_policy.md) - 不定期な待機状態
- [ステップポリシー](./steps_policy.md) - ワークフロー表示の詳細
- [バッジポリシー](./badge_policy.md) - 数値の強調表示
- [アラート・通知ポリシー](./alert_notification_policy.md) - 完了・エラー通知
