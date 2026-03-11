# InstructionGroup UI設計書

## メタデータ
- **コンポーネントID**: InstructionGroup
- **コンポーネント名**: 指示グループコンポーネント
- **ファイルパス**: `frontend/src/components/ExperimentWorker/InstructionGroup.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-01-19
- **最終更新日**: 2026-03-11

---

## 1. 概要

### 1.1 コンポーネントの目的
指示確認タブ内で、指示を3つのグループ（プロジェクト指示、タスク指示、トランジション単位指示）に分けて表示するコンポーネントです。タスク/メソッド/トランジションごとに折りたたみ可能なカードで整理して表示します。

### 1.2 主要機能
- 3種類の指示グループ表示（プロジェクト、タスク、トランジション）
- タスク/メソッド/トランジション単位での折りたたみ機能
- グループ単位での確認完了ボタン
- 空状態の適切な表示

### 1.3 使用場所
- InstructionConfirmationTab（指示確認タブ）内の各グループエリア

---

## 2. コンポーネント構成

### 2.1 画面イメージ
![指示グループコンポーネントイメージ](..\images\ui_instruction_group.jpg)

### 2.2 レイアウト構造

#### パターン1: プロジェクト指示（カードなし）

```
┌─────────────────────────────────────────────┐
│ InstructionCard 1                            │
├─────────────────────────────────────────────┤
│ InstructionCard 2                            │
├─────────────────────────────────────────────┤
│ InstructionCard 3                            │
└─────────────────────────────────────────────┘

空状態:
┌─────────────────────────────────────────────┐
│ Card                                         │
│   Empty                                      │
│   "実験全体への作業指示がありません"          │
└─────────────────────────────────────────────┘
```

#### パターン2: タスク指示（折りたたみ可能カード）

```
┌─────────────────────────────────────────────┐
│ Card: タスクA (3件) [確認完了]              │
│ ┌───────────────────────────────────────┐   │
│ │ [▼] [ToolOutlined] タスクA (3件)      │   │
│ │                         [確認完了ボタン]│   │
│ ├───────────────────────────────────────┤   │
│ │ InstructionCard 1                     │   │
│ │ InstructionCard 2                     │   │
│ │ InstructionCard 3                     │   │
│ └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘

折りたたみ時:
┌─────────────────────────────────────────────┐
│ Card: タスクA (3件)                          │
│ ┌───────────────────────────────────────┐   │
│ │ [▶] [ToolOutlined] タスクA (3件)      │   │
│ └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

#### パターン3: トランジション単位指示（折りたたみ可能カード）

