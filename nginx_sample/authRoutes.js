// backend/routes/authRoutes.js
// MAIMLプロジェクト認証API - admin対応統合認証システム
// 3段階権限対応版（admin > manager > worker）
// AuthProvider.js・UserManagement.js・SessionManagement.js対応版

const express = require('express');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// 認証ミドルウェアのインポート（admin対応版）
const {
  requireAuth,
  requireRole,
  requireAdmin,
  requireAdminOrManager,
  checkSessionStatus,
  loginRateLimit,
  securityHeaders,
  getRoleInfo,
  ROLE_HIERARCHY
} = require('../middleware/auth');

// データベース接続
const { query, ensureDbWrite, getPool, isDatabaseAvailable } = require('../database/db');

// セキュリティヘッダー適用
router.use(securityHeaders);

// ==========================================
// 📱 セッション管理用メモリストレージ（拡張版）
// ==========================================
if (!global.authSessionMemory) {
  global.authSessionMemory = new Map();
}

// Admin監査ログ用メモリストレージ
if (!global.adminAuditLog) {
  global.adminAuditLog = [];
}

// ==========================================
// 🛠️ 監査ログ・ヘルパー関数（admin対応版）
// ==========================================

/**
 * 監査ログ記録（admin権限アクション用）
 */
async function recordAdminAudit(action, userId, userRole, details, ipAddress) {
  try {
    const auditRecord = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      userRole,
      details,
      ipAddress,
      id: uuidv4()
    };

    // メモリログに追加
    global.adminAuditLog.unshift(auditRecord);
    
    // メモリログサイズ制限（最新1000件まで）
    if (global.adminAuditLog.length > 1000) {
      global.adminAuditLog = global.adminAuditLog.slice(0, 1000);
    }

    // データベースにも記録（テーブルが存在する場合）
    try {
      await query(
        `INSERT INTO admin_audit_log (id, action, user_id, user_role, details, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [auditRecord.id, action, userId, userRole, JSON.stringify(details), ipAddress]
      );
    } catch (dbError) {
      console.warn('⚠️ [Audit] データベース記録失敗 - メモリログのみ保存');
    }

    console.log('📝 [Audit] Admin監査ログ記録:', {
      action,
      userId,
      userRole
    });

  } catch (error) {
    console.error('❌ [Audit] 監査ログ記録エラー:', error);
  }
}

/**
 * テーブルカラムの存在チェック
 */
async function checkColumnExists(tableName, columnName) {
  try {
    const result = await query(
      `SELECT 1 FROM information_schema.columns 
       WHERE table_name = $1 AND column_name = $2 AND table_schema = 'public'`,
      [tableName, columnName]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.warn(`⚠️ [Schema] カラム存在チェックエラー (${tableName}.${columnName}):`, error.message);
    return false;
  }
}

/**
 * 安全なログイン履歴記録（拡張版）
 */
async function safeInsertLoginHistory(userId, status, ipAddress, userAgent, failureReason = null, userRole = null) {
  try {
    const hasStatusColumn = await checkColumnExists('login_history', 'status');
    const hasFailureReasonColumn = await checkColumnExists('login_history', 'failure_reason');
    const hasSuccessColumn = await checkColumnExists('login_history', 'success');
    const hasUserRoleColumn = await checkColumnExists('login_history', 'user_role');
    
    // admin権限ログインの場合は監査ログにも記録
    if (userRole === 'admin' && status === 'success') {
      await recordAdminAudit('admin_login', userId, userRole, {
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString()
      }, ipAddress);
    }
    
    if (hasSuccessColumn && hasStatusColumn && hasFailureReasonColumn && hasUserRoleColumn) {
      // 全カラム対応版
      await query(
        `INSERT INTO login_history 
         (user_id, success, status, failure_reason, user_role, ip_address, user_agent, login_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        [
          userId, 
          status === 'success',
          status, 
          failureReason, 
          userRole,
          ipAddress, 
          userAgent
        ]
      );
    } else if (hasSuccessColumn && hasStatusColumn && hasFailureReasonColumn) {
      // status + success + failure_reason対応
      await query(
        `INSERT INTO login_history 
         (user_id, success, status, failure_reason, ip_address, user_agent, login_time)
         VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [userId, status === 'success', status, failureReason, ipAddress, userAgent]
      );
    } else if (hasSuccessColumn) {
      // 基本success対応
      await query(
        `INSERT INTO login_history 
         (user_id, success, ip_address, user_agent, login_time)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [userId, status === 'success', ipAddress, userAgent]
      );
    } else if (hasStatusColumn && hasFailureReasonColumn) {
      // status + failure_reason対応
      await query(
        `INSERT INTO login_history (user_id, status, failure_reason, ip_address, user_agent, login_time)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [userId, status, failureReason, ipAddress, userAgent]
      );
    } else if (hasStatusColumn) {
      // status対応
      await query(
        `INSERT INTO login_history (user_id, status, ip_address, user_agent, login_time)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [userId, status, ipAddress, userAgent]
      );
    } else {
      // 基本スキーマ対応
      await query(
        `INSERT INTO login_history (user_id, login_time, ip_address, user_agent)
         VALUES ($1, CURRENT_TIMESTAMP, $2, $3)`,
        [userId, ipAddress, userAgent]
      );
    }
    
    console.log(`✅ [Auth] ログイン履歴記録成功: ${status} (${userRole})`);
  } catch (error) {
    console.warn('⚠️ [Auth] ログイン履歴記録エラー:', error.message);
  }
}

