# 技術設計書: Excel取り込み機能

## 1. API仕様

### 1.1 Excelダウンロード

```
GET /api/v1/experiment/:projectId/method/:methodId/template-data/download-excel
```

**クエリパラメータ**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `taskCount` | number | ✓ | 出力するタスク件数（行数） |
| `templateIds` | string | × | カンマ区切りのテンプレートID絞り込み（省略時は全テンプレート） |

**レスポンス**

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="experiment_data_YYYYMMDD_HHmmss.xlsx"
Body: <Excelバイナリ>
```

---

### 1.2 Excelアップロード

```
POST /api/v1/experiment/:projectId/method/:methodId/template-data/upload-excel
Content-Type: multipart/form-data
```

**リクエスト**

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `file` | File | ✓ | .xlsxまたは.xlsファイル |
| `overwrite` | boolean | × | 既存データの上書き（デフォルト: false） |

**レスポンス（成功）**

```json
{
  "success": true,
  "data": {
    "totalRows": 10,
    "successCount": 10,
    "errorCount": 0,
    "errors": []
  },
  "meta": {
    "timestamp": "2026-06-05T09:22:00.000Z",
    "requestId": "xxx-xxx-xxx"
  }
}
```

**レスポンス（部分エラー）**

```json
{
  "success": false,
  "data": {
    "totalRows": 10,
    "successCount": 8,
    "errorCount": 2,
    "errors": [
      {
        "row": 4,
        "taskNo": 2,
        "field": "temperature",
        "message": "数値を入力してください"
      },
      {
        "row": 7,
        "taskNo": 5,
        "field": "pressure",
        "message": "必須項目が未入力です"
      }
    ]
  }
}
```

---

## 2. Excelフォーマット仕様

### 2.1 シート構成

| シート名 | 役割 | 表示 |
|---------|------|------|
| `_info` | プロジェクト・メソッド識別情報 | **非表示**（システム管理） |
| `{templateId}` | テンプレートごとのデータ入力シート | 表示 |

**`_info` シートの内容**:

| 行 | キー | 説明 |
|----|------|------|
| 1 | ヘッダー（項目/値） | — |
| 2 | `projectId` | プロジェクトID |
| 3 | `projectName` | プロジェクト名 |
| 4 | `methodId` | メソッドID |
| 5 | `methodName` | メソッド名 |
| 6 | `generatedAt` | ファイル生成日時（ISO8601） |
| 7 | `formatVersion` | フォーマットバージョン（`2`） |

**用途**: アップロード時に `projectId` / `methodId` とリクエストのURLパラメータを照合することで、**誤ったプロジェクト・メソッドへの取り込みを防止**できる。

**テンプレートシートの命名**: `{templateId}`（例: `MAT001`、`COND001`、`RES001`）
→ シート名 = テンプレートID。どのテンプレートのデータかはシート名で一意に識別できる。

### 2.2 各データシートの行構成（v3: 属性行分離フォーマット）

属性ごとに行を分けることで、**ユーザーが列を追加する際に各行に値を記入するだけで済む**。`#` 区切りの複雑な文字列は不要。

A列ラベルは `docs/design/maiml/maiml-property.xsd`（maiml-property.xsd）の属性名・要素名に準拠する。

| 行番号 | A列ラベル | XSD対応 | 内容 | 表示 |
|--------|---------|---------|------|------|
| 1 | `key` | `uncertaintyBaseType/@key`（`xs:QName`, required） | プロパティキー | **表示** |
| 2 | `xsi:type` | 各 complexType の `xsi:type` 属性 | プロパティの型 | **表示** |
| 3 | `units` | 数値型の `@units`（`xs:string`） | 単位 | **表示** |
| 4 | `formatString` | 数値型の `@formatString` | フォーマット文字列 | **表示** |
| 5 | `description` | 各 complexType の子要素 `<description>`（`xs:string`） | 説明名（型・単位付き） | **表示** |
| 6〜N | （空白） | 各タスクのデータ行（ユーザー記入欄） | **表示** |

**全行表示**（非表示なし）: ユーザーが列を追加する際に各行を直接参照・記入できるようにする。

---

### 2.3 各行の仕様

#### `_key_` 行（行1・非表示）

