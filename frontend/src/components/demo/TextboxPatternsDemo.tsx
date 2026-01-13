'use client';

import React, { useState } from 'react';
import { Input, InputNumber, Card, Space, Typography, Tag, Select, Divider } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

/**
 * テキストボックス形状ポリシーのテスト画面
 * 
 * 標準3パターン + 除外4パターン = 全7パターンを表示
 */
export default function TextboxPatternsDemo() {
  // 標準パターン
  const [pattern1Value, setPattern1Value] = useState('');
  const [pattern2Value, setPattern2Value] = useState('');
  const [pattern3Value, setPattern3Value] = useState('');
  
  // 除外パターン
  const [selectValue, setSelectValue] = useState<string>();
  const [inputNumberValue, setInputNumberValue] = useState<number>();
  const [largeInputValue, setLargeInputValue] = useState('');
  const [disabledValue] = useState('編集不可のデータ');

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#fafafa' }}>
      <Title level={2}>テキストボックス形状ポリシー - 全パターンテスト画面</Title>
      <Paragraph>
        標準3パターン + 除外4パターン = 全7パターンのテストです。
      </Paragraph>

      {/* 標準3パターン */}
      <Title level={3} style={{ marginTop: '32px' }}>標準3パターン</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* パターン1: 標準入力 */}
        <Card
          title={
            <Space>
              <Tag color="blue">パターン1</Tag>
              <Text strong>標準入力（Standard Input）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: フォーム入力全般</Text>
            </div>

            <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text>• 高さ: token.controlHeight (32px)</Text>
                <Text>• フォントサイズ: token.fontSize (14px)</Text>
                <Text>• 角丸: token.borderRadius (8px)</Text>
                <Text>• 幅: 親要素に合わせる</Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>テスト:</Text>
              <Input
                placeholder="プロジェクト名を入力"
                value={pattern1Value}
                onChange={(e) => setPattern1Value(e.target.value)}
                maxLength={100}
                showCount
                allowClear
              />
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              例: プロジェクト名、ファイル名、メタデータ入力
            </Text>
          </Space>
        </Card>

        {/* パターン2: 検索入力 */}
        <Card
          title={
            <Space>
              <Tag color="green">パターン2</Tag>
              <Text strong>検索入力（Search Input）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: 検索・フィルタリング</Text>
            </div>

            <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text>• 高さ: token.controlHeight (32px)</Text>
                <Text>• フォントサイズ: token.fontSize (14px)</Text>
                <Text>• 角丸: token.borderRadius (8px)</Text>
                <Text>• 幅: <strong>250px固定</strong> (200-300pxの範囲)</Text>
                <Text>• prefix: SearchOutlined (14px) <strong>必須</strong></Text>
                <Text>• allowClear: <strong>必須</strong></Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>テスト:</Text>
              <Input
                prefix={<SearchOutlined />}
                placeholder="プロジェクト名、ID、説明で検索"
                value={pattern2Value}
                onChange={(e) => setPattern2Value(e.target.value)}
                allowClear
                style={{ width: 250 }}
              />
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              例: プロジェクト一覧の検索、ファイル検索、タスク検索
            </Text>
          </Space>
        </Card>

        {/* パターン3: 複数行入力 */}
        <Card
          title={
            <Space>
              <Tag color="orange">パターン3</Tag>
              <Text strong>複数行入力（Textarea Input）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: 説明文・長文入力</Text>
            </div>

            <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text>• 高さ: 96px (4行 × 24px)</Text>
                <Text>• 行数: <strong>4行固定</strong></Text>
                <Text>• フォントサイズ: token.fontSize (14px)</Text>
                <Text>• 角丸: token.borderRadius (8px)</Text>
                <Text>• 幅: 親要素に合わせる</Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>テスト:</Text>
              <TextArea
                placeholder="プロジェクトの概要を入力（任意）"
                value={pattern3Value}
                onChange={(e) => setPattern3Value(e.target.value)}
                rows={4}
                maxLength={500}
                showCount
              />
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              例: プロジェクト概要、ファイル説明、コメント、報告内容
            </Text>
          </Space>
        </Card>
      </Space>

      <Divider />

      {/* 除外パターン */}
      <Title level={3} style={{ marginTop: '32px' }}>除外パターン（必要に応じて個別使用）</Title>
      <Paragraph type="secondary">
        以下のパターンは標準3パターンから除外されていますが、基本的にはパターン1（標準入力）の変種として扱います。
      </Paragraph>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* 除外1: Select（選択入力） */}
        <Card
          title={
            <Space>
              <Tag color="purple">除外1</Tag>
              <Text strong>Select（選択入力）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">対応パターン: パターン1の変種</Text>
            </div>

            <div style={{ backgroundColor: '#fff7e6', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text><strong>除外理由:</strong> 別コンポーネント（ドロップダウン）のため</Text>
                <Text>• 形状: パターン1とほぼ同じ（高さ32px、角丸8px）</Text>
                <Text>• 差異: 右側にドロップダウン矢印あり</Text>
                <Text>• 幅: 150px / 200px / 250px（選択肢の長さに応じて固定幅）</Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>テスト:</Text>
              <Space>
                <Select
                  placeholder="選択してください"
                  value={selectValue}
                  onChange={setSelectValue}
                  style={{ width: 150 }}
                  options={[
                    { value: '1', label: '全て' },
                    { value: '2', label: '自分のみ' },
                  ]}
                />
                <Select
                  placeholder="ステータスを選択"
                  style={{ width: 200 }}
                  options={[
                    { value: 'planning', label: '計画中' },
                    { value: 'in_progress', label: '進行中' },
                    { value: 'completed', label: '完了' },
                  ]}
                />
              </Space>
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              用途: フィルタ、ドロップダウン選択
            </Text>
          </Space>
        </Card>

        {/* 除外2: InputNumber（数値入力） */}
        <Card
          title={
            <Space>
              <Tag color="cyan">除外2</Tag>
              <Text strong>InputNumber（数値入力）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">対応パターン: パターン1の変種</Text>
            </div>

            <div style={{ backgroundColor: '#fff7e6', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text><strong>除外理由:</strong> 使用頻度が低く、特殊用途のため</Text>
                <Text>• 形状: パターン1とほぼ同じ（高さ32px、角丸8px）</Text>
                <Text>• 差異: 右側にステッパーボタン（増減ボタン）あり</Text>
                <Text>• 幅: 100%（親要素に合わせる）</Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>テスト:</Text>
              <InputNumber
                placeholder="値を入力"
                value={inputNumberValue}
                onChange={(value) => setInputNumberValue(value || undefined)}
                style={{ width: '100%' }}
                min={0}
                max={100}
              />
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              用途: 測定値入力、優先度入力
            </Text>
          </Space>
        </Card>

        {/* 除外3: 大型入力（Large Size） */}
        <Card
          title={
            <Space>
              <Tag color="gold">除外3</Tag>
              <Text strong>大型入力（Large Size）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">対応パターン: パターン1の大型版</Text>
            </div>

            <div style={{ backgroundColor: '#fff7e6', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text><strong>除外理由:</strong> ログイン画面専用で汎用性が低いため</Text>
                <Text>• 形状: パターン1を大きくしたもの</Text>
                <Text>• 差異: 高さ40px（vs 32px）、フォント16px（vs 14px）</Text>
                <Text>• 用途: ログイン画面のユーザー名・パスワード入力のみ</Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>テスト:</Text>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Input
                  size="large"
                  placeholder="ユーザー名を入力"
                  value={largeInputValue}
                  onChange={(e) => setLargeInputValue(e.target.value)}
                />
                <Input.Password
                  size="large"
                  placeholder="パスワードを入力"
                />
              </Space>
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              用途: ログイン画面専用
            </Text>
          </Space>
        </Card>

        {/* 除外4: 読み取り専用（Disabled Input） */}
        <Card
          title={
            <Space>
              <Tag color="default">除外4</Tag>
              <Text strong>読み取り専用（Disabled Input）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">対応パターン: パターン1の状態変化</Text>
            </div>

            <div style={{ backgroundColor: '#fff7e6', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text><strong>除外理由:</strong> 使用頻度が極めて低いため</Text>
                <Text>• 形状: パターン1と同じ（高さ32px、角丸8px）</Text>
                <Text>• 差異: disabled属性により背景色・テキスト色が変わる</Text>
                <Text>• 背景色: #f5f5f5、テキスト色: #bdbdbd</Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>テスト:</Text>
              <Input
                placeholder="編集不可"
                value={disabledValue}
                disabled
              />
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              用途: 編集不可の情報表示
            </Text>
          </Space>
        </Card>
      </Space>

      <Divider />

      {/* 共通仕様・状態デモ */}
      <Title level={3} style={{ marginTop: '32px' }}>共通仕様と状態デモ</Title>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="色定義（全パターン共通）">
          <Space direction="vertical" size="small">
            <Text>• <strong>通常:</strong> ボーダー rgba(0,0,0,0.12) / 背景 #ffffff / テキスト #212121</Text>
            <Text>• <strong>ホバー:</strong> ボーダー rgba(0,0,0,0.12) / 背景 #ffffff / テキスト #212121</Text>
            <Text>• <strong>フォーカス:</strong> ボーダー <span style={{ color: '#CF0027', fontWeight: 'bold' }}>#CF0027</span> / 背景 #ffffff / テキスト #212121 / シャドウ</Text>
            <Text>• <strong>無効:</strong> ボーダー rgba(0,0,0,0.06) / 背景 #f5f5f5 / テキスト #bdbdbd</Text>
            <Text>• <strong>エラー:</strong> ボーダー <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>#d32f2f</span> / 背景 #ffffff / テキスト #212121</Text>
            <Divider style={{ margin: '12px 0' }} />
            <Text>• <strong>プレースホルダー:</strong> #9e9e9e</Text>
            <Text>• <strong>検索アイコン:</strong> #757575</Text>
          </Space>
        </Card>

        <Card title="状態デモ（パターン1で確認）">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>通常状態</Text>
              <Input placeholder="通常状態のテキストボックス" />
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>無効（Disabled）状態</Text>
              <Input placeholder="無効状態" value="編集不可" disabled />
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>エラー状態</Text>
              <Input placeholder="エラー状態" status="error" />
              <Text type="danger" style={{ fontSize: '12px' }}>入力内容にエラーがあります</Text>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>フォーカス状態</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ↑ 上記のいずれかをクリックして、赤いボーダー（#CF0027）とシャドウを確認
              </Text>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
