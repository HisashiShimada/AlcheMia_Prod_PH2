// frontend/src/components/viewer/ViewRendererDialog.tsx
// ビューアフローティングダイアログコンポーネント（react-rnd対応）

'use client';

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { App, Spin, Button, Typography } from 'antd';
import { CloseOutlined, MinusOutlined, ExpandOutlined } from '@ant-design/icons';
import { Rnd } from 'react-rnd';
import ViewRenderer from './ViewRenderer';
import SubNetViewer from './dialogs/SubNetViewer';
import { getFileContentAsText } from '@/services/fileAccessService';
import { useLanguage } from '@/contexts/LanguageContext';
import type { FileData, SubnetData } from '@/types/editor';

const { Text } = Typography;

/**
 * ViewRendererDialog Props
 */
interface ViewRendererDialogProps {
  id: string;
  contentType: 'file' | 'subnet' | 'edit';
  file?: FileData;
  /** 外部から渡すファイルコンテンツ（省略時はAPIから取得） */
  fileContent?: string | null;
  subnetData?: SubnetData;
  zIndex: number;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
  onOpenSubNetViewer?: (subnetData: SubnetData) => void;
}

/**
 * ViewRendererDialog コンポーネント
 * 
 * ファイルまたはサブネットをフローティングダイアログで表示する
 * react-rndによりドラッグ&リサイズが可能
 */
const ViewRendererDialog: React.FC<ViewRendererDialogProps> = ({
  id,
  contentType,
  file,
  fileContent: externalFileContent,
  subnetData,
  zIndex,
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 1200, height: 800 },
  onClose,
  onFocus,
  onOpenSubNetViewer,
}) => {
  const { message } = App.useApp();
  const { t } = useLanguage();
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // ファイルが変更されたらコンテンツをロード（fileモードとeditモードで使用）
  useEffect(() => {
    if ((contentType !== 'file' && contentType !== 'edit') || !file) {
      return;
    }

    // 外部からコンテンツが渡されている場合はそのまま使用（APIスキップ）
    if (externalFileContent !== undefined) {
      setFileContent(externalFileContent ?? null);
      return;
    }

    // MAIMLファイルのみAPIからテキストを取得
    if (file.type !== 'maiml') {
      setFileContent(null);
      return;
    }

    let isMounted = true;

    const loadContent = async () => {
      setLoading(true);
      try {
        console.log('🔍 [ViewRendererDialog] Loading MAIML file from S3:', file.name, 'path:', file.path);
        const content = await getFileContentAsText(file.path);
        if (isMounted) {
          setFileContent(content);
          console.log('✅ [ViewRendererDialog] File loaded successfully:', { size: content.length });
        }
      } catch (error) {
        console.error('❌ [ViewRendererDialog] File load error:', error);
        message.error(t('viewer.loadFileError'));
        if (isMounted) {
          setFileContent(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadContent();

    return () => {
      isMounted = false;
    };
  }, [contentType, file, externalFileContent]);

  // タイトル取得
  const getTitle = () => {
    if (contentType === 'file' && file) {
      return file.name;
    }
    if (contentType === 'subnet' && subnetData) {
      return `Subnet: ${subnetData.transitionName}`;
    }
    if (contentType === 'edit' && file) {
      return `🚀 Edit: ${file.name}`;
    }
    return 'Unknown';
  };

  // コンテンツ描画
  const renderContent = () => {
    if (contentType === 'file') {
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
              <Spin size="large">
                <div style={{ minHeight: 100 }} />
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
              onOpenSubNetViewer={onOpenSubNetViewer}
            />
          )}
        </div>
      );
    }

    if (contentType === 'edit') {
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
              <Spin size="large">
                <div style={{ minHeight: 100 }} />
              </Spin>
            </div>
          ) : (
            <ViewRenderer
              currentView="edit"
              selectedFile={selectedFile}
              fileContent={fileContent}
              enhancedMode={false}
              downloadingFile={false}
              deviceType="desktop"
              isTabletDevice={false}
              isMobileDevice={false}
              onExitEdit={() => onClose(id)}
              onOpenSubNetViewer={onOpenSubNetViewer}
            />
          )}
        </div>
      );
    }

    if (contentType === 'subnet' && subnetData) {
      return (
        <SubNetViewer
          open={true}
          nodeName={subnetData.transitionName}
          maimlData={subnetData.maimlData}
          templateMap={subnetData.templateMap}
          petriNetData={subnetData.petriNetData}
          onClose={() => onClose(id)}
        />
      );
    }

    return null;
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
      minWidth={contentType === 'subnet' ? 1000 : 800}
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
              type="text"
              icon={isMinimized ? <ExpandOutlined /> : <MinusOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                setIsMinimized(!isMinimized);
              }}
              title={isMinimized ? 'Expand' : 'Minimize'}
            />
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onClose(id);
              }}
              title="Close"
            />
          </div>
        </div>

        {/* コンテンツ */}
        {!isMinimized && (
          <div 
            id={`viewer-dialog-container-${id}`}
            style={{ 
              position: 'relative',  // 重要: getContainerで使用
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

export default ViewRendererDialog;
