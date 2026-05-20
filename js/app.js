// Core Application State
const STATE = {
    currentStep: 1,
    selectedDate: '2026-05-19', // Current date default
    currentCalendarYear: 2026,
    currentCalendarMonth: 4, // May
    tasks: [], // { id, title, description, category, score, done, date, keywordBoost, matchedKeywords, attributes: [], attributeBoost, stepsCompleted: false, steps: [] }
    isDashboardMatrixView: false, 
    activeAttributes: new Set(),
    
    // Gamification properties
    userXP: 0,
    userLevel: 1,
    streakCount: 1,
    lastActiveDate: '2026-05-19', // Default tracking date
    unlockedBadges: [], // Rookie, sweeper, architect, streak, god
    quests: [
        { id: 'quest-dump', text: '大腦排空：今日登錄 3 個任務', target: 3, current: 0, completed: false, xp: 120 },
        { id: 'quest-ai', text: '解構主義：使用 AI 分解 1 個步驟', target: 1, current: 0, completed: false, xp: 100 },
        { id: 'quest-done', text: '戰略執行：今日完成 2 個任務', target: 2, current: 0, completed: false, xp: 150 }
    ],
    lastAiStepsTaskId: null
};

// LocalStorage Persistence Helpers (補上原先缺漏的儲存邏輯)
function saveToStorage() {
    try {
        const dataToSave = { ...STATE };
        // Set cannot be directly serialized into JSON, convert to Array
        dataToSave.activeAttributes = Array.from(STATE.activeAttributes);
        localStorage.setItem('FOCUSFLOW_STATE', JSON.stringify(dataToSave));
    } catch (e) {
        console.error("Failed to save state to localStorage", e);
    }
}

function loadFromStorage() {
    try {
        const raw = localStorage.getItem('FOCUSFLOW_STATE');
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        
        Object.assign(STATE, parsed);
        STATE.activeAttributes = new Set(parsed.activeAttributes || []);
        return true;
    } catch (e) {
        console.error("Failed to load state from localStorage", e);
        return false;
    }
}

