/**
 * マンション修繕計画ガントチャート - メイン制御
 * MVP段階: 基本表示・月表示のみ実装
 */

// グローバル変数
let ganttChart = null;
let currentViewMode = 'Month';
let projectData = [];

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('マンション修繕計画ガントチャート - 初期化開始');
    
    // UI要素の初期化
    initializeUI();
    
    // サンプルデータの読み込み（統合フォーマット対応のため一時無効化）
    // loadSampleData();
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // スクロール同期機能の初期化（ガントチャート描画後に移動）
    // setupScrollSynchronization();
    
    // デモデータの自動読み込み
    loadDemoData();
    
    console.log('初期化完了');
});

/**
 * UI要素の初期化
 */
function initializeUI() {
    // 表示モードボタンの初期化（MVP-3で全モード有効化）
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(btn => {
        btn.disabled = false;
        btn.removeAttribute('title');
    });
    
    // 編集ボタンの初期化（MVP段階では無効）
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(btn => {
        btn.disabled = true;
        btn.title = 'MVP段階では未実装';
    });
    
    // ステータス更新
    updateStatus('初期化中...');
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
    // デモデータ再読み込みボタン（大学提出版: ローカルファイルアクセス削除）
    const demoReloadBtn = document.getElementById('btn-demo-reload');
    if (demoReloadBtn) {
        demoReloadBtn.addEventListener('click', () => {
            loadDemoData();
        });
    }
    
    // 表示モード切替（MVP-3で全モード対応）
    const dayBtn = document.getElementById('btn-day');
    const weekBtn = document.getElementById('btn-week');
    const monthBtn = document.getElementById('btn-month');
    const yearBtn = document.getElementById('btn-year');
    
    if (dayBtn) dayBtn.addEventListener('click', () => switchViewMode('Day'));
    if (weekBtn) weekBtn.addEventListener('click', () => switchViewMode('Week'));
    if (monthBtn) monthBtn.addEventListener('click', () => switchViewMode('Month'));
    if (yearBtn) yearBtn.addEventListener('click', () => switchViewMode('Year'));
    
    console.log('イベントリスナー設定完了（大学提出版）');
}

/**
 * サンプルデータの読み込み
 */
function loadSampleData() {
    // MVP段階用のサンプルデータ（Frappe Gantt対応の日付形式）
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const monthAfter = new Date(today.getFullYear(), today.getMonth() + 2, 1);
    const threeMonthsLater = new Date(today.getFullYear(), today.getMonth() + 4, 15);
    
    // 段階1テスト用: 会議データを構造化形式で準備
    const meetingData = [
        {
            id: 'meeting-1',
            name: '理事会（今月）',
            start_date: new Date(today.getFullYear(), today.getMonth(), 15).toISOString().split('T')[0],
            organization_type: 'board_meeting',
            organization_level: 2
        },
        {
            id: 'meeting-2',
            name: '理事会（来月）',
            start_date: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15).toISOString().split('T')[0],
            organization_type: 'board_meeting', 
            organization_level: 2
        },
        {
            id: 'meeting-3',
            name: '総会（2ヶ月後）',
            start_date: new Date(monthAfter.getFullYear(), monthAfter.getMonth(), 20).toISOString().split('T')[0],
            organization_type: 'general_meeting',
            organization_level: 1
        }
    ];
    
    const constructionData = [
        {
            id: 'task-1',
            name: '外壁塗装工事',
            start: nextMonth.toISOString().split('T')[0],
            end: threeMonthsLater.toISOString().split('T')[0],
            progress: 0,
            type: 'construction'
        },
        {
            id: 'task-2', 
            name: '屋上防水工事',
            start: monthAfter.toISOString().split('T')[0],
            end: new Date(today.getFullYear(), today.getMonth() + 3, 30).toISOString().split('T')[0],
            progress: 0,
            type: 'construction'
        }
    ];
    
    // 段階1: データ集約アプローチテスト
    console.log('段階1: データ集約アプローチテスト開始');
    // [Phase 2] 会議統合機能を有効化して真の競合原因を特定
    const aggregatedMeetings = window.GanttManager.aggregateMeetingsByType(meetingData);
    // const aggregatedMeetings = meetingData; // 個別行表示に変更
    
    // 階層順序で統合（総会→理事会→修繕委員会→工事イベント）
    // [Phase 2] 会議統合機能で集約されたデータを使用
    projectData = [
        ...aggregatedMeetings.sort((a, b) => a.organization_level - b.organization_level), // 集約データ使用
        ...constructionData
    ];
    
    console.log('段階1テストデータ:', projectData.length, '件');
    updateEventList();
    renderGanttChart();
    updateDataCount();
    updateStatus('段階1: データ集約テスト完了');
}

/**
 * 左パネルのイベントリスト更新
 */
