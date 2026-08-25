# タスク計画書: Signature機能 フロントエンドUIモック実装

## メタデータ
- **作成日時**: 2026-06-25 15:00
- **タスクID**: signature-ui-mock
- **優先度**: 中
- **推定工数**: 2〜3時間
- **前提ドキュメント**: `docs/tasks/20260625_0851_Signature機能配置検討/PLAN.md`

---

## 1. タスク概要

改ざん防止機能（XMLDSig署名）のフロントエンドUIをモック（スタブAPI）として実装する。  
バックエンドAPIは未実装のため、フロントエンドではスタブ関数を使用する。

---

## 2. 目的と期待される成果

### 目的
- UIの動作確認とレビューを先行して行える状態にする
- バックエンド実装と並行してフロントエンド開発を進める

### 期待される成果
- [ ] 署名専用モーダル（SignatureManagementModal）が表示される
- [ ] 署名状態（署名なし/署名済み）が表示される
- [ ] [署名を実行] / [署名を削除] ボタンが機能する（スタブ）
- [ ] プロジェクト管理画面から署名モーダルを開けるボタンが追加される
- [ ] Document編集ダイアログの署名チェックボックスは既存実装のまま維持

---

## 3. 設計方針

### 配置設計（確定済み）

| 場所 | 機能 | 状態 |
|------|------|------|
| Document編集ダイアログ | 計画段階の署名（編集保存と同時） | **既存実装済み** - 追加不要 |
| 署名専用モーダル（新規） | 完了時点の署名・再署名・後付け署名 | **今回実装** |

### 署名 vs 暗号化の違い

- **暗号化**: 特定の要素（data/eventLog等）を選択して操作 → EncryptionManagementModal（左ペインで要素選択）
- **署名**: Document全体に対する操作 → **要素選択不要** → 専用モーダルで独立させる

### アーカイブポリシー（確定済み）
- MAIMLファイル保存時は常にアーカイブを作成（skipArchiveオプションなし）
- 署名実行時も1回のアーカイブが作成される（仕様として許容）

---

## 4. 実装ステップ

### Phase 1: 型定義の作成
- [ ] `frontend/src/types/signature.ts` を作成
  - `SignatureStatus` 型
  - `SignatureStatusResponse` 型

### Phase 2: スタブAPIサービスの作成
- [ ] `frontend/src/services/signatureService.ts` を作成
  - `getSignatureStatus()`: 署名状態取得（スタブ）
  - `applySignature()`: 署名実行（スタブ）
  - `removeSignature()`: 署名削除（スタブ）

### Phase 3: 署名管理コンポーネントの作成
- [ ] `frontend/src/components/signature/SignatureManagement.tsx` を作成
  - 署名状態の表示（署名なし/署名済み + 最終署名日時）
  - [署名を実行] ボタン
  - [署名を削除] ボタン（署名なし時はdisabled）
  - 注意事項の表示

- [ ] `frontend/src/components/signature/SignatureManagementModal.tsx` を作成
  - Modalラッパー
  - タイトル: `電子署名管理: {projectName}`
  - サイズ: `600px`

### Phase 4: プロジェクト管理画面の修正
- [ ] `frontend/src/components/project/ProjectManagement.tsx` を修正
  - `[電子署名]` ボタンを追加
  - `signatureModalOpen` state を追加
  - `SignatureManagementModal` を呼び出す

### Phase 5: 翻訳キーの追加
- [ ] `frontend/src/locales/ja.json` に署名関連のキーを追加
- [ ] `frontend/src/locales/en.json` に署名関連のキーを追加

---

## 5. 変更ファイル一覧

### 新規作成
| ファイル | 説明 |
|---------|------|
| `frontend/src/types/signature.ts` | 型定義 |
| `frontend/src/services/signatureService.ts` | スタブAPIサービス |
| `frontend/src/components/signature/SignatureManagement.tsx` | 署名管理メインコンポーネント |
| `frontend/src/components/signature/SignatureManagementModal.tsx` | 署名管理モーダルラッパー |

### 修正
| ファイル | 変更内容 |
|---------|---------|
| `frontend/src/components/project/ProjectManagement.tsx` | [電子署名]ボタン + SignatureManagementModal追加 |
| `frontend/src/locales/ja.json` | 署名関連翻訳キーの追加 |
| `frontend/src/locales/en.json` | 署名関連翻訳キーの追加 |

