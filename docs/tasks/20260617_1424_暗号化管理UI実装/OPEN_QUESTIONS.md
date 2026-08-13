# 暗号化管理UI実装 - 実装計画時の未解決疑問

作成日: 2026-06-17  
更新日: 2026-06-23  
背景: 暗号化管理UIの実装計画（6/17セッション）を進める中で決定できなかった仕様上の疑問をまとめたもの

---

## Q1. ツリーの表示粒度：タグベース vs 要素インスタンスベース

**発生状況**  
`parseMaimlToEncryptionTree.ts` の設計時、MAIMLのツリーをどの粒度で表示するか議論が発生。  
ユーザーから「結局タグのツリーになっていないか？」という指摘があった。

**疑問内容**  
現在の実装（タグインスタンスベース）と、ユーザーが期待しているかもしれない構造との比較：

```
【現状: タグインスタンスベース】
□ pnml
  □ place[@id='mat-001']          ← place 全体が1ノード
    □ property[@key='concentration']
    □ property[@key='secretFormula']
  □ transition[@id='trans-001']

【案B: 要素インスタンスベース】
□ pnml（Petri Net）                ← pnml はコンテナ（選択なし）
  □ material[@id='mat-001']        ← program > materialTemplate に対応する実データ
    □ property[@key='concentration']
    □ property[@key='secretFormula']
```

- タグインスタンスベースで正しいか？
- それとも `material/condition/result` のインスタンスレベルで表示すべきか？

**影響ファイル**  
`parseMaimlToEncryptionTree.ts`・`EncryptionTargetTree.tsx`

---

## Q2. `place/transition/arc` をツリーに表示するか

**発生状況**  
Petri Net構造要素（place/transition/arc）を暗号化対象ツリーに含めるかで議論が発生。  
暗号化対象としてユーザーが選べない要素をツリーに出すことで混乱するのでは？という懸念。

**3つの案**

| 案 | 内容 |
|----|------|
| **A（現状）** | place/transition/arc を表示するが `isEncryptable=false` でグレーアウト（選択不可） |
| **B** | place/transition/arc はツリーに表示しない（非表示） |
| **C** | place をコンテナとして表示し、配下の property だけ選択可能にする |

**影響ファイル**  
`parseMaimlToEncryptionTree.ts`（pnmlEl の place/transition/arc パース部分）

---

## Q3. チェックボックス（複数選択）を一括暗号化に使うか

**発生状況**  
`EncryptionTargetTree.tsx` にチェックボックスUIを追加したが、「これを何に使うか」が決まっていない状態で実装した。  
現状は `checkedPaths`（Set）で複数選択状態を保持しているだけで、暗号化実行は1要素ずつしか動いていない。

**疑問内容**  
- チェックボックスで選択した複数要素を **一括暗号化** する機能は必要か？
- 必要ない場合、チェックボックスUIを削除してクリック選択（1要素）のみにシンプル化するか？

**2つの案**

| 案 | 内容 |
|----|------|
| **A（シンプル）** | チェックボックスを削除。クリックで1要素選択して暗号化 |
| **B（一括）** | チェックボックスで複数選択 → 一括暗号化を実行 |

**影響ファイル**  
`EncryptionTargetTree.tsx`・`EncryptionManagement.tsx`・`encryptionService.ts`（APIのI/F）

---

## Q4. 復号化UIはこのモックに含めるか

**発生状況**  
PLAN.md に「復号化ダイアログ（DecryptionDialog）作成」が含まれているが、  
実装を進めながら「モック段階で復号化まで作るか？」という疑問が発生した。

**疑問内容**  
- 復号化専用のダイアログ（DecryptionDialog）を今回のモックに含めるか？
- 含める場合、どの画面フローにするか？
  - 案A: 暗号化設定パネルを兼用（現状: 「復号化を実行」ボタンのみ）
  - 案B: 暗号化済みノードを選択すると別モーダルが開く

**現状の実装状態**  
- 暗号化済みノード選択時 → `EncryptionConfigPanel` に「復号化を実行」ボタンが表示される
- ただし鍵入力UIは暗号化用のものを流用しているだけで、復号化専用UIはない

**影響ファイル**  
`EncryptionConfigPanel.tsx`・`EncryptionManagement.tsx`（`DecryptionDialog.tsx` は未実装）

---

## Q5. 複数チェック時の右ペイン表示

**発生状況**  
チェックボックスで複数要素を選べるUIがあるが、右ペイン（暗号化設定パネル）には何を表示すべきか未定。

**3つの案**

| 案 | 内容 |
|----|------|
| **A** | 「N個選択中」のサマリー表示 + 一括設定 |
| **B** | 最後にクリックした1要素のみ詳細表示（現状に近い） |
| **C** | チェックボックスを廃止してクリック選択のみ（Q3と連動） |

**影響ファイル**  
`EncryptionManagement.tsx`・`EncryptionConfigPanel.tsx`

---

## Q6. モック確認の方法

**発生状況**  
モックをどこで確認するかが決まっていないまま実装が進んだ。

**疑問内容**  
- 独立ページ（`/encryption?project=TEST`）で確認するか？
- プロジェクト管理画面（`ProjectManagement.tsx`）の「暗号化管理」ボタン → `EncryptionManagementModal` を経由して確認するか？
- フォールバック用の `public/mocks/Raman.maiml` は配置済みか？

**影響ファイル**  
`frontend/src/app/encryption/page.tsx`・`frontend/public/mocks/Raman.maiml`

---

## 決定状況まとめ

| # | 疑問 | 優先度 | 状態 |
|---|------|--------|------|
| Q1 | ツリーの表示粒度 | 🔴 高 | 未決定（案Aで暫定実装） |
| Q2 | place/transition/arcの表示 | 🔴 高 | 未決定（案Aで暫定実装） |
| Q3 | チェックボックス・一括暗号化 | 🔴 高 | 未決定（状態だけ持っている） |
| Q4 | 復号化UIの要否 | 🟡 中 | 未決定（ボタンのみ実装） |
| Q5 | 複数チェック時の右ペイン | 🟡 中 | 未決定（Q3に依存） |
| Q6 | モック確認の方法 | 🟢 低 | 未決定 |
