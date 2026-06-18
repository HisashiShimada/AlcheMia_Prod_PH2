'use client';

import React, { useState } from 'react';
import {
  Modal,
  Button,
  Form,
  Input,
  Select,
  Segmented,
  Space,
  message,
} from 'antd';
import QualitativeOptionEditor, { type QualitativeOption } from './QualitativeOptionEditor';

const { TextArea } = Input;

/** スコープの選択肢 */
const SCOPE_OPTIONS = [
  { value: 'global', label: 'Global（グローバル）' },
  { value: 'company', label: '株式会社サンプルテック' },
  { value: 'dept-rd', label: '研究開発部' },
  { value: 'rd-materials', label: '研究開発部 › 材料グループ' },
  { value: 'rd-measurement', label: '研究開発部 › 計測チーム' },
  { value: 'dept-mfg', label: '生産技術部' },
  { value: 'mfg-process', label: '生産技術部 › プロセスチーム' },
  { value: 'mfg-qa', label: '生産技術部 › 品質管理' },
  { value: 'dept-qa', label: '品質保証部' },
  { value: 'personal', label: 'Personal › 山田 太郎（自分）' },
];

/** スコープ → 名前空間URLのマッピング */
const SCOPE_URL_MAP: Record<string, string> = {
  global: 'http://maiml.org/global',
  company: 'http://sample.co.jp/maiml',
  'dept-rd': 'http://sample.co.jp/rd',
  'rd-materials': 'http://sample.co.jp/rd/materials',
  'rd-measurement': 'http://sample.co.jp/rd/measurement',
  'dept-mfg': 'http://sample.co.jp/mfg',
  'mfg-process': 'http://sample.co.jp/mfg/process',
  'mfg-qa': 'http://sample.co.jp/mfg/qa',
  'dept-qa': 'http://sample.co.jp/qa',
  personal: 'http://sample.co.jp/personal/yamada',
};

/** 継承元テンプレートの選択肢（モック） */
const PARENT_TEMPLATE_OPTIONS = [
  { value: 'temperature_uncertainty', label: 'temperature_uncertainty' },
  { value: 'pressure_uncertainty', label: 'pressure_uncertainty' },
  { value: 'elastic_modulus_base', label: 'elastic_modulus_base' },
  { value: 'measurement_base', label: 'measurement_base' },
  { value: 'numeric_base', label: 'numeric_base' },
];

/** xsi:type の選択肢 */
const XSI_TYPE_OPTIONS = [
  { value: 'doubleType', label: 'doubleType' },
  { value: 'decimalType', label: 'decimalType' },
  { value: 'intType', label: 'intType' },
  { value: 'stringType', label: 'stringType' },
];

const DEFAULT_OPTIONS: QualitativeOption[] = [
  { id: 1, value: '確か',   color: '#22C55E', isDefault: true  },
  { id: 2, value: '曖昧',   color: '#FACC15', isDefault: false },
  { id: 3, value: '不確か', color: '#EF4444', isDefault: false },
];

/** Props型定義 */
interface UncertaintyCreateModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 不確かさ基準作成モーダルコンポーネント
 * 基本情報・評価方式設定（定量/定性切替）・適用範囲を含むフォーム
 */
