// app.js - lógica da aplicação
const SIGNS_DB = 'data/signs.json';
const STORAGE_KEY = 'ce_progress_v1';
let signs = [];
let progress = {};
let queue = [];
let current = null;

async function loadSigns(){
  try{
    const r = await fetch(SIGNS_DB, {cache: 'no-cache'});
    signs = await r.json();
  }catch(e){
    console.error('Erro a carregar sinais', e);
    signs = [];
  }
}

function loadProgress(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(raw){
    try{ progress = JSON.parse(raw);}catch(e){progress={}}
  }else progress = {}
}

function saveProgress(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function initQueue(){
  // compute weights: items with low score appear more
  queue = signs.map(s=>{
    const p = progress[s.id]||{correct:0,wrong:0,seen:0};
    const weight = Math.max(1, (p.wrong - p.correct) + 1 + Math.floor(Math.random()*2));
    return {id:s.id, weight};
  }).flatMap(item=> Array(item.weight).fill(item.id));
  shuffle(queue);
}

function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

function pickNext(){
  if(!queue.length) initQueue();
  const id = queue.shift();
  const s = signs.find(x=>x.id===id) || signs[Math.floor(Math.random()*signs.length)];
  return s;
}

function showSign(s, hideInfo=true){
  const img = document.getElementById('signImage');
  const name = document.getElementById('signName');
  const desc = document.getElementById('signDesc');
  const wrap = document.getElementById('imageWrap');
  wrap.classList.add('fade');
  setTimeout(()=>wrap.classList.remove('fade'),300);
  img.src = s.image || 'images/placeholder.svg';
  img.alt = s.name;
  name.textContent = hideInfo? '—' : s.name;
  desc.textContent = hideInfo? 'Clique em Revelar para ver o nome e significado.' : s.description;
  current = s;
  progress[s.id] = progress[s.id]||{correct:0,wrong:0,seen:0};
  progress[s.id].seen += 1;
  saveProgress();
  updateStatsUI();
}

function reveal(){ if(!current) return; document.getElementById('signName').textContent = current.name; document.getElementById('signDesc').textContent = current.description; }

function markLearned(){ if(!current) return; progress[current.id] = progress[current.id]||{correct:0,wrong:0,seen:0}; progress[current.id].correct +=1; saveProgress(); next(); }

function recordWrong(){ if(!current) return; progress[current.id] = progress[current.id]||{correct:0,wrong:0,seen:0}; progress[current.id].wrong +=1; // push it back several times
  for(let i=0;i<3;i++) queue.push(current.id);
  saveProgress(); }

function next(){ const s = pickNext(); showSign(s, true); }

function initUI(){
  document.getElementById('reveal').addEventListener('click',()=>reveal());
  document.getElementById('learned').addEventListener('click',()=>{markLearned();});
  document.getElementById('skip').addEventListener('click',()=>{next();});
  document.getElementById('toggle-dark').addEventListener('click', toggleDark);
  document.getElementById('reset').addEventListener('click', resetProgress);
  document.getElementById('quizMode').addEventListener('click', openQuiz);
  document.getElementById('statsBtn').addEventListener('click', openStats);
  document.getElementById('closeStats').addEventListener('click', ()=>document.getElementById('statsModal').close());
  document.getElementById('closeQuiz').addEventListener('click', ()=>document.getElementById('quizModal').close());
  document.getElementById('search').addEventListener('input', onSearch);
}

function updateStatsUI(){
  const learned = signs.filter(s=> (progress[s.id] && progress[s.id].correct>=3)).length;
  const total = signs.length;
  const toLearn = total - learned;
  const corrects = Object.values(progress).reduce((a,b)=>a+(b.correct||0),0);
  const wrongs = Object.values(progress).reduce((a,b)=>a+(b.wrong||0),0);
  const rate = corrects+wrongs? Math.round((corrects/(corrects+wrongs))*100):0;
  const level = Math.max(1, Math.floor(learned/5)+1);
  document.getElementById('statLearned').textContent = learned;
  document.getElementById('statToLearn').textContent = toLearn;
  document.getElementById('statRate').textContent = rate + '%';
  document.getElementById('level').textContent = level;
}

function resetProgress(){ if(!confirm('Reiniciar todo o progresso?')) return; localStorage.removeItem(STORAGE_KEY); loadProgress(); initQueue(); updateStatsUI(); next(); }

function onSearch(e){ const q = e.target.value.trim().toLowerCase(); const res = document.getElementById('results'); res.innerHTML=''; if(!q) return; const items = signs.filter(s=> s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)); items.slice(0,20).forEach(s=>{ const el = document.createElement('div'); el.className='item'; el.textContent = s.name; el.addEventListener('click', ()=>{ showSign(s,false); }); res.appendChild(el); }); }

// Quiz logic
function openQuiz(){
  // pick a sign and 3 distractors
  const real = signs[Math.floor(Math.random()*signs.length)];
  const others = shuffle(signs.filter(s=>s.id!==real.id)).slice(0,3);
  const opts = shuffle([real, ...others]);
  const optionsEl = document.getElementById('options');
  document.getElementById('quizImage').src = real.image || 'images/placeholder.svg';
  optionsEl.innerHTML = '';
  opts.forEach(o=>{
    const btn = document.createElement('button'); btn.textContent = o.name; btn.addEventListener('click', ()=>{
      if(o.id===real.id){ alert('Correto!'); progress[real.id]=progress[real.id]||{correct:0,wrong:0,seen:0}; progress[real.id].correct +=1; saveProgress(); updateStatsUI(); document.getElementById('quizModal').close(); }
      else{ alert('Errado — ' + real.name); recordWrong(); document.getElementById('quizModal').close(); }
    }); optionsEl.appendChild(btn);
  });
  document.getElementById('quizModal').showModal();
}

function openStats(){ const el = document.getElementById('statsDetail'); el.innerHTML = '<ul>' + signs.map(s=>{ const p = progress[s.id]||{correct:0,wrong:0,seen:0}; return `<li><strong>${s.name}</strong> — acertos:${p.correct} erros:${p.wrong} visto:${p.seen}</li>`; }).join('') + '</ul>'; document.getElementById('statsModal').showModal(); }

// Dark mode
function toggleDark(){ const root = document.documentElement; if(root.getAttribute('data-theme')==='dark'){ root.removeAttribute('data-theme'); localStorage.removeItem('ce_theme'); } else{ root.setAttribute('data-theme','dark'); localStorage.setItem('ce_theme','dark'); }}

async function registerSW(){ if('serviceWorker' in navigator){ try{ await navigator.serviceWorker.register('sw.js'); console.log('SW registado'); }catch(e){console.error('SW falhou',e);} }}

async function start(){ await loadSigns(); loadProgress(); if(localStorage.getItem('ce_theme')) document.documentElement.setAttribute('data-theme','dark'); initQueue(); initUI(); updateStatsUI(); next(); registerSW(); }

start();

// expose some helpers for debugging
window._app = {signs, progress};
