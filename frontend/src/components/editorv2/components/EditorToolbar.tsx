/**
 * EditorToolbar - 編集ツールバーコンポーネント（EditorV2用）
 * 
 * ノード追加、Undo/Redo、保存などの編集ツールを提供
 * Material-UI → Ant Design変換版
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import React from 'react';
import { Space, Button, Divider, Tooltip, Switch, Typography, Segmented, Flex, Select } from 'antd';
import {
  SaveOutlined,
  UndoOutlined,
  RedoOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ApartmentOutlined,
  FolderOpenOutlined,
  NodeIndexOutlined,
  UnorderedListOutlined,
  PlusCircleOutlined,
  BorderOutlined,
  RadiusSettingOutlined,
  SwapOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import {
  useAttributeDisplay,
  ATTRIBUTE_OPTIONS,
  AttributeOption,
} from '@/contexts/AttributeDisplayContext';
import { useLanguage } from '@/contexts/LanguageContext';
const { Text } = Typography;

/**
 * EditorToolbarProps - EditorToolbarコンポーネントのProps型定義
 */
export interface EditorToolbarProps {
  // ノード追加
  onAddNode: (nodeType: 'material' | 'condition' | 'result' | 'transition') => void;
  
  // Undo/Redo
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // 保存
  onSave: () => void;
  canSave: boolean;
  
  // Document編集
  onEditDocument: () => void;
  
  // バリデーション
  onValidate: () => void;
  isValidating: boolean;
  
  // ワークフロー追加
  onAddWorkflow: () => void;
  workflowModeActive: boolean;
  
  // Draft管理
  onOpenDraftManager?: () => void;
  
  // 自動保存
  autoSaveEnabled?: boolean;
  onAutoSaveToggle?: (checked: boolean) => void;
  lastAutoSaveTime?: string | Date | null;
  
  // ビューモード切替
  viewMode?: 'petriNet' | 'templates' | 'xml';
  onViewModeChange?: (mode: 'petriNet' | 'templates' | 'xml') => void;
}

/**
 * 最終保存時刻のフォーマット
 */
