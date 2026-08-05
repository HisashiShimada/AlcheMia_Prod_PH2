# タスク計画書: 名前空間関連の多言語化対応

## メタデータ
- **作成日時**: 2026-08-05 15:21
- **タスクID**: namespace-i18n-dedup
- **優先度**: 高
- **推定工数**: 1時間

## タスク概要

`frontend/src/locales/ja.json` と `frontend/src/locales/en.json` に存在する名前空間関連の重複トップレベルキーを統合する。
JSONでは同一キーが複数存在する場合に後勝ちになるため、前の定義のサブキーが無効になっている。
これを解消し、各キーを1箇所に統合する。

## 目的と期待される成果
- [x] 重複キーを調査・特定
- [ ] ja.json の重複キーを統合（termManagement×3, namespaceMain×2, prefixManagement×2, createProject×2）
- [ ] en.json の重複キーを統合（termManagement×4, namespaceMain×3, prefixManagement×3, createProject×2）

## 重複キー一覧

### ja.json

| キー | 行番号（重複箇所） |
|------|------|
| `termManagement` | 3265行, 4265行, 4469行, 4569行 |
| `namespaceMain` | 4345行, 4421行→prefixManagement後、別途 |
| `prefixManagement` | 4421行, 4468行 |
| `createProject` | 3534行, 別途 |

### en.json

| キー | 重複数 |
|------|------|
| `termManagement` | 4回 |
| `namespaceMain` | 3回 |
| `prefixManagement` | 3回 |
| `createProject` | 2回 |

## 実装ステップ

### Phase 1: タスク計画書作成
- [x] PLAN.md 作成

### Phase 2: ja.json 重複キー統合
- [ ] `termManagement` を1箇所にまとめ、古い重複を削除
- [ ] `namespaceMain` を1箇所にまとめ、古い重複を削除
- [ ] `prefixManagement` を1箇所にまとめ、古い重複を削除（`colScope`キー追加）
- [ ] `createProject` を1箇所にまとめ、古い重複を削除

### Phase 3: en.json 重複キー統合
- [ ] 同様に各キーを1箇所にまとめる

## 変更ファイル
1. `frontend/src/locales/ja.json` - 重複キー統合
2. `frontend/src/locales/en.json` - 重複キー統合

## 承認記録
- **計画書提示日時**: 2026-08-05 15:21
- **承認日時**: 2026-08-05 15:27