```
┌─────────────────────────────────────────────┐
│ Card: トランジションX (2件) [確認完了]       │
│ ┌───────────────────────────────────────┐   │
│ │ [▼] [AimOutlined] トランジションX (2件)│   │
│ │                         [確認完了ボタン]│   │
│ ├───────────────────────────────────────┤   │
│ │ InstructionCard 1                     │   │
│ │ InstructionCard 2                     │   │
│ └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 2.3 使用コンポーネント

#### Ant Design コンポーネント
- `Card` - グループカード
- `Button` - 確認完了ボタン
- `Space` - 縦方向の間隔制御
- `Typography.Title` - グループタイトル
- `Typography.Text` - テキスト表示
- `Empty` - 空状態表示
- `theme` - デザイントークン取得

#### カスタムコンポーネント
- `InstructionCard` - 個別の指示カード

#### アイコン
- `CheckCircleOutlined` - 確認完了アイコン
- `FileOutlined` - プロジェクト指示アイコン
- `ToolOutlined` - タスク指示アイコン
- `AimOutlined` - トランジション指示アイコン
- `DownOutlined` - 展開中アイコン
- `RightOutlined` - 折りたたみ中アイコン

---

## 3. Props

```typescript
interface InstructionGroupProps {
  title: string;                                               // グループタイトル
  instructions: Instruction[];                                 // 指示一覧
  emoji: string;                                               // 絵文字（未使用）
  projectStatus: ProjectStatus | null;                        // プロジェクトステータス
  isClient: boolean;                                           // クライアント判定フラグ
  onConfirmInstructions?: (instructions: Instruction[]) => void; // 確認完了コールバック（省略可）
  confirmLoading?: boolean;                                    // 確認完了ボタンのローディング状態（省略可）
}
```

### 3.1 titleの種類

| title | 表示形式 | グループ化 |
|-------|---------|-----------|
| プロジェクト指示 | カードなし直接表示 | なし |
| タスク指示 | タスク単位でカード化 | taskIdでグループ化 |
| メソッド単位指示 | メソッド単位でカード化 | methodIdでグループ化 |
| トランジション単位指示 | トランジション単位でカード化 | transitionIdでグループ化 |

**後方互換性（旧名称のtitleもサポート）:**
- 全体指示 → プロジェクト指示と同じ処理
- タスク単位指示 → タスク指示と同じ処理

**注意:** `メソッド単位指示` はタスク指示に統合されず、独立したケースとして `groupByMethod()` で処理される。

---

## 4. State（内部状態）

```typescript
// 各項目（タスク/トランジション）の展開状態
const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
```

**デフォルト動作:**
- すべての項目は初期状態で展開（`expandedItems[itemKey] !== false`）
- ユーザーが明示的に折りたたんだ場合のみ`false`に設定

---

## 5. グループ化ロジック

### 5.1 タスク単位グループ化

```typescript
const groupByTask = () => {
  const groups: Record<string, Instruction[]> = {};
  groupInstructions.forEach((instruction) => {
    const key = instruction.taskId || 'unknown';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(instruction);
  });
  return groups;
};
```

### 5.2 メソッド単位グループ化

```typescript
const groupByMethod = () => {
  const groups: Record<string, Instruction[]> = {};
  groupInstructions.forEach((instruction) => {
    const key = instruction.methodId || 'unknown';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(instruction);
  });
  return groups;
};
```

### 5.3 トランジション単位グループ化

```typescript
const groupByTransition = () => {
  const groups: Record<string, Instruction[]> = {};
  groupInstructions.forEach((instruction) => {
    const key = instruction.transitionId || 'unknown';
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(instruction);
  });
  return groups;
};
```

---

## 6. イベント

### 6.1 展開/折りたたみイベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| toggleItem | タイトル行クリック | 指定されたitemKeyの展開状態を反転 |

```typescript
const toggleItem = (itemKey: string) => {
  setExpandedItems((prev) => ({
    ...prev,
    [itemKey]: !prev[itemKey],
  }));
};
```

**ホバー効果:**
```typescript
onMouseEnter={(e) => {
  e.currentTarget.style.backgroundColor = token.colorBgSpotlight;
}}
onMouseLeave={(e) => {
  e.currentTarget.style.backgroundColor = 'transparent';
}}
```

### 6.2 確認完了イベント

| イベント名 | トリガー | 処理内容 |
|-----------|---------|---------|
| onConfirmInstructions（コールバック） | 確認完了ボタンクリック | 親コンポーネントに対象グループの指示一覧を渡してAPI呼び出しを委譲 |

```typescript
// 確認完了ボタンのクリックハンドラ（タスク指示の例）
onClick={(e) => {
  e.stopPropagation();  // カード展開/折りたたみを防ぐ
  onConfirmInstructions(taskInstructions);  // コールバック経由で親に委譲
}}
```

**ボタンの状態制御:**
```typescript
<Button
  type="primary"
  icon={<CheckCircleOutlined />}
  loading={confirmLoading}          // ローディング中はスピナー表示
  disabled={
    confirmLoading ||               // ローディング中は無効化
    taskInstructions.every((i) => i.isAcknowledged)  // 全指示確認済みの場合も無効化
  }
  onClick={(e) => {
    e.stopPropagation();
    onConfirmInstructions(taskInstructions);
  }}
  style={{ 
    backgroundColor: token.colorSuccess,
    borderColor: token.colorSuccess 
  }}
>
  確認完了
</Button>
```

**表示条件:**
- `onConfirmInstructions` prop が渡されている場合のみ表示（省略時はボタン非表示）
- 展開時のみ表示（折りたたみ時は非表示）

**disabled 条件:**
- `confirmLoading === true`（APIリクエスト中）
- 対象グループの全指示が `isAcknowledged === true`（確認済み）

**イベント伝播の制御:**
- `e.stopPropagation()` でカードの展開/折りたたみトグルを防ぐ

---

## 7. 表示パターン詳細

### 7.1 プロジェクト指示

**特徴:**
- カードでラップしない
- 指示を直接Space内に表示
- 確認完了ボタンなし

**JSX構造:**
```typescript
<Space orientation="vertical" size={8} style={{ width: '100%' }}>
  {groupInstructions.map((instruction) => (
    <InstructionCard
      key={instruction.instructionId}
      instruction={instruction}
      projectStatus={projectStatus}
      isClient={isClient}
    />
  ))}
