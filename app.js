
const $ = (id) => document.getElementById(id);
const CHAT_KEY = "sexta-feira-chat-v2";
const MEMORY_KEY = "sexta-feira-memory-v1";

// Endereço real do Worker criado no Cloudflare
const API_URL = "https://dry-boat-1ee2.drm10897b17.workers.dev";

let voiceEnabled = true;
let deferredInstallPrompt = null;
let busy = false;

function loadJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function addMessage(text, who = "assistant", save = true) {
  const article = document.createElement("article");
  article.className = `msg ${who}`;

  const speaker = document.createElement("span");
  speaker.className = "speaker";
  speaker.textContent = who === "assistant" ? "SEXTA-FEIRA" : "VOCÊ";

  const p = document.createElement("p");
  p.textContent = text;
  article.append(speaker, p);
  $("chat").append(article);
  $("chat").scrollTop = $("chat").scrollHeight;

  if (save) {
    const history = loadJSON(CHAT_KEY, []);
    history.push({ text, who });
    saveJSON(CHAT_KEY, history.slice(-40));
  }
}

function say(text) {
  if (!voiceEnabled || !("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.lang = "pt-BR";
  u.rate = 0.96;
  u.pitch = 0.82;

  const voices = window.speechSynthesis.getVoices();
  const pt = voices.filter(v => v.lang.toLowerCase().startsWith("pt"));
  const preferred =
    pt.find(v => /brasil|brazil|portugu[eê]s/i.test(v.name)) || pt[0];

  if (preferred) u.voice = preferred;
  window.speechSynthesis.speak(u);
}

function remember(note) {
  const memories = loadJSON(MEMORY_KEY, []);
  memories.unshift({
    id: Date.now() + Math.random(),
    text: note,
    created: new Date().toISOString()
  });

  saveJSON(MEMORY_KEY, memories.slice(0, 50));
  renderMemories();
}

function renderMemories() {
  const list = $("memoryList");
  list.replaceChildren();

  const memories = loadJSON(MEMORY_KEY, []);

  if (!memories.length) {
    const li = document.createElement("li");
    li.textContent = "Nenhuma memória salva ainda.";
    list.append(li);
    return;
  }

  memories.forEach(m => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = m.text;

    const b = document.createElement("button");
    b.className = "remove";
    b.textContent = "Excluir";
    b.setAttribute("aria-label", "Excluir memória");

    b.onclick = () => {
      saveJSON(
        MEMORY_KEY,
        loadJSON(MEMORY_KEY, []).filter(x => x.id !== m.id)
      );
      renderMemories();
    };

    li.append(span, b);
    list.append(li);
  });
}

// Comandos que funcionam localmente, sem chamar a IA
function localReply(raw) {
  const s = raw.trim();
  const lower = s.toLocaleLowerCase("pt-BR");

  if (!s) return "Não recebi uma mensagem. Pode tentar novamente.";

  if (
    lower.startsWith("lembre que ") ||
    lower.startsWith("lembra que ") ||
    lower.startsWith("guarde que ")
  ) {
    const note = s.replace(
      /^(lembre que |lembra que |guarde que )/i, ""
    ).trim();

    if (note) {
      remember(note);
      return `Memória salva neste aparelho: “${note}”.`;
    }
  }

  if (
    lower.startsWith("o que você lembra") ||
    lower.startsWith("o que voce lembra") ||
    lower.includes("minhas memórias") ||
    lower.includes("minhas memorias")
  ) {
    const mem = loadJSON(MEMORY_KEY, []);

    return mem.length
      ? "Estas são suas memórias salvas:\n" +
        mem.map((m, i) => `${i + 1}. ${m.text}`).join("\n")
      : "Ainda não tenho memórias salvas.";
  }

  if (lower.includes("que horas") || lower.includes("data de hoje")) {
    return "A data e hora deste aparelho são: " +
      new Date().toLocaleString("pt-BR") + ".";
  }

  if (lower.includes("abrir youtube")) {
    window.open("https://www.youtube.com", "_blank", "noopener");
    return "Abrindo o YouTube no navegador.";
  }

  if (lower.includes("abrir google")) {
    window.open("https://www.google.com", "_blank", "noopener");
    return "Abrindo o Google no navegador.";
  }

  if (lower.includes("abrir agenda")) {
    window.open("https://calendar.google.com", "_blank", "noopener");
    return "Abrindo o Google Agenda.";
  }

  if (lower.includes("abrir mapas") || lower.includes("abrir maps")) {
    window.open("https://maps.google.com", "_blank", "noopener");
    return "Abrindo o Google Maps.";
  }

  if (
    lower.includes("ajuda") ||
    lower.includes("o que você faz") ||
    lower.includes("o que voce faz")
  ) {
    return "Sou a Sexta-Feira. Agora posso conversar com a IA online, " +
      "guardar notas neste aparelho, falar em voz alta e abrir alguns sites. " +
      "Diga o que precisa.";
  }

  if (
    lower.startsWith("minha tarefa é ") ||
    lower.startsWith("minha tarefa e ") ||
    lower.startsWith("tarefa:")
  ) {
    const task = s.replace(
      /^(minha tarefa é |minha tarefa e |tarefa:)/i, ""
    );

    remember("Tarefa: " + task);
    return "Tarefa registrada na memória local: " + task;
  }

  // null significa que a mensagem deve ir para a IA online
  return null;
}

async function handleMessage(text) {
  const message = text.trim();
  if (!message || busy) return;

  // Captura o histórico anterior à mensagem atual
  const previous = loadJSON(CHAT_KEY, []);
  const history = previous.slice(-10).map(m => ({
    role: m.who === "assistant" ? "model" : "user",
    text: String(m.text || "").slice(0, 3000)
  }));

  addMessage(message, "user");

  const local = localReply(message);

  if (local !== null) {
    addMessage(local, "assistant");
    say(local);
    return;
  }

  busy = true;

  const input = $("messageInput");
  const submit = $("chatForm").querySelector(
    'button[type="submit"], button:not([type])'
  );
  if (submit) submit.disabled = true;

  $("status").textContent = "CONECTANDO À IA…";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history })
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("O servidor retornou uma resposta inválida.");
    }

    if (!response.ok) {
      throw new Error(data.error || `Erro HTTP ${response.status}`);
    }

    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("A IA retornou uma resposta vazia.");
    }

    addMessage(data.reply, "assistant");
    say(data.reply);
    $("status").textContent = "SEXTA-FEIRA ONLINE";
  } catch (error) {
    console.error("Erro na conexão com a IA:", error);

    const msg = "Não consegui conectar à inteligência online. " +
      "Verifique a conexão e a configuração do servidor. Detalhe: " +
      error.message;

    addMessage(msg, "assistant");
    say(msg);
    $("status").textContent = "FALHA NA CONEXÃO";
  } finally {
    busy = false;
    if (submit) submit.disabled = false;
    input.focus();
  }
}

