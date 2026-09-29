# タスク計画書: プロジェクト名変更ダイアログ i18n 修正

## メタデータ

- **作成日時**: 2026-09-28 00:00
- **タスクID**: 20260928_0000
- **優先度**: 低
- **推定工数**: 0.1時間

---

## 1. タスク概要

実験管理者メニュー ＞ プロジェクト管理タブ ＞ プロジェクト名変更ダイアログを開いた際の「Rename」ボタンが英語表記のままになっているため、多言語対応（日本語化）を行う。

---

## 2. 目的と期待される成果

- [ ] 日本語環境でプロジェクト名変更ダイアログを開いた際、OKボタンが「変更」と表示されること
- [ ] 英語環境では引き続き「Rename」と表示されること（既存動作を維持）

---

## 3. 調査結果・原因

### 原因の特定

`RenameProjectModal.tsx` のOKボタンは `t('projectManagement.rename.okText')` で翻訳キーを参照しているが、`ja.json` の当該キーの値が `"Rename"` のまま英語で登録されていた。

```
frontend/src/locales/ja.json
  "projectManagement" > "rename" > "okText": "Rename"  ← ❌ 英語のまま
```

### 図解：修正前フロー

```
【修正前】
ユーザーが日本語環境でダイアログを開く
  ↓
RenameProjectModal.tsx
  okText={t('projectManagement.rename.okText')}
  ↓
ja.json の "projectManagement.rename.okText" を参照
  ↓
値: "Rename"（英語のまま）
  ↓
ダイアログのOKボタンに「Rename」と表示される ❌
```

### 図解：修正後フロー

```
【修正後】
ユーザーが日本語環境でダイアログを開く
  ↓
RenameProjectModal.tsx
  okText={t('projectManagement.rename.okText')}
  ↓
ja.json の "projectManagement.rename.okText" を参照
  ↓
値: "変更"（日本語）
  ↓
ダイアログのOKボタンに「変更」と表示される ✅
```

---

## 4. 修正ファイル一覧

| # | ファイルパス | 変更概要 |
|---|------------|---------|
| 1 | `frontend/src/locales/ja.json` | `projectManagement.rename.okText` の値を `"Rename"` → `"変更"` に修正 |

---

## 5. 修正内容の詳細

### `frontend/src/locales/ja.json`

**修正前:**
```json
"rename": {
  "title": "プロジェクト名変更",
  "okText": "Rename",
  "label": "新しいプロジェクト名",
  ...
}
```

**修正後:**
```json
"rename": {
  "title": "プロジェクト名変更",
  "okText": "変更",
  "label": "新しいプロジェクト名",
  ...
}
```

---

## 6. 影響範囲

- **影響コンポーネント**: `RenameProjectModal.tsx` のOKボタンのみ
- **バックエンド変更**: なし
- **新規ファイル**: なし
- **UIの変更**: なし（ボタンの文言のみ変更）
- **機能ロジックへの影響**: なし

---

## 7. リスク

| リスク | 対策 |
|--------|------|
| 英語環境への誤影響 | `en.json` は変更しないため影響なし |

---

## 8. テスト計画

- [ ] 日本語環境でプロジェクト名変更ダイアログを開き、OKボタンが「変更」と表示されること
- [ ] 英語環境でプロジェクト名変更ダイアログを開き、OKボタンが「Rename」と表示されること
- [ ] フロントエンド `npm run build` でビルドエラーが発生しないこと

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-28 00:00
- **承認日時**: 2026-09-28 （Act モード移行にて承認済み）
- **承認者コメント**: 承認済み

---

## 10. 実施記録

### 実施日時
開始: 2026-09-28  
完了: 2026-09-28

### 最終的な成果物
- [x] `frontend/src/locales/ja.json` の `okText` を「変更」に修正