</Space>
```

### 7.2 タスク指示

**特徴:**
- タスクごとにカードでグループ化
- 折りたたみ可能
- 確認完了ボタンあり（展開時のみ表示）

**カード構造:**
```typescript
<Card>
  {/* ヘッダー行 */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    {/* 展開/折りたたみエリア（クリッカブル） */}
    <div onClick={() => toggleItem(taskId)}>
      {isExpanded ? <DownOutlined /> : <RightOutlined />}
      <Title level={5}>
        <ToolOutlined /> {taskName} ({taskInstructions.length}件)
      </Title>
    </div>
    
    {/* 確認完了ボタン（展開時のみ） */}
    {isExpanded && (
      <Button type="primary" icon={<CheckCircleOutlined />}>
        確認完了
      </Button>
    )}
  </div>
  
  {/* 指示カード群（展開時のみ） */}
  {isExpanded && (
    <Space orientation="vertical" size={8} style={{ width: '100%', marginTop: 8 }}>
      {taskInstructions.map((instruction) => (
        <InstructionCard {...} />
      ))}
    </Space>
  )}
</Card>
```

### 7.3 トランジション単位指示

**特徴:**
- トランジションごとにカードでグループ化
- 折りたたみ可能
- 確認完了ボタンあり（展開時のみ表示）
- アイコンはAimOutlined（水色: colorInfo）

**構造はタスク指示と同様**

### 7.4 メソッド単位指示

**特徴:**
- メソッドごとにカードでグループ化
- 折りたたみ可能
- 確認完了ボタンあり（展開時のみ、`onConfirmInstructions` が渡された場合のみ表示）
- アイコンはToolOutlined（青: colorPrimary）
- `title === 'メソッド単位指示'` の場合に処理（タスク指示とは独立したケース）

**カード構造:**
```typescript
<Card>
  {/* ヘッダー行 */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    {/* 展開/折りたたみエリア（クリッカブル） */}
    <div onClick={() => toggleItem(methodId)}>
      {isExpanded ? <DownOutlined /> : <RightOutlined />}
      <Title level={5}>
        <ToolOutlined style={{ color: token.colorPrimary }} />
        {methodName} ({methodInstructions.length}件)
      </Title>
    </div>

    {/* 確認完了ボタン（展開時かつonConfirmInstructionsがある場合のみ） */}
    {isExpanded && onConfirmInstructions && (
      <Button
        type="primary"
        icon={<CheckCircleOutlined />}
        loading={confirmLoading}
        disabled={
          confirmLoading ||
          methodInstructions.every((i) => i.isAcknowledged)
        }
        onClick={(e) => {
          e.stopPropagation();
          onConfirmInstructions(methodInstructions);
        }}
        style={{ backgroundColor: token.colorSuccess, borderColor: token.colorSuccess }}
      >
        確認完了
      </Button>
    )}
  </div>

  {/* 指示カード群（展開時のみ） */}
  {isExpanded && (
    <Space orientation="vertical" size={8} style={{ width: '100%', marginTop: 8 }}>
      {methodInstructions.map((instruction) => (
        <InstructionCard {...} />
      ))}
    </Space>
  )}
</Card>
```

---

## 8. スタイリング

### 8.1 グループカードスタイル

```typescript
<Card
  style={{
    borderRadius: token.borderRadius,
    backgroundColor: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    margin: '8px 0',
  }}
  styles={{
    body: {
      padding: '8px',
    },
  }}
>
```

### 8.2 ヘッダー行スタイル

```typescript
<div
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px',
    margin: '-8px',  // カードのpaddingを相殺
    borderRadius: token.borderRadiusSM,
  }}
>
```

### 8.3 展開/折りたたみエリアスタイル

```typescript
<div
  style={{
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    cursor: 'pointer',
  }}
  // ホバー時の背景色変更
>
```

### 8.4 確認完了ボタンスタイル

```typescript
<Button
  type="primary"
  icon={<CheckCircleOutlined />}
  style={{ 
    backgroundColor: token.colorSuccess,  // 緑色
    borderColor: token.colorSuccess 
  }}
>
  確認完了
