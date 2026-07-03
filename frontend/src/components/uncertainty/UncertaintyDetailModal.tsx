'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Form,
  Input,
  Select,
  Segmented,
  Switch,
  Tag,
  Space,
  message,
} from 'antd';
import dayjs from 'dayjs';
import QualitativeOptionEditor, { type QualitativeOption } from './QualitativeOptionEditor';
import type { UncertaintyTemplate } from './UncertaintyListTable';
import TemplateDiffPreviewModal from './TemplateDiffPreviewModal';

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

/** スコープラベル → スコープキーのマッピング（モックデータ用） */
const SCOPE_LABEL_TO_KEY: Record<string, string> = {
  Global: 'global',
  '株式会社サンプルテック': 'company',
  '研究開発部': 'dept-rd',
  '研究開発部 › 材料グループ': 'rd-materials',
  '研究開発部 › 計測チーム': 'rd-measurement',
  '生産技術部': 'dept-mfg',
  '生産技術部 › プロセスチーム': 'mfg-process',
  '生産技術部 › 品質管理': 'mfg-qa',
  '品質保証部': 'dept-qa',
  'Personal › 山田 太郎': 'personal',
};

/** Key属性（prefix:用語）の選択肢 */
const KEY_OPTIONS = [
  { value: 'ex:elastic_modulus',     label: 'ex:elastic_modulus' },
  { value: 'ex:temperature',         label: 'ex:temperature' },
  { value: 'ex:pressure',            label: 'ex:pressure' },
  { value: 'ex:measurement_value',   label: 'ex:measurement_value' },
  { value: 'ex:uncertainty_level',   label: 'ex:uncertainty_level' },
  { value: 'ex:confidence_interval', label: 'ex:confidence_interval' },
  { value: 'maiml:standard',         label: 'maiml:standard' },
  { value: 'maiml:uncertainty',      label: 'maiml:uncertainty' },
  { value: 'rdfs:label',             label: 'rdfs:label' },
  { value: 'owl:sameAs',             label: 'owl:sameAs' },
  { value: 'xsd:double',             label: 'xsd:double' },
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
interface UncertaintyDetailModalProps {
  open: boolean;
  template: UncertaintyTemplate | null;
  /** 最新バージョンかどうか（trueのみ有効⇔非推奨の切替が可能） */
  isLatestVersion: boolean;
  onClose: () => void;
}

/**
 * 不確かさ基準詳細・編集モーダルコンポーネント
 * 既存不確かさ基準データを初期値として編集可能なフォームを表示する
 */
export default function UncertaintyDetailModal({
  open,
  template,
  isLatestVersion,
  onClose,
}: UncertaintyDetailModalProps) {
  const [evalMode, setEvalMode] = useState<'quantitative' | 'qualitative'>('quantitative');
  const [templateKey, setTemplateKey] = useState('');
  const [selectedScope, setSelectedScope] = useState<string>('');
  const [selectedKeyAttr, setSelectedKeyAttr] = useState<string | undefined>(undefined);
  const [qualitativeOptions, setQualitativeOptions] = useState<QualitativeOption[]>(DEFAULT_OPTIONS);
  const [diffPreviewOpen, setDiffPreviewOpen] = useState(false);
  const [statusState, setStatusState] = useState<'active' | 'deprecated'>('active');
  const [form] = Form.useForm();

  /** 評価基準データが変わったらフォームを初期化 */
  useEffect(() => {
    if (!template) return;
    // name を「不確かさ基準名」フィールドに表示
    setTemplateKey(template.name);
    setEvalMode(template.eval);
    const scopeKey = SCOPE_LABEL_TO_KEY[template.scope] ?? 'company';
    setSelectedScope(scopeKey);
    // key をそのまま selectedKeyAttr にセット
    setSelectedKeyAttr(template.key || undefined);
    // 状態を初期化
    setStatusState(template.status);
    form.setFieldsValue({
      desc: template.desc,
      xsiType: template.type,
      units: template.units,
      formatString: template.format,
    });
  }, [template, form]);

  /** 名前空間URLプレビュー */
  const namespaceUrl = selectedScope ? (SCOPE_URL_MAP[selectedScope] ?? '') : '';

  /** 保存 */
  const handleSave = () => {
    if (!templateKey) {
      message.error('不確かさ基準名（key属性）を入力してください');
      return;
    }
    message.success('不確かさ基準を保存しました（デモ）');
    onClose();
  };

  if (!template) return null;

  const statusTag =
    template.status === 'active' ? (
      <Tag color="success" style={{ fontWeight: 600 }}>● 有効</Tag>
    ) : (
      <Tag color="default" style={{ fontWeight: 600 }}>○ 非推奨</Tag>
    );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={900}
      title={
        <Space>
          <span style={{ fontSize: 16, fontWeight: 700 }}>
            📋 {template.name} — 詳細・編集
          </span>
          {statusTag}
        </Space>
      }
      footer={
        <Space>
          <Button onClick={onClose}>閉じる</Button>
          <Button
            style={{ color: '#722ed1', borderColor: '#d3adf7' }}
            onClick={() => setDiffPreviewOpen(true)}
          >
            🔍 差分プレビュー
          </Button>
          <Button type="primary" onClick={handleSave}>
            保存
          </Button>
        </Space>
      }
      styles={{ body: { padding: '16px 24px', maxHeight: '75vh', overflowY: 'auto' } }}
    >
      <Form form={form} layout="vertical" size="middle">

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
            label={<span>不確かさ基準名<span style={{ color: '#ff4d4f' }}> *</span></span>}
            style={{ marginBottom: 14 }}
          >
            <Input
              value={templateKey}
              onChange={(e) => setTemplateKey(e.target.value)}
            />
          </Form.Item>

          {/* Key属性設定 */}
          <Form.Item label="Key属性設定" style={{ marginBottom: 14 }}>
            <Select
              value={selectedKeyAttr}
              onChange={(v) => setSelectedKeyAttr(v)}
              options={
                selectedKeyAttr && !KEY_OPTIONS.some((o) => o.value === selectedKeyAttr)
                  ? [{ value: selectedKeyAttr, label: selectedKeyAttr }, ...KEY_OPTIONS]
                  : KEY_OPTIONS
              }
              placeholder="prefix:用語 を選択"
              allowClear
              showSearch
              filterOption={(input, option) =>
                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label={<span>スコープ（登録先）<span style={{ color: '#ff4d4f' }}> *</span></span>}
            style={{ marginBottom: 14 }}
          >
            <Select
              value={selectedScope || undefined}
              onChange={(v) => setSelectedScope(v)}
              options={SCOPE_OPTIONS}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item name="desc" label="説明文" style={{ marginBottom: 14 }}>
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item label="名前空間 URL プレビュー" style={{ marginBottom: 14 }}>
            <Input
              readOnly
              value={namespaceUrl}
              style={{ background: '#fafafa', color: '#888' }}
            />
          </Form.Item>

          {/* 状態切替 */}
          <Form.Item label="状態" style={{ marginBottom: 0 }}>
            <Space align="center">
              {/* 旧バージョン：非推奨固定 */}
              {!isLatestVersion ? (
                <>
                  <Tag color="default" style={{ fontWeight: 600, marginRight: 8 }}>○ 非推奨</Tag>
                  <Switch
                    checked={false}
                    checkedChildren="有効"
                    unCheckedChildren="非推奨"
                    disabled
                  />
                  <span style={{ fontSize: 12, color: '#aaa' }}>
                    旧バージョンのため変更できません
                  </span>
                </>
              ) : statusState === 'active' ? (
                /* 最新バージョン・有効 */
                <>
                  <Tag color="success" style={{ fontWeight: 600, marginRight: 8 }}>● 有効</Tag>
                  <Switch
                    checked={true}
                    checkedChildren="有効"
                    unCheckedChildren="非推奨"
                    onChange={(checked) =>
                      setStatusState(checked ? 'active' : 'deprecated')
                    }
                  />
                  <span style={{ fontSize: 12, color: '#888' }}>
                    オフにすると「非推奨」に変更されます
                  </span>
                </>
              ) : (
                /* 最新バージョン・非推奨 */
                <>
                  <Tag color="default" style={{ fontWeight: 600, marginRight: 8 }}>○ 非推奨</Tag>
                  <Switch
                    checked={false}
                    checkedChildren="有効"
                    unCheckedChildren="非推奨"
                    onChange={(checked) =>
                      setStatusState(checked ? 'active' : 'deprecated')
                    }
                  />
                  <span style={{ fontSize: 12, color: '#888' }}>
                    オンにすると「有効」に変更されます
                  </span>
                </>
              )}
            </Space>
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
                name="xsiType"
                label={<span>xsi:type <span style={{ color: '#ff4d4f' }}>*</span></span>}
                style={{ marginBottom: 0 }}
              >
                <Select options={XSI_TYPE_OPTIONS} />
              </Form.Item>
              <Form.Item
                name="units"
                label={<span>units <span style={{ color: '#ff4d4f' }}>*</span></span>}
                style={{ marginBottom: 0 }}
              >
                <Input />
              </Form.Item>
              <Form.Item name="formatString" label="formatString" style={{ marginBottom: 0 }}>
                <Input />
              </Form.Item>
            </div>
          )}

          {/* 定性モード */}
          {evalMode === 'qualitative' && (
            <QualitativeOptionEditor
              options={qualitativeOptions}
              radioName="defaultOptionDetail"
              onChange={setQualitativeOptions}
            />
          )}
        </div>

      </Form>

      {/* ===== 差分プレビューモーダル ===== */}
      <TemplateDiffPreviewModal
        open={diffPreviewOpen}
        template={template}
        onClose={() => setDiffPreviewOpen(false)}
        onSave={() => {
          setDiffPreviewOpen(false);
          handleSave();
        }}
      />
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