/**
 * 安全なログアウト時刻更新（拡張版）
 */
async function safeUpdateLogoutTime(userId, sessionId, userRole) {
  try {
    // admin権限ログアウトの場合は監査ログにも記録
    if (userRole === 'admin') {
      await recordAdminAudit('admin_logout', userId, userRole, {
        sessionId,
        timestamp: new Date().toISOString()
      });
    }

    const hasLogoutTimeInSessions = await checkColumnExists('user_sessions', 'logout_time');
    const hasLastActivity = await checkColumnExists('user_sessions', 'last_activity');
    
    if (hasLogoutTimeInSessions && hasLastActivity) {
      await query(
        `UPDATE user_sessions 
         SET logout_time = CURRENT_TIMESTAMP, last_activity = CURRENT_TIMESTAMP 
         WHERE session_id = $1`,
        [sessionId]
      );
      console.log('✅ [Auth] user_sessionsのログアウト時刻更新成功');
    } else if (hasLogoutTimeInSessions) {
      await query(
        `UPDATE user_sessions 
         SET logout_time = CURRENT_TIMESTAMP 
         WHERE session_id = $1`,
        [sessionId]
      );
      console.log('✅ [Auth] user_sessionsのログアウト時刻更新成功');
    }
    
    const hasLogoutTimeInHistory = await checkColumnExists('login_history', 'logout_time');
    if (hasLogoutTimeInHistory && userId) {
      await query(
        `UPDATE login_history 
         SET logout_time = CURRENT_TIMESTAMP 
         WHERE id = (
           SELECT id FROM login_history 
           WHERE user_id = $1 AND logout_time IS NULL
           ORDER BY login_time DESC 
           LIMIT 1
         )`,
        [userId]
      );
      console.log('✅ [Auth] login_historyのログアウト時刻更新成功');
    }
    
  } catch (error) {
    console.warn('⚠️ [Auth] ログアウト時刻更新エラー:', error.message);
    
    if (error.message.includes('updated_at') || error.message.includes('update_updated_at_column')) {
      console.warn('⚠️ [Auth] トリガーエラー検出 - 代替更新を試行');
      try {
        await query(
          `UPDATE user_sessions 
           SET is_active = FALSE
           WHERE session_id = $1`,
          [sessionId]
        );
        console.log('✅ [Auth] 代替手段でセッション無効化成功');
      } catch (fallbackError) {
        console.warn('⚠️ [Auth] 代替手段も失敗:', fallbackError.message);
      }
    }
  }
}

