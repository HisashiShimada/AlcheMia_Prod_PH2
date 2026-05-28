'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Button,
  Space,
  Typography,
  theme,
  Spin,
} from 'antd';
import {
  CloseOutlined,
  FileTextOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { Instruction, InstructionType, Priority, ProjectStatus, Transition } from '@/types/experimentWorker';
import type { WorkerInstruction } from '@/types/project';
import { getWorkerInstructions } from '@/services/projectApiService';

/**
 * WorkerInstruction をフロントエンド型 Instruction に変換する
 * method_id / task_no / transition_id の有無からグループを判定する。
 */
function convertWorkerInstruction(apiData: WorkerInstruction): Instruction {
  const priorityMap: Record<string, Priority> = {
    '0': 'low', '1': 'normal', '2': 'medium', '3': 'high',
  };
  const instructionTypeMap: Record<string, InstructionType> = {
    '0': 'general', '1': 'setup', '2': 'measurement', '3': 'safety', '4': 'cleanup',
  };

  return {
    instructionId: apiData.id,
    transitionId: apiData.transition_id || undefined,
    transitionName: apiData.transition_name || undefined,
    methodId: apiData.method_id || undefined,
    methodName: apiData.method_name || undefined,
    taskId: apiData.task_no ? `${apiData.project_id}-${apiData.method_id}-${apiData.task_no}` : undefined,
    taskName: apiData.task_no ? `Task ${apiData.task_no}` : undefined,
    content: apiData.instruction_content,
    priority: priorityMap[apiData.priority] || 'normal',
    instructionType: instructionTypeMap[apiData.type] || 'general',
    createdAt: apiData.create_at,
    updatedAt: null,
    createdBy: {
      userId: apiData.created_by,
      userName: apiData.created_by_name,
    },
    isRead: apiData.is_acknowledged,
    isAcknowledged: apiData.is_acknowledged,
    acknowledgedAt: undefined,
    acknowledgedBy: undefined,
    acknowledgedByName: undefined,
  };
}
import InstructionCard from './InstructionCard';

const { Text } = Typography;

interface InstructionConfirmationModalProps {
  open: boolean;
  transition: Transition | null;
  projectId?: string;
  methodId?: string;
  projectStatus: ProjectStatus | null;
  onCancel: () => void;
}

/**
 * 作業指示確認モーダルコンポーネント
 * トランジションの作業指示を確認してから実験データ記録へ進む
 * APIから作業指示を取得して表示する
 */
export default function InstructionConfirmationModal({
  open,
  transition,
  projectId,
  methodId,
  projectStatus,
  onCancel,
}: InstructionConfirmationModalProps) {
  const { token } = theme.useToken();
  const [isClient, setIsClient] = useState(false);
  const [fileInstructionsExpanded, setFileInstructionsExpanded] = useState(true);
  const [methodInstructionsExpanded, setMethodInstructionsExpanded] = useState(true);
  const [transitionInstructionsExpanded, setTransitionInstructionsExpanded] = useState(true);

  // APIから取得した指示データ
  const [allInstructions, setAllInstructions] = useState<Instruction[]>([]);
  const [loading, setLoading] = useState(false);

  // クライアント判定
  useEffect(() => {
    setIsClient(true);
  }, []);

  // モーダルが開いたときにAPIから作業指示を取得
  useEffect(() => {
    if (!open || !projectId) {
      setAllInstructions([]);
      return;
    }

    const fetchInstructions = async () => {
      setLoading(true);
      try {
        const result = await getWorkerInstructions(projectId);
        if (result.success && result.data) {
          const converted = result.data.map(convertWorkerInstruction);
          setAllInstructions(converted);
        } else {
          setAllInstructions([]);
        }
      } catch (error) {
        console.error('[InstructionConfirmationModal] 作業指示の取得に失敗しました:', error);
        setAllInstructions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInstructions();
  }, [open, projectId]);

  // このトランジション/メソッドに紐づく作業指示をフィルタリング
  const instructions = useMemo(() => {
    if (!transition) return [];

    return allInstructions.filter((instruction) => {
      // 全体指示（methodId も transitionId もない）
      if (!instruction.methodId && !instruction.transitionId) {
        return true;
      }

      // メソッド単位指示（methodId あり・transitionId なし）
      if (!!instruction.methodId && !instruction.transitionId && methodId) {
        return instruction.methodId === methodId;
      }

      // トランジション単位指示（methodId あり・transitionId あり・taskId なし）
      if (!!instruction.methodId && !!instruction.transitionId && !instruction.taskId) {
        return instruction.transitionId === transition.transitionId;
      }

      return false;
    });
  }, [allInstructions, methodId, transition]);

  // 作業指示を種類別にグループ化
  const groupedInstructions = useMemo(() => {
    const file: Instruction[] = [];
    const method: Instruction[] = [];
    const transitionInst: Instruction[] = [];

    instructions.forEach((instruction) => {
      if (!instruction.methodId && !instruction.transitionId) {
        file.push(instruction);
      } else if (!!instruction.methodId && !instruction.transitionId) {
        method.push(instruction);
      } else if (!!instruction.methodId && !!instruction.transitionId && !instruction.taskId) {
        transitionInst.push(instruction);
      }
    });

    return { file, method, transition: transitionInst };
  }, [instructions]);

  return (
    <Modal
      data-testid="instruction-confirmation-modal"
      title={
        <Space>
          <FileTextOutlined style={{ color: token.colorPrimary }} />
          <Text strong style={{ fontSize: 18 }}>
            作業指示
          </Text>
          {transition && (
            <Text type="secondary" style={{ fontSize: 14 }}>
              - {transition.transitionName}
            </Text>
          )}
        </Space>
      }
      open={open}
      onCancel={onCancel}
      width={800}
      style={{ top: 40 }}
      footer={[
        <Button
          key="close"
          data-testid="instruction-confirmation-modal-close-button"
          type="primary"
          icon={<CloseOutlined />}
          onClick={onCancel}
        >
          閉じる
        </Button>,
      ]}
    >
      <div data-testid="instruction-confirmation-modal-body">
        {loading ? (
          <div style={{ textAlign: 'center', padding: token.marginXL }}>
            <Spin size="large" />
          </div>
        ) : instructions.length === 0 ? (
          <div
            data-testid="instruction-confirmation-modal-empty"
            style={{ textAlign: 'center', padding: token.marginXL }}
          >
            <Text type="secondary">
              このトランジションには作業指示がありません
            </Text>
          </div>
        ) : (
          <>
            {/* 全体指示 */}
            {groupedInstructions.file.length > 0 && (
              <div style={{ marginBottom: token.marginMD }}>
                <div
                  data-testid="instruction-confirmation-modal-file-section-header"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: token.marginXS,
                    borderRadius: token.borderRadiusSM,
                    marginBottom: token.marginXS,
                  }}
                  onClick={() => setFileInstructionsExpanded(!fileInstructionsExpanded)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = token.colorFillSecondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {fileInstructionsExpanded ? (
                    <DownOutlined style={{ marginRight: 8, fontSize: 12 }} />
                  ) : (
                    <RightOutlined style={{ marginRight: 8, fontSize: 12 }} />
                  )}
                  <Text strong style={{ fontSize: 14 }}>
                    📄 プロジェクト指示 ({groupedInstructions.file.length}件)
                  </Text>
                </div>
                {fileInstructionsExpanded && (
                  <Space
                    data-testid="instruction-confirmation-modal-file-section-list"
                    orientation="vertical"
                    size={8}
                    style={{ width: '100%' }}
                  >
                    {groupedInstructions.file.map((instruction) => (
                      <InstructionCard
                        key={instruction.instructionId}
                        instruction={instruction}
                        projectStatus={projectStatus}
                        isClient={isClient}
                      />
                    ))}
                  </Space>
                )}
              </div>
            )}

            {/* メソッド単位指示 */}
            {groupedInstructions.method.length > 0 && (
              <div style={{ marginBottom: token.marginMD }}>
                <div
                  data-testid="instruction-confirmation-modal-method-section-header"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: token.marginXS,
                    borderRadius: token.borderRadiusSM,
                    marginBottom: token.marginXS,
                  }}
                  onClick={() => setMethodInstructionsExpanded(!methodInstructionsExpanded)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = token.colorFillSecondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {methodInstructionsExpanded ? (
                    <DownOutlined style={{ marginRight: 8, fontSize: 12 }} />
                  ) : (
                    <RightOutlined style={{ marginRight: 8, fontSize: 12 }} />
                  )}
                  <Text strong style={{ fontSize: 14 }}>
                    🔧 メソッド単位指示 ({groupedInstructions.method.length}件)
                  </Text>
                </div>
                {methodInstructionsExpanded && (
                  <Space
                    data-testid="instruction-confirmation-modal-method-section-list"
                    orientation="vertical"
                    size={8}
                    style={{ width: '100%' }}
                  >
                    {groupedInstructions.method.map((instruction) => (
                      <InstructionCard
                        key={instruction.instructionId}
                        instruction={instruction}
                        projectStatus={projectStatus}
                        isClient={isClient}
                      />
                    ))}
                  </Space>
                )}
              </div>
            )}

            {/* トランジション単位指示 */}
            {groupedInstructions.transition.length > 0 && (
              <div>
                <div
                  data-testid="instruction-confirmation-modal-transition-section-header"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    padding: token.marginXS,
                    borderRadius: token.borderRadiusSM,
                    marginBottom: token.marginXS,
                  }}
                  onClick={() => setTransitionInstructionsExpanded(!transitionInstructionsExpanded)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = token.colorFillSecondary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {transitionInstructionsExpanded ? (
                    <DownOutlined style={{ marginRight: 8, fontSize: 12 }} />
                  ) : (
                    <RightOutlined style={{ marginRight: 8, fontSize: 12 }} />
                  )}
                  <Text strong style={{ fontSize: 14 }}>
                    🎯 トランジション指示 ({groupedInstructions.transition.length}件)
                  </Text>
                </div>
                {transitionInstructionsExpanded && (
                  <Space
                    data-testid="instruction-confirmation-modal-transition-section-list"
                    orientation="vertical"
                    size={8}
                    style={{ width: '100%' }}
                  >
                    {groupedInstructions.transition.map((instruction) => (
                      <InstructionCard
                        key={instruction.instructionId}
                        instruction={instruction}
                        projectStatus={projectStatus}
                        isClient={isClient}
                      />
                    ))}
                  </Space>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
