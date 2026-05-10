// frontend/src/components/viewer/ImageViewer.tsx
// 画像ファイルビューアコンポーネント（Ant Design v6版）

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Space, Typography, Alert, Spin, Flex, Image as AntImage } from 'antd';
import { 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  ReloadOutlined,
  FileImageOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { getFileViewUrl } from '@/services/fileAccessService';

const { Title, Text } = Typography;

interface ImageViewerProps {
  fileKey: string;
  fileName: string;
}

/**
 * ImageViewer コンポーネント
 * 画像ファイルの表示・拡大縮小機能
 */
const ImageViewer: React.FC<ImageViewerProps> = ({ fileKey, fileName }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ 
    width: 0, 
    height: 0 
  });

  useEffect(() => {
    if (!fileKey) return;

    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setImageUrl(null);

      try {
        console.log('🔍 [ImageViewer] Fetching signed URL:', fileKey);
        const url = await getFileViewUrl(fileKey);
        if (!isMounted) return;

        // 画像読み込み確認
        const img = new Image();
        img.onload = () => {
          if (!isMounted) return;
          console.log('✅ [ImageViewer] Image loaded:', img.width, 'x', img.height);
          setImageUrl(url);
          setImageDimensions({ width: img.width, height: img.height });
          setLoading(false);
        };
        img.onerror = (e) => {
          if (!isMounted) return;
          console.error('❌ [ImageViewer] Image load error:', e);
          setError('Failed to load image. The format may not be supported.');
          setLoading(false);
        };
        img.src = url;
      } catch (err) {
        if (!isMounted) return;
        console.error('❌ [ImageViewer] URL fetch error:', err);
        setError(`Failed to fetch image URL: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [fileKey, reloadTrigger]);

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

  /** 再読み込み */
  const handleReload = useCallback((): void => {
    setReloadTrigger(prev => prev + 1);
  }, []);

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
              {fileName || 'Image File'}
            </Title>
          </Space>
          
          <Space>
            <Button 
              size="small"
              icon={<ZoomInOutlined />}
              onClick={handleZoomIn}
              disabled={loading || !!error}
            >
              Zoom In
            </Button>
            <Button 
              size="small"
              icon={<ZoomOutOutlined />}
              onClick={handleZoomOut}
              disabled={loading || !!error}
            >
              Zoom Out
            </Button>
            <Button 
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleReset}
              disabled={loading || !!error}
            >
              Reset
            </Button>
            {error && (
              <Button 
                type="primary"
                size="small"
                icon={<ReloadOutlined />}
                onClick={handleReload}
              >
                Reload
              </Button>
            )}
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
        {/* ローディング */}
        {loading && (
          <Space orientation="vertical" size="large" align="center">
            <Spin 
              indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
              size="large"
            />
            <Text type="secondary">Loading image...</Text>
          </Space>
        )}

        {/* エラー */}
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={handleReload}>
                Retry
              </Button>
            }
          />
        )}

        {/* 画像表示 */}
        {imageUrl && !loading && !error && (
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 400
            }}>
              <AntImage
                src={imageUrl}
                alt={fileName || 'Image File'}
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
                preview={{
                  mask: 'Preview'
                }}
              />
            </div>

            {/* 画像情報 */}
            <Card size="small" style={{ textAlign: 'center' }}>
              <Space orientation="vertical" size="small">
                {imageDimensions.width > 0 && (
                  <Text type="secondary">
                    Size: {imageDimensions.width} x {imageDimensions.height} px
                  </Text>
                )}
                <Text type="secondary">
                  Zoom: {scale.toFixed(2)}x
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  File Key: {fileKey}
                </Text>
              </Space>
            </Card>
          </Space>
        )}
      </div>
    </div>
  );
};

export default ImageViewer;
