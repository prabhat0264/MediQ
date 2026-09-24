/* =========================================================
   MediQueue — Advanced Healthcare Operating System
   100% Client-Side JavaScript Architecture (Zero Python/Backend Dependency)
   Storage Model:
     localStorage   → mq_users, mq_doctors, mq_tokens, mq_theme, mq_active_doc
     sessionStorage → mq_session (current authenticated user/doctor)
   ========================================================= */

/* ── Web Audio Synthesizer (Zero MP3 Dependencies) ───────── */
let mqAudioCtx = null;
let mqSoundEnabled = true;

function mqPlayHospitalChime() {
  if (!mqSoundEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!mqAudioCtx) mqAudioCtx = new AudioContext();
    if (mqAudioCtx.state === 'suspended') mqAudioCtx.resume();

    const now = mqAudioCtx.currentTime;
    
    // Classic 3-tone hospital chime: G4 (392Hz) -> C5 (523Hz) -> E5 (659Hz)
    const tones = [
      { freq: 392.00, time: 0.00, dur: 0.35 },
      { freq: 523.25, time: 0.28, dur: 0.38 },
      { freq: 659.25, time: 0.56, dur: 0.65 }
    ];

    tones.forEach(t => {
      const osc = mqAudioCtx.createOscillator();
      const gain = mqAudioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(t.freq, now + t.time);

      gain.gain.setValueAtTime(0.001, now + t.time);
      gain.gain.exponentialRampToValueAtTime(0.25, now + t.time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t.time + t.dur);

      osc.connect(gain);
      gain.connect(mqAudioCtx.destination);

      osc.start(now + t.time);
      osc.stop(now + t.time + t.dur);
    });
  } catch (e) {
    console.warn('Audio chime note:', e);
  }
}

/* ── Toast Notification System ────────────────────────────── */
function mqShowToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast-message';
  
  const icon = type === 'success' ? '✓' : type === 'urgent' ? '🚨' : '🔔';
  toast.innerHTML = `<span style="font-size:1.1rem;">${icon}</span><span>${message}</span>`;
  
  if (type === 'urgent') toast.style.borderColor = 'var(--danger)';
  if (type === 'success') toast.style.borderColor = 'var(--success)';

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

/* ── Storage Utilities ────────────────────────────────────── */
function mqGetItem(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    return fallback;
  }
}

function mqSetItem(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch(e) {}
}

function mqGetSession() {
  try {
    const session = sessionStorage.getItem('mq_session') || localStorage.getItem('mq_session');
    return session ? JSON.parse(session) : null;
  } catch (e) {
    return null;
  }
}

function mqSetSession(obj) {
  sessionStorage.setItem('mq_session', JSON.stringify(obj));
  localStorage.setItem('mq_session', JSON.stringify(obj));
}

function mqClearSession() {
  sessionStorage.removeItem('mq_session');
  localStorage.removeItem('mq_session');
}

function mqGetUsers()   { return mqGetItem('mq_users', []); }
function mqGetDoctors() { return mqGetItem('mq_doctors', []); }
function mqGetTokens()  { return mqGetItem('mq_tokens', []); }
function mqSaveTokens(t){ mqSetItem('mq_tokens', t); }

function mqIsValidEmail(val) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val).trim());
}

function mqIsValidPhone(val) {
  return /^[0-9]{10}$/.test(String(val).replace(/\D/g, ''));
}

function mqTodayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function mqTodayFormatted() {
  const d = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/* ── Theme Management ─────────────────────────────────────── */
function mqInitTheme() {
  const savedTheme = localStorage.getItem('mq_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  mqUpdateThemeIcons(savedTheme);

  document.querySelectorAll('#theme-toggle, .theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('mq_theme', next);
      mqUpdateThemeIcons(next);
      mqShowToast(`Switched to ${next === 'dark' ? 'Cyber-Clinical Dark' : 'Clinical Light'} theme`);
    });
  });
}

function mqUpdateThemeIcons(theme) {
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    const sun = btn.querySelector('.sun-icon');
    const moon = btn.querySelector('.moon-icon');
    if (sun && moon) {
      if (theme === 'dark') {
        sun.style.display = 'block';
        moon.style.display = 'none';
      } else {
        sun.style.display = 'none';
        moon.style.display = 'block';
      }
    }
  });
}

/* ── Initial Data Seeding ─────────────────────────────────── */
function mqSeedData() {
  // 1. Seed doctors
  const existingDocs = mqGetDoctors();
  if (!existingDocs || existingDocs.length === 0) {
    const seedDocs = [
      { id:'DR-004', name:'Dr. Rohan Verma',   email:'rohan.verma@mediqueue.in',   dept:'General Medicine', spec:'Internal Medicine & Critical Care', exp:8,  license:'MCI-101556', hours:'08:00 – 14:00', room:'101', rating:4.8, initials:'RV', color:'c4', password:'doctor123' },
      { id:'DR-001', name:'Dr. Anjali Rao',    email:'anjali.rao@mediqueue.in',    dept:'Cardiology',       spec:'Interventional Cardiology',         exp:14, license:'MCI-204831', hours:'10:00 – 16:00', room:'204', rating:4.9, initials:'AR', color:'c1', password:'doctor123' },
      { id:'DR-002', name:'Dr. Sameer Khanna', email:'sameer.khanna@mediqueue.in', dept:'Orthopaedics',     spec:'Joint Replacement & Sports Med',    exp:11, license:'MCI-119024', hours:'09:00 – 13:00', room:'118', rating:4.8, initials:'SK', color:'c2', password:'doctor123' },
      { id:'DR-003', name:'Dr. Meera Iyer',    email:'meera.iyer@mediqueue.in',    dept:'Pediatrics',       spec:'Neonatology & Growth Pediatrics',   exp:9,  license:'MCI-302770', hours:'11:00 – 17:00', room:'302', rating:5.0, initials:'MI', color:'c3', password:'doctor123' },
      { id:'DR-005', name:'Dr. Nisha Pillai',  email:'nisha.pillai@mediqueue.in',  dept:'Dermatology',      spec:'Clinical & Aesthetic Dermatology',  exp:8,  license:'MCI-210341', hours:'12:00 – 18:00', room:'210', rating:4.9, initials:'NP', color:'c5', password:'doctor123' },
      { id:'DR-006', name:'Dr. Arjun Kapoor',  email:'arjun.kapoor@mediqueue.in',  dept:'Neurology',        spec:'Epilepsy & Neuro-Therapeutics',     exp:12, license:'MCI-305129', hours:'14:00 – 19:00', room:'305', rating:4.8, initials:'AK', color:'c6', password:'doctor123' },
    ];
    mqSetItem('mq_doctors', seedDocs);
  }

  // 2. Seed initial users
  const existingUsers = mqGetUsers();
  if (!existingUsers || existingUsers.length === 0) {
    const seedUsers = [
      {
        role: 'patient',
        name: 'Aditi Sharma',
        email: 'aditi@example.com',
        phone: '9876543210',
        age: '28',
        gender: 'Female',
        password: 'password123',
        joined: new Date().toISOString()
      },
      {
        role: 'patient',
        name: 'Aditi Sharma',
        email: 'you@example.com',
        phone: '9876543210',
        age: '28',
        gender: 'Female',
        password: 'password123',
        joined: new Date().toISOString()
      }
    ];
    mqSetItem('mq_users', seedUsers);
  }

  // 3. Seed initial tokens (with real clinical context)
  const existingTokens = mqGetTokens();
  if (!existingTokens || existingTokens.length === 0) {
    const seedTokens = [
      {
        code: 'G-231',
        patientName: 'Aditi Sharma',
        patientEmail: 'aditi@example.com',
        patientPhone: '9876543210',
        doctor: 'Dr. Rohan Verma',
        doctorName: 'Dr. Rohan Verma',
        dept: 'General Medicine',
        date: mqTodayFormatted(),
        prefDate: mqTodayFormatted(),
        status: 'In Consultation',
        reason: 'High fever, sore throat and dry cough for 3 days',
        priority: 'Normal',
        vitals: { age: '28', gender: 'F', blood: 'O+', bp: '120/80', spo2: '99%' },
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        code: 'G-232',
        patientName: 'Vikram Sengupta',
        patientEmail: 'vikram.s@example.com',
        patientPhone: '9811223344',
        doctor: 'Dr. Rohan Verma',
        doctorName: 'Dr. Rohan Verma',
        dept: 'General Medicine',
        date: mqTodayFormatted(),
        prefDate: mqTodayFormatted(),
        status: 'Waiting',
        reason: 'Severe migraine, nausea & photophobia',
        priority: 'Urgent',
        vitals: { age: '34', gender: 'M', blood: 'B+', bp: '135/88', spo2: '98%' },
        createdAt: new Date(Date.now() - 2400000).toISOString()
      },
      {
        code: 'G-233',
        patientName: 'Sunita Mehra',
        patientEmail: 'sunita.m@example.com',
        patientPhone: '9822334455',
        doctor: 'Dr. Rohan Verma',
        doctorName: 'Dr. Rohan Verma',
        dept: 'General Medicine',
        date: mqTodayFormatted(),
        prefDate: mqTodayFormatted(),
        status: 'Waiting',
        reason: 'Diabetes routine 3-month follow-up review',
        priority: 'Normal',
        vitals: { age: '52', gender: 'F', blood: 'A+', bp: '128/82', spo2: '97%' },
        createdAt: new Date(Date.now() - 1800000).toISOString()
      },
      {
        code: 'G-234',
        patientName: 'Devansh Roy',
        patientEmail: 'devansh.r@example.com',
        patientPhone: '9833445566',
        doctor: 'Dr. Rohan Verma',
        doctorName: 'Dr. Rohan Verma',
        dept: 'General Medicine',
        date: mqTodayFormatted(),
        prefDate: mqTodayFormatted(),
        status: 'Waiting',
        reason: 'Acute abdominal cramping after food',
        priority: 'Normal',
        vitals: { age: '24', gender: 'M', blood: 'AB+', bp: '118/76', spo2: '99%' },
        createdAt: new Date(Date.now() - 1200000).toISOString()
      },
      {
        code: 'C-104',
        patientName: 'Rajesh Kulkarni',
        patientEmail: 'rajesh.k@example.com',
        patientPhone: '9844556677',
        doctor: 'Dr. Anjali Rao',
        doctorName: 'Dr. Anjali Rao',
        dept: 'Cardiology',
        date: mqTodayFormatted(),
        prefDate: mqTodayFormatted(),
        status: 'Waiting',
        reason: 'Mild chest tightness upon climbing stairs',
        priority: 'Urgent',
        vitals: { age: '61', gender: 'M', blood: 'O+', bp: '142/90', spo2: '96%' },
        createdAt: new Date(Date.now() - 3000000).toISOString()
      },
      {
        code: 'O-058',
        patientName: 'Kavita Nair',
        patientEmail: 'kavita.n@example.com',
        patientPhone: '9855667788',
        doctor: 'Dr. Sameer Khanna',
        doctorName: 'Dr. Sameer Khanna',
        dept: 'Orthopaedics',
        date: mqTodayFormatted(),
        prefDate: mqTodayFormatted(),
        status: 'Waiting',
        reason: 'Right knee acute twist injury during badminton',
        priority: 'Normal',
        vitals: { age: '31', gender: 'F', blood: 'B+', bp: '115/75', spo2: '99%' },
        createdAt: new Date(Date.now() - 2000000).toISOString()
      },
      {
        code: 'G-229',
        patientName: 'Preeti Deshmukh',
        patientEmail: 'preeti.d@example.com',
        patientPhone: '9866778899',
        doctor: 'Dr. Rohan Verma',
        doctorName: 'Dr. Rohan Verma',
        dept: 'General Medicine',
        date: mqTodayFormatted(),
        prefDate: mqTodayFormatted(),
        status: 'Done',
        reason: 'Seasonal allergy & sinus congestion',
        prescription: {
          doctor: 'Dr. Rohan Verma',
          dept: 'General Medicine',
          diagnosis: 'Allergic Sinusitis',
          medicines: [
            { name: 'Tab. Cetirizine', dose: '10 mg', freq: '0-0-1', dur: '5 days', inst: 'Bedtime' },
            { name: 'Fluticasone Nasal Spray', dose: '50 mcg', freq: '1-0-1', dur: '10 days', inst: '1 puff per nostril' }
          ],
          labs: ['Complete Blood Count (CBC)'],
          advice: 'Steam inhalation twice daily. Avoid dusty environments.',
          followup: 'After 7 days'
        },
        createdAt: new Date(Date.now() - 7200000).toISOString()
      }
    ];
    mqSaveTokens(seedTokens);
  }
}

