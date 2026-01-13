'use client';

import React, { useState } from 'react';
import {
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  Checkbox,
  Radio,
  Space,
  Card,
  Divider,
  Typography,
  message,
  Modal,
  Drawer,
  Row,
  Col,
  InputNumber,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SearchOutlined,
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

/**
 * フォーム管理パターンのデモコンポーネント
 * form_policy.md に基づいた実装例
 */
const FormPatternsDemo: React.FC = () => {
  const [form1] = Form.useForm();
  const [form2] = Form.useForm();
  const [form3] = Form.useForm();
  const [form4] = Form.useForm();
  const [drawerForm] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // パターン1: 基本フォーム - 送信処理
  const onFinishPattern1 = (values: Record<string, unknown>) => {
    console.log('Pattern 1 Success:', values);
    message.success('フォームを送信しました');
  };

  const onFinishFailedPattern1 = () => {
    message.error('入力内容に誤りがあります');
  };

  // パターン2: コンパクトフォーム - 送信処理
  const onFinishPattern2 = (values: Record<string, unknown>) => {
    console.log('Pattern 2 Success:', values);
    message.success('ユーザーを追加しました');
    setModalVisible(false);
    form2.resetFields();
  };

  // パターン3: 縦配置フォーム - 送信処理
  const onFinishPattern3 = (values: Record<string, unknown>) => {
    console.log('Pattern 3 Success:', values);
    message.success('ログインしました');
  };

  // パターン4: インラインフォーム - 送信処理
  const onFinishPattern4 = (values: Record<string, unknown>) => {
    console.log('Pattern 4 Success:', values);
    message.info(`検索条件: ${JSON.stringify(values)}`);
  };

  // ドロワーフォーム - 送信処理
  const onFinishDrawer = (values: Record<string, unknown>) => {
    console.log('Drawer Success:', values);
    message.success('設定を保存しました');
    setDrawerVisible(false);
    drawerForm.resetFields();
  };

  // バリデーション状態のデモ
  const [validationForm] = Form.useForm();

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Title level={2}>フォーム管理パターン</Title>
      <Paragraph>
        form_policy.md に基づいた4つの標準パターンと、様々な使用例を示します。
      </Paragraph>

      <Divider />

      {/* ==================== パターン1: 基本フォーム ==================== */}
      <Card title="パターン1: 基本フォーム" style={{ marginBottom: 24 }}>
        <Paragraph>
          <Text strong>用途:</Text> 一般的な入力フォーム、登録・編集画面
          <br />
          <Text strong>レイアウト:</Text> labelCol: 6, wrapperCol: 18 (ラベル幅25%)
          <br />
          <Text strong>特徴:</Text> 標準的で読みやすいレイアウト
        </Paragraph>

        <Form
          form={form1}
          name="pattern1"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          layout="horizontal"
          onFinish={onFinishPattern1}
          onFinishFailed={onFinishFailedPattern1}
          initialValues={{
            gender: 'male',
            newsletter: true,
          }}
          style={{ maxWidth: 800 }}
        >
          <Form.Item
            label="ユーザー名"
            name="username"
            rules={[
              { required: true, message: 'ユーザー名を入力してください' },
              { min: 3, message: '3文字以上で入力してください' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="ユーザー名を入力" />
          </Form.Item>

          <Form.Item
            label="メールアドレス"
            name="email"
            rules={[
              { required: true, message: 'メールアドレスを入力してください' },
              { type: 'email', message: '有効なメールアドレスを入力してください' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="example@example.com" />
          </Form.Item>

          <Form.Item
            label="電話番号"
            name="phone"
            rules={[
              { pattern: /^[0-9-]+$/, message: '数字とハイフンのみ入力してください' },
            ]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="090-1234-5678" />
          </Form.Item>

          <Form.Item
            label="性別"
            name="gender"
            rules={[{ required: true, message: '性別を選択してください' }]}
          >
            <Radio.Group>
              <Radio value="male">男性</Radio>
              <Radio value="female">女性</Radio>
              <Radio value="other">その他</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="生年月日"
            name="birthday"
            rules={[{ required: true, message: '生年月日を選択してください' }]}
          >
            <DatePicker style={{ width: 200 }} placeholder="日付を選択" />
          </Form.Item>

          <Form.Item label="自己紹介" name="bio">
            <TextArea rows={4} placeholder="自己紹介を入力してください" />
          </Form.Item>

          <Form.Item
            name="newsletter"
            valuePropName="checked"
            wrapperCol={{ offset: 6, span: 18 }}
          >
            <Checkbox>ニュースレターを受け取る</Checkbox>
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
            <Space>
              <Button onClick={() => form1.resetFields()}>リセット</Button>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* ==================== パターン2: コンパクトフォーム ==================== */}
      <Card title="パターン2: コンパクトフォーム" style={{ marginBottom: 24 }}>
        <Paragraph>
          <Text strong>用途:</Text> モーダル内、ドロワー内、画面幅が狭い場合
          <br />
          <Text strong>レイアウト:</Text> labelCol: 8, wrapperCol: 16 (ラベル幅33%)
          <br />
          <Text strong>特徴:</Text> ラベル幅を広げて入力フィールドとのバランスを保つ
        </Paragraph>

        <Button type="primary" onClick={() => setModalVisible(true)}>
          モーダルを開く
        </Button>

        <Modal
          title="ユーザー追加"
          open={modalVisible}
          onCancel={() => {
            setModalVisible(false);
            form2.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form
            form={form2}
            name="pattern2"
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
            layout="horizontal"
            onFinish={onFinishPattern2}
          >
            <Form.Item
              label="ユーザー名"
              name="username"
              rules={[{ required: true, message: 'ユーザー名を入力してください' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="メールアドレス"
              name="email"
              rules={[
                { required: true, message: 'メールアドレスを入力してください' },
                { type: 'email', message: '有効なメールアドレスを入力してください' },
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              label="部署"
              name="department"
              rules={[{ required: true, message: '部署を選択してください' }]}
            >
              <Select placeholder="部署を選択" style={{ width: '100%' }}>
                <Option value="engineering">エンジニアリング</Option>
                <Option value="sales">営業</Option>
                <Option value="marketing">マーケティング</Option>
                <Option value="hr">人事</Option>
              </Select>
            </Form.Item>

            <Form.Item label="役職" name="position">
              <Input />
            </Form.Item>

            <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
              <Space>
                <Button
                  onClick={() => {
                    setModalVisible(false);
                    form2.resetFields();
                  }}
                >
                  キャンセル
                </Button>
                <Button type="primary" htmlType="submit">
                  追加
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Card>

      {/* ==================== パターン3: 縦配置フォーム ==================== */}
      <Card title="パターン3: 縦配置フォーム" style={{ marginBottom: 24 }}>
        <Paragraph>
          <Text strong>用途:</Text> モバイル表示、シンプルなフォーム、ログイン画面
          <br />
          <Text strong>レイアウト:</Text> layout: vertical
          <br />
          <Text strong>特徴:</Text> レスポンシブデザインに最適、視覚的に分かりやすい
        </Paragraph>

        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Card title="ログインフォーム" type="inner">
              <Form
                form={form3}
                name="pattern3"
                layout="vertical"
                onFinish={onFinishPattern3}
                style={{ maxWidth: 400 }}
              >
                <Form.Item
                  label="ユーザー名"
                  name="username"
                  rules={[{ required: true, message: 'ユーザー名を入力してください' }]}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="ユーザー名"
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label="パスワード"
                  name="password"
                  rules={[{ required: true, message: 'パスワードを入力してください' }]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="パスワード"
                    size="large"
                  />
                </Form.Item>

                <Form.Item name="remember" valuePropName="checked">
                  <Checkbox>ログイン状態を保持する</Checkbox>
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" block size="large">
                    ログイン
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="モバイル向けフォーム" type="inner">
              <Paragraph type="secondary" style={{ fontSize: 12 }}>
                画面幅を狭くすると、このレイアウトが自動的に適用されます
              </Paragraph>
              <Form layout="vertical" style={{ maxWidth: 400 }}>
                <Form.Item label="お名前" required>
                  <Input placeholder="山田 太郎" />
                </Form.Item>
                <Form.Item label="メールアドレス" required>
                  <Input placeholder="yamada@example.com" />
                </Form.Item>
                <Form.Item label="お問い合わせ内容" required>
                  <TextArea rows={4} placeholder="お問い合わせ内容を入力" />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" block>
                    送信
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* ==================== パターン4: インラインフォーム ==================== */}
      <Card title="パターン4: インラインフォーム" style={{ marginBottom: 24 }}>
        <Paragraph>
          <Text strong>用途:</Text> 検索フォーム、フィルター、ツールバー
          <br />
          <Text strong>レイアウト:</Text> layout: inline
          <br />
          <Text strong>特徴:</Text> 横並びで複数の入力を配置、コンパクトに表示
        </Paragraph>

        <Card title="検索フィルター" type="inner" style={{ marginBottom: 16 }}>
          <Form
            form={form4}
            name="pattern4"
            layout="inline"
            onFinish={onFinishPattern4}
          >
            <Form.Item name="keyword" label="キーワード">
              <Input
                placeholder="検索..."
                prefix={<SearchOutlined />}
                style={{ width: 200 }}
                allowClear
              />
            </Form.Item>

            <Form.Item name="category" label="カテゴリ">
              <Select placeholder="選択" style={{ width: 150 }} allowClear>
                <Option value="all">すべて</Option>
                <Option value="tech">技術</Option>
                <Option value="business">ビジネス</Option>
                <Option value="other">その他</Option>
              </Select>
            </Form.Item>

            <Form.Item name="status" label="ステータス">
              <Select placeholder="選択" style={{ width: 150 }} allowClear>
                <Option value="active">有効</Option>
                <Option value="inactive">無効</Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  検索
                </Button>
                <Button onClick={() => form4.resetFields()}>リセット</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        <Card title="ツールバー" type="inner">
          <Form layout="inline">
            <Form.Item>
              <Input
                placeholder="ユーザー名で検索"
                prefix={<SearchOutlined />}
                style={{ width: 200 }}
              />
            </Form.Item>
            <Form.Item>
              <Button type="primary">新規作成</Button>
            </Form.Item>
            <Form.Item>
              <Button>エクスポート</Button>
            </Form.Item>
          </Form>
        </Card>
      </Card>

      {/* ==================== ドロワー内フォーム ==================== */}
      <Card title="ドロワー内フォーム" style={{ marginBottom: 24 }}>
        <Paragraph>
          <Text strong>用途:</Text> サイドから表示される設定画面
          <br />
          <Text strong>推奨パターン:</Text> パターン2（コンパクトフォーム）
        </Paragraph>

        <Button type="primary" onClick={() => setDrawerVisible(true)}>
          設定を開く
        </Button>

        <Drawer
          title="ユーザー設定"
          placement="right"
          width={500}
          onClose={() => {
            setDrawerVisible(false);
            drawerForm.resetFields();
          }}
          open={drawerVisible}
        >
          <Form
            form={drawerForm}
            name="drawerForm"
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
            layout="horizontal"
            onFinish={onFinishDrawer}
          >
            <Form.Item
              label="表示名"
              name="displayName"
              rules={[{ required: true, message: '表示名を入力してください' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item label="言語" name="language">
              <Select placeholder="言語を選択">
                <Option value="ja">日本語</Option>
                <Option value="en">English</Option>
              </Select>
            </Form.Item>

            <Form.Item label="タイムゾーン" name="timezone">
              <Select placeholder="タイムゾーンを選択">
                <Option value="Asia/Tokyo">Asia/Tokyo</Option>
                <Option value="America/New_York">America/New_York</Option>
                <Option value="Europe/London">Europe/London</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="notifications"
              valuePropName="checked"
              wrapperCol={{ offset: 8, span: 16 }}
            >
              <Checkbox>通知を受け取る</Checkbox>
            </Form.Item>

            <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
              <Space>
                <Button
                  onClick={() => {
                    setDrawerVisible(false);
                    drawerForm.resetFields();
                  }}
                >
                  キャンセル
                </Button>
                <Button type="primary" htmlType="submit">
                  保存
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Drawer>
      </Card>

      {/* ==================== バリデーション状態 ==================== */}
      <Card title="バリデーション状態のデモ" style={{ marginBottom: 24 }}>
        <Paragraph>
          エラー、警告、成功の各状態を表示します。
        </Paragraph>

        <Form
          form={validationForm}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          style={{ maxWidth: 800 }}
        >
          <Form.Item
            label="エラー状態"
            validateStatus="error"
            help="この項目は必須です"
          >
            <Input placeholder="必須項目" />
          </Form.Item>

          <Form.Item
            label="警告状態"
            validateStatus="warning"
            help="この値は推奨されません"
          >
            <Input placeholder="警告あり" defaultValue="warning" />
          </Form.Item>

          <Form.Item
            label="成功状態"
            validateStatus="success"
            hasFeedback
          >
            <Input placeholder="正しい入力" defaultValue="success" />
          </Form.Item>

          <Form.Item
            label="検証中"
            validateStatus="validating"
            hasFeedback
            help="入力内容を検証しています..."
          >
            <Input placeholder="検証中" defaultValue="validating" />
          </Form.Item>

          <Form.Item label="フィードバック付き" hasFeedback validateStatus="success">
            <Input placeholder="アイコン付き" defaultValue="success" />
          </Form.Item>

          <Form.Item
            label="カスタムヘルプ"
            help={
              <span>
                パスワードは8文字以上、大文字・小文字・数字を含む必要があります
              </span>
            }
          >
            <Input.Password placeholder="パスワード" />
          </Form.Item>
        </Form>
      </Card>

      {/* ==================== 複雑なフォーム例 ==================== */}
      <Card title="複雑なフォーム例" style={{ marginBottom: 24 }}>
        <Paragraph>
          複数の入力タイプを組み合わせた実践的なフォームです。
        </Paragraph>

        <Form
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          layout="horizontal"
          style={{ maxWidth: 800 }}
        >
          <Divider orientation="left">基本情報</Divider>

          <Form.Item label="会社名" required>
            <Input placeholder="株式会社〇〇" />
          </Form.Item>

          <Form.Item label="業種">
            <Select placeholder="業種を選択">
              <Option value="it">IT・通信</Option>
              <Option value="manufacturing">製造業</Option>
              <Option value="retail">小売業</Option>
              <Option value="service">サービス業</Option>
            </Select>
          </Form.Item>

          <Form.Item label="従業員数">
            <InputNumber
              min={1}
              max={10000}
              style={{ width: 150 }}
              placeholder="人数"
            />
          </Form.Item>

          <Divider orientation="left">連絡先情報</Divider>

          <Form.Item label="担当者名" required>
            <Input placeholder="山田 太郎" />
          </Form.Item>

          <Form.Item label="メールアドレス" required>
            <Input placeholder="yamada@example.com" />
          </Form.Item>

          <Form.Item label="電話番号">
            <Input placeholder="03-1234-5678" />
          </Form.Item>

          <Divider orientation="left">その他</Divider>

          <Form.Item label="お問い合わせ内容">
            <TextArea rows={4} placeholder="お問い合わせ内容を入力してください" />
          </Form.Item>

          <Form.Item
            name="agree"
            valuePropName="checked"
            wrapperCol={{ offset: 6, span: 18 }}
            rules={[
              {
                validator: (_, value) =>
                  value
                    ? Promise.resolve()
                    : Promise.reject(new Error('同意が必要です')),
              },
            ]}
          >
            <Checkbox>
              <a href="#">利用規約</a>に同意する
            </Checkbox>
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
            <Space>
              <Button>キャンセル</Button>
              <Button type="primary" htmlType="submit">
                送信
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* ==================== 実装コード例 ==================== */}
      <Card title="実装コード例" style={{ marginBottom: 24 }}>
        <Paragraph>
          <Text strong>基本フォーム（パターン1）</Text>
        </Paragraph>
        <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
          {`<Form
  labelCol={{ span: 6 }}
  wrapperCol={{ span: 18 }}
  layout="horizontal"
  onFinish={onFinish}
  initialValues={{ remember: true }}
>
  <Form.Item
    label="ユーザー名"
    name="username"
    rules={[
      { required: true, message: 'ユーザー名を入力してください' }
    ]}
  >
    <Input />
  </Form.Item>

  <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
    <Space>
      <Button onClick={onCancel}>キャンセル</Button>
      <Button type="primary" htmlType="submit">保存</Button>
    </Space>
  </Form.Item>
</Form>`}
        </pre>

        <Paragraph style={{ marginTop: 24 }}>
          <Text strong>縦配置フォーム（パターン3）</Text>
        </Paragraph>
        <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8 }}>
          {`<Form layout="vertical" onFinish={onFinish}>
  <Form.Item
    label="ユーザー名"
    name="username"
    rules={[{ required: true }]}
  >
    <Input size="large" />
  </Form.Item>

  <Form.Item>
    <Button type="primary" htmlType="submit" block>
      ログイン
    </Button>
  </Form.Item>
</Form>`}
        </pre>
      </Card>
    </div>
  );
};

export default FormPatternsDemo;
