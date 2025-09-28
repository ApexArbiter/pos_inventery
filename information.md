# Dash WhatsApp - Custom Catering Management System

## Project Overview

**Dash WhatsApp** is a comprehensive catering management system that allows restaurants and catering businesses to manage orders, track their status, and automatically send bills to customers via WhatsApp. The system features a modern web interface with real-time order tracking and seamless WhatsApp integration for bill delivery.

## 🏗️ System Architecture

The project follows a **3-tier architecture**:

1. **Frontend**: React.js with TypeScript, Tailwind CSS, and Vite
2. **Backend**: Node.js with Express.js and MongoDB
3. **WhatsApp Service**: Separate Node.js server for WhatsApp integration

## 📁 Project Structure

```
Dash Whats/
├── frontend/                 # React.js frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts (Auth, Theme)
│   │   ├── api/            # API configuration
│   │   └── utils/          # Utility functions
│   └── dist/               # Built frontend files
├── backend/                 # Main backend API server
│   ├── src/
│   │   ├── controllers/    # API route controllers
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Express middleware
│   │   ├── lib/            # Utility libraries
│   │   └── utils/          # Helper utilities
│   └── node_modules/
└── whatsapp/               # WhatsApp integration server
    ├── server.js          # WhatsApp Web.js server
    └── node_modules/
```

## 🚀 Key Features

### 1. Order Management System
- **Order Creation**: Create new catering orders with customer details
- **Order Tracking**: Track orders through multiple statuses:
  - `pending` - Order received, awaiting confirmation
  - `confirmed` - Order confirmed by staff
  - `preparing` - Order being prepared
  - `ready` - Order ready for delivery/pickup
  - `delivered` - Order completed
  - `cancelled` - Order cancelled
- **Priority Levels**: Set order priority (low, medium, high)
- **Order Search & Filtering**: Search by order number, customer name, phone, or address
- **Pagination**: Efficient handling of large order lists

### 2. Product Management
- **Product Catalog**: Manage menu items and catering packages
- **Categories**: Organize products by categories (Deals, Main Courses, etc.)
- **Deal Packages**: Special deals with multiple items included
- **Pricing**: Set individual and package pricing
- **Vegetarian Options**: Mark vegetarian items

### 3. Customer Management
- **Customer Information**: Store customer details (name, WhatsApp, address)
- **Contact Management**: WhatsApp integration for customer communication
- **Order History**: Track customer order history

### 4. Bill Generation & WhatsApp Integration
- **Automatic Bill Generation**: Generate professional bills with company branding
- **Multiple Export Formats**: PDF, PNG image, and print-ready formats
- **WhatsApp Integration**: Send bills directly to customers via WhatsApp
- **One-Click Sending**: Single button to generate and send bills
- **Bill Tracking**: Track bill delivery status and WhatsApp message IDs

### 5. Dashboard & Analytics
- **Real-time Dashboard**: Live order statistics and metrics
- **Revenue Tracking**: Track daily, weekly, and monthly revenue
- **Order Analytics**: Visual charts for order trends and status distribution
- **Performance Metrics**: Average order value, conversion rates, etc.

### 6. User Management & Authentication
- **Role-based Access**: Admin and staff user roles
- **Branch Management**: Multi-branch support for restaurant chains
- **Secure Authentication**: JWT-based authentication system
- **User Profiles**: Manage user accounts and permissions

### 7. WhatsApp Service Features
- **Session Management**: Multiple WhatsApp sessions support
- **QR Code Authentication**: Easy WhatsApp account linking
- **Message Types**: Support for text, images, and media messages
- **Auto-reconnection**: Automatic session recovery
- **API Integration**: RESTful API for WhatsApp operations

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool and dev server
- **Recharts** - Data visualization library
- **Lucide React** - Icon library
- **React Hot Toast** - Notification system
- **Axios** - HTTP client for API calls

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **Bcrypt** - Password hashing
- **Cloudinary** - Image storage and management
- **Socket.io** - Real-time communication

### WhatsApp Integration
- **WhatsApp Web.js** - WhatsApp Web API wrapper
- **Puppeteer** - Browser automation for WhatsApp Web
- **QR Code** - QR code generation for authentication
- **Express.js** - API server for WhatsApp operations

## 📊 Database Schema

### Order Model
```javascript
{
  orderNumber: String (unique),
  customer: {
    name: String,
    whatsapp: String,
    address: String,
    notes: String
  },
  items: [{
    productId: ObjectId,
    name: String,
    category: String,
    price: Number,
    quantity: Number,
    subtotal: Number,
    isVegetarian: Boolean
  }],
  totalAmount: Number,
  discount: Number,
  discountType: String (amount/percentage),
  finalAmount: Number,
  status: String (pending/confirmed/preparing/ready/delivered/cancelled),
  priority: String (low/medium/high),
  deliveryDate: Date,
  notes: String,
  createdBy: ObjectId,
  branch: String,
  billSentAt: Date,
  billImageUrl: String,
  whatsappMessageId: String
}
```

### Product Model
```javascript
{
  name: String,
  items: [String], // For deal packages
  description: String,
  category: String,
  subCategory: String,
  price: Number,
  minPersons: Number,
  discountedPrice: Number,
  notes: String,
  isVegetarian: Boolean,
  image: String
}
```

