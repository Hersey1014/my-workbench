const DEFAULT_DATA = {
  profile: { nickname: '高清矿泉水' },
  tasks: {
    daily: [
      { id: 1, text: 'Dictation 一篇', done: false },
      { id: 2, text: '影子跟读 10 分钟', done: false },
      { id: 3, text: '阅读外刊 1 段', done: false }
    ],
    tendays: [
      { id: 101, text: '精读一篇经济学人', done: false },
      { id: 102, text: '完成一篇命题作文', done: false }
    ],
    semester: [
      { id: 201, text: '专四单词背完一轮', done: false },
      { id: 202, text: '教资科目二过完教材', done: false }
    ]
  },
  countdowns: [
    { id: 1, name: '专四考试', date: '2026-12-01' },
    { id: 2, name: '本学期结束', date: '2027-01-15' }
  ],
  calendarEvents: {
    '2026-07-31': [{ id: 999, text: '示例：交课程作业', done: false }]
  },
  currentBook: {
    title: '掌控习惯',
    author: 'James Clear',
    status: 'reading',
    progress: 45,
    rating: 4,
    startedAt: '2026-07-10',
    note: '',
    cover: ''
  },
  inspirations: [],
  phrases: [],
  books: [
    { title: '百年孤独', author: '马尔克斯', review: '魔幻现实主义的巅峰，三代人的孤独循环。', rating: 5, status: 'read', progress: 100, tags: ['小说', '经典'], cover: '' },
    { title: '掌控习惯', author: 'James Clear', review: '', rating: 0, status: 'reading', progress: 45, tags: ['自我提升'], cover: '' },
    { title: '人类简史', author: '尤瓦尔·赫拉利', review: '', rating: 0, status: 'want', progress: 0, tags: ['历史', '社科'], cover: '' }
  ],
  friends: [
    { name: '示例朋友', birthday: '2005-05-20', gifts: '喜欢科幻小说，送过《三体》' }
  ],
  quickMemos: [
    { text: '这是一个示例备忘', time: Date.now() }
  ],
  reviewScores: [6, 7, 5, 8, 6, 7, 8]
};

let data = JSON.parse(JSON.stringify(DEFAULT_DATA));
let currentTaskTab = 'daily';
let currentEnTab = 'listen';
let selectedDate = null;
let tempInspImage = null;
let tempCurrentCover = null;
let tempEditCover = null;
let supabase = null;
let currentUser = null;
let cloudEnabled = false;
let saveTimer = null;

function init() {
  bindEvents();
  updateGreeting();
  // 本地优先：先渲染，保证页面永远可用，不会被云端脚本/网络拖死
  loadData();
  renderAll();
  hideBootFallback();
  const cfg = window.APP_CONFIG || {};
  if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
    try {
      supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
      cloudEnabled = true;
      checkSession().catch(e => { console.warn('云端检查失败，保持本地模式', e); updateCloudStatus(); });
    } catch (e) {
      console.warn('Supabase 初始化失败，保持本地模式', e);
      cloudEnabled = false;
      updateCloudStatus();
    }
  } else {
    updateCloudStatus();
  }
}

function renderAll() {
  renderCalendar();
  renderTasks();
  renderCountdowns();
  renderCurrentBook();
  renderInspirations();
  renderBooks();
  renderFriends();
  renderQuickMemos();
  renderReview();
  renderPhrases();
  switchPage(location.hash.replace('#', '') || 'home');
  initEnglishContent();
}

function loadData() {
  try {
    const saved = localStorage.getItem('hdksWater-workspace');
    if (saved) {
      const parsed = JSON.parse(saved);
      data = Object.assign(JSON.parse(JSON.stringify(DEFAULT_DATA)), parsed);
      data.calendarEvents = parsed.calendarEvents || {};
    } else {
      saveData();
    }
  } catch (e) {
    console.warn('localStorage 不可用');
  }
}

function saveData() {
  try {
    localStorage.setItem('hdksWater-workspace', JSON.stringify(data));
  } catch (e) {}
  if (cloudEnabled && currentUser) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(pushCloud, 600);
  }
}

async function pushCloud() {
  const { error } = await supabase.from('app_state').upsert({ user_id: currentUser.id, data });
  if (error) { console.warn('云端保存失败', error); updateCloudStatus(true); }
}

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    await loadCloud();
    renderAll();
    hideAuth();
  } else {
    showAuth();
  }
  updateCloudStatus();
}

async function loadCloud() {
  try {
    const { data: row, error } = await supabase.from('app_state').select('data').eq('user_id', currentUser.id).maybeSingle();
    if (row && row.data) {
      data = Object.assign(JSON.parse(JSON.stringify(DEFAULT_DATA)), row.data);
      data.calendarEvents = row.data.calendarEvents || {};
      saveData();
    } else {
      pushCloud();
    }
  } catch (e) {
    console.warn('云端读取失败，回退本地', e);
    loadData();
  }
}

function showAuth() { document.getElementById('auth-overlay').classList.remove('hidden'); }
function hideAuth() { document.getElementById('auth-overlay').classList.add('hidden'); }
function showAuthError(msg) { document.getElementById('auth-error').textContent = msg || ''; }