/* ── Token Code Generator ─────────────────────────────────── */
function mqGenerateTokenCode(dept) {
  const prefix = (dept && dept.length ? dept.charAt(0) : 'G').toUpperCase();
  const tokens = mqGetTokens();
  let num = 230 + tokens.length + 1;
  let code = `${prefix}-${num}`;
  while (tokens.some(t => t.code === code)) {
    num++;
    code = `${prefix}-${num}`;
  }
  return code;
}

/* ── Scroll Hide / Reveal Navbar ─────────────────────────── */
function mqInitScrollNavbar() {
  let lastScrollY = window.pageYOffset || document.documentElement.scrollTop;
  const navbar = document.querySelector('.navbar');
  if(!navbar) return;

  window.addEventListener('scroll', function() {
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
    if(currentScrollY < 0) return;

    if(currentScrollY > lastScrollY && currentScrollY > 60) {
      // User scrolling down -> hide navbar
      navbar.classList.add('nav-hidden');
      document.querySelector('.nav-links')?.classList.remove('open');
    } else if(currentScrollY < lastScrollY) {
      // User scrolling up -> reveal navbar
      navbar.classList.remove('nav-hidden');
    }
    lastScrollY = currentScrollY <= 0 ? 0 : currentScrollY;
  }, { passive: true });
}

/* ── Role-Based Route Privacy Guard ──────────────────────── */
function mqRoleGuard() {
  const session = mqGetSession();
  const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  // Show pending toast notice if redirected from a previous guard check
  const pendingNotice = sessionStorage.getItem('mq_auth_notice');
  if (pendingNotice) {
    sessionStorage.removeItem('mq_auth_notice');
    setTimeout(() => {
      mqShowToast(pendingNotice, 'urgent');
    }, 250);
  }

  // 1. Doctor Station (Clinical Workstation) Guard
  if (file === 'doctor-dashboard.html') {
    if (!session || !session.name) {
      sessionStorage.setItem('mq_auth_notice', 'Please log in with doctor credentials to access the Doctor Workstation.');
      window.location.replace('login.html?role=doctor');
      return false;
    }
    if (session.role !== 'doctor') {
      sessionStorage.setItem('mq_auth_notice', 'Access Denied: Doctor Station is strictly reserved for verified medical doctors.');
      window.location.replace('dashboard.html');
      return false;
    }
  }

  // 2. Patient Dashboard Guard
  if (file === 'dashboard.html') {
    if (!session || !session.name) {
      sessionStorage.setItem('mq_auth_notice', 'Please log in to access your Patient Dashboard.');
      window.location.replace('login.html');
      return false;
    }
    if (session.role === 'doctor') {
      sessionStorage.setItem('mq_auth_notice', 'Doctor session active: Redirected to your Clinical Workstation.');
      window.location.replace('doctor-dashboard.html');
      return false;
    }
  }

  // 3. Book Appointment Guard (Doctors operate via Doctor Station, not patient self-booking)
  if (file === 'book-appointment.html') {
    if (session && session.role === 'doctor') {
      sessionStorage.setItem('mq_auth_notice', 'Doctor session active: Patient self-booking is disabled for clinical accounts.');
      window.location.replace('doctor-dashboard.html');
      return false;
    }
  }

  return true;
}

/* ── Global Navbar Rendering with Role Privacy & Correct Layout ── */
function mqRenderNav() {
  const session = mqGetSession();
  const navCta  = document.querySelector('.nav-cta');
  const navLinksUl = document.querySelector('.nav-links');
  const isRegisterPage = location.pathname.includes('register.html');

  // Strict role-isolated navigation links
  if(navLinksUl) {
    if(isRegisterPage) {
      // During registration: NEVER show dashboard links as requested
      navLinksUl.innerHTML = `
        <li><a href="index.html">Home</a></li>
        <li><a href="book-appointment.html">Book Appointment</a></li>
        <li><a href="my-token.html">Live Queue</a></li>
        <li><a href="login.html">Login</a></li>
      `;
    } else if(session && session.name) {
      if(session.role === 'doctor') {
        // DOCTOR: Only doctor-related clinical work
        navLinksUl.innerHTML = `
          <li><a href="doctor-dashboard.html">Doctor Station <span class="nav-pill-badge">MD</span></a></li>
          <li><a href="my-token.html">Live OPD Queue</a></li>
          <li><a href="index.html">Home</a></li>
        `;
      } else {
        // PATIENT: Only patient-related views and actions
        navLinksUl.innerHTML = `
          <li><a href="index.html">Home</a></li>
          <li><a href="dashboard.html">Patient Dashboard</a></li>
          <li><a href="book-appointment.html">Book Appointment</a></li>
          <li><a href="my-token.html">My Token</a></li>
        `;
      }
    } else {
      // GUEST / UNAUTHENTICATED: Public hospital queue information only
      navLinksUl.innerHTML = `
        <li><a href="index.html">Home</a></li>
        <li><a href="book-appointment.html">Book Appointment</a></li>
        <li><a href="my-token.html">Live Queue</a></li>
        <li><a href="login.html">Login</a></li>
      `;
    }

    // Highlight current active link
    const currentFile = location.pathname.split('/').pop() || 'index.html';
    navLinksUl.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href');
      if(href === currentFile || (currentFile === '' && href === 'index.html')) {
        a.classList.add('active');
      }
    });
  }

  if(!navCta) return;

  // Settings Icon HTML
  const settingsHtml = `
    <a href="settings.html" class="nav-icon-btn ${location.pathname.includes('settings')?'active':''}" aria-label="Settings" title="Settings">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
    </a>
  `;

  // Theme Toggle Button HTML
  const currentTheme = localStorage.getItem('mq_theme') || 'dark';
  const themeBtnHtml = `
    <button type="button" class="theme-toggle-btn" id="theme-toggle" aria-label="Toggle theme" title="Toggle Dark/Light Mode">
      <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${currentTheme === 'dark' ? 'display:block;' : 'display:none;'}"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="${currentTheme === 'light' ? 'display:block;' : 'display:none;'}"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    </button>
  `;

  // Explicit User Requirement: Settings & Toggle Mode MUST be on the RIGHT SIDE of Login / Logout button
  if(session && session.name && !isRegisterPage) {
    const isDoc = session.role === 'doctor';
    const initials = session.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2) || (isDoc ? 'DR' : 'PT');
    const firstName = session.name.split(' ')[0];

    navCta.innerHTML = `
      <div class="nav-user-badge">
        <div class="avatar-sm">${initials}</div>
        <span>${firstName}</span>
        <span class="role-tag ${isDoc ? 'doctor' : 'patient'}">${isDoc ? 'Doctor' : 'Patient'}</span>
      </div>
      <button class="btn btn-ghost btn-sm" id="nav-logout-btn">Log out</button>
      ${settingsHtml}
      ${themeBtnHtml}
    `;

    document.getElementById('nav-logout-btn')?.addEventListener('click', function(e){
      e.preventDefault();
      mqClearSession();
      mqShowToast('Logged out of session.');
      setTimeout(() => { window.location.href = 'index.html'; }, 400);
    });
  } else {
    navCta.innerHTML = `
      ${!isRegisterPage ? `<a href="register.html" class="btn btn-outline btn-sm">Register</a>` : ''}
      <a href="login.html" class="btn btn-primary btn-sm">Login</a>
      ${settingsHtml}
      ${themeBtnHtml}
    `;
  }

  // Re-bind theme toggle click handlers
  mqInitTheme();
}

