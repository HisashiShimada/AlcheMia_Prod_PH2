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
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  Property,
  ExperimentDataValue,
  Transition,
  Template,
  Instruction,
} from '@/types/experimentWorker';
import { projectsData } from '@/data/projectsData';
import InstructionCard from './InstructionCard';

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
  const [instructionsExpanded, setInstructionsExpanded] = useState(true);
  const [instructionsConfirmed, setInstructionsConfirmed] = useState(false);
  const [fileInstructionsExpanded, setFileInstructionsExpanded] = useState(true);
  const [methodInstructionsExpanded, setMethodInstructionsExpanded] = useState(true);
  const [transitionInstructionsExpanded, setTransitionInstructionsExpanded] = useState(true);

  // クライアント判定
  useEffect(() => {
    setIsClient(true);
  }, []);

  // ダイアログを開いたときにフォームをリセット
  useEffect(() => {
    if (open && transition) {
      form.resetFields();
      setFormData({});
      setDataGrids({});
      setInstructionsConfirmed(false); // 確認状態もリセット
      
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

  // 作業指示を取得
  const instructions = useMemo(() => {
    if (!projectId || !transition) return [];
    
    const project = projectsData[projectId];
    if (!project || !project.instructions) return [];

    // このトランジションに紐づく作業指示をフィルタリング
    return project.instructions.filter((instruction) => {
      // 全体指示（ファイル単位）
      if (instruction.targetType === 'file') {
        return true;
      }
      
      // メソッド単位指示
      if (instruction.targetType === 'method' && methodId) {
        return instruction.methodId === methodId;
      }
      
      // トランジション単位指示
      if (instruction.targetType === 'transition') {
        return instruction.transitionId === transition.transitionId;
      }
      
      return false;
    });
  }, [projectId, methodId, transition]);

  // 作業指示を種類別にグループ化
  const groupedInstructions = useMemo(() => {
    const file: Instruction[] = [];
    const method: Instruction[] = [];
    const transitionInst: Instruction[] = [];

    instructions.forEach((instruction) => {
      if (instruction.targetType === 'file') {
        file.push(instruction);
      } else if (instruction.targetType === 'method') {
        method.push(instruction);
      } else if (instruction.targetType === 'transition') {
        transitionInst.push(instruction);
      }
    });

    return { file, method, transition: transitionInst };
  }, [instructions]);

  // 作業指示の確認完了ハンドラ
  const handleConfirmInstructions = () => {
    setInstructionsConfirmed(true);
    message.success('作業指示を確認しました');
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
      
      onSave(recordsData);
      message.success('実験データを保存しました');
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

  // テンプレート別にフォームをレンダリング
  const renderTemplateForm = (template: Template) => {
    return (
      <div key={template.templateId} style={{ marginBottom: 32 }}>
        <Alert
          message={
            <Space>
              <Text strong>{template.name}</Text>
              <Tag color="purple">{template.category}</Tag>
            </Space>
          }
          description={template.description}
          type="info"
          style={{ marginBottom: 16 }}
        />
        <Row gutter={16}>
          {template.properties.map((prop) => (
            <Col
              key={prop.key}
              span={
                prop.type === 'contentDoubleListType' ||
                prop.type === 'propertyListType' ||
                prop.type === 'stringType'
                  ? 24
                  : 12
              }
            >
              {renderPropertyInput(prop, template.templateId)}
            </Col>
          ))}
        </Row>
      </div>
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
          key="cancel"
          icon={<CloseOutlined />}
          onClick={onClose}
        >
          キャンセル
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<SaveOutlined />}
          loading={loading}
          onClick={handleSubmit}
        >
          保存
        </Button>,
      ]}
    >
      <div>
        {/* 作業指示セクション */}
        {instructions.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: token.marginXS,
                borderRadius: token.borderRadiusSM,
                marginBottom: token.marginSM,
              }}
            >
              {/* 左側：折りたたみ操作エリア */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flex: 1,
                  cursor: 'pointer',
                }}
                onClick={() => setInstructionsExpanded(!instructionsExpanded)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = token.colorBgSpotlight;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {instructionsExpanded ? (
                  <DownOutlined style={{ marginRight: 8, fontSize: 12 }} />
                ) : (
                  <RightOutlined style={{ marginRight: 8, fontSize: 12 }} />
                )}
                <FileTextOutlined style={{ marginRight: 8, color: token.colorPrimary }} />
                <Text strong style={{ fontSize: 16 }}>
                  作業指示 ({instructions.length}件)
                </Text>
              </div>

              {/* 右側：確認完了ボタン */}
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleConfirmInstructions}
                disabled={instructionsConfirmed}
                style={{
                  backgroundColor: instructionsConfirmed ? undefined : token.colorSuccess,
                  borderColor: instructionsConfirmed ? undefined : token.colorSuccess,
                }}
              >
                {instructionsConfirmed ? '確認済み' : '確認完了'}
              </Button>
            </div>

            {instructionsExpanded && (
              <div
                style={{
                  padding: token.paddingMD,
                  backgroundColor: token.colorBgContainer,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: token.borderRadius,
                  maxHeight: 400,
                  overflowY: 'auto',
                }}
              >
                {/* 全体指示 */}
                {groupedInstructions.file.length > 0 && (
                  <div style={{ marginBottom: token.marginMD }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        padding: token.marginXS,
                        borderRadius: token.borderRadiusSM,
                        marginBottom: token.marginXS,
                      }}
                      onClick={() => setFileInstructionsExpanded(!fileInstructionsExpanded)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = token.colorBgSpotlight;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {fileInstructionsExpanded ? (
                        <DownOutlined style={{ marginRight: 8, fontSize: 12 }} />
                      ) : (
                        <RightOutlined style={{ marginRight: 8, fontSize: 12 }} />
                      )}
                      <Text strong style={{ fontSize: 14 }}>
                        📄 全体指示 ({groupedInstructions.file.length}件)
                      </Text>
                    </div>
                    {fileInstructionsExpanded && (
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        {groupedInstructions.file.map((instruction) => (
                          <InstructionCard
                            key={instruction.instructionId}
                            instruction={instruction}
                            isClient={isClient}
                          />
                        ))}
                      </Space>
                    )}
                  </div>
                )}

                {/* メソッド単位指示 */}
                {groupedInstructions.method.length > 0 && (
                  <div style={{ marginBottom: token.marginMD }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        padding: token.marginXS,
                        borderRadius: token.borderRadiusSM,
                        marginBottom: token.marginXS,
                      }}
                      onClick={() => setMethodInstructionsExpanded(!methodInstructionsExpanded)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = token.colorBgSpotlight;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {methodInstructionsExpanded ? (
                        <DownOutlined style={{ marginRight: 8, fontSize: 12 }} />
                      ) : (
                        <RightOutlined style={{ marginRight: 8, fontSize: 12 }} />
                      )}
                      <Text strong style={{ fontSize: 14 }}>
                        🔧 メソッド単位指示 ({groupedInstructions.method.length}件)
                      </Text>
                    </div>
                    {methodInstructionsExpanded && (
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        {groupedInstructions.method.map((instruction) => (
                          <InstructionCard
                            key={instruction.instructionId}
                            instruction={instruction}
                            isClient={isClient}
                          />
                        ))}
                      </Space>
                    )}
                  </div>
                )}

                {/* トランジション単位指示 */}
                {groupedInstructions.transition.length > 0 && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        padding: token.marginXS,
                        borderRadius: token.borderRadiusSM,
                        marginBottom: token.marginXS,
                      }}
                      onClick={() => setTransitionInstructionsExpanded(!transitionInstructionsExpanded)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = token.colorBgSpotlight;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {transitionInstructionsExpanded ? (
                        <DownOutlined style={{ marginRight: 8, fontSize: 12 }} />
                      ) : (
                        <RightOutlined style={{ marginRight: 8, fontSize: 12 }} />
                      )}
                      <Text strong style={{ fontSize: 14 }}>
                        🎯 トランジション単位指示 ({groupedInstructions.transition.length}件)
                      </Text>
                    </div>
                    {transitionInstructionsExpanded && (
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        {groupedInstructions.transition.map((instruction) => (
                          <InstructionCard
                            key={instruction.instructionId}
                            instruction={instruction}
                            isClient={isClient}
                          />
                        ))}
                      </Space>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 入力フォーム */}
        {transition?.templates && transition.templates.length > 0 ? (
          <Form
            form={form}
            layout="vertical"
            autoComplete="off"
            disabled={instructions.length > 0 && !instructionsConfirmed}
          >
            {transition.templates.map(renderTemplateForm)}
          </Form>
        ) : (
          <Alert
            message="テンプレートが設定されていません"
            description="このトランジションには入力テンプレートが登録されていません。"
            type="warning"
            showIcon
          />
        )}
      </div>
    </Modal>
  );
}