async function authLogin() {
  showAuthError('');
  const email = document.getElementById('auth-email').value.trim();
  const pw = document.getElementById('auth-password').value;
  if (!email || !pw) { showAuthError('请填写邮箱和密码'); return; }
  const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
  if (error) { showAuthError(error.message); return; }
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session.user;
  await loadCloud();
  renderAll();
  hideAuth();
  updateCloudStatus();
}

async function authSignup() {
  showAuthError('');
  const email = document.getElementById('auth-email').value.trim();
  const pw = document.getElementById('auth-password').value;
  if (!email || !pw) { showAuthError('请填写邮箱和密码'); return; }
  const { error } = await supabase.auth.signUp({ email, password: pw });
  if (error) { showAuthError(error.message); return; }
  alert('注册成功！如开启邮箱验证，请先去邮箱点确认链接，再回来登录。\n登录后数据即开始云端同步。');
}

async function authLogout() {
  await supabase.auth.signOut();
  currentUser = null;
  updateCloudStatus();
  showAuth();
}

function updateCloudStatus(failed) {
  const el = document.getElementById('cloud-status');
  const lb = document.getElementById('logout-btn');
  if (currentUser) {
    el.textContent = failed ? '同步失败' : '云端已同步';
    el.classList.add('on');
    lb.classList.remove('hidden');
  } else if (cloudEnabled) {
    el.textContent = '未登录 · 点此同步';
    el.classList.remove('on');
    lb.classList.add('hidden');
  } else {
    el.textContent = '本地模式';
    el.classList.remove('on');
    lb.classList.add('hidden');
  }
}

function hideBootFallback() {
  const el = document.getElementById('boot-fallback');
  if (el) el.classList.add('hidden');
}

function bindEvents() {
  window.addEventListener('hashchange', () => {
    switchPage(location.hash.replace('#', '') || 'home');
  });

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });

  document.querySelectorAll('[data-tasktab]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTaskTab = btn.dataset.tasktab;
      document.querySelectorAll('[data-tasktab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.task-list').forEach(l => l.classList.add('hidden'));
      document.getElementById('task-list-' + currentTaskTab).classList.remove('hidden');
    });
  });

  document.querySelectorAll('[data-entab]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentEnTab = btn.dataset.entab;
      document.querySelectorAll('[data-entab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.en-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('en-' + currentEnTab).classList.add('active');
    });
  });

  document.getElementById('insp-img').addEventListener('change', previewInspImage);
}

function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(page);
  if (target) target.classList.add('active');
  else document.getElementById('home').classList.add('active');

  document.querySelectorAll('.nav-item').forEach(i => {
    i.classList.toggle('active', i.dataset.page === page);
  });
}

function updateGreeting() {
  const now = new Date();
  const h = now.getHours();
  let greet = '你好';
  if (h >= 5 && h < 11) greet = '早上好';
  else if (h >= 11 && h < 13) greet = '中午好';
  else if (h >= 13 && h < 18) greet = '下午好';
  else if (h >= 18 && h < 23) greet = '晚上好';
  else greet = '夜深了';
  document.getElementById('greeting').textContent = `${greet}，${data.profile.nickname}`;
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  document.getElementById('current-date').textContent = now.toLocaleDateString('zh-CN', options);
}

/* ---------- 日历 ---------- */
function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  document.getElementById('calendar-month').textContent = `${year}年${month + 1}月`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  const headers = ['日', '一', '二', '三', '四', '五', '六'];
  headers.forEach(h => {
    const el = document.createElement('div');
    el.className = 'calendar-header';
    el.textContent = h;
    calendar.appendChild(el);
  });

  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.className = 'calendar-day other';
    calendar.appendChild(el);
  }

  const todayKey = fmtDate(now);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const key = fmtDate(dateObj);
    const el = document.createElement('div');
    const hasEvent = data.calendarEvents[key] && data.calendarEvents[key].length > 0;
    el.className = 'calendar-day' + (key === todayKey ? ' today' : '') + (hasEvent ? ' has-event' : '');
    el.innerHTML = `<span>${d}</span>` + (hasEvent ? '<span class="dot"></span>' : '');
    el.onclick = () => openCalendarDay(key, d);
    calendar.appendChild(el);
  }
}

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function openCalendarDay(key, day) {
  selectedDate = key;
  const events = data.calendarEvents[key] || [];
  const listHTML = events.length
    ? events.map(e => `
        <div class="cal-event">
          <input type="checkbox" ${e.done ? 'checked' : ''} onchange="toggleCalEvent('${key}', ${e.id})">
          <span class="${e.done ? 'done' : ''}">${escapeHtml(e.text)}</span>
          <span class="task-del" onclick="deleteCalEvent('${key}', ${e.id})">删</span>
        </div>`).join('')
    : '<p class="hint">这天还没有待办</p>';

  openModal(`待办 · ${day}日`, `
    <div id="cal-event-list">${listHTML}</div>
    <div class="form-group" style="margin-top:14px">
      <label>添加待办</label>
      <div style="display:flex;gap:8px">
        <input type="text" id="cal-new-event" placeholder="输入这天要做的事" style="flex:1">
        <button class="btn-primary" onclick="addCalEvent('${key}')">添加</button>
      </div>
    </div>
  `);
}

