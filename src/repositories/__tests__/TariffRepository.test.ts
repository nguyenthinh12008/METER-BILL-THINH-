import { createMigratedTestDb } from '../../test-utils/sqliteTestDb';
import { TariffRepository } from '../TariffRepository';

describe('TariffRepository', () => {
  it('listByServiceType() trả về đúng thứ tự tăng dần theo fromValue', () => {
    const repo = new TariffRepository(createMigratedTestDb());
    repo.create({ serviceType: 'ELECTRIC', fromValue: 100, toValue: 200, price: 2000 });
    repo.create({ serviceType: 'ELECTRIC', fromValue: 0, toValue: 100, price: 1800 });
    repo.create({ serviceType: 'WATER', fromValue: 0, toValue: null, price: 9000 });

    const tiers = repo.listByServiceType('ELECTRIC');
    expect(tiers.map(t => t.fromValue)).toEqual([0, 100]);
  });

  it('update() và remove() hoạt động đúng', () => {
    const repo = new TariffRepository(createMigratedTestDb());
    const tier = repo.create({
      serviceType: 'ELECTRIC',
      fromValue: 0,
      toValue: 100,
      price: 1800,
    });

    repo.update(tier.id, { price: 1900 });
    expect(repo.listByServiceType('ELECTRIC')[0].price).toBe(1900);

    repo.remove(tier.id);
    expect(repo.listByServiceType('ELECTRIC')).toEqual([]);
  });

  it('replaceForServiceType() xoá bậc cũ và thay bằng bậc mới trong 1 transaction', () => {
    const repo = new TariffRepository(createMigratedTestDb());
    repo.create({ serviceType: 'ELECTRIC', fromValue: 0, toValue: 100, price: 1800 });

    repo.replaceForServiceType('ELECTRIC', [
      { serviceType: 'ELECTRIC', fromValue: 0, toValue: 50, price: 1806 },
      { serviceType: 'ELECTRIC', fromValue: 50, toValue: null, price: 1866 },
    ]);

    const tiers = repo.listByServiceType('ELECTRIC');
    expect(tiers.map(t => t.price)).toEqual([1806, 1866]);
  });
});
