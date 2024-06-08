const serverless = require("serverless-http");
const Koa = require("koa");
const route = require("koa-route");
const compress = require("koa-compress");
const { bodyParser } = require("@koa/bodyparser");



// OTel Logging SDK setup.

// Custom log forwarder code
const { SeverityNumber } = require('@opentelemetry/api-logs');
const {
    LoggerProvider,
    BatchLogRecordProcessor,
    SimpleLogRecordProcessor,
    ConsoleLogRecordExporter
  } = require('@opentelemetry/sdk-logs');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');

// // For troubleshooting, set the log level to DiagLogLevel.DEBUG
const { diag, DiagConsoleLogger, DiagLogLevel } = require("@opentelemetry/api");

const { Resource } = require("@opentelemetry/resources");
const {
  SemanticResourceAttributes,
} = require("@opentelemetry/semantic-conventions");


diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

const collectorOptions = {
    url: 'http://localhost:4318/v1/logs', // url is optional and can be omitted - default is http://localhost:4318/v1/logs
  };

const logExporter = new OTLPLogExporter(collectorOptions);
const loggerProvider = new LoggerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: process.env.OTEL_SERVICE_NAME,
  }),
});
// Add a processor to export log record
loggerProvider.addLogRecordProcessor(
  new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())
);

loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));
const logger = loggerProvider.getLogger(process.env.OTEL_SERVICE_NAME);


//app started
const app = (module.exports = new Koa());
app.use(compress());
app.use(bodyParser({
  enableTypes: ['json', 'text']
}));

const API_CONFIG = {
  baseURL: process.env.EXPRESS_OTEL_API_ENDPOINT
};

app.use(
  route.get("/", async function (ctx) {

    logger.emit({
      severityNumber: SeverityNumber.INFO,
      timestamp: Date.now(),
      body: 'Hit /',
      attributes: {}
    });

    console.log('hit /');

    ctx.body = "Hello World";
  })
);

app.use(
  route.get("/path", async function (ctx) {
    logger.info('hit /path');
    console.log('hit /path');
    ctx.body = "Hello from path";
  })
);

app.use(
  route.post("/", async function (ctx) {
    console.log('hit POST /')
    ctx.body = ctx.request.body || "Hello from POST";
  })
);

app.use(
  route.get("/weather", async function (ctx, next) {
    console.log('hit /weather');
    logger.info('hit /weather');
    var axios = require("axios");

    var config = {
      method: "get",
      url: `${API_CONFIG.baseURL}/weather?location=${ctx.request.query.location}`,
      headers: {
        "Content-Type": "application/json",
      },
    };

    console.log(`config: ${JSON.stringify(config)}`);

    return await axios(config)
      .then(function (response) {
        console.info(
          `${ctx.request.method} ${ctx.request.originalUrl}- ${JSON.stringify(
            ctx.request.query.location
          )} - Request Successful!!`
        );
        logger.info(`${ctx.request.method} ${ctx.request.originalUrl}- ${JSON.stringify(
          ctx.request.query.location
        )} - Request Successful!!`)
        ctx.body = response.data;
        next();
      })
      .catch(function (error) {
        console.error(
          `${ctx.request.method} ${ctx.request.originalUrl}- ${JSON.stringify(
            ctx.request.query.location
          )} - Error fetching data`
        );

        logger.error(`${ctx.request.method} ${ctx.request.originalUrl}- ${JSON.stringify(
          ctx.request.query.location
        )} - Error fetching data`);
        ctx.throw(404,`Error retrieving data, ${ctx.request.query?.location} ${error.message}`)
      });
  })
);


if (!module.parent) app.listen(3000);

module.exports.handler = serverless(app);
