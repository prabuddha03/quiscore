const { v4: uuidv4 } = require("uuid");

// Production configuration
const PRODUCTION_CONFIG = {
  eventId: "cmctdcrkw009p7z52xknf1dc6",
  baseUrl: "https://scorops-ljt35.ondigitalocean.app",
  scoreboardPath: "/event/cmctdcrkw009p7z52xknf1dc6/scoreboard",
  socketPath: "/api/socket/io",
};

// Before scenario hook
function beforeScenario(context, events, done) {
  context.vars.userId = `prod_user_${uuidv4()}`;
  context.vars.sessionId = uuidv4();
  context.vars.startTime = Date.now();

  // Determine user type based on scenario
  context.vars.userType = context.scenario?.name?.includes("Homepage")
    ? "homepage"
    : "scoreboard";

  console.log(`[PROD TEST] Starting ${context.vars.userType} scenario`);
  return done();
}

// After scenario hook
function afterScenario(context, events, done) {
  const duration = Date.now() - context.vars.startTime;
  console.log(
    `[PROD TEST] Completed ${context.vars.userType} scenario in ${duration}ms`
  );

  // Track session duration by type
  events.emit(
    "histogram",
    `session.duration.${context.vars.userType}`,
    duration
  );

  return done();
}

// Enhanced Socket.IO handlers for production monitoring
function setupProductionSocketHandlers(context, events, done) {
  const socket = context.socketio;

  // Connection success tracking
  socket.on("connect", () => {
    const connectionTime = Date.now() - context.vars.startTime;
    console.log(
      `[PROD TEST] Socket connected: ${socket.id} in ${connectionTime}ms`
    );

    events.emit("counter", "prod.socketio.connections", 1);
    events.emit("histogram", "prod.socketio.connection_time", connectionTime);
  });

  // Disconnection tracking
  socket.on("disconnect", (reason) => {
    console.log(
      `[PROD TEST] Socket disconnected: ${socket.id}, reason: ${reason}`
    );
    events.emit("counter", "prod.socketio.disconnections", 1);
    events.emit("counter", `prod.socketio.disconnect.${reason}`, 1);
  });

  // Scoreboard-specific events
  socket.on("score-updated", (data) => {
    console.log(`[PROD TEST] Score update received:`, data);
    events.emit("counter", "prod.scoreboard.score_updates", 1);

    // Track real-time update latency
    if (context.vars.lastScoreSubmissionTime) {
      const latency = Date.now() - context.vars.lastScoreSubmissionTime;
      events.emit("histogram", "prod.scoreboard.update_latency", latency);
    }
  });

  // Room management events
  socket.on("joined-room", (roomData) => {
    console.log(`[PROD TEST] Successfully joined room:`, roomData);
    events.emit("counter", "prod.socketio.room_joins", 1);
  });

  socket.on("left-room", (roomData) => {
    console.log(`[PROD TEST] Successfully left room:`, roomData);
    events.emit("counter", "prod.socketio.room_leaves", 1);
  });

  // Error handling with detailed logging
  socket.on("error", (error) => {
    console.error(`[PROD TEST] Socket error:`, error);
    events.emit("counter", "prod.socketio.errors", 1);
    events.emit("counter", `prod.socketio.error.${error.type || "unknown"}`, 1);
  });

  socket.on("connect_error", (error) => {
    console.error(`[PROD TEST] Connection error:`, error.message);
    events.emit("counter", "prod.socketio.connection_errors", 1);
    events.emit(
      "counter",
      `prod.socketio.connection_error.${error.type || "unknown"}`,
      1
    );
  });

  // Timeout detection
  socket.on("disconnect", (reason) => {
    if (reason === "ping timeout" || reason === "transport close") {
      events.emit("counter", "prod.socketio.timeouts", 1);
    }
  });

  return done();
}

// HTTP request validation for homepage
function validateHomepageResponse(context, response, events, done) {
  if (response.statusCode === 200) {
    console.log(`[PROD TEST] Homepage loaded successfully`);
    events.emit("counter", "prod.homepage.success", 1);

    // Track response time
    if (response.timings) {
      events.emit(
        "histogram",
        "prod.homepage.response_time",
        response.timings.response
      );
    }
  } else {
    console.error(
      `[PROD TEST] Homepage failed with status: ${response.statusCode}`
    );
    events.emit("counter", "prod.homepage.errors", 1);
    events.emit("counter", `prod.homepage.error.${response.statusCode}`, 1);
  }

  return done();
}

// Production health check
function productionHealthCheck(context, events, done) {
  // Track overall system health metrics
  const memoryUsage = process.memoryUsage();
  events.emit("gauge", "prod.artillery.memory.rss", memoryUsage.rss);
  events.emit("gauge", "prod.artillery.memory.heapUsed", memoryUsage.heapUsed);

  return done();
}

// Network quality monitoring
function trackNetworkQuality(context, events, done) {
  const now = Date.now();

  // Simple network quality check
  if (context.vars.lastPingTime) {
    const timeSinceLastPing = now - context.vars.lastPingTime;
    if (timeSinceLastPing > 10000) {
      // More than 10 seconds
      events.emit("counter", "prod.network.slow_response", 1);
    }
  }

  context.vars.lastPingTime = now;
  return done();
}

// Realistic user behavior simulation
function simulateRealisticBehavior(context, events, done) {
  // Simulate various user behaviors
  const behaviors = {
    quick_check: { minTime: 10, maxTime: 30, probability: 0.3 },
    active_watching: { minTime: 60, maxTime: 180, probability: 0.5 },
    extended_session: { minTime: 300, maxTime: 600, probability: 0.2 },
  };

  const rand = Math.random();
  let selectedBehavior = "active_watching"; // default

  if (rand < 0.3) selectedBehavior = "quick_check";
  else if (rand < 0.8) selectedBehavior = "active_watching";
  else selectedBehavior = "extended_session";

  const behavior = behaviors[selectedBehavior];
  const sessionTime =
    Math.random() * (behavior.maxTime - behavior.minTime) + behavior.minTime;

  context.vars.sessionLength = sessionTime * 1000; // Convert to ms
  context.vars.behaviorType = selectedBehavior;

  events.emit("counter", `prod.user.behavior.${selectedBehavior}`, 1);

  return done();
}

// Performance bottleneck detection
function detectPerformanceBottlenecks(context, events, done) {
  const now = Date.now();

  // Track if operations are taking too long
  if (context.vars.operationStartTime) {
    const operationDuration = now - context.vars.operationStartTime;

    if (operationDuration > 5000) {
      // More than 5 seconds
      events.emit("counter", "prod.performance.slow_operation", 1);
      console.warn(
        `[PROD TEST] Slow operation detected: ${operationDuration}ms`
      );
    }

    events.emit(
      "histogram",
      "prod.performance.operation_duration",
      operationDuration
    );
  }

  context.vars.operationStartTime = now;
  return done();
}

module.exports = {
  beforeScenario,
  afterScenario,
  setupProductionSocketHandlers,
  validateHomepageResponse,
  productionHealthCheck,
  trackNetworkQuality,
  simulateRealisticBehavior,
  detectPerformanceBottlenecks,
  PRODUCTION_CONFIG,
};