function addCalEvent(key) {
  const input = document.getElementById('cal-new-event');
  const text = input.value.trim();
  if (!text) return;
  if (!data.calendarEvents[key]) data.calendarEvents[key] = [];
  data.calendarEvents[key].push({ id: Date.now(), text, done: false });
  saveData();
  openCalendarDay(key, parseInt(key.slice(8)));
  renderCalendar();
}

function toggleCalEvent(key, id) {
  const e = (data.calendarEvents[key] || []).find(x => x.id === id);
  if (e) { e.done = !e.done; saveData(); openCalendarDay(key, parseInt(key.slice(8))); renderCalendar(); }
}

function deleteCalEvent(key, id) {
  data.calendarEvents[key] = (data.calendarEvents[key] || []).filter(x => x.id !== id);
  if (data.calendarEvents[key].length === 0) delete data.calendarEvents[key];
  saveData();
  openCalendarDay(key, parseInt(key.slice(8)));
  renderCalendar();
}

/* ---------- 任务 ---------- */
function renderTasks() {
  ['daily', 'tendays', 'semester'].forEach(type => {
    const list = document.getElementById('task-list-' + type);
    list.innerHTML = '';
    data.tasks[type].forEach(task => {
      const li = document.createElement('li');
      li.innerHTML = `
        <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTask('${type}', ${task.id})">
        <span class="task-text ${task.done ? 'done' : ''}">${escapeHtml(task.text)}</span>
        <span class="task-del" onclick="deleteTask('${type}', ${task.id})">删除</span>
      `;
      list.appendChild(li);
    });
  });
}

function toggleTask(type, id) {
  const task = data.tasks[type].find(t => t.id === id);
  if (task) { task.done = !task.done; saveData(); renderTasks(); }
}

function deleteTask(type, id) {
  data.tasks[type] = data.tasks[type].filter(t => t.id !== id);
  saveData(); renderTasks();
}

function openTaskModal() {
  openModal('新建任务', `
    <div class="form-group"><label>任务内容</label><input type="text" id="task-text-input" placeholder="输入任务"></div>
    <div class="form-group">
      <label>任务类型</label>
      <select id="task-type-input">
        <option value="daily">日常任务</option>
        <option value="tendays">每十日任务</option>
        <option value="semester">本学期任务</option>
      </select>
    </div>
    <div class="form-actions">
      <button class="btn-small" onclick="closeModal()">取消</button>
      <button class="btn-primary" onclick="addTask()">添加</button>
    </div>`);
}

function addTask() {
  const text = document.getElementById('task-text-input').value.trim();
  const type = document.getElementById('task-type-input').value;
  if (!text) return;
  data.tasks[type].push({ id: Date.now(), text, done: false });
  saveData();
  currentTaskTab = type;
  closeModal();
  renderTasks();
  document.querySelectorAll('[data-tasktab]').forEach(b => b.classList.toggle('active', b.dataset.tasktab === type));
  document.querySelectorAll('.task-list').forEach(l => l.classList.add('hidden'));
  document.getElementById('task-list-' + type).classList.remove('hidden');
}

/* ---------- 倒计时 ---------- */
function renderCountdowns() {
  const list = document.getElementById('countdown-list');
  list.innerHTML = '';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  data.countdowns.forEach(item => {
    const target = new Date(item.date);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - now) / 86400000);
    const div = document.createElement('div');
    div.className = 'countdown-item';
    div.innerHTML = `
      <div>
        <div class="countdown-name">${escapeHtml(item.name)}</div>
        <div class="countdown-date">${item.date}</div>
      </div>
      <div class="countdown-days">${diff >= 0 ? diff + '天' : '已过'}</div>`;
    list.appendChild(div);
  });
}

function openCountdownModal() {
  openModal('添加倒计时', `
    <div class="form-group"><label>事件名称</label><input type="text" id="cd-name-input" placeholder="例如：专四考试"></div>
    <div class="form-group"><label>目标日期</label><input type="date" id="cd-date-input"></div>
    <div class="form-actions">
      <button class="btn-small" onclick="closeModal()">取消</button>
      <button class="btn-primary" onclick="addCountdown()">添加</button>
    </div>`);
}

function addCountdown() {
  const name = document.getElementById('cd-name-input').value.trim();
  const date = document.getElementById('cd-date-input').value;
  if (!name || !date) return;
  data.countdowns.push({ id: Date.now(), name, date });
  saveData(); closeModal(); renderCountdowns();
}

