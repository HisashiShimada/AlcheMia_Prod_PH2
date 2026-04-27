'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Button,
  Space,
  Typography,
  theme,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  FileTextOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { Transition, Instruction, ProjectStatus } from '@/types/experimentWorker';
import { projectsData } from '@/data/projectsData';
import InstructionCard from './InstructionCard';

const { Title, Text } = Typography;

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

  // クライアント判定
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 作業指示を取得
  const instructions = useMemo(() => {
    if (!projectId || !transition) return [];
    
    const project = projectsData[projectId];
    if (!project || !project.instructions) return [];

    // このトランジションに紐づく作業指示をフィルタリング
    return project.instructions.filter((instruction) => {
      // 全体指示（ファイル単位）
      if (instruction.targetType === 'file') {
        return true;
      }
      
      // メソッド単位指示
      if (instruction.targetType === 'method' && methodId) {
        return instruction.methodId === methodId;
      }
      
      // トランジション単位指示
      if (instruction.targetType === 'transition') {
        return instruction.transitionId === transition.transitionId;
      }
      
      return false;
    });
  }, [projectId, methodId, transition]);

  // 作業指示を種類別にグループ化
  const groupedInstructions = useMemo(() => {
    const file: Instruction[] = [];
    const method: Instruction[] = [];
    const transitionInst: Instruction[] = [];

    instructions.forEach((instruction) => {
      if (instruction.targetType === 'file') {
        file.push(instruction);
      } else if (instruction.targetType === 'method') {
        method.push(instruction);
      } else if (instruction.targetType === 'transition') {
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
        {instructions.length === 0 ? (
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
