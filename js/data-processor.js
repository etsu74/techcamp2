/**
 * データ処理モジュール - 公開版（ローカルファイルアクセス機能削除版）
 * 大学提出版：デモデータのみを使用
 */

const DataProcessor = {
    
    /**
     * 統合フォーマットCSVファイルの解析（デモデータ専用）
     */
    parseUnifiedCSV: function(csvText) {
        try {
            const lines = csvText.trim().split('\n');
            if (lines.length < 2) {
                throw new Error('CSVデータが不完全です');
            }
            
            // ヘッダー行の解析
            const headers = this.parseCSVLine(lines[0]);
            const data = [];
            
            // データ行の解析
            for (let i = 1; i < lines.length; i++) {
                const values = this.parseCSVLine(lines[i]);
                if (values.length >= 6) { // 最小限の必要列をチェック
                    const row = {};
                    headers.forEach((header, index) => {
                        row[header] = values[index] || '';
                    });
                    data.push(row);
                }
            }
            
            console.log(`デモCSVデータ解析完了: ${data.length}件`);
            return data;
            
        } catch (error) {
            console.error('CSV解析エラー:', error);
            throw error;
        }
    },

    /**
     * CSV行の解析（引用符対応）
     */
    parseCSVLine: function(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // エスケープされた引用符
                    current += '"';
                    i++; // 次の引用符をスキップ
                } else {
                    // 引用符の開始または終了
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // カンマ区切り
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // 最後のフィールドを追加
        result.push(current.trim());
        
        return result.map(field => {
            // 前後の引用符を削除
            if (field.startsWith('"') && field.endsWith('"')) {
                return field.slice(1, -1);
            }
            return field;
        });
    },

    /**
     * データ検証（簡易版）
     */
    validateData: function(data) {
        const errors = [];
        const warnings = [];
        let validRowCount = 0;
        
        if (!data || data.length === 0) {
            errors.push('データが空です');
            return { isValid: false, errors, warnings, validRowCount };
        }
        
        // 基本的な検証
        data.forEach((row, index) => {
            if (row.id && row.name && (row.start || row.end)) {
                validRowCount++;
            } else {
                warnings.push(`行 ${index + 2}: 必須データが不足しています`);
            }
        });
        
        console.log(`データ検証完了: ${validRowCount}/${data.length}件が有効`);
        
        return {
            isValid: validRowCount > 0,
            errors,
            warnings,
            validRowCount
        };
    },

    /**
     * Frappe Gantt形式に変換
     */
    convertToGanttFormat: function(rawData) {
        if (!rawData || rawData.length === 0) {
            return [];
        }
        
        const ganttData = rawData.map(row => {
            // 基本フィールドの変換
            const ganttRow = {
                id: row.id || `item-${Math.random().toString(36).substr(2, 9)}`,
                name: row.name || '無名タスク',
                start: this.parseDate(row.start) || new Date().toISOString().split('T')[0],
                end: this.parseDate(row.end) || new Date().toISOString().split('T')[0],
                progress: parseInt(row.progress) || 0
            };
            
            // 依存関係の追加
            if (row.dependencies) {
                ganttRow.dependencies = Array.isArray(row.dependencies) 
                    ? row.dependencies 
                    : row.dependencies.split(',').map(dep => dep.trim()).filter(dep => dep);
            } else {
                ganttRow.dependencies = [];
            }
            
            // イベントタイプの判定と追加プロパティ
            if (row.event_type === 'meeting' || row.organization_level || row.organization_type) {
                ganttRow.type = 'meeting';
                ganttRow.organization_level = parseFloat(row.organization_level) || 3;
                ganttRow.organization_type = row.organization_type || 'meeting';
                ganttRow.decision_authority = row.decision_authority || '';
                ganttRow.attendees = row.attendees || '';
                ganttRow.location = row.location || '';
                ganttRow.agenda = row.agenda || '';
                ganttRow.frequency = row.frequency || '';
                ganttRow.report_to = row.report_to || '';
            } else {
                ganttRow.type = 'construction';
            }
            
            // その他のプロパティ
            ganttRow.assignee = row.assignee || '';
            ganttRow.priority = row.priority || '';
            ganttRow.memo = row.memo || '';
            ganttRow.timeline_color = row.timeline_color || '';
            
            return ganttRow;
        });
        
        console.log(`Gantt形式変換完了: ${ganttData.length}件`);
        return ganttData;
    },

    /**
     * 日付解析（様々な形式に対応）
     */
    parseDate: function(dateStr) {
        if (!dateStr) return null;
        
        // 既に正しい形式の場合
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return dateStr;
        }
        
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) {
                console.warn('無効な日付:', dateStr);
                return null;
            }
            
            // YYYY-MM-DD形式に変換
            return date.toISOString().split('T')[0];
        } catch (error) {
            console.warn('日付解析エラー:', dateStr, error);
            return null;
        }
    }
};

// グローバルに公開
window.DataProcessor = DataProcessor;