### 変更不要
| ファイル | 理由 |
|---------|------|
| `frontend/src/components/editorv2/DocumentEditDialog.tsx` | 署名チェックボックスは既存実装済み |
| `frontend/src/components/encryption/EncryptionManagementModal.tsx` | 変更なし |

---

## 6. UIデザイン（SignatureManagementModal）

```
┌─────────────────────────────────────────────────┐
│ 電子署名管理: project_name               [×]    │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 署名状態                                    │ │
│ │                                             │ │
│ │ 現在の状態: ⚠️ 署名なし                      │ │
│ │ 最終署名日時: -                             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 操作                                        │ │
│ │                                             │ │
│ │ [📝 署名を実行]  [🗑️ 署名を削除(disabled)]  │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ⚠️ 注意事項                                      │
│ • 署名はDocument全体に適用されます              │
│ • 暗号化を実行すると署名が無効化されます        │
│ • 暗号化後は必ず再署名してください              │
│ • 署名を実行するとアーカイブファイルが作成されます│
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 7. 技術仕様

### SignatureStatus 型定義

```typescript
// frontend/src/types/signature.ts
export type SignatureStatusValue = 'none' | 'signed';

export interface SignatureStatus {
  status: SignatureStatusValue;
  signedAt?: string;  // ISO 8601形式 (例: "2026-06-25T15:00:00.000Z")
}
```

### スタブAPIの仕様

```typescript
// frontend/src/services/signatureService.ts
// ※ スタブ実装のため、実際のAPI呼び出しは行わない

getSignatureStatus(projectName: string): Promise<SignatureStatus>
// → { status: 'none' } を返す（500ms遅延）

applySignature(projectName: string): Promise<void>
// → 1000ms後に正常終了

removeSignature(projectName: string): Promise<void>
// → 500ms後に正常終了
```

### 翻訳キー

```json
// 追加するキー
{
  "signature": {
    "modalTitle": "電子署名管理",
    "statusSection": "署名状態",
    "operationSection": "操作",
    "currentStatus": "現在の状態",
    "lastSignedAt": "最終署名日時",
    "statusNone": "署名なし",
    "statusSigned": "署名済み",
    "buttonSign": "署名を実行",
    "buttonRemove": "署名を削除",
    "noticeTitle": "注意事項",
    "noticeItems": {
      "scope": "署名はDocument全体に適用されます",
      "encryptionWarning": "暗号化を実行すると署名が無効化されます",
      "reSignRequired": "暗号化後は必ず再署名してください",
      "archiveCreated": "署名を実行するとアーカイブファイルが作成されます"
    },
    "messageSignSuccess": "署名を実行しました",
    "messageSignError": "署名の実行に失敗しました",
    "messageRemoveSuccess": "署名を削除しました",
    "messageRemoveError": "署名の削除に失敗しました",
    "messageStatusError": "署名状態の取得に失敗しました",
    "buttonInProjectManagement": "電子署名"
  }
}
```

---

## 8. リスクと対策

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| ProjectManagement.tsxの構造が不明で修正箇所が多い | 中 | 中 | 実装前にファイルを詳細確認する |
| i18nキーの追加方法が既存と異なる可能性 | 低 | 低 | 既存の翻訳ファイル構造を確認してから追加 |
| スタブからリアルAPIへの移行時の型不一致 | 中 | 中 | 型定義を厳密に設計し、スタブも型準拠で実装 |

---

## 9. テスト計画（手動テスト）

- [ ] プロジェクト管理画面に [電子署名] ボタンが表示される
- [ ] プロジェクトを選択して [電子署名] をクリックするとモーダルが開く
- [ ] モーダルに「⚠️ 署名なし」の状態が表示される
- [ ] [署名を実行] をクリックすると、ローディング表示 → 「✅ 署名済み」に変わる
- [ ] [署名を削除] ボタンが有効になる
- [ ] [署名を削除] をクリックすると「⚠️ 署名なし」に戻る
- [ ] [署名を削除] が無効時（署名なし状態）はクリックできない
- [ ] 注意事項が正しく表示される
- [ ] [×] ボタンでモーダルが閉じる
- [ ] Document編集ダイアログの既存チェックボックスが引き続き動作する

---

## 10. 承認記録

- **計画書提示日時**: 2026-06-25 15:00
- **承認日時**: -（承認待ち）
- **承認者コメント**: -

---

## 11. 実施記録

### 実施日時
開始: -  
完了: -

### 変更点
（実施後に記録）