| セル | 内容 |
|------|------|
| A1 | 固定値: `_key_` |
| B1以降 | `propertyKey`（MAIMLテンプレートのプロパティ識別子） |

- テンプレートから生成した列はMAIMLの `propertyKey`
- **ユーザーが追加した列**: 任意のキーを記入（英数字・アンダースコア推奨）
- A列（`_key_`）はシステム予約のため空欄不可

#### `_xsitype_` 行（行2・非表示）

| セル | 内容 |
|------|------|
| A2 | 固定値: `_xsitype_` |
| B2以降 | xsi:type 値 |

**xsiTypeの値一覧**:

| 値 | 説明 | 入力例 |
|----|------|--------|
| `decimal` | 小数を含む数値 | `25.5` |
| `integer` | 整数 | `100` |
| `string` | テキスト | `炭素鋼` |
| `boolean` | 真偽値 | `true` / `false` |
| `propertyListType` | リスト型（Phase4対応） | — |

- テンプレートから生成した列はMAIMLの `xsi:type` を自動設定
- **ユーザーが追加した列**: `string` / `decimal` / `integer` / `boolean` のいずれかを記入
- 空欄の場合: `string` として扱う

#### `_units_` 行（行3・非表示）

| セル | 内容 |
|------|------|
| A3 | 固定値: `_units_` |
| B3以降 | 単位（例: `°C`、`Pa`、`%`）/ 単位なしは空欄 |

#### `_formatstr_` 行（行4・非表示）

| セル | 内容 |
|------|------|
| A4 | 固定値: `_formatstr_` |
| B4以降 | フォーマット文字列（例: `000-999`）/ なしは空欄 |

#### `_desc_` 行（行5・**表示**）

| セル | 内容 |
|------|------|
| A5 | 固定値: `_desc_` |
| B5以降 | 説明・表示名（ユーザー向け。テンプレートの `<name>` タグ値を自動設定）|

- **この行はユーザーに見える**。入力時の手がかりとして表示する
- テンプレートに `<name>` タグがない場合: `propertyKey` をそのまま設定
- **ユーザーが追加した列**: 任意の説明を記入（省略可）

#### データ行（行6以降・表示）

| セル | 内容 |
|------|------|
| A列 | タスク番号（1, 2, 3, ... N）。生成時に自動入力 |
| B列以降 | 各プロパティの値（ユーザーが記入） |

---

### 2.4 シートの見た目（例）

```
シート: material_MAT001

     A           B                  C          D           E         F           G
1  _key_       temperature        material    pressure    humidity  coating     batch_no       ← 非表示
2  _xsitype_   decimal            string      decimal     decimal   boolean     integer        ← 非表示
3  _units_     °C                             Pa          %                                    ← 非表示
4  _formatstr_                                                                  000-999        ← 非表示
5  _desc_      温度               材料名       圧力        湿度      コーティング バッチ番号     ← 表示
6  1           25.5               炭素鋼       500         60        true        001
7  2           30.0               ステンレス   600         55        false       002
8  3           （空欄）           （空欄）     （空欄）    （空欄）  （空欄）     （空欄）
```

**ユーザーが列を追加する場合**（右端に追記するだけ）:
```
     H
1  my_custom_key      ← _key_ 行に追記
2  string             ← _xsitype_ 行に追記
3                     ← _units_ 行（空欄でOK）
4                     ← _formatstr_ 行（空欄でOK）
5  カスタム項目       ← _desc_ 行に追記（省略可）
6  サンプルA          ← データ記入
```

---

### 2.5 データ行の仕様

| セル位置 | 内容 |
|---------|------|
| A列 | タスク番号（1, 2, 3, ... N） |
| B列以降 | 各プロパティの値（ユーザーが記入） |

タスク番号は生成時点で1〜Nまで自動入力する。  
値はユーザーが記入する（生成時は空欄）。

**各シートのタスク番号は共通**: 同じタスクのデータを複数テンプレートのシートに分けて記入するが、タスク番号は全シートで同一の連番を使用する。

---

### 2.6 xsiTypeの入力ガイド行（_desc_ 行への反映）

`_desc_` 行はユーザーに表示されるため、説明名に加えて型・単位情報も付加して入力者の手がかりにする。

