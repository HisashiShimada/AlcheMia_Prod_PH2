/**
 * SQL Loader Tests
 * 
 * 外部SQLファイル読み込み機能のテスト
 */

import { loadSqlFile } from '../../src/sql/loader';

describe('SQL Loader', () => {
  describe('loadSqlFile', () => {
    it('should load SQL file successfully', async () => {
      // Arrange
      const filename = 'tasks/listMethodsAndTasksByProject.sql';

      // Act
      const sql = await loadSqlFile(filename);

      // Assert
      expect(sql).toBeDefined();
      expect(typeof sql).toBe('string');
      expect(sql.length).toBeGreaterThan(0);
    });

    it('should contain required SQL keywords', async () => {
      // Arrange
      const filename = 'tasks/listMethodsAndTasksByProject.sql';

      // Act
      const sql = await loadSqlFile(filename);

      // Assert - SQLクエリの基本構造を確認
      expect(sql).toContain('SELECT');
      expect(sql).toContain('FROM project_task');
      expect(sql).toContain('LEFT JOIN project_task_detail');
      expect(sql).toContain('LEFT JOIN transition_data');
      expect(sql).toContain('LEFT JOIN organization_user');
      expect(sql).toContain('LEFT JOIN user_authentication');
      expect(sql).toContain('WHERE');
      expect(sql).toContain('GROUP BY');
      expect(sql).toContain('ORDER BY');
    });

    it('should contain organization_id filters on all JOIN conditions', async () => {
      // Arrange
      const filename = 'tasks/listMethodsAndTasksByProject.sql';

      // Act
      const sql = await loadSqlFile(filename);

      // Assert - マルチテナント分離の確認
      // project_task_detail JOIN
      expect(sql).toContain('AND pt.organization_id = ptd.organization_id');
      
      // transition_data JOIN
      expect(sql).toContain('AND ptd.organization_id = td.organization_id');
      
      // organization_user JOIN
      expect(sql).toContain('AND ptd.organization_id = ou.organization_id');
      
      // user_authentication JOIN
      expect(sql).toContain('AND ou.organization_id = ua.organization_id');
      
      // WHERE clause
      expect(sql).toContain('AND pt.organization_id = $2');
    });

    it('should use parameterized query placeholders', async () => {
      // Arrange
      const filename = 'tasks/listMethodsAndTasksByProject.sql';

      // Act
      const sql = await loadSqlFile(filename);

      // Assert - Parameterized Queriesの確認
      expect(sql).toContain('$1');  // project_id
      expect(sql).toContain('$2');  // organization_id
    });

    it('should include progress_rate calculation with COALESCE', async () => {
      // Arrange
      const filename = 'tasks/listMethodsAndTasksByProject.sql';

      // Act
      const sql = await loadSqlFile(filename);

      // Assert - 進捗率計算の確認
      expect(sql).toContain('COALESCE(AVG(td.progress_rate), 0)');
      expect(sql).toContain('AS progress_rate');
    });

    it('should include all required columns in SELECT', async () => {
      // Arrange
      const filename = 'tasks/listMethodsAndTasksByProject.sql';

      // Act
      const sql = await loadSqlFile(filename);

      // Assert - 必須カラムの確認
      const requiredColumns = [
        'method_id',
        'method_name',
        'experiment_order',
        'task_detail_id',
        'task_detail_no',
        'task_status',
        'assign_user_id',
        'created_at',
        'updated_at',
        'progress_rate',
        'assign_user_name'
      ];

      requiredColumns.forEach(column => {
        expect(sql).toContain(column);
      });
    });

    it('should order by experiment_order ASC and task_no ASC', async () => {
      // Arrange
      const filename = 'tasks/listMethodsAndTasksByProject.sql';

      // Act
      const sql = await loadSqlFile(filename);

      // Assert - ソート順の確認
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('pt.experiment_order ASC');
      expect(sql).toContain('ptd.task_no ASC');
    });

    it('should include GROUP BY clause with all non-aggregated columns', async () => {
      // Arrange
      const filename = 'tasks/listMethodsAndTasksByProject.sql';

      // Act
      const sql = await loadSqlFile(filename);

      // Assert - GROUP BY句の確認
      expect(sql).toContain('GROUP BY');
      
      // メソッド情報
      expect(sql).toContain('pt.method_id');
      expect(sql).toContain('pt.task_name');
      expect(sql).toContain('pt.experiment_order');
      
      // タスク詳細情報（GROUP BY句内）
      expect(sql).toMatch(/GROUP BY[\s\S]*ptd\.task_no/);
      expect(sql).toMatch(/GROUP BY[\s\S]*ptd\.task_status/);
      expect(sql).toMatch(/GROUP BY[\s\S]*ptd\.experiment_user_id/);
    });

    it('should throw error for non-existent file', async () => {
      // Arrange
      const filename = 'nonexistent/file.sql';

      // Act & Assert
      await expect(loadSqlFile(filename)).rejects.toThrow();
    });
  });
});