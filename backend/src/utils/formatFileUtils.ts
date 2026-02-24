/**
 * フォーマットファイル関連のユーティリティ関数
 */

/**
 * デフォルトXMLコンテンツを生成
 * 
 * @param templateType テンプレートタイプ（material/condition/result）
 * @param fileName ファイル名（拡張子なし）
 * @param description 概要（オプション）
 * @returns 生成されたXML文字列
 */
export function generateDefaultXmlContent(
  templateType: 'material' | 'condition' | 'result',
  fileName: string,
  description?: string
): string {
  switch (templateType) {
    case 'material':
      return generateMaterialTemplate(fileName, description);
    case 'condition':
      return generateConditionTemplate(fileName, description);
    case 'result':
      return generateResultTemplate(fileName, description);
    default:
      throw new Error(`未対応のテンプレートタイプです: ${templateType}`);
  }
}

/**
 * MaterialTemplateのデフォルトXMLを生成
 */
function generateMaterialTemplate(fileName: string, description?: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<MaterialTemplate>
  <Material id="material_1">
    <Name>${escapeXml(fileName)}</Name>
    <Description>${escapeXml(description || '')}</Description>
    <Properties>
      <Property>
        <PropertyName>property_1</PropertyName>
        <PropertyValue></PropertyValue>
        <Unit></Unit>
      </Property>
    </Properties>
  </Material>
</MaterialTemplate>`;
}

/**
 * ConditionTemplateのデフォルトXMLを生成
 */
function generateConditionTemplate(fileName: string, description?: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ConditionTemplate>
  <Condition id="condition_1">
    <Name>${escapeXml(fileName)}</Name>
    <Description>${escapeXml(description || '')}</Description>
    <Parameters>
      <Parameter>
        <ParameterName>parameter_1</ParameterName>
        <ParameterValue></ParameterValue>
        <Unit></Unit>
      </Parameter>
    </Parameters>
  </Condition>
</ConditionTemplate>`;
}

/**
 * ResultTemplateのデフォルトXMLを生成
 */
function generateResultTemplate(fileName: string, description?: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ResultTemplate>
  <Result id="result_1">
    <Name>${escapeXml(fileName)}</Name>
    <Description>${escapeXml(description || '')}</Description>
    <Measurements>
      <Measurement>
        <MeasurementName>measurement_1</MeasurementName>
        <MeasurementValue></MeasurementValue>
        <Unit></Unit>
      </Measurement>
    </Measurements>
  </Result>
</ResultTemplate>`;
}

/**
 * デフォルトMAIMLコンテンツを生成
 * 
 * @param fileName ファイル名（拡張子なし）
 * @param description 概要（オプション）
 * @returns 生成されたMAIML XML文字列
 */
export function generateDefaultMaimlContent(
  fileName: string,
  description?: string
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<document xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <method id="method_1">
    <name>${escapeXml(fileName)}</name>
    <description>${escapeXml(description || '')}</description>
    <petri_net>
      <place id="place_start">
        <name>Start</name>
        <initial_marking>1</initial_marking>
      </place>
      <place id="place_end">
        <name>End</name>
        <initial_marking>0</initial_marking>
      </place>
      <transition id="transition_1">
        <name>Process</name>
      </transition>
      <arc id="arc_1">
        <source>place_start</source>
        <target>transition_1</target>
      </arc>
      <arc id="arc_2">
        <source>transition_1</source>
        <target>place_end</target>
      </arc>
    </petri_net>
  </method>
</document>`;
}

/**
 * XMLエスケープ処理
 * 
 * @param text エスケープする文字列
 * @returns エスケープされた文字列
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * ファイル名をサニタイズ
 * 不正な文字を_に変換
 * 
 * @param fileName サニタイズするファイル名
 * @returns サニタイズされたファイル名
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/\s+/g, '_')          // スペースを_に変換
    .replace(/[^a-zA-Z0-9_-]/g, '_'); // 英数字・_・-以外を_に変換
}
