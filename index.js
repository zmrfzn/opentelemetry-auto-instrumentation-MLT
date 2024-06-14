const serverless = require("serverless-http");
const Koa = require("koa");
const route = require("koa-route");
const compress = require("koa-compress");
const { bodyParser } = require("@koa/bodyparser");

const bunyan = require("bunyan");

const logger = bunyan.createLogger({
  name: `${process.env.OTEL_SERVICE_NAME || "default"}`,
})

//app started
const app = (module.exports = new Koa());
app.use(compress());
app.use(
  bodyParser({
    enableTypes: ["json", "text"],
  })
);

const API_CONFIG = {
  baseURL: process.env.EXPRESS_OTEL_API_ENDPOINT,
};

app.use(
  route.get("/", async function (ctx) {
    logger.info("hit /");

    // console.log("hit /");

    ctx.body = "Hello World";
  })
);

app.use(
  route.get("/path", async function (ctx) {
    logger.info("hit /path");
    // console.log("hit /path");
    ctx.body = "Hello from path";
  })
);

app.use(
  route.post("/", async function (ctx) {
    // console.log("hit POST /");
    ctx.body = ctx.request.body || "Hello from POST";
  })
);

app.use(
  route.get("/weather", async function (ctx, next) {
    // console.log("hit /weather");
    logger.info("hit /weather");
    var axios = require("axios");

    var config = {
      method: "get",
      url: `${API_CONFIG.baseURL}/weather?location=${ctx.request.query.location}`,
      headers: {
        "Content-Type": "application/json",
      },
    };

    // console.log(`config: ${JSON.stringify(config)}`);

    return await axios(config)
      .then(function (response) {
        console.info(
          `${ctx.request.method} ${ctx.request.originalUrl}- ${JSON.stringify(
            ctx.request.query.location
          )} - Request Successful!!`
        );
        logger.info(
          `${ctx.request.method} ${ctx.request.originalUrl}- ${JSON.stringify(
            ctx.request.query.location
          )} - Request Successful!!`
        );
        ctx.body = response.data;
        next();
      })
      .catch(function (error) {
        console.error(
          `${ctx.request.method} ${ctx.request.originalUrl}- ${JSON.stringify(
            ctx.request.query.location
          )} - Error fetching data`
        );

        logger.error(
          `${ctx.request.method} ${ctx.request.originalUrl}- ${JSON.stringify(
            ctx.request.query.location
          )} - Error fetching data`
        );
        ctx.throw(
          404,
          `Error retrieving data, ${ctx.request.query?.location} ${error.message}`
        );
      });
  })
);

// start app on 3000 print a console log message

if (!module.parent)
  app.listen(3000, () => {
    console.log("listening on port 3000");
  });

// module.exports.handler = serverless(app);
