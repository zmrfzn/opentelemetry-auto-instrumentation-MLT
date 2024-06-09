const { NodeTracerProvider } = require("@opentelemetry/sdk-trace-node");
const { registerInstrumentations } = require("@opentelemetry/instrumentation");

const {
  getNodeAutoInstrumentations,
} = require("@opentelemetry/auto-instrumentations-node");
const { BatchSpanProcessor } = require("@opentelemetry/sdk-trace-base");

const { Resource } = require("@opentelemetry/resources");

const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-proto");

const {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} = require("@opentelemetry/core");

// OTel Logging SDK setup.
const { logs: otelLogs } = require("@opentelemetry/api-logs");
const {
  LoggerProvider,
  ConsoleLogRecordExporter,
  SimpleLogRecordProcessor,
  BatchLogRecordProcessor,
} = require("@opentelemetry/sdk-logs");

const {
  SEMRESATTRS_SERVICE_NAME,
} = require("@opentelemetry/semantic-conventions");

const {
  OpenTelemetryBunyanStream,
  BunyanInstrumentation,
} = require("@opentelemetry/instrumentation-bunyan");
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');

const appLoggerProvider = new LoggerProvider({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME,
  }),
});

// const appLoggerProvider = new LoggerProvider();

const logExporter = new OTLPLogExporter({
  url: "http://localhost:4318/v1/logs",
});

appLoggerProvider.addLogRecordProcessor(
  new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())
);

appLoggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));
otelLogs.setGlobalLoggerProvider(appLoggerProvider);

// logs end

// For troubleshooting, set the log level to DiagLogLevel.DEBUG
const { diag, DiagConsoleLogger, DiagLogLevel } = require("@opentelemetry/api");
// var logger = diag.createComponentLogger(DiagLogLevel.WARN);
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

const COLLECTOR_STRING = `http://localhost:4318/v1/traces`;

// logger.error(`string: ${COLLECTOR_STRING}`);

/**
 * The `newRelicExporter` is an instance of OTLPTraceExporter
 * configured to send traces to New Relic's OTLP-compatible backend.
 * Make sure you have added your New Relic Ingest License to NR_LICENSE env-var
 */
const newRelicExporter = new OTLPTraceExporter({
  url: COLLECTOR_STRING,
});

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME,
  }),
});
provider.addSpanProcessor(
  new BatchSpanProcessor(
    newRelicExporter,
    //Optional BatchSpanProcessor Configurations
    {
      // The maximum queue size. After the size is reached spans are dropped.
      maxQueueSize: 1000,
      // The maximum batch size of every export. It must be smaller or equal to maxQueueSize.
      maxExportBatchSize: 500,
      // The interval between two consecutive exports
      scheduledDelayMillis: 500,
      // How long the export can run before it is canceled
      exportTimeoutMillis: 30000,
    }
  )
);
provider.register({
  propagator: new CompositePropagator({
    propagators: [new W3CBaggagePropagator(), new W3CTraceContextPropagator()],
  }),
});

registerInstrumentations({
  loggerProvider: appLoggerProvider,
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
        record['resource.service.name'] = provider.resource.attributes['service.name'];
      }
    })
  ],
});
