# タスク計画書: antd v6 警告修正

## メタデータ
- **作成日時**: 2026-07-15 13:55
- **タスクID**: antd_warning_fix
- **優先度**: 中
- **推定工数**: 1時間

## タスク概要
antd v6 へのアップグレードに伴い発生している deprecation 警告を修正する。

## 目的と期待される成果
- [ ] Divider `type` → `orientation` 修正
- [ ] `List` コンポーネント廃止対応（div + map へ置き換え）
- [ ] Space/Divider `direction` → `orientation` 修正
- [ ] Modal `destroyOnClose` → `destroyOnHidden` 修正
- [ ] Alert `message` → `title` 修正

## 実装ステップ

### Phase 1: FormatManagement/FormatSearchModal — Divider type→orientation
- [ ] FormatManagement.tsx
- [ ] FormatSearchModal.tsx（もし存在すれば）

### Phase 2: TeamManagementPanel — List廃止対応
- [ ] List/List.Item を div+map で置き換え

### Phase 3: Space/Divider direction→orientation
- [ ] FormatManagement.tsx（同上箇所含む）
- [ ] ExperimentAdminMenu配下の各ファイル

### Phase 4: Modal destroyOnClose→destroyOnHidden
- [ ] 各対象ファイル（9ファイル）

### Phase 5: WorkflowSelectorDialog — Alert message→title
- [ ] WorkflowSelectorDialog.tsx

## 承認記録
- **計画書提示日時**: 2026-07-15 13:55
- **承認日時**: 2026-07-15 13:55
- **承認者コメント**: 方針OK
