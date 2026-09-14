/**
 * DocumentEditDialog - Document編集ダイアログ（EditorV2用）
 * 
 * Document（Creator、Vendor、Owner、Instrument）の編集機能を提供
 * Material-UI → Ant Design変換版
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  App,
  Modal,
  Button,
  Input,
  Form,
  Collapse,
  Alert,
  Space,
  Typography,
  DatePicker,
  Tag,
} from 'antd';
import {
  ThunderboltOutlined,
  ClockCircleOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import MultiObjectEditor from './MultiObjectEditor';
import type { 
  DocumentData,
} from '../../types/editor';
import {
  DocumentTagData,
} from '../../types/maiml-unified'
import { fetchMasters } from '@/services/masterApiService';
import { getProjectGroupMembers } from '@/services/projectApiService';
import type { CreatorRecord, VendorRecord, InstrumentRecord } from '@/types/masterDataTypes';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * DocumentEditDialogProps - DocumentEditDialogコンポーネントのProps型定義
 */
export interface DocumentEditDialogProps {
  open: boolean;
  documentData?: DocumentData | null;
  onClose: () => void;
  onSave: (document: DocumentData) => void;
  readOnly?: boolean;
  /** 対象プロジェクトID（Ownerのユーザー一覧取得に使用） */
  projectId?: string;
}
const { Text } = Typography;
const { TextArea } = Input;

/**
 * DocumentEditDialog - Document編集ダイアログ
 * 
 * 注意: MultiObjectEditor依存部分は次Phaseで実装
 * 現在は基本プロパティ編集のみサポート
 */
