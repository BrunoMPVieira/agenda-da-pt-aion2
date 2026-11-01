/**
 * AGENDA DA PT - AION 2 | JAVASCRIPT ENGINE (SUPABASE NUVEM + VERCEL)
 * 1. Conexão direta com Supabase Cloud Database (PostgreSQL + Realtime)
 * 2. Autenticação dos 4 Guerreiros (Kharnoxy, CIROC, Hell, Rafaxdwar)
 * 3. Confirmação de Presença e Campo de Anotações sincronizados em nuvem
 * 4. Sistema de Alarme e Apito no Windows (Web Audio API + Desktop Notifications)
 * 5. Simulador de Composição de Alts e Dungeons Tracker
 */

const AionAgenda = (() => {
  // Configuração Oficial do Supabase da PT
  const SUPABASE_CONFIG = {
    URL: 'https://kdlignxlflfhpxbpnkxo.supabase.co',
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkbGlnbnhsZmxmaHB4YnBua3hvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwOTk1NTUsImV4cCI6MjA5NzY3NTU1NX0.0k8D-Xa9vytFm0uNXIB7_botsbezM3z6h-Ce2w_S2Ws'
  };

  // Storage Keys
  const STORAGE = {
    LOGGED_USER: 'aion_logged_user',
    ALARM_ENABLED: 'aion_windows_alarm_enabled',
    SOUND_ENABLED: 'aion_sound_enabled',
    PRESENCE_CACHE: 'aion_presence_cache',
    DUNGEONS_CACHE: 'aion_dungeons_cache',
    NOTES_CACHE: 'aion_notes_cache',
  };

  // Predefined Party Members & Credenciais Oficiais
  const MEMBERS = {
    kharnoxy: { id: 'kharnoxy', name: 'Kharnoxy', class: 'Templário (Tank)', role: 'tank', avatar: '🛡️', iconImg: 'assets/classes/UT_Class_Templar_Large.webp' },
    ciroc: { id: 'ciroc', name: 'CIROC', class: 'Mago (DPS)', role: 'dps', avatar: '🔮', iconImg: 'assets/classes/UT_Class_Sorcerer_Large.webp' },
    hell: { id: 'hell', name: 'Hell', class: 'Clérigo (Suporte)', role: 'heal', avatar: '🌿', iconImg: 'assets/classes/UT_Class_Cleric_Large.webp' },
    rafax: { id: 'rafax', name: 'Rafaxdwar', class: 'Gladiador (DPS)', role: 'dps', avatar: '⚔️', iconImg: 'assets/classes/UT_Class_Gladiator_Large.webp' },
    brokenboy: { id: 'brokenboy', name: 'Brokenboy', class: 'Encantador (Buffer)', role: 'heal', avatar: '🪄', iconImg: 'assets/classes/UT_Class_Chanter_Large.webp' }
  };

  const DEFAULT_CREDENTIALS = {
    kharnoxy: '157arroiz',
    ciroc: 'xandom',
    hell: 'hellgay',
    rafax: 'pintodebolivia',
    rafaxdwar: 'pintodebolivia',
    brokenboy: 'brokenbboy99'
  };

  // State
  let supabaseClient = null;
  let loggedUser = null;
  let selectedLoginId = 'kharnoxy';
  let mySelectedStatus = 'ready';
  let windowsAlarmEnabled = localStorage.getItem(STORAGE.ALARM_ENABLED) !== 'false';
  let soundEnabled = localStorage.getItem(STORAGE.SOUND_ENABLED) !== 'false';
  let lastAlarmMinute = null;

  // Web Audio Context for Native Sound Generation
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Synthesized Sound Effects
  function playBeep(freq, type = 'sine', duration = 0.1, gainVal = 0.08) {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  // Windows Piercing Alarm Fanfare for 16:00 & 19:00
  function playWindowsAlarmSound() {
    if (!soundEnabled && !windowsAlarmEnabled) return;
    try {
      const ctx = getAudioContext();
      const notes = [587.33, 739.99, 880.00, 1174.66, 880.00, 1174.66]; // D5, F#5, A5, D6, A5, D6
      notes.forEach((freq, i) => {
        setTimeout(() => {
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.22);
          } catch(err) {}
        }, i * 160);
      });
    } catch (e) {
      console.warn('Alarm sound error:', e);
    }
  }

  function playSuccessChime() {
    playBeep(440, 'triangle', 0.1, 0.08);
    setTimeout(() => playBeep(880, 'triangle', 0.2, 0.08), 100);
  }

  function playClick() {
    playBeep(520, 'sine', 0.06, 0.04);
  }

  // Native Windows Desktop Notification (HTML5 Notification API)
  function sendWindowsNotification(title, body) {
    if (!windowsAlarmEnabled) return;

    if (!('Notification' in window)) {
      console.warn('Navegador não suporta notificações de desktop.');
      return;
    }

    if (Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body: body,
          icon: 'https://cdn-icons-png.flaticon.com/512/3233/3233483.png',
          tag: 'aion-pt-alert',
          requireInteraction: true
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (err) {
        console.warn('Falha ao disparar notificação:', err);
      }
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          sendWindowsNotification(title, body);
        }
      });
    }
  }

  function toggleWindowsAlarm() {
    windowsAlarmEnabled = !windowsAlarmEnabled;
    localStorage.setItem(STORAGE.ALARM_ENABLED, windowsAlarmEnabled);
    updateAlarmButtonUI();

    if (windowsAlarmEnabled && 'Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
    playClick();
  }

  function updateAlarmButtonUI() {
    const btn = document.getElementById('alarm-toggle-btn');
    if (btn) {
      if (windowsAlarmEnabled) {
        btn.className = 'control-btn alarm-btn active';
        btn.textContent = '🔔 Alarme Windows: ON';
      } else {
        btn.className = 'control-btn alarm-btn';
        btn.textContent = '🔕 Alarme Windows: OFF';
      }
    }
  }

  function testWindowsAlarm() {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission().then(() => {
        triggerTestAlarm();
      });
    } else {
      triggerTestAlarm();
    }
  }

  function triggerTestAlarm() {
    playWindowsAlarmSound();
    sendWindowsNotification(
      '⚔️ AION 2 - TESTE DE ALARME DO WINDOWS!',
      'O apito sonoro e as notificações de desktop estão 100% ativos no seu Windows!'
    );
    alert('🔔 Teste executado!\nO som foi reproduzido e a notificação do Windows foi enviada.\nSe a notificação não apareceu, certifique-se de permitir notificações para esta página no navegador.');
  }

  function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem(STORAGE.SOUND_ENABLED, soundEnabled);
    updateSoundBtn();
    if (soundEnabled) playSuccessChime();
  }

  function updateSoundBtn() {
    const btn = document.getElementById('sound-btn');
    if (btn) {
      btn.textContent = soundEnabled ? '🔊 Efeitos: ON' : '🔇 Efeitos: OFF';
      btn.style.color = soundEnabled ? 'var(--color-primary)' : 'var(--text-muted)';
    }
  }

  // ===================================================================
  // SUPABASE CLOUD INITIALIZATION & REALTIME
  // ===================================================================
  function initSupabase() {
    if (!window.supabase) {
      console.warn('SDK do Supabase não carregado.');
      return;
    }

    try {
      supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);
      console.log('Conectado ao Supabase com sucesso!');

      // Realtime listener para Presença e Avisos
      subscribeRealtime();
    } catch (e) {
      console.error('Erro ao conectar ao Supabase:', e);
    }
  }

  function subscribeRealtime() {
    if (!supabaseClient) return;

    try {
      supabaseClient
        .channel('pt-realtime-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_presence' }, (payload) => {
          console.log('⚡ Atualização em tempo real recebida do Supabase:', payload);
          loadPresenceData();
          playBeep(659, 'sine', 0.1, 0.05);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pt_announcements' }, () => {
          loadNotesData();
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription error:', e);
    }
  }

  // ===================================================================
  // AUTHENTICATION (MEMBERS LOGIN VIA SUPABASE)
  // ===================================================================
  function loadSession() {
    try {
      const stored = localStorage.getItem(STORAGE.LOGGED_USER);
      if (stored) loggedUser = JSON.parse(stored);
    } catch (e) {
      loggedUser = null;
    }
    updateAuthUI();
  }

  function updateAuthUI() {
    const authBox = document.getElementById('auth-box');
    const actionGreeting = document.getElementById('action-panel-greeting');
    const actionSub = document.getElementById('action-panel-sub');
    const actionLoginBtn = document.getElementById('action-panel-login-btn');
    const actionBody = document.getElementById('action-panel-body');

    if (loggedUser) {
      if (authBox) {
        authBox.innerHTML = `
          <div class="user-pill">
            <span class="user-pill-info">
              ${loggedUser.iconImg ? `<img src="${loggedUser.iconImg}" alt="${loggedUser.name}" class="user-badge-icon">` : `<span>${loggedUser.avatar || '🛡️'}</span>`}
              <span class="user-pill-name">${loggedUser.name}</span>
            </span>
            <button class="logout-btn" onclick="AionAgenda.logout()">Sair</button>
          </div>
        `;
      }

      if (actionGreeting) actionGreeting.textContent = `Olá, ${loggedUser.name}! Confirme seu status de hoje:`;
      if (actionSub) actionSub.textContent = `Classe: ${loggedUser.class} • Sincronizado em tempo real para toda a PT`;
      if (actionLoginBtn) actionLoginBtn.style.display = 'none';
      if (actionBody) actionBody.classList.remove('disabled');

      loadMyCurrentPresence();
    } else {
      if (authBox) {
        authBox.innerHTML = `
          <button class="control-btn login-btn" onclick="AionAgenda.openLoginModal()">
            🔑 Entrar como Jogador
          </button>
        `;
      }
      if (actionGreeting) actionGreeting.textContent = 'Sua Confirmação de Hoje';
      if (actionSub) actionSub.textContent = 'Faça login com seu personagem para registrar sua presença e recados.';
      if (actionLoginBtn) actionLoginBtn.style.display = 'inline-block';
      if (actionBody) actionBody.classList.add('disabled');
    }
  }

  function openLoginModal() {
    const modal = document.getElementById('login-modal');
    const passInput = document.getElementById('login-password');
    const errEl = document.getElementById('login-error-msg');
    if (passInput) passInput.value = '';
    if (errEl) errEl.textContent = '';
    if (modal) modal.classList.add('open');
    playClick();
  }

  function closeLoginModal() {
    const modal = document.getElementById('login-modal');
    if (modal) modal.classList.remove('open');
  }

  function selectLoginPlayer(playerId) {
    selectedLoginId = playerId;
    document.querySelectorAll('.member-radio-card').forEach(card => {
      if (card.getAttribute('data-player') === playerId) card.classList.add('active');
      else card.classList.remove('active');
    });
    playClick();
  }

  async function submitLogin() {
    const passInput = document.getElementById('login-password');
    const errEl = document.getElementById('login-error-msg');
    const password = (passInput?.value || '').trim();

    if (!password) {
      if (errEl) errEl.textContent = 'Por favor, digite a sua senha.';
      return;
    }

    if (errEl) errEl.textContent = 'Verificando senha...';

    let authSuccess = false;
    let memberData = MEMBERS[selectedLoginId];

    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('members_auth')
          .select('*')
          .eq('id', selectedLoginId)
          .single();

        if (!error && data) {
          if (data.password === password) {
            authSuccess = true;
            memberData = {
              id: data.id,
              name: data.display_name,
              class: data.class_name,
              avatar: data.avatar || '🛡️',
              iconImg: MEMBERS[selectedLoginId]?.iconImg || ''
            };
          }
        }
      } catch (e) {
        console.warn('Erro ao consultar Supabase auth:', e);
      }
    }

    // Fallback if password matches official credential
    if (!authSuccess && DEFAULT_CREDENTIALS[selectedLoginId] && password === DEFAULT_CREDENTIALS[selectedLoginId]) {
      authSuccess = true;
    }

    if (authSuccess) {
      loggedUser = memberData;
      localStorage.setItem(STORAGE.LOGGED_USER, JSON.stringify(loggedUser));
      updateAuthUI();
      closeLoginModal();
      playSuccessChime();
    } else {
      if (errEl) errEl.textContent = 'Senha incorreta para este usuário.';
    }
  }

  function logout() {
    loggedUser = null;
    localStorage.removeItem(STORAGE.LOGGED_USER);
    updateAuthUI();
    playClick();
  }

  // ===================================================================
  // CHECK-IN WITH STATUS & NOTE (SUPABASE DIRECT)
  // ===================================================================
  function selectPresenceStatus(status) {
    mySelectedStatus = status;
    document.querySelectorAll('.status-choice-btn').forEach(btn => {
      if (btn.getAttribute('data-status') === status) btn.classList.add('active');
      else btn.classList.remove('active');
    });
    playClick();
  }

  function getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  async function submitMyPresence() {
    if (!loggedUser) {
      openLoginModal();
      return;
    }

    const noteInput = document.getElementById('my-presence-note');
    const noteText = (noteInput?.value || '').trim();
    const today = getTodayString();
    const statusMsg = document.getElementById('save-status-msg');
    const nowIso = new Date().toISOString();

    if (statusMsg) statusMsg.textContent = 'Salvando presença...';

    // 1. Salvar no cache local
    let cache = {};
    try { cache = JSON.parse(localStorage.getItem(STORAGE.PRESENCE_CACHE)) || {}; } catch (e) {}
    if (!cache[today]) cache[today] = {};
    cache[today][loggedUser.id] = {
      status: mySelectedStatus,
      note: noteText,
      updated_at: nowIso
    };
    localStorage.setItem(STORAGE.PRESENCE_CACHE, JSON.stringify(cache));

    // 2. Salvar no Supabase (PostgreSQL)
    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('daily_presence')
          .upsert({
            player_id: loggedUser.id,
            date: today,
            status: mySelectedStatus,
            note: noteText,
            updated_at: nowIso
          }, { onConflict: 'player_id, date' });

        if (error) {
          console.error('Erro Supabase upsert:', error);
          if (statusMsg) statusMsg.textContent = '⚠️ Salvo localmente.';
        } else {
          if (statusMsg) statusMsg.textContent = '✅ Salvo e sincronizado em tempo real!';
        }
      } catch (err) {
        console.error('Falha de rede Supabase:', err);
        if (statusMsg) statusMsg.textContent = '⚠️ Salvo localmente.';
      }
    } else {
      if (statusMsg) statusMsg.textContent = '✅ Salvo localmente!';
    }

    renderPresenceList(cache[today]);
    playSuccessChime();

    setTimeout(() => {
      if (statusMsg) statusMsg.textContent = '';
    }, 4000);
  }

  function loadMyCurrentPresence() {
    if (!loggedUser) return;
    const today = getTodayString();
    let cache = {};
    try { cache = JSON.parse(localStorage.getItem(STORAGE.PRESENCE_CACHE)) || {}; } catch(e) {}

    const myData = cache[today]?.[loggedUser.id];
    if (myData) {
      selectPresenceStatus(myData.status || 'ready');
      const noteInput = document.getElementById('my-presence-note');
      if (noteInput && myData.note !== undefined) {
        noteInput.value = myData.note;
      }
    }
  }

  async function loadPresenceData() {
    const today = getTodayString();
    let presenceMap = {};

    // 1. Ler do cache local para resposta instantânea
    try {
      const cache = JSON.parse(localStorage.getItem(STORAGE.PRESENCE_CACHE)) || {};
      presenceMap = cache[today] || {};
    } catch (e) {}

    // 2. Buscar dados atualizados do Supabase
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('daily_presence')
          .select('*')
          .eq('date', today);

        if (!error && data) {
          data.forEach(row => {
            presenceMap[row.player_id] = {
              status: row.status,
              note: row.note || '',
              updated_at: row.updated_at
            };
          });

          // Atualiza cache
          let cache = {};
          try { cache = JSON.parse(localStorage.getItem(STORAGE.PRESENCE_CACHE)) || {}; } catch(e) {}
          cache[today] = presenceMap;
          localStorage.setItem(STORAGE.PRESENCE_CACHE, JSON.stringify(cache));
        }
      } catch (e) {
        console.warn('Erro ao carregar presença do Supabase:', e);
      }
    }

    renderPresenceList(presenceMap);
  }

  const STATUS_LABELS = {
    ready: { label: '🟢 Confirmado / Vou Jogar', class: 'ready' },
    absent: { label: '🔴 Não Poderei Comparecer', class: 'absent' },
    office: { label: '🏢 Presencial / Escritório', class: 'office' },
    late: { label: '⏳ Vai se Atrasar', class: 'late' },
    raven: { label: '🦅 Raven Online (22h)', class: 'raven' },
    family: { label: '👶 Compromisso Familiar', class: 'family' }
  };

  function renderPresenceList(todayMap = {}) {
    const container = document.getElementById('presence-live-list');
    if (!container) return;

    container.innerHTML = '';
    const memberKeys = ['kharnoxy', 'ciroc', 'hell', 'rafax', 'brokenboy'];

    memberKeys.forEach(id => {
      const info = MEMBERS[id];
      const entry = todayMap[id] || { status: 'ready', note: '', updated_at: null };
      const statusMeta = STATUS_LABELS[entry.status] || STATUS_LABELS.ready;

      let timeLabel = '';
      if (entry.updated_at) {
        try {
          const dt = new Date(entry.updated_at);
          timeLabel = `Atualizado às ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
        } catch(e) {}
      }

      const card = document.createElement('div');
      card.className = 'live-presence-card';
      card.innerHTML = `
        <div class="live-presence-header">
          <div class="live-member-info">
            <div class="live-icon-crest ${info.role}-crest">
              <img src="${info.iconImg}" alt="${info.name}" class="live-class-icon">
            </div>
            <div class="live-member-name">
              <strong>${info.name}</strong>
              <span>${info.class}</span>
            </div>
          </div>
          <span class="live-status-pill ${statusMeta.class}">
            ${statusMeta.label}
          </span>
        </div>

        ${entry.note ? `
          <div class="live-member-note">
            <span class="live-note-author">"${info.name}:</span> ${entry.note}"
          </div>
        ` : ''}

        ${timeLabel ? `<div class="live-timestamp">${timeLabel}</div>` : ''}
      `;
      container.appendChild(card);
    });
  }

  // ===================================================================
  // LIVE CLOCK & ALARM SCHEDULER
  // ===================================================================
  const daysOfWeekPt = [
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];

  function updateClock() {
    const now = new Date();
    const dayIndex = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    const strH = String(hours).padStart(2, '0');
    const strM = String(minutes).padStart(2, '0');
    const strS = String(seconds).padStart(2, '0');

    const clockEl = document.getElementById('live-clock');
    const dayNameEl = document.getElementById('current-day-name');
    if (clockEl) clockEl.textContent = `${strH}:${strM}:${strS}`;
    if (dayNameEl) dayNameEl.textContent = daysOfWeekPt[dayIndex].toUpperCase();

    // Highlight today card in week grid
    document.querySelectorAll('.day-card').forEach(card => {
      const cardDay = parseInt(card.getAttribute('data-day'), 10);
      if (cardDay === dayIndex) card.classList.add('today');
      else card.classList.remove('today');
    });

    calculateNextEvent(now, dayIndex);
    checkWindowsAlarmTrigger(hours, minutes, seconds);
  }

  function checkWindowsAlarmTrigger(hours, minutes, seconds) {
    if (!windowsAlarmEnabled) return;

    const minuteSignature = `${hours}:${minutes}`;
    if (lastAlarmMinute === minuteSignature) return;

    // 15:55 - Warning for Abyss (5 min before 16:00)
    if (hours === 15 && minutes === 55 && seconds === 0) {
      lastAlarmMinute = minuteSignature;
      playBeep(880, 'sine', 0.2, 0.1);
      sendWindowsNotification(
        '⚠️ AION 2 - FALTAM 5 MINUTOS PARA O ABISMO!',
        'São 15:55! O Abismo em Grupo começa pontualmente às 16:00.'
      );
    }

    // 16:00 - HORA DO ABISMO EM GRUPO
    if (hours === 16 && minutes === 0 && seconds === 0) {
      lastAlarmMinute = minuteSignature;
      playWindowsAlarmSound();
      sendWindowsNotification(
        '🌌 HORA DO ABISMO EM GRUPO (16:00)!',
        'Abra o AION 2 e entre no Discord da PT para a hora diária de Abismo!'
      );
    }

    // 18:55 - Warning for PT Prime Time (5 min before 19:00)
    if (hours === 18 && minutes === 55 && seconds === 0) {
      lastAlarmMinute = minuteSignature;
      playBeep(880, 'sine', 0.2, 0.1);
      sendWindowsNotification(
        '⚠️ AION 2 - FALTAM 5 MINUTOS PARA A PT (19:00)!',
        'Monte seu lanche, abra o jogo e prepare-se para as Dungeons / Alts!'
      );
    }

    // 19:00 - HORA OFICIAL DA PT
    if (hours === 19 && minutes === 0 && seconds === 0) {
      lastAlarmMinute = minuteSignature;
      playWindowsAlarmSound();
      sendWindowsNotification(
        '⚔️ HORA SAGRADA DA PT (19:00)!',
        'Kharnoxy, CIROC, Hell e Rafax: O grupo oficial está reunido!'
      );
    }
  }

  function calculateNextEvent(now, dayIndex) {
    const currentTotalSec = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
    const bannerTitle = document.getElementById('next-event-title');
    const bannerCountdown = document.getElementById('next-event-countdown');
    if (!bannerTitle || !bannerCountdown) return;

    const abyssSec = 16 * 3600;
    const primeSec = 19 * 3600;
    const endSec = 22 * 3600;

    let eveningEvent = 'Upar Alts em Grupo';
    if ([3, 4, 5].includes(dayIndex)) {
      eveningEvent = 'Dungeons Oficiais da PT 🏰';
    } else if (dayIndex === 0 || dayIndex === 6) {
      eveningEvent = 'Farm / Alts Livre';
    }

    let targetSec = 0;
    let eventName = '';

    if (currentTotalSec < abyssSec) {
      targetSec = abyssSec;
      eventName = 'Abismo em Grupo (16:00)';
    } else if (currentTotalSec >= abyssSec && currentTotalSec < abyssSec + 3600) {
      bannerTitle.textContent = '🔥 ABISMO EM ANDAMENTO!';
      bannerCountdown.textContent = 'EM JOGO';
      return;
    } else if (currentTotalSec < primeSec) {
      targetSec = primeSec;
      eventName = `${eveningEvent} (19:00)`;
    } else if (currentTotalSec >= primeSec && currentTotalSec < endSec) {
      bannerTitle.textContent = `⚔️ ${eveningEvent.toUpperCase()} EM ANDAMENTO!`;
      bannerCountdown.textContent = 'EM JOGO (Até 22h)';
      return;
    } else {
      targetSec = (24 * 3600) + abyssSec;
      eventName = 'Amanhã: Abismo (16:00)';
    }

    let diffSec = targetSec - currentTotalSec;
    if (diffSec < 0) diffSec = 0;

    const diffHours = Math.floor(diffSec / 3600);
    const diffMins = Math.floor((diffSec % 3600) / 60);
    const diffSeconds = diffSec % 60;

    bannerTitle.textContent = eventName;
    bannerCountdown.textContent = `em ${String(diffHours).padStart(2, '0')}:${String(diffMins).padStart(2, '0')}:${String(diffSeconds).padStart(2, '0')}`;
  }

  // ===================================================================
  // NAVIGATION TABS (DESKTOP & MOBILE BOTTOM BAR)
  // ===================================================================
  function initTabs() {
    const allTabTriggers = document.querySelectorAll('.nav-pill, .m-nav-item');
    allTabTriggers.forEach(btn => {
      btn.addEventListener('click', () => {
        playClick();
        const tabId = btn.getAttribute('data-tab');
        if (!tabId) return;

        allTabTriggers.forEach(b => {
          if (b.getAttribute('data-tab') === tabId) {
            b.classList.add('active');
          } else {
            b.classList.remove('active');
          }
        });

        document.querySelectorAll('.tab-content').forEach(section => {
          section.classList.remove('active');
        });
        const targetSection = document.getElementById(`tab-${tabId}`);
        if (targetSection) {
          targetSection.classList.add('active');
          if (window.innerWidth <= 768) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }
      });
    });
  }

  // ===================================================================
  // ALT TEAM BUILDER
  // ===================================================================
  function updateTeamBuild() {
    const selKharnoxy = document.getElementById('select-kharnoxy');
    const selCiroc = document.getElementById('select-ciroc');
    const selHell = document.getElementById('select-hell');
    const selRafax = document.getElementById('select-rafax');
    const selBroken = document.getElementById('select-brokenboy');

    if (!selKharnoxy || !selCiroc || !selHell || !selRafax) return;

    const selections = [
      selKharnoxy.options[selKharnoxy.selectedIndex].getAttribute('data-role'),
      selCiroc.options[selCiroc.selectedIndex].getAttribute('data-role'),
      selHell.options[selHell.selectedIndex].getAttribute('data-role'),
      selRafax.options[selRafax.selectedIndex].getAttribute('data-role'),
    ];

    if (selBroken) {
      selections.push(selBroken.options[selBroken.selectedIndex].getAttribute('data-role'));
    }

    let tanks = 0, heals = 0, chanters = 0, dps = 0;
    selections.forEach(role => {
      if (role === 'tank') tanks++;
      else if (role === 'heal') heals++;
      else if (role === 'chanter') chanters++;
      else if (role === 'dps') dps++;
    });

    const countTankEl = document.getElementById('count-tank');
    const countHealEl = document.getElementById('count-heal');
    const countChanterEl = document.getElementById('count-chanter');
    const countDpsEl = document.getElementById('count-dps');
    const verdictEl = document.getElementById('synergy-verdict');

    if (countTankEl) countTankEl.textContent = tanks;
    if (countHealEl) countHealEl.textContent = heals;
    if (countChanterEl) countChanterEl.textContent = chanters;
    if (countDpsEl) countDpsEl.textContent = dps;

    if (verdictEl) {
      if (tanks >= 1 && (heals >= 1 || chanters >= 1) && dps >= 1) {
        verdictEl.className = 'synergy-verdict success';
        verdictEl.innerHTML = `✨ <strong>Formação Completa Forte:</strong> ${tanks} Tank, ${heals} Healer, ${chanters} Chanter (Buffs) e ${dps} DPS!`;
      } else if (tanks === 0) {
        verdictEl.className = 'synergy-verdict warning';
        verdictEl.innerHTML = '⚠️ <strong>Atenção:</strong> Nenhum Tank selecionado!';
      } else if (heals === 0 && chanters === 0) {
        verdictEl.className = 'synergy-verdict warning';
        verdictEl.innerHTML = '⚠️ <strong>Perigo:</strong> Nenhum Healer ou Chanter selecionado!';
      } else {
        verdictEl.className = 'synergy-verdict success';
        verdictEl.innerHTML = `🛡️ Grupo pronto com ${tanks} Tank, ${heals} Healer e ${dps} DPS.`;
      }
    }
  }

  function loadPreset(presetKey) {
    const selKharnoxy = document.getElementById('select-kharnoxy');
    const selCiroc = document.getElementById('select-ciroc');
    const selHell = document.getElementById('select-hell');
    const selRafax = document.getElementById('select-rafax');
    const selBroken = document.getElementById('select-brokenboy');

    if (presetKey === 'main') {
      selKharnoxy.selectedIndex = 0;
      selCiroc.selectedIndex = 0;
      selHell.selectedIndex = 0;
      selRafax.selectedIndex = 0;
      if (selBroken) selBroken.selectedIndex = 0;
    } else if (presetKey === 'alt1') {
      selKharnoxy.selectedIndex = 1;
      selCiroc.selectedIndex = 1;
      selHell.selectedIndex = 1;
      selRafax.selectedIndex = 1;
      if (selBroken) selBroken.selectedIndex = 0;
    } else if (presetKey === 'alt2') {
      selKharnoxy.selectedIndex = 0;
      selCiroc.selectedIndex = 3;
      selHell.selectedIndex = 2;
      selRafax.selectedIndex = 0;
      if (selBroken) selBroken.selectedIndex = 1;
    }
    updateTeamBuild();
    playSuccessChime();
  }

  // ===================================================================
  // DUNGEON TRACKER
  // ===================================================================
  const defaultDungeons = [
    { id: 'dg1', name: 'Castelo Abissal (Chaves Semanais)', desc: 'Drops de armas lendárias e gemas da semana.' },
    { id: 'dg2', name: 'Templo dos Caídos (Rush de Armas)', desc: 'Prioridade máxima de armas de classe e baú de ouro.' },
    { id: 'dg3', name: 'Santuário dos Deuses (Acessórios Épicos)', desc: 'Colares, brincos e anéis para fechar conjunto.' },
    { id: 'dg4', name: 'Laboratório Secreto (Materiais de Craft)', desc: 'Farm de pedras de mana e aprimoramentos.' },
    { id: 'dg5', name: 'Desafio Heroico da PT (Pontos de Facção)', desc: 'Pontuação semanal máxima de clã e ranking.' }
  ];

  function renderDungeons() {
    const listEl = document.getElementById('dg-list');
    if (!listEl) return;

    let progress = {};
    try { progress = JSON.parse(localStorage.getItem(STORAGE.DUNGEONS_CACHE)) || {}; } catch(e) {}

    listEl.innerHTML = '';
    defaultDungeons.forEach(dg => {
      const isDone = !!progress[dg.id];
      const div = document.createElement('div');
      div.className = `dg-item ${isDone ? 'completed' : ''}`;
      div.onclick = () => toggleDungeon(dg.id);

      div.innerHTML = `
        <div class="dg-info-text">
          <strong>${dg.name}</strong>
          <span>${dg.desc}</span>
        </div>
        <div class="dg-checkbox">
          ${isDone ? '✓' : ''}
        </div>
      `;
      listEl.appendChild(div);
    });
  }

  function toggleDungeon(dgId) {
    let progress = {};
    try { progress = JSON.parse(localStorage.getItem(STORAGE.DUNGEONS_CACHE)) || {}; } catch(e) {}
    progress[dgId] = !progress[dgId];
    localStorage.setItem(STORAGE.DUNGEONS_CACHE, JSON.stringify(progress));
    renderDungeons();
    if (progress[dgId]) playSuccessChime();
    else playClick();
  }

  function resetDungeons() {
    if (confirm('Deseja resetar o progresso de dungeons desta semana?')) {
      localStorage.removeItem(STORAGE.DUNGEONS_CACHE);
      renderDungeons();
      playClick();
    }
  }

  // ===================================================================
  // CUSTOM NOTES & ANNOUNCEMENTS (SUPABASE)
  // ===================================================================
  const defaultNotes = [
    '⚔️ Quarta-feira focar em terminar as chaves da DG 1 antes das 22h (Horário do Hell).',
    '🔮 Drop de arma mágica tem prioridade para CIROC.',
    '🛡️ Escudos e armaduras pesadas para Kharnoxy (Main Tank).',
    '🌿 Segundas e Terças: Rotação de alts às 19h pontual!'
  ];

  async function loadNotesData() {
    let notes = [];
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('pt_announcements')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          notes = data.map(item => item.content);
        }
      } catch (err) {}
    }

    if (notes.length === 0) {
      try {
        const stored = localStorage.getItem(STORAGE.NOTES_CACHE);
        notes = stored ? JSON.parse(stored) : defaultNotes;
      } catch (e) {
        notes = defaultNotes;
      }
    }

    renderNotes(notes);
  }

  function renderNotes(notes) {
    const notesContainer = document.getElementById('custom-notes-list');
    if (!notesContainer) return;

    notesContainer.innerHTML = '';
    notes.forEach((noteText, idx) => {
      const item = document.createElement('div');
      item.className = 'note-item';
      item.innerHTML = `
        <span>${noteText}</span>
        <button class="delete-note-btn" onclick="AionAgenda.deleteNote(${idx})" title="Remover aviso">✕</button>
      `;
      notesContainer.appendChild(item);
    });
  }

  async function addCustomNote() {
    const input = document.getElementById('note-input');
    if (!input || !input.value.trim()) return;
    const content = input.value.trim();
    const author = loggedUser ? loggedUser.name : 'Kharnoxy';

    // Salvar no Supabase
    if (supabaseClient) {
      try {
        await supabaseClient.from('pt_announcements').insert({
          author: author,
          content: content
        });
      } catch (e) {}
    }

    // Cache local
    let notes = [];
    try {
      const stored = localStorage.getItem(STORAGE.NOTES_CACHE);
      notes = stored ? JSON.parse(stored) : [...defaultNotes];
    } catch(e) {
      notes = [...defaultNotes];
    }
    notes.unshift(content);
    localStorage.setItem(STORAGE.NOTES_CACHE, JSON.stringify(notes));

    input.value = '';
    loadNotesData();
    playSuccessChime();
  }

  async function deleteNote(index) {
    let notes = [];
    try {
      const stored = localStorage.getItem(STORAGE.NOTES_CACHE);
      notes = stored ? JSON.parse(stored) : [...defaultNotes];
    } catch(e) {
      notes = [...defaultNotes];
    }

    notes.splice(index, 1);
    localStorage.setItem(STORAGE.NOTES_CACHE, JSON.stringify(notes));
    renderNotes(notes);
    playClick();
  }

  // ===================================================================
  // INITIALIZATION
  // ===================================================================
  function init() {
    initTabs();
    initSupabase();
    loadSession();
    updateAlarmButtonUI();
    updateSoundBtn();

    updateClock();
    setInterval(updateClock, 1000);

    const noteInput = document.getElementById('note-input');
    if (noteInput) {
      noteInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addCustomNote();
      });
    }

    const passInput = document.getElementById('login-password');
    if (passInput) {
      passInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitLogin();
      });
    }

    loadPresenceData();
    renderDungeons();
    loadNotesData();
    updateTeamBuild();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    toggleSound,
    toggleWindowsAlarm,
    testWindowsAlarm,
    openLoginModal,
    closeLoginModal,
    selectLoginPlayer,
    submitLogin,
    logout,
    selectPresenceStatus,
    submitMyPresence,
    updateTeamBuild,
    loadPreset,
    toggleDungeon,
    resetDungeons,
    addCustomNote,
    deleteNote
  };
})();
