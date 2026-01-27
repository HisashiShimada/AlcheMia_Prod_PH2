/**
 * BulkUploadDialog テスト
 * 一括ファイルアップロードダイアログのテスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BulkUploadDialog from '../BulkUploadDialog';
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

describe('BulkUploadDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnUploadComplete = jest.fn();
  const projectId = 'project-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('API呼び出しパラメータの検証', () => {
    it('should call API with correct parameters for single file upload', async () => {
      const mockFile = new File(['test content'], 'test.maiml', {
        type: 'application/xml',
      });

      (fileService.uploadFiles as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          uploadMode: 'single',
          file: {
            fileId: 'file-001',
            fileName: 'test.maiml',
            filePath: 'projects/test/test.maiml',
            s3Key: 'org_test/projects/test/test.maiml',
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

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();

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
        expect(fileService.uploadFiles).toHaveBeenCalledTimes(1);
      });

      const callParams = (fileService.uploadFiles as jest.Mock).mock.calls[0][0] as UploadFilesParams;
      expect(callParams.projectId).toBe(projectId);
      expect(callParams.uploadMode).toBe('single');
      expect(callParams.files).toHaveLength(1);
      expect(callParams.files[0].name).toBe('test.maiml');
    });

    it('should call API with batchName for bulk upload', async () => {
      const mockFile1 = new File(['content1'], 'file1.maiml', { type: 'application/xml' });
      const mockFile2 = new File(['content2'], 'file2.maiml', { type: 'application/xml' });

      (fileService.uploadFiles as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          uploadMode: 'bulk',
          files: [],
          summary: {
            totalFiles: 2,
            successfulFiles: 2,
            failedFiles: 0,
            totalSize: 16,
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

      const bulkButton = screen.getByText('一括ファイル');
      fireEvent.click(bulkButton);

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      Object.defineProperty(input, 'files', {
        value: [mockFile1, mockFile2],
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
        expect(fileService.uploadFiles).toHaveBeenCalled();
      });

      const callParams = (fileService.uploadFiles as jest.Mock).mock.calls[0][0] as UploadFilesParams;
      expect(callParams.batchName).toContain('一括アップロード');
      expect(callParams.files).toHaveLength(2);
    });
  });

  describe('進捗状態の更新', () => {
    it('should update progress state during upload', async () => {
      const mockFile = new File(['test'], 'test.maiml', { type: 'application/xml' });

      let capturedOnProgress: ((progress: UploadProgress) => void) | undefined;

      (fileService.uploadFiles as jest.Mock).mockImplementation((params: UploadFilesParams) => {
        capturedOnProgress = params.onProgress;
        
        if (capturedOnProgress) {
          capturedOnProgress({
            uploadedBytes: 50,
            totalBytes: 100,
            percentage: 50,
            uploadedCount: 0,
            totalCount: 1,
          });
        }

        return Promise.resolve({
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

      await waitFor(() => {
        expect(screen.getByText(/アップロード中/i)).toBeInTheDocument();
      });

      expect(capturedOnProgress).toBeDefined();
    });
  });

  describe('成功時のリセット処理', () => {
    it('should reset state and call onUploadComplete after successful upload', async () => {
      const mockFile = new File(['test'], 'test.maiml', { type: 'application/xml' });

      (fileService.uploadFiles as jest.Mock).mockResolvedValue({
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

      render(
        <BulkUploadDialog
          open={true}
          onClose={mockOnClose}
          onUploadComplete={mockOnUploadComplete}
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
        expect(screen.getByText(/アップロード完了/i)).toBeInTheDocument();
      });

      expect(mockOnUploadComplete).toHaveBeenCalledWith({
        mode: 'single',
        fileCount: 1,
        success: true,
      });
    });
  });

  describe('エラー時のメッセージ表示', () => {
    it('should display error message on upload failure', async () => {
      const mockFile = new File(['test'], 'test.maiml', { type: 'application/xml' });
      const errorMessage = 'ファイルアップロードに失敗しました';

      (fileService.uploadFiles as jest.Mock).mockRejectedValue(
        new Error(errorMessage)
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
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      expect(screen.getByText(/選択ファイル \(1個\)/i)).toBeInTheDocument();
    });
  });

  describe('preselectedFolder対応', () => {
    it('should set initial folder path from preselectedFolder prop', () => {
      render(
        <BulkUploadDialog
          open={true}
          onClose={mockOnClose}
          projectId={projectId}
          preselectedFolder="dept_research/project_001"
        />
      );

      expect(screen.getByText(/選択パス:/i)).toBeInTheDocument();
      expect(screen.getByText(/org_materials\/dept_research\/project_001/i)).toBeInTheDocument();
    });
  });
});