const DocumentEditDialog: React.FC<DocumentEditDialogProps> = ({
  open,
  documentData,
  onClose,
  onSave,
  projectId,
}) => {
  const { message, modal } = App.useApp();
  const { t } = useLanguage();
  const [form] = Form.useForm();
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    creators: false,
    vendors: false,
    owners: false,
    instruments: false,
  });

  /**
   * マスタデータ変換関数
   */
  const convertCreatorToDocumentTag = useCallback((creator: CreatorRecord): DocumentTagData => ({
    tagName: 'Creator',
    id: creator.creatorId,
    uuid: creator.creatorUuid,
    name: creator.creatorName,
    description: creator.creatorDescription,
    annotation: creator.creatorAnnotation,
  }), []);

  const convertVendorToDocumentTag = useCallback((vendor: VendorRecord): DocumentTagData => ({
    tagName: 'Vendor',
    id: vendor.vendorId,
    uuid: vendor.vendorUuid,
    name: vendor.vendorName,
    description: vendor.vendorDescription,
    annotation: vendor.vendorAnnotation,
  }), []);

  const convertInstrumentToDocumentTag = useCallback((instrument: InstrumentRecord): DocumentTagData => ({
    tagName: 'Instrument',
    id: instrument.instrumentId,
    uuid: instrument.instrumentUuid,
    name: instrument.instrumentName,
    description: instrument.instrumentDescription,
    annotation: instrument.instrumentAnnotation,
  }), []);

  // マスタデータの状態管理
  const [creators, setCreators] = useState<DocumentTagData[]>([]);
  const [vendors, setVendors] = useState<DocumentTagData[]>([]);
  const [owners, setOwners] = useState<DocumentTagData[]>([]);
  const [instruments, setInstruments] = useState<DocumentTagData[]>([]);

  // 画面上で現在設定されているVendor/Instrumentのstate（vendorIds/instrumentIds算出に使用）
  const [currentVendors, setCurrentVendors] = useState<DocumentTagData[]>([]);
  const [currentInstruments, setCurrentInstruments] = useState<DocumentTagData[]>([]);

  /**
   * UUID v4生成
   */
  const generateUUID = useCallback(() => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }, []);


  // マスタデータの取得
  useEffect(() => {
    const loadMasterData = async () => {
      if (!open) return;
      
      try {
        // アクティブなマスタのみ取得（非アクティブを選択肢に表示しないため）
        const activeFilter = { isActive: true };
        const [creatorsData, vendorsData, instrumentsData] = await Promise.all([
          fetchMasters('creator', activeFilter) as Promise<CreatorRecord[]>,
          fetchMasters('vendor', activeFilter) as Promise<VendorRecord[]>,
          fetchMasters('instrument', activeFilter) as Promise<InstrumentRecord[]>,
        ]);
        
        setCreators(creatorsData.map(convertCreatorToDocumentTag));
        setVendors(vendorsData.map(convertVendorToDocumentTag));
        setInstruments(instrumentsData.map(convertInstrumentToDocumentTag));
        
        console.log('✅ [DocumentEditDialog] マスタデータ取得完了', {
          creators: creatorsData.length,
          vendors: vendorsData.length,
          instruments: instrumentsData.length,
        });
      } catch (error) {
        console.error('❌ [DocumentEditDialog] マスタデータ取得エラー:', error);
        message.error(t('document.masterDataLoadFailed'));
      }
    };
    
    loadMasterData();
  }, [open, convertCreatorToDocumentTag, convertVendorToDocumentTag, convertInstrumentToDocumentTag]);

  /**
   * Ownerユーザー一覧の取得
   * プロジェクトに紐づくグループのメンバー一覧を取得して Owner 選択肢として表示する
   */
  useEffect(() => {
    const loadOwnerUsers = async () => {
      if (!open) return;

      if (!projectId) {
        console.log('📋 [DocumentEditDialog] projectId未指定のためOwner一覧をスキップ');
        setOwners([]);
        return;
      }

      try {
        console.log('📋 [DocumentEditDialog] Ownerユーザー取得, projectId:', projectId);
        const members = await getProjectGroupMembers(projectId);

        const ownerItems: DocumentTagData[] = members.map((user) => ({
          tagName: 'Owner',
          id: user.userId,
          uuid: '',
          name: user.userName,
          description: '',
          annotation: '',
        }));

        setOwners(ownerItems);
        console.log('✅ [DocumentEditDialog] Owner候補ユーザー取得完了:', ownerItems.length, '名');
      } catch (error) {
        console.error('❌ [DocumentEditDialog] Owner候補ユーザー取得エラー:', error);
        message.error(t('document.ownerUsersLoadFailed'));
        setOwners([]);
      }
    };

    loadOwnerUsers();
  }, [open, projectId]);
  /**
   * 再マッチング処理
   * MAIMLパース時に失われる fromMaster フラグを、ロード済みマスタデータと突き合わせて復元する。
   * creators / vendors / instruments は各マスタの id と照合し、
   * owners はグループメンバーの userId（= id）と照合する。
   * マスタデータ・Ownerユーザー一覧のどちらかが未ロードの場合でも
   * ロード済みのものだけ照合し、未ロード分は元データをそのまま使用する。
   */
  const resolvedCreators = useMemo<DocumentTagData[]>(() => {
    if (!documentData?.creators) return [];
    if (creators.length === 0) return documentData.creators;
    const masterIds = new Set(creators.map((m) => m.id));
    return documentData.creators.map((item) =>
      masterIds.has(item.id) ? { ...item, fromMaster: true } : item
    );
  }, [documentData?.creators, creators]);

  const resolvedVendors = useMemo<DocumentTagData[]>(() => {
    if (!documentData?.vendors) return [];
    if (vendors.length === 0) return documentData.vendors;
    const masterIds = new Set(vendors.map((m) => m.id));
    return documentData.vendors.map((item) =>
      masterIds.has(item.id) ? { ...item, fromMaster: true } : item
    );
  }, [documentData?.vendors, vendors]);

  const resolvedOwners = useMemo<DocumentTagData[]>(() => {
    if (!documentData?.owners) return [];
    if (owners.length === 0) return documentData.owners;
    const memberIds = new Set(owners.map((m) => m.id));
    return documentData.owners.map((item) =>
      memberIds.has(item.id) ? { ...item, fromMaster: true } : item
    );
  }, [documentData?.owners, owners]);

  const resolvedInstruments = useMemo<DocumentTagData[]>(() => {
    if (!documentData?.instruments) return [];
    if (instruments.length === 0) return documentData.instruments;
    const masterIds = new Set(instruments.map((m) => m.id));
    return documentData.instruments.map((item) =>
      masterIds.has(item.id) ? { ...item, fromMaster: true } : item
    );
  }, [documentData?.instruments, instruments]);

  /**
   * ダイアログ開閉時のフォーム初期化
   * 注: PetriNetEditorInnerから初期化済みのdocumentDataが渡されるため、
   * DocumentEditDialog側での初期化は不要
   */
  useEffect(() => {
    if (open && documentData) {
      // stateリセット
      setHasChanges(false);

      // フォーム初期化（PetriNetEditorInnerから渡されたデータを使用）
      form.setFieldsValue({
        ...documentData,
        date: documentData.date ? dayjs(documentData.date) : dayjs(),
        signatureEnabled: documentData.signatureEnabled || false,
      });

      // 現在のVendor/Instrumentをstateに初期化（vendorIds/instrumentIds算出用）
      setCurrentVendors(documentData.vendors || []);
      setCurrentInstruments(documentData.instruments || []);
    }
  }, [open, documentData, form]);

  /**
   * UUID一括生成
   */
  const handleAutoGenerateUUIDs = useCallback(() => {
    const values = form.getFieldsValue(true);
    form.setFieldsValue({
      ...values,
      uuid: generateUUID(),
    });
    setHasChanges(true);
    message.success(t('document.uuidGenerated'));
  }, [form, generateUUID]);

  /**
   * 現在時刻設定
   */
  const handleSetCurrentDateTime = useCallback(() => {
    form.setFieldValue('date', dayjs());
    setHasChanges(true);
    message.success(t('document.currentTimeSet'));
  }, [form]);

  /**
   * セクション展開切り替え
   */
  const handleToggleSection = useCallback((sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  }, []);

  /**
   * MultiObjectEditor用データ変更ハンドラー
   */
  const handleMultiObjectDataChange = useCallback((objectKey: 'creators' | 'vendors' | 'owners' | 'instruments', objectsArray: DocumentTagData[]) => {
    form.setFieldsValue({ [objectKey]: objectsArray });

    // Vendor/Instrumentが変更された場合はstateも更新（vendorIds/instrumentIds算出用）
    if (objectKey === 'vendors') {
      setCurrentVendors(objectsArray);
    }
    if (objectKey === 'instruments') {
      setCurrentInstruments(objectsArray);
    }

    setHasChanges(true);
  }, [form]);

  /**
   * VendorとInstrumentのIDリスト算出
   * currentVendors/currentInstruments stateに依存することで、
   * 画面上での追加・削除時に正しく再計算される
   */
  const vendorIds = useMemo(() => {
    return currentVendors.map((v) => v.id).filter(Boolean) as string[];
  }, [currentVendors]);

  const instrumentIds = useMemo(() => {
    return currentInstruments.map((i) => i.id).filter(Boolean) as string[];
  }, [currentInstruments]);

  /**
   * フォーム変更ハンドラー
   */
  const handleFormChange = useCallback(() => {
    setHasChanges(true);
  }, []);

  /**
   * 保存処理
   */
  const handleSave = useCallback(async () => {
    const values = form.getFieldsValue(true);

    const documentToSave: DocumentData = {
      ...values,
      date: values.date ? values.date : new Date(),
      signatureEnabled: values.signatureEnabled,
    };

    onSave(documentToSave);
    onClose();
    message.success(t('document.saved'));
  }, [form, onSave, onClose]);

  /**
   * キャンセル処理
   */
  const handleCancel = useCallback(() => {
    if (hasChanges) {
      modal.confirm({
        title: t('document.unsavedChangesTitle'),
        content: t('document.unsavedChangesContent'),
        okText: t('document.discardButton'),
        cancelText: t('common.cancel'),
        onOk: onClose,
      });
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  return (
    <Modal
      title={t('document.editTitle')}
      open={open}
      onCancel={handleCancel}
      width={900}
      style={{ top: 20 }}
      footer={[
        <Space key="status" style={{ marginRight: 'auto' }}>
          {hasChanges && <Tag color="warning">{t('document.unsavedChangesTag')}</Tag>}
        </Space>,
        <Button key="cancel" onClick={handleCancel}>
          {t('common.cancel')}
        </Button>,
        <Button
          key="save"
          type="primary"
          onClick={handleSave}
          icon={<SaveOutlined />}
        >
          {t('document.saveButton')}
        </Button>,
      ]}
    >
      <div style={{ maxHeight: 'calc(90vh - 200px)', overflow: 'auto' }}>
        <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
          {/* UUID一括生成ボタン */}
          <Button
            icon={<ThunderboltOutlined />}
            onClick={handleAutoGenerateUUIDs}
            block
          >
            {t('document.generateUuidBulk')}
          </Button>

          {/* フォーム */}
          <Form
            form={form}
            layout="vertical"
            onValuesChange={handleFormChange}
          >
            <Collapse
              activeKey={Object.entries(expandedSections)
                .filter(([_, isExpanded]) => isExpanded)
                .map(([key, _]) => key)}
              onChange={(keys) => {
                const newExpanded: Record<string, boolean> = {};
                (keys as string[]).forEach(key => {
                  newExpanded[key] = true;
                });
                setExpandedSections(prev => ({
                  ...prev,
                  ...Object.keys(prev).reduce((acc, key) => {
                    acc[key] = newExpanded[key] || false;
                    return acc;
                  }, {} as Record<string, boolean>)
                }));
              }}
              items={[
                {
                  key: 'basic',
                   label: <Text strong>{t('document.sectionBasic')}</Text>,
                  children: (
                    <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                      <Form.Item label="Document ID" name="id">
                        <Input />
                      </Form.Item>

                      <Form.Item label="UUID">
                        <Space.Compact style={{ width: '100%' }}>
                          <Form.Item name="uuid" noStyle>
                            <Input />
                          </Form.Item>
                          <Button
                            icon={<ThunderboltOutlined />}
                            onClick={() => {
                              const uuid = generateUUID();
                              form.setFieldValue('uuid', uuid);
                              setHasChanges(true);
                            }}
                           >
                            {t('document.generateButton')}
                           </Button>
                        </Space.Compact>
                      </Form.Item>

                      <Form.Item label="Name" name="name">
                        <Input />
                      </Form.Item>

                      <Form.Item label="Description" name="description">
                        <TextArea rows={2} />
                      </Form.Item>

                      <Space.Compact style={{ width: '100%' }}>
                        <Form.Item label="Date" name="date" noStyle>
                          <DatePicker
                            showTime
                            style={{ width: '100%' }}
                            format="YYYY-MM-DD HH:mm:ss"
                          />
                        </Form.Item>
                        <Button
                          icon={<ClockCircleOutlined />}
                          onClick={handleSetCurrentDateTime}
                           title={t('document.setCurrentTime')}
                         >
                           {t('document.currentTimeButton')}
                        </Button>
                      </Space.Compact>
                    </Space>
                  ),
                },
              ]}
            />
          </Form>

          {/* Creator編集 */}
          <MultiObjectEditor
            objectKey="creators"
            title="Creator"
            icon="⚙️"
            includeReferences={true}
            initialData={resolvedCreators}
            onDataChange={handleMultiObjectDataChange}
            minItems={1}
            isExpanded={expandedSections.creators}
            onToggleExpanded={handleToggleSection}
            vendorIds={vendorIds}
            instrumentIds={instrumentIds}
            masterData={creators}
          />

          {/* Vendor編集 */}
          <MultiObjectEditor
            objectKey="vendors"
            title="Vendor"
            icon="🏢"
            includeReferences={false}
            initialData={resolvedVendors}
            onDataChange={handleMultiObjectDataChange}
            minItems={1}
            isExpanded={expandedSections.vendors}
            onToggleExpanded={handleToggleSection}
            masterData={vendors}
          />

          {/* Owner編集 */}
          <MultiObjectEditor
            objectKey="owners"
            title="Owner"
            icon="👥"
            includeReferences={false}
            initialData={resolvedOwners}
            onDataChange={handleMultiObjectDataChange}
            minItems={1}
            isExpanded={expandedSections.owners}
            onToggleExpanded={handleToggleSection}
            masterData={owners}
          />

          {/* Instrument編集 */}
          <MultiObjectEditor
            objectKey="instruments"
            title="Instrument"
            icon="🔬"
            includeReferences={false}
            initialData={resolvedInstruments}
            onDataChange={handleMultiObjectDataChange}
            minItems={0}
            isExpanded={expandedSections.instruments}
            onToggleExpanded={handleToggleSection}
            masterData={instruments}
          />

          {/* ヒント */}
          <Alert
            title={t('document.hintTitle')}
            description={
              <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                <li>{t('document.hint1')}</li>
                <li>{t('document.hint2')}</li>
                <li>{t('document.hint3')}</li>
                <li>{t('document.hint4')}</li>
                <li>{t('document.hint5')}</li>
              </ul>
            }
            type="info"
          />
        </Space>
      </div>
    </Modal>
  );
};

export default DocumentEditDialog;
