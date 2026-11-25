import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './config.js';
import {today,validateResult,diff} from './logic.js';
const aliases={status:'statusMsg',date:'diaryDate',save:'saveBtn',reload:'reloadBtn',backup:'backupBtn',logout:'logoutBtn',history:'pastDiaryList',memo:'memoInput',original:'originalInput',correct:'correctBtn',ipa:'showPronounceKo',rate:'speechRate',stop:'stopSpeakBtn',remove:'deleteBtn',results:'annotatedDiary'};
const $=id=>document.getElementById(id)||document.getElementById(aliases[id]);const status=(s,bad=false)=>{$('status').textContent=s;$('status').classList.toggle('error',bad);};
const configured=!SUPABASE_URL.includes('YOUR-PROJECT')&&!SUPABASE_PUBLISHABLE_KEY.includes('YOUR-');
const db=configured?createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY):null;let user=null,date=today(),sentences=[],dirty=false,busy=false,version=null,epoch=0;
const showError=e=>status(e?.message||String(e),true);const lock=v=>{busy=v;for(const id of ['save','reload','backup','correct','remove','date','memo','original','logout'])$(id).disabled=v;};
function reset(){ $('memo').value='';$('original').value='';sentences=[];version=null;dirty=false;render(); }
function changed(){dirty=true;}
$('memo').addEventListener('input',()=>{if(sentences[0]?.usedMemo){sentences=[];render();}changed();});$('original').addEventListener('input',()=>{sentences=[];changed();render();});
function stop(){if('speechSynthesis' in window)window.speechSynthesis.cancel();}
function speak(s){if(!('speechSynthesis' in window))return status('이 브라우저는 음성 재생을 지원하지 않습니다.',true);stop();const u=new SpeechSynthesisUtterance(s);u.lang='en-US';u.rate=Number($('rate').value);const v=speechSynthesis.getVoices().find(v=>v.lang==='en-US'&&v.localService);if(v)u.voice=v;u.onerror=e=>{if(!['interrupted','canceled'].includes(e.error))status('영어 음성 재생 실패. 기기 음성 설정을 확인하세요.',true);};speechSynthesis.speak(u);}
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
// Keep the existing JSONB array format, including old saved entries.
function normalizeCorrection(data, original, usedMemo=false){
 if(Array.isArray(data?.sentences)) return validateResult(data);
 const str=v=>typeof v==='string' && v.length<=12000;
 const o=data?.originalSentences,c=data?.correctedSentences,k=data?.pronunciationKo,g=data?.grammarPoints;
 if(!str(data?.correctedDiary)||!data.correctedDiary.trim()||!Array.isArray(o)||!Array.isArray(c)||!Array.isArray(k)||!c.length||c.length>100||o.length!==c.length||k.length!==c.length||![...o,...c,...k].every(v=>str(v)&&v.trim())||!Array.isArray(g)||g.length>20||!g.every(x=>x&&['pattern','meaning','explanation','example'].every(f=>str(x[f])))) throw Error('새 교정 결과 형식 오류');
 return c.map((corrected,i)=>({original:o[i],corrected,ipa:'',grammar:'',pronunciationKo:k[i],...(i===0?{correctedDiary:data.correctedDiary,grammarPoints:g,vocabulary:Array.isArray(data.vocabulary)?data.vocabulary:[],usedMemo}: {}),...(data.reviews?.[i]?{review:data.reviews[i]}:{})}));
}
function annotate(root, original, corrected){
 // Compare the complete text using the existing bounded word diff.
 const d=diff(original,corrected);let a=0,b=0;
 while(a<d.before.length||b<d.after.length){
  const x=d.before[a],y=d.after[b];
  if(x&&!x.changed&&y&&!y.changed){root.append(document.createTextNode(x.text));a++;b++;continue;}
  let old='',replacement='';
  while(a<d.before.length&&d.before[a].changed)old+=d.before[a++].text;
  while(b<d.after.length&&d.after[b].changed)replacement+=d.after[b++].text;
  if(!old&&!replacement){if(x){root.append(document.createTextNode(x.text));a++;}if(y)b++;continue;}
  const mark=el('span',undefined,'mark markup-token error');
  mark.append(el('del',old||'⌃',replacement?'':'omission'),el('ins',replacement||'삭제','correction-note'));root.append(mark);
 }
}
function studyTable(headers,rows){const t=el('table',undefined,'study-table');const head=el('thead'), hr=el('tr');headers.forEach(x=>hr.append(el('th',x)));head.append(hr);t.append(head);const body=el('tbody');for(const row of rows){const tr=el('tr');row.forEach(x=>tr.append(el('td',String(x??''))));body.append(tr);}t.append(body);return t;}
function renderStudy(){const reviews=document.getElementById('sentenceReview'),vocab=document.getElementById('vocabulary');reviews.replaceChildren();vocab.replaceChildren();if(!sentences.length){reviews.append(el('p','교정 후 표시됩니다.','hint'));vocab.append(el('p','교정 후 표시됩니다.','hint'));return;}sentences.forEach((s,i)=>{const r=s.review||{},card=el('article',undefined,'review');card.append(el('h3',`${i+1}. ${r.translation||'문장 '+(i+1)}`),el('p','기존: '+s.original,'en old'),el('p','수정: '+s.corrected,'en new'));const b=el('button','▶ 듣기','listen');b.onclick=()=>speak(s.corrected);card.append(b);if($('ipa').checked&&s.pronunciationKo)card.append(el('p',s.pronunciationKo,'hint'));if(Array.isArray(r.changes)&&r.changes.length)card.append(studyTable(['기존 표현','수정 표현','첨삭 이유'],r.changes.map(x=>[x.before,x.after,x.reason])));else card.append(el('p',s.grammar||'상세 첨삭은 새 AI 교정 후 표시됩니다.','hint'));reviews.append(card);});const words=sentences[0].vocabulary;if(Array.isArray(words)&&words.length){vocab.append(studyTable(['단어 / 표현','한국어 발음','뜻'],words.map(w=>[w.word,w.pronunciationKo,w.meaning])));}else vocab.append(el('p','단어 목록은 새 AI 교정 후 표시됩니다.','hint'));}
function render(){renderStudy();
 const root=$('results');root.replaceChildren();root.classList.toggle('empty-state',!sentences.length);
 const externalCorrected=document.getElementById('correctedDiaryText');
 const externalGrammar=document.getElementById('grammarPoints');
 const externalPron=document.getElementById('pronounceKoContent');
 const pronWrap=document.getElementById('pronounceKoWrap');
 for(const node of [externalCorrected,externalGrammar,externalPron])node?.replaceChildren();
 pronWrap?.classList.add('hidden');
 if(!sentences.length){root.append(el('p','아직 교정 결과가 없습니다. 영어 일기를 작성하고 AI 교정을 누르세요.','hint'));return;}
 const corrected=sentences[0].correctedDiary||sentences.map(s=>s.corrected).join(' ');
 const line=el('div',undefined,'annotation annotated-diary');line.style.whiteSpace='pre-wrap';line.style.lineHeight='2.5';
 annotate(line,$('original').value,corrected);root.append(line);
 const target=externalCorrected||el('section',undefined,'corrected-line');
 if(!externalCorrected){target.append(el('h2','교정된 전체 일기'));root.append(target);}
 const paragraph=el('p',corrected);paragraph.style.whiteSpace='pre-wrap';target.append(paragraph);
 const listen=el('button','▶ 전체 교정문 듣기','listen');listen.onclick=()=>speak(corrected);target.append(listen);
 const sentenceControls=el('div');
 sentences.forEach((s,i)=>{const btn=el('button',`▶ ${i+1}번째 문장`,'listen');btn.onclick=()=>speak(s.corrected);btn.title=s.corrected;sentenceControls.append(btn);});target.append(sentenceControls);
 const grammar=externalGrammar||el('section',undefined,'grammar-points');
 if(!externalGrammar){grammar.append(el('h2','표현 / 문법 포인트'));root.append(grammar);}
 const points=sentences[0].grammarPoints;
 if(Array.isArray(points)&&points.length){for(const point of points){const card=el('div',undefined,'grammar-card');card.append(el('h3',point.pattern,'pattern'),el('p',point.meaning,'meaning'),el('p',point.explanation,'explain'),el('p','예문: '+point.example,'example'));if(point.translation)card.append(el('p',point.translation,'translation'));if(point.pronunciationKo&&$('ipa').checked)card.append(el('p',point.pronunciationKo,'pronunciation'));const b=el('button','▶ 예문 듣기','listen');b.onclick=()=>speak(point.example);card.append(b);grammar.append(card);}}
 else {for(const s of sentences){if(s.grammar)grammar.append(el('p',s.grammar,'grammar'));}if(!grammar.textContent.trim())grammar.append(el('p','문법 포인트가 없습니다.'));}
 if($('ipa').checked){const pron=externalPron||el('section',undefined,'pronounce-ko-wrap');if(!externalPron){pron.append(el('h2','한국어 발음 (근사 표기)'));root.append(pron);}pronWrap?.classList.remove('hidden');
  for(const s of sentences){if(s.pronunciationKo)pron.append(el('p',s.corrected),el('p',s.pronunciationKo,'ipa'));}
  if(!sentences.some(s=>s.pronunciationKo))pron.append(el('p','기존 교정에는 한국어 발음이 없습니다. 새 AI 교정을 실행하세요.'));
 }
 const all=document.getElementById('speakAllBtn');if(all)all.onclick=()=>speak(corrected);
}
$('ipa').onchange=render;$('stop').onclick=stop;
const pronunciationLabel=$('ipa').closest('label');
if(pronunciationLabel){for(const node of pronunciationLabel.childNodes){if(node.nodeType===3&&node.textContent.includes('IPA'))node.textContent=' 한국어 발음 표시';}}
async function history(){const {data,error}=await db.from('diaries').select('diary_date').eq('user_id',user.id).order('diary_date',{ascending:false}).limit(1000);if(error)throw error;const root=$('history');root.replaceChildren();for(const row of data){const b=el('button',row.diary_date,row.diary_date===date?'active':'');b.onclick=()=>load(row.diary_date);root.append(b);}if(!data.length)root.append(el('small','아직 저장한 일기가 없습니다.'));}
async function load(next,force=false){if(!user||busy||!next)return;if(dirty&&!force&&!confirm('저장하지 않은 변경 사항을 버리고 이동할까요?')){$('date').value=date;return;}lock(true);try{const {data,error}=await db.from('diaries').select('*').eq('user_id',user.id).eq('diary_date',next).maybeSingle();if(error)throw error;date=next;$('date').value=date;stop();reset();if(data){$('memo').value=data.memo;$('original').value=data.original;sentences=Array.isArray(data.sentences)?data.sentences:[];version=data.updated_at;render();}await history();status(data?'저장된 일기를 불러왔습니다.':'새 일기를 작성하세요.');}catch(e){$('date').value=date;showError(e);}finally{lock(false);}}
$('date').onchange=()=>load($('date').value);$('reload').onclick=()=>load(date);
$('save').onclick=async()=>{if(!user||busy)return;lock(true);try{const row={user_id:user.id,diary_date:date,memo:$('memo').value,original:$('original').value,sentences};let q=version?db.from('diaries').update(row).eq('user_id',user.id).eq('diary_date',date).eq('updated_at',version):db.from('diaries').insert(row);const {data,error}=await q.select('updated_at');if(error){if(error.code==='23505')throw Error('다른 기기에 저장된 일기가 있습니다. 다시 불러온 뒤 수정하세요.');throw error;}if(!data.length)throw Error('다른 기기에서 변경되었습니다. 내용을 복사한 뒤 다시 불러오세요.');version=data[0].updated_at;dirty=false;await history();status('클라우드에 저장했습니다.');}catch(e){showError(e);}finally{lock(false);}};
$('correct').onclick=async()=>{if(!user||busy)return;const original=$('original').value;if(!original.trim())return status('영어 일기를 먼저 작성하세요.',true);const useMemo=$('useMemo').checked;const memo=useMemo?$('memo').value:'';if(!confirm((useMemo?'영어 원문과 한국어 메모를':'영어 원문을')+' 외부 AI로 전송합니다. 민감정보가 없는지 확인하세요. 계속할까요?'))return;lock(true);status('AI 교정 중…');try{const {data,error}=await db.functions.invoke('correct-diary',{body:{original,memo}});if(error){const detail=await error.context?.json?.().catch(()=>null);throw Error('AI 교정 실패: '+(detail?.provider_error||detail?.error||error.message));}sentences=normalizeCorrection(data,original,useMemo);changed();render();status('교정 완료. 일기 저장을 눌러 다른 기기에서도 확인하세요.');}catch(e){showError(e);}finally{lock(false);}};
$('remove').onclick=async()=>{if(!user||busy||!version||!confirm(`${date} 일기를 삭제할까요?`))return;lock(true);try{const {data,error}=await db.from('diaries').delete().eq('user_id',user.id).eq('diary_date',date).eq('updated_at',version).select('diary_date');if(error)throw error;if(!data.length)throw Error('다른 기기에서 변경된 일기입니다. 다시 불러오세요.');reset();await history();status('삭제했습니다.');}catch(e){showError(e);}finally{lock(false);}};
$('backup').onclick=async()=>{if(!user||busy)return;lock(true);try{let rows=[],offset=0;while(true){const {data,error}=await db.from('diaries').select('*').eq('user_id',user.id).order('diary_date').range(offset,offset+499);if(error)throw error;rows.push(...data);if(data.length<500)break;offset+=500;}const url=URL.createObjectURL(new Blob([JSON.stringify(rows,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download=`diary-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('백업 완료. 파일에는 개인 일기가 포함됩니다.');}catch(e){showError(e);}finally{lock(false);}};
async function session(s){if(busy){setTimeout(()=>session(s).catch(showError),150);return;}const id=s?.user?.id;if(id===user?.id&&user)return;epoch++;user=s?.user||null;stop();reset();$('app').hidden=!user;$('logout').hidden=!user;$('login').hidden=!!user;if(user){await load(today(),true);}else{status('본인 계정으로 로그인하세요.');}}
$('loginForm').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{const {data,error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;$('password').value='';await session(data.session);}catch(e){showError(e);}finally{b.disabled=false;}};
$('logout').onclick=async()=>{if(dirty&&!confirm('저장하지 않은 변경 사항을 버릴까요?'))return;const {error}=await db.auth.signOut({scope:'local'});if(error)return showError(error);await session(null);};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
if(!configured){status('설정 필요: docs/config.js에 Supabase URL과 공개 키를 입력하세요.',true);}else{db.auth.onAuthStateChange((_event,s)=>{setTimeout(()=>session(s).catch(showError),0);});const {data,error}=await db.auth.getSession();if(error)showError(error);else await session(data.session);}