**生成時のフォーマット**:
```
{description または propertyKey}
  ↓ 型・単位情報を付加
{description}（{units}）[{xsiType}]
```

**例**:
```
_desc_ 行:
  temperature → 温度（°C）[decimal]
  material    → 材料名[string]
  batch_no    → バッチ番号[integer] [000-999]
```

→ ユーザーはこの行を見れば入力すべき型・単位・フォーマットが一目でわかる。

---

### 2.6 識別情報の判定マッピング

アップロードされたExcelから「どのプロジェクト・メソッド・テンプレート・プロパティ・タスクか」を以下の手順で特定する。

| 判定項目 | 取得元 | 補足 |
|---------|--------|------|
| **どのプロジェクト** | `_info` シートの `projectId` | URLパラメータと照合してミス防止 |
| **どのメソッド** | `_info` シートの `methodId` | URLパラメータと照合してミス防止 |
| **どのテンプレート** | シート名 (`material_MAT001`) + メタデータ行の `templateId` / `templateType` | シート名とメタデータの二重保持で冗長性確保 |
| **どのプロパティ** | メタデータ行の `propertyKey` | ヘッダー行は表示用のため、システムはメタデータ行を使用 |
| **何回目のタスク** | データ行の「タスク番号」列 | 全テンプレートシートで共通の連番 |

**アップロード時の照合ロジック**:

```typescript
// _info シートから projectId / methodId を読み取り、URLパラメータと照合
const infoSheet = workbook.Sheets['_info'];
if (infoSheet) {
  const infoData = XLSX.utils.sheet_to_json(infoSheet, { header: 1 }) as string[][];
  const infoMap = Object.fromEntries(infoData.slice(1).map(row => [row[0], row[1]]));

  if (infoMap['projectId'] && infoMap['projectId'] !== projectId) {
    errors.push({
      row: 0, taskNo: null, field: null,
      message: `このExcelは別のプロジェクト (${infoMap['projectId']}) 向けに生成されています。正しいプロジェクトのExcelを使用してください。`,
    });
    return { records, errors };
  }
  if (infoMap['methodId'] && infoMap['methodId'] !== methodId) {
    errors.push({
      row: 0, taskNo: null, field: null,
      message: `このExcelは別のメソッド (${infoMap['methodId']}) 向けに生成されています。正しいメソッドのExcelを使用してください。`,
    });
    return { records, errors };
  }
}
```

---

## 3. 実装コード例

### 3.1 ライブラリ追加

```bash
# バックエンド
npm install xlsx
npm install @types/xlsx --save-dev
```

---

### 3.2 ExcelGeneratorService

