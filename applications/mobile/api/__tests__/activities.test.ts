import { ActivityPeriod } from '@yet-another-habit-app/shared-types';

// Mock the auth module before importing activities
jest.mock('@/auth/firebaseClient', () => ({
  auth: {
    currentUser: {
      uid: 'test-uid',
      getIdToken: jest.fn().mockResolvedValue('test-token'),
    },
  },
}));

jest.mock('@/api/baseUrl', () => ({
  getApiBaseUrl: () => 'http://localhost:3001',
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import after mocks are set up
import { getActivities, createActivity } from '../activities';

describe('activities API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('getActivities', () => {
    it('fetches activities for a given period', async () => {
      const mockActivities = [
        { id: '1', title: 'Run', description: 'Morning jog', completionPercent: 50, period: ActivityPeriod.Daily },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activities: mockActivities }),
      });

      const result = await getActivities(ActivityPeriod.Daily, { force: true });

      expect(result).toEqual(mockActivities);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/activities');
      expect(url.toLowerCase()).toContain('period=daily');
      expect(url).toContain('userId=test-uid');
      expect(options.headers.Authorization).toBe('Bearer test-token');
    });

    it('throws on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(
        getActivities(ActivityPeriod.Daily, { force: true }),
      ).rejects.toThrow('Internal Server Error');
    });
  });

  describe('createActivity', () => {
    it('creates an activity and returns it', async () => {
      const newActivity = {
        id: '2',
        title: 'Meditate',
        description: '10 minutes',
        completionPercent: 0,
        period: ActivityPeriod.Daily,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activity: newActivity }),
      });

      const result = await createActivity({
        title: 'Meditate',
        description: '10 minutes',
        period: ActivityPeriod.Daily,
      });

      expect(result).toEqual(newActivity);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.title).toBe('Meditate');
      expect(body.description).toBe('10 minutes');
      expect(body.period.toLowerCase()).toBe('daily');
    });

    it('throws when title is empty', async () => {
      await expect(
        createActivity({ title: '   ', period: ActivityPeriod.Daily }),
      ).rejects.toThrow('Title is required.');

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