// Achievement badge catalog
const BADGE_CATALOG = [
    { id: 'rookie', title: '初出茅廬', desc: '完成第一個任務', icon: 'zap', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' },
    { id: 'sweeper', title: '大腦清道夫', desc: '單日登錄達 5 個任務', icon: 'layers', color: 'text-purple-400 border-purple-500/20 bg-purple-500/5' },
    { id: 'architect', title: '結構大師', desc: '點選 AI 智慧任務拆解', icon: 'sparkles', color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5' },
    { id: 'streak_3', title: '連擊大師', desc: '連續兩天或以上簽到打卡', icon: 'flame', color: 'text-rose-400 border-rose-500/20 bg-rose-500/5' },
    { id: 'god', title: '效率大師', desc: '使用者等級達到 LV.3', icon: 'crown', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' }
];

// Experience curve model
function getXPForNextLevel(level) {
    return level * 500;
}

// Select elements
const DOM = {
    stepNodes: document.querySelectorAll('.step-node'),
    stepConnectors: document.querySelectorAll('.step-connector'),
    wizardPanels: document.querySelectorAll('.wizard-panel'),
    currentMethodBadge: document.getElementById('current-method-badge'),
    
    // Coach
    coachBubble: document.getElementById('coach-bubble'),
    coachTaskCount: document.getElementById('coach-task-count'),
    coachActionHint: document.getElementById('coach-action-hint'),
    coachIconContainer: document.getElementById('coach-icon-container'),

    // RPG Progression HUD
    userTitleDisplay: document.getElementById('user-title-display'),
    xpNumbersDisplay: document.getElementById('xp-numbers-display'),
    xpBarProgress: document.getElementById('xp-bar-progress'),
    statTotalCompleted: document.getElementById('stat-total-completed'),
    statTotalAi: document.getElementById('stat-total-ai'),
    streakCounterBadge: document.getElementById('streak-counter-badge'),
    dailyQuestsContainer: document.getElementById('daily-quests-container'),
    badgesContainer: document.getElementById('badges-container'),

    // Step 1
    taskForm: document.getElementById('task-input-form'),
    taskTitleInput: document.getElementById('task-title'),
    taskDescriptionInput: document.getElementById('task-description'),
    taskCategoryInput: document.getElementById('task-category'),
    draftTasksContainer: document.getElementById('draft-tasks-container'),
    tasksEmptyState: document.getElementById('tasks-empty-state'),
    taskCounter: document.getElementById('task-counter'),
    clearAllDrafts: document.getElementById('clear-all-drafts'),
    btnToStep2: document.getElementById('btn-to-step-2'),
    micStatusPill: document.getElementById('mic-status-pill'),
    btnVoiceTitle: document.getElementById('btn-voice-title'),
    btnVoiceDesc: document.getElementById('btn-voice-desc'),
    pillToggles: document.querySelectorAll('.pill-toggle'),
    currentDateTitle: document.getElementById('current-date-title'),

    // Step 1 Calendar
    calendarMonthYear: document.getElementById('calendar-month-year'),
    calendarDaysGrid: document.getElementById('calendar-days-grid'),
    btnCalendarPrev: document.getElementById('btn-calendar-prev'),
    btnCalendarNext: document.getElementById('btn-calendar-next'),
    selectedDateDisplay: document.getElementById('selected-date-display'),

    // Step 2
    btnBackToStep1: document.getElementById('btn-back-to-step-1'),
    btnFinish: document.getElementById('btn-finish'),
    btnExportList: document.getElementById('btn-export-list'),
    btnToggleView: document.getElementById('btn-toggle-view'),
    btnResetApp: document.getElementById('btn-reset-app'),

    // Step 2 Sub-interfaces
    dashboardEisenhowerGrid: document.getElementById('dashboard-eisenhower-grid'),
    dashboardRankedList: document.getElementById('dashboard-ranked-list'),
    quadrantDo: document.getElementById('quadrant-do'),
    quadrantSchedule: document.getElementById('quadrant-schedule'),
    quadrantDelegate: document.getElementById('quadrant-delegate'),
    quadrantEliminate: document.getElementById('quadrant-eliminate'),
    rankedTasksList: document.getElementById('ranked-tasks-list'),

    // AI Action Steps Overlay/Panel
    aiStepsPanel: document.getElementById('ai-steps-panel'),
    aiStepsTaskTitle: document.getElementById('ai-steps-task-title'),
    aiStepsLoading: document.getElementById('ai-steps-loading'),
    aiStepsList: document.getElementById('ai-steps-list'),
    btnCloseAiSteps: document.getElementById('btn-close-ai-steps'),

    // Step 2 Stats
    statTop: document.getElementById('dashboard-stat-top'),
    statCompletion: document.getElementById('dashboard-stat-completion'),
    statMethod: document.getElementById('dashboard-stat-method'),

    // Overlay feedback effects
    effectOverlay: document.getElementById('effect-overlay'),
    levelUpModal: document.getElementById('level-up-modal'),
    modalLevelTitle: document.getElementById('modal-level-title'),
    btnCloseLevelModal: document.getElementById('btn-close-level-modal')
};

// Assistive Coach Prompts
const COACH_SPEECH = {
    step1_empty: "歡迎來到 FocusFlow！選擇行事曆日期，將你腦中的任務記錄下來。勾選屬性可獲得額外經驗加權喔！",
    step1_hasTasks: (count) => `做得好！在當前日期你已排空了 ${count} 個事項。點擊「自動生成行動案」獲取排序！`,
    step2: "黃金戰略行動案已完成部署。點擊「🤖 AI步驟」獲取高效率分解步驟，完成步驟有額外 XP 獎勵！"
};

// Update Coach message
function speakCoach(message, actionHint = "") {
    if (!DOM.coachBubble) return;
    DOM.coachBubble.style.opacity = '0';
    setTimeout(() => {
        DOM.coachBubble.innerText = `「${message}」`;
        DOM.coachBubble.style.opacity = '1';
    }, 120);

    if (DOM.coachActionHint) {
        DOM.coachActionHint.innerText = actionHint || "";
    }
}

// Web Speech API
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let titleRecognition = null;
let descRecognition = null;

if (SpeechRecognition) {
    if (DOM.micStatusPill) {
        DOM.micStatusPill.classList.remove('hidden');
        DOM.micStatusPill.classList.add('flex');
    }

    titleRecognition = new SpeechRecognition();
    titleRecognition.lang = 'zh-TW';
    titleRecognition.interimResults = false;
    titleRecognition.maxAlternatives = 1;

    titleRecognition.onstart = () => {
        DOM.btnVoiceTitle.classList.add('border-rose-500/40', 'bg-rose-950/20');
        speakCoach("正在聆聽任務名稱...", "語音辨識中");
        toggleCoachPulse(true);
    };

    titleRecognition.onresult = (event) => {
        const speechToText = event.results[0][0].transcript;
        DOM.taskTitleInput.value = speechToText;
        speakCoach(`辨識出名稱：「${speechToText}」`, "語音輸入成功");
    };

    titleRecognition.onerror = () => {
        speakCoach("語音未能識別，請再試一次。", "語音識別失敗");
        resetVoiceButtons();
    };

    titleRecognition.onend = () => {
        resetVoiceButtons();
        toggleCoachPulse(false);
    };

    descRecognition = new SpeechRecognition();
    descRecognition.lang = 'zh-TW';
    descRecognition.interimResults = false;
    descRecognition.maxAlternatives = 1;

    descRecognition.onstart = () => {
        DOM.btnVoiceDesc.classList.add('border-rose-500/40', 'bg-rose-950/20');
        speakCoach("正在聆聽補充描述...", "語音辨識中");
        toggleCoachPulse(true);
    };

    descRecognition.onresult = (event) => {
        const speechToText = event.results[0][0].transcript;
        DOM.taskDescriptionInput.value = speechToText;
        speakCoach(`辨識描述：「${speechToText}」`, "語音輸入成功");
    };

    descRecognition.onerror = () => {
        speakCoach("語音未能識別描述，請再次點擊嘗試。", "語音識別失敗");
        resetVoiceButtons();
    };

    descRecognition.onend = () => {
        resetVoiceButtons();
        toggleCoachPulse(false);
    };

    DOM.btnVoiceTitle.addEventListener('click', () => {
        try { titleRecognition.start(); } catch(e) { titleRecognition.stop(); }
    });

    DOM.btnVoiceDesc.addEventListener('click', () => {
        try { descRecognition.start(); } catch(e) { descRecognition.stop(); }
    });
}

function resetVoiceButtons() {
    if (DOM.btnVoiceTitle && DOM.btnVoiceDesc) {
        DOM.btnVoiceTitle.className = "bg-slate-900 border border-slate-800 text-slate-500 hover:text-white p-2 rounded-lg smooth-transition flex items-center justify-center shrink-0";
        DOM.btnVoiceDesc.className = "bg-slate-900 border border-slate-800/80 text-slate-500 hover:text-white p-1.5 rounded-lg smooth-transition flex items-center justify-center shrink-0";
    }
}

function toggleCoachPulse(active) {
    if (!DOM.coachIconContainer) return;
    if (active) {
        DOM.coachIconContainer.classList.add('animate-ping');
    } else {
        DOM.coachIconContainer.classList.remove('animate-ping');
    }
}

// Minimalist Pill Toggles Listener
DOM.pillToggles.forEach(pill => {
    pill.addEventListener('click', () => {
        const attrType = pill.getAttribute('data-attr');
        const marker = pill.querySelector('.marker-dot');

        if (STATE.activeAttributes.has(attrType)) {
            STATE.activeAttributes.delete(attrType);
            pill.classList.remove('border-indigo-500/40', 'text-indigo-300', 'bg-indigo-950/15');
            pill.classList.add('border-slate-800', 'text-slate-400', 'bg-[#0b0f19]');
            marker.className = "w-1.5 h-1.5 rounded-full bg-slate-700 marker-dot";
        } else {
            STATE.activeAttributes.add(attrType);
            pill.classList.add('border-indigo-500/40', 'text-indigo-300', 'bg-indigo-950/15');
            pill.classList.remove('border-slate-800', 'text-slate-400', 'bg-[#0b0f19]');

            let dotColor = "bg-indigo-500";
            if (attrType === 'deadline') dotColor = "bg-rose-500";
            else if (attrType === 'impact') dotColor = "bg-amber-500";
            else if (attrType === 'quickwin') dotColor = "bg-emerald-500";
            else if (attrType === 'collab') dotColor = "bg-sky-500";
            else if (attrType === 'growth') dotColor = "bg-purple-500";

            marker.className = `w-1.5 h-1.5 rounded-full ${dotColor} marker-dot`;
        }
    });
});

// Auto-weight keyword analyzer logic
function calculateKeywordBoost(title, description) {
    const text = (title + " " + (description || "")).toLowerCase();
    let boost = 0;
    const matched = [];

    const rules = [
        { category: "緊急", weight: 5, keywords: ["emergency", "asap", "due today", "急", "緊急", "截止", "立刻"] },
        { category: "學術", weight: 3, keywords: ["midterm", "final", "submission", "quiz", "考", "考試", "報告", "作業", "準備"] },
        { category: "行政", weight: 2, keywords: ["academic affairs", "meeting", "document", "開會", "會議", "行政", "公文", "合約"] },
        { category: "健康", weight: 2, keywords: ["clinic", "medication", "check", "門診", "醫院", "藥", "回診", "看病", "運動", "健康"] }
    ];

    rules.forEach(rule => {
        const found = rule.keywords.filter(keyword => text.includes(keyword));
        if (found.length > 0) {
            boost += rule.weight;
            matched.push({ category: rule.category, weight: rule.weight, words: found });
        }
    });

    return { boost, matched };
}

// Attributes Priority modifier values
const ATTR_VALUES = {
    deadline: { label: "🛑 截止日", boost: 4, style: "bg-rose-500/5 text-rose-400 border-rose-500/10" },
    impact: { label: "🔥 價值", boost: 3, style: "bg-amber-500/5 text-amber-400 border-amber-500/10" },
    quickwin: { label: "⚡ 快速", boost: 2, style: "bg-emerald-500/5 text-emerald-400 border-emerald-500/10" },
    collab: { label: "👥 協作", boost: 1, style: "bg-sky-500/5 text-sky-400 border-sky-500/10" },
    growth: { label: "🌱 成長", boost: 2, style: "bg-purple-500/5 text-purple-400 border-purple-500/10" }
};

function calculateAttributeBoost(selectedAttrs) {
    let boost = 0;
    const details = [];

    selectedAttrs.forEach(attr => {
        if (ATTR_VALUES[attr]) {
            boost += ATTR_VALUES[attr].boost;
            details.push({
                type: attr,
                label: ATTR_VALUES[attr].label,
                boost: ATTR_VALUES[attr].boost,
                style: ATTR_VALUES[attr].style
            });
        }
    });

    return { boost, details };
}

// GAMIFICATION & LEVELING ENGINE
function earnXP(amount, eventSourceElement = null, isSilent = false) {
    STATE.userXP += amount;
    
    // Floating text indicator
    if (eventSourceElement) {
        triggerXPFloatingIndicator(eventSourceElement, `+${amount} XP`);
    }

    let nextLvlXP = getXPForNextLevel(STATE.userLevel);
    let leveledUp = false;

    while (STATE.userXP >= nextLvlXP) {
        STATE.userXP -= nextLvlXP;
        STATE.userLevel++;
        nextLvlXP = getXPForNextLevel(STATE.userLevel);
        leveledUp = true;
    }

    if (leveledUp && !isSilent) {
        triggerLevelUpOverlay();
    }

    evaluateMilestones();
    saveToStorage();
    renderProgressionHUD();
}

// Floating score feedback generator
function triggerXPFloatingIndicator(element, text) {
    try {
        const rect = element.getBoundingClientRect();
        const x = rect.left + window.scrollX + (rect.width / 2);
        const y = rect.top + window.scrollY - 10;

        const floater = document.createElement('div');
        floater.className = 'absolute text-xs font-bold text-emerald-400 z-50 xp-floater font-mono tracking-wider';
        floater.style.left = `${x}px`;
        floater.style.top = `${y}px`;
        floater.innerText = text;

        DOM.effectOverlay.appendChild(floater);
        setTimeout(() => {
            floater.remove();
        }, 1000);
    } catch(err) {
        console.error("XP Feedback Render Failed", err);
    }
}

// Level Up Notification Overlay
function triggerLevelUpOverlay() {
    DOM.modalLevelTitle.innerText = `LV.${STATE.userLevel} ${getLevelTitle(STATE.userLevel)}`;
    DOM.levelUpModal.classList.remove('hidden');
    setTimeout(() => {
        DOM.levelUpModal.classList.remove('opacity-0');
    }, 10);
    playSfxNotification();
}

DOM.btnCloseLevelModal.addEventListener('click', () => {
    DOM.levelUpModal.classList.add('opacity-0');
    setTimeout(() => {
        DOM.levelUpModal.classList.add('hidden');
    }, 300);
});

function getLevelTitle(level) {
    if (level === 1) return "專注初心者";
    if (level === 2) return "自律實踐者";
    if (level === 3) return "時間工程師";
    if (level === 4) return "效率先鋒";
    return "終極專注大師";
}

// Track streak counts dynamically
function checkStreakLog() {
    const todayStr = '2026-05-19'; // Static simulation context
    if (STATE.lastActiveDate && STATE.lastActiveDate !== todayStr) {
        const lastDateObj = new Date(STATE.lastActiveDate);
        const todayDateObj = new Date(todayStr);
        const diffTime = Math.abs(todayDateObj - lastDateObj);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            STATE.streakCount++;
        } else if (diffDays > 1) {
            STATE.streakCount = 1;
        }
        STATE.lastActiveDate = todayStr;
        saveToStorage();
    }
}

// Achievements Checklist Evaluation
function evaluateMilestones() {
    const totalDone = STATE.tasks.filter(t => t.done).length;
    const totalAi = STATE.tasks.filter(t => t.steps && t.steps.length > 0).length;

    const newUnlocks = [];

    const tryUnlock = (badgeId) => {
        if (!STATE.unlockedBadges.includes(badgeId)) {
            STATE.unlockedBadges.push(badgeId);
            newUnlocks.push(badgeId);
        }
    };

    if (totalDone >= 1) tryUnlock('rookie');
    if (STATE.tasks.length >= 5) tryUnlock('sweeper');
    if (totalAi >= 1) tryUnlock('architect');
    if (STATE.streakCount >= 2) tryUnlock('streak_3');
    if (STATE.userLevel >= 3) tryUnlock('god');

    if (newUnlocks.length > 0) {
        newUnlocks.forEach(badgeId => {
            const b = BADGE_CATALOG.find(x => x.id === badgeId);
            if (b) {
                speakCoach(`解鎖成就勳章：【${b.title}】！獲得額外獎勵 XP!`, "解鎖徽章");
                earnXP(100, document.getElementById('badges-container'), true);
            }
        });
        saveToStorage();
        renderProgressionHUD();
    }
}

// Render RPG HUD & Quest cards
function renderProgressionHUD() {
    DOM.userTitleDisplay.innerText = `LV.${STATE.userLevel} ${getLevelTitle(STATE.userLevel)}`;
    const nextLvlXP = getXPForNextLevel(STATE.userLevel);
    DOM.xpNumbersDisplay.innerText = `${STATE.userXP} / ${nextLvlXP} XP`;
    
    const xpPct = Math.min(100, (STATE.userXP / nextLvlXP) * 100);
    DOM.xpBarProgress.style.width = `${xpPct}%`;

    const totalDone = STATE.tasks.filter(t => t.done).length;
    const totalAi = STATE.tasks.filter(t => t.steps && t.steps.length > 0).length;

    DOM.statTotalCompleted.innerText = `${totalDone} 件`;
    DOM.statTotalAi.innerText = `${totalAi} 次`;
    DOM.streakCounterBadge.innerHTML = `<i data-lucide="flame" class="w-3.5 h-3.5 animate-bounce"></i> ${STATE.streakCount} 天連擊`;

    // 1. Quests rendering
    DOM.dailyQuestsContainer.innerHTML = '';
    
    // Update live counts
    STATE.quests.forEach(q => {
        if (q.id === 'quest-dump') q.current = STATE.tasks.length;
        if (q.id === 'quest-ai') q.current = totalAi;
        if (q.id === 'quest-done') q.current = totalDone;

        // Auto trigger completion
        if (q.current >= q.target && !q.completed) {
            q.completed = true;
            earnXP(q.xp, DOM.dailyQuestsContainer);
            speakCoach(`每日挑戰完成：${q.text}! 獲得 +${q.xp} XP!`, "挑戰達成");
        }

        const pct = Math.min(100, (q.current / q.target) * 100);

        const card = document.createElement('div');
        card.className = `p-2 rounded-lg border text-[11px] flex flex-col gap-1 smooth-transition ${q.completed ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-400' : 'bg-[#090d16] border-white/[0.02] text-slate-300'}`;
        card.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="${q.completed ? 'line-through text-slate-500' : 'font-medium'}">${q.text}</span>
                <span class="mono-font text-[9px] font-bold ${q.completed ? 'text-emerald-400' : 'text-slate-500'}">${q.current} / ${q.target}</span>
            </div>
            <div class="w-full h-1 bg-[#060a11] rounded-full overflow-hidden">
                <div class="h-full smooth-transition ${q.completed ? 'bg-emerald-500' : 'bg-indigo-500'}" style="width: ${pct}%"></div>
            </div>
        `;
        DOM.dailyQuestsContainer.appendChild(card);
    });

    // 2. Badges Rendering
    DOM.badgesContainer.innerHTML = '';
    BADGE_CATALOG.forEach(b => {
        const isUnlocked = STATE.unlockedBadges.includes(b.id);
        const badgeEl = document.createElement('div');
        badgeEl.className = `h-9 rounded-lg border flex items-center justify-center relative smooth-transition group cursor-pointer ${isUnlocked ? b.color + ' shadow-sm' : 'bg-[#090d16] border-slate-900 text-slate-700'}`;
        badgeEl.innerHTML = `
            <i data-lucide="${isUnlocked ? b.icon : 'lock'}" class="w-4 h-4"></i>
            <!-- Hover Tooltip -->
            <div class="absolute bottom-full mb-2 hidden group-hover:block z-50 w-36 p-2 bg-[#090e18] border border-slate-800 rounded-lg text-[9px] text-left leading-normal shadow-xl">
                <strong class="text-slate-200 block">${b.title}</strong>
                <span class="text-slate-500 block mt-0.5">${b.desc}</span>
                <span class="block mt-1 font-bold ${isUnlocked ? 'text-emerald-400' : 'text-slate-600'}">${isUnlocked ? '已解鎖' : '未達成'}</span>
            </div>
        `;
        DOM.badgesContainer.appendChild(badgeEl);
    });

    lucide.createIcons();
}

// 📅 INTERACTIVE MONTHLY CALENDAR RENDER ENGINE
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
];

function renderCalendar() {
    const year = STATE.currentCalendarYear;
    const month = STATE.currentCalendarMonth;

    DOM.calendarMonthYear.innerText = `${MONTH_NAMES[month]} ${year}`;
    DOM.calendarDaysGrid.innerHTML = '';

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prevLastDay = new Date(year, month, 0).getDate();

    // Render Previous Month Days
    for (let i = firstDayIndex; i > 0; i--) {
        const prevDay = prevLastDay - i + 1;
        const dayCell = document.createElement('div');
        dayCell.className = "p-1.5 text-slate-800 text-[11px] text-center cursor-not-allowed select-none font-mono";
        dayCell.innerText = prevDay;
        DOM.calendarDaysGrid.appendChild(dayCell);
    }

    // Render Current Month Days
    for (let day = 1; day <= lastDay; day++) {
        const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTasks = STATE.tasks.filter(t => t.date === formattedDate);
        const dayTasksCount = dayTasks.length;
        const dayTasksDone = dayTasks.filter(t => t.done).length;

        const dayCell = document.createElement('div');
        const isSelected = STATE.selectedDate === formattedDate;

        let styleClass = "p-2 rounded-lg text-[11px] text-center cursor-pointer select-none relative hover:bg-indigo-500/10 border border-transparent font-mono smooth-transition ";
        if (isSelected) {
            styleClass += "bg-indigo-600/20 text-white font-bold border-indigo-500/40 shadow-sm";
        } else if (dayTasksCount > 0) {
            styleClass += "bg-slate-900/60 text-slate-300 border-white/[0.02]";
        } else {
            styleClass += "bg-[#090d16] text-slate-500";
        }

        dayCell.className = styleClass;
        
        let indicatorHtml = '';
        if (dayTasksCount > 0) {
            const allDone = dayTasksDone === dayTasksCount;
            const dotColor = allDone ? 'bg-emerald-500' : 'bg-indigo-400';
            indicatorHtml = `<span class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${dotColor}"></span>`;
        }

        dayCell.innerHTML = `
            <span>${day}</span>
            ${indicatorHtml}
        `;

        dayCell.addEventListener('click', () => {
            STATE.selectedDate = formattedDate;
            DOM.selectedDateDisplay.innerText = formattedDate;
            DOM.currentDateTitle.innerText = formattedDate;
            renderCalendar();
            renderDraftTasks();
        });

        DOM.calendarDaysGrid.appendChild(dayCell);
    }
}

DOM.btnCalendarPrev.addEventListener('click', () => {
    STATE.currentCalendarMonth--;
    if (STATE.currentCalendarMonth < 0) {
        STATE.currentCalendarMonth = 11;
        STATE.currentCalendarYear--;
    }
    renderCalendar();
});

DOM.btnCalendarNext.addEventListener('click', () => {
    STATE.currentCalendarMonth++;
    if (STATE.currentCalendarMonth > 11) {
        STATE.currentCalendarMonth = 0;
        STATE.currentCalendarYear++;
    }
    renderCalendar();
});

// Render Step 1 draft list filtered by selectedDate
function renderDraftTasks() {
    const filteredTasks = STATE.tasks.filter(t => t.date === STATE.selectedDate);

    DOM.taskCounter.innerText = filteredTasks.length;

    if (filteredTasks.length === 0) {
        DOM.draftTasksContainer.classList.add('hidden');
        DOM.tasksEmptyState.classList.remove('hidden');
        DOM.btnToStep2.disabled = true;
        DOM.btnToStep2.className = "bg-indigo-600/30 text-slate-500 cursor-not-allowed font-semibold py-1.5 px-3 rounded-lg smooth-transition flex items-center gap-1.5 text-xs";
        speakCoach(COACH_SPEECH.step1_empty, "等待任務輸入");
    } else {
        DOM.draftTasksContainer.classList.remove('hidden');
        DOM.tasksEmptyState.classList.add('hidden');
        DOM.btnToStep2.disabled = false;
        DOM.btnToStep2.className = "bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1.5 px-3.5 rounded-lg shadow-md hover:shadow-indigo-500/10 active:scale-95 smooth-transition flex items-center gap-1.5 text-xs";
        speakCoach(COACH_SPEECH.step1_hasTasks(filteredTasks.length), "準備好生成日程");

        DOM.draftTasksContainer.innerHTML = '';
        filteredTasks.forEach((task) => {
            const taskEl = document.createElement('div');
            taskEl.className = "flex items-start justify-between p-2.5 bg-[#090d16]/30 border border-slate-800/60 rounded-lg smooth-transition group";
            
            let tagColorClass = "bg-slate-900 border-slate-800 text-slate-400";
            if (task.category.includes('Work')) tagColorClass = "bg-blue-500/5 text-blue-400 border-blue-500/10";
            else if (task.category.includes('Personal')) tagColorClass = "bg-emerald-500/5 text-emerald-400 border-emerald-500/10";
            else if (task.category.includes('Health')) tagColorClass = "bg-teal-500/5 text-teal-400 border-teal-500/10";
            else if (task.category.includes('Finance')) tagColorClass = "bg-amber-500/5 text-amber-400 border-amber-500/10";
            else if (task.category.includes('Learning')) tagColorClass = "bg-purple-500/5 text-purple-400 border-purple-500/10";

            let badgesHtml = '';

            // Keyword tags
            if (task.keywordBoost > 0 && task.matchedKeywords) {
                task.matchedKeywords.forEach(match => {
                    badgesHtml += `
                        <span class="text-[9px] px-1.5 py-0.2 rounded border border-amber-500/15 text-amber-400 font-semibold flex items-center gap-0.5">
                            <i data-lucide="zap" class="w-2.5 h-2.5"></i>${match.category} (+${match.weight})
                        </span>
                    `;
                });
            }

            // Attributes tags
            if (task.attributes && task.attributes.length > 0) {
                task.attributes.forEach(attr => {
                    const info = ATTR_VALUES[attr];
                    if (info) {
                        badgesHtml += `
                            <span class="text-[9px] px-1.5 py-0.2 rounded ${info.style} border font-semibold">
                                ${info.label.substring(2)} (+${info.boost})
                            </span>
                        `;
                    }
                });
            }

            taskEl.innerHTML = `
                <div class="flex items-start gap-2.5 min-w-0 flex-grow mr-2">
                    <span class="w-2 h-2 rounded-full bg-slate-800 group-hover:bg-indigo-500 smooth-transition mt-1.5 shrink-0"></span>
                    <div class="flex mt-1.5 shrink-0"></div>
                    <div class="flex flex-col min-w-0 gap-0.5">
                        <div class="flex flex-wrap items-center gap-1.5">
                            <span class="text-xs font-bold text-slate-200 truncate">${escapeHtml(task.title)}</span>
                            <span class="text-[8px] px-1.5 py-0.2 rounded border ${tagColorClass} font-medium tracking-wide w-max shrink-0">${task.category}</span>
                            <span class="text-[8px] px-1.5 py-0.2 rounded bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 font-bold">預估: ${task.score}分</span>
                        </div>
                        ${task.description ? `<p class="text-[10px] text-slate-500 leading-normal italic line-clamp-1">${escapeHtml(task.description)}</p>` : ''}
                        ${badgesHtml ? `<div class="flex flex-wrap gap-1 mt-1">${badgesHtml}</div>` : ''}
                    </div>
                </div>
                <button class="text-slate-600 hover:text-rose-400 p-0.5 hover:bg-rose-500/5 rounded smooth-transition shrink-0" onclick="deleteDraftTask('${task.id}')">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            `;
            DOM.draftTasksContainer.appendChild(taskEl);
        });
        lucide.createIcons();
    }
}

// Add task logic with AUTO-WEIGHTING
DOM.taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = DOM.taskTitleInput.value.trim();
    const description = DOM.taskDescriptionInput.value.trim();
    const category = DOM.taskCategoryInput.value;
    if (!title) return;

    const keywordAnalysis = calculateKeywordBoost(title, description);
    const selectedAttrList = Array.from(STATE.activeAttributes);
    const attrAnalysis = calculateAttributeBoost(selectedAttrList);

    const urgentScore = (selectedAttrList.includes('deadline') || keywordAnalysis.matched.some(m => m.category === '緊急')) ? 5 : 2;
    const importantScore = (selectedAttrList.includes('impact') || selectedAttrList.includes('growth') || keywordAnalysis.matched.some(m => m.category === '學術')) ? 5 : 2;

    const calculatedScore = 5 + keywordAnalysis.boost + attrAnalysis.boost;

    const newTask = {
        id: 't-' + Math.random().toString(36).substr(2, 9),
        title,
        description,
        category,
        urgent: urgentScore,
        important: importantScore,
        score: calculatedScore,
        done: false,
        date: STATE.selectedDate, // Tag with selected Calendar date
        keywordBoost: keywordAnalysis.boost,
        matchedKeywords: keywordAnalysis.matched,
        attributes: selectedAttrList,
        attributeBoost: attrAnalysis.boost,
        stepsCompleted: false,
        steps: [] // Empty AI steps list initially
    };

    STATE.tasks.push(newTask);
    saveToStorage();
    renderDraftTasks();
    renderCalendar();

    // Trigger XP Gain representation (+50 XP for dumping brain dump task)
    earnXP(50, DOM.taskForm);

    // Reset Fields
    DOM.taskTitleInput.value = '';
    DOM.taskDescriptionInput.value = '';
    
    STATE.activeAttributes.clear();
    DOM.pillToggles.forEach(pill => {
        pill.classList.remove('border-indigo-500/40', 'text-indigo-300', 'bg-indigo-950/15');
        pill.classList.add('border-slate-800', 'text-slate-400', 'bg-[#0b0f19]');
        pill.querySelector('.marker-dot').className = "w-1.5 h-1.5 rounded-full bg-slate-700 marker-dot";
    });

    DOM.taskTitleInput.focus();
});

