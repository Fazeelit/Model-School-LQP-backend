import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load the main .env file (since you currently have only .env)
const configDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendEnvPath = path.resolve(configDirectory, "../.env");

// Resolve this relative to the backend so it works regardless of the process
// working directory. Explicit process variables still take precedence.
dotenv.config({ path: backendEnvPath });

console.log(`✅ Loaded environment variables from .env`);

export default {
  port: process.env.PORT || 8080,
  // Render and other hosted services require binding to all network interfaces.
  // Keep the loopback default for local development unless HOST is explicitly set.
  host: process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1"),

  // MongoDB
  mongodbUri: process.env.MONGO_URI ,

  // JWT
  jwtSecret: process.env.JWT_SECRET || "default_secret_key",
  jwtAlgorithm: process.env.JWT_ALGORITHM || "HS256",
  jwtExpiresIn: process.env.JWT_EXPIRE_IN || "1h",
  jwtIssuer: process.env.JWT_ISSUER || "default_issuer",
  jwtAudience: process.env.JWT_AUDIENCE || "default_audience",

  // Email (optional)
  emailHost: process.env.EMAIL_HOST,
  emailPort: process.env.EMAIL_PORT,
  emailUser: process.env.EMAIL_USER,
  emailPassword: process.env.EMAIL_PASSWORD,
  emailFrom: process.env.EMAIL_FROM,

  // Frontend URLs (CORS)
  webAppUrl: process.env.WEBAPP_URL ? process.env.WEBAPP_URL.split(",") : [],

  // Cloudinary
  cloudinary: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  },
};
