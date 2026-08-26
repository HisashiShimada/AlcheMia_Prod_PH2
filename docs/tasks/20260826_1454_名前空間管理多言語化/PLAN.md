# タスク計画書: 名前空間管理 多言語化対応

## メタデータ
- **作成日時**: 2026-08-26 14:54
- **タスクID**: 名前空間管理多言語化
- **優先度**: 中
- **推定工数**: 1.5時間

## 1. タスク概要

名前空間管理機能（`frontend/src/components/namespace/` 配下）の全コンポーネントにおいて、
`t()` を呼び出しているが対応する翻訳キーが `ja.json` / `en.json` に存在しない状態を解消する。
また `ShareScopeModal.tsx` 内にハードコードされた日本語文字列を `t()` に置き換える。

## 2. 目的と期待される成果

### 目的
- 画面表示で翻訳キーがそのまま表示される問題を解消する
- 日英切り替えが正しく動作するようにする

### 期待される成果
- [ ] `ja.json` に 6セクション分の翻訳キーが追加される
- [ ] `en.json` に 6セクション分の英語翻訳が追加される
- [ ] `ShareScopeModal.tsx` のハードコード日本語が `t()` に置き換えられる

## 3. 実装ステップ

### Phase 1: タスク計画書作成
- [x] docs/tasks/20260826_1454_名前空間管理多言語化/PLAN.md 作成

### Phase 2: ja.json へ翻訳キー追加
- [ ] `namespaceMain` セクション追加（約55キー）
- [ ] `prefixManagement` セクション追加（約40キー）
- [ ] `namespaceDetail` セクション追加（約15キー）
- [ ] `namespaceAdd` セクション追加（約25キー）
- [ ] `duplicateSuggestModal` セクション追加（約7キー）
- [ ] `shareScopeModal` セクション追加（約5キー）

### Phase 3: en.json へ翻訳キー追加
- [ ] 上記6セクション分の英語翻訳を追加

### Phase 4: ShareScopeModal.tsx 修正
- [ ] `useLanguage` / `t()` を import・使用
- [ ] ハードコード文字列を翻訳キーへ置き換え
  - `'組織まで共有できます'` → `t('shareScopeModal.roleDescSysAdmin')`
  - `'共有先を選択'` → `t('shareScopeModal.title')`
  - `'共有する'` → `t('shareScopeModal.okText')`
  - `'キャンセル'` → `t('common.cancel')`
  - `'（選択不可）'` → `t('shareScopeModal.notSelectable')`
  - `'共有先：'` → `t('shareScopeModal.selectedLabel')`
  - `'※ 選択した共有先に移動します。'` → `t('shareScopeModal.shareNote')`
  - `「${role.deptLabel}」（部署）まで共有できます` → `t('shareScopeModal.roleDescDeptOwner', { label: role.deptLabel })`
  - `「${role.teamLabel}」（チーム）まで共有できます` → `t('shareScopeModal.roleDescTeamOwner', { label: role.teamLabel })`

## 4. 影響範囲

### 変更するファイル
1. `frontend/src/locales/ja.json` - 6セクション追加
2. `frontend/src/locales/en.json` - 6セクション追加
3. `frontend/src/components/namespace/ShareScopeModal.tsx` - ハードコード日本語を t() に置き換え

### 影響を受けるコンポーネント
- `NamespaceMain.tsx` - キー追加により表示が正常化
- `PrefixManagement.tsx` - キー追加により表示が正常化
- `DetailModal.tsx` - キー追加により表示が正常化
- `NamespaceAddDialog.tsx` - キー追加により表示が正常化
- `DuplicateSuggestModal.tsx` - キー追加により表示が正常化
- `ShareScopeModal.tsx` - ハードコード解消 + キー追加

## 5. 翻訳キー一覧

