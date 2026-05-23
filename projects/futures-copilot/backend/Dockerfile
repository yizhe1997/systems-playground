FROM golang:1.25-alpine AS build
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /bin/futures-copilot-backend-legacy .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /bin/futures-copilot-backend ./cmd/server

FROM alpine:3.20
WORKDIR /app
COPY --from=build /bin/futures-copilot-backend /usr/local/bin/futures-copilot-backend
COPY --from=build /bin/futures-copilot-backend-legacy /usr/local/bin/futures-copilot-backend-legacy

ENV PORT=8088

EXPOSE 8088
CMD ["futures-copilot-backend"]
