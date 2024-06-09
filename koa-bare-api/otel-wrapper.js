const {
  NodeTracerProvider
} = require("@opentelemetry/sdk-trace-node");
const {
  registerInstrumentations
} = require("@opentelemetry/instrumentation");

const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const {
  BatchSpanProcessor
} = require("@opentelemetry/sdk-trace-base");

const {
  Resource
} = require("@opentelemetry/resources");
const {
  SEMRESATTRS_SERVICE_NAME,
} = require("@opentelemetry/semantic-conventions");

const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-proto");

const {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} = require("@opentelemetry/core");

const myResource = Resource.default().merge(
  new Resource({
      [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME,
  })
);

// OTel Logging SDK setup.
const {
  logs: otelLogs
} = require("@opentelemetry/api-logs");
const {
  LoggerProvider,
  ConsoleLogRecordExporter,
  SimpleLogRecordProcessor,
  BatchLogRecordProcessor,
} = require("@opentelemetry/sdk-logs");

const {
  OpenTelemetryBunyanStream,
  BunyanInstrumentation,
} = require("@opentelemetry/instrumentation-bunyan");
const {
  OTLPLogExporter
} = require("@opentelemetry/exporter-logs-otlp-http");

const appLoggerProvider = new LoggerProvider({
  resource: myResource,
});

const logExporter = new OTLPLogExporter({
  url: "http://localhost:4318/v1/logs",
});

appLoggerProvider.addLogRecordProcessor(
  new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())
);

appLoggerProvider.addLogRecordProcessor(
  new BatchLogRecordProcessor(logExporter)
);
otelLogs.setGlobalLoggerProvider(appLoggerProvider);

// logs end

// OTEL Metrics Config start

const opentelemetry = require("@opentelemetry/api");
const {
  MeterProvider,
  PeriodicExportingMetricReader,
  ConsoleMetricExporter,
} = require("@opentelemetry/sdk-metrics");
const {
  OTLPMetricExporter,
} = require("@opentelemetry/exporter-metrics-otlp-http");

const consoleMetricReader = new PeriodicExportingMetricReader({
  exporter: new ConsoleMetricExporter(),

  // Default is 60000ms (60 seconds). Set to 10 seconds for demonstrative purposes only.
  exportIntervalMillis: 10000,
});

const MetricReaderExporter = new PeriodicExportingMetricReader({
  exporter: new OTLPMetricExporter(),

  // Default is 60000ms (60 seconds). Set to 10 seconds for demonstrative purposes only.
  exportIntervalMillis: 10000,
});

const myServiceMeterProvider = new MeterProvider({
  resource: myResource,
  readers: [consoleMetricReader, MetricReaderExporter],
});

// Set this MeterProvider to be global to the app being instrumented.
// opentelemetry.metrics.setGlobalMeterProvider(myServiceMeterProvider);
// Metrics end

// For troubleshooting, set the log level to DiagLogLevel.DEBUG
const {
  diag,
  DiagConsoleLogger,
  DiagLogLevel
} = require("@opentelemetry/api");
// var logger = diag.createComponentLogger(DiagLogLevel.WARN);
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

// OTEL Traces config start
const COLLECTOR_STRING = `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`;

// logger.error(`string: ${COLLECTOR_STRING}`);

/**
* The `newRelicExporter` is an instance of OTLPTraceExporter
* configured to send traces to New Relic's OTLP-compatible backend.
* Make sure you have added your New Relic Ingest License to NR_LICENSE env-var
*/
const newRelicExporter = new OTLPTraceExporter({
  url: COLLECTOR_STRING,
});

const collectorExporter = new OTLPTraceExporter({
  url: "http://localhost:4318/v1/traces",
});

const traceProvider = new NodeTracerProvider({
  resource: myResource,
  forceFlushTimeoutMillis: 10000,
});

traceProvider.addSpanProcessor(
  new BatchSpanProcessor(
      collectorExporter,
      //Optional BatchSpanProcessor Configurations
      {
          // The maximum queue size. After the size is reached spans are dropped.
          maxQueueSize: 2048,
          // The maximum batch size of every export. It must be smaller or equal to maxQueueSize.
          maxExportBatchSize: 512,
          // The interval between two consecutive exports
          scheduledDelayMillis: 5000,
          // How long the export can run before it is canceled
          exportTimeoutMillis: 30000,
      }
  )
);
traceProvider.register({
  propagator: new CompositePropagator({
      propagators: [new W3CBaggagePropagator(), new W3CTraceContextPropagator()],
  }),
});

registerInstrumentations({
  loggerProvider: appLoggerProvider,
  meterProvider: myServiceMeterProvider,
  tracerProvider: traceProvider,
  instrumentations: [
      getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-fs": {
              enabled: process.env.ENABLE_FS_INSTRUMENTATION || false,
              requireParentSpan: true,
          },
          "@opentelemetry/instrumentation-koa": {
              enabled: true,
          },
      }),
      new BunyanInstrumentation({
          logHook: (span, record) => {
              record["resource.service.name"] =
                  traceProvider.resource.attributes["service.name"];
          },
      }),
  ],
});