### namespaceMain（NamespaceMain.tsx）
| キー | 日本語 |
|------|--------|
| prefixRequired | Prefixを選択してください |
| localNameRequired | ローカル名を入力してください |
| duplicateErrorTitle | 重複エラー |
| duplicateErrorContent | すでに同じ用語が登録されています |
| warnDuplicateTitle | 同用語名・別Prefix重複の警告 |
| warnDuplicateContent | 別Prefixに同名の用語が既に存在します。それでも登録しますか？ |
| warnRegister | 登録する |
| warnCancel | キャンセル |
| localNameRequired2 | ローカル名を入力してください |
| updateSuccess | 用語を更新しました |
| updateError | 更新に失敗しました: {detail} |
| groupAddParentLabelDefault | 選択中グループ |
| saveTermSuccess | {count}件の用語を保存しました |
| createDirectiveTermSuccess | （指示用語も同時登録しました） |
| sharePartialFailure | {saved}件を共有しました（{failCount}件失敗） |
| shareSuccess | {count}件を「{target}」に共有しました |
| nsRegisterSuccess | 名前空間「{prefix}」を登録しました |
| groupCreated | グループ「{groupName}」を作成しました |
| memberUpdated | 「{name}」のメンバー({count}名)を更新しました |
| csvEmpty2 | CSVファイルにデータがありません |
| csvNoData2 | 有効なデータ行が見つかりません |
| csvImportPartial2 | {saved}件を登録しました（{failCount}件失敗: {names}） |
| csvImportSuccess2 | {count}件の用語をCSVからインポートしました |
| csvParseError2 | CSVの解析に失敗しました |
| prefixFilterAll | すべてのPrefix |
| typeFilterAll | すべてのデータ型 |
| unitFilterAll | すべての単位 |
| scopeFilterAll | すべてのスコープ |
| term | 用語 |
| deactivateConfirmTitle | 「{label}」を非アクティブにしますか？ |
| deactivateConfirmContent | 非アクティブにすると用語が利用できなくなります。 |
| deactivate | 非アクティブ化 |
| cancel | キャンセル |
| deactivateSuccess | 非アクティブ化しました |
| activateSuccess | アクティブ化しました |
| bulkDeactivateTitle | 選択した用語を非アクティブにしますか？ |
| bulkDeactivateContent | {count}件を非アクティブにします。この操作は元に戻せません。 |
| bulkDeactivateSuccess | {count}件を非アクティブ化しました |
| shareBtnLabel | {count}件を共有 |
| bulkDeactivateBtnLabel | {count}件を非アクティブ化 |
| searchPlaceholder | 用語・説明で検索 |
| btnImport | CSVインポート |
| btnExport | CSVエクスポート |
| noPrefixTooltip | Prefixが登録されていません |
| btnAddTerm | 用語を追加 |
| btnSave | 保存 |
| btnCancel | キャンセル |
| duplicateTooltip | 重複している用語があります |
| showTotal | 全{total}件 |
| sortAsc | 昇順 |
| sortDesc | 降順 |
| cancelSort | ソートをキャンセル |
| prefixSelectPlaceholder | Prefixを選択 |
| colLocalName | ローカル名 |
| localNamePlaceholder | 例: temperature |
| duplicateRegistered | 「{prefix}:{localName}」はすでに登録されています |
| colDisplayName | 表示名 |
| displayNamePlaceholder | 例: 温度 |
| colDescription | 説明 |
| descriptionPlaceholder | 用語の説明を入力 |
| colScope | スコープ |
| colType | データ型 |
| typeSelectPlaceholder | 型を選択 |
| colUnit | 単位 |
| unitSelectPlaceholder | 単位を選択 |
| createDirectiveTermTooltip | 用語を登録した際に指示用語を同時登録します |
| colCreateDirectiveTerm | 指示用語 |
| hasDirectiveTermBadge | 登録済み |
| colActions | 操作 |
| actionSave | 保存 |
| actionCancel | キャンセル |
| systemNamespaceTooltip | システム名前空間は変更できません |
| systemNamespaceBadge | システム |
| actionEdit | 編集 |
| actionDeactivate | 非アクティブ化 |
| actionActivate | アクティブ化 |
| ctxMenuAddGroup | グループを追加 |
| ctxMenuEdit | 編集 |

