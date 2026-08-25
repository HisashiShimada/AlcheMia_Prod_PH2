# 作業指示確認モーダル UI設計書

## メタデータ
- **画面名**: 作業指示確認モーダル
- **物理名**: InstructionConfirmationModal.tsx
- **ファイルパス**: `frontend/src/components/ExperimentWorker/InstructionConfirmationModal.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-08-15
- **最終更新日**: 2026-08-15
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 画面概要

### 1.1. 目的

指定したトランジションに紐づく作業指示をAPIから取得し、グループ別に一覧表示するモーダルです。
`InstructionConfirmationTab` に内包される**タブ外の単独モーダル**として使用されます。
確認専用（閉じるボタンのみ）で、記録操作は行いません。

### 1.2. 主要機能

1. トランジション + プロジェクトIDを指定してAPIから作業指示を取得
2. 指示をグループ別（プロジェクト指示 / メソッド指示 / タスク指示 / トランジション指示）に分類して表示
3. 各グループはアコーディオン形式で展開/折りたたみ可能
4. ローディング中はスピナー表示、指示なしは「指示なし」メッセージ表示

---

## 2. 画面レイアウト

```
┌──────────────────────────────────────────────────────────────┐
│ Modal（幅800px、top:40）                                     │
│ Title: 📄 作業指示 - 測定ステップ1                           │
├──────────────────────────────────────────────────────────────┤
│ Body:                                                        │
│                                                              │
│ ▼ 📄 プロジェクト指示 (2件)          ← クリックで開閉       │
│ ┌────────────────────────────────┐                           │
│ │ [高優先度] [安全]  📅 3分前    │ ← InstructionCard       │
│ │ サンプル取り扱いに注意してください│                          │
│ └────────────────────────────────┘                           │
│                                                              │
│ ▼ 🔧 メソッド単位指示 (1件)                                 │
│ ┌────────────────────────────────┐                           │
│ │ [通常] [測定]  📅 1時間前      │                           │
│ │ 測定前にキャリブレーションを行うこと│                        │
│ └────────────────────────────────┘                           │
│                                                              │
│ ▼ 📋 タスク指示 (1件)                                       │
│ ...                                                          │
│ ▼ 🎯 トランジション指示 (1件)                               │
│ ...                                                          │
├──────────────────────────────────────────────────────────────┤
│ Footer: [閉じる]                                             │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. コンポーネント Props 定義

```typescript
interface InstructionConfirmationModalProps {
  open: boolean;
  transition: Transition | null;
  projectId?: string;
  methodId?: string;
  projectStatus: ProjectStatus | null;
  onCancel: () => void;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `open` | `boolean` | ✅ | モーダル表示/非表示 |
| `transition` | `Transition \| null` | ✅ | 対象トランジション（nullの場合は指示なし）|
| `projectId` | `string` | ❌ | プロジェクトID（API呼び出しに使用）|
| `methodId` | `string` | ❌ | メソッドID（メソッド指示のフィルタに使用）|
| `projectStatus` | `ProjectStatus \| null` | ✅ | プロジェクトステータス（InstructionCardへ伝播）|
| `onCancel` | `() => void` | ✅ | 閉じるコールバック |

---

## 4. 指示グループの分類ロジック

APIから取得した全指示データを以下のルールで4グループに分類：

| グループ | アイコン | 分類条件 |
|---------|---------|---------|
| プロジェクト指示 | 📄 | `methodId` なし AND `transitionId` なし |
| メソッド単位指示 | 🔧 | `methodId` あり AND `transitionId` なし |
| タスク指示 | 📋 | `methodId` あり AND `transitionId` あり AND `taskId` あり |
| トランジション指示 | 🎯 | `methodId` あり AND `transitionId` あり AND `taskId` なし |

表示フィルタ（このトランジションに関連するもの）：
- プロジェクト指示: 全件表示
- メソッド単位指示: `instruction.methodId === methodId` のみ
- タスク/トランジション指示: `instruction.transitionId === transition.transitionId` のみ

---

## 5. アコーディオン仕様

| 状態 | 初期状態 | アイコン |
|------|---------|--------|
| 展開中 | ✅ 全グループ展開 | `DownOutlined` |
| 折りたたみ | ❌ | `RightOutlined` |

ヘッダークリックで展開/折りたたみを切り替え。

---

## 6. API連携

| API | エンドポイント | タイミング |
|-----|-------------|---------|
| 作業指示取得 | `getWorkerInstructions(projectId)` | `open === true && projectId` 変化時 |

### API型変換（`convertWorkerInstruction`）

| APIフィールド | フロントエンド型 | 変換内容 |
|------------|--------------|---------|
| `priority` | `'low' \| 'normal' \| 'medium' \| 'high'` | コードマスター変換 `0→low`, `1→normal`, `2→medium`, `3→high` |
| `type` | `InstructionType` | コードマスター変換 `0→general`, `1→setup`, `2→measurement`, `3→safety`, `4→cleanup` |
| `task_no` | `taskId` | `${project_id}-${method_id}-${task_no}` の形式 |

---

## 7. data-testid

| 要素 | testid |
|------|--------|
| モーダル全体 | `instruction-confirmation-modal` |
| Body | `instruction-confirmation-modal-body` |
| 指示なし状態 | `instruction-confirmation-modal-empty` |
| プロジェクト指示セクションヘッダー | `instruction-confirmation-modal-file-section-header` |
| プロジェクト指示リスト | `instruction-confirmation-modal-file-section-list` |
| メソッド指示セクションヘッダー | `instruction-confirmation-modal-method-section-header` |
| メソッド指示リスト | `instruction-confirmation-modal-method-section-list` |
| タスク指示セクションヘッダー | `instruction-confirmation-modal-task-section-header` |
| タスク指示リスト | `instruction-confirmation-modal-task-section-list` |
| トランジション指示セクションヘッダー | `instruction-confirmation-modal-transition-section-header` |
| トランジション指示リスト | `instruction-confirmation-modal-transition-section-list` |
| 閉じるボタン | `instruction-confirmation-modal-close-button` |
