// =ファイルへんか= =ファイル変化= /app.js
'use strict';

/**
 * ここだけ最初に貼り替えてください。
 * anon public key / publishable key はブラウザに公開してOKな鍵です。
 * service_role key は絶対に書かないでください。
 */
const SUPABASE_URL = 'https://prfvftdqlzlilljhmlhf.supabase.co/rest/v1/;
const SUPABASE_ANON_KEY = 'sb_publishable_Gal-XIn205z_UlUU8iyyFw_2DGI08Vt';

const LOGIN_DOMAIN = '@shokurepo.local';
const STORAGE_BUCKET = 'post-images';
const MAX_IMAGE_EDGE = 1280;
const JPEG_QUALITY = 0.8;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const BADGE_DEFINITIONS = {
  first_post: {
    label: '初投稿',
    caption: '最初の食レポを投稿した証。',
    light: './badges/badge-first-post-light.svg',
    full: './badges/badge-first-post-full.svg',
    className: 'cyan'
  },
  post_10: {
    label: '10投稿達成',
    caption: '10件の食レポを積み上げた証。',
    light: './badges/badge-post-10-light.svg',
    full: './badges/badge-post-10-full.svg',
    className: 'gold'
  },
  kaikin_7: {
    label: '皆勤賞 7日',
    caption: '7日連続で投稿した証。',
    light: './badges/badge-kaikin-7-light.svg',
    full: './badges/badge-kaikin-7-full.svg',
    className: 'green'
  },
  kaikin_14: {
    label: '皆勤賞 14日',
    caption: '14日連続投稿のレジェンド。',
    light: './badges/badge-kaikin-14-light.svg',
    full: './badges/badge-kaikin-14-full.svg',
    className: 'gold'
  },
  comment_king_active: {
    label: 'コメント王 現役',
    caption: '今週もっともコメントしている王。',
    light: './badges/badge-comment-king-active-light.svg',
    full: './badges/badge-comment-king-active-full.svg',
    className: 'green'
  },
  comment_king_fallen: {
    label: 'コメント王 退位後',
    caption: '過去にコメント王になった者の廃墟版。',
    light: './badges/badge-comment-king-fallen-light.svg',
    full: './badges/badge-comment-king-fallen-full.svg',
    className: 'fallen'
  },
  reporter_active: {
    label: '現地特派員 現役',
    caption: '今週の投票数1位投稿の投稿者。',
    light: './badges/badge-reporter-active-light.svg',
    full: './badges/badge-reporter-active-full.svg',
    className: 'purple'
  },
  reporter_fallen: {
    label: '現地特派員 退位後',
    caption: '過去に現地特派員になった者の廃墟版。',
    light: './badges/badge-reporter-fallen-light.svg',
    full: './badges/badge-reporter-fallen-full.svg',
    className: 'fallen'
  }
};

const state = {
  currentUser: null,
  currentProfile: null,
  profiles: new Map(),
  genres: [],
  allPosts: [],
  homePosts: [],
  weeklyVotes: [],
  votesByPost: new Map(),
  myWeeklyVote: null,
  weeklyTitles: [],
  activeGenre: '',
  activeView: 'home',
  currentPostId: null,
  isEntering: false
};

const dom = {};
let toastTimer = null;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

document.addEventListener('DOMContentLoaded', init);

async function init() {
  cacheDom();
  bindEvents();
  renderConfigWarningIfNeeded();

  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
      await enterApp(user);
    } else {
      showLogin();
    }
  } catch (error) {
    console.error(error);
    showToast('ログイン状態の確認に失敗しました。', 'error');
    showLogin();
  }

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      await enterApp(session.user);
    }
    if (event === 'SIGNED_OUT') {
      leaveApp();
    }
  });
}

