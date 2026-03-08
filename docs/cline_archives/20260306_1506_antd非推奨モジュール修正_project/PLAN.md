# タスク計画書: antd非推奨モジュール修正 (project配下)

## メタデータ
- **作成日時**: 2026-03-06 15:15（更新）
- **タスクID**: antd-deprecation-fix-project
- **優先度**: 中
- **推定工数**: 15分

## タスク概要

`frontend/src/components/project/` 配下のソースコードで使用されているAnt Design v6.1.0の非推奨APIを修正する。

## 調査結果と修正対象（修正版）

### ⚠️ 注意事項（調査による修正）

antd v6.1.0の型定義を直接確認した結果：
- **`Space direction`** は **v6.1.0で非推奨**（`@deprecated please use 'orientation' instead`）→ `orientation` が正しい
- **`Space orientation`** が正しいプロパティ（以前の修正は正しかった）
- **`message` 直接import** は v6.1.0では`@deprecated`指定なし（非推奨ではない）

### 確認された非推奨プロパティ

#### `destroyOnClose` → `destroyOnHidden` に変更

Modal/Drawer で `@deprecated Please use destroyOnHidden instead` が明示されている。

| ファイル | 行数 | 変更箇所 |
|--------|------|---------|
| WorkerScreenOverlay.tsx | 70 | `destroyOnClose` → `destroyOnHidden` |

## 実装ステップ

- [x] WorkerScreenOverlay.tsx: `destroyOnClose` → `destroyOnHidden` に変更（1箇所）

## 承認記録
- **計画書提示日時**: 2026-03-06 15:15
- **承認日時**: 2026-03-06 15:17
- **完了日時**: 2026-03-06 15:17
