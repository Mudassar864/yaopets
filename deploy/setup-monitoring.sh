#!/bin/bash
# Setup CloudWatch monitoring for EC2 instance

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb
rm ./amazon-cloudwatch-agent.deb

# Create CloudWatch agent configuration
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<EOF
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "metrics": {
    "append_dimensions": {
      "InstanceId": "\${aws:InstanceId}"
    },
    "metrics_collected": {
      "mem": {
        "measurement": [
          "mem_used_percent"
        ]
      },
      "disk": {
        "measurement": [
          "used_percent"
        ],
        "resources": [
          "/"
        ]
      },
      "cpu": {
        "totalcpu": true
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/home/ubuntu/.pm2/logs/yaopets-out.log",
            "log_group_name": "yaopets-logs",
            "log_stream_name": "application-logs"
          },
          {
            "file_path": "/home/ubuntu/.pm2/logs/yaopets-error.log",
            "log_group_name": "yaopets-logs",
            "log_stream_name": "error-logs"
          },
          {
            "file_path": "/var/log/nginx/access.log",
            "log_group_name": "yaopets-logs",
            "log_stream_name": "nginx-access"
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "yaopets-logs",
            "log_stream_name": "nginx-error"
          }
        ]
      }
    }
  }
}
EOF

# Start the CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Enable CloudWatch agent to start on boot
sudo systemctl enable amazon-cloudwatch-agent

echo "CloudWatch monitoring has been set up for your EC2 instance"