function updateEventList() {
    
    // データ分離：会議イベントと工事イベント（統合フォーマット対応）
    const meetingEvents = projectData.filter(item => 
        item.type === 'meeting' ||
        item.organization_level || 
        item.organization_type ||
        GanttManager.isMeetingEvent(item)
    );
    const workEvents = projectData.filter(item => 
        item.type === 'construction' ||
        (!item.type && !item.organization_level && !item.organization_type && !GanttManager.isMeetingEvent(item))
    );
    
    // 統合フォーマット対応: 個別会議データを強制集約処理
    let processedMeetingEvents = meetingEvents;
    if (meetingEvents.length > 0 && meetingEvents.some(item => item.type === 'meeting')) {
        console.log('統合フォーマット検出: 個別会議データを集約処理に送信');
        // [Phase 2] 会議統合機能を有効化して真の競合原因を特定
        processedMeetingEvents = GanttManager.aggregateMeetingsByType(meetingEvents);
        // processedMeetingEvents = meetingEvents; // 個別行表示に変更
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
    
    // 左パネル階層表示更新
    updateLeftPanelWithHierarchy(structuredMeetings, workEvents);
}

// ====================================================
// Phase-1A-2: 左パネル階層表示機能
// ====================================================

/**
 * 左パネル階層表示更新（Phase-1A-2 キー機能）
 */
function updateLeftPanelWithHierarchy(structuredMeetings, workTasks) {
    
    const eventList = document.getElementById('event-list');
    eventList.innerHTML = '';
    
    // 階層順序で表示（上位から下位へ）
    const hierarchyOrder = [
        { key: 'level1', name: '総会（最高意思決定機関）', icon: '📋', authority: '最終決定権' },
        { key: 'level2', name: '理事会（月次運営機関）', icon: '👥', authority: '執行権' },
        { key: 'level3', name: '修繕委員会（実行機関）', icon: '🔧', authority: '諮問権' }
    ];
    
    hierarchyOrder.forEach((levelInfo) => {
        const meetings = structuredMeetings[levelInfo.key];
        if (meetings && meetings.length > 0) {
            const groupElement = createHierarchyGroup(levelInfo, meetings);
            eventList.appendChild(groupElement);
        }
    });
    
    // 工事イベントを個別に追加
    if (workTasks && workTasks.length > 0) {
        const workItemsFragment = createWorkTasksGroup(workTasks);
        eventList.appendChild(workItemsFragment);
    }
    
    console.log('左パネル階層表示更新完了');
}

/**
 * 階層グループ要素作成（簡略化版 - 右チャートとの縦方向一致用）
 */
function createHierarchyGroup(levelInfo, meetings) {
    const level = levelInfo.key.replace('level', '');
    
    // 右チャートと一致させるため、単一行表示に変更
    const eventItem = document.createElement('div');
    eventItem.className = `event-item meeting-group-item level-${level}`;
    eventItem.setAttribute('data-level', level);
    
    // 会議グループ名を右チャートと一致させる
    const groupNames = {
        '1': '総会',
        '2': '理事会(毎月)', 
        '3': '修繕委員会(毎月)'
    };
    
    const groupName = groupNames[level] || levelInfo.name;
    
    const htmlContent = `
        <div class="event-main">
            <span class="event-name">${groupName}</span>
        </div>
    `;
    
    eventItem.innerHTML = htmlContent;
    return eventItem;
}

/**
 * 工事タスクグループ作成（簡略化版 - 右チャートとの一致用）
 */
function createWorkTasksGroup(workTasks) {
    // グループヘッダーを削除し、各工事を独立表示
    const fragment = document.createDocumentFragment();
    
    workTasks.forEach((task, index) => {
        const eventItem = document.createElement('div');
        eventItem.className = 'event-item work-item-individual';
        eventItem.setAttribute('data-task-id', task.id);
        
        // 進捗率に基づいて状態を判定
        const progress = parseInt(task.progress) || 0;
        let statusClass, statusText;
        
        if (progress >= 100) {
            statusClass = 'status-completed';
            statusText = '完了';
        } else if (progress > 0) {
            statusClass = 'status-in-progress'; 
            statusText = '進行中';
        } else {
            statusClass = 'status-planned';
            statusText = '計画';
        }
        
        const htmlContent = `
            <div class="event-main">
                <span class="event-name">${task.name}</span>
                <div class="status-indicator ${statusClass}" title="${statusText} (${progress}%)"></div>
            </div>
        `;
        
        eventItem.innerHTML = htmlContent;
        
        // クリックイベント追加
        eventItem.addEventListener('click', () => highlightTaskInGantt(task.id));
        
        fragment.appendChild(eventItem);
    });
    
    return fragment;
}

/**
 * ガントチャート内の会議をハイライト（デバッグ強化版）
 */
function highlightMeetingInGantt(meetingId) {
    console.log('=== ハイライト機能デバッグ開始 ===');
    console.log(`対象会議ID: ${meetingId}`);
    
    // 既存のハイライトをクリア
    const existingHighlights = document.querySelectorAll('.gantt .bar.highlighted');
    console.log(`既存ハイライト数: ${existingHighlights.length}`);
    existingHighlights.forEach(bar => {
        bar.classList.remove('highlighted');
        console.log(`ハイライト解除: ${bar.getAttribute('data-id')}`);
    });
    
    // 複数のセレクタでバー要素を検索
    const selectors = [
        '.gantt .bar',
        '.gantt .bar-wrapper',
        '.gantt rect',
        '.gantt [data-id]',
        '.gantt g',
        '.gantt svg rect'
    ];
    
    console.log('=== 各セレクタでの要素検索 ===');
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`${selector}: ${elements.length}件`);
        
        if (elements.length > 0 && elements.length < 20) { // 適度な数の場合のみ詳細表示
            elements.forEach((el, i) => {
                const dataId = el.getAttribute('data-id');
                const id = el.id;
                console.log(`  [${i}] data-id="${dataId}", id="${id}", tagName="${el.tagName}"`);
            });
        }
    });
    
    // 複数の方法でターゲットバーを検索
    let targetBar = null;
    const searchMethods = [
        () => document.querySelector(`.gantt .bar[data-id="${meetingId}"]`),
        () => document.querySelector(`.gantt [data-id="${meetingId}"]`),
        () => document.querySelector(`[data-id="${meetingId}"]`),
        () => document.getElementById(meetingId),
        // Frappe Gantt特有の構造を考慮した検索
        () => {
            const bars = document.querySelectorAll('.gantt rect, .gantt .bar-wrapper, .gantt g');
            return Array.from(bars).find(bar => {
                const id = bar.getAttribute('data-id') || bar.id;
                return id === meetingId;
            });
        },
        // タスク名での検索（最後の手段）
        () => {
            const meeting = projectData.find(item => item.id === meetingId);
            if (meeting) {
                const bars = document.querySelectorAll('.gantt rect, .gantt .bar-wrapper');
                return Array.from(bars).find(bar => {
                    const text = bar.textContent || bar.querySelector('text')?.textContent;
                    return text && text.includes(meeting.name);
                });
            }
            return null;
        }
    ];
    
    console.log('=== ターゲットバー検索 ===');
    for (let i = 0; i < searchMethods.length; i++) {
        try {
            targetBar = searchMethods[i]();
            if (targetBar) {
                console.log(`✅ 検索方法${i + 1}でバーを発見:`, targetBar);
                break;
            } else {
                console.log(`❌ 検索方法${i + 1}: 見つからず`);
            }
        } catch (error) {
            console.log(`❌ 検索方法${i + 1}でエラー:`, error.message);
        }
    }
    
    if (targetBar) {
        targetBar.classList.add('highlighted');
        console.log(`ハイライト適用後のクラス: ${targetBar.className}`);
        
        // スクロール前の位置確認
        const rect = targetBar.getBoundingClientRect();
        console.log(`バー位置: top=${rect.top}, left=${rect.left}, width=${rect.width}, height=${rect.height}`);
        
        // 強制的な視覚効果を追加
        targetBar.style.outline = '4px solid #FFD700';
        targetBar.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
        targetBar.style.zIndex = '1000';
        
        targetBar.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log(`✅ 会議 ${meetingId} をハイライト表示完了`);
        
        // 5秒後に強制スタイルを解除
        setTimeout(() => {
            targetBar.style.outline = '';
            targetBar.style.boxShadow = '';
            targetBar.style.zIndex = '';
            console.log(`強制スタイル解除: ${meetingId}`);
        }, 5000);
        
    } else {
        console.error(`❌ 全ての検索方法でバーが見つかりません: ${meetingId}`);
        
        // Frappe Ganttの実際のDOM構造を調査
        console.log('=== Frappe Gantt DOM構造調査 ===');
        const ganttContainer = document.querySelector('.gantt');
        if (ganttContainer) {
            console.log('Ganttコンテナ:', ganttContainer);
            const svgElements = ganttContainer.querySelectorAll('svg');
            console.log(`SVG要素数: ${svgElements.length}`);
            
            svgElements.forEach((svg, index) => {
                console.log(`SVG[${index}]:`, svg);
                const children = svg.children;
                for (let i = 0; i < Math.min(children.length, 3); i++) {
                    console.log(`  子要素[${i}]:`, children[i]);
                }
            });
        }
        
        // プロジェクトデータとの照合
        const meeting = projectData.find(item => item.id === meetingId);
        if (meeting) {
            console.log('対象会議データ:', meeting);
        }
    }
    
    console.log('=== ハイライト機能デバッグ終了 ===');
}

