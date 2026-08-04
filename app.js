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
  reviewScores: [6, 7, 5, 8, 6, 7, 8],
  vocab: [],
  currentDictation: null
};

let data = JSON.parse(JSON.stringify(DEFAULT_DATA));
let currentTaskTab = 'daily';
let currentEnTab = 'listen';
let selectedDate = null;
let tempInspImage = null;
let tempCurrentCover = null;
let tempEditCover = null;
// 纯本地模式：数据存浏览器 localStorage，无云端依赖

function init() {
  bindEvents();
  updateGreeting();
  loadData();
  renderAll();
  updateAIStatus();
  hideBootFallback();
}

function renderAll() {
  renderCalendar();
  renderAgenda();
  renderTasks();
  renderCountdowns();
  renderCurrentBook();
  renderInspirations();
  renderBooks();
  renderFriends();
  renderQuickMemos();
  renderReview();
  renderPhrases();
  renderVocab();
  renderGovReport();
  renderNews();
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
}

/* 云端同步（Supabase）已移除：数据仅保存在浏览器 localStorage，双击 index.html 即可使用，无需登录或网络。 */

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
    el.onclick = () => selectCalendarDay(key);
    calendar.appendChild(el);
  }
}

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function selectCalendarDay(key) {
  selectedDate = key;
  renderAgenda();
}

function renderAgenda() {
  const key = selectedDate || fmtDate(new Date());
  const parts = key.split('-');
  const events = data.calendarEvents[key] || [];
  document.getElementById('agenda-title').textContent = `${parseInt(parts[1])}月${parseInt(parts[2])}日 日程`;
  const listHTML = events.length
    ? events.map(e => `
        <div class="cal-event">
          <input type="checkbox" ${e.done ? 'checked' : ''} onchange="toggleCalEvent('${key}', ${e.id})">
          <span class="${e.done ? 'done' : ''}">${escapeHtml(e.text)}</span>
          <span class="task-del" onclick="deleteCalEvent('${key}', ${e.id})">删</span>
        </div>`).join('')
    : '<p class="hint">这天还没有待办，右侧输入框里添加一条吧。</p>';
  document.getElementById('agenda-list').innerHTML = listHTML;
}

function addAgendaEvent() {
  const input = document.getElementById('agenda-new');
  const key = selectedDate || fmtDate(new Date());
  const text = input.value.trim();
  if (!text) return;
  if (!data.calendarEvents[key]) data.calendarEvents[key] = [];
  data.calendarEvents[key].push({ id: Date.now(), text, done: false });
  saveData();
  input.value = '';
  renderCalendar();
  renderAgenda();
}

function toggleCalEvent(key, id) {
  const e = (data.calendarEvents[key] || []).find(x => x.id === id);
  if (e) { e.done = !e.done; saveData(); renderCalendar(); renderAgenda(); }
}

