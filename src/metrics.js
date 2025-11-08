const os = require("os");
const { metrics: metricsConfig } = require("./config");

const requestsByEndpoint = {};
const requestsByMethod = {};

// Middleware to track requests
function requestTracker(req, res, next) {
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

module.exports = { requestTracker };
