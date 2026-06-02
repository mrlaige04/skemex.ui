import { InjectionToken, type Provider } from '@angular/core';
import { environment } from '../../environments/environment';

export interface ApiConfig {
  url: string;
}

export const apiConfig = new InjectionToken<ApiConfig>('API_CONFIG');

export const apiConfigProvider: Provider = {
  provide: apiConfig,
  useFactory: (): ApiConfig => environment.api,
};
