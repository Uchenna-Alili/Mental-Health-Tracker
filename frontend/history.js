const { token, userId } = getAuth();

if (!token || !userId) {
  window.location.href = "index.html";
}

function handleUnauthorized(response) {
  if (response.status === 401) {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "login.html";
    return true;
  }
  return false;
}

async function loadFullHistory() {
  const fullHistoryList = document.getElementById("fullHistoryList");
  const monthFilter = document.getElementById("monthFilter");

  try {
    const response = await fetch(`http://localhost:5000/moods/${userId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (handleUnauthorized(response)) return;

    const data = await response.json();

    if (!response.ok) {
      fullHistoryList.innerHTML = `<p>${data.error || "Failed to load mood history."}</p>`;
      return;
    }

    if (!data.moods || data.moods.length === 0) {
      fullHistoryList.innerHTML = "<p>No mood history yet.</p>";
      return;
    }

    const groupedMoods = {};

    data.moods.forEach(entry => {
      const entryDate = new Date(entry.created_at);
      const monthYear = entryDate.toLocaleString("default", {
        month: "long",
        year: "numeric"
      });

      if (!groupedMoods[monthYear]) {
        groupedMoods[monthYear] = [];
      }

      groupedMoods[monthYear].push(entry);
    });

    const sortedMonths = Object.keys(groupedMoods).sort((a, b) => {
      return new Date(b) - new Date(a);
    });

    monthFilter.innerHTML = `<option value="all">All Months</option>`;

    sortedMonths.forEach(month => {
      const option = document.createElement("option");
      option.value = month;
      option.textContent = month;
      monthFilter.appendChild(option);
    });

function renderHistory(selectedMonth = "all") {

  fullHistoryList.innerHTML = sortedMonths
    .filter(month => selectedMonth === "all" || month === selectedMonth)
    .map(month => {

      const entries = groupedMoods[month];

      const items = entries.map(entry => {

        const date =
          new Date(entry.created_at).toLocaleDateString();

        const time =
          new Date(entry.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          });

        return `
          <div class="history-item">

            <div class="history-top">

              <strong>Mood: ${entry.mood}</strong>

              <button
                class="delete-btn"
                data-id="${entry.id}"
                title="Delete Entry"
              >

                <img
                  src="./assets/icons/trash-alt-svgrepo-com.svg"
                  alt="Delete"
                  class="delete-icon"
                >

              </button>

            </div>

            <strong>Date:</strong> ${date}<br>
            <strong>Time:</strong> ${time}<br>
            <strong>Note:</strong> ${entry.note || "No note"}

          </div>
        `;

      }).join("");

      return `
        <div class="history-group">
          <h3 class="history-group-title">${month}</h3>
          ${items}
        </div>
      `;

    })
    .join("");
}
    monthFilter.addEventListener("change", () => {
      renderHistory(monthFilter.value);
    });

    renderHistory();

  } catch (error) {
    fullHistoryList.innerHTML = "<p>Server error while loading history.</p>";
    console.error(error);
  }
}


document.addEventListener("click", async (e) => {

  const deleteButton =
    e.target.closest(".delete-btn");

  if (!deleteButton) return;

  const confirmed = confirm(
    "Are you sure you want to delete this mood entry? This action cannot be undone."
  );

  if (!confirmed) return;

  const moodId =
    deleteButton.dataset.id;

  try {

    const response = await fetch(
      `http://localhost:5000/moods/${moodId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Failed to delete mood entry");
      return;
    }

    loadFullHistory();

  } catch (error) {

    console.error(error);

    alert("Failed to delete mood entry");

  }

});

loadFullHistory();