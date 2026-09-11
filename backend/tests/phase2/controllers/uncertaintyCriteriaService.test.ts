jest.mock('../../../src/repositories/uncertaintyCriteriaRepository', () => ({
  findAllByOrganization: jest.fn(),
  findForSelector: jest.fn(),
  findByKey: jest.fn(),
  insertNewVersion: jest.fn(),
  findByUncertaintyKeysForExport: jest.fn(),
  bulkInsertCriteria: jest.fn(),
  findByKeys: jest.fn(),
  findByKeysWithDetails: jest.fn(),
}));
import * as repo from '../../../src/repositories/uncertaintyCriteriaRepository';
import { exportCriteria, importCriteria } from '../../../src/services/uncertaintyCriteriaService';
import type { ExportOptions, ImportOptions } from '../../../src/services/uncertaintyCriteriaService';
import type { ExportDetailRow } from '../../../src/repositories/uncertaintyCriteriaRepository';
const mockExp = repo.findByUncertaintyKeysForExport as jest.Mock;
const mockImp = repo.bulkInsertCriteria as jest.Mock;
const baseRow: ExportDetailRow = {
  uncertaintyKey: 'measurement:bias', uncertaintyName: 'Bias',
  nameSpaceId: 'ns-001', version: 1, evaluationMethod: 1, isInvalid: false,
  inheritanceUncertaintyKey: null, xsiType: 'xs:decimal', units: '%',
  scaleFactor: null, formatString: null, toleranceUpper: null, toleranceLower: null,
  description: 'Bias description', displayOrder: null, selectorValue: null, displayColor: null,
};
const q1: ExportDetailRow = { ...baseRow, uncertaintyKey: 'measurement:grade', uncertaintyName: 'Grade', evaluationMethod: 2, description: null, xsiType: null, units: null, displayOrder: 1, selectorValue: 'Good', displayColor: '#00ff00' };
const q2: ExportDetailRow = { ...q1, displayOrder: 2, selectorValue: 'Bad', displayColor: '#ff0000' };

describe('exportCriteria', () => {
  afterEach(() => { jest.clearAllMocks(); });

  test('JSON: returns correct JSON content', async () => {
    mockExp.mockResolvedValue([baseRow]);
    const opts: ExportOptions = { uncertaintyKeys: ['measurement:bias'], format: 'json', includeDesc: true, includeExtends: false, includeHistory: false };
    const result = await exportCriteria('org-001', opts);
    expect(result.contentType).toBe('application/json; charset=utf-8');
    const parsed = JSON.parse(result.content);
    expect(parsed[0].uncertaintyKey).toBe('measurement:bias');
    expect(parsed[0].description).toBe('Bias description');
  });

  test('JSON: description omitted when includeDesc=false', async () => {
    mockExp.mockResolvedValue([baseRow]);
    const opts: ExportOptions = { uncertaintyKeys: ['measurement:bias'], format: 'json', includeDesc: false, includeExtends: false, includeHistory: false };
    expect(JSON.parse((await exportCriteria('org-001', opts)).content)[0].description).toBeUndefined();
  });

  test('JSON: qualitative options included', async () => {
    mockExp.mockResolvedValue([q1, q2]);
    const opts: ExportOptions = { uncertaintyKeys: ['measurement:grade'], format: 'json', includeDesc: false, includeExtends: false, includeHistory: false };
    expect(JSON.parse((await exportCriteria('org-001', opts)).content)[0].qualitativeOptions).toHaveLength(2);
  });

  test('XML: returns XML string', async () => {
    mockExp.mockResolvedValue([baseRow]);
    const opts: ExportOptions = { uncertaintyKeys: ['measurement:bias'], format: 'xml', includeDesc: true, includeExtends: false, includeHistory: false };
    const result = await exportCriteria('org-001', opts);
    expect(result.contentType).toBe('application/xml; charset=utf-8');
    expect(result.content).toContain('<uncertaintyKey>measurement:bias</uncertaintyKey>');
  });

  test('includeHistory=false: only latest version', async () => {
    mockExp.mockResolvedValue([{ ...baseRow, version: 2 }, { ...baseRow, version: 1 }]);
    const opts: ExportOptions = { uncertaintyKeys: ['measurement:bias'], format: 'json', includeDesc: false, includeExtends: false, includeHistory: false };
    const parsed = JSON.parse((await exportCriteria('org-001', opts)).content);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].version).toBe(2);
  });

  test('includeHistory=true: all versions', async () => {
    mockExp.mockResolvedValue([{ ...baseRow, version: 2 }, { ...baseRow, version: 1 }]);
    const opts: ExportOptions = { uncertaintyKeys: ['measurement:bias'], format: 'json', includeDesc: false, includeExtends: false, includeHistory: true };
    expect(JSON.parse((await exportCriteria('org-001', opts)).content)).toHaveLength(2);
  });
});

describe('importCriteria', () => {
  afterEach(() => { jest.clearAllMocks(); });

  test('CSV: parses and calls bulkInsert', async () => {
    mockImp.mockResolvedValue({ insertedCount: 2, skippedCount: 0 });
    const csv = 'uncertaintyKey,uncertaintyName,evaluationMethod\nmeasurement:bias,Bias,1\nmeasurement:precision,Precision,1';
    const opts: ImportOptions = { fileContent: csv, format: 'csv', createUserId: 'user-001', nameSpaceId: 'ns-001' };
    const result = await importCriteria('org-001', opts);
    expect(result.insertedCount).toBe(2);
    expect(mockImp.mock.calls[0][1][0].uncertaintyKey).toBe('measurement:bias');
  });

  test('CSV: throws on missing headers', async () => {
    const opts: ImportOptions = { fileContent: 'someCol\nval', format: 'csv', createUserId: 'user-001', nameSpaceId: 'ns-001' };
    await expect(importCriteria('org-001', opts)).rejects.toThrow('CSV');
  });

  test('CSV: throws when no data rows', async () => {
    const opts: ImportOptions = { fileContent: 'uncertaintyKey,uncertaintyName,evaluationMethod', format: 'csv', createUserId: 'user-001', nameSpaceId: 'ns-001' };
    await expect(importCriteria('org-001', opts)).rejects.toThrow('CSV');
  });

  test('JSON: parses and calls bulkInsert', async () => {
    mockImp.mockResolvedValue({ insertedCount: 1, skippedCount: 0 });
    const json = JSON.stringify([{ uncertaintyKey: 'measurement:bias', uncertaintyName: 'Bias', evaluationMethod: 1 }]);
    const opts: ImportOptions = { fileContent: json, format: 'json', createUserId: 'user-001', nameSpaceId: 'ns-001' };
    expect((await importCriteria('org-001', opts)).insertedCount).toBe(1);
  });

  test('JSON: throws when not array', async () => {
    const opts: ImportOptions = { fileContent: '{"key":"val"}', format: 'json', createUserId: 'user-001', nameSpaceId: 'ns-001' };
    await expect(importCriteria('org-001', opts)).rejects.toThrow('JSON');
  });

  test('empty: returns 0/0 without bulkInsert', async () => {
    const opts: ImportOptions = { fileContent: JSON.stringify([]), format: 'json', createUserId: 'user-001', nameSpaceId: 'ns-001' };
    const result = await importCriteria('org-001', opts);
    expect(result.insertedCount).toBe(0);
    expect(mockImp).not.toHaveBeenCalled();
  });
});
