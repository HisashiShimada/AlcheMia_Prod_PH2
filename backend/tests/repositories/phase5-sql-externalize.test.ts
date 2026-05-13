/**
 * Phase5 SQL外出し 単体テスト
 *
 * @description
 * projectTaskDetailRepository / loginHistoryRepository / maimlPublishJobRepository の
 * SQLファイル外出し後の動作をモックで検証する。
 *
 * 実行コマンド:
 *   cd backend && npx jest tests/repositories/phase5-sql-externalize.test.ts --no-coverage
 */

// ─── loadSqlFile モック ────────────────────────────────────────────────────────
jest.mock('../../src/sql/loader', () => ({
  loadSqlFile: jest.fn(async (path: string) => `-- mocked sql: ${path}`),
}));

// ─── pg Pool モック（projectTaskDetail / loginHistory が使用）──────────────────
const mockPoolQuery = jest.fn();
jest.mock('../../src/database/db', () => ({
  getPool: () => ({ query: mockPoolQuery }),
  getPgp: () => mockPgpFns,
}));

// ─── pg-promise モック（maimlPublishJobRepository が使用）─────────────────────
const mockPgpFns = {
  any:       jest.fn(),
  oneOrNone: jest.fn(),
  one:       jest.fn(),
  none:      jest.fn(),
};

import { loadSqlFile } from '../../src/sql/loader';

// ─── テスト対象 import ─────────────────────────────────────────────────────────
import * as projectTaskDetailRepo from '../../src/repositories/projectTaskDetailRepository';
import * as loginHistoryRepo      from '../../src/repositories/loginHistoryRepository';
import * as maimlPublishJobRepo   from '../../src/repositories/maimlPublishJobRepository';

// ─── 定数 ─────────────────────────────────────────────────────────────────────
const ORG_ID     = 'org-test-001';
const PROJECT_ID = 'proj-test-001';
const METHOD_ID  = 'method-001';
const TASK_NO    = 1;
const USER_ID    = 'user-test-001';
const JOB_ID     = 'aaaaaaaa-0000-0000-0000-000000000001';

