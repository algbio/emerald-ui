/**
 * Counter Service for EMERALD-UI Alignment Counter
 * 
 * This service communicates with the Cloudflare Worker to manage
 * the alignment generation counter.
 */

// Update this URL after deploying your Cloudflare Worker
const COUNTER_API_URL = import.meta.env.VITE_COUNTER_API_URL || 'https://emerald-counter.andrei-preoteasa-ap.workers.dev';

export interface CounterResponse {
  count: number;
  incremented?: boolean;
}

/**
 * Get the current alignment count
 */
export async function getAlignmentCount(): Promise<number> {
  try {
    const response = await fetch(`${COUNTER_API_URL}/count`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch count: ${response.status}`);
    }

    const data: CounterResponse = await response.json();
    return data.count;
  } catch (error) {
    console.error('Error fetching alignment count:', error);
    // Return -1 to indicate an error (component can handle this)
    return -1;
  }
}

/**
 * Increment the alignment counter
 */
export async function incrementAlignmentCount(): Promise<number> {
  try {
    const response = await fetch(`${COUNTER_API_URL}/increment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to increment count: ${response.status}`);
    }

    const data: CounterResponse = await response.json();
    return data.count;
  } catch (error) {
    console.error('Error incrementing alignment count:', error);
    // Return -1 to indicate an error
    return -1;
  }
}
