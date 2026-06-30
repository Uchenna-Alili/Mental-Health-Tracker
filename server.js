const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const OpenAI = require("openai");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");

const app = express();
let userMemory = {};
const memoryPath = path.join(__dirname, "data", "memory.json");

if (fs.existsSync(memoryPath)) {
  userMemory = JSON.parse(fs.readFileSync(memoryPath, "utf8"));
}

function saveMemory(memory) {
  fs.writeFileSync(
    memoryPath,
    JSON.stringify(userMemory, null, 2)
  );
}

const USE_OPENAI = true;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
})

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_EMAIL_PASSWORD
  }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 requests
  message: {
    error: "Too many password reset requests. Try again in 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(cors());
app.use(express.json());

app.use(express.static(__dirname))
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    req.user = user;
    next();
  });
}
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      message: "Database connected successfully",
      time: result.rows[0],
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});
app.post("/register", async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    const passwordHash = await bcrypt.hash(password, 10)
    const result = await pool.query(
      "INSERT INTO users (name, username, email, password_hash) VALUES ($1,$2,$3,$4) RETURNING id,name,username,email",
      [name, username, email, passwordHash]
    );

    res.json({
      message: "User created",
      user: result.rows[0]
    });

  } catch (err) {
    console.error(err);

    if (err.code === "23505"){
        return res.status(409).json({ error: "Email or Username already exists"});
    }
    res.status(500).json({ error: "Registration failed" });
  }
});
app.post("/login", async (req, res) => {
  try {
    const { identifier, password, keepLoggedIn } = req.body;

    const isEmail = identifier.includes("@");

    const result = await pool.query(
      isEmail
        ? "SELECT id, name, username, email, password_hash FROM users WHERE email = $1"
        : "SELECT id, name, username, email, password_hash FROM users WHERE username = $1",
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email/username or password" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email/username or password" });
    }

    const expiresIn = keepLoggedIn ? "7d" : "2h";

    const token = jwt.sign(
      { user_id: user.id },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});


