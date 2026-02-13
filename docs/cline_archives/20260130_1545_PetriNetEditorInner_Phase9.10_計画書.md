# PetriNetEditorInner Phase9.10 型エラー修正計画書

## 目的

Phase9.9で残った21件のPetriNetEditorInner.tsx固有の型エラーを、型定義の統一から段階的に修正します。

## 現状分析

### 残存エラー（21件）

```
line 435: setState の型不一致
line 865: string vs null
line 941: string | undefined vs string | null
line 1666: SetStateAction の型不一致
line 1732: undefined の可能性がある関数の呼び出し
line 3212: Date vs number
line 3487: TemplateData の型不一致
line 3559: Method[] vs MethodData[]
line 3601: "partial" vs SelectionMode
line 3618: "dots" vs BackgroundVariant
line 3654: TemplateRef vs Template
line 3667: NodeData vs Record<string, unknown>
line 3676: Method[] vs MethodInfo[]
line 3688: string | null vs string | undefined
line 3708: Node<NodeData> | null vs プレーンオブジェクト
line 3709: TemplateRef vs TemplateData
line 3710: Node<NodeData>[] vs プレーンオブジェクト配列
line 3730: DocumentData | null vs DocumentData | null | undefined
line 3732: DocumentData の関数シグネチャ
line 3738: ValidationResult の import パス不一致
line 3750: FileInfo の関数シグネチャ
```

## 実施計画

### Phase9.10.1: 型定義の統一（優先順位1）

#### Step1: Method関連の型統一（3件）
- **line 3559**: `Method[]` → `MethodData[]` に変換
- **line 3676**: `Method[]` → `MethodInfo[]` に変換
- 対応方法: 型アサーションまたは変換関数を使用

#### Step2: Template関連の型統一（2件）
- **line 3487**: `TemplateData` の型を確認して適切に変換
- **line 3654**: `TemplateRef` → `Template` に変換
- **line 3709**: `TemplateRef` → `TemplateData` に変換
- 対応方法: 型定義を確認して変換関数を追加

#### Step3: Node関連の型統一（2件）
- **line 3708**: `Node<NodeData> | null` → プレーンオブジェクトに変換
- **line 3710**: `Node<NodeData>[]` → プレーンオブジェクト配列に変換
- 対応方法: 変換関数を使用

#### Step4: ValidationResult の import パス統一（1件）
- **line 3738**: import パスを統一
- 対応方法: 正しい import パスを使用

### Phase9.10.2: null vs undefined の統一（優先順位2）

#### Step5: null/undefined の型修正（3件）
- **line 865**: `string` → `null` に対応
- **line 941**: `string | undefined` → `string | null` に統一
- **line 3688**: `string | null` → `string | undefined` に統一
- 対応方法: 条件分岐または型アサーションを使用

### Phase9.10.3: 関数シグネチャの修正（優先順位3）

#### Step6: コールバック関数の型修正（5件）
- **line 3667**: `NodeData` → `Record<string, unknown>` に変換
- **line 3732**: `DocumentData` の関数シグネチャを修正
- **line 3750**: `FileInfo` の関数シグネチャを修正（async/Promise対応）
- 対応方法: 型キャストまたは関数ラッパーを使用

#### Step7: setState関連の型修正（2件）
- **line 435**: setState の型を修正
- **line 1666**: SetStateAction の型を修正
- 対応方法: 正しい型定義を使用

#### Step8: その他の型修正（4件）
- **line 1732**: undefined チェックを追加
- **line 3212**: `Date` → `number` に変換（getTime()使用）
- **line 3601**: `"partial"` → `SelectionMode` の Union型に対応
- **line 3618**: `"dots"` → `BackgroundVariant` の Union型に対応
- **line 3730**: `DocumentData | null` の nullable を調整

## 実施順序

1. Phase9.10.1 Step1-4（型定義の統一: 8件）
2. Phase9.10.2 Step5（null/undefined: 3件）
3. Phase9.10.3 Step6-8（関数シグネチャ: 10件）

## 期待される成果

- PetriNetEditorInner.tsx固有の型エラーを21件削減
- 残りエラー: 0件（PetriNetEditorInner.tsx固有）

## リスク

- 型変換によって実行時エラーが発生する可能性
- 複雑な型修正により、さらなる型エラーが発生する可能性
- 一部のエラーは型定義ファイル自体の修正が必要になる可能性

## 対策

- 各修正後に型チェックを実行
- 変換関数を使用して安全に型変換
- 必要に応じて型定義ファイルも修正