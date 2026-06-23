import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { RosterEntry, Calling, CallingStatus } from '@/types';

export function useRoster() {
  return useQuery({
    queryKey: ['callings', 'roster'],
    queryFn: () => apiFetch<RosterEntry[]>('/api/callings'),
  });
}

export function useCallingDetail(callingId: string | null) {
  return useQuery({
    queryKey: ['callings', 'detail', callingId],
    queryFn: () => apiFetch<Calling>(`/api/callings/${callingId}`),
    enabled: callingId !== null,
  });
}

export function useTransitionCalling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: string;
      status: CallingStatus;
      note?: string;
    }) =>
      apiFetch(`/api/callings/${id}/transition`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['callings'] });
    },
  });
}

export function useCreateCalling() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      position_id: string;
      member_id?: string;
      bishopric_owner?: string;
    }) =>
      apiFetch('/api/callings', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['callings'] });
    },
  });
}
