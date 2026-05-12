/**
 * Phase1〜4 SQL外出し 統合単体テスト
 *
 * @description
 * Phase1: projectRepository（新メソッド群）
 * Phase2: progressService → Repository移行（projectRepository.findWithOwnerAndDept,
 *          projectTaskRepository.findByProjectId, projectTaskDetailRepository.findByMethodId）
 * Phase3: projectRepository インラインSQL外出し（10件）
 * Phase4: projectTaskRepository インラインSQL外出し（5件）
 *
 * 実行コマンド:
 *   cd backend && npx jest "tests/repositories/phase1to4-sql-externalize.test.ts" --no-coverage
 */

// ─── loadSqlFile モック ────────────────────────────────────────────────────────
jest.mock('../../src/sql/loader', () => ({
  loadSqlFile: jest.fn(async (path: string) => `-- mocked: ${path}`),
}));

// ─── pg Pool モック ────────────────────────────────────────────────────────────
const mockPoolQuery = jest.fn();
const mockClientQuery = jest.fn();
const mockClient: any = { query: mockClientQuery };

// ─── pg-promise モック ─────────────────────────────────────────────────────────
const mockPgpResult = jest.fn();
const mockPgpFns = {
  any:       jest.fn(),
  oneOrNone: jest.fn(),
  one:       jest.fn(),
  none:      jest.fn(),
  result:    mockPgpResult,
  task:      jest.fn(),
};

jest.mock('../../src/database/db', () => ({
  getPool: () => ({ query: mockPoolQuery }),
  getPgp:  () => mockPgpFns,
}));

import { loadSqlFile } from '../../src/sql/loader';
import * as projectRepo        from '../../src/repositories/projectRepository';
import * as projectTaskRepo    from '../../src/repositories/projectTaskRepository';
import * as projectTaskDetailRepo from '../../src/repositories/projectTaskDetailRepository';

// ─── 定数 ─────────────────────────────────────────────────────────────────────
const ORG_ID     = 'org-001';
const PROJECT_ID = 'proj-001';
const METHOD_ID  = 'method-001';
const USER_ID    = 'user-001';
const PROJ_NAME  = 'test-project';
const PROJ_UUID  = 'uuid-0000-0000-0000-000000000001';

function rows(data: unknown[]) { mockPoolQuery.mockResolvedValue({ rows: data }); }
function clientRows(data: unknown[]) { mockClientQuery.mockResolvedValue({ rows: data }); }

beforeEach(() => jest.clearAllMocks());

