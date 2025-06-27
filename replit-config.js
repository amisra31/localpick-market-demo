// Dynamic Replit configuration for allowed hosts
const REPLIT_DEV_DOMAIN = process.env.REPLIT_DEV_DOMAIN || 'localhost';

module.exports = {
  allowedHosts: [REPLIT_DEV_DOMAIN],
  replitDomain: REPLIT_DEV_DOMAIN
};