/**
 * ガントチャート内のタスクをハイライト
 */
function highlightTaskInGantt(taskId) {
    // 既存のハイライトをクリア
    document.querySelectorAll('.gantt .bar.highlighted').forEach(bar => {
        bar.classList.remove('highlighted');
    });
    
    // 該当タスクをハイライト
    const targetBar = document.querySelector(`.gantt .bar[data-id="${taskId}"]`);
    if (targetBar) {
        targetBar.classList.add('highlighted');
        targetBar.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log(`タスク ${taskId} をハイライト表示`);
    }
}

/**
 * ガントチャートのレンダリング（Phase-1A-2 統合版）
 */
function renderGanttChart() {
    console.log('=== デバッグ情報表示モード ===');
    console.log('データ読み込み完了、左パネルクリックでハイライト機能をテストしてください');
    const ganttContainer = document.getElementById('gantt');
    
    if (projectData.length === 0) {
        ganttContainer.innerHTML = '<div class="gantt-loading">データがありません</div>';
        return;
    }
    
    try {
        // データ分離：会議イベントと工事イベント（統合フォーマット対応）
        const meetingEvents = projectData.filter(item => 
            item.type === 'meeting' ||
            item.organization_level || 
            item.organization_type ||
            GanttManager.isMeetingEvent(item)
        );
        const workEvents = projectData.filter(item => 
            item.type === 'construction' ||
            (!item.type && !item.organization_level && !item.organization_type && !GanttManager.isMeetingEvent(item))
        );
        
        // 統合フォーマット対応: 個別会議データを強制集約処理
        let processedMeetingEvents = meetingEvents;
        if (meetingEvents.length > 0 && meetingEvents.some(item => item.type === 'meeting')) {
            console.log('統合フォーマット検出: 個別会議データを集約処理に送信');
            // [Phase 2] 会議統合機能を有効化して真の競合原因を特定
            processedMeetingEvents = GanttManager.aggregateMeetingsByType(meetingEvents);
            // processedMeetingEvents = meetingEvents; // 個別行表示に変更
            
            // グローバル変数として設定（依存関係検証で使用）
            window.processedMeetingEvents = processedMeetingEvents;
        }
        
        console.log(`会議イベント: ${meetingEvents.length}件`);
        console.log(`工事イベント: ${workEvents.length}件`);
        
        // 会議イベント構造化（Phase-1A-2 キー処理）（集約済みデータを使用）
        let structuredMeetings = { level1: [], level2: [], level3: [] };
        if (processedMeetingEvents.length > 0) {
            structuredMeetings = GanttManager.structureMeetingEvents(processedMeetingEvents);
        }
        
        // 階層関係生成
        const hierarchyConnections = GanttManager.generateHierarchyConnections(structuredMeetings);
        
        // ガントチャート用データ統合
        const combinedData = [
            ...Object.values(structuredMeetings).flat(),
            ...workEvents
        ];
        
        console.log(`統合データ: ${combinedData.length}件`);
        
        // 表示モード最適化
        const optimizedData = GanttManager.optimizeForViewMode(currentViewMode, combinedData);
        
        // Frappe Gantt用のデータ形式に変換
        let ganttTasks = optimizedData.map(task => ({
            id: task.id,
            name: task.name,
            start: task.start,
            end: task.end,
            progress: task.progress || 0,
            custom_class: task.custom_class || task.type,
            dependencies: task.dependencies || []
        }));
        
        console.log('ganttTasks before styles:', ganttTasks.length);
        
        // 会議イベント専用スタイル適用
        ganttTasks = GanttManager.applyMeetingStyles(ganttTasks);
        
        // 空の配列チェック
        if (ganttTasks.length === 0) {
            console.error('ガントタスクが空です');
            ganttContainer.innerHTML = '<div class="gantt-loading">表示するタスクがありません</div>';
            return;
        }
        
        // 既存のガントチャートを破棄
        if (ganttChart) {
            ganttContainer.innerHTML = '';
        }
        
        console.log('Ganttデータ（dependency付き）:', ganttTasks.filter(task => task.dependencies));
        
        // 日付の妥当性チェック
        ganttTasks = ganttTasks.filter(task => {
            if (!task.start || !task.end || !task.id || !task.name) {
                console.warn('無効なタスクをスキップ:', task);
                return false;
            }
            
            // 日付形式の確認
            const startDate = new Date(task.start);
            const endDate = new Date(task.end);
            
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                console.warn('無効な日付のタスクをスキップ:', task);
                return false;
            }
            
            return true;
        });
        
        console.log('フィルター後のganttTasks:', ganttTasks.length, '件');
        
        // 新しいガントチャートを作成（統合版 - Frappeポップアップ完全無効化）
        console.log('統合ガントチャート初期化: 自主実装ポップアップ専用モード');
        // SVG機能無効化中のためFrappe Gantt基本機能のみで動作
        
        ganttChart = new Gantt('#gantt', ganttTasks, {
            view_mode: currentViewMode,
            date_format: 'YYYY-MM-DD',
            bar_height: 30,
            bar_corner_radius: 4,
            arrow_curve: 5,
            padding: 18,
            view_modes: ['Day', 'Week', 'Month', 'Year'],
            // Frappeポップアップを完全無効化（自主実装ポップアップのみ使用）
            popup_trigger: 'none', // 'none'でポップアップ完全無効化
            custom_popup_html: null, // カスタムポップアップも無効化
            readonly_dates: false, // 日付編集を有効化
            readonly: false,       // すべての編集機能を有効化
            on_click: function (task) {
                console.log('タスククリック:', task);
                // Phase-1A-2: 階層情報表示
                if (task.organization_level) {
                    console.log(`組織レベル: ${task.organization_level}, 権限: ${task.decision_authority}`);
                }
            },
            on_date_change: function (task, start, end) {
                console.log('日付変更:', task, start, end);
                
                // projectDataを更新（Frappe Gantt内部データと同期）
                const projectTask = projectData.find(t => t.id === task.id);
                if (projectTask) {
                    projectTask.start = start.toISOString().split('T')[0];
                    projectTask.end = end.toISOString().split('T')[0];
                    console.log(`projectData更新: ${task.name} - ${projectTask.start}〜${projectTask.end}`);
                }
                
                // カスタム◆マークの再描画（DOM要素が再構築されるため）
                setTimeout(() => {
                    console.log('日付変更後の◆マーク再描画開始');
                    
                    // 集約済み会議タスクを取得（再度集約処理実行でID整合性確保）
                    const meetingEvents = projectData.filter(item => 
                        item.type === 'meeting' ||
                        item.organization_level || 
                        item.organization_type ||
                        window.GanttManager.isMeetingEvent(item)
                    );
                    
                    let aggregatedTasks = [];
                    if (meetingEvents.length > 0 && meetingEvents.some(item => item.type === 'meeting')) {
                        // [Phase 2] 会議統合機能を有効化して真の競合原因を特定
                        aggregatedTasks = window.GanttManager.aggregateMeetingsByType(meetingEvents);
                        // aggregatedTasks = meetingEvents; // 個別行表示に変更
                    } else if (meetingEvents.length > 0) {
                        aggregatedTasks = meetingEvents;
                    }
                    
                    if (aggregatedTasks.length > 0 && ganttChart) {
                        // 既存の◆マークを削除
                        const existingDiamonds = ganttChart.$svg.querySelectorAll('.meeting-diamond');
                        existingDiamonds.forEach(d => d.remove());
                        
                        // ◆マークを再描画
                        window.GanttManager.addMeetingDiamonds(ganttChart, aggregatedTasks);
                        console.log('◆マーク再描画完了');
                    }
                    
                    // 依存関係矢印の再描画（Phase-1A-3: ドラッグ追随機能）
                    if (window.currentArrowRenderer) {
                        console.log('依存関係矢印追随処理開始');
                        window.currentArrowRenderer.renderAllArrows();
                        console.log('依存関係矢印追随処理完了');
                    }
                }, 100); // Frappe Gantt内部処理完了を待つ
            },
            on_progress_change: function (task, progress) {
                console.log('進捗変更:', task, progress);
                // MVP段階では読み取り専用
            }
        });
        
        // [Phase 2] 方式1：DOM操作による週表示年表示修正 - 前回左カラム成功パターン適用
        // 週表示・日表示年表示カスタマイズ機能
        
        // 週表示時のヘッダー修正関数を定義（年表示追加）
        window.customizeWeekHeaders = function() {
            if (currentViewMode !== 'Week') {
                return;
            }
            
            const ganttDiv = document.getElementById('gantt');
            if (!ganttDiv) {
                return;
            }
            
            // text要素を検索（upper-text → y=25座標 → 全text要素の順でフォールバック）
            const upperTexts = ganttDiv.querySelectorAll('svg g.date text.upper-text');
            const upperTextsByPosition = ganttDiv.querySelectorAll('svg g.date text[y="25"]');
            const allTexts = ganttDiv.querySelectorAll('svg g.date text');
            
            let targetElements = upperTexts;
            if (targetElements.length === 0) {
                targetElements = upperTextsByPosition;
            }
            if (targetElements.length === 0) {
                targetElements = allTexts;
            }
            
            let processedCount = 0;
            targetElements.forEach((textElement) => {
                const originalText = textElement.textContent || '';
                const yPos = textElement.getAttribute('y') || '';
                
                // 英語月名のみを対象（January, February等）+ y=25の位置確認
                if (originalText && originalText.match(/^[A-Z][a-z]+$/) && (yPos === '25' || yPos === '25.0')) {
                    const newText = `2025年 ${originalText}`;
                    textElement.textContent = newText;
                    processedCount++;
                }
            });
        };
        
        // 日表示時のヘッダー修正関数を定義（年表示追加）
        window.customizeDayHeaders = function() {
            if (currentViewMode !== 'Day') {
                return;
            }
            
            const ganttDiv = document.getElementById('gantt');
            if (!ganttDiv) {
                return;
            }
            
            const svgElement = ganttDiv.querySelector('svg');
            if (!svgElement) {
                return;
            }
            
            // text要素を検索（upper-text → y=25座標 → 全text要素の順でフォールバック）
            const upperTexts = ganttDiv.querySelectorAll('svg g.date text.upper-text');
            const upperTextsByPosition = ganttDiv.querySelectorAll('svg g.date text[y="25"]');
            const allTexts = ganttDiv.querySelectorAll('svg g.date text');
            
            let targetElements = upperTexts;
            if (targetElements.length === 0) {
                targetElements = upperTextsByPosition;
            }
            if (targetElements.length === 0) {
                targetElements = allTexts;
            }
            
            let processedCount = 0;
            targetElements.forEach((textElement) => {
                const originalText = textElement.textContent || '';
                const yPos = textElement.getAttribute('y') || '';
                
                // 英語月名のみを対象（January, February等）+ y=25の位置確認
                if (originalText && originalText.match(/^[A-Z][a-z]+$/) && (yPos === '25' || yPos === '25.0')) {
                    const newText = `2025年 ${originalText}`;
                    textElement.textContent = newText;
                    processedCount++;
                }
            });
        };
        
        // 初回実行 - CSS特異性と同様のタイミング調整
        setTimeout(() => {
            if (currentViewMode === 'Week') {
                window.customizeWeekHeaders();
            } else if (currentViewMode === 'Day') {
                window.customizeDayHeaders();
            }
        }, 300);
        
        // ガントチャート描画後にカスタムクラスを手動で適用
        setTimeout(() => {
            applyCustomClasses(ganttTasks);
            applyHierarchyStyles(combinedData);
            // GanttManagerの同期処理実行
            GanttManager.syncPanels();
            
            // 段階2: 会議イベント◆マーク追加処理
            const aggregatedTasks = processedMeetingEvents.filter(task => 
                task.type === 'meeting_group' || task.type === 'meeting'
            );
            if (aggregatedTasks.length > 0) {
                window.GanttManager.addMeetingDiamonds(ganttChart, aggregatedTasks);
            }
            
            // 工事イベントのカスタムクリック処理追加
            console.log('工事イベントカスタムクリック処理追加開始');
            const constructionTasks = projectData.filter(task => task.type === 'construction');
            if (constructionTasks.length > 0) {
                window.GanttManager.addConstructionClickHandlers(ganttChart, constructionTasks);
            } else {
                console.log('工事タスクが見つかりません');
            }
            
            // 段階3: Phase-1A-3 依存関係矢印表示システム
            if (typeof window.DependencyArrowRenderer !== 'undefined') {
                try {
                    const arrowRenderer = new window.DependencyArrowRenderer(ganttChart);
                    arrowRenderer.initialize();
                    arrowRenderer.renderAllArrows();
                    window.currentArrowRenderer = arrowRenderer;
                } catch (arrowError) {
                    console.error('依存関係矢印システムエラー:', arrowError);
                }
            }
        }, 200); // 時間を少し延長してFrappe Gantt描画完了を確実に待つ
        
        console.log('ガントチャート描画完了');
        updateStatus('ガントチャート表示完了');
        
        // スクロール同期機能を再初期化（チャート再描画後）
        setTimeout(() => {
            setupScrollSynchronization();
        }, 100);
        
    } catch (error) {
        console.error('ガントチャート描画エラー:', error);
        ganttContainer.innerHTML = '<div class="gantt-loading">ガントチャートの描画に失敗しました</div>';
        updateStatus('エラー: ガントチャート描画失敗');
    }
}

