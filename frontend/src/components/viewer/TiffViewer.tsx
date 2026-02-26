// frontend/src/components/viewer/TiffViewer.tsx
// TIFFファイルビューアコンポーネント（Ant Design v6版）

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Space, Typography, Alert, Flex } from 'antd';
import { 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  ReloadOutlined,
  DownloadOutlined,
  FileImageOutlined
} from '@ant-design/icons';
import { getFileViewUrl } from '@/services/fileAccessService';

const { Title, Text } = Typography;

interface TiffViewerProps {
  fileKey: string;
  fileName: string;
}

/**
 * TiffViewer コンポーネント
 * TIFFファイルの表示（ブラウザ制限によりダウンロード推奨）
 */
const TiffViewer: React.FC<TiffViewerProps> = ({ fileKey, fileName }) => {
  const [scale, setScale] = useState(1);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileKey) return;

    let isMounted = true;

    const fetchUrl = async () => {
      try {
        console.log('🔍 [TiffViewer] 署名付きURLを取得中:', fileKey);
        const url = await getFileViewUrl(fileKey);
        if (isMounted) {
          setSignedUrl(url);
          setUrlError(null);
          console.log('✅ [TiffViewer] URL取得成功');
        }
      } catch (err) {
        if (isMounted) {
          console.error('❌ [TiffViewer] URL取得エラー:', err);
          setUrlError(`URLの取得に失敗しました: ${err instanceof Error ? err.message : '不明なエラー'}`);
        }
      }
    };

    fetchUrl();

    return () => {
      isMounted = false;
    };
  }, [fileKey]);

  /** 拡大 */
  const handleZoomIn = useCallback((): void => {
    setScale(prevScale => Math.min(prevScale * 1.2, 5));
  }, []);

  /** 縮小 */
  const handleZoomOut = useCallback((): void => {
    setScale(prevScale => Math.max(prevScale / 1.2, 0.1));
  }, []);

  /** リセット */
  const handleReset = useCallback((): void => {
    setScale(1);
  }, []);

  /**
   * ダウンロード（署名付きURLを使用）
   */
  const handleDownload = useCallback((): void => {
    if (!signedUrl) {
      console.warn('[TiffViewer] ダウンロードURLがまだ取得されていません');
      return;
    }
    const link = document.createElement('a');
    link.href = signedUrl;
    link.download = fileName;
    link.click();
    console.log('✅ [TiffViewer] TIFFファイルダウンロード開始:', fileName);
  }, [signedUrl, fileName]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ツールバー */}
      <Card 
        size="small"
        style={{ borderRadius: 0 }}
      >
        <Flex justify="space-between" align="center">
          <Space>
            <FileImageOutlined style={{ fontSize: 20, color: '#CF0027' }} />
            <Title level={5} style={{ margin: 0 }}>
              {fileName || 'TIFFファイル'}
            </Title>
          </Space>
          
          <Space>
            <Button 
              size="small"
              icon={<ZoomInOutlined />}
              onClick={handleZoomIn}
            >
              拡大
            </Button>
            <Button 
              size="small"
              icon={<ZoomOutOutlined />}
              onClick={handleZoomOut}
            >
              縮小
            </Button>
            <Button 
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleReset}
            >
              リセット
            </Button>
            <Button 
              type="primary"
              size="small"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              disabled={!signedUrl}
            >
              ダウンロード
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* コンテンツエリア */}
      <div style={{ 
        flex: 1, 
        padding: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
        background: '#f5f5f5'
      }}>
        <Space orientation="vertical" size="large" style={{ textAlign: 'center' }}>
          {urlError && (
            <Alert
              message="URLの取得に失敗しました"
              description={urlError}
              type="error"
              showIcon
            />
          )}

          <Alert
            message="TIFFファイルが選択されました"
            description={
              <Space orientation="vertical" size="small">
                <Text>{fileName}</Text>
                <Text type="secondary">
                  ブラウザでのTIFF表示には制限があります。
                </Text>
                <Text type="secondary">
                  ダウンロードボタンを使用して画像を表示することをお勧めします。
                </Text>
              </Space>
            }
            type="info"
            showIcon
          />

          <Button 
            type="primary"
            size="large"
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            disabled={!signedUrl}
          >
            TIFFファイルをダウンロード
          </Button>

          <Card size="small" style={{ marginTop: 16 }}>
            <Space orientation="vertical" size="small">
              <Text type="secondary" style={{ fontSize: 12 }}>
                ファイルキー: {fileKey}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ズーム倍率: {scale.toFixed(2)}x
              </Text>
            </Space>
          </Card>
        </Space>
      </div>
    </div>
  );
};

export default TiffViewer;
