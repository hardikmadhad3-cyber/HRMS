/**
 * Centralized HRMS API Client
 * Manages JWT Bearer authorization, multi-company context header (X-Company-Id),
 * strict Content-Type response inspection, and robust non-JSON fallback protection.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  statusCode?: number;
  message?: string;
}

class ApiClient {
  private getHeaders(activeCompanyId?: string | null): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('hrms_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const companyId = activeCompanyId || localStorage.getItem('hrms_active_company') || 'comp-101';
    headers['X-Company-Id'] = companyId;

    return headers;
  }

  private async handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
    const contentType = res.headers.get('content-type') || '';

    // Guard against non-JSON content (e.g. Vite SPA HTML fallback or web server HTML error pages)
    if (!contentType.includes('application/json')) {
      const rawText = await res.text().catch(() => '');
      const isHtml = contentType.includes('text/html') || rawText.trim().startsWith('<');

      return {
        success: false,
        error: isHtml
          ? `API returned HTML instead of JSON (${res.status} ${res.statusText}). Check API route configuration.`
          : `API returned unexpected content type [${contentType || 'none'}] (${res.status} ${res.statusText}).`,
        code: 'INVALID_API_RESPONSE',
        statusCode: res.status,
      };
    }

    try {
      const json = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: json.error || `HTTP ${res.status} ${res.statusText}`,
          code: json.code || 'API_ERROR',
          statusCode: res.status,
        };
      }
      return {
        success: true,
        data: json.data !== undefined ? json.data : json,
        message: json.message,
        statusCode: res.status,
      };
    } catch {
      return {
        success: false,
        error: 'Failed to parse JSON response from server.',
        code: 'JSON_PARSE_ERROR',
        statusCode: res.status,
      };
    }
  }

  public async get<T>(
    url: string,
    paramsOrCompanyId?: Record<string, any> | string | null,
    maybeCompanyId?: string | null
  ): Promise<ApiResponse<T>> {
    try {
      let finalUrl = url;
      let effectiveCompanyId: string | null | undefined = undefined;

      if (paramsOrCompanyId && typeof paramsOrCompanyId === 'object') {
        const searchParams = new URLSearchParams();
        for (const [k, v] of Object.entries(paramsOrCompanyId)) {
          if (v !== undefined && v !== null && v !== '') {
            searchParams.append(k, String(v));
          }
        }
        const qs = searchParams.toString();
        if (qs) {
          finalUrl = `${url}${url.includes('?') ? '&' : '?'}${qs}`;
        }
        effectiveCompanyId = maybeCompanyId;
      } else if (typeof paramsOrCompanyId === 'string') {
        effectiveCompanyId = paramsOrCompanyId;
      } else {
        effectiveCompanyId = maybeCompanyId;
      }

      const res = await fetch(finalUrl, {
        method: 'GET',
        headers: this.getHeaders(effectiveCompanyId),
      });
      return await this.handleResponse<T>(res);
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network communication error.',
        code: 'NETWORK_ERROR',
      };
    }
  }

  public async post<T>(url: string, body: any, companyId?: string | null): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(companyId),
        body: JSON.stringify(body),
      });
      return await this.handleResponse<T>(res);
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network communication error.',
        code: 'NETWORK_ERROR',
      };
    }
  }

  public async put<T>(url: string, body: any, companyId?: string | null): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(companyId),
        body: JSON.stringify(body),
      });
      return await this.handleResponse<T>(res);
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network communication error.',
        code: 'NETWORK_ERROR',
      };
    }
  }

  public async patch<T>(url: string, body: any, companyId?: string | null): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: this.getHeaders(companyId),
        body: JSON.stringify(body),
      });
      return await this.handleResponse<T>(res);
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network communication error.',
        code: 'NETWORK_ERROR',
      };
    }
  }

  public async delete<T = any>(url: string, companyId?: string | null): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(companyId),
      });
      return await this.handleResponse<T>(res);
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network communication error.',
        code: 'NETWORK_ERROR',
      };
    }
  }
}

export const apiClient = new ApiClient();