$("chatForm").addEventListener("submit", e => {
  e.preventDefault();
  const v = $("messageInput").value.trim();

  if (v && !busy) {
    $("messageInput").value = "";
    handleMessage(v);
  }
});

$("memoryForm").addEventListener("submit", e => {
  e.preventDefault();
  const v = $("memoryInput").value.trim();

  if (v) {
    remember(v);
    $("memoryInput").value = "";
    addMessage("Memória salva: “" + v + "”.", "assistant");
  }
});

$("clearChat").addEventListener("click", () => {
  if (confirm("Limpar o histórico desta conversa?")) {
    saveJSON(CHAT_KEY, []);
    $("chat").replaceChildren();
    addMessage("Histórico limpo. Como posso ajudar?", "assistant", false);
  }
});

$("speakToggle").addEventListener("click", () => {
  voiceEnabled = !voiceEnabled;
  $("speakToggle").classList.toggle("active", voiceEnabled);
  $("speakToggle").innerHTML = voiceEnabled
    ? "<span>🔊</span> Voz ligada"
    : "<span>🔇</span> Voz desligada";

  if (!voiceEnabled && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
});

$("micBtn").addEventListener("click", () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) {
    addMessage(
      "O reconhecimento de voz não está disponível neste navegador. " +
      "Tente o Chrome atualizado e verifique a permissão do microfone.",
      "assistant"
    );
    return;
  }

  const r = new SR();
  r.lang = "pt-BR";
  r.interimResults = false;
  r.maxAlternatives = 1;

  $("status").textContent = "OUVINDO…";
  $("micBtn").textContent = "Ouvindo…";

  r.onresult = e => {
    const t = e.results[0][0].transcript;
    $("messageInput").value = t;
    handleMessage(t);
    $("messageInput").value = "";
  };

  r.onerror = e => {
    addMessage(
      "Não consegui reconhecer a fala (" + e.error +
      "). Verifique a permissão do microfone e tente novamente.",
      "assistant"
    );
  };

  r.onend = () => {
    if (!busy) $("status").textContent = "SEXTA-FEIRA ONLINE";
    $("micBtn").innerHTML = "<span>🎙</span> Falar";
  };

  try {
    r.start();
  } catch {
    addMessage(
      "O microfone já pode estar em uso. Tente novamente.",
      "assistant"
    );
  }
});

document.querySelectorAll(".shortcut").forEach(b =>
  b.addEventListener("click", () =>
    window.open(b.dataset.url, "_blank", "noopener")
  )
);

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  $("installBtn").hidden = false;
});

$("installBtn").addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    alert(
      "No Chrome, abra o menu ⋮ e escolha “Adicionar à tela inicial” " +
      "ou “Instalar app”."
    );
    return;
  }

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  $("installBtn").hidden = true;
});

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("./sw.js").catch(() => {})
  );
}

const prior = loadJSON(CHAT_KEY, []);
if (prior.length) {
  $("chat").replaceChildren();
  prior.forEach(m => addMessage(m.text, m.who, false));
}

renderMemories();

if (!("speechSynthesis" in window)) {
  $("speakToggle").disabled = true;
  $("speakToggle").textContent = "Voz indisponível";
}
