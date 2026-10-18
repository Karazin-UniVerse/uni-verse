import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import type { AuthResponse, GoogleAuthResponse } from '@core/types/auth';
import { authApi } from '@uni-hub/services/api.auth';
import { endSession } from '@uni-hub/services/api.session';

export interface MoodleCredentials {
  username: string;
  password: string;
}

export function loginMutationOptions(
  queryClient: QueryClient,
): UseMutationOptions<{ data: AuthResponse }, Error, MoodleCredentials> {
  return {
    mutationFn: ({ username, password }) => authApi.login(username, password),
    onSuccess: () => queryClient.clear(),
  };
}

export function googleLoginMutationOptions(
  queryClient: QueryClient,
): UseMutationOptions<{ data: GoogleAuthResponse }, Error, string> {
  return {
    mutationFn: (idToken) => authApi.loginWithGoogle(idToken),
    onSuccess: () => queryClient.clear(),
  };
}

export function logoutMutationOptions(
  queryClient: QueryClient,
): UseMutationOptions<void, Error, void> {
  return {
    mutationFn: () => authApi.logout(),
    onSettled: () => endSession(queryClient),
  };
}

export function useLogin(): UseMutationResult<{ data: AuthResponse }, Error, MoodleCredentials> {
  return useMutation(loginMutationOptions(useQueryClient()));
}

export function useGoogleLogin(): UseMutationResult<{ data: GoogleAuthResponse }, Error, string> {
  return useMutation(googleLoginMutationOptions(useQueryClient()));
}

export function useLinkMoodle(): UseMutationResult<
  { data: GoogleAuthResponse },
  Error,
  MoodleCredentials
> {
  return useMutation({
    mutationFn: ({ username, password }) => authApi.linkMoodleAccount(username, password),
  });
}

export function useUnlinkMoodle(): UseMutationResult<{ data: GoogleAuthResponse }, Error, void> {
  return useMutation({ mutationFn: () => authApi.unlinkMoodleAccount() });
}

export function useLogout(): UseMutationResult<void, Error, void> {
  return useMutation(logoutMutationOptions(useQueryClient()));
}