```typescript
// backend/src/services/excelGeneratorService.ts

import * as XLSX from 'xlsx';
import type { Template } from '../types/maiml-unified';
import { MaimlParserTyped } from '../utils/maimlParserTyped';

/**
 * Excel列のメタデータ定義
 */
export interface ExcelColumnMeta {
  templateId: string;
  propertyKey: string;
  xsiType: string;
  units: string | null;
  displayName: string;
}

/**
 * Excel生成サービス
 * MAIMLテンプレートからExcelファイルを生成する
 */
export class ExcelGeneratorService {

  /**
   * テンプレートデータ出力用のExcelを生成する
   *
   * @param maimlContent - MAIMLファイルのXML文字列
   * @param taskCount    - 出力するタスク件数
   * @param templateIds  - 絞り込むテンプレートID（省略時は全テンプレート）
   * @returns Excelファイルのバッファ
   */
  generateExcel(
    maimlContent: string,
    taskCount: number,
    templateIds?: string[]
  ): Buffer {
    // 1. MAIMLからテンプレート定義を抽出
    const parser = new MaimlParserTyped(maimlContent);
    const allTemplates = parser.getTemplates();

    // 2. 対象テンプレートを収集（material → condition → result の順）
    const targetTemplates: Array<{ template: Template; templateType: string }> = [];
    const categories: Array<'material' | 'condition' | 'result'> = ['material', 'condition', 'result'];

    for (const category of categories) {
      for (const tmpl of allTemplates[category]) {
        if (!templateIds || templateIds.includes(tmpl.id)) {
          targetTemplates.push({ template: tmpl, templateType: category });
        }
      }
    }

    // 3. 列メタデータの生成（各テンプレートの各プロパティを1列ずつ）
    const columnMetaList: ExcelColumnMeta[] = [];

    for (const { template, templateType } of targetTemplates) {
      for (const prop of template.properties || []) {
        // propertyListType（階層プロパティ）はフラット展開（将来拡張）
        if (prop.xsiType === 'propertyListType') {
          // TODO: Phase4で対応 - 現時点ではスキップ
          continue;
        }
        columnMetaList.push({
          templateId: template.id,
          propertyKey: prop.key,
          xsiType: prop.xsiType || 'string',
          units: prop.units || null,
          displayName: this.buildDisplayName(prop.key, prop.units),
        });
      }
    }

    // 4. 行データの生成
    const headerRow = ['タスク番号', ...columnMetaList.map(m => m.displayName)];
    const metaRow = [
      '_meta_',
      ...columnMetaList.map(m =>
        `${m.templateId}#${m.propertyKey}#${m.xsiType}#${m.units || ''}`
      ),
    ];
    const dataRows = Array.from({ length: taskCount }, (_, i) => [
      i + 1, // タスク番号
      ...Array(columnMetaList.length).fill(''), // 空欄
    ]);

    // 5. ワークシート生成
    const worksheetData = [headerRow, metaRow, ...dataRows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // 6. メタデータ行（2行目）を非表示にする
    if (!worksheet['!rows']) worksheet['!rows'] = [];
    worksheet['!rows'][1] = { hidden: true };

    // 7. 列幅の設定
    worksheet['!cols'] = [
      { wch: 12 }, // タスク番号列
      ...columnMetaList.map(() => ({ wch: 18 })), // データ列
    ];

    // 8. ヘッダー行のスタイル（太字・背景色）
    // ※ xlsxのコミュニティ版はスタイル非対応のため、xlsx-styleが必要な場合は別途検討

    // 9. ワークブック生成
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'data');

    // 10. バッファ出力
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    return buffer;
  }

  /**
   * 表示用のカラム名を生成する（v2フォーマット）
   * 例: temperature, decimal, °C          → "temperature(°C)[decimal]"
   *     material,    string,  null         → "material[string]"
   *     batch_no,    integer, null, 000-999 → "batch_no[integer] [000-999]"
   */
  private buildDisplayName(
    propertyKey: string,
    xsiType: string,
    units?: string | null,
    formatString?: string | null
  ): string {
    let label = propertyKey;
    if (units) label += `(${units})`;
    label += `[${xsiType}]`;
    if (formatString) label += ` [${formatString}]`;
    return label;
  }
}
```

---

### 3.3 ExcelParserService

```typescript
// backend/src/services/excelParserService.ts

import * as XLSX from 'xlsx';
import type { TemplateDataRecord, PropertySet } from '../repositories/templateDataRepository';
import type { Property } from '../types/maiml-unified';

/**
 * メタデータ列の定義
 */
interface ColumnMeta {
  templateId: string;
  propertyKey: string;
  xsiType: string;
  units: string | null;
}

/**
 * パース結果
 */
export interface ExcelParseResult {
  records: TemplateDataRecord[];
  errors: ExcelParseError[];
}

/**
 * パースエラー
 */
export interface ExcelParseError {
  row: number;
  taskNo: number | null;
  field: string | null;
  message: string;
}

/**
 * Excel取り込みサービス
 * UploadされたExcelファイルをTemplateDataRecord[]に変換する
 */
export class ExcelParserService {

  /**
   * ExcelバッファをTemplateDataRecord[]に変換する
   *
   * @param buffer     - アップロードされたExcelファイルのバッファ
   * @param projectId  - プロジェクトID
   * @param methodId   - メソッドID
   * @returns パース結果（records + errors）
   */
  parseExcel(
    buffer: Buffer,
    projectId: string,
    methodId: string
  ): ExcelParseResult {
    const records: TemplateDataRecord[] = [];
    const errors: ExcelParseError[] = [];

    // 1. Excelを読み込む
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.includes('data')
      ? 'data'
      : workbook.SheetNames[0];

    if (!sheetName) {
      errors.push({ row: 0, taskNo: null, field: null, message: 'Excelにシートが存在しません' });
      return { records, errors };
    }

    const worksheet = workbook.Sheets[sheetName];

    // 2. 2次元配列に変換（空白セルも含める）
    const rawData: unknown[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',     // 空セルをデフォルト値'' で埋める
      blankrows: false,
    }) as unknown[][];

