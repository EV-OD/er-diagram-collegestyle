import { Schema, Table, Column } from "../types";

export function generateMermaidCode(schema: Schema): string {
  let mermaidCode = "erDiagram\n";

  // Generate Entities
  schema.tables.forEach((table) => {
    mermaidCode += `    ${sanitizeName(table.name)} {\n`;
    table.columns.forEach((col) => {
      const keys = [];
      if (col.isPrimaryKey) keys.push("PK");
      if (col.isForeignKey) keys.push("FK");
      
      const keyString = keys.length > 0 ? ` ${keys.join(",")}` : "";
      mermaidCode += `        ${sanitizeType(col.type)} ${sanitizeName(col.name)}${keyString}\n`;
    });
    mermaidCode += `    }\n`;
  });

  // Generate Relationships
  schema.tables.forEach((table) => {
    table.columns.forEach((col) => {
      if (col.isForeignKey && col.foreignKeyTargetTable) {
        // Default to 0..N relationship for simplicity if cardinality isn't known
        // In a real introspection we might know more, but for now:
        // Table (FK) }o--|| TargetTable (PK)
        // The table WITH the foreign key is the "many" side (usually)
        
        const source = sanitizeName(table.name);
        const target = sanitizeName(col.foreignKeyTargetTable);
        
        // Avoid self-referencing loops if not handled carefully, but Mermaid handles them.
        // We use }o--|| as a safe default: Many (Source) to One (Target)
        mermaidCode += `    ${source} }o--|| ${target} : "${col.name}"\n`;
      }
    });
  });

  return mermaidCode;
}

function sanitizeName(name: string): string {
  // Mermaid entities can't have spaces or special chars easily without quotes
  // But for simplicity, let's replace spaces with underscores or quote if needed.
  // If it contains spaces, wrap in quotes.
  if (name.match(/[^a-zA-Z0-9_]/)) {
    return `"${name}"`;
  }
  return name;
}

function sanitizeType(type: string): string {
    // Mermaid types should be simple. 
    // If type contains spaces (like "character varying"), we might want to simplify or quote.
    // Let's replace spaces with underscores for display safety
    return type.replace(/\s+/g, '_');
}
