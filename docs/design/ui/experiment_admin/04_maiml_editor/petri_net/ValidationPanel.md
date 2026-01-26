# ValidationPanel UI仕様書

## 1. 概要

### 1.1. コンポーネントの目的

MAIMLファイルのバリデーション結果を表示するモーダルパネル。エラー・警告の詳細表示、自動補正機能、再検証機能を提供します。

### 1.2. 使用場面

- EditorToolbarの「バリデーション」ボタンをクリックした場合
- PetriNetEditorで保存前のバリデーション実行時
- 自動バリデーションが有効な場合の定期実行時

### 1.3. アクセス権限

- **対象ロール**: Experiment Admin（実験管理者）
- **必須認証**: JWT認証必須

---

## 2. 画面構成

### 2.1. レイアウト構造

```
┌─────────────────────────────────────────────────────┐
│ バリデーション結果                          [×]      │
├─────────────────────────────────────────────────────┤
│ ✅ バリデーション成功                                │
│ スキーマバージョン: 1.0.0                            │
│                                                     │
│ エラー: 2件  警告: 3件                               │
│                                                     │
│ 進捗バー: [████████░░] 80%                          │
│                                                     │
│ ▼ エラー (2件)                                      │
│   ☑ [エラー1] 必須属性が不足しています              │
│       XPath: /MAIML/Method[1]/Place[2]             │
│       補正候補あり                                   │
│   ☑ [エラー2] 無効な値です                          │
│                                                     │
│ ▼ 警告 (3件)                                        │
│   ☐ [警告1] 推奨される属性がありません              │
│   ☐ [警告2] 命名規則に従っていません                │
│   ☐ [警告3] テンプレートが未割り当てです            │
│                                                     │
│ [選択したエラーを自動補正] [再検証] [閉じる]        │
└─────────────────────────────────────────────────────┘
```

### 2.2. 主要UI要素

#### 2.2.1. ヘッダー

| 要素 | 説明 |
|------|------|
| タイトル | 「バリデーション結果」 |
| 閉じるボタン | CloseOutlined、onClose()実行 |

#### 2.2.2. バリデーション結果サマリー

**成功時:**
- Alert type="success"
- CheckCircleOutlined アイコン
- 「バリデーション成功」メッセージ

**失敗時:**
- Alert type="error"
- CloseCircleOutlined アイコン
- 「バリデーション失敗」メッセージ

**情報表示:**
- スキーマバージョン
- エラー件数
- 警告件数

#### 2.2.3. 進捗バー

**表示条件:** isValidating === true または isCorrecting === true

| 要素 | 設定 |
|------|------|
| Progress | percent, status |
| ラベル | 「バリデーション中...」/ 「補正中...」 |

#### 2.2.4. エラー一覧

**Collapse Panel:**
- タイトル: 「エラー ({count}件)」
- アイコン: CloseCircleOutlined（赤）

**各エラー項目:**
- Checkbox: 自動補正対象選択
- エラーメッセージ
- XPath（存在する場合）
- 行番号（存在する場合）
- 補正候補（存在する場合）

#### 2.2.5. 警告一覧

**Collapse Panel:**
- タイトル: 「警告 ({count}件)」
- アイコン: WarningOutlined（オレンジ）

**各警告項目:**
- Checkbox: 自動補正対象選択
- 警告メッセージ
- XPath（存在する場合）

#### 2.2.6. フッターボタン

| ボタン | アイコン | 機能 |
|-------|---------|------|
| 選択したエラーを自動補正 | ToolOutlined | 自動補正実行 |
| 再検証 | ReloadOutlined | 再検証実行 |
| 閉じる | - | モーダルを閉じる |

**スタイル:**
- 自動補正ボタン: type="primary", disabled（選択なしの場合）
- 再検証ボタン: type="default"
- 閉じるボタン: type="default"

---

## 3. 機能仕様

### 3.1. 主要機能の詳細

#### 3.1.1. バリデーション結果の表示

**処理フロー:**
1. validationResultを受け取る
2. isValidをチェック
3. errors/warningsを分類
4. Collapseでエラー・警告を表示

**表示内容:**
- isValid: true/false
- schemaVersion: スキーマバージョン
- errors[]: エラーリスト
- warnings[]: 警告リスト
- corrections[]: 補正候補リスト

#### 3.1.2. エラー・警告の選択

**処理フロー:**
1. Checkboxをクリック
2. selectedErrorsステートを更新
3. 選択されたエラーのインデックスを保存

**全選択/全解除:**
- Switchで一括選択・解除
- 「すべて選択」/ 「すべて解除」

#### 3.1.3. 自動補正

**処理フロー:**
1. 「選択したエラーを自動補正」ボタンをクリック
2. selectedErrorsが空でないことを確認
3. onAutoCorrect(selectedErrors)を実行
4. isCorrecting: true
5. Progress表示
6. 補正完了後、再検証を自動実行

**補正可能な条件:**
- error.suggestionが存在する
- 自動補正アルゴリズムが対応している

#### 3.1.4. 再検証