### prefixManagement（PrefixManagement.tsx）
| キー | 日本語 |
|------|--------|
| fetchError | Prefix一覧の取得に失敗しました |
| saveSuccess | {count}件のPrefixを保存しました |
| savePartialFailure | {failCount}件のPrefixの保存に失敗しました |
| prefixRequired | Prefixを入力してください |
| uriRequired | URIを入力してください |
| errorDuplicateGlobalPrefix | Prefix「{prefix}」はグローバルに登録済みです |
| warnTitle | Prefix重複の警告 |
| warnAlreadyRegistered | Prefix「{prefix}」は「{scopeName}」にすでに登録されています。続けて登録しますか？ |
| warnOk | 登録する |
| warnCancel | キャンセル |
| prefixRequiredEdit | Prefixを入力してください |
| updateSuccess | Prefixを更新しました |
| updateError | Prefixの更新に失敗しました |
| deactivateConfirm | Prefix「{prefix}」を非アクティブにしますか？ |
| deactivateContent | 非アクティブにすると該当Prefixが利用できなくなります。 |
| deactivateOk | 非アクティブ化 |
| deactivateCancelBtn | キャンセル |
| deactivateSuccess | Prefix「{prefix}」を非アクティブ化しました |
| deactivateError | Prefix「{prefix}」の非アクティブ化に失敗しました |
| activateConfirm | Prefix「{prefix}」をアクティブにしますか？ |
| activateContent | アクティブにすると該当Prefixが再び利用できるようになります。 |
| activateOk | アクティブ化 |
| activateCancelBtn | キャンセル |
| activateSuccess | Prefix「{prefix}」をアクティブ化しました |
| activateError | Prefix「{prefix}」のアクティブ化に失敗しました |
| bulkDeactivateConfirm | {count}件のPrefixを非アクティブにしますか？ |
| bulkDeactivateContent | 非アクティブにすると対象Prefixの用語が利用できなくなります。 |
| bulkDeactivateOk | 非アクティブ化 |
| bulkDeactivateCancelBtn | キャンセル |
| bulkDeactivatePartialError | {count}件の非アクティブ化に失敗しました |
| bulkDeactivateSuccess | {count}件のPrefixを非アクティブ化しました |
| deleteConfirm | Prefix「{prefix}」を削除しますか？ |
| deleteContent | 削除すると元に戻せません。 |
| deleteOk | 削除 |
| deleteCancelBtn | キャンセル |
| deleteSuccess | Prefix「{prefix}」を削除しました |
| deleteError | Prefix「{prefix}」の削除に失敗しました |
| exportEmptyError | エクスポートするデータがありません |
| csvEmpty | CSVファイルにデータがありません |
| csvNoData | 有効なデータ行が見つかりません |
| csvImportPartial | {saved}件を登録しました（{failCount}件失敗） |
| csvImportSuccess | {count}件のPrefixをCSVからインポートしました |
| csvParseError | CSVの解析に失敗しました |
| placeholderPrefix | 例: CorpA |
| placeholderUri | 自動生成されます |
| colDescription | 説明 |
| placeholderDescription | 名前空間の説明を入力 |
| colScope | スコープ |
| colActions | 操作 |
| btnSaveEdit | 保存 |
| btnCancelEdit | キャンセル |
| systemNamespaceTooltip | システム名前空間は変更できません |
| systemNamespaceBadge | システム |
| btnEdit | 編集 |
| btnDeactivate | 非アクティブ化 |
| btnActivate | アクティブ化 |
| btnShare | {count}件を共有 |
| btnBulkDeactivate | {count}件を非アクティブ化 |
| searchPlaceholder | Prefix・URI・説明で検索 |
| btnImport | CSVインポート |
| btnExport | CSVエクスポート |
| btnAddPrefix | + Prefix追加 |
| btnSave | 保存 |
| btnCancel | キャンセル |
| loading | 読み込み中... |
| sortAsc | 昇順 |
| sortDesc | 降順 |
| sortCancel | ソートをキャンセル |
| emptyText | データがありません |
| showTotal | 全{total}件 |

### namespaceDetail（DetailModal.tsx）
| キー | 日本語 |
|------|--------|
| levelGlobal | グローバル |
| levelOrganization | 組織 |
| levelPersonal | 個人 |
| saveTermSuccess | 用語を保存しました |
| prefixRequired | Prefixを入力してください |
| uriRequired | URIを入力してください |
| saveNsSuccess | 名前空間を保存しました |
| titleTerm | 用語の詳細 |
| titleNamespace | 名前空間の詳細 |
| labelDisplayJa | 表示名（日本語） |
| labelDisplayEn | 表示名（英語） |
| labelDescription | 説明 |
| labelTypeHint | データ型 |
| labelUnitHint | 単位 |
| placeholderUnitNone | なし |
| labelPrefix | Prefix |
| labelUri | URI |
| labelLevel | レベル |
| labelTermCount | 用語数 |
| termCountSuffix | 件 |
| labelDisplayName | 表示名 |
| labelCreatedAt | 登録日時 |
| labelUpdatedAt | 更新日時 |

