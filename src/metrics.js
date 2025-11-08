const os = require("os");
const { metrics: metricsConfig } = require("./config");

const activeUsers = new Map();
const ACTIVE_THRESHOLD = 60 * 1000; // 60 seconds

const requestsByEndpoint = {};
const requestsByMethod = {};

let loginSuccessCount = 0;
let loginFailureCount = 0;

// Middleware to track requests
function requestTracker(req, res, next) {
  const userId = req.user?.id;
  if (userId) activeUsers.set(String(userId), Date.now());

  const endpoint = `[${req.method}] ${req.path}`;
  requestsByEndpoint[endpoint] = (requestsByEndpoint[endpoint] || 0) + 1;
  requestsByMethod[req.method] = (requestsByMethod[req.method] || 0) + 1;
  next();
}

// Sending metrics every 10 seconds
setInterval(() => {
  const metrics = [];
  Object.keys(requestsByEndpoint).forEach((endpoint) => {
    metrics.push(
      createMetric("requestsByEndpoint", requestsByEndpoint[endpoint], "1", "sum", "asInt", {
        endpoint,
      })
    );
  });

  Object.keys(requestsByMethod).forEach((method) => {
    metrics.push(
      createMetric("requestsByMethod", requestsByMethod[method], "1", "sum", "asInt", {
        method,
      })
    );
  });

  metrics.push(
    createMetric("cpuUsage", getCpuUsagePercentage(), "%", "gauge", "asDouble", {
      host: os.hostname(),
    })
  );

  metrics.push(
    createMetric("memoryUsage", getMemoryUsagePercentage(), "%", "gauge", "asDouble", {
      host: os.hostname(),
    })
  );

  metrics.push(createMetric("activeUsers", getActiveUsersCount(), "1", "gauge", "asInt", {}));

  metrics.push(createMetric("loginSuccessCount", loginSuccessCount, "1", "sum", "asInt", {}));
  metrics.push(createMetric("loginFailureCount", loginFailureCount, "1", "sum", "asInt", {}));

  sendMetricToGrafana(metrics);
}, 10000);

function createMetric(metricName, metricValue, metricUnit, metricType, valueType, attributes) {
  attributes = { ...attributes, source: metricsConfig.source };

  const metric = {
    name: metricName,
    unit: metricUnit,
    [metricType]: {
      dataPoints: [
        {
          [valueType]: metricValue,
          timeUnixNano: Date.now() * 1000000,
          attributes: [],
        },
      ],
    },
  };

  Object.keys(attributes).forEach((key) => {
    metric[metricType].dataPoints[0].attributes.push({
      key: key,
      value: { stringValue: attributes[key] },
    });
  });

  if (metricType === "sum") {
    metric[metricType].aggregationTemporality = "AGGREGATION_TEMPORALITY_CUMULATIVE";
    metric[metricType].isMonotonic = true;
  }

  return metric;
}

function sendMetricToGrafana(metrics) {
  const body = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics,
          },
        ],
      },
    ],
  };

  fetch(`${metricsConfig.url}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${metricsConfig.apiKey}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP status: ${response.status}`);
      }
    })
    .catch((error) => {
      console.error("Error pushing metrics:", error);
    });
}

function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return cpuUsage.toFixed(2) * 100;
}

function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

function getActiveUsersCount() {
  // Users with recent activity determined by the active threshold are counted as active
  const limit = Date.now() - ACTIVE_THRESHOLD;
  for (const [id, timestamp] of activeUsers) if (timestamp < limit) activeUsers.delete(id);
  return activeUsers.size;
}

function attemptedLogin(success) {
  if (success) loginSuccessCount++;
  else loginFailureCount++;
}

module.exports = { requestTracker, attemptedLogin };
