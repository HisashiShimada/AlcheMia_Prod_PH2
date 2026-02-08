/**
 * TaskRepository.findMethodsAndTasksByProjectのテスト
 * 
 * タスク1.2: TaskRepositoryインターフェースと実装の作成
 */

import { TaskRepository } from '../../src/repositories/taskRepository';
import { resetPool } from '../../src/database/db';
import * as sqlLoader from '../../src/sql/loader';

describe('TaskRepository.findMethodsAndTasksByProject', () => {
  let repository: TaskRepository;
  let mockPool: any;

  beforeEach(() => {
    // モックプールをセットアップ
    mockPool = {
      query: jest.fn(),
    };

    // プールをリセットしてモックプールを注入
    resetPool();
    jest.spyOn(require('../../src/database/db'), 'getPool').mockReturnValue(mockPool);

    repository = new TaskRepository();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('正常系: データ取得', () => {
    test('プロジェクトIDとorganization_idでメソッドとタスクを取得できる', async () => {
      const projectId = 'proj-123';
      const organizationId = 'org-456';

      // モックSQLファイルの内容
      const mockSql = 'SELECT * FROM project_task WHERE project_id = $1 AND organization_id = $2';
      jest.spyOn(sqlLoader, 'loadSqlFile').mockResolvedValue(mockSql);

      // モックDBレスポンス
      const mockRows = [
        {
          method_id: 'method-001',
          method_name: 'Method 1',
          experiment_order: 1,
          task_detail_id: 'task-001',
          task_detail_no: 1,
          task_status: 0,
          assign_user_id: 'user-001',
          assign_user_name: 'Test User',
          progress_rate: 50,
          created_at: new Date('2024-01-01T00:00:00Z'),
          updated_at: new Date('2024-01-02T00:00:00Z'),
        },
      ];
      mockPool.query.mockResolvedValue({ rows: mockRows });

      // メソッド実行
      const result = await repository.findMethodsAndTasksByProject(
        projectId,
        organizationId,
        {}
      );

      // 検証: SQLファイルが読み込まれたか
      expect(sqlLoader.loadSqlFile).toHaveBeenCalledWith('tasks/listMethodsAndTasksByProject.sql');

      // 検証: クエリが実行されたか
      expect(mockPool.query).toHaveBeenCalledTimes(1);

      // 検証: Parameterized Queryが使用されたか
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toBeDefined();
      expect(queryCall[1]).toEqual([projectId, organizationId]);

      // 検証: 結果が正しく返却されたか
      expect(result).toEqual(mockRows);
    });

    test('フィルタなしの場合、projectIdとorganizationIdのみでクエリを実行する', async () => {
      const projectId = 'proj-123';
      const organizationId = 'org-456';

      const mockSql = 'SELECT * FROM project_task WHERE project_id = $1 AND organization_id = $2';
      jest.spyOn(sqlLoader, 'loadSqlFile').mockResolvedValue(mockSql);

      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.findMethodsAndTasksByProject(
        projectId,
        organizationId,
        {}
      );

      // 検証: パラメータはprojectIdとorganizationIdのみ
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[1]).toEqual([projectId, organizationId]);
    });

    test('空のデータベース結果でも正常に処理できる', async () => {
      const projectId = 'proj-123';
      const organizationId = 'org-456';

      const mockSql = 'SELECT * FROM project_task WHERE project_id = $1 AND organization_id = $2';
      jest.spyOn(sqlLoader, 'loadSqlFile').mockResolvedValue(mockSql);

      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await repository.findMethodsAndTasksByProject(
        projectId,
        organizationId,
        {}
      );

      expect(result).toEqual([]);
    });
  });

  describe('フィルタリング機能', () => {
    test('methodIdフィルタが動的WHERE句に追加される', async () => {
      const projectId = 'proj-123';
      const organizationId = 'org-456';
      const filters = { methodId: 'method-001' };

      const mockSql = `SELECT * FROM project_task pt
WHERE pt.project_id = $1
  AND pt.organization_id = $2
ORDER BY pt.experiment_order ASC, ptd.task_no ASC`;
      jest.spyOn(sqlLoader, 'loadSqlFile').mockResolvedValue(mockSql);

      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.findMethodsAndTasksByProject(
        projectId,
        organizationId,
        filters
      );

      // 検証: WHERE句にmethodIdが追加されたか
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('pt.method_id = $3');
      expect(queryCall[1]).toEqual([projectId, organizationId, 'method-001']);
    });

    test('statusフィルタが動的WHERE句に追加される', async () => {
      const projectId = 'proj-123';
      const organizationId = 'org-456';
      const filters = { status: 'in_progress' as const };

      const mockSql = `SELECT * FROM project_task pt
WHERE pt.project_id = $1
  AND pt.organization_id = $2
ORDER BY pt.experiment_order ASC, ptd.task_no ASC`;
      jest.spyOn(sqlLoader, 'loadSqlFile').mockResolvedValue(mockSql);

      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.findMethodsAndTasksByProject(
        projectId,
        organizationId,
        filters
      );

      // 検証: WHERE句にstatusが追加されたか
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('ptd.task_status = $3');
      expect(queryCall[1]).toEqual([projectId, organizationId, 'in_progress']);
    });

    test('assignUserIdフィルタが動的WHERE句に追加される', async () => {
      const projectId = 'proj-123';
      const organizationId = 'org-456';
      const filters = { assignUserId: 'user-001' };

      const mockSql = `SELECT * FROM project_task pt
WHERE pt.project_id = $1
  AND pt.organization_id = $2
ORDER BY pt.experiment_order ASC, ptd.task_no ASC`;
      jest.spyOn(sqlLoader, 'loadSqlFile').mockResolvedValue(mockSql);

      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.findMethodsAndTasksByProject(
        projectId,
        organizationId,
        filters
      );

      // 検証: WHERE句にassignUserIdが追加されたか
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('ptd.experiment_user_id = $3');
      expect(queryCall[1]).toEqual([projectId, organizationId, 'user-001']);
    });

    test('複数のフィルタ条件を組み合わせて使用できる', async () => {
      const projectId = 'proj-123';
      const organizationId = 'org-456';
      const filters = {
        methodId: 'method-001',
        status: 'in_progress' as const,
        assignUserId: 'user-001',
      };

      const mockSql = `SELECT * FROM project_task pt
WHERE pt.project_id = $1
  AND pt.organization_id = $2
ORDER BY pt.experiment_order ASC, ptd.task_no ASC`;
      jest.spyOn(sqlLoader, 'loadSqlFile').mockResolvedValue(mockSql);

      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.findMethodsAndTasksByProject(
        projectId,
        organizationId,
        filters
      );

      // 検証: 全てのフィルタ条件がパラメータに含まれるか
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[1]).toEqual([
        projectId,
        organizationId,
        'method-001',
        'in_progress',
        'user-001',
      ]);
    });
  });

  describe('ソート機能', () => {
    test('sortByとorderが動的ORDER BY句に追加される', async () => {
      const projectId = 'proj-123';
      const organizationId = 'org-456';
      const filters = {
        sortBy: 'task_no' as const,
        order: 'desc' as const,
      };

      const mockSql = `SELECT * FROM project_task pt
WHERE pt.project_id = $1
  AND pt.organization_id = $2
ORDER BY pt.experiment_order ASC, ptd.task_no ASC`;
      jest.spyOn(sqlLoader, 'loadSqlFile').mockResolvedValue(mockSql);

      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.findMethodsAndTasksByProject(
        projectId,
        organizationId,
        filters
      );

      // 検証: ORDER BY句が追加されたか
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('ORDER BY');
      expect(queryCall[0]).toContain('ptd.task_no DESC');
    });

    test('sortBy=created_atの場合、適切なカラムでソートされる', async () => {
      const projectId = 'proj-123';
      const organizationId = 'org-456';
      const filters = {
        sortBy: 'created_at' as const,
        order: 'asc' as const,
      };

      const mockSql = `SELECT * FROM project_task pt
WHERE pt.project_id = $1
  AND pt.organization_id = $2
ORDER BY pt.experiment_order ASC, ptd.task_no ASC`;
      jest.spyOn(sqlLoader, 'loadSqlFile').mockResolvedValue(mockSql);

      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.findMethodsAndTasksByProject(
        projectId,
        organizationId,
        filters
      );

      // 検証: created_atでソートされるか
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('ptd.experiment_start_at ASC');
    });

    test('ソート条件が指定されない場合、デフォルトソート（task_no ASC）が使用される', async () => {
      const projectId = 'proj-123';
      const organizationId = 'org-456';

      const mockSql = 'SELECT * FROM project_task WHERE project_id = $1 AND organization_id = $2 ORDER BY pt.experiment_order ASC, ptd.task_no ASC';
      jest.spyOn(sqlLoader, 'loadSqlFile').mockResolvedValue(mockSql);

      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.findMethodsAndTasksByProject(
        projectId,
        organizationId,
        {}
      );

      // 検証: デフォルトのORDER BY句が使用されるか
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('ORDER BY');
      expect(queryCall[0]).toContain('ptd.task_no ASC');
    });
  });

  describe('マルチテナント分離', () => {
    test('organization_idフィルタが必須で含まれる', async () => {
      const projectId = 'proj-123';
      const organizationId = 'org-456';

      const mockSql = 'SELECT * FROM project_task WHERE project_id = $1 AND organization_id = $2';
      jest.spyOn(sqlLoader, 'loadSqlFile').mockResolvedValue(mockSql);

      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.findMethodsAndTasksByProject(
        projectId,
        organizationId,
        {}
      );

      // 検証: organization_idが必ずパラメータに含まれる
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[1]).toContain(organizationId);
    });

    test('全てのJOINでorganization_idフィルタが適用される', async () => {
      const projectId = 'proj-123';
      const organizationId = 'org-456';

      const mockSql = `
        SELECT * FROM project_task pt
        LEFT JOIN project_task_detail ptd ON pt.method_id = ptd.method_id AND pt.organization_id = ptd.organization_id
        WHERE pt.project_id = $1 AND pt.organization_id = $2
      `;
      jest.spyOn(sqlLoader, 'loadSqlFile').mockResolvedValue(mockSql);

      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.findMethodsAndTasksByProject(
        projectId,
        organizationId,
        {}
      );

      // 検証: SQLにorganization_idフィルタが含まれる
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('organization_id');
    });
  });

  describe('エラーハンドリング', () => {
    test('SQLファイル読み込みエラーが発生した場合、エラーをスローする', async () => {
      const projectId = 'proj-123';
      const organizationId = 'org-456';

      jest.spyOn(sqlLoader, 'loadSqlFile').mockRejectedValue(new Error('SQL file not found'));

      await expect(
        repository.findMethodsAndTasksByProject(projectId, organizationId, {})
      ).rejects.toThrow('SQL file not found');
    });

    test('データベースクエリエラーが発生した場合、エラーをスローする', async () => {
      const projectId = 'proj-123';
      const organizationId = 'org-456';

      const mockSql = 'SELECT * FROM project_task WHERE project_id = $1 AND organization_id = $2';
      jest.spyOn(sqlLoader, 'loadSqlFile').mockResolvedValue(mockSql);

      mockPool.query.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        repository.findMethodsAndTasksByProject(projectId, organizationId, {})
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('Parameterized Queries', () => {
    test('SQLインジェクション対策としてParameterized Queriesを使用する', async () => {
      const projectId = 'proj-123; DROP TABLE project_task;--';
      const organizationId = 'org-456';

      const mockSql = 'SELECT * FROM project_task WHERE project_id = $1 AND organization_id = $2';
      jest.spyOn(sqlLoader, 'loadSqlFile').mockResolvedValue(mockSql);

      mockPool.query.mockResolvedValue({ rows: [] });

      await repository.findMethodsAndTasksByProject(
        projectId,
        organizationId,
        {}
      );

      // 検証: パラメータとして渡されている（文字列連結ではない）
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[1]).toEqual([projectId, organizationId]);
    });
  });
});