function cacheDom() {
  dom.toast = $('#toast');

  dom.loginView = $('#loginView');
  dom.loginForm = $('#loginForm');
  dom.usernameInput = $('#usernameInput');
  dom.passwordInput = $('#passwordInput');
  dom.loginButton = $('#loginButton');
  dom.loginMessage = $('#loginMessage');
  dom.configWarning = $('#configWarning');

  dom.appShell = $('#appShell');
  dom.navButtons = $$('.nav-btn, .nav-logo');
  dom.views = $$('.view');
  dom.sessionName = $('#sessionName');
  dom.logoutButton = $('#logoutButton');

  dom.goRanking = $('#goRanking');
  dom.goHall = $('#goHall');
  dom.genreForm = $('#genreForm');
  dom.genreSelect = $('#genreSelect');
  dom.genreSearchInput = $('#genreSearchInput');
  dom.genreDatalist = $('#genreDatalist');
  dom.clearGenreButton = $('#clearGenreButton');
  dom.homeWeekLabel = $('#homeWeekLabel');
  dom.homeStatus = $('#homeStatus');
  dom.postGrid = $('#postGrid');

  dom.postForm = $('#postForm');
  dom.postImageInput = $('#postImageInput');
  dom.postGenreSelect = $('#postGenreSelect');
  dom.postCommentInput = $('#postCommentInput');
  dom.postSubmitButton = $('#postSubmitButton');
  dom.postFormMessage = $('#postFormMessage');

  dom.rankingWeekLabel = $('#rankingWeekLabel');
  dom.rankingSummary = $('#rankingSummary');
  dom.rankingGrid = $('#rankingGrid');

  dom.profileHeader = $('#profileHeader');
  dom.profileStats = $('#profileStats');
  dom.profileBadges = $('#profileBadges');
  dom.profilePosts = $('#profilePosts');

  dom.reporterHall = $('#reporterHall');
  dom.legendHall = $('#legendHall');
  dom.commentKingHall = $('#commentKingHall');

  dom.postModal = $('#postModal');
  dom.postModalBackdrop = $('#postModalBackdrop');
  dom.modalClose = $('#modalClose');
  dom.modalImage = $('#modalImage');
  dom.modalGenre = $('#modalGenre');
  dom.modalAuthor = $('#modalAuthor');
  dom.modalDate = $('#modalDate');
  dom.modalText = $('#modalText');
  dom.modalVoteCount = $('#modalVoteCount');
  dom.voteButton = $('#voteButton');
  dom.commentsList = $('#commentsList');
  dom.commentForm = $('#commentForm');
  dom.commentInput = $('#commentInput');
  dom.commentSubmitButton = $('#commentSubmitButton');

  dom.badgeModal = $('#badgeModal');
  dom.badgeModalBackdrop = $('#badgeModalBackdrop');
  dom.badgeModalClose = $('#badgeModalClose');
  dom.badgeModalImage = $('#badgeModalImage');
  dom.badgeModalTitle = $('#badgeModalTitle');
  dom.badgeModalCaption = $('#badgeModalCaption');
}

function bindEvents() {
  dom.loginForm.addEventListener('submit', handleLogin);
  dom.logoutButton.addEventListener('click', handleLogout);

  dom.navButtons.forEach((button) => {
    button.addEventListener('click', () => showView(button.dataset.view));
  });

  dom.goRanking.addEventListener('click', () => showView('ranking'));
  dom.goHall.addEventListener('click', () => showView('hall'));

  dom.genreSelect.addEventListener('change', async () => {
    state.activeGenre = dom.genreSelect.value;
    dom.genreSearchInput.value = state.activeGenre;
    await reloadHomePosts();
  });

  dom.genreForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    state.activeGenre = dom.genreSearchInput.value.trim() || dom.genreSelect.value;
    await reloadHomePosts();
  });

  dom.clearGenreButton.addEventListener('click', async () => {
    state.activeGenre = '';
    dom.genreSearchInput.value = '';
    dom.genreSelect.value = '';
    await reloadHomePosts();
  });

  dom.postForm.addEventListener('submit', handlePostSubmit);

  dom.modalClose.addEventListener('click', closePostModal);
  dom.postModalBackdrop.addEventListener('click', closePostModal);
  dom.voteButton.addEventListener('click', handleVote);
  dom.commentForm.addEventListener('submit', handleCommentSubmit);

  dom.badgeModalClose.addEventListener('click', closeBadgeModal);
  dom.badgeModalBackdrop.addEventListener('click', closeBadgeModal);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closePostModal();
      closeBadgeModal();
    }
  });
}

async function handleLogin(event) {
  event.preventDefault();

  const username = dom.usernameInput.value.trim();
  const password = dom.passwordInput.value;

  if (!username || !password) {
    showInlineMessage(dom.loginMessage, 'ユーザー名とパスワードを入力してください。', 'error');
    return;
  }

  setButtonBusy(dom.loginButton, true, 'LOGIN...');

  const email = username.includes('@') ? username : `${username}${LOGIN_DOMAIN}`;
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password
  });

  setButtonBusy(dom.loginButton, false);

  if (error) {
    showInlineMessage(dom.loginMessage, 'ログイン失敗。IDかパスワードを確認してください。', 'error');
    return;
  }

  showInlineMessage(dom.loginMessage, 'ログイン成功。読み込み中...', 'success');
  if (data?.user) {
    await enterApp(data.user);
  }
}

async function handleLogout() {
  await supabaseClient.auth.signOut();
  leaveApp();
}

async function enterApp(user) {
  if (state.isEntering) return;
  state.isEntering = true;

  try {
    state.currentUser = user;
    dom.loginView.classList.add('hidden');
    dom.appShell.classList.remove('hidden');

    state.currentProfile = await ensureProfile(user);
    await refreshEverything({ render: false });
    await showView(state.activeView || 'home');

    showToast('ログインしました。', 'success');
  } catch (error) {
    console.error(error);
    showToast(`初期化に失敗しました: ${error.message}`, 'error');
  } finally {
    state.isEntering = false;
  }
}

