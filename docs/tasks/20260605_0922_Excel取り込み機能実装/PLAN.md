# 実装方針書: Excel取り込み機能（実験データバッチインポート）

## メタデータ
- **作成日時**: 2026-06-05 09:22
- **タスクID**: Excel取り込み機能実装
- **優先度**: 中
- **推定工数**: 未定（検討段階）
- **ステータス**: 方針検討中

---

## 1. 概要

### 目的

MAIMLテンプレートに定義されたプロパティをExcelに出力し、ユーザーが各タスク回の実験値を記入した後に再度取り込む機能を実装する。

### 解決する課題

現状、実験データの記録はシステムUI上から1件ずつ入力する必要がある。  
N回分のタスクデータを一括で入力・インポートできる仕組みを提供することで、作業効率を大幅に改善する。

### 機能の全体フロー

```
[ダウンロード]
MAIMLテンプレート定義
    ↓
テンプレートのプロパティ定義を抽出
    ↓
タスク件数分の行を持つExcelを生成
    ↓
ユーザーがExcelをダウンロード

[ユーザー作業]
ユーザーがExcelを開き
各タスクのプロパティ値を記入
    ↓
Excelを保存

[アップロード]
Excelをシステムにアップロード
    ↓
「どのテンプレートのどのプロパティの何回目のタスクか」を判定
    ↓
バリデーション
    ↓
データを保存（template_dataテーブル）
```

---

## 2. 既存システムとの関係

### 関連する既存テーブル

| テーブル名 | 役割 |
|-----------|------|
| `template_data` | 実験データ（テンプレート実績）の保存先 |
| `project_task` | タスク情報（task_no等） |

### 関連する既存型定義

```typescript
// property_set JSONB の型（templateDataRepository.ts）
interface PropertySet {
  templateId: string;       // テンプレート識別
  templateType: 'material' | 'condition' | 'result';
  properties: Property[];   // プロパティ配列
}

// プロパティ型（maiml-unified.ts）
interface Property {
  key: string;              // プロパティ識別
  xsiType: string;          // データ型
  value: unknown;           // 値
  units: string | null;     // 単位
  properties?: Property[];  // 階層構造（ネスト可）
}
```

### 既存APIとの関係

| API | 用途 | 今回の追加機能との関係 |
|-----|------|----------------------|
| `GET /experiment/.../template-data` | 1件取得 | 参考として利用 |
| `POST /experiment/.../template-data` | 1件保存 | 一括版を新規追加 |
| 新規: `GET /experiment/.../download-excel` | Excelダウンロード | **新規追加** |
| 新規: `POST /experiment/.../upload-excel` | Excelアップロード | **新規追加** |

---

## 3. Excelフォーマット設計

### 3.1 推奨フォーマット: 横長 + メタデータ行方式

#### フォーマット構造

| 行番号 | 内容 | 備考 |
|--------|------|------|
| 1行目 | ヘッダー行 | ユーザーが見る列名（日本語OK） |
| 2行目 | **メタデータ行**（非表示） | システムが読む識別子情報 |
| 3行目以降 | データ行 | ユーザーが値を記入 |

#### ヘッダー行（1行目）の例

```
タスク番号 | 温度(°C) | 材料名 | 圧力(Pa) | 湿度(%) | コーティング
```

#### メタデータ行（2行目）の形式

```
_meta_ | MAT001#temperature#decimal#°C | MAT001#material#string# | MAT001#pressure#decimal#Pa | ...
```

- 区切り文字: `#`
- フォーマット: `{templateId}#{propertyKey}#{xsiType}#{units}`
- 1列目は固定値 `_meta_`（識別マーカー）
- unitsが空の場合は末尾 `#` の後に何も書かない

#### データ行（3行目以降）の例

```
1 | 25.5 | 炭素鋼 | 500 | 60 | あり
2 | 30.0 | ステンレス | 600 | 55 | なし
3 | 28.2 | アルミ | 550 | 62 | あり
```

#### ビジュアルイメージ

