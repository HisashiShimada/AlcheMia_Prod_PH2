'use client';

import React, { useState } from 'react';
import { Alert, Button, Card, Space, Divider, Input, message, notification } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

const AlertNotificationPatternsDemo: React.FC = () => {
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // Message handlers
  const showSuccessMessage = () => {
    message.success('保存しました');
  };

  const showErrorMessage = () => {
    message.error('保存に失敗しました');
  };

  const showWarningMessage = () => {
    message.warning('ファイルを選択してください');
  };

  const showInfoMessage = () => {
    message.info('この機能は今後実装予定です');
  };

  const showLoadingMessage = () => {
    const hide = message.loading('保存中...', 0);
    setTimeout(() => {
      hide();
      message.success('保存が完了しました');
    }, 2000);
  };

  // Notification handlers
  const showSuccessNotification = () => {
    notification.success({
      message: 'アップロード完了',
      description: '3件のファイルが正常にアップロードされました。プロジェクト一覧から確認できます。',
      placement: 'topRight',
      duration: 4.5,
    });
  };

  const showErrorNotification = () => {
    notification.error({
      message: 'アップロードエラー',
      description: 'ファイルサイズが10MBを超えています。ファイルを分割してアップロードしてください。',
      placement: 'topRight',
      duration: 0,
      btn: (
        <Button type="primary" size="small" onClick={() => notification.destroy()}>
          OK
        </Button>
      ),
    });
  };

  const showWarningNotification = () => {
    notification.warning({
      message: 'セッション警告',
      description: 'セッションの有効期限が5分後に切れます。作業中のデータを保存してください。',
      placement: 'topRight',
      duration: 10,
    });
  };

  const showInfoNotification = () => {
    notification.info({
      message: '新機能のお知らせ',
      description: 'プロジェクト一括エクスポート機能が追加されました。詳細はヘルプページをご覧ください。',
      placement: 'topRight',
      duration: 6,
      btn: (
        <Button type="link" size="small" onClick={() => notification.destroy()}>
          詳細を見る
        </Button>
      ),
    });
  };

  // Form validation simulation
  const validateForm = () => {
    const errors = [
      'ユーザー名は必須項目です',
      'パスワードは8文字以上である必要があります',
      'メールアドレスの形式が正しくありません',
    ];
    setFormErrors(errors);
  };

  const clearFormErrors = () => {
    setFormErrors([]);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* ヘッダー */}
        <div>
          <h1 style={{ marginBottom: '8px' }}>警告・情報表示パターン</h1>
          <p style={{ color: '#757575', marginBottom: 0 }}>
            Alert、Message、Notificationの標準パターンと使い分けを確認できます
          </p>
        </div>

        <Divider />

        {/* 1. Alert（インライン通知） */}
        <section>
          <h2>1. Alert（インライン通知）</h2>
          <p style={{ color: '#757575', marginBottom: '16px' }}>
            ページ内に固定的に表示される警告・情報。常に表示が必要な情報に使用。
          </p>

          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* パターン1-1: 成功アラート */}
            <Card title="パターン1-1: 成功アラート（Success）" size="small">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Alert
                  type="success"
                  message="プロジェクトが正常に作成されました"
                  showIcon
                />
                <Alert
                  type="success"
                  message="データの保存が完了しました"
                  description="すべての変更が正常に保存されました。プロジェクト一覧から確認できます。"
                  showIcon
                  closable
                />
              </Space>
            </Card>

            {/* パターン1-2: エラーアラート */}
            <Card title="パターン1-2: エラーアラート（Error）" size="small">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Alert
                  type="error"
                  message="エラーが発生しました"
                  showIcon
                />
                <Alert
                  type="error"
                  message="エラーが発生しました"
                  description="ファイルのアップロードに失敗しました。ファイルサイズを確認してください。"
                  showIcon
                  closable
                />
              </Space>
            </Card>

            {/* パターン1-3: 警告アラート */}
            <Card title="パターン1-3: 警告アラート（Warning）" size="small">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Alert
                  type="warning"
                  message="注意"
                  showIcon
                />
                <Alert
                  type="warning"
                  message="注意"
                  description="この操作は元に戻せません。続行する前に確認してください。"
                  showIcon
                  closable
                />
              </Space>
            </Card>

            {/* パターン1-4: 情報アラート */}
            <Card title="パターン1-4: 情報アラート（Info）" size="small">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Alert
                  type="info"
                  message="お知らせ"
                  showIcon
                />
                <Alert
                  type="info"
                  message="お知らせ"
                  description="新機能が追加されました。詳細はヘルプページをご覧ください。"
                  showIcon
                  closable
                />
              </Space>
            </Card>
          </Space>
        </section>

        <Divider />

        {/* 2. Alert配置パターン */}
        <section>
          <h2>2. Alert配置パターン</h2>
          <p style={{ color: '#757575', marginBottom: '16px' }}>
            実際の使用シーンでのAlert配置例
          </p>

          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* ページ上部（全幅） */}
            <Card title="パターン2-1: ページ上部（全幅）" size="small">
              <Alert
                type="warning"
                message="メンテナンスのお知らせ"
                description="2024年12月26日 22:00-24:00の間、システムメンテナンスを実施します。"
                showIcon
                closable
                style={{ marginBottom: 16 }}
              />
              <p style={{ color: '#757575' }}>↑ ページコンテンツの前に配置</p>
            </Card>

            {/* フォーム内（検証エラー） */}
            <Card title="パターン2-2: フォーム内（検証エラー）" size="small">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Space>
                  <Button onClick={validateForm}>
                    フォーム検証エラーを表示
                  </Button>
                  <Button onClick={clearFormErrors}>
                    エラーをクリア
                  </Button>
                </Space>

                {formErrors.length > 0 && (
                  <Alert
                    type="error"
                    message="入力内容を確認してください"
                    description={
                      <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                        {formErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    }
                    showIcon
                    closable
                    onClose={clearFormErrors}
                  />
                )}

                <Input placeholder="ユーザー名" />
                <Input.Password placeholder="パスワード" />
                <Input placeholder="メールアドレス" />
              </Space>
            </Card>

            {/* カード内（セクション警告） */}
            <Card title="パターン2-3: カード内（セクション警告）" size="small">
              <Card title="プロジェクト設定" size="small">
                <Alert
                  type="info"
                  message="この設定は後から変更できません"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Input placeholder="プロジェクト名" />
                  <Input placeholder="説明" />
                </Space>
              </Card>
            </Card>
          </Space>
        </section>

        <Divider />

        {/* 3. Message（軽量通知） */}
        <section>
          <h2>3. Message（軽量通知）</h2>
          <p style={{ color: '#757575', marginBottom: '16px' }}>
            画面上部中央に表示される軽量な通知。操作の即時フィードバックに使用。
          </p>

          <Card>
            <Space wrap size="middle">
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={showSuccessMessage}
              >
                Success Message
              </Button>

              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={showErrorMessage}
              >
                Error Message
              </Button>

              <Button
                style={{ 
                  color: '#ed6c02', 
                  borderColor: '#ed6c02',
                }}
                icon={<ExclamationCircleOutlined />}
                onClick={showWarningMessage}
              >
                Warning Message
              </Button>

              <Button
                style={{ 
                  color: '#0093CF', 
                  borderColor: '#0093CF',
                }}
                icon={<InfoCircleOutlined />}
                onClick={showInfoMessage}
              >
                Info Message
              </Button>

              <Button
                onClick={showLoadingMessage}
              >
                Loading Message
              </Button>
            </Space>

            <Divider />

            <div style={{ 
              padding: '16px',
              background: '#f5f5f5',
              borderRadius: '8px',
            }}>
              <h4 style={{ marginTop: 0 }}>特徴：</h4>
              <ul style={{ marginBottom: 0 }}>
                <li>画面上部中央に表示</li>
                <li>1-2行の簡潔なテキスト</li>
                <li>自動的に消える（3-4秒）</li>
                <li>軽量でユーザーの邪魔にならない</li>
              </ul>
            </div>
          </Card>
        </section>

        <Divider />

        {/* 4. Notification（リッチ通知） */}
        <section>
          <h2>4. Notification（リッチ通知）</h2>
          <p style={{ color: '#757575', marginBottom: '16px' }}>
            画面右上に表示されるリッチな通知。詳細な情報やアクションボタンが必要な場合に使用。
          </p>

          <Card>
            <Space wrap size="middle">
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={showSuccessNotification}
              >
                Success Notification
              </Button>

              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={showErrorNotification}
              >
                Error Notification
              </Button>

              <Button
                style={{ 
                  color: '#ed6c02', 
                  borderColor: '#ed6c02',
                }}
                icon={<ExclamationCircleOutlined />}
                onClick={showWarningNotification}
              >
                Warning Notification
              </Button>

              <Button
                style={{ 
                  color: '#0093CF', 
                  borderColor: '#0093CF',
                }}
                icon={<InfoCircleOutlined />}
                onClick={showInfoNotification}
              >
                Info Notification
              </Button>
            </Space>

            <Divider />

            <div style={{ 
              padding: '16px',
              background: '#f5f5f5',
              borderRadius: '8px',
            }}>
              <h4 style={{ marginTop: 0 }}>特徴：</h4>
              <ul style={{ marginBottom: 0 }}>
                <li>画面右上に表示</li>
                <li>タイトル + 説明文 + ボタン</li>
                <li>リッチなコンテンツ表示可能</li>
                <li>アクションボタンを含められる</li>
              </ul>
            </div>
          </Card>
        </section>

        <Divider />

        {/* 5. 使い分けガイド */}
        <section>
          <h2>5. 使い分けガイド</h2>
          
          <Card>
            <table style={{ 
              width: '100%',
              borderCollapse: 'collapse',
            }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>項目</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Alert</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Message</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Notification</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px' }}><strong>表示位置</strong></td>
                  <td style={{ padding: '12px' }}>ページ内（インライン）</td>
                  <td style={{ padding: '12px' }}>画面上部中央</td>
                  <td style={{ padding: '12px' }}>画面右上</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px' }}><strong>表示時間</strong></td>
                  <td style={{ padding: '12px' }}>常に表示</td>
                  <td style={{ padding: '12px' }}>3-4秒（自動消去）</td>
                  <td style={{ padding: '12px' }}>4.5秒または手動</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px' }}><strong>用途</strong></td>
                  <td style={{ padding: '12px' }}>固定的な警告・情報</td>
                  <td style={{ padding: '12px' }}>操作の即時フィードバック</td>
                  <td style={{ padding: '12px' }}>詳細な通知</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px' }}><strong>テキスト量</strong></td>
                  <td style={{ padding: '12px' }}>1-5行</td>
                  <td style={{ padding: '12px' }}>1-2行</td>
                  <td style={{ padding: '12px' }}>2-10行</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px' }}><strong>アクションボタン</strong></td>
                  <td style={{ padding: '12px' }}>可能</td>
                  <td style={{ padding: '12px' }}>不可</td>
                  <td style={{ padding: '12px' }}>可能</td>
                </tr>
                <tr>
                  <td style={{ padding: '12px' }}><strong>推奨シーン</strong></td>
                  <td style={{ padding: '12px' }}>
                    ページ上部の注意書き<br />
                    フォームエラー
                  </td>
                  <td style={{ padding: '12px' }}>
                    データ保存成功<br />
                    簡単な失敗通知
                  </td>
                  <td style={{ padding: '12px' }}>
                    重要なお知らせ<br />
                    エラー詳細<br />
                    アクション付き通知
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
        </section>

        <Divider />

        {/* 選択ルール */}
        <section>
          <h2>6. 選択の基本ルール</h2>
          
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Card
              style={{ 
                background: '#E8F5E9',
                borderColor: '#2e7d32',
              }}
            >
              <h3 style={{ marginTop: 0, color: '#2e7d32' }}>
                ✓ 常に表示が必要 → Alert
              </h3>
              <p style={{ marginBottom: 0 }}>
                ページ上部の注意書き、フォームバリデーションエラー、セクション警告など
              </p>
            </Card>

            <Card
              style={{ 
                background: '#E6F7FC',
                borderColor: '#0093CF',
              }}
            >
              <h3 style={{ marginTop: 0, color: '#0093CF' }}>
                ✓ 軽量なフィードバック → Message
              </h3>
              <p style={{ marginBottom: 0 }}>
                データ保存成功、簡単なエラー通知、処理中の表示など
              </p>
            </Card>

            <Card
              style={{ 
                background: '#FFF4E5',
                borderColor: '#ed6c02',
              }}
            >
              <h3 style={{ marginTop: 0, color: '#ed6c02' }}>
                ✓ 詳細な通知 or アクションボタン → Notification
              </h3>
              <p style={{ marginBottom: 0 }}>
                複数行の説明が必要、再試行ボタンなどのアクションが必要、重要なお知らせなど
              </p>
            </Card>
          </Space>
        </section>
      </Space>
    </div>
  );
};

export default AlertNotificationPatternsDemo;
