import { Schema, Table, Column } from "../types";

export type DiagramStyle = "crows_foot" | "chen";

export interface MermaidConfig {
  theme?: string;
  curve?: string;
}

export function generateMermaidCode(schema: Schema, style: DiagramStyle = "chen", config: MermaidConfig = {}): string {
  const { theme = 'default', curve = 'basis' } = config;
  
  let initDirective = `%%{init: {'theme': '${theme}'}}%%\n`;
  if (style === 'chen') {
     initDirective = `%%{init: {'theme': '${theme}', 'flowchart': {'curve': '${curve}'}}}%%\n`;
  }

  if (style === "chen") {
    return initDirective + generateMermaidChenCode(schema, theme);
  }
  return initDirective + generateMermaidCrowsFootCode(schema);
}

function generateMermaidCrowsFootCode(schema: Schema): string {
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

function generateMermaidChenCode(schema: Schema, theme: string): string {
  let code = "flowchart TD\n";
  
  const colors = getThemeColors(theme);

  code += `    classDef entity ${colors.entity};\n`;
  code += `    classDef attribute ${colors.attribute};\n`;
  code += `    classDef relationship ${colors.relationship};\n`;
  
  // Helper to get safe IDs
  const getEntityId = (name: string) => `E_${sanitizeId(name)}`;
  const getAttrId = (tableName: string, colName: string) => `A_${sanitizeId(tableName)}_${sanitizeId(colName)}`;
  
  schema.tables.forEach(table => {
      const entityId = getEntityId(table.name);
      // Entity: Rectangle
      code += `    ${entityId}["${table.name}"]:::entity\n`;
      
      table.columns.forEach(col => {
          const attrId = getAttrId(table.name, col.name);
          let label = col.name;
          // Mermaid HTML labels support basic formatting
          if (col.isPrimaryKey) {
              label = `<u>${col.name}</u>`;
          }
          
          // Attribute: Oval (Stadium shape in Mermaid flowchart is ([ ]))
          code += `    ${attrId}(["${label}"]):::attribute\n`;
          code += `    ${entityId} --- ${attrId}\n`;
      });
  });

  // Relationships
  let relCounter = 0;
  schema.tables.forEach(table => {
      table.columns.forEach(col => {
          if (col.isForeignKey && col.foreignKeyTargetTable) {
              const sourceId = getEntityId(table.name);
              const targetId = getEntityId(col.foreignKeyTargetTable);
              const relId = `R_${relCounter++}`;
              
              // Relationship: Diamond
              code += `    ${relId}{"${col.name}"}:::relationship\n`;
              
              // Connect: Source (Many) - Relationship - Target (One)
              // The table holding the FK is the "Many" side (N)
              // The target table is the "One" side (1)
              
              code += `    ${sourceId} ---|N| ${relId}\n`;
              code += `    ${relId} ---|1| ${targetId}\n`;
          }
      });
  });

  return code;
}

function sanitizeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "");
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

function getThemeColors(theme: string) {
  switch (theme) {
    case 'dark':
      return {
        entity: 'fill:#1f2937,stroke:#60a5fa,stroke-width:2px,color:#fff',
        attribute: 'fill:#374151,stroke:#fb923c,stroke-width:1px,color:#fff',
        relationship: 'fill:#374151,stroke:#c084fc,stroke-width:2px,color:#fff'
      };
    case 'forest':
      return {
        entity: 'fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px',
        attribute: 'fill:#fff3e0,stroke:#ef6c00,stroke-width:1px',
        relationship: 'fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px'
      };
    case 'neutral':
      return {
        entity: 'fill:#f3f4f6,stroke:#4b5563,stroke-width:2px',
        attribute: 'fill:#ffffff,stroke:#9ca3af,stroke-width:1px',
        relationship: 'fill:#f9fafb,stroke:#6b7280,stroke-width:2px'
      };
    default: // default, base
      return {
        entity: 'fill:#e3f2fd,stroke:#1565c0,stroke-width:2px',
        attribute: 'fill:#fff3e0,stroke:#ef6c00,stroke-width:1px',
        relationship: 'fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px'
      };
  }
}