/**
 * カスタムクラスを手動で適用
 */
function applyCustomClasses(ganttTasks) {
    ganttTasks.forEach(task => {
        const barElement = document.querySelector(`[data-id="${task.id}"]`);
        if (barElement) {
            const barWrapper = barElement.closest('.bar-wrapper');
            if (barWrapper && task.custom_class) {
                // スペース区切りの複数クラスを個別に追加
                const classNames = task.custom_class.split(' ').filter(cls => cls.trim());
                classNames.forEach(className => {
                    barWrapper.classList.add(className.trim());
                });
                console.log(`クラス適用: ${task.id} -> ${classNames.join(', ')}`);
            }
        }
    });
}

/**
 * 階層スタイル後適用（Phase-1A-2）
 */
function applyHierarchyStyles(combinedData) {
    
    document.querySelectorAll('.gantt .bar').forEach(bar => {
        const taskId = bar.getAttribute('data-id');
        const task = combinedData.find(t => t.id === taskId);
        
        if (task && task.organization_level) {
            bar.classList.add(`level-${task.organization_level}`);
            bar.setAttribute('data-authority', task.decision_authority || 'unknown');
            console.log(`階層スタイル適用: ${taskId} -> level-${task.organization_level}`);
        }
    });
    
    console.log('階層スタイル適用完了');
}

