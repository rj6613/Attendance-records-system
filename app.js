/* Student Attendance System - application logic (vanilla JS, no libraries) */
const ICON = {
  logo:'<svg viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#fff"/><path d="M8 17l5 5 11-12" stroke="#1f3a68" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  mark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h4"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.900 1.900 6.500 5.500"/><path d="M16 4.500a3.500 3.500 0 010 7M18 14.800c2 .6 3.200 2.300 3.500 5.200"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 11l5 5 5-5M4 20h16"/></svg>',
  print:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/></svg>'
};
const STATUS = {P:{t:'Present',i:'check'}, L:{t:'Late',i:'clock'}, A:{t:'Absent',i:'x'}};
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const qs = k => new URLSearchParams(location.search).get(k);
const initials = n => n.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
const longDate = s => parse(s).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const LOW = 75, GOOD = 85;

let db = DB.load();

/* ---------- calculations ---------- */
function classStudents(cid){ return db.students.filter(s=>s.classId===cid); }
function className(cid){ const c=db.classes.find(c=>c.id===cid); return c?c.name:'-'; }
function recordsFor(sid, from, to){
  const out=[]; Object.keys(db.attendance).sort().forEach(ds=>{
    if(from && ds<from) return; if(to && ds>to) return;
    const st = db.students.find(s=>s.id===sid); if(!st) return;
    const v = db.attendance[ds][st.classId] && db.attendance[ds][st.classId][sid];
    if(v) out.push({date:ds, v});
  }); return out;
}
function summarize(recs){
  const P=recs.filter(r=>r.v==='P').length, L=recs.filter(r=>r.v==='L').length, A=recs.filter(r=>r.v==='A').length;
  const total=P+L+A; return {P,L,A,total,pct: total? Math.round((P+L)/total*100):null};
}
function daysAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return fmt(d); }
const last30 = sid => summarize(recordsFor(sid, daysAgo(30), todayStr()));
const level = p => p===null?'na': p>=GOOD?'ok': p>=LOW?'warn':'bad';
const levelText = p => p===null?'No data': p>=GOOD?'Good': p>=LOW?'Watch':'At risk';

/* ---------- shared UI ---------- */
function toast(msg, type='ok', action){
  let box=$('#toasts'); if(!box){ box=document.createElement('div'); box.id='toasts'; box.setAttribute('role','status'); box.setAttribute('aria-live','polite'); document.body.append(box); }
  const t=document.createElement('div'); t.className='toast '+type; t.innerHTML='<span>'+esc(msg)+'</span>';
  if(action){ const b=document.createElement('button'); b.textContent=action.label; b.onclick=()=>{action.fn(); t.remove();}; t.append(b); }
  box.append(t); setTimeout(()=>t.remove(), action?7000:3500);
}
function modal(html, onMount){
  const ov=document.createElement('div'); ov.className='overlay'; ov.innerHTML='<div class="modal" role="dialog" aria-modal="true">'+html+'</div>';
  const close=()=>{ov.remove(); document.removeEventListener('keydown',onKey); prev&&prev.focus&&prev.focus();};
  const onKey=e=>{ if(e.key==='Escape') close(); };
  const prev=document.activeElement;
  document.addEventListener('keydown',onKey);
  ov.addEventListener('mousedown',e=>{ if(e.target===ov) close(); });
  document.body.append(ov); const f=$('input,select,button',ov); f&&f.focus();
  onMount&&onMount(ov,close); return close;
}
function confirmBox(title,text,okLabel,onOk,danger){
  modal('<h2>'+esc(title)+'</h2><p>'+esc(text)+'</p><div class="actions"><button class="btn ghost" data-x>Cancel</button><button class="btn '+(danger?'danger':'')+'" data-ok>'+esc(okLabel)+'</button></div>',
    (ov,close)=>{ $('[data-x]',ov).onclick=close; $('[data-ok]',ov).onclick=()=>{close(); onOk();}; });
}
function requireAuth(){ if(!sessionStorage.getItem('sas_user')){ location.replace('index.html'); return false; } return true; }
function shell(active,title,sub,actions=''){
  const nav=[['dashboard','dashboard.html','home','Dashboard'],['attendance','attendance.html','mark','Mark attendance'],['students','students.html','users','Students'],['reports','reports.html','chart','Reports']];
  document.body.innerHTML='<div class="app"><aside class="side"><div class="brand">'+ICON.logo+'<span>Attendance</span></div><nav class="nav" aria-label="Main">'+
    nav.map(n=>'<a href="'+n[1]+'"'+(n[0]===active?' aria-current="page"':'')+'>'+ICON[n[2]]+'<span>'+n[3]+'</span></a>').join('')+
    '</nav><div class="userbox"><b>'+esc(db.user.name)+'</b>'+esc(db.user.email)+'<button id="logout">Log out</button></div></aside>'+
    '<main id="main"><div class="top"><div><div class="crumbs" id="crumbs"></div><h1>'+esc(title)+'</h1>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div><div class="row no-print">'+actions+'</div></div><div id="view"></div></main></div>';
  $('#logout').onclick=()=>confirmBox('Log out?','You will need to sign in again to mark attendance.','Log out',()=>{sessionStorage.removeItem('sas_user'); location.href='index.html';});
  return $('#view');
}
function meter(p){ return '<div class="meter"><div class="track"><div class="fill '+level(p)+'" style="width:'+(p||0)+'%"></div></div><b>'+(p===null?'-':p+'%')+'</b></div>'; }
function chip(kind,label,icon){ return '<span class="chip '+kind+'">'+(icon?ICON[icon]:'')+esc(label)+'</span>'; }
function statusChip(p){ return chip(level(p), levelText(p), p!==null&&p<LOW?'x':p!==null&&p<GOOD?'clock':p!==null?'check':''); }

