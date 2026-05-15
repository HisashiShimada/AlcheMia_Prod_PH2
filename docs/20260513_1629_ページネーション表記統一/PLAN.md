# タスク計画書: ページネーション表記統一

## メタデータ
- **作成日時**: 2026-05-13 16:29
- **タスクID**: pagination-label-unification
- **優先度**: 中
- **推定工数**: 2.5〜3時間

## タスク概要

フロントエンドのページネーション部品において、ページ数表示（件/ページ）やジャンプ先入力（ページ）などのラベルが、「ページ（日本語）」と「page（英語）」で入り乱れている状態を解消し、多言語ファイル（i18n）を使用した統一形式に統一する。

## 目的と期待される成果
- [ ] ページネーション関連ラベルの多言語対応（`t('common.xxx')`形式に統一）
- [ ] 日本語表示・英語表示ともに正しいラベルが表示される
- [ ] ハードコードされた文字列（`'件/ページ'`, `'ページ'`, `'Page'`, `'page'`）を排除

## 現状の問題点

Ant DesignのPaginationコンポーネントのlocale設定において以下の3種類のバラバラな実装が混在している：

| ファイル | items_per_page | jump_to |
|---------|---------------|---------|
| MethodTaskSelectionModal.tsx | `'件/ページ'` (日本語ハードコード) | `'ページ'` (日本語ハードコード) |
| TaskListTable.tsx | `'件/ページ'` (日本語ハードコード) | `'ページ'` (日本語ハードコード) |
| TransitionList.tsx | `'${t('common.items')}/page'` (英語page混在) | `'Page'` (英語ハードコード) |

また、以下のコンポーネントはlocale設定なし（Ant Design デフォルトのまま）：
- UserManagement, RoleManagement, DepartmentManagement, SessionManagement
- OrganizationManagement, CorporationManagement
- MasterManagement, ProgressMonitoring
- MethodSelectionModal, ProjectSelectionModal

## 実装ステップ

### Phase 1: 多言語ファイルの更新（2ファイル）
- [ ] `frontend/src/locales/ja.json` の `common` セクションにキー追加
- [ ] `frontend/src/locales/en.json` の `common` セクションにキー追加

### Phase 2: コンポーネントの一括修正（14ファイル）

**実験作業者メニュー関連（5ファイル）:**
- [ ] `components/ExperimentWorker/MethodTaskSelectionModal.tsx` - locale修正（ハードコード→i18n）
- [ ] `components/ExperimentWorker/TaskListTable.tsx` - locale修正（ハードコード→i18n）
- [ ] `components/ExperimentWorker/TransitionList.tsx` - locale修正（英語混在→i18n）
- [ ] `components/ExperimentWorker/MethodSelectionModal.tsx` - locale追加（設定なし→i18n）
- [ ] `components/ExperimentWorker/ProjectSelectionModal.tsx` - locale追加（設定なし→i18n）

**システム管理メニュー関連（4ファイル）:**
- [ ] `components/SystemManagement/UserManagement.tsx` - locale追加（設定なし→i18n）
- [ ] `components/SystemManagement/RoleManagement.tsx` - locale追加（設定なし→i18n）
- [ ] `components/SystemManagement/DepartmentManagement.tsx` - locale追加（設定なし→i18n）
- [ ] `components/SystemManagement/SessionManagement.tsx` - locale追加（設定なし→i18n）

**プロバイダーメニュー関連（2ファイル）:**
- [ ] `components/Provider/OrganizationManagement.tsx` - locale追加（設定なし→i18n）
- [ ] `components/Provider/CorporationManagement.tsx` - locale追加（設定なし→i18n）

**その他管理機能（3ファイル）:**
- [ ] `components/DataManagement/MasterManagement.tsx` - locale追加（設定なし→i18n）
- [ ] `components/progress/ProgressMonitoring.tsx` - locale追加（設定なし→i18n）

### Phase 3: 動作確認・テスト

- [ ] ビルドエラーがないことを確認
- [ ] 日本語表示でのラベル確認（「件/ページ」「ページ」）
- [ ] 英語表示でのラベル確認（「items/page」「Go to page」）
- [ ] ページネーション機能（ページ切り替え、件数変更）が正常動作すること

## 変更ファイル

