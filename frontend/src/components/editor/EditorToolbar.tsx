/**
 * EditorToolbar - 編集ツールバーコンポーネント
 * 
 * ノード追加ボタンなどの編集ツールを提供
 * Material-UI → Ant Design v6 変換版
 * 
 * @version 2.0.0
 * @date 2025-12-23
 */

import React from 'react';
import { Button, Space, Tooltip, Switch, Typography, Divider } from 'antd';
import {
  Circle,
  Square,
  Pentagon,
  ArrowRightLeft,
  Undo,
  Redo,
  Save,
  FileText,
  CheckCircle,
  Network,
  FolderOpen,
} from 'lucide-react';

/**
 * EditorToolbarのProps型定義
 */
export interface EditorToolbarProps {
  /** 選択されたツール */
  selectedTool: 'select' | 'workflow';
  /** ツール変更ハンドラー */
  onToolChange: (tool: 'select' | 'workflow') => void;
  /** ノード追加ハンドラー */
  onAddNode: (nodeType: string) => void;
  /** Undoハンドラー */
  onUndo: () => void;
  /** Redoハンドラー */
  onRedo: () => void;
  /** Undo可能フラグ */
  canUndo: boolean;
  /** Redo可能フラグ */
  canRedo: boolean;
  /** 保存ハンドラー */
  onSave: () => void;
  /** Document編集ハンドラー */
  onEditDocument: () => void;
  /** バリデーションハンドラー */
  onValidate: () => void;
  /** Draft管理ダイアログオープンハンドラー */
  onOpenDraftManager?: () => void;
  /** 自動保存有効フラグ */
  autoSaveEnabled?: boolean;
  /** 自動保存トグルハンドラー */
  onToggleAutoSave?: () => void;
  /** 最終自動保存時刻 */
  lastAutoSaveTime?: Date | null;
}

/**
 * EditorToolbarコンポーネント
 */
const EditorToolbar: React.FC<EditorToolbarProps> = ({
  selectedTool,
  onToolChange,
  onAddNode,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onSave,
  onEditDocument,
  onValidate,
  onOpenDraftManager,
  autoSaveEnabled = false,
  onToggleAutoSave,
  lastAutoSaveTime,
}) => {
  /**
   * 最終保存時刻のフォーマット
   */
  const formatAutoSaveTime = (time: Date | null): string => {
    if (!time) return '';
    const hours = String(time.getHours()).padStart(2, '0');
    const minutes = String(time.getMinutes()).padStart(2, '0');
    const seconds = String(time.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <div
      style={{
        padding: '8px',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: '#ffffff',
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <Space size="small" split={<Divider type="vertical" />}>
        {/* ノード追加ボタン群 */}
        <Space size="small">
          <Tooltip title="Material Placeを追加">
            <Button
              size="small"
              icon={<Circle size={16} />}
              onClick={() => onAddNode('material')}
            >
              Material
            </Button>
          </Tooltip>

          <Tooltip title="Condition Placeを追加">
            <Button
              size="small"
              icon={<Square size={16} />}
              onClick={() => onAddNode('condition')}
            >
              Condition
            </Button>
          </Tooltip>

          <Tooltip title="Result Placeを追加">
            <Button
              size="small"
              icon={<Pentagon size={16} />}
              onClick={() => onAddNode('result')}
            >
              Result
            </Button>
          </Tooltip>
        </Space>

        {/* Transitionボタン */}
        <Tooltip title="Transitionを追加">
          <Button
            size="small"
            icon={<ArrowRightLeft size={16} />}
            onClick={() => onAddNode('transition')}
          >
            Transition
          </Button>
        </Tooltip>

        {/* ワークフロー追加ボタン */}
        <Tooltip
          title={
            selectedTool === 'workflow'
              ? 'ワークフローモード（キャンバスをクリック）'
              : 'ワークフロー追加（他MaiMLファイルを統合）'
          }
        >
          <Button
            size="small"
            type={selectedTool === 'workflow' ? 'primary' : 'default'}
            icon={<Network size={16} />}
            onClick={() => onToolChange(selectedTool === 'workflow' ? 'select' : 'workflow')}
          >
            {selectedTool === 'workflow' ? 'ワークフロー (有効)' : 'ワークフロー'}
          </Button>
        </Tooltip>

        {/* Document編集ボタン */}
        <Tooltip title="Document編集">
          <Button
            size="small"
            icon={<FileText size={16} />}
            onClick={onEditDocument}
          >
            Document
          </Button>
        </Tooltip>

        {/* バリデーションボタン */}
        <Tooltip title="バリデーション実行">
          <Button
            size="small"
            icon={<CheckCircle size={16} />}
            onClick={onValidate}
          >
            バリデーション
          </Button>
        </Tooltip>

        {/* 保存ボタン */}
        <Tooltip title="保存 (Ctrl+S)">
          <Button
            type="primary"
            size="small"
            icon={<Save size={16} />}
            onClick={onSave}
          >
            保存
          </Button>
        </Tooltip>

        {/* Draft管理ボタン */}
        {onOpenDraftManager && (
          <Tooltip title="Draft管理（一時保存・読み込み）">
            <Button
              size="small"
              icon={<FolderOpen size={16} />}
              onClick={onOpenDraftManager}
            >
              Draft
            </Button>
          </Tooltip>
        )}

        {/* Undo/Redoボタン */}
        <Space size="small">
          <Tooltip title="Undo (Ctrl+Z)">
            <Button
              shape="circle"
              size="small"
              icon={<Undo size={16} />}
              onClick={onUndo}
              disabled={!canUndo}
            />
          </Tooltip>

          <Tooltip title="Redo (Ctrl+Y)">
            <Button
              shape="circle"
              size="small"
              icon={<Redo size={16} />}
              onClick={onRedo}
              disabled={!canRedo}
            />
          </Tooltip>
        </Space>
      </Space>

      {/* スペーサー */}
      <div style={{ flex: 1 }} />

      {/* 自動保存トグル */}
      {onToggleAutoSave && (
        <Space size="small" split={<Divider type="vertical" />}>
          <Space size="small" align="center">
            <Typography.Text style={{ fontSize: '12px' }}>
              自動保存
            </Typography.Text>
            <Switch
              size="small"
              checked={autoSaveEnabled}
              onChange={onToggleAutoSave}
            />
            {lastAutoSaveTime && (
              <Typography.Text
                type="secondary"
                style={{ fontSize: '11px', marginLeft: 4 }}
              >
                (最終: {formatAutoSaveTime(lastAutoSaveTime)})
              </Typography.Text>
            )}
          </Space>
        </Space>
      )}

      {/* ヒントテキスト */}
      <Typography.Text
        type="secondary"
        style={{ fontSize: '12px', marginLeft: 8 }}
      >
        ヒント: Ctrl+Sで保存 | Ctrl+Z/Yで取り消し/やり直し | M/C/R/T+クリックでノード追加
      </Typography.Text>
    </div>
  );
};

export default EditorToolbar;