/* ---------- 正在读 ---------- */
function renderCurrentBook() {
  const b = data.currentBook;
  const statusMap = { reading: '在读', want: '想读', read: '读完' };
  const coverHTML = b.cover
    ? `<div class="book-cover book-cover-lg"><img src="${b.cover}" alt="封面"></div>`
    : `<div class="book-cover book-cover-lg"><span class="placeholder">${escapeHtml(b.title.slice(0, 4))}</span></div>`;
  document.getElementById('current-book').innerHTML = `
    ${coverHTML}
    <div class="book-info">
      <h3>${escapeHtml(b.title)}</h3>
      <p class="bi-author">${escapeHtml(b.author || '未知')}</p>
      <span class="status-badge">${statusMap[b.status] || '在读'}</span>
      ${b.rating ? `<div class="stars">${renderStars(b.rating)}</div>` : ''}
      <div class="progress-line">
        <div class="progress-bar"><div class="progress-fill" style="width:${b.progress || 0}%"></div></div>
        <span>${b.progress || 0}%</span>
      </div>
      ${b.startedAt ? `<p class="bi-meta">开始于 ${b.startedAt}</p>` : ''}
      <button class="btn-small" onclick="openReadingModal()">编辑</button>
    </div>`;
}

function openReadingModal() {
  const b = data.currentBook;
  tempCurrentCover = b.cover || '';
  openModal('编辑正在读', `
    <div class="form-group"><label>书名</label><input type="text" id="book-title-input" value="${escapeHtml(b.title)}"></div>
    <div class="form-group"><label>作者</label><input type="text" id="book-author-input" value="${escapeHtml(b.author)}"></div>
    <div class="form-group">
      <label>状态</label>
      <select id="book-status-input">
        <option value="reading" ${b.status==='reading'?'selected':''}>在读</option>
        <option value="want" ${b.status==='want'?'selected':''}>想读</option>
        <option value="read" ${b.status==='read'?'selected':''}>读完</option>
      </select>
    </div>
    <div class="form-group"><label>封面图片</label>
      <input type="file" id="book-cover-input" accept="image/*" onchange="previewCurrentCover(event)">
      <div id="book-cover-preview" style="margin-top:8px">${b.cover ? `<img src="${b.cover}" style="max-height:90px;border-radius:6px">` : '<span class="hint">暂无封面</span>'}</div>
      ${b.cover ? `<span class="task-del" style="font-size:11px" onclick="clearCurrentCover()">清除封面</span>` : ''}
    </div>
    <div class="form-group"><label>进度 (%)</label><input type="number" id="book-progress-input" value="${b.progress||0}" min="0" max="100"></div>
    <div class="form-group"><label>星级评分</label><input type="number" id="book-rating-input" value="${b.rating||0}" min="0" max="5"></div>
    <div class="form-group"><label>开始日期</label><input type="date" id="book-start-input" value="${b.startedAt||''}"></div>
    <div class="form-actions">
      <button class="btn-small" onclick="closeModal()">取消</button>
      <button class="btn-primary" onclick="saveCurrentBook()">保存</button>
    </div>`);
}

function previewCurrentCover(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    tempCurrentCover = ev.target.result;
    const wrap = document.getElementById('book-cover-preview');
    if (wrap) wrap.innerHTML = `<img src="${tempCurrentCover}" style="max-height:90px;border-radius:6px">`;
  };
  reader.readAsDataURL(file);
}

function clearCurrentCover() {
  tempCurrentCover = '';
  const wrap = document.getElementById('book-cover-preview');
  if (wrap) wrap.innerHTML = '<span class="hint">暂无封面</span>';
}

function saveCurrentBook() {
  data.currentBook.title = document.getElementById('book-title-input').value || '未设置';
  data.currentBook.author = document.getElementById('book-author-input').value;
  data.currentBook.status = document.getElementById('book-status-input').value;
  data.currentBook.progress = parseInt(document.getElementById('book-progress-input').value) || 0;
  data.currentBook.rating = parseInt(document.getElementById('book-rating-input').value) || 0;
  data.currentBook.startedAt = document.getElementById('book-start-input').value;
  data.currentBook.cover = tempCurrentCover || '';
  saveData(); closeModal(); renderCurrentBook();
}

/* ---------- 本地软件 ---------- */
function openObsidian() {
  window.open('obsidian://open', '_blank');
  setTimeout(() => alert('已尝试打开 Obsidian。\n如未响应，请确认已安装，或在 Obsidian 中手动打开 vault。'), 500);
}

function openPocketWriter() {
  alert('口袋写作为本地软件，网页无法直接启动。\n建议在桌面创建快捷方式，或固定到任务栏。');
}

/* ---------- 灵感 ---------- */
function previewInspImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    tempInspImage = ev.target.result;
    const preview = document.getElementById('insp-preview');
    preview.innerHTML = `<img src="${tempInspImage}" alt="灵感配图">`;
    preview.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function addInspiration() {
  const text = document.getElementById('insp-text').value.trim();
  if (!text && !tempInspImage) return;
  data.inspirations.unshift({ id: Date.now(), text, image: tempInspImage, time: Date.now() });
  saveData();
  document.getElementById('insp-text').value = '';
  document.getElementById('insp-img').value = '';
  tempInspImage = null;
  document.getElementById('insp-preview').innerHTML = '';
  document.getElementById('insp-preview').classList.add('hidden');
  renderInspirations();
}

