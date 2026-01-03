import { Client } from 'pg';
import { Schema, Table, Column } from '../types';

export async function getPostgresSchema(connectionString: string): Promise<Schema> {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();

    // 1. Get Tables and Columns
    const columnsRes = await client.query(`
      SELECT 
        table_name, 
        column_name, 
        data_type 
      FROM 
        information_schema.columns 
      WHERE 
        table_schema = 'public' 
      ORDER BY 
        table_name, ordinal_position;
    `);

    // 2. Get Constraints (PK, FK)
    const constraintsRes = await client.query(`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        tc.constraint_type,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY')
        AND tc.table_schema = 'public';
    `);

    const tablesMap = new Map<string, Table>();

    // Initialize tables and columns
    columnsRes.rows.forEach((row) => {
      if (!tablesMap.has(row.table_name)) {
        tablesMap.set(row.table_name, { name: row.table_name, columns: [] });
      }
      const table = tablesMap.get(row.table_name)!;
      table.columns.push({
        name: row.column_name,
        type: row.data_type,
        isPrimaryKey: false,
        isForeignKey: false
      });
    });

    // Apply constraints
    constraintsRes.rows.forEach((row) => {
      const table = tablesMap.get(row.table_name);
      if (table) {
        const col = table.columns.find(c => c.name === row.column_name);
        if (col) {
          if (row.constraint_type === 'PRIMARY KEY') {
            col.isPrimaryKey = true;
          } else if (row.constraint_type === 'FOREIGN KEY') {
            col.isForeignKey = true;
            col.foreignKeyTargetTable = row.foreign_table_name;
            col.foreignKeyTargetColumn = row.foreign_column_name;
          }
        }
      }
    });

    return { tables: Array.from(tablesMap.values()) };

  } catch (error) {
    console.error("Error fetching Postgres schema:", error);
    throw error;
  } finally {
    await client.end();
  }
}