// Operations callbacks
window.deleteDraftTask = function(id) {
    STATE.tasks = STATE.tasks.filter(t => t.id !== id);
    saveToStorage();
    renderDraftTasks();
    renderCalendar();
};

DOM.clearAllDrafts.addEventListener('click', () => {
    // Clear only for selected Date
    STATE.tasks = STATE.tasks.filter(t => t.date !== STATE.selectedDate);
    saveToStorage();
    renderDraftTasks();
    renderCalendar();
});

// Simple Navigation Controller
function changeStep(step) {
    STATE.currentStep = step;
    saveToStorage();

    DOM.wizardPanels.forEach((panel, i) => {
        if (i === step - 1) {
            panel.classList.remove('hidden');
        } else {
            panel.classList.add('hidden');
        }
    });

    // Step indicators
    DOM.stepNodes.forEach((node) => {
        const nodeStep = parseInt(node.getAttribute('data-step'));
        const icon = node.querySelector('.step-icon');
        const label = node.querySelector('.step-label');

        if (nodeStep === step) {
            node.classList.add('active');
            icon.className = "w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] bg-indigo-600 text-white step-icon shadow-sm shadow-indigo-600/10";
            label.className = "text-xs font-bold text-white step-label";
        } else if (nodeStep < step) {
            node.classList.remove('active');
            icon.className = "w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 step-icon";
            label.className = "text-xs font-semibold text-emerald-400 step-label";
        } else {
            node.classList.remove('active');
            icon.className = "w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] bg-slate-900 border border-slate-800 text-slate-500 step-icon";
            label.className = "text-xs font-medium text-slate-500 step-label";
        }
    });

    DOM.stepConnectors.forEach((conn) => {
        const connIdx = parseInt(conn.getAttribute('data-connector'));
        if (connIdx < step) {
            conn.className = "h-[1px] bg-indigo-500/50 flex-grow max-w-xs step-connector";
        } else {
            conn.className = "h-[1px] bg-slate-800 flex-grow max-w-xs step-connector";
        }
    });

    if (step === 1) {
        renderCalendar();
        renderDraftTasks();
    } else if (step === 2) {
        generateActionPlan();
    }
}

