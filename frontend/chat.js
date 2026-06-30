const { token, userId, username } = getAuth();

if (!token || !userId) {
  window.location.href = "index.html";
}

const chatForm = document.getElementById("chatForm");
console.log(chatForm);

const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");

let conversationHistory = [];

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const message = chatInput.value.trim();

  if (!message) return;

  // Save user message
  conversationHistory.push({
    role: "user",
    content: message
  });

  // Create user bubble
  const userMessage = document.createElement("div");

  userMessage.classList.add(
    "message",
    "user-message"
  );

  userMessage.textContent = message;

  chatMessages.appendChild(userMessage);

  // Clear input
  chatInput.value = "";

  // Auto scroll
  chatMessages.scrollTop =
    chatMessages.scrollHeight;

  // Typing indicator
  const typing = document.createElement("div");

  typing.classList.add(
    "message",
    "assistant-message",
    "typing-indicator"
  );

  typing.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;

  chatMessages.appendChild(typing);

  chatMessages.scrollTop =
    chatMessages.scrollHeight;

  try {

    const response = await fetch(
      "http://localhost:5000/chat",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },

        body: JSON.stringify({
          message,
          history: conversationHistory.slice(-6)
        })
      }
    );

    const data = await response.json();

    // Remove typing dots
    typing.remove();

    // Create assistant message
    const assistantMessage =
      document.createElement("div");

    assistantMessage.classList.add(
      "message",
      "assistant-message"
    );

    assistantMessage.textContent =
      data.reply ||
      data.error ||
      "Sorry, I couldn't respond properly.";

    // Save AI reply
    conversationHistory.push({
      role: "assistant",
      content: assistantMessage.textContent
    });

    // Show AI reply
    chatMessages.appendChild(
      assistantMessage
    );

    // Auto scroll
    chatMessages.scrollTop =
      chatMessages.scrollHeight;

  } catch (error) {

    console.error("FRONTEND ERROR:", error);

    typing.remove();

    const errorMessage =
      document.createElement("div");

    errorMessage.classList.add(
      "message",
      "assistant-message"
    );

    errorMessage.textContent =
      "Server error. Please try again.";

    chatMessages.appendChild(
      errorMessage
    );

    chatMessages.scrollTop =
      chatMessages.scrollHeight;
  }
});



//   const message = chatInput.value.trim();

//   if (!message) return;

//   conversationHistory.push({
//     role: "user",
//     content: message
//   });

//   const userMessage = document.createElement("div");
//   userMessage.classList.add("message", "user-message");
//   userMessage.textContent = message;
//   chatMessages.appendChild(userMessage);

//   chatInput.value = "";
//   chatMessages.scrollTop = chatMessages.scrollHeight;

//   try {
//     const typing = document.createElement("div");

// typing.classList.add(
//   "message",
//   "assistant-message",
//   "typing-indicator"
// );

// typing.innerHTML = `
//   <span></span>
//   <span></span>
//   <span></span>
// `;

// chatMessages.appendChild(typing);

// chatMessages.scrollTop =
// chatMessages.scrollHeight;
//     const response = await fetch("http://localhost:5000/chat", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "Authorization": `Bearer ${token}`
//       },
//       body: JSON.stringify({
//   message,
//   history: conversationHistory.slice(-6)
// })
//     });

// const data = await response.json();
// typing.remove();

// const assistantMessage =
// document.createElement("div");

// assistantMessage.classList.add(
//   "message",
//   "assistant-message"
// );

// assistantMessage.textContent =
// data.reply ||
// data.error ||
// "Sorry, I couldn't respond properly.";

// conversationHistory.push({
//   role: "assistant",
//   content:
//   data.reply ||
//   data.error ||
//   "Sorry, I couldn't respond properly."
// });

// chatMessages.appendChild(
//   assistantMessage
// );

//   console.log("SUBMIT FINISHED");


// chatMessages.scrollTop =
// chatMessages.scrollHeight;

// chatMessages.scrollTop = chatMessages.scrollHeight;


//     chatMessages.scrollTop = chatMessages.scrollHeight;
//   } catch (error) {
//     console.error("FRONTEND ERROR:",err);

//     const errorMessage = document.createElement("div");
//     errorMessage.classList.add("message", "assistant-message");
//     errorMessage.textContent = "Server error. Please try again.";
//     chatMessages.appendChild(errorMessage);

//     chatMessages.scrollTop = chatMessages.scrollHeight;
//     console.error(error);
//   }
    