// ==========================================
// 🔑 ログイン API（admin対応版）
// ==========================================
router.post('/login', loginRateLimit, async (req, res) => {
  try {
    const { username, password, organizationId, rememberMe = false } = req.body;
    
    console.log('🔑 [Auth] ログイン試行:', { 
      username,
      organizationId: organizationId || 'provider',
      rememberMe,
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 100),
      timestamp: new Date().toISOString() 
    });
    
    // 入力値検証（プロバイダユーザーは組織ID不要）
    if (!username || !password) {
      console.warn('⚠️ [Auth] ログイン失敗 - 入力値不足:', { 
        username: !!username, 
        password: !!password
      });
      return res.status(400).json({
        success: false,
        message: 'ユーザー名とパスワードは必須です',
        code: 'INVALID_INPUT'
      });
    }

    // データベース接続確認
    if (!isDatabaseAvailable()) {
      console.error('❌ [Auth] データベースが利用できません');
      return res.status(500).json({
        success: false,
        message: 'データベースサービスが利用できません',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // プロバイダユーザーチェック（組織IDなしまたは'provider'の場合）
    const isProviderLogin = !organizationId || organizationId === 'provider';
    
    let organization = null;
    let user = null;

    if (isProviderLogin) {
      // プロバイダユーザー認証（組織なし）
      console.log('👑 [Auth] プロバイダユーザーログイン試行');
      
      const providerResult = await query(
        `SELECT user_id, username, email, password_hash, role, status, 
                is_provider, last_login, created_at
         FROM users
         WHERE (user_id = $1 OR username = $1) AND is_provider = TRUE AND status = 'active'`,
        [username]
      );

      if (providerResult.rows.length === 0) {
        console.warn('⚠️ [Auth] プロバイダユーザーが見つからない:', { username });
        await bcrypt.compare(password, '$2b$10$dummy.hash.to.prevent.timing.attacks');
        
        await safeInsertLoginHistory(username, 'failed', req.ip, req.get('User-Agent'), 
          'provider_user_not_found', null);
        
        return res.status(401).json({
          success: false,
          message: 'ユーザー名またはパスワードが間違っています',
          code: 'INVALID_CREDENTIALS'
        });
      }

      user = providerResult.rows[0];
      console.log('✅ [Auth] プロバイダユーザー確認成功:', { 
        userId: user.user_id, 
        role: user.role,
        isProvider: user.is_provider
      });

    } else {
      // 通常ユーザー認証（組織ベース）
      console.log('🏢 [Auth] 組織ベースログイン試行');
      
      // 1. 組織の存在確認
      const orgResult = await query(
        `SELECT id, org_code, org_name, organization_id, status
         FROM organizations
         WHERE organization_id = $1`,
        [organizationId]
      );
      
      if (orgResult.rows.length === 0 || orgResult.rows[0].status !== 'active') {
        console.warn('⚠️ [Auth] 組織が見つからない または 無効:', { organizationId });
        await bcrypt.compare(password, '$2b$10$dummy.hash.to.prevent.timing.attacks');
        return res.status(400).json({
          success: false,
          message: '指定された組織が見つからないか無効です',
          code: 'INVALID_ORGANIZATION'
        });
      }
      
      organization = orgResult.rows[0];
      console.log('✅ [Auth] 組織確認成功:', organization.org_name);

      // 2. ユーザー認証（組織内での認証）
      // 🔧 修正: すべてのロールでusersテーブルのorganization_idで認証
      const userPermResult = await query(
        `SELECT 
           u.user_id, u.username, u.email, u.password_hash, u.role, u.status, 
           u.is_provider, u.last_login, u.created_at, u.organization_id
         FROM users u
         WHERE u.user_id = $1 
           AND u.organization_id = $2
           AND u.status = 'active'`,
        [username, organizationId]
      );

      if (userPermResult.rows.length === 0) {
        console.warn('⚠️ [Auth] ユーザーが組織内に存在しない:', { 
          username, 
          organizationId 
        });
        await bcrypt.compare(password, '$2b$10$dummy.hash.to.prevent.timing.attacks');
        
        await safeInsertLoginHistory(username, 'failed', req.ip, req.get('User-Agent'), 
          'user_not_found_in_organization', null);
        
        return res.status(401).json({
          success: false,
          message: 'ユーザー名またはパスワードが間違っています',
          code: 'INVALID_CREDENTIALS'
        });
      }

      user = userPermResult.rows[0];
      console.log('✅ [Auth] ユーザー確認成功:', { 
        userId: user.user_id, 
        role: user.role,
        organizationId 
      });
    }

    // 3. パスワード検証
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      console.warn('⚠️ [Auth] パスワード不一致:', { 
        username: user.username,
        organizationId,
        role: user.role,
        ip: req.ip
      });
      
      // ログイン履歴記録（失敗）
      await safeInsertLoginHistory(user.user_id, 'failed', req.ip, req.get('User-Agent'), 'invalid_password', user.role);

      // admin権限アカウントへの攻撃は特別に記録
      if (user.role === 'admin') {
        await recordAdminAudit('admin_login_failed', user.user_id, user.role, {
          reason: 'invalid_password',
          organizationId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        }, req.ip);
      }

      return res.status(401).json({
        success: false,
        message: 'ユーザー名またはパスワードが間違っています',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // ✅ 認証成功 - セッション作成（admin対応版 + 組織情報）
    const sessionId = uuidv4();
    
    // セッション有効期限（admin権限は長め、remember me対応）
    let expirationHours = 24; // 基本24時間
    if (user.role === 'admin') {
      expirationHours = rememberMe ? 168 : 48; // admin: remember時7日、通常48時間
    } else if (user.role === 'manager') {
      expirationHours = rememberMe ? 72 : 24;  // manager: remember時3日、通常24時間
    } else {
      expirationHours = rememberMe ? 48 : 12;  // worker: remember時2日、通常12時間
    }
    
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
    const token = `maiml_${sessionId}_${Date.now()}`;
    
    console.log('🔐 [Auth] セッション作成:', {
      sessionId,
      userId: user.user_id,
      organizationId,
      expiresAt: expiresAt.toISOString()
    });

    // セッション情報（拡張版）
    const sessionInfo = {
      sessionId,
      userId: user.user_id,
      username: user.username,
      role: user.role,
      loginTime: new Date(),
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      isActive: true,
      rememberMe,
      roleLevel: ROLE_HIERARCHY[user.role] || 0
    };

    try {
      // データベースにセッション記録（拡張版 + 組織情報）
      const hasRememberMeColumn = await checkColumnExists('user_sessions', 'remember_me');
      const hasUserRoleColumn = await checkColumnExists('user_sessions', 'user_role');
      const hasOrganizationIdColumn = await checkColumnExists('user_sessions', 'organization_id');
      
      if (hasRememberMeColumn && hasUserRoleColumn && hasOrganizationIdColumn) {
        // 全カラム対応版
        await query(
          `INSERT INTO user_sessions 
           (session_id, user_id, user_role, organization_id, expires_at, is_active, remember_me, ip_address, user_agent, created_at, last_activity)
           VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [sessionId, user.user_id, user.role, organizationId, expiresAt, rememberMe, req.ip, req.get('User-Agent')]
        );
        console.log('✅ [Auth] セッション記録（全カラム対応）');
      } else if (hasRememberMeColumn && hasUserRoleColumn) {
        // remember_me + user_role対応
        await query(
          `INSERT INTO user_sessions 
           (session_id, user_id, user_role, expires_at, is_active, remember_me, ip_address, user_agent, created_at, last_activity)
           VALUES ($1, $2, $3, $4, TRUE, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [sessionId, user.user_id, user.role, expiresAt, rememberMe, req.ip, req.get('User-Agent')]
        );
        console.log('✅ [Auth] セッション記録（remember_me + user_role対応）');
      } else {
        // 基本スキーマ対応
        await query(
          `INSERT INTO user_sessions 
           (session_id, user_id, expires_at, is_active, ip_address, user_agent, created_at, last_activity)
           VALUES ($1, $2, $3, TRUE, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [sessionId, user.user_id, expiresAt, req.ip, req.get('User-Agent')]
        );
        console.log('✅ [Auth] セッション記録（基本スキーマ対応）');
      }

      // ユーザーのlast_login更新
      try {
        await query(
          `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1`,
          [user.user_id]
        );
      } catch (updateError) {
        if (updateError.message.includes('updated_at') || updateError.message.includes('update_updated_at_column')) {
          console.warn('⚠️ [Auth] ユーザー最終ログイン更新でトリガーエラー - スキップ');
        } else {
          console.warn('⚠️ [Auth] ユーザー最終ログイン更新エラー:', updateError.message);
        }
      }

      // ログイン履歴記録（成功）
      await safeInsertLoginHistory(user.user_id, 'success', req.ip, req.get('User-Agent'), null, user.role);

      console.log('✅ [Auth] セッション記録成功:', { 
        sessionId, 
        userId: user.user_id,
        role: user.role,
        expiresAt: expiresAt.toISOString()
      });

    } catch (dbError) {
      console.error('❌ [Auth] セッション記録エラー:', dbError);
      // データベースエラーでもセッションはメモリに保持
    }

    // メモリセッション保存（フォールバック）
    global.authSessionMemory.set(sessionId, sessionInfo);
    
    // Expressセッションにも保存（組織情報を含む）
    req.session.userId = user.user_id;
    req.session.sessionId = sessionId;
    req.session.role = user.role;
    req.session.organizationId = organizationId;

    // ユーザー権限取得（admin権限は自動で全権限）
    let permissions = [];
    try {
      if (user.role === 'admin') {
        // admin権限は全権限を自動付与
        permissions = [
          'system_admin', 'user_management', 'experiment_management', 
          'security_control', 'database_admin', 'audit_logs'
        ];
        console.log('👑 [Auth] Admin権限で全権限自動付与');
      } else {
        const permResult = await query(
          `SELECT permission FROM user_permissions 
           WHERE user_id = $1 AND is_active = TRUE`,
          [user.user_id]
        );
        permissions = permResult.rows.map(row => row.permission);
      }
    } catch (permError) {
      console.warn('⚠️ [Auth] 権限取得エラー:', permError.message);
    }

    // ロール情報取得
    const roleInfo = getRoleInfo(user.role);

    // admin権限ログインの場合は監査ログに記録
    if (user.role === 'admin') {
      await recordAdminAudit('admin_login_success', user.user_id, user.role, {
        sessionId,
        organizationId,
        rememberMe,
        expiresAt: expiresAt.toISOString(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      }, req.ip);
    }

    // 複数組織権限チェック（プロバイダユーザーは全組織）
    let userOrganizationCount = 0;
    if (user.is_provider) {
      try {
        const totalOrgsResult = await query(
          `SELECT COUNT(*) as count FROM organizations WHERE status = 'active'`
        );
        userOrganizationCount = parseInt(totalOrgsResult.rows[0].count) || 0;
      } catch (countError) {
        console.warn('⚠️ [Auth] 組織総数取得エラー:', countError.message);
      }
    } else {
      try {
        const orgCountResult = await query(
          `SELECT COUNT(DISTINCT organization_id) as count
           FROM tenant_permissions
           WHERE user_id = $1 AND is_active = TRUE`,
          [user.user_id]
        );
        userOrganizationCount = parseInt(orgCountResult.rows[0].count) || 1;
        console.log('🔍 [Auth] 組織数クエリ結果:', { 
          userId: user.user_id, 
          count: orgCountResult.rows[0].count,
          parsed: userOrganizationCount 
        });
      } catch (countError) {
        console.error('❌ [Auth] 組織数取得エラー:', countError.message, countError);
        // エラー発生時はユーザーの組織IDがあれば1、なければ0
        userOrganizationCount = user.organization_id ? 1 : 0;
      }
    }

    // レスポンス構築（プロバイダ対応）
    const loginMessage = isProviderLogin 
      ? `プロバイダ管理者としてログインしました`
      : `${organization.org_display_name || organization.org_name}に${roleInfo.role === 'admin' ? 'システム管理者' : roleInfo.role === 'manager' ? 'マネージャー' : '作業者'}としてログインしました`;

    const responseData = {
      success: true,
      message: loginMessage,
      user: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        roleInfo,
        organizationId: organizationId || null,
        isProvider: user.is_provider || false,
        organizationCount: userOrganizationCount
      },
      token,
      sessionInfo: {
        sessionId,
        expiresAt: expiresAt.toISOString(),
        loginTime: sessionInfo.loginTime.toISOString(),
        rememberMe,
        expirationHours,
        organizationId: organizationId || null
      },
      organization: organization ? {
        id: organization.id,
        orgCode: organization.org_code,
        name: organization.org_name,
        displayName: organization.org_display_name,
        status: organization.status,
        subscriptionTier: organization.subscription_tier
      } : null,
      timestamp: new Date().toISOString()
    };

    console.log('✅ [Auth] ログイン成功:', {
      userId: user.user_id,
      username: user.username,
      organizationId: organizationId || 'provider',
      organizationName: organization?.org_name || 'Provider',
      role: user.role,
      roleLevel: roleInfo.level,
      permissionCount: permissions.length,
      sessionExpiry: expirationHours + 'h',
      isProvider: user.is_provider,
      organizationCount: userOrganizationCount
    });

    res.json(responseData);

  } catch (error) {
    console.error('❌ [Auth] ログインエラー:', error);
    res.status(500).json({
      success: false,
      message: 'ログイン処理中にエラーが発生しました',
      code: 'INTERNAL_ERROR',
      details: error.message
    });
  }
});

// ==========================================
// 🔓 ログアウト API（admin対応版）
// ==========================================
router.post('/logout', async (req, res) => {
  try {
    const { userId, sessionData } = req.body;
    const sessionId = sessionData?.sessionId || req.session.sessionId;
    const userRole = req.session.role || sessionData?.role;
    
    console.log('🔓 [Auth] ログアウト試行:', { 
      userId, 
      sessionId: sessionId ? 'あり' : 'なし',
      userRole,
      ip: req.ip
    });

    if (sessionId && isDatabaseAvailable()) {
      try {
        // データベースセッション無効化
        try {
          await query(
            `UPDATE user_sessions 
             SET is_active = FALSE, last_activity = CURRENT_TIMESTAMP 
             WHERE session_id = $1`,
            [sessionId]
          );
        } catch (updateError) {
          if (updateError.message.includes('updated_at') || updateError.message.includes('update_updated_at_column')) {
            console.warn('⚠️ [Auth] トリガーエラー検出 - 最小限の更新を実行');
            await query(
              `UPDATE user_sessions 
               SET is_active = FALSE
               WHERE session_id = $1`,
              [sessionId]
            );
          } else {
            throw updateError;
          }
        }

        // ログアウト時刻更新
        await safeUpdateLogoutTime(userId, sessionId, userRole);

        console.log('✅ [Auth] セッション無効化成功:', { sessionId });

      } catch (dbError) {
        console.error('❌ [Auth] セッション無効化エラー:', dbError);
      }
    }

    // メモリセッション削除
    if (sessionId && global.authSessionMemory.has(sessionId)) {
      global.authSessionMemory.delete(sessionId);
    }

    // Expressセッション破棄
    req.session.destroy((err) => {
      if (err) {
        console.warn('⚠️ [Auth] Expressセッション破棄エラー:', err);
      }
    });

    console.log('✅ [Auth] ログアウト完了:', { 
      userId,
      role: userRole,
      sessionCleared: true
    });

    res.json({
      success: true,
      message: 'ログアウトしました',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Auth] ログアウトエラー:', error);
    res.status(500).json({
      success: false,
      message: 'ログアウト処理中にエラーが発生しました',
      code: 'INTERNAL_ERROR'
    });
  }
});

// ==========================================
// 🔍 セッション検証 API（admin対応版）
// ==========================================
router.get('/verify-session', async (req, res) => {
  try {
    const sessionId = req.session.sessionId || req.headers.authorization?.replace('Bearer maiml_', '').split('_')[0];
    
    console.log('🔍 [Auth] セッション検証:', { 
      sessionId: sessionId ? 'あり' : 'なし',
      ip: req.ip
    });

    if (!sessionId) {
      return res.json({
        success: true,
        valid: false,
        reason: 'NO_SESSION'
      });
    }

    let sessionValid = false;
    let sessionInfo = null;

    // データベースセッション確認（拡張版）
    if (isDatabaseAvailable()) {
      try {
        const result = await query(
          `SELECT 
             us.session_id, us.user_id, us.expires_at, us.is_active,
             u.username, u.role, u.status, u.last_login
           FROM user_sessions us
           JOIN users u ON us.user_id = u.user_id
           WHERE us.session_id = $1`,
          [sessionId]
        );

        if (result.rows.length > 0) {
          const session = result.rows[0];
          const now = new Date();
          
          if (session.is_active && new Date(session.expires_at) > now && session.status === 'active') {
            sessionValid = true;
            sessionInfo = {
              sessionId: session.session_id,
              userId: session.user_id,
              username: session.username,
              role: session.role,
              roleInfo: getRoleInfo(session.role),
              expiresAt: session.expires_at,
              lastLogin: session.last_login
            };

            // セッションアクティビティ更新
            try {
              await query(
                `UPDATE user_sessions 
                 SET last_activity = CURRENT_TIMESTAMP 
                 WHERE session_id = $1`,
                [sessionId]
              );
            } catch (activityError) {
              if (!activityError.message.includes('updated_at')) {
                console.warn('⚠️ [Auth] セッションアクティビティ更新エラー:', activityError.message);
              }
            }
          }
        }
      } catch (dbError) {
        console.error('❌ [Auth] セッション検証DBエラー:', dbError);
      }
    }

    // メモリセッション確認（フォールバック）
    if (!sessionValid && global.authSessionMemory.has(sessionId)) {
      const memSession = global.authSessionMemory.get(sessionId);
      if (memSession.isActive && new Date(memSession.expiresAt) > new Date()) {
        sessionValid = true;
        sessionInfo = {
          ...memSession,
          roleInfo: getRoleInfo(memSession.role)
        };
      }
    }

    console.log('✅ [Auth] セッション検証結果:', { 
      sessionId: sessionId ? 'あり' : 'なし',
      valid: sessionValid,
      role: sessionInfo?.role
    });

    res.json({
      success: true,
      valid: sessionValid,
      sessionInfo: sessionValid ? sessionInfo : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Auth] セッション検証エラー:', error);
    res.status(500).json({
      success: false,
      valid: false,
      error: 'セッション検証中にエラーが発生しました'
    });
  }
});

// ==========================================
// ✅ 認証状態確認 API（admin対応版）
// ==========================================
router.post('/validate', async (req, res) => {
  try {
    const { userId } = req.body;
    const sessionId = req.session.sessionId;
    
    console.log('✅ [Auth] 認証状態確認:', { 
      userId, 
      hasSession: !!sessionId,
      ip: req.ip
    });

    if (!userId || !sessionId) {
      return res.json({
        success: true,
        valid: false,
        reason: 'MISSING_CREDENTIALS'
      });
    }

    // ユーザー存在確認（拡張版）
    const userResult = await query(
      `SELECT user_id, username, role, status, last_login FROM users WHERE user_id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0 || userResult.rows[0].status !== 'active') {
      return res.json({
        success: true,
        valid: false,
        reason: 'USER_INACTIVE'
      });
    }

    const user = userResult.rows[0];

    // セッション有効性確認
    const sessionResult = await query(
      `SELECT expires_at, is_active, remember_me FROM user_sessions 
       WHERE session_id = $1 AND user_id = $2`,
      [sessionId, userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.json({
        success: true,
        valid: false,
        reason: 'SESSION_NOT_FOUND'
      });
    }

    const session = sessionResult.rows[0];
    const isValid = session.is_active && new Date(session.expires_at) > new Date();

    // 有効なセッションの場合、権限情報も含めて返す
    let permissions = [];
    if (isValid) {
      try {
        if (user.role === 'admin') {
          permissions = [
            'system_admin', 'user_management', 'experiment_management', 
            'security_control', 'database_admin', 'audit_logs'
          ];
        } else {
          const permResult = await query(
            `SELECT permission FROM user_permissions 
             WHERE user_id = $1 AND is_active = TRUE`,
            [userId]
          );
          permissions = permResult.rows.map(row => row.permission);
        }
      } catch (permError) {
        console.warn('⚠️ [Auth] 権限取得エラー:', permError.message);
      }
    }

    res.json({
      success: true,
      valid: isValid,
      reason: isValid ? 'VALID' : 'SESSION_EXPIRED',
      user: isValid ? {
        ...user,
        permissions,
        roleInfo: getRoleInfo(user.role)
      } : null,
      sessionInfo: isValid ? {
        expiresAt: session.expires_at,
        rememberMe: session.remember_me
      } : null
    });

  } catch (error) {
    console.error('❌ [Auth] 認証状態確認エラー:', error);
    res.status(500).json({
      success: false,
      valid: false,
      error: '認証状態確認中にエラーが発生しました'
    });
  }
});

// ==========================================
// 📱 アクティビティ更新 API（admin対応版）
// ==========================================
router.post('/activity-update', async (req, res) => {
  try {
    const { userId, lastActivity } = req.body;
    
    // セッション情報のデバッグ
    console.log('🔍 [Activity] Session debug:', {
      hasSession: !!req.session,
      sessionId: req.session?.sessionId,
      sessionUserId: req.session?.userId,
      role: req.session?.role,
      requestUserId: userId
    });
    
    // より柔軟なバリデーション
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ユーザーIDが必要です'
      });
    }

    // セッションIDが無い場合でも、userIdがあれば処理を継続
    const sessionId = req.session?.sessionId;
    const userRole = req.session?.role;
    
    if (!sessionId) {
      console.warn('⚠️ [Activity] セッションIDなし、処理スキップ');
      return res.json({
        success: true,
        message: 'アクティビティ更新をスキップしました（セッション情報なし）',
        timestamp: new Date().toISOString()
      });
    }

    // 通常のアクティビティ更新処理
    if (isDatabaseAvailable()) {
      try {
        await query(
          `UPDATE user_sessions 
           SET last_activity = CURRENT_TIMESTAMP 
           WHERE session_id = $1 AND user_id = $2`,
          [sessionId, userId]
        );
      } catch (updateError) {
        console.warn('⚠️ [Activity] DB更新エラー:', updateError.message);
      }
    }

    // メモリセッション更新
    if (global.authSessionMemory?.has(sessionId)) {
      const session = global.authSessionMemory.get(sessionId);
      session.lastActivity = new Date();
      global.authSessionMemory.set(sessionId, session);
    }

    res.json({
      success: true,
      message: 'アクティビティを更新しました',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Activity] エラー:', error);
    res.status(500).json({
      success: false,
      message: 'アクティビティ更新中にエラーが発生しました'
    });
  }
});

// ==========================================
// 🔐 パスワード変更 API（admin対応版）
// ==========================================
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    console.log('🔐 [Auth] パスワード変更試行:', { 
      userId,
      role: userRole,
      ip: req.ip
    });

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '現在のパスワードと新しいパスワードは必須です'
      });
    }

    // パスワード強度チェック（admin権限は厳格）
    const minLength = userRole === 'admin' ? 12 : 8;
    if (newPassword.length < minLength) {
      return res.status(400).json({
        success: false,
        message: `パスワードは${minLength}文字以上である必要があります${userRole === 'admin' ? '（admin権限）' : ''}`,
        code: 'WEAK_PASSWORD'
      });
    }

    // 現在のパスワード確認
    const userResult = await query(
      `SELECT password_hash FROM users WHERE user_id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ユーザーが見つかりません'
      });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!passwordMatch) {
      // admin権限のパスワード変更失敗は監査ログに記録
      if (userRole === 'admin') {
        await recordAdminAudit('admin_password_change_failed', userId, userRole, {
          reason: 'current_password_incorrect',
          ipAddress: req.ip,
          timestamp: new Date().toISOString()
        }, req.ip);
      }

      return res.status(401).json({
        success: false,
        message: '現在のパスワードが間違っています'
      });
    }

    // 新しいパスワードハッシュ化（admin権限は高強度）
    const saltRounds = userRole === 'admin' ? 14 : 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // パスワード更新
    try {
      await query(
        `UPDATE users 
         SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $2`,
        [newPasswordHash, userId]
      );
    } catch (updateError) {
      if (updateError.message.includes('updated_at') || updateError.message.includes('update_updated_at_column')) {
        console.warn('⚠️ [Auth] パスワード更新でトリガーエラー - 代替更新');
        await query(
          `UPDATE users 
           SET password_hash = $1 
           WHERE user_id = $2`,
          [newPasswordHash, userId]
        );
      } else {
        throw updateError;
      }
    }

    // admin権限のパスワード変更は監査ログに記録
    if (userRole === 'admin') {
      await recordAdminAudit('admin_password_changed', userId, userRole, {
        ipAddress: req.ip,
        timestamp: new Date().toISOString(),
        saltRounds
      }, req.ip);
    }

    console.log('✅ [Auth] パスワード変更成功:', { 
      userId,
      role: userRole,
      saltRounds
    });

    res.json({
      success: true,
      message: `パスワードを変更しました${userRole === 'admin' ? '（高強度暗号化適用）' : ''}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Auth] パスワード変更エラー:', error);
    res.status(500).json({
      success: false,
      message: 'パスワード変更中にエラーが発生しました'
    });
  }
});

