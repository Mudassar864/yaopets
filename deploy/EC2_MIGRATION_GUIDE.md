# YaoPets EC2 Migration Guide

This guide will walk you through the process of deploying the YaoPets application on Amazon EC2.

## Prerequisites

1. An AWS account with EC2 access
2. A created EC2 instance (recommended: t2.medium or larger with at least 20GB storage)
3. SSH access to your EC2 instance
4. Domain name (optional but recommended for production)

## Step 1: Launch Your EC2 Instance

1. Log in to your AWS Management Console
2. Navigate to EC2 and click "Launch Instance"
3. Choose an Amazon Machine Image (AMI) - Ubuntu Server 22.04 LTS is recommended
4. Choose an instance type (t2.medium or larger recommended)
5. Configure instance details (use defaults if unsure)
6. Add storage (at least 20GB recommended)
7. Add tags (optional)
8. Configure security group:
   - Allow SSH (port 22) from your IP
   - Allow HTTP (port 80) from anywhere
   - Allow HTTPS (port 443) from anywhere
9. Review and launch with your key pair

## Step 2: Connect to Your EC2 Instance

```bash
ssh -i /path/to/your-key.pem ubuntu@your-ec2-public-dns
```

## Step 3: Clone the Repository

```bash
git clone https://your-repository-url.git /home/ubuntu/yaopets
cd /home/ubuntu/yaopets
```

## Step 4: Run the Setup Scripts

Make the scripts executable:

```bash
chmod +x ./deploy/*.sh
```

Run the setup scripts in this order:

```bash
# 1. Set up the system with Node.js, Nginx, PostgreSQL, etc.
sudo ./deploy/ec2-setup.sh

# 2. Set up the database
sudo ./deploy/db-migration.sh

# 3. Configure environment variables
sudo ./deploy/env-setup.sh
```

## Step 5: Update Configuration Files

1. Edit the Nginx configuration to use your domain name:

```bash
sudo nano /etc/nginx/sites-available/yaopets
```

2. Replace "YOUR_DOMAIN_OR_IP" with your actual domain or EC2 public IP

3. Restart Nginx:

```bash
sudo systemctl restart nginx
```

## Step 6: Set Up Automated Backups

Schedule the backup script to run daily:

```bash
crontab -e
```

Add the following line to run the backup at 2 AM daily:

```
0 2 * * * /home/ubuntu/yaopets/deploy/backup-db.sh
```

## Step 7: Set Up SSL (Optional but Recommended)

Install Certbot for Let's Encrypt SSL:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## Step 8: Monitor Your Application

Check the application status:

```bash
pm2 status
```

View application logs:

```bash
pm2 logs yaopets
```

## Troubleshooting

1. If the application fails to start, check logs:

```bash
pm2 logs yaopets
```

2. If database connection fails, verify the DATABASE_URL environment variable:

```bash
cat /home/ubuntu/yaopets/.env
```

3. If Nginx returns a 502 Bad Gateway, check if the application is running:

```bash
pm2 status
```

## Maintenance

- **Update the application**: Pull the latest code and restart:

```bash
cd /home/ubuntu/yaopets
git pull
npm install
npm run build
pm2 restart yaopets
```

- **View logs**: Use PM2 to check application logs:

```bash
pm2 logs yaopets
```

- **Database backup**: Run the backup script manually:

```bash
/home/ubuntu/yaopets/deploy/backup-db.sh
```