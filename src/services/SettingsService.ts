import { SettingsRepository } from '../repositories/SettingsRepository';
import type { AppSettings } from '../models/AppSetting';

export class SettingsService {
  constructor(private readonly repo: SettingsRepository = new SettingsRepository()) {}

  getAll(): AppSettings {
    return this.repo.getAll();
  }

  save(settings: Partial<AppSettings>): void {
    const trimmed: Partial<AppSettings> = {};
    for (const [key, value] of Object.entries(settings)) {
      trimmed[key as keyof AppSettings] = value.trim();
    }
    this.repo.setMany(trimmed);
  }
}
