const STORAGE_KEY = "faith_distilled_pins";
const QUEUE_STORAGE_KEY = "faith_distilled_recent_reads";
const SAVED_STORAGE_KEY = "faith_distilled_saved_reads";
const READ_STORAGE_KEY = "faith_distilled_read_urls";

const state = {
  activeTab: "read",
  boardsData: null,
  watchData: null,
  sourcesData: null,
  selectedPins: [],
  storyIndex: new Map(),
  storyOrder: [],
  recentReads: [],
  savedReads: [],
  readUrls: new Set(),
  currentStoryUrl: null,
};

const elements = {
  heroMeta: document.getElementById("hero-meta"),
  heroLead: document.getElementById("hero-lead"),
  heroStatus: document.getElementById("hero-status"),
  todayNewSection: document.getElementById("today-new-section"),
  todayNewSummary: document.getElementById("today-new-summary"),
  todayNewList: document.getElementById("today-new-list"),
  heroHighlights: document.getElementById("hero-highlights"),
  sidebarFrameTitle: document.getElementById("sidebar-frame-title"),
  sidebarFrameCopy: document.getElementById("sidebar-frame-copy"),
  sidebarFrameChips: document.getElementById("sidebar-frame-chips"),
  sidebarSnapshot: document.getElementById("sidebar-snapshot"),
  sidebarPlaybook: document.getElementById("sidebar-playbook"),
  boardTabs: document.getElementById("board-tabs"),
  contentPanels: document.getElementById("content-panels"),
  pinCount: document.getElementById("pin-count"),
  pinList: document.getElementById("pin-list"),
  editFocus: document.getElementById("edit-focus"),
  focusDialog: document.getElementById("focus-dialog"),
  focusGrid: document.getElementById("focus-grid"),
  queueCount: document.getElementById("queue-count"),
  savedList: document.getElementById("saved-list"),
  queueList: document.getElementById("queue-list"),
  readingDialog: document.getElementById("reading-dialog"),
  readingClose: document.getElementById("reading-close"),
  readingTitle: document.getElementById("reading-title"),
  readingMeta: document.getElementById("reading-meta"),
  readingSummary: document.getElementById("reading-summary"),
  readingWhy: document.getElementById("reading-why"),
  readingTags: document.getElementById("reading-tags"),
  readingPrev: document.getElementById("reading-prev"),
  readingNext: document.getElementById("reading-next"),
  readingSave: document.getElementById("reading-save"),
  readingToggleRead: document.getElementById("reading-toggle-read"),
  readingOpenOriginal: document.getElementById("reading-open-original"),
  cardTemplate: document.getElementById("board-card-template"),
};

