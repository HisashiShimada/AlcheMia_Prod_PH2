'use client';

import React, { useState } from 'react';
import {
  Card,
  Space,
  Typography,
  Tag,
  Row,
  Col,
  Divider,
  theme,
  Button
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

type Status = 'not_started' | 'started' | 'in_progress' | 'completed' | 'error' | 'suspended' | 'review_waiting';

interface StatusConfig {
  color: string;
  label: string;
  icon?: React.ReactNode;
}

const STATUS_CONFIG: Record<Status, StatusConfig> = {
  not_started: {
    color: 'default',
    label: '開始前'
  },
  started: {
    color: 'blue',
    label: '開始',
    icon: <CheckCircleOutlined />
  },
  in_progress: {
    color: 'processing',
    label: '進行中',
    icon: <SyncOutlined spin />
  },
  completed: {
    color: 'success',
    label: '完了',
    icon: <CheckCircleOutlined />
  },
  error: {
    color: 'error',
    label: 'エラー',
    icon: <CloseCircleOutlined />
  },
  suspended: {
    color: 'orange',
    label: '中断',
    icon: <ExclamationCircleOutlined />
  },
  review_waiting: {
    color: 'purple',
    label: 'レビュー待ち',
    icon: <ClockCircleOutlined />
  }
};

/**
 * ステータス・ラベルパターンデモコンポーネント
 */
export default function StatusLabelPatternsDemo() {
  const { token } = theme.useToken();
  const [selectedStatus, setSelectedStatus] = useState<Status>('in_progress');
  const [count, setCount] = useState(5);
  const [isSelected, setIsSelected] = useState(false);

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>ステータス（Tag）・ラベル（Label）パターン</Title>
      <Paragraph>
        Ant Design TagとTypographyコンポーネントの標準パターンを示します。
        用途に応じて適切なパターンを選択してください。
      </Paragraph>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Tag パターン1: ステータス表示 */}
        <Card title="Tag パターン1: ステータス表示" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途:</Text> プロジェクト状態、タスク状態、進捗状況の表示
            </div>

            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Text strong>デフォルト（標準）</Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Tag color="default">保留中</Tag>
                    <Tag color="default">未選択</Tag>
                    <Tag color="default">無効</Tag>
                  </Space>
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  用途: 初期状態、無効状態、未設定状態
                </Text>
              </Col>

              <Col span={24}>
                <Text strong>情報（青系）</Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Tag color="blue">開始</Tag>
                    <Tag color="cyan">進行中</Tag>
                    <Tag color="processing">処理中</Tag>
                    <Tag icon={<SyncOutlined spin />} color="processing">実行中</Tag>
                  </Space>
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  用途: 進行中、処理中、情報表示
                </Text>
              </Col>

              <Col span={24}>
                <Text strong>成功（緑系）</Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Tag color="green">完了</Tag>
                    <Tag color="success">成功</Tag>
                    <Tag icon={<CheckCircleOutlined />} color="success">チェックイン済み</Tag>
                  </Space>
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  用途: 完了、成功、有効状態
                </Text>
              </Col>

              <Col span={24}>
                <Text strong>警告（橙系）</Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Tag color="orange">作業中</Tag>
                    <Tag color="orange">チェックアウト中</Tag>
                    <Tag icon={<ExclamationCircleOutlined />} color="warning">警告</Tag>
                  </Space>
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  用途: 警告、注意喚起、一時的な状態
                </Text>
              </Col>

              <Col span={24}>
                <Text strong>エラー（赤系）</Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Tag color="red">中断</Tag>
                    <Tag color="error">エラー</Tag>
                    <Tag icon={<CloseCircleOutlined />} color="red">強制終了</Tag>
                  </Space>
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  用途: エラー、失敗、異常状態
                </Text>
              </Col>

              <Col span={24}>
                <Text strong>特殊状態（紫系）</Text>
                <div style={{ marginTop: 8 }}>
                  <Space wrap>
                    <Tag color="purple">レビュー待ち</Tag>
                    <Tag color="magenta">承認待ち</Tag>
                    <Tag icon={<ClockCircleOutlined />} color="purple">待機中</Tag>
                  </Space>
                </div>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  用途: レビュー待ち、承認待ち、特殊なステータス
                </Text>
              </Col>
            </Row>

            <Divider />

            <div>
              <Text strong>動的ステータス表示（インタラクティブ）</Text>
              <div style={{ marginTop: 16 }}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Space wrap>
                    {(Object.keys(STATUS_CONFIG) as Status[]).map((status) => (
                      <Button
                        key={status}
                        type={selectedStatus === status ? 'primary' : 'default'}
                        size="small"
                        onClick={() => setSelectedStatus(status)}
                      >
                        {STATUS_CONFIG[status].label}
                      </Button>
                    ))}
                  </Space>
                  
                  <Space>
                    <Text strong>現在のステータス:</Text>
                    <Tag
                      icon={STATUS_CONFIG[selectedStatus].icon}
                      color={STATUS_CONFIG[selectedStatus].color}
                    >
                      {STATUS_CONFIG[selectedStatus].label}
                    </Tag>
                  </Space>
                </Space>
              </div>
            </div>
          </Space>
        </Card>

        {/* Tag パターン2: カウント・数値表示 */}
        <Card title="Tag パターン2: カウント・数値表示" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途:</Text> 件数表示、統計情報
            </div>

            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Space direction="vertical" size="small">
                  <Text strong>基本的なカウント表示</Text>
                  <Space wrap>
                    <Tag color="blue">50</Tag>
                    <Tag color="blue">120件</Tag>
                    <Tag color="success">15マッチ</Tag>
                  </Space>
                </Space>
              </Col>

              <Col span={24}>
                <Space direction="vertical" size="small">
                  <Text strong>条件付き色分け（0件の場合はdefault）</Text>
                  <Space wrap>
                    <Tag color={count > 0 ? 'blue' : 'default'}>{count}件</Tag>
                    <Tag color={count > 0 ? 'red' : 'default'}>エラー: {count}件</Tag>
                    <Tag color={count > 0 ? 'success' : 'default'}>成功: {count}件</Tag>
                  </Space>
                  <Space>
                    <Button size="small" onClick={() => setCount(Math.max(0, count - 1))}>-</Button>
                    <Button size="small" onClick={() => setCount(count + 1)}>+</Button>
                    <Button size="small" onClick={() => setCount(0)}>リセット</Button>
                  </Space>
                </Space>
              </Col>

              <Col span={24}>
                <Space direction="vertical" size="small">
                  <Text strong>統計情報の表示</Text>
                  <Space wrap>
                    <Space>
                      <Text>全プロジェクト:</Text>
                      <Tag color="blue" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        150
                      </Tag>
                    </Space>
                    <Space>
                      <Text>進行中:</Text>
                      <Tag color="cyan">45</Tag>
                    </Space>
                    <Space>
                      <Text>完了:</Text>
                      <Tag color="success">100</Tag>
                    </Space>
                    <Space>
                      <Text>エラー:</Text>
                      <Tag color="red">5</Tag>
                    </Space>
                  </Space>
                </Space>
              </Col>
            </Row>
          </Space>
        </Card>

        {/* Tag パターン3: カテゴリ・タグ表示 */}
        <Card title="Tag パターン3: カテゴリ・タグ表示" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途:</Text> カテゴリ分類、タグ付け、分類表示
            </div>

            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Space direction="vertical" size="small">
                  <Text strong>カテゴリ分類</Text>
                  <Space wrap>
                    <Tag color="purple">実験データ</Tag>
                    <Tag color="blue">解析結果</Tag>
                    <Tag color="green">レポート</Tag>
                    <Tag color="orange">ドラフト</Tag>
                  </Space>
                </Space>
              </Col>

              <Col span={24}>
                <Space direction="vertical" size="small">
                  <Text strong>複数タグ（小さめフォント）</Text>
                  <Space wrap>
                    <Tag color="blue" style={{ fontSize: 11 }}>材料科学</Tag>
                    <Tag color="blue" style={{ fontSize: 11 }}>ナノテクノロジー</Tag>
                    <Tag color="blue" style={{ fontSize: 11 }}>シミュレーション</Tag>
                    <Tag color="blue" style={{ fontSize: 11 }}>機械学習</Tag>
                  </Space>
                </Space>
              </Col>

              <Col span={24}>
                <Space direction="vertical" size="small">
                  <Text strong>ファイル形式識別</Text>
                  <Space wrap>
                    <Tag color="blue">MAIML</Tag>
                    <Tag color="green">PDF</Tag>
                    <Tag color="green">EXCEL</Tag>
                    <Tag color="default">CSV</Tag>
                  </Space>
                </Space>
              </Col>
            </Row>
          </Space>
        </Card>

        {/* Tag パターン4: バージョン・識別表示 */}
        <Card title="Tag パターン4: バージョン・識別表示" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途:</Text> バージョン番号、形式識別
            </div>

            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Space direction="vertical" size="small">
                  <Text strong>バージョン表示</Text>
                  <Space wrap>
                    <Tag color="green">v1.0.0</Tag>
                    <Tag color="green">v2.1.3</Tag>
                    <Tag color="green">v1.2.0</Tag>
                  </Space>
                </Space>
              </Col>

              <Col span={24}>
                <Space direction="vertical" size="small">
                  <Text strong>拡張子・形式</Text>
                  <Space wrap>
                    <Tag color="blue">.maiml</Tag>
                    <Tag color="blue">XML</Tag>
                    <Tag color="blue">JSON</Tag>
                  </Space>
                </Space>
              </Col>
            </Row>
          </Space>
        </Card>

        {/* Tag パターン5: 選択状態表示 */}
        <Card title="Tag パターン5: 選択状態表示" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途:</Text> 現在選択中、選択済みの表示
            </div>

            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Space direction="vertical" size="small">
                  <Text strong>選択状態（インタラクティブ）</Text>
                  <Space wrap>
                    <Button size="small" onClick={() => setIsSelected(!isSelected)}>
                      {isSelected ? '選択解除' : '選択する'}
                    </Button>
                  </Space>
                  <Space wrap>
                    {isSelected && <Tag color="blue">現在選択中</Tag>}
                    {isSelected && <Tag color="red">5件選択中</Tag>}
                    {!isSelected && <Tag color="default">未選択</Tag>}
                  </Space>
                </Space>
              </Col>
            </Row>
          </Space>
        </Card>

        {/* Tag パターン6: NEW・特殊マーク */}
        <Card title="Tag パターン6: NEW・特殊マーク" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途:</Text> 新規項目、特別な状態の強調
            </div>

            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Space direction="vertical" size="small">
                  <Text strong>NEWマーク</Text>
                  <Space wrap>
                    <Text>新規プロジェクト</Text>
                    <Tag color="success" style={{ marginLeft: 8, fontSize: 10 }}>
                      NEW
                    </Tag>
                  </Space>
                </Space>
              </Col>

              <Col span={24}>
                <Space direction="vertical" size="small">
                  <Text strong>特殊マーク（小さめ）</Text>
                  <Space wrap>
                    <Tag color="red" style={{ fontSize: 10, margin: 0 }}>
                      Material
                    </Tag>
                    <Tag color="green" style={{ fontSize: 10, margin: 0 }}>
                      Result
                    </Tag>
                    <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>
                      Condition
                    </Tag>
                  </Space>
                </Space>
              </Col>
            </Row>
          </Space>
        </Card>

        {/* Label パターン: Typography.Text */}
        <Card title="Label パターン: Typography.Text" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途:</Text> テキスト表示、ラベル、メッセージ
            </div>

            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text strong>パターン1: 標準テキスト</Text>
                  <Text>これは標準のテキストです（14px、#212121）</Text>
                </Space>
              </Col>

              <Col span={24}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text strong>パターン2: 強調テキスト</Text>
                  <Text strong>これは強調テキストです（font-weight: 600）</Text>
                  <Text strong style={{ fontSize: 16 }}>大きめ強調テキスト（16px）</Text>
                </Space>
              </Col>

              <Col span={24}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text strong>パターン3: セカンダリテキスト</Text>
                  <Text type="secondary">これは補足テキストです（グレー #757575）</Text>
                  <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                    小さめ補足テキスト（12px）
                  </Text>
                </Space>
              </Col>

              <Col span={24}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text strong>パターン4: 三次テキスト</Text>
                  <Text style={{ color: token.colorTextTertiary }}>これはヒントテキストです（薄いグレー #9e9e9e）</Text>
                </Space>
              </Col>

              <Col span={24}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text strong>パターン5: 無効テキスト</Text>
                  <Text disabled>これは無効テキストです（#bdbdbd）</Text>
                </Space>
              </Col>

              <Col span={24}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text strong>パターン6: 危険テキスト</Text>
                  <Text type="danger">これはエラーメッセージです（赤 #d32f2f）</Text>
                </Space>
              </Col>

              <Col span={24}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text strong>パターン7: 成功テキスト</Text>
                  <Text type="success">これは成功メッセージです（緑 #2e7d32）</Text>
                </Space>
              </Col>

              <Col span={24}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text strong>パターン8: 警告テキスト</Text>
                  <Text type="warning">これは警告メッセージです（橙 #ed6c02）</Text>
                </Space>
              </Col>

              <Col span={24}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text strong>パターン9: カスタムカラーテキスト</Text>
                  <Text strong style={{ color: token.colorInfo }}>
                    情報カラーテキスト（青 #0093CF）
                  </Text>
                  <Text strong style={{ color: token.colorPrimary }}>
                    プライマリカラーテキスト（赤 #CF0027）
                  </Text>
                </Space>
              </Col>
            </Row>
          </Space>
        </Card>

        {/* Typography.Title */}
        <Card title="Typography.Title（見出し）" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Title level={1}>H1見出し（38px）</Title>
              </Col>
              <Col span={24}>
                <Title level={2}>H2見出し（30px）</Title>
              </Col>
              <Col span={24}>
                <Title level={3}>H3見出し（24px）</Title>
              </Col>
              <Col span={24}>
                <Title level={4}>H4見出し（20px）</Title>
              </Col>
              <Col span={24}>
                <Title level={5}>H5見出し（16px）</Title>
              </Col>
            </Row>
          </Space>
        </Card>

        {/* Space コンポーネントとの組み合わせ */}
        <Card title="Space コンポーネントとの組み合わせ" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>用途:</Text> ラベルと値の組み合わせ表示
            </div>

            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text strong>横並び配置</Text>
                  <Space>
                    <Text strong>プロジェクト名:</Text>
                    <Text>実験データ分析</Text>
                  </Space>
                  <Space>
                    <Text strong>ステータス:</Text>
                    <Tag color="processing">進行中</Tag>
                  </Space>
                  <Space>
                    <Text strong>担当者:</Text>
                    <Text>田中太郎</Text>
                  </Space>
                </Space>
              </Col>

              <Col span={24}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text strong>縦並び配置</Text>
                  <Space direction="vertical">
                    <Text strong>ファイル名</Text>
                    <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                      experiment_data_2024.maiml
                    </Text>
                  </Space>
                </Space>
              </Col>

              <Col span={24}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text strong>複数Tag組み合わせ</Text>
                  <Space size="small" wrap>
                    <Tag color="processing">進行中</Tag>
                    <Tag color="orange">チェックアウト中</Tag>
                    <Tag color="success">15マッチ</Tag>
                    <Tag color="blue" style={{ fontSize: 11 }}>材料科学</Tag>
                    <Tag color="blue" style={{ fontSize: 11 }}>AI解析</Tag>
                  </Space>
                </Space>
              </Col>
            </Row>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
