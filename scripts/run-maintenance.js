#!/usr/bin/env node

/**
 * Manual maintenance script runner
 * Use this to run database cleanup and schema audit manually
 */

import { cleanupDatabase } from '../server/scripts/database-cleanup.js';
import { auditSchema } from '../server/scripts/schema-audit.js';

const command = process.argv[2];

async function runMaintenance() {
  try {
    switch (command) {
      case 'cleanup':
        console.log('🧹 Running database cleanup...');
        await cleanupDatabase();
        break;
      
      case 'audit':
        console.log('🔍 Running schema audit...');
        await auditSchema();
        break;
      
      case 'all':
        console.log('🔧 Running all maintenance tasks...');
        await cleanupDatabase();
        await auditSchema();
        break;
      
      default:
        console.log('Usage: node scripts/run-maintenance.js [cleanup|audit|all]');
        console.log('');
        console.log('Commands:');
        console.log('  cleanup  - Run database cleanup');
        console.log('  audit    - Run schema audit');
        console.log('  all      - Run both cleanup and audit');
        process.exit(1);
    }
    
    console.log('✅ Maintenance completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Maintenance failed:', error);
    process.exit(1);
  }
}

runMaintenance();