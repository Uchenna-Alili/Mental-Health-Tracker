const usernameInput = document.getElementById("username");
const accountEmailInput = document.getElementById("accountEmail");
const otpSection = document.getElementById("otpSection");
const otpInput = document.getElementById("otpInput");
const verifyButton = document.getElementById("verifyOTP");

const { token, userId } = getAuth();

if (!token || !userId) {
  window.location.href = "index.html";
}

async function loadUserProfile() {
  try {
    const response = await fetch(`http://localhost:5000/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to load profile");
    }

    usernameInput.value = data.username || "";
    accountEmailInput.value = data.email || "";

  } catch (error) {
    console.error("Failed to load profile:", error);
    message.style.color = "red";
    message.textContent = "Failed to load profile information.";
  }
}

loadUserProfile();

document
  .getElementById("changePasswordBtn")
  .addEventListener("click", changePassword);

async function changePassword() {

    const currentPassword =
        document.getElementById("currentPassword").value;

    const newPassword =
        document.getElementById("newPassword").value;

    const confirmNewPassword =
        document.getElementById("confirmNewPassword").value;

    const message =
        document.getElementById("passwordMessage");

    if (newPassword !== confirmNewPassword) {
        message.textContent = "Passwords do not match";
        return;
    }

    const token = localStorage.getItem("token");

    const response = await fetch(
        "http://localhost:5000/change-password",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        }
    );

    const data = await response.json();

    message.textContent =
        data.message || data.error;
}

const toggleCurrentPassword =
    document.getElementById("toggleCurrentPassword");

const currentPassword =
    document.getElementById("currentPassword");

const currentEye =
    document.getElementById("currentEye");

toggleCurrentPassword.addEventListener("click", () => {
    const isPassword = currentPassword.type === "password";

    currentPassword.type = isPassword
        ? "text"
        : "password";

    currentEye.src = isPassword
        ? "./assets/icons/eye-svgrepo-com.svg"
        : "./assets/icons/eye-close-svgrepo-com.svg";
});

const toggleNewPassword =
    document.getElementById("toggleNewPassword");

const newPassword =
    document.getElementById("newPassword");

const newEye =
    document.getElementById("newEye");

toggleNewPassword.addEventListener("click", () => {
    const isPassword = newPassword.type === "password";

    newPassword.type = isPassword
        ? "text"
        : "password";

    newEye.src = isPassword
        ? "./assets/icons/eye-svgrepo-com.svg"
        : "./assets/icons/eye-close-svgrepo-com.svg";
});

const toggleConfirmPassword =
    document.getElementById("toggleConfirmPassword");

const confirmNewPassword =
    document.getElementById("confirmNewPassword");

const confirmEye =
    document.getElementById("confirmEye");

toggleConfirmPassword.addEventListener("click", () => {
    const isPassword =
        confirmNewPassword.type === "password";

    confirmNewPassword.type = isPassword
        ? "text"
        : "password";

    confirmEye.src = isPassword
        ? "./assets/icons/eye-svgrepo-com.svg"
        : "./assets/icons/eye-close-svgrepo-com.svg";
});

const changePasswordBtn =
  document.getElementById("changePasswordBtn");

const passwordMessage =
  document.getElementById("passwordMessage");


changePasswordBtn.addEventListener("click", async () => {

  const currentPassword =
    document.getElementById("currentPassword").value;

  const newPassword =
    document.getElementById("newPassword").value;

  const confirmPassword =
    document.getElementById("confirmNewPassword").value;

  try {

    const response = await fetch(
      "http://localhost:5000/change-password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      }
    );

    const data = await response.json();

    if (response.ok) {

      passwordMessage.style.color = "green";
      passwordMessage.textContent =
        data.message;

      document.getElementById("currentPassword").value = "";
      document.getElementById("newPassword").value = "";
      document.getElementById("confirmNewPassword").value = "";

    } else {

      passwordMessage.style.color = "red";
      passwordMessage.textContent =
        data.error;

    }

  } catch (error) {

    passwordMessage.style.color = "red";
    passwordMessage.textContent =
      "Server error";

    console.error(error);
  }
});