### User Model
```javascript
{
  fullName: String,
  email: String (unique),
  password: String (hashed),
  role: String (admin/staff),
  branch: String,
  isActive: Boolean
}
```

## 🔧 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/forgot-password` - Password reset

### Orders
- `GET /orders` - Get all orders (with filtering/pagination)
- `GET /orders/:id` - Get order by ID
- `POST /orders` - Create new order
- `PUT /orders/:id` - Update order
- `PATCH /orders/:id/status` - Update order status
- `DELETE /orders/:id` - Delete order
- `GET /orders/stats` - Get order statistics
- `POST /orders/:id/send-bill` - Send bill via WhatsApp

### Products
- `GET /products` - Get all products
- `GET /products/:id` - Get product by ID
- `POST /products` - Create new product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product

### WhatsApp Service
- `GET /session/status/:sessionId` - Get session status
- `GET /session/start/:sessionId` - Start WhatsApp session
- `GET /session/stop/:sessionId` - Stop WhatsApp session
- `GET /session/qr/:sessionId` - Get QR code for authentication
- `POST /message/text/:sessionId` - Send text message
- `POST /message/media-base64/:sessionId` - Send image message

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB
- WhatsApp account for integration

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Dash Whats"
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Install WhatsApp Service Dependencies**
   ```bash
   cd ../whatsapp
   npm install
   ```

5. **Environment Setup**
   - Create `.env` files in backend and whatsapp directories
   - Configure MongoDB connection string
   - Set JWT secrets and other environment variables

6. **Start the Services**
   ```bash
   # Terminal 1 - Backend API
   cd backend
   npm start

   # Terminal 2 - Frontend
   cd frontend
   npm run dev

   # Terminal 3 - WhatsApp Service
   cd whatsapp
   node server.js
   ```

## 📱 WhatsApp Integration Setup

1. **Start WhatsApp Service**: Run the WhatsApp server
2. **Generate QR Code**: Access the QR code endpoint
3. **Scan QR Code**: Use WhatsApp mobile app to scan the QR code
4. **Session Ready**: Once authenticated, the session is ready for sending messages

## 🎯 Key Workflows

### Order Processing Workflow
1. **Order Creation**: Staff creates order with customer details and items
2. **Order Confirmation**: Order moves from pending to confirmed status
3. **Preparation**: Order status updated to preparing when kitchen starts
4. **Ready**: Order marked as ready when completed
5. **Bill Generation**: Generate bill with all order details
6. **WhatsApp Delivery**: Send bill directly to customer's WhatsApp
7. **Delivery**: Mark order as delivered when completed

### Bill Generation Workflow
1. **Order Selection**: Select order for bill generation
2. **Bill Preview**: Preview bill with all details and formatting
3. **Image Generation**: Convert bill to high-quality image
4. **WhatsApp Sending**: Send image directly to customer's WhatsApp
5. **Delivery Confirmation**: Track message delivery status

## 🔒 Security Features

- **JWT Authentication**: Secure API access with JSON Web Tokens
- **Password Hashing**: Bcrypt for secure password storage
- **API Key Protection**: WhatsApp service protected with API keys
- **Role-based Access**: Different permissions for admin and staff users
- **Input Validation**: Server-side validation for all inputs
- **CORS Protection**: Cross-origin resource sharing configuration

## 📈 Performance Features

- **Pagination**: Efficient handling of large datasets
- **Database Indexing**: Optimized database queries
- **Image Optimization**: Compressed images for WhatsApp delivery
- **Caching**: Session management for WhatsApp connections
- **Real-time Updates**: Live dashboard updates

## 🎨 User Interface Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark/Light Theme**: Toggle between themes
- **Modern UI**: Clean, professional interface
- **Interactive Charts**: Real-time data visualization
- **Toast Notifications**: User feedback for actions
- **Loading States**: Smooth loading indicators

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```
MONGODB_URI=mongodb://localhost:27017/catering-system
JWT_SECRET=your-jwt-secret
PORT=5000
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
```

**WhatsApp Service (.env)**
```
PORT=3000
API_KEY=MAHAD
NODE_ENV=development
```

## 🚀 Deployment

### Frontend Deployment
- Build the React app: `npm run build`
- Deploy the `dist` folder to any static hosting service
- Configure API endpoints for production

### Backend Deployment
- Deploy to cloud platforms (Heroku, Vercel, AWS, etc.)
- Configure MongoDB Atlas for production database
- Set up environment variables

### WhatsApp Service Deployment
- Deploy as separate service
- Ensure persistent storage for WhatsApp sessions
- Configure API key protection

## 📝 Future Enhancements

- **Multi-language Support**: Internationalization
- **SMS Integration**: Alternative to WhatsApp
- **Email Integration**: Email bill delivery
- **Inventory Management**: Stock tracking
- **Payment Integration**: Online payment processing
- **Mobile App**: Native mobile application
- **Advanced Analytics**: More detailed reporting
- **Customer Portal**: Customer self-service portal

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is proprietary software developed for catering management.

## 📞 Support

For support and questions, please contact the development team.

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Author**: Development Team
