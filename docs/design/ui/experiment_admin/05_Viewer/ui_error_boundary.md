# ErrorBoundary UI仕様書

## 1. 概要

Reactエラーバウンダリーコンポーネント。子コンポーネントのエラーをキャッチしてフォールバックUIを表示。

---

## 2. ファイルパス

```
frontend/src/components/viewer/ErrorBoundary.tsx
```

---

## 3. Props定義

| プロパティ名 | 型 | 必須 | 説明 |
|------------|---|-----|------|
| children | ReactNode | ✓ | 子要素 |
| fallback | ReactNode | | カスタムフォールバックUI |

---

## 4. State

| State | 型 | 説明 |
|------|---|------|
| hasError | boolean | エラー発生フラグ |
| error | Error \| null | エラーオブジェクト |

---

## 5. 主要機能

### 5.1. エラーキャッチ

**メソッド:**
- componentDidCatch()
- getDerivedStateFromError()

### 5.2. フォールバックUI

**表示:**
- エラーメッセージ
- リロードボタン

---

## 6. 使用例

```typescript
<ErrorBoundary>
  <PetriNetViewer />
</ErrorBoundary>
```

---

## 7. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 1.0.0 | 2025-12-19 | 初版作成 | Development Team |
| 1.1.0 | 2026-02-19 | UI仕様書作成 | Cline |
