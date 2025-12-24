'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Checkbox,
  DatePicker,
  Button,
  Table,
  Alert,
  Space,
  Typography,
  Upload,
  Tag,
  Row,
  Col,
  message,
  Collapse,
  theme,
  Select,
  Card,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  SaveOutlined,
  CloseOutlined,
  FileTextOutlined,
  DownOutlined,
  RightOutlined,
  SearchOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  Property,
  ExperimentDataValue,
  Transition,
  Template,
  TemplateCategory,
  TransitionStatus,
} from '@/types/experimentWorker';
import { templatesList } from '@/data/projectsData';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface DataRecordDialogProps {
  open: boolean;
  transition: Transition | null;
  onClose: () => void;
  onSave: (data: ExperimentDataValue[]) => void;
  projectId?: string;
  methodId?: string;
}

/**
 * データ記録ダイアログコンポーネント
 * トランジションの実験結果を記録する
 */
export default function DataRecordDialog({
  open,
  transition,
  onClose,
  onSave,
  projectId,
  methodId,
}: DataRecordDialogProps) {
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [formData, setFormData] = useState<Record<string, ExperimentDataValue>>({});
  const [dataGrids, setDataGrids] = useState<Record<string, number[][]>>({});
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // テンプレート一覧用の状態
  const [templateSearchText, setTemplateSearchText] = useState('');
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<TemplateCategory | undefined>(undefined);
  const [templatesExpanded, setTemplatesExpanded] = useState(true);
  
  // テンプレート選択状態（単一選択）
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  
  // プロパティ入力フォームの折りたたみ状態
  const [propertyFormExpanded, setPropertyFormExpanded] = useState(true);

  // ステータス更新セクションの折りたたみ状態
  const [statusUpdateExpanded, setStatusUpdateExpanded] = useState(true);

  // ステータスとコメント用の状態
  const [selectedStatus, setSelectedStatus] = useState<TransitionStatus>('initial');
  const [comment, setComment] = useState('');
  
  // みなし進捗更新用の状態
  const [useDeemedProgress, setUseDeemedProgress] = useState(true);

  // ステータスの選択肢
  const statusOptions = [
    { value: 'initial' as TransitionStatus, label: '初期状態' },
    { value: 'preparing' as TransitionStatus, label: '準備状態' },
    { value: 'ready' as TransitionStatus, label: '準備完了状態' },
    { value: 'running' as TransitionStatus, label: '動作状態' },
    { value: 'paused' as TransitionStatus, label: '休止状態' },
    { value: 'completed' as TransitionStatus, label: '終状態' },
    { value: 'error' as TransitionStatus, label: '異常終了状態' },
  ];

  // クライアント判定
  useEffect(() => {
    setIsClient(true);
  }, []);

  // テンプレート一覧のフィルタリング
  const filteredTemplates = useMemo(() => {
    let filtered = templatesList;

    // テンプレート名でのあいまい検索
    if (templateSearchText) {
      filtered = filtered.filter((template) =>
        template.name.toLowerCase().includes(templateSearchText.toLowerCase())
      );
    }

    // テンプレート種別での絞り込み
    if (selectedTemplateCategory) {
      filtered = filtered.filter((template) => template.category === selectedTemplateCategory);
    }

    return filtered;
  }, [templateSearchText, selectedTemplateCategory]);

  // 選択されたテンプレートのみを取得
  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return filteredTemplates.find(template => 
      template.templateId === selectedTemplateId
    );
  }, [filteredTemplates, selectedTemplateId]);

  // テンプレート種別のラベル変換
  const getTemplateCategoryLabel = (category: TemplateCategory): string => {
    switch (category) {
      case 'Materials':
        return '材料';
      case 'Conditions':
        return '条件';
      case 'Results':
        return '結果';
      default:
        return category;
    }
  };

  // テンプレート種別のタグ色
  const getTemplateCategoryColor = (category: TemplateCategory): string => {
    switch (category) {
      case 'Materials':
        return 'blue';
      case 'Conditions':
        return 'green';
      case 'Results':
        return 'orange';
      default:
        return 'default';
    }
  };

  // ダイアログを開いたときにフォームをリセット
  useEffect(() => {
    if (open && transition) {
      form.resetFields();
      setFormData({});
      setDataGrids({});
      setSelectedStatus('initial'); // ステータスをリセット
      setComment(''); // コメントをリセット
      setSelectedTemplateId(null); // テンプレート選択状態をリセット
      
      // 各テンプレートのDataGridを初期化
      transition.templates?.forEach((template) => {
        template.properties.forEach((prop) => {
          if (prop.type === 'contentDoubleListType') {
            setDataGrids((prev) => ({
              ...prev,
              [`${template.templateId}_${prop.key}`]: [[0, 0, 0]],
            }));
          }
        });
      });
    }
  }, [open, transition, form]);

  // テンプレート保存ハンドラ
  const handleSaveTemplate = async () => {
    if (!selectedTemplate) {
      message.error('テンプレートが選択されていません');
      return;
    }

    try {
      setLoading(true);
      const values = await form.validateFields();
      
      const template = selectedTemplate;

      const templateData: ExperimentDataValue = {
        templateId: template.templateId,
        category: template.category,
      };
      
      template.properties.forEach((prop) => {
        const key = `${template.templateId}_${prop.key}`;
        if (prop.type === 'contentDoubleListType') {
          templateData[prop.key] = dataGrids[key] || [[0, 0, 0]];
        } else if (prop.type === 'dateType' || prop.type === 'dateTimeType') {
          const dateValue = values[key];
          templateData[prop.key] = dateValue ? dayjs(dateValue).format(
            prop.type === 'dateType' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm:ss'
          ) : null;
        } else {
          templateData[prop.key] = values[key] ?? null;
        }
      });
      
      // ステータスとコメントをログ出力（バックエンド実装時に使用）
      console.log('保存データ:', {
        transitionId: transition?.transitionId,
        templateId: template.templateId,
        status: selectedStatus,
        comment: comment,
        experimentData: templateData,
      });
      
      onSave([templateData]);
      message.success(`「${template.name}」を保存しました（ステータス: ${statusOptions.find(opt => opt.value === selectedStatus)?.label}）`);
    } catch (error) {
      console.error('Validation failed:', error);
      message.error('入力内容を確認してください');
    } finally {
      setLoading(false);
    }
  };

  // フォーム送信ハンドラ
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      // テンプレートごとにデータをまとめる
      const recordsData: ExperimentDataValue[] = [];
      
      transition?.templates?.forEach((template) => {
        const templateData: ExperimentDataValue = {
          templateId: template.templateId,
          category: template.category,
        };
        
        template.properties.forEach((prop) => {
          const key = `${template.templateId}_${prop.key}`;
          if (prop.type === 'contentDoubleListType') {
            templateData[prop.key] = dataGrids[key] || [[0, 0, 0]];
          } else if (prop.type === 'dateType' || prop.type === 'dateTimeType') {
            const dateValue = values[key];
            templateData[prop.key] = dateValue ? dayjs(dateValue).format(
              prop.type === 'dateType' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm:ss'
            ) : null;
          } else {
            templateData[prop.key] = values[key] ?? null;
          }
        });
        
        recordsData.push(templateData);
      });
      
      // ステータスとコメントをログ出力（バックエンド実装時に使用）
      console.log('保存データ:', {
        transitionId: transition?.transitionId,
        status: selectedStatus,
        comment: comment,
        experimentData: recordsData,
      });
      
      onSave(recordsData);
      message.success(`実験データを保存しました（ステータス: ${statusOptions.find(opt => opt.value === selectedStatus)?.label}）`);
      onClose();
    } catch (error) {
      console.error('Validation failed:', error);
      message.error('入力内容を確認してください');
    } finally {
      setLoading(false);
    }
  };

  // DataGrid更新ハンドラ
  const handleDataGridChange = (
    key: string,
    rowIndex: number,
    colIndex: number,
    value: number | null
  ) => {
    setDataGrids((prev) => {
      const currentGrid = prev[key] || [[0, 0, 0]];
      const newGrid = [...currentGrid];
      if (!newGrid[rowIndex]) {
        newGrid[rowIndex] = [];
      }
      newGrid[rowIndex][colIndex] = value ?? 0;
      return { ...prev, [key]: newGrid };
    });
  };

  // DataGrid行追加
  const handleAddRow = (key: string) => {
    setDataGrids((prev) => {
      const currentGrid = prev[key] || [[0, 0, 0]];
      const colCount = currentGrid[0]?.length || 3;
      const newRow = Array(colCount).fill(0);
      return { ...prev, [key]: [...currentGrid, newRow] };
    });
  };

  // DataGrid列追加
  const handleAddColumn = (key: string) => {
    setDataGrids((prev) => {
      const currentGrid = prev[key] || [[0, 0, 0]];
      const newGrid = currentGrid.map((row) => [...row, 0]);
      return { ...prev, [key]: newGrid };
    });
  };

  // DataGrid行削除
  const handleDeleteRow = (key: string, rowIndex: number) => {
    setDataGrids((prev) => {
      const currentGrid = prev[key] || [[0, 0, 0]];
      if (currentGrid.length <= 1) return prev;
      const newGrid = currentGrid.filter((_, idx) => idx !== rowIndex);
      return { ...prev, [key]: newGrid };
    });
  };

  // DataGrid列削除
  const handleDeleteColumn = (key: string, colIndex: number) => {
    setDataGrids((prev) => {
      const currentGrid = prev[key] || [[0, 0, 0]];
      if (currentGrid[0]?.length <= 1) return prev;
      const newGrid = currentGrid.map((row) => row.filter((_, idx) => idx !== colIndex));
      return { ...prev, [key]: newGrid };
    });
  };

  // プロパティタイプ別の入力コンポーネント生成
  const renderPropertyInput = (property: Property, templateId: string) => {
    const key = `${templateId}_${property.key}`;
    const label = (
      <>
        {property.label}
        {property.units && (
          <Tag color="blue" style={{ marginLeft: 8 }}>
            {property.units}
          </Tag>
        )}
      </>
    );

    const rules = [
      {
        required: property.required,
        message: `${property.label}は必須項目です`,
      },
    ];

    switch (property.type) {
      case 'stringType':
        return (
          <Form.Item
            key={key}
            name={key}
            label={label}
            rules={rules}
          >
            <TextArea
              rows={3}
              placeholder={`${property.label}を入力`}
            />
          </Form.Item>
        );

      case 'intType':
        return (
          <Form.Item
            key={key}
            name={key}
            label={label}
            rules={rules}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder={`${property.label}を入力`}
              min={property.min}
              max={property.max}
              step={1}
              precision={0}
            />
          </Form.Item>
        );

      case 'floatType':
        return (
          <Form.Item
            key={key}
            name={key}
            label={label}
            rules={rules}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder={`${property.label}を入力`}
              min={property.min}
              max={property.max}
              step={0.01}
              precision={2}
            />
          </Form.Item>
        );

      case 'booleanType':
        return (
          <Form.Item
            key={key}
            name={key}
            valuePropName="checked"
          >
            <Checkbox>{property.label}</Checkbox>
          </Form.Item>
        );

      case 'dateType':
        return (
          <Form.Item
            key={key}
            name={key}
            label={label}
            rules={rules}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="YYYY-MM-DD"
              placeholder={`${property.label}を選択`}
            />
          </Form.Item>
        );

      case 'dateTimeType':
        return (
          <Form.Item
            key={key}
            name={key}
            label={label}
            rules={rules}
          >
            <DatePicker
              showTime
              style={{ width: '100%' }}
              format="YYYY-MM-DD HH:mm:ss"
              placeholder={`${property.label}を選択`}
            />
          </Form.Item>
        );

      case 'contentDoubleListType':
        return renderDataGrid(property, key);

      case 'propertyListType':
        return renderNestedProperties(property, templateId);

      case 'insertion':
        return renderFileUpload(property, key);

      default:
        return (
          <Form.Item
            key={key}
            name={key}
            label={label}
            rules={rules}
          >
            <Input placeholder={`${property.label}を入力`} />
          </Form.Item>
        );
    }
  };

  // DataGrid表示
  const renderDataGrid = (property: Property, key: string) => {
    const grid = dataGrids[key] || [[0, 0, 0]];

    const columns = grid[0]?.map((_, colIndex) => ({
      title: (
        <Space>
          列 {colIndex + 1}
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteColumn(key, colIndex)}
            disabled={grid[0].length <= 1}
          />
        </Space>
      ),
      dataIndex: `col_${colIndex}`,
      key: `col_${colIndex}`,
      width: 120,
      render: (_: unknown, record: unknown, rowIndex: number) => (
        <InputNumber
          value={grid[rowIndex][colIndex]}
          onChange={(value) => handleDataGridChange(key, rowIndex, colIndex, value)}
          step={0.01}
          style={{ width: '100%' }}
        />
      ),
    })) || [];

    const dataSource = grid.map((row, rowIndex) => ({
      key: rowIndex,
      rowIndex: rowIndex + 1,
      ...Object.fromEntries(
        row.map((_, colIndex) => [`col_${colIndex}`, row[colIndex]])
      ),
    }));

    return (
      <div key={key} style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Space>
            <Text strong>
              {property.label}
              {property.required && <span style={{ color: 'red' }}> *</span>}
            </Text>
            {property.units && <Tag color="blue">{property.units}</Tag>}
          </Space>

          <Table
            size="small"
            columns={[
              {
                title: '#',
                dataIndex: 'rowIndex',
                key: 'rowIndex',
                width: 80,
                render: (text: number, _: unknown, index: number) => (
                  <Space>
                    {text}
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleDeleteRow(key, index)}
                      disabled={grid.length <= 1}
                    />
                  </Space>
                ),
              },
              ...columns,
            ]}
            dataSource={dataSource}
            pagination={false}
            bordered
          />

          <Space>
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleAddRow(key)}
            >
              行を追加
            </Button>
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => handleAddColumn(key)}
            >
              列を追加
            </Button>
          </Space>
        </Space>
      </div>
    );
  };

  // ネストされたプロパティ
  const renderNestedProperties = (property: Property, templateId: string) => {
    return (
      <div
        key={`${templateId}_${property.key}`}
        style={{
          marginBottom: 24,
          paddingLeft: 16,
          borderLeft: '3px solid #e0e0e0',
        }}
      >
        <Title level={5} style={{ marginBottom: 16 }}>
          {property.label}
        </Title>
        {property.nestedProperties?.map((nestedProp) =>
          renderPropertyInput(nestedProp, templateId)
        )}
      </div>
    );
  };

  // ファイルアップロード
  const renderFileUpload = (property: Property, key: string) => {
    return (
      <Form.Item
        key={key}
        name={key}
        label={property.label}
        rules={[
          {
            required: property.required,
            message: `${property.label}は必須項目です`,
          },
        ]}
      >
        <Upload
          maxCount={1}
          beforeUpload={(file) => {
            // TODO: S3アップロード処理を実装
            message.info(`${file.name}をアップロードします（未実装）`);
            return false;
          }}
        >
          <Button icon={<UploadOutlined />}>ファイルを選択</Button>
        </Upload>
      </Form.Item>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <Text strong style={{ fontSize: 18 }}>
            実験データ記録
          </Text>
          {transition && (
            <Text type="secondary" style={{ fontSize: 14 }}>
              - {transition.transitionName}
            </Text>
          )}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={1000}
      style={{ top: 20 }}
      footer={[
        <Button
          key="close"
          icon={<CloseOutlined />}
          onClick={onClose}
        >
          閉じる
        </Button>,
      ]}
    >
      <div>
        {/* みなし進捗更新チェックボックス */}
        <div style={{ marginBottom: 16 }}>
          <Checkbox
            checked={useDeemedProgress}
            onChange={(e) => setUseDeemedProgress(e.target.checked)}
          >
            みなし進捗更新
          </Checkbox>
        </div>

        {/* ステータス更新セクション（みなし進捗更新OFF時のみ表示） */}
        {!useDeemedProgress && (
          <div style={{ marginBottom: 24 }}>
            {/* タイトルセクション */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                padding: token.marginXS,
                borderRadius: token.borderRadiusSM,
                marginBottom: token.marginSM,
              }}
              onClick={() => setStatusUpdateExpanded(!statusUpdateExpanded)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = token.colorBgSpotlight;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {statusUpdateExpanded ? (
                <DownOutlined style={{ marginRight: 8, fontSize: 12 }} />
              ) : (
                <RightOutlined style={{ marginRight: 8, fontSize: 12 }} />
              )}
              <SaveOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
              <Text strong style={{ fontSize: 16 }}>
                ステータス更新
              </Text>
            </div>

            {/* 折りたたみ可能なコンテンツ */}
            {statusUpdateExpanded && (
              <>
                <Row gutter={16}>
                  {/* ステータス */}
                  <Col span={6}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      ステータス
                    </Text>
                    <Select
                      style={{ width: '100%' }}
                      placeholder="ステータスを選択"
                      value={selectedStatus}
                      onChange={setSelectedStatus}
                      options={statusOptions}
                    />
                  </Col>

                  {/* コメント */}
                  <Col span={18}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      コメント
                    </Text>
                    <TextArea
                      rows={1}
                      placeholder="コメントを入力"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </Col>
                </Row>

                {/* 保存ボタン */}
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => {
                      // ステータス更新の保存処理
                      console.log('ステータス更新保存:', {
                        transitionId: transition?.transitionId,
                        status: selectedStatus,
                        comment: comment,
                      });
                      message.success(
                        `ステータスを更新しました（${statusOptions.find(opt => opt.value === selectedStatus)?.label}）`
                      );
                    }}
                  >
                    保存
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* テンプレート一覧セクション */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              padding: token.marginXS,
              borderRadius: token.borderRadiusSM,
              marginBottom: token.marginSM,
            }}
            onClick={() => setTemplatesExpanded(!templatesExpanded)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = token.colorBgSpotlight;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {templatesExpanded ? (
              <DownOutlined style={{ marginRight: 8, fontSize: 12 }} />
            ) : (
              <RightOutlined style={{ marginRight: 8, fontSize: 12 }} />
            )}
            <AppstoreOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
            <Text strong style={{ fontSize: 16 }}>
              テンプレート一覧 ({filteredTemplates.length}件)
            </Text>
          </div>

          {templatesExpanded && (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* フィルタリングエリア */}
              <Row gutter={16}>
              <Col flex="400px">
                <Input
                  placeholder="テンプレート名で検索"
                  prefix={<SearchOutlined />}
                  value={templateSearchText}
                  onChange={(e) => setTemplateSearchText(e.target.value)}
                  allowClear
                />
              </Col>
              <Col flex="150px">
                <Select
                  placeholder="テンプレート種別"
                  value={selectedTemplateCategory}
                  onChange={setSelectedTemplateCategory}
                  allowClear
                  style={{ width: '100%' }}
                  options={[
                    { label: '材料', value: 'Materials' },
                    { label: '条件', value: 'Conditions' },
                    { label: '結果', value: 'Results' },
                  ]}
                />
              </Col>
            </Row>

            {/* テーブル */}
            <Table
              size="small"
              dataSource={filteredTemplates}
              rowKey="templateId"
              onRow={(record) => ({
                onClick: () => {
                  // 行クリックで選択（単一選択）
                  setSelectedTemplateId(record.templateId);
                },
                style: { cursor: 'pointer' },
              })}
              rowClassName={(record) => 
                selectedTemplateId === record.templateId
                  ? 'ant-table-row-selected' 
                  : ''
              }
              scroll={{ x: 800 }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total) => `全 ${total} 件`,
                pageSizeOptions: ['10', '20', '50'],
              }}
              columns={[
                {
                  title: 'テンプレート名',
                  dataIndex: 'name',
                  key: 'name',
                  width: 250,
                  align: 'left',
                  render: (name: string, record: Template) => (
                    <Space>
                      <Text strong>{name}</Text>
                      {record.description && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          - {record.description}
                        </Text>
                      )}
                    </Space>
                  ),
                },
                {
                  title: 'テンプレート種別',
                  dataIndex: 'category',
                  key: 'category',
                  width: 150,
                  align: 'center',
                  render: (category: TemplateCategory) => (
                    <Tag color={getTemplateCategoryColor(category)}>
                      {getTemplateCategoryLabel(category)}
                    </Tag>
                  ),
                },
                {
                  title: 'IN/OUT',
                  dataIndex: 'inputOutput',
                  key: 'inputOutput',
                  width: 120,
                  align: 'center',
                  render: (inputOutput: string) => (
                    <Tag color={inputOutput === 'input' ? 'blue' : 'green'}>
                      {inputOutput === 'input' ? 'インプット' : 'アウトプット'}
                    </Tag>
                  ),
                },
                {
                  title: 'プロパティ数',
                  dataIndex: 'properties',
                  key: 'propertyCount',
                  width: 120,
                  align: 'right',
                  render: (properties: Property[]) => properties.length,
                },
              ]}
            />
            </Space>
          )}
        </div>

        {/* 入力フォーム */}
        <div style={{ marginBottom: 24 }}>
          {/* データ記録タイトルセクション（常に表示） */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              padding: token.marginXS,
              borderRadius: token.borderRadiusSM,
              marginBottom: token.marginSM,
            }}
            onClick={() => setPropertyFormExpanded(!propertyFormExpanded)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = token.colorBgSpotlight;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {propertyFormExpanded ? (
              <DownOutlined style={{ marginRight: 8, fontSize: 12 }} />
            ) : (
              <RightOutlined style={{ marginRight: 8, fontSize: 12 }} />
            )}
            <FileTextOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
            <Text strong style={{ fontSize: 16, marginRight: 12 }}>
              データ記録
            </Text>
            {selectedTemplate && (
              <>
                <Tag color={getTemplateCategoryColor(selectedTemplate.category)}>
                  {getTemplateCategoryLabel(selectedTemplate.category)}
                </Tag>
                <Text strong style={{ marginLeft: 8 }}>
                  {selectedTemplate.name}
                </Text>
              </>
            )}
          </div>

          {/* 折りたたみ可能なコンテンツ */}
          {propertyFormExpanded && (
            <>
              {/* テンプレート選択時: プロパティ入力フォーム */}
              {selectedTemplate ? (
                <Form
                  form={form}
                  layout="vertical"
                  autoComplete="off"
                >
                  <Row gutter={16}>
                    {selectedTemplate.properties.map((prop) => (
                      <Col
                        key={prop.key}
                        span={
                          prop.type === 'contentDoubleListType' ||
                          prop.type === 'propertyListType'
                            ? 24
                            : 12
                        }
                      >
                        {renderPropertyInput(prop, selectedTemplate.templateId)}
                      </Col>
                    ))}
                  </Row>
                  
                  {/* 保存ボタン */}
                  <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={handleSaveTemplate}
                      loading={loading}
                    >
                      保存
                    </Button>
                  </div>
                </Form>
              ) : (
                /* テンプレート未選択時: 選択を促すAlert */
                <Alert
                  message="テンプレートを選択してください"
                  description="上記のテンプレート一覧から記録したいテンプレートを選択してください。"
                  type="info"
                  showIcon
                />
              )}
            </>
          )}
        </div>

      </div>
    </Modal>
  );
}
