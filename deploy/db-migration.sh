#!/bin/bash
# Database migration script for EC2 deployment

# Set variables (you'll need to update these)
DB_NAME="yaopets"
DB_USER="yaopets_user"
DB_PASSWORD="your_secure_password"  # Replace with actual password in production

# Create PostgreSQL user and database
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Set DATABASE_URL environment variable for the application
echo "export DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME" >> ~/.bashrc
source ~/.bashrc

# Run database migrations
cd /home/ubuntu/yaopets
npm run db:push

echo "Database setup complete!"