app.post("/moods", authenticateToken, async (req, res) => {
  try {

    const { mood, note } = req.body;
    const user_id = req.user.user_id;

    const result = await pool.query(
      `INSERT INTO moods (user_id, mood, note)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, mood, note]
    );

    res.json({
      message: "Mood recorded",
      mood: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to record mood" });
  }
});
app.get("/moods/:user_id", authenticateToken, async (req, res) => {
  try {

    const { user_id } = req.params;

  if (parseInt(user_id) !== req.user.user_id) {
  return res.status(403).json({ error: "Unauthorized access" });
}

    const result = await pool.query(
      `SELECT * FROM moods
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [user_id]
    );

    res.json({
      moods: result.rows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch moods" });
  }
});
app.get("/stats/:user_id", authenticateToken, async (req, res) => {
  try {

    const { user_id } = req.params;

  if (parseInt(user_id) !== req.user.user_id) {
  return res.status(403).json({ error: "Unauthorized access" });
}

    const result = await pool.query(
      `SELECT 
        COUNT(*) AS total_entries,
        ROUND(AVG(mood),2) AS average_mood,
        MIN(mood) AS lowest_mood,
        MAX(mood) AS highest_mood
       FROM moods
       WHERE user_id = $1`,
      [user_id]
    );

    res.json({
      stats: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

app.get("/insights/:user_id", authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.params;

    const result = await pool.query(
      `SELECT mood FROM moods 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 7`,
      [user_id]
    );

      const latestEntryResult = await pool.query(
      `SELECT created_at
      FROM moods
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
      [user_id]
    );


    const moods = result.rows.map(r => r.mood);
    moods.reverse();

    console.log("Moods array:", moods);
    if (moods.length === 0) {
      return res.json({
        message: "No mood data available yet."
      });
    }

    let positiveStreak = 0;
    let negativeStreak = 0;


    const average =
      moods.reduce((sum, m) => sum + m, 0) / moods.length;

    let trend = "stable";

  let declineStreak = 0;

  for (let i = 1; i < moods.length; i++){
    if (moods[i] < moods[i - 1]){
      declineStreak++;
    } else {
      break;
    }
  }

  const latest = moods[moods.length - 1];
const previous = moods[moods.length - 2];

if (
  moods.length >= 2 &&
  Math.abs(latest - previous) >= 5
) {
  trend = latest > previous ? "improving" : "declining";
}

else if (
  moods.length >= 3 &&
  moods[moods.length - 1] > moods[moods.length - 2] &&
  moods[moods.length - 2] > moods[moods.length - 3]
) {
  trend = "improving";
}

else if (
  moods.length >= 3 &&
  moods[moods.length - 1] < moods[moods.length - 2] &&
  moods[moods.length - 2] < moods[moods.length - 3]
) {
  trend = "declining";
}

    let risk = "low";

    if (average <= 4) risk = "high";
    else if (average <= 6) risk = "medium";

let volatility = "low";

let changes = 0;

for (let i = 1; i < moods.length; i++) {
  if (Math.abs(moods[i] - moods[i - 1]) >= 3) {
    changes++;
  }
}

if (changes >= 2) volatility = "high";

let burnoutRisk = "none";

if (declineStreak >= 3 && average <= 5)
{
  burnoutRisk = "high"
}

let daysSinceLastEntry = 0;
let engagementRisk = "low";

if (latestEntryResult.rows.length > 0) {
  const lastEntryDate = new Date(latestEntryResult.rows[0].created_at);
  const today = new Date();

  const diffTime = today - lastEntryDate;
  daysSinceLastEntry = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (daysSinceLastEntry >= 7) {
    engagementRisk = "high";
  } else if (daysSinceLastEntry >= 3) {
    engagementRisk = "moderate";
  }
}

let insightMessage = "Your recent mood pattern looks stable.";

if (burnoutRisk === "high") {
  insightMessage = "Your recent mood levels suggest possible burnout. Consider slowing down and prioritizing rest.";
}

else if (negativeStreak >= 3) {
  insightMessage = `You've recorded ${negativeStreak} low moods in a row. It may help to talk to someone or take a mental break.`;
}

else if (engagementRisk === "high") {
  insightMessage = "You haven't logged your mood in a while. Regular check-ins can help you stay aware of emotional changes.";
}

else if (latest <= 4) {
  insightMessage =
    "Your most recent mood entry indicates that you may be experiencing a low mood. Consider taking time for self-care, talking to someone you trust, or engaging in activities that help you feel better.";
}

else if (trend === "declining") {
  insightMessage = "Your mood has been trending downward recently. Try identifying possible stress triggers.";
}

else if (trend === "improving") {
  insightMessage = "Your mood has been improving recently. Keep up the positive habits and routines that are helping you.";
}

else if (positiveStreak >= 3) {
  insightMessage = `Great job! You've had ${positiveStreak} positive mood entries in a row. Keep doing what works for you.`;
}



for (let i = 0; i < moods.length; i++) {
  if (moods[i] >= 7) {
    positiveStreak++;
  } else {
    break;
  }
}

for (let i = 0; i < moods.length; i++) {
  if (moods[i] <= 4) {
    negativeStreak++;
  } else {
    break;
  }
}

res.json({
  trend,
  average_mood: average.toFixed(2),
  risk_level: risk,
  volatility,
  burnout_risk: burnoutRisk,
  entries_analyzed: moods.length,
  days_since_last_entry: daysSinceLastEntry,
  engagement_risk: engagementRisk,
  positive_streak: positiveStreak,
  negative_streak: negativeStreak,
  insight_message: insightMessage
});
 

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate insights" });
  }
});

app.get("/graph/:user_id", authenticateToken, async (req, res) => {
  try {
    const { user_id } = req.params;

    if (parseInt(user_id) !== req.user.user_id) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const result = await pool.query(
  `SELECT mood, created_at
   FROM moods
   WHERE user_id = $1
   ORDER BY created_at DESC
   LIMIT 7`,
  [user_id]
);


    

const graphData = result.rows.reverse().map((row) => ({
  mood: row.mood,
  date: new Date(row.created_at).toLocaleDateString(),
  time: new Date(row.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  })
}));


    res.json({
      graph_data: graphData
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch graph data" });
  }
});

async function getOpenAIReply(message, history = []) {

  if (!USE_OPENAI || !OPENAI_API_KEY) {
    return null;
  }

  try {

    const messages = [
      {
  role: "system",
  content: `
You are Lumi, a calm and supportive AI wellness assistant.

You talk naturally and conversationally.

If users call your name "Lumi", acknowledge it naturally.

You help users discuss stress, emotions, motivation, loneliness, and mental wellness in a supportive but realistic way.

Your role is to:
- help users reflect on emotions
- encourage healthy coping habits
- provide calming and supportive responses
- suggest healthy routines and stress management
- encourage seeking professional help when necessary

Never:
- diagnose mental illnesses
- claim to be a therapist
- prescribe medication
- encourage self-harm

Keep responses conversational, supportive, concise, and emotionally aware.
`
},


      ...history,

      {
        role: "user",
        content: message
      }
    ];

    const completion = await Promise.race([
  openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages,
    temperature: 0.7,
    max_tokens: 200
  }),

  new Promise((_, reject) =>
    setTimeout(() => reject(new Error("OpenAI timeout")), 30000)
  )
]);


    return completion.choices[0].message.content;

  } catch (error) {
  console.error("OPENAI ERROR:", error);
  return "⚠I'm having trouble connecting right now. Please check your internet connection and try again in a moment";
}
}

app.post("/chat", authenticateToken, async (req, res) => {

  try {

    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const text = message.toLowerCase();


   const userId = req.user.user_id;

if (!userMemory[userId]) {
  userMemory[userId] = {
    name: "",
    mood: "",
    moodHistory: []
  };
}

const memory = userMemory[userId];

if (text.includes("my name is")) {
  memory.name = text.split("my name is")[1]?.trim();
}

const moodKeywords = [
  "sad",
  "stressed",
  "happy",
  "lonely",
  "anxious",
  "overwhelmed",
  "tired",
  "angry"
];

const detectedMood = moodKeywords.find(word =>
  text.toLowerCase().includes(word)
);


const negativeMoods = [
  "sad",
  "stressed",
  "lonely",
  "anxious",
  "overwhelmed",
  "tired",
  "angry"
];

const recentNegativeCount = memory.moodHistory
  .slice(-5)
  .filter(item => negativeMoods.includes(item.mood)).length;

let moodTrendNote = "";

if (recentNegativeCount >= 3) {
  moodTrendNote =
    "The user has shown repeated negative moods recently. Respond with extra empathy and acknowledge emotional buildup.";
}

    let enhancedMessage = message;

enhancedMessage = `
You are Lumi, a supportive AI mood assistant.

The user's name is ${memory.name || "unknown"}.
Recent mood: ${memory.mood || "unknown"}.
Mood trend analysis: ${moodTrendNote}
User message:
${message}
`;

// Crisis detection first
if (
  text.includes("kill myself") ||
  text.includes("want to die") ||
  text.includes("end my life")
) {
  return res.json({
    reply:
      "I'm really sorry you're feeling this way. You deserve support and you don't have to go through this alone. Please consider reaching out to a trusted person, a mental health professional, or your local emergency service right now."
  });
}

// Get AI response
let aiReply = await getOpenAIReply(
  enhancedMessage,
  history
);

if (aiReply) {
  return res.json({
    reply: aiReply
  });
}

// Fallback if AI fails
return res.json({
  reply:
    "I'm having trouble responding right now. Please try again in a moment."
});

  } catch (error) {

  console.error(error);

  res.status(500).json({
    reply: "I'm having trouble responding right now. Please try again."
  });

}

});

app.get("/verify-token", authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

app.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email is required" });
    }

    const userResult = await pool.query(
      `SELECT id, email
       FROM users
       WHERE email = $1`,
      [email.trim()]
    );

    if (userResult.rows.length === 0) {
      return res.json({
        message: "If an account exists, a verification code has been sent."
      });
    }

    const user = userResult.rows[0];

    

    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10); // 10 minutes

    await pool.query(
      `UPDATE users
       SET reset_otp = $1,
           reset_otp_expires = $2
       WHERE id = $3`,
      [resetOtp, expiresAt, user.id]
    );

    console.log(`Password reset OTP for user ${user.id}: ${resetOtp}`);

    await transporter.sendMail({
    from: process.env.ADMIN_EMAIL,
    to: process.env.ADMIN_EMAIL,
    subject: "Mental Health Tracker Password Reset OTP",
    text: `
Password reset request received.

Account Email: ${email}

OTP Code: ${resetOtp}

This OTP expires in 10 minutes.
  `
});

    res.json({
      message: "If an account exists, a verification code has been sent."
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Failed to process forgot password request" });
  }
});

app.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

// 1. Fetch user
const userResult = await pool.query(
  "SELECT * FROM users WHERE email = $1",
  [email]
);

if (userResult.rows.length === 0) {
  return res.status(400).json({ error: "User not found" });
}

const user = userResult.rows[0];

// 2. Check max attempts
if (user.reset_attempts >= 5) {
  return res.status(400).json({
    error: "Too many wrong OTP attempts. Request a new code."
  });
}

// 3. Check OTP expiration
if (new Date(user.reset_otp_expires) < new Date()) {
  return res.status(400).json({ error: "OTP has expired" });
}

// 4. Check OTP correctness
if (otp !== user.reset_otp) {
  // increment attempts
  await pool.query(
    "UPDATE users SET reset_attempts = reset_attempts + 1 WHERE id = $1",
    [user.id]
  );
  return res.status(400).json({ error: "Invalid OTP" });
}

// 5. OTP is correct → reset password
const hashedPassword = await bcrypt.hash(newPassword, 10);
await pool.query(
  `UPDATE users
   SET password_hash = $1,
       reset_otp = NULL,
       reset_otp_expires = NULL,
       reset_attempts = 0
   WHERE id = $2`,
  [hashedPassword, user.id]
);

res.json({ message: "Password has been reset successfully" });

  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Failed to reset password" });
  }
});


