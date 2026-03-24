'use client';

/**
 * AttributeDisplayContext - ノード表示属性切替コンテキスト
 *
 * ペトリネットビュー上の各ノードに表示する属性を切り替えるための
 * Context / Provider / カスタムフックを提供する。
 * 選択状態は localStorage に永続化される。
 *
 * @version 1.0.0
 * @date 2026-03-19
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// 定数定義
// ---------------------------------------------------------------------------

/**
 * ノード表示属性の選択肢定数
 */
export const ATTRIBUTE_OPTIONS = {
  /** ノードID（place / transition の @id 属性値） */
  NODE_ID: 'nodeId',
  /** テンプレートID（template 要素の @id 属性値） */
  TEMPLATE_ID: 'templateId',
  /** ノードDesc（place / transition の <description> テキスト） */
  NODE_DESCRIPTION: 'nodeDescription',
  /** ノード名（place / transition の <name> テキスト）※デフォルト */
  NODE_NAME: 'nodeName',
  /** テンプレートDesc（template の <description> テキスト） */
  TEMPLATE_DESCRIPTION: 'templateDescription',
  /** テンプレート名（template の <name> テキスト） */
  TEMPLATE_NAME: 'templateName',
} as const;

/**
 * 表示属性の選択肢ラベル（ドロップダウン表示用）
 */
export const ATTRIBUTE_LABELS: Record<string, string> = {
  [ATTRIBUTE_OPTIONS.NODE_ID]:           'ノードID',
  [ATTRIBUTE_OPTIONS.TEMPLATE_ID]:       'テンプレートID',
  [ATTRIBUTE_OPTIONS.NODE_DESCRIPTION]:  'ノードDesc',
  [ATTRIBUTE_OPTIONS.NODE_NAME]:         'ノード名',
  [ATTRIBUTE_OPTIONS.TEMPLATE_DESCRIPTION]: 'テンプレートDesc',
  [ATTRIBUTE_OPTIONS.TEMPLATE_NAME]:     'テンプレート名',
};

/** 選択肢の型 */
export type AttributeOption = typeof ATTRIBUTE_OPTIONS[keyof typeof ATTRIBUTE_OPTIONS];

/** localStorage 保存キー */
const STORAGE_KEY = 'maiml_attribute_display_settings';

/** デフォルト選択値 */
const DEFAULT_ATTRIBUTE: AttributeOption = ATTRIBUTE_OPTIONS.NODE_NAME;

// ---------------------------------------------------------------------------
// Context 型定義
// ---------------------------------------------------------------------------

interface AttributeDisplayContextValue {
  /** 現在選択中の表示属性 */
  selectedAttribute: AttributeOption;
  /** 表示属性を変更する */
  setSelectedAttribute: (value: AttributeOption) => void;
}

// ---------------------------------------------------------------------------
// Context 生成
// ---------------------------------------------------------------------------

const AttributeDisplayContext = createContext<AttributeDisplayContextValue>({
  selectedAttribute: DEFAULT_ATTRIBUTE,
  setSelectedAttribute: () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * localStorage から保存済み選択値を読み込む
 */
const loadFromStorage = (): AttributeOption => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const validValues = Object.values(ATTRIBUTE_OPTIONS) as string[];
      if (validValues.includes(saved)) {
        return saved as AttributeOption;
      }
    }
  } catch {
    // SSR 等で localStorage が使えない場合は無視
  }
  return DEFAULT_ATTRIBUTE;
};

/**
 * AttributeDisplayProvider
 *
 * このプロバイダーを PetriNetEditorInner（ReactFlow の外側）にラップして使用する。
 */
export const AttributeDisplayProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [selectedAttribute, setSelectedAttributeState] =
    useState<AttributeOption>(loadFromStorage);

  const setSelectedAttribute = useCallback((value: AttributeOption) => {
    setSelectedAttributeState(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // localStorage が使えない場合は無視
    }
  }, []);

  return (
    <AttributeDisplayContext.Provider value={{ selectedAttribute, setSelectedAttribute }}>
      {children}
    </AttributeDisplayContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// カスタムフック
// ---------------------------------------------------------------------------

/**
 * useAttributeDisplay
 *
 * 選択中の表示属性と setter を返すカスタムフック。
 * AttributeDisplayProvider の内側で使用すること。
 *
 * @returns {{ selectedAttribute, setSelectedAttribute }}
 */
export const useAttributeDisplay = (): AttributeDisplayContextValue => {
  return useContext(AttributeDisplayContext);
};
