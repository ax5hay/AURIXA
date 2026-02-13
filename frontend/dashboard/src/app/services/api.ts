// A simple client for calling the AURIXA API gateway.

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || "http://localhost:3000";

export interface PipelineResponse {
  session_id: string;
  final_response: string;
  // Add other fields from the ConversationState as needed
}

export async function runPipeline(prompt: string): Promise<PipelineResponse> {
  const url = `${API_GATEWAY_URL}/api/v1/orchestration/pipelines`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
  }

  return response.json();
}

export interface ServiceHealth {
  [key: string]: {
    status: string;
    latencyMs?: number;
  };
}

export async function getServiceHealth(): Promise<ServiceHealth> {
  const url = `${API_GATEWAY_URL}/health/services`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch service health.");
  }
  const data = await response.json();
  return data.services;
}
