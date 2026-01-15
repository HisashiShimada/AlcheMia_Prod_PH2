'use client';

import React, { useState } from 'react';
import { Select, Card, Space, Typography, Tag, Divider, TreeSelect, Cascader, AutoComplete } from 'antd';

const { Title, Paragraph, Text } = Typography;

/**
 * ドロップダウン形状ポリシーのテスト画面
 * 
 * 標準3パターン + 複数選択 + タグ選択 + 除外5パターン = 全10パターンを表示
 */
export default function DropdownPatternsDemo() {
  // 標準パターン
  const [pattern1Value, setPattern1Value] = useState<string>();
  const [pattern2Value, setPattern2Value] = useState<string>();
  const [pattern3Value, setPattern3Value] = useState<string>();
  
  // 複数選択・タグ選択
  const [multipleValue, setMultipleValue] = useState<string[]>([]);
  const [tagsValue, setTagsValue] = useState<string[]>([]);
  
  // 除外パターン
  const [treeSelectValue, setTreeSelectValue] = useState<string>();
  const [cascaderValue, setCascaderValue] = useState<string[]>();
  const [autoCompleteValue, setAutoCompleteValue] = useState('');
  const [largeSelectValue, setLargeSelectValue] = useState<string>();
  const [searchableValue, setSearchableValue] = useState<string>();

  // モックデータ
  const shortOptions = [
    { value: 'my_only', label: '自分のみ' },
    { value: 'all', label: '全て' },
  ];

  const statusOptions = [
    { value: 'all', label: 'すべて' },
    { value: 'planning', label: '計画中' },
    { value: 'pending', label: '実行待ち' },
    { value: 'in_progress', label: '進行中' },
    { value: 'completed', label: '完了' },
    { value: 'error', label: 'エラー' },
  ];

  const workerOptions = [
    { value: 'worker1', label: '山田太郎 (worker1)' },
    { value: 'worker2', label: '佐藤花子 (worker2)' },
    { value: 'worker3', label: '鈴木一郎 (worker3)' },
    { value: 'worker4', label: '田中美咲 (worker4)' },
  ];

  const memberOptions = [
    { value: 'member1', label: '山田太郎' },
    { value: 'member2', label: '佐藤花子' },
    { value: 'member3', label: '鈴木一郎' },
    { value: 'member4', label: '田中美咲' },
    { value: 'member5', label: '高橋健太' },
    { value: 'member6', label: '渡辺美優' },
  ];

  const priorityOptions = [
    { value: 'high', label: '高' },
    { value: 'medium', label: '中' },
    { value: 'normal', label: '通常' },
    { value: 'low', label: '低' },
  ];

  const transitionOptions = [
    { value: 'transition_001', label: '⭐ サンプル準備 [preparation]' },
    { value: 'transition_002', label: '⭐ 測定実行 [measurement]' },
    { value: 'transition_003', label: '⭐ データ分析 [analysis]' },
    { value: 'transition_004', label: 'レポート作成 [reporting]' },
    { value: 'transition_005', label: '品質確認 [quality_check]' },
    { value: 'transition_006', label: '最終承認 [approval]' },
    { value: 'transition_007', label: '⭐ 機器校正 [calibration]' },
    { value: 'transition_008', label: '環境測定 [environment]' },
    { value: 'transition_009', label: '試料調製 [sample_prep]' },
    { value: 'transition_010', label: '結果検証 [verification]' },
  ];

  // TreeSelect用データ
  const treeData = [
    {
      title: 'プロジェクトA',
      value: 'project_a',
      children: [
        { title: 'フォルダ1', value: 'project_a_folder1' },
        { title: 'フォルダ2', value: 'project_a_folder2' },
      ],
    },
    {
      title: 'プロジェクトB',
      value: 'project_b',
      children: [
        { title: 'フォルダ1', value: 'project_b_folder1' },
        { title: 'フォルダ2', value: 'project_b_folder2' },
      ],
    },
  ];

  // Cascader用データ
  const cascaderOptions = [
    {
      value: 'asia',
      label: 'アジア',
      children: [
        {
          value: 'japan',
          label: '日本',
          children: [
            { value: 'tokyo', label: '東京' },
            { value: 'osaka', label: '大阪' },
          ],
        },
        {
          value: 'china',
          label: '中国',
          children: [
            { value: 'beijing', label: '北京' },
            { value: 'shanghai', label: '上海' },
          ],
        },
      ],
    },
    {
      value: 'europe',
      label: 'ヨーロッパ',
      children: [
        {
          value: 'uk',
          label: 'イギリス',
          children: [
            { value: 'london', label: 'ロンドン' },
          ],
        },
      ],
    },
  ];

  // AutoComplete用データ
  const autoCompleteOptions = [
    { value: '東京都渋谷区' },
    { value: '東京都新宿区' },
    { value: '東京都港区' },
    { value: '大阪府大阪市' },
    { value: '愛知県名古屋市' },
  ];

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#fafafa' }}>
      <Title level={2}>ドロップダウン（Select）形状ポリシー - 全パターンテスト画面</Title>
      <Paragraph>
        標準3パターン + 複数選択 + タグ選択 + 除外5パターン = 全10パターンのテストです。
      </Paragraph>

      {/* 標準3パターン */}
      <Title level={3} style={{ marginTop: '32px' }}>標準3パターン</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* パターン1: 標準ドロップダウン（150px固定） */}
        <Card
          title={
            <Space>
              <Tag color="blue">パターン1</Tag>
              <Text strong>標準ドロップダウン（150px固定）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: フィルター・選択項目（短い選択肢）</Text>
            </div>

            <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text>• 高さ: token.controlHeight (32px)</Text>
                <Text>• フォントサイズ: token.fontSize (14px)</Text>
                <Text>• 角丸: token.borderRadius (8px)</Text>
                <Text>• 幅: <strong>150px固定</strong></Text>
                <Text>• allowClear: 任意（フィルター用途では推奨）</Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>テスト:</Text>
              <Space>
                <Select
                  style={{ width: 150 }}
                  value={pattern1Value}
                  onChange={setPattern1Value}
                  placeholder="選択してください"
                  options={shortOptions}
                  allowClear
                />
                <Select
                  style={{ width: 150 }}
                  placeholder="優先度"
                  options={priorityOptions}
                  allowClear
                />
              </Space>
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              例: 所有者絞込、部門絞込、チェックアウトステータス絞込、優先度選択
            </Text>
          </Space>
        </Card>

        {/* パターン2: 中型ドロップダウン（200px固定） */}
        <Card
          title={
            <Space>
              <Tag color="green">パターン2</Tag>
              <Text strong>中型ドロップダウン（200px固定）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: フィルター・選択項目（やや長い選択肢）</Text>
            </div>

            <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text>• 高さ: token.controlHeight (32px)</Text>
                <Text>• フォントサイズ: token.fontSize (14px)</Text>
                <Text>• 角丸: token.borderRadius (8px)</Text>
                <Text>• 幅: <strong>200px固定</strong></Text>
                <Text>• allowClear: 任意（フィルター用途では推奨）</Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>テスト:</Text>
              <Select
                style={{ width: 200 }}
                value={pattern2Value}
                onChange={setPattern2Value}
                placeholder="ステータスを選択"
                options={statusOptions}
                allowClear
              />
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              例: プロジェクトステータス絞込、カテゴリ選択、対象範囲選択
            </Text>
          </Space>
        </Card>

        {/* パターン3: フルワイド（可変幅） */}
        <Card
          title={
            <Space>
              <Tag color="orange">パターン3</Tag>
              <Text strong>フルワイド（100%可変幅）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: フォーム入力・複数選択</Text>
            </div>

            <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text>• 高さ: token.controlHeight (32px)</Text>
                <Text>• フォントサイズ: token.fontSize (14px)</Text>
                <Text>• 角丸: token.borderRadius (8px)</Text>
                <Text>• 幅: <strong>100%（親要素に合わせる）</strong></Text>
                <Text>• allowClear: 推奨</Text>
                <Text>• mode: 必要に応じて multiple または tags</Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>テスト:</Text>
              <Select
                style={{ width: '100%' }}
                value={pattern3Value}
                onChange={setPattern3Value}
                placeholder="作業者を選択してください"
                options={workerOptions}
                allowClear
              />
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              例: 作業者選択、メンバー選択、フォーム内の選択項目
            </Text>
          </Space>
        </Card>
      </Space>

      <Divider />

      {/* 複数選択・タグ選択 */}
      <Title level={3} style={{ marginTop: '32px' }}>複数選択・タグ選択（パターン3の変種）</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* 複数選択 */}
        <Card
          title={
            <Space>
              <Tag color="purple">複数選択</Tag>
              <Text strong>複数選択（mode=&quot;multiple&quot;）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: 複数項目の選択</Text>
            </div>

            <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text>• 高さ: 自動（選択した項目数に応じて拡大）</Text>
                <Text>• 最小高さ: token.controlHeight (32px)</Text>
                <Text>• 幅: <strong>100%（親要素に合わせる）</strong></Text>
                <Text>• maxTagCount: 表示するタグの最大数（通常3〜5）</Text>
                <Text>• maxTagPlaceholder: 残りのタグ数表示</Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>テスト:</Text>
              <Select
                mode="multiple"
                style={{ width: '100%' }}
                value={multipleValue}
                onChange={setMultipleValue}
                placeholder="メンバーを選択してください"
                options={memberOptions}
                maxTagCount={3}
                maxTagPlaceholder={(omittedValues) => `+${omittedValues.length}`}
                allowClear
              />
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              例: メンバー選択（複数選択）、タグ選択（複数選択）
            </Text>
          </Space>
        </Card>

        {/* タグ選択 */}
        <Card
          title={
            <Space>
              <Tag color="cyan">タグ選択</Tag>
              <Text strong>タグ選択（mode=&quot;tags&quot;）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">用途: 自由入力可能なタグ選択</Text>
            </div>

            <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text>• パターン3（フルワイド）と同じ基本仕様</Text>
                <Text>• ユーザーが任意の文字列を入力して新規タグを作成可能</Text>
                <Text>• Enterキーで確定</Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>テスト:</Text>
              <Select
                mode="tags"
                style={{ width: '100%' }}
                value={tagsValue}
                onChange={setTagsValue}
                placeholder="タグを入力または選択（Enterで確定）"
                options={[
                  { value: '実験', label: '実験' },
                  { value: '測定', label: '測定' },
                  { value: '分析', label: '分析' },
                ]}
                allowClear
              />
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              例: タグ付け機能、キーワード入力
            </Text>
          </Space>
        </Card>
      </Space>

      <Divider />

      {/* 除外パターン */}
      <Title level={3} style={{ marginTop: '32px' }}>除外パターン（必要に応じて個別使用）</Title>
      <Paragraph type="secondary">
        以下のパターンは標準3パターンから除外されていますが、基本的にはパターン1〜3の変種として扱います。
      </Paragraph>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        
        {/* 除外1: TreeSelect */}
        <Card
          title={
            <Space>
              <Tag color="magenta">除外1</Tag>
              <Text strong>TreeSelect（ツリー構造選択）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">対応パターン: パターン3（フルワイド）の変種</Text>
            </div>

            <div style={{ backgroundColor: '#fff7e6', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text><strong>除外理由:</strong> 特殊なUI構造のため</Text>
                <Text>• 形状: パターン3とほぼ同じ（高さ32px、角丸8px）</Text>
                <Text>• 差異: ドロップダウンメニューがツリー構造</Text>
                <Text>• 幅: 100%（親要素に合わせる）</Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>テスト:</Text>
              <TreeSelect
                style={{ width: '100%' }}
                value={treeSelectValue}
                onChange={setTreeSelectValue}
                placeholder="フォルダーを選択してください"
                treeData={treeData}
                allowClear
              />
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              用途: フォルダー選択、組織階層選択
            </Text>
          </Space>
        </Card>

        {/* 除外2: Cascader */}
        <Card
          title={
            <Space>
              <Tag color="red">除外2</Tag>
              <Text strong>Cascader（カスケード選択）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">対応パターン: パターン2（200px固定）の変種</Text>
            </div>

            <div style={{ backgroundColor: '#fff7e6', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text><strong>除外理由:</strong> 階層的な選択UIのため</Text>
                <Text>• 形状: パターン2とほぼ同じ（高さ32px、角丸8px）</Text>
                <Text>• 差異: 段階的に選択肢が展開</Text>
                <Text>• 幅: 200px〜300px（階層の深さに応じて固定幅）</Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>テスト:</Text>
              <Cascader
                style={{ width: 250 }}
                value={cascaderValue}
                onChange={setCascaderValue}
                options={cascaderOptions}
                placeholder="地域を選択してください"
                allowClear
              />
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              用途: 地域選択、カテゴリ選択
            </Text>
          </Space>
        </Card>

        {/* 除外3: AutoComplete */}
        <Card
          title={
            <Space>
              <Tag color="volcano">除外3</Tag>
              <Text strong>AutoComplete（自動補完）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">対応パターン: パターン3（フルワイド）とInputの中間</Text>
            </div>

            <div style={{ backgroundColor: '#fff7e6', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text><strong>除外理由:</strong> 検索入力とドロップダウンのハイブリッドのため</Text>
                <Text>• 形状: パターン3とほぼ同じ（高さ32px、角丸8px）</Text>
                <Text>• 差異: 入力と同時に候補を表示</Text>
                <Text>• 幅: 100%（親要素に合わせる）または250px固定（検索用途）</Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>テスト:</Text>
              <AutoComplete
                style={{ width: '100%' }}
                value={autoCompleteValue}
                onChange={setAutoCompleteValue}
                options={autoCompleteOptions}
                placeholder="住所を入力してください"
                filterOption={(inputValue, option) =>
                  option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                }
              />
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              用途: 検索サジェスト、住所入力
            </Text>
          </Space>
        </Card>

        {/* 除外4: 大型ドロップダウン */}
        <Card
          title={
            <Space>
              <Tag color="gold">除外4</Tag>
              <Text strong>大型ドロップダウン（Large Size）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">対応パターン: パターン1〜3の大型版</Text>
            </div>

            <div style={{ backgroundColor: '#fff7e6', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text><strong>除外理由:</strong> 特殊な用途で汎用性が低いため</Text>
                <Text>• 形状: パターン1〜3を大きくしたもの</Text>
                <Text>• 差異: 高さ40px（vs 32px）、フォント16px（vs 14px）</Text>
                <Text>• 用途: ログイン画面、重要な選択項目</Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>テスト:</Text>
              <Select
                size="large"
                style={{ width: 200 }}
                value={largeSelectValue}
                onChange={setLargeSelectValue}
                placeholder="重要な選択"
                options={statusOptions}
                allowClear
              />
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              用途: ログイン画面専用、重要な選択項目
            </Text>
          </Space>
        </Card>

        {/* 除外5: 検索可能ドロップダウン */}
        <Card
          title={
            <Space>
              <Tag color="lime">除外5</Tag>
              <Text strong>検索可能ドロップダウン（showSearch）</Text>
            </Space>
          }
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text type="secondary">対応パターン: パターン1〜3に検索機能を追加</Text>
            </div>

            <div style={{ backgroundColor: '#fff7e6', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" size="small">
                <Text><strong>除外理由:</strong> 標準パターンのオプション機能のため</Text>
                <Text>• 形状: パターン1〜3と同じ</Text>
                <Text>• 差異: showSearch=true で検索ボックスが表示される</Text>
                <Text>• 用途: 選択肢が多い場合（10個以上）</Text>
              </Space>
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>テスト:</Text>
              <Select
                style={{ width: 200 }}
                value={searchableValue}
                onChange={setSearchableValue}
                placeholder="トランジションを選択..."
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                }
                options={transitionOptions}
              />
            </div>

            <Text type="secondary" style={{ fontSize: '12px' }}>
              用途: 選択肢が多いドロップダウン（10個以上）
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
            <Text>• <strong>ホバー:</strong> ボーダー <span style={{ color: '#CF0027', fontWeight: 'bold' }}>#CF0027</span> / 背景 #ffffff / テキスト #212121</Text>
            <Text>• <strong>フォーカス（開いている状態）:</strong> ボーダー <span style={{ color: '#CF0027', fontWeight: 'bold' }}>#CF0027</span> / 背景 #ffffff / テキスト #212121 / シャドウ</Text>
            <Text>• <strong>無効:</strong> ボーダー rgba(0,0,0,0.06) / 背景 #f5f5f5 / テキスト #bdbdbd</Text>
            <Divider style={{ margin: '12px 0' }} />
            <Text><strong>ドロップダウンメニュー:</strong></Text>
            <Text>• 背景色: #ffffff / シャドウ: 0 4px 12px rgba(0, 0, 0, 0.12)</Text>
            <Text>• メニューアイテム（ホバー）: 背景 #f5f5f5</Text>
            <Text>• メニューアイテム（選択済み）: 背景 <span style={{ color: '#CF0027', fontWeight: 'bold' }}>#FFF1F3</span> / テキスト <span style={{ color: '#CF0027', fontWeight: 'bold' }}>#CF0027</span></Text>
            <Divider style={{ margin: '12px 0' }} />
            <Text>• <strong>プレースホルダー:</strong> #9e9e9e</Text>
            <Text>• <strong>矢印アイコン:</strong> #757575</Text>
            <Text>• <strong>クリアボタン:</strong> #757575 → ホバー時 #212121</Text>
          </Space>
        </Card>

        <Card title="状態デモ（パターン1で確認）">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>通常状態</Text>
              <Select
                style={{ width: 150 }}
                placeholder="選択してください"
                options={shortOptions}
              />
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>無効（Disabled）状態</Text>
              <Select
                style={{ width: 150 }}
                placeholder="無効状態"
                value="my_only"
                options={shortOptions}
                disabled
              />
            </div>

            <div>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>ホバー・フォーカス状態</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                ↑ 上記のいずれかをクリック/ホバーして、赤いボーダー（#CF0027）とシャドウを確認
              </Text>
            </div>
          </Space>
        </Card>
      </Space>
    </div>
  );
}
