<p float="left">
<img src="https://raw.githubusercontent.com/tandpfun/skill-icons/main/icons/NodeJS-Light.svg" width="50" height="50">
<img src="https://raw.githubusercontent.com/cncf/artwork/c2e619cdf85e8bac090ceca7c0834c5cfedf9426/projects/opentelemetry/icon/color/opentelemetry-icon-color.svg" width="50" height="50" style="background-color:#F4F2ED;border-radius:25%;">
</p>
<hr>

# Open Telemetry MLT (Metrics, Logs , Traces)  with Nodejs

This is a Node.js application built with the Koa framework and instrumented with OpenTelemetry automatic instrumentation of Metrics, Logs & Traces, it also provides a Open Telemetry collector configuration `config.yaml` to export your telemetry to the collector.

## Prerequisites
- Node 16.x 
- Docker 
- New Relic Account - [Sign up](https://newrelic.com/signup) for a free account

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com:zmrfzn/opentelemetry-auto-instrumentation-MLT.git
```
2. Install dependencies 
``` bash 
npm install
```

3. Start the application with the otel-wrapper module 
```bash
node --require ./otel-wrapper server
```

app runs on PORT 3000

4. Start the Open Telemetry collector with configuration file in the root directory.

Add your New Relic INGEST license key by replacing the placeholder for the ENV VAR 
   
```bash
docker run -d \
-v "${PWD}/config.yaml":/config.yaml \
-p 4318:4318 \
-p 4317:4317 \
-e NR_LICENSE_KEY=<YOUR NEW RELIC INGEST LICENSE>
otel/opentelemetry-collector-contrib \
--config config.yaml
```

1. Generate Load & Test
  
Generate some load on the application on the available endpoints.

#### GET 
- / 
- /path
- /weather?location=<your location>

#### POST 
- / - accepts a JSON object in the body 