    if (rawData.length < 2) {
      errors.push({ row: 0, taskNo: null, field: null, message: 'データが不足しています（ヘッダー行とメタデータ行が必要）' });
      return { records, errors };
    }

    // 3. メタデータ行（2行目）を読み取る
    const metaRow = rawData[1] as string[];
    const metaValidation = this.validateMetadataRow(metaRow);
    if (!metaValidation.valid) {
      errors.push({ row: 2, taskNo: null, field: null, message: metaValidation.error! });
      return { records, errors };
    }

    // 4. 列メタデータを解析する
    const columnMetaList: (ColumnMeta | null)[] = metaRow.slice(1).map((cell, idx) => {
      if (!cell || cell === '') return null;
      const parts = String(cell).split('#');
      if (parts.length < 3) {
        errors.push({
          row: 2,
          taskNo: null,
          field: `列${idx + 2}`,
          message: `メタデータ形式が不正です: "${cell}" (期待形式: templateId#propertyKey#xsiType#units)`,
        });
        return null;
      }
      return {
        templateId: parts[0],
        propertyKey: parts[1],
        xsiType: parts[2],
        units: parts[3] !== undefined && parts[3] !== '' ? parts[3] : null,
      };
    });

    if (errors.length > 0) return { records, errors };

    // 5. データ行（3行目以降）を処理する
    const dataRows = rawData.slice(2);

    for (let i = 0; i < dataRows.length; i++) {
      const excelRow = i + 3; // Excel上の行番号
      const row = dataRows[i] as unknown[];

      // タスク番号を取得
      const taskNoRaw = row[0];
      const taskNo = Number(taskNoRaw);
      if (isNaN(taskNo) || taskNo <= 0) {
        errors.push({
          row: excelRow,
          taskNo: null,
          field: 'タスク番号',
          message: `タスク番号が不正です: "${taskNoRaw}"`,
        });
        continue;
      }

      // テンプレートごとにグループ化
      const templateGroups = new Map<string, {
        templateId: string;
        properties: Property[];
      }>();

      for (let colIdx = 0; colIdx < columnMetaList.length; colIdx++) {
        const meta = columnMetaList[colIdx];
        if (!meta) continue;

        const cellValue = row[colIdx + 1]; // 1列目はタスク番号なのでoffset+1

        // 値の型変換とバリデーション
        const convertResult = this.convertValue(cellValue, meta.xsiType, meta.propertyKey, excelRow);
        if (convertResult.error) {
          errors.push({
            row: excelRow,
            taskNo,
            field: meta.propertyKey,
            message: convertResult.error,
          });
          continue;
        }

        // テンプレートグループに追加
        if (!templateGroups.has(meta.templateId)) {
          templateGroups.set(meta.templateId, {
            templateId: meta.templateId,
            properties: [],
          });
        }
        templateGroups.get(meta.templateId)!.properties.push({
          key: meta.propertyKey,
          xsiType: meta.xsiType,
          value: convertResult.value,
          units: meta.units,
        });
      }

      // TemplateDataRecord に変換
      for (const [templateId, group] of templateGroups.entries()) {
        const record: TemplateDataRecord = {
          placeId: templateId, // ※ place_id は templateId と紐付ける（設計上の判断が必要）
          propertySet: {
            templateId: group.templateId,
            templateType: 'material', // ※ 本来はメタデータから取得（TODO）
            properties: group.properties,
          } as PropertySet,
        };
        records.push(record);
      }
    }

