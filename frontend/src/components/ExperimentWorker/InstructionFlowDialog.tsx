// frontend/src/components/ExperimentWorker/InstructionFlowDialog.tsx
// 指示確認タブ専用フロー図ダイアログ（メソッド選択なし）

'use client';

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Spin, message, Button, Typography } from 'antd';
import { CloseOutlined, MinusOutlined, ExpandOutlined } from '@ant-design/icons';
import { Rnd } from 'react-rnd';
import ViewRenderer from '@/components/viewer/ViewRenderer';
import { extractErrorMessage } from '@/utils/errorUtils';

const { Text } = Typography;

/**
 * ファイルデータ型定義
 */
export interface FileData {
  id: string;
  name: string;
  path: string;
  size: number;
  lastModified: string;
  type: string;
  isFolder?: boolean;
  fileCount?: number;
  content?: string; // APIから取得済みのファイルコンテンツ（設定されていればfetchをスキップ）
}

/**
 * サブネットデータ型定義
 */
export interface SubnetData {
  transitionName: string;
  maimlData: string;
  templateMap: Record<string, { element: Element }>;
  petriNetData: {
    places: Array<{
      id: string;
      data: {
        label?: string;
        stereotype?: string;
        template?: { id: string };
        templateId?: string;
      };
    }>;
    arcs: Array<{
      id: string;
      source: string;
      target: string;
    }>;
  };
}

/**
 * InstructionFlowDialog Props
 */
interface InstructionFlowDialogProps {
  id: string;
  file: FileData;
  selectedMethodId: string | null; // 選択中のメソッドID
  zIndex: number;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
  onOpenSubNetViewer?: (subnetData: SubnetData) => void;
}

/**
 * ファイルコンテンツをロードする関数
 * 
 * - file.content が設定されている場合はそれをそのまま返す（APIから取得済みコンテンツを優先）
 * - file.content がない場合はモックデータにフォールバック（後方互換性）
 */
const loadFileContent = async (file: FileData): Promise<string | null> => {
  try {
    if (file.type === 'maiml') {
      // APIから取得済みのコンテンツが存在する場合はそれを使用
      if (file.content) {
        console.log('✅ [InstructionFlowDialog] APIコンテンツを使用:', {
          name: file.name,
          size: file.content.length,
        });
        return file.content;
      }

      // フォールバック: モックデータを読み込む
      console.warn('⚠️ [InstructionFlowDialog] file.contentがないためモックデータにフォールバック:', file.name);
      const response = await fetch('/data/mock/test_omori11.maiml');
      
      if (!response.ok) {
        console.error('❌ [InstructionFlowDialog] HTTPエラー:', response.status, response.statusText);
        throw new Error(`Failed to load MAIML file: ${response.status} ${response.statusText}`);
      }
      
      const content = await response.text();
      console.log('✅ [InstructionFlowDialog] モックファイル読み込み成功:', {
        size: content.length,
        firstChars: content.substring(0, 100),
      });
      
      return content;
    }
    
    // その他のファイルタイプは今のところコンテンツなし
    return null;
  } catch (error) {
    console.error('❌ [InstructionFlowDialog] ファイル読み込みエラー:', error);
    message.error(extractErrorMessage(error));
    return null;
  }
};

/**
 * InstructionFlowDialog コンポーネント
 * 
 * 指示確認タブ専用のフロー図ダイアログ
 * - メソッド選択Tabsは非表示
 * - 選択中のメソッドのフロー図のみを表示
 * - react-rndによりドラッグ&リサイズが可能
 */
const InstructionFlowDialog: React.FC<InstructionFlowDialogProps> = ({
  id,
  file,
  selectedMethodId,
  zIndex,
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 1200, height: 800 },
  onClose,
  onFocus,
  onOpenSubNetViewer,
}) => {
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // ファイルが変更されたらコンテンツをロード
  useEffect(() => {
    if (!file) {
      return;
    }

    let isMounted = true;

    const loadContent = async () => {
      setLoading(true);
      const content = await loadFileContent(file);
      
      if (isMounted) {
        setFileContent(content);
        setLoading(false);
      }
    };

    loadContent();

    return () => {
      isMounted = false;
    };
  }, [file]);

  // タイトル取得
  const getTitle = () => {
    return file.name;
  };

  // コンテンツ描画
  const renderContent = () => {
    if (!file) return null;

    // ファイル情報をViewRenderer用に変換
    const selectedFile = {
      key: file.id,
      name: file.name,
      content: fileContent || undefined,
      size: file.size,
      lastModified: file.lastModified,
    };

    return (
      <div
        style={{
          height: '100%',
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <Spin size="large" tip="ファイルを読み込み中...">
              <div />
            </Spin>
          </div>
        ) : (
          <ViewRenderer
            currentView="main"
            selectedFile={selectedFile}
            fileContent={fileContent}
            enhancedMode={false}
            downloadingFile={false}
            deviceType="desktop"
            isTabletDevice={false}
            isMobileDevice={false}
            hideMethodTabs={true}
            selectedMethodId={selectedMethodId}
            onOpenSubNetViewer={onOpenSubNetViewer}
          />
        )}
      </div>
    );
  };

  // Portal を使用して document.body に直接レンダリング
  const dialogContent = (
    <Rnd
      default={{
        x: initialPosition.x,
        y: initialPosition.y,
        width: initialSize.width,
        height: isMinimized ? 60 : initialSize.height,
      }}
      minWidth={800}
      minHeight={isMinimized ? 60 : 600}
      maxWidth={window.innerWidth - 100}
      maxHeight={window.innerHeight - 100}
      bounds="window"
      style={{
        zIndex: zIndex,
      }}
      dragHandleClassName="drag-handle"
      enableResizing={!isMinimized}
      onMouseDown={() => onFocus(id)}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#fff',
          borderRadius: 8,
          boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          zIndex: zIndex,
        }}
      >
        {/* タイトルバー */}
        <div
          className="drag-handle"
          data-testid={`instruction-flow-dialog-titlebar-${id}`}
          style={{
            padding: '16px 24px',
            borderBottom: isMinimized ? 'none' : '1px solid #f0f0f0',
            cursor: 'move',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#fafafa',
            borderRadius: isMinimized ? '8px' : '8px 8px 0 0',
            flexShrink: 0,
          }}
        >
          <Text strong style={{ fontSize: 16 }}>{getTitle()}</Text>
          <div style={{ display: 'flex', gap: 4 }}>
            <Button
              data-testid={`instruction-flow-dialog-minimize-button-${id}`}
              type="text"
              icon={isMinimized ? <ExpandOutlined /> : <MinusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              }}
              title={isMinimized ? '展開' : '最小化'}
            />
            <Button
              data-testid={`instruction-flow-dialog-close-button-${id}`}
              type="text"
              icon={<CloseOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onClose(id);
              }}
              title="閉じる"
            />
          </div>
        </div>

        {/* コンテンツ */}
        {!isMinimized && (
          <div 
            id={`instruction-flow-dialog-container-${id}`}
            data-testid={`instruction-flow-dialog-content-${id}`}
            style={{ 
              position: 'relative',
              flex: 1, 
              overflow: 'hidden' 
            }}
          >
            {renderContent()}
          </div>
        )}
      </div>
    </Rnd>
  );

  // document.body が存在する場合のみPortalを使用
  if (typeof document !== 'undefined') {
    return ReactDOM.createPortal(dialogContent, document.body);
  }

  // SSR時はnullを返す
  return null;
};

export default InstructionFlowDialog;