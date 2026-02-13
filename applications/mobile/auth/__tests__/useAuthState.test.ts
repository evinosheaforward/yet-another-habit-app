import { renderHook, act } from '@testing-library/react-native';
import { onAuthStateChanged } from 'firebase/auth';

import { useAuthState } from '../useAuthState';

const mockOnAuthStateChanged = onAuthStateChanged as jest.MockedFunction<
  typeof onAuthStateChanged
>;

describe('useAuthState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts in initializing state with no user', () => {
    // Prevent the mock from auto-firing
    mockOnAuthStateChanged.mockImplementation(() => jest.fn());

    const { result } = renderHook(() => useAuthState());
    expect(result.current.initializing).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('sets user and stops initializing when auth state fires', async () => {
    const mockUser = { uid: 'user-123', email: 'test@test.com' };

    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      // Simulate Firebase calling back with a user
      setTimeout(() => (callback as Function)(mockUser), 0);
      return jest.fn();
    });

    const { result } = renderHook(() => useAuthState());

    // Wait for the auth callback
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.initializing).toBe(false);
    expect(result.current.user).toEqual(mockUser);
  });

  it('sets user to null when signed out', async () => {
    mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
      setTimeout(() => (callback as Function)(null), 0);
      return jest.fn();
    });

    const { result } = renderHook(() => useAuthState());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.initializing).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('returns an unsubscribe function on unmount', () => {
    const unsubscribe = jest.fn();
    mockOnAuthStateChanged.mockImplementation(() => unsubscribe);

    const { unmount } = renderHook(() => useAuthState());
    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
