# 🎯 DEMO ACCOUNTS - SuperMarket POS System

## 📋 Login Credentials

Use these accounts to test the system:

### 🔑 Demo Login Details

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| **Super Admin** | `admin@supermarket.com` | `admin123` | Full system access |
| **Store Admin** | `store@supermarket.com` | `store123` | Store management |
| **Billing Staff** | `billing@supermarket.com` | `billing123` | POS & billing |
| **Inventory Staff** | `inventory@supermarket.com` | `inventory123` | Inventory management |

## 🚀 Quick Setup

1. **Start Backend Server:**
   ```bash
   cd backend
   npm start
   ```

2. **Reset Demo Passwords** (if login fails):
   ```bash
   curl -X POST http://localhost:5001/api/setup/reset-demo-passwords
   ```

3. **Test Login:**
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     -d '{"email":"admin@supermarket.com","password":"admin123"}' \
     http://localhost:5001/api/auth/login
   ```

4. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

## 🔧 Troubleshooting

### If Login Fails:

1. **Check Server Status:**
   ```bash
   curl http://localhost:5001/health
   ```

2. **Reset Demo Accounts:**
   ```bash
   curl -X POST http://localhost:5001/api/setup/demo
   ```

3. **Reset Passwords:**
   ```bash
   curl -X POST http://localhost:5001/api/setup/reset-demo-passwords
   ```

## 🎯 API Endpoints

- **Health Check:** `GET /health`
- **API Test:** `GET /api/test`
- **Login:** `POST /api/auth/login`
- **Setup Demo:** `POST /api/setup/demo`
- **Reset Passwords:** `POST /api/setup/reset-demo-passwords`

## 📱 Frontend Access

- **URL:** http://localhost:3000
- **Default Login:** admin@supermarket.com / admin123

## 🏪 Store Details

- **Store Name:** Demo SuperMarket
- **Store ID:** DEMO001
- **Location:** Demo City, Demo State

---

## 🔐 Security Note

These are demo accounts for testing purposes only. In production:
- Use strong passwords
- Enable 2FA
- Regular password rotation
- Proper user management

---

## 📞 Support

If you encounter issues:
1. Check server logs
2. Verify database connection
3. Reset demo accounts
4. Contact development team

---

**Last Updated:** September 28, 2025
**Version:** 1.0.0
