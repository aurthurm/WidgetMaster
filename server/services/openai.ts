import OpenAI from "openai";
import WebSocket from "ws";

// Extended WebSocket interface with additional properties
interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
}

// Configure OpenAI with error handling
let openai: OpenAI | null = null;

try {
  // Initialize the OpenAI client with API key validation
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY is not set. AI features will not be available.");
  } else {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 3, // Retry failed requests up to 3 times
      timeout: 30000, // 30 second timeout for requests
    });
    console.log("OpenAI API client initialized successfully");
  }
} catch (error) {
  console.error("Failed to initialize OpenAI client:", error);
}

// Active WebSocket clients with weak references to allow garbage collection
const activeClients: Set<ExtendedWebSocket> = new Set();

/**
 * Broadcast a message to all connected WebSocket clients with error handling
 */
export function broadcastWebSocketMessage(message: any): void {
  try {
    const messageString = typeof message === 'string' ? message : JSON.stringify(message);
    const deadClients: ExtendedWebSocket[] = [];
    
    // Iterate through all connected clients
    activeClients.forEach(client => {
      try {
        if (client.readyState === WebSocket.OPEN) {
          client.send(messageString);
        } else if (client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING) {
          deadClients.push(client);
        }
      } catch (error) {
        console.error("Error sending message to WebSocket client:", error);
        deadClients.push(client);
      }
    });
    
    // Clean up dead clients
    deadClients.forEach(client => {
      activeClients.delete(client);
    });
  } catch (error) {
    console.error("Error broadcasting WebSocket message:", error);
  }
}

/**
 * Register a WebSocket client with validation
 */
export function registerWebSocketClient(client: ExtendedWebSocket): void {
  if (!client || client.readyState === WebSocket.CLOSED) {
    console.warn("Attempted to register invalid or closed WebSocket client");
    return;
  }
  
  // Initialize client properties
  client.isAlive = true;
  activeClients.add(client);
  
  // Remove client when it disconnects
  client.on('close', () => {
    activeClients.delete(client);
  });
}

/**
 * Unregister a WebSocket client with error handling
 */
export function unregisterWebSocketClient(client: ExtendedWebSocket): void {
  if (!client) {
    console.warn("Attempted to unregister invalid WebSocket client");
    return;
  }
  
  try {
    activeClients.delete(client);
    console.log("WebSocket client unregistered successfully");
    
    // Close the socket if it's not already closed
    if (client.readyState !== WebSocket.CLOSED && client.readyState !== WebSocket.CLOSING) {
      client.close();
    }
  } catch (error) {
    console.error("Error unregistering WebSocket client:", error);
  }
}

interface WidgetContext {
  id: number;
  name: string;
  type: string;
  config: any;
}

/**
 * Generate a response from the AI Copilot
 * @param prompt User's prompt
 * @param context Previous conversation context
 * @param datasetId Optional dataset ID to reference
 * @param chartType Optional chart type
 * @param widgetContext Optional widget context information
 */
