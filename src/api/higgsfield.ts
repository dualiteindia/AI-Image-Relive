import axios from 'axios';

const API_URL = 'https://platform.higgsfield.ai/higgsfield-ai/dop/lite';

interface GenerateVideoParams {
  imageUrl: string;
  apiKey: string;
  apiSecret: string;
  onStatusUpdate?: (status: string) => void;
}

export const generateMemoryVideo = async ({ imageUrl, apiKey, apiSecret, onStatusUpdate }: GenerateVideoParams) => {
  // Payload construction
  const payload = {
    prompt: "recreate the uploaded image into a real-life motion like video",
    image2video_model: "dop-lite",
    seed: 36644,
    motions: [
      {
        "id": "31177282-bde3-4870-b283-1135ca0a201a",
        "strength": 1
      }
    ],
    // API requires image_url at root
    image_url: imageUrl,
    input_images: [
      {
        type: "image_url",
        image_url: imageUrl 
      }
    ],
    enhance_prompt: true,
    check_nsfw: true
  };

  const headers = {
    'Content-Type': 'application/json',
    'hf-api-key': apiKey,
    'hf-secret': apiSecret
  };

  try {
    // 1. Start the generation job
    console.log("Starting video generation job...");
    if (onStatusUpdate) onStatusUpdate("Initializing...");
    
    const initialResponse = await axios.post(API_URL, payload, {
      headers,
      timeout: 30000 // Short timeout for the initial handshake
    });

    let data = initialResponse.data;
    console.log("Initial API Response:", data);

    // Helper to check if video is ready
    const isVideoReady = (response: any) => {
      return response.video?.url || response.output || response.url || (Array.isArray(response.output) && response.output.length > 0);
    };

    // 2. Logic: If video is NOT ready, we MUST poll.
    if (!isVideoReady(data)) {
      // Determine the correct status URL and ID based on docs
      const requestId = data.request_id || data.id;
      let statusUrl = data.status_url;

      if (!statusUrl && requestId) {
        // Fallback to documented pattern if status_url is missing
        statusUrl = `https://platform.higgsfield.ai/requests/${requestId}/status`;
      } else if (!statusUrl && !requestId) {
         console.warn("No request_id and no status_url found. Returning data as is.", data);
         return data;
      }

      console.log(`Job started (ID: ${requestId}). Polling URL: ${statusUrl}`);
      if (onStatusUpdate) onStatusUpdate(data.status || "Queued");

      const startTime = Date.now();
      const TIMEOUT_MS = 2000000; // 2000 seconds (~33 mins)
      const POLLING_INTERVAL = 5000; // 5 seconds

      // 3. Polling Loop
      while (Date.now() - startTime < TIMEOUT_MS) {
        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));

        try {
          const statusResponse = await axios.get(statusUrl, { headers });
          data = statusResponse.data;
          
          const currentStatus = data.status || "in_progress";
          console.log(`Polling status for ${requestId}:`, currentStatus);
          
          if (onStatusUpdate) onStatusUpdate(currentStatus);

          if (currentStatus === 'completed' || currentStatus === 'success' || isVideoReady(data)) {
            // Success! 
            return data;
          }

          if (currentStatus === 'failed' || currentStatus === 'nsfw') {
            throw new Error(`Video generation failed: ${data.error || currentStatus}`);
          }

          // Continue polling...

        } catch (pollError: any) {
          console.warn("Error while polling status:", pollError.message);
          // Stop polling only if it's a client error (4xx) excluding 429 (rate limit)
          if (pollError.response && pollError.response.status >= 400 && pollError.response.status < 500 && pollError.response.status !== 429) {
             throw pollError;
          }
          // Otherwise (network error, 5xx, or 429), keep trying
        }
      }

      throw new Error("Timed out waiting for video generation (2000s limit reached).");
    }

    // If it wasn't queued (immediate response), return data
    return data;

  } catch (error) {
    console.error("Error in generateMemoryVideo:", error);
    throw error;
  }
};