/* ── Mobile Nav & Link Active State ───────────────────────── */
function mqInitNav() {
  const toggle = document.querySelector('.nav-toggle');
  const links  = document.querySelector('.nav-links');
  if(toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
  }

  // Highlight active link based on current filename
  const currentFile = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if(href === currentFile || (currentFile === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}

function mqInitTelInputs() {
  document.querySelectorAll('input[type="tel"]').forEach(inp => {
    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g,'').slice(0,10);
    });
  });
}

function mqPwStrength(val) {
  let score = 0;
  if(val.length >= 8)  score++;
  if(/[A-Z]/.test(val)) score++;
  if(/[0-9]/.test(val)) score++;
  if(/[^A-Za-z0-9]/.test(val)) score++;
  return score;
}

function mqRenderStrength(score, barEl, labelEl) {
  if(!barEl) return;
  const w = [0,25,50,75,100][score];
  const c = ['','var(--danger)','var(--amber)','var(--cyan)','var(--teal)'][score];
  const l = ['','Weak','Fair','Good','Strong'][score];
  barEl.style.width = w + '%';
  barEl.style.background = c;
  if(labelEl) labelEl.textContent = l ? ('Strength: ' + l) : '';
}

function mqValidateField(input) {
  if(!input) return true;
  const field = input.closest('.field');
  let ok = true;
  const errEl = field ? field.querySelector('.field-error') : null;

  if(input.required && !input.value.trim()) {
    ok = false;
    if(errEl) errEl.textContent = 'This field is required.';
  } else if(input.type === 'email' && input.value.trim() && !mqIsValidEmail(input.value)) {
    ok = false;
    if(errEl) errEl.textContent = 'Enter a valid email address.';
  } else if(input.type === 'tel' && input.value.trim() && !mqIsValidPhone(input.value)) {
    ok = false;
    if(errEl) errEl.textContent = 'Enter a 10-digit phone number.';
  }

  if(field) field.classList.toggle('has-error', !ok);
  return ok;
}

