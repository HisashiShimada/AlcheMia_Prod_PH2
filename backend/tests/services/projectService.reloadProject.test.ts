/**
 * ProjectService.reloadProject ユニットテスト
 * 
 * Task 2.3: 並行リロード制御機能のテスト
 * Requirements: REQ-1, REQ-4, REQ-6
 */

import { ProjectService } from '../../src/services/projectService';
import { getPool } from '../../src/database/db';
import { getStorageService } from '../../src/services/storageService';
import { FileMetadataRepository } from '../../src/repositories/fileMetadataRepository';

// モック設定
jest.mock('../../src/database/db');
jest.mock('../../src/services/storageService');
jest.mock('../../src/repositories/fileMetadataRepository');

describe('ProjectService.reloadProject', () => {
  let projectService: ProjectService;
  let mockPool: any;
  let mockStorageService: any;
  let mockFileMetadataRepo: any;

  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();

    projectService = new ProjectService();

    // データベースプールモック
    mockPool = {
      query: jest.fn(),
    };
    (getPool as jest.Mock).mockReturnValue(mockPool);

    // StorageServiceモック
    mockStorageService = {
      listFiles: jest.fn(),
      getBucketName: jest.fn().mockReturnValue('test-bucket'),
    };
    (getStorageService as jest.Mock).mockReturnValue(mockStorageService);

    // FileMetadataRepositoryモック
    mockFileMetadataRepo = {
      getByProject: jest.fn(),
      executeBatch: jest.fn(),
    };
    (FileMetadataRepository as jest.Mock).mockImplementation(() => mockFileMetadataRepo);
  });

  describe('正常系', () => {
    it('プロジェクトリロードを正常に実行する', async () => {
      // プロジェクト存在確認のモック（reloadProject内）
      mockPool.query.mockResolvedValueOnce({
        rows: [{ project_id: 'project-1', project_name: 'Test Project' }],
      });

      // タスク数取得のモック（Task 2.4用）
      mockPool.query.mockResolvedValueOnce({
        rows: [{ total_tasks: 5 }],
      });

      // プロジェクト存在確認のモック（clearProjectCache内）
      mockPool.query.mockResolvedValueOnce({
        rows: [{ project_id: 'project-1' }],
      });

      // S3ファイルリストのモック
      mockStorageService.listFiles.mockResolvedValue([
        {
          key: 'org_test/projects/Test Project/file1.maiml',
          size: 1024,
          lastModified: new Date('2024-01-01'),
        },
      ]);

      // DBファイルメタデータのモック
      mockFileMetadataRepo.getByProject.mockResolvedValue([]);

      // executeBatchのモック
      mockFileMetadataRepo.executeBatch.mockResolvedValue(undefined);

      // リロード実行
      const result = await projectService.reloadProject(
        'org-1',
        'org_test',
        'project-1',
        'Test Project'
      );

      // デバッグ出力
      if (!result.success) {
        console.log('Error:', result.error);
      }

      // アサーション
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        projectId: 'project-1',
        summary: {
          filesAdded: 1,
          filesUpdated: 0,
          filesDeleted: 0,
          totalTasks: 5,
          cacheCleared: true,
        },
      });
    });
  });

  describe('並行リロード制御', () => {
    it('同一プロジェクトの並行リロードを検出してエラーを返す', async () => {
      // 最初のリロード実行を遅延させる
      let callCount = 0;
      mockPool.query.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // プロジェクト存在確認
          return new Promise(resolve => setTimeout(() => resolve({
            rows: [{ project_id: 'project-1', project_name: 'Test Project' }]
          }), 500));
        } else {
          // タスク数取得
          return Promise.resolve({ rows: [{ total_tasks: 0 }] });
        }
      });
      
      mockStorageService.listFiles.mockResolvedValue([]);
      mockFileMetadataRepo.getByProject.mockResolvedValue([]);

      // 最初のリロード開始
      const firstReload = projectService.reloadProject(
        'org-1',
        'org_test',
        'project-1',
        'Test Project'
      );

      // 並行リロード試行
      const secondReload = await projectService.reloadProject(
        'org-1',
        'org_test',
        'project-1',
        'Test Project'
      );

      // 2番目のリロードはエラーを返す
      expect(secondReload.success).toBe(false);
      expect(secondReload.error?.code).toBe('PROJECT_RELOAD_IN_PROGRESS');

      // 最初のリロード完了を待つ
      await firstReload;
    });

    it('リロード完了後はロックが解放される', async () => {
      // 1回目のリロード用のモック
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ project_id: 'project-1', project_name: 'Test Project' }],
        })
        .mockResolvedValueOnce({
          rows: [{ total_tasks: 0 }],
        })
        .mockResolvedValueOnce({
          rows: [{ project_id: 'project-1' }], // clearProjectCache用
        });

      // S3ファイルリストのモック
      mockStorageService.listFiles.mockResolvedValue([]);

      // DBファイルメタデータのモック
      mockFileMetadataRepo.getByProject.mockResolvedValue([]);

      // 最初のリロード実行
      await projectService.reloadProject('org-1', 'org_test', 'project-1', 'Test Project');

      // 2回目のリロード用のモック
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ project_id: 'project-1', project_name: 'Test Project' }],
        })
        .mockResolvedValueOnce({
          rows: [{ total_tasks: 0 }],
        })
        .mockResolvedValueOnce({
          rows: [{ project_id: 'project-1' }], // clearProjectCache用
        });

      const secondResult = await projectService.reloadProject(
        'org-1',
        'org_test',
        'project-1',
        'Test Project'
      );

      // 2回目も成功する
      expect(secondResult.success).toBe(true);
    });
  });

  describe('エラーケース', () => {
    it('プロジェクトが存在しない場合、404エラーを返す', async () => {
      // プロジェクト不存在のモック
      mockPool.query.mockResolvedValue({
        rows: [],
      });

      const result = await projectService.reloadProject(
        'org-1',
        'org_test',
        'project-999',
        'Nonexistent Project'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('RESOURCE_NOT_FOUND');
    });
  });
});
