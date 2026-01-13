# 通知メッセージ（Notification）ポリシー

## 標準4パターン

### パターン1: 成功通知（Success）
**用途**: 操作成功・完了の通知
- タイプ: `success`
- アイコン: CheckCircleOutlined
- アイコン色: `token.colorSuccess` (#2e7d32)
- 背景色: `token.colorBgElevated` (#ffffff)
- ボーダー: 1px solid `token.colorSuccessBorder`
- 自動消去時間: 4.5秒
- 位置: 右上（topRight）
- 幅: 384px
- パディング: 16px
- 角丸: `token.borderRadiusLG` (12px)
- シャドウ: `token.boxShadowSecondary`

**使用例**:
- データの保存完了
- ファイルのアップロード完了
- ユーザー登録完了
- 設定変更完了

---

### パターン2: 情報通知（Info）
**用途**: システムからの情報提供
- タイプ: `info`
- アイコン: InfoCircleOutlined
- アイコン色: `token.colorInfo` (#0093CF)
- 背景色: `token.colorBgElevated` (#ffffff)
- ボーダー: 1px solid `token.colorInfoBorder`
- 自動消去時間: 4.5秒
- 位置: 右上（topRight）
- 幅: 384px
- パディング: 16px
- 角丸: `token.borderRadiusLG` (12px)
- シャドウ: `token.boxShadowSecondary`

**使用例**:
- 新機能のお知らせ
- メンテナンス予定の通知
- システムアップデート情報
- ヒントやアドバイス

---

### パターン3: 警告通知（Warning）
**用途**: 注意が必要な状況の通知
- タイプ: `warning`
- アイコン: ExclamationCircleOutlined
- アイコン色: `token.colorWarning` (#ed6c02)
- 背景色: `token.colorBgElevated` (#ffffff)
- ボーダー: 1px solid `token.colorWarningBorder`
- 自動消去時間: 6秒（やや長め）
- 位置: 右上（topRight）
- 幅: 384px
- パディング: 16px
- 角丸: `token.borderRadiusLG` (12px)
- シャドウ: `token.boxShadowSecondary`

**使用例**:
- ディスク容量の不足警告
- セッションタイムアウト警告
- 権限不足の警告
- データの整合性問題

---

### パターン4: エラー通知（Error）
**用途**: エラー・失敗の通知
- タイプ: `error`
- アイコン: CloseCircleOutlined
- アイコン色: `token.colorError` (#d32f2f)
- 背景色: `token.colorBgElevated` (#ffffff)
- ボーダー: 1px solid `token.colorErrorBorder`
- 自動消去時間: 0（手動閉じる必須）
- 位置: 右上（topRight）
- 幅: 384px
- パディング: 16px
- 角丸: `token.borderRadiusLG` (12px)
- シャドウ: `token.boxShadowSecondary`

**使用例**:
- API通信エラー
- ファイルアップロード失敗
- バリデーションエラー
- サーバーエラー

---

## 共通仕様（全パターン）

### タイポグラフィ
- タイトルフォントサイズ: 16px
- タイトルフォントウェイト: 600（Bold）
- タイトルカラー: `token.colorText` (#212121)
- メッセージフォントサイズ: 14px
- メッセージフォントウェイト: 400（Regular）
- メッセージカラー: `token.colorTextSecondary` (#757575)
- 行高さ: 1.5715

### レイアウト
- 最小高さ: 96px
- 最大幅: 384px
- アイコンサイズ: 24px
- アイコンとテキストの間隔: 12px
- タイトルとメッセージの間隔: 4px
- 閉じるボタンサイズ: 14px
- 閉じるボタン位置: 右上から8px

### 表示位置オプション
- `topRight`: 右上（デフォルト）
- `topLeft`: 左上
- `bottomRight`: 右下
- `bottomLeft`: 左下

### アニメーション
- 表示アニメーション: slideInRight（0.3s ease-out）
- 非表示アニメーション: fadeOut（0.2s ease-in）
- 複数通知の間隔: 16px

### 自動消去時間（duration）
- 成功: 4.5秒
- 情報: 4.5秒
- 警告: 6秒（やや長め）
- エラー: 0秒（手動閉じる必須）
- カスタム: 任意の秒数を指定可能

### Z-Index
- 1050（Modal: 1000より上）

---

## パターン選択ガイドライン

### 重要度による選択
1. **成功通知** → 操作が正常に完了したことを確認する必要がある場合
2. **情報通知** → ユーザーに情報を提供するが、即座のアクションは不要な場合
3. **警告通知** → ユーザーの注意を喚起し、潜在的な問題を知らせる場合
4. **エラー通知** → 操作が失敗し、ユーザーの対応が必要な場合

### Message vs Notification の使い分け
- **Message**: 軽量な通知、3秒以内の短時間表示、テキストのみ
- **Notification**: リッチな通知、詳細説明、アクションボタン、長時間表示

### 表示位置の選択
- **右上（topRight）**: デフォルト、一般的な通知
- **右下（bottomRight）**: プログレス通知、ダウンロード完了など
- **左上（topLeft）**: 特殊なケース（デザイン上の理由）
- **左下（bottomLeft）**: 特殊なケース（デザイン上の理由）

### 自動消去の判断
- **自動消去あり**: 成功、情報、一時的な警告
- **手動閉じるのみ**: エラー、重要な警告、確認が必要な通知

---

## アクションボタンパターン

### パターンA: ボタンなし
**用途**: 単純な通知、確認のみ
```typescript
notification.success({
  message: '保存完了',
  description: 'データが正常に保存されました。'
});
```

### パターンB: 1つのアクションボタン
**用途**: 1つの明確なアクションがある場合
```typescript
notification.info({
  message: '新しいバージョンが利用可能です',
  description: 'バージョン2.0.0にアップデートできます。',
  btn: (
    <Button type="primary" size="small" onClick={handleUpdate}>
      今すぐ更新
    </Button>
  )
});
```

### パターンC: 複数のアクションボタン
**用途**: 複数の選択肢を提供する場合
```typescript
notification.warning({
  message: 'セッションがまもなく終了します',
  description: 'あと5分でセッションが切れます。継続しますか？',
  btn: (
    <Space>
      <Button size="small" onClick={handleLogout}>
        ログアウト
      </Button>
      <Button type="primary" size="small" onClick={handleExtend}>
        継続する
      </Button>
    </Space>
  ),
  duration: 0
});
```

---

## 除外されたパターンと標準パターンの対応

### カスタムアイコン通知
- **対応する標準パターン**: パターン2（情報通知）の変種
- **除外理由**: 使用頻度が低く、標準アイコンで十分なため
- **形状**: 標準パターンと同じ
- **差異**: `icon`プロパティでカスタムアイコンを指定
- **用途**: ブランド固有の通知、特殊な用途

### プログレス付き通知
- **対応する標準パターン**: パターン2（情報通知）の変種
- **除外理由**: 特殊用途のため
- **形状**: 標準パターンと同じ
- **差異**: `<Progress>`コンポーネントをdescriptionに含める
- **用途**: ファイルアップロード、データ処理の進捗表示

### 画像付き通知
- **対応する標準パターン**: パターン2（情報通知）の変種
- **除外理由**: 使用頻度が極めて低いため
- **形状**: 標準パターンより幅が広い（520px程度）
- **差異**: `icon`の代わりに画像を表示
- **用途**: リッチなお知らせ、プロモーション通知

### ボトムシート型通知
- **対応する標準パターン**: Drawerコンポーネントを推奨
- **除外理由**: Notificationの役割を超えているため
- **代替**: モバイルではDrawerを使用
- **用途**: モバイル端末での詳細表示

---

## 実装上の注意事項

### 複数通知の管理
- 同時に3つまでの通知を表示（それ以上は古いものから自動削除）
- 同じキー（key）の通知は更新される
- スタック方向: 上から下（新しいものが上）

### アクセシビリティ
- role="alert"が自動設定される
- スクリーンリーダーで読み上げられる
- キーボードでフォーカス可能
- Escapeキーで閉じる

### パフォーマンス
- 通知のマウント・アンマウント時にアニメーションが発生
- 大量の通知を短時間に表示しない
- duration=0の通知は手動で閉じる必要がある（メモリリーク注意）

### レスポンシブ対応
- モバイル（画面幅 < 576px）: 幅を画面幅の90%に自動調整
- タブレット以上: 384px固定
- 位置は自動調整されない（位置指定に注意）
