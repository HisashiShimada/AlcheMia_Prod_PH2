# トグルスイッチ形状ポリシー

## 標準2パターン

### パターン1: 標準サイズ
**用途**: 設定画面、一般的な表示切替

- スイッチ幅: 44px
- スイッチ高さ: 22px
- スライダー直径: 18px
- テキストフォントサイズ: `token.fontSize` (14px)
- 最小高さ: 32px
- テキストとの間隔: 8px
- パディング: なし
- 幅: コンテンツに合わせる（auto）

**実装例:**
```tsx
<Space align="center">
  <Text>ダークモード</Text>
  <Switch
    checked={isDarkMode}
    onChange={setIsDarkMode}
  />
</Space>
```

---

### パターン2: 小サイズ（コンパクト）
**用途**: ツールバー、コンパクトな表示エリア、テーブル内

- スイッチ幅: 28px
- スイッチ高さ: 16px
- スライダー直径: 12px
- テキストフォントサイズ: `token.fontSizeSM` (12px)
- 最小高さ: 24px
- テキストとの間隔: 8px
- パディング: なし
- 幅: コンテンツに合わせる（auto）

**実装例:**
```tsx
<Space align="center" size="small">
  <Text type="secondary" style={{ fontSize: 12 }}>
    アーク名表示
  </Text>
  <Switch
    size="small"
    checked={showArcLabels}
    onChange={setShowArcLabels}
  />
</Space>
```

---

## 共通仕様（全パターン）

### 色定義

