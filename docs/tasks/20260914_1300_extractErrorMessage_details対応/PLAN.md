# タスク計画書: extractErrorMessage details対応

## メタデータ
- **作成日時**: 2026-09-14 13:00
- **優先度**: 高
- **推定工数**: 30分

---

## 問題

バックエンド (`validationMiddleware.ts`) が返すバリデーションエラーのレスポンス構造：

```json
{
  "error": {
    "code": "E1003",
    "message": "バリデーションエラーが発生しました",
    "details": [
      { "field": "creatorName", "message": "creatorName must be 50 characters or less" }
    ]
  }
}
```

`extractErrorMessage` の現在の動作（優先順位 ①）：
```
① response.data.error.message → "バリデーションエラーが発生しました" を返す（details は無視）
```

→ 詳細（`details[].message`）が画面に表示されない。

---

## 修正方針

`extractErrorMessage` において、`details` 配列が存在する場合は
`details[].message` を結合して返すよう優先順位を変更する。

### 新しい優先順位

```
① details が存在し中身がある → details の各 message を "／" 区切りで結合して返す
② response.data.error.message が存在する → そのまま返す（従来の ①）
③ 通常の Error.message
④ エラーコードマッピング → defaultMessage
```

### 結合フォーマット

`details` が複数ある場合は `"／"` 区切りで1つのメッセージにまとめる。

```
例: "creatorName must be 50 characters or less／vendorId must be a string"
```

---

## 変更ファイル

1. `frontend/src/utils/errorUtils.ts`
   - `extractErrorMessage` 関数の ① 優先順位の前に details チェックを追加

---

## テスト計画

- [ ] 既存テスト (`errorUtils.test.ts`) が引き続き全パスする
- [ ] details あり・messageあり → details が優先される
- [ ] details なし・messageあり → message が返る（従来通り）
- [ ] details が空配列 → message にフォールバック
- [ ] details の各要素が string 型の場合も正しく結合される

## 承認記録
- **計画書提示日時**: 2026-09-14 13:00
