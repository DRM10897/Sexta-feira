const $ = (id) => document.getElementById(id);
const CHAT_KEY = "sexta-feira-chat-v1";
const MEMORY_KEY = "sexta-feira-memory-v1";
let voiceEnabled = true;
let deferredInstallPrompt = null;

function loadJSON(key, fallback){try{return JSON.parse(localStorage.getItem(key)) ?? fallback}catch{return fallback}}
function saveJSON(key,value){localStorage.setItem(key,JSON.stringify(value))}
function addMessage(text, who="assistant", save=true){
  const article=document.createElement("article"); article.className=`msg ${who}`;
  const speaker=document.createElement("span"); speaker.className="speaker"; speaker.textContent=who==="assistant"?"SEXTA-FEIRA":"VOCÊ";
  const p=document.createElement("p"); p.textContent=text; article.append(speaker,p); $("chat").append(article); $("chat").scrollTop=$("chat").scrollHeight;
  if(save){const history=loadJSON(CHAT_KEY,[]);history.push({text,who});saveJSON(CHAT_KEY,history.slice(-40))}
}
function say(text){
  if(!voiceEnabled || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);u.lang="pt-BR";u.rate=0.96;u.pitch=0.82;
  const voices=window.speechSynthesis.getVoices();
  const pt=voices.filter(v=>v.lang.toLowerCase().startsWith("pt"));
  const preferred=pt.find(v=>/brasil|brazil|portugu[eê]s/i.test(v.name))||pt[0];
  if(preferred)u.voice=preferred;
  window.speechSynthesis.speak(u);
}
function remember(note){
  const memories=loadJSON(MEMORY_KEY,[]);
  memories.unshift({id:Date.now()+Math.random(),text:note,created:new Date().toISOString()});
  saveJSON(MEMORY_KEY,memories.slice(0,50));renderMemories();
}
function renderMemories(){
  const list=$("memoryList");list.replaceChildren();
  const memories=loadJSON(MEMORY_KEY,[]);
  if(!memories.length){const li=document.createElement("li");li.textContent="Nenhuma memória salva ainda.";list.append(li);return}
  memories.forEach(m=>{const li=document.createElement("li");const span=document.createElement("span");span.textContent=m.text;const b=document.createElement("button");b.className="remove";b.textContent="Excluir";b.setAttribute("aria-label","Excluir memória");b.onclick=()=>{saveJSON(MEMORY_KEY,loadJSON(MEMORY_KEY,[]).filter(x=>x.id!==m.id));renderMemories()};li.append(span,b);list.append(li)})
}
function localReply(raw){
  const s=raw.trim(), lower=s.toLocaleLowerCase("pt-BR");
  if(!s)return "Não recebi uma mensagem. Pode tentar novamente.";
  if(/^(oi|olá|ola|bom dia|boa tarde|boa noite)\b/i.test(lower))return "Olá. Sistemas locais prontos. No momento estou em modo básico; quando conectarmos o serviço de IA, poderei manter conversas mais avançadas.";
  if(lower.startsWith("lembre que ")||lower.startsWith("lembra que ")||lower.startsWith("guarde que ")){
    const note=s.replace(/^(lembre que |lembra que |guarde que )/i,"").trim();
    if(note){remember(note);return "Memória salva neste aparelho: “"+note+"”. Você pode removê-la na seção Memória pessoal."}
  }
  if(lower.startsWith("o que você lembra")||lower.startsWith("o que voce lembra")||lower.includes("minhas memórias")||lower.includes("minhas memorias")){
    const mem=loadJSON(MEMORY_KEY,[]);return mem.length?"Estas são suas memórias salvas:\n"+mem.map((m,i)=>`${i+1}. ${m.text}`).join("\n"):"Ainda não tenho memórias salvas.";
  }
  if(lower.includes("que horas")||lower.includes("data de hoje"))return "A data e hora deste aparelho são: "+new Date().toLocaleString("pt-BR")+".";
  if(lower.includes("abrir youtube")){window.open("https://www.youtube.com","_blank","noopener");return "Abrindo o YouTube no navegador."}
  if(lower.includes("abrir google")){window.open("https://www.google.com","_blank","noopener");return "Abrindo o Google no navegador."}
  if(lower.includes("abrir agenda")){window.open("https://calendar.google.com","_blank","noopener");return "Abrindo o Google Agenda."}
  if(lower.includes("abrir mapas")||lower.includes("abrir maps")){window.open("https://maps.google.com","_blank","noopener");return "Abrindo o Google Maps."}
  if(lower.includes("ajuda")||lower.includes("o que você faz")||lower.includes("o que voce faz"))return "Nesta versão consigo:\n• guardar notas: “lembre que prefiro respostas diretas”;\n• mostrar memórias: “o que você lembra?”;\n• falar em voz alta;\n• abrir alguns sites: “abrir Google”, “abrir YouTube”, “abrir agenda” ou “abrir mapas”;\n• informar data e hora do aparelho.\nA conversa inteligente online e a IA local ainda precisam ser configuradas.";
  if(lower.startsWith("minha tarefa é ")||lower.startsWith("minha tarefa e ")||lower.startsWith("tarefa:")){const task=s.replace(/^(minha tarefa é |minha tarefa e |tarefa:)/i,"");remember("Tarefa: "+task);return "Tarefa registrada na memória local: "+task}
  return "Recebi: “"+s+"”. Ainda estou na versão inicial e não tenho um modelo de linguagem conectado. Posso guardar isso se você disser “lembre que…”. A próxima etapa será ligar a inteligência online de forma segura.";
}
function handleMessage(text){
  addMessage(text,"user");const reply=localReply(text);addMessage(reply,"assistant");say(reply);
}
$("chatForm").addEventListener("submit",e=>{e.preventDefault();const v=$("messageInput").value.trim();if(v){$("messageInput").value="";handleMessage(v)}});
$("memoryForm").addEventListener("submit",e=>{e.preventDefault();const v=$("memoryInput").value.trim();if(v){remember(v);$("memoryInput").value="";addMessage("Memória salva: “"+v+"”.","assistant")}});
$("clearChat").addEventListener("click",()=>{if(confirm("Limpar o histórico desta conversa?")){saveJSON(CHAT_KEY,[]);$("chat").replaceChildren();addMessage("Histórico limpo. Como posso ajudar?","assistant",false)}});
$("speakToggle").addEventListener("click",()=>{voiceEnabled=!voiceEnabled;$("speakToggle").classList.toggle("active",voiceEnabled);$("speakToggle").innerHTML=voiceEnabled?"<span>🔊</span> Voz ligada":"<span>🔇</span> Voz desligada";if(!voiceEnabled&&"speechSynthesis"in window)window.speechSynthesis.cancel()});
$("micBtn").addEventListener("click",()=>{
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){addMessage("O reconhecimento de voz não está disponível neste navegador. Tente o Chrome atualizado e verifique as permissões do microfone.","assistant");return}
  const r=new SR();r.lang="pt-BR";r.interimResults=false;r.maxAlternatives=1;
  $("status").textContent="OUVINDO…";$("micBtn").textContent="Ouvindo…";
  r.onresult=e=>{const t=e.results[0][0].transcript;$("messageInput").value=t;handleMessage(t);$("messageInput").value=""};
  r.onerror=e=>addMessage("Não consegui reconhecer a fala ("+e.error+"). Verifique a permissão do microfone e tente novamente.","assistant");
  r.onend=()=>{$("status").textContent="SISTEMAS LOCAIS ONLINE";$("micBtn").innerHTML="<span>🎙</span> Falar"};
  try{r.start()}catch{addMessage("O microfone já pode estar em uso. Tente novamente.","assistant")}
});
document.querySelectorAll(".shortcut").forEach(b=>b.addEventListener("click",()=>window.open(b.dataset.url,"_blank","noopener")));
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstallPrompt=e;$("installBtn").hidden=false});
$("installBtn").addEventListener("click",async()=>{if(!deferredInstallPrompt){alert("No Chrome, abra o menu ⋮ e escolha “Adicionar à tela inicial” ou “Instalar app”.");return}deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$("installBtn").hidden=true});
if("serviceWorker"in navigator && location.protocol.startsWith("http"))window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
const prior=loadJSON(CHAT_KEY,[]);if(prior.length){$("chat").replaceChildren();prior.forEach(m=>addMessage(m.text,m.who,false))}
renderMemories();
if(!("speechSynthesis"in window)){$("speakToggle").disabled=true;$("speakToggle").textContent="Voz indisponível"}
