import { useQuery } from '@tanstack/react-query';
import { ChemicalElement } from '@/data/elements';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const useElements = () => {
    return useQuery({
        queryKey: ['elements'],
        queryFn: async (): Promise<ChemicalElement[]> => {
            const response = await fetch(`${API_URL}/elements`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    });
};
