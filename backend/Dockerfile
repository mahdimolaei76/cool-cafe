# ---- Build Stage ----
FROM docker.arvancloud.ir/golang:1.21-alpine AS builder

# Fix Alpine mirror for Iran
RUN sed -i 's|https://dl-cdn.alpinelinux.org|https://alpine.global.ssl.fastly.net|g' /etc/apk/repositories && \
    apk add --no-cache git ca-certificates

# Fix Go module proxy for Iran (golang.org is blocked)
ENV GOPROXY=https://goproxy.cn,https://goproxy.io,direct
ENV GONOSUMCHECK=*
ENV GONOSUMDB=*
ENV GONOPROXY=

WORKDIR /app

COPY go.mod ./
RUN go mod download || true

COPY . .

RUN go mod tidy && \
    CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /api ./cmd/api

# ---- Run Stage ----
FROM docker.arvancloud.ir/alpine:3.19

RUN sed -i 's|https://dl-cdn.alpinelinux.org|https://alpine.global.ssl.fastly.net|g' /etc/apk/repositories && \
    apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /api .
COPY --from=builder /app/migrations ./migrations

RUN mkdir -p /app/uploads

EXPOSE 8080

CMD ["./api"]
