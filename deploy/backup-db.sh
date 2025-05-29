#!/bin/bash
# Database backup script for EC2

# Set variables
DB_NAME="yaopets"
DB_USER="yaopets_user"
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/$DB_NAME-$DATE.sql"

# Ensure backup directory exists
mkdir -p $BACKUP_DIR

# Create backup
PGPASSWORD="your_secure_password" pg_dump -U $DB_USER -d $DB_NAME > $BACKUP_FILE

# Compress the backup
gzip $BACKUP_FILE

# Remove backups older than 7 days
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +7 -delete

echo "Database backup completed at $BACKUP_FILE.gz"