// マンション修繕計画ガントチャート - メインスクリプト（ローカル版）

// グローバル変数
let projectData = [];
let ganttChart = null;
let viewMode = 'Month';
let currentEventId = null;

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('マンション修繕計画ガントチャート - 初期化開始');
    
    // 開発環境判定用デバッグフラグ
    if (typeof DEMO_CSV_DATA !== 'undefined') {
        console.log('ローカル版モード: インラインCSVデータ検出');
        // 自動的にサンプルデータをロード
        loadDemoData();
    }
    
    initializeApp();
    setupEventListeners();
    console.log('初期化完了');
});

// アプリケーション初期化
function initializeApp() {
    console.log('アプリケーション初期化中...');
    
    // 初期ステータス
    updateStatus('準備完了 - ファイルをアップロードしてください');
    updateDataCount();
    
    // 表示モード初期値設定
    setViewMode('Month');
}

// イベントリスナー設定
function setupEventListeners() {
    // ファイルアップロード関連
    const fileInput = document.getElementById('file-input');
    const dropArea = document.getElementById('drop-area');
    
    fileInput.addEventListener('change', handleFileSelect);
    
    // ドラッグ&ドロップ
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('drop', handleDrop);
    dropArea.addEventListener('click', () => fileInput.click());
    
    // 表示モード切替ボタン
    document.getElementById('btn-day').addEventListener('click', () => setViewMode('Day'));
    document.getElementById('btn-week').addEventListener('click', () => setViewMode('Week'));
    document.getElementById('btn-month').addEventListener('click', () => setViewMode('Month'));
    document.getElementById('btn-year').addEventListener('click', () => setViewMode('Year'));
    
    // エクスポートボタン
    document.getElementById('btn-export-excel').addEventListener('click', exportToExcel);
    
    // サンプル読み込みボタン
    document.getElementById('btn-load-demo').addEventListener('click', loadDemoData);
    
    // 編集ボタン（現在は無効化）
    document.getElementById('btn-add-event').addEventListener('click', () => {
        alert('この機能は今後のバージョンで実装予定です');
    });
    
    document.getElementById('btn-edit-meeting').addEventListener('click', () => {
        alert('この機能は今後のバージョンで実装予定です');
    });
    
    console.log('イベントリスナー設定完了');
}

// ファイル選択処理
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processFile(file);
    }
}

// ドラッグオーバー処理
function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    event.currentTarget.classList.add('dragover');
}

// ドロップ処理
function handleDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

// ファイル処理
function processFile(file) {
    console.log('ファイル処理開始:', file.name);
    updateStatus('ファイル処理中...');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let data;
            if (file.name.endsWith('.csv')) {
                data = DataProcessor.parseUnifiedCSV(e.target.result);
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                data = DataProcessor.parseExcel(e.target.result);
            } else {
                throw new Error('サポートされていないファイル形式です');
            }
            
            if (data && data.length > 0) {
                projectData = data;
                updateEventList();
                renderGanttChart();
                updateDataCount();
                updateStatus('データ読み込み完了');
                console.log(`ファイル処理完了: ${data.length}件`);
            } else {
                throw new Error('有効なデータが見つかりませんでした');
            }
        } catch (error) {
            console.error('ファイル処理エラー:', error);
            updateStatus('ファイル処理に失敗しました');
            alert('ファイルの読み込みに失敗しました: ' + error.message);
        }
    };
    
    if (file.name.endsWith('.csv')) {
        reader.readAsText(file, 'UTF-8');
    } else {
        reader.readAsArrayBuffer(file);
    }
}

