import 'dotenv/config';

export const env = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clinics-saas',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  imgbbApiKey: process.env.IMGBB_API_KEY || '',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:4200',
  pricePerMonth: Number(process.env.PRICE_PER_MONTH || 200),
  trialDays: Number(process.env.TRIAL_DAYS || 30),
  graceDays: Number(process.env.GRACE_DAYS || 5),
  currency: process.env.CURRENCY || 'EGP',
  paymentInstructions:
    process.env.PAYMENT_INSTRUCTIONS ||
    'Nubank transfer: 01000000000 (Ahmed). Send proof via WhatsApp after transferring.',
  whatsappNumber: process.env.WHATSAPP_NUMBER || '201000000000',
};