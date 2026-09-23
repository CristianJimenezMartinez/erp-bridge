FROM php:alpine
RUN docker-php-ext-install pdo_mysql
WORKDIR /var/www/html
COPY erp-bridge-endpoint.php /var/www/html/erp-bridge-endpoint.php
CMD ["php", "-S", "0.0.0.0:80", "-t", "/var/www/html"]
