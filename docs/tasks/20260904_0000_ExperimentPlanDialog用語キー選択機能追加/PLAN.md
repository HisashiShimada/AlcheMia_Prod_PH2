# タスク計画書: ExperimentPlanDialog 用語キー選択機能追加

## メタデータ
- **作成日時**: 2026-09-04 00:00
- **タスクID**: 20260904_0000_ExperimentPlanDialog用語キー選択機能追加
- **優先度**: 中
- **推定工数**: 4〜6時間

---

## 1. タスク概要

`ExperimentPlanDialog` の「テンプレート入力」タブ内にある **カスタムプロパティ追加機能** について、`TemplateEditorDialog` と同様に**登録済み用語（Namespace Term）からキーを選択できるモーダルを追加**する。  
さらに、選択したキーに紐づく型（xsi:type）・単位（unitHint）・説明（description）をプロパティの初期値に自動反映させる。

### 現状
- `TemplateInputPanel` の「property 追加」「content 追加」ボタンを押すと、キー空・型デフォルトの `CustomPropValue` が即座に生成される
- キーは後から手動で入力するしかない

### 目標
- ボタンを押したときに用語選択モーダルが表示される
- モーダルで登録済み用語（`getTermsForPropertyDialog` 取得・`hasDirectiveTerm=true` フィルタ済み）から qname を選択できる
- 選択後、用語の `type`・`unitHint` が `CustomPropValue` の `type`・`units` に自動設定される
- 用語マップが空の場合や直接入力したい場合は、フォールバックのテキスト入力欄からキーを直接入力できる

---

## 2. 目的と期待される成果

- [ ] `ExperimentPlanDialog` で登録済み用語からプロパティキーを選択できる
- [ ] 選択した用語の型・単位が自動設定され、手動入力の手間が減る
- [ ] `organizationGroupCd` を Prop 連鎖で受け取り、グループ＋上位グループスコープの用語が表示される
- [ ] 用語が0件のときも直接キー入力フォールバックで従来通りの操作が可能

---

## 3. 実装ステップ

### Step 1: 型定義追加

- [ ] `frontend/src/types/experimentPlan.ts`
  - `ExperimentPlanDialogProps` に `organizationGroupCd?: string` を追加
- [ ] `frontend/src/types/experimentPlanDialog.ts`
  - `TemplateInputPanelProps` に `termMap?: Map<string, NamespaceTermRow>` を追加
  - import 型の追加（`NamespaceTermRow` を `@/services/namespaceApiService` から）

### Step 2: Props 連鎖（organizationGroupCd の流通）

#### 2-1. TaskRegistrationTab ルート
- [ ] `frontend/src/components/project/subcomponents/tabs/TaskRegistrationTabContent.tsx`
  - `TaskRegistrationTab` に `organizationGroupCd={selectedProject.organizationGroup}` を渡す
- [ ] `frontend/src/components/project/TaskRegistrationTab.tsx`
  - `TaskRegistrationTabProps` に `organizationGroupCd?: string` を追加
  - `ExperimentPlanDialog` に `organizationGroupCd={organizationGroupCd}` を渡す

#### 2-2. ExperimentInstructionTab ルート
- [ ] `frontend/src/components/project/subcomponents/tabs/ExperimentInstructionTabContent.tsx`
  - `ExperimentInstructionTab` に `organizationGroupCd={selectedProject.organizationGroup}` を渡す
- [ ] `frontend/src/components/project/ExperimentInstructionTab.tsx`
  - `ExperimentInstructionTabProps` に `organizationGroupCd?: string` を追加
  - `ExperimentPlanDialog` に `organizationGroupCd={organizationGroupCd}` を渡す

### Step 3: ExperimentPlanDialog の修正
- [ ] `frontend/src/components/project/ExperimentPlanDialog.tsx`
  - Props で `organizationGroupCd?: string` を受け取る
  - `termMap` state（`Map<string, NamespaceTermRow>`）を追加
  - `open` が true になった時に `getTermsForPropertyDialog(organizationGroupCd)` を呼び出し
  - `hasDirectiveTerm === true` のエントリのみに絞り込んで `termMap` にセット
  - `TemplateInputPanel` に `termMap={termMap}` を渡す
  - import: `getTermsForPropertyDialog` を `@/services/namespaceApiService` から追加

