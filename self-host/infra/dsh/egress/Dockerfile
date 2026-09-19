FROM alpine:3.21

RUN apk add --no-cache squid
COPY squid.conf /etc/squid/squid.conf
RUN sed -i 's/\r$//' /etc/squid/squid.conf

USER squid
EXPOSE 3128
ENTRYPOINT ["squid", "-N", "-f", "/etc/squid/squid.conf"]