    return { records, errors };
  }

  /**
   * メタデータ行の検証
   */
  private validateMetadataRow(metaRow: unknown[]): { valid: boolean; error?: string } {
    if (!metaRow || metaRow.length === 0) {
      return { valid: false, error: 'メタデータ行が空です' };
    }
    if (String(metaRow[0]) !== '_meta_') {
      return {
        valid: false,
        error: `メタデータ行の識別子が不正です。Excelは必ずシステムからダウンロードしたファイルを使用してください。（期待値: "_meta_", 実際: "${metaRow[0]}"）`,
      };
    }
    return { valid: true };
  }

  /**
   * セル値をxsiTypeに応じた型に変換する
   */
  private convertValue(
    cellValue: unknown,
    xsiType: string,
    propertyKey: string,
    row: number
  ): { value: unknown; error?: string } {
    const strValue = String(cellValue ?? '').trim();

    switch (xsiType) {
      case 'decimal':
      case 'float':
      case 'double': {
        if (strValue === '') return { value: null }; // 空欄は許容（必須チェックは別途）
        const num = parseFloat(strValue);
        if (isNaN(num)) {
          return { value: null, error: `行${row}: "${propertyKey}" は数値を入力してください（入力値: "${strValue}"）` };
        }
        return { value: num };
      }
      case 'integer':
      case 'int':
      case 'long': {
        if (strValue === '') return { value: null };
        const num = parseInt(strValue, 10);
        if (isNaN(num)) {
          return { value: null, error: `行${row}: "${propertyKey}" は整数を入力してください（入力値: "${strValue}"）` };
        }
        return { value: num };
      }
      case 'boolean': {
        if (strValue === '') return { value: null };
        const lower = strValue.toLowerCase();
        if (['true', '1', 'yes', 'はい'].includes(lower)) return { value: true };
        if (['false', '0', 'no', 'いいえ'].includes(lower)) return { value: false };
        return { value: null, error: `行${row}: "${propertyKey}" はtrue/falseを入力してください（入力値: "${strValue}"）` };
      }
      case 'string':
      default:
        return { value: strValue };
    }
  }
}
```

---

### 3.4 コントローラー層への追加

```typescript
// backend/src/controllers/experimentController.ts への追加分

import { ExcelGeneratorService } from '../services/excelGeneratorService';
import { ExcelParserService } from '../services/excelParserService';

/**
 * 実験データテンプレートExcelダウンロード
 *
 * GET /api/v1/experiment/:projectId/method/:methodId/template-data/download-excel
 */
export const downloadTemplateDataExcel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId } = req.user!;
    const { projectId, methodId } = req.params;
    const taskCount = Number(req.query.taskCount) || 10;
    const templateIds = req.query.templateIds
      ? String(req.query.templateIds).split(',')
      : undefined;

    // MAIMLファイルをストレージから取得
    const storageService = getStorageService();
    const maimlBuffer = await storageService.downloadFile(
      organizationId,
      `projects/${projectId}/${projectId}.maiml`
    );
    const maimlContent = maimlBuffer.toString('utf-8');

    // Excel生成
    const generator = new ExcelGeneratorService();
    const excelBuffer = generator.generateExcel(maimlContent, taskCount, templateIds);

    // ファイル名生成
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    const filename = `experiment_data_${timestamp}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);

  } catch (error) {
    console.error('Excel download error:', error);
    res.status(500).json({ success: false, error: { code: 'E4001', message: 'Excelの生成に失敗しました' } });
  }
};

/**
 * 実験データExcelアップロード
 *
 * POST /api/v1/experiment/:projectId/method/:methodId/template-data/upload-excel
 */
export const uploadTemplateDataExcel = async (req: Request, res: Response): Promise<void> => {
  try {
    const { organizationId, userId } = req.user!;
    const { projectId, methodId } = req.params;

    if (!req.file) {
      res.status(400).json({ success: false, error: { code: 'E1003', message: 'Excelファイルが必要です' } });
      return;
    }

    // Excelパース
    const parser = new ExcelParserService();
    const { records, errors } = parser.parseExcel(req.file.buffer, projectId, methodId);

    if (errors.length > 0 && records.length === 0) {
      // 全件エラーの場合
      res.status(400).json({
        success: false,
        data: {
          totalRows: 0,
          successCount: 0,
          errorCount: errors.length,
          errors,
        },
      });
      return;
    }

    // template_data テーブルへの一括保存（省略: 既存のexperimentDataServiceを利用）
    // await experimentDataService.bulkSaveTemplateData(organizationId, projectId, methodId, records, userId);

    res.json({
      success: errors.length === 0,
      data: {
        totalRows: records.length + errors.length,
        successCount: records.length,
        errorCount: errors.length,
        errors,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || uuidv4(),
      },
    });

  } catch (error) {
    console.error('Excel upload error:', error);
    res.status(500).json({ success: false, error: { code: 'E4001', message: 'Excelの取り込みに失敗しました' } });
  }
};
```

