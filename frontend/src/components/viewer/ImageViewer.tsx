// frontend/src/components/viewer/ImageViewer.tsx
// 画像ファイルビューアコンポーネント（Ant Design v6版）

'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Alert, Spin, Flex, Image as AntImage } from 'antd';
import { 
  ZoomInOutlined, 
  ZoomOutOutlined, 
  ReloadOutlined,
  FileImageOutlined,
  LoadingOutlined
} from '@ant-design/icons';

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
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ 
    width: 0, 
    height: 0 
  });

  useEffect(() => {
    if (!fileKey) return;

    // クリーンアップ関数
    const cleanup = () => {
      setImageUrl(null);
      setLoading(true);
      setError(null);
    };

    cleanup(); // 初期化

    // ✅ API呼び出しをコメントアウト - モック用
    // const timestamp = new Date().getTime();
    // const stableUrl = `/api/s3/file-binary?key=${encodeURIComponent(fileKey)}&t=${timestamp}`;
    
    // モック画像URL（実際のAPIエンドポイントはコメントアウト）
    const stableUrl = 'https://via.placeholder.com/800x600.png?text=Mock+Image';
    
    console.log('画像URL生成（モック）:', stableUrl);

    // 画像読み込み
    const img = new Image();
    
    img.onload = () => {
      console.log('画像読み込み成功:', img.width, 'x', img.height);
      setImageUrl(stableUrl);
      setImageDimensions({ width: img.width, height: img.height });
      setLoading(false);
    };
    
    img.onerror = (e) => {
      console.error('画像読み込みエラー:', e);
      setError('画像の読み込みに失敗しました。サポートされていない形式かもしれません。');
      setLoading(false);
    };
    
    img.src = stableUrl;
    console.log('画像読み込み開始:', stableUrl);

    return cleanup; // クリーンアップ関数を返す
  }, [fileKey]);

  /**
   * 拡大
   */
  const handleZoomIn = (): void => {
    setScale(prevScale => Math.min(prevScale * 1.2, 5));
  };

  /**
   * 縮小
   */
  const handleZoomOut = (): void => {
    setScale(prevScale => Math.max(prevScale / 1.2, 0.1));
  };

  /**
   * リセット
   */
  const handleReset = (): void => {
    setScale(1);
  };

  /**
   * 再読み込み
   */
  const handleReload = (): void => {
    setLoading(true);
    setError(null);
    
    // ✅ モック: 実際のAPI呼び出しはコメントアウト
    // const timestamp = new Date().getTime();
    // const reloadUrl = `/api/s3/file-binary?key=${encodeURIComponent(fileKey)}&t=${timestamp}`;
    const reloadUrl = 'https://via.placeholder.com/800x600.png?text=Reloaded+Image';
    
    const img = new Image();
    img.onload = () => {
      setImageUrl(reloadUrl);
      setImageDimensions({ width: img.width, height: img.height });
      setLoading(false);
    };
    
    img.onerror = () => {
      setError('画像の再読み込みに失敗しました');
      setLoading(false);
    };
    
    img.src = reloadUrl;
  };

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
              {fileName || '画像ファイル'}
            </Title>
          </Space>
          
          <Space>
            <Button 
              size="small"
              icon={<ZoomInOutlined />}
              onClick={handleZoomIn}
              disabled={loading || !!error}
            >
              拡大
            </Button>
            <Button 
              size="small"
              icon={<ZoomOutOutlined />}
              onClick={handleZoomOut}
              disabled={loading || !!error}
            >
              縮小
            </Button>
            <Button 
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleReset}
              disabled={loading || !!error}
            >
              リセット
            </Button>
            {error && (
              <Button 
                type="primary"
                size="small"
                icon={<ReloadOutlined />}
                onClick={handleReload}
              >
                再読み込み
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
            <Text type="secondary">画像を読み込み中...</Text>
          </Space>
        )}

        {/* エラー */}
        {error && (
          <Alert
            message="エラー"
            description={error}
            type="error"
            showIcon
            action={
              <Button size="small" onClick={handleReload}>
                再試行
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
                alt={fileName || '画像ファイル'}
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
                preview={{
                  mask: 'プレビュー'
                }}
              />
            </div>

            {/* 画像情報 */}
            <Card size="small" style={{ textAlign: 'center' }}>
              <Space orientation="vertical" size="small">
                {imageDimensions.width > 0 && (
                  <Text type="secondary">
                    サイズ: {imageDimensions.width} x {imageDimensions.height} px
                  </Text>
                )}
                <Text type="secondary">
                  ズーム倍率: {scale.toFixed(2)}x
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <strong>モックモード:</strong> API呼び出しはコメントアウトされています
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ファイルキー: {fileKey}
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