function renderInspirations() {
  const list = document.getElementById('insp-list');
  list.innerHTML = '';
  data.inspirations.forEach(item => {
    const div = document.createElement('div');
    div.className = 'insp-item';
    div.innerHTML = `
      <p>${escapeHtml(item.text)}</p>
      ${item.image ? `<img src="${item.image}" alt="灵感配图">` : ''}
      <small>${new Date(item.time).toLocaleString('zh-CN')}</small>
      <span class="task-del" style="margin-left:12px" onclick="deleteInspiration(${item.id})">删除</span>`;
    list.appendChild(div);
  });
}

function deleteInspiration(id) {
  data.inspirations = data.inspirations.filter(i => i.id !== id);
  saveData(); renderInspirations();
}

async function analyzeInspirations() {
  if (data.inspirations.length === 0) { alert('还没有灵感，先记录几条吧。'); return; }
  const list = data.inspirations.map(i => '- ' + i.text).join('\n');
  const system = '你是一个灵感整理助手。用户给出若干灵感碎片，请：1)归纳 2-4 个主题类别；2)每个类别下点出可发展的选题方向；3)给出一条本周最值得深入的主题建议。用简洁中文、分点输出，不要寒暄。';
  const user = '以下是我的灵感碎片：\n' + list;
  setBtnLoading('ai-analyze-btn', true);
  try {
    const text = await callAI(system, user, 0.6);
    openModal('灵感分析', `<div class="ai-output">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`);
  } catch (e) { alert(e.message); }
  finally { setBtnLoading('ai-analyze-btn', false); }
}

/* ---------- 英语 ---------- */
const EN_CONTENT = {
  dictation: ['专四真题 Dictation（2018）—— 科技改变生活方式', 'BBC 6 Minute English —— The future of food', 'VOA Special English —— Young People and Farming'],
  speaking: ['EnglishPod 010 —— Hotel Check-in', '走遍美国 EP 1 —— 46 Linden Street', 'VOA Special English —— American Stories'],
  reading: ['经济学人：Why the world is becoming more allergic', '经济学人：The boom in private markets', '卫报：The art of doing nothing'],
  writing: ['Social media has changed the way people communicate. Do you agree?', 'Should university education be free for all students?', 'Write about a tradition in your family that you value.']
};

function initEnglishContent() {
  document.getElementById('dictation-source').textContent = EN_CONTENT.dictation[0];
  document.getElementById('speaking-source').textContent = EN_CONTENT.speaking[0];
  document.getElementById('read-article').textContent = EN_CONTENT.reading[0];
}

function loadDictation() {
  document.getElementById('dictation-source').textContent = EN_CONTENT.dictation[Math.floor(Math.random() * EN_CONTENT.dictation.length)];
}
function loadSpeaking() {
  document.getElementById('speaking-source').textContent = EN_CONTENT.speaking[Math.floor(Math.random() * EN_CONTENT.speaking.length)];
}
function loadArticle() {
  document.getElementById('read-article').textContent = EN_CONTENT.reading[Math.floor(Math.random() * EN_CONTENT.reading.length)];
}
async function generateTopic() {
  const sys = '你是英语写作老师，面向专四水平（未过）的大学生。请出一道适合 200-250 词的命题作文题，贴近生活、有话可写、能用到常见表达。只输出题目本身，不加解释。';
  const user = '请出一道今天的作文题。';
  setBtnLoading('gen-topic-btn', true);
  try {
    const t = await callAI(sys, user, 0.85);
    document.getElementById('writing-topic').textContent = t.trim();
  } catch (e) { alert(e.message); }
  finally { setBtnLoading('gen-topic-btn', false); }
}
async function correctWriting() {
  const topic = document.getElementById('writing-topic').textContent;
  const answer = document.getElementById('writing-answer').value.trim();
  if (!answer) { alert('先写一篇作文再批改哦。'); return; }
  const sys = '你是严格的英语写作批改老师，面向专四水平学生。请对作文批改并输出：1)总体评分（0-100）与一句总评；2)语法/拼写错误逐条指出并给出修改；3)结构与逻辑评价；4)3-5 个可积累的句型或短语建议。中文输出、条理清晰、分点。';
  const user = '题目：' + topic + '\n\n学生作文：\n' + answer;
  setBtnLoading('correct-btn', true);
  try {
    const fb = await callAI(sys, user, 0.3);
    document.getElementById('writing-feedback').innerHTML = '<strong>AI 批改</strong><br><br>' + escapeHtml(fb).replace(/\n/g, '<br>');
    document.getElementById('writing-feedback').classList.remove('hidden');
  } catch (e) { alert(e.message); }
  finally { setBtnLoading('correct-btn', false); }
}
async function savePhrases() {
  const answer = document.getElementById('writing-answer').value.trim();
  if (!answer) { alert('作文里没有内容可以整理。'); return; }
  const sys = '从下面这篇英语作文中提取 5-10 个实用、地道的短语或句型。每行一个，格式：短语 | 中文释义。只输出短语列表，不要解释或多余文字。';
  const user = answer;
  setBtnLoading('save-phrase-btn', true);
  try {
    const text = await callAI(sys, user, 0.3);
    const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
    let added = 0;
    lines.forEach(l => { if (!data.phrases.includes(l)) { data.phrases.push(l); added++; } });
    saveData(); renderPhrases();
    alert('已整理 ' + added + ' 个新短语到短语本。');
  } catch (e) { alert(e.message); }
  finally { setBtnLoading('save-phrase-btn', false); }
}

