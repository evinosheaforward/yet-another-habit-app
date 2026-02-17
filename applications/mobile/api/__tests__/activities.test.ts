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
import { getActivities, createActivity, updateActivityCount } from '../activities';

describe('activities API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('getActivities', () => {
    it('fetches activities for a given period', async () => {
      const mockActivities = [
        { id: '1', title: 'Run', description: 'Morning jog', goalCount: 5, count: 3, completionPercent: 60, period: ActivityPeriod.Daily },
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
      expect(url).toContain('period=daily');
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
        goalCount: 1,
        count: 0,
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
      expect(body.period).toBe('daily');
      expect(body.goalCount).toBe(1);
    });

    it('throws when title is empty', async () => {
      await expect(
        createActivity({ title: '   ', period: ActivityPeriod.Daily }),
      ).rejects.toThrow('Title is required.');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('sends goalCount in the request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          activity: {
            id: '3',
            title: 'Exercise',
            description: '',
            goalCount: 5,
            count: 0,
            completionPercent: 0,
            period: ActivityPeriod.Weekly,
          },
        }),
      });

      await createActivity({
        title: 'Exercise',
        period: ActivityPeriod.Weekly,
        goalCount: 5,
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.goalCount).toBe(5);
      expect(body.period).toBe('weekly');
    });

    it.each([
      [ActivityPeriod.Daily, 'daily'],
      [ActivityPeriod.Weekly, 'weekly'],
      [ActivityPeriod.Monthly, 'monthly'],
    ])('sends lowercase period %s as %s', async (enumValue, expected) => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          activity: {
            id: '4',
            title: 'Test',
            description: '',
            goalCount: 1,
            count: 0,
            completionPercent: 0,
            period: enumValue,
          },
        }),
      });

      await createActivity({ title: 'Test', period: enumValue });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.period).toBe(expected);
    });
  });

  describe('updateActivityCount', () => {
    it('sends delta to the history endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 3 }),
      });

      const result = await updateActivityCount('activity-123', 1);

      expect(result).toEqual({ count: 3, completedAchievements: [] });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/activities/activity-123/history');
      expect(options.method).toBe('POST');
      const body = JSON.parse(options.body);
      expect(body.delta).toBe(1);
    });

    it('handles decrement delta', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 1 }),
      });

      const result = await updateActivityCount('activity-123', -1);

      expect(result).toEqual({ count: 1, completedAchievements: [] });
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.delta).toBe(-1);
    });
  });

  describe('end-to-end: create then fetch', () => {
    it('creates an activity then fetches the list with correct periods', async () => {
      // 1. Create activity
      const created = {
        id: 'new-1',
        title: 'Morning Run',
        description: '30 min jog',
        goalCount: 3,
        count: 0,
        completionPercent: 0,
        period: ActivityPeriod.Daily,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activity: created }),
      });

      const activity = await createActivity({
        title: 'Morning Run',
        description: '30 min jog',
        period: ActivityPeriod.Daily,
        goalCount: 3,
      });

      expect(activity.goalCount).toBe(3);
      expect(activity.count).toBe(0);
      expect(activity.completionPercent).toBe(0);

      // Verify create request sent lowercase period
      const createBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(createBody.period).toBe('daily');

      // 2. Fetch activities (force to bypass cache)
      const listWithProgress = [
        { ...created, count: 2, completionPercent: 67 },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activities: listWithProgress }),
      });

      const activities = await getActivities(ActivityPeriod.Daily, { force: true });

      expect(activities).toHaveLength(1);
      expect(activities[0].count).toBe(2);
      expect(activities[0].completionPercent).toBe(67);

      // Verify GET request also uses lowercase period
      const getUrl = mockFetch.mock.calls[1][0];
      expect(getUrl).toContain('period=daily');
    });
  });
});