**OFF状態（通常）**
- 背景色: `rgba(0, 0, 0, 0.25)`
- スライダー色: `#ffffff`
- ボーダー: なし
- テキスト色: `token.colorText` (#212121)

**OFF状態（ホバー）**
- 背景色: `rgba(0, 0, 0, 0.4)`
- スライダー色: `#ffffff`
- ボーダー: なし
- テキスト色: `token.colorText` (#212121)

**ON状態（通常）**
- 背景色: `token.colorPrimary` (#CF0027)
- スライダー色: `#ffffff`
- ボーダー: なし
- テキスト色: `token.colorText` (#212121)

**ON状態（ホバー）**
- 背景色: `token.colorPrimaryHover` (#E63946)
- スライダー色: `#ffffff`
- ボーダー: なし
- テキスト色: `token.colorText` (#212121)

**無効（OFF）**
- 背景色: `rgba(0, 0, 0, 0.04)`
- スライダー色: `#ffffff`
- ボーダー: なし
- テキスト色: `token.colorTextDisabled` (#bdbdbd)
- カーソル: `not-allowed`

**無効（ON）**
- 背景色: `rgba(0, 0, 0, 0.15)`
- スライダー色: `#ffffff`
- ボーダー: なし
- テキスト色: `token.colorTextDisabled` (#bdbdbd)
- カーソル: `not-allowed`

### アニメーション
- スライダーの移動: `0.2s cubic-bezier(0.645, 0.045, 0.355, 1)`
- 背景色の変化: `0.2s ease-in-out`
- ホバー時のトランジション: `0.2s ease-out`

### アクセシビリティ
- フォーカス表示: `token.colorPrimary`の2pxアウトライン
- キーボード操作: Spaceキーで切り替え
- スクリーンリーダー: `role="switch"`, `aria-checked`が自動付与
- ラベル: 必ず明確なラベルテキストを設定

### インタラクション
- クリック領域: スイッチ本体全体
- 最小タップターゲット: 44px × 44px（モバイル対応）
- 視覚的フィードバック: ホバー時の背景色変更、スライダーの滑らかな移動
- 即座に状態変更: クリック後すぐに効果が反映される

---

## パターン選択ガイドライン

### パターン1（標準サイズ）を使用する場合
- ✅ 設定画面での項目切り替え
- ✅ フォーム内の設定項目
- ✅ 重要な機能のON/OFF
- ✅ 一般的な表示切替
- ✅ 十分なスペースがある場合

**使用例:**
- ダークモード切り替え
- 通知の有効/無効
- 自動保存の有効/無効
- プライバシー設定
- 機能の有効化/無効化

---

### パターン2（小サイズ）を使用する場合
- ✅ ツールバー内での表示切替
- ✅ テーブル行内での設定
- ✅ コンパクトな表示エリア
- ✅ カード内の補助的な設定
- ✅ スペースが限られている場合

**使用例:**
- PetriNetビューアのアーク名表示切替
- テーブルの列表示/非表示
- プレビューモードの切り替え
- ツールバーの表示オプション

---

## チェックボックスとの使い分け

### トグルスイッチを使用すべき場合

| 条件 | 説明 | 例 |
|------|------|-----|
| **即座に反映** | クリック後すぐに効果が現れる | 表示切替、プレビュー |
| **物理的なスイッチ** | ON/OFF の概念が明確 | 電源、ダークモード |
| **システム設定** | アプリの動作を制御 | 自動保存、通知 |
| **リアルタイム更新** | 保存ボタン不要 | フィルター、表示オプション |

### チェックボックスを使用すべき場合

| 条件 | 説明 | 例 |
|------|------|-----|
| **フォーム送信** | 送信ボタンで一括反映 | アンケート、利用規約 |
| **複数選択** | グループ内で複数選択 | 権限設定、フィルター |
| **リスト選択** | リスト項目の選択/解除 | ファイル選択、行選択 |
| **同意/承認** | ユーザーの明示的な同意 | 利用規約、データ共有 |

### 比較表

| 項目 | トグルスイッチ | チェックボックス |
|------|--------------|----------------|
| **反映タイミング** | 即座 | フォーム送信時 |
| **用途** | 設定、表示切替 | 選択、同意 |
| **複数選択** | 個別に独立 | グループ化可能 |
| **視覚的意味** | ON/OFF状態 | 選択/未選択 |
| **アニメーション** | スライダー移動 | チェックマーク |
| **サイズバリエーション** | 2種類（標準、小） | 1種類のみ |

---

## 実装パターン

### 基本実装

**標準サイズ:**
```tsx
const [enabled, setEnabled] = useState(false);

<Space align="center">
  <Text>機能を有効化</Text>
  <Switch
    checked={enabled}
    onChange={setEnabled}
  />
</Space>
```

**小サイズ:**
```tsx
const [showLabels, setShowLabels] = useState(false);

<Space align="center" size="small">
  <Text type="secondary" style={{ fontSize: 12 }}>
    ラベル表示
  </Text>
  <Switch
    size="small"
    checked={showLabels}
    onChange={setShowLabels}
  />
</Space>
```

### ラベルの配置

**ラベル左配置（推奨）:**
```tsx
<Space align="center">
  <Text>ダークモード</Text>
  <Switch checked={isDarkMode} onChange={setIsDarkMode} />
</Space>
```

**ラベル右配置:**
```tsx
<Space align="center">
  <Switch checked={isDarkMode} onChange={setIsDarkMode} />
  <Text>ダークモード</Text>
</Space>
```

**説明文付き（垂直レイアウト）:**
```tsx
<Space direction="vertical" size="small">
  <Space align="center">
    <Text strong>自動保存</Text>
    <Switch checked={autoSave} onChange={setAutoSave} />
  </Space>
  <Text type="secondary" style={{ fontSize: 12, marginLeft: 0 }}>
    編集内容を自動的に保存します
  </Text>
</Space>
```

### 読み込み状態

```tsx
<Switch
  checked={enabled}
  loading={isLoading}
  onChange={handleChange}
/>
```

### 無効状態

```tsx
<Switch
  checked={enabled}
  disabled={!hasPermission}
  onChange={setEnabled}
/>
```

### カスタムチェック内容

```tsx
<Switch
  checked={enabled}
  checkedChildren="ON"
  unCheckedChildren="OFF"
  onChange={setEnabled}
/>
```

### アイコン付き

```tsx
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

<Switch
  checked={enabled}
  checkedChildren={<CheckOutlined />}
  unCheckedChildren={<CloseOutlined />}
  onChange={setEnabled}
/>
```

---

## Form.Itemとの統合

### 基本的な統合
```tsx
<Form.Item
  name="notifications"
  label="通知を有効化"
  valuePropName="checked"
  initialValue={false}
>
  <Switch />
</Form.Item>
```

### 説明文付き
```tsx
<Form.Item
  name="autoSave"
  label="自動保存"
  valuePropName="checked"
  tooltip="編集内容を自動的に保存します"
>
  <Switch />
</Form.Item>
```

### 条件付き表示
```tsx
const autoSaveEnabled = Form.useWatch('autoSave', form);

<Form.Item
  name="autoSave"
  label="自動保存"
  valuePropName="checked"
>
  <Switch />
</Form.Item>

{autoSaveEnabled && (
  <Form.Item
    name="saveInterval"
    label="保存間隔（秒）"
  >
    <InputNumber min={10} max={300} />
  </Form.Item>
)}
```

---

## プロジェクト内の使用例

### PetriNetViewer.tsx（小サイズ、ツールバー内）
```tsx
<Space size="small">
  <Text type="secondary" style={{ fontSize: 12 }}>
    アーク名表示
  </Text>
  <Switch
    size="small"
    checked={showArcLabels}
    onChange={setShowArcLabels}
  />
</Space>
```

**分析:**
- **パターン**: パターン2（小サイズ）
- **配置**: ツールバー内のコンパクトなスペース
- **用途**: ビューアの表示オプション（即座に反映）
- **理由**: 
  - 限られたスペースに配置
  - 他のボタンと並べて表示
  - 視覚的なフィードバックが即座に必要
  - ユーザーが頻繁に切り替える可能性がある

**適切な選択理由:**
- ✅ 即座に表示が切り替わる
- ✅ フォーム送信不要
- ✅ コンパクトな表示
- ✅ 視覚的なON/OFFが明確

---

## レイアウトパターン

### 設定リスト（推奨）

**カード内での設定項目:**
```tsx
<Card title="表示設定">
  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
    <Flex justify="space-between" align="center">
      <Space direction="vertical" size={0}>
        <Text strong>グリッド表示</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          背景にグリッドを表示します
        </Text>
      </Space>
      <Switch checked={showGrid} onChange={setShowGrid} />
    </Flex>
    
    <Divider style={{ margin: 0 }} />
    
    <Flex justify="space-between" align="center">
      <Space direction="vertical" size={0}>
        <Text strong>ミニマップ</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          ナビゲーション用のミニマップを表示
        </Text>
      </Space>
      <Switch checked={showMiniMap} onChange={setShowMiniMap} />
    </Flex>
  </Space>
</Card>
```

### ツールバー内（コンパクト）

```tsx
<Space size="small" align="center">
  <Button icon={<DownloadOutlined />} size="small">
    エクスポート
  </Button>
  
  <Divider type="vertical" />
  
  <Text type="secondary" style={{ fontSize: 12 }}>
    ラベル
  </Text>
  <Switch size="small" checked={showLabels} onChange={setShowLabels} />
  
  <Text type="secondary" style={{ fontSize: 12 }}>
    グリッド
  </Text>
  <Switch size="small" checked={showGrid} onChange={setShowGrid} />
</Space>
```

### テーブル内での使用

```tsx
const columns = [
  {
    title: '名前',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '有効',
    dataIndex: 'enabled',
    key: 'enabled',
    render: (enabled: boolean, record: any) => (
      <Switch
        size="small"
        checked={enabled}
        onChange={(checked) => handleToggle(record.id, checked)}
      />
    ),
  },
];
```

---

## 非同期処理との統合

### ローディング状態の表示
```tsx
const [enabled, setEnabled] = useState(false);
const [loading, setLoading] = useState(false);

const handleChange = async (checked: boolean) => {
  setLoading(true);
  try {
    await updateSetting(checked);
    setEnabled(checked);
    message.success('設定を更新しました');
  } catch (error) {
    message.error('設定の更新に失敗しました');
  } finally {
    setLoading(false);
  }
};

<Switch
  checked={enabled}
  loading={loading}
  onChange={handleChange}
/>
```

### 確認ダイアログ付き
```tsx
const handleChange = (checked: boolean) => {
  if (checked) {
    // ONにする場合は確認なし
    setEnabled(checked);
  } else {
    // OFFにする場合は確認
    Modal.confirm({
      title: '機能を無効化しますか？',
      content: 'この機能を無効化すると、一部の機能が使用できなくなります。',
      onOk: () => {
        setEnabled(false);
        message.success('機能を無効化しました');
      },
    });
  }
};

<Switch checked={enabled} onChange={handleChange} />
```

---

## エラーハンドリング

### 権限チェック
```tsx
const handleChange = (checked: boolean) => {
  if (!hasPermission) {
    message.warning('この設定を変更する権限がありません');
    return;
  }
  setEnabled(checked);
};

<Switch
  checked={enabled}
  disabled={!hasPermission}
  onChange={handleChange}
/>
```

### 依存関係のチェック
```tsx
const handleNotificationChange = (checked: boolean) => {
  if (checked && !emailConfigured) {
    message.warning('通知を有効化するには、メール設定が必要です');
    return;
  }
  setNotificationsEnabled(checked);
};
```

---

## 使用禁止パターン

### ❌ 避けるべきパターン

1. **フォーム送信が必要な項目にトグルスイッチを使用**
   - 理由: ユーザーが即座に反映されると誤解する
   - 代替: チェックボックスを使用
   - 例外: 自動保存機能がある場合は使用可能

2. **複数選択にトグルスイッチを使用**
   - 理由: トグルスイッチは個別のON/OFF用
   - 代替: Checkbox.Groupを使用
   - 例外: 個別の設定が独立している場合は使用可能

3. **ラベルなしのトグルスイッチ**
   - 理由: 何を切り替えているか不明
   - 対策: 必ず明確なラベルテキストを付ける
   - 例外: アイコンとツールチップで明確な場合は可

4. **重要な確認が必要な操作にトグルスイッチを使用**
   - 理由: 誤操作のリスクが高い
   - 対策: 確認ダイアログを表示するか、ボタン操作にする
   - 例外: 簡単に元に戻せる操作は使用可能

5. **標準サイズと小サイズを同じエリアに混在**
   - 理由: UIの一貫性が損なわれる
   - 対策: 同一エリア内では同じサイズを使用

6. **トグルスイッチの過度な使用**
   - 理由: すべての項目が重要に見える
   - 対策: 重要な設定のみトグルスイッチを使用
   - 代替: 通常の選択項目はSelectやRadioを使用

---

## アクセシビリティ考慮事項

### キーボード操作
- Tabキーでフォーカス移動
- Spaceキーで切り替え
- Enterキーは無効（Spaceのみ）

### スクリーンリーダー対応
```tsx
<Switch
  checked={enabled}
  onChange={setEnabled}
  aria-label="ダークモードを有効化"
/>
```

### カラーコントラスト
- ON状態の背景色（#CF0027）と白スライダー: 十分なコントラスト
- OFF状態でも視認可能な明度差を確保

### フォーカス表示
```tsx
// Ant Designが自動的に提供
// フォーカス時: 2px solid #CF0027 のアウトライン
```

---

## パフォーマンス最適化

### 不要な再レンダリング防止
```tsx
const handleChange = useCallback((checked: boolean) => {
  setEnabled(checked);
}, []);

<Switch checked={enabled} onChange={handleChange} />
```

### 大量のスイッチの最適化
```tsx
// 仮想スクロールと組み合わせる
const VirtualList: React.FC = () => {
  return (
    <List
      dataSource={items}
      renderItem={(item) => (
        <List.Item>
          <Flex justify="space-between" style={{ width: '100%' }}>
            <Text>{item.name}</Text>
            <Switch
              size="small"
              checked={item.enabled}
              onChange={(checked) => handleToggle(item.id, checked)}
            />
          </Flex>
        </List.Item>
      )}
    />
  );
};
```

---

## まとめ

### DO（推奨）
✅ 即座に効果が反映される設定にトグルスイッチを使用する
✅ 明確なラベルテキストを設定する
✅ ツールバーやコンパクトなエリアでは小サイズを使用する
✅ 設定画面や一般的な表示切替では標準サイズを使用する
✅ 非同期処理では`loading`状態を表示する
✅ 無効状態を適切に使用する
✅ アクセシビリティを考慮する（aria-label等）
✅ キーボード操作をサポートする

### DON'T（非推奨）
❌ フォーム送信が必要な項目にトグルスイッチを使用しない
❌ 複数選択にトグルスイッチを使用しない（チェックボックスを使用）
❌ ラベルなしのトグルスイッチを作成しない
❌ 重要な確認なしに危険な操作をトグルスイッチで実行しない
❌ 標準サイズと小サイズを同じエリアに混在させない
❌ すべての項目をトグルスイッチにしない（適材適所で使用）
❌ チェックボックスで十分な場合にトグルスイッチを使用しない
❌ 視覚的フィードバックを無視しない
