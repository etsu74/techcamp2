/**
 * データ処理モジュール - CSV/Excel処理
 * MVP-2段階: Excel/CSV読み込み・変換機能実装
 */

const DataProcessor = {
    
    /**
     * ファイル読み込み（Excel/CSV）
     */
    loadFile: function(file, progressCallback) {
        // ファイルサイズ制限チェック（10MB）
        const maxFileSize = 10 * 1024 * 1024;
        if (file.size > maxFileSize) {
            return Promise.reject(new Error(`ファイルサイズが大きすぎます。${Math.round(maxFileSize / 1024 / 1024)}MB以下のファイルを選択してください。`));
        }
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onprogress = function(e) {
                if (e.lengthComputable && progressCallback) {
                    const percentLoaded = Math.round((e.loaded / e.total) * 50); // ファイル読み込みは全体の50%
                    progressCallback(percentLoaded, 'ファイル読み込み中...');
                }
            };
            
            reader.onload = function(e) {
                try {
                    if (progressCallback) {
                        progressCallback(50, 'データ解析中...');
                    }
                    
                    const data = new Uint8Array(e.target.result);
                    let workbook;
                    
                    if (file.name.toLowerCase().endsWith('.csv')) {
                        // CSV処理
                        const text = new TextDecoder().decode(data);
                        workbook = XLSX.read(text, { type: 'string' });
                    } else {
                        // Excel処理
                        workbook = XLSX.read(data, { type: 'array' });
                    }
                    
                    if (progressCallback) {
                        progressCallback(75, 'データ変換中...');
                    }
                    
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    if (progressCallback) {
                        progressCallback(100, '完了');
                    }
                    
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error('ファイル読み込みエラー: ' + error.message));
                }
            };
            
            reader.onerror = function() {
                reject(new Error('ファイル読み込みに失敗しました'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    },
    
    /**
     * データ検証（強化版）
     */
    validateData: function(rawData) {
        const errors = [];
        const warnings = [];
        const fixes = [];
        
        if (!rawData || rawData.length < 2) {
            errors.push('データが不足しています（ヘッダー行+データ行が必要）');
            return { isValid: false, errors, warnings, fixes };
        }
        
        const headers = rawData[0];
        console.log('検証対象ヘッダー:', headers);
        
        // 複数の列構造に対応
        let requiredColumns, optionalColumns, columnMapping;
        
        if (headers.includes('name') && headers.includes('start') && headers.includes('end')) {
            // 英語形式（修繕データ）
            requiredColumns = ['name', 'start', 'end'];
            optionalColumns = ['progress', 'dependencies', 'assignee'];
            columnMapping = {
                eventName: 'name',
                startDate: 'start', 
                endDate: 'end',
                status: 'progress',
                type: 'assignee'
            };
        } else if (headers.includes('start_date') && headers.includes('end_date')) {
            // 会議データ形式
            requiredColumns = ['name', 'start_date'];
            optionalColumns = ['end_date', 'organization_level', 'organization_type', 'frequency', 'priority'];
            columnMapping = {
                eventName: 'name',
                startDate: 'start_date',
                endDate: 'end_date',
                status: 'organization_level',
                type: 'organization_type'
            };
        } else {
            // 日本語形式（テストデータ）
            requiredColumns = ['イベント名', '開始日', '終了日'];
            optionalColumns = ['ステータス', '種類', '進捗率'];
            columnMapping = {
                eventName: 'イベント名',
                startDate: '開始日',
                endDate: '終了日', 
                status: 'ステータス',
                type: '種類'
            };
        }
        
        console.log('選択されたマッピング:', columnMapping);
        console.log('必須カラム:', requiredColumns);
        
        // 必須列チェック
        for (const col of requiredColumns) {
            if (!headers.includes(col)) {
                errors.push(`必須列「${col}」が見つかりません`);
            }
        }
        
        // オプション列の存在確認
        for (const col of optionalColumns) {
            if (!headers.includes(col)) {
                warnings.push(`推奨列「${col}」が見つかりません（自動で初期値を設定します）`);
            }
        }
        
        if (errors.length > 0) {
            return { isValid: false, errors, warnings, fixes };
        }
        
        let validRowCount = 0;
        
        // データ行の詳細検証
        for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];
            
            // 空行チェック
            if (this.isEmptyRow(row)) {
                warnings.push(`${i + 1}行目: 空行をスキップしました`);
                continue;
            }
            
            const eventName = row[headers.indexOf(columnMapping.eventName)];
            const startDate = row[headers.indexOf(columnMapping.startDate)];
            const endDate = row[headers.indexOf(columnMapping.endDate)];
            const status = row[headers.indexOf(columnMapping.status)];
            
            // イベント名検証
            if (!eventName || String(eventName).trim() === '') {
                errors.push(`${i + 1}行目: イベント名が空です`);
                continue;
            }
            
            // 日付検証と自動修正
            const dateValidation = this.validateAndFixDates(startDate, endDate, i + 1);
            errors.push(...dateValidation.errors);
            warnings.push(...dateValidation.warnings);
            fixes.push(...dateValidation.fixes);
            
            // ステータス検証と自動修正
            if (!status || !['予定', '進行中', '完了'].includes(String(status).trim())) {
                warnings.push(`${i + 1}行目: ステータス「${status}」が無効です（「予定」に設定します）`);
                fixes.push(`${i + 1}行目のステータスを「予定」に修正`);
            }
            
            validRowCount++;
        }
        
        // 全体的な統計情報
        if (validRowCount === 0) {
            errors.push('有効なデータ行が見つかりませんでした');
        } else {
            warnings.push(`有効なデータ: ${validRowCount}件`);
        }
        
        return { 
            isValid: errors.length === 0, 
            errors, 
            warnings, 
            fixes,
            validRowCount 
        };
    },
    
    /**
     * 空行判定
     */
    isEmptyRow: function(row) {
        if (!row || row.length === 0) return true;
        return row.every(cell => !cell || String(cell).trim() === '');
    },
    
    /**
     * 日付検証と自動修正
     */
    validateAndFixDates: function(startDate, endDate, rowNum) {
        const errors = [];
        const warnings = [];
        const fixes = [];
        
        // 開始日検証
        if (!startDate || !this.isValidDate(startDate)) {
            errors.push(`${rowNum}行目: 開始日「${startDate}」が無効です`);
        }
        
        // 終了日検証
        if (!endDate || !this.isValidDate(endDate)) {
            errors.push(`${rowNum}行目: 終了日「${endDate}」が無効です`);
        }
        
        // 開始日・終了日の論理チェック
        if (this.isValidDate(startDate) && this.isValidDate(endDate)) {
            const start = this.convertExcelDate(startDate);
            const end = this.convertExcelDate(endDate);
            
            if (start > end) {
                errors.push(`${rowNum}行目: 開始日が終了日より後になっています`);
            }
            
            // 異常に長い期間の警告
            const duration = (end - start) / (1000 * 60 * 60 * 24);
            if (duration > 365) {
                warnings.push(`${rowNum}行目: 期間が${Math.round(duration)}日と長期間です`);
            }
        }
        
        return { errors, warnings, fixes };
    },
    
    /**
     * 日付妥当性チェック
     */
    isValidDate: function(dateValue) {
        if (!dateValue) return false;
        
        // Excelの日付数値形式に対応
        if (typeof dateValue === 'number') {
            const date = XLSX.SSF.parse_date_code(dateValue);
            return date && date.y > 1900 && date.y < 2100;
        }
        
        // 文字列形式の日付
        if (typeof dateValue === 'string') {
            const date = new Date(dateValue);
            return !isNaN(date.getTime());
        }
        
        return false;
    },
    
    /**
     * Excel日付を標準日付形式に変換
     */
    convertExcelDate: function(dateValue) {
        if (typeof dateValue === 'number') {
            const date = XLSX.SSF.parse_date_code(dateValue);
            return new Date(date.y, date.m - 1, date.d);
        }
        
        if (typeof dateValue === 'string') {
            return new Date(dateValue);
        }
        
        return new Date(dateValue);
    },
    
    /**
     * 統合CSVテキストを解析（デモ用）
     */
    parseUnifiedCSV: function(csvText) {
        try {
            console.log('CSV解析開始...');
            
            // CSVテキストを行ごとに分割
            const lines = csvText.trim().split('\n');
            if (lines.length < 2) {
                throw new Error('CSVデータが不足しています（ヘッダー+最低1データ行が必要）');
            }
            
            // より堅牢なCSV解析（引用符とカンマを考慮）
            const rawData = [];
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const row = [];
                let currentField = '';
                let inQuotes = false;
                
                for (let j = 0; j < line.length; j++) {
                    const char = line[j];
                    
                    if (char === '"' && !inQuotes) {
                        inQuotes = true;
                    } else if (char === '"' && inQuotes) {
                        // 次の文字も引用符かチェック（エスケープされた引用符）
                        if (j + 1 < line.length && line[j + 1] === '"') {
                            currentField += '"';
                            j++; // 次の引用符をスキップ
                        } else {
                            inQuotes = false;
                        }
                    } else if (char === ',' && !inQuotes) {
                        row.push(currentField.trim());
                        currentField = '';
                    } else {
                        currentField += char;
                    }
                }
                
                // 最後のフィールドを追加
                row.push(currentField.trim());
                rawData.push(row);
            }
            
            console.log(`CSV解析完了: ${rawData.length}行, ヘッダー: ${rawData[0] ? rawData[0].length : 0}列`);
            
            if (rawData.length === 0 || rawData[0].length === 0) {
                throw new Error('CSVデータが空です');
            }
            
            // デバッグ：ヘッダー情報表示
            console.log('ヘッダー:', rawData[0]);
            console.log('最初のデータ行サンプル:', rawData[1] ? rawData[1] : 'データ行なし');
            
            // 既存のconvertToGanttFormat関数を使用
            const processedData = this.convertToGanttFormat(rawData);
            
            console.log(`データ変換完了: ${processedData.length}件`);
            
            if (processedData.length === 0) {
                console.warn('変換されたデータが0件です。CSVフォーマットを確認してください。');
            }
            
            return processedData;
            
        } catch (error) {
            console.error('CSV解析エラー:', error);
            console.error('CSVテキストサンプル（最初の200文字）:', csvText.substring(0, 200));
            throw error;
        }
    },

    /**
     * Frappe Gantt形式に変換
     */
    convertToGanttFormat: function(rawData) {
        if (!rawData || rawData.length < 2) {
            return [];
        }
        
        const headers = rawData[0];
        
        // 列構造の判定（統合フォーマット対応）
        let columnMapping;
        let dataType = 'construction'; // デフォルト
        let isUnifiedFormat = false;
        
        if (headers.includes('event_type')) {
            // 統合19列フォーマット（新規対応）
            isUnifiedFormat = true;
            columnMapping = {
                eventName: 'name',
                startDate: 'start',
                endDate: 'end',
                status: 'progress',
                type: 'assignee',
                eventType: 'event_type',
                organizationLevel: 'organization_level',
                organizationType: 'organization_type',
                decisionAuthority: 'decision_authority',
                reportTo: 'report_to',
                attendees: 'attendees',
                location: 'location',
                agenda: 'agenda',
                timelineColor: 'timeline_color',
                priority: 'priority',
                frequency: 'frequency',
                memo: 'memo'
            };
            console.log('統合フォーマット検出: 19列スキーマ対応');
        } else if (headers.includes('name') && headers.includes('start') && headers.includes('end')) {
            // 英語形式（修繕データ）
            columnMapping = {
                eventName: 'name',
                startDate: 'start',
                endDate: 'end', 
                status: 'progress',
                type: 'assignee'
            };
            dataType = 'construction';
        } else if (headers.includes('start_date') && headers.includes('end_date')) {
            // 会議データ形式
            columnMapping = {
                eventName: 'name',
                startDate: 'start_date',
                endDate: 'end_date',
                status: 'organization_level',
                type: 'organization_type',
                frequency: 'frequency',
                priority: 'priority'
            };
            dataType = 'meeting';
        } else {
            // 日本語形式（テストデータ）
            columnMapping = {
                eventName: 'イベント名',
                startDate: '開始日',
                endDate: '終了日',
                status: 'ステータス', 
                type: '種類'
            };
            dataType = 'construction';
        }
        
        console.log('検出されたデータ形式:', dataType, columnMapping);
        
        const eventNameIdx = headers.indexOf(columnMapping.eventName);
        const startDateIdx = headers.indexOf(columnMapping.startDate);
        const endDateIdx = headers.indexOf(columnMapping.endDate);
        const statusIdx = headers.indexOf(columnMapping.status);
        const typeIdx = headers.indexOf(columnMapping.type);
        const dependenciesIdx = headers.indexOf('dependencies');
        const frequencyIdx = headers.indexOf('frequency');
        const priorityIdx = headers.indexOf('priority');
        
        console.log('列インデックス確認:', {
            eventName: eventNameIdx,
            dependencies: dependenciesIdx,
            headers: headers
        });
        
        // 統合フォーマット専用インデックス
        const eventTypeIdx = isUnifiedFormat ? headers.indexOf(columnMapping.eventType) : -1;
        const organizationLevelIdx = isUnifiedFormat ? headers.indexOf(columnMapping.organizationLevel) : -1;
        const organizationTypeIdx = isUnifiedFormat ? headers.indexOf(columnMapping.organizationType) : -1;
        const memoIdx = isUnifiedFormat ? headers.indexOf(columnMapping.memo) : -1;
        
        // 必須カラムの存在チェック
        if (eventNameIdx === -1 || startDateIdx === -1) {
            throw new Error(`必須カラムが見つかりません: ${columnMapping.eventName}, ${columnMapping.startDate}`);
        }
        
        const ganttData = [];
        
        for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];
            
            // イベント名が空の場合のみスキップ（列数不足は許容）
            if (!row[eventNameIdx] || String(row[eventNameIdx]).trim() === '') {
                console.log(`行${i}スキップ: イベント名なし, eventName="${row[eventNameIdx]}", row=`, row);
                continue; 
            }
            
            // 列数不足の場合は空文字で補完
            if (row.length < headers.length) {
                console.log(`行${i}: 列数不足(${row.length}/${headers.length})を空文字で補完`);
                // dependencies列の元データを保持
                const originalDependencies = dependenciesIdx >= 0 && dependenciesIdx < row.length ? row[dependenciesIdx] : null;
                while (row.length < headers.length) {
                    row.push('');
                }
                // dependenciesが消えた場合は復元
                if (originalDependencies && dependenciesIdx >= 0) {
                    row[dependenciesIdx] = originalDependencies;
                    console.log(`行${i}: dependencies復元 "${originalDependencies}"`);
                }
            }
            
            const eventName = row[eventNameIdx];
            const startDate = this.convertExcelDate(row[startDateIdx]);
            const endDate = this.convertExcelDate(row[endDateIdx]);
            const rawStatus = row[statusIdx];
            const dependencies = dependenciesIdx >= 0 ? row[dependenciesIdx] : null;
            
            // 統合フォーマットの場合：event_type列でデータ種別を判定
            let currentEventType = dataType;
            if (isUnifiedFormat && eventTypeIdx >= 0) {
                currentEventType = row[eventTypeIdx] || 'construction';
            }
            
            // ステータスと進捗率の処理
            let status, progress, barClass;
            
            if (columnMapping.status === 'progress' || isUnifiedFormat) {
                // 統合フォーマットまたは英語形式：progressは数値（0-100）
                progress = parseInt(rawStatus) || 0;
                if (progress >= 100) {
                    status = '完了';
                    barClass = 'completed';
                } else if (progress > 0) {
                    status = '進行中';
                    barClass = 'in-progress';
                } else {
                    status = '予定';
                    barClass = 'planned';
                }
            } else {
                // 日本語形式：ステータスは文字列
                status = rawStatus ? String(rawStatus).trim() : '予定';
                if (status === '完了') {
                    barClass = 'completed';
                    progress = 100;
                } else if (status === '進行中') {
                    barClass = 'in-progress';
                    progress = 50;
                } else {
                    barClass = 'planned';
                    progress = 0;
                }
            }
            
            // デバッグ用ログ
            console.log(`行${i}: イベント=${eventName}, 種別=${currentEventType}, ステータス="${status}", 進捗=${progress}%, 依存関係=${dependencies || 'なし'}`);
            
            const taskData = {
                id: `task-${i}`,
                name: eventName,
                start: this.formatDate(startDate),
                end: this.formatDate(endDate),
                progress: progress,
                custom_class: barClass,
                type: currentEventType // 動的に決定されたイベントタイプを使用
            };
            
            // 統合フォーマットの場合：追加メタデータを保持
            if (isUnifiedFormat) {
                if (organizationLevelIdx >= 0) taskData.organization_level = row[organizationLevelIdx];
                if (organizationTypeIdx >= 0) taskData.organization_type = row[organizationTypeIdx];
                if (memoIdx >= 0) taskData.memo = row[memoIdx];
                if (frequencyIdx >= 0) taskData.frequency = row[frequencyIdx];
                if (priorityIdx >= 0) taskData.priority = row[priorityIdx];
            }
            
            // 従来の会議データの場合の追加フィールド
            if (currentEventType === 'meeting' && !isUnifiedFormat) {
                if (frequencyIdx >= 0) taskData.frequency = row[frequencyIdx];
                if (priorityIdx >= 0) taskData.priority = row[priorityIdx];
                taskData.organization_level = statusIdx >= 0 ? row[statusIdx] : null;
                taskData.organization_type = typeIdx >= 0 ? row[typeIdx] : null;
                
                // 会議データはend_dateが無い場合startと同じに設定
                if (!taskData.end || taskData.end === taskData.start) {
                    taskData.end = taskData.start;
                }
            }
            
            // dependency情報があれば追加
            if (dependencies && String(dependencies).trim() !== '') {
                taskData.dependencies = String(dependencies).trim();
            }
            
            ganttData.push(taskData);
        }
        
        // dependency IDの変換処理
        return this.resolveDependencies(ganttData, rawData, headers);
    },
    
    /**
     * dependency IDの変換処理
     */
    resolveDependencies: function(ganttData, rawData, headers) {
        // IDマッピングを作成（例：T1 -> task-1）
        const idMapping = {};
        const idIdx = headers.indexOf('id');
        const eventTypeIdx = headers.indexOf('event_type');
        const dependenciesIdx = headers.indexOf('dependencies');
        const eventNameIdx = headers.indexOf('name');
        const isUnifiedFormat = headers.includes('event_type');
        
        console.log('依存関係解決開始:', { idIdx, eventTypeIdx, ganttDataCount: ganttData.length, isUnifiedFormat });
        
        if (idIdx >= 0) {
            for (let i = 1; i < rawData.length; i++) {
                const originalId = rawData[i][idIdx];
                if (originalId) {
                    idMapping[originalId] = `task-${i}`;
                }
            }
            
            console.log('IDマッピング:', idMapping);
            
            // 1. 統合フォーマットの場合：会議→工事依存関係転送
            if (isUnifiedFormat && eventTypeIdx >= 0 && dependenciesIdx >= 0) {
                console.log('統合フォーマット: 会議→工事依存関係転送処理');
                const meetingDependencies = [];
                
                // 会議イベントの依存関係を収集
                for (let i = 1; i < rawData.length; i++) {
                    const row = rawData[i];
                    if (!row[eventNameIdx] || String(row[eventNameIdx]).trim() === '') continue;
                    
                    const eventType = row[eventTypeIdx] || 'construction';
                    const dependencies = row[dependenciesIdx];
                    const eventId = row[idIdx];
                    
                    if (eventType === 'meeting' && dependencies && String(dependencies).trim() !== '') {
                        const depIds = String(dependencies).split(',').map(d => d.trim());
                        depIds.forEach(targetId => {
                            meetingDependencies.push({
                                from: eventId,
                                to: targetId,
                                type: 'meeting_to_construction'
                            });
                        });
                        console.log(`会議依存関係検出: ${eventId} → ${dependencies}`);
                    }
                }
                
                // 会議依存関係を記録（後の依存関係変換で処理される）
                meetingDependencies.forEach(dep => {
                    console.log(`会議依存関係検出: ${dep.from} → ${dep.to} (後で変換処理)`);
                });
            }
            
            // 2. dependency IDを変換
            let dependencyCount = 0;
            ganttData.forEach((task, index) => {
                if (task.dependencies) {
                    const originalDeps = task.dependencies;
                    const depIds = task.dependencies.split(',');
                    const resolvedDeps = [];
                    
                    depIds.forEach(depId => {
                        const cleanId = depId.trim();
                        let resolvedId;
                        
                        // 会議IDの場合は集約グループIDに直接変換（IDマッピングより優先）
                        if (cleanId.includes('GM') || cleanId.includes('BM') || cleanId.includes('RC')) {
                            if (cleanId.includes('GM')) {
                                resolvedId = 'meeting_group_general_meeting';
                            } else if (cleanId.includes('BM')) {
                                resolvedId = 'meeting_group_board_meeting';
                            } else if (cleanId.includes('RC')) {
                                resolvedId = 'meeting_group_repair_committee';
                            }
                            console.log(`会議ID直接変換: ${cleanId} → ${resolvedId}`);
                        } else {
                            // 通常のIDマッピング変換
                            resolvedId = idMapping[cleanId];
                        }
                        
                        if (resolvedId) {
                            resolvedDeps.push(resolvedId);
                        }
                    });
                    
                    if (resolvedDeps.length > 0) {
                        task.dependencies = resolvedDeps.join(',');
                        dependencyCount++;
                        console.log(`依存関係変換: ${task.name} - ${originalDeps} → ${task.dependencies}`);
                    } else {
                        console.warn(`依存関係解決失敗: ${task.name} - ${originalDeps}`);
                        delete task.dependencies; // 解決できない場合は削除
                    }
                }
            });
            
            console.log(`依存関係処理完了: ${dependencyCount}件の依存関係を設定`);
        } else {
            console.warn('id列が見つかりません - 依存関係は無効化されます');
        }
        
        return ganttData;
    },
    
    /**
     * ステータスから進捗率を取得
     */
    getProgressFromStatus: function(status) {
        switch (status) {
            case '完了': return 100;
            case '進行中': return 50;
            default: return 0;
        }
    },
    
    /**
     * 日付をFrappe Gantt形式（YYYY-MM-DD）にフォーマット
     */
    formatDate: function(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    },
    
    /**
     * Excelファイル出力
     */
    exportToExcel: function(ganttData) {
        console.log('Excel出力開始: 統合19列フォーマット');
        
        // 統合19列フォーマットでデータを出力
        const exportData = ganttData.map(item => ({
            'id': item.id || '',
            'name': item.name || '',
            'start': item.start || '',
            'end': item.end || '',
            'progress': item.progress || 0,
            'dependencies': item.dependencies || '',
            'assignee': item.assignee || '',
            'event_type': item.type || item.event_type || 'construction',
            'organization_level': item.organization_level || '',
            'organization_type': item.organization_type || '',
            'decision_authority': item.decision_authority || '',
            'report_to': item.report_to || '',
            'attendees': item.attendees || '',
            'location': item.location || '',
            'agenda': item.agenda || '',
            'timeline_color': item.timeline_color || '',
            'priority': item.priority || '',
            'frequency': item.frequency || '',
            'memo': item.memo || ''
        }));
        
        console.log(`出力データ準備完了: ${exportData.length}件`);
        console.log('出力データサンプル:', exportData[0]);
        
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '修繕計画');
        
        const filename = `修繕計画_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, filename);
        
        console.log(`Excel出力完了: ${filename}`);
    },
    
    /**
     * 進捗率からステータスを取得
     */
    getStatusFromProgress: function(progress) {
        if (progress >= 100) return '完了';
        if (progress > 0) return '進行中';
        return '予定';
    }
    
};

// グローバルに公開
window.DataProcessor = DataProcessor;