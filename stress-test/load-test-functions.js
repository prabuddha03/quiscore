const { v4: uuidv4 } = require("uuid");

// Helper functions for the load test
function generateRandomString(length = 8) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateUserId() {
  return `test-user-${uuidv4()}`;
}

function generateScoreboardId() {
  return `scoreboard-${generateRandomString(6)}`;
}

// Before request hook - runs before each scenario
function beforeScenario(context, events, done) {
  // Generate unique identifiers for this user session
  context.vars.userId = generateUserId();
  context.vars.scoreboardId = "abc123"; // Using the specified scoreboard ID
  context.vars.sessionId = uuidv4();

  console.log(`Starting scenario for user: ${context.vars.userId}`);
  return done();
}

// After request hook - runs after each scenario
function afterScenario(context, events, done) {
  console.log(`Completed scenario for user: ${context.vars.userId}`);
  return done();
}

// Socket.IO event handlers
function setupSocketHandlers(context, events, done) {
  const socket = context.socketio;

  // Handle connection events
  socket.on("connect", () => {
    console.log(`Socket connected: ${socket.id}`);
    events.emit("counter", "socketio.connections", 1);
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
    events.emit("counter", "socketio.disconnections", 1);
  });

  // Handle scoreboard-specific events
  socket.on("scoreboard-joined", (data) => {
    console.log(`Joined scoreboard: ${data.scoreboardId}`);
    events.emit("counter", "scoreboard.joins", 1);
  });

  socket.on("score-submitted", (data) => {
    console.log(`Score submitted: ${data.score}`);
    events.emit("counter", "score.submissions", 1);
  });

  socket.on("scoreboard-updated", (data) => {
    console.log("Scoreboard updated");
    events.emit("counter", "scoreboard.updates", 1);
  });

  // Handle errors
  socket.on("error", (error) => {
    console.error("Socket error:", error);
    events.emit("counter", "socketio.errors", 1);
  });

  return done();
}

// Custom metrics tracking
function trackMetrics(context, events, done) {
  const startTime = Date.now();

  // Track response times
  context.vars.startTime = startTime;

  return done();
}

// Export all functions
module.exports = {
  beforeScenario,
  afterScenario,
  setupSocketHandlers,
  trackMetrics,
  generateRandomString,
  generateRandomInt,
  generateUserId,
  generateScoreboardId,
};