---

### 3.5 ルート追加

```typescript
// backend/src/routes/experimentRoutes.ts への追加分

import multer from 'multer';

// Excelアップロード用 multer 設定
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 最大10MB
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel',                                            // .xls
    ];
    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/)) {
      cb(null, true);
    } else {
      cb(new Error('ExcelファイルのみアップロードできますExcel'));
    }
  },
});

// ダウンロードエンドポイント
router.get(
  '/:projectId/method/:methodId/template-data/download-excel',
  authMiddleware,
  experimentController.downloadTemplateDataExcel
);

// アップロードエンドポイント
router.post(
  '/:projectId/method/:methodId/template-data/upload-excel',
  authMiddleware,
  excelUpload.single('file'),
  experimentController.uploadTemplateDataExcel
);
```

---

### 3.6 フロントエンド実装例

```typescript
// frontend/src/services/experimentService.ts への追加分

/**
 * 実験データテンプレートExcelをダウンロードする
 */
export async function downloadTemplateDataExcel(
  projectId: string,
  methodId: string,
  taskCount: number,
  templateIds?: string[]
): Promise<void> {
  const params = new URLSearchParams({ taskCount: String(taskCount) });
  if (templateIds && templateIds.length > 0) {
    params.set('templateIds', templateIds.join(','));
  }

  const response = await fetch(
    `/api/v1/experiment/${projectId}/method/${methodId}/template-data/download-excel?${params}`,
    { method: 'GET', credentials: 'include' }
  );

  if (!response.ok) throw new Error('Excelのダウンロードに失敗しました');

  // ブラウザでファイル保存
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `experiment_data_${Date.now()}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 実験データExcelをアップロードする
 */
export async function uploadTemplateDataExcel(
  projectId: string,
  methodId: string,
  file: File
): Promise<{ successCount: number; errorCount: number; errors: ExcelParseError[] }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `/api/v1/experiment/${projectId}/method/${methodId}/template-data/upload-excel`,
    { method: 'POST', body: formData, credentials: 'include' }
  );

  const result = await response.json();
  if (!result.success && result.data?.errorCount === result.data?.totalRows) {
    throw new Error(result.error?.message || 'アップロードに失敗しました');
  }
  return result.data;
}
```

---

## 4. エッジケース対応

### 4.1 メタデータ行が消された場合

**症状**: ユーザーがExcelを加工中に2行目を削除してしまう

**対応**: アップロード時に `_meta_` の検出に失敗した場合、エラーを返す
```
エラー: メタデータ行の識別子が不正です。
       Excelは必ずシステムからダウンロードしたファイルを使用してください。
```

---

### 4.2 プロパティ値が空欄の場合

**対応方針（推奨）**:
- 空欄 → `null` として保存
- 必須プロパティが空欄の場合はエラー（将来の拡張）

---

### 4.3 タスク番号が順不同または重複している場合

**対応方針**:
- 重複タスク番号はエラー
- 順不同はそのまま処理（task_no の順序は問わない）

```typescript
const seenTaskNos = new Set<number>();
if (seenTaskNos.has(taskNo)) {
  errors.push({ row: excelRow, taskNo, field: 'タスク番号', message: `タスク番号 ${taskNo} が重複しています` });
  continue;
}
seenTaskNos.add(taskNo);
```

---

### 4.4 複数テンプレートが混在している場合（横長フォーマット）

MAT001（material）と COND001（condition）が同じExcelに並ぶケース:

```
タスク番号 | 温度(°C)[MAT001] | 材料名[MAT001] | pH[COND001] | 湿度(%)[COND001]
_meta_    | MAT001#temp#..  | MAT001#mat#..  | COND001#pH#.. | COND001#hum#..
1         | 25.5            | 炭素鋼          | 7.2           | 60
```

→ メタデータの `templateId` が異なる列は別の `TemplateDataRecord` として生成する

---

### 4.5 テンプレートにない項目を後から追加する場合

**設計上の挙動**:

アップロード時のパーサーは **MAIML テンプレートを参照せず、メタデータ行（2行目）だけを読んで列を処理する**。そのため、以下の挙動になる。

| ケース | 挙動 |
|--------|------|
| テンプレートから生成した列 | 正常に取り込まれる |
| メタデータ行が空の列 | スキップ（無視） |
| ユーザーが追加した列（メタデータ行あり・形式正しい） | **取り込まれる** ✅ |
| ユーザーが追加した列（メタデータ行なし） | スキップ（無視） |

→ **テンプレートにない項目も「メタデータ行を正しく記入すれば」取り込み可能**。

**課題**: メタデータ行（`templateId#templateType#propertyKey#xsiType#units#formatString`）をユーザーが手書きで記入するのは困難。