function deleteCalEvent(key, id) {
  data.calendarEvents[key] = (data.calendarEvents[key] || []).filter(x => x.id !== id);
  if (data.calendarEvents[key].length === 0) delete data.calendarEvents[key];
  saveData();
  renderCalendar();
  renderAgenda();
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

/* ---------- 政报精读（CATTI 三口） ---------- */
const GOV_REPORT = [
  { theme: '经济',
    cn: '坚持稳中求进工作总基调，完整、准确、全面贯彻新发展理念，加快构建新发展格局，着力推动高质量发展。更好统筹发展和安全，推动经济实现质的有效提升和量的合理增长。',
    en: 'We should adhere to the general principle of pursuing progress while ensuring stability, fully and faithfully apply the new development philosophy on all fronts, accelerate our efforts to foster a new development pattern, and strive to promote high-quality development. We should better coordinate development and security, and pursue better-quality and appropriately greater economic growth.',
    terms: [['高质量发展','high-quality development'],['新发展格局','new development pattern'],['稳中求进','pursuing progress while ensuring stability'],['新发展理念','new development philosophy']] },
  { theme: '民生',
    cn: '实施就业优先战略，强化就业优先政策，健全就业公共服务体系。突出做好高校毕业生、农民工、退役军人等重点群体就业工作，加强困难群体就业兜底帮扶。',
    en: 'We will implement the employment-first strategy, strengthen employment-first policies, and improve the public employment service system. We will give priority to creating jobs for key groups such as college graduates, rural migrant workers, and ex-service members, and provide better support for groups facing difficulties in finding jobs.',
    terms: [['就业优先','employment first'],['高校毕业生','college graduates'],['农民工','rural migrant workers'],['兜底帮扶','basic support and assistance']] },
  { theme: '改革',
    cn: '坚持社会主义市场经济改革方向，坚持“两个毫不动摇”，充分发挥市场在资源配置中的决定性作用，更好发挥政府作用，营造市场化、法治化、国际化一流营商环境。',
    en: 'We will uphold the direction of reform toward a socialist market economy and the "two unwaverings." We will give full play to the decisive role of the market in allocating resources, better leverage the role of the government, and foster a world-class business environment that is market-oriented, law-based, and internationalized.',
    terms: [['两个毫不动摇','the Two Unswervings'],['营商环境','business environment'],['决定性作用','decisive role']] },
  { theme: '生态',
    cn: '推动经济社会发展绿色转型，协同推进降碳、减污、扩绿、增长。深入推进环境污染防治，提升生态系统多样性、稳定性、持续性，积极稳妥推进碳达峰碳中和。',
    en: 'We will pursue a green transition in economic and social development and take coordinated steps to cut carbon emissions, reduce pollution, expand green development, and pursue economic growth. We will deepen the prevention and control of environmental pollution, enhance the diversity, stability, and sustainability of our ecosystems, and steadily advance the peaking of carbon dioxide emissions and carbon neutrality.',
    terms: [['绿色转型','green transition'],['碳达峰碳中和','carbon peaking and carbon neutrality'],['降碳','cut carbon emissions'],['扩绿','expand green development']] },
  { theme: '科技',
    cn: '坚持创新在我国现代化建设全局中的核心地位，健全新型举国体制，强化国家战略科技力量。加快实现高水平科技自立自强，打赢关键核心技术攻坚战。',
    en: 'We will maintain innovation as the driving force behind China’s modernization, improve the new system for mobilizing resources nationwide, and strengthen China’s strategic scientific and technological strength. We will accelerate efforts to achieve greater self-reliance and strength in science and technology, and win the battle of key core technologies.',
    terms: [['科技自立自强','self-reliance and strength in science and technology'],['新型举国体制','new system for mobilizing resources nationwide'],['关键核心技术','key core technologies']] },
  { theme: '乡村振兴',
    cn: '全面推进乡村振兴，坚持农业农村优先发展，巩固拓展脱贫攻坚成果，加快建设农业强国。全方位夯实粮食安全根基，牢牢守住十八亿亩耕地红线。',
    en: 'We will comprehensively advance rural revitalization, give priority to agricultural and rural development, consolidate and expand our achievements in poverty alleviation, and accelerate the building of a strong agricultural country. We will reinforce the foundations of food security on all fronts and firmly hold the line of 1.8 billion mu of cultivated land.',
    terms: [['乡村振兴','rural revitalization'],['脱贫攻坚','poverty alleviation'],['粮食安全','food security'],['耕地红线','red line for cultivated land']] },
  { theme: '开放',
    cn: '推进高水平对外开放，稳步扩大规则、规制、管理、标准等制度型开放。推动共建“一带一路”高质量发展，维护多元稳定的国际经济格局和经贸关系。',
    en: 'We will promote high-level opening up, and steadily expand institutional opening up with regard to rules, regulations, management, and standards. We will promote the high-quality development of the Belt and Road Initiative, and safeguard a diversified and stable international economic landscape and foreign trade relations.',
    terms: [['制度型开放','institutional opening up'],['一带一路','the Belt and Road Initiative'],['高水平对外开放','high-level opening up']] },
  { theme: '教育',
    cn: '加快建设教育强国、科技强国、人才强国，坚持教育优先发展、科技自立自强、人才引领驱动。办好人民满意的教育，加快建设高质量教育体系。',
    en: 'We will accelerate the building of a strong educational system, a strong science and technology sector, and a strong human resource pool. We will continue to give high priority to the development of education, build self-reliance and strength in science and technology, and leverage the role of talent in driving development. We will develop education that meets the people’s expectations, and move faster to build a high-quality educational system.',
    terms: [['教育强国','a strong educational system'],['人才强国','a strong human resource pool'],['高质量教育体系','high-quality educational system']] }
];

/* ---------- 每日新闻（人民网观点/评论，构建时嵌入） ---------- */
const NEWS_DATA = [
  { tag: '时政', title: '以法治力度保障民生温度', summary: '检察机关贯通“检护民生”，聚焦劳动者、妇女、儿童、老人等重点群体权益，以一个个案件小切口做实社会治理大文章。', url: 'https://politics.people.com.cn/n1/2026/0803/c461001-40772532.html' },
  { tag: '社会', title: '一餐一饭照见老有所养', summary: '北京、浙江、河南多地探索养老助餐服务网络，把尊老敬老融入烟火日常，让乡村山区老人吃上热乎饭。', url: 'https://society.people.com.cn/n1/2026/0803/c1008-40772494.html' },
  { tag: '人民论坛', title: '以“思维革新”引领“发展向新”', summary: '从节能家电换新到垃圾资源化，理念革新带来发展思路创新；打破思维定式，换个角度看劣势与机遇。', url: 'https://data.people.com.cn/rmrb/20260803/pingLun/aebbf9cfaf644575a202191ee749997d' },
  { tag: '民生', title: '呵护乡村老人“舌尖上的幸福”', summary: '“十五五”规划提出优化养老服务供给，北京延庆、浙江江山、河南卢氏以各具特色方式升级农村养老助餐。', url: 'https://paper.people.com.cn/rmrb/pc/content/202608/03/content_30172761.html' },
  { tag: '科技', title: '砥砺初心使命 书写时代答卷（社论）', summary: '国产开源大模型全球累计下载量突破100亿次，印证中国人工智能在全球市场获得的广泛认可与独特竞争优势。', url: 'https://www.people.com.cn/' }
];

let currentGovIndex = 0;

function renderGovReport() {
  const DAY = 86400000;
  const epoch = Date.UTC(2026, 0, 1);
  const rawIndex = Math.floor((Date.now() - epoch) / (10 * DAY));
  currentGovIndex = rawIndex % GOV_REPORT.length;
  const g = GOV_REPORT[currentGovIndex];
  document.getElementById('gov-cn').textContent = g.cn;
  document.getElementById('gov-en').textContent = g.en;
  document.getElementById('gov-terms').innerHTML = g.terms.map(t => `<li><b>${escapeHtml(t[0])}</b> — ${escapeHtml(t[1])}</li>`).join('');
  const start = new Date(epoch + rawIndex * 10 * DAY);
  const end = new Date(epoch + (rawIndex + 1) * 10 * DAY);
  document.getElementById('gov-period').textContent = `本期（第 ${currentGovIndex + 1}/${GOV_REPORT.length} 篇）：${start.getMonth() + 1}月${start.getDate()}日 – ${end.getMonth() + 1}月${end.getDate()}日`;
}

function playGovReport() {
  const g = GOV_REPORT[currentGovIndex];
  if (g) speakText(g.en, 'en-US', 0.85);
}

function renderNews() {
  const list = document.getElementById('news-list');
  if (!list) return;
  list.innerHTML = NEWS_DATA.map((n, i) => `
    <div class="news-item">
      <span class="news-tag">${escapeHtml(n.tag)}</span>
      <h4 class="news-title">${escapeHtml(n.title)}</h4>
      <p>${escapeHtml(n.summary)}</p>
      <div class="news-actions">
        <button class="btn-small" onclick="readNews(${i})">▶ 朗读</button>
        <a class="news-link" href="${n.url}" target="_blank">阅读原文 →</a>
      </div>
    </div>`).join('');
}

function readNews(i) {
  const n = NEWS_DATA[i];
  if (n) speakText(n.title + '。' + n.summary, 'zh-CN', 1);
}

function speakText(text, lang, rate) {
  if (!('speechSynthesis' in window)) { alert('当前浏览器不支持语音朗读，可点“阅读原文”对照。'); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang || 'zh-CN';
  u.rate = rate || 1;
  window.speechSynthesis.speak(u);
}

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

function updateAIStatus() {
  const el = document.getElementById('ai-status');
  if (!el) return;
  if (getAIKey()) { el.textContent = 'AI · 已连接'; el.classList.add('on'); }
  else { el.textContent = 'AI · 未配置'; el.classList.remove('on'); }
}

function openAIConfig() {
  openModal('配置 AI（DeepSeek）', `
    <p style="margin:0 0 10px;color:var(--c2);font-size:13px;line-height:1.6;">把你的 DeepSeek API Key 粘贴到这里。Key 只存在你本机浏览器，页面直接调用 DeepSeek，不经过任何中间服务器。<br>获取：platform.deepseek.com → API Keys → 创建密钥。留空表示不修改。</p>
    <div class="form-group"><input type="password" id="aikey-input" placeholder="sk-..." value="${getAIKey()}" style="width:100%"></div>
    <div class="form-actions">
      <button class="btn-small" onclick="closeModal()">取消</button>
      <button class="btn-primary" onclick="submitAIKey()">保存</button>
    </div>`);
}

async function submitAIKey() {
  const key = document.getElementById('aikey-input').value.trim();
  if (!key) { closeModal(); return; }
  setAIKey(key);
  closeModal();
  updateAIStatus();
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

/* ---------- Dictation ---------- */
async function generateDictation() {
  const sys = '你是英语听写(Dictation)材料生成器，面向备考英语专业四级(TEM-4)的大学生。生成 80-120 词、难度贴近专四听力的短文(日常/校园/社会话题，用词不过于生僻)。句子结构清晰，便于逐句听写。仅输出 JSON：{"title":"材料标题","text":"英文正文"}，不要多余文字、不要解释、不要代码块标记。';
  const user = '请生成今天的 Dictation 材料。';
  setBtnLoading('gen-dictation-btn', true);
  try {
    const raw = await callAI(sys, user, 0.8);
    const json = extractJson(raw);
    const title = json.title || '今日 Dictation';
    const text = (json.text || raw).trim();
    document.getElementById('dictation-source').textContent = title;
    const dt = document.getElementById('dictation-text');
    dt.dataset.text = text;
    dt.textContent = text;
    dt.classList.add('hidden');
    document.getElementById('dict-play-btn').disabled = false;
    document.getElementById('dictation-answer').value = '';
    document.getElementById('dictation-result').classList.add('hidden');
    document.getElementById('dict-text-btn').textContent = '显示原文';
    data.currentDictation = { title, text, date: fmtDate(new Date()) };
    saveData();
  } catch (e) { alert(e.message); }
  finally { setBtnLoading('gen-dictation-btn', false); }
}

function extractJson(s) {
  try {
    const m = s.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  } catch (e) { return {}; }
}

function playDictation() {
  const text = document.getElementById('dictation-text').dataset.text || '';
  if (!text) return;
  if (!('speechSynthesis' in window)) { alert('当前浏览器不支持语音朗读，可点"显示原文"对照。'); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = parseFloat(document.getElementById('dict-rate').value) || 0.9;
  window.speechSynthesis.speak(u);
}

function toggleDictationText() {
  const dt = document.getElementById('dictation-text');
  const btn = document.getElementById('dict-text-btn');
  if (dt.classList.contains('hidden')) { dt.classList.remove('hidden'); btn.textContent = '隐藏原文'; }
  else { dt.classList.add('hidden'); btn.textContent = '显示原文'; }
}

function gradeDictation() {
  const text = document.getElementById('dictation-text').dataset.text || '';
  const answer = document.getElementById('dictation-answer').value.trim();
  if (!text) { alert('先点"AI 推送今日材料"生成内容。'); return; }
  if (!answer) { alert('先写点听写答案再判分。'); return; }
  const norm = s => s.toLowerCase().replace(/[^a-z\s']/g, ' ').split(/\s+/).filter(Boolean);
  const ref = norm(text);
  const ansSet = new Set(norm(answer));
  let hit = 0;
  ref.forEach(w => { if (ansSet.has(w)) hit++; });
  const score = ref.length ? Math.round(hit / ref.length * 100) : 0;
  const missed = [...new Set(ref.filter(w => !ansSet.has(w)))];
  missed.forEach(w => { if (!data.vocab.includes(w)) data.vocab.push(w); });
  saveData(); renderVocab();
  document.getElementById('dictation-result').innerHTML =
    '<strong>判分结果</strong><br>准确率：<b>' + score + '%</b>（' + hit + '/' + ref.length + ' 词）<br>' +
    (missed.length ? '未写对/缺失的词已加入生词本：' + escapeHtml(missed.join(', ')) : '全部命中，太棒了！');
  document.getElementById('dictation-result').classList.remove('hidden');
}

function renderVocab() {
  const ul = document.getElementById('word-list');
  if (!ul) return;
  ul.innerHTML = '';
  if (!data.vocab.length) { ul.innerHTML = '<li class="phrase-empty">还没有生词，判分后自动收集。</li>'; return; }
  data.vocab.forEach((w, i) => {
    const li = document.createElement('li');
    li.className = 'phrase-item';
    li.innerHTML = `<span>${escapeHtml(w)}</span><button class="phrase-del" onclick="deleteVocab(${i})">×</button>`;
    ul.appendChild(li);
  });
}

function deleteVocab(i) {
  data.vocab.splice(i, 1);
  saveData(); renderVocab();
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
