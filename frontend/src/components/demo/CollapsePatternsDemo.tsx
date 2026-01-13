'use client';

import React from 'react';
import {
  Collapse,
  Card,
  Space,
  Button,
  Descriptions,
  Timeline,
  Tag,
  Badge,
  Typography,
  Divider,
  Switch,
} from 'antd';
import {
  RightOutlined,
  EditOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export default function CollapsePatternsDemo() {
  // サンプルデータ
  const metadataItems = [
    { key: '1', label: 'プロジェクトID', children: 'PRJ-2024-001' },
    { key: '2', label: '作成者', children: '山田太郎' },
    { key: '3', label: '作成日', children: '2024-12-20' },
    { key: '4', label: 'ステータス', children: <Tag color="success">進行中</Tag> },
  ];

  const historyItems = [
    {
      color: 'green',
      children: (
        <div>
          <Text strong>プロジェクト作成</Text>
          <br />
          <Text type="secondary">2024-12-20 10:30</Text>
        </div>
      ),
    },
    {
      color: 'blue',
      children: (
        <div>
          <Text strong>実験開始</Text>
          <br />
          <Text type="secondary">2024-12-21 14:15</Text>
        </div>
      ),
    },
    {
      color: 'gray',
      children: (
        <div>
          <Text strong>データ収集中</Text>
          <br />
          <Text type="secondary">2024-12-22 09:00</Text>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>折りたたみパネル 全パターンデモ</Title>
      <Paragraph>
        折りたたみパネル（Collapse）の標準3パターンと、その他の使用例を示します。
      </Paragraph>

      <Divider />

      {/* パターン1: 標準折りたたみ */}
      <Card title="パターン1: 標準折りたたみ" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>基本形</Title>
            <Text type="secondary">
              詳細情報の段階的表示、長いコンテンツの整理に使用。複数パネル展開可能。
            </Text>
            <Collapse
              style={{ marginTop: 16 }}
              items={[
                {
                  key: '1',
                  label: 'プロジェクト概要',
                  children: (
                    <div>
                      <Paragraph>
                        このプロジェクトは、新素材の開発を目的とした研究プロジェクトです。
                        2024年12月に開始され、現在進行中です。
                      </Paragraph>
                      <Paragraph>
                        主な目標は、既存の素材よりも軽量で強度の高い新しい複合材料を開発することです。
                      </Paragraph>
                    </div>
                  ),
                },
                {
                  key: '2',
                  label: '実験データ',
                  children: (
                    <div>
                      <Descriptions
                        bordered
                        size="small"
                        items={[
                          { key: '1', label: '実験回数', children: '42回' },
                          { key: '2', label: '成功率', children: '78.5%' },
                          { key: '3', label: '最終実験日', children: '2024-12-25' },
                          { key: '4', label: 'データポイント', children: '1,250件' },
                        ]}
                      />
                    </div>
                  ),
                },
                {
                  key: '3',
                  label: 'チームメンバー',
                  children: (
                    <Space direction="vertical" size="small">
                      <Text>• 山田太郎（プロジェクトリーダー）</Text>
                      <Text>• 佐藤花子（研究員）</Text>
                      <Text>• 鈴木一郎（技術アシスタント）</Text>
                      <Text>• 田中美咲（データアナリスト）</Text>
                    </Space>
                  ),
                },
              ]}
            />
          </div>

          <div>
            <Title level={4}>デフォルト展開</Title>
            <Text type="secondary">
              重要な情報は初期展開状態で表示します。
            </Text>
            <Collapse
              style={{ marginTop: 16 }}
              defaultActiveKey={['1']}
              items={[
                {
                  key: '1',
                  label: '重要なお知らせ',
                  children: (
                    <div>
                      <Paragraph>
                        <InfoCircleOutlined style={{ color: '#0093CF', marginRight: 8 }} />
                        次回のプロジェクトミーティングは2024年12月30日（月）14:00からです。
                      </Paragraph>
                    </div>
                  ),
                },
                {
                  key: '2',
                  label: 'その他の情報',
                  children: <Paragraph>追加の詳細情報がここに表示されます。</Paragraph>,
                },
              ]}
            />
          </div>
        </Space>
      </Card>

      {/* パターン2: アコーディオン */}
      <Card title="パターン2: アコーディオン" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>基本形</Title>
            <Text type="secondary">
              1つずつ詳細を確認する情報に使用。同時に1つのパネルのみ展開可能。
            </Text>
            <Collapse
              style={{ marginTop: 16 }}
              accordion
              items={[
                {
                  key: '1',
                  label: 'ステップ1: 準備',
                  children: (
                    <div>
                      <Paragraph strong>必要な準備:</Paragraph>
                      <ul>
                        <li>実験計画書の作成</li>
                        <li>必要な材料の調達</li>
                        <li>実験装置の準備と校正</li>
                        <li>安全確認</li>
                      </ul>
                    </div>
                  ),
                },
                {
                  key: '2',
                  label: 'ステップ2: 実行',
                  children: (
                    <div>
                      <Paragraph strong>実行手順:</Paragraph>
                      <ol>
                        <li>実験環境の設定</li>
                        <li>サンプルの準備</li>
                        <li>測定開始</li>
                        <li>データ記録</li>
                      </ol>
                    </div>
                  ),
                },
                {
                  key: '3',
                  label: 'ステップ3: 分析',
                  children: (
                    <div>
                      <Paragraph strong>分析プロセス:</Paragraph>
                      <ul>
                        <li>データの検証</li>
                        <li>統計処理</li>
                        <li>結果の可視化</li>
                        <li>レポート作成</li>
                      </ul>
                    </div>
                  ),
                },
              ]}
            />
          </div>

          <div>
            <Title level={4}>デフォルト展開（アコーディオン）</Title>
            <Text type="secondary">
              最初のステップを展開した状態で表示します。
            </Text>
            <Collapse
              style={{ marginTop: 16 }}
              accordion
              defaultActiveKey={['1']}
              items={[
                {
                  key: '1',
                  label: (
                    <span>
                      <CheckCircleOutlined style={{ color: '#2e7d32', marginRight: 8 }} />
                      <Text strong>完了したステップ</Text>
                    </span>
                  ),
                  children: (
                    <Paragraph>
                      このステップは既に完了しています。次のステップに進んでください。
                    </Paragraph>
                  ),
                },
                {
                  key: '2',
                  label: (
                    <span>
                      <ClockCircleOutlined style={{ color: '#0093CF', marginRight: 8 }} />
                      <Text strong>進行中のステップ</Text>
                    </span>
                  ),
                  children: (
                    <Paragraph>
                      現在このステップを実行中です。完了まで約2時間の予定です。
                    </Paragraph>
                  ),
                },
                {
                  key: '3',
                  label: (
                    <span>
                      <InfoCircleOutlined style={{ color: '#757575', marginRight: 8 }} />
                      <Text type="secondary">未開始のステップ</Text>
                    </span>
                  ),
                  children: (
                    <Paragraph>
                      このステップはまだ開始されていません。前のステップが完了次第、開始します。
                    </Paragraph>
                  ),
                },
              ]}
            />
          </div>
        </Space>
      </Card>

      {/* パターン3: ボーダーレス */}
      <Card title="パターン3: ボーダーレス" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>基本形</Title>
            <Text type="secondary">
              カード内のシンプルな折りたたみに使用。ボーダーがなく、すっきりとした見た目。
            </Text>
            <Card style={{ marginTop: 16, background: '#fafafa' }}>
              <Collapse
                bordered={false}
                style={{ background: 'transparent' }}
                items={[
                  {
                    key: '1',
                    label: 'メタデータ',
                    children: (
                      <Descriptions
                        size="small"
                        items={metadataItems}
                      />
                    ),
                  },
                  {
                    key: '2',
                    label: '履歴',
                    children: <Timeline items={historyItems} />,
                  },
                  {
                    key: '3',
                    label: 'タグ',
                    children: (
                      <Space size="small" wrap>
                        <Tag color="blue">実験A</Tag>
                        <Tag color="green">承認済み</Tag>
                        <Tag color="orange">高優先度</Tag>
                        <Tag>新素材</Tag>
                        <Tag>2024</Tag>
                      </Space>
                    ),
                  },
                ]}
              />
            </Card>
          </div>

          <div>
            <Title level={4}>複数展開</Title>
            <Text type="secondary">
              複数のパネルを同時に展開できます。
            </Text>
            <Card style={{ marginTop: 16, background: '#fafafa' }}>
              <Collapse
                bordered={false}
                style={{ background: 'transparent' }}
                defaultActiveKey={['1', '2']}
                items={[
                  {
                    key: '1',
                    label: '基本情報',
                    children: (
                      <Space direction="vertical" size="small">
                        <Text>プロジェクト名: 新素材開発プロジェクト</Text>
                        <Text>期間: 2024年1月 - 2024年12月</Text>
                        <Text>予算: ¥10,000,000</Text>
                      </Space>
                    ),
                  },
                  {
                    key: '2',
                    label: '進捗状況',
                    children: (
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div>
                          <Text>全体: 75%</Text>
                        </div>
                        <div>
                          <Text>準備: 100%</Text>
                        </div>
                        <div>
                          <Text>実験: 80%</Text>
                        </div>
                        <div>
                          <Text>分析: 50%</Text>
                        </div>
                      </Space>
                    ),
                  },
                ]}
              />
            </Card>
          </div>
        </Space>
      </Card>

      {/* 追加機能 */}
      <Card title="追加機能" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>Extra要素付き</Title>
            <Text type="secondary">
              ヘッダー右側にボタンやリンクを配置できます。
            </Text>
            <Collapse
              style={{ marginTop: 16 }}
              items={[
                {
                  key: '1',
                  label: 'プロジェクト設定',
                  extra: (
                    <Space size="small" onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => console.log('編集')}
                      />
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        size="small"
                        danger
                        onClick={() => console.log('削除')}
                      />
                    </Space>
                  ),
                  children: (
                    <Paragraph>
                      プロジェクト設定の詳細情報がここに表示されます。
                    </Paragraph>
                  ),
                },
                {
                  key: '2',
                  label: 'チーム設定',
                  extra: (
                    <Button
                      type="link"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('詳細');
                      }}
                    >
                      詳細
                    </Button>
                  ),
                  children: (
                    <Paragraph>
                      チーム設定の詳細情報がここに表示されます。
                    </Paragraph>
                  ),
                },
              ]}
            />
          </div>

          <div>
            <Title level={4}>矢印位置: 右側</Title>
            <Text type="secondary">
              矢印アイコンを右側に配置できます。
            </Text>
            <Collapse
              style={{ marginTop: 16 }}
              expandIconPosition="end"
              items={[
                {
                  key: '1',
                  label: '設定項目1',
                  children: <Paragraph>設定項目1の詳細情報。</Paragraph>,
                },
                {
                  key: '2',
                  label: '設定項目2',
                  children: <Paragraph>設定項目2の詳細情報。</Paragraph>,
                },
              ]}
            />
          </div>

          <div>
            <Title level={4}>矢印非表示</Title>
            <Text type="secondary">
              矢印アイコンを非表示にできます。
            </Text>
            <Collapse
              style={{ marginTop: 16 }}
              items={[
                {
                  key: '1',
                  label: 'シンプルなパネル1',
                  showArrow: false,
                  children: <Paragraph>矢印なしのパネル。</Paragraph>,
                },
                {
                  key: '2',
                  label: 'シンプルなパネル2',
                  showArrow: false,
                  children: <Paragraph>矢印なしのパネル。</Paragraph>,
                },
              ]}
            />
          </div>

          <div>
            <Title level={4}>カスタムヘッダー</Title>
            <Text type="secondary">
              ヘッダーに複雑な要素を配置できます。
            </Text>
            <Collapse
              style={{ marginTop: 16 }}
              items={[
                {
                  key: '1',
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge status="success" />
                      <Text strong>アクティブなタスク</Text>
                      <Tag color="blue">3件</Tag>
                    </div>
                  ),
                  children: (
                    <Space direction="vertical">
                      <Text>• タスク1: データ収集</Text>
                      <Text>• タスク2: 分析</Text>
                      <Text>• タスク3: レポート作成</Text>
                    </Space>
                  ),
                },
                {
                  key: '2',
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge status="warning" />
                      <Text strong>保留中のタスク</Text>
                      <Tag color="orange">1件</Tag>
                    </div>
                  ),
                  children: (
                    <Space direction="vertical">
                      <Text>• タスク4: 承認待ち</Text>
                    </Space>
                  ),
                },
              ]}
            />
          </div>

          <div>
            <Title level={4}>無効状態</Title>
            <Text type="secondary">
              パネルを無効化できます。
            </Text>
            <Collapse
              style={{ marginTop: 16 }}
              items={[
                {
                  key: '1',
                  label: '有効なパネル',
                  children: <Paragraph>このパネルは有効です。</Paragraph>,
                },
                {
                  key: '2',
                  label: '無効なパネル',
                  collapsible: 'disabled',
                  children: <Paragraph>このパネルは無効です。</Paragraph>,
                },
                {
                  key: '3',
                  label: '別の有効なパネル',
                  children: <Paragraph>このパネルも有効です。</Paragraph>,
                },
              ]}
            />
          </div>

          <div>
            <Title level={4}>collapsible: icon</Title>
            <Text type="secondary">
              アイコンのみクリック可能にできます。
            </Text>
            <Collapse
              style={{ marginTop: 16 }}
              items={[
                {
                  key: '1',
                  label: 'アイコンのみクリック可能',
                  collapsible: 'icon',
                  children: (
                    <Paragraph>
                      ヘッダーのテキスト部分をクリックしても展開されません。
                      矢印アイコンのみがクリック可能です。
                    </Paragraph>
                  ),
                },
              ]}
            />
          </div>
        </Space>
      </Card>

      {/* ネスト折りたたみ */}
      <Card title="ネスト折りたたみ" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>2階層ネスト</Title>
            <Text type="secondary">
              折りたたみパネル内に別の折りたたみパネルを配置できます（最大2階層推奨）。
            </Text>
            <Collapse
              style={{ marginTop: 16 }}
              items={[
                {
                  key: '1',
                  label: 'プロジェクトA',
                  children: (
                    <Collapse
                      bordered={false}
                      style={{ background: '#fafafa' }}
                      items={[
                        {
                          key: '1-1',
                          label: 'フェーズ1',
                          children: <Paragraph>フェーズ1の詳細情報。</Paragraph>,
                        },
                        {
                          key: '1-2',
                          label: 'フェーズ2',
                          children: <Paragraph>フェーズ2の詳細情報。</Paragraph>,
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: '2',
                  label: 'プロジェクトB',
                  children: (
                    <Collapse
                      bordered={false}
                      style={{ background: '#fafafa' }}
                      items={[
                        {
                          key: '2-1',
                          label: 'タスク1',
                          children: <Paragraph>タスク1の詳細情報。</Paragraph>,
                        },
                        {
                          key: '2-2',
                          label: 'タスク2',
                          children: <Paragraph>タスク2の詳細情報。</Paragraph>,
                        },
                      ]}
                    />
                  ),
                },
              ]}
            />
          </div>
        </Space>
      </Card>

      {/* カード内での使用例 */}
      <Card title="実際の使用例" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>プロジェクト詳細カード</Title>
            <Card
              style={{ marginTop: 16 }}
              title="新素材開発プロジェクト"
              extra={<Tag color="success">進行中</Tag>}
            >
              <Collapse
                bordered={false}
                defaultActiveKey={['1']}
                items={[
                  {
                    key: '1',
                    label: '基本情報',
                    children: (
                      <Descriptions
                        size="small"
                        column={1}
                        items={[
                          { key: '1', label: 'プロジェクトID', children: 'PRJ-2024-001' },
                          { key: '2', label: '開始日', children: '2024-01-15' },
                          { key: '3', label: '予定終了日', children: '2024-12-31' },
                          { key: '4', label: '予算', children: '¥10,000,000' },
                        ]}
                      />
                    ),
                  },
                  {
                    key: '2',
                    label: '進捗レポート',
                    children: (
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Paragraph>
                          現在、プロジェクトは計画通りに進行しています。
                          実験フェーズは完了し、データ分析を進めています。
                        </Paragraph>
                        <Descriptions
                          size="small"
                          column={1}
                          items={[
                            { key: '1', label: '全体進捗', children: '75%' },
                            { key: '2', label: '実験完了', children: '100%' },
                            { key: '3', label: '分析進捗', children: '50%' },
                          ]}
                        />
                      </Space>
                    ),
                  },
                  {
                    key: '3',
                    label: 'チームメンバー',
                    children: (
                      <Space direction="vertical" size="small">
                        <Text>• 山田太郎 - プロジェクトリーダー</Text>
                        <Text>• 佐藤花子 - 主任研究員</Text>
                        <Text>• 鈴木一郎 - 技術アシスタント</Text>
                      </Space>
                    ),
                  },
                ]}
              />
            </Card>
          </div>
        </Space>
      </Card>
    </div>
  );
}
