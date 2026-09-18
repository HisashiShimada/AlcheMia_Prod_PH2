import { XMLParser, XMLValidator} from 'fast-xml-parser';
import sax from 'sax';
import { AnalysisResult, ValidationMode } from '../types/maimlValidation';
import { X2jOptions } from 'fast-xml-parser';
import { ErrorContent,statistics, Correction } from '../types/maimlValidation';
import * as maimlAnalysisResultRepository from '../repositories/maimlAnalysisResultRepository';
import { FileMetadataRepository } from '../repositories/fileMetadataRepository';
import * as namespaceTermRepository from '../repositories/namespaceTermRepository';
import { readGlobalDeclarations } from '../services/globalNamespaceFileService';

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
    VALIDATION_WARNING: 'validation_warning',
    TERM_NOT_REGISTERED: 'term_not_registered', // 🆕 追加: 未登録用語キーエラー
};

export async function analyzeMaiMLFile(organaizationId: string, maimlContent : string, fileKey: string, skipSave?: boolean, validationMode: ValidationMode = 'strict'): Promise<AnalysisResult>  {
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
      const syntaxValidation = await validateXMLSyntax(maimlContent);
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
      const structureValidation = validateMaiMLStructure(parsedXML, validationMode);
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
      const duplicateValidation = validateDuplicateIds(parsedXML, validationMode);
      analysisResult.errors.push(...duplicateValidation.errors);
      analysisResult.warnings.push(...duplicateValidation.warnings);

      // Phase 7: 用語キー照合バリデーション（organizationIdがある場合のみ実行）
      if (organaizationId) {
        console.log('validatePropertyTermKeys');
        const [activeTerms, globalDeclarations] = await Promise.all([
          namespaceTermRepository.findAllActiveByOrganization(organaizationId),
          readGlobalDeclarations(),
        ]);
        const registeredQNames = new Set(activeTerms.map(t => t.qname));
        const globalPrefixes = new Set(globalDeclarations.map(d => d.prefix));
        const termKeyValidation = validatePropertyTermKeys(
          parsedXML,
          registeredQNames,
          globalPrefixes,
          validationMode
        );
        analysisResult.errors.push(...termKeyValidation.errors);
        analysisResult.warnings.push(...termKeyValidation.warnings);
      }

      analysisResult.processingTime = Date.now() - startTime;
      
      console.log(`✅ [MaiMLParser] Analysis completed for ${fileKey}: ${analysisResult.errors.length} errors, ${analysisResult.warnings.length} warnings`);
      
      // 🎯 CRITICAL FIX: Save analysis results with proper pool usage
      // skipSave=true の場合はDB保存をスキップ（アップロード時バリデーション用）
      if (!skipSave) {
        await saveAnalysisResults(organaizationId, analysisResult);
      } else {
        console.log(`⏭️ [MaiMLParser] DB保存スキップ (skipSave=true): ${fileKey}`);
      }
      
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

    // 組織IDプレフィックスの正規化（冪等: 既に付いていれば何もしない）
    const normalizedFileKey = analysisResult.fileKey.startsWith(`${organizationId}/`)
      ? analysisResult.fileKey
      : `${organizationId}/${analysisResult.fileKey}`;

    // Step 2: maiml_analysis_resultsテーブルに保存（Repository使用）
    const analysisData = {
      file_key: normalizedFileKey,
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
    const existingMetadata = await fileMetadataRepository.getFileMetadataByFileKey(normalizedFileKey);

    if (!existingMetadata) {
      // ファイルメタデータが存在しない場合は新規作成
      console.warn(`⚠️ [MaiMLParser] File not found in file_metadata: ${normalizedFileKey}`);
      
      const filename = normalizedFileKey.split('/').pop() || 'unknown.maiml';
      const newMetadata = {
        file_key: normalizedFileKey,
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
      console.log(`🔧 [MaiMLParser] Created missing file_metadata entry for: ${normalizedFileKey}`);
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
        normalizedFileKey,
        updateData
      );

      console.log(`✅ [MaiMLParser] file_metadata updated successfully:`);
      console.log(`   - file_key: ${updated.file_key}`);
      console.log(`   - status: ${updated.maiml_analysis_status}`);
      console.log(`   - errors: ${updated.maiml_error_count}`);
      console.log(`   - warnings: ${updated.maiml_warning_count}`);
    }

    console.log(`✅ [MaiMLParser] Database save completed successfully for ${normalizedFileKey}`);
    return savedAnalysis.id || 0;

  } catch (error) {
    console.error(`❌ [MaiMLParser] Database save failed for ${analysisResult.fileKey}:`, error);
    throw error;
  }
}
  
    /**
     * Validate basic XML syntax using sax (strict mode).
     *
     * sax strict mode は W3C XML 仕様に準拠しており、フロントエンドの xml-js が
     * 内部で使用する sax と同じ厳格さでバリデーションを行う。
     * fast-xml-parser (XMLValidator) では検出できなかった以下の問題も捕捉できる:
     *   - コメント内の "--" (XML spec §2.5 違反)
     *   - その他の strict XML 仕様違反
     */
    function validateXMLSyntax(xmlContent: string): Promise<{
      isValid: boolean;
      error?: string;
      line?: number;
      column?: number;
    }> {
      return new Promise((resolve) => {
        console.log('validateXMLSyntax (sax strict)');

        const parser = sax.createStream(true /* strict */, {
          xmlns: false,
          trim: false,
          normalize: false,
        });

        let resolved = false;

        parser.on('error', (err: Error & { line?: number; column?: number }) => {
          if (!resolved) {
            resolved = true;
            resolve({
              isValid: false,
              error: err.message,
              line: err.line != null ? err.line + 1 : undefined,   // sax は 0-origin
              column: err.column != null ? err.column : undefined,
            });
          }
          // エラー後もストリームが止まらないように resume
          parser.resume();
        });

        parser.on('end', () => {
          if (!resolved) {
            resolved = true;
            resolve({ isValid: true });
          }
        });

        // Writable stream に書き込んで close
        parser.write(xmlContent);
        parser.end();
      });
    }

  /**
   * Validate MaiML document structure against schema requirements
   * @param parsedXML - パース済みXML
   * @param mode - バリデーションモード ('strict' | 'lenient')
   */
  function validateMaiMLStructure(parsedXML : any, mode: ValidationMode = 'strict') {
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
        // Validate document structure（モードを伝播）
        const docValidation = validateDocumentStructure(maimlRoot.document, mode);
        errors.push(...docValidation.errors);
        warnings.push(...docValidation.warnings);
        if (!docValidation.isValid) isValid = false;
      }

      // Check required protocol element
      if (!maimlRoot.protocol) {
        errors.push({
          type: errorTypes.MISSING_REQUIRED,
          severity: 'error',
          message: 'Missing required "protocol" element',
          suggestion: 'Add <protocol id="..."> element. Check for typos (e.g. "protcol" instead of "protocol")',
        });
        isValid = false;
      } else {
        // Validate protocol structure（モードを伝播）
        const protocolValidation = validateProtocolStructure(maimlRoot.protocol, mode);
        errors.push(...protocolValidation.errors);
        warnings.push(...protocolValidation.warnings);
        if (!protocolValidation.isValid) isValid = false;
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
   * @param document - document要素
   * @param mode - バリデーションモード ('strict' | 'lenient')
   *   lenient: document id属性欠落・必須子要素欠落はerrors配列に追加するが canBeIgnoredOnUpload=true を付与
   *   strict : すべてエラーとして扱い isValid=false にする
   */
  function validateDocumentStructure(document : any, mode: ValidationMode = 'strict') {
    const errors : ErrorContent[] = [];
    const warnings: ErrorContent[] = [];
    let isValid = true;

    // Check required ID attribute
    // lenientモードではcanBeIgnoredOnUpload=trueでerrorsに追加（アップロードは許可）
    if (!document['@_id']) {
      if (mode === 'lenient') {
        errors.push({
          type: errorTypes.MISSING_REQUIRED,
          severity: 'error',
          canBeIgnoredOnUpload: true,
          message: 'Document element missing "id" attribute (can be added in editor)',
          suggestion: 'Add id="unique-document-id" to <document> element in the editor'
        });
        // isValidはfalseにしない（アップロード判定でcanBeIgnoredOnUploadを使用）
      } else {
        errors.push({
          type: errorTypes.MISSING_REQUIRED,
          severity: 'error',
          canBeIgnoredOnUpload: false,
          message: 'Document element missing required "id" attribute',
          suggestion: 'Add id="unique-document-id" to <document> element'
        });
        isValid = false;
      }
    }

    // Check required uuid element
    // document UUIDはproject_uuidの設定に使われるため、アップロード後に変更不可
    // → 両モードともエラー（lenientでも降格しない）
    if (!document['uuid']) {
      errors.push({
        type: errorTypes.MISSING_REQUIRED,
        severity: 'error',
        message: 'Missing required "uuid" element in document (required for project identification)',
        suggestion: 'Add <uuid> element with a valid UUID v4 value to <document> section'
      });
      isValid = false;
    }

    // Check other required child elements（uuid以外）
    // lenientモードではcanBeIgnoredOnUpload=trueでerrorsに追加（アップロードは許可・情報は保持）
    const editableRequiredChildren = ['creator', 'vendor', 'owner', 'date'];
    for (const child of editableRequiredChildren) {
      if (!document[child]) {
        if (mode === 'lenient') {
          errors.push({
            type: errorTypes.MISSING_REQUIRED,
            severity: 'error',
            canBeIgnoredOnUpload: true,
            message: `Missing "${child}" element in document (can be added in editor)`,
            suggestion: `Add <${child}> element to document section in the editor`
          });
          // isValidはfalseにしない（アップロード判定でcanBeIgnoredOnUploadを使用）
        } else {
          errors.push({
            type: errorTypes.MISSING_REQUIRED,
            severity: 'error',
            canBeIgnoredOnUpload: false,
            message: `Missing required "${child}" element in document`,
            suggestion: `Add <${child}> element to document section`
          });
          isValid = false;
        }
      }
    }

    // Validate UUID format if present
    // document UUIDはアップロード後に変更不可のため、両モードともエラー
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
    // 日付フォーマットは現状通り警告（両モード共通）
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
   * Validate protocol element structure
   * XSD: protocolType → hasIdAttributeType + globalObjectContentGroup + method(1以上)
   * @param protocol - protocol要素
   * @param mode - バリデーションモード ('strict' | 'lenient')
   *   lenientでもprotocol id・uuid・methodは構造的に必須のためエラーを維持
   */
  function validateProtocolStructure(protocol: any, mode: ValidationMode = 'strict') {
    const errors: ErrorContent[] = [];
    const warnings: ErrorContent[] = [];
    let isValid = true;

    // Check required id attribute（両モードともエラー：構造的に必須）
    if (!protocol['@_id']) {
      errors.push({
        type: errorTypes.MISSING_REQUIRED,
        severity: 'error',
        message: 'Protocol element missing required "id" attribute',
        suggestion: 'Add id="unique-protocol-id" to <protocol> element'
      });
      isValid = false;
    }

    // Check required uuid element（両モードともエラー：プロトコルの一意識別に必須）
    if (!protocol.uuid) {
      errors.push({
        type: errorTypes.MISSING_REQUIRED,
        severity: 'error',
        message: 'Missing required "uuid" element in protocol',
        suggestion: 'Add <uuid> element to <protocol> section'
      });
      isValid = false;
    }

    // Check required method element（両モードともエラー：methodは必須構造）
    const methods = protocol.method;
    if (!methods || (Array.isArray(methods) && methods.length === 0)) {
      errors.push({
        type: errorTypes.MISSING_REQUIRED,
        severity: 'error',
        message: 'Missing required "method" element in protocol (at least 1 required)',
        suggestion: 'Add at least one <method id="..."> element to <protocol>'
      });
      isValid = false;
    } else {
      // Validate each method（モードを伝播）
      const methodArray = Array.isArray(methods) ? methods : [methods];
      methodArray.forEach((method: any, index: number) => {
        const methodValidation = validateMethodStructure(method, index, mode);
        errors.push(...methodValidation.errors);
        warnings.push(...methodValidation.warnings);
        if (!methodValidation.isValid) isValid = false;
      });
    }

    return { isValid, errors, warnings };
  }

  /**
   * Validate method element structure
   * XSD: methodType → hasIdAttributeType + globalObjectContentGroup + pnml(1以上) + program(1以上)
   * @param method - method要素
   * @param index - メソッドのインデックス
   * @param mode - バリデーションモード ('strict' | 'lenient')
   *   lenient: method id属性欠落を警告に降格
   *   uuid/pnml/programは両モードともエラー（構造的に必須）
   */
  function validateMethodStructure(method: any, index: number, mode: ValidationMode = 'strict') {
    const errors: ErrorContent[] = [];
    const warnings: ErrorContent[] = [];
    let isValid = true;

    const methodLabel = method['@_id'] ? `method[id="${method['@_id']}"]` : `method[${index}]`;

    // Check required id attribute
    // lenientモードではcanBeIgnoredOnUpload=trueでerrorsに追加（アップロードは許可）
    if (!method['@_id']) {
      if (mode === 'lenient') {
        errors.push({
          type: errorTypes.MISSING_REQUIRED,
          severity: 'error',
          canBeIgnoredOnUpload: true,
          message: `method[${index}] missing "id" attribute (can be added in editor)`,
          suggestion: 'Add id="unique-method-id" to <method> element in the editor'
        });
        // isValidはfalseにしない（アップロード判定でcanBeIgnoredOnUploadを使用）
      } else {
        errors.push({
          type: errorTypes.MISSING_REQUIRED,
          severity: 'error',
          canBeIgnoredOnUpload: false,
          message: `${methodLabel} missing required "id" attribute`,
          suggestion: 'Add id="unique-method-id" to <method> element'
        });
        isValid = false;
      }
    }

    // Check required uuid element（両モードともエラー：メソッドの一意識別に必須）
    if (!method.uuid) {
      errors.push({
        type: errorTypes.MISSING_REQUIRED,
        severity: 'error',
        message: `Missing required "uuid" element in ${methodLabel}`,
        suggestion: `Add <uuid> element to <method> section`
      });
      isValid = false;
    }

    // Check required pnml element（両モードともエラー：methodの必須子要素）
    const pnmls = method.pnml;
    if (!pnmls || (Array.isArray(pnmls) && pnmls.length === 0)) {
      errors.push({
        type: errorTypes.MISSING_REQUIRED,
        severity: 'error',
        message: `Missing required "pnml" element in ${methodLabel} (at least 1 required)`,
        suggestion: `Add <pnml id="..."> element to <method>`
      });
      isValid = false;
    }

    // Check required program element（両モードともエラー：methodの必須子要素）
    const programs = method.program;
    if (!programs || (Array.isArray(programs) && programs.length === 0)) {
      errors.push({
        type: errorTypes.MISSING_REQUIRED,
        severity: 'error',
        message: `Missing required "program" element in ${methodLabel} (at least 1 required)`,
        suggestion: `Add <program id="..."> element to <method>`
      });
      isValid = false;
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
          severity: 'info',
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
   * @param parsedXML - パース済みXML
   * @param mode - バリデーションモード ('strict' | 'lenient')
   *   lenient: 編集可能要素（place/transition/arc/materialTemplate/conditionTemplate/resultTemplate）の重複IDを警告に降格
   *   strict : 全要素の重複IDをエラーとして扱う
   */
  function validateDuplicateIds(parsedXML: any, mode: ValidationMode = 'strict') {
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
              idMap.set(id, [{ elementType: currentElementType, path: path }]);
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
      // ✅ ID重複は参照関係（placeRef等）を壊すため、モードに関わらず常にエラー
      for (const [id, occurrences] of idMap.entries()) {
        if (occurrences.length > 1) {
          // Found duplicate ID
          const elementTypes = occurrences.map(o => o.elementType).join(', ');
          const paths = occurrences.map(o => o.path);

          const errorEntry: ErrorContent = {
            type: errorTypes.DUPLICATE_ID,
            severity: 'error', // 常にエラー（lenientモードでも降格しない）
            message: `Duplicate ID "${id}" found in ${occurrences.length} elements`,
            duplicateId: id,
            occurrences: occurrences.length,
            elementTypes: elementTypes,
            paths: paths,
            details: `ID "${id}" is used ${occurrences.length} times in: ${elementTypes}`,
            suggestion: `Ensure each ID is unique. Change duplicate IDs to unique values.`
          };

          errors.push(errorEntry);
          
          console.log(`⚠️ [MaiMLParser] Duplicate ID detected: ${id} (${occurrences.length} occurrences in ${elementTypes}) [error]`);
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
   * パース済みXMLオブジェクトの maiml ルート要素から xmlns 宣言を抽出し、
   * prefix → URI のマップとして返す。
   *
   * fast-xml-parser は attributeNamePrefix: '@_' の設定のため、
   * `<maiml xmlns:Alchemia="https://Alchemia.co.jp">` は
   * `parsedXML.maiml['@_xmlns:Alchemia']` としてアクセスできる。
   *
   * @param parsedXML - fast-xml-parser でパース済みのXMLオブジェクト
   * @returns prefix → URI のマップ（xmlns 宣言がない場合は空 Map）
   */
  function extractXmlnsDeclarations(parsedXML: any): Map<string, string> {
    const result = new Map<string, string>();
    const maiml = parsedXML?.maiml;
    if (!maiml || typeof maiml !== 'object') return result;

    for (const attr of Object.keys(maiml)) {
      // @_xmlns:prefix 形式の属性を抽出（デフォルトxmlns宣言 @_xmlns は除外）
      if (attr.startsWith('@_xmlns:')) {
        const prefix = attr.slice('@_xmlns:'.length);
        const uri = String(maiml[attr]);
        if (prefix && uri) {
          result.set(prefix, uri);
        }
      }
    }
    return result;
  }

  /**
   * 指定した URI が Alchemia が払い出した URI かどうかを判定する
   *
   * 判定基準: URI に 'Alchemia.co.jp' が含まれる
   * 例: 'https://ORG001.Alchemia.co.jp' → true
   *     'https://Alchemia.co.jp'         → true（システム名前空間）
   *     'http://example.com/ext'          → false（外部URI）
   *
   * @param uri - 判定対象のURI文字列
   * @returns Alchemia が払い出したURIであれば true
   */
  function isAlchemiaUri(uri: string): boolean {
    return uri.includes('Alchemia.co.jp');
  }

  /**
   * property / uncertainty タグの key 属性値を再帰的に収集する
   *
   * @param obj - パース済みXMLオブジェクト（任意の階層）
   * @param keys - 収集した key 値を格納する Set（重複排除のため Set を使用）
   */
  function collectPropertyAndUncertaintyKeys(obj: any, keys: Set<string>): void {
    if (typeof obj !== 'object' || obj === null) return;

    if (Array.isArray(obj)) {
      for (const item of obj) {
        collectPropertyAndUncertaintyKeys(item, keys);
      }
      return;
    }

    for (const tagName of Object.keys(obj)) {
      if (tagName === 'property' || tagName === 'uncertainty') {
        const elements = Array.isArray(obj[tagName]) ? obj[tagName] : [obj[tagName]];
        for (const el of elements) {
          if (el && typeof el === 'object' && el['@_key']) {
            keys.add(String(el['@_key']));
          }
          // ネスト内も再帰的に走査
          collectPropertyAndUncertaintyKeys(el, keys);
        }
      } else {
        collectPropertyAndUncertaintyKeys(obj[tagName], keys);
      }
    }
  }

  /**
   * Phase 7: property / uncertainty タグの key 属性値を用語テーブルと照合するバリデーション
   *
   * 判定フロー:
   * 1. プレーンキー（prefix なし）
   *    → ネームスペースに依存しない用語はMaiml仕様上エラーとしない → 常にスキップ
   * 2. key に含まれる prefix がグローバルCSV（global-declarations.csv）に登録されている
   *    → エラーなし（グローバル宣言の prefix を持つ用語として許可）
   * 3. MAIMLの xmlns 宣言を参照して prefix の URI を確認
   *    a. xmlns 宣言なし（prefix が不明）
   *       → DB 確認なしで即エラー
   *    b. xmlns 宣言あり かつ 非Alchemia URI（外部名前空間）
   *       → エラーなし（外部名前空間の用語は照合対象外）
   *    c. xmlns 宣言あり かつ Alchemia URI（Alchemia.co.jp を含む）
   *       → namespace_term（DB）のアクティブ用語と照合
   *       → 未登録の場合 → エラー
   *
   * @param parsedXML - fast-xml-parser でパース済みのXMLオブジェクト
   * @param registeredQNames - namespace_term のアクティブ用語 qname の Set
   * @param globalPrefixes - グローバルCSVに登録済みの prefix Set
   * @param mode - バリデーションモード ('strict' | 'lenient')
   * @returns { errors: ErrorContent[], warnings: ErrorContent[] }
   */
  function validatePropertyTermKeys(
    parsedXML: any,
    registeredQNames: Set<string>,
    globalPrefixes: Set<string>,
    mode: ValidationMode
  ): { errors: ErrorContent[]; warnings: ErrorContent[] } {
    const errors: ErrorContent[] = [];
    const warnings: ErrorContent[] = [];

    // MAIMLルート要素の xmlns 宣言を prefix → URI のマップとして抽出
    const xmlnsMap = extractXmlnsDeclarations(parsedXML);

    // property / uncertainty タグの key 属性値を全収集
    const collectedKeys = new Set<string>();
    collectPropertyAndUncertaintyKeys(parsedXML, collectedKeys);

    console.log(`🔍 [validatePropertyTermKeys] 収集された key 数: ${collectedKeys.size}`);

    for (const key of collectedKeys) {
      // prefix:localName 形式かプレーンキーかを判定
      const colonIdx = key.indexOf(':');
      if (colonIdx !== -1) {
        // prefix:localName 形式
        const prefix = key.substring(0, colonIdx);

        // Step 1: グローバルCSVに登録されている prefix か
        if (globalPrefixes.has(prefix)) {
          // グローバル宣言の prefix → エラーなし
          continue;
        }

        // Step 2: MAIMLの xmlns 宣言でこの prefix の URI を確認
        const prefixUri = xmlnsMap.get(prefix);

        if (prefixUri === undefined) {
          // xmlns 宣言なし → DB 確認なしで即エラー
          // （MAIMLとして宣言されていない prefix を使うこと自体が不正）
        } else if (!isAlchemiaUri(prefixUri)) {
          // 外部名前空間（Alchemia 以外）の prefix → スキップ
          continue;
        } else {
          // Alchemia URI の prefix → DB（namespace_term）と照合
          if (registeredQNames.has(key)) {
            continue;
          }
        }
      } else {
        // プレーンキー形式（prefix なし）
        // ネームスペースに依存しない用語はMaiml仕様上エラーとしない → スキップ
        continue;
      }

      // 未登録キー
      console.log(`❌ [validatePropertyTermKeys] 未登録用語キー: "${key}"`);
      const errorEntry: ErrorContent = {
        type: errorTypes.TERM_NOT_REGISTERED,
        severity: 'error',
        message: `Unregistered term key "${key}" used in property/uncertainty tag.`,
        details: `The key "${key}" is not registered in the namespace term management.`,
        suggestion: 'Register this term in the namespace management screen before using it.',
        // lenient モードでも canBeIgnoredOnUpload=true（アップロード許可）にするが
        // errors 配列に追加することで maimlHasErrors=true となり編集不可モードが発動する
        canBeIgnoredOnUpload: mode === 'lenient',
      };

      errors.push(errorEntry);
    }

    console.log(`✅ [validatePropertyTermKeys] 完了: ${errors.length} エラー, ${warnings.length} 警告`);
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