/* ---------- pages ---------- */
const pages = {

login(){
  if(sessionStorage.getItem('sas_user')){ location.replace('dashboard.html'); return; }
  document.body.innerHTML='<div class="login"><section class="hero"><div class="row" style="gap:10px;font-weight:700;font-size:1.1rem"><span style="width:34px;height:34px;display:inline-block">'+ICON.logo+'</span>Student Attendance System</div>'+
  '<div><h1>Take attendance in under a minute.</h1><p>Pick a class, tap Present, Late or Absent for each student, and save. Reports update automatically.</p></div>'+
  '<ul><li>'+ICON.check+'Clear status for every student before you save</li><li>'+ICON.check+'Low attendance is flagged automatically</li><li>'+ICON.check+'Export any class report to CSV or print it</li></ul></section>'+
  '<section class="formside"><form id="f" novalidate><h2 style="font-size:1.6rem;margin:0">Teacher sign in</h2>'+
  '<div id="alert"></div>'+
  '<div class="field" id="fe"><label for="email">Email</label><input id="email" type="email" autocomplete="username" placeholder="name@school.edu"><span class="msg"></span></div>'+
  '<div class="field" id="fp"><label for="pw">Password</label><div class="pw"><input id="pw" type="password" autocomplete="current-password"><button type="button" id="show" aria-pressed="false">Show</button></div><span class="msg"></span></div>'+
  '<button class="btn" type="submit">Sign in</button>'+
  '<div class="demo"><b>Demo account</b><br>Email: teacher@school.edu<br>Password: attend123 <button type="button" id="fill" class="btn ghost" style="min-height:34px;padding:4px 12px;margin-top:8px">Fill for me</button></div></form></section></div>';
  const setErr=(id,m)=>{ const f=$('#'+id); f.classList.toggle('err',!!m); $('.msg',f).textContent=m||''; };
  $('#show').onclick=e=>{ const i=$('#pw'); const s=i.type==='password'; i.type=s?'text':'password'; e.target.textContent=s?'Hide':'Show'; e.target.setAttribute('aria-pressed',s); };
  $('#fill').onclick=()=>{ $('#email').value='teacher@school.edu'; $('#pw').value='attend123'; $('#pw').focus(); };
  $('#f').onsubmit=e=>{ e.preventDefault(); $('#alert').innerHTML='';
    const em=$('#email').value.trim(), pw=$('#pw').value; let bad=false;
    if(!em){ setErr('fe','Enter your email address.'); bad=true; } else if(!/^\S+@\S+\.\S+$/.test(em)){ setErr('fe','Email should look like name@school.edu.'); bad=true; } else setErr('fe','');
    if(!pw){ setErr('fp','Enter your password.'); bad=true; } else setErr('fp','');
    if(bad) return;
    if(em.toLowerCase()===db.user.email && pw==='attend123'){ sessionStorage.setItem('sas_user','1'); location.href='dashboard.html'; }
    else $('#alert').innerHTML='<div class="alert" role="alert">Email or password is incorrect. Check them and try again.</div>';
  };
},

dashboard(){
  if(!requireAuth()) return;
  const t=todayStr();
  const v=shell('dashboard','Good day, '+db.user.name.split(' ')[0]+' '+db.user.name.split(' ')[1],longDate(t));
  const all=db.students.map(s=>({s,r:last30(s.id)}));
  const withData=all.filter(x=>x.r.total); const avg=withData.length?Math.round(withData.reduce((a,x)=>a+x.r.pct,0)/withData.length):0;
  const risk=all.filter(x=>x.r.pct!==null&&x.r.pct<LOW).sort((a,b)=>a.r.pct-b.r.pct);
  const marked=db.classes.filter(c=>db.attendance[t]&&db.attendance[t][c.id]).length;
  // last 7 school days overall %
  const days=[]; for(let k=1;days.length<7&&k<40;k++){ const d=daysAgo(k); if(db.attendance[d]) days.unshift(d); }
  const dayPct=d=>{ let p=0,n=0; Object.values(db.attendance[d]).forEach(c=>Object.values(c).forEach(x=>{n++; if(x!=='A')p++;})); return n?Math.round(p/n*100):0; };
  v.innerHTML='<div class="grid g4">'+
    '<div class="card stat"><span class="n">'+db.students.length+'</span><span class="l">Students in '+db.classes.length+' classes</span></div>'+
    '<div class="card stat '+(marked===db.classes.length?'ok':'warn')+'"><span class="n">'+marked+' of '+db.classes.length+'</span><span class="l">Classes marked today</span></div>'+
    '<div class="card stat ok"><span class="n">'+avg+'%</span><span class="l">Average attendance, last 30 days</span></div>'+
    '<div class="card stat '+(risk.length?'bad':'ok')+'"><span class="n">'+risk.length+'</span><span class="l">Students below '+LOW+'%</span></div></div>'+
    '<div class="grid g2" style="margin-top:18px"><div class="card"><h2>Today\'s classes</h2><ul class="list">'+
    db.classes.map(c=>{ const done=db.attendance[t]&&db.attendance[t][c.id]; return '<li><div><div class="t">'+esc(c.subject)+'</div><div class="s">'+esc(c.name)+' - '+esc(c.time)+'</div></div><div class="row">'+(done?chip('ok','Marked','check'):chip('warn','Not marked yet','clock'))+'<a class="btn '+(done?'ghost':'')+'" href="attendance.html?class='+c.id+'">'+(done?'Review':'Mark attendance')+'</a></div></li>'; }).join('')+
    '</ul></div><div class="card"><h2>Needs attention</h2>'+
    (risk.length?'<ul class="list">'+risk.slice(0,5).map(x=>'<li><div><a class="t" href="student.html?id='+x.s.id+'">'+esc(x.s.name)+'</a><div class="s">'+esc(className(x.s.classId))+'</div></div>'+chip('bad',x.r.pct+'%','x')+'</li>').join('')+'</ul>':'<div class="empty">Everyone is above '+LOW+'%. Nice work.</div>')+'</div></div>'+
    '<div class="card" style="margin-top:18px"><h2>Attendance, last '+days.length+' school days</h2><div class="bars" role="img" aria-label="Bar chart of daily attendance percentage">'+
    days.map(d=>{ const p=dayPct(d); return '<div class="b"><span class="v">'+p+'%</span><div class="col" style="height:'+p*.8+'%"></div><span class="d">'+parse(d).toLocaleDateString('en-GB',{weekday:'short',day:'numeric'})+'</span></div>'; }).join('')+'</div></div>';
},

attendance(){
  if(!requireAuth()) return;
  const v=shell('attendance','Mark attendance','Choose a class and date, then set a status for every student.');
  let cid=qs('class')||db.classes[0].id, date=qs('date')||todayStr(), marks={}, saved={}, dirty=false, q='';
  const load=()=>{ saved=Object.assign({}, (db.attendance[date]&&db.attendance[date][cid])||{}); marks=Object.assign({},saved); dirty=false; };
  load();
  v.innerHTML='<div class="card no-print"><div class="row"><div class="field"><label for="cls">Class</label><select id="cls">'+db.classes.map(c=>'<option value="'+c.id+'">'+esc(c.name)+' - '+esc(c.subject)+'</option>').join('')+'</select></div>'+
    '<div class="field"><label for="dt">Date</label><input id="dt" type="date" max="'+todayStr()+'"></div>'+
    '<div class="field" style="flex:1"><label for="q">Find student</label><input id="q" type="search" placeholder="Type a name or roll number"></div></div></div>'+
    '<div class="summary" id="sum" aria-live="polite"></div><div class="card" id="list"></div>'+
    '<div class="savebar"><div class="row"><button class="btn ghost" id="allp">'+ICON.check+'Mark all present</button><button class="btn ghost" id="clr">Clear all</button></div><div class="row"><span class="state" id="state"></span><button class="btn" id="save">Save attendance</button></div></div>';
  $('#cls').value=cid; $('#dt').value=date;
  const list=()=>classStudents(cid);
  function drawList(){
    const rows=list().filter(s=>!q||(s.name+' '+s.roll).toLowerCase().includes(q));
    $('#list').innerHTML=rows.length?rows.map(s=>{ const m=marks[s.id]; return '<div class="stu'+(m?'':' missing')+'" id="r-'+s.id+'"><div class="who"><div class="av" aria-hidden="true">'+esc(initials(s.name))+'</div><div><b>'+esc(s.name)+'</b><span>'+esc(s.roll)+'</span></div></div>'+
      '<div class="seg" role="radiogroup" aria-label="Status for '+esc(s.name)+'">'+['P','L','A'].map(k=>'<input type="radio" name="m-'+s.id+'" id="'+s.id+'-'+k+'" value="'+k+'"'+(m===k?' checked':'')+'><label for="'+s.id+'-'+k+'">'+ICON[STATUS[k].i]+STATUS[k].t+'</label>').join('')+'</div></div>'; }).join(''):'<div class="empty">No student matches "'+esc(q)+'".</div>';
    $$('#list input').forEach(i=>i.onchange=()=>{ const sid=i.name.slice(2); marks[sid]=i.value; dirty=true; $('#r-'+sid).classList.remove('missing'); drawSummary(); });
  }
  function drawSummary(){
    const L=list(), n=L.length; const c={P:0,L:0,A:0}; L.forEach(s=>{ if(marks[s.id]) c[marks[s.id]]++; });
    const done=c.P+c.L+c.A, left=n-done;
    $('#sum').innerHTML='<div class="row" style="justify-content:space-between"><b>'+esc(className(cid))+' - '+esc(longDate(date))+'</b><span>'+done+' of '+n+' marked</span></div>'+
      '<div class="stack" aria-hidden="true"><i class="p" style="width:'+c.P/n*100+'%"></i><i class="l" style="width:'+c.L/n*100+'%"></i><i class="a" style="width:'+c.A/n*100+'%"></i></div>'+
      '<div class="legend"><span style="color:var(--present)">Present '+c.P+'</span><span style="color:var(--late)">Late '+c.L+'</span><span style="color:var(--absent)">Absent '+c.A+'</span></div>';
    const b=$('#save'); b.disabled=left>0||!dirty; b.textContent=left>0?'Mark '+left+' more to save':(dirty?'Save attendance':'Saved');
    const st=$('#state'); st.className='state'+(dirty?' dirty':(Object.keys(saved).length?' saved':''));
    st.textContent=dirty?'Unsaved changes':(Object.keys(saved).length?'All changes saved':'Not marked yet');
  }
  function guard(go){ if(!dirty) return go(); confirmBox('Discard unsaved changes?','You have changes that are not saved yet.','Discard changes',go,true); }
  $('#cls').onchange=e=>{ const nv=e.target.value; guard(()=>{ cid=nv; load(); drawList(); drawSummary(); }); if(dirty) e.target.value=cid; };
  $('#dt').onchange=e=>{ const nv=e.target.value; if(!nv||nv>todayStr()){ toast('Choose today or an earlier date.','bad'); e.target.value=date; return; } guard(()=>{ date=nv; load(); drawList(); drawSummary(); }); if(dirty) e.target.value=date; };
  $('#q').oninput=e=>{ q=e.target.value.trim().toLowerCase(); drawList(); };
  $('#allp').onclick=()=>{ list().forEach(s=>marks[s.id]='P'); dirty=true; drawList(); drawSummary(); toast('Everyone marked present. Change any exceptions, then save.'); };
  $('#clr').onclick=()=>{ marks={}; dirty=true; drawList(); drawSummary(); };
  $('#save').onclick=()=>{
    const prev=db.attendance[date]&&db.attendance[date][cid]?Object.assign({},db.attendance[date][cid]):null;
    db.attendance[date]=db.attendance[date]||{}; db.attendance[date][cid]=Object.assign({},marks); DB.save(db); saved=Object.assign({},marks); dirty=false; drawSummary();
    toast('Attendance saved for '+className(cid)+'.','ok',{label:'Undo',fn:()=>{ if(prev) db.attendance[date][cid]=prev; else delete db.attendance[date][cid]; DB.save(db); load(); drawList(); drawSummary(); toast('Save undone.'); }});
  };
  window.addEventListener('beforeunload',e=>{ if(dirty){ e.preventDefault(); e.returnValue=''; } });
  drawList(); drawSummary();
},

students(){
  if(!requireAuth()) return;
  const v=shell('students','Students','Everyone you teach, with their last 30 days of attendance.','<button class="btn" id="add">'+ICON.plus+'Add student</button>');
  let f=qs('class')||'all', q='';
  v.innerHTML='<div class="card"><div class="row" style="margin-bottom:12px"><div class="field"><label for="fc">Class</label><select id="fc"><option value="all">All classes</option>'+db.classes.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join('')+'</select></div>'+
    '<div class="field" style="flex:1"><label for="fq">Search</label><input id="fq" type="search" placeholder="Name or roll number"></div></div><div class="tablewrap" id="tb"></div></div>';
  $('#fc').value=f;
  const draw=()=>{
    const rows=db.students.filter(s=>(f==='all'||s.classId===f)&&(!q||(s.name+' '+s.roll).toLowerCase().includes(q)));
    $('#tb').innerHTML=rows.length?'<table><thead><tr><th>Roll no.</th><th>Name</th><th>Class</th><th>Attendance (30 days)</th><th>Status</th><th></th></tr></thead><tbody>'+rows.map(s=>{ const r=last30(s.id); return '<tr><td>'+esc(s.roll)+'</td><td><a href="student.html?id='+s.id+'">'+esc(s.name)+'</a></td><td>'+esc(className(s.classId))+'</td><td>'+meter(r.pct)+'</td><td>'+statusChip(r.pct)+'</td><td><a href="student.html?id='+s.id+'">View</a></td></tr>'; }).join('')+'</tbody></table>':'<div class="empty">No students found. Try a different search or add a new student.</div>';
  };
  $('#fc').onchange=e=>{f=e.target.value; draw();}; $('#fq').oninput=e=>{q=e.target.value.trim().toLowerCase(); draw();};
  $('#add').onclick=()=>modal('<h2>Add a student</h2><form id="sf" novalidate style="display:grid;gap:8px;margin-top:12px">'+
    '<div class="field" id="fn"><label for="nn">Full name</label><input id="nn" placeholder="e.g. Areeba Nasir"><span class="msg"></span></div>'+
    '<div class="field" id="fr"><label for="nr">Roll number</label><input id="nr" placeholder="e.g. CS5A-13"><span class="msg"></span></div>'+
    '<div class="field" id="fcl"><label for="nc">Class</label><select id="nc"><option value="">Choose a class</option>'+db.classes.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join('')+'</select><span class="msg"></span></div>'+
    '<div class="actions"><button type="button" class="btn ghost" data-x>Cancel</button><button class="btn" type="submit">Add student</button></div></form>',
    (ov,close)=>{ $('[data-x]',ov).onclick=close;
      const err=(id,m)=>{ const e=$('#'+id,ov); e.classList.toggle('err',!!m); $('.msg',e).textContent=m||''; return !!m; };
      $('#sf',ov).onsubmit=e=>{ e.preventDefault(); const n=$('#nn',ov).value.trim(), r=$('#nr',ov).value.trim().toUpperCase(), c=$('#nc',ov).value;
        let bad=false;
        bad=err('fn', n.length<3?'Enter the student\'s full name (at least 3 letters).':'')||bad;
        bad=err('fr', !r?'Enter a roll number.': db.students.some(s=>s.roll===r)?'This roll number is already used.':'')||bad;
        bad=err('fcl', !c?'Choose a class.':'')||bad;
        if(bad) return;
        db.students.push({id:c+'-'+Date.now(), name:n, roll:r, classId:c}); DB.save(db); close(); f='all'; $('#fc').value='all'; draw(); toast(n+' was added to '+className(c)+'.'); };
    });
  draw();
},

student(){
  if(!requireAuth()) return;
  const s=db.students.find(x=>x.id===qs('id'));
  if(!s){ const v=shell('students','Student not found',''); v.innerHTML='<div class="card empty">This student does not exist or was removed. <a href="students.html">Back to students</a></div>'; return; }
  const v=shell('students',s.name,s.roll+' - '+className(s.classId),'<button class="btn ghost danger" id="del" style="color:var(--absent);border-color:var(--absent)">Remove student</button>');
  $('#crumbs').innerHTML='<a href="students.html">Students</a> / '+esc(s.name);
  const r=last30(s.id); const lv=level(r.pct);
  const recs={}; recordsFor(s.id).forEach(x=>recs[x.date]=x.v);
  const start=new Date(); start.setDate(start.getDate()-34); const cells=[]; for(let i=0;i<start.getDay();i++) cells.push('<div></div>');
  for(let i=0;i<35;i++){ const d=new Date(start); d.setDate(start.getDate()+i); const ds=fmt(d); const x=recs[ds]; const off=isWeekend(d)||!x;
    cells.push('<div class="day '+(x?x:'off')+'"><b>'+d.getDate()+'</b>'+(x?STATUS[x].t:(isWeekend(d)?'Off':'-'))+'</div>'); }
  v.innerHTML='<div class="card"><div class="profile"><div class="ring '+lv+'" style="--p:'+(r.pct||0)+'"><span>'+(r.pct===null?'-':r.pct+'%')+'</span></div><div><h2 style="margin:0">Last 30 days</h2><p style="margin:6px 0 10px" class="hint">Late counts as attended.</p>'+statusChip(r.pct)+'</div>'+
    '<div class="row" style="margin-left:auto">'+chip('P','Present '+r.P,'check')+chip('L','Late '+r.L,'clock')+chip('A','Absent '+r.A,'x')+'</div></div></div>'+
    '<div class="card" style="margin-top:18px"><h2>Calendar</h2><div class="days" style="margin-bottom:8px;text-align:center;font-weight:600;color:var(--muted);font-size:.85rem">'+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>'<span>'+d+'</span>').join('')+'</div><div class="days">'+cells.join('')+'</div></div>';
  $('#del').onclick=()=>confirmBox('Remove '+s.name+'?','Their name and attendance history will no longer appear in reports. This cannot be undone.','Remove student',()=>{ db.students=db.students.filter(x=>x.id!==s.id); DB.save(db); location.href='students.html'; },true);
},