export async function generateAIResponse(
  prompt: string,
  context: { role: "user" | "assistant"; content: string }[] = [],
  datasetId?: number,
  chartType?: string,
  widgetContext?: WidgetContext
): Promise<string> {
  try {
    const requestId = Date.now().toString(); // Generate a unique request ID
    
    // Notify clients via WebSocket that request is starting
    broadcastWebSocketMessage({
      type: 'data-update',
      dataset: 'ai-request',
      data: {
        status: 'processing',
        requestId,
        message: 'AI processing started',
        timestamp: new Date().toISOString()
      }
    });
    
    // System message that defines the AI's behavior
    const systemMessage = `You are an AI Copilot for a dashboard creation platform called BeakDash. 
Your role is to help users create, manage, and optimize their data dashboards. 

${datasetId ? `You are currently working with dataset ID: ${datasetId}. The user wants insights about this data.` : ''}
${chartType ? `The user is working with a ${chartType} chart.` : ''}
${widgetContext ? `The user is specifically asking about widget "${widgetContext.name}" (ID: ${widgetContext.id}) which is a ${widgetContext.type} chart.
Configuration details for this widget: ${JSON.stringify(widgetContext.config, null, 2)}` : ''}

Provide concise, helpful responses about:
- Data visualization recommendations
- Chart configuration suggestions
- Dashboard layout optimization
- Data analysis insights

If the user asks about specific data or charts, recommend appropriate visualizations.
If they need help with dashboard features, guide them step by step.`;

    // Format messages in the structure expected by OpenAI
    const messages = [
      { role: "system", content: systemMessage },
      ...context,
      { role: "user", content: prompt },
    ];

    // Notify clients that we're sending the request to OpenAI
    broadcastWebSocketMessage({
      type: 'data-update',
      dataset: 'ai-request',
      data: {
        status: 'sending',
        requestId,
        message: 'Sending request to AI model',
        timestamp: new Date().toISOString()
      }
    });

    // Check if OpenAI client is available
    if (!openai) {
      throw new Error("OpenAI client is not initialized. Please check your API key.");
    }
    
    // Call the OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: messages as any,
      max_tokens: 500,
      temperature: 0.7,
    });

    // Notify clients that we've received a response
    broadcastWebSocketMessage({
      type: 'data-update',
      dataset: 'ai-request',
      data: {
        status: 'completed',
        requestId,
        message: 'AI processing completed',
        timestamp: new Date().toISOString()
      }
    });

    // Return the AI's response
    return completion.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("OpenAI API error:", error);
    
    // Notify clients about the error
    broadcastWebSocketMessage({
      type: 'error',
      message: 'Error processing AI request: ' + (error instanceof Error ? error.message : String(error)),
      timestamp: new Date().toISOString()
    });
    
    // Fallback response in case of an error
    return "I'm sorry, I encountered an error processing your request. Please try again later.";
  }
}

/**
 * Generate chart improvement suggestions based on widget context
 * @param widgetContext Widget context information
 */
export async function generateChartImprovements(widgetContext: WidgetContext): Promise<any> {
  try {
    const requestId = Date.now().toString(); // Generate a unique request ID
    
    // Notify clients via WebSocket that request is starting
    broadcastWebSocketMessage({
      type: 'data-update',
      dataset: 'chart-improvements',
      data: {
        status: 'processing',
        requestId,
        widgetId: widgetContext.id,
        message: `Analyzing chart "${widgetContext.name}" for improvement suggestions`,
        timestamp: new Date().toISOString()
      }
    });
    
    // Import required modules
    const { storage } = await import("../storage");
    
    // System message that defines what we want from the AI
    const systemMessage = `You are an AI data visualization expert. 
    Analyze the following chart configuration and provide suggestions for improvements.
    
    Widget name: ${widgetContext.name}
    Widget type: ${widgetContext.type}
    Widget configuration: ${JSON.stringify(widgetContext.config, null, 2)}
    
    Provide your response in JSON format with these properties:
    - suggestions: an array of 3-5 specific, actionable improvement suggestions
    - explanation: a brief explanation of why these improvements would enhance the visualization (2-3 sentences)`;

    // Notify clients that we're sending the request to OpenAI
    broadcastWebSocketMessage({
      type: 'data-update',
      dataset: 'chart-improvements',
      data: {
        status: 'sending',
        requestId,
        widgetId: widgetContext.id,
        message: 'Sending request to AI model',
        timestamp: new Date().toISOString()
      }
    });

    // Check if OpenAI client is available
    if (!openai) {
      throw new Error("OpenAI client is not initialized. Please check your API key.");
    }
    
    // Call the OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemMessage },
      ],
      max_tokens: 800,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    // Parse the JSON response
    const responseContent = completion.choices[0].message.content || "{}";
    const improvements = JSON.parse(responseContent);

    // Add the widget ID to the recommendation
    improvements.widgetId = widgetContext.id;

    // Notify clients that we've received a response
    broadcastWebSocketMessage({
      type: 'data-update',
      dataset: 'chart-improvements',
      data: {
        status: 'completed',
        requestId,
        widgetId: widgetContext.id,
        message: 'Chart improvement suggestions generated successfully',
        timestamp: new Date().toISOString()
      }
    });

    return improvements;
  } catch (error) {
    console.error("Chart improvements error:", error);
    
    // Notify clients about the error
    broadcastWebSocketMessage({
      type: 'error',
      message: 'Error generating chart improvements: ' + (error instanceof Error ? error.message : String(error)),
      timestamp: new Date().toISOString()
    });
    
    // Return a fallback response if there's an error
    return {
      suggestions: [
        "Consider adding a clear title to describe what the chart represents",
        "Try using contrasting colors to improve readability",
        "Consider adding data labels to make values more explicit"
      ],
      explanation: "These are general best practices for data visualization that often improve chart clarity and usability.",
      widgetId: widgetContext.id
    };
  }
}