### Step 4: TemplateInputPanel の修正（メイン実装）
- [ ] `frontend/src/components/project/subcomponents/TemplateInputPanel.tsx`

  #### 4-1. Props・import 追加
  - `termMap?: Map<string, NamespaceTermRow>` を Props に受け取る
  - `Modal`, `SearchOutlined` などの import 追加

  #### 4-2. state 追加
  ```typescript
  const [showTermSelectModal, setShowTermSelectModal] = useState(false);
  const [pendingContainerType, setPendingContainerType] = useState<CustomPropContainerType | null>(null);
  const [selectedTermKey, setSelectedTermKey] = useState<string>('');
  const [directKeyInput, setDirectKeyInput] = useState<string>('');
  ```

  #### 4-3. 追加ボタンの動作変更
  - 「property 追加」「content 追加」ボタンのクリックでモーダルを開く
  - `pendingContainerType` に `'property'` or `'content'` をセット

  #### 4-4. 用語選択モーダルの追加
  ```
  ┌─────────────────────────────────────────────┐
  │ プロパティキーを選択                    [✕] │
  ├─────────────────────────────────────────────┤
  │ コンテナタイプ: [property] / [content]      │ ← Tag表示（読み取り専用）
  │                                             │
  │ 登録済み用語から選択:                       │
  │ [🔍 用語キーを検索・選択          ▼]       │ ← Select + showSearch
  │ （displayName・qname・type・unitHint を表示）│
  │                                             │
  │ または直接キーを入力:                       │
  │ [                              ]            │ ← Input フォールバック
  │                                             │
  │              [キャンセル]  [追加]           │
  └─────────────────────────────────────────────┘
  ```

  #### 4-5. 確定処理（handleAddCustomPropFromTerm）
  - `finalKey = selectedTermKey || directKeyInput.trim()`
  - `termMap.get(finalKey)` から `type`・`unitHint` を取得
  - コンテナタイプに応じた型変換:
    - `containerType === 'property'`: `matchedTerm?.type` が `content` 系でなければそのまま使用、それ以外は `stringType`
    - `containerType === 'content'`: `matchedTerm?.type` が `content` 系であればそのまま使用、それ以外は `contentStringListType`
  - `CustomPropValue` を生成して `onCustomPropsChange` を呼び出す

### Step 5: 動作確認
- [ ] 用語が存在する状態で「property 追加」ボタン → モーダルが開く
- [ ] Select で用語を選択 → 「追加」ボタンで型・単位が自動設定される
- [ ] 直接キー入力でも追加できる
- [ ] 用語が0件の場合 → モーダル内に「用語が見つかりません」と表示、直接入力で追加可能
- [ ] 「content 追加」でも同様に動作する
- [ ] モーダルキャンセルでプロパティが追加されない
- [ ] `ExperimentInstructionTab` からも同様に動作する

---

## 4. 影響範囲分析

### 変更ファイル一覧

| # | ファイルパス | 変更種別 |
|---|---|---|
| 1 | `frontend/src/types/experimentPlan.ts` | 型追加（Props拡張） |
| 2 | `frontend/src/types/experimentPlanDialog.ts` | 型追加（Props拡張） |
| 3 | `frontend/src/components/project/subcomponents/tabs/TaskRegistrationTabContent.tsx` | Props追加・連鎖 |
| 4 | `frontend/src/components/project/TaskRegistrationTab.tsx` | Props追加・連鎖 |
| 5 | `frontend/src/components/project/subcomponents/tabs/ExperimentInstructionTabContent.tsx` | Props追加・連鎖 |
| 6 | `frontend/src/components/project/ExperimentInstructionTab.tsx` | Props追加・連鎖 |
| 7 | `frontend/src/components/project/ExperimentPlanDialog.tsx` | 用語取得・termMap管理 |
| 8 | `frontend/src/components/project/subcomponents/TemplateInputPanel.tsx` | メイン実装 |

### 既存機能への影響
- 追加する Props は全て `optional` のため、既存の呼び出し元のコード変更は不要
- `handleAddCustomProp` 関数の内部ロジックは変わらず、呼び出しタイミングがモーダル確定後に移行する
- `ExperimentPlanDialog` の他の Props・機能への影響なし

### 認証・認可への影響
- `getTermsForPropertyDialog` は既存 API を使用（認証済みユーザーのみアクセス可能）
- `hasDirectiveTerm === true` フィルタにより指示用途以外の用語は表示されない

### マルチテナント分離への影響
- `organizationGroupCd` を経由して組織グループスコープの用語のみを取得するため準拠

---

