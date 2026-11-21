# OpenTelemetry Setup Guide

## Overview

OpenTelemetry (OTel) is the vendor-neutral standard for emitting traces, metrics,
and logs. This guide covers Python instrumentation; the patterns apply to any
language SDK.

## Architecture

```
App (SDK) ──OTLP──> OTel Collector ──> Jaeger   (traces)
                                   ──> Prometheus (metrics)
                                   ──> Loki      (logs)
```

The Collector acts as a pipeline: receivers ingest data, processors transform it,
and exporters send it to backends. Decouple your app from backends — always export
to a Collector rather than directly to storage.

## 1. Install the SDK

```bash
pip install \
  opentelemetry-api \
  opentelemetry-sdk \
  opentelemetry-exporter-otlp-proto-grpc \
  opentelemetry-instrumentation-fastapi \
  opentelemetry-instrumentation-requests \
  opentelemetry-instrumentation-sqlalchemy \
  opentelemetry-instrumentation-redis
```

## 2. Initialize Tracing

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

resource = Resource.create({
    "service.name": "checkout-api",
    "service.version": "1.4.2",
    "deployment.environment": "production",
})

provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://otel-collector:4317", insecure=True),
    max_queue_size=2048,
    max_export_batch_size=512,
)
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)
```

## 3. Initialize Metrics

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317", insecure=True),
    export_interval_millis=15000,
)
meter_provider = MeterProvider(resource=resource, metric_readers=[reader])
metrics.set_meter_provider(meter_provider)
```

## 4. Auto-Instrumentation

Auto-instrument common libraries without touching application code:

```bash
opentelemetry-instrument \
  --traces_exporter otlp \
  --metrics_exporter otlp \
  --exporter_otlp_endpoint http://otel-collector:4317 \
  --service_name checkout-api \
  python -m uvicorn app:app --host 0.0.0.0 --port 8000
```

This wraps FastAPI, requests, SQLAlchemy, and other installed instrumentors
automatically.

## 5. Manual Spans

Add manual spans for business-critical logic that auto-instrumentation does not
capture:

```python
tracer = trace.get_tracer("checkout.payment")

def process_payment(order):
    with tracer.start_as_current_span("process_payment") as span:
        span.set_attribute("order.id", order["id"])
        span.set_attribute("order.total", order["total"])
        try:
            result = gateway.charge(order)
            span.set_attribute("payment.status", "success")
            return result
        except PaymentError as e:
            span.set_status(trace.StatusCode.ERROR, str(e))
            span.record_exception(e)
            raise
```

## 6. Context Propagation

OTel propagates trace context across process boundaries via HTTP headers
(`traceparent`). Ensure propagators are configured:

```python
from opentelemetry.propagate import set_global_textmap
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.propagators.b3 import B3MultiFormat
from opentelemetry.trace.propagation import TraceContextTextMapPropagator

set_global_textmap(CompositePropagator([
    TraceContextTextMapPropagator(),
    B3MultiFormat(),
]))
```

When making outbound HTTP calls, inject context:

```python
from opentelemetry.propagate import inject

headers = {}
inject(headers)
response = requests.get("http://inventory-svc/stock", headers=headers)
```

## 7. Structured Log Correlation

Inject trace_id and span_id into log records so logs link to traces:

```python
import logging
from opentelemetry import trace

class TraceIdFilter(logging.Filter):
    def filter(self, record):
        ctx = trace.get_current_span().get_span_context()
        record.trace_id = format(ctx.trace_id, "032x") if ctx.trace_id else ""
        record.span_id = format(ctx.span_id, "016x") if ctx.span_id else ""
        return True

handler = logging.StreamHandler()
handler.addFilter(TraceIdFilter())
formatter = logging.Formatter(
    '{"time":"%(asctime)s","level":"%(levelname)s",'
    '"trace_id":"%(trace_id)s","span_id":"%(span_id)s",'
    '"message":"%(message)s"}'
)
handler.setFormatter(formatter)
logging.root.addHandler(handler)
logging.root.setLevel(logging.INFO)
```

## 8. OTel Collector Configuration

Minimal `otel-collector-config.yaml`:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write
  loki:
    endpoint: http://loki:3100/loki/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/jaeger]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheusremotewrite]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [loki]
```

## 9. Sampling Strategies

In high-traffic systems, trace every request is expensive. Configure sampling:

| Strategy           | Use Case                               | Config Key            |
|--------------------|----------------------------------------|-----------------------|
| AlwaysOn           | Dev/staging                            | `always_on`           |
| TraceIdRatio       | Sample N% uniformly                    | `traceidratio`        |
| ParentBased        | Follow upstream decision               | `parentbased_*`       |
| Tail-based (Coll.) | Keep errors/slow, sample normal        | Collector processor   |

```python
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased
provider = TracerProvider(
    resource=resource,
    sampler=TraceIdRatioBased(0.1),  # 10% sampling
)
```

For production, use tail-based sampling in the Collector to retain 100% of error
and high-latency traces while sampling routine ones.

## 10. Checklist

- [ ] `service.name` and `service.version` set on Resource
- [ ] OTLP exporter points to Collector, not directly to backend
- [ ] `BatchSpanProcessor` used (never `SimpleSpanProcessor` in production)
- [ ] Context propagation configured for all outbound calls
- [ ] trace_id injected into structured logs
- [ ] Sampling strategy chosen and documented
- [ ] Collector `memory_limiter` processor enabled
- [ ] Health endpoint `/healthz` returns quickly without tracing overhead