function createStateCard(kicker, title, description) {
  const article = document.createElement("article");
  article.className = "state-card";
  article.innerHTML = `
    <p class="about-kicker">${kicker}</p>
    <h2>${title}</h2>
    <p>${description}</p>
  `;
  return article;
}

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${path}: ${response.status}`);
  }
  return response.json();
}

function formatGeneratedAt(value) {
  if (!value) return "刚刚";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function currentDisplayDateAsStoryDate() {
  if (!state.boardsData?.display_date) return "";
  return state.boardsData.display_date.replace("/", "-");
}

function collectTodayNewItems() {
  const targetDate = currentDisplayDateAsStoryDate();
  const seen = new Set();
  const items = [];
  ["read", "learn", "do", "skip"].forEach((boardId) => {
    (state.boardsData?.boards?.[boardId]?.items || []).forEach((item) => {
      if (item.date !== targetDate || !item.url || seen.has(item.url)) return;
      seen.add(item.url);
      items.push({ ...item, boardId });
    });
  });
  return items.slice(0, 6);
}

function summarizeTodayItems(items) {
  const summary = {
    total: items.length,
    zh: 0,
    international: 0,
    topSource: "",
  };

  const sourceCounts = new Map();
  items.forEach((item) => {
    if (item.language === "zh") {
      summary.zh += 1;
    } else {
      summary.international += 1;
    }
    sourceCounts.set(item.source, (sourceCounts.get(item.source) || 0) + 1);
  });

  const top = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  summary.topSource = top ? top[0] : "";
  return summary;
}

function loadPins(defaultPins) {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length) {
        return parsed;
      }
    } catch (error) {
      console.warn("Failed to parse saved pins", error);
    }
  }
  return defaultPins;
}

function savePins() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.selectedPins));
}

function loadRecentReads() {
  const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to parse recent reads", error);
    return [];
  }
}

function saveRecentReads() {
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(state.recentReads.slice(0, 8)));
}

function loadSavedReads() {
  const stored = localStorage.getItem(SAVED_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to parse saved reads", error);
    return [];
  }
}

function saveSavedReads() {
  localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(state.savedReads.slice(0, 12)));
}

function loadReadUrls() {
  const stored = localStorage.getItem(READ_STORAGE_KEY);
  if (!stored) return new Set();
  try {
    const parsed = JSON.parse(stored);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (error) {
    console.warn("Failed to parse read urls", error);
    return new Set();
  }
}

function saveReadUrls() {
  localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(state.readUrls).slice(0, 300)));
}

function normalizeStory(story, fallback = {}) {
  return {
    id: story.id || story.url || `${story.source || fallback.source}:${story.title}`,
    title: story.title,
    url: story.url,
    source: story.source || fallback.source || "未知来源",
    date: story.date || fallback.date || "",
    summary: story.summary || "",
    why:
      story.why ||
      fallback.why ||
      "这条内容进入当前栏目，是因为它能帮助你更快判断今天该优先读什么。",
    tags: story.tags || fallback.tags || [],
    language: story.language || fallback.language || "zh",
    board: story.board || fallback.board || "",
  };
}

function registerStory(story, fallback = {}) {
  const normalized = normalizeStory(story, fallback);
  if (normalized.url) {
    state.storyIndex.set(normalized.url, normalized);
  }
  return normalized;
}

function collectStories() {
  state.storyIndex = new Map();
  state.storyOrder = [];
  const { hero, boards } = state.boardsData;

  (hero.highlights || []).forEach((item) =>
    state.storyOrder.push(registerStory(item, {
      board: item.board,
      why: "这条内容被放上首页高亮，说明它是今天最值得先点开的起始阅读。",
    })),
  );

  ["learn", "read", "do", "skip"].forEach((boardId) => {
    (boards[boardId]?.items || []).forEach((item) =>
      state.storyOrder.push(registerStory(item, { board: boardId })),
    );
  });

  (state.watchData.entities || []).forEach((entity) => {
    (entity.related_items || []).forEach((item) =>
      state.storyOrder.push(registerStory(item, {
        board: entity.name,
        why: `这条内容被挂在「${entity.name}」专题下，说明它是理解这个专题最快的切入口。`,
        tags: [entity.name],
      })),
    );
  });
}

function renderHero() {
  const { hero, run_summary: runSummary, display_date: displayDate } = state.boardsData;
  elements.heroMeta.textContent = `${displayDate} 已更新 · ${hero.included_items} 条资讯进入首页`;
  elements.heroLead.textContent = hero.lead_summary || "";

  elements.heroStatus.innerHTML = `
    <article class="status-pill status-pill-good">
      <strong>${runSummary.successful_sources} 个来源正常</strong>
      <span>今天这份首页有内容支撑，不是空转出来的。</span>
    </article>
    <article class="status-pill ${runSummary.failed_sources ? "status-pill-warn" : ""}">
      <strong>${runSummary.failed_sources + runSummary.timed_out_sources} 个来源未更新</strong>
      <span>不影响你先看首页，后面再慢慢补齐。</span>
    </article>
  `;

  const todayItems = collectTodayNewItems();
  if (!todayItems.length) {
    elements.todayNewSection.hidden = true;
  } else {
    const todayStats = summarizeTodayItems(todayItems);
    elements.todayNewSection.hidden = false;
    elements.todayNewSummary.textContent = `今天新增 ${todayStats.total} 条，其中中文 ${todayStats.zh} 条、国际 ${todayStats.international} 条${todayStats.topSource ? `，最活跃来源是 ${todayStats.topSource}` : ""}。`;
    elements.todayNewList.innerHTML = todayItems
      .map(
        (item) => `
          <article class="today-new-item ${isRead(item.url) ? "is-read" : ""}">
            <div class="today-new-date">${item.date}</div>
            <div class="today-new-content">
              <a href="${item.url}" data-open-story="${item.url}">${item.title}</a>
              <div class="today-new-meta">${item.source} · ${renameTab(item.boardId)}</div>
              <div class="today-new-why">${item.why || "这条是今天新进入首页的内容。"}<\/div>
            </div>
          </article>
        `,
      )
      .join("");
  }

  elements.heroHighlights.innerHTML = (hero.highlights || [])
    .map(
      (item) => `
        <article class="highlight-card ${isRead(item.url) ? "is-read" : ""}">
          <div class="highlight-meta">
            <span>${renameTab(item.board)}</span>
            <span>${item.source}${item.date ? ` · ${item.date}` : ""}</span>
          </div>
          <h3><a href="${item.url}" data-open-story="${item.url}">${item.title}</a></h3>
          <p>${item.summary}</p>
        </article>
      `,
    )
    .join("");
}

function renderSidebar() {
  const { run_summary: runSummary, boards } = state.boardsData;
  const topBoard = ["learn", "read", "do", "skip"]
    .map((id) => ({ id, count: boards[id]?.items?.length || 0, label: boards[id]?.title || id }))
    .sort((a, b) => b.count - a.count)[0];

  elements.sidebarFrameTitle.textContent = "先看今天最值得读的内容，再决定要不要深入。";
  elements.sidebarFrameCopy.textContent =
    `今天一共整理出 ${state.boardsData.hero.included_items} 条内容，最适合先看的栏目是「${topBoard.label}」。如果你时间不多，就先从首页高亮和这个栏目开始。`;
  elements.sidebarFrameChips.innerHTML = [
    `成功源 ${runSummary.successful_sources}`,
    `失败源 ${runSummary.failed_sources}`,
    `超时 ${runSummary.timed_out_sources}`,
  ]
    .map((item) => `<span class="pin-chip">${item}</span>`)
    .join("");

  elements.sidebarFrameCopy.textContent += ` 这轮抓取成功 ${runSummary.successful_sources} 个来源，你已经读过 ${state.readUrls.size} 条。`;
}

function renameTab(tabId) {
  const names = {
    read: "今日必读",
    learn: "深度阅读",
    do: "今天可行动",
    watch: "我的关注",
    skip: "先放一放",
    sources: "信源",
    about: "说明",
    "值得读": "今日必读",
    "值得学": "深度阅读",
    "值得做": "今天可行动",
    "关注中": "我的关注",
    "先观察": "先放一放",
  };
  return names[tabId] || tabId;
}

function tabCount(tabId) {
  if (tabId === "watch") return state.selectedPins.length;
  if (tabId === "sources" || tabId === "about") return null;
  const board = state.boardsData.boards[tabId];
  return Array.isArray(board?.items) ? board.items.length : null;
}

function renderTabs() {
  const preferredOrder = ["read", "learn", "do", "watch", "skip", "sources", "about"];
  const orderedTabs = [...state.boardsData.tab_order].sort(
    (a, b) => preferredOrder.indexOf(a.id) - preferredOrder.indexOf(b.id),
  );

  elements.boardTabs.innerHTML = orderedTabs
    .map((tab) => {
      const count = tabCount(tab.id);
      return `
        <button
          type="button"
          class="board-tab ${tab.id === state.activeTab ? "active" : ""}"
          data-tab="${tab.id}"
        >
          <span>${renameTab(tab.id)}</span>
          ${count === null ? "" : `<span class="tab-count">${count}</span>`}
        </button>
      `;
    })
    .join("");
}

function createStoryCard(story) {
  const fragment = elements.cardTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".story-card");
  if (isRead(story.url)) {
    card.classList.add("is-read");
  }
  fragment.querySelector(".story-score").textContent = `${story.score} / 100`;
  fragment.querySelector(".story-date").textContent = story.date;

  const titleEl = fragment.querySelector(".story-title");
  if (story.url) {
    titleEl.innerHTML = `<a href="${story.url}" data-open-story="${story.url}">${story.title}</a>`;
  } else {
    titleEl.textContent = story.title;
  }

  fragment.querySelector(".story-summary").textContent = story.summary;
  fragment.querySelector(".story-why").textContent = story.why || "";
  fragment.querySelector(".story-source").textContent = `${story.source}${story.language === "zh" ? " · 中文" : " · 国际"}`;

  const tagWrap = fragment.querySelector(".story-tags");
  (story.tags || []).forEach((tag) => {
    const span = document.createElement("span");
    span.className = "story-tag";
    span.textContent = tag;
    tagWrap.appendChild(span);
  });

  return fragment;
}

function panelIntro(board) {
  const intro = document.createElement("article");
  intro.className = "panel-intro";
  intro.innerHTML = `
    <h2>${board.title}</h2>
    <p>${board.description}</p>
    ${board.editor_note ? `<div class="panel-note">${board.editor_note}</div>` : ""}
  `;
  return intro;
}

function createEmptyBoardCard(label) {
  return createStateCard(
    "EMPTY",
    `${label} 当前没有入选条目`,
    "这通常说明这类内容本轮没有命中，或者数据源暂时没有给出足够强的信号。",
  );
}

function renderBoardPanel(tabId) {
  const panel = document.createElement("section");
  panel.className = `board-panel ${tabId === state.activeTab ? "active" : ""}`;
  panel.id = `panel-${tabId}`;

  if (tabId === "watch") {
    panel.appendChild(renderWatchPanel());
    return panel;
  }

  if (tabId === "sources") {
    panel.appendChild(renderSourcesPanel());
    return panel;
  }

  if (tabId === "about") {
    panel.appendChild(renderAboutPanel());
    return panel;
  }

  const board = state.boardsData.boards[tabId];
  panel.appendChild(panelIntro(board));

  if (!board.items?.length) {
    const grid = document.createElement("div");
    grid.className = "story-grid";
    grid.appendChild(createEmptyBoardCard(board.title));
    panel.appendChild(grid);
    return panel;
  }

  const [leadStory, ...restStories] = board.items;
  const lead = document.createElement("article");
  lead.className = `lead-story ${isRead(leadStory.url) ? "is-read" : ""}`;
  lead.innerHTML = `
    <div class="lead-story-meta">
      <span>${leadStory.score} / 100</span>
      <span>${leadStory.date} · ${leadStory.source}</span>
    </div>
    <h3><a href="${leadStory.url}" data-open-story="${leadStory.url}">${leadStory.title}</a></h3>
    <p class="lead-story-summary">${leadStory.summary}</p>
    <p class="lead-story-why">${leadStory.why || ""}</p>
    <div class="story-tags">
      ${(leadStory.tags || []).map((tag) => `<span class="story-tag">${tag}</span>`).join("")}
    </div>
  `;
  panel.appendChild(lead);

  if (restStories.length) {
    const grid = document.createElement("div");
    grid.className = "story-grid";
    restStories.forEach((story) => grid.appendChild(createStoryCard(story)));
    panel.appendChild(grid);
  }

  return panel;
}

function renderWatchPanel() {
  const wrapper = document.createDocumentFragment();
  const board = state.boardsData.watch;

  wrapper.appendChild(panelIntro(board));

  const toolbar = document.createElement("article");
  toolbar.className = "watch-toolbar";
  toolbar.innerHTML = `
    <p>${board.toolbar_text}</p>
    <button type="button" class="ghost-button ghost-button-small" data-focus-action="edit">重新选择关注</button>
  `;
  wrapper.appendChild(toolbar);

  const grid = document.createElement("div");
  grid.className = "watch-grid";

  const selectedEntities = state.watchData.entities.filter((entity) =>
    state.selectedPins.includes(entity.id),
  );

  selectedEntities.forEach((entity) => {
    const card = document.createElement("article");
    card.className = "watch-card";

    const sourceLinks = (entity.sources || [])
      .map(
        (source) =>
          `<a class="story-tag" href="${source.url}" target="_blank" rel="noopener">${source.name}</a>`,
      )
      .join("");

    const relatedItems = (entity.related_items || [])
      .map(
        (item) => `
          <li class="${isRead(item.url) ? "is-read" : ""}">
            <a href="${item.url}" data-open-story="${item.url}">${item.title}</a>
            <span>${item.source} · ${item.date}</span>
            <p>${item.summary}</p>
          </li>
        `,
      )
      .join("");

    card.innerHTML = `
      <div class="watch-card-meta">
        <span>${entity.subtitle}</span>
        <span>${entity.topics.length} 个追踪切口</span>
      </div>
      <h3>${entity.name}</h3>
      <p class="watch-card-lead">${entity.lead}</p>
      <div class="watch-section">
        <h4>值得继续盯的切口</h4>
        <div class="watch-topics">${entity.topics
          .map((topic) => `<span class="story-tag">${topic}</span>`)
          .join("")}</div>
      </div>
      <div class="watch-section">
        <h4>今天提炼出的判断</h4>
        <ul class="watch-list">${entity.takeaways.map((line) => `<li>${line}</li>`).join("")}</ul>
      </div>
      <div class="watch-section">
        <h4>与这个专题最相关的条目</h4>
        ${
          relatedItems
            ? `<ul class="watch-article-list">${relatedItems}</ul>`
            : "<p class='muted-copy'>这条专题今天还没有命中足够强的条目，先保留主题和行动建议。</p>"
        }
      </div>
      <div class="watch-section">
        <h4>你可以立刻做什么</h4>
        <ul class="watch-list">${entity.actions.map((line) => `<li>${line}</li>`).join("")}</ul>
      </div>
      <div class="watch-section">
        <h4>推荐长期盯住的信源</h4>
        <div class="watch-topics">${sourceLinks}</div>
      </div>
    `;
    grid.appendChild(card);
  });

  if (!grid.children.length) {
    grid.appendChild(
      createStateCard(
        "NO TOPIC SELECTED",
        "先选几个你真正愿意长期追的主题。",
        "这个页面的价值不在于全看，而在于把你真正关心的专题，变成自己的稳定首页。",
      ),
    );
  }

  wrapper.appendChild(grid);
  return wrapper;
}

function renderSourcesPanel() {
  const wrapper = document.createDocumentFragment();

  const intro = document.createElement("article");
  intro.className = "panel-intro";
  intro.innerHTML = `
    <h2>${state.sourcesData.overview.title}</h2>
    <p>${state.sourcesData.overview.description}</p>
  `;
  wrapper.appendChild(intro);

  const health = state.sourcesData.health_summary;
  const healthBlock = document.createElement("article");
  healthBlock.className = "health-card";
  healthBlock.innerHTML = `
    <div class="health-card-top">
      <div>
        <p class="about-kicker">RUN HEALTH</p>
        <h2>这轮构建的健康状况</h2>
      </div>
      <p class="muted-copy">最近构建：${formatGeneratedAt(health.generated_at)}</p>
    </div>
    <div class="health-grid">
      <div class="health-metric"><strong>${health.entries_collected}</strong><span>条入库</span></div>
      <div class="health-metric"><strong>${health.successful_sources}</strong><span>成功源</span></div>
      <div class="health-metric"><strong>${health.failed_sources}</strong><span>失败源</span></div>
      <div class="health-metric"><strong>${health.timed_out_sources}</strong><span>超时源</span></div>
    </div>
  `;
  wrapper.appendChild(healthBlock);

  if (state.sourcesData.failure_spotlight?.length) {
    const failureBlock = document.createElement("article");
    failureBlock.className = "about-card";
    failureBlock.innerHTML = `
      <p class="about-kicker">CURRENT FAILURES</p>
      <h2>这轮还没跑通的来源</h2>
      <ul class="watch-list">
        ${state.sourcesData.failure_spotlight
          .map((item) => `<li><strong>${item.name}</strong>：${item.status}。${item.detail}</li>`)
          .join("")}
      </ul>
    `;
    wrapper.appendChild(failureBlock);
  }

  const featuredGrid = document.createElement("div");
  featuredGrid.className = "source-grid";
  state.sourcesData.featured_sources.forEach((source) => {
    const card = document.createElement("article");
    card.className = "source-card";
    card.innerHTML = `
      <div class="source-card-topline">
        <span class="source-rank">${source.rank}</span>
        <div class="source-pills">${source.tags
          .map((tag) => `<span class="source-pill">${tag}</span>`)
          .join("")}</div>
      </div>
      <h3><a href="${source.url}" target="_blank" rel="noopener">${source.name}</a></h3>
      <p class="source-summary">${source.summary}</p>
      <div class="source-kpis">
        ${source.kpis
          .map(
            (kpi) => `
              <div class="source-kpi">
                <strong>${kpi.value}</strong>
                <span>${kpi.label}</span>
              </div>
            `,
          )
          .join("")}
      </div>
      <div class="source-article-list">
        <h4>为什么值得长期盯</h4>
        <ul>${source.reasons.map((item) => `<li>${item}</li>`).join("")}</ul>
      </div>
    `;
    featuredGrid.appendChild(card);
  });
  wrapper.appendChild(featuredGrid);

  const groupsWrap = document.createElement("div");
  groupsWrap.className = "source-groups";
  groupsWrap.innerHTML = state.sourcesData.source_groups
    .map(
      (group) => `
        <article class="about-card">
          <p class="about-kicker">${group.label.toUpperCase()}</p>
          <h2>${group.label}来源</h2>
          <p>${group.description}</p>
          <div class="source-group-list">
            ${group.items
              .map(
                (item) => `
                  <div class="source-group-item">
                    <div class="source-group-main">
                      <h3><a href="${item.url}" target="_blank" rel="noopener">${item.name}</a></h3>
                      <p>${item.note}</p>
                    </div>
                    <div class="source-group-meta">
                      <span class="source-pill">${item.tier_label}</span>
                      <span class="source-pill">${item.status_label}</span>
                      <span class="source-pill">${item.ingress}</span>
                    </div>
                  </div>
                `,
              )
              .join("")}
          </div>
        </article>
      `,
    )
    .join("");
  wrapper.appendChild(groupsWrap);

  return wrapper;
}

function renderAboutPanel() {
  const panel = document.createElement("div");
  panel.className = "about-grid";
  panel.innerHTML = `
    <article class="about-card">
      <p class="about-kicker">HOW IT WORKS</p>
      <h2>先把构建链稳定住，再把编辑判断端出来。</h2>
      <p>当前版本已经按“本地生成 JSON → 静态前端读取”的方式拆开：</p>
      <ul>
        <li><code>lists/boards.json</code>：主看板内容与运行摘要。</li>
        <li><code>lists/watchlist.json</code>：长期专题、判断和相关条目摘录。</li>
        <li><code>lists/sources.json</code>：来源分层、精选信源和本轮健康状态。</li>
        <li>前端只负责渲染和本地关注状态，不依赖在线后端。</li>
      </ul>
    </article>
    <article class="about-card">
      <p class="about-kicker">PRODUCT LOGIC</p>
      <h2>我们不是想做一个“读得更多”的站，而是一个“更快抓到重点”的站。</h2>
      <p>所以产品逻辑不是把链接堆给你，而是先回答三件事：</p>
      <ul>
        <li>今天哪些内容值得先学，再慢慢消化。</li>
        <li>哪些动态只需要快速浏览，避免信息焦虑。</li>
        <li>哪些内容能今天就转成同工动作、选题或工作流。</li>
      </ul>
    </article>
    <article class="about-card">
      <p class="about-kicker">LOCAL & PUBLIC</p>
      <h2>本地跑得通，公网也能直接静态托管。</h2>
      <p>抓取和蒸馏留在本地脚本，静态产物发布到 <code>dist/</code>，就能交给任何零后端静态托管服务。</p>
      <ul>
        <li>本地：<code>./scripts/serve_local.sh</code></li>
        <li>构建：<code>python3 scripts/build_faith_distilled.py</code></li>
        <li>发布产物：<code>./scripts/publish_static_site.sh</code></li>
      </ul>
    </article>
  `;
  return panel;
}

function renderPins() {
  const selected = state.watchData.entities.filter((item) => state.selectedPins.includes(item.id));
  elements.pinCount.textContent = String(selected.length);
  elements.pinList.innerHTML = selected
    .map((item) => `<span class="pin-chip">${item.name}</span>`)
    .join("");
}

function renderQueue() {
  elements.queueCount.textContent = String(state.savedReads.length + state.recentReads.length);

  if (state.savedReads.length) {
    elements.savedList.innerHTML = `
      <p class="sidebar-label">稍后读</p>
      ${state.savedReads
        .map(
          (item) => `
            <button type="button" class="queue-item ${isRead(item.url) ? "is-read" : ""}" data-open-story="${item.url}">
              <strong>${item.title}</strong>
              <span>${item.source} · 稍后读 · ${isRead(item.url) ? "已读" : "未读"}</span>
            </button>
          `,
        )
        .join("")}
    `;
  } else {
    elements.savedList.innerHTML = "";
  }

  if (!state.recentReads.length) {
    elements.queueList.innerHTML = "<p class='muted-copy'>你今天打开过的内容，会在这里形成一条最近阅读轨迹。</p>";
    return;
  }

  elements.queueList.innerHTML = `
    <p class="sidebar-label">最近打开</p>
    ${state.recentReads
    .map(
      (item) => `
        <button type="button" class="queue-item ${isRead(item.url) ? "is-read" : ""}" data-open-story="${item.url}">
          <strong>${item.title}</strong>
          <span>${item.source} · ${item.date || "刚刚"} · ${isRead(item.url) ? "已读" : "未读"}</span>
        </button>
      `,
    )
    .join("")}
  `;
}

function findStoryIndex(url) {
  return state.storyOrder.findIndex((item) => item.url === url);
}

function isSaved(url) {
  return state.savedReads.some((item) => item.url === url);
}

function isRead(url) {
  return Boolean(url) && state.readUrls.has(url);
}

function markRead(url) {
  if (!url || state.readUrls.has(url)) return false;
  state.readUrls.add(url);
  saveReadUrls();
  return true;
}

function toggleRead(url) {
  if (!url) return;
  if (state.readUrls.has(url)) {
    state.readUrls.delete(url);
  } else {
    state.readUrls.add(url);
  }
  saveReadUrls();
}

function toggleSaved(url) {
  const story = state.storyIndex.get(url);
  if (!story) return;
  if (isSaved(url)) {
    state.savedReads = state.savedReads.filter((item) => item.url !== url);
  } else {
    state.savedReads = [story, ...state.savedReads.filter((item) => item.url !== url)].slice(0, 12);
  }
  saveSavedReads();
  renderQueue();
}

function updateReadingNav(storyUrl) {
  const index = findStoryIndex(storyUrl);
  const prev = index > 0 ? state.storyOrder[index - 1] : null;
  const next = index >= 0 && index < state.storyOrder.length - 1 ? state.storyOrder[index + 1] : null;

  elements.readingPrev.disabled = !prev;
  elements.readingNext.disabled = !next;
  elements.readingPrev.dataset.targetStory = prev?.url || "";
  elements.readingNext.dataset.targetStory = next?.url || "";
  elements.readingSave.textContent = isSaved(storyUrl) ? "移出待读" : "加入待读";
  elements.readingToggleRead.textContent = isRead(storyUrl) ? "标记未读" : "标记已读";
}

function renderFocusOptions() {
  elements.focusGrid.innerHTML = state.watchData.entities
    .map(
      (item) => `
        <label class="focus-option ${state.selectedPins.includes(item.id) ? "active" : ""}" data-id="${item.id}">
          <input type="checkbox" ${state.selectedPins.includes(item.id) ? "checked" : ""}>
          <div>
            <strong>${item.name}</strong>
            <span>${item.subtitle}</span>
          </div>
        </label>
      `,
    )
    .join("");
}

function openReadingDialog(storyUrl) {
  const story = state.storyIndex.get(storyUrl);
  if (!story) return;
  state.currentStoryUrl = storyUrl;

  state.recentReads = [story, ...state.recentReads.filter((item) => item.url !== story.url)].slice(0, 8);
  markRead(storyUrl);
  saveRecentReads();
  render();

  elements.readingTitle.textContent = story.title;
  elements.readingMeta.innerHTML = `
    <span>${story.source}</span>
    <span>${story.date || "最近"}</span>
    <span>${story.board || "精选阅读"}</span>
  `;
  elements.readingSummary.textContent =
    story.summary || "这条内容目前只有标题，建议直接点开原文补细节。";
  elements.readingWhy.textContent = story.why || "";
  elements.readingTags.innerHTML = (story.tags || [])
    .map((tag) => `<span class="story-tag">${tag}</span>`)
    .join("");
  elements.readingOpenOriginal.href = story.url;
  updateReadingNav(storyUrl);

  elements.readingDialog.showModal();
}

function renderPanels() {
  elements.contentPanels.innerHTML = "";
  state.boardsData.tab_order.forEach((tab) =>
    elements.contentPanels.appendChild(renderBoardPanel(tab.id)),
  );
}

function render() {
  collectStories();
  renderHero();
  renderSidebar();
  renderTabs();
  renderPins();
  renderQueue();
  renderPanels();
  renderFocusOptions();
}

async function boot() {
  try {
    const [boardsData, watchData, sourcesData] = await Promise.all([
      loadJson("lists/boards.json"),
      loadJson("lists/watchlist.json"),
      loadJson("lists/sources.json"),
    ]);

    state.boardsData = boardsData;
    state.watchData = watchData;
    state.sourcesData = sourcesData;
    state.selectedPins = loadPins(watchData.default_pins);
    state.recentReads = loadRecentReads();
    state.savedReads = loadSavedReads();
    state.readUrls = loadReadUrls();
    render();
  } catch (error) {
    console.error(error);
    elements.contentPanels.innerHTML = "";
    elements.contentPanels.appendChild(
      createStateCard(
        "LOAD ERROR",
        "页面数据加载失败。",
        `${error.message}。请确认本地服务已启动，或重新生成 lists/*.json。`,
      ),
    );
  }
}

elements.boardTabs.addEventListener("click", (event) => {
  const button = event.target.closest(".board-tab");
  if (!button) return;
  state.activeTab = button.dataset.tab;
  render();
});

document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-open-story]");
  if (link) {
    event.preventDefault();
    openReadingDialog(link.getAttribute("data-open-story"));
    return;
  }

  const trigger = event.target.closest("[data-focus-action='edit']");
  if (trigger) {
    elements.focusDialog.showModal();
  }
});

elements.editFocus.addEventListener("click", () => {
  elements.focusDialog.showModal();
});

elements.focusGrid.addEventListener("click", (event) => {
  const option = event.target.closest(".focus-option");
  if (!option) return;

  const id = option.dataset.id;
  if (state.selectedPins.includes(id)) {
    state.selectedPins = state.selectedPins.filter((item) => item !== id);
  } else {
    state.selectedPins = [...state.selectedPins, id];
  }

  if (!state.selectedPins.length && state.watchData.entities.length) {
    state.selectedPins = [state.watchData.entities[0].id];
  }

  savePins();
  render();
  elements.focusDialog.showModal();
});

elements.focusDialog.addEventListener("close", () => {
  render();
});

elements.readingClose.addEventListener("click", () => {
  elements.readingDialog.close();
});

elements.readingPrev.addEventListener("click", () => {
  const target = elements.readingPrev.dataset.targetStory;
  if (target) openReadingDialog(target);
});

elements.readingNext.addEventListener("click", () => {
  const target = elements.readingNext.dataset.targetStory;
  if (target) openReadingDialog(target);
});

elements.readingSave.addEventListener("click", () => {
  if (!state.currentStoryUrl) return;
  toggleSaved(state.currentStoryUrl);
  updateReadingNav(state.currentStoryUrl);
});

elements.readingToggleRead.addEventListener("click", () => {
  if (!state.currentStoryUrl) return;
  toggleRead(state.currentStoryUrl);
  render();
  updateReadingNav(state.currentStoryUrl);
});

boot();
