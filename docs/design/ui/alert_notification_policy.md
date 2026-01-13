# 警告・情報表示ポリシー

## 概要

MaiML Viewerでは、ユーザーへの警告・情報表示に以下の3つのコンポーネントを使用します：

1. **Alert**: ページ内の固定的な警告・情報表示（インライン通知）
2. **Message**: 軽量な一時的通知（トースト通知）
3. **Notification**: リッチな通知（右上通知）

本ポリシーでは、これらの使い分けと標準パターンを定義します。

---

## コンポーネント選択フローチャート

```
通知を表示する必要がある
    ↓
ページ内に常に表示する必要がある？
    ├─ YES → Alert（インライン通知）
    │         ├─ ページ上部の注意書き
    │         ├─ フォームのバリデーションメッセージ
    │         └─ セクションの警告メッセージ
    │
    └─ NO → 一時的な通知
            ↓
        詳細説明やアクションボタンが必要？
            ├─ YES → Notification（リッチ通知）
            │         ├─ システムからの重要なお知らせ
            │         ├─ アクションボタン付き通知
            │         └─ 複数行の詳細説明が必要
            │
            └─ NO → Message（軽量通知）
                      ├─ 操作の即時フィードバック
                      ├─ 成功/失敗の通知
                      └─ 1-2行の簡潔な情報
```

---

## 1. Alert（インライン通知）

### 標準4パターン

#### パターン1-1: 成功アラート（Success）
**用途**: 成功状態や完了を示す固定的な情報表示

