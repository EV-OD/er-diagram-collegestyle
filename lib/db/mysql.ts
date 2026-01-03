import mysql from 'mysql2/promise';
import { Schema, Table, Column } from '../types';

export async function getMysqlSchema(connectionString: string): Promise<Schema> {
  // Parse the connection string to get the database name, as we need it for information_schema queries
  // mysql2 connection string format: mysql://user:password@host:port/database
  let databaseName = '';
  try {
    const url = new URL(connectionString);
    databaseName = url.pathname.replace('/', '');
  } catch (e) {
    // If URL parsing fails, we might rely on the connection to tell us, or just fail.
    // But for information_schema queries, we really need the schema name.
    console.error("Invalid connection string format", e);
    throw new Error("Invalid connection string. Ensure it is in the format mysql://user:pass@host:port/database");
  }

  const connection = await mysql.createConnection(connectionString);

  try {
    // 1. Get Tables and Columns
    const [columnsRows] = await connection.execute<any[]>(`
      SELECT 
        TABLE_NAME, 
        COLUMN_NAME, 
        DATA_TYPE 
      FROM 
        INFORMATION_SCHEMA.COLUMNS 
      WHERE 
        TABLE_SCHEMA = ? 
      ORDER BY 
        TABLE_NAME, ORDINAL_POSITION;
    `, [databaseName]);

    // 2. Get Constraints (PK, FK)
    // We need to join TABLE_CONSTRAINTS to know if it's PK or FK, because KEY_COLUMN_USAGE includes unique keys too.
    const [constraintsRows] = await connection.execute<any[]>(`
      SELECT 
        kcu.TABLE_NAME,
        kcu.COLUMN_NAME,
        tc.CONSTRAINT_TYPE,
        kcu.REFERENCED_TABLE_NAME,
        kcu.REFERENCED_COLUMN_NAME
      FROM 
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
      JOIN 
        INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc 
        ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME 
        AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
      WHERE 
        kcu.TABLE_SCHEMA = ? 
        AND tc.CONSTRAINT_TYPE IN ('PRIMARY KEY', 'FOREIGN KEY');
    `, [databaseName]);

    const tablesMap = new Map<string, Table>();

    // Initialize tables and columns
    columnsRows.forEach((row: any) => {
      if (!tablesMap.has(row.TABLE_NAME)) {
        tablesMap.set(row.TABLE_NAME, { name: row.TABLE_NAME, columns: [] });
      }
      const table = tablesMap.get(row.TABLE_NAME)!;
      table.columns.push({
        name: row.COLUMN_NAME,
        type: row.DATA_TYPE,
        isPrimaryKey: false,
        isForeignKey: false
      });
    });

    // Apply constraints
    constraintsRows.forEach((row: any) => {
      const table = tablesMap.get(row.TABLE_NAME);
      if (table) {
        const col = table.columns.find(c => c.name === row.COLUMN_NAME);
        if (col) {
          if (row.CONSTRAINT_TYPE === 'PRIMARY KEY') {
            col.isPrimaryKey = true;
          } else if (row.CONSTRAINT_TYPE === 'FOREIGN KEY') {
            col.isForeignKey = true;
            col.foreignKeyTargetTable = row.REFERENCED_TABLE_NAME;
            col.foreignKeyTargetColumn = row.REFERENCED_COLUMN_NAME;
          }
        }
      }
    });

    return { tables: Array.from(tablesMap.values()) };

  } catch (error) {
    console.error("Error fetching MySQL/MariaDB schema:", error);
    throw error;
  } finally {
    await connection.end();
  }
}
