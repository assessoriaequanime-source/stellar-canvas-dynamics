#!/bin/bash
sudo sed -i 's|proxy_pass http://127.0.0.1:8091;|proxy_pass http://127.0.0.1:3000;|' /etc/nginx/sites-enabled/singulai.site
sudo nginx -t && sudo systemctl reload nginx