DOM.btnToStep2.addEventListener('click', () => changeStep(2));
DOM.btnBackToStep1.addEventListener('click', () => changeStep(1));

DOM.stepNodes.forEach(node => {
    node.addEventListener('click', () => {
        const targetStep = parseInt(node.getAttribute('data-step'));
        if (targetStep > 1 && STATE.tasks.length === 0) return;
        changeStep(targetStep);
    });
});

// ACTION PLAN
function generateActionPlan() {
    speakCoach(COACH_SPEECH.step2, "戰略清單已安排");

    if (STATE.isDashboardMatrixView) {
        DOM.dashboardEisenhowerGrid.classList.remove('hidden');
        DOM.dashboardRankedList.classList.add('hidden');
        renderEisenhowerMatrix();
    } else {
        DOM.dashboardEisenhowerGrid.classList.add('hidden');
        DOM.dashboardRankedList.classList.remove('hidden');
        renderRankedList();
    }

    // Refresh UI overlay states if AI step panel was already active
    if (STATE.lastAiStepsTaskId) {
        const t = STATE.tasks.find(x => x.id === STATE.lastAiStepsTaskId);
        if (t && t.steps && t.steps.length > 0) {
            renderChecklistSteps(t);
        }
    }

    updateActionPlanStats();
}

