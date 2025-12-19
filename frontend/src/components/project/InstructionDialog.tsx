/**
 * InstructionDialog.tsx
 * プロジェクト管理画面用の作業指示送信ダイアログ
 * Ant Design v6を使用し、UIポリシーに準拠
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Radio,
  Button,
  Space,
  Alert,
  Typography,
  Divider,
  Card,
  Spin,
  Tag,
  Flex,
  message,
  theme,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SendOutlined,
  FileTextOutlined,
  AimOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { useToken } = theme;

/**
 * 指示タイプの定数
 */
const INSTRUCTION_TYPES = {
  GENERAL: 'general',
  SETUP: 'setup',
  MEASUREMENT: 'measurement',
  SAFETY: 'safety',
  CLEANUP: 'cleanup',
} as const;

/**
 * 優先度の定数
 */
const INSTRUCTION_PRIORITIES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  NORMAL: 'normal',
  LOW: 'low',
} as const;

/**
 * 対象タイプの定数
 */
const TARGET_TYPES = {
  FILE: 'file',
  TRANSITION: 'transition',
} as const;

/**
 * トランジション情報の型
 */
interface TransitionInfo {
  id: string;
  displayName: string;
  category: string;
  description?: string;
  isExperimentRelevant: boolean;
}

/**
 * 指示データの型
 */
interface InstructionData {
  id: number;
  content: string;
  priority: string;
  type: string;
  targetType: string;
  transitionId: string;
}

/**
 * ファイル基本情報の型
 */
interface FileBasicInfo {
  hasProtocol: boolean;
  hasMethod: boolean;
  hasPnml: boolean;
  hasProgram: boolean;
  hasData: boolean;
}

/**
 * 作業者情報の型
 */
interface WorkerInfo {
  userId: string;
  username: string;
}

/**
 * 送信する指示データの型
 */
interface SubmitInstructionData {
  instructionId: string;
  content: string;
  priority: string;
  instructionType: string;
  type: string;
  timestamp: string;
  targetType: string;
  transitionId: string | null;
  targetTransitionId?: string;
}

/**
 * プロパティ
 */
interface InstructionDialogProps {
  /** ダイアログの表示/非表示 */
  open: boolean;
  /** 閉じるハンドラ */
  onClose: () => void;
  /** 送信ハンドラ */
  onSubmit?: (data: {
    instructions: SubmitInstructionData[];
    fileKey: string;
    managerId: string;
    assignedWorkerId: string | null;
  }) => void;
  /** ファイルキー */
  fileKey: string;
  /** 管理者ID */
  managerId: string;
  /** プロジェクト名 */
  projectName: string;
  /** プロジェクト所有者 */
  projectOwner: string;
  /** プロジェクトステータス */
  projectStatus: string;
  /** 選択されたファイル（現在未使用） */
  selectedFile?: Record<string, unknown>;
  /** 利用可能な作業者リスト */
  availableWorkers?: WorkerInfo[];
}

/**
 * 作業指示送信ダイアログコンポーネント
 */
