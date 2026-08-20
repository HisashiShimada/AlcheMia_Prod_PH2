# メソッド選択カード UI設計書

## メタデータ
- **画面名**: メソッド選択カード
- **物理名**: MethodSelector.tsx
- **ファイルパス**: `frontend/src/components/ExperimentWorker/MethodSelector.tsx`
- **利用権限**: 実験作業者（experiment_worker）
- **作成日**: 2026-08-15
- **最終更新日**: 2026-08-15
- **担当者**: Development Team
- **バージョン**: 1.0.0

---

## 1. 画面概要

### 1.1. 目的

現在選択中のメソッド情報をカード形式で表示する**表示専用コンポーネント**です。
サブヘッダーエリアに配置され、選択状態を一目で確認できます。

### 1.2. 主要機能

1. 選択中メソッド名の表示
2. メソッドID・トランジション数の表示
3. 未選択時のプレースホルダー表示
4. disabled状態（プロジェクト未選択時）の表示

---

## 2. 画面レイアウト

```
┌──────────────────────────────────────────────────┐
│ Card（選択時: 青背景・青ボーダー）                 │
│ 🔧 メソッド                                      │
│    測定メソッドA                                 │
│    method-001 • 5 トランジション                 │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Card（未選択時）                                  │
│ 🔧 メソッド                                      │
│    メソッドが選択されていません                   │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ Card（disabled時: 透明度60%）                    │
│ 🔧 メソッド                                      │
│    プロジェクトを選択してください                 │
└──────────────────────────────────────────────────┘
```

---

## 3. コンポーネント Props 定義

```typescript
interface MethodSelectorProps {
  methods: Method[];
  selectedMethodId: string | null;
  onSelectMethod?: (methodId: string) => void;
  disabled?: boolean;
}
```

| Prop名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| `methods` | `Method[]` | ✅ | 選択可能なメソッド一覧（表示用情報取得に使用）|
| `selectedMethodId` | `string \| null` | ✅ | 選択中のメソッドID（null = 未選択）|
| `onSelectMethod` | `(methodId: string) => void` | ❌ | メソッド変更コールバック（現時点では未使用）|
| `disabled` | `boolean` | ❌ | 無効化フラグ（デフォルト: false）|

---

## 4. 表示状態

| 状態 | カード背景 | カード枠色 | 透明度 | 表示内容 |
|------|----------|----------|--------|--------|
| 選択中 | `colorPrimaryBg` | `colorPrimary` | 1.0 | メソッド名・ID・トランジション数 |
| 未選択 | `colorBgContainer` | `colorBorder` | 1.0 | 「メソッドが選択されていません」|
| disabled | `colorBgContainer` | `colorBorder` | 0.6 | 「プロジェクトを選択してください」|

---

## 5. data-testid

| 要素 | testid |
|------|--------|
| Card全体 | `method-selector` |
| 選択中情報エリア | `method-selector-selected-info` |
| メソッド名 | `method-selector-method-name` |
| メソッド詳細テキスト | `method-selector-method-detail` |
| プレースホルダー | `method-selector-empty-text` |
