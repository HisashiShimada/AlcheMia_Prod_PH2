'use client';

import React, { useState } from 'react';
import {
  Modal, Form, Input, Select, Button, Divider, Alert, Typography, message,
} from 'antd';
import {
  LinkOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

// ──────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────
type Level = 'global' | 'organization' | 'personal';

interface NamespaceFormValues {
  level: Level;
  scope: string;
  prefix: string;
  uri: string;
  displayName: string;
  description: string;
  parentNamespace: string | null;
  orcidUri: string;
}

interface NamespaceAddDialogProps {
  open: boolean;
  onClose: () => void;
  onRegistered: (values: NamespaceFormValues) => void;
}

// ──────────────────────────────────────────────
// スコープ選択肢（uncertainty-scope.json のツリーをフラット展開）
// ──────────────────────────────────────────────
const scopeOptions = [
  { value: 'dept-rd',          label: '研究開発部',                  level: 'organization' as Level },
  { value: 'rd-materials',     label: '研究開発部 › 材料グループ',   level: 'organization' as Level },
  { value: 'rd-measurement',   label: '研究開発部 › 計測チーム',     level: 'organization' as Level },
  { value: 'dept-mfg',         label: '生産技術部',                  level: 'organization' as Level },
  { value: 'mfg-process',      label: '生産技術部 › プロセスチーム', level: 'organization' as Level },
  { value: 'mfg-qa',           label: '生産技術部 › 品質管理',       level: 'organization' as Level },
  { value: 'dept-qa',          label: '品質保証部',                  level: 'organization' as Level },
  { value: 'user-me',          label: 'Personal › 山田 太郎（自分）', level: 'personal'      as Level },
];

// ──────────────────────────────────────────────
// 親名前空間の選択肢（モック）
// ──────────────────────────────────────────────
const parentOptions = [
  { value: 'ns-corpa', label: 'CorpA  (https://www.corpa.co.jp/)' },
  { value: 'ns-laba',  label: 'LabA  (https://corpa.co.jp/lab/)' },
];

// ──────────────────────────────────────────────
// レベル別ガイダンスメッセージ
// ──────────────────────────────────────────────
const levelGuidance: Record<Level, string> = {
  global:       'グローバルレベルの名前空間は全組織・全ユーザーから参照可能な公式名前空間です。',
  organization: 'DNSベースのURIを推奨します。組織内で一意なプレフィックスを使用してください。',
  personal:     'ORCIDベースのURIを推奨します。',
};

// ──────────────────────────────────────────────
// バリデーション：xs:NCName
// ──────────────────────────────────────────────
const ncNamePattern = /^[A-Za-z_][A-Za-z0-9._\-]*$/;
const validatePrefix = (_: unknown, value: string) => {
  if (!value) return Promise.reject('接頭辞は必須です');
  if (!ncNamePattern.test(value))
    return Promise.reject('英字または _ で始まる英数字・アンダースコア・ハイフン・ピリオドのみ使用可能です');
  return Promise.resolve();
};

const validateUri = (_: unknown, value: string) => {
  if (!value) return Promise.reject('URIは必須です');
  if (!value.startsWith('https://') && !value.startsWith('http://') && !value.startsWith('urn:'))
    return Promise.reject('https:// または http:// または urn: で始まる有効なURIを入力してください');
  return Promise.resolve();
};

// ──────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────
const NamespaceAddDialog: React.FC<NamespaceAddDialogProps> = ({ open, onClose, onRegistered }) => {
  const [form]  = Form.useForm<NamespaceFormValues>();
  const [level, setLevel] = useState<Level>('organization');

  const handleScopeChange = (val: string) => {
    const selected = scopeOptions.find((o) => o.value === val);
    const newLevel: Level = selected?.level ?? 'organization';
    setLevel(newLevel);
    form.setFieldValue('level', newLevel);
    form.setFieldValue('parentNamespace', null);
    form.setFieldValue('orcidUri', '');
  };

  const handleOrcidAutoFill = () => {
    const orcidId = '0000-0002-2494-9603';
    form.setFieldValue('uri', `https://orcid.org/${orcidId}`);
    message.success('ORCIDからURIを自動入力しました');
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onRegistered(values);
      form.resetFields();
      setLevel('organization');
      message.success(`名前空間「${values.prefix}」を登録しました`);
    } catch {
      // バリデーションエラーは Form が表示
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setLevel('organization');
    onClose();
  };

  return (
    <Modal
      open={open}
      title="組織階層を追加"
      width={720}
      onCancel={handleCancel}
      footer={null}
      maskClosable={false}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ level: 'organization' }}
        requiredMark="optional"
      >
        {/* ── スコープ（登録先） ── */}
        <Form.Item
          label="スコープ（登録先）"
          name="scope"
          rules={[{ required: true, message: 'スコープを選択してください' }]}
        >
          <Select
            showSearch
            placeholder="検索または選択..."
            optionFilterProp="label"
            onChange={handleScopeChange}
            options={scopeOptions.map((o) => ({ value: o.value, label: o.label }))}
          />
        </Form.Item>

        {/* ── レベル別ガイダンス ── */}
        <Alert
          type="info"
          showIcon
          message={levelGuidance[level]}
          style={{ marginBottom: 16, fontSize: 12 }}
        />

        <Divider style={{ margin: '8px 0 16px' }} />

        {/* ── 接頭辞 ── */}
        <Form.Item
          label="接頭辞 (Prefix)"
          name="prefix"
          rules={[{ required: true, message: '接頭辞は必須です' }, { validator: validatePrefix }]}
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              xs:NCName規則: 英字または _ で始まる英数字・アンダースコア・ハイフン・ピリオドのみ
            </Text>
          }
        >
          <Input placeholder="例: CorpA" maxLength={64} />
        </Form.Item>

        {/* ── URI ── */}
        <Form.Item
          label="URI"
          name="uri"
          rules={[{ required: true, message: 'URIは必須です' }, { validator: validateUri }]}
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              https:// または urn: で始まる有効なURIを入力してください
            </Text>
          }
        >
          <Input placeholder="例: https://www.corpa.co.jp/" />
        </Form.Item>

        {/* ── 表示名（任意） ── */}
        <Form.Item
          label="表示名"
          name="displayName"
          extra={
            <Text type="secondary" style={{ fontSize: 12 }}>
              ツール内での表示用ラベル（任意）
            </Text>
          }
        >
          <Input placeholder="例: CorpA 社内用語" maxLength={128} />
        </Form.Item>

        {/* ── 説明（任意） ── */}
        <Form.Item label="説明" name="description">
          <Input.TextArea
            placeholder="名前空間の用途・背景を入力..."
            rows={3}
            maxLength={512}
            showCount
          />
        </Form.Item>

        {/* ── 親名前空間（組織レベルのみ） ── */}
        {level === 'organization' && (
          <Form.Item
            label="親名前空間"
            name="parentNamespace"
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                ※ 組織レベル選択時のみ表示
              </Text>
            }
          >
            <Select
              placeholder="（親名前空間を選択）"
              allowClear
              options={parentOptions}
            />
          </Form.Item>
        )}

        {/* ── ORCID自動入力（個人レベルのみ） ── */}
        {level === 'personal' && (
          <Form.Item
            label="ORCID 自動入力"
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                ※ 個人レベル選択時のみ表示
              </Text>
            }
          >
            <Button icon={<LinkOutlined />} onClick={handleOrcidAutoFill}>
              🔗 ORCID から URI を自動入力
            </Button>
          </Form.Item>
        )}

        {/* ── フッターボタン ── */}
        <Divider style={{ margin: '8px 0 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button type="primary" onClick={handleSubmit}>
            ✔ 登録する
          </Button>
          <Button onClick={handleCancel}>
            ✕ キャンセル
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default NamespaceAddDialog;