/* ---------- 书架 ---------- */
function renderBooks() {
  const list = document.getElementById('book-list');
  list.innerHTML = '';
  const statusMap = { reading: '在读', want: '想读', read: '读完' };
  data.books.forEach((book, idx) => {
    const div = document.createElement('div');
    div.className = 'book-card';
    div.onclick = () => showBookReview(idx);
    div.innerHTML = `
      ${book.cover ? `<div class="book-cover"><img src="${book.cover}" alt="封面"></div>` : `<div class="book-cover"><span class="placeholder">${escapeHtml(book.title.slice(0, 4))}</span></div>`}
      <h4>${escapeHtml(book.title)}</h4>
      <p class="bc-author">${escapeHtml(book.author)}</p>
      <span class="status-badge sm">${statusMap[book.status] || '想读'}</span>
      ${book.rating ? `<div class="stars sm">${renderStars(book.rating)}</div>` : '<div class="stars sm">未评</div>'}
      <div class="progress-line"><div class="progress-bar"><div class="progress-fill" style="width:${book.progress||0}%"></div></div></div>`;
    list.appendChild(div);
  });
}

function showBookReview(idx) {
  const book = data.books[idx];
  const statusMap = { reading: '在读', want: '想读', read: '读完' };
  tempEditCover = book.cover || '';
  openModal(book.title, `
    <div class="form-group"><label>作者</label><input type="text" id="edit-book-author" value="${escapeHtml(book.author)}"></div>
    <div class="form-group">
      <label>阅读状态</label>
      <select id="edit-book-status">
        <option value="reading" ${book.status==='reading'?'selected':''}>在读</option>
        <option value="want" ${book.status==='want'?'selected':''}>想读</option>
        <option value="read" ${book.status==='read'?'selected':''}>读完</option>
      </select>
    </div>
    <div class="form-group"><label>封面图片</label>
      <input type="file" id="edit-book-cover" accept="image/*" onchange="previewEditCover(event)">
      <div id="edit-book-cover-preview" style="margin-top:8px">${book.cover ? `<img src="${book.cover}" style="max-height:90px;border-radius:6px">` : '<span class="hint">暂无封面</span>'}</div>
      ${book.cover ? `<span class="task-del" style="font-size:11px" onclick="clearEditCover()">清除封面</span>` : ''}
    </div>
    <div class="form-group"><label>进度 (%)</label><input type="number" id="edit-book-progress" value="${book.progress||0}" min="0" max="100"></div>
    <div class="form-group"><label>星级评分 (0-5)</label><input type="number" id="edit-book-rating" value="${book.rating||0}" min="0" max="5"></div>
    <div class="form-group"><label>标签 (逗号分隔)</label><input type="text" id="edit-book-tags" value="${escapeHtml((book.tags||[]).join('，'))}"></div>
    <div class="form-group"><label>读后感</label><textarea id="edit-book-review">${escapeHtml(book.review)}</textarea></div>
    <div class="form-actions">
      <button class="btn-small" onclick="closeModal()">关闭</button>
      <button class="btn-primary" onclick="saveBookReview(${idx})">保存</button>
    </div>`);
}

function previewEditCover(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    tempEditCover = ev.target.result;
    const wrap = document.getElementById('edit-book-cover-preview');
    if (wrap) wrap.innerHTML = `<img src="${tempEditCover}" style="max-height:90px;border-radius:6px">`;
  };
  reader.readAsDataURL(file);
}

function clearEditCover() {
  tempEditCover = '';
  const wrap = document.getElementById('edit-book-cover-preview');
  if (wrap) wrap.innerHTML = '<span class="hint">暂无封面</span>';
}

function saveBookReview(idx) {
  data.books[idx].author = document.getElementById('edit-book-author').value;
  data.books[idx].status = document.getElementById('edit-book-status').value;
  data.books[idx].progress = parseInt(document.getElementById('edit-book-progress').value) || 0;
  data.books[idx].rating = parseInt(document.getElementById('edit-book-rating').value) || 0;
  data.books[idx].tags = document.getElementById('edit-book-tags').value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  data.books[idx].review = document.getElementById('edit-book-review').value;
  data.books[idx].cover = tempEditCover || '';
  saveData(); closeModal(); renderBooks();
}

function openBookModal() {
  openModal('添加书籍', `
    <div class="form-group"><label>书名</label><input type="text" id="new-book-title" placeholder="输入书名"></div>
    <div class="form-group"><label>作者</label><input type="text" id="new-book-author" placeholder="输入作者"></div>
    <div class="form-actions">
      <button class="btn-small" onclick="closeModal()">取消</button>
      <button class="btn-primary" onclick="addBook()">添加</button>
    </div>`);
}

