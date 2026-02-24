import { XMLParser, XMLValidator} from 'fast-xml-parser';
import { AnalysisResult} from '../types/maimlValidation';
import { X2jOptions } from 'fast-xml-parser';
import { ErrorContent,statistics, Correction } from '../types/maimlValidation';
import * as maimlAnalysisResultRepository from '../repositories/maimlAnalysisResultRepository';
import { FileMetadataRepository } from '../repositories/fileMetadataRepository';

const defaultNameSpace = 'http://www.maiml.org/schemas';
const supportedVersion = '1.0';
const parserOptions : X2jOptions = {
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
    parseAttributeValue: true,
    trimValues: true,
    preserveOrder: false,
    isArray: (tagName, _jPath) => {
    // 🔧 FIX: methodとplaceRef要素は常に配列として扱う
    if (tagName === 'method' || tagName === 'placeRef') {
        return true;
    }
    return false;
    }
}

const errorTypes = {
    SYNTAX_ERROR: 'syntax_error',
    SCHEMA_VIOLATION: 'schema_violation', 
    MISSING_REQUIRED: 'missing_required',
    INVALID_STRUCTURE: 'invalid_structure',
    NAMESPACE_ERROR: 'namespace_error',
    VERSION_MISMATCH: 'version_mismatch',
    REFERENCE_ERROR: 'reference_error',
    DUPLICATE_ID: 'duplicate_id',  // 🆕 追加: 重複IDエラー
    VALIDATION_WARNING: 'validation_warning'
};

