import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { generateInsight } from '@/lib/insights';

const SCHEMA = `
TABLE pipeline_runs (
  id INTEGER PRIMARY KEY,
  run_date TEXT,
  total_brands INTEGER,
  average_score REAL
)
TABLE industry_results (
  id INTEGER PRIMARY KEY,
  run_id INTEGER, -- FK to pipeline_runs
  industry_id TEXT,
  industry_name TEXT,
  avg_score REAL
)
TABLE brand_results (
  id INTEGER PRIMARY KEY,
  run_id INTEGER, -- FK to pipeline_runs
  industry_id TEXT,
  brand TEXT,
  score REAL,
  recommendation REAL,
  sentiment REAL,
  model TEXT -- NULL means aggregated across all models
)
TABLE reports (
  slug TEXT,
  title TEXT,
  published_at TEXT
)
`;

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Step 1: Text-to-SQL
    const sqlPrompt = `You are a Text-to-SQL agent for a SQLite database measuring AI brand visibility in India.
Schema:
${SCHEMA}

Translate the following user question into a valid SQLite query.
Only return the raw SQL code, nothing else. No markdown formatting, no explanation. Just the SELECT statement.
Important: Always filter brand_results where model IS NULL and score > 0 unless specifically asked for a specific model.

User Question: "${message}"`;

    const { text: sqlRaw } = await generateInsight(sqlPrompt);
    // Clean up in case the LLM returned markdown blocks
    const sqlQuery = sqlRaw.replace(/\`\`\`sql/gi, '').replace(/\`\`\`/g, '').trim();

    // Step 2: Execute SQL securely against read-only memory DB
    const db = await getDb();
    let queryResult = '';
    
    try {
      // Disallow dangerous keywords just to be safe, though sql.js is in-memory
      if (sqlQuery.toUpperCase().match(/\b(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE)\b/)) {
        throw new Error('Only SELECT queries are allowed.');
      }
      
      const res = db.exec(sqlQuery);
      if (res.length > 0) {
        // Convert to array of objects
        const cols = res[0].columns;
        const rows = res[0].values.map(row => {
          const obj: any = {};
          cols.forEach((c, i) => obj[c] = row[i]);
          return obj;
        });
        queryResult = JSON.stringify(rows.slice(0, 50)); // Limit to 50 rows to avoid blowing up context
      } else {
        queryResult = '[]';
      }
    } catch (dbError) {
      console.error('SQL Execution Error:', dbError, 'Query:', sqlQuery);
      queryResult = `Error executing query: ${(dbError as Error).message}`;
    }

    // Step 3: Natural Language Response
    const answerPrompt = `You are an AI Data Analyst assistant for "rAsh Score".
The user asked a question. You translated it to SQL, executed it, and got the following JSON result from the database.

User Question: "${message}"
Generated SQL: ${sqlQuery}
SQL Result: ${queryResult}

Write a helpful, conversational, and direct answer to the user's question based on the SQL result. 
Do not talk about SQL, databases, or schemas to the user. Just provide the insight they asked for. Use markdown for formatting.`;

    const { text: finalAnswer, generatedBy } = await generateInsight(answerPrompt);

    return NextResponse.json({
      answer: finalAnswer,
      sql: sqlQuery,
      data: queryResult,
      generatedBy,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
