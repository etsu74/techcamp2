/**
 * エラーハンドリング専用モジュール
 * MVP-4段階: ユーザーフレンドリーなエラー処理
 */

const ErrorHandler = {
    
    /**
     * エラー分類定数
     */
    ERROR_TYPES: {
        FILE_SIZE: 'ファイルサイズエラー',
        FILE_FORMAT: 'ファイル形式エラー',
        DATA_VALIDATION: 'データ検証エラー',
        PROCESSING: '処理エラー',
        NETWORK: 'ネットワークエラー',
        UNKNOWN: '不明なエラー'
    },
    
    /**
     * エラーメッセージの多言語対応
     */
    ERROR_MESSAGES: {
        'ファイルサイズが大きすぎます': {
            title: 'ファイルサイズエラー',
            message: 'ファイルサイズが制限を超えています。',
            solution: '10MB以下のファイルを選択してください。',
            action: 'ファイルを分割するか、不要なデータを削除してから再試行してください。'
        },
        'ファイル形式エラー': {
            title: 'ファイル形式エラー',
            message: 'サポートされていないファイル形式です。',
            solution: 'Excel (.xlsx) または CSV ファイルを選択してください。',
            action: 'ファイル形式を確認し、対応形式に変換してから再試行してください。'
        },
        'データ検証エラー': {
            title: 'データ検証エラー',
            message: 'ファイルのデータに問題があります。',
            solution: '必須列（イベント名、開始日、終了日）が含まれていることを確認してください。',
            action: 'データを修正してから再度アップロードしてください。'
        }
    },
    
    /**
     * エラー分類
     */
    classifyError: function(error) {
        const message = error.message || error.toString();
        
        if (message.includes('ファイルサイズ')) {
            return this.ERROR_TYPES.FILE_SIZE;
        } else if (message.includes('ファイル形式') || message.includes('Excel') || message.includes('CSV')) {
            return this.ERROR_TYPES.FILE_FORMAT;
        } else if (message.includes('検証') || message.includes('必須列')) {
            return this.ERROR_TYPES.DATA_VALIDATION;
        } else if (message.includes('ネットワーク') || message.includes('fetch')) {
            return this.ERROR_TYPES.NETWORK;
        } else if (message.includes('処理')) {
            return this.ERROR_TYPES.PROCESSING;
        } else {
            return this.ERROR_TYPES.UNKNOWN;
        }
    },
    
    /**
     * ユーザーフレンドリーなエラーメッセージ生成
     */
    generateUserMessage: function(error) {
        const errorType = this.classifyError(error);
        const originalMessage = error.message || error.toString();
        
        // 既知のエラーパターンチェック
        for (const [pattern, errorInfo] of Object.entries(this.ERROR_MESSAGES)) {
            if (originalMessage.includes(pattern) || errorType.includes(pattern)) {
                return {
                    type: errorType,
                    title: errorInfo.title,
                    message: errorInfo.message,
                    solution: errorInfo.solution,
                    action: errorInfo.action,
                    originalError: originalMessage
                };
            }
        }
        
        // 未知のエラーの場合
        return {
            type: this.ERROR_TYPES.UNKNOWN,
            title: '予期しないエラー',
            message: 'システムで予期しないエラーが発生しました。',
            solution: 'しばらく時間をおいてから再試行してください。',
            action: '問題が続く場合は、ブラウザを再読み込みしてください。',
            originalError: originalMessage
        };
    },
    
    /**
     * エラーダイアログ表示
     */
    showErrorDialog: function(error) {
        const errorInfo = this.generateUserMessage(error);
        
        const dialogContent = `
🚨 ${errorInfo.title}

${errorInfo.message}

💡 解決方法:
${errorInfo.solution}

🔧 対処法:
${errorInfo.action}

詳細エラー: ${errorInfo.originalError}
        `.trim();
        
        alert(dialogContent);
        
        // コンソールにも詳細を出力
        console.group(`🚨 エラー詳細: ${errorInfo.type}`);
        console.error('Original Error:', error);
        console.info('User Message:', errorInfo);
        console.groupEnd();
    },
    
    /**
     * エラーログ記録
     */
    logError: function(error, context = '') {
        const timestamp = new Date().toISOString();
        const errorInfo = this.generateUserMessage(error);
        
        const logEntry = {
            timestamp,
            context,
            type: errorInfo.type,
            message: errorInfo.originalError,
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // ローカルストレージに保存（最大50件）
        try {
            const logs = JSON.parse(localStorage.getItem('gantt_error_logs') || '[]');
            logs.unshift(logEntry);
            
            // 最大50件まで保持
            if (logs.length > 50) {
                logs.splice(50);
            }
            
            localStorage.setItem('gantt_error_logs', JSON.stringify(logs));
        } catch (e) {
            console.warn('エラーログの保存に失敗:', e);
        }
        
        console.error('Error logged:', logEntry);
    },
    
    /**
     * エラーログ取得
     */
    getErrorLogs: function() {
        try {
            return JSON.parse(localStorage.getItem('gantt_error_logs') || '[]');
        } catch (e) {
            console.warn('エラーログの読み込みに失敗:', e);
            return [];
        }
    },
    
    /**
     * エラーログクリア
     */
    clearErrorLogs: function() {
        try {
            localStorage.removeItem('gantt_error_logs');
            console.log('エラーログをクリアしました');
        } catch (e) {
            console.warn('エラーログのクリアに失敗:', e);
        }
    },
    
    /**
     * ネットワークエラー検出
     */
    isNetworkError: function(error) {
        return !navigator.onLine || 
               error.message.includes('NetworkError') ||
               error.message.includes('fetch');
    },
    
    /**
     * 復旧提案
     */
    suggestRecovery: function(error) {
        const errorType = this.classifyError(error);
        
        switch (errorType) {
            case this.ERROR_TYPES.FILE_SIZE:
                return [
                    'ファイルを分割して複数回に分けてアップロード',
                    '不要な行やデータを削除してファイルサイズを削減',
                    'CSV形式での保存を試行'
                ];
                
            case this.ERROR_TYPES.FILE_FORMAT:
                return [
                    'Excelで「名前を付けて保存」→「Excel ワークブック (.xlsx)」',
                    'CSV形式で保存し直す',
                    'ファイル拡張子が正しいか確認'
                ];
                
            case this.ERROR_TYPES.DATA_VALIDATION:
                return [
                    '必須列（イベント名、開始日、終了日）が存在するか確認',
                    '日付形式が正しいか確認（YYYY-MM-DD推奨）',
                    '空行や不完全なデータを削除'
                ];
                
            case this.ERROR_TYPES.NETWORK:
                return [
                    'インターネット接続を確認',
                    'ブラウザを再読み込み',
                    'しばらく時間をおいてから再試行'
                ];
                
            default:
                return [
                    'ブラウザを再読み込み',
                    '別のブラウザで試行',
                    'キャッシュをクリアして再試行'
                ];
        }
    }
};

// グローバルに公開
window.ErrorHandler = ErrorHandler;

// グローバルエラーハンドラー設定
window.addEventListener('error', function(event) {
    ErrorHandler.logError(event.error, 'Global Error Handler');
});

window.addEventListener('unhandledrejection', function(event) {
    ErrorHandler.logError(event.reason, 'Unhandled Promise Rejection');
});
