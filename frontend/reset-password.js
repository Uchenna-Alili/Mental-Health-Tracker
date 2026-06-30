const form = document.getElementById("resetForm");
const message = document.getElementById("message");
const emailField = document.getElementById("email");
const resetOtpField = document.getElementById("resetOtp");

const newPasswordField = document.getElementById("newPassword");
const confirmPasswordField = document.getElementById("confirmPassword");
const toggleNewPassword = document.getElementById("toggleNewPassword");
const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");

const params = new URLSearchParams(window.location.search);
const email = params.get("email");

if (email) {
  emailField.value = email;
}

const newPasswordEye = document.getElementById("newPasswordEye");
const confirmPasswordEye = document.getElementById("confirmPasswordEye");

toggleNewPassword.addEventListener("click", () => {
  const isPassword = newPasswordField.type === "password";

  newPasswordField.type = isPassword ? "text" : "password";

  newPasswordEye.src = isPassword
    ? "./assets/icons/eye-svgrepo-com.svg"
    : "./assets/icons/eye-close-svgrepo-com.svg";
});

toggleConfirmPassword.addEventListener("click", () => {
  const isPassword = confirmPasswordField.type === "password";

  confirmPasswordField.type = isPassword ? "text" : "password";

  confirmPasswordEye.src = isPassword
    ? "./assets/icons/eye-svgrepo-com.svg"
    : "./assets/icons/eye-close-svgrepo-com.svg";
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = emailField.value.trim();
  const otp = resetOtpField.value.trim();
  const newPassword = newPasswordField.value;
  const confirmPassword = confirmPasswordField.value;

  if (!email || !otp || !newPassword || !confirmPassword) {
    message.style.color = "red";
    message.textContent = "Please fill in all fields.";
    return;
  }

  if (newPassword !== confirmPassword) {
    message.style.color = "red";
    message.textContent = "Passwords do not match.";
    return;
  }

  if (newPassword.length < 6) {
    message.style.color = "red";
    message.textContent = "Password must be at least 6 characters.";
    return;
  }

  try {
    const response = await fetch("http://localhost:5000/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        otp,
        newPassword
      })
    });

    const data = await response.json();

    if (response.ok) {
      message.style.color = "green";
      message.textContent = data.message || "Password reset successful.";

      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    } else {
      message.style.color = "red";
      message.textContent = data.error || "Failed to reset password.";
    }
  } catch (error) {
    message.style.color = "red";
    message.textContent = "Server error.";
  }
});

