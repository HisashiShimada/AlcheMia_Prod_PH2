'use client';

/**
 * 分割ウィザードモーダル
 *
 * @description
 * L2 秘匿化で UPA 制約違反が検出されたとき、暗号化対象要素の分割方法を
 * ステップ形式でガイドするウィザード。
 *
 * @remarks
 * 【現在の状態】UI スケルトン実装
 * 実際の MAIML 分割ロジックは未実装。
 * バックエンド本実装後に Step 3 の実行処理を差し替える。
 */

import React, { useState } from 'react';
import {
  Modal, Steps, Button, Space, Alert, Typography, Table, Tag,
  Divider, Select, Input, Form,
} from 'antd';
import {
  ScissorOutlined, CheckCircleOutlined, WarningOutlined,
  ArrowRightOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import type { ColumnType } from 'antd/es/table';
import type { MaimlTreeNode, UpaViolation } from '@/types/encryption';

const { Text, Paragraph } = Typography;

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

/** 分割候補の行 */
interface SplitCandidate {
  key: string;
  /** 分割元の要素パス */
  sourcePath: string;
  /** 分割後の要素名（ユーザーが指定） */
  targetElementName: string;
  /** 分割方法 */
  splitMethod: 'separate_element' | 'wrap_with_group';
  /** 説明 */
  description: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SplitWizardModalProps {
  open: boolean;
  onClose: () => void;
  /** 選択中のノード */
  selectedNode: MaimlTreeNode | null;
  /** UPA 制約違反一覧 */
  violations: UpaViolation[];
  /** 分割完了後のコールバック */
  onSplitComplete?: () => void;
}

// ---------------------------------------------------------------------------
// ステップ定義
// ---------------------------------------------------------------------------

const STEPS = [
  { title: '違反内容の確認', icon: <InfoCircleOutlined /> },
  { title: '分割方法の選択', icon: <ScissorOutlined /> },
  { title: '実行・確認',     icon: <CheckCircleOutlined /> },
];

// ---------------------------------------------------------------------------
// コンポーネント
// ---------------------------------------------------------------------------

const SplitWizardModal: React.FC<SplitWizardModalProps> = ({
  open,
  onClose,
  selectedNode,
  violations,
  onSplitComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [candidates, setCandidates] = useState<SplitCandidate[]>(() =>
    violations.map((v, i) => ({
      key: `candidate-${i}`,
      sourcePath: v.elementPath,
      targetElementName: `element_${i + 1}`,
      splitMethod: 'separate_element',
      description: v.suggestedFix ?? '別要素に分離する',
    })),
  );
  const [executing, setExecuting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // ---------------------------------------------------------------------------
  // ステップ操作
  // ---------------------------------------------------------------------------

  const handleNext = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleExecute = async () => {
    setExecuting(true);
    try {
      // TODO: 本実装では encryptionService.splitElements() を呼び出す
      await new Promise((r) => setTimeout(r, 1000));
      setCompleted(true);
      setCurrentStep(2);
    } catch {
      // TODO: エラーハンドリング
    } finally {
      setExecuting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    setCompleted(false);
    onClose();
  };

  const handleFinish = () => {
    handleClose();
    onSplitComplete?.();
  };

  // ---------------------------------------------------------------------------
  // テーブル列定義
  // ---------------------------------------------------------------------------

  const violationColumns: ColumnType<UpaViolation>[] = [
    {
      title: '対象パス',
      dataIndex: 'elementPath',
      key: 'elementPath',
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v || '（ルート要素）'}</Text>,
    },
    {
      title: 'エラー内容',
      dataIndex: 'message',
      key: 'message',
    },
    {
      title: '推奨対処',
      dataIndex: 'suggestedFix',
      key: 'suggestedFix',
      render: (v?: string) => v ? <Text type="secondary">{v}</Text> : <Tag color="orange">手動確認</Tag>,
    },
  ];

  const candidateColumns: ColumnType<SplitCandidate>[] = [
    {
      title: '分割元パス',
      dataIndex: 'sourcePath',
      key: 'sourcePath',
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v || '（ルート）'}</Text>,
    },
    {
      title: '分割方法',
      dataIndex: 'splitMethod',
      key: 'splitMethod',
      width: 200,
      render: (v: string, record: SplitCandidate) => (
        <Select
          value={v}
          size="small"
          style={{ width: '100%' }}
          options={[
            { value: 'separate_element', label: '別要素に分離' },
            { value: 'wrap_with_group', label: 'グループ要素で包む' },
          ]}
          onChange={(val) =>
            setCandidates((prev) =>
              prev.map((c) =>
                c.key === record.key
                  ? { ...c, splitMethod: val as 'separate_element' | 'wrap_with_group' }
                  : c,
              ),
            )
          }
        />
      ),
    },
    {
      title: '新要素名',
      dataIndex: 'targetElementName',
      key: 'targetElementName',
      width: 180,
      render: (v: string, record: SplitCandidate) => (
        <Input
          value={v}
          size="small"
          onChange={(e) =>
            setCandidates((prev) =>
              prev.map((c) => c.key === record.key ? { ...c, targetElementName: e.target.value } : c),
            )
          }
        />
      ),
    },
  ];

  // ---------------------------------------------------------------------------
  // ステップコンテンツ
  // ---------------------------------------------------------------------------

  const stepContents = [
    /* ── Step 0: 違反内容の確認 ── */
    <div key="step0">
      <Alert
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        style={{ marginBottom: 16 }}
        message="UPA 制約違反が検出されました"
        description={
          <>
            <Paragraph style={{ marginBottom: 4 }}>
              選択した要素（<Text code>{selectedNode?.label ?? selectedNode?.tagName}</Text>）を
              L2 秘匿化する際に、以下のスキーマ制約違反が発生します。
            </Paragraph>
            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
              ウィザードに従って要素を分割することで制約を解消できます。
            </Paragraph>
          </>
        }
      />

      <Text strong style={{ display: 'block', marginBottom: 8 }}>
        違反一覧（{violations.length} 件）
      </Text>
      <Table<UpaViolation>
        size="small"
        dataSource={violations.map((v, i) => ({ ...v, key: i }))}
        columns={violationColumns}
        pagination={false}
        bordered
        scroll={{ x: true }}
      />
    </div>,

    /* ── Step 1: 分割方法の選択 ── */
    <div key="step1">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="各違反箇所の分割方法を選択してください"
        description="「別要素に分離」では子要素を個別の EncryptedData ブロックに、「グループで包む」では wrapper 要素を追加します。"
      />

      <Table<SplitCandidate>
        size="small"
        dataSource={candidates}
        columns={candidateColumns}
        pagination={false}
        bordered
      />

      <Divider />

      <Alert
        type="warning"
        showIcon
        style={{ marginTop: 8 }}
        message="注意"
        description="分割後の MAIML ファイルはバックアップが自動作成されます。元のファイルに戻すには復元操作が必要です。"
      />
    </div>,

    /* ── Step 2: 実行・確認 ── */
    <div key="step2">
      {completed ? (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message="分割が完了しました"
          description={
            <>
              <Paragraph style={{ marginBottom: 4 }}>
                {candidates.length} 件の要素を分割し、UPA 制約違反を解消しました。
              </Paragraph>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                暗号化設定パネルに戻って暗号化を実行してください。
              </Paragraph>
            </>
          }
        />
      ) : (
        <>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="以下の内容で分割を実行します"
            description="実行後は元に戻せません。バックアップは自動作成されます。"
          />
          <Table<SplitCandidate>
            size="small"
            dataSource={candidates}
            columns={[
              { title: '分割元パス', dataIndex: 'sourcePath', key: 'sourcePath', render: (v: string) => <Text code style={{ fontSize: 12 }}>{v || '（ルート）'}</Text> },
              { title: '分割方法', dataIndex: 'splitMethod', key: 'splitMethod', render: (v: string) => v === 'separate_element' ? '別要素に分離' : 'グループで包む' },
              { title: '新要素名', dataIndex: 'targetElementName', key: 'targetElementName' },
            ]}
            pagination={false}
            bordered
          />
        </>
      )}
    </div>,
  ];

  // ---------------------------------------------------------------------------
  // フッターボタン
  // ---------------------------------------------------------------------------

  const footerButtons = () => {
    if (currentStep === 2 && completed) {
      return [
        <Button key="finish" type="primary" icon={<CheckCircleOutlined />} onClick={handleFinish}>
          閉じて暗号化設定に戻る
        </Button>,
      ];
    }
    return [
      <Button key="cancel" onClick={handleClose}>
        キャンセル
      </Button>,
      currentStep > 0 && (
        <Button key="back" onClick={handleBack} disabled={executing}>
          前へ
        </Button>
      ),
      currentStep < STEPS.length - 1 ? (
        <Button key="next" type="primary" icon={<ArrowRightOutlined />} onClick={handleNext}>
          次へ
        </Button>
      ) : (
        <Button
          key="execute"
          type="primary"
          danger
          icon={<ScissorOutlined />}
          loading={executing}
          onClick={handleExecute}
        >
          分割を実行
        </Button>
      ),
    ].filter(Boolean);
  };

  // ---------------------------------------------------------------------------
  // レンダリング
  // ---------------------------------------------------------------------------

  return (
    <Modal
      open={open}
      title={
        <Space>
          <ScissorOutlined />
          要素分割ウィザード（UPA 制約解消）
        </Space>
      }
      width={780}
      onCancel={handleClose}
      footer={<Space>{footerButtons()}</Space>}
      maskClosable={false}
    >
      <Steps
        current={currentStep}
        items={STEPS.map((s) => ({ title: s.title, icon: s.icon }))}
        style={{ marginBottom: 24 }}
        size="small"
      />

      <Divider style={{ margin: '8px 0 16px' }} />

      {stepContents[currentStep]}
    </Modal>
  );
};

export default SplitWizardModal;
