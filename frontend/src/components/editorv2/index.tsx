/**
 * PetriNetEditorV2 - エントリーポイント
 * 
 * ReactFlow + Ant Designベースのペトリネットエディタ
 * Material-UI版からの移植
 * 
 * @version 2.0.0
 * @date 2026-01-29
 */

import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import PetriNetEditorInner from './PetriNetEditorInner';

/**
 * PetriNetEditorV2のProps型定義
 */
interface PetriNetEditorV2Props {
  // MAIMLデータ
  initialMaiMLData?: string;
  maimlData?: string;
  
  // ファイル情報
  editingFileName?: string;
  originalFileName?: string;
  sourceS3Key?: string;
  
  // 編集モード
  initialEditMode?: boolean;
  editMode?: boolean;
  readOnly?: boolean;
  
  // コールバック
  onSave?: (data: string) => void;
  onClose?: () => void;
  
  // その他のprops
  [key: string]: any;
}

/**
 * PetriNetEditorV2 コンポーネント
 * ReactFlowProviderでラップし、内部コンポーネントにpropsを渡す
 */
const PetriNetEditorV2: React.FC<PetriNetEditorV2Props> = (props) => {
  console.log('🔍 [PetriNetEditorV2] Received props:', {
    hasInitialMaiMLData: !!props.initialMaiMLData,
    initialMaiMLDataLength: props.initialMaiMLData?.length,
    editingFileName: props.editingFileName,
    originalFileName: props.originalFileName,
    initialEditMode: props.initialEditMode,
    allProps: Object.keys(props)
  });

  return (
    <ReactFlowProvider>
      <PetriNetEditorInner 
        maimlData={props.initialMaiMLData}
        editingFileName={props.editingFileName}
        originalFileName={props.originalFileName}
        sourceS3Key={props.sourceS3Key}
        editMode={props.initialEditMode}
        {...props} 
      />
    </ReactFlowProvider>
  );
};

export default PetriNetEditorV2;