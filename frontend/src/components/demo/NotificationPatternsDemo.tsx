'use client';

import React, { useState } from 'react';
import { Card, Button, Space, notification, Progress, Typography, Divider, Row, Col } from 'antd';
import {
  CheckCircleOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  UploadOutlined,
  DownloadOutlined,
  BellOutlined,
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

type NotificationPlacement = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

const NotificationPatternsDemo: React.FC = () => {
  const [api, contextHolder] = notification.useNotification();
  const [progress, setProgress] = useState(0);

  // パターン1: 成功通知（Success）
  const openSuccessNotification = (placement: NotificationPlacement = 'topRight') => {
    api.success({
      message: '保存完了',
      description: 'データが正常に保存されました。変更内容はすぐに反映されます。',
      placement,
      duration: 4.5,
    });
  };

  // パターン2: 情報通知（Info）
  const openInfoNotification = (placement: NotificationPlacement = 'topRight') => {
    api.info({
      message: '新機能のお知らせ',
      description: 'バージョン2.0.0がリリースされました。新しいPetri Net編集機能が追加されています。',
      placement,
      duration: 4.5,
    });
  };

  // パターン3: 警告通知（Warning）
  const openWarningNotification = (placement: NotificationPlacement = 'topRight') => {
    api.warning({
      message: 'ディスク容量不足',
      description: 'ストレージの空き容量が10%を下回っています。不要なファイルを削除することをお勧めします。',
      placement,
      duration: 6,
    });
  };

  // パターン4: エラー通知（Error）
  const openErrorNotification = (placement: NotificationPlacement = 'topRight') => {
    api.error({
      message: 'データの保存に失敗しました',
      description: 'ネットワークエラーが発生しました。インターネット接続を確認して、もう一度お試しください。',
      placement,
      duration: 0, // 手動で閉じる
    });
  };

  // アクションボタンパターンA: 1つのアクションボタン
  const openNotificationWithAction = () => {
    api.info({
      message: '新しいバージョンが利用可能です',
      description: 'バージョン2.1.0にアップデートできます。新機能とバグ修正が含まれています。',
      btn: (
        <Button
          type="primary"
          size="small"
          onClick={() => {
            console.log('アップデート開始');
            notification.destroy();
          }}
        >
          今すぐ更新
        </Button>
      ),
      duration: 0,
    });
  };

  // アクションボタンパターンB: 複数のアクションボタン
  const openNotificationWithMultipleActions = () => {
    api.warning({
      message: 'セッションがまもなく終了します',
      description: 'あと5分でセッションが切れます。作業を保存して継続するか、ログアウトしてください。',
      btn: (
        <Space>
          <Button
            size="small"
            onClick={() => {
              console.log('ログアウト');
              notification.destroy();
            }}
          >
            ログアウト
          </Button>
          <Button
            type="primary"
            size="small"
            onClick={() => {
              console.log('セッション延長');
              notification.destroy();
              api.success({
                message: 'セッションを延長しました',
                description: 'さらに30分間作業を続けることができます。',
                duration: 3,
              });
            }}
          >
            継続する
          </Button>
        </Space>
      ),
      duration: 0,
    });
  };

  // カスタムアイコン通知
  const openCustomIconNotification = () => {
    api.open({
      message: 'ダウンロード準備完了',
      description: 'エクスポートしたファイルをダウンロードできます。',
      icon: <DownloadOutlined style={{ color: '#0093CF' }} />,
      duration: 4.5,
    });
  };

  // プログレス付き通知
  const openProgressNotification = () => {
    const key = 'upload-progress';
    let currentProgress = 0;

    // 初期通知
    api.open({
      key,
      message: 'ファイルをアップロード中',
      description: (
        <div>
          <Progress percent={0} status="active" />
          <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
            大きなファイルの場合、時間がかかることがあります
          </Text>
        </div>
      ),
      icon: <UploadOutlined style={{ color: '#0093CF' }} />,
      duration: 0,
    });

    // プログレス更新シミュレーション
    const timer = setInterval(() => {
      currentProgress += 10;
      setProgress(currentProgress);

      if (currentProgress < 100) {
        api.open({
          key,
          message: 'ファイルをアップロード中',
          description: (
            <div>
              <Progress percent={currentProgress} status="active" />
              <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
                残り {Math.ceil((100 - currentProgress) / 10)} 秒
              </Text>
            </div>
          ),
          icon: <UploadOutlined style={{ color: '#0093CF' }} />,
          duration: 0,
        });
      } else {
        clearInterval(timer);
        api.success({
          key,
          message: 'アップロード完了',
          description: 'ファイルが正常にアップロードされました。',
          duration: 3,
        });
        setProgress(0);
      }
    }, 500);
  };

  // 複数通知を一度に表示
  const openMultipleNotifications = () => {
    api.success({
      message: '処理1が完了しました',
      description: 'データの検証が完了しました。',
      duration: 4.5,
      placement: 'topRight',
    });

    setTimeout(() => {
      api.info({
        message: '処理2を開始しました',
        description: 'データのインポートを開始しています。',
        duration: 4.5,
        placement: 'topRight',
      });
    }, 500);

    setTimeout(() => {
      api.warning({
        message: '注意が必要です',
        description: '一部のデータに不整合が検出されました。',
        duration: 6,
        placement: 'topRight',
      });
    }, 1000);
  };

  // 位置別表示
  const openNotificationAtPosition = (placement: NotificationPlacement) => {
    api.info({
      message: `通知の位置: ${placement}`,
      description: `この通知は${placement}に表示されています。`,
      placement,
      duration: 3,
    });
  };

  return (
    <div style={{ padding: '24px' }}>
      {contextHolder}
      
      <Title level={2}>通知メッセージ（Notification）パターン</Title>
      <Paragraph>
        Notificationコンポーネントの標準4パターンと応用例を紹介します。
      </Paragraph>

      <Divider orientation="left" orientationMargin={0}>標準4パターン</Divider>
      
      {/* パターン1: 成功通知 */}
      <Card title="パターン1: 成功通知（Success）" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Paragraph>操作成功・完了の通知</Paragraph>
            <Text strong>仕様:</Text>
            <ul>
              <li>アイコン: CheckCircleOutlined</li>
              <li>アイコン色: #2e7d32（緑）</li>
              <li>自動消去: 4.5秒</li>
              <li>使用例: データ保存完了、ファイルアップロード完了</li>
            </ul>
          </div>
          <Space wrap>
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => openSuccessNotification()}>
              成功通知を表示
            </Button>
            <Button onClick={() => openSuccessNotification('bottomRight')}>
              右下に表示
            </Button>
          </Space>
        </Space>
      </Card>

      {/* パターン2: 情報通知 */}
      <Card title="パターン2: 情報通知（Info）" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Paragraph>システムからの情報提供</Paragraph>
            <Text strong>仕様:</Text>
            <ul>
              <li>アイコン: InfoCircleOutlined</li>
              <li>アイコン色: #0093CF（青）</li>
              <li>自動消去: 4.5秒</li>
              <li>使用例: 新機能お知らせ、メンテナンス予定、ヒント</li>
            </ul>
          </div>
          <Space wrap>
            <Button type="primary" icon={<InfoCircleOutlined />} onClick={() => openInfoNotification()}>
              情報通知を表示
            </Button>
            <Button onClick={() => openInfoNotification('bottomRight')}>
              右下に表示
            </Button>
          </Space>
        </Space>
      </Card>

      {/* パターン3: 警告通知 */}
      <Card title="パターン3: 警告通知（Warning）" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Paragraph>注意が必要な状況の通知</Paragraph>
            <Text strong>仕様:</Text>
            <ul>
              <li>アイコン: ExclamationCircleOutlined</li>
              <li>アイコン色: #ed6c02（オレンジ）</li>
              <li>自動消去: 6秒（やや長め）</li>
              <li>使用例: ディスク容量不足、セッションタイムアウト警告</li>
            </ul>
          </div>
          <Space wrap>
            <Button type="primary" icon={<ExclamationCircleOutlined />} onClick={() => openWarningNotification()}>
              警告通知を表示
            </Button>
            <Button onClick={() => openWarningNotification('bottomRight')}>
              右下に表示
            </Button>
          </Space>
        </Space>
      </Card>

      {/* パターン4: エラー通知 */}
      <Card title="パターン4: エラー通知（Error）" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Paragraph>エラー・失敗の通知</Paragraph>
            <Text strong>仕様:</Text>
            <ul>
              <li>アイコン: CloseCircleOutlined</li>
              <li>アイコン色: #d32f2f（赤）</li>
              <li>自動消去: なし（手動で閉じる必須）</li>
              <li>使用例: API通信エラー、バリデーションエラー</li>
            </ul>
          </div>
          <Space wrap>
            <Button danger type="primary" icon={<CloseCircleOutlined />} onClick={() => openErrorNotification()}>
              エラー通知を表示
            </Button>
            <Button onClick={() => openErrorNotification('bottomRight')}>
              右下に表示
            </Button>
          </Space>
        </Space>
      </Card>

      <Divider orientation="left" orientationMargin={0}>アクションボタンパターン</Divider>

      {/* 1つのアクションボタン */}
      <Card title="1つのアクションボタン" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Paragraph>1つの明確なアクションがある場合</Paragraph>
            <Text strong>使用例:</Text>
            <ul>
              <li>バージョンアップデート通知 → 「今すぐ更新」ボタン</li>
              <li>ダウンロード完了通知 → 「開く」ボタン</li>
            </ul>
          </div>
          <Button type="primary" onClick={openNotificationWithAction}>
            アクションボタン付き通知
          </Button>
        </Space>
      </Card>

      {/* 複数のアクションボタン */}
      <Card title="複数のアクションボタン" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Paragraph>複数の選択肢を提供する場合</Paragraph>
            <Text strong>使用例:</Text>
            <ul>
              <li>セッションタイムアウト警告 → 「ログアウト」「継続する」</li>
              <li>変更の保存確認 → 「破棄」「保存」</li>
            </ul>
          </div>
          <Button type="primary" onClick={openNotificationWithMultipleActions}>
            複数アクション通知
          </Button>
        </Space>
      </Card>

      <Divider orientation="left" orientationMargin={0}>特殊パターン</Divider>

      {/* カスタムアイコン */}
      <Card title="カスタムアイコン通知" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Paragraph>標準アイコン以外を使用したい場合</Paragraph>
            <Text strong>使用例:</Text>
            <ul>
              <li>ダウンロード通知: DownloadOutlined</li>
              <li>アップロード通知: UploadOutlined</li>
              <li>お知らせ通知: BellOutlined</li>
            </ul>
          </div>
          <Button icon={<DownloadOutlined />} onClick={openCustomIconNotification}>
            カスタムアイコン通知
          </Button>
        </Space>
      </Card>

      {/* プログレス付き通知 */}
      <Card title="プログレス付き通知" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Paragraph>長時間処理の進捗を表示する場合</Paragraph>
            <Text strong>使用例:</Text>
            <ul>
              <li>ファイルアップロード</li>
              <li>データエクスポート</li>
              <li>バッチ処理</li>
            </ul>
          </div>
          <Button icon={<UploadOutlined />} onClick={openProgressNotification}>
            プログレス通知（アップロードシミュレーション）
          </Button>
        </Space>
      </Card>

      {/* 複数通知 */}
      <Card title="複数通知の表示" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Paragraph>複数の処理状況を同時に通知する場合</Paragraph>
            <Text strong>仕様:</Text>
            <ul>
              <li>最大3つまで同時表示（推奨）</li>
              <li>新しい通知が上に表示される</li>
              <li>16pxの間隔で積み重なる</li>
            </ul>
          </div>
          <Button onClick={openMultipleNotifications}>
            複数通知を表示（3つ）
          </Button>
        </Space>
      </Card>

      <Divider orientation="left" orientationMargin={0}>表示位置パターン</Divider>

      <Card title="4つの表示位置" style={{ marginBottom: 16 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>位置オプション:</Text>
            <ul>
              <li><strong>topRight（デフォルト）:</strong> 一般的な通知</li>
              <li><strong>bottomRight:</strong> プログレス通知、ダウンロード完了</li>
              <li><strong>topLeft:</strong> 特殊なケース</li>
              <li><strong>bottomLeft:</strong> 特殊なケース</li>
            </ul>
          </div>
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Button block onClick={() => openNotificationAtPosition('topLeft')}>
                左上に表示
              </Button>
            </Col>
            <Col span={12}>
              <Button block onClick={() => openNotificationAtPosition('topRight')}>
                右上に表示（デフォルト）
              </Button>
            </Col>
            <Col span={12}>
              <Button block onClick={() => openNotificationAtPosition('bottomLeft')}>
                左下に表示
              </Button>
            </Col>
            <Col span={12}>
              <Button block onClick={() => openNotificationAtPosition('bottomRight')}>
                右下に表示
              </Button>
            </Col>
          </Row>
        </Space>
      </Card>

      <Divider orientation="left" orientationMargin={0}>使用ガイドライン</Divider>

      <Card title="Message vs Notification の使い分け">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>Message（軽量通知）を使用する場合:</Text>
            <ul>
              <li>3秒以内の短時間表示</li>
              <li>テキストのみのシンプルな通知</li>
              <li>操作結果の簡単なフィードバック</li>
              <li>画面中央上部に表示</li>
            </ul>
          </div>
          <div>
            <Text strong>Notification（リッチ通知）を使用する場合:</Text>
            <ul>
              <li>詳細な説明が必要</li>
              <li>アクションボタンが必要</li>
              <li>4.5秒以上の長時間表示</li>
              <li>画面右上/右下に表示</li>
              <li>タイトルと本文が必要</li>
            </ul>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default NotificationPatternsDemo;
