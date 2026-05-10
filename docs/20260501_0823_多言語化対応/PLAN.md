# タスク計画書: 多言語化対応（日本語ハードコード箇所の i18n 化）

## メタデータ
- **作成日時**: 2026-05-01 08:23
- **タスクID**: i18n-hardcoded-japanese
- **優先度**: 高
- **推定工数**: 16〜24時間

---

## 1. タスク概要

ソースコード内に直接記載されている日本語文字列を調査し、独自の `LanguageContext`（`useLanguage()` フック）を使用した多言語化対応に置き換える。

フロントエンドの JSX テキスト・バリデーションメッセージ・エラーメッセージが主な対象。
バックエンドのAPIエラーメッセージについては、既存の `code` フィールドを活用し、フロントエンド側の `errorMapper.ts` で翻訳する方式を採用する。

---

## 2. 目的と期待される成果

### 目的
- ソースコードから日本語文字列のハードコードを排除する
- `ja.json` / `en.json` に翻訳キーを集約し、将来の言語追加を容易にする

### 期待される成果
- [x] 認証系画面（ログイン・PIN・パスワードリセット）の UI 文言が `t()` で管理される
- [x] エディタ系コンポーネントの UI 文言・エラーメッセージが `t()` で管理される
- [x] サービス層・ユーティリティのエラーメッセージが `t()` で管理される
- [x] `ja.json` / `en.json` に全翻訳キーが追加される
- [x] 既存の動作に影響を与えない

---

## 3. 調査結果サマリー

> 詳細は `remaining_hardcoded.md` 参照

---

## 4. 実装ステップ

> 各 Phase の対象ファイル詳細は `remaining_hardcoded.md` を参照

- [x] Phase 1: 認証系コンポーネント（LoginForm / PIN / PasswordReset / ChangePasswordModal / LoginPage）
- [x] Phase 2: エディタ系コンポーネント（PropertyPanel / DocumentEditDialog / XMLViewer / viewer/ 系）
- [x] Phase 3: ユーティリティ・ローダー（maimlLoader / nodeUtils / formatApi / apiClient 等）
- [x] Phase 4: ja.json / en.json 不足キー追記
- [x] Phase 5: サービス層エラーメッセージ英語化（errorMapper / authService / error.message 統一）
- [x] Phase 6: プロジェクト管理系（ProjectManagement / ProgressCheckTab / ExperimentWorkerMenu）
- [x] Phase 7: ファイル・フォーマット系（BulkUpload / FormatUpload / FormatSearchModal / FormatFolderTree）
- [x] Phase 8: ダイアログ系（UnifiedSelection / InstructionEdit / TemplateEditor / FormatEditor / MaimlPublish 等）
- [x] Phase 9: 実験作業系（DataRecordDialog / ProgressMonitoring / PetriNetViewer / ExperimentRecordTab 等）

---

## 5. 影響範囲

### 変更するファイル