</Button>
```

### 8.5 アイコンスタイル

| アイコン | 用途 | 色 |
|---------|------|-----|
| ToolOutlined | タスク | colorPrimary（青） |
| AimOutlined | トランジション | colorInfo（水色） |
| DownOutlined | 展開中 | デフォルト |
| RightOutlined | 折りたたみ中 | デフォルト |

---

## 9. 空状態処理

### 9.1 空状態メッセージ

```typescript
const noDataMessages: Record<string, string> = {
  'プロジェクト指示': '実験全体への作業指示がありません',
  'タスク指示': 'タスクへの作業指示がありません',
  'トランジション単位指示': 'トランジションへの作業指示がありません',
  // 後方互換性
  '全体指示': '実験全体への作業指示がありません',
  'タスク単位指示': 'タスクへの作業指示がありません',
  'メソッド単位指示': 'メソッドへの作業指示がありません',
};
```

### 9.2 表示

```typescript
<Card>
  <Empty description={noDataMessages[title] || '作業指示がありません'} />
</Card>
```

---

## 10. データフロー

### 10.1 Props → State → 表示

```
props.instructions (すべての指示)
  ↓
groupByTask/Method/Transition() でグループ化
  ↓
各グループをカードで表示
  ↓
expandedItems[itemKey] で展開/折りたたみ制御
  ↓
展開時のみInstructionCardを表示
```

### 10.2 InstructionCardへのデータ受け渡し

```typescript
<InstructionCard
  key={instruction.instructionId}
  instruction={instruction}           // 個別指示データ
  projectStatus={projectStatus}       // プロジェクトステータス
  isClient={isClient}                 // クライアント判定
/>
```

---

## 11. アクセシビリティ

### 11.1 キーボード操作

- カードのクリック可能エリアにcursor: pointerを設定
- ボタンは標準のフォーカス動作

### 11.2 視覚的フィードバック

- ホバー時の背景色変化（colorBgSpotlight）
- 展開/折りたたみアイコンで状態を明示
- 確認完了ボタンは緑色で目立つ

---

## 12. パフォーマンス考慮事項

### 12.1 グループ化の最適化

- グループ化関数は毎回実行（useMemoなし）
- 指示数が多い場合（100件超）はパフォーマンス影響の可能性

### 12.2 将来の最適化

```typescript
const taskGroups = useMemo(() => groupByTask(), [groupInstructions]);
```

---

## 13. 備考

### 13.1 特記事項

1. **デフォルトで展開**
   - すべての項目は初期状態で展開
   - ユーザーが折りたたんだ場合のみ状態保持

2. **後方互換性**
   - 旧名称（全体指示、タスク単位指示）もサポート
   - `メソッド単位指示` は後方互換ではなく、独立したケースとして処理
   - noDataMessagesでメッセージを統一管理

3. **未使用のemoji prop**
   - propsで受け取っているが使用していない
   - 将来の機能拡張のため残されている

4. **確認完了ボタンの動作**
   - `onConfirmInstructions` コールバック経由で親コンポーネントに処理を委譲
   - `confirmLoading` propによりAPIリクエスト中はローディング表示
   - 対象グループの全指示が確認済み（`isAcknowledged === true`）の場合はボタンをdisabledにする
   - `onConfirmInstructions` が未指定の場合はボタン自体を表示しない

5. **e.stopPropagation()の使用**
   - 確認完了ボタンクリック時に展開/折りたたみを防ぐ
   - 重要なイベント伝播制御

6. **getIconヘルパー関数（未使用）**
   - `getIcon(iconType: string)` 関数が定義されているが、JSX内では直接アイコンコンポーネントを記述しており現在は未使用
   - 将来的なリファクタリングのために残されている可能性あり

### 13.2 将来の拡張

1. 確認完了APIの実装
2. 一括確認完了機能
3. 未確認指示のハイライト表示
4. フィルタリング機能（既読/未読）
5. ソート機能（日時、重要度）
6. グループの展開状態の永続化
7. パフォーマンス最適化（useMemo使用）

### 13.3 関連ドキュメント

- [InstructionConfirmationTab UI設計書](./ui_instruction_confirmation_tab.md)
- [InstructionCard UI設計書](./ui_instruction_card.md)
- [InstructionStats UI設計書](./ui_instruction_stats.md)

---

## 14. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2026-01-19 | 初版作成 | Cline |
| 1.1.0 | 2026-03-11 | ソースコードとの差分修正（Props追加・確認完了ボタン実装更新・メソッド単位指示セクション追加・Spaceプロパティ名修正・備考更新） | Cline |
