const registerForm = document.getElementById("registerForm");
const registerMessage = document.getElementById("registerMessage");

const passwordField = document.getElementById("password");
const confirmPasswordField = document.getElementById("confirmPassword");
const togglePassword = document.getElementById("togglePassword");
const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");

const passwordEye = document.getElementById("passwordEye");

togglePassword.addEventListener("click", () => {
    const isPassword = passwordField.type === "password";

    passwordField.type = isPassword ? "text" : "password";

    passwordEye.src = isPassword
        ? "./assets/icons/eye-svgrepo-com.svg"
        : "./assets/icons/eye-close-svgrepo-com.svg";
});

const confirmEye = document.getElementById("confirmEye");

toggleConfirmPassword.addEventListener("click", () => {
    const isPassword = confirmPasswordField.type === "password";

    confirmPasswordField.type = isPassword ? "text" : "password";

    confirmEye.src = isPassword
        ? "./assets/icons/eye-svgrepo-com.svg"
        : "./assets/icons/eye-close-svgrepo-com.svg";
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (password !== confirmPassword) {
  registerMessage.style.color = "red";
  registerMessage.textContent = "Passwords do not match.";
  return;
}

  try {
    const response = await fetch("http://localhost:5000/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name,
        username,
        email,
        password
      })
    });

    const data = await response.json();

    if (response.ok) {
      registerMessage.style.color = "green";
      registerMessage.textContent = "Account created successfully! Redirecting to login...";

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
    } else {
      registerMessage.style.color = "red";
      registerMessage.textContent = data.error || "Registration failed";
    }
  } catch (error) {
    registerMessage.style.color = "red";
    registerMessage.textContent = "Server error. Please try again.";
    console.error(error);
  }
});

if (!token || !userId) {
  window.location.href = "index.html";
}