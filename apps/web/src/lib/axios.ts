import axios from 'axios';
import axiosRetry from 'axios-retry';

export const apiClient = axios.create({
  // Base configuration if needed (like baseURL, headers, etc)
});

// Configure retry policy: 3 retries, exponential backoff (1s, 2s, 4s)
axiosRetry(apiClient, { 
  retries: 3, 
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry on network errors or 5xx server errors
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status! >= 500;
  }
});

export default apiClient;
