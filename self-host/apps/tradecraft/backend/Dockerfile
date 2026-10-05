FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# timetzdata embeds the time-zone database, so zone names work in this minimal image
RUN CGO_ENABLED=0 go build -tags timetzdata -o /out/api ./cmd/api

FROM alpine:3.22
RUN adduser -D -u 10001 app
COPY --from=build /out/api /usr/local/bin/api
USER app
EXPOSE 8080
CMD ["api"]
