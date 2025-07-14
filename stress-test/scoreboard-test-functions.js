const { v4: uuidv4 } = require("uuid");

// Specific event ID for your scoreboard
const EVENT_ID = "cmctdcrkw009p7z52xknf1dc6";
const EVENT_ROOM = `event_${EVENT_ID}`;

// Before scenario hook
function beforeScenario(context, events, done) {
  context.vars.userId = `viewer_${uuidv4()}`;
  context.vars.sessionId = uuidv4();
  context.vars.eventId = EVENT_ID;
  context.vars.eventRoom = EVENT_ROOM;

  console.log(`Starting scoreboard viewer session for event: ${EVENT_ID}`);
  return done();
}

// After scenario hook
function afterScenario(context, events, done) {
  console.log(`Completed scoreboard viewer session for event: ${EVENT_ID}`);
  return done();
}

// Socket handlers specifically for scoreboard viewing
function setupScoreboardHandlers(context, events, done) {
  const socket = context.socketio;

  // Connection tracking
  socket.on("connect", () => {
    console.log(`Scoreboard viewer connected: ${socket.id}`);
    events.emit("counter", "scoreboard.connections", 1);
  });

  socket.on("disconnect", () => {
    console.log(`Scoreboard viewer disconnected: ${socket.id}`);
    events.emit("counter", "scoreboard.disconnections", 1);
  });

  // Scoreboard-specific events
  socket.on("score-updated", (data) => {
    console.log(`Scoreboard received score update: ${JSON.stringify(data)}`);
    events.emit("counter", "scoreboard.score_updates_received", 1);

    // Track update frequency
    if (context.vars.lastScoreUpdate) {
      const timeBetweenUpdates = Date.now() - context.vars.lastScoreUpdate;
      events.emit(
        "histogram",
        "scoreboard.update_frequency",
        timeBetweenUpdates
      );
    }
    context.vars.lastScoreUpdate = Date.now();
  });

  // Room management
  socket.on("joined-room", (data) => {
    console.log(`Successfully joined scoreboard room: ${data}`);
    events.emit("counter", "scoreboard.room_joins", 1);
  });

  socket.on("left-room", (data) => {
    console.log(`Successfully left scoreboard room: ${data}`);
    events.emit("counter", "scoreboard.room_leaves", 1);
  });

  // Error handling
  socket.on("error", (error) => {
    console.error("Scoreboard socket error:", error);
    events.emit("counter", "scoreboard.errors", 1);
  });

  socket.on("connect_error", (error) => {
    console.error("Scoreboard connection error:", error);
    events.emit("counter", "scoreboard.connection_errors", 1);
  });

  return done();
}

// Track connection timing for scoreboard viewers
function trackConnectionTime(context, events, done) {
  context.vars.connectionStartTime = Date.now();
  return done();
}

function recordConnectionTime(context, events, done) {
  if (context.vars.connectionStartTime) {
    const connectionTime = Date.now() - context.vars.connectionStartTime;
    events.emit("histogram", "scoreboard.connection_time", connectionTime);
  }
  return done();
}

// Simulate realistic scoreboard viewing patterns
function simulateScoreboardBehavior(context, events, done) {
  // Scoreboard viewers typically:
  // - Connect quickly
  // - Stay connected for extended periods
  // - React to real-time updates

  const baseViewingTime = 45000; // 45 seconds base
  const variation = Math.random() * 30000; // Up to 30 seconds variation

  context.vars.viewingTime = baseViewingTime + variation;
  return done();
}

// Track scoreboard performance metrics
function trackScoreboardMetrics(context, events, done) {
  const startTime = Date.now();
  context.vars.sessionStartTime = startTime;

  // Track session duration when complete
  const endTime = Date.now();
  if (context.vars.sessionStartTime) {
    const sessionDuration = endTime - context.vars.sessionStartTime;
    events.emit("histogram", "scoreboard.session_duration", sessionDuration);
  }

  return done();
}

// Generate realistic viewer behavior data
function generateViewerData(context, events, done) {
  context.vars.viewerData = {
    userId: context.vars.userId,
    eventId: EVENT_ID,
    sessionId: context.vars.sessionId,
    userAgent: "Artillery-LoadTest-ScoreboardViewer",
    timestamp: new Date().toISOString(),
  };

  return done();
}

module.exports = {
  beforeScenario,
  afterScenario,
  setupScoreboardHandlers,
  trackConnectionTime,
  recordConnectionTime,
  simulateScoreboardBehavior,
  trackScoreboardMetrics,
  generateViewerData,
};
