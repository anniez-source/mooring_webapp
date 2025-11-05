# 🖥️ Deploy to Your Own Server

Complete guide to deploy Mooring Web App on Ubuntu/Debian server (DigitalOcean, AWS EC2, Linode, etc.)

---

## 🎯 Two Deployment Options

1. **Docker (Recommended)** - Easiest, isolated, production-ready
2. **PM2 (Traditional)** - Direct Node.js deployment

Choose one and follow the steps below.

---

## 📋 Prerequisites

- **Server**: Ubuntu 20.04+ or Debian 11+ (2GB RAM minimum, 4GB recommended)
- **Domain**: Point your domain's A record to your server IP
- **SSH Access**: `ssh root@your-server-ip`

---

# Option 1: Docker Deployment (Recommended)

## Step 1: Connect to Your Server

```bash
ssh root@your-server-ip
```

## Step 2: Install Docker & Docker Compose

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Verify installation
docker --version
docker-compose --version
```

## Step 3: Upload Your Code

**Option A: From Git (Recommended)**

```bash
# Install Git
apt install git -y

# Clone your repository
cd /opt
git clone https://github.com/anniez-source/mooring_webapp.git
cd mooring_webapp
```

**Option B: Upload via SCP (from your Mac)**

```bash
# On your Mac
cd /Users/annie/Documents
scp -r mooring_webapp root@your-server-ip:/opt/
```

## Step 4: Set Environment Variables

```bash
cd /opt/mooring_webapp

# Create .env file
nano .env
```

Paste these variables (replace with your actual values):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# AI Services
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

Save and exit (Ctrl+X, Y, Enter)

## Step 5: Build & Deploy

```bash
# Build and start the app
docker-compose up -d --build

# Check if it's running
docker ps

# View logs
docker-compose logs -f mooring-app
```

Your app is now running on port 3000!

## Step 6: Set Up Nginx (Reverse Proxy)

```bash
# Install Nginx
apt install nginx -y

# Copy nginx config
cp nginx.conf /etc/nginx/sites-available/mooring
```

Edit the config:
```bash
nano /etc/nginx/sites-available/mooring
```

Replace `your-domain.com` with your actual domain, then:

```bash
# Enable the site
ln -s /etc/nginx/sites-available/mooring /etc/nginx/sites-enabled/

# Remove default site
rm /etc/nginx/sites-enabled/default

# Test config
nginx -t

# Restart Nginx
systemctl restart nginx
```

## Step 7: Set Up SSL (HTTPS)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow prompts (enter your email, agree to terms)
```

Certbot will automatically configure SSL and reload Nginx!

## Step 8: Update Clerk & Supabase

**Clerk Dashboard:**
- Add `https://your-domain.com` to authorized domains
- Add redirect URLs:
  - `https://your-domain.com`
  - `https://your-domain.com/sign-in`
  - `https://your-domain.com/sign-up`

**Supabase Dashboard:**
- Settings → Authentication → URL Configuration
- Site URL: `https://your-domain.com`
- Redirect URLs: `https://your-domain.com/**`

## ✅ Done! Your app is live at `https://your-domain.com`

---

### Docker Management Commands

```bash
# View logs
docker-compose logs -f mooring-app

# Restart app
docker-compose restart

# Stop app
docker-compose down

# Update code and redeploy
cd /opt/mooring_webapp
git pull
docker-compose up -d --build

# View running containers
docker ps

# Check resource usage
docker stats
```

---

# Option 2: PM2 Deployment (Traditional)

## Step 1: Connect & Install Node.js

```bash
ssh root@your-server-ip

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify
node --version
npm --version
```

## Step 2: Upload Code

```bash
cd /opt
git clone https://github.com/anniez-source/mooring_webapp.git
cd mooring_webapp
```

## Step 3: Install Dependencies & Build

```bash
npm install
npm run build
```

## Step 4: Create Environment File

```bash
nano .env.production.local
```

Paste your environment variables, save and exit.