function leaveApp() {
  state.currentUser = null;
  state.currentProfile = null;
  state.profiles = new Map();
  state.genres = [];
  state.allPosts = [];
  state.homePosts = [];
  state.weeklyVotes = [];
  state.votesByPost = new Map();
  state.myWeeklyVote = null;
  state.weeklyTitles = [];
  state.currentPostId = null;

  dom.appShell.classList.add('hidden');
  dom.loginView.classList.remove('hidden');
  closePostModal();
  closeBadgeModal();
}

function showLogin() {
  dom.loginView.classList.remove('hidden');
  dom.appShell.classList.add('hidden');
}

async function ensureProfile(user) {
  const username = getUsernameFromEmail(user.email);

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', user.id);

  if (error) throw error;
  if (data && data.length > 0) return data[0];

  const profile = {
    id: user.id,
    username,
    display_name: username,
    icon_url: '',
    bio: ''
  };

  const { data: inserted, error: insertError } = await supabaseClient
    .from('profiles')
    .insert(profile)
    .select();

  if (insertError) throw insertError;
  return inserted[0];
}

async function refreshEverything(options = {}) {
  try {
    await loadGenres();
    await loadProfiles();
    await loadAllPosts();
    await loadHomePosts();
    await loadWeeklyVotes();
    await recomputeWeeklyTitles();
    await loadWeeklyTitles();
    await refreshAchievementsForCurrentUser();

    renderGenres();
    renderChrome();

    if (options.render !== false) {
      await renderCurrentView();
    }
  } catch (error) {
    console.error(error);
    showToast(`読み込みエラー: ${error.message}`, 'error');
  }
}

async function loadGenres() {
  const { data, error } = await supabaseClient
    .from('genres')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw error;
  state.genres = data || [];
}

async function loadProfiles() {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .order('username', { ascending: true });

  if (error) throw error;
  state.profiles = new Map((data || []).map((profile) => [profile.id, profile]));
  state.currentProfile = state.profiles.get(state.currentUser?.id) || state.currentProfile;
}

async function fetchPostsByGenre(genre) {
  let query = supabaseClient
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (genre) {
    query = query.eq('genre', genre);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function loadAllPosts() {
  state.allPosts = await fetchPostsByGenre('');
}

async function loadHomePosts() {
  state.homePosts = await fetchPostsByGenre(state.activeGenre);
}

async function reloadHomePosts() {
  try {
    await loadHomePosts();
    renderGenres();
    renderHome();
  } catch (error) {
    console.error(error);
    showToast('投稿の再読み込みに失敗しました。', 'error');
  }
}

async function loadWeeklyVotes() {
  const weekStart = getJstWeekStartKey();

  const { data, error } = await supabaseClient
    .from('votes')
    .select('*')
    .eq('week_start', weekStart);

  if (error) throw error;

  state.weeklyVotes = data || [];
  state.votesByPost = new Map();
  state.myWeeklyVote = null;

  state.weeklyVotes.forEach((vote) => {
    const postId = Number(vote.post_id);
    state.votesByPost.set(postId, (state.votesByPost.get(postId) || 0) + 1);
    if (vote.user_id === state.currentUser?.id) {
      state.myWeeklyVote = vote;
    }
  });
}

async function loadWeeklyTitles() {
  const { data, error } = await supabaseClient
    .from('weekly_titles')
    .select('*')
    .order('week_start', { ascending: false });

  if (error) throw error;
  state.weeklyTitles = data || [];
}

function renderChrome() {
  const profile = state.currentProfile || getProfile(state.currentUser?.id);
  dom.sessionName.textContent = `${getDisplayName(profile)} / ${formatWeekLabel(getJstWeekStartKey())}`;
}

function renderGenres() {
  const allOption = '<option value="">ALL / 全ジャンル</option>';
  const genreOptions = state.genres
    .map((genre) => `<option value="${escapeAttr(genre.name)}">${escapeHtml(genre.name)}</option>`)
    .join('');

  dom.genreSelect.innerHTML = allOption + genreOptions;
  dom.genreSelect.value = state.genres.some((g) => g.name === state.activeGenre) ? state.activeGenre : '';
  dom.genreSearchInput.value = state.activeGenre;

  dom.genreDatalist.innerHTML = state.genres
    .map((genre) => `<option value="${escapeAttr(genre.name)}"></option>`)
    .join('');

  dom.postGenreSelect.innerHTML =
    '<option value="">ジャンルを選択</option>' +
    state.genres
      .map((genre) => `<option value="${escapeAttr(genre.name)}">${escapeHtml(genre.name)}</option>`)
      .join('');
}

async function showView(viewName) {
  if (!requireLogin()) return;

  state.activeView = viewName;

  dom.views.forEach((view) => {
    view.classList.toggle('is-active', view.id === `${viewName}View`);
  });


  $$('.nav-btn').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.view === viewName);
  });

  await renderCurrentView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function renderCurrentView() {
  renderChrome();
  renderGenres();

  if (state.activeView === 'home') renderHome();
  if (state.activeView === 'post') renderPostForm();
  if (state.activeView === 'ranking') renderRanking();
  if (state.activeView === 'profile') await renderProfile();
  if (state.activeView === 'hall') await renderHall();
}

