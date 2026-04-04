# syntax=docker/dockerfile:1
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install git for fetching dependencies
RUN apk add --no-cache git

# Download dependencies
COPY go.mod ./
# COPY go.sum ./ (Will add once go mod tidy is run)
RUN go mod download || true # ignore for now until go.sum exists

COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/api .

# Use a lightweight alpine image for the final container
FROM alpine:3.18
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /root/

COPY --from=builder /app/api .

EXPOSE 8080

CMD ["./api"]