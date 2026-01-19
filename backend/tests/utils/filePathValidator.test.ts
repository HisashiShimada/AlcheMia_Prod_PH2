/**
 * ファイルパス検証ユーティリティのテスト
 * 
 * タスク1.1: ファイル名サニタイゼーション機能の実装
 * Requirements: 2 (ファイルパスの検証とセキュリティ)
 */

import {
  sanitizeFileName,
  isValidPath,
  isValidFileName,
  decodeAndValidateFileName,
} from '../../src/utils/filePathValidator';

describe('filePathValidator', () => {
  describe('sanitizeFileName', () => {
    describe('パストラバーサル攻撃の防止', () => {
      it('Unix形式のパストラバーサル（../）を除去する', () => {
        expect(sanitizeFileName('../file.txt')).toBe('file.txt');
        expect(sanitizeFileName('../../file.txt')).toBe('file.txt');
        expect(sanitizeFileName('../../../etc/passwd')).toBe('etcpasswd');
      });

      it('Windows形式のパストラバーサル（..\\）を除去する', () => {
        expect(sanitizeFileName('..\\file.txt')).toBe('file.txt');
        expect(sanitizeFileName('..\\..\\file.txt')).toBe('file.txt');
        expect(sanitizeFileName('..\\..\\..\\windows\\system32')).toBe('windowssystem32');
      });

      it('混在したパストラバーサルパターンを除去する', () => {
        expect(sanitizeFileName('../..\\file.txt')).toBe('file.txt');
        expect(sanitizeFileName('..\\../file.txt')).toBe('file.txt');
      });

      it('URLエンコードされたパストラバーサルを除去する', () => {
        expect(sanitizeFileName('%2e%2e%2ffile.txt')).toBe('file.txt');
        expect(sanitizeFileName('%2e%2e/file.txt')).toBe('file.txt');
        expect(sanitizeFileName('..%2ffile.txt')).toBe('file.txt');
      });
    });

    describe('スラッシュとバックスラッシュの除去', () => {
      it('先頭のスラッシュを除去する', () => {
        expect(sanitizeFileName('/file.txt')).toBe('file.txt');
        expect(sanitizeFileName('//file.txt')).toBe('file.txt');
      });

      it('先頭のバックスラッシュを除去する', () => {
        expect(sanitizeFileName('\\file.txt')).toBe('file.txt');
        expect(sanitizeFileName('\\\\file.txt')).toBe('file.txt');
      });

      it('パス区切り文字を除去する', () => {
        expect(sanitizeFileName('path/to/file.txt')).toBe('pathtofile.txt');
        expect(sanitizeFileName('path\\to\\file.txt')).toBe('pathtofile.txt');
      });
    });

    describe('正常なファイル名', () => {
      it('正常なファイル名はそのまま返す', () => {
        expect(sanitizeFileName('file.txt')).toBe('file.txt');
        expect(sanitizeFileName('document.pdf')).toBe('document.pdf');
        expect(sanitizeFileName('project.maiml')).toBe('project.maiml');
      });

      it('アンダースコアとハイフンを含むファイル名を許可する', () => {
        expect(sanitizeFileName('my_file.txt')).toBe('my_file.txt');
        expect(sanitizeFileName('my-file.txt')).toBe('my-file.txt');
        expect(sanitizeFileName('my_project_v1.maiml')).toBe('my_project_v1.maiml');
      });

      it('数字を含むファイル名を許可する', () => {
        expect(sanitizeFileName('file123.txt')).toBe('file123.txt');
        expect(sanitizeFileName('2024_report.pdf')).toBe('2024_report.pdf');
      });
    });

    describe('空文字列とnull処理', () => {
      it('空文字列の場合は空文字列を返す', () => {
        expect(sanitizeFileName('')).toBe('');
      });

      it('空白のみの場合は空文字列を返す', () => {
        expect(sanitizeFileName('   ')).toBe('');
      });
    });
  });

  describe('isValidPath', () => {
    describe('不正なパスの検出', () => {
      it('パストラバーサルを含むパスを拒否する', () => {
        expect(isValidPath('../file.txt')).toBe(false);
        expect(isValidPath('../../file.txt')).toBe(false);
        expect(isValidPath('..\\file.txt')).toBe(false);
      });

      it('絶対パス（Unix）を拒否する', () => {
        expect(isValidPath('/etc/passwd')).toBe(false);
        expect(isValidPath('/root/file.txt')).toBe(false);
        expect(isValidPath('/home/user/file.txt')).toBe(false);
      });

      it('絶対パス（Windows）を拒否する', () => {
        expect(isValidPath('C:\\file.txt')).toBe(false);
        expect(isValidPath('D:\\windows\\system32')).toBe(false);
      });

      it('URLエンコードされた不正パスを拒否する', () => {
        expect(isValidPath('%2e%2e%2ffile.txt')).toBe(false);
        expect(isValidPath('%2e%2e/file.txt')).toBe(false);
      });
    });

    describe('正常なパスの許可', () => {
      it('相対パス（正常）を許可する', () => {
        expect(isValidPath('projects/project1/file.txt')).toBe(true);
        expect(isValidPath('archive/file_v1.maiml')).toBe(true);
      });

      it('単一ファイル名を許可する', () => {
        expect(isValidPath('file.txt')).toBe(true);
        expect(isValidPath('project.maiml')).toBe(true);
      });

      it('アンダースコアとハイフンを含むパスを許可する', () => {
        expect(isValidPath('my_project/my_file.txt')).toBe(true);
        expect(isValidPath('my-project/my-file.txt')).toBe(true);
      });
    });

    describe('空文字列処理', () => {
      it('空文字列は拒否する', () => {
        expect(isValidPath('')).toBe(false);
      });

      it('空白のみは拒否する', () => {
        expect(isValidPath('   ')).toBe(false);
      });
    });
  });

  describe('isValidFileName', () => {
    describe('ファイル名の長さ検証', () => {
      it('255文字以内のファイル名を許可する', () => {
        const validName = 'a'.repeat(250) + '.txt';
        expect(isValidFileName(validName)).toBe(true);
      });

      it('256文字以上のファイル名を拒否する', () => {
        const tooLongName = 'a'.repeat(256);
        expect(isValidFileName(tooLongName)).toBe(false);
      });
    });

    describe('ファイル名フォーマット検証', () => {
      it('拡張子を持つファイル名を許可する', () => {
        expect(isValidFileName('file.txt')).toBe(true);
        expect(isValidFileName('project.maiml')).toBe(true);
        expect(isValidFileName('data.csv')).toBe(true);
      });

      it('拡張子のないファイル名を許可する', () => {
        expect(isValidFileName('README')).toBe(true);
        expect(isValidFileName('Makefile')).toBe(true);
      });

      it('特殊文字を含むファイル名を拒否する', () => {
        expect(isValidFileName('file<>.txt')).toBe(false);
        expect(isValidFileName('file|.txt')).toBe(false);
        expect(isValidFileName('file?.txt')).toBe(false);
        expect(isValidFileName('file*.txt')).toBe(false);
      });

      it('制御文字を含むファイル名を拒否する', () => {
        expect(isValidFileName('file\x00.txt')).toBe(false);
        expect(isValidFileName('file\n.txt')).toBe(false);
        expect(isValidFileName('file\r.txt')).toBe(false);
      });
    });

    describe('空文字列処理', () => {
      it('空文字列を拒否する', () => {
        expect(isValidFileName('')).toBe(false);
      });

      it('空白のみを拒否する', () => {
        expect(isValidFileName('   ')).toBe(false);
      });
    });

    describe('予約名の検証', () => {
      it('Windowsの予約名を拒否する', () => {
        expect(isValidFileName('CON')).toBe(false);
        expect(isValidFileName('PRN')).toBe(false);
        expect(isValidFileName('AUX')).toBe(false);
        expect(isValidFileName('NUL')).toBe(false);
        expect(isValidFileName('COM1')).toBe(false);
        expect(isValidFileName('LPT1')).toBe(false);
      });

      it('Windowsの予約名（大文字小文字区別なし）を拒否する', () => {
        expect(isValidFileName('con')).toBe(false);
        expect(isValidFileName('Con')).toBe(false);
        expect(isValidFileName('CON.txt')).toBe(false);
      });
    });
  });

  describe('decodeAndValidateFileName', () => {
    describe('URLデコードと検証', () => {
      it('URLエンコードされたファイル名をデコードして検証する', () => {
        expect(decodeAndValidateFileName('file%20name.txt')).toBe('file name.txt');
        expect(decodeAndValidateFileName('my%2Dfile.txt')).toBe('my-file.txt');
      });

      it('URLエンコードされていないファイル名をそのまま検証する', () => {
        expect(decodeAndValidateFileName('file.txt')).toBe('file.txt');
        expect(decodeAndValidateFileName('project.maiml')).toBe('project.maiml');
      });

      it('デコード後に不正なパスが含まれる場合はnullを返す', () => {
        expect(decodeAndValidateFileName('%2e%2e%2ffile.txt')).toBeNull();
        expect(decodeAndValidateFileName('%2Fetc%2Fpasswd')).toBeNull();
      });

      it('デコード後に無効なファイル名の場合はnullを返す', () => {
        expect(decodeAndValidateFileName('file%3C%3E.txt')).toBeNull(); // file<>.txt
        expect(decodeAndValidateFileName('file%7C.txt')).toBeNull(); // file|.txt
      });
    });

    describe('二重エンコードの検出', () => {
      it('二重エンコードされたパストラバーサルを検出する', () => {
        // %252e = %2e (.) の二重エンコード
        expect(decodeAndValidateFileName('%252e%252e%252f')).toBeNull();
      });
    });

    describe('エラー処理', () => {
      it('デコードエラーの場合はnullを返す', () => {
        expect(decodeAndValidateFileName('%')).toBeNull();
        expect(decodeAndValidateFileName('%G')).toBeNull();
      });

      it('空文字列の場合はnullを返す', () => {
        expect(decodeAndValidateFileName('')).toBeNull();
      });
    });
  });
});
