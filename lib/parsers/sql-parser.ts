import { Parser } from 'node-sql-parser';
import { Schema, Table, Column } from '../types';

export function parseSqlToSchema(sql: string, dialect: 'mysql' | 'postgresql' = 'postgresql'): Schema {
  const parser = new Parser();
  let ast;
  
  try {
    ast = parser.astify(sql, { database: dialect });
  } catch (e) {
    console.error("SQL Parse Error", e);
    throw new Error("Failed to parse SQL. Please ensure it is valid CREATE TABLE statements.");
  }

  if (!Array.isArray(ast)) {
    ast = [ast];
  }

  const tables: Table[] = [];

  ast.forEach((statement: any) => {
    if (statement.type === 'create' && statement.keyword === 'table') {
      const tableName = statement.table[0].table;
      const columns: Column[] = [];

      statement.create_definitions?.forEach((def: any) => {
        if (def.resource === 'column') {
          const colName = def.column.column;
          const colType = def.definition.dataType;
          
          let isPrimaryKey = false;
          let isForeignKey = false; // node-sql-parser often puts constraints in a separate definition, but sometimes inline.

          // Check inline constraints (not always fully parsed by node-sql-parser depending on version/dialect)
          // We might need to look at 'constraint' definitions separately.
          
          columns.push({
            name: colName,
            type: colType,
            isPrimaryKey,
            isForeignKey
          });
        } else if (def.resource === 'constraint') {
            // Handle PK/FK constraints defined separately
            if (def.constraint_type === 'primary key') {
                def.definition.forEach((col: string) => {
                    const c = columns.find(c => c.name === col);
                    if (c) c.isPrimaryKey = true;
                });
            }
            if (def.constraint_type === 'foreign key') {
                 // def.definition is the column(s) in this table
                 // def.reference_definition is the target table/column
                 const targetTable = def.reference_definition.table[0].table;
                 const targetCol = def.reference_definition.definition[0].column; // Assuming single col FK for now
                 
                 def.definition.forEach((col: string) => {
                    const c = columns.find(c => c.name === col);
                    if (c) {
                        c.isForeignKey = true;
                        c.foreignKeyTargetTable = targetTable;
                        c.foreignKeyTargetColumn = targetCol;
                    }
                 });
            }
        }
      });
      
      tables.push({ name: tableName, columns });
    }
  });

  return { tables };
}
