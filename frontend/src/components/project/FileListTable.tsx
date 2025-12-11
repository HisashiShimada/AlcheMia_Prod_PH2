'use client';

import React from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Tooltip,
  Typography,
  Button,
} from '@mui/material';
import {
  FileText,
  FileCode,
  Table as TableIcon,
  Archive,
  Download,
  Upload,
  Lock,
  CheckCircle,
} from 'lucide-react';
import { formatFileSize, formatRelativeTime } from '@/utils/formatters';

interface FileData {
  id: string;
  name: string;
  path: string;
  size: number;
  lastModified: string;
  type: string;
  isFolder?: boolean;
  fileCount?: number;
}

interface FileListTableProps {
  files: FileData[];
  onFileClick?: (file: FileData) => void;
  onFolderClick?: (folderId: string) => void;
}

/**
 * ファイル一覧テーブルコンポーネント
 */
const FileListTable: React.FC<FileListTableProps> = ({ files, onFileClick, onFolderClick }) => {
  // ファイルタイプに応じたアイコンを取得
  const getFileIcon = (file: FileData) => {
    if (file.isFolder) {
      return <Archive size={20} color="#FFA726" />;
    }
    
    switch (file.type) {
      case 'maiml':
        return <FileCode size={20} color="#2196F3" />;
      case 'pdf':
        return <FileText size={20} color="#F44336" />;
      case 'excel':
        return <TableIcon size={20} color="#4CAF50" />;
      case 'csv':
        return <TableIcon size={20} color="#757575" />;
      case 'archive':
        return <Archive size={20} color="#FF9800" />;
      default:
        return <FileText size={20} color="#757575" />;
    }
  };

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell width="50px">タイプ</TableCell>
            <TableCell>ファイル名</TableCell>
            <TableCell width="120px">サイズ</TableCell>
            <TableCell width="150px">最終更新日</TableCell>
            <TableCell width="220px" align="center">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {files.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  ファイルがありません
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            files.map((file) => (
              <TableRow
                key={file.id}
                hover
                sx={{
                  cursor: file.isFolder || onFileClick ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (file.isFolder) {
                    onFolderClick?.(file.id);
                  } else {
                    onFileClick?.(file);
                  }
                }}
              >
                {/* ファイルタイプアイコン */}
                <TableCell>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    {getFileIcon(file)}
                  </Box>
                </TableCell>

                {/* ファイル名 */}
                <TableCell>
                  <Tooltip title={file.path} placement="top-start">
                    <Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: file.isFolder ? 600 : 500,
                          color: file.isFolder ? '#FFA726' : 'inherit',
                          cursor: file.isFolder ? 'pointer' : 'inherit',
                        }}
                      >
                        {file.name}
                        {file.isFolder && file.fileCount !== undefined && ` (${file.fileCount})`}
                      </Typography>
                      {file.type === 'maiml' && !file.isFolder && (
                        <Chip
                          label="MaiML"
                          size="small"
                          color="primary"
                          sx={{ height: 20, fontSize: '0.7rem', mt: 0.5 }}
                        />
                      )}
                    </Box>
                  </Tooltip>
                </TableCell>

                {/* ファイルサイズ */}
                <TableCell>
                  {!file.isFolder && (
                    <Typography variant="body2" color="text.secondary">
                      {formatFileSize(file.size)}
                    </Typography>
                  )}
                </TableCell>

                {/* 最終更新日 */}
                <TableCell>
                  {!file.isFolder && (
                    <Typography variant="body2" color="text.secondary">
                      {formatRelativeTime(file.lastModified)}
                    </Typography>
                  )}
                </TableCell>

                {/* 操作 */}
                <TableCell align="center">
                  {!file.isFolder && (
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'nowrap' }}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Download size={16} />}
                        sx={{
                          minWidth: '110px',
                          fontSize: '0.875rem',
                          py: 0.75,
                          px: 1.5,
                          whiteSpace: 'nowrap',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Download file:', file.name);
                        }}
                      >
                        ダウンロード
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        sx={{
                          minWidth: '80px',
                          fontSize: '0.875rem',
                          py: 0.75,
                          px: 1.5,
                          bgcolor: '#00695c',
                          whiteSpace: 'nowrap',
                          '&:hover': {
                            bgcolor: '#004d40',
                          },
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('View file:', file.name);
                        }}
                      >
                        ビューア
                      </Button>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default FileListTable;
