'use client';

import React, { useState } from 'react';
import { Result, Button, Space, Card, Typography, Divider, Row, Col, theme, Modal } from 'antd';

const { Title, Paragraph, Text } = Typography;
const { useToken } = theme;

/**
 * 結果ページ表示パターンのデモコンポーネント
 * 全7パターンの結果ページを表示
 */
export default function ResultPagePatternsDemo() {
  const { token } = useToken();
  const [fullScreenPattern, setFullScreenPattern] = useState<string | null>(null);

  // 全画面表示用のハンドラ
  const showFullScreen = (pattern: string) => {
    setFullScreenPattern(pattern);
  };

  const closeFullScreen = () => {
    setFullScreenPattern(null);
  };

  // パターンごとのResult要素を返す関数
  const renderPattern = (pattern: string, isFullScreen: boolean = false) => {
    const containerStyle = isFullScreen
      ? {
          minHeight: 'calc(100vh - 112px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: token.colorBgLayout,
          padding: token.marginXXL,
        }
      : {
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: token.colorBgLayout,
          padding: token.marginXXL,
        };

    switch (pattern) {
      case 'success':
        return (
          <div style={containerStyle}>
            <Result
              status="success"
              title="登録が完了しました"
              subTitle="ユーザー情報が正常に登録されました。次の操作を選択してください。"
              extra={[
                <Button type="primary" key="next" onClick={isFullScreen ? closeFullScreen : undefined}>
                  次へ進む
                </Button>,
                <Button key="back" onClick={isFullScreen ? closeFullScreen : undefined}>
                  一覧に戻る
                </Button>,
              ]}
            />
          </div>
        );

      case 'error':
        return (
          <div style={containerStyle}>
            <Result
              status="error"
              title="登録に失敗しました"
              subTitle="エラーが発生しました。入力内容を確認の上、もう一度お試しください。"
              extra={[
                <Button type="primary" key="retry" onClick={isFullScreen ? closeFullScreen : undefined}>
                  再試行
                </Button>,
                <Button key="back" onClick={isFullScreen ? closeFullScreen : undefined}>
                  戻る
                </Button>,
              ]}
            />
          </div>
        );

      case 'warning':
        return (
          <div style={containerStyle}>
            <Result
              status="warning"
              title="一部のデータが保存されました"
              subTitle="処理は完了しましたが、一部のデータに問題があります。内容を確認してください。"
              extra={[
                <Button type="primary" key="confirm" onClick={isFullScreen ? closeFullScreen : undefined}>
                  内容を確認
                </Button>,
                <Button key="back" onClick={isFullScreen ? closeFullScreen : undefined}>
                  戻る
                </Button>,
              ]}
            />
          </div>
        );

      case 'info':
        return (
          <div style={containerStyle}>
            <Result
              status="info"
              title="メンテナンス予定のお知らせ"
              subTitle="2024年1月1日 午前2:00〜午前6:00の間、システムメンテナンスを実施いたします。"
              extra={
                <Button type="primary" key="ok" onClick={isFullScreen ? closeFullScreen : undefined}>
                  確認しました
                </Button>
              }
            />
          </div>
        );

      case '404':
        return (
          <div style={containerStyle}>
            <Result
              status="404"
              title="404"
              subTitle="お探しのページは見つかりませんでした。URLをご確認ください。"
              extra={
                <Button type="primary" key="home" onClick={isFullScreen ? closeFullScreen : undefined}>
                  ホームに戻る
                </Button>
              }
            />
          </div>
        );

      case '403':
        return (
          <div style={containerStyle}>
            <Result
              status="403"
              title="403"
              subTitle="このページへのアクセス権限がありません。管理者にお問い合わせください。"
              extra={
                <Button type="primary" key="home" onClick={isFullScreen ? closeFullScreen : undefined}>
                  ホームに戻る
                </Button>
              }
            />
          </div>
        );

      case '500':
        return (
          <div style={containerStyle}>
            <Result
              status="500"
              title="500"
              subTitle="サーバーエラーが発生しました。しばらく時間をおいてから再度お試しください。"
              extra={[
                <Button type="primary" key="retry" onClick={isFullScreen ? closeFullScreen : undefined}>
                  再試行
                </Button>,
                <Button key="home" onClick={isFullScreen ? closeFullScreen : undefined}>
                  ホームに戻る
                </Button>,
              ]}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ padding: token.marginLG }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: token.marginXL }}>
        <Title level={2}>結果ページ表示パターン</Title>
        <Paragraph>
          処理結果やエラー情報を表示するための全画面結果ページの7パターンです。
          <br />
          各パターンをクリックすると全画面表示でプレビューできます。
        </Paragraph>
      </div>

      {/* パターン1: 成功結果 */}
      <Card
        title="パターン1: 成功結果（Success）"
        style={{ marginBottom: token.marginLG }}
        extra={
          <Button type="primary" size="small" onClick={() => showFullScreen('success')}>
            全画面表示
          </Button>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Text> 処理成功後の完了画面</Text>
          </div>
          <div>
            <Text strong>特徴:</Text>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>status: "success"</li>
              <li>アイコン色: {token.colorSuccess} (緑)</li>
              <li>ボタン: プライマリ（次へ） + デフォルト（戻る）</li>
            </ul>
          </div>
          {renderPattern('success')}
        </Space>
      </Card>

      {/* パターン2: エラー結果 */}
      <Card
        title="パターン2: エラー結果（Error）"
        style={{ marginBottom: token.marginLG }}
        extra={
          <Button type="primary" size="small" onClick={() => showFullScreen('error')}>
            全画面表示
          </Button>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Text> 処理失敗後のエラー画面</Text>
          </div>
          <div>
            <Text strong>特徴:</Text>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>status: "error"</li>
              <li>アイコン色: {token.colorError} (赤)</li>
              <li>ボタン: プライマリ（再試行） + デフォルト（戻る）</li>
            </ul>
          </div>
          {renderPattern('error')}
        </Space>
      </Card>

      {/* パターン3: 警告結果 */}
      <Card
        title="パターン3: 警告結果（Warning）"
        style={{ marginBottom: token.marginLG }}
        extra={
          <Button type="primary" size="small" onClick={() => showFullScreen('warning')}>
            全画面表示
          </Button>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Text> 処理完了したが注意が必要な場合</Text>
          </div>
          <div>
            <Text strong>特徴:</Text>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>status: "warning"</li>
              <li>アイコン色: {token.colorWarning} (オレンジ)</li>
              <li>ボタン: プライマリ（確認） + デフォルト（戻る）</li>
            </ul>
          </div>
          {renderPattern('warning')}
        </Space>
      </Card>

      {/* パターン4: 情報結果 */}
      <Card
        title="パターン4: 情報結果（Info）"
        style={{ marginBottom: token.marginLG }}
        extra={
          <Button type="primary" size="small" onClick={() => showFullScreen('info')}>
            全画面表示
          </Button>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Text> 情報提供や案内画面</Text>
          </div>
          <div>
            <Text strong>特徴:</Text>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>status: "info"</li>
              <li>アイコン色: {token.colorInfo} (青)</li>
              <li>ボタン: プライマリ（次へ）のみ</li>
            </ul>
          </div>
          {renderPattern('info')}
        </Space>
      </Card>

      {/* パターン5: 404エラー */}
      <Card
        title="パターン5: 404エラーページ（Not Found）"
        style={{ marginBottom: token.marginLG }}
        extra={
          <Button type="primary" size="small" onClick={() => showFullScreen('404')}>
            全画面表示
          </Button>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Text> ページが見つからない場合</Text>
          </div>
          <div>
            <Text strong>特徴:</Text>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>status: "404"</li>
              <li>アイコン色: {token.colorTextTertiary} (グレー)</li>
              <li>ボタン: プライマリ（ホームに戻る）のみ</li>
            </ul>
          </div>
          {renderPattern('404')}
        </Space>
      </Card>

      {/* パターン6: 403アクセス拒否 */}
      <Card
        title="パターン6: 403アクセス拒否ページ（Forbidden）"
        style={{ marginBottom: token.marginLG }}
        extra={
          <Button type="primary" size="small" onClick={() => showFullScreen('403')}>
            全画面表示
          </Button>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Text> アクセス権限がない場合</Text>
          </div>
          <div>
            <Text strong>特徴:</Text>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>status: "403"</li>
              <li>アイコン色: {token.colorTextTertiary} (グレー)</li>
              <li>ボタン: プライマリ（ホームに戻る）のみ</li>
            </ul>
          </div>
          {renderPattern('403')}
        </Space>
      </Card>

      {/* パターン7: 500サーバーエラー */}
      <Card
        title="パターン7: 500サーバーエラーページ（Server Error）"
        style={{ marginBottom: token.marginLG }}
        extra={
          <Button type="primary" size="small" onClick={() => showFullScreen('500')}>
            全画面表示
          </Button>
        }
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>用途:</Text>
            <Text> サーバーエラーが発生した場合</Text>
          </div>
          <div>
            <Text strong>特徴:</Text>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>status: "500"</li>
              <li>アイコン色: {token.colorTextTertiary} (グレー)</li>
              <li>ボタン: プライマリ（再試行） + デフォルト（ホームに戻る）</li>
            </ul>
          </div>
          {renderPattern('500')}
        </Space>
      </Card>

      {/* 共通仕様 */}
      <Card title="共通仕様" style={{ marginBottom: token.marginLG }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text strong>レイアウト:</Text>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>最小高さ: calc(100vh - 112px)</li>
              <li>背景色: {token.colorBgLayout}</li>
              <li>内部パディング: {token.marginXXL}px</li>
              <li>中央揃え（水平・垂直）</li>
            </ul>
          </div>
          <Divider />
          <div>
            <Text strong>アイコン:</Text>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>サイズ: 72px × 72px</li>
              <li>マージン下: {token.marginLG}px</li>
            </ul>
          </div>
          <Divider />
          <div>
            <Text strong>タイトル:</Text>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>フォントサイズ: {token.fontSizeHeading3}px</li>
              <li>フォントウェイト: {token.fontWeightStrong}</li>
              <li>色: {token.colorText}</li>
            </ul>
          </div>
          <Divider />
          <div>
            <Text strong>サブタイトル:</Text>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>フォントサイズ: {token.fontSize}px</li>
              <li>色: {token.colorTextSecondary}</li>
              <li>最大幅: 600px</li>
            </ul>
          </div>
          <Divider />
          <div>
            <Text strong>ボタン:</Text>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>間隔: 16px (Space size="middle")</li>
              <li>順序: プライマリ（左） + デフォルト（右）</li>
              <li>1〜2個まで推奨</li>
            </ul>
          </div>
        </Space>
      </Card>

      {/* レスポンシブ対応 */}
      <Card title="レスポンシブ対応" style={{ marginBottom: token.marginLG }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card size="small" title="デスクトップ (lg以上)">
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>アイコン: 72px</li>
                <li>タイトル: 24px</li>
                <li>サブタイトル: 14px</li>
                <li>パディング: 48px</li>
              </ul>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" title="タブレット (md)">
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>アイコン: 64px</li>
                <li>タイトル: 20px</li>
                <li>サブタイトル: 14px</li>
                <li>パディング: 32px</li>
              </ul>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" title="モバイル (sm以下)">
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>アイコン: 48px</li>
                <li>タイトル: 18px</li>
                <li>サブタイトル: 14px</li>
                <li>パディング: 24px</li>
                <li>ボタン: 幅100%</li>
              </ul>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 使用ガイドライン */}
      <Card title="使用ガイドライン">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card size="small" title="DO（推奨）" style={{ borderColor: token.colorSuccess }}>
              <ul style={{ margin: 0, paddingLeft: 20, color: token.colorSuccess }}>
                <li>タイトルは簡潔に（15文字以内）</li>
                <li>サブタイトルで詳細を説明（80文字以内）</li>
                <li>アクションボタンは1〜2個まで</li>
                <li>プライマリボタンは次のアクションに使用</li>
                <li>画面中央に配置する</li>
              </ul>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card size="small" title="DON'T（非推奨）" style={{ borderColor: token.colorError }}>
              <ul style={{ margin: 0, paddingLeft: 20, color: token.colorError }}>
                <li>タイトルに長文を入れない</li>
                <li>ボタンを3個以上配置しない</li>
                <li>サブタイトルを省略しない</li>
                <li>カスタムアイコンを無理に使用しない</li>
                <li>複雑なレイアウトを追加しない</li>
              </ul>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 全画面表示用のモーダル */}
      <Modal
        open={fullScreenPattern !== null}
        onCancel={closeFullScreen}
        footer={null}
        width="100%"
        style={{ top: 0, maxWidth: '100%', paddingBottom: 0 }}
        styles={{
          body: { padding: 0, minHeight: '100vh' },
        }}
      >
        {fullScreenPattern && renderPattern(fullScreenPattern, true)}
      </Modal>
    </div>
  );
}
