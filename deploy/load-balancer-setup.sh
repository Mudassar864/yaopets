#!/bin/bash
# Setup script for configuring a load balancer for multiple EC2 instances

# This script assumes you're running it on your primary EC2 instance
# and have already set up your application using the ec2-setup.sh script

# Install HAProxy for load balancing
sudo apt-get update
sudo apt-get install -y haproxy

# Configure HAProxy
sudo cat > /etc/haproxy/haproxy.cfg <<EOF
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

defaults
    log global
    mode http
    option httplog
    option dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 403 /etc/haproxy/errors/403.http
    errorfile 408 /etc/haproxy/errors/408.http
    errorfile 500 /etc/haproxy/errors/500.http
    errorfile 502 /etc/haproxy/errors/502.http
    errorfile 503 /etc/haproxy/errors/503.http
    errorfile 504 /etc/haproxy/errors/504.http

frontend http_front
    bind *:80
    stats uri /haproxy?stats
    default_backend http_back

backend http_back
    balance roundrobin
    server ec2_1 127.0.0.1:5000 check
    # Add additional servers as needed:
    # server ec2_2 [EC2_INSTANCE_2_PRIVATE_IP]:5000 check
    # server ec2_3 [EC2_INSTANCE_3_PRIVATE_IP]:5000 check
EOF

# Enable and restart HAProxy
sudo systemctl enable haproxy
sudo systemctl restart haproxy

echo "HAProxy load balancer has been configured on this instance."
echo "To add more EC2 instances to the load balancer, edit /etc/haproxy/haproxy.cfg"
echo "and add additional server lines under the 'backend http_back' section."