app.get("/user/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT id, username, email, recovery_email, recovery_email_verified FROM users WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error("Load user profile error:", error);
    res.status(500).json({ error: "Failed to load user profile" });
  }
});

app.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;

    const {
      currentPassword,
      newPassword,
      confirmPassword
    } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error: "All fields are required"
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: "Passwords do not match"
      });
    }

    const result = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );

    if (!isMatch) {
      return res.status(401).json({
        error: "Current password is incorrect"
      });
    }

    const hashedPassword =
      await bcrypt.hash(newPassword, 10);

    await pool.query(
      `UPDATE users
       SET password_hash = $1
       WHERE id = $2`,
      [hashedPassword, userId]
    );

    res.json({
      message: "Password updated successfully"
    });

  } catch (error) {
    console.error("Change password error:", error);

    res.status(500).json({
      error: "Failed to update password"
    });
  }
});

app.delete("/moods/:id", authenticateToken, async (req, res) => {
  try {

    const moodId = req.params.id;
    const userId = req.user.user_id;

    const result = await pool.query(
      `DELETE FROM moods
       WHERE id = $1
       AND user_id = $2
       RETURNING *`,
      [moodId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Mood entry not found"
      });
    }

    res.json({
      message: "Mood entry deleted"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Failed to delete mood entry"
    });

  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});