export interface Column {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyTargetTable?: string;
  foreignKeyTargetColumn?: string;
}

export interface Table {
  name: string;
  columns: Column[];
}

export interface Schema {
  tables: Table[];
}