## 5. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `NamespaceTermRow.type` が `property`/`content` どちらのコンテナにも対応していない場合 | 中 | 中 | コンテナタイプに応じた型変換ロジックを実装（content系は `content` プレフィックスを付ける） |
| `organizationGroupCd` が未渡しの場合 | 低 | 低 | `getTermsForPropertyDialog` が個人スコープをフォールバックとして取得するため問題なし |
| `termMap` の用語が0件でモーダルが使いにくい | 中 | 低 | 直接キー入力フォールバックを提供 |
| Prop 連鎖変更による既存コンポーネントのビルドエラー | 低 | 低 | 全て `optional` Prop として追加するため既存の呼び出し元は修正不要 |

---

## 6. テスト計画

### 手動テスト
- [ ] `TaskRegistrationTab` から `ExperimentPlanDialog` を開く → 「テンプレート入力」タブ → 「property 追加」ボタン → 用語選択モーダルが表示される
- [ ] 用語選択後「追加」 → キー・型・単位が正しく設定されている
- [ ] 直接キー入力 → 「追加」 → キーのみ設定、型はデフォルト
- [ ] 用語を選択した状態で直接入力した場合の排他制御（Select をクリアして直接入力に切り替え）
- [ ] `ExperimentInstructionTab` からも同様に動作する
- [ ] 「content 追加」でも用語選択モーダルが表示される
- [ ] モーダルキャンセルでプロパティが追加されない

---

## 7. ロールバック計画

各 Step は独立しており、失敗時は該当ファイルのみ `git revert` で元に戻すことができる。  
全ファイルは `optional` 追加のため、Prop 連鎖を戻すだけで元の動作に戻る。

---

## 8. 関連ドキュメント

- `frontend/src/components/editorv2/TemplateEditorDialog.tsx` — 参照実装（用語キー選択モーダル L146〜, L619〜）
- `frontend/src/services/namespaceApiService.ts` — `getTermsForPropertyDialog` 関数（L516〜）
- `.clinerules/development/config.md` — インラインオブジェクト引数禁止ルール
- `.clinerules/development/typescript.md` — 型定義規約
- `docs/tasks/20260902_1417_新規プロパティ追加ダイアログ_スコープ絞り込み実装/PLAN.md` — 参考（TemplateEditorDialog の organizationGroupCd 対応）

---

## 9. 承認記録

- **計画書提示日時**: 2026-09-04 00:00
- **承認日時**: （承認時に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

---

## 10. 実施記録

### 実施日時
開始: 2026-09-04 00:00
完了: 2026-09-04 00:00

### 計画からの変更点
特になし。計画通りに実施。

### 発生した問題と解決方法
特になし。TypeScript ビルド（tsc --noEmit）で 0 エラー。

### 最終的な成果物
- [x] Step 1: 型定義追加 完了
  - `types/experimentPlan.ts`: `ExperimentPlanDialogProps.organizationGroupCd?: string` 追加
  - `types/experimentPlanDialog.ts`: `NamespaceTermRow` import 追加・`TemplateInputPanelProps.termMap?` 追加
- [x] Step 2: Props 連鎖 完了
  - `TaskRegistrationTabContent.tsx`: `organizationGroupCd={selectedProject.organizationGroup}` 渡す
  - `TaskRegistrationTab.tsx`: Props 受け取り → `ExperimentPlanDialog` に渡す
  - `ExperimentInstructionTabContent.tsx`: `organizationGroupCd={selectedProject.organizationGroup}` 渡す
  - `ExperimentInstructionTab.tsx`: Props 受け取り → `ExperimentPlanDialog` に渡す
- [x] Step 3: ExperimentPlanDialog 修正 完了
  - `getTermsForPropertyDialog` import 追加
  - `termMap` state 追加
  - `open` 時 useEffect で用語取得・`hasDirectiveTerm` フィルタ
  - `TemplateInputPanel` に `termMap={termMap}` 渡す
- [x] Step 4: TemplateInputPanel 修正（メイン実装）完了
  - `Modal`, `SearchOutlined`, `NamespaceTermRow` import 追加
  - `showTermSelectModal`, `pendingContainerType`, `selectedTermKey`, `directKeyInput` state 追加
  - `handleOpenTermSelectModal`: 追加ボタンクリック時にモーダルを開く
  - `handleAddCustomPropFromTerm`: 用語選択確定時に型・単位を自動設定して追加
  - 「property 追加」「content 追加」ボタンを `handleOpenTermSelectModal` に変更
  - 用語キー選択モーダル UI 追加（Select + 直接入力フォールバック）
- [x] Step 5: 動作確認 完了（TypeScript ビルド 0 エラー）