function addBook() {
  const title = document.getElementById('new-book-title').value.trim();
  const author = document.getElementById('new-book-author').value.trim();
  if (!title) return;
  data.books.push({ title, author, review: '', rating: 0, status: 'want', progress: 0, tags: [], cover: '' });
  saveData(); closeModal(); renderBooks();
}

function renderStars(n) {
  n = Math.max(0, Math.min(5, n));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

/* ---------- 备忘 ---------- */
function renderFriends() {
  const list = document.getElementById('friend-list');
  list.innerHTML = '';
  data.friends.forEach((f, idx) => {
    const div = document.createElement('div');
    div.className = 'friend-item';
    div.innerHTML = `
      <h4>${escapeHtml(f.name)} <small>(${f.birthday})</small></h4>
      <p>${escapeHtml(f.gifts)}</p>
      <span class="task-del" onclick="editFriend(${idx})">编辑</span>
      <span class="task-del" onclick="deleteFriend(${idx})">删除</span>`;
    list.appendChild(div);
  });
}

function openFriendModal() {
  openModal('添加朋友', `
    <div class="form-group"><label>名字</label><input type="text" id="friend-name-input" placeholder="输入名字"></div>
    <div class="form-group"><label>生日</label><input type="date" id="friend-birthday-input"></div>
    <div class="form-group"><label>礼物/喜好备注</label><textarea id="friend-gifts-input" placeholder="例如：喜欢科幻小说，送过《三体》"></textarea></div>
    <div class="form-actions">
      <button class="btn-small" onclick="closeModal()">取消</button>
      <button class="btn-primary" onclick="addFriend()">添加</button>
    </div>`);
}

function addFriend() {
  const name = document.getElementById('friend-name-input').value.trim();
  if (!name) return;
  data.friends.push({ name, birthday: document.getElementById('friend-birthday-input').value, gifts: document.getElementById('friend-gifts-input').value.trim() });
  saveData(); closeModal(); renderFriends();
}

function editFriend(idx) {
  const f = data.friends[idx];
  openModal('编辑朋友', `
    <div class="form-group"><label>名字</label><input type="text" id="edit-friend-name" value="${escapeHtml(f.name)}"></div>
    <div class="form-group"><label>生日</label><input type="date" id="edit-friend-birthday" value="${f.birthday}"></div>
    <div class="form-group"><label>礼物/喜好备注</label><textarea id="edit-friend-gifts">${escapeHtml(f.gifts)}</textarea></div>
    <div class="form-actions">
      <button class="btn-small" onclick="closeModal()">取消</button>
      <button class="btn-primary" onclick="saveFriend(${idx})">保存</button>
    </div>`);
}

function saveFriend(idx) {
  data.friends[idx].name = document.getElementById('edit-friend-name').value;
  data.friends[idx].birthday = document.getElementById('edit-friend-birthday').value;
  data.friends[idx].gifts = document.getElementById('edit-friend-gifts').value;
  saveData(); closeModal(); renderFriends();
}

function deleteFriend(idx) {
  data.friends.splice(idx, 1);
  saveData(); renderFriends();
}

function renderQuickMemos() {
  const list = document.getElementById('quick-memo-list');
  list.innerHTML = '';
  data.quickMemos.forEach((m, idx) => {
    const div = document.createElement('div');
    div.className = 'quick-memo-item';
    div.innerHTML = `<p>${escapeHtml(m.text)}</p><small>${new Date(m.time).toLocaleString('zh-CN')}</small><span class="task-del" style="margin-left:12px" onclick="deleteQuickMemo(${idx})">删除</span>`;
    list.appendChild(div);
  });
}

function openQuickMemoModal() {
  openModal('新建备忘', `
    <div class="form-group"><label>内容</label><textarea id="quick-memo-input" placeholder="随手记点什么..."></textarea></div>
    <div class="form-actions">
      <button class="btn-small" onclick="closeModal()">取消</button>
      <button class="btn-primary" onclick="addQuickMemo()">保存</button>
    </div>`);
}

function addQuickMemo() {
  const text = document.getElementById('quick-memo-input').value.trim();
  if (!text) return;
  data.quickMemos.unshift({ text, time: Date.now() });
  saveData(); closeModal(); renderQuickMemos();
}

function deleteQuickMemo(idx) {
  data.quickMemos.splice(idx, 1);
  saveData(); renderQuickMemos();
}

/* ---------- AI 模块（DeepSeek 代理，key 不进前端） ---------- */
function setBtnLoading(id, loading) {
  const el = document.getElementById(id);
  if (!el) return;
  if (loading) { el.dataset.old = el.textContent; el.textContent = '思考中…'; el.disabled = true; }
  else { el.textContent = el.dataset.old || el.textContent; el.disabled = false; }
}

const AI_KEY_STORAGE = 'hdks-deepseek-key';
function getAIKey() { try { return localStorage.getItem(AI_KEY_STORAGE) || ''; } catch (e) { return ''; } }
function setAIKey(k) { try { localStorage.setItem(AI_KEY_STORAGE, k); } catch (e) {} }

async function ensureAI() {
  if (getAIKey()) return true;
  return await promptAIKey();
}

function promptAIKey() {
  return new Promise((resolve) => {
    openModal('配置 AI（DeepSeek）', `
      <p style="margin:0 0 10px;color:var(--c2);font-size:13px;line-height:1.6;">把你的 DeepSeek API Key 粘贴到这里。Key 只存在你本机浏览器，页面直接调用 DeepSeek，不经过任何中间服务器。<br>获取：platform.deepseek.com → API Keys → 创建密钥。</p>
      <div class="form-group"><input type="password" id="aikey-input" placeholder="sk-..." style="width:100%"></div>
      <div class="form-actions">
        <button class="btn-small" onclick="closeModal();window.__aiKeyResolve&&window.__aiKeyResolve(false)">取消</button>
        <button class="btn-primary" onclick="submitAIKey()">保存并继续</button>
      </div>`);
    window.__aiKeyResolve = resolve;
  });
}

async function submitAIKey() {
  const key = document.getElementById('aikey-input').value.trim();
  if (!key) { alert('请填写 Key'); return; }
  setAIKey(key);
  closeModal();
  if (window.__aiKeyResolve) { window.__aiKeyResolve(true); window.__aiKeyResolve = null; }
}

async function callAI(system, user, temperature) {
  temperature = (typeof temperature === 'number') ? temperature : 0.7;
  let key = getAIKey();
  if (!key) {
    if (!await ensureAI()) throw new Error('AI 未配置');
    key = getAIKey();
  }
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: temperature,
      stream: false
    })
  });
  if (r.status === 401) {
    setAIKey('');
    alert('DeepSeek 密钥无效，请重新填写。');
    if (await ensureAI()) return callAI(system, user, temperature);
    throw new Error('AI 未配置');
  }
  if (!r.ok) {
    let msg = 'AI 调用失败';
    try { const e = await r.json(); if (e.error && e.error.message) msg = e.error.message; } catch (e) {}
    throw new Error(msg);
  }
  const d = await r.json();
  return d.choices && d.choices[0] ? d.choices[0].message.content : '';
}