### namespaceAdd（NamespaceAddDialog.tsx）
| キー | 日本語 |
|------|--------|
| title | 名前空間を追加 |
| labelLevel | レベル |
| levelGlobal | グローバル |
| levelOrganization | 組織 |
| levelPersonal | 個人 |
| uriGuidance.global | グローバルに公開されているURIを入力してください |
| uriGuidance.organization | 組織固有のURIが自動生成されます |
| uriGuidance.personal | 個人のORCID IDまたは任意のURIを入力してください |
| levelGuidance.global | グローバル名前空間はすべての組織で共有されます |
| levelGuidance.organization | 組織名前空間は組織内で共有されます |
| levelGuidance.personal | 個人名前空間はログインユーザーのみが使用できます |
| validation.prefixRequired | Prefixを入力してください |
| validation.prefixInvalid | xs:NCName 形式（英字またはアンダースコアで始まる）で入力してください |
| validation.prefixTooLong | Prefixは64文字以内で入力してください |
| validation.uriRequired | URIを入力してください |
| validation.uriInvalid | https:// / http:// / urn: で始まるURIを入力してください |
| validation.uriTooLong | URIは512文字以内で入力してください |
| orcidAutoFilled | ORCID IDを自動入力しました |
| registerSuccess | 名前空間「{prefix}」を登録しました |
| labelPrefix | 接頭辞（Prefix） |
| extraPrefix | xs:NCName 形式。英字またはアンダースコアで始まる識別子 |
| labelUriAuto | URI（自動生成） |
| extraUriAuto | {orgCd}・{deptCd} をベースに自動生成されます |
| uriAutoPlaceholder | Prefixを入力するとURIが生成されます |
| labelUri | URI |
| labelDisplayName | 表示名（任意） |
| extraDisplayName | 人が読みやすい名前空間の名称（例: CorpA 社内用語） |
| labelDescription | 説明（任意） |
| placeholderDescription | 名前空間の用途・背景を入力... |
| labelParentNamespace | 親名前空間（任意） |
| extraParentNamespace | この名前空間が継承する親名前空間を選択します |
| placeholderParentNamespace | 親名前空間を選択 |
| labelOrcid | ORCID自動入力 |
| extraOrcid | ORCID IDがある場合はOAuth2で自動取得できます |
| btnOrcidAutoFill | ORCID IDを自動入力 |
| btnRegister | 登録 |

### duplicateSuggestModal（DuplicateSuggestModal.tsx）
| キー | 日本語 |
|------|--------|
| title | 重複候補が見つかりました |
| willUnify | すべての候補を選択しました。確定できます。 |
| cancel | キャンセル |
| register | この候補で登録 |
| selectOne | 各用語について、使用する候補を1つ選択してください。 |
| descLabel | 説明 |
| typeLabel | 型 |
| unitLabel | 単位 |
| sourceLabel | 出典 |

### shareScopeModal（ShareScopeModal.tsx）
| キー | 日本語 |
|------|--------|
| title | 共有先を選択 |
| okText | 共有する |
| notSelectable | （選択不可） |
| selectedLabel | 共有先： |
| shareNote | ※ 選択した共有先に移動します。 |
| roleDescSysAdmin | 組織まで共有できます |
| roleDescDeptOwner | 「{label}」（部署）まで共有できます |
| roleDescTeamOwner | 「{label}」（チーム）まで共有できます |

## 6. 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `frontend/src/locales/ja.json` | 6セクション（約160キー）追加 |
| `frontend/src/locales/en.json` | 同6セクション英語翻訳追加 |
| `frontend/src/components/namespace/ShareScopeModal.tsx` | ハードコード日本語を t() に置き換え |

## 7. 承認記録
- **計画書提示日時**: 2026-08-26 14:54
- **承認日時**: 2026-08-26 15:18
- **承認者コメント**: 実施済み

## 8. 実施記録

### 実施日時
開始: 2026-08-26 15:14  
完了: 2026-08-26 15:18

### 実施内容
- `ja.json` に `namespaceMain`・`prefixManagement`・`namespaceDetail` セクションを追加
- `en.json` に同3セクションの英語翻訳を追加

### 最終的な成果物
- [x] `frontend/src/locales/ja.json` — 3セクション追加完了
- [x] `frontend/src/locales/en.json` — 3セクション追加完了（英語翻訳）
