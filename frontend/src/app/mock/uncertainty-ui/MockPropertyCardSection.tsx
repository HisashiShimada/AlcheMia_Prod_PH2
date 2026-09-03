'use client';

/**
 * MockPropertyCardSection.tsx
 * Phase 1-A モック: WorkRecordPanel PropertyCard の複数定量評価表示確認（修正版）
 *
 * レイアウト方針:
 *   - カード全体を大きめに（fontSize 14〜15ベース）
 *   - 上部は想定値エリアのみ（許容値・説明の固定表示は廃止）
 *   - 定量評価セクション: 各入力行のカード上部に対応する許容値・説明をセットで表示
 */

import React, { useState } from 'react';
import {
  Alert, Button, Card, Col, Divider, Flex,
  Input, InputNumber, Row, Select, Space, Tag, Typography,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const { Text } = Typography;

// ─── 型定義 ───────────────────────────────────────────────────

interface QuantitativeUncertaintyInfo {
  uncertaintyKey: string;
  uncertaintyName?: string;
  toleranceValue?: string | number;
  description?: string;
}

interface MockWorkProperty {
  key: string;
  label: string;
  xsiType: 'FloatValue' | 'IntegerValue' | 'StringValue';
  unit: string;
  expected: number | string | null;
  uncertaintyName?: string;
  uncertaintyValue?: number | string;
  uncertaintyDescription?: string;
  quantitativeUncertainties?: QuantitativeUncertaintyInfo[];
  defaultConfidence?: string;
  confidenceOptions?: string[];
  description?: string;
}

interface AddedUncertaintyValue {
  id: string;
  uncertaintyKey: string;
  value: string;
}

// ─── モックデータ ──────────────────────────────────────────────

const MOCK_UNCERTAINTY_OPTIONS = [
  { value: 'key_bias',      label: '系統誤差（バイアス）' },
  { value: 'key_precision', label: '繰り返し精度' },
  { value: 'key_combined',  label: '合成標準不確かさ' },
];

/** ケース1: 0件（後方互換フィールド） */
const PROP_LEGACY: MockWorkProperty = {
  key: 'ns1:Temperature', label: 'Temperature', xsiType: 'FloatValue', unit: '℃', expected: 300,
  uncertaintyName: '測定不確かさ（k=2）', uncertaintyValue: 5.0,
  uncertaintyDescription: '校正証書による拡張不確かさ（信頼水準95%）',
};

/** ケース2: 1件（新フィールド） */
const PROP_SINGLE: MockWorkProperty = {
  key: 'ns1:Pressure', label: 'Pressure', xsiType: 'FloatValue', unit: 'MPa', expected: 0.101,
  quantitativeUncertainties: [
    { uncertaintyKey: 'key_bias', uncertaintyName: '系統誤差（バイアス）', toleranceValue: 0.002, description: 'JIS Z 8703 に準拠した校正値' },
  ],
};

/** ケース3: 2件 */
const PROP_DOUBLE: MockWorkProperty = {
  key: 'ns1:Concentration', label: 'Concentration', xsiType: 'FloatValue', unit: 'mol/L', expected: 1.5,
  quantitativeUncertainties: [
    { uncertaintyKey: 'key_bias',      uncertaintyName: '系統誤差（バイアス）', toleranceValue: 0.05, description: '標準溶液の認証値に基づく' },
    { uncertaintyKey: 'key_precision', uncertaintyName: '繰り返し精度',         toleranceValue: 0.03, description: 'n=10 の繰り返し測定から算出' },
  ],
};

/** ケース4: 3件 */
const PROP_TRIPLE: MockWorkProperty = {
  key: 'ns1:Voltage', label: 'Voltage', xsiType: 'FloatValue', unit: 'V', expected: 5.0,
  quantitativeUncertainties: [
    { uncertaintyKey: 'key_bias',      uncertaintyName: '系統誤差（バイアス）', toleranceValue: 0.01,  description: 'トレーサビリティが確保された標準器との比較' },
    { uncertaintyKey: 'key_precision', uncertaintyName: '繰り返し精度',         toleranceValue: 0.005, description: '同一条件での繰り返し測定（n=20）' },
    { uncertaintyKey: 'key_combined',  uncertaintyName: '合成標準不確かさ',     toleranceValue: 0.012, description: 'GUM に従い各成分を合成' },
  ],
};

// ─── スタイル ─────────────────────────────────────────────────

const CONFIDENCE_STYLE: Record<string, { background: string; borderColor: string; color: string }> = {
  '確か':  { background: '#d9f7be', borderColor: '#b7eb8f', color: '#389e0d' },
  '曖昧':  { background: '#fff7e6', borderColor: '#ffd591', color: '#d46b08' },
  '不確か': { background: '#fff1f0', borderColor: '#ffa39e', color: '#cf1322' },
};
const CONFIDENCE_STYLE_DEFAULT = { background: '#f0f0f0', borderColor: '#d9d9d9', color: '#595959' };
const getConfidenceStyle = (level: string) => CONFIDENCE_STYLE[level] ?? CONFIDENCE_STYLE_DEFAULT;
const XSI_COLOR: Record<string, string> = { FloatValue: 'geekblue', IntegerValue: 'purple', StringValue: 'cyan' };
const XSI_SHORT: Record<string, string>  = { FloatValue: 'Float',    IntegerValue: 'Int',    StringValue: 'Str' };

// ─── MockPropertyCard コンポーネント ──────────────────────────

const MockPropertyCard: React.FC<{ prop: MockWorkProperty; caseLabel?: string }> = ({ prop, caseLabel }) => {
  const [confidence, setConfidence] = useState<string | null>(prop.defaultConfidence ?? null);
  const [actual, setActual] = useState<number | string | null>(null);
  const [addedValues, setAddedValues] = useState<AddedUncertaintyValue[]>(() => {
    if (prop.quantitativeUncertainties && prop.quantitativeUncertainties.length > 0) {
      return prop.quantitativeUncertainties.map((qu) => ({ id: qu.uncertaintyKey, uncertaintyKey: qu.uncertaintyKey, value: '' }));
    }
    return [{ id: 'initial', uncertaintyKey: '', value: '' }];
  });
  const confidenceOptions = prop.confidenceOptions ?? ['確か', '曖昧', '不確か'];
  const getQuantitativeInfo = (key: string) => prop.quantitativeUncertainties?.find((q) => q.uncertaintyKey === key);

  return (
    <Card
      title={caseLabel && <Text type="secondary" style={{ fontSize: 12 }}>{caseLabel}</Text>}
      style={{ borderRadius: 8, border: '1px solid #d9d9d9' }}
      styles={{ body: { padding: '12px 14px' } }}
    >
      <Flex align="center" gap={8} style={{ marginBottom: 10 }}>
        <Text strong style={{ fontSize: 15 }}>{prop.label}</Text>
        <Tag color={XSI_COLOR[prop.xsiType] ?? 'default'} style={{ fontSize: 12, margin: 0, lineHeight: '20px' }}>
          {XSI_SHORT[prop.xsiType] ?? prop.xsiType}
        </Tag>
        <Text type="secondary" style={{ fontSize: 12 }}>({prop.key})</Text>
        {confidence !== null && (
          <Tag style={{ ...getConfidenceStyle(confidence), fontSize: 12, margin: 0, lineHeight: '20px', fontWeight: 'bold' }}>
            {confidence}
          </Tag>
        )}
      </Flex>
      <Flex vertical gap={8}>
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 3 }}>想定値</Text>
          <div style={{ padding: '7px 12px', background: '#e6f7ff', border: '1px solid #bae7ff', borderRadius: 4 }}>
            {prop.expected !== null
              ? <Text style={{ fontSize: 15 }}>{prop.expected}{prop.unit && <Text type="secondary" style={{ fontSize: 13, marginLeft: 5 }}>{prop.unit}</Text>}</Text>
              : <Text type="secondary" italic style={{ fontSize: 14 }}>未設定</Text>}
          </div>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 3 }}>実績値</Text>
          <div style={{ background: '#ffffff', border: '1px solid #d9d9d9', borderRadius: 4 }}>
            <Flex align="center">
              {prop.xsiType === 'StringValue'
                ? <Input variant="borderless" style={{ flex: 1, fontSize: 14 }} value={(actual as string) ?? ''} placeholder="入力" onChange={(e) => setActual(e.target.value || null)} />
                : <InputNumber variant="borderless" style={{ flex: 1, fontSize: 14 }} value={(actual as number) ?? undefined} placeholder="入力" onChange={(v) => setActual(v ?? null)} />}
              {prop.unit && <Text type="secondary" style={{ fontSize: 13, paddingRight: 8, flexShrink: 0 }}>{prop.unit}</Text>}
            </Flex>
          </div>
        </div>

        <div>
          <Flex align="center" gap={4} style={{ marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>定性評価</Text>
            {prop.description && <Text type="secondary" style={{ fontSize: 12 }}>（{prop.description}）</Text>}
          </Flex>
          <Flex gap={6}>
            {confidenceOptions.map((level) => {
              const sty = getConfidenceStyle(level);
              return (
                <Button key={level} size="small" onClick={() => setConfidence(confidence === level ? null : level)}
                  style={{ ...sty, fontSize: 12, minWidth: 60, fontWeight: confidence === level ? 'bold' : 'normal',
                    outline: confidence === level ? `2px solid ${sty.borderColor}` : undefined }}>
                  {level}
                </Button>
              );
            })}
          </Flex>
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>定量評価</Text>
          <Flex vertical gap={10}>
            {addedValues.map((av) => {
              const qInfo = getQuantitativeInfo(av.uncertaintyKey);
              return (
                <div key={av.id} style={{ background: '#fafafa', border: '1px solid #e8e8e8', borderRadius: 6, padding: '8px 10px' }}>
                  {qInfo && (
                    <div style={{ marginBottom: 8 }}>
                      <Flex align="baseline" gap={8} style={{ marginBottom: 3 }}>
                        <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>{qInfo.uncertaintyName ?? '許容値'}</Text>
                        {qInfo.toleranceValue !== undefined && (
                          <Text style={{ fontSize: 13, fontWeight: 500 }}>
                            {qInfo.toleranceValue}
                            {prop.unit && <Text type="secondary" style={{ fontSize: 12, marginLeft: 3 }}>{prop.unit}</Text>}
                          </Text>
                        )}
                      </Flex>
                      {qInfo.description && <Text type="secondary" style={{ fontSize: 11 }}>{qInfo.description}</Text>}
                      <Divider style={{ margin: '6px 0' }} />
                    </div>
                  )}
                  <Flex gap={6} align="center">
                    <Select size="small" style={{ flex: 6, minWidth: 0 }} placeholder="不確かさ基準"
                      value={av.uncertaintyKey || undefined}
                      onChange={(val) => setAddedValues((prev) => prev.map((x) => x.id === av.id ? { ...x, uncertaintyKey: val } : x))}
                      options={MOCK_UNCERTAINTY_OPTIONS} />
                    <Input size="small" style={{ flex: 4, minWidth: 0 }} placeholder="値" value={av.value}
                      onChange={(e) => setAddedValues((prev) => prev.map((x) => x.id === av.id ? { ...x, value: e.target.value } : x))} />
                    <Button size="small" type="text" danger icon={<DeleteOutlined />}
                      disabled={addedValues.length === 1}
                      onClick={() => setAddedValues((prev) => prev.filter((x) => x.id !== av.id))} />
                  </Flex>
                </div>
              );
            })}
          </Flex>
          <Button size="small" icon={<PlusOutlined />}
            style={{ marginTop: 8, background: '#1d4e63', color: '#fff', borderColor: '#1d4e63', fontSize: 12 }}
            onClick={() => setAddedValues((prev) => [...prev, { id: `${Date.now()}`, uncertaintyKey: '', value: '' }])}>
            ＋値の追加
          </Button>
        </div>
      </Flex>
    </Card>
  );
};

