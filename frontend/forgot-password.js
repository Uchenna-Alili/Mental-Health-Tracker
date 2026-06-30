const form = document.getElementById("forgotForm");
const message = document.getElementById("message");

form.addEventListener("submit", async (e) => {

e.preventDefault();

const email = document.getElementById("email").value;

try {

const response = await fetch("http://localhost:5000/forgot-password", {

method: "POST",

headers: {
"Content-Type": "application/json"
},

body: JSON.stringify({ email })

});

const data = await response.json();

if (response.ok) {

  message.style.color = "green";
  message.textContent = data.message || "If an account exists, a verification code has been sent.";
  setTimeout(() => {
  window.location.href = `reset-password.html?email=${encodeURIComponent(email)}`;
}, 1500);

} else {

message.style.color = "red";
message.textContent = data.error;

}

}catch(error){

message.style.color = "red";
message.textContent = "Server error";

}

});

if (!token || !userId) {
  window.location.href = "index.html";
}