**推奨対応（将来の拡張）**:

| 対応案 | 内容 |
|--------|------|
| **案A: UIで列追加をサポート** | ダウンロード画面で「列を追加」操作を提供し、フォームから propertyKey・xsiType・units を入力 → メタデータ行を自動生成してExcelを再ダウンロード |
| **案B: アップロード時に手動マッピング** | 未知の列を検出した際にUIでマッピングを問い合わせる（「この列はどのプロパティですか？」） |
| **案C: 追加項目のみ別シートで管理** | テンプレート外の項目を `_extra` シートに記入する形式とし、フリーテキストとして保存 |

**現時点の方針**: メタデータ行がない追加列は**スキップ**。追加項目が必要な場合はテンプレートを更新してExcelを再ダウンロードする運用を推奨。UIでのサポートは Phase 後続で検討。

---

### 4.6 階層プロパティ（propertyListType）への対応（Phase4）

**現状**: スキップ（`propertyListType` のプロパティは出力対象外）

**将来の対応案**:
```
propertyKey を "/" 区切りで階層を表現する
  例: "composition/element", "composition/ratio"

または縦長フォーマット（案B）に切り替える
```

---

## 5. データフロー全体図

```
[フロントエンド]                   [バックエンド]                 [DB/Storage]
     │                                   │                           │
     │  GET /download-excel              │                           │
     │──────────────────────────────────>│                           │
     │                                   │  MAIMLファイル取得         │
     │                                   │──────────────────────────>│
     │                                   │<──────────────────────────│
     │                                   │  テンプレート定義抽出       │
     │                                   │  ExcelGeneratorService     │
     │                                   │  ヘッダー行生成             │
     │                                   │  メタデータ行生成           │
     │                                   │  N行分の空行生成            │
     │  ←── .xlsxファイル ──────────────│                           │
     │                                   │                           │
     │ [ユーザーがExcelを記入]            │                           │
     │                                   │                           │
     │  POST /upload-excel (.xlsx)       │                           │
     │──────────────────────────────────>│                           │
     │                                   │  ExcelParserService        │
     │                                   │  ①メタデータ行検証         │
     │                                   │  ②列定義パース             │
     │                                   │  ③データ行変換             │
     │                                   │  ④バリデーション           │
     │                                   │  ⑤template_data保存       │
     │                                   │──────────────────────────>│
     │  ←── 結果（成功/エラー詳細）──────│                           │
```

---

## 6. 依存関係とライブラリ

### バックエンド追加ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|----------|------|
| `xlsx` | ^0.18.5 | Excel生成・パース |

### xlsxの主要API

```typescript
// 読み込み
const workbook = XLSX.read(buffer, { type: 'buffer' });

// シートの2次元配列取得
const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

// 2次元配列からシート生成
const worksheet = XLSX.utils.aoa_to_sheet(data);

// ワークブック作成・シート追加
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'data');

// バッファ出力
const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
```

---

## 7. 今後の拡張ポイント

| 機能 | 優先度 | 内容 |
|------|--------|------|
| 階層プロパティ対応 | 中 | `propertyListType` を縦長フォーマットで出力 |
| Excelスタイル適用 | 低 | ヘッダー行の色付け、ドロップダウン選択肢 |
| バリデーション強化 | 中 | 単位の範囲チェック、必須プロパティチェック |
| 差分インポート | 中 | 既存データとの差分のみ保存 |
| 進捗表示 | 低 | 大容量インポート時のプログレスバー |
| プレビュー機能 | 中 | アップロード前に内容を確認できるダイアログ |