/**
 * カスタムポップアップ生成（Phase-1A-2 階層対応版）
 */
function generateCustomPopup(task) {
    let popupHtml = `<div class="popup-title">${task.name}</div>`;
    popupHtml += `<div class="popup-content">`;
    popupHtml += `<p><strong>期間:</strong> ${task.start} 〜 ${task.end}</p>`;
    
    if (task.organization_level) {
        const levelNames = { 1: '総会', 2: '理事会', 3: '修繕委員会' };
        popupHtml += `<p><strong>組織:</strong> ${levelNames[task.organization_level]}</p>`;
        popupHtml += `<p><strong>権限:</strong> ${task.decision_authority_jp || task.decision_authority}</p>`;
        
        if (task.report_to) {
            popupHtml += `<p><strong>報告先:</strong> ${task.report_to}</p>`;
        }
        
        if (task.frequency) {
            const freqNames = { annual: '年次', monthly: '月次', adhoc: '臨時' };
            popupHtml += `<p><strong>頻度:</strong> ${freqNames[task.frequency] || task.frequency}</p>`;
        }
    } else {
        popupHtml += `<p><strong>進捗:</strong> ${task.progress}%</p>`;
    }
    
    popupHtml += `</div>`;
    return popupHtml;
}

/**
 * 表示モード切替
 */