// 統合データ管理
function updateEventList() {
    // データ分離：会議イベントと工事イベント（統合フォーマット対応）
    const meetingEvents = projectData.filter(item => 
        item.event_type === 'meeting' ||
        item.organization_level || 
        item.organization_type ||
        GanttManager.isMeetingEvent(item)
    );
    const workEvents = projectData.filter(item => 
        item.event_type === 'construction' ||
        (!item.event_type && !item.organization_level && !item.organization_type && !GanttManager.isMeetingEvent(item))
    );
    
    // 統合フォーマット対応: 個別会議データを強制集約処理
    let processedMeetingEvents = meetingEvents;
    if (meetingEvents.length > 0 && meetingEvents.some(item => item.event_type === 'meeting')) {
        console.log('統合フォーマット検出: 個別会議データを集約処理に送信');
        processedMeetingEvents = GanttManager.aggregateMeetingsByType(meetingEvents);
        console.log(`会議データ集約結果: ${meetingEvents.length}件 → ${processedMeetingEvents.length}件`);
        
        // グローバル変数として設定（依存関係検証で使用）
        window.processedMeetingEvents = processedMeetingEvents;
    }
    
    console.log('データ分離結果:', {
        会議イベント: meetingEvents.length,
        工事イベント: workEvents.length,
        総データ: projectData.length
    });
    
    // 会議イベント構造化（集約済みデータを使用）
    let structuredMeetings = { level1: [], level2: [], level3: [] };
    if (processedMeetingEvents.length > 0) {
        structuredMeetings = GanttManager.structureMeetingEvents(processedMeetingEvents);
    }
    
    // 左パネルの階層表示を更新
    const eventList = document.getElementById('event-list');
    eventList.innerHTML = '';
    
    // 会議階層の表示
    if (structuredMeetings.level1) {
        [structuredMeetings.level1, structuredMeetings.level2, structuredMeetings.level3].forEach((levelEvents, index) => {
            if (levelEvents && levelEvents.length > 0) {
                const levelGroup = document.createElement('div');
                levelGroup.className = `meeting-level level-${index + 1}`;
                
                const levelTitle = document.createElement('div');
                levelTitle.className = 'level-title';
                const levelNames = ['総会', '理事会', '修繕委員会'];
                levelTitle.textContent = `${levelNames[index]} (${levelEvents.length}件)`;
                levelGroup.appendChild(levelTitle);
                
                levelEvents.forEach(event => {
                    const eventItem = document.createElement('div');
                    eventItem.className = 'event-item meeting-item';
                    eventItem.textContent = event.name;
                    eventItem.dataset.id = event.id;
                    eventItem.dataset.type = 'meeting';
                    eventItem.addEventListener('click', () => highlightEvent(event.id));
                    levelGroup.appendChild(eventItem);
                });
                
                eventList.appendChild(levelGroup);
            }
        });
    }
    
    // 工事イベントの表示
    const constructionGroup = document.createElement('div');
    constructionGroup.className = 'construction-group';
    
    const constructionTitle = document.createElement('div');
    constructionTitle.className = 'level-title';
    constructionTitle.textContent = `工事イベント (${workEvents.length}件)`;
    constructionGroup.appendChild(constructionTitle);
    
    workEvents.forEach(event => {
        const eventItem = document.createElement('div');
        eventItem.className = 'event-item construction-item';
        eventItem.textContent = event.name;
        eventItem.dataset.id = event.id;
        eventItem.dataset.type = 'construction';
        eventItem.addEventListener('click', () => highlightEvent(event.id));
        constructionGroup.appendChild(eventItem);
    });
    
    eventList.appendChild(constructionGroup);
    console.log('左パネル階層表示更新完了');
}

// イベントハイライト機能
function highlightEvent(eventId) {
    // 既存のハイライトを削除
    document.querySelectorAll('.event-item.highlighted').forEach(item => {
        item.classList.remove('highlighted');
    });
    
    // 新しいハイライトを追加
    const targetItem = document.querySelector(`.event-item[data-id="${eventId}"]`);
    if (targetItem) {
        targetItem.classList.add('highlighted');
        
        // ガントチャート内の対応する要素もハイライト
        const ganttBars = document.querySelectorAll(`.bar-wrapper[data-id="${eventId}"]`);
        ganttBars.forEach(bar => {
            bar.style.boxShadow = '0 0 10px #ff6b6b';
            setTimeout(() => {
                bar.style.boxShadow = '';
            }, 2000);
        });
    }
}