```
╔═══════════╦══════════╦════════════╦══════════╦═══════════╦══════════════╗
║ タスク番号 ║ 温度(°C)  ║ 材料名     ║ 圧力(Pa) ║  湿度(%)  ║ コーティング ║
╠═══════════╬══════════╬════════════╬══════════╬═══════════╬══════════════╣
║  _meta_   ║MAT001#..║ MAT001#.. ║ MAT001#..║ MAT001#.. ║  MAT001#..   ║  ← 非表示
╠═══════════╬══════════╬════════════╬══════════╬═══════════╬══════════════╣
║     1     ║   25.5   ║   炭素鋼   ║   500    ║    60     ║    あり      ║
╠═══════════╬══════════╬════════════╬══════════╬═══════════╬══════════════╣
║     2     ║          ║            ║          ║           ║              ║  ← 記入待ち
╠═══════════╬══════════╬════════════╬══════════╬═══════════╬══════════════╣
║     3     ║          ║            ║          ║           ║              ║  ← 記入待ち
╚═══════════╩══════════╩════════════╩══════════╩════════════╩══════════════╝
```

### 3.2 代替フォーマット案

#### 案B: 縦長フォーマット（Key-Value形式）

```
| タスクNo | templateId | templateType | propertyKey | propertyValue | units | xsiType |
|---------|-----------|-------------|-------------|---------------|-------|---------|
|    1    |  MAT001   |  material   | temperature |     25.5      |   °C  | decimal |
|    1    |  MAT001   |  material   |  material   |    炭素鋼     |       | string  |
|    2    |  MAT001   |  material   | temperature |     30.0      |   °C  | decimal |
```

**向いているケース**: プロパティが非常に多い場合、階層プロパティが複雑な場合

#### 案C: シート分割フォーマット

```
Sheet: material_MAT001    → Material テンプレートのデータ
Sheet: condition_COND001  → Condition テンプレートのデータ
Sheet: result_RES001      → Result テンプレートのデータ
Sheet: _metadata（隠し）  → テンプレート定義情報
```

**向いているケース**: 複数のテンプレートが関わる場合

### 3.3 フォーマット比較

| 観点 | 推奨（横長+メタデータ行） | 案B（縦長） | 案C（シート分割） |
|------|----------------------|------------|----------------|
| ユーザーの見やすさ | ◎ | △ | ○ |
| 実装の容易さ | ◎ | ○ | △ |
| 階層プロパティへの対応 | △（拡張必要） | ◎ | ○ |
| 複数テンプレート対応 | ○（列追加） | ◎ | ◎ |
| Excel手動編集のしやすさ | ◎ | △ | ○ |

---

## 4. 判定ロジック

### 4.1 テンプレート識別

メタデータ行の各セルから `templateId` を抽出する。

```
セル値: "MAT001#temperature#decimal#°C"
         ─────── ─────────────────────
         templateId  プロパティ情報
```

### 4.2 プロパティ識別

同じくメタデータ行から `propertyKey` を抽出する。

```
セル値: "MAT001#temperature#decimal#°C"
                ─────────── ─────── ────
                propertyKey xsiType units
```

### 4.3 タスク識別

データ行の1列目（タスク番号）を使用する。

```
行3 → タスク番号: 1
行4 → タスク番号: 2
行5 → タスク番号: 3
```

### 4.4 階層プロパティの識別（拡張案）

ネストされたプロパティの場合、propertyKey をドット区切りで表現する。

```
セル値: "MAT001#composition.element#string#"
                 ─────────────────────────
                 親.子のプロパティキー
```

### 4.5 メタデータ行の検証

アップロード時にメタデータ行の整合性を確認する。

```typescript
function validateMetadataRow(metaRow: string[]): ValidationResult {
  if (metaRow[0] !== '_meta_') {
    return { valid: false, error: 'メタデータ行が見つかりません' };
  }
  for (const cell of metaRow.slice(1)) {
    const parts = cell.split('#');
    if (parts.length < 3) {
      return { valid: false, error: `不正なメタデータ形式: ${cell}` };
    }
  }
  return { valid: true };
}
```

---

## 5. 実装ステップ（フェーズ別）

### Phase 1: Excelダウンロード機能

