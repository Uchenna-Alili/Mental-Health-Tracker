function getAuth() {
  const localToken = localStorage.getItem("token");
  const sessionToken = sessionStorage.getItem("token");

  if (localToken) {
    return {
      storage: localStorage,
      token: localToken,
      userId: localStorage.getItem("userId"),
      username: localStorage.getItem("username")
    };
  }

  if (sessionToken) {
    return {
      storage: sessionStorage,
      token: sessionToken,
      userId: sessionStorage.getItem("userId"),
      username: sessionStorage.getItem("username")
    };
  }

  return {
    storage: null,
    token: null,
    userId: null,
    username: null
  };
}