function renderHome() {
  dom.homeWeekLabel.textContent = `集計週: ${formatWeekLabel(getJstWeekStartKey())}`;
  dom.homeStatus.textContent = state.activeGenre
    ? `#${state.activeGenre} の投稿: ${state.homePosts.length}件`
    : `全ジャンル: ${state.homePosts.length}件`;

  renderPostGrid(dom.postGrid, state.homePosts);
}

function renderPostForm() {
  dom.postSubmitButton.disabled = state.genres.length === 0;
  if (state.genres.length === 0) {
    showInlineMessage(dom.postFormMessage, 'ジャンルが未登録です。運営がgenresテーブルに追加してください。', 'warning');
  } else {
    showInlineMessage(dom.postFormMessage, '', '');
  }
}

function renderRanking() {
  dom.rankingWeekLabel.textContent = `集計週: ${formatWeekLabel(getJstWeekStartKey())}`;

  const ranked = state.allPosts
    .map((post) => ({
      post,
      count: getWeeklyVoteCount(post.id)
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return new Date(a.post.created_at) - new Date(b.post.created_at);
    });

  const topCount = ranked[0]?.count || 0;
  dom.rankingSummary.textContent = topCount > 0
    ? `現在のトップは ${topCount} うまそう。`
    : '今週の投票はまだありません。';

  dom.rankingGrid.innerHTML = '';
  if (ranked.length === 0) {
    dom.rankingGrid.innerHTML = emptyHtml('投稿がまだありません。');
    return;
  }

  ranked.forEach((item, index) => {
    const card = createPostCard(item.post, {
      rank: index + 1,
      count: item.count,
      champion: index === 0 && item.count > 0
    });
    dom.rankingGrid.appendChild(card);
  });
}

async function renderProfile() {
  const profile = state.currentProfile || getProfile(state.currentUser.id);
  const myPosts = state.allPosts.filter((post) => post.user_id === state.currentUser.id);
  const streak = calculateCurrentStreak(myPosts);

  dom.profileHeader.innerHTML = `
    ${avatarHtml(profile)}
    <div>
      <p class="mono section-kicker">MEMBER PROFILE</p>
      <h2>${escapeHtml(getDisplayName(profile))}</h2>
      <p class="small-note">@${escapeHtml(profile.username || '')}</p>
      <p>${escapeHtml(profile.bio || '自己紹介は未設定です。')}</p>
    </div>
  `;

  dom.profileStats.innerHTML = `
    <div class="stat-box"><strong>${myPosts.length}</strong><span>投稿</span></div>
    <div class="stat-box"><strong>${streak}</strong><span>連続日数</span></div>
    <div class="stat-box"><strong>${state.myWeeklyVote ? '済' : '未'}</strong><span>今週投票</span></div>
  `;

  const badges = await getDisplayBadgesForUser(state.currentUser.id);
  renderBadgeStrip(dom.profileBadges, badges);

  renderPostGrid(dom.profilePosts, myPosts);
}

async function renderHall() {
  await loadWeeklyTitles();

  const reporters = state.weeklyTitles.filter((row) => row.title_type === 'reporter');
  const commentKings = state.weeklyTitles.filter((row) => row.title_type === 'comment_king');
  const legends = await fetchBadgeRowsByType('kaikin_14');

  dom.reporterHall.innerHTML = renderTitleRows(reporters, '現地特派員');
  dom.commentKingHall.innerHTML = renderTitleRows(commentKings, 'コメント王');

  if (legends.length === 0) {
    dom.legendHall.innerHTML = emptyHtml('まだレジェンド皆勤賞達成者はいません。');
  } else {
    dom.legendHall.innerHTML = legends.map((badge) => {
      const profile = getProfile(badge.user_id);
      return `
        <div class="hall-row">
          <strong>${escapeHtml(getDisplayName(profile))}</strong>
          <span class="small-note">${formatDateTimeJst(badge.first_earned_at)} 達成</span>
        </div>
      `;
    }).join('');
  }
}

function renderTitleRows(rows, label) {
  if (rows.length === 0) {
    return emptyHtml(`まだ${label}はいません。`);
  }

  return rows.map((row) => {
    const profile = getProfile(row.user_id);
    return `
      <div class="hall-row">
        <strong>${escapeHtml(getDisplayName(profile))}</strong>
        <span class="genre-pill">${escapeHtml(label)}</span>
        <span class="small-note">${formatWeekLabel(row.week_start)}</span>
      </div>
    `;
  }).join('');
}

function renderPostGrid(container, posts) {
  container.innerHTML = '';

  if (!posts || posts.length === 0) {
    container.innerHTML = emptyHtml('投稿がありません。');
    return;
  }

  posts.forEach((post) => {
    container.appendChild(createPostCard(post));
  });
}

function createPostCard(post, options = {}) {
  const profile = getProfile(post.user_id);
  const count = options.count ?? getWeeklyVoteCount(post.id);
  const excerpt = (post.comment || '').slice(0, 42);

  const card = document.createElement('article');
  card.className = 'post-card';
  if (options.champion) card.classList.add('is-champion');
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `${post.genre}の投稿を開く`);

  card.innerHTML = `
    <div class="post-card__image">
      <img loading="lazy" src="${escapeAttr(post.image_url)}" alt="${escapeAttr(post.genre)}の料理写真">
    </div>
    <div class="post-card__meta">
      <span class="post-card__author">${escapeHtml(getDisplayName(profile))}</span>
      <span class="genre-pill">#${escapeHtml(post.genre)}</span>
      <span class="vote-chip">♥ ${count} うまそう</span>
    </div>
    <p class="post-card__excerpt">${escapeHtml(excerpt)}${post.comment && post.comment.length > 42 ? '…' : ''}</p>
  `;

  if (options.rank) {
    card.insertAdjacentHTML('afterbegin', `<div class="rank-medal">#${options.rank}</div>`);
  }

  card.addEventListener('click', () => openPostModal(post.id));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') openPostModal(post.id);
  });

  return card;
}

