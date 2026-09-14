/**
 * PrefixManagement — マージロジック単体テスト
 *
 * 対象ロジック:
 *   fetchNamespacesWithAncestorsAndDescendants() 内のマージ処理
 *   （ancestorList + descendantList を複合キーで重複除去）
 *
 * 修正背景:
 *   上位層（祖先グループ）に同名 prefix が存在する状態で下位層に新規登録すると、
 *   マージ時に prefix 名のみで重複除去されるため下位層の行が除外され一覧に表示されなかった。
 *   複合キー（prefix + scopeKey）による重複除去に修正。
 *
 * 追加テスト（2026-09-14）:
 *   handleSave の重複警告チェックロジック
 *   上位層に同名 prefix が存在する場合のみ警告、現スコープへの重複は警告しない
 */

// ── テスト対象ロジック ───────────────────────────────────────────────

interface NamespaceEntry {
  prefix: string;
  uri: string;
  scopeKey?: string | null;
  scopeName?: string;
  isActive?: boolean;
}

/** 修正後: prefix + scopeKey の複合キーで重複除去 */
const mergeWithCompositeKey = (
  ancestorList: NamespaceEntry[],
  descendantList: NamespaceEntry[]
): NamespaceEntry[] => {
  const seen = new Set<string>();
  return [...ancestorList, ...descendantList].filter((ns) => {
    const key = `${ns.prefix}__${ns.scopeKey ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** 修正前（バグあり）: prefix 名のみで重複除去 */
const mergeWithPrefixOnly = (
  ancestorList: NamespaceEntry[],
  descendantList: NamespaceEntry[]
): NamespaceEntry[] => {
  const seen = new Set<string>();
  return [...ancestorList, ...descendantList].filter((ns) => {
    if (seen.has(ns.prefix)) return false;
    seen.add(ns.prefix);
    return true;
  });
};

// ── handleSave 重複チェックロジック（テスト用抽出版）──────────────────

interface PrefixRow {
  id: string;
  prefix: string;
  uri: string;
  scopeKey?: string | null;
  scopePath?: string;
}

interface NewPrefixRow {
  _rowId: string;
  prefix: string;
  uri: string;
}

interface DuplicateResult {
  prefix: string;
  scopeName: string;
}

/**
 * handleSave の上位層重複チェックロジック（修正後）
 * 現在の登録先スコープキー（currentScopeKey）と異なる scopeKey の行のみを警告対象とする。
 */
const findFirstDuplicate = (
  newRows: NewPrefixRow[],
  rows: PrefixRow[],
  rawScopeKey: string | undefined
): DuplicateResult | null => {
  const currentScopeKey = rawScopeKey?.replace(/^personal-/, '') ?? null;
  const found = newRows
    .map((newRow) => {
      const existing = rows.find(
        (r) =>
          r.prefix.toLowerCase() === newRow.prefix.toLowerCase() &&
          r.scopeKey !== currentScopeKey
      );
      return existing
        ? { prefix: newRow.prefix, scopeName: existing.scopePath ?? existing.prefix }
        : null;
    })
    .find((d) => d !== null);
  return found ?? null;
};

// ── テストデータ ─────────────────────────────────────────────────────

const group001Entry: NamespaceEntry = {
  prefix: 'Uncertainty',
  uri: 'https://ORG001-AIML.Alchemia.co.jp',
  scopeKey: 'GROUP001',
  scopeName: '結合テスト グループ001',
  isActive: true,
};

const group002Entry: NamespaceEntry = {
  prefix: 'Uncertainty',
  uri: 'https://ORG001-AIML.Alchemia.co.jp',
  scopeKey: 'GROUP002',
  scopeName: '結合テスト グループ002',
  isActive: true,
};

const otherEntry: NamespaceEntry = {
  prefix: 'Sample',
  uri: 'https://ORG001-AIML.Alchemia.co.jp',
  scopeKey: 'GROUP001',
  scopeName: '結合テスト グループ001',
  isActive: true,
};

// ── テスト ───────────────────────────────────────────────────────────

describe('fetchNamespacesWithAncestorsAndDescendants — マージロジック', () => {

  describe('mergeWithCompositeKey（修正後）', () => {

    test('同一 prefix で scopeKey が異なる場合、両方の行が残ること', () => {
      const result = mergeWithCompositeKey([group001Entry], [group002Entry]);
      expect(result).toHaveLength(2);
      expect(result.some((r) => r.scopeKey === 'GROUP001')).toBe(true);
      expect(result.some((r) => r.scopeKey === 'GROUP002')).toBe(true);
    });

    test('同一 prefix で scopeKey も同じ場合は1件のみ残ること（真の重複）', () => {
      const result = mergeWithCompositeKey([group001Entry], [group001Entry]);
      expect(result).toHaveLength(1);
      expect(result[0].scopeKey).toBe('GROUP001');
    });

    test('prefix が異なる場合はすべて残ること', () => {
      const result = mergeWithCompositeKey([group001Entry], [otherEntry]);
      expect(result).toHaveLength(2);
      expect(result.some((r) => r.prefix === 'Uncertainty')).toBe(true);
      expect(result.some((r) => r.prefix === 'Sample')).toBe(true);
    });

    test('ancestorList が空の場合は descendantList の全行を返すこと', () => {
      const result = mergeWithCompositeKey([], [group001Entry, group002Entry]);
      expect(result).toHaveLength(2);
    });

    test('descendantList が空の場合は ancestorList の全行を返すこと', () => {
      const result = mergeWithCompositeKey([group001Entry, otherEntry], []);
      expect(result).toHaveLength(2);
    });

    test('scopeKey が null の行と undefined の行は同一視されること', () => {
      const entryNull: NamespaceEntry = { ...group001Entry, scopeKey: null };
      const entryUndefined: NamespaceEntry = { ...group001Entry, scopeKey: undefined };
      // どちらも `Uncertainty__` というキーになるため重複扱いで1件のみ残る
      const result = mergeWithCompositeKey([entryNull], [entryUndefined]);
      expect(result).toHaveLength(1);
    });
  });

  describe('バグ再現確認（修正前 vs 修正後の差異）', () => {

    test('【修正前バグ】同名 prefix で異なるスコープの場合、下位層の行が除外される', () => {
      const buggyResult = mergeWithPrefixOnly([group001Entry], [group002Entry]);
      // 修正前は1件しか返らない（グループ002の行が除外される）
      expect(buggyResult).toHaveLength(1);
      expect(buggyResult[0].scopeKey).toBe('GROUP001'); // 上位層のみ残る
    });

    test('【修正後】同名 prefix で異なるスコープの場合、両方の行が返される', () => {
      const fixedResult = mergeWithCompositeKey([group001Entry], [group002Entry]);
      // 修正後は2件返る（グループ001 + グループ002 の両方）
      expect(fixedResult).toHaveLength(2);
      const scopeKeys = fixedResult.map((r) => r.scopeKey);
      expect(scopeKeys).toContain('GROUP001');
      expect(scopeKeys).toContain('GROUP002');
    });
  });

  describe('順序の保証', () => {

    test('ancestorList が descendantList より先に配置されること（祖先を先に表示）', () => {
      const result = mergeWithCompositeKey(
        [group001Entry, otherEntry],
        [group002Entry]
      );
      // 祖先側の行が先頭に並ぶ
      expect(result[0].scopeKey).toBe('GROUP001'); // group001Entry（先頭）
      expect(result[1].scopeKey).toBe('GROUP001'); // otherEntry（2番目）
      expect(result[2].scopeKey).toBe('GROUP002'); // group002Entry（末尾）
    });
  });
});

// ── handleSave 重複チェックテスト用テストデータ ────────────────────────

const rowInGroup001: PrefixRow = {
  id: 'Uncertainty__GROUP001',
  prefix: 'Uncertainty',
  uri: 'https://ORG001-AIML.Alchemia.co.jp/group001',
  scopeKey: 'GROUP001',
  scopePath: '結合テスト グループ001',
};

const rowInUser004: PrefixRow = {
  id: 'Uncertainty__user004',
  prefix: 'Uncertainty',
  uri: 'https://ORG001-AIML.Alchemia.co.jp/user004',
  scopeKey: 'user004',
  scopePath: 'ユーザ004',
};

const rowSampleInGroup001: PrefixRow = {
  id: 'Sample__GROUP001',
  prefix: 'Sample',
  uri: 'https://ORG001-AIML.Alchemia.co.jp/group001',
  scopeKey: 'GROUP001',
  scopePath: '結合テスト グループ001',
};

// ── handleSave 重複チェックテスト ──────────────────────────────────────

describe('handleSave — 上位層重複チェックロジック', () => {

  describe('上位層に同名 prefix が存在する場合', () => {

    test('ユーザースコープで追加時: 上位グループに同名 prefix がある場合、警告対象が返ること', () => {
      const newRows: NewPrefixRow[] = [
        { _rowId: 'new-1', prefix: 'Uncertainty', uri: 'https://example.com/user' },
      ];
      const rows: PrefixRow[] = [rowInGroup001];
      const result = findFirstDuplicate(newRows, rows, 'user004');
      expect(result).not.toBeNull();
      expect(result!.prefix).toBe('Uncertainty');
      expect(result!.scopeName).toBe('結合テスト グループ001');
    });

    test('personal- プレフィックス付きの rawScopeKey でも正しく動作すること', () => {
      const newRows: NewPrefixRow[] = [
        { _rowId: 'new-1', prefix: 'Uncertainty', uri: 'https://example.com/user' },
      ];
      const rows: PrefixRow[] = [rowInGroup001];
      const result = findFirstDuplicate(newRows, rows, 'personal-user004');
      expect(result).not.toBeNull();
      expect(result!.scopeName).toBe('結合テスト グループ001');
    });

    test('scopeNameがグループ名になること（ユーザ名ではない）', () => {
      const newRows: NewPrefixRow[] = [
        { _rowId: 'new-1', prefix: 'Uncertainty', uri: 'https://example.com/user' },
      ];
      // グループ001 と ユーザ004 の両方に Uncertainty が存在する
      const rows: PrefixRow[] = [rowInGroup001, rowInUser004];
      // 現在のスコープキーは user004 → 自身（user004）は除外される
      const result = findFirstDuplicate(newRows, rows, 'user004');
      expect(result).not.toBeNull();
      expect(result!.scopeName).toBe('結合テスト グループ001');
      expect(result!.scopeName).not.toBe('ユーザ004');
    });
  });

  describe('現在のスコープに同名 prefix が存在する場合（警告不要）', () => {

    test('現在のスコープ（GROUP001）に同名 prefix がある場合は警告対象にならないこと', () => {
      const newRows: NewPrefixRow[] = [
        { _rowId: 'new-1', prefix: 'Uncertainty', uri: 'https://example.com/group001' },
      ];
      const rows: PrefixRow[] = [rowInGroup001];
      const result = findFirstDuplicate(newRows, rows, 'GROUP001');
      expect(result).toBeNull();
    });

    test('現在のスコープのみに同名 prefix がある場合は null を返すこと', () => {
      const newRows: NewPrefixRow[] = [
        { _rowId: 'new-1', prefix: 'Uncertainty', uri: 'https://example.com/user' },
      ];
      const rows: PrefixRow[] = [rowInUser004];
      const result = findFirstDuplicate(newRows, rows, 'user004');
      expect(result).toBeNull();
    });
  });

  describe('重複がない場合', () => {

    test('新規 prefix が rows に存在しない場合は null を返すこと', () => {
      const newRows: NewPrefixRow[] = [
        { _rowId: 'new-1', prefix: 'NewPrefix', uri: 'https://example.com/new' },
      ];
      const rows: PrefixRow[] = [rowInGroup001, rowSampleInGroup001];
      const result = findFirstDuplicate(newRows, rows, 'user004');
      expect(result).toBeNull();
    });

    test('rows が空の場合は null を返すこと', () => {
      const newRows: NewPrefixRow[] = [
        { _rowId: 'new-1', prefix: 'Uncertainty', uri: 'https://example.com/new' },
      ];
      const result = findFirstDuplicate(newRows, [], 'user004');
      expect(result).toBeNull();
    });

    test('newRows が空の場合は null を返すこと', () => {
      const rows: PrefixRow[] = [rowInGroup001];
      const result = findFirstDuplicate([], rows, 'user004');
      expect(result).toBeNull();
    });
  });

  describe('大文字小文字の区別なし比較', () => {

    test('prefix の大文字小文字を区別せず重複を検出すること', () => {
      const newRows: NewPrefixRow[] = [
        { _rowId: 'new-1', prefix: 'uncertainty', uri: 'https://example.com/user' },
      ];
      const rows: PrefixRow[] = [rowInGroup001];
      const result = findFirstDuplicate(newRows, rows, 'user004');
      expect(result).not.toBeNull();
      expect(result!.prefix).toBe('uncertainty');
    });
  });
});

