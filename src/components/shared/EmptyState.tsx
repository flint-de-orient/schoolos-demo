import { SearchX } from 'lucide-react';

export default function EmptyState({ message = 'No results found' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-iceLight rounded-full flex items-center justify-center mb-4">
        <SearchX className="w-8 h-8 text-ice" />
      </div>
      <p className="text-gray-500 font-dm-sans text-sm">{message}</p>
    </div>
  );
}
