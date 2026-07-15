'use client';

import React, { useState } from 'react';
import {
  Modal,
  Steps,
  Button,
  Form,
  Input,
  Select,
  Radio,
  Space,
  Typography,
  Alert,
  Divider,
  Tag,
  Descriptions,
  Tooltip,
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
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { Option } = Select;

// ----------------------------------------
// 型定義
// ----------------------------------------

/** 参照ファイルの種別 */
type InsertionFileType = 'maiml' | 'non-maiml';

/** Insertionの記述場所 */
type InsertionLocation = 'document' | 'method' | 'result' | 'property' | 'content' | 'other';

/** ウィザードで入力するInsertionデータ */
interface InsertionFormData {
  fileType: InsertionFileType;
  insertionLocation: InsertionLocation;
  uri: string;
  hash: string;
  hashMethod: string;
  uuid: string;
  format: string;
  description: string;
}

/** モックの完成したInsertion定義 */
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

interface InsertionWizardModalProps {
  /** モーダルの表示状態 */
  open: boolean;
  /** 閉じるコールバック */
  onClose: () => void;
  /** Insertion追加完了コールバック */
  onAdd: (insertion: InsertionItem) => void;
}

// ----------------------------------------
// MIMEメディア型の候補リスト
// ----------------------------------------
const MIME_TYPE_OPTIONS: { label: string; value: string; ext: string }[] = [
  { label: 'application/maiml（MaiMLファイル）', value: 'application/maiml', ext: '.maiml' },
  { label: 'application/maiml.ZIP（ZIP圧縮MaiML）', value: 'application/maiml.ZIP', ext: '.maiml.zip' },
  { label: 'image/tiff（TIFF画像）', value: 'image/tiff', ext: '.tiff / .tif' },
  { label: 'image/png（PNG画像）', value: 'image/png', ext: '.png' },
  { label: 'image/bmp（BMP画像）', value: 'image/bmp', ext: '.bmp' },
  { label: 'audio/mp4（音声データ）', value: 'audio/mp4', ext: '.mp4' },
  { label: 'video/mp4（動画データ）', value: 'video/mp4', ext: '.mp4' },
  { label: 'text/rdf（オントロジー記述）', value: 'text/rdf', ext: '.rdf' },
  { label: 'text/dtd（用語定義）', value: 'text/dtd', ext: '.dtd' },
  { label: 'text/xml（汎用XML）', value: 'text/xml', ext: '.xml' },
];

/** 拡張子からMIMEメディア型を推定する */
function guessMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.maiml.zip')) return 'application/maiml.ZIP';
  if (lower.endsWith('.maiml')) return 'application/maiml';
  if (lower.endsWith('.tiff') || lower.endsWith('.tif')) return 'image/tiff';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.bmp')) return 'image/bmp';
  if (lower.endsWith('.rdf')) return 'text/rdf';
  if (lower.endsWith('.dtd')) return 'text/dtd';
  if (lower.endsWith('.xml')) return 'text/xml';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  return '';
}

/** モック: ダミーのSHA-256ハッシュを生成する */
function mockCalculateSha256(_uri: string): string {
  return 'sha256:' + Array.from({ length: 43 }, () =>
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'[
      Math.floor(Math.random() * 64)
    ]
  ).join('') + '=';
}

/** モック: MaiMLファイルのdocument/uuidを取得する */
function mockFetchMaimlUuid(_uri: string): string {
  return `${crypto.randomUUID ? crypto.randomUUID() : '550e8400-e29b-41d4-a716-' + Math.random().toString(16).slice(2, 14)}`;
}

// ----------------------------------------
// 各ステップのコンポーネント
// ----------------------------------------