function renderEisenhowerMatrix() {
    DOM.quadrantDo.innerHTML = '';
    DOM.quadrantSchedule.innerHTML = '';
    DOM.quadrantDelegate.innerHTML = '';
    DOM.quadrantEliminate.innerHTML = '';

    const quadrants = { do: [], schedule: [], delegate: [], eliminate: [] };

    // Only map tasks belonging to the currently selected Date
    const dateTasks = STATE.tasks.filter(t => t.date === STATE.selectedDate);

    dateTasks.forEach(task => {
        const u = task.urgent || 2;
        const i = task.important || 2;

        if (u >= 4 && i >= 4) quadrants.do.push(task);
        else if (i >= 4 && u < 4) quadrants.schedule.push(task);
        else if (u >= 4 && i < 4) quadrants.delegate.push(task);
        else quadrants.eliminate.push(task);
    });

    const createMatrixTaskEl = (task) => {
        const div = document.createElement('div');
        div.className = `p-2.5 rounded-lg border flex flex-col gap-1 transition-all ${
            task.done 
            ? 'bg-slate-900/20 border-slate-900/60 text-slate-600 line-through' 
            : 'bg-[#090d16]/65 border-slate-800 text-slate-300 shadow-sm'
        }`;

        let attrsBadges = '';
        if (task.attributes && task.attributes.length > 0) {
            task.attributes.forEach(attr => {
                const info = ATTR_VALUES[attr];
                if (info) {
                    attrsBadges += `<span class="text-[8px] px-1 py-0.2 rounded ${info.style} border">${info.label.substring(2)}</span>`;
                }
            });
        }

        div.innerHTML = `
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                    <input type="checkbox" ${task.done ? 'checked' : ''} class="task-checkbox rounded border-slate-800 text-indigo-600 bg-transparent h-3.5 w-3.5 cursor-pointer focus:ring-0" onchange="toggleTaskDone('${task.id}', this)">
                    <span class="text-[11px] font-bold truncate max-w-[150px]">${escapeHtml(task.title)}</span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    <button class="text-indigo-400 hover:text-indigo-300 p-0.5" title="AI拆解步驟" onclick="fetchAiActionSteps('${task.id}')">
                        <i data-lucide="sparkles" class="w-3 h-3"></i>
                    </button>
                    <button class="text-slate-600 hover:text-rose-400 p-0.5" onclick="deleteTaskFinal('${task.id}')">
                        <i data-lucide="trash-2" class="w-3 h-3"></i>
                    </button>
                </div>
            </div>
            ${attrsBadges ? `<div class="flex flex-wrap gap-1 mt-0.5">${attrsBadges}</div>` : ''}
        `;
        return div;
    };

    const emptyMsg = '<div class="text-[9px] text-slate-700 italic py-3 text-center">無登錄</div>';

    if (quadrants.do.length === 0) DOM.quadrantDo.innerHTML = emptyMsg;
    else quadrants.do.forEach(t => DOM.quadrantDo.appendChild(createMatrixTaskEl(t)));

    if (quadrants.schedule.length === 0) DOM.quadrantSchedule.innerHTML = emptyMsg;
    else quadrants.schedule.forEach(t => DOM.quadrantSchedule.appendChild(createMatrixTaskEl(t)));

    if (quadrants.delegate.length === 0) DOM.quadrantDelegate.innerHTML = emptyMsg;
    else quadrants.delegate.forEach(t => DOM.quadrantDelegate.appendChild(createMatrixTaskEl(t)));

    if (quadrants.eliminate.length === 0) DOM.quadrantEliminate.innerHTML = emptyMsg;
    else quadrants.eliminate.forEach(t => DOM.quadrantEliminate.appendChild(createMatrixTaskEl(t)));

    lucide.createIcons();
}