// ガントチャート描画
function renderGanttChart() {
    console.log('=== ガントチャート描画開始 ===');
    
    if (!projectData || projectData.length === 0) {
        console.log('データが空のため、ガントチャート描画をスキップ');
        return;
    }
    
    console.log(`プロジェクトデータ: ${projectData.length}件`);
    
    try {
        // 会議データ集約
        console.log('統合フォーマット検出: 個別会議データを集約処理に送信');
        // データ分離：会議イベントと工事イベント（統合フォーマット対応）
        const meetingEvents = projectData.filter(item => 
            item.event_type === 'meeting' ||
            item.organization_level || 
            item.organization_type ||
            GanttManager.isMeetingEvent(item)
        );
        const workEvents = projectData.filter(item => 
            item.event_type === 'construction' ||
            (!item.event_type && !item.organization_level && !item.organization_type && !GanttManager.isMeetingEvent(item))
        );
        
        // 統合フォーマット対応: 個別会議データを強制集約処理
        let processedMeetingEvents = meetingEvents;
        if (meetingEvents.length > 0 && meetingEvents.some(item => item.event_type === 'meeting')) {
            console.log('統合フォーマット検出: 個別会議データを集約処理に送信');
            processedMeetingEvents = GanttManager.aggregateMeetingsByType(meetingEvents);
            console.log(`会議データ集約結果: ${meetingEvents.length}件 → ${processedMeetingEvents.length}件`);
        }
        
        console.log(`会議イベント: ${meetingEvents.length}件`);
        console.log(`工事イベント: ${workEvents.length}件`);
        
        // 会議イベント構造化（集約済みデータを使用）
        let structuredMeetings = { level1: [], level2: [], level3: [] };
        if (processedMeetingEvents.length > 0) {
            structuredMeetings = GanttManager.structureMeetingEvents(processedMeetingEvents);
        }
        
        // 統合データセット作成（工事 + 会議グループ）
        const unifiedData = [...workEvents, ...processedMeetingEvents];
        console.log(`統合データ: ${unifiedData.length}件`);
        
        // Frappe Gantt用のデータ変換
        const ganttTasks = unifiedData.map(event => {
            return {
                id: event.id,
                name: event.name,
                start: event.start,
                end: event.end,
                progress: event.progress,
                dependencies: event.dependencies || ''
            };
        });
        
        console.log(`ganttTasks created: ${ganttTasks.length}`);
        
        console.log('Ganttデータ（dependency付き）:', ganttTasks);
        
        // データフィルタリング（有効なタスクのみ）
        const validTasks = ganttTasks.filter(task => {
            return task.start && task.end && task.name;
        });
        
        console.log(`フィルター後のganttTasks: ${validTasks.length} 件`);
        
        console.log('統合ガントチャート初期化: 自主実装ポップアップ専用モード');
        
        // ガントチャートコンテナを取得
        const container = document.getElementById('gantt-container');
        container.innerHTML = ''; // 既存のチャートをクリア
        
        // Frappe Ganttインスタンス作成
        ganttChart = new Gantt('#gantt-container', validTasks, {
            header_height: 50,
            column_width: 30,
            step: 24,
            view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month', 'Year'],
            bar_height: 20,
            bar_corner_radius: 3,
            arrow_curve: 5,
            padding: 18,
            view_mode: viewMode,
            date_format: 'YYYY-MM-DD',
            language: 'ja',
            custom_popup_html: function(task) {
                // カスタムポップアップを無効化（自作ポップアップを使用）
                return null;
            },
            on_click: function(task) {
                // 工事イベントクリック処理
                showEventPopup(task.id);
            },
            on_date_change: function(task, start, end) {
                console.log(`日付変更: ${task.name} - ${start} to ${end}`);
            },
            on_progress_change: function(task, progress) {
                console.log(`進捗変更: ${task.name} - ${progress}%`);
            },
            on_view_change: function(mode) {
                console.log(`表示モード変更: ${mode}`);
                viewMode = mode;
            }
        });
        
        console.log('ガントチャート描画完了');
        
        // Phase-1A-3: 追加機能の適用
        setTimeout(() => {
            // 階層スタイルの適用
            applyHierarchyStyles(structuredMeetings, workEvents);
            
            // 会議イベントダイヤモンド描画
            GanttManager.renderMeetingDiamonds(structuredMeetings, projectData);
            
            // 工事イベントクリック処理追加
            console.log('工事イベントカスタムクリック処理追加開始');
            GanttManager.addConstructionEventClickHandlers();
            
            // Phase-1A-3: 依存関係矢印描画
            GanttManager.initializeDependencyArrows();
            GanttManager.renderDependencyArrows();
            
        }, 100); // DOM更新後に実行
        
    } catch (error) {
        console.error('ガントチャート描画エラー:', error);
        updateStatus('ガントチャート描画に失敗しました');
    }
}