function mqInitRoleTabs() {
  document.querySelectorAll('.role-tabs').forEach(function(tabGroup) {
    const tabs = tabGroup.querySelectorAll('.role-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const role = tab.dataset.role;
        document.querySelectorAll('[data-role-panel]').forEach(p => {
          p.style.display = (p.dataset.rolePanel === role) ? 'block' : 'none';
        });
      });
    });

    if (location.search.includes('role=doctor')) {
      const docTab = tabGroup.querySelector('.role-tab[data-role="doctor"]');
      if (docTab) docTab.click();
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   DOCTOR DASHBOARD CONTROLLER (CLINICAL WORKSTATION)
   ═══════════════════════════════════════════════════════════ */

// Global helper to add a medicine row to prescription pad
window.mqAddMedicineRow = function(name = '', dose = '', freq = '1-0-1', dur = '5 days', inst = 'After meals') {
  const tbody = document.getElementById('rx-meds-body');
  if (!tbody) return;

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" value="${name}" class="rx-m-name" placeholder="Medicine Name"></td>
    <td><input type="text" value="${dose}" class="rx-m-dose" placeholder="Dosage"></td>
    <td>
      <select class="rx-m-freq">
        <option value="1-0-1" ${freq==='1-0-1'?'selected':''}>1-0-1 (Twice daily)</option>
        <option value="1-1-1" ${freq==='1-1-1'?'selected':''}>1-1-1 (Thrice daily)</option>
        <option value="1-0-0" ${freq==='1-0-0'?'selected':''}>1-0-0 (Morning only)</option>
        <option value="0-0-1" ${freq==='0-0-1'?'selected':''}>0-0-1 (Night only)</option>
        <option value="SOS" ${freq==='SOS'?'selected':''}>SOS (As needed)</option>
      </select>
    </td>
    <td><input type="text" value="${dur}" class="rx-m-dur" placeholder="Duration"></td>
    <td><input type="text" value="${inst}" class="rx-m-inst" placeholder="Instructions"></td>
    <td><button type="button" class="btn-del-med" onclick="this.closest('tr').remove()" title="Delete">✕</button></td>
  `;
  tbody.appendChild(tr);
};

function mqInitDoctorDashboard() {
  const isDocDash = document.getElementById('doc-bar-name') || location.pathname.includes('doctor-dashboard');
  if (!isDocDash) return;

  const docs = mqGetDoctors();
  const session = mqGetSession();

  // Determine current active doctor
  let currentDocId = localStorage.getItem('mq_active_doc_id') || (session && session.role === 'doctor' ? session.id : 'DR-004');
  let currentDoc = docs.find(d => d.id === currentDocId) || docs[0] || {
    id: 'DR-004', name: 'Dr. Rohan Verma', dept: 'General Medicine', room: '101', license: 'MCI-101556', initials: 'RV'
  };

  // Sound chime toggle
  const soundBtn = document.getElementById('btn-toggle-sound');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      mqSoundEnabled = !mqSoundEnabled;
      soundBtn.classList.toggle('active', mqSoundEnabled);
      mqShowToast(`Audio chime ${mqSoundEnabled ? 'enabled' : 'muted'}`);
    });
  }

  // Populate doctor switcher dropdown
  const docSelect = document.getElementById('select-doctor-profile');
  if (docSelect) {
    docSelect.innerHTML = docs.map(d => `
      <option value="${d.id}" ${d.id === currentDoc.id ? 'selected' : ''}>${d.name} (${d.dept.split(' ')[0]})</option>
    `).join('');

    docSelect.addEventListener('change', () => {
      const selectedId = docSelect.value;
      localStorage.setItem('mq_active_doc_id', selectedId);
      currentDoc = docs.find(d => d.id === selectedId);
      mqSetSession({ role:'doctor', id: currentDoc.id, name: currentDoc.name, email: currentDoc.email, dept: currentDoc.dept });
      renderDoctorView();
      mqShowToast(`Switched workstation to ${currentDoc.name} (${currentDoc.dept})`);
    });
  }

  // OPD Status selector
  const opdStatusSelect = document.getElementById('select-opd-status');
  const opdLivePill = document.getElementById('opd-live-pill');
  if (opdStatusSelect && opdLivePill) {
    opdStatusSelect.addEventListener('change', () => {
      const val = opdStatusSelect.value;
      if (val === 'active') {
        opdLivePill.className = 'pill pill-serving';
        opdLivePill.textContent = 'OPD Active';
      } else if (val === 'break') {
        opdLivePill.className = 'pill pill-waiting';
        opdLivePill.textContent = 'On 15m Break';
      } else {
        opdLivePill.className = 'pill pill-cancelled';
        opdLivePill.textContent = 'OPD Offline';
      }
    });
  }

  // Logout button on doctor dashboard
  document.getElementById('doctor-logout-btn')?.addEventListener('click', () => {
    mqClearSession();
    mqShowToast('Logged out of Doctor Station');
    setTimeout(() => { window.location.href = 'index.html'; }, 500);
  });

  // Emergency Walk-in Form handler
  const walkinForm = document.getElementById('quick-walkin-form');
  if (walkinForm) {
    walkinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('qw-name');
      const phoneInput = document.getElementById('qw-phone');
      const prioInput = document.getElementById('qw-priority');
      const reasonInput = document.getElementById('qw-reason');

      const code = mqGenerateTokenCode(currentDoc.dept);
      const tokens = mqGetTokens();
      const newToken = {
        code: code,
        patientName: nameInput.value.trim(),
        patientPhone: phoneInput.value.trim(),
        doctor: currentDoc.name,
        doctorName: currentDoc.name,
        dept: currentDoc.dept,
        date: mqTodayFormatted(),
        prefDate: mqTodayFormatted(),
        status: 'Waiting',
        priority: prioInput.value,
        reason: reasonInput.value.trim() || 'Urgent walk-in consultation',
        vitals: { age: '32', gender: 'Adult', blood: 'O+', bp: '124/80', spo2: '99%' },
        createdAt: new Date().toISOString()
      };

      // If urgent, place ahead of regular waiting
      tokens.push(newToken);
      mqSaveTokens(tokens);

      walkinForm.reset();
      mqShowToast(`Token ${code} generated for ${newToken.patientName}! Added to queue.`, 'urgent');
      renderDoctorView();
    });
  }

  // Modal Emergency Walk-in Button in header
  document.getElementById('btn-emergency-modal')?.addEventListener('click', () => {
    const walkinCard = document.getElementById('quick-walkin-form');
    if (walkinCard) {
      walkinCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('qw-name')?.focus();
    }
  });

  // Call Next buttons
  const callNextBtns = [
    document.getElementById('btn-call-next-header'),
    document.getElementById('btn-call-next-queue'),
    document.getElementById('btn-call-next-empty')
  ];
  callNextBtns.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        callNextPatient();
      });
    }
  });

  // Complete Consultation button
  document.getElementById('btn-complete-consultation')?.addEventListener('click', () => {
    completeConsultation();
  });

  // No-Show button
  document.getElementById('btn-noshow-consultation')?.addEventListener('click', () => {
    markNoShow();
  });

  // Preview Rx button
  document.getElementById('btn-preview-rx')?.addEventListener('click', () => {
    openRxModal();
  });

  // Close Rx modal buttons
  ['rx-modal-close', 'rx-modal-close-btn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      document.getElementById('rx-modal-overlay')?.classList.remove('open');
    });
  });

  // Add custom medicine button
  document.getElementById('btn-add-med-row')?.addEventListener('click', () => {
    mqAddMedicineRow('', '', '1-0-1', '5 days', 'After meals');
  });

  // Queue search and filter input listeners
  document.getElementById('queue-search-input')?.addEventListener('input', () => renderQueueList());
  document.getElementById('queue-status-filter')?.addEventListener('change', () => renderQueueList());

  function renderDoctorView() {
    // 1. Update Doctor Info in Header and Bar
    const heroName = document.getElementById('doc-hero-name');
    const heroSub  = document.getElementById('doc-hero-sub');
    const barName  = document.getElementById('doc-bar-name');
    const barDept  = document.getElementById('doc-bar-dept');
    const barRoom  = document.getElementById('doc-bar-room');
    const avatarBadge = document.getElementById('doc-badge-avatar');
    const navName  = document.getElementById('nav-doc-name');
    const navInit  = document.getElementById('nav-doc-initials');

    if (heroName) heroName.textContent = `${currentDoc.name}, MD`;
    if (heroSub)  heroSub.textContent = `Department of ${currentDoc.dept} · Room ${currentDoc.room || '101'} · Lic: ${currentDoc.license || 'MCI-101556'}`;
    if (barName)  barName.textContent = currentDoc.name;
    if (barDept)  barDept.textContent = currentDoc.dept;
    if (barRoom)  barRoom.textContent = `Room ${currentDoc.room || '101'}`;
    if (avatarBadge) avatarBadge.textContent = currentDoc.initials || 'DR';
    if (navName)  navName.textContent = currentDoc.name.split(' ')[1] ? `Dr. ${currentDoc.name.split(' ')[1]}` : currentDoc.name;
    if (navInit)  navInit.textContent = currentDoc.initials || 'DR';

    // 2. Fetch and categorize tokens for this doctor/department
    const tokens = mqGetTokens();
    const docTokens = tokens.filter(t => t.doctor === currentDoc.name || t.dept === currentDoc.dept);

    const inConsultToken = docTokens.find(t => t.status === 'In Consultation');
    const waitingTokens  = docTokens.filter(t => t.status === 'Waiting');
    const doneTokens     = docTokens.filter(t => t.status === 'Done');

    // 3. Update Stat Cards
    const activeTokenVal = document.getElementById('stat-active-token');
    const waitingCountVal = document.getElementById('stat-waiting-count');
    const completedCountVal = document.getElementById('stat-completed-count');

    if (activeTokenVal)   activeTokenVal.textContent = inConsultToken ? inConsultToken.code : 'None';
    if (waitingCountVal)  waitingCountVal.textContent = waitingTokens.length;
    if (completedCountVal)completedCountVal.textContent = doneTokens.length;

    // 4. Update Active Consultation Box vs Empty Box
    const consultBox = document.getElementById('consultation-box');
    const emptyBox   = document.getElementById('consultation-empty');

    if (inConsultToken) {
      if (consultBox) consultBox.style.display = 'block';
      if (emptyBox)   emptyBox.style.display = 'none';

      // Fill patient data
      const nameEl = document.getElementById('active-patient-name');
      const codeEl = document.getElementById('active-token-id');
      const reasonEl = document.getElementById('active-patient-reason');
      const contactEl = document.getElementById('active-patient-contact');
      const vitals = inConsultToken.vitals || { age: '28', gender: 'F', blood: 'O+', bp: '120/80', spo2: '99%' };

      if (nameEl) nameEl.textContent = inConsultToken.patientName;
      if (codeEl) codeEl.textContent = inConsultToken.code;
      if (reasonEl) reasonEl.textContent = inConsultToken.reason || 'Routine consultation';
      if (contactEl) contactEl.textContent = `Phone: ${inConsultToken.patientPhone || '9876543210'} · Status: Active in Room ${currentDoc.room || '101'}`;

      document.getElementById('vital-age-gender').textContent = `${vitals.age || '28'} / ${vitals.gender || 'F'}`;
      document.getElementById('vital-blood').textContent = vitals.blood || 'O+';
      document.getElementById('vital-bp').textContent = vitals.bp || '120/80 mmHg';
      document.getElementById('vital-spo2').textContent = `${vitals.spo2 || '99%'}`;
    } else {
      if (consultBox) consultBox.style.display = 'none';
      if (emptyBox)   emptyBox.style.display = 'block';
    }

    // 5. Render Queue List
    renderQueueList();

    // 6. Render Cross-Department Monitor
    renderDepartmentMonitor();
  }

  function renderQueueList() {
    const container = document.getElementById('queue-list-container');
    const emptyMsg  = document.getElementById('queue-empty-msg');
    if (!container) return;

    const tokens = mqGetTokens();
    const docTokens = tokens.filter(t => t.doctor === currentDoc.name || t.dept === currentDoc.dept);
    
    const searchVal = (document.getElementById('queue-search-input')?.value || '').toLowerCase().trim();
    const filterVal = document.getElementById('queue-status-filter')?.value || 'Waiting';

    let filtered = docTokens.filter(t => {
      const matchSearch = !searchVal || 
        t.code.toLowerCase().includes(searchVal) || 
        t.patientName.toLowerCase().includes(searchVal) ||
        (t.patientPhone && t.patientPhone.includes(searchVal));

      const matchStatus = filterVal === 'all' || t.status === filterVal;
      return matchSearch && matchStatus;
    });

    if (filtered.length === 0) {
      container.innerHTML = '';
      if (emptyMsg) emptyMsg.style.display = 'block';
      return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';

    container.innerHTML = filtered.map(t => {
      const isUrgent = t.priority === 'Urgent';
      const isCurrent = t.status === 'In Consultation';
      const pillClass = t.status === 'Done' ? 'pill-done' : isCurrent ? 'pill-serving' : 'pill-waiting';

      return `
        <div class="queue-patient-row ${isCurrent ? 'in-consult' : ''}">
          <div class="q-left">
            <div class="q-token-box">${t.code}</div>
            <div>
              <div class="q-patient-name">
                ${t.patientName} 
                ${isUrgent ? '<span class="pill pill-urgent" style="margin-left:6px;">URGENT</span>' : ''}
              </div>
              <div class="q-patient-meta">${t.reason || 'General Consult'} · ${t.date || 'Today'}</div>
            </div>
          </div>
          <div class="q-actions">
            <span class="pill ${pillClass}">${t.status}</span>
            ${t.status === 'Waiting' ? `
              <button type="button" class="btn btn-primary btn-sm" onclick="mqCallSpecificToken('${t.code}')">Call Now</button>
            ` : ''}
            ${t.status === 'In Consultation' ? `
              <button type="button" class="btn btn-success btn-sm" onclick="mqCompleteSpecificToken('${t.code}')">Complete</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  function renderDepartmentMonitor() {
    const list = document.getElementById('dept-monitor-list');
    if (!list) return;

    const tokens = mqGetTokens();
    const depts = [
      { name: 'General Medicine', room: '101', doc: 'Dr. Rohan Verma' },
      { name: 'Cardiology', room: '204', doc: 'Dr. Anjali Rao' },
      { name: 'Orthopaedics', room: '118', doc: 'Dr. Sameer Khanna' },
      { name: 'Pediatrics', room: '302', doc: 'Dr. Meera Iyer' },
      { name: 'Dermatology', room: '210', doc: 'Dr. Nisha Pillai' },
      { name: 'Neurology', room: '305', doc: 'Dr. Arjun Kapoor' }
    ];

    list.innerHTML = depts.map(d => {
      const waitingCount = tokens.filter(t => t.dept === d.name && t.status === 'Waiting').length;
      const isCurrent = d.name === currentDoc.dept;
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:${isCurrent ? 'var(--teal-soft)' : 'var(--panel-elevated)'}; border:1px solid ${isCurrent ? 'var(--teal)' : 'var(--line)'}; border-radius:8px;">
          <div>
            <div style="font-weight:700; font-size:0.86rem; color:var(--ink);">${d.name} <span style="font-size:0.75rem; color:var(--slate);">(${d.room})</span></div>
            <div style="font-size:0.74rem; color:var(--slate);">${d.doc}</div>
          </div>
          <div style="text-align:right;">
            <span class="pill ${waitingCount > 0 ? 'pill-waiting' : 'pill-done'}">${waitingCount} waiting</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function callNextPatient() {
    const tokens = mqGetTokens();
    const docTokens = tokens.filter(t => (t.doctor === currentDoc.name || t.dept === currentDoc.dept));
    
    // Find next waiting patient
    // Prioritize Urgent if available
    let nextToken = docTokens.find(t => t.status === 'Waiting' && t.priority === 'Urgent') 
                 || docTokens.find(t => t.status === 'Waiting');

    if (!nextToken) {
      mqShowToast(`No waiting patients for ${currentDoc.name}. Queue is clear!`);
      return;
    }

    // Auto-complete or close previous in-consultation token if any
    tokens.forEach(t => {
      if ((t.doctor === currentDoc.name || t.dept === currentDoc.dept) && t.status === 'In Consultation') {
        t.status = 'Done';
      }
    });

    // Mark next token in consultation
    const target = tokens.find(t => t.code === nextToken.code);
    if (target) {
      target.status = 'In Consultation';
    }

    mqSaveTokens(tokens);
    mqPlayHospitalChime();
    mqShowToast(`Now Calling: Token ${nextToken.code} — ${nextToken.patientName} to Room ${currentDoc.room || '101'}`);
    renderDoctorView();
  }

  window.mqCallSpecificToken = function(code) {
    const tokens = mqGetTokens();
    tokens.forEach(t => {
      if ((t.doctor === currentDoc.name || t.dept === currentDoc.dept) && t.status === 'In Consultation') {
        t.status = 'Done';
      }
      if (t.code === code) {
        t.status = 'In Consultation';
      }
    });
    mqSaveTokens(tokens);
    mqPlayHospitalChime();
    mqShowToast(`Calling Token ${code} into consultation room.`);
    renderDoctorView();
  };

  window.mqCompleteSpecificToken = function(code) {
    const tokens = mqGetTokens();
    const target = tokens.find(t => t.code === code);
    if (target) {
      target.status = 'Done';
      mqSaveTokens(tokens);
      mqShowToast(`Token ${code} marked consultation completed.`);
      renderDoctorView();
    }
  };

  function completeConsultation() {
    const tokens = mqGetTokens();
    const target = tokens.find(t => (t.doctor === currentDoc.name || t.dept === currentDoc.dept) && t.status === 'In Consultation');
    
    if (!target) {
      mqShowToast('No active patient in consultation to complete.');
      return;
    }

    // Collect prescription data
    const diagnosis = document.getElementById('rx-diagnosis')?.value || 'Acute illness';
    const advice = document.getElementById('rx-advice')?.value || 'Routine clinical advice';
    const followup = document.getElementById('rx-followup')?.value || 'After 7 days';

    const meds = [];
    document.querySelectorAll('#rx-meds-body tr').forEach(tr => {
      const name = tr.querySelector('.rx-m-name')?.value.trim();
      const dose = tr.querySelector('.rx-m-dose')?.value.trim();
      const freq = tr.querySelector('.rx-m-freq')?.value;
      const dur  = tr.querySelector('.rx-m-dur')?.value.trim();
      const inst = tr.querySelector('.rx-m-inst')?.value.trim();
      if (name) meds.push({ name, dose, freq, dur, inst });
    });

    const labs = [];
    if (document.getElementById('lab-cbc')?.checked) labs.push('Complete Blood Count (CBC)');
    if (document.getElementById('lab-fbs')?.checked) labs.push('Fasting Blood Sugar');
    if (document.getElementById('lab-lipid')?.checked) labs.push('Lipid Panel');
    if (document.getElementById('lab-xray')?.checked) labs.push('Chest X-Ray');
    if (document.getElementById('lab-ecg')?.checked) labs.push('12-Lead ECG');
    if (document.getElementById('lab-lft')?.checked) labs.push('Liver Function Test');

    target.status = 'Done';
    target.prescription = {
      doctor: currentDoc.name,
      dept: currentDoc.dept,
      room: currentDoc.room || '101',
      license: currentDoc.license || 'MCI-101556',
      diagnosis: diagnosis,
      medicines: meds,
      labs: labs,
      advice: advice,
      followup: followup,
      date: mqTodayFormatted()
    };

    mqSaveTokens(tokens);
    mqShowToast(`Consultation completed for ${target.patientName} (${target.code})! Prescription issued.`, 'success');
    
    // Open prescription modal
    openRxModal(target);
    renderDoctorView();
  }

  function markNoShow() {
    const tokens = mqGetTokens();
    const target = tokens.find(t => (t.doctor === currentDoc.name || t.dept === currentDoc.dept) && t.status === 'In Consultation');
    if (target) {
      target.status = 'Cancelled';
      mqSaveTokens(tokens);
      mqShowToast(`Token ${target.code} marked as No-Show / Cancelled.`);
      renderDoctorView();
    }
  }

  function openRxModal(tokenRecord) {
    const modal = document.getElementById('rx-modal-overlay');
    if (!modal) return;

    const tokens = mqGetTokens();
    const active = tokenRecord || tokens.find(t => (t.doctor === currentDoc.name || t.dept === currentDoc.dept) && t.status === 'In Consultation') 
                 || tokens.filter(t => t.prescription).pop();

    if (!active) {
      mqShowToast('No prescription record available to preview.');
      return;
    }

    const rx = active.prescription || {
      doctor: currentDoc.name,
      dept: currentDoc.dept,
      diagnosis: document.getElementById('rx-diagnosis')?.value || 'Clinical examination',
      medicines: [
        { name: 'Tab. Paracetamol', dose: '650 mg', freq: '1-0-1', dur: '5 days', inst: 'After meals' },
        { name: 'Cap. Amoxicillin + Clav', dose: '625 mg', freq: '1-0-1', dur: '5 days', inst: 'After meals' }
      ],
      labs: ['Complete Blood Count (CBC)'],
      advice: document.getElementById('rx-advice')?.value || 'Hydrate well and rest.',
      followup: 'After 5 days'
    };

    document.getElementById('rx-modal-doc-name').textContent = rx.doctor || currentDoc.name;
    document.getElementById('rx-modal-doc-dept').textContent = rx.dept || currentDoc.dept;
    document.getElementById('rx-modal-doc-lic').textContent = `Reg. No: ${currentDoc.license || 'MCI-101556'} · Room ${currentDoc.room || '101'}`;

    document.getElementById('rx-p-name').textContent = active.patientName || 'Aditi Sharma';
    document.getElementById('rx-p-token').textContent = active.code || 'G-231';
    document.getElementById('rx-p-age').textContent = active.vitals ? `${active.vitals.age} / ${active.vitals.gender}` : '28 / F';
    document.getElementById('rx-p-date').textContent = mqTodayFormatted();
    document.getElementById('rx-p-diag').textContent = rx.diagnosis;
    document.getElementById('rx-modal-advice').textContent = rx.advice;
    document.getElementById('rx-modal-followup').textContent = rx.followup;
    document.getElementById('rx-modal-labs').textContent = rx.labs && rx.labs.length ? rx.labs.join(', ') : 'None indicated at this stage.';

    const medsTbody = document.getElementById('rx-modal-meds-list');
    if (medsTbody) {
      medsTbody.innerHTML = (rx.medicines || []).map((m, idx) => `
        <tr style="border-bottom:1px solid #f1f5f9; font-size:0.86rem;">
          <td style="padding:6px; color:#64748b;">${idx + 1}</td>
          <td style="padding:6px; font-weight:700; color:#0f172a;">${m.name}</td>
          <td style="padding:6px;">${m.dose}</td>
          <td style="padding:6px;"><span style="background:#e0f2fe; color:#0369a1; padding:2px 6px; border-radius:4px; font-weight:700;">${m.freq}</span></td>
          <td style="padding:6px;">${m.dur}</td>
          <td style="padding:6px; color:#475569;">${m.inst}</td>
        </tr>
      `).join('');
    }

    modal.classList.add('open');
  }

  // Initial render
  renderDoctorView();
}

/* ═══════════════════════════════════════════════════════════
   PATIENT REGISTRATION & AUTHENTICATION
   ═══════════════════════════════════════════════════════════ */
function mqInitRegister() {
  const patientForm = document.querySelector('form[data-role-panel="patient"]') || document.getElementById('patient-reg-form');
  const doctorForm  = document.querySelector('form[data-role-panel="doctor"]')  || document.getElementById('doctor-reg-form');
  if(!patientForm && !doctorForm) return;

  // Password strength hooks
  document.querySelectorAll('.pw-strength-wrap').forEach(wrap => {
    const input = wrap.closest('.field')?.querySelector('input[type="password"]');
    const fill  = wrap.querySelector('.pw-strength-fill');
    const label = wrap.querySelector('.pw-strength-label');
    if(input && fill) {
      input.addEventListener('input', () => mqRenderStrength(mqPwStrength(input.value), fill, label));
    }
  });

  // Patient registration
  if(patientForm) {
    patientForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const fnameInput = document.getElementById('p-fname');
      const phoneInput = document.getElementById('p-phone');
      const emailInput = document.getElementById('p-email');
      const ageInput   = document.getElementById('p-age') || document.getElementById('p-dob');
      const genderInput= document.getElementById('p-gender');
      const pwInput    = document.getElementById('p-password');
      const cpwInput   = document.getElementById('p-cpassword');

      let ok = true;
      [fnameInput, phoneInput, emailInput, ageInput, genderInput, pwInput, cpwInput].forEach(inp => {
        if(inp && !mqValidateField(inp)) ok = false;
      });

      if(pwInput && cpwInput && pwInput.value !== cpwInput.value) {
        ok = false;
        const f = cpwInput.closest('.field');
        if(f) {
          f.classList.add('has-error');
          const err = f.querySelector('.field-error');
          if(err) err.textContent = "Passwords don't match.";
        }
      }

      const alertSuccess = patientForm.querySelector('.alert-success');
      const alertError   = patientForm.querySelector('.alert-error');

      if(!ok) {
        if(alertError) {
          alertError.textContent = "Please check the highlighted fields.";
          alertError.style.display = 'block';
          alertError.className = 'alert alert-error show';
        }
        return;
      }

      const email = emailInput.value.trim().toLowerCase();
      const users = mqGetUsers();
      if(users.some(u => u.email.toLowerCase() === email)) {
        if(alertError) {
          alertError.textContent = "An account with this email already exists.";
          alertError.style.display = 'block';
          alertError.className = 'alert alert-error show';
        }
        return;
      }

      const newUser = {
        role: 'patient',
        name: fnameInput.value.trim(),
        phone: phoneInput.value.trim(),
        email: email,
        age: ageInput ? ageInput.value : '28',
        gender: genderInput ? genderInput.value : 'Female',
        password: pwInput.value,
        joined: new Date().toISOString()
      };

      users.push(newUser);
      mqSetItem('mq_users', users);
      mqSetSession({ role:'patient', name: newUser.name, email: newUser.email, phone: newUser.phone });

      if(alertError) alertError.style.display = 'none';
      if(alertSuccess) {
        alertSuccess.textContent = "Account created! Taking you to patient dashboard…";
        alertSuccess.style.display = 'block';
        alertSuccess.className = 'alert alert-success show';
      }

      mqShowToast('Registration successful! Welcome to MediQueue.', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    });
  }

  // Doctor registration
  if(doctorForm) {
    doctorForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const fnameInput   = document.getElementById('d-fname');
      const phoneInput   = document.getElementById('d-phone');
      const emailInput   = document.getElementById('d-email');
      const deptInput    = document.getElementById('d-dept');
      const licenseInput = document.getElementById('d-license');
      const pwInput      = document.getElementById('d-password');
      const cpwInput     = document.getElementById('d-cpassword');

      let ok = true;
      [fnameInput, phoneInput, emailInput, deptInput, licenseInput, pwInput, cpwInput].forEach(inp => {
        if(inp && !mqValidateField(inp)) ok = false;
      });

      if(pwInput && cpwInput && pwInput.value !== cpwInput.value) {
        ok = false;
        const f = cpwInput.closest('.field');
        if(f) {
          f.classList.add('has-error');
          const err = f.querySelector('.field-error');
          if(err) err.textContent = "Passwords don't match.";
        }
      }

      const alertSuccess = doctorForm.querySelector('.alert-success');
      const alertError   = doctorForm.querySelector('.alert-error');

      if(!ok) {
        if(alertError) {
          alertError.textContent = "Please check the highlighted fields.";
          alertError.style.display = 'block';
          alertError.className = 'alert alert-error show';
        }
        return;
      }

      const doctors = mqGetDoctors();
      const newId   = 'DR-' + String(doctors.length + 1).padStart(3, '0');
      const docName = fnameInput.value.trim().startsWith('Dr.') ? fnameInput.value.trim() : `Dr. ${fnameInput.value.trim()}`;
      const initials = docName.replace('Dr. ', '').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'DR';

      const newDoc = {
        id: newId,
        name: docName,
        phone: phoneInput.value.trim(),
        email: emailInput.value.trim().toLowerCase(),
        dept: deptInput ? deptInput.value : 'General Medicine',
        license: licenseInput ? licenseInput.value.trim() : 'MCI-000000',
        password: pwInput.value,
        initials: initials,
        room: '10' + (doctors.length + 1)
      };

      doctors.push(newDoc);
      mqSetItem('mq_doctors', doctors);
      mqSetSession({ role:'doctor', id: newDoc.id, name: newDoc.name, email: newDoc.email, dept: newDoc.dept });
      localStorage.setItem('mq_active_doc_id', newDoc.id);

      if(alertError) alertError.style.display = 'none';
      if(alertSuccess) {
        alertSuccess.textContent = "Doctor credentials registered! Entering Clinical Workstation…";
        alertSuccess.style.display = 'block';
        alertSuccess.className = 'alert alert-success show';
      }

      mqShowToast(`Doctor profile registered for ${docName}!`, 'success');
      setTimeout(() => {
        window.location.href = 'doctor-dashboard.html';
      }, 1000);
    });
  }
}

/* ── Login Logic (Doctor & Patient Routes) ─────────────────── */
function mqInitLogin() {
  const patientForm = document.querySelector('form[data-role-panel="patient"]') || document.getElementById('patient-login-form');
  const doctorForm  = document.querySelector('form[data-role-panel="doctor"]')  || document.getElementById('doctor-login-form');
  if(!patientForm && !doctorForm) return;

  // Patient login
  if(patientForm) {
    patientForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const emailInput = document.getElementById('patient-email') || document.getElementById('pl-email');
      const pwInput    = document.getElementById('patient-password') || document.getElementById('pl-password');
      const alertSuccess = patientForm.querySelector('.alert-success');
      const alertError   = patientForm.querySelector('.alert-error');

      if(!emailInput || !pwInput || !emailInput.value.trim() || !pwInput.value.trim()) {
        if(alertError) {
          alertError.textContent = "Please fill in both fields correctly.";
          alertError.style.display = 'block';
          alertError.className = 'alert alert-error show';
        }
        return;
      }

      const emailVal = emailInput.value.trim().toLowerCase();
      const pwVal    = pwInput.value;
      const users    = mqGetUsers();

      let user = users.find(u => u.email.toLowerCase() === emailVal && u.password === pwVal);

      // Demo fallback
      if(!user && (emailVal === 'you@example.com' || emailVal === 'aditi@example.com' || emailVal.includes('@'))) {
        user = { name: 'Aditi Sharma', email: emailVal, phone: '9876543210', role: 'patient' };
      }

      mqSetSession({ role:'patient', name: user.name, email: user.email, phone: user.phone || '9876543210' });

      if(alertError) alertError.style.display = 'none';
      if(alertSuccess) {
        alertSuccess.textContent = `Welcome back, ${user.name.split(' ')[0]}! Opening patient dashboard…`;
        alertSuccess.style.display = 'block';
        alertSuccess.className = 'alert alert-success show';
      }

      mqShowToast(`Welcome back, ${user.name}!`, 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 700);
    });
  }

  // Doctor login
  if(doctorForm) {
    doctorForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const idInput    = document.getElementById('doctor-id') || document.getElementById('dl-id');
      const pwInput    = document.getElementById('doctor-password') || document.getElementById('dl-password');
      const alertSuccess = doctorForm.querySelector('.alert-success');
      const alertError   = doctorForm.querySelector('.alert-error');

      if(!idInput || !pwInput || !idInput.value.trim() || !pwInput.value.trim()) {
        if(alertError) {
          alertError.textContent = "Please fill in both fields correctly.";
          alertError.style.display = 'block';
          alertError.className = 'alert alert-error show';
        }
        return;
      }

      const idVal = idInput.value.trim();
      const pwVal = pwInput.value;
      const docs  = mqGetDoctors();

      let doc = docs.find(d => (d.id === idVal || d.email.toLowerCase() === idVal.toLowerCase()) && (d.password === pwVal || pwVal === 'doctor123'));

      // Demo fallback
      if(!doc && (idVal === 'DR-1042' || idVal === 'you@hospital.com' || idVal === 'DR-004' || idVal.toLowerCase().includes('rohan') || idVal.includes('@'))) {
        doc = docs.find(d => d.id === 'DR-004') || docs[0];
      }

      if(!doc) {
        if(alertError) {
          alertError.textContent = "Doctor ID or password is incorrect. (Use demo: DR-004 / doctor123)";
          alertError.style.display = 'block';
          alertError.className = 'alert alert-error show';
        }
        return;
      }

      mqSetSession({ role:'doctor', id: doc.id, name: doc.name, email: doc.email, dept: doc.dept || 'General Medicine' });
      localStorage.setItem('mq_active_doc_id', doc.id);

      if(alertError) alertError.style.display = 'none';
      if(alertSuccess) {
        alertSuccess.textContent = `Welcome, ${doc.name}! Launching Clinical Station…`;
        alertSuccess.style.display = 'block';
        alertSuccess.className = 'alert alert-success show';
      }

      mqPlayHospitalChime();
      mqShowToast(`Doctor session verified for ${doc.name}`, 'success');
      setTimeout(() => {
        window.location.href = 'doctor-dashboard.html';
      }, 700);
    });
  }
}

/* ── Home Page Live Board & Modal ─────────────────────────── */
function mqInitHome() {
  const boardRow = document.querySelector('.board-row .token-chip');
  if(boardRow) {
    const demos = ['G-231','C-104','O-058','P-077','D-019','N-043'];
    let tick = 0;
    setInterval(() => {
      tick++;
      boardRow.textContent = demos[tick % demos.length];
    }, 3200);
  }

  // Role-Aware Hero Section Actions (Privacy & Role Relevance)
  const heroActions = document.querySelector('.hero-actions');
  if(heroActions) {
    const session = mqGetSession();
    if(session && session.role === 'doctor') {
      heroActions.innerHTML = `
        <a href="doctor-dashboard.html" class="btn btn-primary btn-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          Doctor Clinical Station
        </a>
        <a href="my-token.html" class="btn btn-outline-white btn-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Live OPD Queue
        </a>
      `;
    } else if(session && session.role === 'patient') {
      heroActions.innerHTML = `
        <a href="book-appointment.html" class="btn btn-secondary btn-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Book Appointment
        </a>
        <a href="my-token.html" class="btn btn-outline-white btn-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Track My Token
        </a>
        <a href="dashboard.html" class="btn btn-cyan btn-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Patient Dashboard
        </a>
      `;
    } else {
      heroActions.innerHTML = `
        <a href="book-appointment.html" class="btn btn-secondary btn-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Book Appointment
        </a>
        <a href="my-token.html" class="btn btn-outline-white btn-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Track My Token
        </a>
        <a href="login.html?role=doctor" class="btn btn-outline-white btn-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          Doctor Login
        </a>
      `;
    }
  }

  // Doctor modal on index.html
  const modal   = document.getElementById('doctor-modal');
  const overlay = document.getElementById('modal-overlay');
  if(!modal || !overlay) return;

  function openModal(card) {
    const photo = modal.querySelector('.modal-photo');
    if(photo) {
      photo.className = 'modal-photo ' + (card.dataset.color || 'c1');
      photo.textContent = card.dataset.initials || 'DR';
    }
    const nameEl   = modal.querySelector('#m-name');
    const specEl   = modal.querySelector('#m-spec');
    const bioEl    = modal.querySelector('#m-bio');
    const hoursEl  = modal.querySelector('#m-hours');
    const roomEl   = modal.querySelector('#m-room');
    const expEl    = modal.querySelector('#m-exp');
    const ratingEl = modal.querySelector('#m-rating');
    const bookBtn  = modal.querySelector('#m-book');

    if(nameEl)   nameEl.textContent   = card.dataset.name || 'Doctor';
    if(specEl)   specEl.textContent   = card.dataset.spec || 'Specialist';
    if(bioEl)    bioEl.textContent    = card.dataset.bio  || '';
    if(hoursEl)  hoursEl.textContent  = card.dataset.hours || 'Mon–Fri';
    if(roomEl)   roomEl.textContent   = 'Room ' + (card.dataset.room || '101');
    if(expEl)    expEl.textContent    = (card.dataset.exp || '10') + ' yrs exp';
    if(ratingEl) ratingEl.textContent = '★ ' + (card.dataset.rating || '4.9');

    if(bookBtn) {
      bookBtn.href = 'book-appointment.html?doc=' + encodeURIComponent(card.dataset.name || '');
    }

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.doctor-card').forEach(card => {
    card.addEventListener('click', () => openModal(card));
  });

  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-close-2')?.addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if(e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });
}

/* ── Book Appointment Page ────────────────────────────────── */
function mqInitBookAppointment() {
  const form = document.getElementById('book-appointment-form') || document.getElementById('book-form');
  if(!form) return;

  const session = mqGetSession();
  const nameInput   = document.getElementById('patient-name') || document.getElementById('ba-name');
  const phoneInput  = document.getElementById('patient-phone') || document.getElementById('ba-phone');
  const dateInput   = document.getElementById('appointment-date') || document.getElementById('ba-date');
  const docSelect   = document.getElementById('doctor-select') || document.getElementById('ba-doctor');
  const reasonInput = document.getElementById('visit-reason') || document.getElementById('ba-reason');

  if(session && session.name) {
    if(nameInput && !nameInput.value) nameInput.value = session.name;
    if(phoneInput && !phoneInput.value && session.phone) phoneInput.value = session.phone;
  }

  // Pre-select doctor if passed via URL ?doc=
  const urlParams = new URLSearchParams(window.location.search);
  const docParam = urlParams.get('doc');
  if(docSelect && docParam) {
    const decoded = decodeURIComponent(docParam).toLowerCase();
    for(let i = 0; i < docSelect.options.length; i++) {
      const optText = docSelect.options[i].text.toLowerCase();
      if(optText.includes(decoded) || docSelect.options[i].value.toLowerCase().includes(decoded)) {
        docSelect.selectedIndex = i;
        break;
      }
    }
  }

  if(dateInput) {
    dateInput.min = mqTodayStr();
    if(!dateInput.value) dateInput.value = mqTodayStr();
  }

  form.addEventListener('submit', function(e) {
    e.preventDefault();

    if(!nameInput.value.trim()) {
      alert('Please enter patient full name.');
      nameInput.focus();
      return;
    }
    if(!docSelect.value) {
      alert('Please select a doctor or department.');
      docSelect.focus();
      return;
    }

    const selectedOption = docSelect.options[docSelect.selectedIndex];
    const dept = selectedOption.dataset.dept || (selectedOption.text.includes('—') ? selectedOption.text.split('—')[1].trim() : 'General Medicine');
    const docName = selectedOption.text.includes('—') ? selectedOption.text.split('—')[0].trim() : selectedOption.text;
    const patientName = nameInput.value.trim();
    const patientPhone = phoneInput ? phoneInput.value.trim() : '9876543210';
    const dateVal = dateInput.value;
    const reasonVal = reasonInput ? reasonInput.value.trim() : 'General Consultation';

    const tokenCode = mqGenerateTokenCode(dept);

    let displayDate = dateVal;
    try {
      const dParts = dateVal.split('-');
      if(dParts.length === 3) {
        const dObj = new Date(parseInt(dParts[0]), parseInt(dParts[1]) - 1, parseInt(dParts[2]));
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        displayDate = `${String(dObj.getDate()).padStart(2, '0')} ${months[dObj.getMonth()]} ${dObj.getFullYear()}`;
      }
    } catch(err) {}

    const newToken = {
      code: tokenCode,
      patientName: patientName,
      patientPhone: patientPhone,
      patientEmail: session ? session.email : 'aditi@example.com',
      doctor: docName,
      doctorName: docName,
      dept: dept,
      date: displayDate,
      prefDate: displayDate,
      rawDate: dateVal,
      reason: reasonVal,
      status: 'Waiting',
      priority: 'Normal',
      vitals: { age: '28', gender: 'Adult', blood: 'O+', bp: '120/80', spo2: '99%' },
      createdAt: new Date().toISOString()
    };

    const tokens = mqGetTokens();
    tokens.push(newToken);
    mqSaveTokens(tokens);
    localStorage.setItem('mq_active_token', JSON.stringify(newToken));

    mqShowToast(`Token ${tokenCode} generated successfully!`, 'success');

    // Display the Token Result Card
    const resultCard = document.getElementById('token-result');
    if(resultCard) {
      resultCard.style.display = 'block';

      const codeEl = document.getElementById('token-result-code') || document.getElementById('tr-code');
      const docEl  = document.getElementById('token-result-doctor') || document.getElementById('tr-doctor');
      const dateEl = document.getElementById('token-result-date') || document.getElementById('tr-date');

      if(codeEl) codeEl.textContent = tokenCode;
      if(docEl)  docEl.textContent  = `${docName} · ${dept}`;
      if(dateEl) dateEl.textContent = `Date: ${displayDate}`;

      let actionRow = document.getElementById('token-result-nav-actions');
      if(!actionRow) {
        actionRow = document.createElement('div');
        actionRow.id = 'token-result-nav-actions';
        actionRow.style.display = 'flex';
        actionRow.style.gap = '12px';
        actionRow.style.marginTop = '18px';
        actionRow.style.flexWrap = 'wrap';
        actionRow.innerHTML = `
          <a href="my-token.html" class="btn btn-primary btn-sm">Track in Live Queue →</a>
          <a href="dashboard.html" class="btn btn-outline btn-sm">Patient Dashboard</a>
          <a href="doctor-dashboard.html" class="btn btn-ghost btn-sm">View in Doctor Station</a>
        `;
        resultCard.appendChild(actionRow);
      }

      resultCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

/* ── My Token / Live Queue Page ───────────────────────────── */
function mqInitMyToken() {
  const table = document.getElementById('my-token-table');
  const tbody = document.getElementById('my-token-list') || document.getElementById('token-tbody');
  const emptyEl = document.getElementById('my-token-empty') || document.getElementById('token-empty');

  if(!tbody && !table) return;

  const tokens = mqGetTokens();
  if(!tokens || tokens.length === 0) {
    if(table) table.style.display = 'none';
    if(emptyEl) emptyEl.style.display = 'block';
    return;
  }

  if(table) table.style.display = '';
  if(emptyEl) emptyEl.style.display = 'none';

  const reversedTokens = tokens.slice().reverse();
  tbody.innerHTML = reversedTokens.map((t, idx) => {
    const isFirst = idx === 0;
    const pillClass = t.status === 'Done' ? 'pill-done' : t.status === 'In Consultation' ? 'pill-serving' : t.status === 'Cancelled' ? 'pill-cancelled' : 'pill-waiting';
    return `
      <tr style="${isFirst ? 'background:var(--teal-soft);' : ''}">
        <td>
          <strong style="color:var(--amber); font-family:var(--font-mono); font-size:1.15rem; letter-spacing:0.04em;">${t.code}</strong>
          ${isFirst ? '<span style="margin-left:8px; font-size:0.68rem; font-weight:800; background:var(--teal); color:#051A18; padding:2px 8px; border-radius:999px;">LATEST</span>' : ''}
        </td>
        <td><strong>${t.patientName || 'Aditi Sharma'}</strong></td>
        <td>${t.doctorName || t.doctor || '—'} <span style="font-size:0.78rem; color:var(--slate);">(${t.dept || 'General'})</span></td>
        <td>${t.prefDate || t.date || '—'}</td>
        <td><span class="pill ${pillClass}">${t.status || 'Waiting'}</span></td>
      </tr>
    `;
  }).join('');
}

/* ── Patient Dashboard Controller ─────────────────────────── */
function mqInitDashboard() {
  const greetingEl = document.getElementById('dashboard-greeting') || document.getElementById('dash-greeting');
  if(!greetingEl && !document.querySelector('.stat-grid')) return;

  const session = mqGetSession();
  const userName = session && session.name ? session.name : 'Aditi Sharma';
  const firstName = userName.split(' ')[0];

  const hour = new Date().getHours();
  const tod = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  if(greetingEl) {
    greetingEl.textContent = `Good ${tod}, ${firstName}`;
  }

  const tokens = mqGetTokens();
  // Active waiting or in consultation token
  const waitingTokens = tokens.filter(t => t.status === 'Waiting' || t.status === 'In Consultation');
  const activeToken = waitingTokens[waitingTokens.length - 1] || null;
  const pastTokens = tokens.filter(t => t.status === 'Done');

  // Update Stat Cards
  const statCards = document.querySelectorAll('.stat-grid .stat-card');
  if(statCards.length >= 4) {
    const tokenVal = statCards[0].querySelector('.stat-value');
    if(tokenVal) tokenVal.textContent = activeToken ? activeToken.code : '—';

    const aheadVal = statCards[1].querySelector('.stat-value');
    if(aheadVal) aheadVal.textContent = activeToken ? (activeToken.status === 'In Consultation' ? 'NOW IN ROOM' : '2') : '0';

    const waitVal = statCards[2].querySelector('.stat-value');
    if(waitVal) waitVal.textContent = activeToken ? (activeToken.status === 'In Consultation' ? 'Calling' : '~15 min') : '0 min';

    const pastVal = statCards[3].querySelector('.stat-value');
    if(pastVal) pastVal.textContent = String(pastTokens.length);
  }

  // Update Upcoming Appointment Panel Table
  const panelCards = document.querySelectorAll('.panel-card');
  if(panelCards.length > 0) {
    const upcomingPanel = panelCards[0];
    const upcomingTbody = upcomingPanel.querySelector('table tbody');
    if(upcomingTbody) {
      if(activeToken) {
        const pillClass = activeToken.status === 'In Consultation' ? 'pill-serving' : 'pill-waiting';
        upcomingTbody.innerHTML = `
          <tr>
            <td><strong style="color:var(--amber); font-family:var(--font-mono); font-size:1.1rem;">${activeToken.code}</strong></td>
            <td>${activeToken.doctorName || activeToken.doctor}</td>
            <td>${activeToken.dept}</td>
            <td>${activeToken.prefDate || activeToken.date}</td>
            <td><span class="pill ${pillClass}">${activeToken.status}</span></td>
          </tr>
        `;
      } else {
        upcomingTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center; padding:18px; color:var(--slate);">
              No active upcoming appointments. <a href="book-appointment.html" class="link-teal">Book an appointment now →</a>
            </td>
          </tr>
        `;
      }
    }
  }

  // Patient quick action shortcuts (strictly patient-focused; zero doctor view switcher)
  const headerContainer = document.querySelector('.app-header .container');
  if(headerContainer && !document.getElementById('patient-to-doc-cta')) {
    const row = document.createElement('div');
    row.id = 'patient-to-doc-cta';
    row.style.marginTop = '14px';
    row.style.display = 'flex';
    row.style.gap = '10px';
    row.style.flexWrap = 'wrap';
    row.innerHTML = `
      <a href="book-appointment.html" class="btn btn-primary btn-sm">+ Book New Appointment</a>
      <a href="my-token.html" class="btn btn-outline btn-sm">View Token Tracker</a>
    `;
    headerContainer.appendChild(row);
  }
}

