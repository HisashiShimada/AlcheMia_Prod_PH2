// frontend/src/components/viewer/ViewRenderer.tsx
// ビューレンダリング統括コンポーネント（Ant Design v6版）

'use client';

import React, { useState, useEffect } from 'react';
import { App, Alert, Space, Typography, Card, Button, Tag, Tabs, Spin } from 'antd';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  RocketOutlined, 
  FileTextOutlined, 
  DownloadOutlined,
  MobileOutlined,
  TabletOutlined,
  DesktopOutlined
} from '@ant-design/icons';
import { ReactFlowProvider } from 'reactflow';
import ErrorBoundary from './ErrorBoundary';
import TiffViewer from './TiffViewer';
import ImageViewer from './ImageViewer';
import PetriNetViewer from './PetriNetViewer';
import PetriNetEditorInner from '@/components/editorv2/PetriNetEditorInner';
import { MaimlParserTyped } from '@/utils/maimlParserTyped';
import type { Method } from '@/types/maiml-unified';
import type { FileInfo } from '@/types/editor';
import type { DeviceType, ViewType } from '@/types/common';

const { Title, Text, Paragraph } = Typography;

/**
 * ファイルタイプを判定
 */
const getFileType = (fileName: string): 'maiml' | 'tiff' | 'image' | 'unknown' => {
  if (!fileName) return 'unknown';
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  if (ext === 'maiml' || ext === 'xml') return 'maiml';
  if (ext === 'tif' || ext === 'tiff') return 'tiff';
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) return 'image';
  
  return 'unknown';
};


/**
 * ViewRenderer Props
 */
interface ViewRendererProps {
  // 現在のビューモード
  currentView: ViewType;
  
  // ファイル関連
  selectedFile?: FileInfo | null;
  fileContent?: string | null;
  enhancedMode?: boolean;
  downloadingFile?: boolean;
  
  // デバイス情報
  deviceType?: DeviceType;
  isTabletDevice?: boolean;
  isMobileDevice?: boolean;
  
  // UI制御
  hideMethodTabs?: boolean; // メソッド選択Tabsを非表示にする（指示確認タブ用）
  selectedMethodId?: string | null; // 表示するメソッドのID（hideMethodTabs時に使用）
  
  // イベントハンドラー
  onFileDownload?: (fileKey: string, fileName: string) => void;
  onExitEdit?: () => void;
  onExitExperiment?: () => void;
  onExitExperimentControl?: () => void;
  onOpenSubNetViewer?: (subnetData: {
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
  }) => void;
}

/**
 * ファイル未選択時の表示
 */
