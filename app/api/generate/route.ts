import { NextRequest, NextResponse } from 'next/server';
import { getPostgresSchema } from '@/lib/db/postgres';
import { getMysqlSchema } from '@/lib/db/mysql';
import { parseSqlToSchema } from '@/lib/parsers/sql-parser';
import { generateMermaidCode } from '@/lib/generators/mermaid';
import { Schema } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, connectionString, sql } = body;

    let schema: Schema;

    if (type === 'postgres') {
      if (!connectionString) {
        return NextResponse.json({ error: 'Connection string is required for Postgres' }, { status: 400 });
      }
      schema = await getPostgresSchema(connectionString);
    } else if (type === 'mysql' || type === 'mariadb') {
      if (!connectionString) {
        return NextResponse.json({ error: 'Connection string is required for MySQL/MariaDB' }, { status: 400 });
      }
      schema = await getMysqlSchema(connectionString);
    } else if (type === 'sql') {
      if (!sql) {
        return NextResponse.json({ error: 'SQL code is required' }, { status: 400 });
      }
      // Defaulting to postgres dialect for parsing for now, as it's fairly standard
      schema = parseSqlToSchema(sql, 'postgresql');
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const mermaidCode = generateMermaidCode(schema);

    return NextResponse.json({ mermaidCode });
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