async function openPostModal(postId) {
  if (!requireLogin()) return;

  const post = getPostById(postId);
  if (!post) {
    showToast('投稿が見つかりません。', 'error');
    return;
  }

  state.currentPostId = Number(post.id);

  const profile = getProfile(post.user_id);
  dom.modalImage.src = post.image_url;
  dom.modalImage.alt = `${post.genre}の料理写真`;
  dom.modalGenre.textContent = `#${post.genre}`;
  dom.modalAuthor.textContent = getDisplayName(profile);
  dom.modalDate.textContent = formatDateTimeJst(post.created_at);
  dom.modalText.textContent = post.comment || '';

  updateVoteButton(post);

  dom.postModal.classList.remove('hidden');
  dom.postModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');

  await loadAndRenderComments(post.id);
}

function closePostModal() {
  dom.postModal.classList.add('hidden');
  dom.postModal.setAttribute('aria-hidden', 'true');
  state.currentPostId = null;
  releaseModalLock();
}

function updateVoteButton(post) {
  const count = getWeeklyVoteCount(post.id);
  dom.modalVoteCount.textContent = `今週 ${count} うまそう`;

  if (state.myWeeklyVote) {
    dom.voteButton.disabled = true;
    dom.voteButton.textContent = Number(state.myWeeklyVote.post_id) === Number(post.id)
      ? '今週この投稿に投票済み'
      : '今週は投票済み';
  } else {
    dom.voteButton.disabled = false;
    dom.voteButton.textContent = 'これに投票';
  }
}

async function handleVote() {
  if (!requireLogin()) return;
  if (!state.currentPostId) return;

  if (state.myWeeklyVote) {
    showToast('今週はすでに投票済みです。月曜0:00にリセットされます。', 'error');
    return;
  }

  setButtonBusy(dom.voteButton, true, '投票中...');

  const { error } = await supabaseClient
    .from('votes')
    .insert({
      user_id: state.currentUser.id,
      post_id: state.currentPostId,
      week_start: getJstWeekStartKey()
    });

  setButtonBusy(dom.voteButton, false);

  if (error) {
    if (error.code === '23505') {
      showToast('今週はすでに投票済みです。', 'error');
    } else {
      console.error(error);
      showToast('投票に失敗しました。', 'error');
    }
    return;
  }

  showToast('投票しました！', 'success');

  await loadWeeklyVotes();
  await recomputeWeeklyTitles();
  await loadWeeklyTitles();
  await refreshAchievementsForCurrentUser();

  const post = getPostById(state.currentPostId);
  if (post) updateVoteButton(post);

  if (state.activeView === 'home') renderHome();
  if (state.activeView === 'ranking') renderRanking();
}

async function loadAndRenderComments(postId) {
  dom.commentsList.innerHTML = emptyHtml('コメント読み込み中...');

  const { data, error } = await supabaseClient
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error(error);
    dom.commentsList.innerHTML = emptyHtml('コメントの読み込みに失敗しました。');
    return;
  }

  if (!data || data.length === 0) {
    dom.commentsList.innerHTML = emptyHtml('まだコメントはありません。');
    return;
  }

  dom.commentsList.innerHTML = data.map((comment) => {
    const profile = getProfile(comment.user_id);
    return `
      <div class="comment-row">
        <strong>${escapeHtml(getDisplayName(profile))}</strong>
        <span class="small-note">${formatDateTimeJst(comment.created_at)}</span>
        <p>${escapeHtml(comment.body)}</p>
      </div>
    `;
  }).join('');
}

