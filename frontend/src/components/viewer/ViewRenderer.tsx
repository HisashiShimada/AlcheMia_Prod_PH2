// frontend/src/components/viewer/ViewRenderer.tsx
// ビューレンダリング統括コンポーネント（Ant Design v6版）

'use client';

import React, { useState, useEffect } from 'react';
import { Alert, Space, Typography, Card, Button, Tag, Tabs, Spin, message } from 'antd';
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
 * デバイスタイプ
 */
type DeviceType = 'desktop' | 'tablet' | 'mobile';

/**
 * ビュータイプ
 */
type ViewType = 'main' | 'edit' | 'experiment' | 'experimentControl';

/**
 * ファイル情報
 */
interface FileInfo {
  key: string;
  name: string;
  content?: string;
  size?: number;
  lastModified?: string;
}

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
          MAIML Viewer Enhanced v2.0
        </Title>
        
        <Text type="secondary">
          デスクトップ/モバイル統一実験記録システム版
        </Text>
        
        <Paragraph>
          ファイルを選択してください
        </Paragraph>
        
        <Card>
          <Space orientation="vertical" size="small" style={{ width: '100%' }}>
            <Text strong>🎯 統一UX動線（デスクトップ/モバイル対応）</Text>
            <Text>• 左のFileExplorerまたは検索でMAIMLファイル選択 → ペトリネット図表示</Text>
            <Text>• 右上の「編集開始」ボタン → 新規/既存選択 → 編集画面</Text>
            <Text>• 右上の「🧪 実験記録」ボタン → デスクトップ/モバイル統一実験記録システム起動</Text>
          </Space>
        </Card>
        
        {enhancedMode && (
          <Alert
            message="Enhanced v2.0 モード有効"
            description="Parquet/Glueベース高速検索対応"
            type="success"
            showIcon
            icon={<RocketOutlined />}
          />
        )}
        
        <Card 
          title={
            <Space>
              <DeviceIcon />
              <Text>デバイス情報</Text>
            </Space>
          }
          size="small"
        >
          <Space orientation="vertical" size="small" style={{ width: '100%' }}>
            <Text>
              <Text strong>タイプ:</Text> {deviceType}
            </Text>
            <Text>
              <Text strong>モバイル:</Text> <Tag color={isMobileDevice ? 'green' : 'default'}>
                {isMobileDevice ? 'Yes' : 'No'}
              </Tag>
            </Text>
            <Text>
              <Text strong>タブレット:</Text> <Tag color={isTabletDevice ? 'blue' : 'default'}>
                {isTabletDevice ? 'Yes' : 'No'}
              </Tag>
            </Text>
            <Text>
              <Text strong>画面サイズ:</Text> {typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A'}
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
          このファイルタイプはビューアで表示できません
        </Title>
        
        <Paragraph type="secondary">
          ダウンロードして別のアプリケーションで開くことができます。
        </Paragraph>
        
        <Button
          type="primary"
          size="large"
          icon={<DownloadOutlined />}
          loading={downloadingFile}
          onClick={() => onFileDownload?.(selectedFile.key, selectedFile.name)}
        >
          {downloadingFile ? 'ダウンロード中...' : 'ファイルをダウンロード'}
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
  onFileDownload,
  onExitEdit,
  onExitExperiment,
  onExitExperimentControl,
  onOpenSubNetViewer,
}) => {
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
    if (!fileContent || !selectedFile || getFileType(selectedFile.name) !== 'maiml') {
      setMethods([]);
      setIsMultiMethod(false);
      setSelectedMethodIndex(0);
      setCheckedFileKey('');
      return;
    }

    // 既に同じファイルをチェック済みの場合はスキップ
    if (checkedFileKey === selectedFile.key) {
      console.log('ℹ️ [ViewRenderer] 既にチェック済み - スキップ:', selectedFile.key);
      return;
    }

    const checkMultipleMethods = () => {
      try {
        setLoadingMethods(true);
        console.log('🔍 [ViewRenderer] 複数メソッドチェック開始:', selectedFile.key);

        const parser = new MaimlParserTyped(fileContent);
        const parsedMethods: Method[] = parser.getMethods();

        if (parsedMethods.length > 1) {
          const methodDataList: MethodData[] = parsedMethods.map((m, index) => ({
            methodId: m.id || `method_${index}`,
            methodIndex: index,
            name: m.name || m.id || `Method ${index + 1}`,
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

          console.log('✅ [ViewRenderer] 複数メソッド検出:', methodDataList.length);
          setMethods(methodDataList);
          setIsMultiMethod(true);
          setSelectedMethodIndex(0);

          message.success({
            content: `${methodDataList.length}個のメソッドを検出しました`,
            key: 'multiple-methods-detected',
            duration: 3,
          });
        } else {
          console.log('ℹ️ [ViewRenderer] 単一メソッド');
          setMethods([]);
          setIsMultiMethod(false);
        }

        setCheckedFileKey(selectedFile.key);
      } catch (error) {
        console.error('❌ [ViewRenderer] 複数メソッドチェックエラー:', error);
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
    
    const fileType = getFileType(selectedFile.name);
    
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
                        <Text strong>{method.name || `Method ${index + 1}`}</Text>
                        <Tag color="blue" style={{ marginLeft: 8 }}>
                          {method.places?.length || 0} nodes, {method.transitions?.length || 0} transitions
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
        return (
          <div 
            id="petri-net-viewer-container"
            style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}
          >
            {loadingMethods && (
              <div style={{ padding: 16, textAlign: 'center', backgroundColor: '#fafafa' }}>
                <Spin size="small" /> <Text type="secondary">メソッド情報を確認中...</Text>
              </div>
            )}
            <ErrorBoundary>
              <PetriNetViewer 
                maimlData={fileContent}
                enhancedMode={enhancedMode}
                propertyDisplayMode="drawer"
                containerElementId="petri-net-viewer-container"
                onOpenSubNetViewer={onOpenSubNetViewer}
              />
            </ErrorBoundary>
          </div>
        );
        
      case 'tiff':
        return (
          <ErrorBoundary>
            <TiffViewer 
              fileKey={selectedFile.key} 
              fileName={selectedFile.name}
            />
          </ErrorBoundary>
        );
        
      case 'image':
        return (
          <ErrorBoundary>
            <ImageViewer 
              fileKey={selectedFile.key} 
              fileName={selectedFile.name}
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
                message.error('エディタの初期化に失敗しました');
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
            message="実験記録システム"
            description="実験記録機能は未実装です"
            type="warning"
            showIcon
            action={
              <Button size="small" onClick={onExitExperiment}>
                メイン画面に戻る
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
            message="実験制御（実験管理者）"
            description="実験制御機能は未実装です"
            type="warning"
            showIcon
            action={
              <Button size="small" onClick={onExitExperimentControl}>
                メイン画面に戻る
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