// ══════════════════════════════════════════════════════════════════════════════
// Phase1: projectRepository 新メソッド（Phase1で追加 → SQLファイル使用）
// ══════════════════════════════════════════════════════════════════════════════
describe('[Phase1] projectRepository - 新メソッド', () => {

  // ── existsByName ────────────────────────────────────────────────────────────
  // シグネチャ: existsByName(organizationId, projectName, client: PoolClient)
  describe('existsByName()', () => {
    it('正しいSQLファイルをロードする', async () => {
      clientRows([{ count: '0' }]);
      await projectRepo.existsByName(ORG_ID, PROJ_NAME, mockClient);
      expect(loadSqlFile).toHaveBeenCalledWith('projects/existsByName.sql');
    });

    it('PoolClient を使用してクエリを実行する', async () => {
      clientRows([{ count: '0' }]);
      await projectRepo.existsByName(ORG_ID, PROJ_NAME, mockClient);
      expect(mockClientQuery).toHaveBeenCalled();
    });

    it('$1=organizationId, $2=projectName の順でパラメータを渡す', async () => {
      clientRows([{ count: '0' }]);
      await projectRepo.existsByName(ORG_ID, PROJ_NAME, mockClient);
      const [_sql, params] = mockClientQuery.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJ_NAME]);
    });

    it('count=0 → false を返す', async () => {
      clientRows([{ count: '0' }]);
      expect(await projectRepo.existsByName(ORG_ID, PROJ_NAME, mockClient)).toBe(false);
    });

    it('count=1 → true を返す', async () => {
      clientRows([{ count: '1' }]);
      expect(await projectRepo.existsByName(ORG_ID, PROJ_NAME, mockClient)).toBe(true);
    });
  });

  // ── countAll ────────────────────────────────────────────────────────────────
  // countAll は pgp.one を使用
  describe('countAll()', () => {
    it('正しいSQLファイルをロードする', async () => {
      mockPgpFns.one.mockResolvedValue({ total: '5' });
      await projectRepo.countAll(ORG_ID, false);
      expect(loadSqlFile).toHaveBeenCalledWith('projects/countAll.sql');
    });

    it('$1=organizationId, $2=includeCompleted の順でパラメータを渡す', async () => {
      mockPgpFns.one.mockResolvedValue({ total: '5' });
      await projectRepo.countAll(ORG_ID, true);
      const [_sql, params] = mockPgpFns.one.mock.calls[0];
      expect(params[0]).toBe(ORG_ID);
      expect(params[1]).toBe(true);
    });

    it('数値を返す', async () => {
      mockPgpFns.one.mockResolvedValue({ total: '7' });
      const result = await projectRepo.countAll(ORG_ID, false);
      expect(typeof result).toBe('number');
    });
  });

  // ── findForUpdate ────────────────────────────────────────────────────────────
  describe('findForUpdate()', () => {
    it('正しいSQLファイルをロードする', async () => {
      clientRows([]);
      await projectRepo.findForUpdate(mockClient, ORG_ID, PROJECT_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('projects/findForUpdate.sql');
    });

    it('PoolClient を使用してクエリを実行する', async () => {
      clientRows([]);
      await projectRepo.findForUpdate(mockClient, ORG_ID, PROJECT_ID);
      expect(mockClientQuery).toHaveBeenCalled();
    });

    it('$1=organizationId, $2=projectId の順でパラメータを渡す', async () => {
      clientRows([]);
      await projectRepo.findForUpdate(mockClient, ORG_ID, PROJECT_ID);
      const [_sql, params] = mockClientQuery.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJECT_ID]);
    });

    it('レコードが存在しない場合は null を返す', async () => {
      clientRows([]);
      expect(await projectRepo.findForUpdate(mockClient, ORG_ID, PROJECT_ID)).toBeNull();
    });

    it('レコードが存在する場合はオブジェクトを返す', async () => {
      const row = { project_id: PROJECT_ID, checkout_status: 0 };
      clientRows([row]);
      expect(await projectRepo.findForUpdate(mockClient, ORG_ID, PROJECT_ID)).toEqual(row);
    });
  });

  // ── updateCheckoutStatus ─────────────────────────────────────────────────────
  describe('updateCheckoutStatus()', () => {
    it('正しいSQLファイルをロードする', async () => {
      clientRows([]);
      await projectRepo.updateCheckoutStatus(mockClient, ORG_ID, PROJECT_ID, USER_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('projects/updateCheckoutStatus.sql');
    });

    it('$1=organizationId, $2=projectId, $3=userId の順でパラメータを渡す', async () => {
      clientRows([]);
      await projectRepo.updateCheckoutStatus(mockClient, ORG_ID, PROJECT_ID, USER_ID);
      const [_sql, params] = mockClientQuery.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJECT_ID, USER_ID]);
    });
  });

  // ── updateCheckinStatus ──────────────────────────────────────────────────────
  describe('updateCheckinStatus()', () => {
    it('正しいSQLファイルをロードする', async () => {
      clientRows([]);
      await projectRepo.updateCheckinStatus(mockClient, ORG_ID, PROJECT_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('projects/updateCheckinStatus.sql');
    });

    it('$1=organizationId, $2=projectId の順でパラメータを渡す', async () => {
      clientRows([]);
      await projectRepo.updateCheckinStatus(mockClient, ORG_ID, PROJECT_ID);
      const [_sql, params] = mockClientQuery.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJECT_ID]);
    });
  });

  // ── findWithOwner ────────────────────────────────────────────────────────────
  // findWithOwner は pgp.oneOrNone を使用
  describe('findWithOwner()', () => {
    it('正しいSQLファイルをロードする', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      await projectRepo.findWithOwner(ORG_ID, PROJECT_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('projects/findWithOwner.sql');
    });

    it('$1=organizationId, $2=projectId の順でパラメータを渡す', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      await projectRepo.findWithOwner(ORG_ID, PROJECT_ID);
      const [_sql, params] = mockPgpFns.oneOrNone.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJECT_ID]);
    });

    it('レコードなし → null を返す', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      expect(await projectRepo.findWithOwner(ORG_ID, PROJECT_ID)).toBeNull();
    });

    it('レコードあり → owner_user_name を含むオブジェクトを返す', async () => {
      const row = { project_id: PROJECT_ID, owner_user_name: 'taro' };
      mockPgpFns.oneOrNone.mockResolvedValue(row);
      expect(await projectRepo.findWithOwner(ORG_ID, PROJECT_ID)).toEqual(row);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Phase2: progressService → Repository移行
// ══════════════════════════════════════════════════════════════════════════════
describe('[Phase2] progressService移行 - Repositoryメソッド', () => {

  // ── projectRepository.findWithOwnerAndDept ───────────────────────────────────
  // シグネチャ: findWithOwnerAndDept(projectId, organizationId)
  describe('projectRepository.findWithOwnerAndDept()', () => {
    it('正しいSQLファイルをロードする', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      await projectRepo.findWithOwnerAndDept(PROJECT_ID, ORG_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('projects/findWithOwnerAndDept.sql');
    });

    it('$1=projectId, $2=organizationId の順でパラメータを渡す（SQLファイルの定義順）', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      await projectRepo.findWithOwnerAndDept(PROJECT_ID, ORG_ID);
      const [_sql, params] = mockPgpFns.oneOrNone.mock.calls[0];
      // SQLファイルは $1=project_id, $2=organization_id
      expect(params).toEqual([PROJECT_ID, ORG_ID]);
    });

    it('レコードなし → null を返す', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      expect(await projectRepo.findWithOwnerAndDept(PROJECT_ID, ORG_ID)).toBeNull();
    });

    it('部門名・オーナー名を含むレコードを返す', async () => {
      const row = { project_id: PROJECT_ID, department_name: '研究部', owner_name: 'taro' };
      mockPgpFns.oneOrNone.mockResolvedValue(row);
      const result = await projectRepo.findWithOwnerAndDept(PROJECT_ID, ORG_ID);
      expect(result).toHaveProperty('department_name');
      expect(result).toHaveProperty('owner_name');
    });
  });

  // ── projectTaskRepository.findByProjectId ────────────────────────────────────
  // シグネチャ: findByProjectId(projectId, organizationId) の順（SQLファイル定義と一致）
  describe('projectTaskRepository.findByProjectId()', () => {
    it('正しいSQLファイルをロードする', async () => {
      mockPgpFns.any.mockResolvedValue([]);
      await projectTaskRepo.findByProjectId(PROJECT_ID, ORG_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('project_tasks/findByProjectId.sql');
    });

    it('$1=projectId, $2=organizationId の順でパラメータを渡す（SQLファイルの定義順）', async () => {
      mockPgpFns.any.mockResolvedValue([]);
      await projectTaskRepo.findByProjectId(PROJECT_ID, ORG_ID);
      const [_sql, params] = mockPgpFns.any.mock.calls[0];
      // SQLファイルは $1=project_id, $2=organization_id
      expect(params).toEqual([PROJECT_ID, ORG_ID]);
    });

    it('空配列を返す', async () => {
      mockPgpFns.any.mockResolvedValue([]);
      expect(await projectTaskRepo.findByProjectId(PROJECT_ID, ORG_ID)).toEqual([]);
    });

    it('複数タスクを返す', async () => {
      const tasks = [{ method_id: 'm1' }, { method_id: 'm2' }];
      mockPgpFns.any.mockResolvedValue(tasks);
      const result = await projectTaskRepo.findByProjectId(PROJECT_ID, ORG_ID);
      expect(result).toHaveLength(2);
    });
  });

  // ── projectTaskDetailRepository.findByMethodId ──────────────────────────────
  describe('projectTaskDetailRepository.findByMethodId()', () => {
    it('正しいSQLファイルをロードする', async () => {
      mockPgpFns.any.mockResolvedValue([]);
      await projectTaskDetailRepo.findByMethodId(ORG_ID, PROJECT_ID, METHOD_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('project_tasks/findTaskDetailsByMethodId.sql');
    });

    it('$1=organizationId, $2=projectId, $3=methodId の順でパラメータを渡す', async () => {
      mockPgpFns.any.mockResolvedValue([]);
      await projectTaskDetailRepo.findByMethodId(ORG_ID, PROJECT_ID, METHOD_ID);
      const [_sql, params] = mockPgpFns.any.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJECT_ID, METHOD_ID]);
    });

    it('空配列を返す', async () => {
      mockPgpFns.any.mockResolvedValue([]);
      expect(await projectTaskDetailRepo.findByMethodId(ORG_ID, PROJECT_ID, METHOD_ID)).toEqual([]);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Phase3: projectRepository インラインSQL外出し（10件）
// ══════════════════════════════════════════════════════════════════════════════
describe('[Phase3] projectRepository - インラインSQL外出し', () => {

  // ── findProjectTasks ─────────────────────────────────────────────────────────
  // findProjectTasks は pool.query を使用（動的SQL構築のため）
  describe('findProjectTasks()', () => {
    it('正しいSQLファイルをロードする', async () => {
      rows([]);
      await projectRepo.findProjectTasks(ORG_ID, PROJECT_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('projects/findProjectTasks.sql');
    });

    it('$1=organizationId, $2=projectId の順でパラメータを渡す', async () => {
      rows([]);
      await projectRepo.findProjectTasks(ORG_ID, PROJECT_ID);
      const [_sql, params] = mockPoolQuery.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJECT_ID]);
    });

    it('空配列を返す', async () => {
      rows([]);
      expect(await projectRepo.findProjectTasks(ORG_ID, PROJECT_ID)).toEqual([]);
    });
  });

  // ── completeReviewTasks ──────────────────────────────────────────────────────
  describe('completeReviewTasks()', () => {
    it('正しいSQLファイルをロードする', async () => {
      mockPgpResult.mockResolvedValue({ rowCount: 2 });
      await projectRepo.completeReviewTasks(ORG_ID, PROJECT_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('projects/completeReviewTasks.sql');
    });

    it('$1=organizationId, $2=projectId の順でパラメータを渡す', async () => {
      mockPgpResult.mockResolvedValue({ rowCount: 2 });
      await projectRepo.completeReviewTasks(ORG_ID, PROJECT_ID);
      const [_sql, params] = mockPgpResult.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJECT_ID]);
    });
  });

  // ── updateStatus ─────────────────────────────────────────────────────────────
  // シグネチャ: updateStatus(projectId, projectStatus: number, organizationId, updateUserId)
  // updateStatus は pool.query を使用（executor = client || getPool()）
  describe('updateStatus()', () => {
    it('正しいSQLファイルをロードする', async () => {
      rows([]);
      await projectRepo.updateStatus(PROJECT_ID, 2, ORG_ID, USER_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('projects/updateStatus.sql');
    });

    it('SQL params: $1=newStatus, $2=userId, $3=organizationId, $4=projectId の順', async () => {
      rows([]);
      await projectRepo.updateStatus(PROJECT_ID, 2, ORG_ID, USER_ID);
      const [_sql, params] = mockPoolQuery.mock.calls[0];
      expect(params[0]).toBe(2);         // newStatus
      expect(params[1]).toBe(USER_ID);   // userId
      expect(params[2]).toBe(ORG_ID);    // organizationId
      expect(params[3]).toBe(PROJECT_ID);// projectId
    });
  });

  // ── findByIdFull ──────────────────────────────────────────────────────────────
  describe('findByIdFull()', () => {
    it('正しいSQLファイルをロードする', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      await projectRepo.findByIdFull(ORG_ID, PROJECT_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('projects/findByIdFull.sql');
    });

    it('$1=organizationId, $2=projectId の順でパラメータを渡す', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      await projectRepo.findByIdFull(ORG_ID, PROJECT_ID);
      const [_sql, params] = mockPgpFns.oneOrNone.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJECT_ID]);
    });

    it('レコードなし → null を返す', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      expect(await projectRepo.findByIdFull(ORG_ID, PROJECT_ID)).toBeNull();
    });
  });

  // ── findByName ────────────────────────────────────────────────────────────────
  describe('findByName()', () => {
    it('正しいSQLファイルをロードする', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      await projectRepo.findByName(ORG_ID, PROJ_NAME);
      expect(loadSqlFile).toHaveBeenCalledWith('projects/findByName.sql');
    });

    it('$1=organizationId, $2=projectName の順でパラメータを渡す', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      await projectRepo.findByName(ORG_ID, PROJ_NAME);
      const [_sql, params] = mockPgpFns.oneOrNone.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJ_NAME]);
    });

    it('レコードなし → null を返す', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      expect(await projectRepo.findByName(ORG_ID, PROJ_NAME)).toBeNull();
    });
  });

  // ── findProjectForDelete ──────────────────────────────────────────────────────
  // シグネチャ: findProjectForDelete(organizationId, projectId, client)
  describe('findProjectForDelete()', () => {
    it('正しいSQLファイルをロードする', async () => {
      clientRows([]);
      await projectRepo.findProjectForDelete(ORG_ID, PROJECT_ID, mockClient);
      expect(loadSqlFile).toHaveBeenCalledWith('projects/findForDelete.sql');
    });

    it('PoolClient を使用してクエリを実行する', async () => {
      clientRows([]);
      await projectRepo.findProjectForDelete(ORG_ID, PROJECT_ID, mockClient);
      expect(mockClientQuery).toHaveBeenCalled();
    });

    it('$1=organizationId, $2=projectId の順でパラメータを渡す', async () => {
      clientRows([]);
      await projectRepo.findProjectForDelete(ORG_ID, PROJECT_ID, mockClient);
      const [_sql, params] = mockClientQuery.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJECT_ID]);
    });

    it('レコードなし → null を返す', async () => {
      clientRows([]);
      expect(await projectRepo.findProjectForDelete(ORG_ID, PROJECT_ID, mockClient)).toBeNull();
    });
  });

  // ── updateMaimlFlgByUuid ──────────────────────────────────────────────────────
  // updateMaimlFlgByUuid は pool.query を使用
  describe('updateMaimlFlgByUuid()', () => {
    it('正しいSQLファイルをロードする', async () => {
      rows([]);
      await projectRepo.updateMaimlFlgByUuid(ORG_ID, PROJ_UUID, false);
      expect(loadSqlFile).toHaveBeenCalledWith('projects/updateMaimlFlgByUuid.sql');
    });

    it('$1=maimlFlg, $2=organizationId, $3=projectUuid の順でパラメータを渡す', async () => {
      rows([]);
      await projectRepo.updateMaimlFlgByUuid(ORG_ID, PROJ_UUID, false);
      const [_sql, params] = mockPoolQuery.mock.calls[0];
      expect(params[0]).toBe(false);     // project_maiml_flg
      expect(params[1]).toBe(ORG_ID);    // organization_id
      expect(params[2]).toBe(PROJ_UUID); // project_uuid
    });
  });

  // ── countProjectTasksByStatus ─────────────────────────────────────────────────
  describe('countProjectTasksByStatus()', () => {
    it('正しいSQLファイルをロードする', async () => {
      mockPgpFns.any.mockResolvedValue([]);
      await projectRepo.countProjectTasksByStatus(ORG_ID, PROJECT_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('projects/countTasksByStatus.sql');
    });

    it('$1=organizationId, $2=projectId の順でパラメータを渡す', async () => {
      mockPgpFns.any.mockResolvedValue([]);
      await projectRepo.countProjectTasksByStatus(ORG_ID, PROJECT_ID);
      const [_sql, params] = mockPgpFns.any.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJECT_ID]);
    });

    it('空配列 → 空の統計を返す', async () => {
      mockPgpFns.any.mockResolvedValue([]);
      const result = await projectRepo.countProjectTasksByStatus(ORG_ID, PROJECT_ID);
      expect(result).toBeDefined();
    });
  });

  // ── findProjectBasicInfo ──────────────────────────────────────────────────────
  describe('findProjectBasicInfo()', () => {
    it('正しいSQLファイルをロードする', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      await projectRepo.findProjectBasicInfo(ORG_ID, PROJECT_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('projects/findBasicInfo.sql');
    });

    it('$1=organizationId, $2=projectId の順でパラメータを渡す', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      await projectRepo.findProjectBasicInfo(ORG_ID, PROJECT_ID);
      const [_sql, params] = mockPgpFns.oneOrNone.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJECT_ID]);
    });

    it('レコードなし → null を返す', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      expect(await projectRepo.findProjectBasicInfo(ORG_ID, PROJECT_ID)).toBeNull();
    });

    it('project_id, project_name を含むオブジェクトを返す', async () => {
      const row = { project_id: PROJECT_ID, project_name: PROJ_NAME };
      mockPgpFns.oneOrNone.mockResolvedValue(row);
      const result = await projectRepo.findProjectBasicInfo(ORG_ID, PROJECT_ID);
      expect(result).toHaveProperty('project_id', PROJECT_ID);
      expect(result).toHaveProperty('project_name', PROJ_NAME);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Phase4: projectTaskRepository インラインSQL外出し（5件）
// ══════════════════════════════════════════════════════════════════════════════
describe('[Phase4] projectTaskRepository - インラインSQL外出し', () => {

  // ── hasRunningTasks ───────────────────────────────────────────────────────────
  // hasRunningTasks は pgp.one を使用
  describe('hasRunningTasks()', () => {
    it('正しいSQLファイルをロードする', async () => {
      mockPgpFns.one.mockResolvedValue({ has_running_tasks: false });
      await projectTaskRepo.hasRunningTasks(ORG_ID, PROJECT_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('project_tasks/hasRunningTasks.sql');
    });

    it('$1=organizationId, $2=projectId の順でパラメータを渡す', async () => {
      mockPgpFns.one.mockResolvedValue({ has_running_tasks: false });
      await projectTaskRepo.hasRunningTasks(ORG_ID, PROJECT_ID);
      const [_sql, params] = mockPgpFns.one.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJECT_ID]);
    });

    it('has_running_tasks=false → false を返す', async () => {
      mockPgpFns.one.mockResolvedValue({ has_running_tasks: false });
      expect(await projectTaskRepo.hasRunningTasks(ORG_ID, PROJECT_ID)).toBe(false);
    });

    it('has_running_tasks=true → true を返す', async () => {
      mockPgpFns.one.mockResolvedValue({ has_running_tasks: true });
      expect(await projectTaskRepo.hasRunningTasks(ORG_ID, PROJECT_ID)).toBe(true);
    });
  });

  // ── hasIncompleteTasks ────────────────────────────────────────────────────────
  // hasIncompleteTasks は pgp.one を使用
  describe('hasIncompleteTasks()', () => {
    it('正しいSQLファイルをロードする', async () => {
      mockPgpFns.one.mockResolvedValue({ has_incomplete_tasks: false });
      await projectTaskRepo.hasIncompleteTasks(ORG_ID, PROJECT_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('project_tasks/hasIncompleteTasks.sql');
    });

    it('$1=organizationId, $2=projectId の順でパラメータを渡す', async () => {
      mockPgpFns.one.mockResolvedValue({ has_incomplete_tasks: false });
      await projectTaskRepo.hasIncompleteTasks(ORG_ID, PROJECT_ID);
      const [_sql, params] = mockPgpFns.one.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJECT_ID]);
    });

    it('has_incomplete_tasks=false → false を返す', async () => {
      mockPgpFns.one.mockResolvedValue({ has_incomplete_tasks: false });
      expect(await projectTaskRepo.hasIncompleteTasks(ORG_ID, PROJECT_ID)).toBe(false);
    });

    it('has_incomplete_tasks=true → true を返す', async () => {
      mockPgpFns.one.mockResolvedValue({ has_incomplete_tasks: true });
      expect(await projectTaskRepo.hasIncompleteTasks(ORG_ID, PROJECT_ID)).toBe(true);
    });
  });

  // ── bulkUpdateTaskStatusByProject ────────────────────────────────────────────
  // シグネチャ: bulkUpdateTaskStatusByProject(client, organizationId, projectId, fromStatus, toStatus, userId)
  describe('bulkUpdateTaskStatusByProject()', () => {
    it('正しいSQLファイルをロードする', async () => {
      clientRows([]);
      mockClient.rowCount = 2;
      await projectTaskRepo.bulkUpdateTaskStatusByProject(mockClient, ORG_ID, PROJECT_ID, 1, 3, USER_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('project_tasks/bulkUpdateTaskStatus.sql');
    });

    it('$1=toStatus, $2=userId, $3=organizationId, $4=projectId, $5=fromStatus の順', async () => {
      clientRows([]);
      await projectTaskRepo.bulkUpdateTaskStatusByProject(mockClient, ORG_ID, PROJECT_ID, 1, 3, USER_ID);
      const [_sql, params] = mockClientQuery.mock.calls[0];
      expect(params[0]).toBe(3);         // task_status（変更先）
      expect(params[1]).toBe(USER_ID);   // update_user_id
      expect(params[2]).toBe(ORG_ID);    // organization_id
      expect(params[3]).toBe(PROJECT_ID);// project_id
      expect(params[4]).toBe(1);         // task_status（変更元）
    });
  });

  // ── deleteByProjectAndWorkerLinkedFlg ─────────────────────────────────────────
  // シグネチャ: deleteByProjectAndWorkerLinkedFlg(t: ITask, organizationId, projectId, workerLinkedFlg)
  describe('deleteByProjectAndWorkerLinkedFlg()', () => {
    const mockITask: any = { none: jest.fn() };

    it('正しいSQLファイルをロードする', async () => {
      mockITask.none.mockResolvedValue(undefined);
      await projectTaskRepo.deleteByProjectAndWorkerLinkedFlg(mockITask, ORG_ID, PROJECT_ID, false);
      expect(loadSqlFile).toHaveBeenCalledWith('project_tasks/deleteByWorkerLinkedFlg.sql');
    });

    it('$1=organizationId, $2=projectId, $3=workerLinkedFlg の順でパラメータを渡す', async () => {
      mockITask.none.mockResolvedValue(undefined);
      await projectTaskRepo.deleteByProjectAndWorkerLinkedFlg(mockITask, ORG_ID, PROJECT_ID, false);
      const [_sql, params] = mockITask.none.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJECT_ID, false]);
    });
  });

  // ── updateWorkerLinkedFlgByProject ────────────────────────────────────────────
  // シグネチャ: updateWorkerLinkedFlgByProject(client, organizationId, projectId, workerLinkedFlg, userId)
  describe('updateWorkerLinkedFlgByProject()', () => {
    it('正しいSQLファイルをロードする', async () => {
      clientRows([]);
      mockClient.rowCount = 1;
      await projectTaskRepo.updateWorkerLinkedFlgByProject(mockClient, ORG_ID, PROJECT_ID, true, USER_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('project_tasks/updateWorkerLinkedFlg.sql');
    });

    it('$1=workerLinkedFlg, $2=userId, $3=organizationId, $4=projectId の順', async () => {
      clientRows([]);
      await projectTaskRepo.updateWorkerLinkedFlgByProject(mockClient, ORG_ID, PROJECT_ID, true, USER_ID);
      const [_sql, params] = mockClientQuery.mock.calls[0];
      expect(params[0]).toBe(true);       // worker_linked_flg
      expect(params[1]).toBe(USER_ID);    // update_user_id
      expect(params[2]).toBe(ORG_ID);     // organization_id
      expect(params[3]).toBe(PROJECT_ID); // project_id
    });
  });
});
