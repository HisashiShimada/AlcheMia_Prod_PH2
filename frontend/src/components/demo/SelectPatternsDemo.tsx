'use client';

import React, { useState } from 'react';
import {
  Card,
  Select,
  Space,
  Typography,
  Divider,
  Form,
  TreeSelect,
  Cascader,
  AutoComplete,
  Alert,
  Row,
  Col,
} from 'antd';

const { Title, Text, Paragraph } = Typography;

export default function SelectPatternsDemo() {
  // パターン1: 標準セレクト（150px固定）
  const [pattern1Value, setPattern1Value] = useState<string | undefined>(undefined);
  const [pattern1Disabled, setPattern1Disabled] = useState(false);

  // パターン2: 中型セレクト（200px固定）
  const [pattern2Value, setPattern2Value] = useState<string | undefined>(undefined);

  // パターン3: フルワイド（100%）
  const [pattern3Value, setPattern3Value] = useState<string | undefined>(undefined);

  // 複数選択
  const [multipleValue, setMultipleValue] = useState<string[]>([]);

  // タグ選択
  const [tagsValue, setTagsValue] = useState<string[]>([]);

  // 検索可能セレクト
  const [searchableValue, setSearchableValue] = useState<string | undefined>(undefined);

  // TreeSelect
  const [treeSelectValue, setTreeSelectValue] = useState<string | undefined>(undefined);

  // Cascader
  const [cascaderValue, setCascaderValue] = useState<string[] | undefined>(undefined);

  // AutoComplete
  const [autoCompleteValue, setAutoCompleteValue] = useState<string>('');

  // Large Size
  const [largeValue, setLargeValue] = useState<string | undefined>(undefined);

  // 選択肢データ
  const shortOptions = [
    { value: 'option1', label: 'オプション1' },
    { value: 'option2', label: 'オプション2' },
    { value: 'option3', label: 'オプション3' },
  ];

  const statusOptions = [
    { value: 'all', label: 'すべて' },
    { value: 'planning', label: '計画中' },
    { value: 'in_progress', label: '進行中' },
    { value: 'completed', label: '完了' },
  ];

  const workerOptions = [
    { value: 'worker1', label: '山田太郎 (worker1)' },
    { value: 'worker2', label: '佐藤花子 (worker2)' },
    { value: 'worker3', label: '鈴木一郎 (worker3)' },
    { value: 'worker4', label: '田中次郎 (worker4)' },
  ];

  const memberOptions = [
    { value: 'member1', label: '山田太郎' },
    { value: 'member2', label: '佐藤花子' },
    { value: 'member3', label: '鈴木一郎' },
    { value: 'member4', label: '田中次郎' },
    { value: 'member5', label: '高橋三郎' },
  ];

  const searchableOptions = Array.from({ length: 20 }, (_, i) => ({
    value: `item${i + 1}`,
    label: `アイテム ${i + 1}`,
  }));

  // TreeSelectデータ
  const treeData = [
    {
      title: 'プロジェクトA',
      value: 'project-a',
      children: [
        { title: 'フォルダ1', value: 'project-a-folder1' },
        { title: 'フォルダ2', value: 'project-a-folder2' },
      ],
    },
    {
      title: 'プロジェクトB',
      value: 'project-b',
      children: [
        { title: 'フォルダ3', value: 'project-b-folder3' },
        { title: 'フォルダ4', value: 'project-b-folder4' },
      ],
    },
  ];

  // Cascaderデータ
  const cascaderOptions = [
    {
      value: 'tokyo',
      label: '東京都',
      children: [
        { value: 'chiyoda', label: '千代田区' },
        { value: 'chuo', label: '中央区' },
        { value: 'minato', label: '港区' },
      ],
    },
    {
      value: 'osaka',
      label: '大阪府',
      children: [
        { value: 'osaka-city', label: '大阪市' },
        { value: 'sakai', label: '堺市' },
      ],
    },
  ];

  // AutoCompleteデータ
  const autoCompleteOptions = [
    { value: '東京都千代田区' },
    { value: '東京都中央区' },
    { value: '東京都港区' },
    { value: '大阪府大阪市' },
    { value: '大阪府堺市' },
  ];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <Title level={2}>セレクト形状パターン デモ</Title>
      <Paragraph>
        MaiML Viewerで使用するセレクト（Select）の全パターンを表示します。
      </Paragraph>

      <Alert
        message="ポリシードキュメント"
        description="詳細な仕様は docs/design/ui/select_policy.md を参照してください。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* 標準3パターン */}
      <Card title="標準3パターン" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* パターン1: 標準セレクト（150px固定） */}
          <div>
            <Title level={5}>パターン1: 標準セレクト（150px固定）</Title>
            <Paragraph type="secondary">
              用途: フィルター・絞込（短い選択肢）
            </Paragraph>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text strong>基本形</Text>
                  <div style={{ marginTop: 8 }}>
                    <Select
                      style={{ width: 150 }}
                      value={pattern1Value}
                      onChange={setPattern1Value}
                      options={shortOptions}
                      placeholder="選択してください"
                      allowClear
                    />
                  </div>
                  <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                    幅: 150px固定、allowClear: true
                  </Paragraph>
                </Col>
                <Col span={12}>
                  <Text strong>無効状態</Text>
                  <div style={{ marginTop: 8 }}>
                    <Select
                      style={{ width: 150 }}
                      value="option1"
                      options={shortOptions}
                      placeholder="選択してください"
                      disabled
                    />
                  </div>
                  <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                    disabled: true
                  </Paragraph>
                </Col>
              </Row>
            </Space>
          </div>

          <Divider />

          {/* パターン2: 中型セレクト（200px固定） */}
          <div>
            <Title level={5}>パターン2: 中型セレクト（200px固定）</Title>
            <Paragraph type="secondary">
              用途: フィルター・絞込（やや長い選択肢）
            </Paragraph>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text strong>基本形</Text>
                  <div style={{ marginTop: 8 }}>
                    <Select
                      style={{ width: 200 }}
                      value={pattern2Value}
                      onChange={setPattern2Value}
                      options={statusOptions}
                      placeholder="ステータスを選択"
                      allowClear
                    />
                  </div>
                  <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                    幅: 200px固定、allowClear: true
                  </Paragraph>
                </Col>
                <Col span={12}>
                  <Text strong>無効状態</Text>
                  <div style={{ marginTop: 8 }}>
                    <Select
                      style={{ width: 200 }}
                      value="planning"
                      options={statusOptions}
                      placeholder="ステータスを選択"
                      disabled
                    />
                  </div>
                  <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                    disabled: true
                  </Paragraph>
                </Col>
              </Row>
            </Space>
          </div>

          <Divider />

          {/* パターン3: フルワイド（100%） */}
          <div>
            <Title level={5}>パターン3: フルワイド（100%）</Title>
            <Paragraph type="secondary">
              用途: フォーム入力・選択項目
            </Paragraph>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Text strong>基本形</Text>
                  <div style={{ marginTop: 8 }}>
                    <Select
                      style={{ width: '100%' }}
                      value={pattern3Value}
                      onChange={setPattern3Value}
                      options={workerOptions}
                      placeholder="作業者を選択してください"
                      allowClear
                    />
                  </div>
                  <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                    幅: 100%（親要素に合わせる）、allowClear: true
                  </Paragraph>
                </Col>
                <Col span={12}>
                  <Text strong>無効状態</Text>
                  <div style={{ marginTop: 8 }}>
                    <Select
                      style={{ width: '100%' }}
                      value="worker1"
                      options={workerOptions}
                      placeholder="作業者を選択してください"
                      disabled
                    />
                  </div>
                  <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                    disabled: true
                  </Paragraph>
                </Col>
              </Row>
            </Space>
          </div>
        </Space>
      </Card>

      {/* 除外されたパターン */}
      <Card title="除外されたパターン（標準パターンのバリエーション）" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 複数選択 */}
          <div>
            <Title level={5}>複数選択（mode="multiple"）</Title>
            <Paragraph type="secondary">
              対応: パターン3（フルワイド）の変種
            </Paragraph>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>基本形</Text>
                <div style={{ marginTop: 8 }}>
                  <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    value={multipleValue}
                    onChange={setMultipleValue}
                    options={memberOptions}
                    placeholder="メンバーを選択してください"
                    maxTagCount={3}
                    maxTagPlaceholder={(omittedValues) => `+${omittedValues.length}`}
                    allowClear
                  />
                </div>
                <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                  mode: &quot;multiple&quot;、maxTagCount: 3
                </Paragraph>
              </Col>
              <Col span={12}>
                <Text strong>無効状態</Text>
                <div style={{ marginTop: 8 }}>
                  <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    value={['member1', 'member2']}
                    options={memberOptions}
                    placeholder="メンバーを選択してください"
                    disabled
                  />
                </div>
                <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                  disabled: true
                </Paragraph>
              </Col>
            </Row>
          </div>

          <Divider />

          {/* タグ選択 */}
          <div>
            <Title level={5}>タグ選択（mode="tags"）</Title>
            <Paragraph type="secondary">
              対応: パターン3（フルワイド）の変種
            </Paragraph>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>基本形（自由入力可能）</Text>
                <div style={{ marginTop: 8 }}>
                  <Select
                    mode="tags"
                    style={{ width: '100%' }}
                    value={tagsValue}
                    onChange={setTagsValue}
                    placeholder="タグを入力してください（Enter で確定）"
                    allowClear
                  />
                </div>
                <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                  mode: &quot;tags&quot;、任意の文字列を入力可能
                </Paragraph>
              </Col>
              <Col span={12}>
                <Text strong>無効状態</Text>
                <div style={{ marginTop: 8 }}>
                  <Select
                    mode="tags"
                    style={{ width: '100%' }}
                    value={['タグ1', 'タグ2']}
                    placeholder="タグを入力してください"
                    disabled
                  />
                </div>
                <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                  disabled: true
                </Paragraph>
              </Col>
            </Row>
          </div>

          <Divider />

          {/* 検索可能セレクト */}
          <div>
            <Title level={5}>検索可能セレクト（showSearch）</Title>
            <Paragraph type="secondary">
              対応: パターン1〜3に検索機能を追加
            </Paragraph>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>基本形（200px固定）</Text>
                <div style={{ marginTop: 8 }}>
                  <Select
                    style={{ width: 200 }}
                    value={searchableValue}
                    onChange={setSearchableValue}
                    options={searchableOptions}
                    placeholder="アイテムを選択..."
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    allowClear
                  />
                </div>
                <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                  showSearch: true、選択肢が多い場合（10個以上）に使用
                </Paragraph>
              </Col>
              <Col span={12}>
                <Text strong>無効状態</Text>
                <div style={{ marginTop: 8 }}>
                  <Select
                    style={{ width: 200 }}
                    value="item1"
                    options={searchableOptions}
                    placeholder="アイテムを選択..."
                    showSearch
                    disabled
                  />
                </div>
                <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                  disabled: true
                </Paragraph>
              </Col>
            </Row>
          </div>

          <Divider />

          {/* TreeSelect */}
          <div>
            <Title level={5}>TreeSelect（ツリー構造選択）</Title>
            <Paragraph type="secondary">
              対応: パターン3（フルワイド）の変種
            </Paragraph>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>基本形</Text>
                <div style={{ marginTop: 8 }}>
                  <TreeSelect
                    style={{ width: '100%' }}
                    value={treeSelectValue}
                    onChange={setTreeSelectValue}
                    treeData={treeData}
                    placeholder="フォルダを選択してください"
                    allowClear
                  />
                </div>
                <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                  ツリー構造の選択肢、階層的なデータ構造に使用
                </Paragraph>
              </Col>
              <Col span={12}>
                <Text strong>無効状態</Text>
                <div style={{ marginTop: 8 }}>
                  <TreeSelect
                    style={{ width: '100%' }}
                    value="project-a-folder1"
                    treeData={treeData}
                    placeholder="フォルダを選択してください"
                    disabled
                  />
                </div>
                <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                  disabled: true
                </Paragraph>
              </Col>
            </Row>
          </div>

          <Divider />

          {/* Cascader */}
          <div>
            <Title level={5}>Cascader（カスケード選択）</Title>
            <Paragraph type="secondary">
              対応: パターン2（200px固定）の変種
            </Paragraph>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>基本形（300px固定）</Text>
                <div style={{ marginTop: 8 }}>
                  <Cascader
                    style={{ width: 300 }}
                    value={cascaderValue}
                    onChange={setCascaderValue}
                    options={cascaderOptions}
                    placeholder="地域を選択してください"
                    allowClear
                  />
                </div>
                <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                  段階的に選択肢が展開、地域選択やカテゴリ選択に使用
                </Paragraph>
              </Col>
              <Col span={12}>
                <Text strong>無効状態</Text>
                <div style={{ marginTop: 8 }}>
                  <Cascader
                    style={{ width: 300 }}
                    value={['tokyo', 'chiyoda']}
                    options={cascaderOptions}
                    placeholder="地域を選択してください"
                    disabled
                  />
                </div>
                <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                  disabled: true
                </Paragraph>
              </Col>
            </Row>
          </div>

          <Divider />

          {/* AutoComplete */}
          <div>
            <Title level={5}>AutoComplete（自動補完）</Title>
            <Paragraph type="secondary">
              対応: パターン3（フルワイド）とInputの中間
            </Paragraph>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>基本形</Text>
                <div style={{ marginTop: 8 }}>
                  <AutoComplete
                    style={{ width: '100%' }}
                    value={autoCompleteValue}
                    onChange={setAutoCompleteValue}
                    options={autoCompleteOptions}
                    placeholder="住所を入力してください"
                    allowClear
                  />
                </div>
                <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                  入力と同時に候補を表示、検索サジェストや住所入力に使用
                </Paragraph>
              </Col>
              <Col span={12}>
                <Text strong>無効状態</Text>
                <div style={{ marginTop: 8 }}>
                  <AutoComplete
                    style={{ width: '100%' }}
                    value="東京都千代田区"
                    options={autoCompleteOptions}
                    placeholder="住所を入力してください"
                    disabled
                  />
                </div>
                <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                  disabled: true
                </Paragraph>
              </Col>
            </Row>
          </div>

          <Divider />

          {/* 大型セレクト */}
          <div>
            <Title level={5}>大型セレクト（Large Size）</Title>
            <Paragraph type="secondary">
              対応: パターン1〜3の大型版
            </Paragraph>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text strong>基本形（150px固定）</Text>
                <div style={{ marginTop: 8 }}>
                  <Select
                    size="large"
                    style={{ width: 150 }}
                    value={largeValue}
                    onChange={setLargeValue}
                    options={shortOptions}
                    placeholder="選択してください"
                    allowClear
                  />
                </div>
                <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                  size: &quot;large&quot;、高さ: 40px、フォント: 16px
                </Paragraph>
              </Col>
              <Col span={12}>
                <Text strong>無効状態</Text>
                <div style={{ marginTop: 8 }}>
                  <Select
                    size="large"
                    style={{ width: 150 }}
                    value="option1"
                    options={shortOptions}
                    placeholder="選択してください"
                    disabled
                  />
                </div>
                <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                  disabled: true
                </Paragraph>
              </Col>
            </Row>
          </div>
        </Space>
      </Card>

      {/* フォーム内での使用例 */}
      <Card title="フォーム内での使用例" style={{ marginBottom: 24 }}>
        <Form layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="作業者"
                name="workerId"
                rules={[{ required: true, message: '作業者を選択してください' }]}
              >
                <Select
                  style={{ width: '100%' }}
                  placeholder="作業者を選択してください"
                  options={workerOptions}
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="ステータス"
                name="status"
                rules={[{ required: true, message: 'ステータスを選択してください' }]}
              >
                <Select
                  style={{ width: '100%' }}
                  placeholder="ステータスを選択してください"
                  options={statusOptions}
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="担当メンバー"
                name="members"
              >
                <Select
                  mode="multiple"
                  style={{ width: '100%' }}
                  placeholder="メンバーを選択してください"
                  options={memberOptions}
                  maxTagCount={3}
                  maxTagPlaceholder={(omittedValues) => `+${omittedValues.length}`}
                  allowClear
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* 状態の組み合わせ */}
      <Card title="状態の組み合わせ" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Text strong>通常</Text>
              <div style={{ marginTop: 8 }}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="選択してください"
                  options={shortOptions}
                />
              </div>
            </Col>
            <Col span={6}>
              <Text strong>ホバー</Text>
              <div style={{ marginTop: 8 }}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="ホバーしてください"
                  options={shortOptions}
                  open={false}
                />
              </div>
              <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                ボーダー色が赤に変化
              </Paragraph>
            </Col>
            <Col span={6}>
              <Text strong>無効</Text>
              <div style={{ marginTop: 8 }}>
                <Select
                  style={{ width: '100%' }}
                  value="option1"
                  options={shortOptions}
                  disabled
                />
              </div>
            </Col>
            <Col span={6}>
              <Text strong>ローディング</Text>
              <div style={{ marginTop: 8 }}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="読み込み中..."
                  options={shortOptions}
                  loading
                />
              </div>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* ベストプラクティス */}
      <Card title="ベストプラクティス" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="middle">
          <div>
            <Title level={5} style={{ color: '#52c41a' }}>✅ DO（推奨）</Title>
            <ul>
              <li>フィルター用途では固定幅（150px or 200px）を使用する</li>
              <li>フォーム入力では100%幅を使用する</li>
              <li>選択肢が多い（10個以上）場合は showSearch を追加する</li>
              <li>フィルター用途では allowClear を有効にする</li>
              <li>複数選択では maxTagCount を設定する（推奨: 3～5）</li>
              <li>placeholder でユーザーに期待する入力を明示する</li>
              <li>選択肢に適切なラベルを付ける（IDだけでなく名前も表示）</li>
            </ul>
          </div>
          <Divider />
          <div>
            <Title level={5} style={{ color: '#ff4d4f' }}>❌ DON&apos;T（非推奨）</Title>
            <ul>
              <li>フィルター用途で100%幅を使用しない</li>
              <li>フォーム入力で固定幅（150px, 200px）を使用しない</li>
              <li>placeholder なしで使用しない</li>
              <li>選択肢が多いのに検索機能を付けない</li>
              <li>複数選択で maxTagCount を設定せずに使用しない（UIが崩れる）</li>
              <li>無効状態（disabled）の説明なしに使用しない</li>
            </ul>
          </div>
        </Space>
      </Card>
    </div>
  );
}