reports(){
  if(!requireAuth()) return;
  const v=shell('reports','Reports','Monthly attendance per class. Students below '+LOW+'% are flagged.','<button class="btn ghost" id="csv">'+ICON.down+'Export CSV</button><button class="btn ghost" id="prt">'+ICON.print+'Print</button>');
  const months=[0,1,2].map(k=>{ const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()-k); return {v:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'), t:d.toLocaleDateString('en-GB',{month:'long',year:'numeric'})}; });
  let cid=db.classes[0].id, mon=months[0].v, sort='pct', dir=1, data=[];
  v.innerHTML='<div class="card no-print"><div class="row"><div class="field"><label for="rc">Class</label><select id="rc">'+db.classes.map(c=>'<option value="'+c.id+'">'+esc(c.name)+'</option>').join('')+'</select></div>'+
    '<div class="field"><label for="rm">Month</label><select id="rm">'+months.map(m=>'<option value="'+m.v+'">'+m.t+'</option>').join('')+'</select></div></div></div><div id="cards" class="grid g4" style="margin-top:18px"></div><div class="card" style="margin-top:18px"><div class="tablewrap" id="tb"></div></div>';
  function compute(){
    const from=mon+'-01', to=mon+'-31';
    data=classStudents(cid).map(s=>({s, r:summarize(recordsFor(s.id,from,to))}));
    const days=Object.keys(db.attendance).filter(d=>d>=from&&d<=to&&db.attendance[d][cid]).length;
    const w=data.filter(x=>x.r.total); const avg=w.length?Math.round(w.reduce((a,x)=>a+x.r.pct,0)/w.length):null;
    const low=w.filter(x=>x.r.pct<LOW).length;
    const best=w.length?w.reduce((a,b)=>b.r.pct>a.r.pct?b:a):null;
    $('#cards').innerHTML='<div class="card stat"><span class="n">'+days+'</span><span class="l">Days recorded</span></div><div class="card stat ok"><span class="n">'+(avg===null?'-':avg+'%')+'</span><span class="l">Class average</span></div><div class="card stat '+(low?'bad':'ok')+'"><span class="n">'+low+'</span><span class="l">Students below '+LOW+'%</span></div><div class="card stat"><span class="n" style="font-size:1.25rem;padding:.55rem 0">'+(best?esc(best.s.name):'-')+'</span><span class="l">Highest attendance</span></div>';
    draw();
  }
  function draw(){
    const rows=[...data].sort((a,b)=> sort==='name'? a.s.name.localeCompare(b.s.name)*dir : ((a.r.pct??-1)-(b.r.pct??-1))*dir);
    $('#tb').innerHTML=rows.some(x=>x.r.total)?'<table><thead><tr><th>Roll no.</th><th><button data-s="name" title="Sort by name">Name '+(sort==='name'?(dir>0?'&#9650;':'&#9660;'):'')+'</button></th><th>Present</th><th>Late</th><th>Absent</th><th><button data-s="pct" title="Sort by percentage">Attendance '+(sort==='pct'?(dir>0?'&#9650;':'&#9660;'):'')+'</button></th><th>Status</th></tr></thead><tbody>'+
      rows.map(x=>'<tr><td>'+esc(x.s.roll)+'</td><td><a href="student.html?id='+x.s.id+'">'+esc(x.s.name)+'</a></td><td>'+x.r.P+'</td><td>'+x.r.L+'</td><td>'+x.r.A+'</td><td>'+meter(x.r.pct)+'</td><td>'+statusChip(x.r.pct)+'</td></tr>').join('')+'</tbody></table>':'<div class="empty">No attendance was recorded for this class in this month yet. <a href="attendance.html?class='+cid+'">Mark attendance</a></div>';
    $$('[data-s]').forEach(b=>b.onclick=()=>{ if(sort===b.dataset.s) dir=-dir; else {sort=b.dataset.s; dir=sort==='pct'?1:1;} draw(); });
  }
  $('#rc').onchange=e=>{cid=e.target.value; compute();}; $('#rm').onchange=e=>{mon=e.target.value; compute();};
  $('#prt').onclick=()=>window.print();
  $('#csv').onclick=()=>{
    const lines=[['Roll','Name','Present','Late','Absent','Percent']].concat(data.map(x=>[x.s.roll,x.s.name,x.r.P,x.r.L,x.r.A,x.r.pct===null?'':x.r.pct]));
    const blob=new Blob([lines.map(l=>l.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n')],{type:'text/csv'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='attendance-'+cid+'-'+mon+'.csv'; a.click(); toast('Report downloaded as CSV.');
  };
  compute();
}
};

document.addEventListener('DOMContentLoaded',()=>{ const p=document.body.dataset.page; pages[p]&&pages[p](); });
