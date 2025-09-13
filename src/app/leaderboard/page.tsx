import { LeaderboardManager } from "@/components/LeaderboardManager";

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Leaderboard Management</h1>
          <p className="text-gray-400">
            Create and manage leaderboards by combining multiple events and participants
          </p>
        </div>
        
        <LeaderboardManager />
      </div>
    </div>
  );
}
