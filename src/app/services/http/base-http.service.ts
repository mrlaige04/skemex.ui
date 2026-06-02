import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { apiConfig, type ApiConfig } from '../../config/api.config';

@Injectable({ providedIn: 'root' })
export class BaseHttp {
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpClient,
    @Inject(apiConfig) apiConfigValue: ApiConfig,
  ) {
    this.baseUrl = apiConfigValue.url.replace(/\/$/, '');
  }

  public post<Req, Res>(
    url: string,
    data: Req,
    params: Record<string, string | number | boolean | readonly string[]> = {},
    headers: Record<string, string | string[]> = {},
  ): Observable<Res> {
    const fullUrl = `${this.baseUrl}/${url}`;
    return this.http.post<Res>(fullUrl, data, { params, headers });
  }

  public get<Res>(
    url: string,
    params: Record<string, string | number | boolean | readonly string[]> = {},
    headers: Record<string, string | string[]> = {},
  ): Observable<Res> {
    const fullUrl = `${this.baseUrl}/${url}`;
    return this.http.get<Res>(fullUrl, { params, headers });
  }

  public put<Req, Res>(
    url: string,
    data: Req,
    params: Record<string, string | number | boolean | readonly string[]> = {},
    headers: Record<string, string | string[]> = {},
  ): Observable<Res> {
    const fullUrl = `${this.baseUrl}/${url}`;
    return this.http.put<Res>(fullUrl, data, { params, headers });
  }

  public patch<Req, Res>(
    url: string,
    data: Req,
    params: Record<string, string | number | boolean | readonly string[]> = {},
    headers: Record<string, string | string[]> = {},
  ): Observable<Res> {
    const fullUrl = `${this.baseUrl}/${url}`;
    return this.http.patch<Res>(fullUrl, data, { params, headers });
  }

  /** PATCH with <code>multipart/form-data</code> (e.g. profile image + fields). */
  public patchFormData<Res>(url: string, data: FormData): Observable<Res> {
    const fullUrl = `${this.baseUrl}/${url}`;
    return this.http.patch<Res>(fullUrl, data);
  }

  public delete<Res>(
    url: string,
    params: Record<string, string | number | boolean | readonly string[]> = {},
    headers: Record<string, string | string[]> = {},
  ): Observable<Res> {
    const fullUrl = `${this.baseUrl}/${url}`;
    return this.http.delete<Res>(fullUrl, { params, headers });
  }
}
