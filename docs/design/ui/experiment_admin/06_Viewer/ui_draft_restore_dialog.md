# ドラフト復元ダイアログ UI設計書

## メタデータ
- **画面名**: ドラフト復元ダイアログ
- **物理名**: DraftRestoreDialog.tsx
- **ファイルパス**: `frontend/src/components/viewer/DraftRestoreDialog.tsx`
- **利用権限**: 実験管理者（experiment_admin）、実験作業者（experiment_worker）
- **作成日**: 2026-08-14
- **最終更新日**: 2026-08-21
- **担当者**: Development Team
- **バージョン**: 2.0.0

---

## 1. 画面概要

### 1.1. 目的

Viewerを開いた際に**バックエンドに保存されたDraftが存在する場合**、Draftの復元を促すダイアログです。  
Draftを復元するか、復元せずに進むかを選択できます。

> ⚠️ **実装上の注意**: LocalStorageベースのDraft機能は廃止されました。  
> `onRestoreDraft` / `draftInfo` は後方互換のためPropsに残っていますが、現在のUIには表示されません。  
> バックエンドDraft（`hasBackendDraft` / `onRestoreBackendDraft`）のみが実際に使用されます。

### 1.2. アクセス権限

| ロール | アクセス |
|--------|---------|
| `experiment_admin` | ✅ 表示される |
| `experiment_worker` | ✅ 表示される |

### 1.3. 主要機能

1. バックエンドDraftの存在通知
2. バックエンドDraftの復元実行
3. 復元せずに進む（「復元しない」）

---

## 2. 画面レイアウト

### 2.1. バックエンドDraftあり

```
┌──────────────────────────────────────────────────────┐
│ ⚠ 未保存のドラフトがあります                         │
├──────────────────────────────────────────────────────┤
│ Body:                                                │
│ 前回の編集中に保存されなかったデータがあります。     │
│ 復元しますか？                                       │
│                                                      │
├──────────────────────────────────────────────────────┤
│ Footer:      [復元しない]            [復元する]      │
└──────────────────────────────────────────────────────┘
```

### 2.2. バックエンドDraftなし（hasBackendDraft=false）

```
┌──────────────────────────────────────────────────────┐
│ ⚠ 未保存のドラフトがあります                         │
├──────────────────────────────────────────────────────┤
│ Body:                                                │
│ 前回の編集中に保存されなかったデータがあります。     │
│ 復元しますか？                                       │
│                                                      │
├──────────────────────────────────────────────────────┤
│ Footer:                             [復元しない]     │
└──────────────────────────────────────────────────────┘
```

---

## 3. コンポーネント Props 定義

```typescript
interface DraftRestoreDialogProps {
  /** ダイアログの表示状態 */
  open: boolean;
  /** ダイアログを閉じるコールバック */
  onClose: () => void;
  /** LocalStorage Draft復元を選択したときのコールバック（後方互換のために残す・現在未使用） */
  onRestoreDraft: () => void;
  /** 新規作成（復元しない）を選択したときのコールバック */
  onCreateNew: () => void;
  /** LocalStorage Draft情報（後方互換のために残す。表示には使用しない） */
  draftInfo?: {
    savedAt: string;
    methodCount: number;
    nodeCount: number;
  } | null;
  /** バックエンドDraftが存在するかどうか */
  hasBackendDraft?: boolean;
  /** バックエンドDraftから復元を選択したときのコールバック */
  onRestoreBackendDraft?: () => void;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `open` | `boolean` | ✅ | ダイアログ表示/非表示 |
| `onClose` | `() => void` | ✅ | ダイアログを閉じるコールバック |
| `onRestoreDraft` | `() => void` | ✅ | LocalStorage復元コールバック（後方互換・現在未使用） |
| `onCreateNew` | `() => void` | ✅ | 「復元しない」ボタンのコールバック |
| `draftInfo` | `object \| null` | ❌ | LocalStorage Draft情報（後方互換・表示には不使用） |
| `hasBackendDraft` | `boolean` | ❌ | バックエンドDraftが存在するか（デフォルト: false） |
| `onRestoreBackendDraft` | `() => void` | ❌ | バックエンドDraftから復元するコールバック |

---

## 4. 表示ロジック

- `hasBackendDraft === true` かつ `onRestoreBackendDraft` が渡されている場合: 「復元する」ボタン（primary）を表示
- それ以外: 「復元しない」ボタンのみ表示
- `draftInfo` / `draftSavedAt` は表示に使用しない（後方互換のためPropsに残存）

---

## 5. フッターボタン

| ボタン | type | 表示条件 | コールバック |
|--------|------|---------|------------|
| 復元しない | default | 常に表示 | `onCreateNew` |
| 復元する | primary | `hasBackendDraft && onRestoreBackendDraft` がある時のみ | `onRestoreBackendDraft` |

---

## 6. 使用コンポーネント

- `Modal` - ダイアログコンテナ
- `Button` - 「復元しない」（デフォルト）・「復元する」（primary）
- `Space` - タイトルアイコンと文字の配置
- `ExclamationCircleOutlined` - タイトルアイコン（警告色 #faad14）

---

## 7. 変更履歴

| 日付 | バージョン | 変更内容 | 担当者 |
|------|-----------|----------|--------|
| 2026-08-14 | 1.0.0 | 初版作成（LocalStorageベース） | Development Team |
| 2026-08-21 | 2.0.0 | バックエンドDraftベースに移行。Props・UIを実装に合わせて更新 | Cline |
