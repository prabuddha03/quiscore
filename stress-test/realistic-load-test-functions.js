const { v4: uuidv4 } = require("uuid");

// Helper functions that match your actual app structure
function generateEventId() {
  return `event_${uuidv4()}`;
}

function generateTeamId() {
  return `team_${uuidv4()}`;
}

function generateJudgeId() {
  return `judge_${uuidv4()}`;
}

function generateRoundId() {
  return `round_${uuidv4()}`;
}

function generateCriteriaId() {
  return `criteria_${uuidv4()}`;
}

function generateRandomScore(min = 1, max = 100) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Realistic scoring data generator
function generateRealisticScorePayload() {
  return {
    teamId: generateTeamId(),
    roundId: generateRoundId(),
    judgeId: generateJudgeId(),
    scores: [
      {
        criteriaId: generateCriteriaId(),
        points: generateRandomScore(1, 25),
        pointers: "Good presentation skills",
      },
      {
        criteriaId: generateCriteriaId(),
        points: generateRandomScore(1, 30),
        pointers: "Creative solution approach",
      },
      {
        criteriaId: generateCriteriaId(),
        points: generateRandomScore(1, 25),
        pointers: "Technical implementation quality",
      },
      {
        criteriaId: generateCriteriaId(),
        points: generateRandomScore(1, 20),
        pointers: "Team collaboration",
      },
    ],
  };
}

// Before scenario hook
function beforeScenario(context, events, done) {
  // Set up realistic test data for this user session
  context.vars.eventId = generateEventId();
  context.vars.userId = `user_${uuidv4()}`;
  context.vars.sessionId = uuidv4();
  context.vars.userType = Math.random() > 0.7 ? "judge" : "viewer"; // 30% judges, 70% viewers

  console.log(
    `Starting ${context.vars.userType} scenario for event: ${context.vars.eventId}`
  );
  return done();
}

// After scenario hook
function afterScenario(context, events, done) {
  console.log(
    `Completed ${context.vars.userType} scenario for event: ${context.vars.eventId}`
  );
  return done();
}

// Socket event handlers that match your actual app events
function setupRealisticSocketHandlers(context, events, done) {
  const socket = context.socketio;

  // Connection handlers
  socket.on("connect", () => {
    console.log(`Socket connected: ${socket.id} as ${context.vars.userType}`);
    events.emit("counter", "socketio.connections", 1);
    events.emit("counter", `socketio.connections.${context.vars.userType}`, 1);
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
    events.emit("counter", "socketio.disconnections", 1);
    events.emit(
      "counter",
      `socketio.disconnections.${context.vars.userType}`,
      1
    );
  });

  // QuiScore-specific event handlers
  socket.on("score-updated", (data) => {
    console.log(
      `Score update received for event: ${data.eventId || "unknown"}`
    );
    events.emit("counter", "score.updates.received", 1);
    events.emit(
      "histogram",
      "score.update.latency",
      Date.now() - (context.vars.lastScoreSubmission || Date.now())
    );
  });

  // Room management events
  socket.on("joined-room", (data) => {
    console.log(`Successfully joined room: ${data.room}`);
    events.emit("counter", "room.joins.successful", 1);
  });

  socket.on("left-room", (data) => {
    console.log(`Successfully left room: ${data.room}`);
    events.emit("counter", "room.leaves.successful", 1);
  });

  // Error handling
  socket.on("error", (error) => {
    console.error("Socket error:", error);
    events.emit("counter", "socketio.errors", 1);
    events.emit("counter", `socketio.errors.${context.vars.userType}`, 1);
  });

  socket.on("connect_error", (error) => {
    console.error("Connection error:", error);
    events.emit("counter", "socketio.connection_errors", 1);
  });

  return done();
}

// Custom function to track score submission timing
function trackScoreSubmission(context, events, done) {
  context.vars.lastScoreSubmission = Date.now();
  events.emit("counter", "score.submissions.attempted", 1);
  return done();
}

// Function to generate realistic API request data
function prepareScoreSubmission(context, events, done) {
  context.vars.scorePayload = generateRealisticScorePayload();
  return done();
}

// Performance monitoring functions
function measureConnectionTime(context, events, done) {
  context.vars.connectionStartTime = Date.now();
  return done();
}

function recordConnectionTime(context, events, done) {
  if (context.vars.connectionStartTime) {
    const connectionTime = Date.now() - context.vars.connectionStartTime;
    events.emit("histogram", "connection.time", connectionTime);
  }
  return done();
}

// Function to simulate realistic user behavior patterns
function simulateUserBehavior(context, events, done) {
  // Simulate realistic timing variations
  const baseThinkTime = context.vars.userType === "judge" ? 5000 : 2000; // Judges think longer
  const variation = Math.random() * 2000; // Add up to 2 seconds variation

  context.vars.thinkTime = baseThinkTime + variation;
  return done();
}

// Validate API responses
function validateScoreSubmission(context, response, events, done) {
  if (response.statusCode === 200) {
    events.emit("counter", "score.submissions.successful", 1);
    console.log("Score submission successful");
  } else {
    events.emit("counter", "score.submissions.failed", 1);
    console.error(
      `Score submission failed with status: ${response.statusCode}`
    );
  }
  return done();
}

module.exports = {
  beforeScenario,
  afterScenario,
  setupRealisticSocketHandlers,
  trackScoreSubmission,
  prepareScoreSubmission,
  measureConnectionTime,
  recordConnectionTime,
  simulateUserBehavior,
  validateScoreSubmission,
  generateEventId,
  generateTeamId,
  generateJudgeId,
  generateRoundId,
  generateCriteriaId,
  generateRandomScore,
  generateRealisticScorePayload,
};
