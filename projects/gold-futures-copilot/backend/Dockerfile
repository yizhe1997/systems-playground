# syntax=docker/dockerfile:1

FROM golang:1.24-alpine AS build
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /bin/gold-copilot-backend ./main.go

FROM alpine:3.20
WORKDIR /app
COPY --from=build /bin/gold-copilot-backend /usr/local/bin/gold-copilot-backend
COPY --from=build /app/migrations /app/migrations

ENV HTTP_ADDR=:8091
ENV MIGRATIONS_DIR=/app/migrations

EXPOSE 8091
CMD ["gold-copilot-backend"]
