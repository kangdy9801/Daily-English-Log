import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './config.js';
import {today,validateResult,diff} from './logic.js';
const $=id=>document.getElementById(id);const status=(s,bad=false)=>{$('status').textContent=s;$('status').classList.toggle('error',bad);};
const configured=!SUPABASE_URL.includes('YOUR-PROJECT')&&!SUPABASE_PUBLISHABLE_KEY.includes('YOUR-');
const db=configured?createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY):null;let user=null,date=today(),sentences=[],dirty=false,busy=false,version=null,epoch=0;
const showError=e=>status(e?.message||String(e),true);const lock=v=>{busy=v;for(const id of ['save','reload','backup','correct','remove','date','memo','original','logout'])$(id).disabled=v;};
function reset(){ $('memo').value='';$('original').value='';sentences=[];version=null;dirty=false;render(); }
function changed(){dirty=true;}
$('memo').addEventListener('input',changed);$('original').addEventListener('input',()=>{sentences=[];changed();render();});
function stop(){if('speechSynthesis' in window)window.speechSynthesis.cancel();}
function speak(s){if(!('speechSynthesis' in window))return status('이 브라우저는 음성 재생을 지원하지 않습니다.',true);stop();const u=new SpeechSynthesisUtterance(s);u.lang='en-US';u.rate=Number($('rate').value);const v=speechSynthesis.getVoices().find(v=>v.lang==='en-US'&&v.localService);if(v)u.voice=v;u.onerror=e=>{if(!['interrupted','canceled'].includes(e.error))status('영어 음성 재생 실패. 기기 음성 설정을 확인하세요.',true);};speechSynthesis.speak(u);}
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function render(){
 const root=$('results');root.replaceChildren();
 if(!sentences.length){root.append(el('p','아직 교정 결과가 없습니다. 영어 일기를 작성하고 AI 교정을 누르세요.','hint'));return;}
 sentences.forEach((s,i)=>{
  const card=el('article');card.append(el('small',`SENTENCE ${String(i+1).padStart(2,'0')} · 첨삭`));
  const d=diff(s.original,s.corrected),line=el('p',undefined,'annotation');
  let a=0,b=0;
  while(a<d.before.length||b<d.after.length){
   const x=d.before[a],y=d.after[b];
   if(x&&!x.changed&&y&&!y.changed){line.append(document.createTextNode(x.text));a++;b++;continue;}
   let old='',replacement='';
   while(a<d.before.length&&d.before[a].changed)old+=d.before[a++].text;
   while(b<d.after.length&&d.after[b].changed)replacement+=d.after[b++].text;
   if(!old&&!replacement){if(x){line.append(document.createTextNode(x.text));a++;}if(y)b++;continue;}
   const mark=el('span',undefined,'mark');
   const original=el('del',old||'⌃',replacement?'':'omission');
   mark.append(original,el('ins',replacement||'삭제'));line.append(mark);
  }
  card.append(line);
  const corrected=el('div',undefined,'corrected-line'),p=el('p');corrected.append(el('small','교정문'));
  for(const t of d.after)p.append(t.changed?el('ins',t.text):document.createTextNode(t.text));
  corrected.append(p);card.append(corrected);
  if($('ipa').checked)card.append(el('p',s.ipa,'ipa'));
  const listen=el('button','▶ 교정문 듣기','listen');listen.onclick=()=>speak(s.corrected);
  card.append(listen,el('h2','문법 및 표현','grammar-title'),el('p',s.grammar,'grammar'));root.append(card);
 });
}
$('ipa').onchange=render;$('stop').onclick=stop;
async function history(){const {data,error}=await db.from('diaries').select('diary_date').eq('user_id',user.id).order('diary_date',{ascending:false}).limit(1000);if(error)throw error;const root=$('history');root.replaceChildren();for(const row of data){const b=el('button',row.diary_date,row.diary_date===date?'active':'');b.onclick=()=>load(row.diary_date);root.append(b);}if(!data.length)root.append(el('small','아직 저장한 일기가 없습니다.'));}
async function load(next,force=false){if(!user||busy||!next)return;if(dirty&&!force&&!confirm('저장하지 않은 변경 사항을 버리고 이동할까요?')){$('date').value=date;return;}lock(true);try{const {data,error}=await db.from('diaries').select('*').eq('user_id',user.id).eq('diary_date',next).maybeSingle();if(error)throw error;date=next;$('date').value=date;stop();reset();if(data){$('memo').value=data.memo;$('original').value=data.original;sentences=data.sentences;version=data.updated_at;render();}await history();status(data?'저장된 일기를 불러왔습니다.':'새 일기를 작성하세요.');}catch(e){$('date').value=date;showError(e);}finally{lock(false);}}
$('date').onchange=()=>load($('date').value);$('reload').onclick=()=>load(date);
$('save').onclick=async()=>{if(!user||busy)return;lock(true);try{const row={user_id:user.id,diary_date:date,memo:$('memo').value,original:$('original').value,sentences};let q=version?db.from('diaries').update(row).eq('user_id',user.id).eq('diary_date',date).eq('updated_at',version):db.from('diaries').insert(row);const {data,error}=await q.select('updated_at');if(error){if(error.code==='23505')throw Error('다른 기기에 저장된 일기가 있습니다. 다시 불러온 뒤 수정하세요.');throw error;}if(!data.length)throw Error('다른 기기에서 변경되었습니다. 내용을 복사한 뒤 다시 불러오세요.');version=data[0].updated_at;dirty=false;await history();status('클라우드에 저장했습니다.');}catch(e){showError(e);}finally{lock(false);}};
$('correct').onclick=async()=>{if(!user||busy)return;const original=$('original').value;if(!original.trim())return status('영어 일기를 먼저 작성하세요.',true);if(!confirm('영어 원문을 외부 AI로 전송합니다. 개인·회사 민감정보가 없는지 확인하세요. 계속할까요?'))return;lock(true);status('AI 교정 중…');try{const {data,error}=await db.functions.invoke('correct-diary',{body:{original}});if(error)throw Error('AI 교정 실패: '+error.message+' (API 설정 또는 사용량을 확인하세요.)');sentences=validateResult(data);changed();render();status('교정 완료. 일기 저장을 눌러 다른 기기에서도 확인하세요.');}catch(e){showError(e);}finally{lock(false);}};
$('remove').onclick=async()=>{if(!user||busy||!version||!confirm(`${date} 일기를 삭제할까요?`))return;lock(true);try{const {data,error}=await db.from('diaries').delete().eq('user_id',user.id).eq('diary_date',date).eq('updated_at',version).select('diary_date');if(error)throw error;if(!data.length)throw Error('다른 기기에서 변경된 일기입니다. 다시 불러오세요.');reset();await history();status('삭제했습니다.');}catch(e){showError(e);}finally{lock(false);}};
$('backup').onclick=async()=>{if(!user||busy)return;lock(true);try{let rows=[],offset=0;while(true){const {data,error}=await db.from('diaries').select('*').eq('user_id',user.id).order('diary_date').range(offset,offset+499);if(error)throw error;rows.push(...data);if(data.length<500)break;offset+=500;}const url=URL.createObjectURL(new Blob([JSON.stringify(rows,null,2)],{type:'application/json'}));const a=el('a');a.href=url;a.download=`diary-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('백업 완료. 파일에는 개인 일기가 포함됩니다.');}catch(e){showError(e);}finally{lock(false);}};
async function session(s){if(busy){setTimeout(()=>session(s).catch(showError),150);return;}const id=s?.user?.id;if(id===user?.id&&user)return;epoch++;user=s?.user||null;stop();reset();$('app').hidden=!user;$('logout').hidden=!user;$('login').hidden=!!user;if(user){await load(today(),true);}else{status('본인 계정으로 로그인하세요.');}}
$('loginForm').onsubmit=async e=>{e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;try{const {data,error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;$('password').value='';await session(data.session);}catch(e){showError(e);}finally{b.disabled=false;}};
$('logout').onclick=async()=>{if(dirty&&!confirm('저장하지 않은 변경 사항을 버릴까요?'))return;const {error}=await db.auth.signOut({scope:'local'});if(error)return showError(error);await session(null);};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
if(!configured){status('설정 필요: docs/config.js에 Supabase URL과 공개 키를 입력하세요.',true);}else{db.auth.onAuthStateChange((_event,s)=>{setTimeout(()=>session(s).catch(showError),0);});const {data,error}=await db.auth.getSession();if(error)showError(error);else await session(data.session);}