// 階層スタイル適用
function applyHierarchyStyles(structuredMeetings, constructionEvents) {
    console.log('階層スタイル適用開始');
    
    // 会議グループのスタイル適用
    structuredMeetings.forEach(levelData => {
        levelData.events.forEach(meeting => {
            const barElements = document.querySelectorAll(`.bar-wrapper[data-id="${meeting.id}"]`);
            barElements.forEach(bar => {
                bar.classList.add('meeting');
                if (levelData.level === 3) {
                    bar.classList.add('level-3'); // 修繕委員会は特別なスタイル
                }
                console.log(`クラス適用: ${meeting.id} -> meeting${levelData.level === 3 ? ', level-3' : ''}`);
            });
        });
    });
    
    // 工事イベントのスタイル適用
    constructionEvents.forEach(event => {
        const barElements = document.querySelectorAll(`.bar-wrapper[data-id="${event.id}"]`);
        barElements.forEach(bar => {
            // プログレス状態に応じたクラス追加
            if (event.progress === 0) {
                bar.classList.add('planned');
                console.log(`クラス適用: ${event.id} -> planned`);
            } else if (event.progress === 100) {
                bar.classList.add('completed');
                console.log(`クラス適用: ${event.id} -> completed`);
            } else {
                bar.classList.add('in-progress');
                console.log(`クラス適用: ${event.id} -> in-progress`);
            }
        });
    });
    
    console.log('階層スタイル適用完了');
}

// 表示モード設定
function setViewMode(mode) {
    viewMode = mode;
    
    // ボタンのアクティブ状態更新
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`btn-${mode.toLowerCase()}`).classList.add('active');
    
    // ガントチャートが存在する場合は表示モードを変更
    if (ganttChart) {
        ganttChart.change_view_mode(mode);
        
        // モード変更後に再描画が必要な要素を更新
        setTimeout(() => {
            GanttManager.renderMeetingDiamonds();
            GanttManager.renderDependencyArrows();
        }, 100);
    }
    
    console.log(`表示モード変更: ${mode}`);
}

