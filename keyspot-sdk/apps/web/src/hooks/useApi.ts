import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';

function useToken() {
  const { data: session } = useSession();
  return (session?.user as any)?.accessToken as string | undefined;
}

export function useMe() {
  const token = useToken();
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.getMe(token!),
    enabled: !!token,
  });
}

export function useApiKeys() {
  const token = useToken();
  return useQuery({
    queryKey: ['apiKeys'],
    queryFn: () => api.listApiKeys(token),
    enabled: !!token,
  });
}

export function useCreateApiKey() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, scopes }: { name: string; scopes?: string[] }) =>
      api.createApiKey(name, scopes, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apiKeys'] }),
  });
}

export function useRevokeApiKey() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.revokeApiKey(id, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apiKeys'] }),
  });
}

export function useUsage(period: string = '7d') {
  const token = useToken();
  return useQuery({
    queryKey: ['usage', period],
    queryFn: () => api.getUsage(period, token),
    enabled: !!token,
  });
}

export function useQuotas() {
  const token = useToken();
  return useQuery({
    queryKey: ['quotas'],
    queryFn: () => api.getQuotas(token),
    enabled: !!token,
  });
}

export function useBreakdown(period: string = '7d') {
  const token = useToken();
  return useQuery({
    queryKey: ['breakdown', period],
    queryFn: () => api.getBreakdown(period, token),
    enabled: !!token,
  });
}

export function useKeyUsage(keyId: string, period: string = '7d') {
  const token = useToken();
  return useQuery({
    queryKey: ['keyUsage', keyId, period],
    queryFn: () => api.getKeyUsage(keyId, period, token),
    enabled: !!token && !!keyId,
  });
}

export function useCreateCheckout() {
  const token = useToken();
  return useMutation({
    mutationFn: (tier: string) => api.createCheckout(tier, token),
  });
}

export function usePortal() {
  const token = useToken();
  return useMutation({
    mutationFn: () => api.createPortal(token),
  });
}

export function useUpdateProfile() {
  const token = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.updateProfile(data, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}
