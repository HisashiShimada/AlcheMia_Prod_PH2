# メッセージ表示ポリシー

## 標準4パターン

### パターン1: 成功メッセージ（Success）
**用途**: 操作が正常に完了したことを通知
- タイプ: `message.success()`
- アイコン: CheckCircleFilled
- アイコン色: `token.colorSuccess` (#2e7d32)
- テキスト色: `token.colorText` (#212121)
- 背景色: `token.colorBgContainer` (#ffffff)
- 表示位置: 画面上部中央
- 表示時間: 3秒（デフォルト）
- シャドウ: `token.boxShadowSecondary`

**使用例**:
- データ保存完了
- アップロード完了
- タスク完了
- 設定変更完了

---

### パターン2: エラーメッセージ（Error）
**用途**: 操作が失敗したことを通知、ユーザーの注意を引く
- タイプ: `message.error()`
- アイコン: CloseCircleFilled
- アイコン色: `token.colorError` (#d32f2f)
- テキスト色: `token.colorText` (#212121)
- 背景色: `token.colorBgContainer` (#ffffff)
- 表示位置: 画面上部中央
- 表示時間: 4秒（デフォルトより1秒長め）
- シャドウ: `token.boxShadowSecondary`

**使用例**:
- バリデーションエラー
- API通信エラー
- 権限エラー
- ファイルアップロード失敗

---

### パターン3: 警告メッセージ（Warning）
**用途**: 注意が必要な状況を通知、操作の確認を促す
- タイプ: `message.warning()`
- アイコン: ExclamationCircleFilled
- アイコン色: `token.colorWarning` (#ed6c02)
- テキスト色: `token.colorText` (#212121)
- 背景色: `token.colorBgContainer` (#ffffff)
- 表示位置: 画面上部中央
- 表示時間: 3秒（デフォルト）
- シャドウ: `token.boxShadowSecondary`

**使用例**:
- 入力値の範囲外
- 未選択項目の警告
- 削除確認の警告
- データ不完全の警告

---

### パターン4: 情報メッセージ（Info）
**用途**: 一般的な情報や状態を通知
- タイプ: `message.info()`
- アイコン: InfoCircleFilled
- アイコン色: `token.colorInfo` (#0093CF)
- テキスト色: `token.colorText` (#212121)
- 背景色: `token.colorBgContainer` (#ffffff)
- 表示位置: 画面上部中央
- 表示時間: 3秒（デフォルト）
- シャドウ: `token.boxShadowSecondary`

**使用例**:
- 機能の案内
- 処理状況の通知
- タブ遷移の通知
- 今後実装予定の機能通知

---

## 共通仕様（全パターン）

### サイズと配置
- **表示位置**: 画面上部中央（固定）
- **上部からの距離**: 24px
- **最小幅**: 384px
- **最大幅**: 700px（長いメッセージの場合）
- **高さ**: コンテンツに応じて自動調整（最小 40px）
- **パディング**: 上下 10px、左右 16px
- **ボーダーラジアス**: `token.borderRadiusLG` (12px)

### テキスト仕様
- **フォントサイズ**: `token.fontSize` (14px)
- **行の高さ**: `token.lineHeight` (1.5715)
- **フォントウェイト**: 400（通常）
- **最大行数**: 2行（それ以上は省略記号 `...`）

### アイコン仕様
- **サイズ**: 16px
- **位置**: テキストの左側
- **マージン**: 右側に 8px

### アニメーション
- **フェードイン**: 0.3s ease-out
- **フェードアウト**: 0.3s ease-in
- **スライドダウン**: 0.3s ease-out（表示時）
- **スライドアップ**: 0.3s ease-in（非表示時）

### 表示時間
- **success**: 3秒（デフォルト）
- **info**: 3秒（デフォルト）
- **warning**: 3秒（デフォルト）
- **error**: 4秒（他より1秒長め、重要なため）
- **カスタム**: `duration` オプションで変更可能（0で手動クローズのみ）

### z-index
- **メッセージ**: 1010（モーダルより上）
- **複数表示時**: 縦に積み重なる（間隔 8px）

---

## 詳細パターン

### パターン5: ローディングメッセージ（Loading）
**用途**: 処理中であることを通知（非同期処理）
- タイプ: `message.loading()`
- アイコン: LoadingOutlined（アニメーション）
- アイコン色: `token.colorPrimary` (#CF0027)
- テキスト色: `token.colorText` (#212121)
- 背景色: `token.colorBgContainer` (#ffffff)
- 表示時間: **手動クローズのみ**（duration: 0）
- 使用方法:
  ```typescript
  const hide = message.loading('処理中...');
  // 非同期処理
  await someAsyncOperation();
  hide(); // 手動でクローズ
  message.success('完了しました');
  ```

**使用例**:
- API通信中
- ファイルアップロード中
- 大量データ処理中

---

## 使用ガイドライン

### 基本原則

#### 1. メッセージの明確性
✅ **良い例**:
```typescript
message.success('プロジェクトが正常に作成されました');
message.error('ファイルのアップロードに失敗しました');
message.warning('ファイルを選択してください');
```

❌ **悪い例**:
```typescript
message.success('成功');
message.error('エラー');
message.warning('警告');
```

#### 2. 適切な表示時間
- **短いメッセージ（10文字以内）**: 2秒
  ```typescript
  message.success('保存完了', 2);
  ```

- **通常メッセージ（10-30文字）**: 3秒（デフォルト）
  ```typescript
  message.success('プロジェクトを作成しました');
  ```

- **長いメッセージ（30文字以上）**: 4-5秒
  ```typescript
  message.error('ファイルサイズは10MB以下にしてください', 5);
  ```

- **重要なエラー**: 手動クローズ（duration: 0）
  ```typescript
  message.error('認証に失敗しました。再度ログインしてください', 0);
  ```

#### 3. メッセージの連続表示
複数のメッセージを連続して表示する場合、前のメッセージを待たずに表示可能：

```typescript
// 前のメッセージが消える前に次を表示（縦に積み重なる）
message.success('ファイル1をアップロードしました');
message.success('ファイル2をアップロードしました');
message.success('ファイル3をアップロードしました');
```

最大表示数を制限する場合:
```typescript
message.config({
  maxCount: 3, // 最大3件まで同時表示
});
```

#### 4. プログレスバー付きメッセージ
長時間の処理には、ローディング→完了の流れを使用：

```typescript
const hide = message.loading('アップロード中...', 0);
try {
  await uploadFile();
  hide();
  message.success('アップロードが完了しました');
} catch (error) {
  hide();
  message.error('アップロードに失敗しました');
}
```

---

## パターン選択フローチャート

```
操作結果を通知する
    ↓
正常に完了した？
    ├─ YES → success（成功メッセージ）
    └─ NO
        ↓
    エラーが発生した？
        ├─ YES → error（エラーメッセージ）
        └─ NO
            ↓
        注意が必要？
            ├─ YES → warning（警告メッセージ）
            └─ NO → info（情報メッセージ）

処理中である？
    └─ YES → loading（ローディングメッセージ）
```

---

## 高度な使用例

### 例1: コンテンツ付きメッセージ
```typescript
message.success({
  content: '3件のファイルをアップロードしました',
  duration: 3,
  icon: <CheckCircleFilled />,
  className: 'custom-message',
});
```

### 例2: 国際化対応
```typescript
import { useLanguage } from '@/contexts/LanguageContext';

const { t } = useLanguage();

message.success({
  content: t('projectManagement.create.success') || 'プロジェクトが正常に作成されました',
});
```

### 例3: 非同期処理のフィードバック
```typescript
const handleSubmit = async () => {
  const hide = message.loading('保存中...', 0);
  
  try {
    await saveData();
    hide();
    message.success('保存が完了しました');
  } catch (error) {
    hide();
    message.error(`保存に失敗しました: ${error.message}`);
  }
};
```

### 例4: 複数ステップの処理
```typescript
const handleBulkOperation = async (files: File[]) => {
  let successCount = 0;
  let errorCount = 0;

  const hide = message.loading(`0/${files.length} 件処理中...`, 0);

  for (const [index, file] of files.entries()) {
    try {
      await processFile(file);
      successCount++;
    } catch (error) {
      errorCount++;
    }
    
    // プログレス更新
    hide();
    hide = message.loading(`${index + 1}/${files.length} 件処理中...`, 0);
  }

  hide();

  // 結果サマリー
  if (errorCount === 0) {
    message.success(`全 ${successCount} 件の処理が完了しました`);
  } else if (successCount === 0) {
    message.error(`全 ${errorCount} 件の処理に失敗しました`);
  } else {
    message.warning(
      `${successCount} 件成功、${errorCount} 件失敗しました`,
      5
    );
  }
};
```

---

## Notificationとの使い分け

### Message（推奨：軽量な通知）
**使用シーン**:
- 操作の即時フィードバック
- 簡潔な成功/失敗通知
- 短時間で消える情報

**特徴**:
- 画面上部中央に表示
- 1-2行の短いテキスト
- 自動的に消える（3-4秒）
- 軽量でユーザーの邪魔にならない

### Notification（リッチな通知、必要な場合のみ）
**使用シーン**:
- 詳細な説明が必要な通知
- ユーザーのアクション（ボタン）が必要
- 長時間表示が必要な情報
- システムからの重要なお知らせ

**特徴**:
- 画面右上に表示
- タイトル + 説明文 + ボタン
- 手動クローズが一般的
- リッチなコンテンツ表示可能

---

## グローバル設定

アプリケーション全体のメッセージ設定を変更する場合：

```typescript
import { message } from 'antd';

// アプリケーション起動時に設定
message.config({
  top: 24,              // 上部からの距離（px）
  duration: 3,          // デフォルト表示時間（秒）
  maxCount: 3,          // 同時に表示する最大数
  rtl: false,           // 右から左への表示（アラビア語等）
  prefixCls: 'custom',  // カスタムCSSプレフィックス
});
```

---

## デバッグとテスト

### 開発環境での確認
```typescript
// 全パターンを一度に表示してデザイン確認
const testMessages = () => {
  message.success('成功メッセージのテストです');
  setTimeout(() => message.error('エラーメッセージのテストです'), 500);
  setTimeout(() => message.warning('警告メッセージのテストです'), 1000);
  setTimeout(() => message.info('情報メッセージのテストです'), 1500);
};
```

---

## アクセシビリティ

### スクリーンリーダー対応
- メッセージは自動的に `role="alert"` が付与される
- スクリーンリーダーが内容を読み上げる
- 視覚障害者にも情報が伝わる

### キーボード操作
- メッセージは自動的に消えるため、キーボード操作不要
- 手動クローズの場合（duration: 0）、Escapeキーで閉じることが推奨される

---

## ベストプラクティス

### DO（推奨）
✅ 明確で具体的なメッセージを使用する
✅ 操作の結果を即座にフィードバックする
✅ エラーには対処方法を含める
✅ 長いメッセージは表示時間を延ばす
✅ 重要な情報は手動クローズにする
✅ 国際化対応のためにi18nを使用する
✅ ローディングメッセージは必ず手動でクローズする

### DON'T（非推奨）
❌ 「成功」「エラー」だけの曖昧なメッセージ
❌ 同時に5件以上のメッセージを表示する
❌ 重要でない情報に長い表示時間を設定する
❌ ローディングメッセージをクローズし忘れる
❌ メッセージ内にHTMLを直接埋め込む
❌ エラー情報をそのまま表示する（技術的な詳細は隠す）
❌ 毎回の操作にメッセージを表示する（うるさくなる）

---

## 実装例

### 基本的な使用
```typescript
import { message } from 'antd';

// 成功
message.success('保存しました');

// エラー
message.error('保存に失敗しました');

// 警告
message.warning('ファイルを選択してください');

// 情報
message.info('この機能は今後実装予定です');

// ローディング
const hide = message.loading('処理中...');
// 処理完了後
hide();
```

### React Hookでの使用
```typescript
import { message } from 'antd';
import { useState } from 'react';

const MyComponent = () => {
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const hide = message.loading('保存中...', 0);
    
    try {
      await saveData();
      hide();
      message.success('保存が完了しました');
    } catch (error) {
      hide();
      message.error('保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return <button onClick={handleSave} disabled={loading}>保存</button>;
};
```

---

## まとめ

- **Success**: 操作完了の通知（緑色アイコン）
- **Error**: エラー発生の通知（赤色アイコン）
- **Warning**: 注意喚起の通知（オレンジ色アイコン）
- **Info**: 一般情報の通知（青色アイコン）
- **Loading**: 処理中の通知（アニメーションアイコン、手動クローズ）

メッセージは**軽量で邪魔にならない通知**として使用し、詳細な情報が必要な場合は**Notification**を使用することを検討してください。