- [ ] `xlsx` ライブラリの追加（バックエンド）
- [ ] `ExcelGeneratorService` の作成
  - MAIMLParserTypedを使ったテンプレート定義の抽出
  - ヘッダー行・メタデータ行の生成
  - タスク件数分のデータ行（空行）生成
  - Excelファイル生成とバッファ返却
- [ ] コントローラー層にダウンロードエンドポイント追加
- [ ] APIルート追加
- [ ] フロントエンド: ダウンロードボタンの実装

### Phase 2: Excelアップロード機能

- [ ] `ExcelParserService` の作成
  - Excelファイルのパース
  - メタデータ行の読み取りと検証
  - データ行のパースと変換
  - `TemplateDataRecord[]` 形式への変換
- [ ] バリデーション処理の実装
  - xsiTypeに応じた型チェック
  - 必須プロパティチェック
  - タスク番号の重複チェック
- [ ] コントローラー層にアップロードエンドポイント追加
- [ ] APIルート追加（multer設定含む）
- [ ] フロントエンド: アップロードダイアログの実装

### Phase 3: エラーハンドリング強化

- [ ] 行単位のエラー情報返却
- [ ] 部分成功時の処理方針決定
- [ ] エラーメッセージのローカライズ（日本語/英語）

### Phase 4: 拡張対応（将来）

- [ ] 階層プロパティへの対応
- [ ] 複数テンプレートの同時取り込み
- [ ] 大容量データの対応（バッチ処理）

---

## 6. 影響範囲

### 新規作成ファイル

| ファイル | 用途 |
|---------|------|
| `backend/src/services/excelGeneratorService.ts` | Excel生成ロジック |
| `backend/src/services/excelParserService.ts` | Excelパースロジック |
| `frontend/src/components/ExperimentDataImport/ExcelUploadDialog.tsx` | アップロードUI |
| `frontend/src/components/ExperimentDataImport/ExcelDownloadButton.tsx` | ダウンロードUI |

### 修正ファイル

| ファイル | 変更内容 |
|---------|---------|
| `backend/src/controllers/experimentController.ts` | エンドポイント追加 |
| `backend/src/routes/experimentRoutes.ts` | ルート追加 |
| `backend/package.json` | xlsxライブラリ追加 |
| `frontend/src/services/experimentService.ts` | API呼び出し追加 |

---

## 7. リスク分析

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| メタデータ行が削除・改変される | 高 | 中 | 検証エラーで取り込みを拒否し、再ダウンロードを促す |
| 階層プロパティへの対応 | 中 | 中 | フェーズ4として別途対応 |
| 大容量ファイル（1000件超） | 中 | 低 | バッファ処理・バッチインサート対応 |
| タスク番号の不整合 | 高 | 中 | タスク番号の存在チェックと範囲チェック |
| Excelの文字エンコード問題 | 低 | 低 | xlsxライブラリが自動処理 |

---

## 8. セキュリティ考慮事項

- [ ] ファイルサイズ制限（推奨: 最大10MB）
- [ ] ファイル形式チェック（`.xlsx`、`.xls` のみ許可）
- [ ] マルチテナント分離（organization_id の必須チェック）
- [ ] 権限チェック（Worker以上のロールが必要）
- [ ] XXE（XML外部エンティティ）攻撃への対策（xlsxライブラリが処理）

---

## 9. テスト計画

### ユニットテスト

- [ ] ExcelGeneratorService: テンプレートからExcel生成テスト
- [ ] ExcelParserService: Excel → TemplateDataRecord変換テスト
- [ ] バリデーション: 各種エラーケーステスト

### 統合テスト

- [ ] ダウンロード → 記入 → アップロードの一連フロー
- [ ] 不正なExcelアップロード時のエラーレスポンス確認

---

## 10. 関連ドキュメント

- [設計書（技術詳細）](./design.md)
- [サンプルテンプレート説明書](./samples/README.md)
- [template_data DDL](../../docs/design/db/ddl/template_data.sql)
- [ExcelGeneratorService コード例](./design.md#excelgeneratorservice)
- [ExcelParserService コード例](./design.md#excelparserservice)