async function handleCommentSubmit(event) {
  event.preventDefault();
  if (!requireLogin()) return;

  const body = dom.commentInput.value.trim();
  if (!body) {
    showToast('コメントを入力してください。', 'error');
    return;
  }

  setButtonBusy(dom.commentSubmitButton, true, '送信中...');

  const { error } = await supabaseClient
    .from('comments')
    .insert({
      post_id: state.currentPostId,
      user_id: state.currentUser.id,
      body
    });

  setButtonBusy(dom.commentSubmitButton, false);

  if (error) {
    console.error(error);
    showToast('コメント投稿に失敗しました。', 'error');
    return;
  }

  dom.commentInput.value = '';
  showToast('コメントしました。', 'success');

  await loadAndRenderComments(state.currentPostId);
  await recomputeWeeklyTitles();
  await loadWeeklyTitles();
  await refreshAchievementsForCurrentUser();

  if (state.activeView === 'profile') await renderProfile();
}

async function handlePostSubmit(event) {
  event.preventDefault();
  if (!requireLogin()) return;

  const file = dom.postImageInput.files[0];
  const genre = dom.postGenreSelect.value;
  const comment = dom.postCommentInput.value.trim();

  if (!file || !genre || !comment) {
    showInlineMessage(dom.postFormMessage, '画像・ジャンル・本文は必須です。', 'error');
    return;
  }

  try {
    setPostFormBusy(true, '画像を圧縮中...');
    const compressedFile = await compressImage(file);

    setPostFormBusy(true, '画像をアップロード中...');
    const imageUrl = await uploadImage(compressedFile, state.currentUser.id);
    if (!imageUrl) throw new Error('画像URLを取得できませんでした。');

    setPostFormBusy(true, '投稿を保存中...');
    const { error } = await supabaseClient
      .from('posts')
      .insert({
        user_id: state.currentUser.id,
        genre,
        image_url: imageUrl,
        comment
      });

    if (error) throw error;

    dom.postForm.reset();
    state.activeGenre = '';

    showToast('投稿しました！', 'success');
    await refreshEverything({ render: false });
    await showView('home');
  } catch (error) {
    console.error(error);
    showInlineMessage(dom.postFormMessage, `投稿失敗: ${error.message}`, 'error');
  } finally {
    setPostFormBusy(false, '');
  }
}

/**
 * Supabase Storage upload.
 * v2記法厳守。
 */
async function uploadImage(file, userId) {
  const filePath = `${userId}/${Date.now()}_${sanitizeFileName(file.name)}`;

  const { data, error } = await supabaseClient
    .storage
    .from(STORAGE_BUCKET)
    .upload(filePath, file);

  if (error) {
    console.error(data, error);
    return null;
  }

  const { data: urlData } = supabaseClient
    .storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

async function compressImage(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('画像ファイルを選択してください。');
  }

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('画像圧縮に失敗しました。'));
    }, 'image/jpeg', JPEG_QUALITY);
  });

  const newName = `${stripExtension(file.name)}.jpg`;
  return new File([blob], newName, { type: 'image/jpeg' });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('画像を読み込めませんでした。'));
    };

    img.src = url;
  });
}

async function refreshAchievementsForCurrentUser() {
  if (!state.currentUser) return;

  const userId = state.currentUser.id;
  const myPosts = state.allPosts.filter((post) => post.user_id === userId);

  if (myPosts.length >= 1) await awardBadge(userId, 'first_post');
  if (myPosts.length >= 10) await awardBadge(userId, 'post_10');

  const streak = calculateCurrentStreak(myPosts);
  if (streak >= 7) await awardBadge(userId, 'kaikin_7');
  if (streak >= 14) await awardBadge(userId, 'kaikin_14');

  if (hasEverTitle(userId, 'comment_king')) await awardBadge(userId, 'comment_king');
  if (hasEverTitle(userId, 'reporter')) await awardBadge(userId, 'reporter');
}

async function awardBadge(userId, badgeType) {
  const isWeeklyTitle = badgeType === 'comment_king' || badgeType === 'reporter';

  if (!isWeeklyTitle && userId !== state.currentUser?.id) return;

  const { data, error } = await supabaseClient
    .from('badges')
    .select('id')
    .eq('user_id', userId)
    .eq('badge_type', badgeType);

  if (error) {
    console.warn(error);
    return;
  }

  if (data && data.length > 0) return;

  const { error: insertError } = await supabaseClient
    .from('badges')
    .insert({
      user_id: userId,
      badge_type: badgeType
    });

  if (insertError && insertError.code !== '23505') {
    console.warn(insertError);
  }
}

async function recomputeWeeklyTitles() {
  if (!state.currentUser) return;

  try {
    await recomputeReporterTitle();
    await recomputeCommentKingTitle();
  } catch (error) {
    console.warn('週次集計に失敗:', error);
  }
}

async function recomputeReporterTitle() {
  const weekStart = getJstWeekStartKey();
  const votes = state.weeklyVotes;

  if (!votes || votes.length === 0) return;

  const counts = new Map();
  votes.forEach((vote) => {
    const postId = Number(vote.post_id);
    counts.set(postId, (counts.get(postId) || 0) + 1);
  });

  const candidates = Array.from(counts.entries())
    .map(([postId, count]) => ({
      post: getPostById(postId),
      count
    }))
    .filter((item) => item.post);

  if (candidates.length === 0) return;

  candidates.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return new Date(a.post.created_at) - new Date(b.post.created_at);
  });

  const winnerUserId = candidates[0].post.user_id;
  await saveWeeklyTitle('reporter', weekStart, winnerUserId);
}

