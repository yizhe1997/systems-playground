FROM nginx:1.27-alpine

COPY nginx.conf.template /etc/gateway/nginx.conf.template
COPY entrypoint.sh /usr/local/bin/gateway-entrypoint.sh
RUN sed -i 's/\r$//' /etc/gateway/nginx.conf.template /usr/local/bin/gateway-entrypoint.sh \
 && chmod 755 /usr/local/bin/gateway-entrypoint.sh

USER 101
EXPOSE 3081 8080
ENTRYPOINT ["/usr/local/bin/gateway-entrypoint.sh"]
