This is a Node.js application built with the Koa framework and instrumented with OpenTelemetry automatic instrumentation of Metrics, Logs & Traces, it also provides a Open Telemetry collector configuration `config.yaml` to export your telemetry to the collector.

## Prerequisites
- Node 16.x 
- Docker 

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com:zmrfzn/opentelemetry-autoinstrumentation-MLT.git
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

4. Start the Open Telemetry collector with configuration file in the root directory 
   
```bash
docker run -d \
-v "${PWD}/config.yaml":/config.yaml \
-p 4318:4318 \
-p 4317:4317 \
otel/opentelemetry-collector-contrib \
--config config.yaml
```

5. Generate Load & Test
  
Generate some load on the application on the available endpoints.

### GET 
- / 
- /path
- /weather?location=<your location>

### POST 
- / - accepts a JSON object in the body 