## Step 5: Install & Configure PM2

```bash
# Install PM2
npm install -g pm2

# Create logs directory
mkdir -p logs

# Start the app
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

# Set PM2 to start on boot
pm2 startup
# Run the command it outputs
```

## Step 6: Set Up Nginx (Same as Docker Option)

Follow Step 6 from Docker deployment above.

## Step 7: Set Up SSL (Same as Docker Option)

Follow Step 7 from Docker deployment above.

## ✅ Done!

### PM2 Management Commands

```bash
# View status
pm2 status

# View logs
pm2 logs mooring-webapp

# Restart
pm2 restart mooring-webapp

# Stop
pm2 stop mooring-webapp

# Update code and restart
cd /opt/mooring_webapp
git pull
npm install
npm run build
pm2 restart mooring-webapp

# Monitor resources
pm2 monit
```

---

## 🔒 Security Best Practices

```bash
# Set up firewall
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable

# Disable root login (optional, after creating sudo user)
adduser annie
usermod -aG sudo annie
# Then disable root SSH in /etc/ssh/sshd_config

# Keep system updated
apt update && apt upgrade -y
```

---

## 📊 Monitoring

### Check App Health

```bash
# Docker
docker-compose logs -f mooring-app

# PM2
pm2 logs mooring-webapp

# Nginx access logs
tail -f /var/log/nginx/access.log

# Nginx error logs
tail -f /var/log/nginx/error.log
```

### Resource Usage

```bash
# Overall system
htop

# Docker
docker stats

# PM2
pm2 monit
```

---

## 🐛 Troubleshooting

### App won't start

```bash
# Docker: Check logs
docker-compose logs mooring-app

# PM2: Check logs
pm2 logs mooring-webapp --lines 100

# Common issues:
# - Missing environment variables
# - Port 3000 already in use
# - Build failed (run npm run build manually)
```

### Can't access via domain

```bash
# Check Nginx status
systemctl status nginx

# Test Nginx config
nginx -t

# Check if app is running
curl http://localhost:3000

# Check DNS
nslookup your-domain.com
```

### SSL issues

```bash
# Renew certificate manually
certbot renew

# Check certificate status
certbot certificates

# Auto-renewal is handled by cron
```

---

## 💰 Server Recommendations

### DigitalOcean ($12/month)
- **Droplet**: Basic, 2GB RAM, 1 CPU
- Easy setup, good docs
- [Sign up link](https://www.digitalocean.com/)

### AWS Lightsail ($10/month)
- **Instance**: 2GB RAM, 1 vCPU
- Integrated with AWS ecosystem
- [Sign up link](https://aws.amazon.com/lightsail/)

### Linode ($12/month)
- **Nanode**: 2GB RAM, 1 CPU
- Great performance
- [Sign up link](https://www.linode.com/)

### Hetzner ($5/month - cheapest!)
- **CX21**: 2GB RAM, 1 vCPU
- EU-based, excellent value
- [Sign up link](https://www.hetzner.com/cloud)

---

## 🚀 Performance Tips

1. **Enable caching**: Nginx config already includes static file caching
2. **CDN**: Use Cloudflare (free) in front of your server
3. **Monitoring**: Install `netdata` for real-time monitoring
4. **Backups**: Set up automated backups (DigitalOcean/AWS offer this)
5. **Database**: Your Supabase is already optimized and separate

---

## 📞 Quick Reference

**Your Setup:**
- App runs on: `localhost:3000`
- Nginx proxies: Port 80/443 → 3000
- SSL handled by: Let's Encrypt (auto-renewal)
- Process manager: Docker or PM2
- Logs: `/var/log/nginx/` and `docker-compose logs` or `pm2 logs`

**After deployment:**
- Monitor disk space: `df -h`
- Monitor memory: `free -h`
- Check SSL expiry: `certbot certificates`

---

## 🎉 You're Live!

Your AI-powered community platform is now running on your own server at:
**https://your-domain.com**

Full control, no platform lock-in! 🚀