function renderPhrases() {
  const ul = document.getElementById('phrase-list');
  if (!ul) return;
  ul.innerHTML = '';
  if (!data.phrases.length) {
    ul.innerHTML = '<li class="phrase-empty">还没有短语，批改作文后点"整理可用短语"即可收集。</li>';
    return;
  }
  data.phrases.forEach((p, i) => {
    const li = document.createElement('li');
    li.className = 'phrase-item';
    li.innerHTML = `<span>${escapeHtml(p)}</span><button class="phrase-del" onclick="deletePhrase(${i})">×</button>`;
    ul.appendChild(li);
  });
}

function deletePhrase(i) {
  data.phrases.splice(i, 1);
  saveData(); renderPhrases();
}

/* ---------- 复盘 ---------- */
function renderReview() {
  const week = document.getElementById('review-week');
  const days = ['一', '二', '三', '四', '五', '六', '日'];
  week.innerHTML = '';
  data.reviewScores.forEach((score, idx) => {
    const div = document.createElement('div');
    div.className = 'review-day';
    div.innerHTML = `<div class="day-name">周${days[idx]}</div><div class="day-score">${score}</div>`;
    week.appendChild(div);
  });
}

async function generateReview() {
  const avg = (data.reviewScores.reduce((a, b) => a + b, 0) / data.reviewScores.length).toFixed(1);
  const doneDaily = data.tasks.daily.filter(t => t.done).length;
  const doneTen = data.tasks.tendays.filter(t => t.done).length;
  const doneSem = data.tasks.semester.filter(t => t.done).length;
  const sys = '你是个人成长复盘助手。根据用户本周数据生成周复盘：1)整体评价；2)做得好的；3)待改进的；4)下周 3 条具体可执行的建议。简洁中文、分点、不寒暄。';
  const user = `本周数据：评分均分 ${avg}/10；日常任务完成 ${doneDaily}/${data.tasks.daily.length}；每十日任务 ${doneTen}/${data.tasks.tendays.length}；本学期任务 ${doneSem}/${data.tasks.semester.length}；书架在读 ${data.books.filter(b => b.status === 'reading').length} 本；灵感记录 ${data.inspirations.length} 条；短语本 ${data.phrases.length} 条。`;
  setBtnLoading('gen-review-btn', true);
  try {
    const text = await callAI(sys, user, 0.5);
    document.getElementById('review-result').innerHTML = '<strong>AI 周复盘</strong><br><br>' + escapeHtml(text).replace(/\n/g, '<br>');
    document.getElementById('review-result').classList.remove('hidden');
  } catch (e) { alert(e.message); }
  finally { setBtnLoading('gen-review-btn', false); }
}

/* ---------- 弹窗 ---------- */
function openModal(title, bodyHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

init();