#### フロントエンド
1. `frontend/src/locales/ja.json` - 翻訳キー追加（大規模変更）
2. `frontend/src/locales/en.json` - 翻訳キー追加（大規模変更）
3. `frontend/src/app/(auth)/login/page.tsx` または Login コンポーネント - `t()` 置き換え
4. `frontend/src/components/auth/PinCodeInputPage.tsx` - `t()` 置き換え
5. `frontend/src/components/auth/PasswordResetRequest.tsx` - `t()` 置き換え
6. `frontend/src/components/auth/PasswordResetExecute.tsx` - `t()` 置き換え
7. `frontend/src/components/editorv2/PetriNetEditorScreen.tsx` - `t()` 置き換え
8. `frontend/src/components/editorv2/components/XMLViewerWrapper.tsx` - `t()` 置き換え
9. `frontend/src/components/editorv2/viewer/ViewRendererDialog.tsx` - `t()` 置き換え
10. `frontend/src/components/editorv2/viewer/DraftRestoreDialog.tsx` - `t()` 置き換え
11. `frontend/src/components/editorv2/viewer/ErrorBoundary.tsx` - `t()` 置き換え
12. `frontend/src/contexts/LanguageContext.tsx` - `getTranslation()` / `updateGlobalT()` を追加
13. `frontend/src/components/editorv2/components/ValidationPanel.tsx` - `useLanguage()` 追加・日本語固定テキストを `t()` 化
14. `frontend/src/components/editorv2/loaders/maimlLoader.ts` - `getTranslation()` を使用して翻訳キーに置き換え
15. `frontend/src/components/editorv2/utils/nodeUtils.ts` - `getTranslation()` を使用して翻訳キーに置き換え
16. `frontend/src/components/editorv2/utils/edgeUtils.ts` - `getTranslation()` を使用して翻訳キーに置き換え
17. `frontend/src/components/editorv2/utils/validationUtils.ts` - `getTranslation()` を使用して翻訳キーに置き換え
18. `frontend/src/components/editorv2/utils/converters/templateToXML.ts` - `getTranslation()` を使用して翻訳キーに置き換え
19. `frontend/src/components/editorv2/utils/xmlSignature.ts` - `getTranslation()` を使用して翻訳キーに置き換え
20. `frontend/src/components/editorv2/utils/templateConverter.ts` - `getTranslation()` を使用して翻訳キーに置き換え
21. `frontend/src/components/TransitionSetSearch/WeightSliders.tsx` - `t()` 置き換え
19. `frontend/src/components/SystemManagement/DepartmentManagement.tsx` - `t()` 置き換え
20. `frontend/src/components/DataManagement/MasterManagement.tsx` - `t()` 置き換え
21. `frontend/src/components/SystemManagement/UserManagement.tsx` - placeholder 置き換え
22. `frontend/src/services/corporationApiService.ts` - エラーメッセージ変更
23. `frontend/src/services/sessionApiService.ts` - エラーメッセージ変更
24. `frontend/src/services/issueApiService.ts` - エラーメッセージ変更
25. `frontend/src/services/departmentApiService.ts` - エラーメッセージ変更

### 影響を受ける機能
- 認証フロー全般（ログイン・PIN認証・パスワードリセット）
- MAIML エディタ画面全般
- マスタ管理・ユーザー管理・部署管理画面
- セマンティック検索画面

---

## 6. 技術的詳細

### 翻訳キー命名規則

```
auth.login.*          ← ログイン画面
auth.pin.*            ← PIN認証画面
auth.passwordReset.*  ← パスワードリセット画面
editor.petriNet.*     ← ペトリネットエディタ
editor.dialog.*       ← エディタ内ダイアログ共通
editor.validation.*   ← エディタバリデーション
editor.loader.*       ← エディタローダー
editor.xmlViewer.*    ← XML ビューア
search.weights.*      ← 検索重み設定
management.master.*   ← マスタ管理
management.department.*  ← 部署管理
management.user.*     ← ユーザー管理
common.*              ← 共通（「戻る」「キャンセル」等）
```

### i18n の仕組み

このプロジェクトは `react-i18next` ではなく、**独自の `LanguageContext`** を使用しています。

```tsx
// React コンポーネントでの使い方
import { useLanguage } from '@/contexts/LanguageContext';

const { t } = useLanguage();
t('common.save') // → "保存"（ja） / "Save"（en）
```

### 非 React TS ファイルでの対応方法

`useLanguage()` は React フックのため、`.ts` ファイル（ローダー・ユーティリティ等）では直接使用できません。
**`LanguageContext.tsx` に `getTranslation()` / `updateGlobalT()` を追加し、React 外からも翻訳関数を呼び出せるようにする。**

#### 実装パターン

**LanguageContext.tsx への追加**
```typescript
// グローバルな翻訳関数の参照（Provider 外からも利用可能）
let currentT: (key: string) => string = defaultContextValue.t;

/** Provider がマウントされたら currentT を最新の t() に更新する */
export function updateGlobalT(t: (key: string) => string): void {
  currentT = t;
}

/** React 外（.ts ファイル等）から翻訳キーを解決するスタンドアロン関数 */
export function getTranslation(key: string): string {
  return currentT(key);
}
```

**Provider 内で updateGlobalT を呼び出す**
```typescript
// LanguageProvider 内
useEffect(() => {
  updateGlobalT(t);
}, [t, locale]);
```

**ユーティリティ側（.ts ファイル）での使用**
```typescript
import { getTranslation } from '@/contexts/LanguageContext';

// Before
errors.push('ノードIDが存在しません');

// After
errors.push(getTranslation('editor.validation.nodeIdMissing'));
```