**処理フロー:**
1. 「再検証」ボタンをクリック
2. onRevalidate()を実行
3. isValidating: true
4. Progress表示
5. 新しいvalidationResultを受け取る
6. 表示を更新

#### 3.1.5. ローディング状態

**バリデーション中:**
- isValidating: true
- Progress表示
- ボタン無効化

**補正中:**
- isCorrecting: true
- Progress表示
- ボタン無効化

### 3.2. ボタン・操作の動作

| 操作 | 動作 | 状態変更 |
|------|------|---------|
| Checkbox選択 | エラー選択 | selectedErrors更新 |
| 全選択Switch | 全選択/解除 | selectedErrors更新 |
| 自動補正ボタン | 補正実行 | onAutoCorrect() |
| 再検証ボタン | 再検証実行 | onRevalidate() |
| 閉じるボタン | モーダルを閉じる | onClose() |

### 3.3. バリデーションルール

- MAIMLスキーマに準拠
- 必須属性のチェック
- データ型のチェック
- 参照整合性のチェック
- 命名規則のチェック

---

## 4. データ仕様

### 4.1. Props型定義

```typescript
interface ValidationPanelProps {
  open?: boolean;                                    // モーダル表示フラグ
  validationResult: ValidationResult | null;         // バリデーション結果
  onClose?: () => void;                              // 閉じる
  onAutoCorrect?: (selectedErrors: number[]) => void;  // 自動補正
  onRevalidate?: () => void;                         // 再検証
  isValidating?: boolean;                            // バリデーション中
  isCorrecting?: boolean;                            // 補正中
}
```

### 4.2. ValidationResult型定義

```typescript
interface ValidationResult {
  isValid: boolean;                  // バリデーション成功/失敗
  schemaVersion?: string;            // スキーマバージョン
  errors?: ValidationError[];        // エラーリスト
  warnings?: ValidationError[];      // 警告リスト
  corrections?: any[];               // 補正候補リスト
}
```

### 4.3. ValidationError型定義

```typescript
interface ValidationError {
  severity?: string;     // エラー重要度（error, warning）
  message: string;       // エラーメッセージ
  xpath?: string;        // XPath
  element?: any;         // エラー要素
  line?: number;         // 行番号
  suggestion?: any;      // 補正候補
}
```

---

## 5. UI/UXポリシー準拠

### 5.1. Ant Designコンポーネント使用

| コンポーネント | 使用箇所 | props |
|--------------|---------|-------|
| Modal | 外側のコンテナ | open, onCancel, title, width, footer |
| Alert | バリデーション結果サマリー | type, message, icon, showIcon |
| Collapse | エラー・警告グループ | defaultActiveKey |
| Panel | エラー・警告パネル | header, key |
| Progress | 進捗表示 | percent, status |
| List | エラー・警告リスト | dataSource, renderItem |
| Checkbox | エラー選択 | checked, onChange |
| Switch | 全選択 | checked, onChange |
| Button | 各種ボタン | type, icon, onClick, disabled |
| Typography | テキスト表示 | Title, Text |
| Tag | タグ表示 | color |
| Spin | ローディング | - |

### 5.2. @ant-design/icons使用

- CheckCircleOutlined: 成功アイコン
- CloseCircleOutlined: エラーアイコン
- WarningOutlined: 警告アイコン
- ToolOutlined: 自動補正アイコン
- ReloadOutlined: 再検証アイコン
- CloseOutlined: 閉じるアイコン

---

## 6. 実装ファイル

### 6.1. ソースファイルパス

```
frontend/src/components/editor/ValidationPanel.tsx
```

### 6.2. 関連コンポーネント

| コンポーネント | パス | 役割 |
|--------------|------|------|
| PetriNetEditor | ./PetriNetEditor | 親コンポーネント |

### 6.3. 依存ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| antd | 6.x | UIコンポーネント |
| @ant-design/icons | 5.x | アイコン |

---

## 7. 既知の課題・TODO

- [ ] エラー箇所へのジャンプ機能
- [ ] エラー詳細の展開・折りたたみ
- [ ] エラーログのエクスポート機能
- [ ] カスタムバリデーションルールの追加

---

## 8. 変更履歴

| バージョン | 日付 | 変更内容 | 担当者 |
|-----------|------|----------|--------|
| 2.0.0 | 2025-12-23 | Ant Design v6対応 | Development Team |
| 1.0.0 | 2026-01-21 | 初版作成 | Cline |

---

## 9. 使用例

```typescript
<ValidationPanel
  open={validationPanelOpen}
  validationResult={validationResult}
  onClose={() => setValidationPanelOpen(false)}
  onAutoCorrect={handleAutoCorrect}
  onRevalidate={handleRevalidate}
  isValidating={isValidating}
  isCorrecting={isCorrecting}
/>
```

---

## 10. パフォーマンス最適化

### 10.1. 大量エラー時の対応

- エラー件数が100件を超える場合、ページネーション表示
- 仮想スクロール（react-window）の導入検討

---

## 11. アクセシビリティ

### 11.1. キーボード操作

- Escape: モーダルを閉じる
- Space: Checkbox切り替え

### 11.2. スクリーンリーダー対応

- エラー件数の読み上げ
- 補正結果の通知
