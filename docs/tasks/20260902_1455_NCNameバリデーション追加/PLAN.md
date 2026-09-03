# タスク計画書: NCNameバリデーション追加（Prefix・ローカル名）

## メタデータ
- **作成日時**: 2026-09-02 14:55
- **タスクID**: ncname-validation
- **優先度**: 高
- **推定工数**: 1時間

## 1. タスク概要

名前空間管理の「Prefix新規追加・編集」および「用語追加（ローカル名）」で、全角カナ等のNCName規約違反文字が登録できてしまうバグを修正する。
入力値がXML NCName仕様に反する場合に、フロントエンド・バックエンドの両方でエラーを表示する。

## 2. 目的と期待される成果

### 目的

XML NCName規約（`[a-zA-Z_][a-zA-Z0-9._-]*`）に反する文字（全角カナ、漢字、コロン等）を含む
Prefix やローカル名の登録を防止する。

### 期待される成果
- [ ] PrefixManagement: 新規保存・編集保存でNCName違反時にエラーメッセージ表示
- [ ] TermManagement: 新規保存でlocalNameのNCName違反時にエラーメッセージ表示
- [ ] バックエンドバリデーションにもNCNameチェック追加（二重防御）
- [ ] 日本語・英語両方のエラーメッセージを翻訳ファイルに追加

## 3. 実装ステップ

### Phase 1: ユーティリティ関数作成
- [ ] `frontend/src/utils/ncname.ts` を新規作成（`isValidNCName` 関数）

### Phase 2: フロントエンド・バリデーション追加
- [ ] `PrefixManagement.tsx`: `handleSave`（新規保存）に NCName チェック追加
- [ ] `PrefixManagement.tsx`: `saveEdit`（編集保存）に NCName チェック追加
- [ ] `TermManagement.tsx`: `handleSave`（新規保存）で localName の NCName チェック追加

### Phase 3: 翻訳ファイル更新
- [ ] `frontend/src/locales/ja.json`: `prefixManagement.prefixNcnameInvalid`・`termManagement.localNameNcnameInvalid` キー追加
- [ ] `frontend/src/locales/en.json`: 対応する英語キー追加

### Phase 4: バックエンドバリデーション補完
- [ ] `backend/src/middleware/namespaceValidation.ts`: prefix / newPrefix / localName に NCName 正規表現チェック追加

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/components/namespace/PrefixManagement.tsx` - handleSave・saveEdit に NCName チェック追加
2. `frontend/src/components/namespace/TermManagement.tsx` - handleSave に localName の NCName チェック追加
3. `frontend/src/locales/ja.json` - エラーメッセージキー2件追加
4. `frontend/src/locales/en.json` - エラーメッセージキー2件追加
5. `backend/src/middleware/namespaceValidation.ts` - NCName バリデーションルール追加

### 新規作成するファイル
1. `frontend/src/utils/ncname.ts` - NCName バリデーション関数
2. `docs/tasks/20260902_1455_NCNameバリデーション追加/PLAN.md` - 本計画書

### 影響を受ける機能
- 名前空間管理 > Prefix追加・編集
- 名前空間管理 > 用語追加（ローカル名）

### 影響を受けない機能
- CSV インポート（今回のスコープ外。別途対応を検討）
- 既存登録済みデータ（バリデーションは新規登録・編集時のみ）

## 5. 技術的詳細

### NCName 正規表現
```
/^[a-zA-Z_][a-zA-Z0-9._-]*$/
```
- 先頭: 英字（`a-z`, `A-Z`）またはアンダースコア `_`
- 2文字目以降: 英数字、`_`、`-`、`.`
- 不可文字: 全角カナ、漢字、コロン `:`、スペース等

### バリデーション実行タイミング
- 保存ボタン押下時（`handleSave` / `saveEdit`）に同期チェック
- 既存の「必須チェック」の直後に追加
- エラー時は `message.error()` で表示し処理を中断（`return`）

### 追加する翻訳キー

#### ja.json
```json
"prefixManagement": {
  "prefixNcnameInvalid": "Prefixは英字またはアンダースコアで始まり、英数字・アンダースコア・ハイフン・ピリオドのみ使用できます（xs:NCName形式）"
}
"termManagement": {
  "localNameNcnameInvalid": "ローカル名は英字またはアンダースコアで始まり、英数字・アンダースコア・ハイフン・ピリオドのみ使用できます（xs:NCName形式）"
}
```

#### en.json
```json
"prefixManagement": {
  "prefixNcnameInvalid": "Prefix must start with a letter or underscore, and contain only letters, digits, underscores, hyphens, or periods (xs:NCName format)"
}
"termManagement": {
  "localNameNcnameInvalid": "Local name must start with a letter or underscore, and contain only letters, digits, underscores, hyphens, or periods (xs:NCName format)"
}
```

### バックエンド追加ルール（namespaceValidation.ts）
```typescript
const NCNAME_REGEX = /^[a-zA-Z_][a-zA-Z0-9._-]*$/;

// validateCreateNamespace に追加
body('prefix').matches(NCNAME_REGEX).withMessage('prefix must be a valid NCName (xs:NCName format)')

// validateUpdateNamespace に追加
body('newPrefix').optional().matches(NCNAME_REGEX).withMessage('newPrefix must be a valid NCName (xs:NCName format)')

// validateCreateTerm に追加
body('localName').matches(NCNAME_REGEX).withMessage('localName must be a valid NCName (xs:NCName format)')
```

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存登録済みデータへの影響 | 低 | 低 | バリデーションは新規登録・編集時のみ適用 |
| CSV インポートへの未対応 | 中 | 中 | 今回のスコープ外とし、別途対応を検討 |
| バックエンド側の既存テストへの影響 | 低 | 低 | バリデーション強化のみで既存の正常系テストは影響なし |

## 7. テスト計画

### 手動テスト
- [ ] Prefix追加: 全角カナ（例: `テスト`）を入力 → 保存押下 → エラーメッセージ表示・保存中断確認
- [ ] Prefix追加: 有効な値（例: `_valid-Name.1`）を入力 → 正常保存確認
- [ ] Prefix編集: 全角カナに変更 → 保存押下 → エラーメッセージ表示・保存中断確認
- [ ] Prefix編集: 有効な値に変更 → 正常保存確認
- [ ] 用語追加: localName に全角カナ（例: `温度`）→ 保存押下 → エラーメッセージ表示・保存中断確認
- [ ] 用語追加: localName に有効な値（例: `temperature_1`）→ 正常保存確認
- [ ] 英語表示モードで上記エラーが英語で表示されること確認

## 8. 承認記録

- **計画書提示日時**: 2026-09-02 14:55
- **承認日時**: 2026-09-02 15:30
- **承認者コメント**: 実施済み

## 9. 実施記録

### 実施日時
- 開始: 2026-09-02 15:00
- 完了: 2026-09-02 15:30

### 計画からの変更点
なし

### 最終的な成果物
- [x] frontend/src/utils/ncname.ts 新規作成
- [x] PrefixManagement.tsx NCName バリデーション追加（handleSave・saveEdit）
- [x] TermManagement.tsx NCName バリデーション追加（handleSave の localName チェック）
- [x] ja.json エラーメッセージキー追加（prefixNcnameInvalid・localNameNcnameInvalid）
- [x] en.json エラーメッセージキー追加（prefixNcnameInvalid・localNameNcnameInvalid）
- [x] namespaceValidation.ts NCName ルール追加（validateCreateNamespace・validateUpdateNamespace・validateCreateTerm）
