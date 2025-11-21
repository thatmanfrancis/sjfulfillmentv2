/**
 * API utility functions for making authenticated requests
 */

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: any;
}

/**
 * Make an authenticated API request with proper credentials
 */
export async function fetchWithAuth(url: string, options: FetchOptions = {}): Promise<Response> {
  const { body, headers = {}, ...restOptions } = options;

  const requestOptions: RequestInit = {
    credentials: 'include', // Include cookies for session authentication
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...restOptions,
  };

  // Only stringify body if it exists and isn't already a string/FormData
  if (body !== undefined && body !== null) {
    if (typeof body === 'string' || body instanceof FormData) {
      requestOptions.body = body;
    } else {
      requestOptions.body = JSON.stringify(body);
    }
  }

  const response = await fetch(url, requestOptions);
  
  // If we get a 401, the session is expired or invalid - logout automatically
  if (response.status === 401) {
    console.warn('API request returned 401 - session expired, logging out');
    
    // Clear any existing tokens
    document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    // Redirect to login page
    if (typeof window !== 'undefined' && window.location.pathname !== '/auth/login') {
      window.location.href = '/auth/login';
    }
  }

  return response;
}

/**
 * Make an authenticated GET request
 */
export async function get<T>(url: string): Promise<T> {
  const response = await fetchWithAuth(url, { method: 'GET' });
  
  if (!response.ok) {
    let error: any;
    try {
      error = await response.json();
    } catch {
      error = { error: 'Request failed' };
    }
    
    const errorMessage = error.error || error.message || 'Request failed';
    const customError = new Error(errorMessage);
    // Add status code to error for better handling
    (customError as any).status = response.status;
    throw customError;
  }
  
  return response.json();
}

/**
 * Make an authenticated POST request
 */
export async function post<T>(url: string, data?: any): Promise<T> {
  const response = await fetchWithAuth(url, {
    method: 'POST',
    body: data,
  });
  
  if (!response.ok) {
    let errorMessage = 'Request failed';
    try {
      const errorData = await response.json();
      errorMessage = errorData?.error || errorData?.message || errorMessage;
    } catch (e) {
      // If response isn't JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }
    
    const customError = new Error(errorMessage);
    (customError as any).status = response.status;
    throw customError;
  }
  
  return response.json();
}

/**
 * Make an authenticated PUT request
 */
export async function put<T>(url: string, data?: any): Promise<T> {
  const response = await fetchWithAuth(url, {
    method: 'PUT',
    body: data,
  });
  
  if (!response.ok) {
    let errorMessage = 'Request failed';
    try {
      const errorData = await response.json();
      errorMessage = errorData?.error || errorData?.message || errorMessage;
    } catch (e) {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  
  return response.json();
}

/**
 * Make an authenticated PATCH request
 */
export async function patch<T>(url: string, data?: any): Promise<T> {
  const response = await fetchWithAuth(url, {
    method: 'PATCH',
    body: data,
  });
  
  if (!response.ok) {
    let error: any;
    try {
      error = await response.json();
    } catch {
      error = { error: 'Request failed' };
    }
    
    const errorMessage = error.error || error.message || 'Request failed';
    const customError = new Error(errorMessage);
    (customError as any).status = response.status;
    throw customError;
  }
  
  return response.json();
}

/**
 * Make an authenticated DELETE request
 */
export async function del<T>(url: string): Promise<T> {
  const response = await fetchWithAuth(url, { method: 'DELETE' });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}