function renderRankedList() {
    DOM.rankedTasksList.innerHTML = '';
    const dateTasks = STATE.tasks.filter(t => t.date === STATE.selectedDate);
    const sorted = [...dateTasks].sort((a, b) => b.score - a.score);

    if (sorted.length === 0) {
        DOM.rankedTasksList.innerHTML = '<div class="text-slate-600 text-center py-8 text-[11px]">傾倒池空無一物。</div>';
        return;
    }

    sorted.forEach((task, index) => {
        const div = document.createElement('div');
        
        let rankBadgeClass = "bg-slate-900 text-slate-500 border border-slate-800";
        if (index === 0) rankBadgeClass = "bg-indigo-950/40 text-indigo-400 border border-indigo-500/25 font-bold";
        else if (index === 1) rankBadgeClass = "bg-slate-900 text-slate-300 border border-slate-800";

        let scoreDetails = `<span class="text-xs font-semibold text-slate-200">${task.score} 分</span>`;
        const breakdownStr = `基礎5 + 關鍵字${task.keywordBoost || 0} + 屬性${task.attributeBoost || 0}`;
        scoreDetails += `<span class="text-[8px] text-slate-600 block leading-tight mt-0.5">${breakdownStr}</span>`;

        let taskAttrsBadgeHtml = '';
        if (task.attributes && task.attributes.length > 0) {
            task.attributes.forEach(attr => {
                const info = ATTR_VALUES[attr];
                if (info) {
                    taskAttrsBadgeHtml += `<span class="text-[8px] px-1 py-0.2 rounded ${info.style} border font-medium">${info.label.substring(2)}</span>`;
                }
            });
        }

        if (task.keywordBoost > 0 && task.matchedKeywords) {
            task.matchedKeywords.forEach(match => {
                taskAttrsBadgeHtml += `<span class="text-[8px] px-1 py-0.2 rounded border border-amber-500/10 text-amber-400 font-medium">⚡ ${match.category}</span>`;
            });
        }

        const isCompleted = task.done;

        div.className = `flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border transition-all gap-2 ${
            isCompleted 
            ? 'bg-slate-950/10 border-slate-900 text-slate-600 line-through' 
            : 'bg-[#090d16]/40 border-slate-800/80 hover:border-slate-800 text-slate-300'
        }`;

        div.innerHTML = `
            <div class="flex items-center gap-3 flex-grow mr-2 min-w-0">
                <div class="px-2 py-0.5 text-[10px] rounded ${rankBadgeClass} shrink-0">
                    #${index + 1}
                </div>
                <input type="checkbox" ${isCompleted ? 'checked' : ''} class="task-checkbox rounded border-slate-800 text-indigo-600 bg-transparent h-3.5 w-3.5 cursor-pointer focus:ring-0 shadow-sm" onchange="toggleTaskDone('${task.id}', this)">
                <div class="flex flex-col min-w-0">
                    <span class="text-xs font-bold truncate leading-relaxed ${isCompleted ? 'text-slate-600' : 'text-slate-200'}">${escapeHtml(task.title)}</span>
                    ${task.description ? `<span class="text-[10px] text-slate-500 truncate italic">${escapeHtml(task.description)}</span>` : ''}
                    <div class="flex flex-wrap items-center gap-1 mt-0.5">
                        <span class="text-[8px] text-slate-600 font-semibold">分類: ${task.category.substring(2)}</span>
                        ${taskAttrsBadgeHtml}
                    </div>
                </div>
            </div>
            <div class="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t border-slate-900 md:border-none pt-1.5 md:pt-0">
                <div class="text-right shrink-0 leading-tight">${scoreDetails}</div>
                <div class="flex items-center gap-1.5">
                    <button class="bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/15 text-indigo-300 hover:text-white px-2 py-1 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-colors" onclick="fetchAiActionSteps('${task.id}')">
                        <i data-lucide="sparkles" class="w-3 h-3"></i> AI步驟
                    </button>
                    <button class="text-slate-600 hover:text-rose-400 p-1 hover:bg-rose-500/5 rounded transition-colors" onclick="deleteTaskFinal('${task.id}')">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
            </div>
        `;
        DOM.rankedTasksList.appendChild(div);
    });

    lucide.createIcons();
}

