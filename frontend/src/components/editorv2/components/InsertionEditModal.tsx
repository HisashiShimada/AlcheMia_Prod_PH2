'use client';

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Radio,
  Space,
  Typography,
  Alert,
  Divider,
  Tag,
  Tooltip,
  Button,
  message,
} from 'antd';
import {
  LinkOutlined,
  FileTextOutlined,
  FileImageOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  SaveOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

// ----------------------------------------
// 型定義
// ----------------------------------------

type InsertionFileType = 'maiml' | 'non-maiml';
type InsertionLocation = 'document' | 'method' | 'result' | 'property' | 'content' | 'other';

interface InsertionItem {
  id: string;
  uri: string;
  hash: string;
  hashMethod: string;
  uuid: string | null;
  format: string;
  fileType: InsertionFileType;
  insertionLocation: InsertionLocation;
  status: 'valid' | 'warning' | 'error';
  description: string;
}

interface InsertionEditModalProps {
  open: boolean;
  insertion: InsertionItem | null;
  onClose: () => void;
  onSave: (updated: InsertionItem) => void;
}

// ----------------------------------------
// MIMEメディア型の候補リスト
// ----------------------------------------
const MIME_TYPE_OPTIONS = [
  { label: 'application/maiml（MaiMLファイル）', value: 'application/maiml' },
  { label: 'application/maiml.ZIP（ZIP圧縮MaiML）', value: 'application/maiml.ZIP' },
  { label: 'image/tiff（TIFF画像）', value: 'image/tiff' },
  { label: 'image/png（PNG画像）', value: 'image/png' },
  { label: 'image/bmp（BMP画像）', value: 'image/bmp' },
  { label: 'audio/mp4（音声データ）', value: 'audio/mp4' },
  { label: 'video/mp4（動画データ）', value: 'video/mp4' },
  { label: 'text/rdf（オントロジー記述）', value: 'text/rdf' },
  { label: 'text/dtd（用語定義）', value: 'text/dtd' },
  { label: 'text/xml（汎用XML）', value: 'text/xml' },
];

/** モック: ダミーのSHA-256ハッシュを再計算 */
function mockRecalcHash(_uri: string): string {
  return 'sha256:' + Array.from({ length: 43 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'[
      Math.floor(Math.random() * 64)
    ]
  ).join('') + '=';
}

/** モック: document/uuid 再取得 */
function mockRefetchUuid(_uri: string): string {
  return `${crypto.randomUUID ? crypto.randomUUID() : '550e8400-e29b-41d4-a716-' + Math.random().toString(16).slice(2, 14)}`;
}

// ----------------------------------------
// メインコンポーネント
// ----------------------------------------

/**
 * InsertionEditModal
 * 既存Insertionの編集ダイアログ
 * 要件: ED-02〜ED-05, PF-05〜PF-15
 */
const InsertionEditModal: React.FC<InsertionEditModalProps> = ({
  open,
  insertion,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<InsertionItem | null>(null);
  const [isHashRecalculating, setIsHashRecalculating] = useState(false);
  const [isUuidRefetching, setIsUuidRefetching] = useState(false);
  const [hashChanged, setHashChanged] = useState(false);

  // insertionが変わるたびにフォームを初期化
  useEffect(() => {
    if (insertion) {
      setForm({ ...insertion });
      setHashChanged(false);
    }
  }, [insertion]);

  if (!form) return null;

  const handleChange = (patch: Partial<InsertionItem>) => {
    setForm((prev) => prev ? { ...prev, ...patch } : prev);
  };

  /** ハッシュ値の再計算（モック） */
  const handleRecalcHash = () => {
    if (!form.uri) {
      message.warning('URIを入力してからハッシュ値を計算してください');
      return;
    }
    setIsHashRecalculating(true);
    setTimeout(() => {
      const newHash = mockRecalcHash(form.uri);
      handleChange({ hash: newHash });
      setIsHashRecalculating(false);
      setHashChanged(true);
      message.success('SHA-256ハッシュ値を再計算しました（モック）');
    }, 800);
  };

  /** UUIDの再取得（モック） */
  const handleRefetchUuid = () => {
    if (!form.uri) {
      message.warning('URIを入力してからUUIDを取得してください');
      return;
    }
    setIsUuidRefetching(true);
    setTimeout(() => {
      const newUuid = mockRefetchUuid(form.uri);
      handleChange({ uuid: newUuid });
      setIsUuidRefetching(false);
      message.success('参照ファイルのdocument/uuidを再取得しました（モック）');
    }, 600);
  };

  /** 保存 */
  const handleSave = () => {
    if (!form.uri.trim()) {
      message.error('URIは必須です');
      return;
    }
    if (!form.hash.trim()) {
      message.error('ハッシュ値は必須です');
      return;
    }
    if (form.fileType === 'maiml' && !form.uuid?.trim()) {
      message.error('MaiMLファイルの場合、UUIDは必須です');
      return;
    }
    onSave({ ...form, status: 'valid' });
    message.success('Insertionを更新しました');
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <LinkOutlined style={{ color: '#1677ff' }} />
          <Text strong>Insertion 編集</Text>
          <Tag color="orange">編集中</Tag>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={640}
      footer={
        <Space>
          <Button onClick={onClose}>キャンセル</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
          >
            変更を保存
          </Button>
        </Space>
      }
      destroyOnClose
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>

        {/* 種別表示（変更不可）とURIの変更警告 */}
        <Alert
          type="info"
          showIcon
          message="Insertionの種別（MaiML / 非MaiML）は変更できません"
          description="種別を変えたい場合は、このInsertionを削除して新規追加してください。"
        />

        {/* 種別バッジ（読み取り専用） */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text type="secondary">種別:</Text>
          {form.fileType === 'maiml' ? (
            <Space size={6}>
              <FileTextOutlined style={{ color: '#1677ff' }} />
              <Tag color="blue">MaiMLファイル</Tag>
            </Space>
          ) : (
            <Space size={6}>
              <FileImageOutlined style={{ color: '#52c41a' }} />
              <Tag color="green">非MaiMLファイル</Tag>
            </Space>
          )}
          <Text type="secondary" style={{ fontSize: 12 }}>（変更不可）</Text>
        </div>

        <Divider style={{ margin: '0' }} />

        {/* URI */}
        <Form.Item
          label={
            <Space>
              <Text strong>URI（ファイルパス）</Text>
              <Tooltip title="相対パスまたは絶対URI。変更した場合はハッシュ値の再計算が必要です。">
                <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
              </Tooltip>
            </Space>
          }
          required
          style={{ marginBottom: 0 }}
        >
          <Input
            prefix={<LinkOutlined />}
            value={form.uri}
            onChange={(e) => {
              handleChange({ uri: e.target.value });
              setHashChanged(false);
            }}
            allowClear
            placeholder="例: ./ref/calibration_params.maiml"
          />
        </Form.Item>

        {/* ハッシュ値 */}
        <Form.Item
          label={
            <Space>
              <Text strong>ハッシュ値</Text>
              <Tooltip title="参照ファイル全体のSHA-256ハッシュ値（JIS K 0200 箇条7.9.2）">
                <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
              </Tooltip>
            </Space>
          }
          required
          style={{ marginBottom: 0 }}
        >
          <Space.Compact style={{ width: '100%' }}>
            <Select
              value={form.hashMethod}
              onChange={(v) => handleChange({ hashMethod: v })}
              style={{ width: 120 }}
            >
              <Option value="SHA-256">SHA-256</Option>
              <Option value="SHA-384">SHA-384</Option>
              <Option value="SHA-512">SHA-512</Option>
            </Select>
            <Input
              placeholder="base64形式のハッシュ値"
              value={form.hash}
              onChange={(e) => handleChange({ hash: e.target.value })}
              style={{ flex: 1 }}
            />
            <Button
              icon={<ReloadOutlined spin={isHashRecalculating} />}
              onClick={handleRecalcHash}
              loading={isHashRecalculating}
              disabled={!form.uri}
            >
              再計算
            </Button>
          </Space.Compact>
          {hashChanged && (
            <Space style={{ marginTop: 4 }}>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>ハッシュ値を再計算しました</Text>
            </Space>
          )}
          {!hashChanged && form.hash && (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginTop: 6, fontSize: 12 }}
              message="URIを変更した場合、ハッシュ値の再計算が必要です"
            />
          )}
        </Form.Item>

        {/* UUID（MaiMLファイルのみ） */}
        {form.fileType === 'maiml' && (
          <Form.Item
            label={
              <Space>
                <Text strong>UUID</Text>
                <Tag color="blue">MaiMLファイルのみ</Tag>
                <Tooltip title="参照MaiMLファイルの<document>/<uuid>要素の値と同一にする必要があります（PF-08）">
                  <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                </Tooltip>
              </Space>
            }
            required
            style={{ marginBottom: 0 }}
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="例: 550e8400-e29b-41d4-a716-446655440001"
                value={form.uuid ?? ''}
                onChange={(e) => handleChange({ uuid: e.target.value })}
                style={{ flex: 1 }}
              />
              <Button
                icon={<ReloadOutlined spin={isUuidRefetching} />}
                onClick={handleRefetchUuid}
                loading={isUuidRefetching}
                disabled={!form.uri}
              >
                再取得
              </Button>
            </Space.Compact>
          </Form.Item>
        )}

        {/* フォーマット（MIME型） */}
        <Form.Item
          label={
            <Space>
              <Text strong>フォーマット（MIMEメディア型）</Text>
              <Tag color="green">推奨</Tag>
            </Space>
          }
          style={{ marginBottom: 0 }}
        >
          <Select
            value={form.format}
            onChange={(v) => handleChange({ format: v })}
            placeholder="MIMEメディア型を選択または入力"
            showSearch
            allowClear
            style={{ width: '100%' }}
            optionFilterProp="label"
            options={MIME_TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
          />
        </Form.Item>

        {/* 記述場所 */}
        <Form.Item
          label={<Text strong>記述場所</Text>}
          style={{ marginBottom: 0 }}
        >
          {form.fileType === 'maiml' ? (
            <Radio.Group
              value={form.insertionLocation}
              onChange={(e) => handleChange({ insertionLocation: e.target.value })}
            >
              <Radio.Button value="document">{'<document>'} 直下</Radio.Button>
              <Radio.Button value="method">{'<method>'} 直下</Radio.Button>
            </Radio.Group>
          ) : (
            <Select
              value={form.insertionLocation}
              style={{ width: 280 }}
              onChange={(v) => handleChange({ insertionLocation: v as InsertionLocation })}
            >
              <Option value="result">{'<result>'} 直下</Option>
              <Option value="property">{'<property>'} 直下</Option>
              <Option value="content">{'<content>'} 直下</Option>
              <Option value="other">その他のグローバル要素直下</Option>
            </Select>
          )}
        </Form.Item>

        {/* 説明 */}
        <Form.Item
          label={<Text strong>説明（任意）</Text>}
          style={{ marginBottom: 0 }}
        >
          <Input.TextArea
            value={form.description}
            onChange={(e) => handleChange({ description: e.target.value })}
            rows={2}
            maxLength={200}
            showCount
            placeholder="このInsertionの用途・説明"
          />
        </Form.Item>

      </Space>
    </Modal>
  );
};

export default InsertionEditModal;