async function recomputeCommentKingTitle() {
  const weekStart = getJstWeekStartKey();
  const comments = await fetchCurrentWeekComments();

  if (!comments || comments.length === 0) return;

  const buckets = new Map();

  comments.forEach((comment) => {
    const item = buckets.get(comment.user_id) || {
      count: 0,
      firstAt: comment.created_at
    };

    item.count += 1;
    if (new Date(comment.created_at) < new Date(item.firstAt)) {
      item.firstAt = comment.created_at;
    }

    buckets.set(comment.user_id, item);
  });

  const ranked = Array.from(buckets.entries()).sort((a, b) => {
    if (b[1].count !== a[1].count) return b[1].count - a[1].count;
    return new Date(a[1].firstAt) - new Date(b[1].firstAt);
  });

  const winnerUserId = ranked[0][0];
  await saveWeeklyTitle('comment_king', weekStart, winnerUserId);
}

async function saveWeeklyTitle(titleType, weekStart, userId) {
  const { data, error } = await supabaseClient
    .from('weekly_titles')
    .select('*')
    .eq('title_type', titleType)
    .eq('week_start', weekStart);

  if (error) throw error;

  if (data && data.length > 0) {
    if (data[0].user_id !== userId) {
      const { error: updateError } = await supabaseClient
        .from('weekly_titles')
        .update({ user_id: userId })
        .eq('id', data[0].id);

      if (updateError) throw updateError;
    }
  } else {
    const { error: insertError } = await supabaseClient
      .from('weekly_titles')
      .insert({
        title_type: titleType,
        week_start: weekStart,
        user_id: userId
      });

    if (insertError && insertError.code !== '23505') throw insertError;

    if (insertError && insertError.code === '23505') {
      const { error: retryUpdateError } = await supabaseClient
        .from('weekly_titles')
        .update({ user_id: userId })
        .eq('title_type', titleType)
        .eq('week_start', weekStart);

      if (retryUpdateError) throw retryUpdateError;
    }
  }

  await awardBadge(userId, titleType);
}

async function fetchCurrentWeekComments() {
  const startKey = getJstWeekStartKey();
  const endKey = addDaysKey(startKey, 7);

  const { data, error } = await supabaseClient
    .from('comments')
    .select('*')
    .gte('created_at', jstDateKeyToUtcIso(startKey))
    .lt('created_at', jstDateKeyToUtcIso(endKey))
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function getDisplayBadgesForUser(userId) {
  const { data, error } = await supabaseClient
    .from('badges')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.warn(error);
    return [];
  }

  const owned = new Set((data || []).map((badge) => badge.badge_type));

  if (hasEverTitle(userId, 'comment_king')) owned.add('comment_king');
  if (hasEverTitle(userId, 'reporter')) owned.add('reporter');

  const badges = [];
  if (owned.has('first_post')) badges.push(BADGE_DEFINITIONS.first_post);
  if (owned.has('post_10')) badges.push(BADGE_DEFINITIONS.post_10);
  if (owned.has('kaikin_7')) badges.push(BADGE_DEFINITIONS.kaikin_7);
  if (owned.has('kaikin_14')) badges.push(BADGE_DEFINITIONS.kaikin_14);

  const currentCommentKing = getCurrentTitleHolder('comment_king');
  if (currentCommentKing === userId) {
    badges.push(BADGE_DEFINITIONS.comment_king_active);
  } else if (owned.has('comment_king')) {
    badges.push(BADGE_DEFINITIONS.comment_king_fallen);
  }

  const currentReporter = getCurrentTitleHolder('reporter');
  if (currentReporter === userId) {
    badges.push(BADGE_DEFINITIONS.reporter_active);
  } else if (owned.has('reporter')) {
    badges.push(BADGE_DEFINITIONS.reporter_fallen);
  }

  return badges;
}

function renderBadgeStrip(container, badges) {
  container.innerHTML = '';

  if (!badges || badges.length === 0) {
    container.innerHTML = emptyHtml('まだバッジはありません。まずは投稿して初投稿バッジを狙おう。');
    return;
  }

  badges.forEach((badge) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `badge-button ${badge.className || ''}`;
    button.innerHTML = `
      <img src="${escapeAttr(badge.light)}" alt="${escapeAttr(badge.label)}">
      <span>${escapeHtml(badge.label)}</span>
    `;
    button.addEventListener('click', () => openBadgeModal(badge));
    container.appendChild(button);
  });
}