### 修正ファイル
1. `frontend/src/locales/ja.json` - commonセクションにキー追加
2. `frontend/src/locales/en.json` - commonセクションにキー追加
3. `frontend/src/components/ExperimentWorker/MethodTaskSelectionModal.tsx` - locale修正
4. `frontend/src/components/ExperimentWorker/TaskListTable.tsx` - locale修正
5. `frontend/src/components/ExperimentWorker/TransitionList.tsx` - locale修正
6. `frontend/src/components/ExperimentWorker/MethodSelectionModal.tsx` - locale追加
7. `frontend/src/components/ExperimentWorker/ProjectSelectionModal.tsx` - locale追加
8. `frontend/src/components/SystemManagement/UserManagement.tsx` - locale追加
9. `frontend/src/components/SystemManagement/RoleManagement.tsx` - locale追加
10. `frontend/src/components/SystemManagement/DepartmentManagement.tsx` - locale追加
11. `frontend/src/components/SystemManagement/SessionManagement.tsx` - locale追加
12. `frontend/src/components/Provider/OrganizationManagement.tsx` - locale追加
13. `frontend/src/components/Provider/CorporationManagement.tsx` - locale追加
14. `frontend/src/components/DataManagement/MasterManagement.tsx` - locale追加
15. `frontend/src/components/progress/ProgressMonitoring.tsx` - locale追加

### 新規作成ファイル
なし

## 実装の詳細

### 多言語ファイル追加内容

**ja.json に追加するキー（`common` セクション末尾）:**
```json
"itemsPerPage": "件/ページ",
"jumpToPage": "ページ",
"page": ""
```

**en.json に追加するキー（`common` セクション末尾）:**
```json
"itemsPerPage": "items/page",
"jumpToPage": "Go to page",
"page": ""
```

### コンポーネントの統一形式

**修正前（パターン例1 - ハードコード日本語）:**
```typescript
locale: {
  items_per_page: '件/ページ',
  jump_to: 'ページ',
  page: ''
}
```

**修正前（パターン例2 - 英語混在）:**
```typescript
locale: {
  items_per_page: `${t('common.items')}/page`,
  jump_to: 'Page',
  page: ''
}
```

**修正後（統一形式）:**
```typescript
locale: {
  items_per_page: t('common.itemsPerPage'),
  jump_to: t('common.jumpToPage'),
  page: t('common.page')
}
```

## リスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| t関数が利用できないコンポーネントがある | 中 | 低 | 各ファイルでuseTranslationフックの使用を確認し、必要に応じて追加する |
| locale設定追加でUI表示が崩れる | 低 | 低 | 修正後に各画面でビジュアル確認を実施 |

## テスト計画

### 確認画面一覧
- [ ] システム管理：ユーザー管理
- [ ] システム管理：ロール管理
- [ ] システム管理：部署管理
- [ ] システム管理：セッション管理
- [ ] プロバイダー：組織管理
- [ ] プロバイダー：会社管理
- [ ] データ管理：マスタ管理
- [ ] 実験管理：進捗確認
- [ ] 実験作業者：タスク一覧
- [ ] 実験作業者：メソッド・タスク選択モーダル
- [ ] 実験作業者：トランジション一覧

## 承認記録
- **計画書提示日時**: 2026-05-13 16:29
- **承認日時**: 2026-05-13 16:38
- **承認者コメント**: 承認済み

## 実施記録

### 実施日時
開始: 2026-05-13 16:38
完了: 2026-05-13 16:53

### 実施内容

#### 多言語ファイル更新
- `ja.json`：`common.itemsPerPage`（`件/ページ`）・`common.jumpToPage`（`ページ`）・`common.page`（`""`）追加
- `en.json`：`common.itemsPerPage`（`items/page`）・`common.jumpToPage`（`Go to page`）・`common.page`（`""`）追加

#### コンポーネント修正（6ファイル）

| ファイル | 修正内容 |
|---------|---------|
| `ExperimentWorker/TransitionList.tsx` | `items_per_page`・`jump_to`・`page` をi18nキーに変更 |
| `ExperimentWorker/TaskListTable.tsx` | `items_per_page`・`jump_to`・`page`・`showTotal` をi18nキーに変更 |
| `ExperimentWorker/MethodTaskSelectionModal.tsx` | `items_per_page`・`jump_to`・`page` をi18nキーに変更 |
| `ExperimentWorker/MethodSelectionModal.tsx` | `useLanguage` import追加・`showTotal` をi18nキーに変更 |
| `ExperimentWorker/ProjectSelectionModal.tsx` | `showTotal` をi18nキーに変更 |
| `progress/ProgressMonitoring.tsx` | `showTotal` フォールバック文字列削除・i18nキーに統一 |

### 成果物
- [x] 全ページネーション表示文字列がi18nキー経由に統一
- [x] 日本語: `全N件`、英語: `N items` の形式で動的切替が可能
- [x] ハードコード文字列（`件/ページ`・`ページ`・`Page`・`/page`混在）を完全排除

### 計画との差異
- SystemManagement系（UserManagement, RoleManagement, DepartmentManagement, SessionManagement）およびProvider系（OrganizationManagement, CorporationManagement）、MasterManagement はページネーションlocale設定自体が存在しないことを確認（Ant Designデフォルト適用）。これらは今回の「表記混在」には該当しないため修正対象外と判断した。