/** Step 1: 参照ファイル種別 & 記述場所の選択 */
const StepSelectType: React.FC<{
  form: InsertionFormData;
  onChange: (patch: Partial<InsertionFormData>) => void;
}> = ({ form, onChange }) => (
  <Space direction="vertical" size="large" style={{ width: '100%' }}>
    <div>
      <Text strong style={{ fontSize: 15 }}>参照ファイルの種別を選択してください</Text>
      <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
        種別によって、MaiMLファイル内の記述場所のルールが異なります。
      </Text>
    </div>

    <Radio.Group
      value={form.fileType}
      onChange={(e) => {
        const ft: InsertionFileType = e.target.value;
        onChange({
          fileType: ft,
          insertionLocation: ft === 'maiml' ? 'document' : 'result',
          uuid: '',
          format: ft === 'maiml' ? 'application/maiml' : '',
        });
      }}
      style={{ width: '100%' }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        {/* MaiMLファイル選択肢 */}
        <div
          style={{
            border: `2px solid ${form.fileType === 'maiml' ? '#1677ff' : '#d9d9d9'}`,
            borderRadius: 8,
            padding: '16px 20px',
            cursor: 'pointer',
            backgroundColor: form.fileType === 'maiml' ? '#e6f4ff' : '#fff',
            transition: 'all 0.2s',
          }}
          onClick={() => onChange({ fileType: 'maiml', insertionLocation: 'document', uuid: '', format: 'application/maiml' })}
        >
          <Radio value="maiml">
            <Space>
              <FileTextOutlined style={{ color: '#1677ff', fontSize: 20 }} />
              <div>
                <Text strong>MaiMLファイル</Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                  前工程プロセス・条件テンプレート・材料テンプレート等のMaiML形式ファイル
                </Text>
              </div>
            </Space>
          </Radio>
          {form.fileType === 'maiml' && (
            <Alert
              type="info"
              showIcon
              style={{ marginTop: 10, fontSize: 12 }}
              message={
                <span>
                  記述場所は <Tag color="blue">{'<document>'}</Tag> または <Tag color="blue">{'<method>'}</Tag> 直下に限定されます（JIS K 0200 箇条6.3.5/6.3.6）
                </span>
              }
            />
          )}
        </div>

        {/* 非MaiMLファイル選択肢 */}
        <div
          style={{
            border: `2px solid ${form.fileType === 'non-maiml' ? '#1677ff' : '#d9d9d9'}`,
            borderRadius: 8,
            padding: '16px 20px',
            cursor: 'pointer',
            backgroundColor: form.fileType === 'non-maiml' ? '#e6f4ff' : '#fff',
            transition: 'all 0.2s',
          }}
          onClick={() => onChange({ fileType: 'non-maiml', insertionLocation: 'result', uuid: '', format: '' })}
        >
          <Radio value="non-maiml">
            <Space>
              <FileImageOutlined style={{ color: '#52c41a', fontSize: 20 }} />
              <div>
                <Text strong>非MaiMLファイル</Text>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                  画像（TIFF/PNG）・動画・オントロジー（RDF）・バイナリデータ等
                </Text>
              </div>
            </Space>
          </Radio>
          {form.fileType === 'non-maiml' && (
            <Alert
              type="success"
              showIcon
              style={{ marginTop: 10, fontSize: 12 }}
              message={
                <span>
                  任意のグローバル要素（<Tag>{'<result>'}</Tag> <Tag>{'<property>'}</Tag> <Tag>{'<content>'}</Tag> 等）直下に記述できます
                </span>
              }
            />
          )}
        </div>
      </Space>
    </Radio.Group>

    {/* 記述場所の選択 */}
    <div>
      <Text strong>記述場所（親ファイル内の配置位置）</Text>
      <div style={{ marginTop: 8 }}>
        {form.fileType === 'maiml' ? (
          <Radio.Group
            value={form.insertionLocation}
            onChange={(e) => onChange({ insertionLocation: e.target.value })}
          >
            <Radio.Button value="document">{'<document>'} 直下</Radio.Button>
            <Radio.Button value="method">{'<method>'} 直下</Radio.Button>
          </Radio.Group>
        ) : (
          <Select
            value={form.insertionLocation}
            style={{ width: 280 }}
            onChange={(v) => onChange({ insertionLocation: v as InsertionLocation })}
          >
            <Option value="result">{'<result>'} 直下</Option>
            <Option value="property">{'<property>'} 直下</Option>
            <Option value="content">{'<content>'} 直下</Option>
            <Option value="other">その他のグローバル要素直下</Option>
          </Select>
        )}
      </div>
    </div>
  </Space>
);

/** Step 2: URIとハッシュ・UUID・フォーマットの指定 */
const StepFileDetails: React.FC<{
  form: InsertionFormData;
  onChange: (patch: Partial<InsertionFormData>) => void;
  isHashCalculating: boolean;
  isUuidFetching: boolean;
  onCalculateHash: () => void;
  onFetchUuid: () => void;
}> = ({ form, onChange, isHashCalculating, isUuidFetching, onCalculateHash, onFetchUuid }) => (
  <Space direction="vertical" size="large" style={{ width: '100%' }}>

    {/* URI入力 */}
    <Form.Item
      label={
        <Space>
          <Text strong>URI（ファイルパス）</Text>
          <Tooltip title="相対パスまたは絶対URI。ローカルファイルはfile:プロトコルを省略した相対パスで指定します（例: ./ref/file.maiml）">
            <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
          </Tooltip>
        </Space>
      }
      required
      style={{ marginBottom: 0 }}
    >
      <Input
        prefix={<LinkOutlined />}
        placeholder="例: ./ref/calibration_params.maiml"
        value={form.uri}
        onChange={(e) => {
          const newUri = e.target.value;
          const guessed = guessMimeType(newUri);
          onChange({
            uri: newUri,
            format: guessed || form.format,
          });
        }}
        style={{ width: '100%' }}
        allowClear
      />
      {form.uri && guessMimeType(form.uri) && (
        <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
          💡 拡張子から <Tag>{guessMimeType(form.uri)}</Tag> を自動推定しました
        </Text>
      )}
    </Form.Item>

    {/* ハッシュ値 */}
    <Form.Item
      label={
        <Space>
          <Text strong>ハッシュ値（SHA-256）</Text>
          <Tooltip title="参照ファイル全体のSHA-256ハッシュ値（base64Binary形式）。改ざん検知に使用します（JIS K 0200 箇条7.9.2）">
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
          onChange={(v) => onChange({ hashMethod: v })}
          style={{ width: 120 }}
        >
          <Option value="SHA-256">SHA-256</Option>
          <Option value="SHA-384">SHA-384</Option>
          <Option value="SHA-512">SHA-512</Option>
        </Select>
        <Input
          placeholder="base64形式のハッシュ値"
          value={form.hash}
          onChange={(e) => onChange({ hash: e.target.value })}
          style={{ flex: 1 }}
        />
        <Button
          icon={<ReloadOutlined spin={isHashCalculating} />}
          onClick={onCalculateHash}
          loading={isHashCalculating}
          disabled={!form.uri}
        >
          自動計算
        </Button>
      </Space.Compact>
      {form.hash && (
        <Space style={{ marginTop: 4 }}>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>ハッシュ値が設定されています</Text>
        </Space>
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
            value={form.uuid}
            onChange={(e) => onChange({ uuid: e.target.value })}
            style={{ flex: 1 }}
          />
          <Button
            icon={<ReloadOutlined spin={isUuidFetching} />}
            onClick={onFetchUuid}
            loading={isUuidFetching}
            disabled={!form.uri}
          >
            参照ファイルから取得
          </Button>
        </Space.Compact>
        {form.uuid && (
          <Space style={{ marginTop: 4 }}>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <Text type="secondary" style={{ fontSize: 12 }}>参照ファイルの document/uuid から取得済み</Text>
          </Space>
        )}
      </Form.Item>
    )}

    {/* フォーマット（MIME型） */}
    <Form.Item
      label={
        <Space>
          <Text strong>フォーマット（MIMEメディア型）</Text>
          <Tag color="green">推奨</Tag>
          <Tooltip title="外部ファイルの種別を識別するMIMEメディア型（JIS X 5810-1準拠）">
            <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
          </Tooltip>
        </Space>
      }
      style={{ marginBottom: 0 }}
    >
      <Select
        value={form.format}
        onChange={(v) => onChange({ format: v })}
        placeholder="MIMEメディア型を選択または入力"
        showSearch
        allowClear
        style={{ width: '100%' }}
        optionFilterProp="label"
        options={MIME_TYPE_OPTIONS.map((o) => ({
          label: o.label,
          value: o.value,
        }))}
      />
    </Form.Item>

    {/* 説明（任意） */}
    <Form.Item
      label={<Text strong>説明（任意）</Text>}
      style={{ marginBottom: 0 }}
    >
      <Input.TextArea
        placeholder="このInsertionの用途・説明を入力（任意）"
        value={form.description}
        onChange={(e) => onChange({ description: e.target.value })}
        rows={2}
        maxLength={200}
        showCount
      />
    </Form.Item>

    {/* 非MaiMLファイルのUUID禁止アラート */}
    {form.fileType === 'non-maiml' && (
      <Alert
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        message="非MaiMLファイルにはUUID要素は不要です（PF-13）"
        description="MaiML以外のファイルを参照する場合、<insertion>/<uuid>子要素は記載しないでください。"
      />
    )}
  </Space>
);

/** Step 3: 確認画面 */
const StepConfirm: React.FC<{
  form: InsertionFormData;
}> = ({ form }) => {
  const locationLabel: Record<InsertionLocation, string> = {
    document: '<document> 直下',
    method: '<method> 直下',
    result: '<result> 直下',
    property: '<property> 直下',
    content: '<content> 直下',
    other: 'その他のグローバル要素直下',
  };

  const isComplete =
    form.uri.trim() !== '' &&
    form.hash.trim() !== '' &&
    (form.fileType === 'non-maiml' || form.uuid.trim() !== '');

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={5} style={{ margin: 0 }}>以下の内容でInsertionを追加します</Title>
        <Text type="secondary" style={{ fontSize: 12 }}>内容を確認の上、「Insertionを追加」ボタンをクリックしてください。</Text>
      </div>

      <Descriptions
        bordered
        column={1}
        size="small"
        labelStyle={{ width: 180, backgroundColor: '#fafafa' }}
      >
        <Descriptions.Item label="種別">
          {form.fileType === 'maiml' ? (
            <Space>
              <FileTextOutlined style={{ color: '#1677ff' }} />
              <Tag color="blue">MaiMLファイル</Tag>
            </Space>
          ) : (
            <Space>
              <FileImageOutlined style={{ color: '#52c41a' }} />
              <Tag color="green">非MaiMLファイル</Tag>
            </Space>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="URI">
          <Text code>{form.uri || '—'}</Text>
        </Descriptions.Item>
        <Descriptions.Item label={`ハッシュ値（${form.hashMethod}）`}>
          {form.hash ? (
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <Text code style={{ fontSize: 11 }}>{form.hash.slice(0, 40)}…</Text>
            </Space>
          ) : (
            <Text type="danger">未設定</Text>
          )}
        </Descriptions.Item>
        {form.fileType === 'maiml' && (
          <Descriptions.Item label="UUID">
            {form.uuid ? (
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Text code>{form.uuid}</Text>
              </Space>
            ) : (
              <Text type="danger">未設定</Text>
            )}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="フォーマット（MIME型）">
          {form.format ? <Tag>{form.format}</Tag> : <Text type="secondary">未設定</Text>}
        </Descriptions.Item>
        <Descriptions.Item label="記述場所">
          <Tag color="purple">{locationLabel[form.insertionLocation]}</Tag>
        </Descriptions.Item>
        {form.description && (
          <Descriptions.Item label="説明">
            <Text>{form.description}</Text>
          </Descriptions.Item>
        )}
      </Descriptions>

      {!isComplete && (
        <Alert
          type="error"
          showIcon
          message="必須項目が未入力です"
          description="URI・ハッシュ値・UUID（MaiMLの場合）はすべて必須です。前のステップに戻って入力してください。"
        />
      )}

      <Alert
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        message="URIが示すファイルを移動・変更した場合"
        description="ファイルの内容が変わった場合はハッシュ値の再計算が必要です。整合性検証を実行してご確認ください。"
      />
    </Space>
  );
};

// ----------------------------------------
// メインコンポーネント
// ----------------------------------------

const INITIAL_FORM: InsertionFormData = {
  fileType: 'maiml',
  insertionLocation: 'document',
  uri: '',
  hash: '',
  hashMethod: 'SHA-256',
  uuid: '',
  format: 'application/maiml',
  description: '',
};

/**
 * InsertionWizardModal
 * Insertion追加の3ステップウィザードモーダル
 * 要件: ED-02〜ED-05, PF-05〜PF-15
 */
const InsertionWizardModal: React.FC<InsertionWizardModalProps> = ({
  open,
  onClose,
  onAdd,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<InsertionFormData>({ ...INITIAL_FORM });
  const [isHashCalculating, setIsHashCalculating] = useState(false);
  const [isUuidFetching, setIsUuidFetching] = useState(false);

  const handleChange = (patch: Partial<InsertionFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  /** モック: ハッシュ値の自動計算 */
  const handleCalculateHash = () => {
    if (!form.uri) {
      message.warning('URIを入力してからハッシュ値を計算してください');
      return;
    }
    setIsHashCalculating(true);
    setTimeout(() => {
      const hash = mockCalculateSha256(form.uri);
      handleChange({ hash });
      setIsHashCalculating(false);
      message.success('SHA-256ハッシュ値を計算しました（モック）');
    }, 800);
  };

  /** モック: 参照ファイルからUUIDを取得 */
  const handleFetchUuid = () => {
    if (!form.uri) {
      message.warning('URIを入力してからUUIDを取得してください');
      return;
    }
    setIsUuidFetching(true);
    setTimeout(() => {
      const uuid = mockFetchMaimlUuid(form.uri);
      handleChange({ uuid });
      setIsUuidFetching(false);
      message.success('参照ファイルのdocument/uuidを取得しました（モック）');
    }, 600);
  };

  /** 次へボタン */
  const handleNext = () => {
    if (currentStep === 0) {
      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (!form.uri.trim()) {
        message.error('URIは必須です');
        return;
      }
      if (!form.hash.trim()) {
        message.error('ハッシュ値は必須です（自動計算ボタンをお使いください）');
        return;
      }
      if (form.fileType === 'maiml' && !form.uuid.trim()) {
        message.error('MaiMLファイルの場合、UUIDは必須です');
        return;
      }
      setCurrentStep(2);
    }
  };

  /** 戻るボタン */
  const handlePrev = () => {
    setCurrentStep((s) => Math.max(0, s - 1));
  };

  /** Insertion追加実行 */
  const handleSubmit = () => {
    const newInsertion: InsertionItem = {
      id: `ins-${Date.now()}`,
      uri: form.uri,
      hash: form.hash,
      hashMethod: form.hashMethod,
      uuid: form.fileType === 'maiml' ? form.uuid : null,
      format: form.format,
      fileType: form.fileType,
      insertionLocation: form.insertionLocation,
      status: 'valid',
      description: form.description,
    };
    onAdd(newInsertion);
    message.success('Insertionを追加しました');
    handleReset();
  };

  /** リセット */
  const handleReset = () => {
    setCurrentStep(0);
    setForm({ ...INITIAL_FORM });
    onClose();
  };

  const isConfirmEnabled =
    form.uri.trim() !== '' &&
    form.hash.trim() !== '' &&
    (form.fileType === 'non-maiml' || form.uuid.trim() !== '');

  const steps = [
    { title: '種別選択', description: 'ファイル種別と記述場所' },
    { title: 'ファイル指定', description: 'URI・ハッシュ・UUID等' },
    { title: '確認', description: '内容確認と追加' },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <StepSelectType form={form} onChange={handleChange} />;
      case 1:
        return (
          <StepFileDetails
            form={form}
            onChange={handleChange}
            isHashCalculating={isHashCalculating}
            isUuidFetching={isUuidFetching}
            onCalculateHash={handleCalculateHash}
            onFetchUuid={handleFetchUuid}
          />
        );
      case 2:
        return <StepConfirm form={form} />;
      default:
        return null;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <LinkOutlined style={{ color: '#1677ff' }} />
          <Text strong>Insertion 追加</Text>
        </Space>
      }
      open={open}
      onCancel={handleReset}
      width={680}
      footer={null}
      destroyOnClose
    >
      {/* ステップインジケーター */}
      <Steps
        current={currentStep}
        items={steps}
        size="small"
        style={{ marginBottom: 24 }}
      />

      <Divider style={{ margin: '0 0 24px 0' }} />

      {/* ステップコンテンツ */}
      <div style={{ minHeight: 320 }}>
        {renderStepContent()}
      </div>

      <Divider style={{ margin: '24px 0 16px 0' }} />

      {/* フッターボタン */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={handleReset}>キャンセル</Button>
        <Space>
          {currentStep > 0 && (
            <Button onClick={handlePrev}>← 戻る</Button>
          )}
          {currentStep < 2 && (
            <Button type="primary" onClick={handleNext}>
              次へ →
            </Button>
          )}
          {currentStep === 2 && (
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleSubmit}
              disabled={!isConfirmEnabled}
            >
              Insertionを追加
            </Button>
          )}
        </Space>
      </div>
    </Modal>
  );
};

export default InsertionWizardModal;