- タイプ: `<Alert type="success" />`
- アイコン: CheckCircleFilled
- アイコン色: `token.colorSuccess` (#2e7d32)
- テキスト色: `token.colorText` (#212121)
- 背景色: `token.colorSuccessBg` (#E8F5E9)
- ボーダー: 1px solid `token.colorSuccessBorder` (#2e7d32)
- ボーダーラジアス: `token.borderRadius` (8px)
- パディング: 上下 12px、左右 16px
- マージン: 下部 16px
- 表示: 常に表示（closable: falseがデフォルト）

**使用例**:
```typescript
<Alert
  type="success"
  message="プロジェクトが正常に作成されました"
  showIcon
/>
```

**適用シーン**:
- 処理完了後のページ上部に表示
- フォーム送信成功の通知
- 設定変更完了の確認

---

#### パターン1-2: エラーアラート（Error）
**用途**: エラー状態や失敗を示す固定的な警告表示

- タイプ: `<Alert type="error" />`
- アイコン: CloseCircleFilled
- アイコン色: `token.colorError` (#d32f2f)
- テキスト色: `token.colorText` (#212121)
- 背景色: `token.colorErrorBg` (#FFEBEE)
- ボーダー: 1px solid `token.colorErrorBorder` (#d32f2f)
- ボーダーラジアス: `token.borderRadius` (8px)
- パディング: 上下 12px、左右 16px
- マージン: 下部 16px
- 表示: 常に表示または閉じるボタン付き（closable: true可）

**使用例**:
```typescript
<Alert
  type="error"
  message="エラーが発生しました"
  description="ファイルのアップロードに失敗しました。ファイルサイズを確認してください。"
  showIcon
  closable
/>
```

**適用シーン**:
- ページ読み込み時のエラー表示
- フォームバリデーションエラー
- API通信エラーの詳細表示

---

#### パターン1-3: 警告アラート（Warning）
**用途**: 注意が必要な状況を示す固定的な警告表示

- タイプ: `<Alert type="warning" />`
- アイコン: ExclamationCircleFilled
- アイコン色: `token.colorWarning` (#ed6c02)
- テキスト色: `token.colorText` (#212121)
- 背景色: `token.colorWarningBg` (#FFF4E5)
- ボーダー: 1px solid `token.colorWarningBorder` (#ed6c02)
- ボーダーラジアス: `token.borderRadius` (8px)
- パディング: 上下 12px、左右 16px
- マージン: 下部 16px
- 表示: 常に表示または閉じるボタン付き（closable: true可）

**使用例**:
```typescript
<Alert
  type="warning"
  message="注意"
  description="この操作は元に戻せません。続行する前に確認してください。"
  showIcon
/>
```

**適用シーン**:
- 危険な操作の前の警告
- メンテナンス予定の通知
- データ不完全の警告

---

#### パターン1-4: 情報アラート（Info）
**用途**: 一般的な情報や案内を示す固定的な情報表示

- タイプ: `<Alert type="info" />`
- アイコン: InfoCircleFilled
- アイコン色: `token.colorInfo` (#0093CF)
- テキスト色: `token.colorText` (#212121)
- 背景色: `token.colorInfoBg` (#E6F7FC)
- ボーダー: 1px solid `token.colorInfoBorder` (#0093CF)
- ボーダーラジアス: `token.borderRadius` (8px)
- パディング: 上下 12px、左右 16px
- マージン: 下部 16px
- 表示: 常に表示または閉じるボタン付き（closable: true可）

**使用例**:
```typescript
<Alert
  type="info"
  message="お知らせ"
  description="新機能が追加されました。詳細はヘルプページをご覧ください。"
  showIcon
  closable
/>
```

**適用シーン**:
- ページ上部のお知らせ
- 機能の案内
- ヒントやTips表示

---

### Alert共通仕様

#### サイズと配置
- **幅**: 親要素の100%（フルワイド）
- **最小高さ**: 48px（アイコン + 1行テキスト）
- **最大幅**: 制限なし（親要素に依存）
- **配置**: ページ/セクションの上部

#### テキスト仕様
- **メッセージフォントサイズ**: `token.fontSize` (14px)
- **メッセージフォントウェイト**: 500（やや太め）
- **説明文フォントサイズ**: `token.fontSize` (14px)
- **説明文フォントウェイト**: 400（通常）
- **説明文色**: `token.colorTextSecondary` (#757575)
- **行の高さ**: `token.lineHeight` (1.5715)

#### アイコン仕様
- **サイズ**: 16px
- **位置**: テキストの左側
- **マージン**: 右側に 8px
- **showIcon**: 基本的にtrueを推奨

#### 閉じるボタン
- **サイズ**: 16px × 16px
- **色**: `token.colorTextSecondary` (#757575)
- **ホバー色**: `token.colorText` (#212121)
- **位置**: 右上
- **closable**: エラーや警告では推奨、情報では任意

#### アニメーション
- **表示**: フェードイン 0.3s ease-out
- **非表示**: フェードアウト 0.2s ease-in

---

### Alertの配置パターン

#### ページ上部（全幅）
```typescript
<div style={{ marginBottom: 24 }}>
  <Alert
    type="warning"
    message="メンテナンスのお知らせ"
    description="2024年12月26日 22:00-24:00の間、システムメンテナンスを実施します。"
    showIcon
    closable
  />
</div>
```

#### フォーム内（検証エラー）
```typescript
{errors.length > 0 && (
  <Alert
    type="error"
    message="入力エラー"
    description={
      <ul>
        {errors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    }
    showIcon
    closable
    style={{ marginBottom: 16 }}
  />
)}
```

#### カード内（セクション警告）
```typescript
<Card title="プロジェクト設定">
  <Alert
    type="info"
    message="この設定は後から変更できません"
    showIcon
    style={{ marginBottom: 16 }}
  />
  {/* フォームコンテンツ */}
</Card>
```

---

## 2. Message（軽量通知）

Message コンポーネントの詳細は [message_policy.md](./message_policy.md) を参照してください。

### 概要

**用途**: 操作の即時フィードバック、簡潔な成功/失敗通知

**特徴**:
- 画面上部中央に表示
- 1-2行の短いテキスト
- 自動的に消える（3-4秒）
- 軽量でユーザーの邪魔にならない

**標準パターン**:
- `message.success()` - 成功メッセージ
- `message.error()` - エラーメッセージ
- `message.warning()` - 警告メッセージ
- `message.info()` - 情報メッセージ
- `message.loading()` - ローディングメッセージ

**使用例**:
```typescript
// 保存成功
message.success('保存しました');

// エラー
message.error('保存に失敗しました');

// ローディング
const hide = message.loading('保存中...', 0);
await saveData();
hide();
message.success('保存が完了しました');
```

---

## 3. Notification（リッチ通知）

### 標準4パターン

#### パターン3-1: 成功通知（Success）
**用途**: 詳細な成功情報を通知

- タイプ: `notification.success()`
- アイコン: CheckCircleOutlined
- アイコン色: `token.colorSuccess` (#2e7d32)
- 背景色: `token.colorBgContainer` (#ffffff)
- 表示位置: 画面右上
- 表示時間: 4.5秒（デフォルト）
- シャドウ: `token.boxShadowSecondary`
- 幅: 384px

**使用例**:
```typescript
notification.success({
  message: 'アップロード完了',
  description: '3件のファイルが正常にアップロードされました。プロジェクト一覧から確認できます。',
  placement: 'topRight',
  duration: 4.5,
});
```

---

#### パターン3-2: エラー通知（Error）
**用途**: 詳細なエラー情報を通知

- タイプ: `notification.error()`
- アイコン: CloseCircleOutlined
- アイコン色: `token.colorError` (#d32f2f)
- 背景色: `token.colorBgContainer` (#ffffff)
- 表示位置: 画面右上
- 表示時間: 0（手動クローズ推奨）
- シャドウ: `token.boxShadowSecondary`
- 幅: 384px

**使用例**:
```typescript
notification.error({
  message: 'アップロードエラー',
  description: 'ファイルサイズが10MBを超えています。ファイルを分割してアップロードしてください。',
  placement: 'topRight',
  duration: 0, // 手動クローズ
  btn: (
    <Button type="primary" size="small" onClick={() => notification.destroy()}>
      OK
    </Button>
  ),
});
```

---

#### パターン3-3: 警告通知（Warning）
**用途**: 詳細な警告情報を通知

- タイプ: `notification.warning()`
- アイコン: ExclamationCircleOutlined
- アイコン色: `token.colorWarning` (#ed6c02)
- 背景色: `token.colorBgContainer` (#ffffff)
- 表示位置: 画面右上
- 表示時間: 4.5秒（デフォルト）
- シャドウ: `token.boxShadowSecondary`
- 幅: 384px

**使用例**:
```typescript
notification.warning({
  message: 'セッション警告',
  description: 'セッションの有効期限が5分後に切れます。作業中のデータを保存してください。',
  placement: 'topRight',
  duration: 10, // 長めに表示
});
```

---

#### パターン3-4: 情報通知（Info）
**用途**: 詳細な情報を通知

- タイプ: `notification.info()`
- アイコン: InfoCircleOutlined
- アイコン色: `token.colorInfo` (#0093CF)
- 背景色: `token.colorBgContainer` (#ffffff)
- 表示位置: 画面右上
- 表示時間: 4.5秒（デフォルト）
- シャドウ: `token.boxShadowSecondary`
- 幅: 384px

**使用例**:
```typescript
notification.info({
  message: '新機能のお知らせ',
  description: 'プロジェクト一括エクスポート機能が追加されました。詳細はヘルプページをご覧ください。',
  placement: 'topRight',
  duration: 6,
  btn: (
    <Button type="link" size="small" onClick={openHelp}>
      詳細を見る
    </Button>
  ),
});
```

---

### Notification共通仕様

#### サイズと配置
- **幅**: 384px（固定）
- **最小高さ**: 96px
- **最大高さ**: 制限なし（コンテンツに応じて）
- **表示位置**: topRight（画面右上）推奨
  - 他オプション: top, topLeft, bottom, bottomRight, bottomLeft
- **右端からの距離**: 24px
- **上端からの距離**: 24px
- **複数表示時の間隔**: 16px

#### テキスト仕様
- **タイトルフォントサイズ**: 16px
- **タイトルフォントウェイト**: 600（太字）
- **説明文フォントサイズ**: `token.fontSize` (14px)
- **説明文フォントウェイト**: 400（通常）
- **説明文色**: `token.colorTextSecondary` (#757575)
- **行の高さ**: `token.lineHeight` (1.5715)
- **最大行数**: 制限なし

#### アイコン仕様
- **サイズ**: 24px
- **位置**: タイトルの左側
- **マージン**: 右側に 12px

#### ボタン仕様
- **配置**: 説明文の下部
- **サイズ**: small
- **マージン**: 上部 12px
- **タイプ**: link または primary

#### アニメーション
- **スライドイン**: 0.3s ease-out（右からスライド）
- **スライドアウト**: 0.3s ease-in（右へスライド）

#### z-index
- **通知**: 1010（モーダルと同レベル）
- **複数表示時**: 縦に積み重なる

---

## 使い分けガイドライン

### Alert vs Message vs Notification

| 項目 | Alert | Message | Notification |
|------|-------|---------|--------------|
| **表示位置** | ページ内（インライン） | 画面上部中央 | 画面右上 |
| **表示時間** | 常に表示 | 3-4秒（自動消去） | 4.5秒または手動 |
| **用途** | 固定的な警告・情報 | 操作の即時フィードバック | 詳細な通知 |
| **テキスト量** | 1-5行 | 1-2行 | 2-10行 |
| **アクションボタン** | 可能 | 不可 | 可能 |
| **閉じるボタン** | 任意（closable） | 自動消去 | 任意 |
| **ユーザーの注意** | 中程度 | 低い | 高い |
| **推奨シーン** | ページ上部の注意書き、フォームエラー | データ保存成功、簡単な失敗通知 | 重要なお知らせ、エラー詳細、アクション付き通知 |

---

### 具体的な使い分け例

#### シーン1: データ保存
```typescript
// ✅ 推奨: Message（軽量な成功通知）
message.success('保存しました');

// ❌ 非推奨: Notification（過剰）
notification.success({
  message: '保存完了',
  description: 'データが正常に保存されました',
});
```

#### シーン2: ファイルアップロード失敗（詳細あり）
```typescript
// ✅ 推奨: Notification（エラー詳細 + 再試行ボタン）
notification.error({
  message: 'アップロード失敗',
  description: 'ファイルサイズが10MBを超えています。ファイルを分割してください。',
  duration: 0,
  btn: <Button onClick={retry}>再試行</Button>,
});

// ❌ 非推奨: Message（情報不足）
message.error('アップロードに失敗しました');
```

#### シーン3: ページ読み込み時のエラー
```typescript
// ✅ 推奨: Alert（ページ上部に固定表示）
<Alert
  type="error"
  message="データの読み込みに失敗しました"
  description="ネットワーク接続を確認して、ページを再読み込みしてください。"
  showIcon
  action={
    <Button size="small" onClick={reload}>
      再読み込み
    </Button>
  }
/>

// ❌ 非推奨: Message（すぐ消える）
message.error('データの読み込みに失敗しました');
```

#### シーン4: フォームバリデーションエラー
```typescript
// ✅ 推奨: Alert（フォーム上部に固定表示）
{errors.length > 0 && (
  <Alert
    type="error"
    message="入力内容を確認してください"
    description={
      <ul>
        {errors.map((error) => <li>{error}</li>)}
      </ul>
    }
    showIcon
    closable
  />
)}

// △ 許容: Message（単純なエラー1件のみ）
message.error('必須項目を入力してください');
```

---

## 高度な使用例

### 例1: 複数ファイルアップロードの進行状況
```typescript
const uploadFiles = async (files: File[]) => {
  let successCount = 0;
  let errorCount = 0;

  const hide = message.loading(`0/${files.length} 件アップロード中...`, 0);

  for (const [index, file] of files.entries()) {
    try {
      await uploadFile(file);
      successCount++;
    } catch (error) {
      errorCount++;
    }
    
    hide();
    if (index < files.length - 1) {
      hide = message.loading(`${index + 1}/${files.length} 件アップロード中...`, 0);
    }
  }

  hide();

  // 結果をNotificationで詳細表示
  if (errorCount === 0) {
    notification.success({
      message: 'アップロード完了',
      description: `全 ${successCount} 件のファイルが正常にアップロードされました。`,
      duration: 4.5,
    });
  } else if (successCount === 0) {
    notification.error({
      message: 'アップロード失敗',
      description: `全 ${errorCount} 件のファイルのアップロードに失敗しました。ファイルサイズを確認してください。`,
      duration: 0,
    });
  } else {
    notification.warning({
      message: 'アップロード部分完了',
      description: `${successCount} 件成功、${errorCount} 件失敗しました。失敗したファイルを確認してください。`,
      duration: 6,
    });
  }
};
```

---

### 例2: セッション有効期限警告
```typescript
// 5分前に警告
setTimeout(() => {
  notification.warning({
    message: 'セッション警告',
    description: 'セッションの有効期限が5分後に切れます。作業中のデータを保存してください。',
    placement: 'topRight',
    duration: 10,
  });
}, sessionTimeout - 5 * 60 * 1000);

// 1分前に再警告
setTimeout(() => {
  notification.error({
    message: 'セッション期限切れ間近',
    description: 'セッションが1分後に期限切れになります。データを保存してください。',
    placement: 'topRight',
    duration: 0,
    btn: (
      <Button type="primary" size="small" onClick={extendSession}>
        セッション延長
      </Button>
    ),
  });
}, sessionTimeout - 1 * 60 * 1000);
```

---

### 例3: メンテナンス予定の通知
```typescript
// ページ上部にAlert表示（常に表示）
<Alert
  type="warning"
  message="メンテナンスのお知らせ"
  description={
    <>
      2024年12月26日 22:00-24:00の間、システムメンテナンスを実施します。
      この間、システムはご利用いただけません。ご不便をおかけしますが、ご了承ください。
    </>
  }
  showIcon
  closable
  style={{ marginBottom: 24 }}
/>

// 30分前にNotificationで再通知
notification.warning({
  message: 'メンテナンス開始30分前',
  description: '30分後にメンテナンスが開始されます。作業を保存してログアウトしてください。',
  placement: 'topRight',
  duration: 0,
  btn: (
    <Button type="primary" size="small" onClick={logout}>
      ログアウト
    </Button>
  ),
});
```

---

### 例4: 国際化対応
```typescript
import { useLanguage } from '@/contexts/LanguageContext';

const { t } = useLanguage();

// Alert
<Alert
  type="error"
  message={t('common.error.title')}
  description={t('common.error.networkError')}
  showIcon
/>

// Message
message.success(t('project.create.success'));

// Notification
notification.info({
  message: t('notification.newFeature.title'),
  description: t('notification.newFeature.description'),
  btn: (
    <Button type="link" size="small">
      {t('common.action.learnMore')}
    </Button>
  ),
});
```

---

## グローバル設定

### Notification設定
```typescript
import { notification } from 'antd';

// アプリケーション起動時に設定
notification.config({
  placement: 'topRight',     // 表示位置
  top: 24,                   // 上部からの距離（px）
  bottom: 24,                // 下部からの距離（px）
  duration: 4.5,             // デフォルト表示時間（秒）
  rtl: false,                // 右から左への表示（アラビア語等）
  maxCount: 3,               // 同時に表示する最大数
});
```

---

## アクセシビリティ

### Alert
- `role="alert"` が自動的に付与される
- スクリーンリーダーが内容を読み上げる
- 閉じるボタンは `aria-label="Close"` 付き

### Message
- `role="alert"` が自動的に付与される
- スクリーンリーダーが内容を読み上げる
- 自動的に消えるためキーボード操作不要

### Notification
- `role="alert"` が自動的に付与される
- スクリーンリーダーが内容を読み上げる
- ボタンはキーボード操作可能（Tab + Enter）
- Escapeキーで閉じることが推奨される

---

## ベストプラクティス

### DO（推奨）
✅ Alertはページ/セクション上部に配置する
✅ Messageは簡潔な操作フィードバックに使用する
✅ Notificationは詳細な情報やアクションボタンが必要な場合に使用する
✅ エラーには具体的な対処方法を含める
✅ 重要な通知は手動クローズ（duration: 0）にする
✅ アイコンを常に表示する（showIcon: true）
✅ 国際化対応のためにi18nを使用する
✅ 複数の通知を同時に表示しすぎない（maxCount: 3推奨）

### DON'T（非推奨）
❌ 簡単な成功通知にNotificationを使用しない
❌ 固定表示が必要な情報にMessageを使用しない
❌ Alertを画面中央に配置しない
❌ 「エラー」「警告」だけの曖昧なメッセージ
❌ 重要でない情報に長い表示時間を設定しない
❌ エラー情報をそのまま表示しない（技術的な詳細は隠す）
❌ 毎回の操作に通知を表示しない（うるさくなる）
❌ 同時に5件以上の通知を表示しない

---

## まとめ

### 3つのコンポーネントの特徴

| コンポーネント | 特徴 | 主な用途 |
|--------------|------|---------|
| **Alert** | ページ内に固定表示、常に見える | ページ上部の注意書き、フォームエラー、セクション警告 |
| **Message** | 軽量、自動消去、邪魔にならない | 操作の即時フィードバック、簡潔な成功/失敗通知 |
| **Notification** | リッチ、アクションボタン付き、右上表示 | 重要なお知らせ、詳細な通知、アクション付き通知 |

### 選択の基本ルール

1. **常に表示が必要** → **Alert**
2. **軽量なフィードバック** → **Message**
3. **詳細な通知 or アクションボタン** → **Notification**

---

## 実装チェックリスト

### Alert実装時
- [ ] showIconをtrueに設定
- [ ] メッセージと説明文を明確に分ける
- [ ] 必要に応じてclosableを設定
- [ ] 適切なtypeを選択（success, error, warning, info）
- [ ] ページ/セクション上部に配置

### Message実装時
- [ ] 簡潔なメッセージ（1-2行）
- [ ] 適切な表示時間を設定
- [ ] ローディングメッセージは必ず手動クローズ
- [ ] エラーメッセージには対処方法を含める
- [ ] 連続表示の場合はmaxCountを設定

### Notification実装時
- [ ] タイトルと説明文を明確に分ける
- [ ] 必要に応じてボタンを追加
- [ ] 重要な通知は手動クローズ（duration: 0）
- [ ] placementをtopRightに設定（推奨）
- [ ] maxCountで同時表示数を制限（推奨: 3）

---

## 関連ドキュメント

- [message_policy.md](./message_policy.md) - Messageコンポーネントの詳細仕様
- [button_policy.md](./button_policy.md) - ボタンスタイル（Alert/Notificationのアクションボタン）
- [modal_policy.md](./modal_policy.md) - モーダルとの使い分け
