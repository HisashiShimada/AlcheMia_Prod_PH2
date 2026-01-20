// frontend/src/components/demo/SwitchPatternsDemo.tsx
// トグルスイッチパターンのデモコンポーネント

'use client';

import React, { useState, useCallback } from 'react';
import {
  Card,
  Space,
  Typography,
  Switch,
  Divider,
  Flex,
  Button,
  Form,
  InputNumber,
  message,
  Modal,
  theme,
  Table,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckOutlined,
  CloseOutlined,
  DownloadOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { useToken } = theme;

interface TableDataType {
  key: string;
  name: string;
  enabled: boolean;
}

const SwitchPatternsDemo: React.FC = () => {
  const { token } = useToken();

  // パターン1: 標準サイズ
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(false);

  // パターン2: 小サイズ
  const [showLabels, setShowLabels] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showMiniMap, setShowMiniMap] = useState(true);

  // 非同期処理
  const [asyncEnabled, setAsyncEnabled] = useState(false);
  const [asyncLoading, setAsyncLoading] = useState(false);

  // 確認ダイアログ付き
  const [confirmEnabled, setConfirmEnabled] = useState(true);

  // Form統合
  const [form] = Form.useForm();
  const autoSaveEnabled = Form.useWatch('autoSave', form);

  // テーブル内のスイッチ
  const [tableData, setTableData] = useState<TableDataType[]>([
    { key: '1', name: '機能A', enabled: true },
    { key: '2', name: '機能B', enabled: false },
    { key: '3', name: '機能C', enabled: true },
  ]);

  // 非同期処理のハンドラ
  const handleAsyncChange = async (checked: boolean) => {
    setAsyncLoading(true);
    try {
      // 非同期処理のシミュレーション
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setAsyncEnabled(checked);
      message.success(`設定を${checked ? '有効' : '無効'}にしました`);
    } catch (error) {
      message.error('設定の更新に失敗しました');
    } finally {
      setAsyncLoading(false);
    }
  };

  // 確認ダイアログのハンドラ
  const handleConfirmChange = (checked: boolean) => {
    if (checked) {
      // ONにする場合は確認なし
      setConfirmEnabled(checked);
    } else {
      // OFFにする場合は確認
      Modal.confirm({
        title: '機能を無効化しますか？',
        content: 'この機能を無効化すると、一部の機能が使用できなくなります。',
        onOk: () => {
          setConfirmEnabled(false);
          message.success('機能を無効化しました');
        },
      });
    }
  };

  // テーブル内のスイッチハンドラ
  const handleTableToggle = useCallback((key: string, checked: boolean) => {
    setTableData((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, enabled: checked } : item
      )
    );
    message.success(`${checked ? '有効' : '無効'}にしました`);
  }, []);

  // テーブルの列定義
  const tableColumns: ColumnsType<TableDataType> = [
    {
      title: '機能名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '有効',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled: boolean, record: TableDataType) => (
        <Switch
          size="small"
          checked={enabled}
          onChange={(checked) => handleTableToggle(record.key, checked)}
        />
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* ヘッダー */}
      <Card>
        <Title level={2}>トグルスイッチパターン</Title>
        <Paragraph>
          MaiML Viewerで使用されるトグルスイッチの標準パターンを示します。
        </Paragraph>
        <Paragraph type="secondary">
          トグルスイッチは、即座に効果が反映される設定や表示切替に使用します。
          フォーム送信が必要な項目にはチェックボックスを使用してください。
        </Paragraph>
      </Card>

      {/* パターン1: 標準サイズ */}
      <Card title="パターン1: 標準サイズ">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Paragraph>
            <Text strong>用途:</Text> 設定画面、一般的な表示切替
            <br />
            <Text strong>スイッチサイズ:</Text> 44px × 22px
            <br />
            <Text strong>テキストサイズ:</Text> 14px
            <br />
            <Text strong>最小高さ:</Text> 32px
          </Paragraph>

          <Divider />
          <Text strong>基本的な使用</Text>

          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {/* ラベル左配置 */}
            <Space align="center">
              <Text>ダークモード</Text>
              <Switch checked={isDarkMode} onChange={setIsDarkMode} />
            </Space>

            {/* 説明文付き */}
            <Space direction="vertical" size="small">
              <Space align="center">
                <Text strong>通知を受け取る</Text>
                <Switch checked={notifications} onChange={setNotifications} />
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>
                新しい通知をメールで受け取ります
              </Text>
            </Space>

            {/* カスタム文字列 */}
            <Space align="center">
              <Text>カスタム表示</Text>
              <Switch
                checked={autoSave}
                onChange={setAutoSave}
                checkedChildren="ON"
                unCheckedChildren="OFF"
              />
            </Space>

            {/* アイコン付き */}
            <Space align="center">
              <Text>アイコン付き</Text>
              <Switch
                checked={autoSave}
                onChange={setAutoSave}
                checkedChildren={<CheckOutlined />}
                unCheckedChildren={<CloseOutlined />}
              />
            </Space>

            {/* 無効状態 */}
            <Space align="center">
              <Text>無効状態（ON）</Text>
              <Switch checked={true} disabled />
            </Space>

            <Space align="center">
              <Text>無効状態（OFF）</Text>
              <Switch checked={false} disabled />
            </Space>
          </Space>

          <Divider />
          <Text strong>設定リストレイアウト</Text>

          <Card size="small">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Flex justify="space-between" align="center">
                <Space direction="vertical" size={0}>
                  <Text strong>グリッド表示</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    背景にグリッドを表示します
                  </Text>
                </Space>
                <Switch checked={showGrid} onChange={setShowGrid} />
              </Flex>

              <Divider style={{ margin: 0 }} />

              <Flex justify="space-between" align="center">
                <Space direction="vertical" size={0}>
                  <Text strong>ミニマップ</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ナビゲーション用のミニマップを表示
                  </Text>
                </Space>
                <Switch checked={showMiniMap} onChange={setShowMiniMap} />
              </Flex>
            </Space>
          </Card>
        </Space>
      </Card>

      {/* パターン2: 小サイズ */}
      <Card title="パターン2: 小サイズ（コンパクト）">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Paragraph>
            <Text strong>用途:</Text> ツールバー、コンパクトな表示エリア、テーブル内
            <br />
            <Text strong>スイッチサイズ:</Text> 28px × 16px
            <br />
            <Text strong>テキストサイズ:</Text> 12px
            <br />
            <Text strong>最小高さ:</Text> 24px
          </Paragraph>

          <Divider />
          <Text strong>ツールバー内での使用</Text>

          <Card size="small" style={{ backgroundColor: token.colorBgLayout }}>
            <Space size="small" align="center" wrap>
              <Button icon={<DownloadOutlined />} size="small">
                エクスポート
              </Button>

              <Divider type="vertical" />

              <Text type="secondary" style={{ fontSize: 12 }}>
                ラベル
              </Text>
              <Switch size="small" checked={showLabels} onChange={setShowLabels} />

              <Text type="secondary" style={{ fontSize: 12 }}>
                グリッド
              </Text>
              <Switch size="small" checked={showGrid} onChange={setShowGrid} />

              <Text type="secondary" style={{ fontSize: 12 }}>
                ミニマップ
              </Text>
              <Switch size="small" checked={showMiniMap} onChange={setShowMiniMap} />
            </Space>
          </Card>

          <Divider />
          <Text strong>テーブル内での使用</Text>

          <Table
            columns={tableColumns}
            dataSource={tableData}
            pagination={false}
            size="small"
          />
        </Space>
      </Card>

      {/* 非同期処理との統合 */}
      <Card title="非同期処理との統合">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Paragraph>
            サーバーと通信が必要な場合は、loading状態を表示します。
          </Paragraph>

          <Space align="center">
            <Text>API連携設定</Text>
            <Switch
              checked={asyncEnabled}
              loading={asyncLoading}
              onChange={handleAsyncChange}
            />
          </Space>

          <Paragraph type="secondary" style={{ fontSize: 12 }}>
            スイッチをクリックすると、1秒後に状態が変更されます。
          </Paragraph>
        </Space>
      </Card>

      {/* 確認ダイアログ付き */}
      <Card title="確認ダイアログ付き">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Paragraph>
            重要な設定をOFFにする際に、確認ダイアログを表示できます。
          </Paragraph>

          <Space align="center">
            <Text>重要な機能</Text>
            <Switch checked={confirmEnabled} onChange={handleConfirmChange} />
          </Space>

          <Paragraph type="secondary" style={{ fontSize: 12 }}>
            OFFにする際に確認ダイアログが表示されます。
          </Paragraph>
        </Space>
      </Card>

      {/* Form統合 */}
      <Card title="Formとの統合">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Paragraph>
            Ant Design FormコンポーネントとSwitchを統合できます。
          </Paragraph>

          <Form
            form={form}
            layout="vertical"
            initialValues={{
              autoSave: false,
              saveInterval: 30,
            }}
            onFinish={(values) => {
              message.success('設定を保存しました: ' + JSON.stringify(values));
            }}
          >
            <Form.Item
              name="autoSave"
              label="自動保存"
              valuePropName="checked"
              tooltip="編集内容を自動的に保存します"
            >
              <Switch />
            </Form.Item>

            {autoSaveEnabled && (
              <Form.Item
                name="saveInterval"
                label="保存間隔（秒）"
                rules={[
                  { required: true, message: '保存間隔を入力してください' },
                ]}
              >
                <InputNumber min={10} max={300} style={{ width: 200 }} />
              </Form.Item>
            )}

            <Form.Item>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>

      {/* チェックボックスとの使い分け */}
      <Card title="チェックボックスとの使い分け">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Paragraph>
            <Text strong>トグルスイッチを使用すべき場合:</Text>
          </Paragraph>
          <ul>
            <li>即座に効果が反映される設定</li>
            <li>物理的なスイッチのような ON/OFF の概念が明確</li>
            <li>システム設定やアプリの動作を制御</li>
            <li>保存ボタン不要なリアルタイム更新</li>
          </ul>

          <Paragraph>
            <Text strong>チェックボックスを使用すべき場合:</Text>
          </Paragraph>
          <ul>
            <li>フォーム送信で一括反映する項目</li>
            <li>グループ内で複数選択が可能</li>
            <li>リスト項目の選択/解除</li>
            <li>ユーザーの明示的な同意（利用規約など）</li>
          </ul>

          <Divider />

          <Paragraph type="secondary">
            <Text strong>例:</Text>
            <br />
            ✅ トグルスイッチ: ダークモード切り替え、表示オプション、プレビューモード
            <br />
            ❌ チェックボックス: アンケート回答、ファイル選択、利用規約への同意
          </Paragraph>
        </Space>
      </Card>

      {/* 注意事項 */}
      <Card title="実装時の注意事項">
        <Space direction="vertical" size="small">
          <Paragraph>
            <Text strong>DO（推奨）:</Text>
          </Paragraph>
          <ul>
            <li>即座に効果が反映される設定にトグルスイッチを使用する</li>
            <li>明確なラベルテキストを設定する</li>
            <li>ツールバーやコンパクトなエリアでは小サイズを使用する</li>
            <li>非同期処理では loading 状態を表示する</li>
            <li>アクセシビリティを考慮する（aria-label等）</li>
          </ul>

          <Paragraph>
            <Text strong>DON'T（非推奨）:</Text>
          </Paragraph>
          <ul>
            <li>フォーム送信が必要な項目にトグルスイッチを使用しない</li>
            <li>複数選択にトグルスイッチを使用しない</li>
            <li>ラベルなしのトグルスイッチを作成しない</li>
            <li>重要な確認なしに危険な操作をトグルスイッチで実行しない</li>
            <li>標準サイズと小サイズを同じエリアに混在させない</li>
          </ul>
        </Space>
      </Card>
    </Space>
  );
};

export default SwitchPatternsDemo;
