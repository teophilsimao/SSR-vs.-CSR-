import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ServerApiVersion } from "mongodb";

// MongoDB collection uri
const uri = process.env.MONGO_URI || 'mongodb+srv://teo:hudcreme@cluster0.zarw2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

// MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// DB and COLLECTION name
const DB_NAME = 'performance_metrics';
const COLLECTION_NAME = 'page_metrics';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Adjust to specific origin in production
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Handle OPTIONS for CORS preflight
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Handle POST to Next.js server
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const data = await request.json();

    // Validate the data
    if (!data || !data.pageURL) {
      return NextResponse.json(
        { error: 'Missing required performance data' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Connect to MongoDB
    await client.connect();

    // Get reference to database and collection
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Add server-side timestamp to data
    const enrichedData = {
      ...data,
      serverTimestamp: new Date(),
    };

    // Insert the data
    const result = await collection.insertOne(enrichedData);

    return NextResponse.json(
      {
        success: true,
        insertedId: result.insertedId,
        message: 'Metrics inserted successfully',
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error saving performance metrics:", error);
    return NextResponse.json(
      { error: 'Failed to save metrics' },
      { status: 500, headers: corsHeaders }
    );
  } finally {
    await client.close();
  }
}