// ステータス更新
function updateStatus(message) {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// データ件数更新
function updateDataCount() {
    const countElement = document.getElementById('data-count');
    if (countElement && projectData) {
        const constructionCount = projectData.filter(d => d.event_type === 'construction').length;
        const meetingCount = projectData.filter(d => d.event_type === 'meeting').length;
        countElement.textContent = `工事: ${constructionCount}件 | 会議: ${meetingCount}件`;
    } else if (countElement) {
        countElement.textContent = '工事: 0件 | 会議: 0件';
    }
}

// Excel出力
function exportToExcel() {
    if (!projectData || projectData.length === 0) {
        alert('出力するデータがありません');
        return;
    }
    
    try {
        // ワークブック作成
        const wb = XLSX.utils.book_new();
        
        // 統合フォーマット用のデータ準備
        const exportData = projectData.map(item => ({
            id: item.id,
            name: item.name,
            start: item.start,
            end: item.end,
            progress: item.progress,
            dependencies: item.dependencies || '',
            assignee: item.assignee || '',
            event_type: item.event_type,
            organization_level: item.organization_level || '',
            organization_type: item.organization_type || '',
            decision_authority: item.decision_authority || '',
            report_to: item.report_to || '',
            attendees: item.attendees || '',
            location: item.location || '',
            agenda: item.agenda || '',
            timeline_color: item.timeline_color || '',
            priority: item.priority || '',
            frequency: item.frequency || '',
            memo: item.memo || ''
        }));
        
        // ワークシート作成
        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // シートをワークブックに追加
        XLSX.utils.book_append_sheet(wb, ws, '修繕計画データ');
        
        // ファイル名生成（現在の日時を含む）
        const now = new Date();
        const filename = `修繕計画_${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}.xlsx`;
        
        // ファイル出力
        XLSX.writeFile(wb, filename);
        
        updateStatus('Excelファイルを出力しました');
        console.log(`Excel出力完了: ${filename}`);
        
    } catch (error) {
        console.error('Excel出力エラー:', error);
        alert('Excel出力に失敗しました: ' + error.message);
        updateStatus('Excel出力に失敗しました');
    }
}

// デモデータ読み込み（ローカル版）
function loadDemoData() {
    try {
        updateStatus('デモデータ読み込み中...');
        
        // インラインCSVデータを使用
        const csvText = DEMO_CSV_DATA;
        console.log('デモCSVファイル読み込み完了');
        
        // CSVデータを処理
        const processedData = DataProcessor.parseUnifiedCSV(csvText);
        if (processedData && processedData.length > 0) {
            projectData = processedData;
            updateEventList();
            renderGanttChart();
            updateDataCount();
            updateStatus('デモデータ読み込み完了');
            console.log(`デモデータ読み込み完了: ${processedData.length}件`);
        } else {
            throw new Error('CSVデータの処理に失敗しました');
        }
    } catch (error) {
        console.error('デモデータ読み込みエラー:', error);
        updateStatus('デモデータの読み込みに失敗しました');
    }
}

// ポップアップ表示
function showEventPopup(eventId) {
    const event = projectData.find(e => e.id === eventId);
    if (!event) return;
    
    currentEventId = eventId;
    
    const popup = document.getElementById('event-popup');
    const title = document.getElementById('popup-title');
    const details = document.getElementById('popup-details');
    const memoInput = document.getElementById('memo-input');
    
    // タイトル設定
    title.textContent = event.name;
    
    // 詳細情報生成
    let detailsHTML = '';
    
    if (event.event_type === 'construction') {
        // 工事イベントの詳細
        detailsHTML = `
            <p><strong>種別:</strong> 工事イベント</p>
            <p><strong>開始日:</strong> ${event.start}</p>
            <p><strong>終了日:</strong> ${event.end}</p>
            <p><strong>進捗:</strong> ${event.progress}%</p>
            <p><strong>担当者:</strong> ${event.assignee || '未設定'}</p>
            <p><strong>依存関係:</strong> ${event.dependencies || 'なし'}</p>
        `;
    } else {
        // 会議イベントの詳細
        detailsHTML = `
            <p><strong>種別:</strong> 会議イベント</p>
            <p><strong>開催日:</strong> ${event.start}</p>
            <p><strong>組織レベル:</strong> ${event.organization_level}</p>
            <p><strong>組織種別:</strong> ${event.organization_type}</p>
            <p><strong>参加者:</strong> ${event.attendees || '未設定'}</p>
            <p><strong>場所:</strong> ${event.location || '未設定'}</p>
            <p><strong>議題:</strong> ${event.agenda || '未設定'}</p>
        `;
    }
    
    details.innerHTML = detailsHTML;
    
    // メモ入力欄に現在の値を設定
    memoInput.value = event.memo || '';
    
    // ポップアップ表示
    popup.style.display = 'flex';
}

// ポップアップ閉じる
function closePopup() {
    document.getElementById('event-popup').style.display = 'none';
    currentEventId = null;
}

// メモ保存
document.getElementById('memo-save').addEventListener('click', function() {
    if (currentEventId) {
        const memoText = document.getElementById('memo-input').value;
        const event = projectData.find(e => e.id === currentEventId);
        if (event) {
            event.memo = memoText;
            updateStatus('メモを保存しました');
            console.log(`メモ保存: ${currentEventId} - ${memoText}`);
        }
    }
});

// ポップアップ外クリックで閉じる
document.getElementById('event-popup').addEventListener('click', function(e) {
    if (e.target === this) {
        closePopup();
    }
});

// スクロール同期機能
function setupScrollSync() {
    console.log('スクロール候補要素の検証:');
    
    // 複数の候補要素を順次検証
    const candidates = [
        '.gantt-container',
        '.right-panel',
        '#gantt-container',
        'div[data-gantt]'
    ];
    
    let rightScrollElement = null;
    
    candidates.forEach((selector, index) => {
        const element = document.querySelector(selector);
        if (element) {
            const scrollHeight = element.scrollHeight;
            const clientHeight = element.clientHeight;
            const isScrollable = scrollHeight > clientHeight;
            
            console.log(`候補${index+1}: ${element.tagName} ${element.className} スクロール高=${scrollHeight}, クライアント高=${clientHeight}, スクロール可能=${isScrollable}`);
            
            if (isScrollable && !rightScrollElement) {
                rightScrollElement = element;
            }
        }
    });
    
    // フォールバック: html要素を使用
    if (!rightScrollElement) {
        rightScrollElement = document.documentElement;
        console.log('候補5: HTML ', `スクロール高=${rightScrollElement.scrollHeight}, クライアント高=${rightScrollElement.clientHeight}, スクロール可能=${rightScrollElement.scrollHeight > rightScrollElement.clientHeight}`);
    }
    
    // body要素もチェック
    const bodyElement = document.body;
    console.log('候補6: BODY ', `スクロール高=${bodyElement.scrollHeight}, クライアント高=${bodyElement.clientHeight}, スクロール可能=${bodyElement.scrollHeight > bodyElement.clientHeight}`);
    
    const leftPanel = document.getElementById('event-list');
    
    console.log('スクロール同期：要素取得結果');
    console.log('左パネル:', leftPanel);
    console.log('右パネル:', rightScrollElement);
    console.log('左スクロール高:', leftPanel ? leftPanel.scrollTop : 'undefined');
    console.log('右スクロール高:', rightScrollElement ? rightScrollElement.scrollTop : 'undefined');
    
    if (leftPanel && rightScrollElement) {
        let isShiftPressed = false;
        
        // Shiftキー状態の監視
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Shift') {
                isShiftPressed = true;
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.key === 'Shift') {
                isShiftPressed = false;
            }
        });
        
        // 左パネルスクロール時の同期
        leftPanel.addEventListener('scroll', () => {
            if (isShiftPressed) {
                rightScrollElement.scrollTop = leftPanel.scrollTop;
            }
        });
        
        // 右パネルスクロール時の同期
        rightScrollElement.addEventListener('scroll', () => {
            if (isShiftPressed) {
                leftPanel.scrollTop = rightScrollElement.scrollTop;
            }
        });
        
        console.log('修正版スクロール同期初期化完了');
        console.log('使用法: 通常=独立スクロール, Shift押下=同期スクロール');
    }
}

// ページ読み込み完了後にスクロール同期を設定
window.addEventListener('load', () => {
    setTimeout(setupScrollSync, 1000); // DOM構築完了を待つ
});

// エラーハンドリング
window.addEventListener('error', function(e) {
    console.error('JavaScript エラー:', e.error);
    updateStatus('エラーが発生しました');
});

// デバッグ用
window.ganttApp = {
    data: () => projectData,
    chart: () => ganttChart,
    reload: () => renderGanttChart()
};

// グローバルに公開（gantt-manager.jsから呼び出すため）
window.renderGanttChart = renderGanttChart;