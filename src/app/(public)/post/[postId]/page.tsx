'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout';
import { PostDetail } from '@/components/post';
import { Card } from '@/components/common';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useTheme } from '@/providers';
import type { Post } from '@/types';

export default function PostDetailPage({ params }: { params: { postId: string } }) {
  const router = useRouter();
  const { t } = useTheme();
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/posts/${params.postId}`);
        const data = await response.json();
        
        if (data.post) {
          setPost(data.post);
        }
      } catch (error) {
        console.error('Error fetching post:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.postId) {
      fetchPost();
    }
  }, [params.postId]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
        </div>
      </MainLayout>
    );
  }

  if (!post) {
    return (
      <MainLayout>
        <div className="py-6 px-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-dark dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">{t('back')}</span>
          </button>
          <Card className="text-center py-12">
            <p className="text-gray-500">{t('postNotFound')}</p>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="py-6 px-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-dark dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">{t('back')}</span>
        </button>
        <PostDetail post={post} />
      </div>
    </MainLayout>
  );
}
