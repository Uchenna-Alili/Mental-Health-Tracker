const { storage, token, userId, username } = getAuth();

if (!token || !userId) {
  window.location.href = "index.html";
}

async function verifySession() {
  try {
    const response = await fetch("http://localhost:5000/verify-token", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("username");

  sessionStorage.removeItem("token");
  sessionStorage.removeItem("userId");
  sessionStorage.removeItem("username");

  window.location.href = "login.html";
}

  } catch (error) {
  console.error("Session verification failed:", error);

  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("username");

  sessionStorage.removeItem("token");
  sessionStorage.removeItem("userId");
  sessionStorage.removeItem("username");

  window.location.href = "login.html";
}
}

verifySession();

if (username) {
  const welcomeTitle = document.getElementById("welcomeTitle");
  const welcomeText = document.getElementById("welcomeText");

  welcomeTitle.textContent = `Hey ${username} 👋`;
  welcomeText.textContent = "Welcome back to your mental health dashboard.";
}

function clearMoodMessage() {
  setTimeout(() => {
    moodMessage.textContent = "";
  }, 3000);
}


const logoutBtn = document.getElementById("logoutBtn");

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("userId");
  localStorage.removeItem("username");

  sessionStorage.removeItem("token");
  sessionStorage.removeItem("userId");
  sessionStorage.removeItem("username");

  window.location.href = "login.html";
});

function handleUnauthorized(response) {
  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    window.location.href = "login.html";

    return true;
  }
  return false;
}

const moodSlider = document.getElementById("mood");
const moodValue = document.getElementById("moodValue");

if (moodSlider && moodValue) {
  moodSlider.addEventListener("input", () => {
    moodValue.textContent = moodSlider.value;
  });
}

const moodForm = document.getElementById("moodForm");
const noteInput = document.getElementById("note");
const moodMessage = document.getElementById("moodMessage");

if (moodForm) {
  moodForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const mood = parseInt(moodSlider.value);
    const note = noteInput.value;

    try {
      const response = await fetch("http://localhost:5000/moods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: parseInt(userId),
          mood,
          note
        })
      });

      if (handleUnauthorized(response)) return;

      const data = await response.json();

      if (response.ok) {
        moodMessage.style.color = "green";
        moodMessage.textContent = "Mood submitted successfully!";
        clearMoodMessage();
        moodForm.reset();
        moodValue.textContent = "5";
        loadMoodHistory();
        loadMoodGraph();
        loadInsights();
      } else {
        moodMessage.style.color = "red";
        moodMessage.textContent = data.error || "Failed to submit mood";
      }
    } catch (error) {
      moodMessage.style.color = "red";
      moodMessage.textContent = "Server error. Please try again.";
      console.error(error);
    }
  });
}