/* ── Settings Page (Role-Aware Privacy & Options) ────────── */
function mqInitSettings() {
  const form = document.getElementById('settings-form');
  const clearBtn = document.getElementById('btn-clear-session');
  const session = mqGetSession();

  if(form) {
    const nameInp = document.getElementById('settings-name');
    const emailInp = document.getElementById('settings-email');
    const phoneInp = document.getElementById('settings-phone');

    if(session && session.name && nameInp) nameInp.value = session.name;
    if(session && session.email && emailInp) emailInp.value = session.email;
    if(session && session.phone && phoneInp) phoneInp.value = session.phone;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const updated = {
        ...(session || { role:'patient' }),
        name: nameInp.value.trim(),
        email: emailInp.value.trim(),
        phone: phoneInp.value.trim()
      };
      mqSetSession(updated);
      mqShowToast('Profile settings saved successfully!', 'success');
      mqRenderNav();
    });
  }

  // Role-Aware Quick Navigation Links in Settings Page (Strict Isolation)
  const quickNavBox = document.querySelector('.panel-card a[href="dashboard.html"]')?.closest('.panel-card');
  if(quickNavBox) {
    const navContent = quickNavBox.querySelector('div');
    if(navContent) {
      if(session && session.role === 'doctor') {
        navContent.innerHTML = `
          <a href="doctor-dashboard.html" class="btn btn-outline btn-block">Doctor Station (Workstation)</a>
          <a href="my-token.html" class="btn btn-outline btn-block">Live OPD Queue</a>
          <a href="index.html" class="btn btn-ghost btn-block">Back to Home</a>
        `;
      } else if(session && session.role === 'patient') {
        navContent.innerHTML = `
          <a href="dashboard.html" class="btn btn-outline btn-block">Patient Dashboard</a>
          <a href="book-appointment.html" class="btn btn-outline btn-block">Book New Appointment</a>
          <a href="my-token.html" class="btn btn-outline btn-block">View Live Token Tracker</a>
          <a href="index.html" class="btn btn-ghost btn-block">Back to Home</a>
        `;
      } else {
        navContent.innerHTML = `
          <a href="login.html" class="btn btn-primary btn-block">Log In</a>
          <a href="register.html" class="btn btn-outline btn-block">Create Account</a>
          <a href="my-token.html" class="btn btn-outline btn-block">View Live Queue</a>
          <a href="index.html" class="btn btn-ghost btn-block">Back to Home</a>
        `;
      }
    }
  }

  if(clearBtn) {
    clearBtn.addEventListener('click', () => {
      mqClearSession();
      mqShowToast('Session cleared.');
      setTimeout(() => { window.location.href = 'index.html'; }, 500);
    });
  }
}

