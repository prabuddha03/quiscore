# QuiScore Socket.IO Load Testing with Artillery

This directory contains Artillery load test configuration for testing the Socket.IO functionality of the QuiScore application, specifically targeting the real-time scoreboard feature.

## Test Specifications

- **Target**: Socket.IO endpoints at `/scoreboard/:scoreboardid`
- **Load**: 50 users per second for 2 minutes (total: ~6,000 virtual users)
- **User Journey**:
  1. Connect to Socket.IO
  2. Emit `join-scoreboard` event with scoreboard ID
  3. Wait 5 seconds
  4. Emit `submit-score` event with random score
  5. Disconnect after 15 seconds total

## Prerequisites

1. **Install Artillery globally:**

   ```bash
   npm install -g artillery@latest
   ```

2. **Install dependencies for the processor functions:**
   ```bash
   npm install --save-dev uuid
   ```

## Files Overview

- `artillery-load-test.yml` - Basic Artillery configuration (original requirements)
- `artillery-load-test-realistic.yml` - Enhanced configuration matching your app structure
- `artillery-scoreboard-focused.yml` - Focused test for scoreboard viewers only
- `load-test-functions.js` - Basic processor functions
- `realistic-load-test-functions.js` - Realistic processor functions
- `scoreboard-test-functions.js` - Scoreboard-focused processor functions
- `load-test-package.json` - Dependencies for the load test
- `LOAD-TEST-README.md` - This documentation

## Running the Load Test

### Basic Test

```bash
artillery run artillery-load-test.yml
```

### Environment-Specific Tests

```bash
# Production environment
artillery run artillery-load-test.yml --environment production

# Staging environment
artillery run artillery-load-test.yml --environment staging

# Development environment (localhost:3000)
artillery run artillery-load-test.yml --environment development
```

### Scoreboard-Focused Test (Recommended)

```bash
# Test specifically for scoreboard viewers on your actual event
artillery run artillery-scoreboard-focused.yml

# Target your production deployment
artillery run artillery-scoreboard-focused.yml --environment production
```

### Generate Detailed Reports

```bash
# Run test and generate HTML report
artillery run artillery-load-test.yml --output report.json
artillery report report.json
```

## Configuration Details

### Load Pattern

- **Duration**: 120 seconds (2 minutes)
- **Arrival Rate**: 50 virtual users per second
- **Total Virtual Users**: ~6,000 over the test duration

### Socket.IO Configuration

- **Transports**: WebSocket and HTTP polling
- **Connection Timeout**: 20 seconds
- **Upgrade**: Enabled for better performance

### Test Scenario Flow

#### Realistic Test (Mixed Users)

1. **Connection** (1 second)
2. **Join Event Room** - `event_{eventId}`
3. **Judge Activity** - Submit scores via API (30% of users)
4. **Viewer Activity** - Watch scoreboard updates (70% of users)
5. **Leave Room** and **Disconnect**

#### Scoreboard-Focused Test (Viewers Only)

1. **Connection** (0.5 seconds)
2. **Join Event Room** - `event_cmctdcrkw009p7z52xknf1dc6`
3. **Watch Scoreboard** - Stay connected 30-60 seconds
4. **Leave Room** and **Disconnect**

#### Basic Test (Original Requirements)

1. **Connection** (1 second)
2. **Join Scoreboard** - Emit with `{scoreboardId: "abc123", userId: "unique-id"}`
3. **Wait Period** (5 seconds)
4. **Submit Score** - Emit with `{userId: "unique-id", score: 1-100}`
5. **Final Wait** (9 seconds)
6. **Disconnect**

## Metrics to Monitor

The test will track:

- **Connection Rates**: Successful/failed socket connections
- **Event Emissions**: join-scoreboard and submit-score events
- **Response Times**: Time taken for socket operations
- **Error Rates**: Failed connections or timeouts
- **Custom Metrics**:
  - `socketio.connections`
  - `socketio.disconnections`
  - `scoreboard.joins`
  - `score.submissions`
  - `scoreboard.updates`
  - `socketio.errors`

## Expected Results

### Healthy Server Response

- **Connection Success Rate**: >95%
- **Average Response Time**: <100ms for socket events
- **Error Rate**: <5%
- **Memory Usage**: Should remain stable
- **CPU Usage**: Should not exceed 80%

### Warning Signs

- **High Error Rates**: >10% indicates server overload
- **Slow Response Times**: >500ms suggests performance issues
- **Connection Failures**: >10% indicates capacity limits
- **Memory Leaks**: Continuously increasing memory usage

## Scaling the Test

### Increase Load

To test higher loads, modify the `arrivalRate` in `artillery-load-test.yml`:

```yaml
phases:
  - duration: 120
    arrivalRate: 100 # Increase from 50 to 100 users/second
```

### Extend Duration

```yaml
phases:
  - duration: 300 # Increase from 120 to 300 seconds (5 minutes)
    arrivalRate: 50
```

### Multiple Phases

```yaml
phases:
  - duration: 60
    arrivalRate: 25 # Ramp up
  - duration: 120
    arrivalRate: 50 # Sustained load
  - duration: 60
    arrivalRate: 25 # Ramp down
```

## Troubleshooting

### Common Issues

1. **"Cannot connect to target"**

   - Verify the target URL is accessible
   - Check firewall/network settings
   - Ensure Socket.IO server is running

2. **High error rates**

   - Server may be overloaded
   - Check server logs for errors
   - Consider reducing load or scaling server

3. **Artillery command not found**
   - Install Artillery globally: `npm install -g artillery@latest`
   - Check PATH environment variable

### Server-Side Monitoring

While running the test, monitor your server for:

- CPU usage
- Memory consumption
- Database connections
- Network I/O
- Error logs

## Next Steps

After running the load test:

1. **Analyze Results**: Review the Artillery output and generated reports
2. **Identify Bottlenecks**: Look for high response times or error rates
3. **Optimize Server**: Based on findings, optimize database queries, caching, or server configuration
4. **Scale Infrastructure**: Consider horizontal scaling if needed
5. **Repeat Testing**: Run tests regularly to ensure performance regression detection

## Additional Notes

- The test uses unique user IDs for each virtual user to simulate realistic usage
- Random scores between 1-100 are submitted to test various data scenarios
- The test includes proper cleanup with disconnect events
- Metrics are collected for detailed performance analysis

For questions or issues with the load test setup, refer to the [Artillery documentation](https://artillery.io/docs/) or contact the development team.