// FETCH AI ACTION STEPS with Exponential Backoff
async function fetchAiActionSteps(taskId) {
    const task = STATE.tasks.find(t => t.id === taskId);
    if (!task) return;

    STATE.lastAiStepsTaskId = taskId;

    DOM.aiStepsPanel.classList.remove('hidden');
    DOM.aiStepsTaskTitle.innerText = task.title;
    DOM.aiStepsLoading.classList.remove('hidden');
    DOM.aiStepsList.innerHTML = '';
    
    DOM.aiStepsPanel.scrollIntoView({ behavior: 'smooth', block: 'end' });

    // If steps already fetched/stored, render them instantly (No need to repeat API)
    if (task.steps && task.steps.length > 0) {
        DOM.aiStepsLoading.classList.add('hidden');
        renderChecklistSteps(task);
        return;
    }

    const systemPrompt = "你是一位高效能專家。請針對使用者提供的任務，拆解出最多5個具體、易執行的行動步驟。請用繁體中文回答，並且完全不寫 any 引言或說明，格式必須精簡。";
    const userQuery = `任務名稱: "${task.title}"\n補充描述: "${task.description || '無'}"`;

    const apiKey = ""; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    steps: {
                        type: "ARRAY",
                        description: "Up to 5 concrete actionable items.",
                        items: { type: "STRING" }
                    }
                },
                required: ["steps"]
            }
        }
    };

    let retries = 5;
    let delay = 1000;
    let success = false;
    let resultJson = null;

    while (retries > 0 && !success) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                resultJson = await response.json();
                success = true;
            } else {
                throw new Error(`API error code ${response.status}`);
            }
        } catch (err) {
            retries--;
            if (retries === 0) {
                console.error("Gemini 2.5 API final failure", err);
            } else {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; 
            }
        }
    }

    DOM.aiStepsLoading.classList.add('hidden');

    let loadedSteps = [];
    if (success && resultJson) {
        try {
            const candidate = resultJson.candidates?.[0]?.content?.parts?.[0]?.text;
            const parsed = JSON.parse(candidate);
            loadedSteps = (parsed.steps || []).slice(0, 5);
        } catch(e) {
            loadedSteps = getFallbackSteps(task);
        }
    } else {
        loadedSteps = getFallbackSteps(task);
    }

    // Map to step items objects
    task.steps = loadedSteps.map((stepText, index) => ({
        id: `${task.id}-step-${index}`,
        text: stepText,
        done: false
    }));

    // Trigger AI disassembly XP (+30 XP)
    earnXP(30, DOM.aiStepsPanel);

    saveToStorage();
    renderProgressionHUD();
    renderChecklistSteps(task);
}

function getFallbackSteps(task) {
    return [
        `規劃空間：為「${task.title}」排定本日專屬 20 分鐘開始空檔。`,
        `資源對接：蒐集此項任務可能需要的對口、工具或網頁連結。`,
        `直覺切入：找出最簡單、花費力氣最少的一步優先著手。`,
        `阻隔分心：開啟手機專注模式，保持連續運作 25 分鐘。`,
        `落款審查：驗收此階段所完成的成效，並勾選完工徽章！`
    ];
}

