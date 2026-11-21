/* Data layer: everything is stored in the browser (localStorage), no server needed. */
const KEY = 'sas_v1';
const NAMES = ['Ayesha Khan','Hamza Ali','Fatima Noor','Usman Raza','Zainab Malik','Bilal Ahmed',
  'Hira Siddiqui','Ali Hassan','Sana Iqbal','Daniyal Shah','Maryam Tariq','Ahmed Raza'];
const NAMES_B = ['Rida Fatima','Saad Mehmood','Noor ul Ain','Hassan Javed','Iqra Aslam','Talha Farooq',
  'Mahnoor Butt','Faizan Qureshi','Laiba Anwar','Zeeshan Haider'];
const NAMES_C = ['Kiran Shahid','Owais Rana','Alina Riaz','Umair Sheikh','Sidra Bashir','Haris Nadeem','Amna Yousuf','Moiz Khalid'];

const todayStr = () => fmt(new Date());
function fmt(d){ const z=n=>String(n).padStart(2,'0'); return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate()); }
function parse(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
const isWeekend = d => d.getDay()===0 || d.getDay()===6;

function seed(){
  const classes = [
    {id:'cs5a', name:'BS CS - Semester 5 (A)', subject:'Human-Computer Interaction', time:'09:00 - 10:30'},
    {id:'cs5b', name:'BS CS - Semester 5 (B)', subject:'Human-Computer Interaction', time:'11:00 - 12:30'},
    {id:'cs3a', name:'BS CS - Semester 3 (A)', subject:'Data Structures', time:'01:00 - 02:30'}
  ];
  const students = [];
  [['cs5a',NAMES],['cs5b',NAMES_B],['cs3a',NAMES_C]].forEach(([c,list])=>{
    list.forEach((n,i)=>students.push({id:c+'-'+(i+1), name:n, roll:c.toUpperCase()+'-'+String(i+1).padStart(2,'0'), classId:c}));
  });
  // deterministic pseudo-random history for the last 35 days (today stays unmarked)
  let s = 42; const rnd = () => (s = (s*16807) % 2147483647) / 2147483647;
  const attendance = {};
  const habit = {}; students.forEach((st,i)=>{ habit[st.id] = [0.97,0.92,0.88,0.8,0.7,0.95,0.85,0.9,0.62,0.93][i%10]; });
  for(let k=1;k<=35;k++){
    const d = new Date(); d.setDate(d.getDate()-k); if(isWeekend(d)) continue;
    const ds = fmt(d); attendance[ds] = {};
    classes.forEach(c=>{
      attendance[ds][c.id] = {};
      students.filter(x=>x.classId===c.id).forEach(st=>{
        const r = rnd();
        attendance[ds][c.id][st.id] = r < habit[st.id] ? (rnd()<0.08?'L':'P') : 'A';
      });
    });
  }
  return {classes, students, attendance, user:{name:'Dr. Sana Rehman', email:'teacher@school.edu'}};
}

const DB = {
  load(){ try{ const raw = localStorage.getItem(KEY); if(raw) return JSON.parse(raw);}catch(e){} const d = seed(); DB.save(d); return d; },
  save(d){ try{ localStorage.setItem(KEY, JSON.stringify(d)); }catch(e){} },
  reset(){ localStorage.removeItem(KEY); }
};