// ─── pg.Pool mock 用ヘルパー ──────────────────────────────────────────────────
function mockPoolRows(rows: unknown[]) {
  mockPoolQuery.mockResolvedValue({ rows });
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ══════════════════════════════════════════════════════════════════════════════
// 1. projectTaskDetailRepository
//    ※ getPool() (pg.Pool) を使用
// ══════════════════════════════════════════════════════════════════════════════
describe('projectTaskDetailRepository', () => {

  // ── findByProject ──────────────────────────────────────────────────────────
  describe('findByProject()', () => {
    it('正しいSQLファイルをロードする', async () => {
      mockPoolRows([]);
      await projectTaskDetailRepo.findByProject(ORG_ID, PROJECT_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('project_task_detail/findByProject.sql');
    });

    it('$1=organizationId, $2=projectId の順でパラメータを渡す', async () => {
      mockPoolRows([]);
      await projectTaskDetailRepo.findByProject(ORG_ID, PROJECT_ID);
      const [_sql, params] = mockPoolQuery.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJECT_ID]);
    });

    it('空配列の場合は [] を返す', async () => {
      mockPoolRows([]);
      const result = await projectTaskDetailRepo.findByProject(ORG_ID, PROJECT_ID);
      expect(result).toEqual([]);
    });

    it('複数件が返る場合は全行を返す', async () => {
      mockPoolRows([
        { project_id: PROJECT_ID, task_no: 1 },
        { project_id: PROJECT_ID, task_no: 2 },
      ]);
      const result = await projectTaskDetailRepo.findByProject(ORG_ID, PROJECT_ID);
      expect(result).toHaveLength(2);
    });
  });

  // ── findByPrimaryKey ───────────────────────────────────────────────────────
  describe('findByPrimaryKey()', () => {
    it('正しいSQLファイルをロードする', async () => {
      mockPoolRows([]);
      await projectTaskDetailRepo.findByPrimaryKey(ORG_ID, PROJECT_ID, METHOD_ID, TASK_NO);
      expect(loadSqlFile).toHaveBeenCalledWith('project_task_detail/findByPrimaryKey.sql');
    });

    it('$1=organizationId, $2=projectId, $3=methodId, $4=taskNo の順', async () => {
      mockPoolRows([]);
      await projectTaskDetailRepo.findByPrimaryKey(ORG_ID, PROJECT_ID, METHOD_ID, TASK_NO);
      const [_sql, params] = mockPoolQuery.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJECT_ID, METHOD_ID, TASK_NO]);
    });

    it('レコードが存在しない場合は null を返す', async () => {
      mockPoolRows([]);
      const result = await projectTaskDetailRepo.findByPrimaryKey(ORG_ID, PROJECT_ID, METHOD_ID, TASK_NO);
      expect(result).toBeNull();
    });

    it('レコードが存在する場合はそのオブジェクトを返す', async () => {
      const row = { organization_id: ORG_ID, project_id: PROJECT_ID, method_id: METHOD_ID, task_no: TASK_NO };
      mockPoolRows([row]);
      const result = await projectTaskDetailRepo.findByPrimaryKey(ORG_ID, PROJECT_ID, METHOD_ID, TASK_NO);
      expect(result).toEqual(row);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. loginHistoryRepository
//    ※ getPool() (pg.Pool) を使用、各関数は第1引数に Pool を受け取る
// ══════════════════════════════════════════════════════════════════════════════
describe('loginHistoryRepository', () => {

  // Pool モックオブジェクト（loginHistoryRepository に渡す）
  const mockPool: any = { query: mockPoolQuery };

  // ── getLastSuccessfulLogin ─────────────────────────────────────────────────
  describe('getLastSuccessfulLogin()', () => {
    it('正しいSQLファイルをロードする', async () => {
      mockPoolRows([]);
      await loginHistoryRepo.getLastSuccessfulLogin(mockPool, USER_ID, ORG_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('login_history/getLastSuccessfulLogin.sql');
    });

    it('$1=userId, $2=organizationId の順でパラメータを渡す', async () => {
      mockPoolRows([]);
      await loginHistoryRepo.getLastSuccessfulLogin(mockPool, USER_ID, ORG_ID);
      const [_sql, params] = mockPoolQuery.mock.calls[0];
      expect(params).toEqual([USER_ID, ORG_ID]);
    });

    it('レコードが存在しない場合は null を返す', async () => {
      mockPoolRows([]);
      const result = await loginHistoryRepo.getLastSuccessfulLogin(mockPool, USER_ID, ORG_ID);
      expect(result).toBeNull();
    });

    it('レコードが存在する場合は login_at を持つオブジェクトを返す', async () => {
      mockPoolRows([{ user_id: USER_ID, organization_id: ORG_ID, login_at: '2026-05-01T00:00:00Z' }]);
      const result = await loginHistoryRepo.getLastSuccessfulLogin(mockPool, USER_ID, ORG_ID);
      expect(result).not.toBeNull();
      expect(result!.login_at).toBeInstanceOf(Date);
    });
  });

  // ── getLastTwoFactorAuthLogin ──────────────────────────────────────────────
  describe('getLastTwoFactorAuthLogin()', () => {
    it('正しいSQLファイルをロードする（getLastSuccessfulLogin とは別ファイル）', async () => {
      mockPoolRows([]);
      await loginHistoryRepo.getLastTwoFactorAuthLogin(mockPool, USER_ID, ORG_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('login_history/getLastTwoFactorAuthLogin.sql');
    });

    it('$1=userId, $2=organizationId の順でパラメータを渡す', async () => {
      mockPoolRows([]);
      await loginHistoryRepo.getLastTwoFactorAuthLogin(mockPool, USER_ID, ORG_ID);
      const [_sql, params] = mockPoolQuery.mock.calls[0];
      expect(params).toEqual([USER_ID, ORG_ID]);
    });

    it('getLastSuccessfulLogin と異なるSQLファイルを参照する', async () => {
      mockPoolRows([]);
      await loginHistoryRepo.getLastTwoFactorAuthLogin(mockPool, USER_ID, ORG_ID);
      const sqlPath = (loadSqlFile as jest.Mock).mock.calls[0][0];
      expect(sqlPath).toBe('login_history/getLastTwoFactorAuthLogin.sql');
      expect(sqlPath).not.toBe('login_history/getLastSuccessfulLogin.sql');
    });
  });

  // ── recordLogin ────────────────────────────────────────────────────────────
  describe('recordLogin()', () => {
    it('正しいSQLファイルをロードする', async () => {
      mockPoolQuery.mockResolvedValue({ rows: [] });
      await loginHistoryRepo.recordLogin(
        mockPool, USER_ID, ORG_ID, true, null, '127.0.0.1', 'jest-agent', false
      );
      expect(loadSqlFile).toHaveBeenCalledWith('login_history/recordLogin.sql');
    });

    it('7個のパラメータを渡す', async () => {
      mockPoolQuery.mockResolvedValue({ rows: [] });
      await loginHistoryRepo.recordLogin(
        mockPool, USER_ID, ORG_ID, true, null, '127.0.0.1', 'jest-agent', false
      );
      const [_sql, params] = mockPoolQuery.mock.calls[0];
      expect(params).toHaveLength(7);
    });

    it('$1=userName, $2=organizationId, $3=success, $4=failureReason, $5=ipAddress, $6=userAgent, $7=entryExecuteFlg', async () => {
      mockPoolQuery.mockResolvedValue({ rows: [] });
      await loginHistoryRepo.recordLogin(
        mockPool, USER_ID, ORG_ID, true, null, '127.0.0.1', 'jest-agent', false
      );
      const [_sql, params] = mockPoolQuery.mock.calls[0];
      expect(params[0]).toBe(USER_ID);      // userName ($1)
      expect(params[1]).toBe(ORG_ID);       // organizationId ($2)
      expect(params[2]).toBe(true);          // success ($3)
      expect(params[3]).toBeNull();          // failureReason ($4)
      expect(params[4]).toBe('127.0.0.1');  // ipAddress ($5)
      expect(params[5]).toBe('jest-agent'); // userAgent ($6)
      expect(params[6]).toBe(false);         // entryExecuteFlg ($7)
    });

    it('ログイン失敗時は failureReason が渡される', async () => {
      mockPoolQuery.mockResolvedValue({ rows: [] });
      await loginHistoryRepo.recordLogin(
        mockPool, USER_ID, ORG_ID, false, 'invalid_password', '10.0.0.1', 'agent', false
      );
      const [_sql, params] = mockPoolQuery.mock.calls[0];
      expect(params[2]).toBe(false);
      expect(params[3]).toBe('invalid_password');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. maimlPublishJobRepository
//    ※ getPgp() (pg-promise) を使用
// ══════════════════════════════════════════════════════════════════════════════
describe('maimlPublishJobRepository', () => {

  // ── insert ─────────────────────────────────────────────────────────────────
  describe('insert()', () => {
    const insertData = {
      job_type:        'publish'  as const,
      organization_id: ORG_ID,
      project_id:      PROJECT_ID,
      asset_id:        null,
      status:          'pending'  as const,   // 'queued' は存在しない
      triggered_by:    USER_ID,
      trigger_type:    'manual'   as const,
      error_message:   null,
      started_at:      null,
      finished_at:     null,
    };

    it('正しいSQLファイルをロードする', async () => {
      mockPgpFns.one.mockResolvedValue({ job_id: JOB_ID, ...insertData });
      await maimlPublishJobRepo.insert(insertData);
      expect(loadSqlFile).toHaveBeenCalledWith('maiml_publish_job/insert.sql');
    });

    it('10個のパラメータを正しい順序で渡す', async () => {
      mockPgpFns.one.mockResolvedValue({ job_id: JOB_ID, ...insertData });
      await maimlPublishJobRepo.insert(insertData);
      const [_sql, params] = mockPgpFns.one.mock.calls[0];
      expect(params).toHaveLength(10);
      expect(params[0]).toBe('publish');      // job_type ($1)
      expect(params[1]).toBe(ORG_ID);         // organization_id ($2)
      expect(params[2]).toBe(PROJECT_ID);     // project_id ($3)
      expect(params[3]).toBeNull();           // asset_id ($4)
      expect(params[4]).toBe('pending');      // status ($5)
      expect(params[5]).toBe(USER_ID);        // triggered_by ($6)
      expect(params[6]).toBe('manual');       // trigger_type ($7)
      expect(params[7]).toBeNull();           // error_message ($8)
      expect(params[8]).toBeNull();           // started_at ($9)
      expect(params[9]).toBeNull();           // finished_at ($10)
    });

    it('INSERT結果のジョブレコードを返す', async () => {
      const returned = { job_id: JOB_ID, ...insertData, created_at: new Date() };
      mockPgpFns.one.mockResolvedValue(returned);
      const result = await maimlPublishJobRepo.insert(insertData);
      expect(result.job_id).toBe(JOB_ID);
    });
  });

  // ── findLatestByProject ────────────────────────────────────────────────────
  describe('findLatestByProject()', () => {
    it('正しいSQLファイルをロードする', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      await maimlPublishJobRepo.findLatestByProject(ORG_ID, PROJECT_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('maiml_publish_job/findLatestByProject.sql');
    });

    it('$1=organizationId, $2=projectId の順でパラメータを渡す', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      await maimlPublishJobRepo.findLatestByProject(ORG_ID, PROJECT_ID);
      const [_sql, params] = mockPgpFns.oneOrNone.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJECT_ID]);
    });

    it('ジョブが存在しない場合は null を返す', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      const result = await maimlPublishJobRepo.findLatestByProject(ORG_ID, PROJECT_ID);
      expect(result).toBeNull();
    });

    it('ジョブが存在する場合はレコードを返す', async () => {
      const job = { job_id: JOB_ID, status: 'running' };
      mockPgpFns.oneOrNone.mockResolvedValue(job);
      const result = await maimlPublishJobRepo.findLatestByProject(ORG_ID, PROJECT_ID);
      expect(result).toEqual(job);
    });
  });

  // ── findByJobId ────────────────────────────────────────────────────────────
  describe('findByJobId()', () => {
    it('正しいSQLファイルをロードする', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      await maimlPublishJobRepo.findByJobId(JOB_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('maiml_publish_job/findByJobId.sql');
    });

    it('$1=jobId のみをパラメータとして渡す', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      await maimlPublishJobRepo.findByJobId(JOB_ID);
      const [_sql, params] = mockPgpFns.oneOrNone.mock.calls[0];
      expect(params).toEqual([JOB_ID]);
    });

    it('存在しない job_id は null を返す', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      const result = await maimlPublishJobRepo.findByJobId('non-existent-id');
      expect(result).toBeNull();
    });
  });

  // ── findPublishedAssetId ───────────────────────────────────────────────────
  describe('findPublishedAssetId()', () => {
    it('正しいSQLファイルをロードする', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      await maimlPublishJobRepo.findPublishedAssetId(ORG_ID, PROJECT_ID);
      expect(loadSqlFile).toHaveBeenCalledWith('maiml_publish_job/findPublishedAssetId.sql');
    });

    it('$1=organizationId, $2=projectId の順でパラメータを渡す', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      await maimlPublishJobRepo.findPublishedAssetId(ORG_ID, PROJECT_ID);
      const [_sql, params] = mockPgpFns.oneOrNone.mock.calls[0];
      expect(params).toEqual([ORG_ID, PROJECT_ID]);
    });

    it('done ジョブが存在しない場合は null を返す', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue(null);
      const result = await maimlPublishJobRepo.findPublishedAssetId(ORG_ID, PROJECT_ID);
      expect(result).toBeNull();
    });

    it('最新 done が publish で asset_id あり → asset_id を返す', async () => {
      const assetId = BigInt(42);
      mockPgpFns.oneOrNone.mockResolvedValue({ job_type: 'publish', asset_id: assetId });
      const result = await maimlPublishJobRepo.findPublishedAssetId(ORG_ID, PROJECT_ID);
      expect(result).toBe(assetId);
    });

    it('最新 done が unpublish → null を返す（非公開済み）', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue({ job_type: 'unpublish', asset_id: BigInt(42) });
      const result = await maimlPublishJobRepo.findPublishedAssetId(ORG_ID, PROJECT_ID);
      expect(result).toBeNull();
    });

    it('最新 done が publish だが asset_id が null → null を返す', async () => {
      mockPgpFns.oneOrNone.mockResolvedValue({ job_type: 'publish', asset_id: null });
      const result = await maimlPublishJobRepo.findPublishedAssetId(ORG_ID, PROJECT_ID);
      expect(result).toBeNull();
    });
  });
});