// Checklist rendering for Steps with XP awards on each checkbox!
function renderChecklistSteps(task) {
    DOM.aiStepsList.innerHTML = '';
    
    if (!task.steps || task.steps.length === 0) {
        DOM.aiStepsList.innerHTML = `<p class="text-[10px] text-slate-500 italic p-2 text-center">未能順利生成步驟。</p>`;
        return;
    }

    task.steps.forEach((step, idx) => {
        const stepEl = document.createElement('div');
        stepEl.className = `flex items-start gap-2.5 p-2 rounded-lg smooth-transition ${step.done ? 'bg-emerald-950/10 border border-emerald-500/10 text-slate-500 line-through' : 'bg-[#0c121e]/40 border border-white/[0.01] text-slate-300'}`;
        
        stepEl.innerHTML = `
            <input type="checkbox" ${step.done ? 'checked' : ''} class="step-checkbox rounded border-slate-800 text-indigo-500 bg-transparent h-3.5 w-3.5 mt-0.5 cursor-pointer focus:ring-0" onchange="toggleSubStepDone('${task.id}', '${step.id}', this)">
            <p class="text-[11px] leading-normal flex-grow">${escapeHtml(step.text)}</p>
        `;
        DOM.aiStepsList.appendChild(stepEl);
    });
}

// Sub-step completion logic (+10 XP per step item)
window.toggleSubStepDone = function(taskId, stepId, checkboxElement) {
    const task = STATE.tasks.find(t => t.id === taskId);
    if (!task) return;

    const step = task.steps.find(s => s.id === stepId);
    if (step) {
        step.done = checkboxElement.checked;
        
        if (step.done) {
            earnXP(10, checkboxElement);
        }

        // Check if all sub-steps completed to award completion bonus (+50 XP!)
        const allStepsDone = task.steps.every(s => s.done);
        if (allStepsDone && !task.stepsCompleted) {
            task.stepsCompleted = true;
            earnXP(50, DOM.aiStepsPanel);
            speakCoach("恭喜！您已完美實踐所有 AI 行動指南，獲得額外行動獎勵 +50 XP!", "解構步驟完工");
        } else if (!allStepsDone) {
            task.stepsCompleted = false;
        }

        saveToStorage();
        renderChecklistSteps(task);
        renderProgressionHUD();
    }
};

DOM.btnCloseAiSteps.addEventListener('click', () => {
    DOM.aiStepsPanel.classList.add('hidden');
    STATE.lastAiStepsTaskId = null;
});

function updateActionPlanStats() {
    const dateTasks = STATE.tasks.filter(t => t.date === STATE.selectedDate);

    if (dateTasks.length === 0) {
        DOM.statTop.innerText = "目前無待辦事項";
        DOM.statCompletion.innerText = "0% (0 / 0)";
        return;
    }

    const sorted = [...dateTasks].sort((a, b) => b.score - a.score);
    DOM.statTop.innerText = sorted[0] ? sorted[0].title : "無登錄項目";

    const completed = dateTasks.filter(t => t.done).length;
    const total = dateTasks.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    DOM.statCompletion.innerText = `${pct}% (${completed} / ${total})`;
}

// Complete main task (+100 XP)
window.toggleTaskDone = function(id, checkboxElement) {
    const task = STATE.tasks.find(t => t.id === id);
    if (task) {
        task.done = checkboxElement.checked;
        
        if (task.done) {
            earnXP(100, checkboxElement);
        }
        
        saveToStorage();
        generateActionPlan();
        renderCalendar();
    }
};

window.deleteTaskFinal = function(id) {
    STATE.tasks = STATE.tasks.filter(t => t.id !== id);
    saveToStorage();
    generateActionPlan();
    renderCalendar();
};

DOM.btnToggleView.addEventListener('click', () => {
    STATE.isDashboardMatrixView = !STATE.isDashboardMatrixView;
    saveToStorage();
    generateActionPlan();
});

// Safe double-click reset
let resetConfirmState = false;
DOM.btnResetApp.addEventListener('click', () => {
    if (!resetConfirmState) {
        resetConfirmState = true;
        DOM.btnResetApp.innerHTML = `<i data-lucide="alert-triangle" class="w-3 h-3 text-rose-400"></i> 再點一次確認`;
        lucide.createIcons();
        setTimeout(() => {
            resetConfirmState = false;
            DOM.btnResetApp.innerHTML = `<i data-lucide="rotate-ccw" class="w-3 h-3"></i> 重置數據`;
            lucide.createIcons();
        }, 3000);
    } else {
        STATE.tasks = [];
        STATE.currentStep = 1;
        STATE.userXP = 0;
        STATE.userLevel = 1;
        STATE.unlockedBadges = [];
        STATE.streakCount = 1;
        STATE.selectedDate = '2026-05-19';
        STATE.currentCalendarYear = 2026;
        STATE.currentCalendarMonth = 4;
        STATE.quests.forEach(q => { q.current = 0; q.completed = false; });
        saveToStorage();
        changeStep(1);
        resetConfirmState = false;
        DOM.btnResetApp.innerHTML = `<i data-lucide="rotate-ccw" class="w-3 h-3"></i> 重置數據`;
        lucide.createIcons();
    }
});

DOM.btnFinish.addEventListener('click', () => {
    speakCoach("卓越的工作排程！持續跟進你的黃金行動案，迎接無負荷的心靈清明期！", "今日日程圓滿定案");
    flashWindowCelebration();
});

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Data Exporter
DOM.btnExportList.addEventListener('click', () => {
    const dateTasks = STATE.tasks.filter(t => t.date === STATE.selectedDate);
    if (dateTasks.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
    csvContent += "排程日期 (Date),排行 (Rank),任務名稱 (Task Name),分類 (Category),優先評分 (Score),狀態 (Status)\n";

    const sorted = [...dateTasks].sort((a, b) => b.score - a.score);
    sorted.forEach((task, index) => {
        const row = `"${task.date}","${index + 1}","${task.title.replace(/"/g, '""')}","${task.category}","${task.score}","${task.done ? '已完成' : '待執行'}"`;
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FocusFlow_智慧排程_${STATE.selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

function flashWindowCelebration() {
    const originalBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#0d1527'; 
    setTimeout(() => {
        document.body.style.backgroundColor = originalBg;
    }, 250);
}

// Synthesizer notification feedback SFX on Level Up
function playSfxNotification() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Delightful rising double chime (C5 then G5)
        const chime1 = ctx.createOscillator();
        const chime2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        chime1.type = 'triangle';
        chime1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        
        chime2.type = 'sine';
        chime2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.15); // G5

        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

        chime1.connect(gainNode);
        chime2.connect(gainNode);
        gainNode.connect(ctx.destination);

        chime1.start();
        chime2.start();

        chime1.stop(ctx.currentTime + 0.3);
        chime2.stop(ctx.currentTime + 0.6);
    } catch(e) {}
}

window.onload = function () {
    const loaded = loadFromStorage();
    checkStreakLog();
    if (loaded) {
        changeStep(STATE.currentStep);
    } else {
        changeStep(1);
    }
    renderProgressionHUD();
    lucide.createIcons();
};