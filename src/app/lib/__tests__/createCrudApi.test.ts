import { describe, it, vi, expect, beforeEach } from 'vitest';

// Mock adminFetch BEFORE importing it
vi.mock('../adminFetch', () => ({
  adminFetch: vi.fn(),
}));

import { createCrudApi } from '../createCrudApi';
import { adminFetch } from '../adminFetch';

interface TestItem {
  id: string;
  name: string;
}

describe('createCrudApi', () => {
  const basePath = '/api/admin/test';
  const token = 'test-token';
  const api = createCrudApi<TestItem>(basePath);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('list calls adminFetch with correct url and token', async () => {
    const mockData: TestItem[] = [{ id: '1', name: 'Test' }];
    vi.mocked(adminFetch).mockResolvedValueOnce(mockData);

    const result = await api.list(token);

    expect(adminFetch).toHaveBeenCalledWith(basePath, token);
    expect(result).toEqual(mockData);
  });

  it('create calls adminFetch with POST method and JSON body', async () => {
    const newItem: Partial<TestItem> = { name: 'New' };
    const createdItem: TestItem = { id: '2', name: 'New' };
    vi.mocked(adminFetch).mockResolvedValueOnce(createdItem);

    const result = await api.create(token, newItem);

    expect(adminFetch).toHaveBeenCalledWith(basePath, token, {
      method: 'POST',
      body: JSON.stringify(newItem),
    });
    expect(result).toEqual(createdItem);
  });

  it('update calls adminFetch with PUT method, id in url, and JSON body', async () => {
    const updateData: Partial<TestItem> = { name: 'Updated' };
    const updatedItem: TestItem = { id: '1', name: 'Updated' };
    vi.mocked(adminFetch).mockResolvedValueOnce(updatedItem);

    const result = await api.update(token, '1', updateData);

    expect(adminFetch).toHaveBeenCalledWith(`${basePath}/1`, token, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    expect(result).toEqual(updatedItem);
  });

  it('del calls adminFetch with DELETE method and id in url', async () => {
    vi.mocked(adminFetch).mockResolvedValueOnce(undefined);

    await api.del(token, '1');

    expect(adminFetch).toHaveBeenCalledWith(`${basePath}/1`, token, {
      method: 'DELETE',
    });
  });

  it('del does not throw on success', async () => {
    vi.mocked(adminFetch).mockResolvedValueOnce(undefined);

    await expect(api.del(token, '99')).resolves.toBeUndefined();
  });

  it('works with numeric id', async () => {
    vi.mocked(adminFetch).mockResolvedValueOnce(undefined);

    await api.del(token, 42);

    expect(adminFetch).toHaveBeenCalledWith(`${basePath}/42`, token, {
      method: 'DELETE',
    });
  });
});
