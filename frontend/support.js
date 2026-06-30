const { token, userId } = getAuth();

if (!token || !userId) {
  window.location.href = "index.html";
}