/* ── Forgot Password Page ─────────────────────────────────── */
function mqInitForgotPassword() {
  const form = document.getElementById('forgot-form');
  if(!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const alertEl = document.getElementById('reset-alert');
    if(alertEl) {
      alertEl.style.display = 'block';
      alertEl.className = 'alert alert-success show';
      alertEl.textContent = 'Password reset instructions sent! Check your inbox.';
    }
    mqShowToast('Reset link dispatched to your email.', 'success');
  });
}

/* ── Real-Time Cross-Tab / Cross-Page Synchronization ──────── */
window.addEventListener('storage', function(e) {
  if(e.key === 'mq_tokens' || e.key === 'mq_active_doc_id') {
    if(location.pathname.includes('doctor-dashboard')) {
      mqInitDoctorDashboard();
    } else if(location.pathname.includes('my-token')) {
      mqInitMyToken();
    } else if(location.pathname.includes('dashboard')) {
      mqInitDashboard();
    }
  }
  if(e.key === 'mq_theme') {
    const theme = e.newValue || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    mqUpdateThemeIcons(theme);
  }
});

/* ═══════════════════════════════════════════════════════════
   GLOBAL APPLICATION ENTRY POINT
   ═══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function() {
  // 1. Enforce strict role-based access privacy first
  if (!mqRoleGuard()) return;

  mqSeedData();
  mqInitTheme();
  mqInitNav();
  mqInitScrollNavbar();
  mqRenderNav();
  mqInitTelInputs();
  mqInitRoleTabs();
  mqInitHome();
  mqInitRegister();
  mqInitLogin();
  mqInitBookAppointment();
  mqInitMyToken();
  mqInitDashboard();
  mqInitDoctorDashboard();
  mqInitSettings();
  mqInitForgotPassword();
});
