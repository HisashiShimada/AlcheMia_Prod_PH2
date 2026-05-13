# reference配下 の data層・eventLog層 書き込み処理 調査レポート

**作成日時**: 2026-03-16 08:30（08:45更新）  
**調査対象**: `frontend/src/reference/` 配下全体

---

## 1. 調査結果サマリー

`reference` 配下で data層・eventLog層の書き出しに関係するファイルは以下の3か所：

| ファイル | data層書き出し | eventLog層書き出し | 内容あり？ |
|--------|--------------|-----------------|----------|
| `PetriNetEditorV2/utils/converters/reactFlowToMaiml.js` | ✅ `buildDataXML()` | ❌ 空要素のみ | **data層のみ内容あり** |
| `ExperimentRecorder/utils/MaiMLWriter.js` | ✅ `addExperimentData()` | ✅ `addEventLog()` | **両方内容あり（ただし要素名が異なる）** |
| `PetriNetViewer/utils/MaiMLParser.js` | ❌ 空要素のみ | ❌ 空要素のみ | なし |

---

## 2. 最重要：`PetriNetEditorV2/utils/converters/reactFlowToMaiml.js`

### `buildDataXML()` - data層の構造的な書き出し処理

これが **reference配下で唯一、MAIMLスキーマ準拠の `<data>` 要素を構造的に書き出す関数**。

```javascript
function buildDataXML(experimentData, dataId = 'dataID') {
  if (!experimentData || 
      (!experimentData.materials?.length && 
       !experimentData.conditions?.length && 
       !experimentData.results?.length)) {
    // 実験データがない場合は空のData要素を返す
    return `  <data id="${escapeXml(dataId)}">\n  </data>\n`;
  }
  
  let dataXml = `  <data id="${escapeXml(dataId)}">\n`;
  
  // materials / conditions / results の順に処理
  ['materials', 'conditions', 'results'].forEach(category => {
    const records = experimentData[category] || [];
    
    records.forEach((record, index) => {
      const categoryName = category.slice(0, -1); // materials -> material
      const instanceId = record.recordId || `${categoryName}_instance_${index}`;
      const templateRef = record.templateRef || record.templateName || '';
      
      dataXml += `    <${categoryName} id="${instanceId}" ref="${templateRef}">\n`;
      
      // プロパティを出力
      if (record.properties && Array.isArray(record.properties)) {
        record.properties.forEach(prop => {
          if (prop && prop.key) {
            dataXml += `      <property key="${prop.key}"`;
            if (prop.type || prop.xsiType) dataXml += ` xsi:type="${prop.type || prop.xsiType}"`;
            if (prop.units || prop.unit) dataXml += ` units="${prop.units || prop.unit}"`;
            dataXml += `>\n`;
            if (value !== '') dataXml += `        <value>${value}</value>\n`;
            if (prop.description) dataXml += `        <description>${prop.description}</description>\n`;
            dataXml += `      </property>\n`;
          }
        });
      }
      
      if (record.timestamp) dataXml += `      <timestamp>${record.timestamp}</timestamp>\n`;
      if (record.operatorId) dataXml += `      <operatorId>${record.operatorId}</operatorId>\n`;
      
      dataXml += `    </${categoryName}>\n`;
    });
  });
  
  dataXml += `  </data>\n`;
  return dataXml;
}
```

**生成されるXML構造**:
```xml
<data id="dataID">
  <material id="mat_instance_0" ref="MT001">
    <property key="温度" xsi:type="doubleType" units="°C">
      <value>25.5</value>
    </property>
    <timestamp>2026-03-16T08:30:00.000Z</timestamp>
    <operatorId>worker001</operatorId>
  </material>
  <condition id="con_instance_0" ref="CT001">
    ...
  </condition>
  <result id="res_instance_0" ref="RT001">
    ...
  </result>
</data>
```

### `buildDataXML` の呼び出し経路（どの画面から？）

**`buildDataXML` は実験管理者側エディタ（`PetriNetEditorInner.jsx`）の保存処理から呼ばれる。**  
実験作業者側（`ExperimentRecorder`）からは呼ばれていない。

