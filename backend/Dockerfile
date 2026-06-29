FROM docker.arvancloud.ir/golang:1.21-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /app

COPY go.mod go.sum ./
COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -mod=mod -o api ./cmd/api


FROM docker.arvancloud.ir/alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/api .

EXPOSE 8080

CMD ["./api"]