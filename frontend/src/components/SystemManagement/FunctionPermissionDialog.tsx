'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Checkbox, Button, Space, Typography, theme, App } from 'antd';
import { useLanguage } from '@/contexts/LanguageContext';
import type { FunctionItem } from '@/types/roleTypes';

const { Text } = Typography;

/**
 * 読取専用（read-only）権限を選択できる機能キーのホワイトリスト
 * ここに含まれない機能は常に「書込可」に固定される
 */
const READ_ONLY_SELECTABLE_KEYS = ['030000']; // データ管理者メニューのみ

/**
 * コンポーネントのプロパティ型定義
 */
interface FunctionPermissionDialogProps {
  open: boolean;
  onOk: (functionName: string, functionWritePermissions: string, apiFunctionNames: string, mode: 'direct' | 'temporary') => void;
  onCancel: () => void;
  mode?: 'direct' | 'temporary';  // 処理モード（direct: DB直接更新、temporary: メモリ一時保存）
  initialFunctionName?: string;
  initialWritePermissions?: string;
  initialFunctionIds?: string[];  // 機能IDのリスト
  initialWritableFunctionIds?: string[];  // 書込可能な機能IDのリスト
}

/**
 * 機能管理ダイアログコンポーネント
 */
export default function FunctionPermissionDialog({
  open,
  onOk,
  onCancel,
  mode = 'temporary',  // デフォルトはメモリ一時保存
  initialFunctionName = '',
  initialWritePermissions = '',
  initialFunctionIds = [],
  initialWritableFunctionIds = [],
}: FunctionPermissionDialogProps) {
  const { token } = theme.useToken();
  const { modal, message } = App.useApp();
  const { t } = useLanguage();
  
  // FunctionListに基づいた機能データ（カテゴリ分けなし、説明文削除）
  // label: 画面表示用（翻訳済み）、dbValue: DB/API送信用（日本語固定値）
  const baseFunctions: FunctionItem[] = [
    { key: '010000', label: t('functionPermissionDialog.functions.010000'), dbValue: 'プロバイダーメニュー',      checked: false, writable: false },
    { key: '020000', label: t('functionPermissionDialog.functions.020000'), dbValue: 'システム管理者メニュー',    checked: false, writable: false },
    { key: '030000', label: t('functionPermissionDialog.functions.030000'), dbValue: 'データ管理者メニュー',      checked: false, writable: false },
    { key: '040000', label: t('functionPermissionDialog.functions.040000'), dbValue: '実験管理者メニュー',        checked: false, writable: false },
    { key: '050000', label: t('functionPermissionDialog.functions.050000'), dbValue: '実験作業者メニュー',        checked: false, writable: false },
  ];

  // 初期値の設定（useMemoで計算）
  const initialFunctions = useMemo(() => {
    // 機能IDベースで判定
    return baseFunctions.map(func => {
      const isChecked = initialFunctionIds.includes(func.key);
      // READ_ONLY_SELECTABLE_KEYS に含まれない機能はチェック済みなら常に writable: true に強制
      const hasWritePermission = READ_ONLY_SELECTABLE_KEYS.includes(func.key)
        ? initialWritableFunctionIds.includes(func.key)
        : isChecked; // 読取専用非対応の機能はチェックされていれば常に書込可
      
      if (func.children) {
        // 親機能の場合、子の状態もチェック
        const updatedChildren = func.children.map(child => {
          const childChecked = initialFunctionIds.includes(child.key);
          // 子機能も同様に強制writable処理
          const childWritable = READ_ONLY_SELECTABLE_KEYS.includes(child.key)
            ? initialWritableFunctionIds.includes(child.key)
            : childChecked;
          return {
            ...child,
            checked: childChecked,
            writable: childWritable,
          };
        });
        
        // 親機能自体がチェックされているか、子が全てチェックされている場合、親もチェック
        const allChildrenChecked = updatedChildren.every(child => child.checked);
        
        return {
          ...func,
          checked: isChecked || allChildrenChecked,
          writable: hasWritePermission,
          children: updatedChildren,
        };
      }
      
      return {
        ...func,
        checked: isChecked,
        writable: hasWritePermission,
      };
    });
  }, [initialFunctionIds, initialWritableFunctionIds]);

  const [functions, setFunctions] = useState<FunctionItem[]>(baseFunctions);

  // モーダルが開かれたときに初期値をリセット
  useEffect(() => {
    if (open) {
      console.log('=== Setting Initial Functions ===');
      console.log('initialFunctionIds:', initialFunctionIds);
      console.log('initialWritableFunctionIds:', initialWritableFunctionIds);
      console.log('initialFunctions:', initialFunctions);
      setFunctions(initialFunctions);
    } else {
      // モーダルが閉じたときは基本状態にリセット
      setFunctions(baseFunctions);
    }
  }, [open, initialFunctions, initialFunctionIds, initialWritableFunctionIds]);

  // 機能チェックボックスの変更ハンドラ
  const handleFunctionCheck = (key: string, parentKey?: string) => {
    setFunctions(prevFunctions => {
      return prevFunctions.map(func => {
        // 親機能の場合
        if (func.key === key && func.children) {
          const newChecked = !func.checked;
          // 親のチェック状態に応じて、子も全て更新
          const updatedChildren = func.children.map(child => ({
            ...child,
            checked: newChecked,
            writable: newChecked ? child.writable : false, // チェックが外れたら書込可もOFF
          }));
          
          return {
            ...func,
            checked: newChecked,
            writable: newChecked ? func.writable : false,
            children: updatedChildren,
          };
        }
        
        // 子機能の場合
        if (func.children && parentKey) {
          const updatedChildren = func.children.map(child => {
            if (child.key === key) {
              const newChecked = !child.checked;
              return {
                ...child,
                checked: newChecked,
                writable: newChecked ? child.writable : false,
              };
            }
            return child;
          });
          
          // 子の状態に応じて親の状態を更新
          const allChildrenChecked = updatedChildren.every(child => child.checked);
          const someChildrenChecked = updatedChildren.some(child => child.checked);
          
          return {
            ...func,
            checked: allChildrenChecked,
            children: updatedChildren,
          };
        }
        
        // 通常の機能の場合
        if (func.key === key) {
          const newChecked = !func.checked;
          return {
            ...func,
            checked: newChecked,
            // 読取専用非対応の機能はチェック時に writable: true を強制
            writable: newChecked
              ? (!READ_ONLY_SELECTABLE_KEYS.includes(func.key) ? true : func.writable)
              : false,
          };
        }
        
        return func;
      });
    });
  };

  // 書込可チェックボックスの変更ハンドラ
  const handleWritableCheck = (key: string, parentKey?: string) => {
    setFunctions(prevFunctions => {
      return prevFunctions.map(func => {
        // 子機能の場合
        if (func.children && parentKey) {
          const updatedChildren = func.children.map(child => {
            if (child.key === key) {
              return {
                ...child,
                writable: !child.writable,
              };
            }
            return child;
          });
          
          return {
            ...func,
            children: updatedChildren,
          };
        }
        
        // 通常の機能の場合
        if (func.key === key) {
          return {
            ...func,
            writable: !func.writable,
          };
        }
        
        return func;
      });
    });
  };

  // OKボタンのハンドラ
  const handleOk = () => {
    const selectedFunctionNames: string[] = [];  // 表示用（権限アイコン付き）
    const writePermissionNames: string[] = [];
    const allFunctionNames: string[] = [];  // API用（権限アイコンなし）
    
    functions.forEach(func => {
      if (func.children) {
        // 親機能は含めない、子のみ
        func.children.forEach(child => {
          if (child.checked) {
            // 表示用：権限アイコン付き（翻訳済みlabelを使用）
            const permission = child.writable ? 'Ⓦ' : 'Ⓡ';
            selectedFunctionNames.push(`${permission}${child.label}`);
            
            // API用：権限アイコンなし（DB格納値の日本語固定dbValueを使用）
            allFunctionNames.push(child.dbValue);
            
            if (child.writable) {
              writePermissionNames.push(child.dbValue);
            }
          }
        });
      } else if (func.checked) {
        // 表示用：権限アイコン付き（翻訳済みlabelを使用）
        const permission = func.writable ? 'Ⓦ' : 'Ⓡ';
        selectedFunctionNames.push(`${permission}${func.label}`);
        
        // API用：権限アイコンなし（DB格納値の日本語固定dbValueを使用）
        allFunctionNames.push(func.dbValue);
        
        if (func.writable) {
          writePermissionNames.push(func.dbValue);
        }
      }
    });
    
    const functionName = selectedFunctionNames.join('/') || '－';  // 表示用
    const functionWritePermissions = writePermissionNames.join('/');
    const apiFunctionNames = allFunctionNames.join('/') || '';  // API用（権限アイコンなし）
    
    console.log('=== FunctionPermissionDialog handleOk ===');
    console.log('functionName (display):', functionName);
    console.log('apiFunctionNames (for API):', apiFunctionNames);
    console.log('functionWritePermissions:', functionWritePermissions);
    console.log('mode:', mode);
    
    // モードとAPI用の機能名を親コンポーネントに渡す
    onOk(functionName, functionWritePermissions, apiFunctionNames, mode);
  };

  return (
    <Modal
      title={<div style={{ textAlign: 'center' }}>{t('functionPermissionDialog.title')}</div>}
      open={open}
      onCancel={onCancel}
      width={500}
      zIndex={1100}
      footer={
        <div style={{ textAlign: 'center' }}>
          <Space size="large">
            <Button onClick={onCancel}>{t('functionPermissionDialog.buttons.cancel')}</Button>
            <Button 
              type="primary" 
              onClick={handleOk}
              style={{
                backgroundColor: token.colorError,
                borderColor: token.colorError,
              }}
            >
              {t('functionPermissionDialog.buttons.update')}
            </Button>
          </Space>
        </div>
      }
    >
      <div style={{ maxHeight: 600, overflowY: 'auto' }}>
        {functions.filter(func => READ_ONLY_SELECTABLE_KEYS.includes(func.key)).map((func, funcIndex) => (
          <div key={func.key}>
            {/* 親機能または通常の機能 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 0,
                padding: '4px 0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: `1px solid ${token.colorBorder}`,
                  width: '100%',
                  paddingLeft: 8,
                  paddingRight: 8,
                }}
              >
                <div style={{ flex: 1 }} />
                <div style={{ width: 300 }}>
                  <Checkbox
                    checked={func.checked}
                    onChange={() => handleFunctionCheck(func.key)}
                  >
                    <Text
                      strong
                      style={{
                        color: func.checked ? token.colorError : token.colorText,
                        fontSize: token.fontSize,
                      }}
                    >
                      {func.label}
                    </Text>
                  </Checkbox>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ width: 100 }}>
                  {READ_ONLY_SELECTABLE_KEYS.includes(func.key) ? (
                    <Checkbox
                      checked={!func.writable}
                      onChange={() => handleWritableCheck(func.key)}
                      disabled={!func.checked}
                    >
                      <Text
                        style={{
                          color: !func.checked 
                            ? token.colorTextDisabled
                            : !func.writable 
                              ? token.colorInfo
                              : token.colorSuccess,
                          fontSize: token.fontSize,
                        }}
                      >
                        {t('functionPermissionDialog.labels.readOnly')}
                      </Text>
                    </Checkbox>
                  ) : null}
                </div>
                <div style={{ flex: 1 }} />
              </div>
            </div>

            {/* 子機能（マスタ管理のサブ機能） */}
            {func.children && func.children.map((child, childIndex) => (
              <div
                key={child.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 0,
                  padding: '4px 0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: `1px solid ${token.colorBorder}`,
                    width: '100%',
                    paddingLeft: 8,
                    paddingRight: 8,
                  }}
                >
                  <div style={{ flex: 1 }} />
                  <div style={{ width: 300 }}>
                    <Checkbox
                      checked={child.checked}
                      onChange={() => handleFunctionCheck(child.key, func.key)}
                      disabled={!func.checked}
                    >
                      <Text
                        style={{
                          color: child.checked ? token.colorError : token.colorTextSecondary,
                          fontSize: token.fontSizeSM,
                        }}
                      >
                        {child.label}
                      </Text>
                    </Checkbox>
                  </div>
                  <div style={{ flex: 1 }} />
                  <div style={{ width: 100 }}>
                    <Checkbox
                      checked={child.writable}
                      onChange={() => handleWritableCheck(child.key, func.key)}
                      disabled={!child.checked}
                    >
                      <Text
                        style={{
                          color: !child.checked 
                            ? token.colorTextDisabled
                            : child.writable 
                              ? token.colorSuccess
                              : token.colorInfo,
                          fontSize: token.fontSizeSM,
                        }}
                        >
                        {t('functionPermissionDialog.labels.writable')}
                      </Text>
                    </Checkbox>
                  </div>
                  <div style={{ flex: 1 }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  );
}