// ==========================================
// 👥 ユーザー情報取得 API（admin対応版）
// ==========================================
router.get('/user-info', requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    
    console.log('👥 [Auth] ユーザー情報取得:', { 
      userId,
      role: userRole
    });

    // ユーザー詳細情報取得
    const userResult = await query(
      `SELECT 
         user_id, username, email, role, status, last_login, created_at, updated_at
       FROM users 
       WHERE user_id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'ユーザーが見つかりません'
      });
    }

    // 権限情報取得（admin権限は自動で全権限）
    let permissions = [];
    if (userRole === 'admin') {
      permissions = [
        'system_admin', 'user_management', 'experiment_management', 
        'security_control', 'database_admin', 'audit_logs'
      ];
    } else {
      const permResult = await query(
        `SELECT permission FROM user_permissions 
         WHERE user_id = $1 AND is_active = TRUE`,
        [userId]
      );
      permissions = permResult.rows.map(row => row.permission);
    }

    // セッション情報取得
    const sessionResult = await query(
      `SELECT COUNT(*) as active_sessions, MAX(created_at) as last_session
       FROM user_sessions 
       WHERE user_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP`,
      [userId]
    );

    const user = userResult.rows[0];
    const sessionInfo = sessionResult.rows[0];

    res.json({
      success: true,
      data: {
        id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        permissions,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        roleInfo: getRoleInfo(user.role),
        sessionInfo: {
          activeSessions: parseInt(sessionInfo.active_sessions) || 0,
          lastSession: sessionInfo.last_session
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Auth] ユーザー情報取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'ユーザー情報取得中にエラーが発生しました'
    });
  }
});

// ==========================================
// 📊 管理者用: ユーザー一覧取得（admin/manager）
// ==========================================
router.get('/users', requireAdminOrManager, async (req, res) => {
  try {
    console.log('📊 [Auth] ユーザー一覧取得 (管理者):', {
      requestedBy: req.user.userId,
      role: req.user.role
    });

    // admin以外はadminユーザーを除外
    const whereClause = req.user.role === 'admin' ? '' : "WHERE role != 'admin'";

    const result = await query(
      `SELECT 
         user_id, username, email, role, status, last_login, created_at
       FROM users 
       ${whereClause}
       ORDER BY created_at DESC`
    );

    const users = result.rows.map(user => ({
      id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      roleInfo: getRoleInfo(user.role)
    }));

    res.json({
      success: true,
      data: {
        users,
        total: users.length,
        summary: {
          total: users.length,
          active: users.filter(u => u.status === 'active').length,
          admins: users.filter(u => u.role === 'admin').length,
          managers: users.filter(u => u.role === 'manager').length,
          workers: users.filter(u => u.role === 'worker').length
        },
        requestedBy: {
          userId: req.user.userId,
          role: req.user.role,
          canViewAdmins: req.user.role === 'admin'
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Auth] ユーザー一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      message: 'ユーザー一覧取得中にエラーが発生しました'
    });
  }
});

// ==========================================
// 🆔 セッション状態チェック（認証不要・拡張版）
// ==========================================
router.get('/session-status', checkSessionStatus, (req, res) => {
  try {
    const hasUser = !!req.user;
    
    res.json({
      success: true,
      authenticated: hasUser,
      user: hasUser ? {
        userId: req.user.userId,
        role: req.user.role,
        status: req.user.status,
        roleInfo: getRoleInfo(req.user.role)
      } : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Auth] セッション状態チェックエラー:', error);
    res.status(500).json({
      success: false,
      message: 'セッション状態チェック中にエラーが発生しました'
    });
  }
});

// ==========================================
// 📝 admin専用: 監査ログ取得
// ==========================================
router.get('/admin-audit-log', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 100, action, userId, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    
    console.log('📝 [Auth] 監査ログ取得:', {
      requestedBy: req.user.userId,
      filters: { action, userId, startDate, endDate },
      pagination: { page, limit }
    });

    let filteredLogs = [...global.adminAuditLog];

    // フィルタ適用
    if (action) {
      filteredLogs = filteredLogs.filter(log => 
        log.action.toLowerCase().includes(action.toLowerCase())
      );
    }

    if (userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === userId);
    }

    if (startDate) {
      const start = new Date(startDate);
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) >= start
      );
    }

    if (endDate) {
      const end = new Date(endDate);
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) <= end
      );
    }

    // ページネーション
    const totalLogs = filteredLogs.length;
    const paginatedLogs = filteredLogs.slice(offset, offset + parseInt(limit));
    const totalPages = Math.ceil(totalLogs / limit);

    // アクション統計
    const actionStats = filteredLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        logs: paginatedLogs,
        summary: {
          total: totalLogs,
          currentPage: parseInt(page),
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          actionStats
        },
        filters: { action, userId, startDate, endDate }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [Auth] 監査ログ取得エラー:', error);
    res.status(500).json({
      success: false,
      message: '監査ログ取得中にエラーが発生しました'
    });
  }
});

router.get("/org-id", (req, res) => {
  try {
    res.json({
      tenantId: req.headers["x-tenant-id"],
      user: "John Doe",
    });
  } catch (error) {
    console.error("❌ [Auth] セッション状態チェックエラー:", error);
    res.status(500).json({
      success: false,
      message: "セッション状態チェック中にエラーが発生しました",
    });
  }
});

module.exports = router;
