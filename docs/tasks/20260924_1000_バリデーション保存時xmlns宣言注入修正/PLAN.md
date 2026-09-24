# タスク計画書: バリデーション・保存時 xmlns 宣言注入修正

## メタデータ

- **作成日時**: 2026-09-24 10:00
- **タスクID**: 20260924_1000
- **優先度**: 高
- **推定工数**: 1.5時間

---

## 1. タスク概要

### 不具合の説明

新規作成から MaiML を編集してバリデーション/保存確認ダイアログを開く際に、  
**グローバルのネームスペース宣言とプロジェクトの登録先グループから設定されるネームスペース宣言が含まれていない** XML がバックエンドに送信される。

その結果、`analyzeMaiMLFile` の Phase 7（`validatePropertyTermKeys`）において  
`extractXmlnsDeclarations(parsedXML)` が対象グループに登録された用語の prefix を認識できず、  
**未登録用語扱いでバリデーションエラーになる**。

### 問題の流れ

```
フロントエンド（PetriNetEditorInner）
  ↓ convertReactFlowToMaiML / convertMultipleMethodsToMaiML で生XML生成
  ↓ ← この時点ではxmlns宣言なし（グローバル宣言・グループ宣言が未注入）
  ↓ Base64エンコード
  ↓ validateMaiml() に送信  ← ❌ 宣言なしのまま送信

saveMaiml(): getOrganizationNamespaces() + injectNamespacesToMaiml() で注入してから保存  ✅
validateMaiml() 呼び出し箇所（2箇所）: 名前空間注入なしで送信  ❌
```

---

## 2. 目的と期待される成果

- [ ] 新規作成からバリデーションを実行した際に、グループ登録済み用語でエラーにならない
- [ ] 保存確認ダイアログ表示時のバリデーションで、グループ登録済み用語でエラーにならない
- [ ] `saveMaiml()` と同じ xmlns 注入処理をバリデーション呼び出し前にも適用する
- [ ] 既存の保存済みファイル編集時の動作に影響しない

---

## 3. 根本原因の整理

| 場所 | 関数名 | 現状 | 問題 |
|------|--------|------|------|
| `PetriNetEditorInner.tsx` L.582〜592 | `handleOpenSaveConfirmDialog` | 生成した maimlXml をそのまま Base64→validateMaiml | xmlns 宣言なし |
| `PetriNetEditorInner.tsx` L.2821〜2827 | `handleOpenValidationPanel` | 生成した maimlXml をそのまま Base64→validateMaiml | xmlns 宣言なし |

---

## 4. 実装ステップ

### Step 1: `PetriNetEditorInner.tsx` に import を追加

```typescript
import { injectNamespacesToMaiml } from '../../utils/namespaceInjector';
import { getOrganizationNamespaces } from '../../services/namespaceApiService';
```

### Step 2: `handleOpenSaveConfirmDialog` に xmlns 注入処理を追加

Base64エンコード前に注入処理を挿入する。

```typescript
// 名前空間宣言を注入してからバリデーション送信
let maimlXmlForValidation = maimlXml;
try {
  const namespaces = await getOrganizationNamespaces(organizationGroupCd);
  if (namespaces.length > 0) {
    maimlXmlForValidation = injectNamespacesToMaiml(maimlXml, namespaces);
    console.log(`🔧 [handleOpenSaveConfirmDialog] 名前空間 ${namespaces.length} 件を注入しました`);
  }
} catch (nsError) {
  console.warn('⚠️ [handleOpenSaveConfirmDialog] 名前空間注入をスキップ:', nsError);
}
const base64Data = btoa(unescape(encodeURIComponent(maimlXmlForValidation)));
```

### Step 3: `handleOpenValidationPanel` に xmlns 注入処理を追加

同様に Base64エンコード前に注入処理を挿入する。  
あわせて Base64エンコード方式を `btoa(unescape(encodeURIComponent(...)))` に統一する。

```typescript
// 名前空間宣言を注入してからバリデーション送信
let maimlXmlForValidation = maimlXml;
try {
  const namespaces = await getOrganizationNamespaces(organizationGroupCd);
  if (namespaces.length > 0) {
    maimlXmlForValidation = injectNamespacesToMaiml(maimlXml, namespaces);
    console.log(`🔧 [handleOpenValidationPanel] 名前空間 ${namespaces.length} 件を注入しました`);
  }
} catch (nsError) {
  console.warn('⚠️ [handleOpenValidationPanel] 名前空間注入をスキップ:', nsError);
}
const base64Data = btoa(unescape(encodeURIComponent(maimlXmlForValidation)));
```

### Step 4: TypeScript ビルド確認

```bash
cd /home/mi_ito/mmdpf/frontend && npx tsc --noEmit
```

---

## 5. 変更ファイル

| # | ファイル | 変更種別 | 変更内容 |
|---|---------|---------|---------|
| 1 | `frontend/src/components/editorv2/PetriNetEditorInner.tsx` | **修正** | import 追加、`handleOpenSaveConfirmDialog` と `handleOpenValidationPanel` に xmlns 注入処理を追加 |

> `SaveConfirmDialog.tsx`・`ValidationPanel.tsx`・`XMLViewer.tsx` は変更なし。

---

## 6. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| `getOrganizationNamespaces` が失敗した場合 | 低 | 低 | try/catch で囲み失敗時は注入なしで継続 |
| `organizationGroupCd` が未設定の場合 | 低 | 中 | 引数省略可で `getOrganizationNamespaces` はフォールバックあり |
| Base64エンコード方式変更 | 低 | 低 | 既存の `saveMaiml` / `handleOpenSaveConfirmDialog` と同じ実績ある方式 |

---

## 7. テスト計画

### 手動テスト

- [ ] 新規作成フローで、グループ登録済み用語（prefix:localName 形式）を含む property タグありの MaiML でバリデーション実行 → エラーが出ないことを確認
- [ ] 新規作成フローで、保存確認ダイアログを開く → バリデーションエラーが出ないことを確認
- [ ] 既存ファイル（S3保存済み）を編集してバリデーション実行 → 既存動作が変わらないことを確認

### ビルド確認

- [ ] `npx tsc --noEmit` でビルドエラーなし

---

## 8. 承認記録

- **計画書提示日時**: 2026-09-24 10:00
- **承認日時**: 2026-09-24 10:00
- **承認者コメント**: 実装に進んでください

---

## 9. 実施記録

### 実施日時

開始: 2026-09-24 10:00
完了: 2026-09-24 10:30

### 最終的な成果物

- [x] `PetriNetEditorInner.tsx` import 追加（`injectNamespacesToMaiml`、`getOrganizationNamespaces`）
- [x] `handleOpenSaveConfirmDialog` xmlns 注入追加（L.587〜597）
- [x] `handleOpenValidationPanel` xmlns 注入追加 + Base64エンコード方式統一（L.2838〜2849）
- [x] TypeScript ビルド確認（`npx tsc --noEmit` エラーなし）
