// frontend/src/components/viewer/ErrorBoundary.tsx
// エラーバウンダリコンポーネント（Ant Design v6版）

'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import type { ErrorBoundaryState } from '@/types/common';
import { Alert, Button, Space, Typography, Card } from 'antd';
import { WarningOutlined, ReloadOutlined } from '@ant-design/icons';
import { getTranslation } from '@/contexts/LanguageContext';

const { Text, Paragraph } = Typography;

interface ErrorBoundaryProps {
  children: ReactNode;
}


/**
 * ErrorBoundary コンポーネント
 * 子コンポーネントのエラーをキャッチして表示
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    // エラーログ出力
    console.error('Component error:', error, errorInfo);
  }

  /**
   * エラー状態をリセット
   */
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;

      return (
        <div style={{ padding: 24 }}>
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Alert
              message={getTranslation('viewer.errorBoundary.title')}
              description={getTranslation('viewer.errorBoundary.description')}
              type="error"
              showIcon
              icon={<WarningOutlined />}
            />

            <Card 
              title={getTranslation('viewer.errorBoundary.detailsTitle')}
              size="small"
              extra={
                <Button 
                  type="primary"
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={this.handleReset}
                >
                  {getTranslation('viewer.errorBoundary.retry')}
                </Button>
              }
            >
              <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                {error && (
                  <div>
                    <Text strong>{getTranslation('viewer.errorBoundary.errorMessage')}</Text>
                    <Paragraph code copyable style={{ marginTop: 8 }}>
                      {error.toString()}
                    </Paragraph>
                  </div>
                )}
                
                {errorInfo && errorInfo.componentStack && (
                  <div>
                    <Text strong>{getTranslation('viewer.errorBoundary.componentStack')}</Text>
                    <Paragraph 
                      code 
                      copyable
                      style={{ 
                        marginTop: 8,
                        maxHeight: 300,
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {errorInfo.componentStack}
                    </Paragraph>
                  </div>
                )}
              </Space>
            </Card>
          </Space>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
