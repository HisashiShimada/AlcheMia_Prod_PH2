# 名前空間重複提案モーダル UI設計書

## メタデータ
- **画面名**: 名前空間重複提案モーダル
- **物理名**: DuplicateSuggestModal.tsx
- **ファイルパス**: `frontend/src/components/namespace/DuplicateSuggestModal.tsx`
- **利用権限**: 実験管理者（experiment_admin）
- **作成日**: 2026-08-14
- **最終更新日**: 2026-08-20
- **担当者**: Development Team
- **バージョン**: 1.1.0

---

## 1. 画面概要

### 1.1. 目的

用語管理（`TermManagement.tsx`）で用語を一括保存する際に、**重複する用語が検出された場合**に表示されるモーダルです。  
重複した各用語に対して既存候補の中から1つを選択させ、確定後に統合登録を行います。

### 1.2. 表示トリガー

`TermManagement.tsx` の保存処理中、クライアントサイド重複チェックで重複が検出された場合に `setDuplicateModalOpen(true)` で表示される。ボタン操作によるものではない。

### 1.3. アクセス権限

| ロール | アクセス |
|--------|---------|
| `experiment_admin` | ✅ 操作可 |
| `system_admin` | ✅ 操作可 |

### 1.4. 主要機能

1. 重複が検出された用語ごとに、既存候補一覧をラジオグループで表示
2. 全ての重複用語に対して候補を選択すると「登録」ボタンが活性化
3. 確定後、選択内容（`Record<string, string>`）を親コンポーネントに返す

---

## 2. 画面レイアウト

```
┌──────────────────────────────────────────────────────┐
│ ⚠ 重複する用語が見つかりました                        │
├──────────────────────────────────────────────────────┤
│ Body:                                                │
│ 各用語について、使用する候補を選択してください。       │
│                                                      │
│ ── analysis:temperature ──                           │
│  ○ ┌──────────────────────────────────────────────┐ │
│    │ analysis:temperature                         │ │
│    │ 説明: 温度の測定値  型: floatType  単位: °C   │ │
│    │ 出所: 研究開発部                              │ │
│    └──────────────────────────────────────────────┘ │
│  ○ ┌──────────────────────────────────────────────┐ │
│    │ analysis:temperature                         │ │
│    │ ...                                          │ │
│    └──────────────────────────────────────────────┘ │
│                                                      │
├──────────────────────────────────────────────────────┤
│ Footer:                                              │
│ [全選択時: "選択した候補に統合して登録します"]        │
│                         [キャンセル]  [登録]         │
└──────────────────────────────────────────────────────┘
```

---

## 3. コンポーネント Props 定義

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `open` | `boolean` | ✅ | モーダル表示/非表示 |
| `entries` | `DuplicateTermEntry[]` | ✅ | 重複が検出された用語リスト |
| `onClose` | `() => void` | ✅ | キャンセル時コールバック |
| `onConfirm` | `(selections: Record<string, string>) => void` | ✅ | 登録確定時コールバック（key: localName, value: 選択された候補の prefix） |

---

## 4. 型定義

```typescript
/** 重複候補1件 */
export interface DuplicateCandidate {
  prefix: string;       // 名前空間プレフィックス
  localName: string;    // ローカル名（qname の localName 部分）
  displayName: string;  // 表示名
  type: string;         // 型
  unitHint?: string;    // 単位（任意）
  description: string;  // 説明
  scopeLabel: string;   // スコープラベル（チーム名・部署名など）
}

/** 重複がある用語1件分のデータ */
export interface DuplicateTermEntry {
  localName: string;               // 元の用語の localName
  candidates: DuplicateCandidate[]; // 候補一覧
}
```

---

## 5. モーダル仕様

| 項目 | 値 |
|------|-----|
| コンポーネント | `<Modal>` (Ant Design) |
| タイトル | `t('duplicateSuggestModal.title')` ＋ `<WarningOutlined>` アイコン（#faad14） |
| 幅 | 520px |
| maskClosable | false |
| keyboard | false（Escキーで閉じない） |
| footer | カスタム（左: 統合メッセージ / 右: [キャンセル][登録]） |

---

## 6. フッターボタン

| ボタン | タイプ | 活性条件 | 動作 |
|--------|--------|---------|------|
| キャンセル | `default` | 常時 | `onClose()` を呼び出す |
| 登録 | `primary` | **全ての用語に候補選択済みの場合のみ** | `onConfirm(selections)` を呼び出す |

全選択済みの場合、フッター左端に `t('duplicateSuggestModal.willUnify')` を表示。

---

## 7. 候補カード表示仕様

各 `DuplicateTermEntry` に対してラジオグループを表示する。

| 要素 | 内容 |
|------|------|
| 用語ヘッダー | `analysis:{localName}`（太字） |
| ラジオ選択肢 | 候補ごとにカード形式（ボーダー付き）で表示 |
| カード1行目 | `analysis:{candidate.localName}`（太字） |
| カード2行目 | 説明 / 型 / 単位 |
| カード3行目 | 出所（scopeLabel から括弧書きを除去して表示） |
| 選択中スタイル | 背景色 `#f5f5f5` |

---

## 8. 状態管理

| state | 型 | 説明 |
|-------|-----|------|
| `selections` | `Record<string, string>` | key: localName, value: 選択された prefix |

`entries` または `open` が変化したタイミングで `selections` をリセット（`useEffect`）。

---

## 9. 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-08-20 | v1.1.0: ソース照合による全面修正。Props・レイアウト・目的・型定義をソース実態に合わせて修正 | Cline |
| 2026-08-14 | v1.0.0: 初版作成 | Development Team |