export default function UncertaintyCreateModal({ open, onClose }: UncertaintyCreateModalProps) {
  const [evalMode, setEvalMode] = useState<'quantitative' | 'qualitative'>('quantitative');
  const [templateKey, setTemplateKey] = useState('');
  const [selectedScope, setSelectedScope] = useState<string>('');
  const [qualitativeOptions, setQualitativeOptions] = useState<QualitativeOption[]>(DEFAULT_OPTIONS);

  /** QNameプレビュー */
  const qnamePreview = templateKey ? `ex:${templateKey}` : '';
  const isValidQname = /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(templateKey);

  /** 名前空間URLプレビュー */
  const namespaceUrl = selectedScope ? (SCOPE_URL_MAP[selectedScope] ?? '') : '';

  /** リセット & 閉じる */
  const handleClose = () => {
    setEvalMode('quantitative');
    setTemplateKey('');
    setSelectedScope('');
    setQualitativeOptions(DEFAULT_OPTIONS);
    onClose();
  };

  /** 保存 */
  const handleSave = () => {
    if (!templateKey) {
      message.error('不確かさ基準名（key属性）を入力してください');
      return;
    }
    if (!selectedScope) {
      message.error('スコープを選択してください');
      return;
    }
    message.success('不確かさ基準を保存しました（デモ）');
    handleClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      width={900}
      title={<span style={{ fontSize: 16, fontWeight: 700 }}>不確かさ基準作成</span>}
      footer={
        <Space>
          <Button onClick={handleClose}>キャンセル</Button>
          <Button type="primary" onClick={handleSave}>保存</Button>
        </Space>
      }
      styles={{ body: { padding: '16px 24px', maxHeight: '75vh', overflowY: 'auto' } }}
    >
      <Form layout="vertical" size="middle">

        {/* ===== 1. 基本情報 ===== */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>1 .基本情報</div>

          <Form.Item label="継承元不確かさ基準" style={{ marginBottom: 14 }}>
            <Select
              placeholder="選択してください"
              allowClear
              options={PARENT_TEMPLATE_OPTIONS}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            label={<span>不確かさ基準名（key属性）<span style={{ color: '#ff4d4f' }}> *</span></span>}
            style={{ marginBottom: 14 }}
          >
            <Input
              placeholder="elastic_modulus"
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
            />
          </Form.Item>

          <Form.Item label="名前空間プレビュー（QName）" style={{ marginBottom: 14 }}>
            <div style={{ position: 'relative' }}>
              <Input
                readOnly
                value={qnamePreview}
                placeholder="ex:elastic_modulus"
                style={{ background: '#fafafa', color: '#555', paddingRight: 150 }}
              />
              {templateKey && (
                <span
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 12,
                    color: isValidQname ? '#52c41a' : '#ff4d4f',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isValidQname ? '✅ 有効なQNameです' : '❌ 無効なQNameです'}
                </span>
              )}
            </div>
          </Form.Item>

          <Form.Item
            label={<span>スコープ（登録先）<span style={{ color: '#ff4d4f' }}> *</span></span>}
            style={{ marginBottom: 14 }}
          >
            <Select
              placeholder="スコープを選択"
              value={selectedScope || undefined}
              onChange={(v) => setSelectedScope(v)}
              options={SCOPE_OPTIONS}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item label="説明文" style={{ marginBottom: 14 }}>
              <TextArea rows={3} placeholder="不確かさ基準の説明を入力してください。" />
          </Form.Item>

          <Form.Item label="名前空間 URL プレビュー" style={{ marginBottom: 0 }}>
            <Input
              readOnly
              value={namespaceUrl}
              placeholder="スコープを選択すると表示されます"
              style={{ background: '#fafafa', color: '#888' }}
            />
          </Form.Item>
        </div>

        {/* ===== 2. 評価方式設定 ===== */}
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>2 .評価方式設定</div>

          <Form.Item label="評価方式" style={{ marginBottom: 16 }}>
            <Segmented
              value={evalMode}
              onChange={(v) => setEvalMode(v as 'quantitative' | 'qualitative')}
              options={[
                { value: 'quantitative', label: '定量（数値）' },
                { value: 'qualitative', label: '定性（選択肢）' },
              ]}
            />
          </Form.Item>

          {/* 定量モード */}
          {evalMode === 'quantitative' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Form.Item
                label={<span>xsi:type <span style={{ color: '#ff4d4f' }}>*</span></span>}
                style={{ marginBottom: 0 }}
              >
                <Select defaultValue="doubleType" options={XSI_TYPE_OPTIONS} />
              </Form.Item>
              <Form.Item
                label={<span>units <span style={{ color: '#ff4d4f' }}>*</span></span>}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="GPa" />
              </Form.Item>
              <Form.Item label="formatString" style={{ marginBottom: 0 }}>
                <Input placeholder="#,###E0" />
              </Form.Item>
            </div>
          )}

          {/* 定性モード */}
          {evalMode === 'qualitative' && (
            <QualitativeOptionEditor
              options={qualitativeOptions}
              radioName="defaultOptionCreate"
              onChange={setQualitativeOptions}
            />
          )}
        </div>

      </Form>
    </Modal>
  );
}

/* ========== スタイル定数 ========== */
const sectionStyle: React.CSSProperties = {
  border: '1px solid #e8e8e8',
  borderRadius: 6,
  padding: '14px 16px',
  marginBottom: 16,
  background: '#fff',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#1677ff',
  marginBottom: 14,
  paddingBottom: 6,
  borderBottom: '1px solid #f0f5ff',
};
