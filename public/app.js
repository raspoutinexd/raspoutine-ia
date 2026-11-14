
const $ = id => document.getElementById(id);

let messages = [];
let conversations = JSON.parse(
  localStorage.getItem("raspoutine_conversations") || "[]"
);

let busy = false;

function saveHistory() {
  localStorage.setItem(
    "raspoutine_conversations",
    JSON.stringify(conversations)
  );
}

function renderHistory() {
  const area = $("history");
  area.replaceChildren();

  conversations.forEach((conversation, index) => {
    const button = document.createElement("button");
    button.textContent = "◈ " + conversation.title;

    button.onclick = () => {
      messages = [...conversation.messages];
      renderMessages();
    };

    area.append(button);
  });
}

function addMessageElement(role, content) {
  const wrapper = document.createElement("div");
  wrapper.className = "message " + role;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "user" ? "U" : "R";

  const text = document.createElement("div");
  text.className = "message-content";
  text.textContent = content;

  wrapper.append(avatar, text);
  $("messages").append(wrapper);
}

function renderMessages() {
  $("messages").replaceChildren();
  $("welcome").style.display = messages.length ? "none" : "block";

  messages.forEach(message => {
    addMessageElement(message.role, message.content);
  });

  scrollBottom();
}

function scrollBottom() {
  const area = $("conversation");
  area.scrollTop = area.scrollHeight;
}

function saveConversation() {
  if (!messages.length) return;

  conversations = conversations.filter(
    conversation => !conversation.current
  );

  const title = messages.find(
    message => message.role === "user"
  )?.content.slice(0, 45) || "Nouvelle conversation";

  conversations.unshift({
    title,
    messages: [...messages]
  });

  conversations = conversations.slice(0, 30);
  saveHistory();
  renderHistory();
}

async function sendMessage(content) {
  if (busy || !content.trim()) return;

  busy = true;
  $("sendBtn").disabled = true;
  $("welcome").style.display = "none";

  messages.push({
    role: "user",
    content: content.trim()
  });

  addMessageElement("user", content.trim());

  const typing = document.createElement("div");
  typing.className = "typing";
  typing.textContent = "RASPOUTINE réfléchit...";
  $("messages").append(typing);

  scrollBottom();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: messages.slice(-20)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erreur serveur");
    }

    if (typeof data.reply !== "string") {
      throw new Error("Réponse invalide du serveur");
    }

    typing.remove();

    messages.push({
      role: "assistant",
      content: data.reply
    });

    addMessageElement("assistant", data.reply);
    saveConversation();

  } catch (error) {
    typing.remove();

    addMessageElement(
      "assistant",
      "Erreur : " + error.message
    );

  } finally {
    busy = false;
    $("sendBtn").disabled = false;
    $("prompt").focus();
    scrollBottom();
  }
}

function newChat() {
  messages = [];
  renderMessages();
}

$("chatForm").addEventListener("submit", event => {
  event.preventDefault();

  const input = $("prompt");
  const value = input.value;

  if (!value.trim()) return;

  input.value = "";
  input.style.height = "auto";

  sendMessage(value);
});

$("prompt").addEventListener("input", event => {
  event.target.style.height = "auto";
  event.target.style.height =
    Math.min(event.target.scrollHeight, 180) + "px";
});

$("prompt").addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    $("chatForm").requestSubmit();
  }
});

document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    sendMessage(button.dataset.prompt);
  });
});

$("newChat").onclick = newChat;

$("clearBtn").onclick = () => {
  if (confirm("Effacer cette conversation ?")) {
    newChat();
  }
};

$("settingsBtn").onclick = () => {
  $("settingsModal").classList.add("open");
};

$("closeSettings").onclick = () => {
  $("settingsModal").classList.remove("open");
};

$("saveSettings").onclick = () => {
  const name = $("assistantName").value.trim();

  if (name) {
    document.title = name;
    document.querySelector(".brand strong").textContent = name;
    $("settingsModal").classList.remove("open");
  }
};

renderHistory();
renderMessages();

