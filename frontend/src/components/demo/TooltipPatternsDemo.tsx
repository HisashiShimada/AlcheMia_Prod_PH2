'use client';

import React from 'react';
import { 
  Card, 
  Space, 
  Typography, 
  Tooltip, 
  Button, 
  Badge, 
  Tag, 
  Divider,
  Row,
  Col,
  Table,
  Avatar,
  theme
} from 'antd';
import {
  QuestionCircleOutlined,
  InfoCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  CopyOutlined,
  ShareAltOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  UserOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { useToken } = theme;

export default function TooltipPatternsDemo() {
  const { token } = useToken();

  // サンプルデータ
  const longText = 'これは非常に長いテキストで、画面に表示しきれない場合に省略されます。ツールチップをホバーすることで全文を確認できます。このような長いテキストは、テーブルのセル内やカード内での表示に適しています。';
  const veryLongText = 'サンプルプロジェクト名_非常に長いプロジェクト名_材料科学実験_データ分析_2024年度_第1四半期_最終版_修正後_承認済み_保存用.maiml';

  const tableData = [
    {
      key: '1',
      name: '田中太郎',
      email: 'tanaka.taro@example.com',
      project: 'プロジェクトA - 材料科学実験データ分析システムの開発と評価',
      status: 'active',
    },
    {
      key: '2',
      name: '鈴木花子',
      email: 'suzuki.hanako@example.com',
      project: 'プロジェクトB - 機械学習を用いた材料特性予測モデルの構築',
      status: 'completed',
    },
    {
      key: '3',
      name: '佐藤次郎',
      email: 'sato.jiro@example.com',
      project: 'プロジェクトC - データベース最適化とパフォーマンス改善',
      status: 'pending',
    },
  ];

  const columns = [
    {
      title: (
        <Space>
          <span>ユーザー名</span>
          <Tooltip 
            title="システムに登録されているユーザーの氏名です"
            mouseEnterDelay={0.5}
            placement="top"
          >
            <QuestionCircleOutlined 
              style={{ color: token.colorTextSecondary, fontSize: 14 }} 
            />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: (
        <Space>
          <span>メールアドレス</span>
          <Tooltip 
            title="ユーザーの連絡先メールアドレスです。通知はこのアドレスに送信されます"
            mouseEnterDelay={0.5}
            placement="top"
          >
            <InfoCircleOutlined 
              style={{ color: token.colorTextSecondary, fontSize: 14 }} 
            />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'email',
      key: 'email',
      width: 250,
      render: (text: string) => (
        <Tooltip title={text} mouseEnterDelay={0.5}>
          <Text ellipsis style={{ maxWidth: 230, cursor: 'pointer', display: 'block' }}>
            {text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'プロジェクト',
      dataIndex: 'project',
      key: 'project',
      render: (text: string) => (
        <Tooltip title={text} mouseEnterDelay={0.5}>
          <Text ellipsis style={{ maxWidth: 300, cursor: 'pointer', display: 'block' }}>
            {text}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const statusConfig: Record<string, { badge: React.ReactNode; tooltip: string }> = {
          active: {
            badge: <Badge status="processing" text="進行中" />,
            tooltip: '実験は現在進行中です。データの収集と分析が継続されています',
          },
          completed: {
            badge: <Badge status="success" text="完了" />,
            tooltip: '実験が正常に完了し、すべてのデータが保存されました',
          },
          pending: {
            badge: <Badge status="warning" text="保留中" />,
            tooltip: '実験の開始を待機しています。承認が完了すると開始されます',
          },
        };

        const config = statusConfig[status];

        return (
          <Tooltip 
            title={config.tooltip}
            mouseEnterDelay={0.5}
            placement="left"
          >
            <div style={{ cursor: 'help' }}>
              {config.badge}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: () => (
        <Space>
          <Tooltip title="編集" mouseEnterDelay={0.8}>
            <Button 
              icon={<EditOutlined />} 
              size="small"
            />
          </Tooltip>
          <Tooltip title="コピー" mouseEnterDelay={0.8}>
            <Button 
              icon={<CopyOutlined />} 
              size="small"
            />
          </Tooltip>
          <Tooltip title="削除" mouseEnterDelay={0.8}>
            <Button 
              icon={<DeleteOutlined />} 
              size="small"
              danger
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Title level={2}>ツールチップ表示パターン</Title>
        <Paragraph>
          全画面のデータ表示に関するツールチップの標準パターンを示します。
        </Paragraph>
      </Card>

      {/* パターン1: 情報表示（アイコンホバー） */}
      <Card 
        title="パターン1: 情報表示（アイコンホバー）"
        extra={
          <Tag color="blue">
            用途: フィールド・ラベルの補足説明
          </Tag>
        }
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}>基本形式（QuestionCircleOutlined）</Title>
            <Space direction="vertical" size="middle">
              <Space>
                <Text>ユーザー名</Text>
                <Tooltip 
                  title="システムにログインするためのユーザー名です"
                  mouseEnterDelay={0.5}
                  placement="top"
                >
                  <QuestionCircleOutlined 
                    style={{ color: token.colorTextSecondary, fontSize: 16 }} 
                  />
                </Tooltip>
              </Space>
              <Space>
                <Text>パスワード</Text>
                <Tooltip 
                  title="8文字以上で、大文字、小文字、数字を含める必要があります"
                  mouseEnterDelay={0.5}
                  placement="top"
                >
                  <QuestionCircleOutlined 
                    style={{ color: token.colorTextSecondary, fontSize: 16 }} 
                  />
                </Tooltip>
              </Space>
              <Space>
                <Text>組織ID</Text>
                <Tooltip 
                  title="所属する組織の一意な識別子です。変更できません"
                  mouseEnterDelay={0.5}
                  placement="top"
                >
                  <QuestionCircleOutlined 
                    style={{ color: token.colorTextSecondary, fontSize: 16 }} 
                  />
                </Tooltip>
              </Space>
            </Space>
          </div>

          <Divider />

          <div>
            <Title level={5}>変種（InfoCircleOutlined）</Title>
            <Space direction="vertical" size="middle">
              <Space>
                <Text>メールアドレス</Text>
                <Tooltip 
                  title="通知の送信先となるメールアドレスです"
                  mouseEnterDelay={0.5}
                  placement="top"
                >
                  <InfoCircleOutlined 
                    style={{ color: token.colorTextSecondary, fontSize: 16 }} 
                  />
                </Tooltip>
              </Space>
              <Space>
                <Text>実験期間</Text>
                <Tooltip 
                  title="実験の開始日から終了日までの期間を指定します"
                  mouseEnterDelay={0.5}
                  placement="top"
                >
                  <InfoCircleOutlined 
                    style={{ color: token.colorTextSecondary, fontSize: 16 }} 
                  />
                </Tooltip>
              </Space>
            </Space>
          </div>

          <Divider />

          <div>
            <Title level={5}>仕様</Title>
            <ul>
              <li>トリガー: QuestionCircleOutlined / InfoCircleOutlined（16px）</li>
              <li>トリガー色: colorTextSecondary (#757575)</li>
              <li>配置: ラベル右側、8px間隔</li>
              <li>表示タイミング: ホバー時（0.5秒遅延）</li>
              <li>最大幅: 300px</li>
            </ul>
          </div>
        </Space>
      </Card>

      {/* パターン2: データ省略時の全文表示 */}
      <Card 
        title="パターン2: データ省略時の全文表示"
        extra={
          <Tag color="green">
            用途: 長いテキストの省略表示
          </Tag>
        }
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}>基本例</Title>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Row gutter={[16, 16]}>
                <Col span={8}>
                  <Text strong>幅200px:</Text>
                  <div style={{ marginTop: 8 }}>
                    <Tooltip title={longText} mouseEnterDelay={0.5}>
                      <Text 
                        ellipsis 
                        style={{ maxWidth: 200, cursor: 'pointer', display: 'block' }}
                      >
                        {longText}
                      </Text>
                    </Tooltip>
                  </div>
                </Col>
                <Col span={8}>
                  <Text strong>幅300px:</Text>
                  <div style={{ marginTop: 8 }}>
                    <Tooltip title={longText} mouseEnterDelay={0.5}>
                      <Text 
                        ellipsis 
                        style={{ maxWidth: 300, cursor: 'pointer', display: 'block' }}
                      >
                        {longText}
                      </Text>
                    </Tooltip>
                  </div>
                </Col>
                <Col span={8}>
                  <Text strong>幅400px:</Text>
                  <div style={{ marginTop: 8 }}>
                    <Tooltip title={longText} mouseEnterDelay={0.5}>
                      <Text 
                        ellipsis 
                        style={{ maxWidth: 400, cursor: 'pointer', display: 'block' }}
                      >
                        {longText}
                      </Text>
                    </Tooltip>
                  </div>
                </Col>
              </Row>
            </Space>
          </div>

          <Divider />

          <div>
            <Title level={5}>ファイル名の例</Title>
            <Tooltip title={veryLongText} mouseEnterDelay={0.5}>
              <Text 
                ellipsis 
                style={{ maxWidth: 500, cursor: 'pointer', display: 'block' }}
              >
                {veryLongText}
              </Text>
            </Tooltip>
          </div>

          <Divider />

          <div>
            <Title level={5}>Paragraph の例（複数行）</Title>
            <Tooltip title={longText} mouseEnterDelay={0.5}>
              <Paragraph 
                ellipsis={{ rows: 2 }}
                style={{ maxWidth: 400, cursor: 'pointer', marginBottom: 0 }}
              >
                {longText}
              </Paragraph>
            </Tooltip>
          </div>

          <Divider />

          <div>
            <Title level={5}>仕様</Title>
            <ul>
              <li>トリガー: 省略されたテキスト（...で終わる）</li>
              <li>カーソル: pointer</li>
              <li>表示タイミング: ホバー時（0.5秒遅延）</li>
              <li>最大幅: 400px</li>
              <li>折り返し: whiteSpace: &apos;pre-wrap&apos;</li>
            </ul>
          </div>
        </Space>
      </Card>

      {/* パターン3: 操作説明（ボタン・リンク） */}
      <Card 
        title="パターン3: 操作説明（ボタン・リンク）"
        extra={
          <Tag color="purple">
            用途: ボタン・アイコンの操作説明
          </Tag>
        }
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}>アイコンボタン</Title>
            <Space wrap>
              <Tooltip title="編集" mouseEnterDelay={0.8}>
                <Button icon={<EditOutlined />} />
              </Tooltip>
              <Tooltip title="削除" mouseEnterDelay={0.8}>
                <Button icon={<DeleteOutlined />} danger />
              </Tooltip>
              <Tooltip title="ダウンロード" mouseEnterDelay={0.8}>
                <Button icon={<DownloadOutlined />} />
              </Tooltip>
              <Tooltip title="コピー" mouseEnterDelay={0.8}>
                <Button icon={<CopyOutlined />} />
              </Tooltip>
              <Tooltip title="共有" mouseEnterDelay={0.8}>
                <Button icon={<ShareAltOutlined />} />
              </Tooltip>
            </Space>
          </div>

          <Divider />

          <div>
            <Title level={5}>異なるサイズ</Title>
            <Space wrap align="center">
              <Tooltip title="小サイズ" mouseEnterDelay={0.8}>
                <Button icon={<EditOutlined />} size="small" />
              </Tooltip>
              <Tooltip title="標準サイズ" mouseEnterDelay={0.8}>
                <Button icon={<EditOutlined />} />
              </Tooltip>
              <Tooltip title="大サイズ" mouseEnterDelay={0.8}>
                <Button icon={<EditOutlined />} size="large" />
              </Tooltip>
            </Space>
          </div>

          <Divider />

          <div>
            <Title level={5}>アバター付きボタン</Title>
            <Space wrap>
              <Tooltip title="プロフィールを表示" mouseEnterDelay={0.8}>
                <Button 
                  type="text"
                  icon={<Avatar size="small" icon={<UserOutlined />} />}
                />
              </Tooltip>
            </Space>
          </div>

          <Divider />

          <div>
            <Title level={5}>仕様</Title>
            <ul>
              <li>トリガー: Button、IconButton、リンクなど</li>
              <li>表示タイミング: ホバー時（0.8秒遅延）</li>
              <li>フォントサイズ: fontSizeSM (12px)</li>
              <li>最大幅: 200px</li>
              <li>テキスト: 簡潔な動詞</li>
            </ul>
          </div>
        </Space>
      </Card>

      {/* パターン4: 状態・ステータス説明 */}
      <Card 
        title="パターン4: 状態・ステータス説明"
        extra={
          <Tag color="orange">
            用途: バッジ・ステータスの詳細
          </Tag>
        }
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}>Badge のステータス</Title>
            <Space direction="vertical" size="middle">
              <Tooltip 
                title="実験が正常に完了し、すべてのデータが保存されました"
                mouseEnterDelay={0.5}
              >
                <div style={{ cursor: 'help', display: 'inline-block' }}>
                  <Badge status="success" text="完了" />
                </div>
              </Tooltip>
              <Tooltip 
                title="実験は現在進行中です。データの収集と分析が継続されています"
                mouseEnterDelay={0.5}
              >
                <div style={{ cursor: 'help', display: 'inline-block' }}>
                  <Badge status="processing" text="進行中" />
                </div>
              </Tooltip>
              <Tooltip 
                title="実験の開始を待機しています。承認が完了すると開始されます"
                mouseEnterDelay={0.5}
              >
                <div style={{ cursor: 'help', display: 'inline-block' }}>
                  <Badge status="warning" text="保留中" />
                </div>
              </Tooltip>
              <Tooltip 
                title="実験でエラーが発生しました。ログを確認してください"
                mouseEnterDelay={0.5}
              >
                <div style={{ cursor: 'help', display: 'inline-block' }}>
                  <Badge status="error" text="エラー" />
                </div>
              </Tooltip>
            </Space>
          </div>

          <Divider />

          <div>
            <Title level={5}>Tag のステータス</Title>
            <Space wrap>
              <Tooltip 
                title="タスクが正常に完了しました"
                mouseEnterDelay={0.5}
              >
                <Tag color="success" icon={<CheckCircleOutlined />} style={{ cursor: 'help' }}>
                  成功
                </Tag>
              </Tooltip>
              <Tooltip 
                title="タスクは現在処理中です"
                mouseEnterDelay={0.5}
              >
                <Tag color="processing" icon={<ClockCircleOutlined />} style={{ cursor: 'help' }}>
                  処理中
                </Tag>
              </Tooltip>
              <Tooltip 
                title="注意が必要な状態です"
                mouseEnterDelay={0.5}
              >
                <Tag color="warning" icon={<ExclamationCircleOutlined />} style={{ cursor: 'help' }}>
                  警告
                </Tag>
              </Tooltip>
              <Tooltip 
                title="エラーが発生しました"
                mouseEnterDelay={0.5}
              >
                <Tag color="error" icon={<CloseCircleOutlined />} style={{ cursor: 'help' }}>
                  エラー
                </Tag>
              </Tooltip>
            </Space>
          </div>

          <Divider />

          <div>
            <Title level={5}>カスタムカラー Tag</Title>
            <Space wrap>
              <Tooltip 
                title="データがブロックチェーンに記録されています"
                mouseEnterDelay={0.5}
              >
                <Tag color="blue" style={{ cursor: 'help' }}>
                  ブロックチェーン
                </Tag>
              </Tooltip>
              <Tooltip 
                title="機械学習モデルが適用されています"
                mouseEnterDelay={0.5}
              >
                <Tag color="purple" style={{ cursor: 'help' }}>
                  ML適用済み
                </Tag>
              </Tooltip>
              <Tooltip 
                title="管理者による承認が必要です"
                mouseEnterDelay={0.5}
              >
                <Tag color="orange" style={{ cursor: 'help' }}>
                  承認待ち
                </Tag>
              </Tooltip>
            </Space>
          </div>

          <Divider />

          <div>
            <Title level={5}>仕様</Title>
            <ul>
              <li>トリガー: Badge、Tag、Status などの状態表示要素</li>
              <li>カーソル: help</li>
              <li>表示タイミング: ホバー時（0.5秒遅延）</li>
              <li>最大幅: 300px</li>
              <li>内容: 状態の意味や詳細説明</li>
            </ul>
          </div>
        </Space>
      </Card>

      {/* 実践的な使用例: テーブル */}
      <Card 
        title="実践的な使用例: テーブル"
        extra={
          <Tag color="cyan">
            統合例
          </Tag>
        }
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Paragraph>
            以下のテーブルでは、すべてのツールチップパターンを組み合わせて使用しています。
          </Paragraph>
          <Table 
            columns={columns}
            dataSource={tableData}
            pagination={false}
            bordered
          />
          <div>
            <Title level={5}>使用しているパターン</Title>
            <ul>
              <li>パターン1: テーブルヘッダーのフィールド説明（QuestionCircleOutlined / InfoCircleOutlined）</li>
              <li>パターン2: メールアドレスとプロジェクト名の省略表示</li>
              <li>パターン3: 操作列のアイコンボタン説明</li>
              <li>パターン4: ステータス列の状態説明</li>
            </ul>
          </div>
        </Space>
      </Card>

      {/* 配置パターン */}
      <Card title="配置パターン（placement）">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Title level={5}>上部配置</Title>
              <Space direction="vertical" size="middle">
                <Tooltip title="上部" placement="top">
                  <Button>top</Button>
                </Tooltip>
                <Tooltip title="左上" placement="topLeft">
                  <Button>topLeft</Button>
                </Tooltip>
                <Tooltip title="右上" placement="topRight">
                  <Button>topRight</Button>
                </Tooltip>
              </Space>
            </Col>
            <Col span={8}>
              <Title level={5}>下部配置</Title>
              <Space direction="vertical" size="middle">
                <Tooltip title="下部" placement="bottom">
                  <Button>bottom</Button>
                </Tooltip>
                <Tooltip title="左下" placement="bottomLeft">
                  <Button>bottomLeft</Button>
                </Tooltip>
                <Tooltip title="右下" placement="bottomRight">
                  <Button>bottomRight</Button>
                </Tooltip>
              </Space>
            </Col>
            <Col span={8}>
              <Title level={5}>左右配置</Title>
              <Space direction="vertical" size="middle">
                <Tooltip title="左側" placement="left">
                  <Button>left</Button>
                </Tooltip>
                <Tooltip title="右側" placement="right">
                  <Button>right</Button>
                </Tooltip>
              </Space>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* 表示タイミング */}
      <Card title="表示タイミング（mouseEnterDelay）">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Paragraph>
            ホバー後、指定した秒数経過してからツールチップが表示されます。
          </Paragraph>
          <Space wrap>
            <Tooltip title="即時表示" mouseEnterDelay={0}>
              <Button>0秒（即時）</Button>
            </Tooltip>
            <Tooltip title="0.3秒後に表示" mouseEnterDelay={0.3}>
              <Button>0.3秒</Button>
            </Tooltip>
            <Tooltip title="0.5秒後に表示（推奨）" mouseEnterDelay={0.5}>
              <Button type="primary">0.5秒（推奨）</Button>
            </Tooltip>
            <Tooltip title="0.8秒後に表示（操作説明用）" mouseEnterDelay={0.8}>
              <Button>0.8秒</Button>
            </Tooltip>
            <Tooltip title="1秒後に表示" mouseEnterDelay={1}>
              <Button>1秒</Button>
            </Tooltip>
          </Space>
        </Space>
      </Card>

      {/* 使用ガイドライン */}
      <Card title="使用ガイドライン">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={5}>✅ DO（推奨）</Title>
            <ul>
              <li>簡潔で分かりやすい説明文を使用する</li>
              <li>ホバー遅延を設定して誤表示を防ぐ</li>
              <li>最大幅を設定して読みやすさを確保する</li>
              <li>アイコンの色を統一する（colorTextSecondary）</li>
              <li>省略されたテキストには必ずツールチップを付ける</li>
              <li>カーソルスタイルで操作可能性を示す（pointer, help）</li>
            </ul>
          </div>
          <div>
            <Title level={5}>❌ DON&apos;T（非推奨）</Title>
            <ul>
              <li>長すぎる説明文を表示しない（最大3-4行）</li>
              <li>必須情報をツールチップにのみ表示しない</li>
              <li>ツールチップ内に操作可能な要素を含めない</li>
              <li>複雑なHTML構造を含めない</li>
              <li>モバイルで重要な情報をツールチップに依存しない</li>
              <li>ツールチップを開いた状態で固定しない</li>
            </ul>
          </div>
        </Space>
      </Card>
    </Space>
  );
}