async function loadMoodHistory() {
  const historyList = document.getElementById("historyList");

  try {
    const response = await fetch(`http://localhost:5000/moods/${userId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (handleUnauthorized(response)) return;

const data = await response.json();

if (response.ok) {

      if (data.moods.length > 0) {

        const totalEntries = data.moods.length;

const latestMood = data.moods[0].mood;

const currentMonth = new Date().getMonth();
const currentYear = new Date().getFullYear();

const entriesThisMonth = data.moods.filter(entry => {
  const date = new Date(entry.created_at);

  return (
    date.getMonth() === currentMonth &&
    date.getFullYear() === currentYear
  );
}).length;

document.getElementById("totalEntries").textContent =
  totalEntries;

document.getElementById("entriesThisMonth").textContent =
  entriesThisMonth;

document.getElementById("latestMood").textContent =
  latestMood;
      }

    const uniqueDays = [
  ...new Set(
    data.moods.map(entry =>
      new Date(entry.created_at).toDateString()
    )
  )
];

let bestStreak = 1;
let currentBest = 1;

for (let i = 1; i < uniqueDays.length; i++) {

  const currentDate = new Date(uniqueDays[i - 1]);
  const previousDate = new Date(uniqueDays[i]);

  const diffDays =
    Math.round(
      (currentDate - previousDate) /
      (1000 * 60 * 60 * 24)
    );

  if (diffDays === 1) {
    currentBest++;
    bestStreak = Math.max(bestStreak, currentBest);
  } else {
    currentBest = 1;
  }
}

document.getElementById("bestStreak").textContent =
  bestStreak;



      if (!data.moods || data.moods.length === 0) {
        historyList.innerHTML = "<p>No mood history yet.</p>";
        return;
      }

 const streakMessage = document.getElementById("streakMessage");

if (data.moods && data.moods.length > 0) {

  const uniqueDays = [
    ...new Set(
      data.moods.map(entry =>
        new Date(entry.created_at).toDateString()
      )
    )
  ];

  let currentStreak = 1;

  for (let i = 1; i < uniqueDays.length; i++) {

    const currentDate = new Date(uniqueDays[i - 1]);
    const previousDate = new Date(uniqueDays[i]);

    const diffDays = Math.round(
      (currentDate - previousDate) /
      (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      currentStreak++;
    } else {
      break;
    }
  }


  if (currentStreak >= 2) {
    streakMessage.textContent =
      `🔥 ${currentStreak} day streak`;
  } else {
    streakMessage.textContent =
      "🌱 Start building your streak";
  }
}

      historyList.innerHTML = data.moods.slice(0,7).map(entry => {
          const date = new Date(entry.created_at).toLocaleDateString();
          return `
            <div class="history-item">
              <strong>Mood:</strong> ${entry.mood}<br>
              <strong>Date:</strong> ${date}<br>
              <strong>Note:</strong> ${entry.note || "No note"}
            </div>
          `;
        })
        .join("");
    } else {
      historyList.innerHTML = `<p>${data.error || "Failed to load mood history"}</p>`;
    }
  } catch (error) {
    historyList.innerHTML = "<p>Server error while loading history.</p>";
    console.error(error);
  }
}



async function loadInsights() {
  const insightsContent = document.getElementById("insightsContent");

  try {
    const response = await fetch(`http://localhost:5000/insights/${userId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (handleUnauthorized(response)) return;

    const data = await response.json();

    if (!response.ok) {
      insightsContent.innerHTML = `<p>${data.error || "Failed to load insights."}</p>`;
      return;
    }

    insightsContent.innerHTML = `
      <div class="insight-item"><strong>Trend:</strong> ${data.trend}</div>
      <div class="insight-item"><strong>Average Mood:</strong> ${data.average_mood}</div>
      <div class="insight-item"><strong>Risk Level:</strong> ${data.risk_level}</div>
      <div class="insight-item"><strong>Volatility:</strong> ${data.volatility}</div>
      <div class="insight-item"><strong>Burnout Risk:</strong> ${data.burnout_risk}</div>
      <div class="insight-item"><strong>Engagement Risk:</strong> ${data.engagement_risk}</div>
      <div class="insight-item"><strong>Message:</strong> ${data.insight_message}</div>
    `;
  } catch (error) {
    insightsContent.innerHTML = `<p>Server error while loading insights.</p>`;
    console.error(error);
  }
}


loadMoodHistory();
loadMoodGraph();
loadInsights();

let moodChart;

async function loadMoodGraph() {
  try {
    const response = await fetch(`http://localhost:5000/graph/${userId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (handleUnauthorized(response)) return;

    const data = await response.json();

    if (!response.ok) {
      console.error(data.error || "Failed to load graph data");
      return;
    }

    const labels = data.graph_data.map(entry => [entry.date, entry.time]);
    const moods = data.graph_data.map(entry => entry.mood);
    const averageMood =
  moods.reduce((sum, mood) => sum + mood, 0) / moods.length;

const averageLine = new Array(moods.length).fill(averageMood);

    const ctx = document.getElementById("moodChart").getContext("2d");

    if (moodChart) {
      moodChart.destroy();
    }

    moodChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
  {
    label: "Mood",
    data: moods,
    borderWidth: 2,
    tension: 0.3,
    fill: false
  },
  {
    label: "Average",
    data: averageLine,
    borderWidth: 1.5,
    borderDash: [6, 6],
    tension: 0,
    fill: false,
    pointRadius: 0
  }
]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true
          }
        },
        scales: {
          y: {
            min: 1,
            max: 10,
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });

  } catch (error) {
    console.error("Graph load error:", error);
  }
}