// ─── セクション export ─────────────────────────────────────────

export default function MockPropertyCardSection() {
  return (
    <div>
      <Alert type="info" showIcon message="Phase 1-A 確認ポイント（修正版）"
        description={
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 12 }}>
            <li>カード全体が大きめに表示されること（fontSize 14〜15）</li>
            <li>上部は「想定値」のみ。許容値・説明の固定欄は廃止</li>
            <li>定量評価セクション: 各入力行のカード上部に許容値・説明がセットで表示されること</li>
            <li>ケース1（後方互換）: 入力行のみ（許容値・説明なし）</li>
            <li>ケース2（1件）: 入力行1つに許容値・説明がセット表示</li>
            <li>ケース3（2件）/ ケース4（3件）: 件数分の入力行それぞれに対応する許容値・説明がセット</li>
            <li>「＋値の追加」で新規行を追加（新規行は許容値・説明なし）</li>
          </ul>
        }
        style={{ marginBottom: 16 }} />
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>3列グリッド比較</Text>
          <Row gutter={[12, 12]}>
            <Col span={8}><MockPropertyCard prop={PROP_LEGACY} caseLabel="ケース1: 後方互換（0件）" /></Col>
            <Col span={8}><MockPropertyCard prop={PROP_SINGLE} caseLabel="ケース2: 1件" /></Col>
            <Col span={8}><MockPropertyCard prop={PROP_DOUBLE} caseLabel="ケース3: 2件" /></Col>
          </Row>
        </div>
        <div>
          <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>ケース4: 3件（単体確認）</Text>
          <Row gutter={[12, 12]}>
            <Col span={8}><MockPropertyCard prop={PROP_TRIPLE} caseLabel="ケース4: 3件" /></Col>
          </Row>
        </div>
      </Space>
    </div>
  );
}

