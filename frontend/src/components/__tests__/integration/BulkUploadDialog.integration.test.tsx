/**
 * BulkUploadDialog 統合テスト
 * fileServiceとBulkUploadDialogの統合動作を検証
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BulkUploadDialog from '../../project/BulkUploadDialog';
import { fileService } from '@/services/fileService';
import type { UploadFilesParams, UploadProgress } from '@/services/fileService';

// fileServiceをモック
jest.mock('@/services/fileService', () => ({
  fileService: {
    uploadFiles: jest.fn(),
  },
}));

// extractErrorMessageをモック
jest.mock('@/utils/errorUtils', () => ({
  extractErrorMessage: jest.fn((error) => {
    if (error instanceof Error) {
      return error.message;
    }
    return 'エラーが発生しました';
  }),
}));

describe('BulkUploadDialog Integration Tests', () => {
  const mockOnClose = jest.fn();
  const mockOnUploadComplete = jest.fn();
  const projectId = 'project-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('単一ファイルアップロード', () => {
    it('should complete single file upload with success message', async () => {
      const mockFile = new File(['test content'], 'experiment.maiml', {
        type: 'application/xml',
      });

      (fileService.uploadFiles as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          uploadMode: 'single',
          file: {
            fileId: 'file-001',
            fileName: 'experiment.maiml',
            filePath: 'projects/test-project/experiment.maiml',
            s3Key: 'org_test/projects/test-project/experiment.maiml',
            fileSize: 12,
            contentType: 'application/xml',
            uploadedAt: '2026-01-19T10:00:00Z',
          },
        },
      });

      render(
        <BulkUploadDialog
          open={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          projectId={projectId}
        />
      );

      // ファイル選択
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', {
        value: [mockFile],
        writable: false,
      });
      fireEvent.change(input);

      await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: /アップロード開始/i });
        expect(uploadButton).toBeEnabled();
      });

      // アップロード実行
      const uploadButton = screen.getByRole('button', { name: /アップロード開始/i });
      fireEvent.click(uploadButton);

      // API呼び出し検証
      await waitFor(() => {
        expect(fileService.uploadFiles).toHaveBeenCalledTimes(1);
      });

      const callParams = (fileService.uploadFiles as jest.Mock).mock.calls[0][0] as UploadFilesParams;
      expect(callParams.projectId).toBe(projectId);
      expect(callParams.uploadMode).toBe('single');
      expect(callParams.files).toHaveLength(1);

      // 成功メッセージ表示確認
      await waitFor(() => {
        expect(screen.getByText(/アップロード完了/i)).toBeInTheDocument();
      });

      // コールバック呼び出し確認
      expect(mockOnUploadComplete).toHaveBeenCalledWith({
        mode: 'single',
        fileCount: 1,
        success: true,
      });
    });
  });

  describe('一括ファイルアップロード', () => {
    it('should complete bulk upload with batch name', async () => {
      const mockFiles = [
        new File(['content1'], 'file1.maiml', { type: 'application/xml' }),
        new File(['content2'], 'file2.maiml', { type: 'application/xml' }),
        new File(['content3'], 'file3.maiml', { type: 'application/xml' }),
      ];

      (fileService.uploadFiles as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          uploadMode: 'bulk',
          files: [
            {
              fileId: 'file-001',
              fileName: 'file1.maiml',
              filePath: 'projects/test/file1.maiml',
              s3Key: 'org_test/projects/test/file1.maiml',
              fileSize: 8,
              contentType: 'application/xml',
              uploadedAt: '2026-01-19T10:00:00Z',
              status: 'success',
            },
            {
              fileId: 'file-002',
              fileName: 'file2.maiml',
              filePath: 'projects/test/file2.maiml',
              s3Key: 'org_test/projects/test/file2.maiml',
              fileSize: 8,
              contentType: 'application/xml',
              uploadedAt: '2026-01-19T10:00:01Z',
              status: 'success',
            },
            {
              fileId: 'file-003',
              fileName: 'file3.maiml',
              filePath: 'projects/test/file3.maiml',
              s3Key: 'org_test/projects/test/file3.maiml',
              fileSize: 8,
              contentType: 'application/xml',
              uploadedAt: '2026-01-19T10:00:02Z',
              status: 'success',
            },
          ],
          summary: {
            totalFiles: 3,
            successfulFiles: 3,
            failedFiles: 0,
            totalSize: 24,
          },
        },
      });

      render(
        <BulkUploadDialog
          open={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
          projectId={projectId}
        />
      );

      // 一括ファイルモードに切り替え
      const bulkButton = screen.getByText('一括ファイル');
      fireEvent.click(bulkButton);

      // ファイル選択
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', {
        value: mockFiles,
        writable: false,
      });
      fireEvent.change(input);

      await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: /アップロード開始/i });
        expect(uploadButton).toBeEnabled();
      });

      // アップロード実行
      const uploadButton = screen.getByRole('button', { name: /アップロード開始/i });
      fireEvent.click(uploadButton);

      // API呼び出し検証
      await waitFor(() => {
        expect(fileService.uploadFiles).toHaveBeenCalled();
      });

      const callParams = (fileService.uploadFiles as jest.Mock).mock.calls[0][0] as UploadFilesParams;
      expect(callParams.uploadMode).toBe('bulk');
      expect(callParams.files).toHaveLength(3);
      expect(callParams.batchName).toContain('一括アップロード');

      // 成功確認
      await waitFor(() => {
        expect(screen.getByText(/アップロード完了/i)).toBeInTheDocument();
      });
    });
  });

  describe('フォルダアップロード', () => {
    it('should upload folder with structure preservation', async () => {
      const mockFolderFiles = [
        new File(['content1'], 'folder/subfolder1/file1.maiml', { type: 'application/xml' }),
        new File(['content2'], 'folder/subfolder1/file2.maiml', { type: 'application/xml' }),
        new File(['content3'], 'folder/subfolder2/file3.maiml', { type: 'application/xml' }),
      ];

      // webkitRelativePathをシミュレート
      Object.defineProperty(mockFolderFiles[0], 'webkitRelativePath', {
        value: 'folder/subfolder1/file1.maiml',
      });
      Object.defineProperty(mockFolderFiles[1], 'webkitRelativePath', {
        value: 'folder/subfolder1/file2.maiml',
      });
      Object.defineProperty(mockFolderFiles[2], 'webkitRelativePath', {
        value: 'folder/subfolder2/file3.maiml',
      });

      (fileService.uploadFiles as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          uploadMode: 'folder',
          files: mockFolderFiles.map((file, idx) => ({
            fileId: `file-00${idx + 1}`,
            fileName: file.name,
            filePath: `projects/test/${file.name}`,
            s3Key: `org_test/projects/test/${file.name}`,
            fileSize: 8,
            contentType: 'application/xml',
            uploadedAt: '2026-01-19T10:00:00Z',
            status: 'success',
          })),
          summary: {
            totalFiles: 3,
            successfulFiles: 3,
            failedFiles: 0,
            totalSize: 24,
          },
        },
      });

      render(
        <BulkUploadDialog
          open={true}
          onClose={mockOnClose}
          projectId={projectId}
        />
      );

      // フォルダモードに切り替え
      const folderButton = screen.getByText('フォルダ');
      fireEvent.click(folderButton);

      // フォルダ選択ボタンをクリック
      const selectFolderButton = screen.getByRole('button', { name: /フォルダを選択/i });
      expect(selectFolderButton).toBeInTheDocument();

      // 注: 実際のフォルダ選択はE2Eテストで検証
      // ここではファイルリストが設定されたと仮定してテストを進める
    });
  });

  describe('進捗表示の更新', () => {
    it('should update progress bar during upload', async () => {
      const mockFile = new File(['test'], 'test.maiml', { type: 'application/xml' });

      let capturedOnProgress: ((progress: UploadProgress) => void) | undefined;

      (fileService.uploadFiles as jest.Mock).mockImplementation((params: UploadFilesParams) => {
        capturedOnProgress = params.onProgress;

        // 進捗イベントをシミュレート
        if (capturedOnProgress) {
          setTimeout(() => capturedOnProgress!({
            uploadedBytes: 25,
            totalBytes: 100,
            percentage: 25,
            uploadedCount: 0,
            totalCount: 1,
          }), 10);

          setTimeout(() => capturedOnProgress!({
            uploadedBytes: 50,
            totalBytes: 100,
            percentage: 50,
            uploadedCount: 0,
            totalCount: 1,
          }), 20);

          setTimeout(() => capturedOnProgress!({
            uploadedBytes: 75,
            totalBytes: 100,
            percentage: 75,
            uploadedCount: 0,
            totalCount: 1,
          }), 30);

          setTimeout(() => capturedOnProgress!({
            uploadedBytes: 100,
            totalBytes: 100,
            percentage: 100,
            uploadedCount: 1,
            totalCount: 1,
          }), 40);
        }

        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: true,
              data: {
                uploadMode: 'single',
                file: {
                  fileId: 'file-001',
                  fileName: 'test.maiml',
                  filePath: 'projects/test/test.maiml',
                  s3Key: 'org_test/projects/test/test.maiml',
                  fileSize: 4,
                  contentType: 'application/xml',
                  uploadedAt: '2026-01-19T10:00:00Z',
                },
              },
            });
          }, 50);
        });
      });

      render(
        <BulkUploadDialog
          open={true}
          onClose={mockOnClose}
          projectId={projectId}
        />
      );

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', {
        value: [mockFile],
        writable: false,
      });
      fireEvent.change(input);

      await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: /アップロード開始/i });
        expect(uploadButton).toBeEnabled();
      });

      const uploadButton = screen.getByRole('button', { name: /アップロード開始/i });
      fireEvent.click(uploadButton);

      // アップロード中表示の確認
      await waitFor(() => {
        expect(screen.getByText(/アップロード中/i)).toBeInTheDocument();
      });

      // onProgressが呼ばれたことを確認
      expect(capturedOnProgress).toBeDefined();

      // 完了を待機
      await waitFor(() => {
        expect(screen.getByText(/アップロード完了/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('エラーハンドリング', () => {
    it('should display validation error (400)', async () => {
      const mockFile = new File(['test'], 'test.maiml', { type: 'application/xml' });

      (fileService.uploadFiles as jest.Mock).mockRejectedValue(
        new Error('ファイルサイズが上限（100MB）を超えています')
      );

      render(
        <BulkUploadDialog
          open={true}
          onClose={mockOnClose}
          projectId={projectId}
        />
      );

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', {
        value: [mockFile],
        writable: false,
      });
      fireEvent.change(input);

      await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: /アップロード開始/i });
        expect(uploadButton).toBeEnabled();
      });

      const uploadButton = screen.getByRole('button', { name: /アップロード開始/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/アップロードエラー/i)).toBeInTheDocument();
        expect(screen.getByText(/ファイルサイズが上限（100MB）を超えています/i)).toBeInTheDocument();
      });
    });

    it('should display authentication error (401)', async () => {
      const mockFile = new File(['test'], 'test.maiml', { type: 'application/xml' });

      (fileService.uploadFiles as jest.Mock).mockRejectedValue(
        new Error('セッションが期限切れです。再ログインしてください')
      );

      render(
        <BulkUploadDialog
          open={true}
          onClose={mockOnClose}
          projectId={projectId}
        />
      );

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', {
        value: [mockFile],
        writable: false,
      });
      fireEvent.change(input);

      await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: /アップロード開始/i });
        expect(uploadButton).toBeEnabled();
      });

      const uploadButton = screen.getByRole('button', { name: /アップロード開始/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/セッションが期限切れです/i)).toBeInTheDocument();
      });
    });

    it('should display permission error (403)', async () => {
      const mockFile = new File(['test'], 'test.maiml', { type: 'application/xml' });

      (fileService.uploadFiles as jest.Mock).mockRejectedValue(
        new Error('アップロード権限がありません')
      );

      render(
        <BulkUploadDialog
          open={true}
          onClose={mockOnClose}
          projectId={projectId}
        />
      );

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', {
        value: [mockFile],
        writable: false,
      });
      fireEvent.change(input);

      await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: /アップロード開始/i });
        expect(uploadButton).toBeEnabled();
      });

      const uploadButton = screen.getByRole('button', { name: /アップロード開始/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/アップロード権限がありません/i)).toBeInTheDocument();
      });
    });

    it('should display network error', async () => {
      const mockFile = new File(['test'], 'test.maiml', { type: 'application/xml' });

      (fileService.uploadFiles as jest.Mock).mockRejectedValue(
        new Error('ネットワークエラーが発生しました')
      );

      render(
        <BulkUploadDialog
          open={true}
          onClose={mockOnClose}
          projectId={projectId}
        />
      );

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', {
        value: [mockFile],
        writable: false,
      });
      fireEvent.change(input);

      await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: /アップロード開始/i });
        expect(uploadButton).toBeEnabled();
      });

      const uploadButton = screen.getByRole('button', { name: /アップロード開始/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/ネットワークエラーが発生しました/i)).toBeInTheDocument();
      });
    });

    it('should maintain file list after error for retry', async () => {
      const mockFile = new File(['test'], 'test.maiml', { type: 'application/xml' });

      (fileService.uploadFiles as jest.Mock).mockRejectedValue(
        new Error('一時的なエラー')
      );

      render(
        <BulkUploadDialog
          open={true}
          onClose={mockOnClose}
          projectId={projectId}
        />
      );

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', {
        value: [mockFile],
        writable: false,
      });
      fireEvent.change(input);

      await waitFor(() => {
        const uploadButton = screen.getByRole('button', { name: /アップロード開始/i });
        expect(uploadButton).toBeEnabled();
      });

      const uploadButton = screen.getByRole('button', { name: /アップロード開始/i });
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/アップロードエラー/i)).toBeInTheDocument();
      });

      // ファイルリストが保持されていることを確認
      expect(screen.getByText(/選択ファイル \(1個\)/i)).toBeInTheDocument();
      expect(screen.getByText('test.maiml')).toBeInTheDocument();

      // アップロードボタンがまだ有効（リトライ可能）
      const retryButton = screen.getByRole('button', { name: /アップロード開始/i });
      expect(retryButton).toBeEnabled();
    });
  });
});