/**
 * Generate new KPI chart suggestions based on dataset
 * @param datasetId Dataset ID to analyze
 */
export async function generateKPISuggestions(datasetId: number): Promise<any> {
  try {
    // Import required modules
    const { storage } = await import("../storage");
    
    // Fetch the dataset
    const dataset = await storage.getDataset(datasetId);
    if (!dataset) {
      throw new Error("Dataset not found");
    }

    // System message that defines what we want from the AI
    const systemMessage = `You are an AI data visualization expert. 
    Analyze the following dataset and suggest 3-5 meaningful KPI (Key Performance Indicator) widgets that could be created from this data.
    
    Dataset name: ${dataset.name}
    Dataset description: ${dataset.query || "No description provided"}
    
    Provide your response in JSON format with this structure:
    {
      "kpiSuggestions": [
        {
          "title": "Name of the KPI",
          "description": "Brief description of what this KPI measures and why it's valuable",
          "widgetType": "counter or stat-card",
          "config": {
            "valueField": "suggested field from dataset",
            "format": "number, currency, or percentage",
            "colorCode": true/false
          }
        },
        // More suggestions...
      ],
      "explanation": "A brief explanation of how these KPIs together provide a comprehensive view of the data"
    }`;

    // Check if OpenAI client is available
    if (!openai) {
      throw new Error("OpenAI client is not initialized. Please check your API key.");
    }
    
    // Call the OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemMessage },
      ],
      max_tokens: 1000,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    // Parse the JSON response
    const responseContent = completion.choices[0].message.content || "{}";
    const suggestions = JSON.parse(responseContent);

    // Add the dataset ID to the suggestions
    suggestions.datasetId = datasetId;

    return suggestions;
  } catch (error) {
    console.error("KPI suggestions error:", error);
    
    // Return a fallback suggestion if there's an error
    return {
      kpiSuggestions: [
        {
          title: "Total Count",
          description: "Counts the total number of records in your dataset",
          widgetType: "counter",
          config: {
            format: "number"
          }
        },
        {
          title: "Average Value",
          description: "Shows the average of a numeric field in your dataset",
          widgetType: "stat-card",
          config: {
            format: "number",
            colorCode: true
          }
        }
      ],
      explanation: "These are basic KPIs that can be applied to most datasets to get started with monitoring key metrics.",
      datasetId: datasetId
    };
  }
}

/**
 * Generate chart recommendations based on dataset
 * @param datasetId Dataset ID to analyze
 */
export async function generateChartRecommendation(datasetId: number): Promise<any> {
  try {
    // Import required modules
    const { storage } = await import("../storage");
    
    // Fetch the dataset
    const dataset = await storage.getDataset(datasetId);
    if (!dataset) {
      throw new Error("Dataset not found");
    }

    // System message that defines what we want from the AI
    const systemMessage = `You are an AI data visualization expert. 
    Analyze the following dataset and recommend the most appropriate chart type for visualization.
    
    Dataset name: ${dataset.name}
    Dataset description: ${dataset.query || "No description provided"}
    
    Based on the dataset information, recommend a chart type from this list: 
    bar, column, line, pie, scatter, dual-axes
    
    Provide your response in JSON format with these properties:
    - chartType: the recommended chart type (from the list above)
    - explanation: a brief explanation of why this chart type is recommended (2-3 sentences)
    - suggestedConfig: a brief suggestion for chart configuration (what columns to use for axes, etc.)`;

    // Check if OpenAI client is available
    if (!openai) {
      throw new Error("OpenAI client is not initialized. Please check your API key.");
    }
    
    // Call the OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemMessage },
      ],
      max_tokens: 500,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    // Parse the JSON response
    const responseContent = completion.choices[0].message.content || "{}";
    const recommendation = JSON.parse(responseContent);

    // Add the dataset ID to the recommendation
    recommendation.datasetId = datasetId;

    return recommendation;
  } catch (error) {
    console.error("Chart recommendation error:", error);
    
    // Return a fallback recommendation if there's an error
    return {
      chartType: "bar",
      explanation: "I apologize, but I encountered an error while analyzing your dataset. Based on general best practices, a bar chart is often versatile for many data types.",
      suggestedConfig: "Consider using categorical data for X-axis and numerical data for Y-axis.",
      datasetId: datasetId,
    };
  }
}