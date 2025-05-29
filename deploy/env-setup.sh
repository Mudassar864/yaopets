#!/bin/bash
# Environment setup script for EC2 deployment

# Set up environment variables file
cat > /home/ubuntu/yaopets/.env <<EOF
# Database Configuration
DATABASE_URL=postgresql://yaopets_user:your_secure_password@localhost:5432/yaopets

# Server Configuration
NODE_ENV=production
PORT=5000

# Add any other environment variables your application needs
# JWT_SECRET=your_jwt_secret
# STRIPE_SECRET_KEY=your_stripe_secret_key
# SENDGRID_API_KEY=your_sendgrid_api_key
EOF

# Make sure the environment file is secure but accessible to the application
chmod 600 /home/ubuntu/yaopets/.env

echo "Environment variables have been configured."