export async function analyzeMaiMLFile(organaizationId: string, maimlContent : string, fileKey: string)  {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 [MaiMLParser] Starting analysis for file: ${fileKey}`);

      const parser = new XMLParser(parserOptions);
      
      const analysisResult : AnalysisResult = {
        fileKey: fileKey,
        isValid: false,
        version: 0,
        namespace: '',
        errors: [],
        warnings: [],
        suggestions: [],
        statistics: {
          totalElements: 0,
          placesCount: 0,
          transitionsCount: 0,
          arcsCount: 0
        },
        processingTime: 0,
        timestamp: new Date().toISOString(),
        autoCorrections : []
      };

      console.log('syntaxValidation');
      // Phase 1: Basic XML syntax validation
      const syntaxValidation = validateXMLSyntax(maimlContent);
      if (!syntaxValidation.isValid) {
        console.log(syntaxValidation)
        analysisResult.errors.push({
          type: errorTypes.SYNTAX_ERROR,
          severity: 'error',
          message: 'XML syntax error detected',
          details: syntaxValidation.error,
          line: syntaxValidation.line || 0,
          column: syntaxValidation.column || 0,
          suggestion: 'Fix XML syntax errors - check for unclosed tags, invalid characters, or malformed structure'
        });
        analysisResult.processingTime = Date.now() - startTime;
        return analysisResult;
      }

      console.log('parseXML');
      // Phase 2: Parse XML content
      let parsedXML;
      try {
        parsedXML = parser.parse(maimlContent);
      } catch (parseError) {
        if (parseError instanceof Error){
            analysisResult.errors.push({
            type: errorTypes.SYNTAX_ERROR,
            severity: 'error',
            message: 'Failed to parse XML content',
            details: parseError.message,
            suggestion: 'Ensure XML is well-formed and follows MaiML schema structure',
            line: 0,
            column: 0
            });
            analysisResult.processingTime = Date.now() - startTime;
            return analysisResult;
        }
      }

      console.log('validateMaiMLStructure');
      // Phase 3: MaiML structure validation
      const structureValidation = validateMaiMLStructure(parsedXML);
      analysisResult.errors.push(...structureValidation.errors);
      analysisResult.warnings.push(...structureValidation.warnings);

      // Update analysis metadata
      analysisResult.isValid = structureValidation.isValid;
      analysisResult.version = structureValidation.version;
      analysisResult.namespace = structureValidation.namespace;

      console.log('analyzeContent');
      // Phase 4: Content analysis and statistics
      if (structureValidation.isValid) {
        const contentAnalysis = analyzeContent(parsedXML);
        analysisResult.statistics = contentAnalysis.statistics;
        analysisResult.warnings.push(...contentAnalysis.warnings);
        analysisResult.suggestions.push(...contentAnalysis.suggestions);
      }

      console.log('validateReferences');
      // Phase 5: Reference validation
      const referenceValidation = validateReferences(parsedXML);
      analysisResult.errors.push(...referenceValidation.errors);
      analysisResult.warnings.push(...referenceValidation.warnings);

      console.log('validateDuplicateIds');
      // Phase 6: Duplicate ID validation (🆕 追加)
      const duplicateValidation = validateDuplicateIds(parsedXML);
      analysisResult.errors.push(...duplicateValidation.errors);
      analysisResult.warnings.push(...duplicateValidation.warnings);

      analysisResult.processingTime = Date.now() - startTime;
      
      console.log(`✅ [MaiMLParser] Analysis completed for ${fileKey}: ${analysisResult.errors.length} errors, ${analysisResult.warnings.length} warnings`);
      
      // 🎯 CRITICAL FIX: Save analysis results with proper pool usage
      await saveAnalysisResults(organaizationId, analysisResult);
      
      return analysisResult;

    } catch (error) {
      console.error(`❌ [MaiMLParser] Analysis failed for ${fileKey}:`, error);
      
      const errorResult : AnalysisResult = {
        fileKey: fileKey,
        isValid: false,
        errors: [{
          type: errorTypes.SYNTAX_ERROR,
          severity: 'error',
          message: 'Critical analysis error',
          details: error instanceof Error ? error.message : '',
          suggestion: 'Contact system administrator - internal parser error'
        }],
        warnings: [],
        suggestions: [],
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        autoCorrections : []
      };
      return errorResult;
    }
  }
  
/**
 * 分析結果をデータベースに保存（Repository層使用）
 * database.md規約に従った実装
 * 
 * @param organizationId - 組織ID
 * @param analysisResult - 分析結果
 * @returns 保存された分析結果ID
 */
async function saveAnalysisResults(organizationId: string, analysisResult: AnalysisResult): Promise<number> {
  try {
    console.log(`💾 [MaiMLParser] Starting database save for ${analysisResult.fileKey}`);

    // Step 1: 分析ステータスを決定
    const errorCount = analysisResult.errors.length;
    const warningCount = analysisResult.warnings.length;
    
    let analysisStatus: string;
    if (errorCount > 0) {
      analysisStatus = 'has_errors';
    } else if (warningCount > 0) {
      analysisStatus = 'has_warnings';
    } else if (analysisResult.isValid) {
      analysisStatus = 'valid';
    } else {
      analysisStatus = 'analyzed';
    }

    console.log(`📈 [MaiMLParser] Determined status: ${analysisStatus} (E:${errorCount}, W:${warningCount})`);

    // Step 2: maiml_analysis_resultsテーブルに保存（Repository使用）
    const analysisData = {
      file_key: analysisResult.fileKey,
      is_valid: analysisResult.isValid,
      version: analysisResult.version || null,
      namespace: analysisResult.namespace || null,
      errors: JSON.stringify(analysisResult.errors),
      warnings: JSON.stringify(analysisResult.warnings),
      suggestions: JSON.stringify(analysisResult.suggestions || []),
      statistics: JSON.stringify(analysisResult.statistics || {}),
      processing_time: analysisResult.processingTime || null,
      analysis_timestamp: analysisResult.timestamp || new Date().toISOString()
    };

    const savedAnalysis = await maimlAnalysisResultRepository.upsert(analysisData);
    console.log(`📊 [MaiMLParser] Analysis saved to maiml_analysis_results, ID: ${savedAnalysis.id}`);

    // Step 3: file_metadataテーブルの確認と更新（Repository使用）
    const fileMetadataRepository = new FileMetadataRepository();
    const existingMetadata = await fileMetadataRepository.getFileMetadataByFileKey(analysisResult.fileKey);

    if (!existingMetadata) {
      // ファイルメタデータが存在しない場合は新規作成
      console.warn(`⚠️ [MaiMLParser] File not found in file_metadata: ${analysisResult.fileKey}`);
      
      const filename = analysisResult.fileKey.split('/').pop() || 'unknown.maiml';
      const newMetadata = {
        file_key: analysisResult.fileKey,
        organization_id: organizationId,
        original_filename: filename,
        file_size: 0, // Unknown size
        file_type: 'application/xml',
        file_extension: 'maiml',
        is_maiml_file: true,
        maiml_analysis_status: analysisStatus,
        maiml_error_count: errorCount,
        maiml_warning_count: warningCount,
        maiml_transitions_count: analysisResult.statistics?.transitionsCount || 0,
        maiml_places_count: analysisResult.statistics?.placesCount || 0,
        maiml_version: String(analysisResult.version || ''),
        maiml_last_analyzed: new Date(),
        uploaded_by: 'system',
        upload_source: 'analysis_repair',
        s3_bucket: process.env.S3_BUCKET_NAME || 'mmdpf-files'
      };

      await fileMetadataRepository.insertFileMetadata(newMetadata);
      console.log(`🔧 [MaiMLParser] Created missing file_metadata entry for: ${analysisResult.fileKey}`);
    } else {
      // 既存のfile_metadataを更新
      console.log(`📋 [MaiMLParser] File exists in file_metadata, updating...`);
      
      const updateData = {
        maiml_analysis_status: analysisStatus,
        maiml_error_count: errorCount,
        maiml_warning_count: warningCount,
        maiml_transitions_count: analysisResult.statistics?.transitionsCount || 0,
        maiml_places_count: analysisResult.statistics?.placesCount || 0,
        maiml_version: String(analysisResult.version || ''),
        maiml_last_analyzed: new Date()
      };

      const updated = await fileMetadataRepository.updateFileMetadata(
        analysisResult.fileKey,
        updateData
      );

      console.log(`✅ [MaiMLParser] file_metadata updated successfully:`);
      console.log(`   - file_key: ${updated.file_key}`);
      console.log(`   - status: ${updated.maiml_analysis_status}`);
      console.log(`   - errors: ${updated.maiml_error_count}`);
      console.log(`   - warnings: ${updated.maiml_warning_count}`);
    }

    console.log(`✅ [MaiMLParser] Database save completed successfully for ${analysisResult.fileKey}`);
    return savedAnalysis.id || 0;

  } catch (error) {
    console.error(`❌ [MaiMLParser] Database save failed for ${analysisResult.fileKey}:`, error);
    throw error;
  }
}
  
    /**
     * Validate basic XML syntax
     */
    function validateXMLSyntax(xmlContent : string) {
      try {
        console.log('validateXMLSyntax');
        const validation = XMLValidator.validate(xmlContent, {
          allowBooleanAttributes: true
        });
        
        console.log('validate');
        if (validation === true) {
          return { isValid: true };
        } else {
        console.log(xmlContent.substring(0,1));
          return {
            isValid: false,
            error: validation.err.msg,
            line: validation.err.line,
            column: validation.err.col
          };
        }
      } catch (error) {
            return {
            isValid: false,
            error: error instanceof Error ? error.message : ''
            };
      }
    }

  /**
   * Validate MaiML document structure against schema requirements
   */
  function validateMaiMLStructure(parsedXML : any) {
    const errors : ErrorContent[] = [];
    const warnings : ErrorContent[] = [];
    let isValid = true;
    let version = null;
    let namespace = null;

    // Check for root 'maiml' element
    if (!parsedXML.maiml) {
      errors.push({
        type: errorTypes.INVALID_STRUCTURE,
        severity: 'error',
        message: 'Missing root "maiml" element',
        suggestion: 'Add <maiml version="1.0" xmlns="http://www.maiml.org/schemas"> as root element',
      });
      isValid = false;
    } else {
      const maimlRoot = parsedXML.maiml;
      
      // Check version attribute
      version = maimlRoot['@_version'];
      if (!version) {
        errors.push({
          type: errorTypes.MISSING_REQUIRED,
          severity: 'error',
          message: 'Missing required "version" attribute on maiml element',
          suggestion: 'Add version="1.0" attribute to <maiml> element',
        });
        isValid = false;
      } else if (version !== supportedVersion) {
        warnings.push({
          type: errorTypes.VERSION_MISMATCH,
          severity: 'warning', 
          message: `Version "${version}" differs from supported version "${supportedVersion}"`,
          suggestion: `Consider updating to version ${supportedVersion} for full compatibility`,
        });
      }

      // Check namespace
      namespace = maimlRoot['@_xmlns'] || maimlRoot['@_xmlns:default'];
      if (!namespace) {
        warnings.push({
          type: errorTypes.NAMESPACE_ERROR,
          severity: 'warning',
          message: 'Missing namespace declaration',
          suggestion: `Add xmlns="${defaultNameSpace}" to <maiml> element`,
        });
      } else if (namespace !== defaultNameSpace) {
        warnings.push({
          type: errorTypes.NAMESPACE_ERROR,
          severity: 'warning',
          message: `Namespace "${namespace}" differs from expected "${defaultNameSpace}"`,
          suggestion: `Use xmlns="${defaultNameSpace}" for proper schema validation`,
        });
      }

      // Check required document element
      if (!maimlRoot.document) {
        errors.push({
          type: errorTypes.MISSING_REQUIRED,
          severity: 'error',
          message: 'Missing required "document" element',
          suggestion: 'Add <document id="..."> element with required metadata',
        });
        isValid = false;
      } else {
        // Validate document structure
        const docValidation = validateDocumentStructure(maimlRoot.document);
        errors.push(...docValidation.errors);
        warnings.push(...docValidation.warnings);
        if (!docValidation.isValid) isValid = false;
      }
    }

    return {
      isValid,
      version,
      namespace,
      errors,
      warnings
    };
  }

  /**
   * Validate document element structure
   */
  function validateDocumentStructure(document : any) {
    const errors : ErrorContent[] = [];
    const warnings: ErrorContent[] = [];
    let isValid = true;

    // Check required ID attribute
    if (!document['@_id']) {
      errors.push({
        type: errorTypes.MISSING_REQUIRED,
        severity: 'error',
        message: 'Document element missing required "id" attribute',
        suggestion: 'Add id="unique-document-id" to <document> element'
      });
      isValid = false;
    }

    // Check required child elements
    const requiredChildren = ['uuid', 'creator', 'vendor', 'owner', 'date'];
    for (const child of requiredChildren) {
      if (!document[child]) {
        errors.push({
          type: errorTypes.MISSING_REQUIRED,
          severity: 'error',
          message: `Missing required "${child}" element in document`,
          suggestion: `Add <${child}> element to document section`
        });
        isValid = false;
      }
    }

    // Validate UUID format if present
    if (document.uuid) {
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[3-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
      if (!uuidRegex.test(document.uuid)) {
        errors.push({
          type: errorTypes.VALIDATION_WARNING,
          severity: 'error',
          message: 'Invalid UUID format in document',
          suggestion: 'Use proper UUID v4 format (e.g., 550e8400-e29b-41d4-a716-446655440000)'
        });
        isValid = false;
      }
    }

    // Validate date format if present
    if (document.date) {
      const dateValue = document.date;
      if (isNaN(Date.parse(dateValue))) {
        warnings.push({
          type: errorTypes.VALIDATION_WARNING,
          severity: 'warning',
          message: 'Invalid date format in document',
          suggestion: 'Use ISO 8601 date format (e.g., 2024-01-15T10:30:00Z)'
        });
      }
    }

    return { isValid, errors, warnings };
  }

  /**
   * Analyze MaiML content for statistics and additional validation
   */
  function analyzeContent(parsedXML : any) {
    const statistics : statistics = {
      totalElements: 0,
      placesCount: 0,
      transitionsCount: 0,
      arcsCount: 0
    };
    const warnings : ErrorContent[] = [];
    const suggestions: ErrorContent[] = [];

    try {
      // Count elements recursively
      const countElements = (obj : any) => {
        if (typeof obj === 'object' && obj !== null) {
          for (const key in obj) {
            if (key === 'place') {
              statistics.placesCount += Array.isArray(obj[key]) ? obj[key].length : 1;
            } else if (key === 'transition') {
              statistics.transitionsCount += Array.isArray(obj[key]) ? obj[key].length : 1;
            } else if (key === 'arc') {
              statistics.arcsCount += Array.isArray(obj[key]) ? obj[key].length : 1;
            }
            
            if (typeof obj[key] === 'object') {
              countElements(obj[key]);
            }
            
            statistics.totalElements++;
          }
        }
      };

      countElements(parsedXML);

      // Generate suggestions based on content analysis
      if (statistics.placesCount === 0 && statistics.transitionsCount === 0) {
        suggestions.push({
          type: 'content_suggestion',
          message: 'No Petri net elements found',
          suggestion: 'Consider adding <place> and <transition> elements to define workflow logic'
        });
      }

      if (statistics.placesCount > 0 && statistics.transitionsCount > 0 && statistics.arcsCount === 0) {
        warnings.push({
          type: errorTypes.VALIDATION_WARNING,
          severity: 'warning',
          message: 'Places and transitions found but no connecting arcs',
          suggestion: 'Add <arc> elements to connect places and transitions'
        });
      }

      // Check for reasonable complexity
      if (statistics.totalElements > 10000) {
        warnings.push({
          type: errorTypes.VALIDATION_WARNING,
          severity: 'warning',
          message: 'Very large MaiML document detected',
          suggestion: 'Consider splitting into smaller, more manageable files'
        });
      }

    } catch (error) {
      warnings.push({
        type: errorTypes.SYNTAX_ERROR,
        severity: 'warning',
        message: 'Content analysis partially failed',
        details: error instanceof Error ? error.message : ''
      });
    }

    return { statistics, warnings, suggestions };
  }
  
/**
 * Validate ID references within the document
 */
function validateReferences(parsedXML : any) {
    const errors: ErrorContent[] = [];
    const warnings: ErrorContent[] = [];
    const declaredIds = new Set<string>();
    const references: {ref : string, path : string, element: any}[] = [];

    try {
    // Collect all declared IDs
    const collectIds = (obj: any, path: string = '') => {
        if (typeof obj === 'object' && obj !== null) {
        // 配列の場合は各要素を処理
        if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
            collectIds(item, `${path}[${index}]`);
            });
            return;
        }
        
        if (obj['@_id']) {
            declaredIds.add(obj['@_id']);
            // デバッグ: methodやplace要素のIDをログ出力
            if (path.includes('method') || path.includes('place')) {
            console.log(`  🔍 [validateReferences] ID収集: ${obj['@_id']} (path: ${path})`);
            }
        }
        
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
            // 配列の場合は各要素を処理
            if (Array.isArray(obj[key])) {
                obj[key].forEach((item, index) => {
                collectIds(item, `${path}.${key}[${index}]`);
                });
            } else {
                collectIds(obj[key], `${path}.${key}`);
            }
            }
        }
        }
    };

    // Collect all references
    const collectReferences = (obj: any, path: string = '') => {
        if (typeof obj === 'object' && obj !== null) {
        // 配列の場合は各要素を処理
        if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
            collectReferences(item, `${path}[${index}]`);
            });
            return;
        }
        
        if (obj['@_ref']) {
            references.push({
            ref: obj['@_ref'],
            path: path,
            element: obj
            });
            // デバッグ: placeRefの参照をログ出力
            if (path.includes('placeRef') || path.includes('Template')) {
            console.log(`  🔍 [validateReferences] 参照収集: ${obj['@_ref']} (path: ${path})`);
            }
        }
        
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
            // 配列の場合は各要素を処理
            if (Array.isArray(obj[key])) {
                obj[key].forEach((item, index) => {
                collectReferences(item, `${path}.${key}[${index}]`);
                });
            } else {
                collectReferences(obj[key], `${path}.${key}`);
            }
            }
        }
        }
    };

    console.log('🔍 [validateReferences] ID収集開始');
    
    // 🔧 FIX: XMLパーサーが複数method要素を配列にしない場合の対処
    if (parsedXML?.maiml?.protocol?.method) {
        const methods = parsedXML.maiml.protocol.method;
        if (!Array.isArray(methods)) {
        console.log('⚠️ [validateReferences] protocol.methodが配列ではありません。配列に変換します。');
        parsedXML.maiml.protocol.method = [methods];
        console.log(`✅ [validateReferences] 配列に変換完了: protocol.method = [${methods['@_id']}]`);
        } else {
        console.log(`✅ [validateReferences] protocol.methodは配列です（${methods.length}要素）`);
        }
    }
    
    collectIds(parsedXML);
    console.log(`✅ [validateReferences] ID収集完了: ${declaredIds.size}個のIDを検出`);
    const allIds = Array.from(declaredIds);
    console.log(`  📋 収集されたID (全て):`, allIds);
    
    // デバッグ: condition-で始まるIDを特定
    const conditionIds = allIds.filter(id => id.startsWith('condition-'));
    console.log(`  🔍 [validateReferences] condition-IDの数: ${conditionIds.length}`, conditionIds);
    
    console.log('🔍 [validateReferences] 参照収集開始');
    collectReferences(parsedXML);
    console.log(`✅ [validateReferences] 参照収集完了: ${references.length}個の参照を検出`);

    // Validate references
    for (const reference of references) {
        if (!declaredIds.has(reference.ref)) {
        console.log(`❌ [validateReferences] 未定義参照を検出: "${reference.ref}" (path: ${reference.path})`);
        errors.push({
            type: errorTypes.REFERENCE_ERROR,
            severity: 'error',
            message: `Undefined reference "${reference.ref}"`,
            path: reference.path,
            ref: reference.ref,
            element: reference.element,
            suggestion: `Ensure element with id="${reference.ref}" exists or remove the reference`
        });
        }
    }

    // Check for unused IDs
    const usedIds = new Set(references.map(r => r.ref));
    for (const id of declaredIds) {
        if (!usedIds.has(id)) {
        warnings.push({
            type: errorTypes.VALIDATION_WARNING,
            severity: 'info',
            message: `Unused ID "${id}"`,
            suggestion: 'Consider removing unused IDs or adding references to improve document structure'
        });
        }
    }

    } catch (error) {
    warnings.push({
        type: errorTypes.SYNTAX_ERROR,
        severity: 'warning',
        message: 'Reference validation partially failed',
        details: error instanceof Error ? error.message : ''
    });
    }

    return { errors, warnings };
}

  /**
   * Validate for duplicate IDs within the document
   * 🆕 Phase 2: 重複IDバリデーション
   */
  function validateDuplicateIds(parsedXML: any) {
    const errors: ErrorContent[] = [];
    const warnings: ErrorContent[] = [];
    const idMap = new Map<string, {elementType: string, path: string}[]>(); // id -> [{elementType, path}]

    try {
      // Collect all IDs with their element information
      const collectIds = (obj : any, path : string = '', elementType : string = 'unknown') => {
        if (typeof obj === 'object' && obj !== null) {
          // Get element type from current object
          let currentElementType = elementType;
          
          // Detect element type from object structure
          if (obj['@_id']) {
            const id = obj['@_id'];
            
            // Try to determine element type from path or object properties
            if (path.includes('.place') || path.includes('place[')) {
              currentElementType = 'place';
            } else if (path.includes('.transition') || path.includes('transition[')) {
              currentElementType = 'transition';
            } else if (path.includes('.arc') || path.includes('arc[')) {
              currentElementType = 'arc';
            } else if (path.includes('materialTemplate')) {
              currentElementType = 'materialTemplate';
            } else if (path.includes('conditionTemplate')) {
              currentElementType = 'conditionTemplate';
            } else if (path.includes('resultTemplate')) {
              currentElementType = 'resultTemplate';
            } else if (path.includes('placeRef')) {
              currentElementType = 'placeRef';
            } else if (path.includes('.method')) {
              currentElementType = 'method';
            } else if (path.includes('.pnml')) {
              currentElementType = 'pnml';
            } else if (path.includes('.program')) {
              currentElementType = 'program';
            } else if (path.includes('.document')) {
              currentElementType = 'document';
            }
            
            // Store ID with its element information
            if (!idMap.has(id)) {
              idMap.set(id, []);
            } else {
                idMap.get(id)?.push({
                elementType: currentElementType,
                path: path
                });
            }
          }
          
          // Recursively process child elements
          for (const key in obj) {
            if (typeof obj[key] === 'object') {
              const newPath = path ? `${path}.${key}` : key;
              
              // Handle arrays
              if (Array.isArray(obj[key])) {
                obj[key].forEach((item, index) => {
                  collectIds(item, `${newPath}[${index}]`, currentElementType);
                });
              } else {
                collectIds(obj[key], newPath, currentElementType);
              }
            }
          }
        }
      };

      collectIds(parsedXML);

      // Check for duplicates
      for (const [id, occurrences] of idMap.entries()) {
        if (occurrences.length > 1) {
          // Found duplicate ID
          const elementTypes = occurrences.map(o => o.elementType).join(', ');
          const paths = occurrences.map(o => o.path);
          
          errors.push({
            type: errorTypes.DUPLICATE_ID,
            severity: 'error',
            message: `Duplicate ID "${id}" found in ${occurrences.length} elements`,
            duplicateId: id,  // 🔑 重複ID
            occurrences: occurrences.length,
            elementTypes: elementTypes,
            paths: paths,
            details: `ID "${id}" is used ${occurrences.length} times in: ${elementTypes}`,
            suggestion: `Ensure each ID is unique. Change duplicate IDs to unique values.`
          });
          
          console.log(`⚠️ [MaiMLParser] Duplicate ID detected: ${id} (${occurrences.length} occurrences in ${elementTypes})`);
        }
      }

      console.log(`✅ [MaiMLParser] Duplicate ID validation completed: ${errors.length} duplicates found out of ${idMap.size} total IDs`);

    } catch (error) {
      warnings.push({
        type: errorTypes.SYNTAX_ERROR,
        severity: 'warning',
        message: 'Duplicate ID validation partially failed',
        details: error instanceof Error ? error.message : ''
      });
    }

    return { errors, warnings };
  }
  
    /**
     * Generate auto-correction suggestions for common errors
     */
    export function generateAutoCorrections(analysisResult: AnalysisResult) {
      const corrections : Correction[] = [];
  
      console.log('generateAutoCorrections');
      for (const error of analysisResult.errors) {
        switch (error.type) {
          case errorTypes.MISSING_REQUIRED:
            if (error.message.includes('version')) {
              corrections.push({
                type: 'add_attribute',
                target: 'maiml',
                attribute: 'version',
                value: '1.0',
                description: 'Add version attribute to maiml root element',
                original: '<maiml>',
                fixed: '<maiml version="1.0">'
              });
            }
            break;
  
          case errorTypes.NAMESPACE_ERROR:
            corrections.push({
              type: 'add_attribute',
              target: 'maiml',
              attribute: 'xmlns',
              value: defaultNameSpace,
              description: 'Add correct namespace declaration',
              original: '<maiml>',
              fixed: `<maiml xmlns="${defaultNameSpace}">`
            });
            break;
  
          case errorTypes.REFERENCE_ERROR:
            if (!error.ref) {
              console.warn('[generateAutoCorrections] REFERENCE_ERROR without ref property:', error);
              continue;
            }
            
            corrections.push({
              type: 'remove_reference',
              target: error.path || '',
              ref: error.ref || '',
              description: `Remove invalid reference "${error.ref}"`,
              original: `ref="${error.ref}"`,
              fixed: ''
            });
            break;
        }
      }
  
      return corrections;
    }