function switchViewMode(mode) {
    currentViewMode = mode;
    
    // ボタンの状態更新
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeBtn = document.getElementById(`btn-${mode.toLowerCase()}`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // ガントチャート再描画（表示モード最適化を含む完全な再描画）
    if (ganttChart && projectData.length > 0) {
        console.log(`表示モード切替: ${mode} - 完全再描画実行`);
        renderGanttChart(); // 最適化処理を含む完全な再描画
        
        // 方式1：週表示・日表示時の年表示カスタマイズを再適用
        if (mode === 'Week' && typeof window.customizeWeekHeaders === 'function') {
            // 週表示の年表示カスタマイズを適用
            setTimeout(() => {
                window.customizeWeekHeaders();
            }, 400); // 再描画完了後に実行
        } else if (mode === 'Day' && typeof window.customizeDayHeaders === 'function') {
            // 日表示の年表示カスタマイズを適用
            setTimeout(() => {
                window.customizeDayHeaders();
            }, 400); // 再描画完了後に実行
        }
    }
    
    updateStatus(`表示モード: ${mode}`);
    console.log('表示モード変更:', mode);
}

/**
 * ドラッグオーバー処理
 */
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropZone = document.getElementById('drop-zone');
    dropZone.classList.add('dragover');
}

/**
 * ドラッグリーブ処理
 */
