import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Database configuration
const dbConfig = {
  development: {
    uri: process.env.MONGODB_URI || 'mongodb+srv://mahad:mahad123@cluster0.itw0k.mongodb.net/supermarket_pos_dev?retryWrites=true&w=majority&appName=Cluster0',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    },
  },
  production: {
    uri: process.env.MONGODB_URI,
    options: {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      authSource: 'admin',
      ssl: process.env.MONGODB_SSL === 'true',
      sslValidate: process.env.MONGODB_SSL_VALIDATE !== 'false',
    },
  },
  test: {
    uri: process.env.MONGODB_TEST_URI || 'mongodb+srv://mahad:mahad123@cluster0.itw0k.mongodb.net/Raza_cathering?retryWrites=true&w=majority&appName=Cluster0',
    options: {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    },
  },
};

const environment = process.env.NODE_ENV || 'development';
const config = dbConfig[environment];

// Validate configuration
if (!config || !config.uri) {
  throw new Error(`Database configuration not found for environment: ${environment}`);
}

if (environment === 'production' && !process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is required in production');
}

// Database connection
let isConnected = false;
let connectionAttempts = 0;
const maxRetries = 5;
const retryDelay = 5000; // 5 seconds

const connectDB = async () => {
  if (isConnected) {
    console.log('📦 Database already connected');
    return mongoose.connection;
  }

  try {
    connectionAttempts++;
    console.log(`🔄 Connecting to MongoDB (Attempt ${connectionAttempts}/${maxRetries})...`);
    console.log(`📍 Environment: ${environment}`);
    console.log(`🌐 URI: ${config.uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials in logs

    const conn = await mongoose.connect(config.uri, config.options);

    isConnected = true;
    connectionAttempts = 0;

    console.log(`✅ MongoDB Connected: ${conn.connection.host}:${conn.connection.port}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    return conn.connection;
  } catch (error) {
    console.error(`❌ Database connection failed (Attempt ${connectionAttempts}/${maxRetries}):`, error.message);

    if (connectionAttempts < maxRetries) {
      console.log(`⏰ Retrying in ${retryDelay / 1000} seconds...`);
      setTimeout(connectDB, retryDelay);
    } else {
      console.error('🚨 Max connection attempts reached. Exiting...');
      process.exit(1);
    }
  }
};

// Database disconnection
const disconnectDB = async () => {
  try {
    if (isConnected) {
      await mongoose.disconnect();
      isConnected = false;
      console.log('📦 Database disconnected');
    }
  } catch (error) {
    console.error('❌ Error disconnecting from database:', error.message);
  }
};

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('📦 Mongoose connected to MongoDB');
  isConnected = true;
});

mongoose.connection.on('error', (error) => {
  console.error('❌ Mongoose connection error:', error.message);
  isConnected = false;
});

mongoose.connection.on('disconnected', () => {
  console.log('📦 Mongoose disconnected from MongoDB');
  isConnected = false;
  
  // Attempt to reconnect in production
  if (environment === 'production' && connectionAttempts < maxRetries) {
    console.log('🔄 Attempting to reconnect...');
    setTimeout(connectDB, retryDelay);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Gracefully shutting down...');
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Gracefully shutting down...');
  await disconnectDB();
  process.exit(0);
});

// Database utilities
const getConnectionStatus = () => ({
  isConnected,
  readyState: mongoose.connection.readyState,
  host: mongoose.connection.host,
  port: mongoose.connection.port,
  name: mongoose.connection.name,
  environment,
});

const getConnectionStats = () => ({
  totalConnections: mongoose.connection.db?.serverConfig?.connections?.length || 0,
  availableConnections: mongoose.connection.db?.serverConfig?.availableConnections?.length || 0,
  maxPoolSize: config.options.maxPoolSize,
});

// Health check
const healthCheck = async () => {
  try {
    if (!isConnected) {
      throw new Error('Database not connected');
    }

    // Simple ping to check if database is responsive
    await mongoose.connection.db.admin().ping();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      ...getConnectionStatus(),
      ...getConnectionStats(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
      ...getConnectionStatus(),
    };
  }
};

// Database seeding utilities
const dropDatabase = async () => {
  if (environment === 'production') {
    throw new Error('Cannot drop database in production environment');
  }
  
  try {
    await mongoose.connection.db.dropDatabase();
    console.log('🗑️  Database dropped successfully');
  } catch (error) {
    console.error('❌ Error dropping database:', error.message);
    throw error;
  }
};

const createIndexes = async () => {
  try {
    console.log('📊 Creating database indexes...');
    
    // This will trigger index creation for all models
    const models = mongoose.models;
    const indexPromises = Object.values(models).map(model => {
      if (model.createIndexes) {
        return model.createIndexes();
      }
      return Promise.resolve();
    });
    
    await Promise.all(indexPromises);
    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
    throw error;
  }
};

export {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  getConnectionStats,
  healthCheck,
  dropDatabase,
  createIndexes,
  environment,
};