```
PetriNetEditorInner.jsx（実験管理者エディタ）
  └── 保存ボタン押下（handleSave 等）
        ├── workId が documentData にある場合のみ
        │    └── fetch(`/api/experiment-records/by-work-id/${workId}`)
        │         └── experimentData = expDataResult.data
        │              { materials: [], conditions: [], results: [] }
        └── convertReactFlowToMaiML(
              nodes, edges, metadata, documentData,
              originalStructure, allTemplates, allMethods,
              experimentData  // ← 第8引数
            )
              └── buildDataXML(experimentData, dataId)  // ← ここで呼ばれる
```

**つまり `buildDataXML` は「実験管理者がMAIMLファイルを保存する際に、バックエンドAPIから実験記録データを取得して `<data>` 層に書き込む」という用途。**

### `convertReactFlowToMaiML()` での呼び出し

`buildDataXML` は `convertReactFlowToMaiML()` 内で以下のように使われる：

```javascript
// data要素（実験記録データがあれば使用、なければ元のXMLまたは空）
if (experimentData) {
  // ★ 実験データがある場合：buildDataXML()で内容あり書き出し
  const dataId = originalStructure?.data?.id || documentData?.dataId || 'dataID';
  maiml += buildDataXML(experimentData, dataId);
} else if (originalStructure?.data?.rawXML) {
  // 元ファイルのrawXMLを引き継ぐ
  maiml += `  ${originalStructure.data.rawXML}\n`;
} else {
  // 空要素
  const dataId = originalStructure?.data?.id || documentData?.dataId || 'dataID';
  maiml += `  <data id="${escapeXml(dataId)}">\n`;
  maiml += `  </data>\n`;
}

// eventLog要素（rawXML引き継ぎのみ。構造的な書き出しなし）
if (originalStructure?.eventLog?.rawXML) {
  maiml += `  ${originalStructure.eventLog.rawXML}\n`;
} else {
  const eventLogId = originalStructure?.eventLog?.id || 'eventLogID';
  maiml += `  <eventLog id="${escapeXml(eventLogId)}">\n`;
  maiml += `  </eventLog>\n`;
}
```

**ポイント**:
- `experimentData` 引数を渡した場合のみ `buildDataXML()` が呼ばれる
- `convertReactFlowToMaiML()` の引数定義: 最後の `experimentData = null` がオプション引数
- **eventLog層の構造的書き出しは未実装**（rawXML引き継ぎのみ）

---

## 3. `ExperimentRecorder/utils/MaiMLWriter.js`

data層・eventLog層両方に書き出しメソッドが実装されているが、**書き込む要素名がMAIMLスキーマと異なる**。

| メソッド | 生成される要素 | 注意点 |
|---------|-------------|-------|
| `addExperimentData()` | `<instanceData>` / `<instance>` | MAIMLスキーマの `<data>` ではない |
| `addEventLog()` | `<eventLog>` / `<event>` | MAIMLスキーマと同名だが内部構造が異なる |

