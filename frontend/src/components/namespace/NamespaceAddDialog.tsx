'use client';

import React, { useState } from 'react';
import {
  Modal, Form, Input, Select, Radio, Button, Divider, Alert, Typography, message,
} from 'antd';
import {
  CheckOutlined, CloseOutlined, LinkOutlined,
} from '@ant-design/icons';
import { generateNamespaceUri } from '@/utils/namespaceUriGenerator';
import type { Level, NamespaceFormValues, NamespaceAddDialogProps } from '@/types/namespace';

const { Text } = Typography;

// ──────────────────────────────────────────────
// モック: ログインユーザーの組織CD・部署CD
// 本番実装では認証APIから取得する
// ──────────────────────────────────────────────
const MOCK_ORG_CD  = 'ORG001';
const MOCK_DEPT_CD = 'RD';

// ──────────────────────────────────────────────
// 親名前空間の選択肢（モック）
// ──────────────────────────────────────────────
const parentOptions = [
  { value: 'ns-corpa', label: 'CorpA  (https://www.corpa.co.jp/)' },
  { value: 'ns-laba',  label: 'LabA  (https://corpa.co.jp/lab/)' },
];

// ──────────────────────────────────────────────
// レベル別 URI ガイダンスメッセージ
// ──────────────────────────────────────────────
const uriGuidance: Record<Level, string> = {
  global:       'https:// または urn: で始まる有効なURIを入力してください',
  organization: '接頭辞（Prefix）をもとに自動生成されます',
  personal:     'https://orcid.org/XXXX-XXXX-XXXX-XXXX 形式のORCID URIを推奨します',
};

// ──────────────────────────────────────────────
// レベル別ガイダンスメッセージ（Alert）
// ──────────────────────────────────────────────
const levelGuidance: Record<Level, string> = {
  global:       'グローバルレベルの名前空間は全組織・全ユーザーから参照可能な公式名前空間です。',
  organization: 'URIは組織CD・部署CD・接頭辞（チームID）を連結して自動生成されます。',
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
  if (value.length > 64) return Promise.reject('64文字以内で入力してください');
  return Promise.resolve();
};

const validateUri = (_: unknown, value: string) => {
  if (!value) return Promise.reject('URIは必須です');
  if (!value.startsWith('https://') && !value.startsWith('http://') && !value.startsWith('urn:'))
    return Promise.reject('https:// または urn: で始まる有効なURIを入力してください');
  if (value.length > 512) return Promise.reject('512文字以内で入力してください');
  return Promise.resolve();
};

// ──────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────
const NamespaceAddDialog: React.FC<NamespaceAddDialogProps> = ({ open, onClose, onRegistered }) => {
  const [form]  = Form.useForm<NamespaceFormValues>();
  const [level, setLevel] = useState<Level>('organization');

  // organization レベル時に Prefix の入力に連動してURIプレビューを生成
  const watchedPrefix: string = Form.useWatch('prefix', form) ?? '';
  const autoUri = level === 'organization'
    ? generateNamespaceUri(MOCK_ORG_CD, MOCK_DEPT_CD, watchedPrefix || undefined)
    : '';

  const handleLevelChange = (val: Level) => {
    setLevel(val);
    form.setFieldValue('parentNamespace', null);
    // organization → 他レベルへ切り替えた際にURIをクリア
    if (val !== 'organization') {
      form.setFieldValue('uri', '');
    }
  };

  const handleOrcidAutoFill = () => {
    // モック: 実際は OAuth2 ポップアップで取得
    const orcidId = '0000-0002-2494-9603';
    form.setFieldValue('uri', `https://orcid.org/${orcidId}`);
    message.success('ORCIDからURIを自動入力しました');
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      // organization レベルの場合は自動生成URIをセット
      if (level === 'organization') {
        values.uri = autoUri;
      }
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
      title="名前空間追加"
      width={560}
      onCancel={handleCancel}
      footer={null}
      maskClosable={false}
      keyboard
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ level: 'organization' }}
        requiredMark="optional"
      >
        {/* ── レベル選択 ── */}
        <Form.Item
          label="レベル"
          name="level"
          rules={[{ required: true, message: 'レベルを選択してください' }]}
        >
          <Radio.Group
            onChange={(e) => handleLevelChange(e.target.value as Level)}
          >
            <Radio value="global">グローバル（Global）</Radio>
            <Radio value="organization">組織 (Organization)</Radio>
            <Radio value="personal">個人 (Personal)</Radio>
          </Radio.Group>
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
        {level === 'organization' ? (
          /* organization レベル: 自動生成プレビュー（読み取り専用） */
          <Form.Item
            label="URI（自動生成）"
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {uriGuidance[level]}（組織CD: {MOCK_ORG_CD} / 部署CD: {MOCK_DEPT_CD} / チームID: 接頭辞）
              </Text>
            }
          >
            <Input
              value={autoUri || '（接頭辞を入力すると自動生成されます）'}
              readOnly
              style={{
                backgroundColor: '#f5f5f5',
                color: autoUri ? '#333' : '#aaa',
                cursor: 'default',
              }}
              prefix={<LinkOutlined style={{ color: '#aaa' }} />}
            />
          </Form.Item>
        ) : (
          /* global / personal レベル: 手入力 */
          <Form.Item
            label="URI"
            name="uri"
            rules={[{ required: true, message: 'URIは必須です' }, { validator: validateUri }]}
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                {uriGuidance[level]}
              </Text>
            }
          >
            <Input placeholder="例: https://www.corpa.co.jp/" maxLength={512} />
          </Form.Item>
        )}

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
            autoSize={{ minRows: 3, maxRows: 6 }}
            maxLength={1000}
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
                ※ 組織レベル選択時のみ表示。階層構造を持たせる場合に親を選択。
              </Text>
            }
          >
            <Select
              placeholder="（親名前空間を選択）"
              allowClear
              showSearch
              optionFilterProp="label"
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
          <Button type="primary" icon={<CheckOutlined />} onClick={handleSubmit}>
            登録する
          </Button>
          <Button icon={<CloseOutlined />} onClick={handleCancel}>
            キャンセル
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default NamespaceAddDialog;