function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropZone = document.getElementById('drop-zone');
    dropZone.classList.remove('dragover');
}

/**
 * ファイルドロップ処理
 */
function handleFileDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const dropZone = document.getElementById('drop-zone');
    dropZone.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

/**
 * ファイルインポート処理
 */
function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    processFile(file);
}

/**
 * 進捗表示制御
 */
function showProgress() {
    const progressContainer = document.getElementById('progress-container');
    progressContainer.style.display = 'flex';
}

function hideProgress() {
    const progressContainer = document.getElementById('progress-container');
    progressContainer.style.display = 'none';
}

function updateProgress(percent, message) {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    progressFill.style.width = percent + '%';
    progressText.textContent = percent + '%';
    
    if (message) {
        updateStatus(message);
    }
}

/**
 * ファイル処理
 */
async function processFile(file) {
    // ファイル形式チェック
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
        updateStatus('エラー: Excel (.xlsx) または CSV ファイルを選択してください');
        return;
    }
    
    try {
        showProgress();
        updateProgress(0, 'ファイル処理開始...');
        console.log('ファイル処理開始:', file.name);
        
        // DataProcessorを使用してファイルを読み込み（進捗コールバック付き）
        const rawData = await DataProcessor.loadFile(file, updateProgress);
        console.log('ファイル読み込み完了:', rawData);
        
        // データ検証（強化版）
        const validation = DataProcessor.validateData(rawData);
        
        // 警告がある場合は表示
        if (validation.warnings && validation.warnings.length > 0) {
            console.log('データ検証警告:', validation.warnings);
        }
        
        // 自動修正がある場合は表示
        if (validation.fixes && validation.fixes.length > 0) {
            console.log('データ自動修正:', validation.fixes);
        }
        
        if (!validation.isValid) {
            let errorMsg = 'データ検証エラー:\n' + validation.errors.join('\n');
            
            if (validation.warnings && validation.warnings.length > 0) {
                errorMsg += '\n\n警告:\n' + validation.warnings.join('\n');
            }
            
            updateStatus('データ検証失敗');
            alert(errorMsg);
            return;
        }
        
        // 検証成功時の情報表示
        if (validation.warnings && validation.warnings.length > 0) {
            console.log(`データ検証完了: ${validation.validRowCount}件の有効データ`);
        }
        
        // Frappe Gantt形式に変換
        const ganttData = DataProcessor.convertToGanttFormat(rawData);
        console.log('変換完了:', ganttData);
        
        if (ganttData.length === 0) {
            updateStatus('エラー: 有効なデータが見つかりませんでした');
            return;
        }
        
        // プロジェクトデータを更新
        projectData = ganttData;
        
        // UI更新
        updateEventList();
        renderGanttChart();
        updateDataCount();
        
        updateStatus(`ファイル読み込み完了: ${ganttData.length}件のデータ`);
        console.log('ファイル処理完了');
        
        // 成功時は2秒後に進捗バーを非表示
        setTimeout(() => {
            hideProgress();
        }, 2000);
        
    } catch (error) {
        console.error('ファイル処理エラー:', error);
        updateStatus('エラー: ' + error.message);
        hideProgress(); // エラー時は即座に非表示
        
        // ErrorHandlerを使用してユーザーフレンドリーなエラー表示
        ErrorHandler.logError(error, 'ファイル処理');
        ErrorHandler.showErrorDialog(error);
    }
}

/**
 * ファイルエクスポート処理
 */
function handleFileExport() {
    if (projectData.length === 0) {
        updateStatus('エラー: 出力するデータがありません');
        return;
    }
    
    try {
        updateStatus('ファイル出力中...');
        console.log('ファイル出力開始');
        
        DataProcessor.exportToExcel(projectData);
        
        updateStatus('ファイル出力完了');
        console.log('ファイル出力完了');
        
    } catch (error) {
        console.error('ファイル出力エラー:', error);
        updateStatus('エラー: ファイル出力に失敗しました');
        
        // ErrorHandlerを使用してユーザーフレンドリーなエラー表示
        ErrorHandler.logError(error, 'ファイル出力');
        ErrorHandler.showErrorDialog(error);
    }
}

/**
 * ステータス表示更新
 */
function updateStatus(message) {
    const statusText = document.getElementById('status-text');
    if (statusText) {
        statusText.textContent = message;
    }
}

/**
 * データ件数表示更新
 */
function updateDataCount() {
    const dataCount = document.getElementById('data-count');
    if (dataCount) {
        dataCount.textContent = `データ件数: ${projectData.length}`;
    }
}

/**
 * スクロール同期機能の初期化（高機能版）
 */