const formatAutoSaveTime = (time: string | Date | null | undefined): string => {
  if (!time) return '';
  const date = new Date(time);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * EditorToolbar - 編集ツールバー
 */
const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onAddNode,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSave,
  canSave,
  onEditDocument,
  onValidate,
  isValidating,
  onAddWorkflow,
  workflowModeActive,
  onOpenDraftManager,
  autoSaveEnabled,
  onAutoSaveToggle,
  lastAutoSaveTime,
  viewMode,
  onViewModeChange,
}) => {
  // テンプレートモード / XMLビューモード時はペトリネット編集ボタンを非活性化
  const { t } = useLanguage();
  const isTemplateMode = viewMode === 'templates' || viewMode === 'xml';
  // ノード表示属性切替（Context 経由で管理）
  const { selectedAttribute, setSelectedAttribute } = useAttributeDisplay();

  // ドロップダウンの選択肢リスト（翻訳キー経由でラベルを取得）
  const attributeSelectOptions = Object.values(ATTRIBUTE_OPTIONS).map((value) => ({
    value,
    label: t(`viewer.attributeLabels.${value}`),
  }));

  return (
    <Flex
      style={{
        padding: '8px 16px',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#fff',
        flexWrap: 'wrap',
        gap: 8,
      }}
      align="center"
    >
      {/* ビュー切替 */}
      {onViewModeChange && viewMode && (
        <>
          <Segmented
            value={viewMode}
            onChange={(value) => onViewModeChange(value as 'petriNet' | 'templates' | 'xml')}
            options={[
              {
                label: (
                  <Space size={4}>
                    <NodeIndexOutlined />
                    <span>{t('editor.toolbar.viewPetriNet')}</span>
                  </Space>
                ),
                value: 'petriNet',
              },
              {
                label: (
                  <Space size={4}>
                    <UnorderedListOutlined />
                    <span>{t('editor.toolbar.viewTemplates')}</span>
                  </Space>
                ),
                value: 'templates',
              },
              {
                label: (
                  <Space size={4}>
                    <CodeOutlined />
                    <span>{t('editor.toolbar.viewXml')}</span>
                  </Space>
                ),
                value: 'xml',
              },
            ]}
          />

          {/* ノード表示属性切替ドロップダウン（トグル直右） */}
          {viewMode === 'petriNet' && (
            <Tooltip title={t('editor.toolbar.nodeDisplayAttrTooltip')}>
              <Select
                size="small"
                value={selectedAttribute}
                onChange={(value) => setSelectedAttribute(value as AttributeOption)}
                options={attributeSelectOptions}
                style={{ width: 160 }}
              />
            </Tooltip>
          )}

          <Divider orientation="vertical" style={{ height: 24 }} />
        </>
      )}

      {/* ノード追加ボタン */}
      <Space size={8}>
        <Tooltip title={t('editor.toolbar.addMaterialTooltip')}>
          <Button
            size="small"
            icon={<PlusCircleOutlined />}
            onClick={() => onAddNode('material')}
            disabled={isTemplateMode}
          >
            Material
          </Button>
        </Tooltip>

        <Tooltip title={t('editor.toolbar.addConditionTooltip')}>
          <Button
            size="small"
            icon={<BorderOutlined />}
            onClick={() => onAddNode('condition')}
            disabled={isTemplateMode}
          >
            Condition
          </Button>
        </Tooltip>

        <Tooltip title={t('editor.toolbar.addResultTooltip')}>
          <Button
            size="small"
            icon={<RadiusSettingOutlined />}
            onClick={() => onAddNode('result')}
            disabled={isTemplateMode}
          >
            Result
          </Button>
        </Tooltip>
      </Space>

      <Divider orientation="vertical" style={{ height: 24 }} />

      {/* Transition追加ボタン */}
      <Tooltip title={t('editor.toolbar.addTransitionTooltip')}>
        <Button
          size="small"
          icon={<SwapOutlined />}
          onClick={() => onAddNode('transition')}
          disabled={isTemplateMode}
        >
          Transition
        </Button>
      </Tooltip>

      <Divider orientation="vertical" style={{ height: 24 }} />

      {/* ワークフロー追加ボタン */}
      <Tooltip
        title={
          workflowModeActive
            ? t('editor.toolbar.workflowModeActive')
            : t('editor.toolbar.addWorkflowTooltip')
        }
      >
        <Button
          size="small"
          type={workflowModeActive ? 'primary' : 'default'}
          icon={<ApartmentOutlined />}
          onClick={onAddWorkflow}
          disabled={isTemplateMode}
        >
          {workflowModeActive ? t('editor.toolbar.workflowActive') : t('editor.toolbar.workflow')}
        </Button>
      </Tooltip>

      <Divider orientation="vertical" style={{ height: 24 }} />

      {/* Document編集ボタン */}
      <Tooltip title={t('editor.toolbar.editDocumentTooltip')}>
        <Button
          size="small"
          icon={<FileTextOutlined />}
          onClick={onEditDocument}
        >
          Document
        </Button>
      </Tooltip>

      <Divider orientation="vertical" style={{ height: 24 }} />

      {/* バリデーションボタン */}
      <Tooltip title={t('editor.toolbar.validateTooltip')}>
        <Button
          size="small"
          icon={<CheckCircleOutlined />}
          onClick={onValidate}
          loading={isValidating}
        >
          {isValidating ? t('editor.toolbar.validating') : t('editor.toolbar.validate')}
        </Button>
      </Tooltip>

      <Divider orientation="vertical" style={{ height: 24 }} />

      {/* 保存ボタン */}
      <Tooltip title={t('editor.toolbar.saveTooltip')}>
        <Button
          size="small"
          type="primary"
          icon={<SaveOutlined />}
          onClick={onSave}
          disabled={!canSave}
        >
          {t('editor.toolbar.save')}
        </Button>
      </Tooltip>

      {/* Draft管理ボタン */}
      {onOpenDraftManager && (
        <Tooltip title={t('editor.toolbar.draftTooltip')}>
          <Button
            size="small"
            icon={<FolderOpenOutlined />}
            onClick={onOpenDraftManager}
          >
            Draft
          </Button>
        </Tooltip>
      )}

      <Divider orientation="vertical" style={{ height: 24 }} />

      {/* Undo/Redoボタン */}
      <Space size={4}>
        <Tooltip title="Undo (Ctrl+Z)">
          <Button
            size="small"
            icon={<UndoOutlined />}
            onClick={onUndo}
            disabled={!canUndo}
          />
        </Tooltip>

        <Tooltip title="Redo (Ctrl+Y)">
          <Button
            size="small"
            icon={<RedoOutlined />}
            onClick={onRedo}
            disabled={!canRedo}
          />
        </Tooltip>
      </Space>

      {/* 右側スペーサー */}
      <div style={{ flex: 1 }} />

      {/* 自動保存トグル */}
      {onAutoSaveToggle && (
        <>
          <Divider orientation="vertical" style={{ height: 24 }} />
          <Space size={8} align="center">
            <Text style={{ fontSize: 12 }}>{t('editor.toolbar.autoSave')}</Text>
            <Switch
              size="small"
              checked={autoSaveEnabled || false}
              onChange={onAutoSaveToggle}
            />
            {lastAutoSaveTime && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                ({t('editor.toolbar.lastSaved')}: {formatAutoSaveTime(lastAutoSaveTime)})
              </Text>
            )}
          </Space>
        </>
      )}

      {/* ヒント表示 */}
      <Text type="secondary" style={{ fontSize: 11, marginLeft: 16 }}>
        {t('editor.toolbar.hint')}
      </Text>
    </Flex>
  );
};

export default EditorToolbar;