#!/bin/bash
# EC2 setup script for YaoPets application

# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js, npm and other required dependencies
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql nginx git

# Install PM2 globally for process management
sudo npm install -g pm2

# Clone the repository (adjust with your repository URL)
# git clone [your-repo-url] /home/ubuntu/yaopets
# cd /home/ubuntu/yaopets

# Create uploads directory if needed
mkdir -p uploads

# Install project dependencies
npm install

# Build the project
npm run build

# Configure PM2 to start the application
pm2 start npm --name "yaopets" -- start
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
pm2 save

# Configure Nginx
cat > /etc/nginx/sites-available/yaopets <<EOF
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Configure for large file uploads
    client_max_body_size 10M;
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/yaopets /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

echo "Setup complete! Your application should be running at http://YOUR_DOMAIN_OR_IP"