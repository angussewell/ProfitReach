import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkConstraints() {
  try {
    console.log('Checking database constraints and structure...');
    
    // Check all constraints on the Contacts table
    console.log('\n1. Checking all constraints on Contacts table:');
    
    const constraintsResult = await prisma.$queryRaw<Array<{constraint_name: string, constraint_type: string, constraint_definition: string}>>`
      SELECT 
        conname as constraint_name,
        contype as constraint_type,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = (SELECT oid FROM pg_class WHERE relname = 'Contacts')
      ORDER BY conname;
    `;
    
    console.log('Constraints on Contacts table:');
    constraintsResult.forEach(row => {
      console.log(`  - ${row.constraint_name} (${row.constraint_type}): ${row.constraint_definition}`);
    });
    
    // Check all indexes on the Contacts table
    console.log('\n2. Checking all indexes on Contacts table:');
    
    const indexesResult = await prisma.$queryRaw<Array<{indexname: string, indexdef: string}>>`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'Contacts'
      ORDER BY indexname;
    `;
    
    console.log('Indexes on Contacts table:');
    indexesResult.forEach(row => {
      console.log(`  - ${row.indexname}: ${row.indexdef}`);
    });
    
    // Check the table structure
    console.log('\n3. Checking Contacts table structure:');
    
    const columnsResult = await prisma.$queryRaw<Array<{column_name: string, data_type: string, is_nullable: string, column_default: string}>>`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'Contacts'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;
    
    console.log('Contacts table columns:');
    columnsResult.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConstraints();