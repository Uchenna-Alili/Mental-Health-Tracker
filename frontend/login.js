const params = new URLSearchParams(window.location.search);

if (params.get("from") !== "landing") {
    window.location.href = "index.html";
}
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");
const togglePassword = document.getElementById("togglePassword");
const passwordField = document.getElementById("password");

const eyeIcon = document.getElementById("eyeIcon");

togglePassword.addEventListener("click", () => {
    const isPassword = passwordField.type === "password";

    console.log("isPassword:", isPassword);
    passwordField.type = isPassword ? "text" : "password";

    eyeIcon.src = isPassword
        ? "./assets/icons/eye-svgrepo-com.svg"
        : "./assets/icons/eye-close-svgrepo-com.svg";
    console.log("New SRC", eyeIcon.src);
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

const identifier = document.getElementById("identifier").value.trim();
const password = document.getElementById("password").value;
const keepLoggedIn = document.getElementById("keepLoggedIn").checked;

  try {

    const response = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ identifier, password, keepLoggedIn })
    });

    const data = await response.json();

    if (response.ok) {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("username");

  sessionStorage.removeItem("token");
  sessionStorage.removeItem("userId");
  sessionStorage.removeItem("username");

  const storage = keepLoggedIn ? localStorage : sessionStorage;

  storage.setItem("token", data.token);
  storage.setItem("userId", data.user.id);
  storage.setItem("username", data.user.username);

  message.style.color = "green";
  message.textContent = "Login successful!";

  loginForm.reset();

  setTimeout(() => {
    window.location.href = "dashboard.html";
  }, 1000);
  } else {

      message.style.color = "red";
      message.textContent = data.error || "Login failed";

    }

  } catch (error) {

    message.style.color = "red";
    message.textContent = "Server error. Please try again.";
    console.error(error);

  }
});