const InstructionDialog: React.FC<InstructionDialogProps> = ({
  open,
  onClose,
  onSubmit,
  fileKey,
  managerId,
  projectName,
  projectOwner,
  projectStatus,
  selectedFile,
  availableWorkers = [],
}) => {
  const { token } = useToken();
  
  // 状態管理
  const [instructions, setInstructions] = useState<InstructionData[]>([
    {
      id: 1,
      content: '',
      priority: INSTRUCTION_PRIORITIES.NORMAL,
      type: INSTRUCTION_TYPES.GENERAL,
      targetType: TARGET_TYPES.FILE,
      transitionId: '',
    },
  ]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [availableTransitions, setAvailableTransitions] = useState<TransitionInfo[]>([]);
  const [loadingTransitions, setLoadingTransitions] = useState<boolean>(false);
  const [maimlParseError, setMaimlParseError] = useState<string | null>(null);
  const [fileBasicInfo, setFileBasicInfo] = useState<FileBasicInfo | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  
  // 新規追加: 実験条件、試行回数、タスク名
  const [experimentCondition, setExperimentCondition] = useState<'same' | 'different'>('same');
  const [trialCount, setTrialCount] = useState<number | ''>('');
  const [taskName, setTaskName] = useState<string>('');

  // ファイル名の抽出
  const fileName = useMemo(() => {
    return fileKey?.split('/').pop() || '';
  }, [fileKey]);

  /**
   * MAIMLファイルからトランジション情報を取得
   * （実際の実装ではAPIコールが必要）
   */
  useEffect(() => {
    const fetchTransitions = async () => {
      if (!open || !fileKey) return;

      setLoadingTransitions(true);
      setMaimlParseError(null);
      setAvailableTransitions([]);

      try {
        // TODO: 実際のAPI実装時に置き換え
        // モックデータでの動作確認
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        // モックのファイル基本情報
        setFileBasicInfo({
          hasProtocol: true,
          hasMethod: true,
          hasPnml: true,
          hasProgram: false,
          hasData: true,
        });

        // モックのトランジション情報
        const mockTransitions: TransitionInfo[] = [
          {
            id: 'transition_001',
            displayName: 'サンプル準備',
            category: 'preparation',
            description: '実験サンプルの準備プロセス',
            isExperimentRelevant: true,
          },
          {
            id: 'transition_002',
            displayName: '測定実行',
            category: 'measurement',
            description: '測定機器による測定プロセス',
            isExperimentRelevant: true,
          },
          {
            id: 'transition_003',
            displayName: 'データ分析',
            category: 'analysis',
            description: 'データの分析プロセス',
            isExperimentRelevant: true,
          },
        ];

        setAvailableTransitions(mockTransitions);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'トランジション取得エラー';
        setMaimlParseError(errorMessage);
        message.error(errorMessage);
      } finally {
        setLoadingTransitions(false);
      }
    };

    fetchTransitions();
  }, [open, fileKey]);

  /**
   * 指示を追加
   */
  const handleAddInstruction = useCallback(() => {
    setInstructions((prev) => [
      ...prev,
      {
        id: Date.now(),
        content: '',
        priority: INSTRUCTION_PRIORITIES.NORMAL,
        type: INSTRUCTION_TYPES.GENERAL,
        targetType: TARGET_TYPES.FILE,
        transitionId: '',
      },
    ]);
  }, []);

  /**
   * 指示を削除
   */
  const handleRemoveInstruction = useCallback((id: number) => {
    setInstructions((prev) => prev.filter((inst) => inst.id !== id));
  }, []);

  /**
   * 指示を更新
   */
  const handleUpdateInstruction = useCallback(
    (id: number, field: keyof InstructionData, value: string) => {
      setInstructions((prev) =>
        prev.map((inst) => {
          if (inst.id === id) {
            const updated = { ...inst, [field]: value };

            // 対象タイプが変更された場合、トランジションIDをリセット
            if (field === 'targetType' && value === TARGET_TYPES.FILE) {
              updated.transitionId = '';
            }

            return updated;
          }
          return inst;
        })
      );
    },
    []
  );

  /**
   * 送信処理
   */
  const handleSubmit = useCallback(async () => {
    try {
      // 試行回数のバリデーション（入力されている場合のみ）
      if (trialCount !== '' && (trialCount < 1 || trialCount > 999)) {
        message.warning('試行回数は1〜999の範囲で入力してください');
        return;
      }

      // バリデーション
      const validInstructions = instructions.filter((inst) => inst.content.trim());

      if (validInstructions.length === 0) {
        message.warning('少なくとも1つの指示を入力してください');
        return;
      }

      // トランジション指示のバリデーション
      const invalidTransitionInstruction = validInstructions.find(
        (inst) => inst.targetType === TARGET_TYPES.TRANSITION && !inst.transitionId
      );

      if (invalidTransitionInstruction) {
        message.warning('トランジション指示には対象トランジションを選択してください');
        return;
      }

      setSubmitting(true);

      // 指示データの構築
      const instructionData = validInstructions.map((inst) => {
        const baseData = {
          instructionId: `instruction_${Date.now()}_${inst.id}`,
          content: inst.content.trim(),
          priority: inst.priority,
          instructionType: inst.type,
          type: inst.type,
          timestamp: new Date().toISOString(),
          targetType: inst.targetType,
        };

        // トランジション別指示の場合のみtransition_idを設定
        if (inst.targetType === TARGET_TYPES.TRANSITION && inst.transitionId) {
          return {
            ...baseData,
            transitionId: inst.transitionId,
            targetTransitionId: inst.transitionId,
          };
        }

        return {
          ...baseData,
          transitionId: null,
        };
      });

      // 送信処理
      if (onSubmit) {
        onSubmit({
          instructions: instructionData,
          fileKey: fileKey,
          managerId: managerId,
          assignedWorkerId: selectedWorkerId || null,
        });
      }

      message.success('指示データを準備しました');

      // ダイアログを閉じる
      onClose();

      // 状態をリセット
      setTimeout(() => {
        setInstructions([
          {
            id: 1,
            content: '',
            priority: INSTRUCTION_PRIORITIES.NORMAL,
            type: INSTRUCTION_TYPES.GENERAL,
            targetType: TARGET_TYPES.FILE,
            transitionId: '',
          },
        ]);
        setSelectedWorkerId('');
        setAvailableTransitions([]);
        setMaimlParseError(null);
        setFileBasicInfo(null);
        // 新規追加項目のリセット
        setExperimentCondition('same');
        setTrialCount('');
        setTaskName('');
      }, 300);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '指示データ準備エラー';
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }, [instructions, fileKey, managerId, selectedWorkerId, experimentCondition, trialCount, taskName, onSubmit, onClose]);

  /**
   * ダイアログを閉じる
   */
  const handleClose = useCallback(() => {
    if (submitting) {
      Modal.confirm({
        title: '送信中',
        content: '指示データの準備が進行中です。キャンセルしますか？',
        okText: 'はい',
        cancelText: 'いいえ',
        onOk: onClose,
      });
    } else {
      onClose();
    }
  }, [submitting, onClose]);

  /**
   * 選択されたトランジション情報を取得
   */
  const getSelectedTransition = useCallback(
    (transitionId: string): TransitionInfo | undefined => {
      return availableTransitions.find((t) => t.id === transitionId);
    },
    [availableTransitions]
  );

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined style={{ color: token.colorPrimary }} />
          <span>作業指示入力</span>
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleClose} disabled={submitting}>
          キャンセル
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleSubmit}
          disabled={submitting}
          icon={submitting ? <LoadingOutlined /> : <SendOutlined />}
        >
          {submitting ? '準備中...' : '指示準備完了'}
        </Button>,
      ]}
      styles={{
        body: { maxHeight: '70vh', overflowY: 'auto' },
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* プロジェクト情報 */}
        <Alert
          message="プロジェクト情報"
          description={
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text>
                <Text strong>プロジェクト名:</Text> {projectName}
              </Text>
              <Text>
                <Text strong>所有者:</Text> {projectOwner}
              </Text>
              <Text>
                <Text strong>プロジェクトステータス:</Text> <Tag color="blue">{projectStatus}</Tag>
              </Text>
            </Space>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: token.marginLG }}
        />

        {/* 作業者選択 */}
        {availableWorkers.length > 0 && (
          <Card size="small" style={{ backgroundColor: token.colorWarningBg }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text strong>👷 作業者を割り当て（任意）</Text>
              <Select
                value={selectedWorkerId || undefined}
                onChange={setSelectedWorkerId}
                placeholder="割り当てなし（チェックアウトのみ）"
                disabled={submitting}
                style={{ width: '100%' }}
                allowClear
              >
                {availableWorkers.map((worker) => (
                  <Select.Option key={worker.userId} value={worker.userId}>
                    {worker.username} ({worker.userId})
                  </Select.Option>
                ))}
              </Select>
              {selectedWorkerId && (
                <Alert
                  message="この作業者に作業IDを自動発行して割り当てます"
                  type="success"
                  showIcon
                  icon={<CheckCircleOutlined />}
                />
              )}
            </Space>
          </Card>
        )}

        <Divider style={{ margin: `${token.marginSM}px 0` }}>条件内容</Divider>

        {/* 実験条件セクション */}
        <Card 
          size="small" 
          title={<Text strong>複数回実行時の実験条件</Text>}
          style={{ backgroundColor: token.colorBgContainer }}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* タスク名 */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
                📝 タスク名
              </Text>
              <Input
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="タスク名を入力"
                disabled={submitting}
                maxLength={100}
                showCount
                style={{ width: '100%' }}
              />
            </div>

            {/* 条件指定と試行回数 */}
            <Flex gap="middle" wrap="wrap">
              {/* 条件指定 */}
              <div style={{ flex: 1, minWidth: 300 }}>
                <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
                  🔬 条件指定
                </Text>
                <Radio.Group
                  value={experimentCondition}
                  onChange={(e) => setExperimentCondition(e.target.value)}
                  disabled={submitting}
                  style={{ display: 'flex', flexDirection: 'column', gap: token.marginXS }}
                >
                  <Radio value="same">全て同一条件で実施</Radio>
                  <Radio value="different">実験ごとに条件を変更</Radio>
                </Radio.Group>
              </div>

              {/* 試行回数 */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
                  🔢 試行回数
                </Text>
                <Input
                  type="number"
                  value={trialCount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setTrialCount('');
                    } else {
                      const num = parseInt(value, 10);
                      if (!isNaN(num) && num >= 1 && num <= 999) {
                        setTrialCount(num);
                      }
                    }
                  }}
                  placeholder="試行回数を入力"
                  disabled={submitting}
                  min={1}
                  max={999}
                  style={{ width: '100%' }}
                />
              </div>
            </Flex>
          </Space>
        </Card>

        <Divider style={{ margin: `${token.marginSM}px 0` }}>指示内容</Divider>

        {/* 指示入力フォーム */}
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {instructions.map((instruction, index) => (
            <Card
              key={instruction.id}
              size="small"
              title={
                <Flex justify="space-between" align="center">
                  <Text strong>指示 {index + 1}</Text>
                  {instructions.length > 1 && (
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveInstruction(instruction.id)}
                      disabled={submitting}
                    >
                      削除
                    </Button>
                  )}
                </Flex>
              }
              style={{ backgroundColor: token.colorBgContainer }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {/* 指示対象選択 */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
                    🎯 指示対象 <Text type="danger">*</Text>
                  </Text>
                  <Radio.Group
                    value={instruction.targetType}
                    onChange={(e) =>
                      handleUpdateInstruction(instruction.id, 'targetType', e.target.value)
                    }
                    disabled={submitting}
                  >
                    <Radio value={TARGET_TYPES.FILE}>
                      <FileTextOutlined /> ファイル全体
                    </Radio>
                    <Radio
                      value={TARGET_TYPES.TRANSITION}
                      disabled={availableTransitions.length === 0}
                    >
                      <AimOutlined /> 特定トランジション
                    </Radio>
                  </Radio.Group>
                </div>

                {/* 優先度・タイプ・トランジション選択 */}
                <Flex gap="middle" wrap="wrap">
                  <div style={{ flex: 1, minWidth: 150 }}>
                    <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
                      優先度
                    </Text>
                    <Select
                      value={instruction.priority}
                      onChange={(value) =>
                        handleUpdateInstruction(instruction.id, 'priority', value)
                      }
                      disabled={submitting}
                      style={{ width: '100%' }}
                    >
                      <Select.Option value={INSTRUCTION_PRIORITIES.HIGH}>高</Select.Option>
                      <Select.Option value={INSTRUCTION_PRIORITIES.MEDIUM}>中</Select.Option>
                      <Select.Option value={INSTRUCTION_PRIORITIES.NORMAL}>
                        通常
                      </Select.Option>
                      <Select.Option value={INSTRUCTION_PRIORITIES.LOW}>低</Select.Option>
                    </Select>
                  </div>

                  <div style={{ flex: 1, minWidth: 150 }}>
                    <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
                      タイプ
                    </Text>
                    <Select
                      value={instruction.type}
                      onChange={(value) =>
                        handleUpdateInstruction(instruction.id, 'type', value)
                      }
                      disabled={submitting}
                      style={{ width: '100%' }}
                    >
                      <Select.Option value={INSTRUCTION_TYPES.GENERAL}>一般</Select.Option>
                      <Select.Option value={INSTRUCTION_TYPES.SETUP}>
                        セットアップ
                      </Select.Option>
                      <Select.Option value={INSTRUCTION_TYPES.MEASUREMENT}>
                        測定
                      </Select.Option>
                      <Select.Option value={INSTRUCTION_TYPES.SAFETY}>安全</Select.Option>
                      <Select.Option value={INSTRUCTION_TYPES.CLEANUP}>清掃</Select.Option>
                    </Select>
                  </div>

                  <div style={{ flex: 1, minWidth: 200 }}>
                    <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
                      {instruction.targetType === TARGET_TYPES.TRANSITION ? (
                        <>
                          🎯 対象トランジション <Text type="danger">*</Text>
                        </>
                      ) : (
                        '対象範囲'
                      )}
                    </Text>
                    {instruction.targetType === TARGET_TYPES.TRANSITION ? (
                      <Select
                        value={instruction.transitionId || undefined}
                        onChange={(value) =>
                          handleUpdateInstruction(instruction.id, 'transitionId', value)
                        }
                        disabled={
                          submitting ||
                          loadingTransitions ||
                          availableTransitions.length === 0
                        }
                        placeholder="トランジションを選択..."
                        style={{ width: '100%' }}
                        loading={loadingTransitions}
                      >
                        {availableTransitions.map((transition) => (
                          <Select.Option key={transition.id} value={transition.id}>
                            {transition.isExperimentRelevant && '⭐ '}
                            {transition.displayName}
                            {transition.category !== 'other' && ` [${transition.category}]`}
                          </Select.Option>
                        ))}
                      </Select>
                    ) : (
                      <Input value="実験全体への指示" disabled style={{ width: '100%' }} />
                    )}
                  </div>
                </Flex>

                {/* 選択されたトランジションの詳細 */}
                {instruction.targetType === TARGET_TYPES.TRANSITION &&
                  instruction.transitionId && (
                    <Alert
                      message={
                        <Space direction="vertical" size="small">
                          {(() => {
                            const selected = getSelectedTransition(instruction.transitionId);
                            if (selected) {
                              return (
                                <>
                                  <Text>
                                    <Text strong>選択中:</Text> {selected.displayName}
                                  </Text>
                                  <Text>
                                    <Text strong>カテゴリ:</Text> {selected.category}
                                    {selected.isExperimentRelevant && (
                                      <Tag color="success" style={{ marginLeft: 8 }}>
                                        実験関連
                                      </Tag>
                                    )}
                                  </Text>
                                  {selected.description && (
                                    <Text>
                                      <Text strong>説明:</Text> {selected.description}
                                    </Text>
                                  )}
                                </>
                              );
                            }
                            return null;
                          })()}
                        </Space>
                      }
                      type="success"
                      showIcon
                    />
                  )}

                {/* 指示内容 */}
                <div>
                  <Text strong style={{ display: 'block', marginBottom: token.marginXS }}>
                    指示内容 <Text type="danger">*</Text>
                  </Text>
                  <TextArea
                    value={instruction.content}
                    onChange={(e) =>
                      handleUpdateInstruction(instruction.id, 'content', e.target.value)
                    }
                    placeholder={
                      instruction.targetType === TARGET_TYPES.TRANSITION &&
                      instruction.transitionId
                        ? `選択されたトランジション「${
                            getSelectedTransition(instruction.transitionId)?.displayName ||
                            instruction.transitionId
                          }」に対する具体的な指示を入力してください...`
                        : '作業者への具体的な指示を入力してください...'
                    }
                    disabled={submitting}
                    rows={4}
                    showCount
                    maxLength={1000}
                  />
                </div>
              </Space>
            </Card>
          ))}
        </Space>

        {/* 指示追加ボタン */}
        <Button
          type="dashed"
          onClick={handleAddInstruction}
          icon={<PlusOutlined />}
          disabled={submitting}
          block
        >
          指示を追加
        </Button>
      </Space>
    </Modal>
  );
};

export default InstructionDialog;
