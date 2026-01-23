import { Card } from '@/components/common';

export default function PostLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Back Button Skeleton */}
        <div className="w-24 h-5 bg-gray-100 rounded animate-pulse mb-4" />

        {/* Image Skeleton */}
        <Card padding="none" className="overflow-hidden mb-4">
          <div className="aspect-square bg-gray-100 animate-pulse" />
        </Card>

        {/* Creator Info Skeleton */}
        <Card className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full animate-pulse" />
              <div>
                <div className="w-32 h-4 bg-gray-100 rounded animate-pulse mb-2" />
                <div className="w-24 h-3 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
            <div className="w-20 h-8 bg-gray-100 rounded-xl animate-pulse" />
          </div>

          <div className="mt-4 space-y-2">
            <div className="w-full h-4 bg-gray-100 rounded animate-pulse" />
            <div className="w-3/4 h-4 bg-gray-100 rounded animate-pulse" />
          </div>

          <div className="flex items-center gap-6 py-4 mt-4 border-y border-gray-100">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-20 h-4 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        </Card>

        {/* Comments Skeleton */}
        <Card>
          <div className="w-32 h-5 bg-gray-100 rounded animate-pulse mb-4" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full animate-pulse" />
                <div className="flex-1">
                  <div className="w-24 h-3 bg-gray-100 rounded animate-pulse mb-2" />
                  <div className="w-full h-4 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
