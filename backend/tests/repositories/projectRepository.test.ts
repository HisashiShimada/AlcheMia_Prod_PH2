/**
 * ProjectRepositoryのテスト
 */

import { ProjectRepository } from '../../src/repositories/projectRepository';
import { resetPool } from '../../src/database/db';

describe('ProjectRepository', () => {
  let repository: ProjectRepository;
  let mockPool: any;
  let mockClient: any;

  beforeEach(() => {
    // モックプールとクライアントをセットアップ
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    mockPool = {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient),
    };

    // プールをリセットしてモックプールを注入
    resetPool();
    jest.spyOn(require('../../src/database/db'), 'getPool').mockReturnValue(mockPool);

    repository = new ProjectRepository();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findById', () => {
    const organizationId = 'org-123';
    const projectId = 'proj-456';

    test('プロジェクトが存在する場合、プロジェクト情報を返す', async () => {
      const mockProject = {
        organization_id: organizationId,
        project_id: projectId,
        project_name: 'Test Project',
        project_status: 0,
        project_overview: 'Test Overview',
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-02'),
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockProject],
        rowCount: 1,
      } as any);

      const result = await repository.findById(projectId, organizationId);

      expect(result).not.toBeNull();
      expect(result?.organization_id).toBe(organizationId);
      expect(result?.project_id).toBe(projectId);
      expect(result?.project_name).toBe('Test Project');
      expect(result?.project_status).toBe(0);

      // Parameterized Queryが使用されていることを確認
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [organizationId, projectId]
      );

      // organization_idフィルタが含まれていることを確認
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('organization_id');
      expect(queryCall[0]).toContain('$1');
      expect(queryCall[0]).toContain('$2');
    });

    test('プロジェクトが存在しない場合、nullを返す', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await repository.findById(projectId, organizationId);

      expect(result).toBeNull();
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    test('異なる組織のプロジェクトはnullを返す', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      const result = await repository.findById(projectId, 'different-org');

      expect(result).toBeNull();
      
      // organization_idが正しく渡されていることを確認
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        ['different-org', projectId]
      );
    });

    test('データベースエラーが発生した場合、エラーをスローする', async () => {
      const dbError = new Error('Database connection failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(
        repository.findById(projectId, organizationId)
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('updateStatus', () => {
    const organizationId = 'org-123';
    const projectId = 'proj-456';
    const newStatus = 1;

    test('トランザクションなしでステータスを更新できる', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      } as any);

      await repository.updateStatus(projectId, newStatus, organizationId);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE project'),
        [newStatus, organizationId, projectId]
      );

      // organization_idフィルタが含まれていることを確認
      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('organization_id');
      expect(queryCall[0]).toContain('project_status');
      expect(queryCall[0]).toContain('$1');
      expect(queryCall[0]).toContain('$2');
      expect(queryCall[0]).toContain('$3');
    });

    test('トランザクション付きでステータスを更新できる', async () => {
      mockClient.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 1,
      } as any);

      await repository.updateStatus(projectId, newStatus, organizationId, mockClient);

      // トランザクションクライアントが使用されていることを確認
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE project'),
        [newStatus, organizationId, projectId]
      );

      // プールは使用されていないことを確認
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    test('データベースエラーが発生した場合、エラーをスローする', async () => {
      const dbError = new Error('Update failed');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(
        repository.updateStatus(projectId, newStatus, organizationId)
      ).rejects.toThrow('Update failed');
    });

    test('更新対象が0件の場合もエラーをスローしない', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      } as any);

      // エラーをスローせずに正常終了することを確認
      await expect(
        repository.updateStatus(projectId, newStatus, organizationId)
      ).resolves.not.toThrow();
    });
  });
});