const NoSelectionView: React.FC<{
  enhancedMode?: boolean;
  deviceType?: DeviceType;
  isMobileDevice?: boolean;
  isTabletDevice?: boolean;
}> = ({ enhancedMode, deviceType = 'desktop', isMobileDevice, isTabletDevice }) => {
  const { t } = useLanguage();
  // デバイスアイコン
  const DeviceIcon = deviceType === 'mobile' 
    ? MobileOutlined 
    : deviceType === 'tablet' 
    ? TabletOutlined 
    : DesktopOutlined;

  return (
    <div style={{ 
      padding: '48px 24px',
      maxWidth: 800,
      margin: '0 auto',
      textAlign: 'center'
    }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <RocketOutlined style={{ fontSize: 64, color: '#CF0027' }} />
        
        <Title level={2}>
          {t('viewer.noSelectionTitle')}
        </Title>
        
        <Text type="secondary">
          {t('viewer.noSelectionSubtitle')}
        </Text>
        
        <Paragraph>
          {t('viewer.noSelectionHint')}
        </Paragraph>
        
        <Card>
          <Space orientation="vertical" size="small" style={{ width: '100%' }}>
            <Text strong>{t('viewer.noSelectionFlowTitle')}</Text>
            <Text>{t('viewer.noSelectionFlow1')}</Text>
            <Text>{t('viewer.noSelectionFlow2')}</Text>
            <Text>{t('viewer.noSelectionFlow3')}</Text>
          </Space>
        </Card>
        
        {enhancedMode && (
          <Alert
            message={t('viewer.enhancedModeTitle')}
            description={t('viewer.enhancedModeDesc')}
            type="success"
            showIcon
            icon={<RocketOutlined />}
          />
        )}
        
        <Card 
          title={
            <Space>
              <DeviceIcon />
          <Text>{t('viewer.deviceInfoTitle')}</Text>
            </Space>
          }
          size="small"
        >
          <Space orientation="vertical" size="small" style={{ width: '100%' }}>
            <Text>
              <Text strong>{t('viewer.deviceType')}</Text> {deviceType}
            </Text>
            <Text>
              <Text strong>{t('viewer.deviceMobile')}</Text> <Tag color={isMobileDevice ? 'green' : 'default'}>
                {isMobileDevice ? t('viewer.yes') : t('viewer.no')}
              </Tag>
            </Text>
            <Text>
              <Text strong>{t('viewer.deviceTablet')}</Text> <Tag color={isTabletDevice ? 'blue' : 'default'}>
                {isTabletDevice ? t('viewer.yes') : t('viewer.no')}
              </Tag>
            </Text>
            <Text>
              <Text strong>{t('viewer.deviceScreenSize')}</Text> {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A'}
            </Text>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

/**
 * サポートされていないファイルタイプの表示
 */
const UnsupportedFileView: React.FC<{
  selectedFile: FileInfo;
  downloadingFile?: boolean;
  onFileDownload?: (fileKey: string, fileName: string) => void;
}> = ({ selectedFile, downloadingFile, onFileDownload }) => {
  const { t } = useLanguage();
  return (
    <div style={{ 
      padding: '48px 24px',
      maxWidth: 600,
      margin: '0 auto',
      textAlign: 'center'
    }}>
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <FileTextOutlined style={{ fontSize: 64, color: '#8c8c8c' }} />
        
        <Title level={3}>
          {t('viewer.unsupportedFileTitle')}
        </Title>
        
        <Paragraph type="secondary">
          {t('viewer.unsupportedFileDesc')}
        </Paragraph>
        
        <Button
          type="primary"
          size="large"
          icon={<DownloadOutlined />}
          loading={downloadingFile}
          onClick={() => onFileDownload?.(selectedFile.key, selectedFile.name ?? '')}
        >
          {downloadingFile ? t('viewer.downloading') : t('viewer.downloadFile')}
        </Button>
      </Space>
    </div>
  );
};

/**
 * ViewRenderer コンポーネント
 */
const ViewRenderer: React.FC<ViewRendererProps> = ({
  currentView = 'main',
  selectedFile,
  fileContent,
  enhancedMode = false,
  downloadingFile = false,
  deviceType = 'desktop',
  isTabletDevice = false,
  isMobileDevice = false,
  hideMethodTabs = false,
  selectedMethodId = null,
  onFileDownload,
  onExitEdit,
  onExitExperiment,
  onExitExperimentControl,
  onOpenSubNetViewer,
}) => {
  const { message } = App.useApp();
  const { t } = useLanguage();

  // 🎯 複数メソッド対応: 型定義
  interface MethodData {
    methodId: string;
    methodIndex: number;
    name: string;
    places?: Array<{ id: string; type: string; description?: string }>;
    transitions?: Array<{ id: string; description?: string }>;
    arcs?: Array<{ id: string; source: string; target: string }>;
  }

  // 🎯 複数メソッド対応: State管理
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [methods, setMethods] = useState<MethodData[]>([]);
  const [selectedMethodIndex, setSelectedMethodIndex] = useState<number>(0);
  const [isMultiMethod, setIsMultiMethod] = useState(false);
  const [checkedFileKey, setCheckedFileKey] = useState<string>('');

  // 🎯 複数メソッドチェック: fileContentが変わったら実行
  useEffect(() => {
    if (!fileContent || !selectedFile || getFileType(selectedFile.name ?? '') !== 'maiml') {
      setMethods([]);
      setIsMultiMethod(false);
      setSelectedMethodIndex(0);
      setCheckedFileKey('');
      return;
    }

    // 既に同じファイルをチェック済みの場合はスキップ
    if (checkedFileKey === selectedFile.key) {
      console.log('ℹ️ [ViewRenderer] Already checked - skipping:', selectedFile.key);
      return;
    }

    const checkMultipleMethods = () => {
      try {
        setLoadingMethods(true);
        console.log('🔍 [ViewRenderer] Checking multiple methods:', selectedFile.key);

        const parser = new MaimlParserTyped(fileContent);
        const parsedMethods: Method[] = parser.getMethods();

        if (parsedMethods.length > 1) {
          const methodDataList: MethodData[] = parsedMethods.map((m, index) => ({
            methodId: m.id || `method_${index}`,
            methodIndex: index,
            name: m.name || m.id || t('viewer.methodLabel', { index: String(index + 1) }),
            places: (m.pnml.places || []).map((p) => ({
              id: p.id,
              type: 'place',
              description: p.name,
            })),
            transitions: (m.pnml.transitions || []).map((t) => ({
              id: t.id,
              description: t.name,
            })),
            arcs: (m.pnml.arcs || []).map((a) => ({
              id: a.id,
              source: a.source,
              target: a.target,
            })),
          }));

          console.log('✅ [ViewRenderer] Multiple methods detected:', methodDataList.length);
          setMethods(methodDataList);
          setIsMultiMethod(true);
          setSelectedMethodIndex(0);

          const methodsDetectedContent = t('viewer.methodsDetected', { count: String(methodDataList.length) });
          const methodsDetectedParams = {
            content: methodsDetectedContent,
            key: 'multiple-methods-detected',
            duration: 3,
          };
          message.success(methodsDetectedParams);
        } else {
          console.log('ℹ️ [ViewRenderer] Single method');
          setMethods([]);
          setIsMultiMethod(false);
        }

        setCheckedFileKey(selectedFile.key);
      } catch (error) {
        console.error('❌ [ViewRenderer] Multiple method check error:', error);
        setMethods([]);
        setIsMultiMethod(false);
        setCheckedFileKey(selectedFile.key);
      } finally {
        setLoadingMethods(false);
      }
    };

    checkMultipleMethods();
  }, [fileContent, selectedFile?.key]);

  /**
   * ファイルビューアーのレンダリング
   */
  const renderFileViewer = () => {
    // ファイル未選択
    if (!selectedFile) {
      return (
        <NoSelectionView
          enhancedMode={enhancedMode}
          deviceType={deviceType}
          isMobileDevice={isMobileDevice}
          isTabletDevice={isTabletDevice}
        />
      );
    }
    
    const fileType = getFileType(selectedFile.name ?? '');
    
    switch (fileType) {
      case 'maiml':
        // 🎯 複数メソッド対応: hideMethodTabsがtrueの場合はTabsを非表示
        if (isMultiMethod && methods.length > 0 && !hideMethodTabs) {
          return (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flexShrink: 0, borderBottom: '1px solid #f0f0f0', padding: '8px 16px', backgroundColor: '#fafafa' }}>
                <Tabs
                  activeKey={String(selectedMethodIndex)}
                  onChange={(key) => setSelectedMethodIndex(Number(key))}
                  items={methods.map((method, index) => ({
                    key: String(index),
                    label: (
                      <span>
                        <Text strong>{method.name || t('viewer.methodLabel', { index: String(index + 1) })}</Text>
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                          {t('viewer.methodNodeTransitions', { nodes: String(method.places?.length || 0), transitions: String(method.transitions?.length || 0) })}
                        </Tag>
                      </span>
                    ),
                  }))}
                />
              </div>
              <div 
                id="petri-net-viewer-container"
                style={{ flex: 1, overflow: 'hidden', position: 'relative' }}
              >
                <ErrorBoundary>
                  <PetriNetViewer 
                    maimlData={fileContent}
                    enhancedMode={enhancedMode}
                    propertyDisplayMode="drawer"
                    containerElementId="petri-net-viewer-container"
                    onOpenSubNetViewer={onOpenSubNetViewer}
                    selectedMethodId={methods[selectedMethodIndex]?.methodId}
                  />
                </ErrorBoundary>
              </div>
            </div>
          );
        }
        
        // 🎯 単一メソッドまたはチェック中: 従来通りの表示
        // hideMethodTabsがtrueの場合は selectedMethodId（外部から渡されたもの）を使用
        return (
          <div 
            id="petri-net-viewer-container"
            style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}
          >
            {loadingMethods && (
              <div style={{ padding: 16, textAlign: 'center', backgroundColor: '#fafafa' }}>
                <Spin size="small" /> <Text type="secondary">Checking method info...</Text>
              </div>
            )}
            <ErrorBoundary>
              <PetriNetViewer 
                maimlData={fileContent}
                enhancedMode={enhancedMode}
                propertyDisplayMode="drawer"
                containerElementId="petri-net-viewer-container"
                onOpenSubNetViewer={onOpenSubNetViewer}
                selectedMethodId={selectedMethodId || undefined}
              />
            </ErrorBoundary>
          </div>
        );
        
      case 'tiff':
        return (
          <ErrorBoundary>
            <TiffViewer 
              fileKey={selectedFile.key} 
              fileName={selectedFile.name ?? ''}
            />
          </ErrorBoundary>
        );
        
      case 'image':
        return (
          <ErrorBoundary>
            <ImageViewer 
              fileKey={selectedFile.key} 
              fileName={selectedFile.name ?? ''}
            />
          </ErrorBoundary>
        );
        
      default:
        return (
          <UnsupportedFileView
            selectedFile={selectedFile}
            downloadingFile={downloadingFile}
            onFileDownload={onFileDownload}
          />
        );
    }
  };

  /**
   * 編集画面のレンダリング
   */
  const renderEditView = () => {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <ErrorBoundary>
          <ReactFlowProvider>
            <PetriNetEditorInner
              maimlData={fileContent || null}
              editingFileName={selectedFile?.name}
              editMode="view"
              onError={(error: Error) => {
                console.error('❌ [ViewRenderer] PetriNetEditor error:', error);
                message.error(t('viewer.initializeEditorError'));
              }}
            />
          </ReactFlowProvider>
        </ErrorBoundary>
      </div>
    );
  };

  /**
   * 実験記録画面のレンダリング
   */
  const renderExperimentView = () => {
    return (
      <div style={{ padding: 24 }}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message={t('viewer.experimentRecordTitle')}
            description={t('viewer.experimentRecordDesc')}
            type="warning"
            showIcon
            action={
              <Button size="small" onClick={onExitExperiment}>
                {t('viewer.backToMain')}
              </Button>
            }
          />
        </Space>
      </div>
    );
  };

  /**
   * 実験制御画面のレンダリング
   */
  const renderExperimentControlView = () => {
    return (
      <div style={{ padding: 24 }}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message={t('viewer.experimentControlTitle')}
            description={t('viewer.experimentControlDesc')}
            type="warning"
            showIcon
            action={
              <Button size="small" onClick={onExitExperimentControl}>
                {t('viewer.backToMain')}
              </Button>
            }
          />
        </Space>
      </div>
    );
  };

  // ビュー切り替え
  switch (currentView) {
    case 'edit':
      return renderEditView();
    case 'experiment':
      return renderExperimentView();
    case 'experimentControl':
      return renderExperimentControlView();
    case 'main':
    default:
      return renderFileViewer();
  }
};

export default ViewRenderer;
