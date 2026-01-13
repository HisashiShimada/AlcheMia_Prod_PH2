'use client';

import React, { useState } from 'react';
import { Card, Space, Button, Divider, Typography, message, Input } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

/**
 * メッセージ表示パターンのデモコンポーネント
 * 
 * docs/design/ui/message_policy.mdで定義されたメッセージパターンを実装
 */
const MessagePatternsDemo: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [customDuration, setCustomDuration] = useState('3');

  // パターン1: 成功メッセージ
  const showSuccessMessage = () => {
    message.success('プロジェクトが正常に作成されました');
  };

  // パターン2: エラーメッセージ
  const showErrorMessage = () => {
    message.error('ファイルのアップロードに失敗しました');
  };

  // パターン3: 警告メッセージ
  const showWarningMessage = () => {
    message.warning('ファイルを選択してください');
  };

  // パターン4: 情報メッセージ
  const showInfoMessage = () => {
    message.info('この機能は今後実装予定です');
  };

  // パターン5: ローディングメッセージ
  const showLoadingMessage = async () => {
    const hide = message.loading('処理中...', 0);
    setLoading(true);

    // 3秒後に完了
    setTimeout(() => {
      hide();
      message.success('処理が完了しました');
      setLoading(false);
    }, 3000);
  };

  // カスタム表示時間
  const showCustomDurationMessage = () => {
    const duration = parseInt(customDuration) || 3;
    message.success(`この メッセージは${duration}秒間表示されます`, duration);
  };

  // 手動クローズ
  const showManualCloseMessage = () => {
    message.error('このメッセージは手動でクローズするまで表示されます', 0);
  };

  // 連続表示
  const showMultipleMessages = () => {
    message.success('ファイル1をアップロードしました');
    setTimeout(() => message.success('ファイル2をアップロードしました'), 500);
    setTimeout(() => message.success('ファイル3をアップロードしました'), 1000);
  };

  // 非同期処理のシミュレーション
  const simulateAsyncOperation = async () => {
    const hide = message.loading('データを保存中...', 0);

    try {
      // 2秒待機（実際のAPI呼び出しをシミュレート）
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      hide();
      message.success('データの保存が完了しました');
    } catch (error) {
      hide();
      message.error('データの保存に失敗しました');
    }
  };

  // 複数ステップ処理のシミュレーション
  const simulateBulkOperation = async () => {
    const files = ['file1.txt', 'file2.txt', 'file3.txt'];
    let successCount = 0;
    let errorCount = 0;

    const hide = message.loading(`0/${files.length} 件処理中...`, 0);

    for (const [index, file] of files.entries()) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // ランダムに成功/失敗を決定
      if (Math.random() > 0.3) {
        successCount++;
      } else {
        errorCount++;
      }

      hide();
      if (index < files.length - 1) {
        message.loading(`${index + 1}/${files.length} 件処理中...`, 0);
      }
    }

    // 結果サマリー
    if (errorCount === 0) {
      message.success(`全 ${successCount} 件の処理が完了しました`);
    } else if (successCount === 0) {
      message.error(`全 ${errorCount} 件の処理に失敗しました`);
    } else {
      message.warning(
        `${successCount} 件成功、${errorCount} 件失敗しました`,
        5
      );
    }
  };

  // グローバル設定の変更
  const updateGlobalConfig = () => {
    message.config({
      top: 50,
      duration: 2,
      maxCount: 2,
    });
    message.info('グローバル設定を変更しました（上部からの距離50px、表示時間2秒、最大2件）');
  };

  // グローバル設定をリセット
  const resetGlobalConfig = () => {
    message.config({
      top: 24,
      duration: 3,
      maxCount: 3,
    });
    message.info('グローバル設定をリセットしました');
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>メッセージ表示パターン</Title>
      <Paragraph>
        Ant Designの<Text code>message</Text>コンポーネントを使用した標準メッセージパターンのデモです。
      </Paragraph>
      <Paragraph type="secondary">
        参考: <Text code>docs/design/ui/message_policy.md</Text>
      </Paragraph>

      <Divider />

      {/* 標準4パターン */}
      <Card title="標準4パターン" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}>
              <CheckCircleOutlined style={{ color: '#2e7d32', marginRight: 8 }} />
              パターン1: 成功メッセージ（Success）
            </Title>
            <Paragraph type="secondary">
              操作が正常に完了したことを通知（3秒表示）
            </Paragraph>
            <Button type="primary" onClick={showSuccessMessage}>
              成功メッセージを表示
            </Button>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <div>
            <Title level={5}>
              <CloseCircleOutlined style={{ color: '#d32f2f', marginRight: 8 }} />
              パターン2: エラーメッセージ（Error）
            </Title>
            <Paragraph type="secondary">
              操作が失敗したことを通知（4秒表示、他より1秒長め）
            </Paragraph>
            <Button danger onClick={showErrorMessage}>
              エラーメッセージを表示
            </Button>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <div>
            <Title level={5}>
              <ExclamationCircleOutlined style={{ color: '#ed6c02', marginRight: 8 }} />
              パターン3: 警告メッセージ（Warning）
            </Title>
            <Paragraph type="secondary">
              注意が必要な状況を通知（3秒表示）
            </Paragraph>
            <Button onClick={showWarningMessage}>
              警告メッセージを表示
            </Button>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <div>
            <Title level={5}>
              <InfoCircleOutlined style={{ color: '#0093CF', marginRight: 8 }} />
              パターン4: 情報メッセージ（Info）
            </Title>
            <Paragraph type="secondary">
              一般的な情報や状態を通知（3秒表示）
            </Paragraph>
            <Button onClick={showInfoMessage}>
              情報メッセージを表示
            </Button>
          </div>
        </Space>
      </Card>

      {/* ローディングメッセージ */}
      <Card title="パターン5: ローディングメッセージ（Loading）" style={{ marginBottom: 24 }}>
        <Title level={5}>
          <LoadingOutlined style={{ color: '#CF0027', marginRight: 8 }} />
          処理中の通知
        </Title>
        <Paragraph type="secondary">
          非同期処理中であることを通知（手動クローズのみ）
        </Paragraph>
        <Button onClick={showLoadingMessage} loading={loading} disabled={loading}>
          ローディングメッセージを表示（3秒後に完了）
        </Button>
      </Card>

      {/* カスタム表示時間 */}
      <Card title="カスタム表示時間" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Title level={5}>表示時間の調整</Title>
            <Paragraph type="secondary">
              メッセージの長さに応じて表示時間を調整できます
            </Paragraph>
            <Space>
              <Input
                type="number"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                style={{ width: 100 }}
                addonAfter="秒"
                min={1}
                max={10}
              />
              <Button onClick={showCustomDurationMessage}>
                カスタム時間で表示
              </Button>
            </Space>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <div>
            <Title level={5}>手動クローズ</Title>
            <Paragraph type="secondary">
              duration: 0 を指定すると、ユーザーが手動でクローズするまで表示されます
            </Paragraph>
            <Button onClick={showManualCloseMessage}>
              手動クローズメッセージを表示
            </Button>
          </div>
        </Space>
      </Card>

      {/* 連続表示 */}
      <Card title="メッセージの連続表示" style={{ marginBottom: 24 }}>
        <Title level={5}>複数メッセージの表示</Title>
        <Paragraph type="secondary">
          複数のメッセージを連続して表示すると、縦に積み重なります（最大3件まで）
        </Paragraph>
        <Button onClick={showMultipleMessages}>
          3件のメッセージを連続表示
        </Button>
      </Card>

      {/* 非同期処理 */}
      <Card title="非同期処理のフィードバック" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Title level={5}>シンプルな非同期処理</Title>
            <Paragraph type="secondary">
              ローディング → 成功/失敗 の基本パターン
            </Paragraph>
            <Button onClick={simulateAsyncOperation}>
              非同期処理を実行
            </Button>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          <div>
            <Title level={5}>複数ステップの処理</Title>
            <Paragraph type="secondary">
              複数のファイルを順次処理し、プログレスを更新します
            </Paragraph>
            <Button onClick={simulateBulkOperation}>
              一括処理を実行（3件のファイル）
            </Button>
          </div>
        </Space>
      </Card>

      {/* グローバル設定 */}
      <Card title="グローバル設定" style={{ marginBottom: 24 }}>
        <Title level={5}>アプリケーション全体の設定</Title>
        <Paragraph type="secondary">
          message.config() でグローバル設定を変更できます
        </Paragraph>
        <Space>
          <Button onClick={updateGlobalConfig}>
            グローバル設定を変更
          </Button>
          <Button onClick={resetGlobalConfig}>
            設定をリセット
          </Button>
        </Space>
      </Card>

      {/* 使用例 */}
      <Card title="実装コード例" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Title level={5}>基本的な使用</Title>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '16px', 
              borderRadius: '8px',
              overflow: 'auto'
            }}>
{`import { message } from 'antd';

// 成功
message.success('保存しました');

// エラー
message.error('保存に失敗しました');

// 警告
message.warning('ファイルを選択してください');

// 情報
message.info('この機能は今後実装予定です');

// ローディング
const hide = message.loading('処理中...', 0);
// 処理完了後
hide();`}
            </pre>
          </div>

          <div>
            <Title level={5}>非同期処理での使用</Title>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '16px', 
              borderRadius: '8px',
              overflow: 'auto'
            }}>
{`const handleSave = async () => {
  const hide = message.loading('保存中...', 0);
  
  try {
    await saveData();
    hide();
    message.success('保存が完了しました');
  } catch (error) {
    hide();
    message.error('保存に失敗しました');
  }
};`}
            </pre>
          </div>
        </Space>
      </Card>

      {/* ベストプラクティス */}
      <Card title="ベストプラクティス" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Title level={5} style={{ color: '#2e7d32' }}>✅ DO（推奨）</Title>
            <ul>
              <li>明確で具体的なメッセージを使用する</li>
              <li>操作の結果を即座にフィードバックする</li>
              <li>エラーには対処方法を含める</li>
              <li>長いメッセージは表示時間を延ばす</li>
              <li>重要な情報は手動クローズにする</li>
              <li>国際化対応のためにi18nを使用する</li>
              <li>ローディングメッセージは必ず手動でクローズする</li>
            </ul>
          </div>

          <div>
            <Title level={5} style={{ color: '#d32f2f' }}>❌ DON&apos;T（非推奨）</Title>
            <ul>
              <li>「成功」「エラー」だけの曖昧なメッセージ</li>
              <li>同時に5件以上のメッセージを表示する</li>
              <li>重要でない情報に長い表示時間を設定する</li>
              <li>ローディングメッセージをクローズし忘れる</li>
              <li>メッセージ内にHTMLを直接埋め込む</li>
              <li>エラー情報をそのまま表示する（技術的な詳細は隠す）</li>
              <li>毎回の操作にメッセージを表示する（うるさくなる）</li>
            </ul>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default MessagePatternsDemo;