function setupScrollSynchronization() {
    // 左パネル：イベントリスト
    const leftPanel = document.getElementById('event-list');
    
    // 右パネル：実際のスクロール可能なコンテナを検索
    const ganttContainer = document.getElementById('gantt');
    let rightPanel = null;
    
    // Frappe Ganttの実際のスクロール構造を検索
    if (ganttContainer) {
        // SVG要素の存在確認
        const svgElement = ganttContainer.querySelector('svg');
        const svgParent = svgElement ? svgElement.parentElement : null;
        
        // 複数の候補をチェック
        const candidates = [
            // 外部コンテナ
            document.querySelector('.gantt-container'),
            document.querySelector('.right-panel'),
            // Frappe Gantt内部のスクロール要素（null安全）
            svgParent,
            ganttContainer,
            // window.scrollスクロール
            document.documentElement,
            document.body
        ];
        
        console.log('スクロール候補要素の検証:');
        candidates.forEach((candidate, index) => {
            if (candidate) {
                const scrollHeight = candidate.scrollHeight;
                const clientHeight = candidate.clientHeight;
                const scrollable = scrollHeight > clientHeight;
                console.log(`候補${index + 1}:`, candidate.tagName, candidate.className, 
                           `スクロール高=${scrollHeight}, クライアント高=${clientHeight}, スクロール可能=${scrollable}`);
                
                if (!rightPanel && scrollable) {
                    rightPanel = candidate;
                }
            }
        });
    }
    
    console.log('スクロール同期：要素取得結果');
    console.log('左パネル:', leftPanel);
    console.log('右パネル:', rightPanel);
    console.log('左スクロール高:', leftPanel ? leftPanel.scrollHeight - leftPanel.clientHeight : 'N/A');
    console.log('右スクロール高:', rightPanel ? rightPanel.scrollHeight - rightPanel.clientHeight : 'N/A');
    
    if (!leftPanel || !rightPanel) {
        console.error('スクロール同期：パネル要素が見つかりません');
        return;
    }
    
    if (rightPanel.scrollHeight - rightPanel.clientHeight <= 0) {
        console.warn('右パネルにスクロール可能な高さがありません - 同期無効');
        return;
    }
    
    let isLeftScrolling = false;
    let isRightScrolling = false;
    let isShiftPressed = false;
    
    // Shiftキーの状態を監視
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Shift') {
            isShiftPressed = true;
            console.log('Shift押下：同期スクロールモード有効');
            // 視覚的フィードバック：同期スクロールモード表示
            leftPanel.style.borderRight = '3px solid #00ff00';
            rightPanel.style.borderLeft = '3px solid #00ff00';
        }
    });
    
    document.addEventListener('keyup', function(e) {
        if (e.key === 'Shift') {
            isShiftPressed = false;
            console.log('Shift解除：独立スクロールモード復帰');
            // 視覚的フィードバック：独立モードに戻す
            leftPanel.style.borderRight = '';
            rightPanel.style.borderLeft = '';
        }
    });
    
    // 左パネルのスクロール処理
    leftPanel.addEventListener('scroll', function(e) {
        console.log('左パネルスクロール - Shift:', isShiftPressed, 'scrollTop:', leftPanel.scrollTop);
        
        // 通常時は独立スクロール（同期しない）
        if (!isShiftPressed) return;
        
        // Shiftキー押下時は同期スクロール
        if (isRightScrolling) return;
        
        isLeftScrolling = true;
        
        const scrollPercentage = leftPanel.scrollTop / Math.max(1, leftPanel.scrollHeight - leftPanel.clientHeight);
        const targetScrollTop = scrollPercentage * Math.max(0, rightPanel.scrollHeight - rightPanel.clientHeight);
        
        console.log('左→右同期:', scrollPercentage.toFixed(3), '→', targetScrollTop.toFixed(1));
        rightPanel.scrollTop = targetScrollTop;
        
        setTimeout(() => { isLeftScrolling = false; }, 50);
    });
    
    // 右パネルのスクロール処理  
    rightPanel.addEventListener('scroll', function(e) {
        console.log('右パネルスクロール - Shift:', isShiftPressed, 'scrollTop:', rightPanel.scrollTop);
        
        // 通常時は独立スクロール（同期しない）
        if (!isShiftPressed) return;
        
        // Shiftキー押下時は同期スクロール
        if (isLeftScrolling) return;
        
        isRightScrolling = true;
        
        const scrollPercentage = rightPanel.scrollTop / Math.max(1, rightPanel.scrollHeight - rightPanel.clientHeight);
        const targetScrollTop = scrollPercentage * Math.max(0, leftPanel.scrollHeight - leftPanel.clientHeight);
        
        console.log('右→左同期:', scrollPercentage.toFixed(3), '→', targetScrollTop.toFixed(1));
        leftPanel.scrollTop = targetScrollTop;
        
        setTimeout(() => { isRightScrolling = false; }, 50);
    });
    
    // マウスホイールイベント監視（縦方向スクロール制御）
    leftPanel.addEventListener('wheel', function(e) {
        if (isShiftPressed) {
            // Shift+ホイール時：左パネルのみ縦方向スクロール
            // 横方向スクロールを防ぐ
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.stopPropagation();
            }
        }
    }, { passive: false });
    
    rightPanel.addEventListener('wheel', function(e) {
        if (isShiftPressed) {
            // Shift+ホイール時：右パネルのみ縦方向スクロール
            // 横方向スクロールを防ぐ
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                e.stopPropagation();
            }
        }
    }, { passive: false });
    
    console.log('修正版スクロール同期初期化完了');
    console.log('使用法: 通常=独立スクロール, Shift押下=同期スクロール');
}

/**
 * デモデータの自動読み込み
 */
async function loadDemoData() {
    try {
        updateStatus('デモデータ読み込み中...');
        
        const response = await fetch('./unified_format_realdata.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
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