詳細は [ExperimentRecorder調査（旧版）](#) を参照。

---

## 4. `PetriNetViewer/utils/MaiMLParser.js`

`generateMaiMLFromNodes()` 関数で空要素を生成するのみ：

```javascript
// レベル1: data要素（タブ1つ）
maiml += `\t<data id="dataID">\n`;
maiml += `\t</data>\n`;

// レベル1: eventLog要素（タブ1つ）
maiml += `\t<eventLog id="eventLogID">\n`;
maiml += `\t</eventLog>\n`;
```

---

## 5. `PetriNetEditorV2/utils/converters/multiMethodConverter.js`

複数method対応の変換処理。空要素のみ：

```javascript
maiml += `  <data id="dataID">\n`;
maiml += `  </data>\n`;
maiml += `  <eventLog id="eventLogID">\n`;
maiml += `  </eventLog>\n`;
```

---

## 6. 現行実装（editorv2 TypeScript）との対応関係

| reference JS ファイル | 現行 TypeScript 相当ファイル |
|---------------------|--------------------------|
| `PetriNetEditorV2/utils/converters/reactFlowToMaiml.js` | `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts` |
| `PetriNetEditorV2/utils/converters/multiMethodConverter.js` | `frontend/src/components/editorv2/utils/converters/multiMethodConverter.ts` |

### 現行TypeScript版との差異（data層）

| 項目 | reference JS版 | 現行 TypeScript版 |
|-----|---------------|-----------------|
| `buildDataXML()` 関数 | ✅ 実装済み | ❌ 未実装 |
| `experimentData` 引数 | ✅ `convertReactFlowToMaiML()` に存在 | ❌ なし |
| data層の内容出力 | ✅ 実験データがあれば出力 | ❌ 空要素またはrawXML引き継ぎのみ |
| eventLog層の内容出力 | ❌ 空要素またはrawXML引き継ぎのみ | ❌ 空要素またはrawXML引き継ぎのみ |

---

## 7. 決定した実装フロー（2026-03-16確認）

```
① 実験作業者が記録
      ↓
② バックエンドDB（templateData テーブル / EventLog テーブル）に保存
      ↓
③ 実験管理者がタスク結果を承認
      ↓
④ DB上の実験記録データを MAIML 型定義（TypeScript 型）に変換
      ↓
⑤ プロジェクトの最新 MAIMLファイルを読み込み
      ↓
⑥ <data> 部と <eventLog> 部を追記してファイルを更新・保存
```

### 各ステップのポイント

| ステップ | 現状 | 必要な実装 |
|---------|------|-----------|
| ②DB保存 | ✅ 既存実装あり（`/api/experiment-records/save` 等） | 不要 |
| ③承認処理 | ✅ 既存実装あり | 不要 |
| ④型変換 | ❌ 未実装 | DBレコード → MAIML型定義への変換関数が必要 |
| ⑤MAIMLファイル読み込み | ✅ 既存実装あり（storageService） | 不要 |
| ⑥`<data>`書き出し | ❌ TS版未実装 | `buildDataXML()` を TS版に移植 |
| ⑥`<eventLog>`書き出し | ❌ 未実装 | MAIMLスキーマ準拠の新規実装が必要 |

### reference JS版 `buildDataXML()` との対応

reference版（`PetriNetEditorInner.jsx`）は `/api/experiment-records/by-work-id/${workId}` から
`{ materials: [], conditions: [], results: [] }` 形式でデータを取得して `buildDataXML()` に渡している。

今回の実装では承認トリガーでDBからデータを取得し、同様の形式に変換して `buildDataXML()` 相当の処理を呼ぶ流れになる。

### 残課題

1. **`buildDataXML()` の TypeScript版移植**  
   `frontend/src/utils/converters/reactFlowToMaiml.ts` に追加  
   入力型: `{ materials: ExperimentRecord[], conditions: ExperimentRecord[], results: ExperimentRecord[] }`

2. **`<eventLog>` 書き出し実装（新規）**  
   MAIMLスキーマの `<eventLog>` 内部構造を確認し、EventLogテーブルのデータを変換する処理を新規実装

3. **承認処理からの呼び出し**  
   実験管理者の承認APIまたはフロントエンドの承認後処理に上記 ④〜⑥ を組み込む

---

## 8. 関連ファイル一覧

| ファイル | 役割 |
|---------|-----|
| `reference/components/PetriNetEditorV2/utils/converters/reactFlowToMaiml.js` | ★ `buildDataXML()` 実装（最重要） |
| `reference/components/PetriNetEditorV2/utils/converters/multiMethodConverter.js` | 複数method変換（空要素のみ） |
| `reference/components/ExperimentRecorder/utils/MaiMLWriter.js` | `instanceData`/`eventLog` 書き込みクラス（要素名が異なる） |
| `reference/components/PetriNetViewer/utils/MaiMLParser.js` | MAIMLパース＋空要素生成 |
| `frontend/src/components/editorv2/utils/converters/reactFlowToMaiml.ts` | 現行TypeScript版（data層未実装） |
