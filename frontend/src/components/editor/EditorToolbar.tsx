/**
 * EditorToolbar - 編集ツールバーコンポーネント
 * 
 * ノード追加ボタンなどの編集ツールを提供
 * reference版EditorToolbar.jsxベース
 * Material-UI → Ant Design v6 変換版
 * 
 * @version 3.0.0
 * @date 2026-01-28
 */

import React, { useState } from 'react';
import { Button, Space, Tooltip, Switch, Typography, Divider, Dropdown, message, theme, Segmented } from 'antd';
import type { MenuProps, SegmentedProps } from 'antd';
import { DownloadOutlined, AppstoreOutlined, UnorderedListOutlined } from '@ant-design/icons';
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
  List,
  Workflow,
} from 'lucide-react';
import { exportToPng, exportToSvg, exportToJson, type ExportOptions } from '@/utils/exportHelpers';
import type { Node, Edge, Viewport } from 'reactflow';

/**
 * EditorToolbarのProps型定義
 */
export interface EditorToolbarProps {
  /** 編集モード（ペトリネット/テンプレート切替） */
  editMode?: 'petri-net' | 'template';
  /** 編集モード変更ハンドラー */
  onEditModeChange?: (mode: 'petri-net' | 'template') => void;
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
  /** エクスポート対象のエレメントセレクタ（PNG/SVG用、デフォルト: '.react-flow'） */
  exportElementSelector?: string;
  /** ReactFlowノード（JSON用） */
  exportNodes?: Node[];
  /** ReactFlowエッジ（JSON用） */
  exportEdges?: Edge[];
  /** ReactFlowビューポート（JSON用） */
  exportViewport?: Viewport;
  /** エクスポート時のファイル名プレフィックス */
  exportFileName?: string;
  /** プロジェクト名（メタデータ用） */
  projectName?: string;
  /** メソッド名（メタデータ用） */
  methodName?: string;
  /** Phase 5: アーク属性表示トグル */
  showArcLabels?: boolean;
  /** Phase 5: アーク属性表示トグルハンドラー */
  onToggleArcLabels?: () => void;
}

/**
 * EditorToolbarコンポーネント
 */
const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editMode = 'petri-net',
  onEditModeChange,
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
  exportElementSelector = '.react-flow',
  exportNodes = [],
  exportEdges = [],
  exportViewport = { x: 0, y: 0, zoom: 1 },
  exportFileName = 'petri-net',
  projectName,
  methodName,
  showArcLabels = false,
  onToggleArcLabels,
}) => {
  const { token } = theme.useToken();
  const [isExporting, setIsExporting] = useState(false);

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

  /**
   * Exportハンドラー
   */
  const handleExport = async (format: 'png' | 'svg' | 'json') => {
    setIsExporting(true);

    try {
      const options: ExportOptions = {
        filePrefix: exportFileName,
        backgroundColor: '#ffffff',
        quality: 1.0,
        pixelRatio: 2,
      };

      switch (format) {
        case 'png':
          await exportToPng(exportElementSelector, options);
          message.success('PNG形式でエクスポートしました');
          break;
        case 'svg':
          await exportToSvg(exportElementSelector, options);
          message.success('SVG形式でエクスポートしました');
          break;
        case 'json':
          if (!exportNodes || exportNodes.length === 0) {
            message.warning('エクスポートするノードがありません');
            return;
          }
          exportToJson(
            exportNodes,
            exportEdges,
            exportViewport,
            options,
            { projectName, methodName }
          );
          message.success('JSON形式でエクスポートしました');
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      const errorMessage = error instanceof Error ? error.message : 'エクスポート中にエラーが発生しました';
      message.error(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Exportメニュー項目
   */
  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'png',
      label: 'PNG画像として保存',
      onClick: () => handleExport('png'),
    },
    {
      key: 'svg',
      label: 'SVG形式として保存',
      onClick: () => handleExport('svg'),
    },
    {
      key: 'json',
      label: 'JSON形式として保存',
      onClick: () => handleExport('json'),
      disabled: !exportNodes || exportNodes.length === 0,
    },
  ];

  return (
    <div
      style={{
        padding: token.paddingSM,
        borderBottom: `1px solid ${token.colorBorder}`,
        backgroundColor: token.colorBgContainer,
        display: 'flex',
        gap: token.marginSM,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      <Space split={<Divider type="vertical" />}>
        {/* ビュー切替セグメント（reference版ToggleButtonGroup → Segmented） */}
        {onEditModeChange && (
          <Segmented
            size="small"
            value={editMode}
            onChange={(value) => onEditModeChange(value as 'petri-net' | 'template')}
            options={[
              {
                label: (
                  <Space size={4}>
                    <Workflow size={14} />
                    <span>ペトリネット</span>
                  </Space>
                ),
                value: 'petri-net',
              },
              {
                label: (
                  <Space size={4}>
                    <List size={14} />
                    <span>テンプレート</span>
                  </Space>
                ),
                value: 'template',
              },
            ]}
          />
        )}

        {/* ノード追加ボタン群（reference版: 常に表示） */}
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

        {/* Exportボタン */}
        <Tooltip title="ペトリネット図をエクスポート">
          <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
            <Button
              size="small"
              icon={<DownloadOutlined />}
              loading={isExporting}
            >
              エクスポート
            </Button>
          </Dropdown>
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
        <Space split={<Divider type="vertical" />}>
          <Space size="small" align="center">
            <Typography.Text style={{ fontSize: token.fontSizeSM }}>
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
                style={{ fontSize: token.fontSizeSM, marginLeft: token.marginXS }}
              >
                (最終: {formatAutoSaveTime(lastAutoSaveTime)})
              </Typography.Text>
            )}
          </Space>
        </Space>
      )}

      {/* Phase 5: アーク属性表示トグル */}
      {onToggleArcLabels && (
        <Space size="small" align="center">
          <Typography.Text style={{ fontSize: token.fontSizeSM }}>
            アーク属性表示
          </Typography.Text>
          <Switch
            size="small"
            checked={showArcLabels}
            onChange={onToggleArcLabels}
          />
        </Space>
      )}

      {/* ヒントテキスト */}
      <Typography.Text
        type="secondary"
        style={{ fontSize: token.fontSizeSM, marginLeft: token.marginXS }}
      >
        ヒント: Ctrl+Sで保存 | Ctrl+Z/Yで取り消し/やり直し | M/C/R/T+クリックでノード追加
      </Typography.Text>
    </div>
  );
};

export default EditorToolbar;