function openBadgeModal(badge) {
  dom.badgeModalImage.src = badge.full;
  dom.badgeModalImage.alt = badge.label;
  dom.badgeModalTitle.textContent = badge.label;
  dom.badgeModalCaption.textContent = badge.caption;

  dom.badgeModal.classList.remove('hidden');
  dom.badgeModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeBadgeModal() {
  dom.badgeModal.classList.add('hidden');
  dom.badgeModal.setAttribute('aria-hidden', 'true');
  releaseModalLock();
}

async function fetchBadgeRowsByType(badgeType) {
  const { data, error } = await supabaseClient
    .from('badges')
    .select('*')
    .eq('badge_type', badgeType)
    .order('first_earned_at', { ascending: true });

  if (error) {
    console.warn(error);
    return [];
  }

  return data || [];
}

function getWeeklyVoteCount(postId) {
  return state.votesByPost.get(Number(postId)) || 0;
}

function getPostById(postId) {
  return state.allPosts.find((post) => Number(post.id) === Number(postId))
    || state.homePosts.find((post) => Number(post.id) === Number(postId));
}

function getProfile(userId) {
  return state.profiles.get(userId) || {
    id: userId,
    username: 'unknown',
    display_name: '謎の特派員',
    icon_url: '',
    bio: ''
  };
}

function getDisplayName(profile) {
  return profile?.display_name || profile?.username || '名無し';
}

function avatarHtml(profile) {
  if (profile?.icon_url) {
    return `<div class="avatar"><img src="${escapeAttr(profile.icon_url)}" alt="${escapeAttr(getDisplayName(profile))}"></div>`;
  }

  const initial = (getDisplayName(profile) || '?').slice(0, 1);
  return `<div class="avatar">${escapeHtml(initial)}</div>`;
}

function getCurrentTitleHolder(titleType) {
  const weekStart = getJstWeekStartKey();
  return state.weeklyTitles.find((row) => row.title_type === titleType && row.week_start === weekStart)?.user_id || null;
}

function hasEverTitle(userId, titleType) {
  return state.weeklyTitles.some((row) => row.title_type === titleType && row.user_id === userId);
}

function calculateCurrentStreak(posts) {
  const postedDays = new Set(posts.map((post) => getJstDateKey(post.created_at)));

  let streak = 0;
  let cursor = getJstDateKey();

  while (postedDays.has(cursor)) {
    streak += 1;
    cursor = addDaysKey(cursor, -1);
  }

  return streak;
}

function getJstDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const shifted = new Date(date.getTime() + JST_OFFSET_MS);
  return shifted.toISOString().slice(0, 10);
}

function getJstWeekStartKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const todayKey = getJstDateKey(date);
  const shifted = new Date(date.getTime() + JST_OFFSET_MS);
  const day = shifted.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDaysKey(todayKey, diff);
}

function addDaysKey(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function jstDateKeyToUtcIso(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) - JST_OFFSET_MS).toISOString();
}

function formatWeekLabel(weekStartKey) {
  const endKey = addDaysKey(weekStartKey, 6);
  return `${weekStartKey.replaceAll('-', '/')}〜${endKey.replaceAll('-', '/')}`;
}

function formatDateTimeJst(value) {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function getUsernameFromEmail(email) {
  return String(email || '').replace(LOGIN_DOMAIN, '').split('@')[0] || 'member';
}

function requireLogin() {
  if (!state.currentUser) {
    showToast('ログインしてください。', 'error');
    showLogin();
    return false;
  }
  return true;
}

function setButtonBusy(button, busy, busyText = '処理中...') {
  if (!button) return;

  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    delete button.dataset.originalText;
  }
}

function setPostFormBusy(busy, message) {
  dom.postSubmitButton.disabled = busy;
  showInlineMessage(dom.postFormMessage, message || '', '');
}

function showInlineMessage(element, message, type) {
  if (!element) return;
  element.textContent = message || '';
  element.className = `inline-message ${type || ''}`;
}

function showToast(message, type = 'info') {
  if (!dom.toast) return;

  dom.toast.textContent = message;
  dom.toast.className = `toast is-show ${type}`;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    dom.toast.className = 'toast';
  }, 3600);
}

function releaseModalLock() {
  if (dom.postModal.classList.contains('hidden') && dom.badgeModal.classList.contains('hidden')) {
    document.body.classList.remove('modal-open');
  }
}

function renderConfigWarningIfNeeded() {
  if (!isConfigMissing()) return;

  dom.configWarning.classList.remove('hidden');
  dom.configWarning.textContent = 'app.js冒頭の SUPABASE_URL と SUPABASE_ANON_KEY を貼り替えてください。';
}

function isConfigMissing() {
  return SUPABASE_URL.includes('あなた') || SUPABASE_ANON_KEY.includes('あなた');
}

function emptyHtml(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function sanitizeFileName(name) {
  return String(name || 'image.jpg')
    .normalize('NFKC')
    .replace(/[^\w.-]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'image.jpg';
}

function stripExtension(name) {
  return String(name || 'image').replace(/\.[^/.]+$/, '') || 'image';
}

function escapeHtml(value) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return String(value ?? '').replace(/[&<>"']/g, (char) => map[char]);
}

function escapeAttr(value) {
  return escapeHtml(value);
}