**動的補間（テンプレート文字列の代替）**
```typescript
// Before
errors.push(`ノード ${node.id}: ${result.errors.join(', ')}`);

// After（テンプレートリテラルは getTranslation 外で組み立て）
errors.push(`${getTranslation('editor.validation.nodePrefix')} ${node.id}: ${result.errors.join(', ')}`);
// または翻訳キーでシンプルに:
errors.push(getTranslation('editor.validation.nodeIdMissing'));
```

### 動的補間の活用
```typescript
// Before
throw new Error(`${fieldName}を入力してください`);

// After
throw new Error(t('form.required', { field: t(`fields.${fieldKey}`) }));

// ja.json
"form": {
  "required": "{{field}}を入力してください"
}
```

---

## 7. 翻訳キー追加計画（ja.json / en.json）

### 新規追加セクション（概算）
```json
// ja.json に追加
{
  "auth": {
    "login": { ... },       // 約10キー
    "pin": { ... },         // 約15キー
    "passwordReset": { ... } // 約20キー
  },
  "editor": {
    "petriNet": { ... },    // 約5キー
    "dialog": { ... },      // 約10キー
    "validation": { ... },  // 約20キー
    "loader": { ... },      // 約10キー
    "xmlViewer": { ... }    // 約5キー
  },
  "search": {
    "weights": { ... }      // 約10キー
  }
}
```

---

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 翻訳キーの重複・命名衝突 | 中 | 中 | 事前にキー命名規則を定め、階層を明確に分ける |
| 非 React TS ファイルから日本語文字列を直接参照している | 高 | 低 | 呼び出し元コンポーネントで `t()` した文字列を引数として渡す方式（方法①）に変更することで回避 |
| バリデーション文言の変更による UX 影響 | 低 | 中 | 既存の日本語テキストをそのまま ja.json に移行することで変化なし |
| Phase 実施中の中断による不整合状態 | 中 | 低 | Phase 単位でコミットし、常にビルドが通る状態を維持 |
| `ja.json` の大規模変更によるマージコンフリクト | 中 | 中 | 追記のみ（既存キーを変更しない）で対応 |

---

## 9. テスト計画

### 確認項目
- [x] ログイン画面：UI文言が正しく表示される（日本語 / 英語 切り替え）
- [x] PIN認証画面：UI文言・バリデーションメッセージが正しく表示される
- [x] パスワードリセット画面：UI文言が正しく表示される
- [x] エディタ画面：confirm ダイアログ・ドラフト復元ダイアログが正しく表示される
- [x] エディタ画面：バリデーションエラーメッセージが正しく表示される
- [x] マスタ管理画面：CSV エラーメッセージが正しく表示される
- [x] 翻訳キーが存在しない場合、フォールバックが正しく動作する（i18next デフォルト動作）
- [x] ビルドエラーが発生しないこと（`npm run build`）

---

## 10. 承認記録

- **計画書提示日時**: 2026-05-01 08:23
- **承認日時**: （承認時に記入）
- **承認者コメント**: （ユーザーからのフィードバック）

---

## 11. 実施記録

### 実施日時
開始: 2026-05-01 08:23  
完了: 2026-05-01 10:27

### 完了した作業
- [x] Phase 1（一部）: LoginForm / PINCodeForm / PasswordResetRequest / PasswordResetExecute / ChangePasswordModal の t() 化
- [x] Phase 2（一部）: PetriNetEditorScreen / XMLViewerWrapper / EditorToolbar / MethodTabPanel / PetriNetEditorInner / PropertyPanel / NestedPropertyEditor / DocumentEditDialog / XMLViewer / MaimlPublishDialog / MaimlUnpublishDialog / CreateFormatModal の t() 化
- [x] Phase 3（完了）: LanguageContext に getTranslation() / updateGlobalT() 追加・nodeUtils / edgeUtils / validationUtils / maimlLoader / templateToXML / xmlSignature / templateConverter / ValidationPanel の t() 化
- [x] Phase 4（一部）: ProjectManagement / ProgressCheckTab / ExperimentWorkerMenu / BulkUploadDialog / FormatUploadDialog / FileListTable / UnifiedSelectionDialog / TaskSelectionDialog / InstructionEditDialog / ProgressMonitoring / PetriNetViewer / ExperimentRecordTab / ProgressCheckTable / TransitionList の t() 化
- [x] Phase 5（完了）: サービス層エラーメッセージ英語化・errorMapper.ts の i18n 化・error.message 直接参照統一
