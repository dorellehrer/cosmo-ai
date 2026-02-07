import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function AgentDashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}
